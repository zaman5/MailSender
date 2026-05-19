import { Router, Response, Request } from 'express';
import nodemailer from 'nodemailer';
import db from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// ─── 1×1 transparent GIF ────────────────────────────────────────────────────
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// ─── Concurrency lock: only ONE run per campaign at a time ──────────────────
const runningCampaigns = new Set<string>();

// ─── Template variables ──────────────────────────────────────────────────────
function applyVariables(text: string, lead: any, account: any, signature: string): string {
  // Spintax: {{random|A|B|C}}
  text = text.replace(/\{\{random\|([^}]+)\}\}/g, (_: string, opts: string) => {
    const choices = opts.split('|');
    return choices[Math.floor(Math.random() * choices.length)];
  });
  const name       = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.name || lead.email;
  const senderName = [account.first_name, account.last_name].filter(Boolean).join(' ') || account.email;
  const vars: Record<string, string> = {
    '{{first_name}}':       lead.first_name || name.split(' ')[0] || '',
    '{{last_name}}':        lead.last_name  || name.split(' ').slice(1).join(' ') || '',
    '{{full_name}}':        name,
    '{{email}}':            lead.email || '',
    '{{company}}':          lead.company || '',
    '{{job_title}}':        lead.title || '',
    '{{phone}}':            lead.phone || '',
    '{{city}}':             lead.city || '',
    '{{state}}':            lead.state || '',
    '{{country}}':          lead.country || '',
    '{{linkedin_url}}':     lead.linkedin_url || '',
    '{{sender_name}}':      senderName,
    // Convert \n to <br> so multi-line signatures render correctly in HTML email
    '{{sender_signature}}': (signature || senderName).replace(/\r?\n/g, '<br>'),
  };
  for (const [key, val] of Object.entries(vars)) {
    text = text.split(key).join(val);
  }
  return text;
}

function stripHtml(html: string): string {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function makeTransport(account: any): nodemailer.Transporter {
  const timeoutConfig = { connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 };
  
  if (account.esp === 'Google') {
    return nodemailer.createTransport({ service: 'gmail', auth: { user: account.email, pass: account.app_password }, ...timeoutConfig });
  }
  if (account.esp === 'Microsoft') {
    return nodemailer.createTransport({
      host: 'smtp.office365.com', port: 587, secure: false,
      auth: { user: account.email, pass: account.app_password },
      tls: { ciphers: 'SSLv3' },
      ...timeoutConfig
    });
  }
  const port = parseInt(account.smtp_port || '587', 10);
  return nodemailer.createTransport({
    host: account.smtp_host, port, secure: port === 465,
    auth: { user: account.smtp_user || account.email, pass: account.smtp_pass },
    tls: { rejectUnauthorized: false },
    ...timeoutConfig
  });
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Open Tracking Pixel ─────────────────────────────────────────────────────
// GET /api/send/track/open/:campaignId/:leadId
router.get('/track/open/:campaignId/:leadId', (req: Request, res: Response) => {
  const campaignId = req.params.campaignId as string;
  const leadId = req.params.leadId as string;
  try {
    // Only count FIRST open per lead-step to avoid inflating numbers
    const lead = db.prepare('SELECT opened FROM campaign_leads WHERE id=? AND campaign_id=?').get(leadId, campaignId) as any;
    if (lead) {
      db.prepare('UPDATE campaign_leads SET opened=opened+1 WHERE id=? AND campaign_id=?').run(leadId, campaignId);
      db.prepare('UPDATE campaigns SET opens=opens+1 WHERE id=?').run(campaignId);
      console.log(`[Track] Open recorded: lead=${leadId} campaign=${campaignId} (total opens=${lead.opened + 1})`);
    }
  } catch (e) {
    console.error('[Track] Error recording open:', e);
  }
  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': TRACKING_PIXEL.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache', 'Expires': '0',
  });
  res.end(TRACKING_PIXEL);
});

// ─── Unsubscribe Tracking ────────────────────────────────────────────────────
// GET /api/send/unsubscribe/:campaignId/:leadId
router.get('/unsubscribe/:campaignId/:leadId', (req: Request, res: Response) => {
  try {
    db.prepare("UPDATE campaign_leads SET status='Unsubscribed' WHERE id=? AND campaign_id=?").run(req.params.leadId, req.params.campaignId);
    res.send('<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>You have been unsubscribed.</h2><p>You will no longer receive emails from this campaign.</p></body></html>');
  } catch(e) {
    res.send('<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Error processing request.</h2></body></html>');
  }
});

