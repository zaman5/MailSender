import { Router, Response } from 'express';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import db from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// ─── IMAP config helper ───────────────────────────────────────────────────────
function getImapConfig(account: any) {
  const port = parseInt(account.imap_port || '993', 10);
  const esp  = (account.esp || '').toLowerCase();

  if (esp === 'google') {
    return { host: 'imap.gmail.com', port: 993, secure: true,
             auth: { user: account.email, pass: account.app_password },
             tls: { rejectUnauthorized: false } };
  }
  if (esp === 'microsoft') {
    return { host: 'outlook.office365.com', port: 993, secure: true,
             auth: { user: account.email, pass: account.app_password },
             tls: { rejectUnauthorized: false } };
  }
  return {
    host:   account.imap_host || `imap.${account.email.split('@')[1]}`,
    port,
    secure: port === 993,
    auth: { user: account.smtp_user || account.email, pass: account.smtp_pass },
    tls: { rejectUnauthorized: false },
  };
}

// ─── Resolve spam folder name (Junk, Spam, [Gmail]/Spam, etc.) ────────────────
async function resolveSpamFolder(client: ImapFlow): Promise<string> {
  try {
    const list = await client.list();
    const found = list.find(
      mb => mb.path.toLowerCase().includes('spam') ||
            mb.path.toLowerCase().includes('junk') ||
            (mb.specialUse && mb.specialUse.toLowerCase().includes('junk'))
    );
    if (found) return found.path;
  } catch { /* ignore */ }
  return 'Junk';
}

// ─── Resolve sent folder name (Sent, Sent Items, [Gmail]/Sent Mail, etc.) ─────
async function resolveSentFolder(client: ImapFlow): Promise<string> {
  try {
    const list = await client.list();
    // Prefer specialUse \\Sent first, then path name matching
    const found = list.find(
      mb => (mb.specialUse && mb.specialUse.toLowerCase().includes('sent')) ||
            mb.path.toLowerCase() === 'sent' ||
            mb.path.toLowerCase() === 'sent items' ||
            mb.path.toLowerCase().includes('sent')
    );
    if (found) return found.path;
  } catch { /* ignore */ }
  return 'Sent';
}

// ─── Per-account error backoff (5-min cooldown after repeated failures) ────────
const accountErrorCache = new Map<string, number>();  // accountId -> timestamp of last failure
const ACCOUNT_ERROR_COOLDOWN = 5 * 60_000; // 5 minutes

function isAccountInCooldown(accountId: string | number): boolean {
  const ts = accountErrorCache.get(String(accountId));
  if (!ts) return false;
  if (Date.now() - ts < ACCOUNT_ERROR_COOLDOWN) return true;
  accountErrorCache.delete(String(accountId)); // expired — allow retry
  return false;
}

function markAccountFailed(accountId: string | number) {
  accountErrorCache.set(String(accountId), Date.now());
}

// ─── MIME / body cleaning helpers ────────────────────────────────────────────

/** Decode quoted-printable encoding */
function decodeQP(str: string): string {
  return str
    .replace(/=\r?\n/g, '')                                         // soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, h) =>
      Buffer.from(h, 'hex').toString('utf8'));
}

