import { Router, Response } from 'express';
import nodemailer from 'nodemailer';
import net from 'net';
import tls from 'tls';
import db from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// ─── Friendly error messages ──────────────────────────────────────────────────
function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (
    m.includes('invalid login') ||
    m.includes('username and password not accepted') ||
    m.includes('535') ||
    m.includes('534') ||
    m.includes('badcredentials') ||
    m.includes('authentication failed') ||
    m.includes('auth failed') ||
    m.includes('invalid credentials') ||
    m.includes('login failed') ||
    m.includes('5.7.8') ||
    m.includes('5.7.0')
  ) {
    return 'Invalid credentials. Please check your email address and password.';
  }
  if (m.includes('application-specific password required') || m.includes('app password')) {
    return 'App password required. Enable 2-Step Verification in your Google/Microsoft account and generate an App Password.';
  }
  if (m.includes('econnrefused')) {
    return 'Connection refused. Check that the SMTP host and port are correct.';
  }
  if (m.includes('etimedout') || m.includes('timeout') || m.includes('timed out')) {
    return 'Connection timed out. Check the SMTP host and port.';
  }
  if (m.includes('enotfound') || m.includes('getaddrinfo')) {
    return 'SMTP host not found. Check the host name (e.g. mail.yourdomain.com).';
  }
  if (m.includes('self signed') || m.includes('certificate')) {
    return 'SSL certificate error. Try port 587 instead of 465.';
  }
  if (m.includes('econnreset') || m.includes('connection reset')) {
    return 'Connection was reset by the server. Check host/port settings.';
  }
  return `Connection failed: ${msg}`;
}

// ─── Low-level SMTP AUTH test ─────────────────────────────────────────────────
// This sends a real SMTP conversation including AUTH to catch bad passwords
// even when servers accept the TCP connection before rejecting auth.
function smtpAuthTest(
  host: string,
  port: number,
  user: string,
  pass: string,
  secure: boolean
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = 15000;
    let settled = false;
    let buffer = '';

    function done(err?: Error) {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve();
      try { socket.destroy(); } catch (_) {}
    }

    function send(socket: net.Socket | tls.TLSSocket, data: string) {
      socket.write(data + '\r\n');
    }

    let step = 0;
    const b64user = Buffer.from('\0' + user + '\0' + pass).toString('base64');

    function handleLine(socket: net.Socket | tls.TLSSocket, line: string) {
      const code = parseInt(line.slice(0, 3), 10);

      if (step === 0) {
        // Got greeting, send EHLO
        if (code === 220) { step = 1; send(socket, 'EHLO mailsender.app'); }
        else done(new Error(`Unexpected greeting: ${line}`));
      } else if (step === 1) {
        // EHLO response, send AUTH PLAIN
        if (code === 250) {
          // wait for last 250 line (no hyphen)
          if (line[3] !== '-') { step = 2; send(socket, `AUTH PLAIN ${b64user}`); }
        } else {
          done(new Error(`EHLO failed: ${line}`));
        }
      } else if (step === 2) {
        // AUTH response
        if (code === 235) {
          // 235 = auth success
          send(socket, 'QUIT');
          done();
        } else if (code >= 400) {
          done(new Error(line));
        }
      }
    }

    function createSocket(): net.Socket | tls.TLSSocket {
      if (secure) {
        const s = tls.connect({ host, port, rejectUnauthorized: false }, () => {});
        return s;
      }
      return net.createConnection({ host, port });
    }

    const socket = createSocket();
    socket.setTimeout(timeout);

    socket.on('connect', () => {});
    socket.on('secureConnect', () => {});
    socket.on('timeout', () => done(new Error('Connection timed out')));
    socket.on('error', (err) => done(err));

    socket.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\r\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.trim()) handleLine(socket, line);
      }
    });
  });
}

// Helper to verify SMTP connection details
async function verifyConnection(body: Record<string, string>): Promise<void> {
  const {
    email, esp, appPassword,
    smtpHost, smtpPort, smtpUser, smtpPass,
  } = body;

  if (!email) {
    throw new Error('Email is required');
  }

  // Validate required fields per provider
  if ((esp === 'Google' || esp === 'Microsoft') && !appPassword) {
    throw new Error('App password is required.');
  }
  if (esp === 'SMTP' && (!smtpHost || !smtpPass)) {
    throw new Error('SMTP host and password are required.');
  }

  if (esp === 'Google') {
    // Google: use nodemailer with gmail service (forces proper OAuth/app-pass auth)
    const t = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: email, pass: appPassword },
    });
    await t.verify();

  } else if (esp === 'Microsoft') {
    // Microsoft: use nodemailer with office365
    const t = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: { user: email, pass: appPassword },
      tls: { ciphers: 'SSLv3' },
    });
    await t.verify();

  } else {
    // Custom SMTP (Ionos, Zoho, custom hosts)
    const port = parseInt(smtpPort || '587', 10);
    const secure = port === 465;

    // IMPORTANT: Ionos and most providers require the FULL email address as username.
    // If smtpUser doesn't contain @, fall back to the email field.
    const user = (smtpUser?.trim() && smtpUser.includes('@'))
      ? smtpUser.trim()
      : email;

    console.log(`[verifyConnection] SMTP host=${smtpHost} port=${port} secure=${secure} user=${user}`);

    const t = nodemailer.createTransport({
      host: smtpHost.trim(),
      port,
      secure,
      auth: { user, pass: smtpPass },
      tls: { rejectUnauthorized: false, minVersion: 'TLSv1' },
      connectionTimeout: 20000,
      greetingTimeout: 15000,
      socketTimeout: 25000,
    });

    try {
      await t.verify();
    } catch (firstErr: unknown) {
      // If port 465 failed, retry with 587 STARTTLS (or vice versa)
      const altPort = port === 465 ? 587 : 465;
      const altSecure = altPort === 465;
      console.log(`[verifyConnection] Retrying with port ${altPort}...`);
      const t2 = nodemailer.createTransport({
        host: smtpHost.trim(),
        port: altPort,
        secure: altSecure,
        auth: { user, pass: smtpPass },
        tls: { rejectUnauthorized: false, minVersion: 'TLSv1' },
        connectionTimeout: 20000,
        greetingTimeout: 15000,
        socketTimeout: 25000,
      });
      await t2.verify();
    }
  }
}