// ─── Activate / Validate ─────────────────────────────────────────────────────
// POST /api/send/campaign/:id/activate
router.post('/campaign/:id/activate', requireAuth, async (req: AuthRequest, res: Response) => {
  const campaignId = req.params.id as string;
  const c = db.prepare('SELECT * FROM campaigns WHERE id=? AND user_id=?').get(campaignId, req.userId) as any;
  if (!c) return res.status(404).json({ error: 'Campaign not found' });

  const accounts: any[] = db.prepare(
    `SELECT ea.id FROM campaign_accounts ca JOIN email_accounts ea ON ea.id=ca.account_id WHERE ca.campaign_id=?`
  ).all(campaignId);

  const seqRow = db.prepare('SELECT steps_json FROM campaign_sequences WHERE campaign_id=?').get(campaignId) as any;
  const steps  = seqRow?.steps_json ? (() => { try { return JSON.parse(seqRow.steps_json); } catch { return []; } })() : [];

  // Count leads that still have pending steps (not Bounced/Replied, AND step_index < total steps)
  const totalSteps   = steps.length;
  const allLeads     = db.prepare("SELECT * FROM campaign_leads WHERE campaign_id=?").all(campaignId) as any[];
  const pendingLeads = allLeads.filter(l => 
    !['Bounced', 'Replied', 'Completed'].includes(l.status) && (l.step_index ?? 0) < totalSteps
  );

  const warnings: string[] = [];
  if (!accounts.length)    warnings.push('No email accounts assigned — go to Settings tab');
  if (!steps.length)       warnings.push('No email sequence — go to Sequences tab and write your email');
  if (!pendingLeads.length && allLeads.length === 0) warnings.push('No leads found — go to Leads tab and add leads');
  // NOTE: Don't warn "no pending leads" if all leads already completed — that's fine!

  db.prepare("UPDATE campaigns SET status='active' WHERE id=?").run(campaignId);

  res.json({
    success: true,
    ready: warnings.length === 0,
    warnings,
    accounts: accounts.length,
    steps: steps.length,
    pendingLeads: pendingLeads.length,
    totalLeads: allLeads.length,
  });
});

import { isCampaignWithinSchedule } from '../utils/schedule';

// ─── Main Sending Engine ─────────────────────────────────────────────────────