/** Strip HTML tags and decode common entities */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Extract clean text/plain from a raw MIME body (handles full RFC822 source + multipart + encodings) */
function extractCleanBody(raw: string): string {
  if (!raw || !raw.trim()) return '';

  // ── If this looks like a full RFC822 message, split headers from body ──
  const isFullMessage = /^(Return-Path|Received|MIME-Version|Content-Type|From|Date|Message-Id):/im.test(raw.slice(0, 3000));
  let headerSection = '';
  let bodySection = raw;

  if (isFullMessage) {
    // Find the first blank line (headers/body separator)
    const crlfBlank = raw.indexOf('\r\n\r\n');
    const lfBlank   = raw.indexOf('\n\n');
    let splitAt = -1;
    let splitLen = 2;
    if (crlfBlank !== -1 && (lfBlank === -1 || crlfBlank <= lfBlank)) { splitAt = crlfBlank; splitLen = 4; }
    else if (lfBlank !== -1) { splitAt = lfBlank; splitLen = 2; }

    if (splitAt > 0) {
      headerSection = raw.slice(0, splitAt);
      bodySection   = raw.slice(splitAt + splitLen);
    }
  }

  // ── Extract Content-Type and CTE from headers ──
  const unfoldHeader = (s: string) => s.replace(/\r?\n[ \t]+/g, ' ');
  const unfolded = unfoldHeader(headerSection || raw.slice(0, 3000));
  const ctMatch  = unfolded.match(/^Content-Type:\s*([^;\r\n]+)/im);
  const cteMatch = unfolded.match(/^Content-Transfer-Encoding:\s*([^\r\n]+)/im);
  const topCt    = (ctMatch?.[1]  || 'text/plain').trim().toLowerCase();
  const topCte   = (cteMatch?.[1] || '').trim().toLowerCase();
  const boundaryMatch = unfolded.match(/boundary="?([^"\s;]+)"?/i);

  // ── Multipart ──
  if (topCt.startsWith('multipart/') && boundaryMatch) {
    const boundary = boundaryMatch[1];
    const escaped  = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts    = bodySection.split(new RegExp(`--${escaped}(?:--)?`));

    let plainText = '';
    let htmlText  = '';

    for (const part of parts) {
      const pb = part.search(/\r?\n\r?\n/);
      if (pb < 0) continue;
      const ph  = unfoldHeader(part.slice(0, pb));
      const pct = (ph.match(/Content-Type:\s*([^;\r\n]+)/i)?.[1] || '').trim().toLowerCase();
      const pce = (ph.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i)?.[1] || '').trim().toLowerCase();
      let   pb2 = part.slice(pb).replace(/^\r?\n\r?\n/, '').trimEnd();

      if (pce === 'quoted-printable') pb2 = decodeQP(pb2);
      else if (pce === 'base64')      pb2 = Buffer.from(pb2.replace(/\s+/g, ''), 'base64').toString('utf8');

      if (pct === 'text/plain' && !plainText) plainText = pb2;
      if (pct === 'text/html'  && !htmlText)  htmlText  = pb2;
    }

    if (plainText) return removeQuotedThread(plainText.trim());
    if (htmlText)  return removeQuotedThread(stripHtml(htmlText));
    return '';
  }

  // ── Single-part ──
  let text = bodySection;
  if (topCte === 'quoted-printable' || (!topCte && /=[0-9A-Fa-f]{2}/.test(text))) {
    text = decodeQP(text);
  } else if (topCte === 'base64') {
    text = Buffer.from(text.replace(/\s+/g, ''), 'base64').toString('utf8');
  }

  if (topCt === 'text/html' || /\<[a-zA-Z]/.test(text)) text = stripHtml(text);

  return removeQuotedThread(text.trim());
}

/** Remove quoted reply thread — keep only the newest message */
function removeQuotedThread(text: string): string {
  const lines  = text.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimEnd();

    // Stop at "On [date]...[person] wrote:" attribution line
    if (/^On .{5,}, \d{4}[\s\S]{0,60}wrote:?\s*$/i.test(trimmed)) break;
    if (/^On (Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i.test(trimmed))        break;

    // Skip quoted lines (start with >)
    if (/^>/.test(trimmed)) continue;

    // Stop at common Outlook/Gmail quote separators
    if (/^-{3,}.*Original Message.*-{3,}/i.test(trimmed)) break;
    if (/^_{5,}$/.test(trimmed)) break;

    result.push(lines[i]);
  }

  return result.join('\n').trim().replace(/\n{3,}/g, '\n\n');
}

// ─── SQLite-backed persistent inbox cache ────────────────────────────────────