// ─── POST /api/accounts/test-connection ──────────────────────────────────────
router.post('/test-connection', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await verifyConnection(req.body as Record<string, string>);
    return res.json({ success: true });
  } catch (err: unknown) {
    const msg = (err instanceof Error ? err.message : String(err)) || 'Unknown error';
    console.error('[test-connection] FAILED:', msg);
    return res.status(400).json({ success: false, error: friendlyError(msg) });
  }
});


// ─── GET /api/accounts ───────────────────────────────────────────────────────
router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  const rows = db.prepare('SELECT * FROM email_accounts WHERE user_id=? ORDER BY created_at DESC').all(req.userId);
  res.json(rows);
});

// ─── POST /api/accounts ──────────────────────────────────────────────────────
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const {
    firstName, lastName, email, esp,
    appPassword, smtpHost, smtpPort, smtpUser, smtpPass, imapHost, imapPort,
  } = req.body as Record<string, string>;

  if (!email) return res.status(400).json({ error: 'Email is required' });

  const existing = db.prepare('SELECT id FROM email_accounts WHERE user_id=? AND email=?').get(req.userId, email);
  if (existing) return res.status(400).json({ error: 'Account already exists' });

  // Test the connection before saving to database
  try {
    await verifyConnection(req.body as Record<string, string>);
  } catch (err: unknown) {
    const msg = (err instanceof Error ? err.message : String(err)) || 'Unknown error';
    console.error('[add-account] Connection test FAILED:', msg);
    return res.status(400).json({ error: friendlyError(msg) });
  }

  const result = db.prepare(`
    INSERT INTO email_accounts
      (user_id, first_name, last_name, email, esp,
       app_password, smtp_host, smtp_port, smtp_user, smtp_pass, imap_host, imap_port)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.userId,
    firstName   || '',
    lastName    || '',
    email,
    esp         || 'Google',
    appPassword || '',
    smtpHost    || '',
    smtpPort    || '587',
    smtpUser    || '',
    smtpPass    || '',
    imapHost    || '',
    imapPort    || '993',
  );

  const account = db.prepare('SELECT * FROM email_accounts WHERE id=?').get(result.lastInsertRowid);
  res.json(account);
});

// ─── DELETE /api/accounts/:id ─────────────────────────────────────────────────
router.delete('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM email_accounts WHERE id=? AND user_id=?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ─── Tags ──────────────────────────────────────────────────────────────────────
// GET /api/accounts/tags — all unique tags for this user + count of accounts per tag
router.get('/tags/all', requireAuth, (req: AuthRequest, res: Response) => {
  const rows = db.prepare(`
    SELECT tag, COUNT(*) as count FROM account_tags WHERE user_id=? GROUP BY tag ORDER BY tag
  `).all(req.userId);
  res.json(rows);
});

// GET /api/accounts/:id/tags — tags for a single account
router.get('/:id/tags', requireAuth, (req: AuthRequest, res: Response) => {
  const rows = db.prepare('SELECT tag FROM account_tags WHERE account_id=? AND user_id=? ORDER BY tag')
    .all(req.params.id, req.userId) as any[];
  res.json(rows.map(r => r.tag));
});

// POST /api/accounts/:id/tags  body: { tags: string[] }  (max 5)
router.post('/:id/tags', requireAuth, (req: AuthRequest, res: Response) => {
  const acct = db.prepare('SELECT id FROM email_accounts WHERE id=? AND user_id=?').get(req.params.id, req.userId) as any;
  if (!acct) return res.status(404).json({ error: 'Not found' });
  const { tags } = req.body as { tags: string[] };
  const cleaned = [...new Set((tags || []).map((t: string) => t.trim()).filter(Boolean))].slice(0, 5);
  db.prepare('DELETE FROM account_tags WHERE account_id=? AND user_id=?').run(acct.id, req.userId);
  const ins = db.prepare('INSERT OR IGNORE INTO account_tags (account_id, user_id, tag) VALUES (?,?,?)');
  for (const tag of cleaned) ins.run(acct.id, req.userId, tag);
  res.json({ success: true, tags: cleaned });
});

// GET /api/accounts/by-tag/:tag — accounts that have this tag
router.get('/by-tag/:tag', requireAuth, (req: AuthRequest, res: Response) => {
  const rows = db.prepare(`
    SELECT ea.* FROM account_tags at2
    JOIN email_accounts ea ON ea.id = at2.account_id
    WHERE at2.user_id=? AND at2.tag=?
    ORDER BY ea.email
  `).all(req.userId, req.params.tag);
  res.json(rows);
});

export default router;