export async function runCampaignEngine(campaignId: string, userId: number, reqOrigin?: string, reqHost?: string, reqProto?: string): Promise<{ started: boolean, message: string, leads?: number, accounts?: number }> {
  // ── Concurrency guard: prevent double-run ──────────────────────────────────
  if (runningCampaigns.has(campaignId)) {
    return { started: false, message: 'Campaign is already sending. Wait for the current batch to finish.' };
  }

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id=? AND user_id=?').get(campaignId, userId) as any;
  if (!campaign)                       return { started: false, message: 'Campaign not found' };
  if (campaign.status !== 'active')    return { started: false, message: 'Campaign is paused. Toggle it ON first.' };

  const allAccounts: any[] = db.prepare(`
    SELECT ea.* FROM campaign_accounts ca
    JOIN email_accounts ea ON ea.id = ca.account_id
    WHERE ca.campaign_id = ?
  `).all(campaignId);
  if (!allAccounts.length) return { started: false, message: 'No email accounts assigned. Go to Settings → Sending Email Accounts.' };

  // ── Shuffle accounts randomly so different accounts are used each run ─────
  const accounts = [...allAccounts].sort(() => Math.random() - 0.5);

  const seqRow = db.prepare('SELECT steps_json, schedule_json FROM campaign_sequences WHERE campaign_id=?').get(campaignId) as any;
  const steps: any[] = seqRow?.steps_json ? (() => { try { return JSON.parse(seqRow.steps_json); } catch { return []; } })() : [];
  if (!steps.length) return { started: false, message: 'No sequence steps. Go to Sequences tab and write your email.' };

  // ── Enforce Schedule Window ───────────────────────────────────────────────
  const schedCheck = isCampaignWithinSchedule(seqRow?.schedule_json);
  if (!schedCheck.allowed) {
    return { started: false, message: `Queued: ${schedCheck.reason}` };
  }

  const schedule: any = seqRow?.schedule_json ? (() => { try { return JSON.parse(seqRow.schedule_json); } catch { return {}; } })() : {};
  const maxEmails    = parseInt(schedule.maxEmails || '100');
  const deliveryMode = schedule.deliveryMode || 'random';
  const quickMinutes = parseFloat(schedule.quickMinutes || '60');
  const customMs     = deliveryMode === 'custom'
    ? parseFloat(schedule.customInterval || '2') * (schedule.customUnit === 'seconds' ? 1000 : schedule.customUnit === 'hours' ? 3600000 : 60000)
    : 0;

  const sigRow    = db.prepare('SELECT signature FROM user_settings WHERE user_id=?').get(userId) as any;
  const signature = sigRow?.signature || '';

  // ── Tracking pixel URL: MUST be public (not localhost) ────────────────────
  const protocol   = reqProto || 'http';
  const host       = reqHost || 'localhost:5000';
  const backendUrl = process.env.BACKEND_URL || reqOrigin || `${protocol}://${host}`;

  // Parse Settings
  const settings = campaign.settings_json ? (() => { try { return JSON.parse(campaign.settings_json); } catch { return {}; } })() : {};
  const safety = settings.safety || {};
  const openTracking = safety.openTracking ?? false;
  const unsubLink    = safety.unsubLink ?? false;

  // ── Get only leads that STILL have pending steps ──────────────────────────
  // Key fix: filter by step_index < total steps to prevent resending completed leads
  // and ensure next_step_at is either 0 or in the past
  const totalSteps = steps.length;
  const now = Date.now();
  const leads: any[] = (db.prepare(`
    SELECT * FROM campaign_leads
    WHERE campaign_id=?
      AND status NOT IN ('Bounced', 'Completed', 'Replied')
      AND (step_index IS NULL OR step_index < ?)
      AND (
        -- New leads (step 0): always ready, next_step_at starts at 0
        (step_index IS NULL OR step_index = 0)
        OR
        -- Follow-up steps: only ready when next_step_at was explicitly set AND is in the past
        (step_index > 0 AND next_step_at IS NOT NULL AND next_step_at > 0 AND next_step_at <= ?)
      )
    ORDER BY created_at ASC
    LIMIT ?
  `).all(campaignId, totalSteps, now, maxEmails) as any[]);

  if (!leads.length) {
    return { started: false, message: 'All leads have been contacted. No pending leads remaining.' };
  }

  // ── Background Execution Context ───────────────────────────────────────────
  // We return immediately to the caller, and execute the loop asynchronously
  const responseObj = {
    started: true,
    leads: leads.length,
    accounts: accounts.length,
    message: `✅ Sending step emails to ${leads.length} lead(s) via ${accounts.length} account(s). Performance column updates live.`,
  };

  // ── Lock BEFORE launching async worker to prevent race-condition double-sends ──
  runningCampaigns.add(campaignId);

  // Launch async worker
  (async () => {
  try {
    let baseDelayMs = 0;
    if (deliveryMode === 'quick') {
      baseDelayMs = 2000;
    } else if (deliveryMode === 'custom') {
      baseDelayMs = customMs;
    }

    for (let i = 0; i < leads.length; i++) {
      const lead    = leads[i];
      const account = accounts[i % accounts.length]; // round-robin

      const stepIdx = lead.step_index ?? 0;

      // Double-check: skip if step already done (guard against race conditions)
      if (stepIdx >= totalSteps) {
        db.prepare("UPDATE campaign_leads SET status='Completed' WHERE id=?").run(lead.id);
        continue;
      }

      const step      = steps[stepIdx];
      const variation = step.variations?.[0];
      if (!variation?.subject && !variation?.body) continue;

      const subject = applyVariables(variation.subject || '(no subject)', lead, account, signature);
      let   html    = applyVariables(variation.body    || '', lead, account, signature);
      const text    = stripHtml(html);

      // Embed tracking pixel
      if (openTracking) {
        const pixel = `<img src="${backendUrl}/api/send/track/open/${campaignId}/${lead.id}" width="1" height="1" style="display:none;border:none;outline:none" alt="" />`;
        html = html.includes('</body>') ? html.replace('</body>', `${pixel}</body>`) : html + pixel;
      }

      // Add Unsubscribe link
      if (unsubLink) {
        const unsubUrl = `${backendUrl}/api/send/unsubscribe/${campaignId}/${lead.id}`;
        const unsubHtml = `<br><br><div style="font-size:11px;color:#888;">If you no longer wish to receive these emails, you may <a href="${unsubUrl}" style="color:#888;text-decoration:underline;">unsubscribe here</a>.</div>`;
        html = html.includes('</body>') ? html.replace('</body>', `${unsubHtml}</body>`) : html + unsubHtml;
      }

      const senderName = [account.first_name, account.last_name].filter(Boolean).join(' ') || account.email;

      // Delay between emails
      if (i > 0) {
        const wait = deliveryMode === 'random'
          ? Math.floor(Math.random() * 4000) + 2000  // 2–6s in dev
          : baseDelayMs;
        if (wait > 0) await sleep(wait);
      }

      // Re-check campaign is still active before each send
      const fresh = db.prepare('SELECT status FROM campaigns WHERE id=?').get(campaignId) as any;
      if (fresh?.status !== 'active') {
        console.log(`[Campaign ${campaignId}] Paused at lead ${i + 1}/${leads.length}`);
        break;
      }

      // Also re-check the lead hasn't been modified by another process
      const freshLead = db.prepare('SELECT step_index, status FROM campaign_leads WHERE id=?').get(lead.id) as any;
      if (!freshLead || ['Bounced', 'Completed', 'Replied'].includes(freshLead.status) || (freshLead.step_index ?? 0) > stepIdx) {
        console.log(`[Campaign ${campaignId}] Skipping lead ${lead.email} — already processed`);
        continue;
      }

      try {
        const transport = makeTransport(account);
        await transport.sendMail({
          from:    `"${senderName}" <${account.email}>`,
          to:      lead.email,
          subject,
          html,
          text,
        });

        const nextStep  = stepIdx + 1;
        const newStatus = nextStep >= totalSteps ? 'Completed' : 'In Progress';

        // Calculate exact timestamp when the next step is allowed to send.
        // NOTE: SequenceBuilder stores delay as 'waitDays' (integer days) — use that field.
        let nextStepAt = 0;
        if (nextStep < totalSteps) {
          const ns = steps[nextStep];
          // Support both field names for backward compatibility
          const waitDays = parseFloat(ns.waitDays ?? ns.delayDays ?? '0') || 0;
          const waitMinutes = parseFloat(ns.delayMinutes ?? '0') || 0;
          const delayMs = (waitDays * 86400000) + (waitMinutes * 60000);
          // Minimum 60 seconds to prevent instant resend on next cron tick
          nextStepAt = Date.now() + Math.max(delayMs, 60000);
        }

        // ── Per-lead counters (this is the only place that increments them) ──
        db.prepare('UPDATE campaign_leads SET sent=sent+1, step_index=?, status=?, next_step_at=? WHERE id=?')
          .run(nextStep, newStatus, nextStepAt, lead.id);
        // ── Campaign-level counter ──
        db.prepare('UPDATE campaigns SET sent=sent+1 WHERE id=?').run(campaignId);

        console.log(`[Campaign ${campaignId}] ✅ Step ${stepIdx + 1}/${totalSteps} → ${lead.email} (${account.email})`);

    } catch (err: any) {
        console.error(`[Campaign ${campaignId}] ❌ Failed ${lead.email}: ${err?.message}`);
        db.prepare("UPDATE campaign_leads SET status='Bounced' WHERE id=?").run(lead.id);
        db.prepare('UPDATE campaigns SET bounced=bounced+1 WHERE id=?').run(campaignId);

        // Auto-pause if bounce rate exceeds threshold
        const stats = db.prepare('SELECT sent, bounced, settings_json FROM campaigns WHERE id=?').get(campaignId) as any;
        if (stats?.sent >= 5) {
          const settings    = stats.settings_json ? (() => { try { return JSON.parse(stats.settings_json); } catch { return {}; } })() : {};
          const threshold   = parseFloat(settings?.bounceThreshold ?? '10');
          const bounceRate  = (stats.bounced / Math.max(stats.sent, 1)) * 100;
          if (bounceRate >= threshold) {
            db.prepare("UPDATE campaigns SET status='paused' WHERE id=?").run(campaignId);
            console.log(`[Campaign ${campaignId}] ⚠️ Auto-paused: bounce rate ${bounceRate.toFixed(1)}% >= ${threshold}%`);
            break;
          }
        }
      }
    }
  } catch (err) {
    console.error(`[Engine] Fatal error in campaign ${campaignId}:`, err);
  } finally {
    // Always release the lock
    runningCampaigns.delete(campaignId);
    // Sync prospects count
    const total = (db.prepare('SELECT COUNT(*) as n FROM campaign_leads WHERE campaign_id=?').get(campaignId) as any).n;
    db.prepare('UPDATE campaigns SET prospects=? WHERE id=?').run(total, campaignId);
    console.log(`[Campaign ${campaignId}] Batch complete`);
  }
  })();

  return responseObj;
}

// POST /api/send/campaign/:id/run
router.post('/campaign/:id/run', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const proto = (req.get('x-forwarded-proto') || req.protocol) as string;
    const host  = (req.get('host')) as string;
    const origin = (req.body.origin) as string;
    const campaignId = (req.params.id) as string;
    const result = await runCampaignEngine(campaignId, req.userId!, origin, host, proto);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to start campaign' });
  }
});

export default router;