function upsertEmail(email: any, userId: number) {
  // ID includes userId to ensure complete per-user isolation in inbox_cache
  const rowId = `${userId}-${email.accountId}-${email.uid}`;
  const r = db.prepare(`
    INSERT INTO inbox_cache
      (id, user_id, account_id, account_email, folder, uid, sender_name, sender_email,
       subject, preview, body, date_raw, unread, starred, spam, synced_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(user_id, account_id, folder, uid) DO UPDATE SET
      unread=excluded.unread, starred=excluded.starred, synced_at=excluded.synced_at
  `).run(
    rowId, userId, email.accountId, email.account, email.folder, email.uid,
    email.name, email.email, email.subject, email.preview || '',
    email.body ?? null, email.dateRaw,
    email.unread ? 1 : 0, email.starred ? 1 : 0, email.spam ? 1 : 0,
    Date.now()
  );

  // If this is a new incoming email in the INBOX, check if it's a reply from a campaign lead
  if (r.changes > 0 && !email.spam && !email.folder.toLowerCase().includes('sent') && !email.folder.toLowerCase().includes('spam')) {
    const lead = db.prepare('SELECT id, campaign_id, replied FROM campaign_leads WHERE email=? AND user_id=?').get(email.email, userId) as any;
    if (lead && lead.replied === 0) {
      db.prepare("UPDATE campaign_leads SET replied=1, status='Replied' WHERE id=?").run(lead.id);
      db.prepare("UPDATE campaigns SET replies=replies+1 WHERE id=?").run(lead.campaign_id);
      console.log(`[Reply Tracked] Lead ${email.email} replied to campaign ${lead.campaign_id}`);
    }
  }
}


function dbEmailsForFolder(userId: number, folder: string): any[] {
  const rows = db.prepare(
    `SELECT * FROM inbox_cache WHERE user_id=? AND folder=? ORDER BY date_raw DESC`
  ).all(userId, folder) as any[];
  return rows.map(r => ({
    id: r.id, uid: r.uid, folder: r.folder,
    account: r.account_email, accountId: r.account_id,
    name: r.sender_name, email: r.sender_email,
    subject: r.subject, preview: r.preview, body: r.body,
    dateRaw: r.date_raw,
    date: new Date(r.date_raw).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }),
    unread: r.unread === 1, starred: r.starred === 1, spam: r.spam === 1,
    campaign: null,
  }));
}

// Prevent duplicate concurrent syncs per user+folder
const syncInProgress = new Set<string>();

async function syncAccountFolder(userId: number, account: any, imapFolder: string) {
  if (isAccountInCooldown(account.id)) return;
  const config = getImapConfig(account);
  const client = new ImapFlow({ ...config, logger: false } as any);
  try {
    await client.connect();
    let resolvedFolder = imapFolder;
    if (imapFolder === 'Spam') resolvedFolder = await resolveSpamFolder(client);
    if (imapFolder === 'Sent') resolvedFolder = await resolveSentFolder(client);
    const lock = await client.getMailboxLock(resolvedFolder);
    try {
      // Fetch ALL UIDs from last 2 years
      const since = new Date(); since.setFullYear(since.getFullYear() - 2);
      let imapUids: number[] = [];
      try {
        imapUids = (await (client as any).search({ since }, { uid: true })) as number[];
      } catch {
        const mbx = client.mailbox as any;
        const total = mbx?.exists ?? 0;
        if (total > 0) imapUids = Array.from({ length: total }, (_, i) => i + 1);
      }

      // Current cache for this account+folder
      const cached = db.prepare(
        'SELECT uid, id FROM inbox_cache WHERE account_id=? AND folder=? AND user_id=?'
      ).all(account.id, resolvedFolder, userId) as any[];
      const cachedUidSet = new Set<number>(cached.map((r: any) => r.uid));
      const imapUidSet   = new Set<number>(imapUids);

      // 1. Delete emails removed from IMAP
      for (const row of cached) {
        if (!imapUidSet.has(row.uid)) {
          db.prepare('DELETE FROM inbox_cache WHERE id=?').run(row.id);
        }
      }

      // 2. Fetch and store NEW emails
      const newUids = imapUids.filter(u => !cachedUidSet.has(u));
      if (newUids.length > 0) {
        const BATCH = 100;
        for (let i = 0; i < newUids.length; i += BATCH) {
          const batch = newUids.slice(i, i + BATCH);
          for await (const msg of client.fetch(batch, { envelope: true, flags: true }, { uid: true })) {
            const env    = msg.envelope;
            const sender = (env?.from?.[0] as any) || {};
            const flags  = msg.flags ?? new Set<string>();
            const dateVal = env?.date ? new Date(env.date) : new Date(0);
            const isSpam  = resolvedFolder.toLowerCase().includes('spam') || resolvedFolder.toLowerCase().includes('junk');
            upsertEmail({
              id: `${account.id}-${msg.uid}`, uid: msg.uid,
              folder: resolvedFolder, account: account.email, accountId: account.id,
              name:  sender.name || sender.address?.split('@')[0] || 'Unknown',
              email: sender.address || '',
              subject: env?.subject || '(no subject)',
              preview: '', body: null, dateRaw: dateVal.toISOString(),
              unread: !flags.has('\\Seen'), starred: flags.has('\\Flagged'), spam: isSpam,
            }, userId);
          }
        }
      }

      // 3. Update flags for already-cached emails
      const existingUids = imapUids.filter(u => cachedUidSet.has(u));
      if (existingUids.length > 0) {
        for await (const msg of client.fetch(existingUids, { flags: true }, { uid: true })) {
          const flags = msg.flags ?? new Set<string>();
          db.prepare(
            'UPDATE inbox_cache SET unread=?, starred=?, synced_at=? WHERE account_id=? AND folder=? AND uid=? AND user_id=?'
          ).run(!flags.has('\\Seen') ? 1 : 0, flags.has('\\Flagged') ? 1 : 0,
                Date.now(), account.id, resolvedFolder, msg.uid, userId);

        }
      }
    } finally { lock.release(); }
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (!isAccountInCooldown(account.id)) console.error(`[inbox] sync ${account.email}: ${m}`);
    markAccountFailed(account.id);
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }
}

async function backgroundSync(userId: number, accounts: any[], imapFolder: string) {
  const key = `${userId}:${imapFolder}`;
  if (syncInProgress.has(key)) return;
  syncInProgress.add(key);
  try {
    await Promise.allSettled(accounts.map(acc => syncAccountFolder(userId, acc, imapFolder)));
  } finally { syncInProgress.delete(key); }
}


// sinceDate: when provided, only fetch emails AFTER this date (incremental refresh)
async function fetchFolderEmails(account: any, folder: string, limit = 25, sinceDate?: Date): Promise<any[]> {
  // Skip account if it recently failed — avoids log spam on every poll cycle
  if (isAccountInCooldown(account.id)) return [];

  const config = getImapConfig(account);
  const client = new ImapFlow({ ...config, logger: false } as any);
  const emails: any[] = [];

  try {
    await client.connect();

    let resolvedFolder = folder;
    if (folder === 'Spam') resolvedFolder = await resolveSpamFolder(client);
    if (folder === 'Sent') resolvedFolder = await resolveSentFolder(client);

    const lock = await client.getMailboxLock(resolvedFolder);
    try {
      // Use provided sinceDate for incremental refresh, otherwise default to last 14 days
      const since = sinceDate ?? (() => { const d = new Date(); d.setDate(d.getDate() - 14); return d; })();

      let uids: number[] = [];
      try {
        uids = (await (client as any).search({ since }, { uid: true })) as number[];
      } catch {
        // Fallback: if incremental (sinceDate provided), return empty rather than re-fetching all
        if (sinceDate) return [];
        const mbx   = client.mailbox;
        const total  = (mbx && typeof mbx === 'object' && 'exists' in mbx) ? (mbx as any).exists as number : 0;
        if (total > 0) uids = Array.from({ length: Math.min(limit, total) }, (_, i) => total - i);
      }

      if (uids.length === 0) return [];

      const recentUids = uids.slice(-limit);

      // ✅ Fetch ONLY envelope + flags — NO body download (much faster)
      for await (const msg of client.fetch(recentUids, {
        envelope: true,
        flags:    true,
      }, { uid: true })) {
        const env    = msg.envelope;
        const sender = (env?.from?.[0] as any) || {};
        const senderName  = sender.name || (sender.address?.split('@')[0]) || 'Unknown';
        const senderEmail = sender.address || '';

        const flags   = msg.flags ?? new Set<string>();
        const isSpam  = resolvedFolder.toLowerCase().includes('spam') || resolvedFolder.toLowerCase().includes('junk');
        const dateVal = env?.date ? new Date(env.date) : new Date(0);

        emails.push({
          id:          `${account.userId || 0}-${account.id}-${msg.uid}`,

          uid:         msg.uid,
          folder:      resolvedFolder,
          account:     account.email,
          accountId:   account.id,
          accountName: [account.first_name, account.last_name].filter(Boolean).join(' ') || account.email,
          name:        senderName,
          email:       senderEmail,
          subject:     env?.subject || '(no subject)',
          preview:     '',      // loaded on-demand when email is opened
          body:        null,    // loaded on-demand
          dateRaw:     dateVal.toISOString(),
          date:        dateVal.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          unread:      !flags.has('\\Seen'),
          starred:     flags.has('\\Flagged'),
          spam:        isSpam,
          campaign:    null,
        });
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Only log the first failure per cooldown window — not every poll cycle
    if (!isAccountInCooldown(account.id)) {
      console.error(`[inbox] IMAP error for ${account.email} folder "${folder}": ${msg} — account paused for 5 min`);
    }
    markAccountFailed(account.id);
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }

  return emails.sort((a, b) => new Date(b.dateRaw).getTime() - new Date(a.dateRaw).getTime());
}

// ─── Fetch body of a single email on-demand ───────────────────────────────────
async function fetchEmailBody(account: any, folder: string, uid: number): Promise<string> {
  const config = getImapConfig(account);
  const client = new ImapFlow({ ...config, logger: false } as any);
  let body = '';
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      let raw = '';

      // Step 1: BODY[TEXT] = full body without RFC822 headers (best for multipart)
      try {
        for await (const msg of client.fetch([uid], { bodyParts: ['TEXT'] } as any, { uid: true })) {
          const part = msg.bodyParts?.get('TEXT');
          if (part) raw = Buffer.from(part as Uint8Array).toString('utf8');
        }
      } catch { /* ignore, try fallback */ }

      // Step 2: Try full source if TEXT was empty
      if (!raw || !raw.trim()) {
        try {
          for await (const msg of client.fetch([uid], { source: true } as any, { uid: true })) {
            const src = (msg as any).source;
            if (src) raw = Buffer.isBuffer(src) ? src.toString('utf8') : Buffer.from(src).toString('utf8');
          }
        } catch { /* ignore */ }
      }

      // Step 3: Try individual numbered parts
      if (!raw || !raw.trim()) {
        try {
          for await (const msg of client.fetch([uid], { bodyParts: ['1', '1.1', '2', 'text', '1.2'] } as any, { uid: true })) {
            for (const key of ['1', '1.1', '2', 'text', '1.2']) {
              const part = msg.bodyParts?.get(key);
              if (part) { raw = Buffer.from(part as Uint8Array).toString('utf8'); break; }
            }
          }
        } catch { /* ignore */ }
      }

      if (raw && raw.trim()) body = extractCleanBody(raw);
    } finally { lock.release(); }
  } catch (err) {
    console.error('[inbox] fetchEmailBody error:', err instanceof Error ? err.message : err);
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }
  return body;
}


// ─── Helper: run an IMAP action on a specific account + folder ────────────────
async function withImap(account: any, folder: string, action: (client: ImapFlow) => Promise<void>) {
  const config = getImapConfig(account);
  const client = new ImapFlow({ ...config, logger: false } as any);
  await client.connect();
  const lock = await client.getMailboxLock(folder);
  try { await action(client); }
  finally { lock.release(); }
  await client.logout();
}

// ─── GET /api/inbox?folder=inbox|spam|sent|starred[&since=ISO] ───────────────
// ─── GET /api/inbox ─────────────────────────────────────────────────────────────────
// 1. Responds INSTANTLY from SQLite cache (ALL historical records)
// 2. Fires background IMAP sync to add new / remove deleted emails
// ?force=true  → clear DB cache first, then sync live from IMAP before responding
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const folderParam = ((req.query.folder as string) || 'inbox').toLowerCase();
  const force       = req.query.force === 'true';
  const accounts    = db.prepare('SELECT * FROM email_accounts WHERE user_id=?').all(req.userId) as any[];

  const imapFolderMap: Record<string, string> = {
    inbox: 'INBOX', spam: 'Spam', sent: 'Sent', starred: 'INBOX',
  };
  const imapFolder = imapFolderMap[folderParam] || 'INBOX';

  const accountList = accounts.map(a => ({
    id: a.id, email: a.email, esp: a.esp,
    name: [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email,
  }));

  if (force && accounts.length > 0) {
    // ── Force refresh: wipe cache + do live sync NOW (await), then respond ──
    db.prepare('DELETE FROM inbox_cache WHERE user_id=? AND folder=?').run(req.userId, imapFolder);
    await backgroundSync(req.userId!, accounts, imapFolder);
    const fresh = dbEmailsForFolder(req.userId!, imapFolder);
    const result = folderParam === 'starred' ? fresh.filter(e => e.starred) : fresh;
    return res.json({ emails: result, total: result.length, incremental: false, accounts: accountList, fromCache: false });
  }

  // ── Normal: return ALL cached emails immediately ──────────────────────────
  let cached = dbEmailsForFolder(req.userId!, imapFolder);
  if (folderParam === 'starred') cached = cached.filter(e => e.starred);

  res.json({ emails: cached, total: cached.length, incremental: false, accounts: accountList, fromCache: true });

  // ── Background IMAP sync (add new, remove deleted, refresh flags) ────────
  if (accounts.length > 0) {
    backgroundSync(req.userId!, accounts, imapFolder).catch(() => {});
  }
});


// ─── GET /api/inbox/message/:accountId/:uid?folder=INBOX ────────────────────
// Load body on demand when user clicks an email (keeps list fast)
// ─── GET /api/inbox/message/:accountId/:uid ───────────────────────────────────
router.get('/message/:accountId/:uid', requireAuth, async (req: AuthRequest, res: Response) => {
  const { accountId, uid } = req.params;
  const folder  = (req.query.folder as string) || 'INBOX';
  const uidNum  = parseInt(uid as string, 10);
  const account = db.prepare('SELECT * FROM email_accounts WHERE id=? AND user_id=?').get(accountId, req.userId) as any;
  if (!account) return res.status(404).json({ error: 'Account not found' });
  // Serve cached body instantly ONLY if it is non-empty (empty = parsing failed before)
  const row = db.prepare('SELECT body FROM inbox_cache WHERE account_id=? AND uid=? AND user_id=?').get(accountId, uidNum, req.userId) as any;
  if (row?.body && row.body.trim().length > 0) return res.json({ body: row.body });
  try {
    const body = await fetchEmailBody(account, folder, uidNum);
    // Always persist (even empty) so next fetch knows to re-try via the improved parser
    db.prepare('UPDATE inbox_cache SET body=? WHERE account_id=? AND uid=? AND user_id=?').run(body || null, accountId, uidNum, req.userId);
    res.json({ body: body || '' });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to fetch message' });
  }

});


// ─── POST /api/inbox/mark-read ────────────────────────────────────────────────
router.post('/mark-read', requireAuth, async (req: AuthRequest, res: Response) => {
  const { accountId, uid, folder = 'INBOX' } = req.body as any;
  const account = db.prepare('SELECT * FROM email_accounts WHERE id=? AND user_id=?').get(accountId, req.userId) as any;
  if (!account) return res.status(404).json({ error: 'Account not found' });
  db.prepare('UPDATE inbox_cache SET unread=0 WHERE account_id=? AND uid=? AND user_id=?').run(accountId, uid, req.userId);
  withImap(account, folder, async c => { await c.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true } as any); })
    .catch(e => console.error('[inbox] mark-read:', e instanceof Error ? e.message : e));
  res.json({ success: true });
});

// ─── POST /api/inbox/mark-unread ─────────────────────────────────────────────
router.post('/mark-unread', requireAuth, async (req: AuthRequest, res: Response) => {
  const { accountId, uid, folder = 'INBOX' } = req.body as any;
  const account = db.prepare('SELECT * FROM email_accounts WHERE id=? AND user_id=?').get(accountId, req.userId) as any;
  if (!account) return res.status(404).json({ error: 'Account not found' });
  db.prepare('UPDATE inbox_cache SET unread=1 WHERE account_id=? AND uid=? AND user_id=?').run(accountId, uid, req.userId);
  withImap(account, folder, async c => { await c.messageFlagsRemove({ uid }, ['\\Seen'], { uid: true } as any); })
    .catch(e => console.error('[inbox] mark-unread:', e instanceof Error ? e.message : e));
  res.json({ success: true });
});


// ─── POST /api/inbox/star ────────────────────────────────────────────────────
router.post('/star', requireAuth, async (req: AuthRequest, res: Response) => {
  const { accountId, uid, starred, folder = 'INBOX' } = req.body as any;
  const account = db.prepare('SELECT * FROM email_accounts WHERE id=? AND user_id=?').get(accountId, req.userId) as any;
  if (!account) return res.status(404).json({ error: 'Account not found' });
  try {
    await withImap(account, folder, async (client) => {
      if (starred) {
        await client.messageFlagsAdd({ uid }, ['\\Flagged'], { uid: true } as any);
      } else {
        await client.messageFlagsRemove({ uid }, ['\\Flagged'], { uid: true } as any);
      }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[inbox] star error:', err instanceof Error ? err.message : err);
    res.json({ success: true });
  }
});

// ─── POST /api/inbox/reply ───────────────────────────────────────────────────
router.post('/reply', requireAuth, async (req: AuthRequest, res: Response) => {
  const { accountId, toEmail, subject, body } = req.body as any;
  const account = db.prepare('SELECT * FROM email_accounts WHERE id=? AND user_id=?').get(accountId, req.userId) as any;
  if (!account) return res.status(404).json({ error: 'Account not found' });

  try {
    const esp = (account.esp || '').toLowerCase();
    const smtpConfig: any = esp === 'google'
      ? { host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: account.email, pass: account.app_password } }
      : esp === 'microsoft'
        ? { host: 'smtp.office365.com', port: 587, secure: false, auth: { user: account.email, pass: account.app_password } }
        : { host: account.smtp_host, port: parseInt(account.smtp_port || '465', 10),
            secure: parseInt(account.smtp_port || '465', 10) === 465,
            auth: { user: account.smtp_user || account.email, pass: account.smtp_pass },
            tls: { rejectUnauthorized: false } };

    const transporter = nodemailer.createTransport(smtpConfig);
    await transporter.sendMail({
      from:    account.email,
      to:      toEmail,
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
      text:    body,
    });
    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send reply';
    console.error('[inbox] reply error:', msg);
    res.status(400).json({ error: msg });
  }
});

// ─── POST /api/inbox/send ────────────────────────────────────────────────────
router.post('/send', requireAuth, async (req: AuthRequest, res: Response) => {
  const { accountId, toEmail, subject, body } = req.body as any;
  const numAccountId = parseInt(accountId, 10);
  const account = db.prepare('SELECT * FROM email_accounts WHERE id=? AND user_id=?').get(numAccountId, req.userId) as any;
  if (!account) return res.status(404).json({ error: 'Account not found' });

  try {
    const esp = (account.esp || '').toLowerCase();
    const smtpConfig: any = esp === 'google'
      ? { host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: account.email, pass: account.app_password } }
      : esp === 'microsoft'
        ? { host: 'smtp.office365.com', port: 587, secure: false, auth: { user: account.email, pass: account.app_password } }
        : { host: account.smtp_host, port: parseInt(account.smtp_port || '465', 10),
            secure: parseInt(account.smtp_port || '465', 10) === 465,
            auth: { user: account.smtp_user || account.email, pass: account.smtp_pass },
            tls: { rejectUnauthorized: false } };

    const transporter = nodemailer.createTransport(smtpConfig);
    await transporter.sendMail({
      from:    account.email,
      to:      toEmail,
      subject: subject,
      text:    body,
    });
    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send email';
    console.error('[inbox] send error:', msg);
    res.status(400).json({ error: msg });
  }
});

export default router;
