import { Router, Response } from 'express';
import db from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { runWarmupSending, runWarmupReceiving } from '../utils/warmupEngine';

const router = Router();

// ─── Helper to parse custom settings ─────────────────────────────────────────
function getWarmupSettings(account: any) {
  try {
    if (account.warmup_settings_json) {
      return JSON.parse(account.warmup_settings_json);
    }
  } catch (_) {}
  return {
    filterTag: 'helpful',
    includeFilterTag: false,
    dailyLimit: 20,
    emailReply: true,
    activeLimit: 1,
    dailyIncrement: 1,
    replyRate: 50,
    personalizedList: '',
    businessType: '',
    universe: '',
    customContent: '',
    signature: '',
    openaiKey: ''
  };
}

// ─── GET /api/warmup/settings/:accountId ─────────────────────────────────────
router.get('/settings/:accountId', requireAuth, (req: AuthRequest, res: Response) => {
  const account = db.prepare('SELECT * FROM email_accounts WHERE id=? AND user_id=?').get(req.params.accountId, req.userId) as any;
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const settings = getWarmupSettings(account);
  res.json({
    status: account.warmup_status || 'inactive',
    settings
  });
});

// ─── POST /api/warmup/settings/:accountId ────────────────────────────────────
router.post('/settings/:accountId', requireAuth, (req: AuthRequest, res: Response) => {
  const account = db.prepare('SELECT * FROM email_accounts WHERE id=? AND user_id=?').get(req.params.accountId, req.userId) as any;
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const newSettings = req.body.settings || {};
  const currentSettings = getWarmupSettings(account);
  const mergedSettings = { ...currentSettings, ...newSettings };

  db.prepare('UPDATE email_accounts SET warmup_settings_json=? WHERE id=?').run(
    JSON.stringify(mergedSettings),
    account.id
  );

  res.json({ success: true, settings: mergedSettings });
});

// ─── POST /api/warmup/toggle/:accountId ──────────────────────────────────────
router.post('/toggle/:accountId', requireAuth, (req: AuthRequest, res: Response) => {
  const account = db.prepare('SELECT * FROM email_accounts WHERE id=? AND user_id=?').get(req.params.accountId, req.userId) as any;
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const { status } = req.body; // 'active' or 'paused'
  const targetStatus = status === 'active' ? 'active' : 'paused';

  // Toggle the numeric warmup column as well (warmup daily count, let's say 5 or 0)
  const warmupDaily = targetStatus === 'active' ? 5 : 0;

  db.prepare('UPDATE email_accounts SET warmup_status=?, warmup=? WHERE id=?').run(
    targetStatus,
    warmupDaily,
    account.id
  );

  res.json({ success: true, status: targetStatus, warmup: warmupDaily });
});

// ─── GET /api/warmup/stats/:accountId ────────────────────────────────────────
router.get('/stats/:accountId', requireAuth, (req: AuthRequest, res: Response) => {
  const account = db.prepare('SELECT * FROM email_accounts WHERE id=? AND user_id=?').get(req.params.accountId, req.userId) as any;
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const accountId = account.id;
  const email = account.email;

  // 1. Sent count
  const totalSentRow = db.prepare('SELECT COUNT(*) as count FROM warmup_logs WHERE sender_account_id=?').get(accountId) as any;
  const totalSent = totalSentRow?.count || 0;

  // 2. Received count (sent from others to us)
  const totalReceivedRow = db.prepare('SELECT COUNT(*) as count FROM warmup_logs WHERE recipient_email=?').get(email) as any;
  const totalReceived = totalReceivedRow?.count || 0;

  // 3. Landed in inbox
  const landedInboxRow = db.prepare("SELECT COUNT(*) as count FROM warmup_logs WHERE recipient_email=? AND folder_found='INBOX'").get(email) as any;
  const landedInbox = landedInboxRow?.count || 0;

  // 4. Saved from spam
  const savedFromSpamRow = db.prepare("SELECT COUNT(*) as count FROM warmup_logs WHERE recipient_email=? AND (folder_found='Spam' OR status='saved_from_spam')").get(email) as any;
  const savedFromSpam = savedFromSpamRow?.count || 0;

  // 5. Replied count
  const repliedRow = db.prepare("SELECT COUNT(*) as count FROM warmup_logs WHERE sender_account_id=? AND status='replied'").get(accountId) as any;
  const replied = repliedRow?.count || 0;

  // Calculate deliverability percentage (Inbox vs Spam)
  const totalChecked = landedInbox + savedFromSpam;
  const landedInboxPercent = totalChecked > 0 ? Math.round((landedInbox / totalChecked) * 100) : 100;
  const savedFromSpamPercent = totalChecked > 0 ? Math.round((savedFromSpam / totalChecked) * 100) : 0;

  // 6. Generate 7 days metrics
  const dailyStats = [];
  const daysLabels = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Day label e.g., '19 Apr' or '1 Jun'
    const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    daysLabels.push(label);

    const sent = db.prepare('SELECT COUNT(*) as count FROM warmup_logs WHERE sender_account_id=? AND date_sent=?').get(accountId, dateStr) as any;
    const inbox = db.prepare("SELECT COUNT(*) as count FROM warmup_logs WHERE recipient_email=? AND date_sent=? AND folder_found='INBOX'").get(email, dateStr) as any;
    const spam = db.prepare("SELECT COUNT(*) as count FROM warmup_logs WHERE recipient_email=? AND date_sent=? AND (folder_found='Spam' OR status='saved_from_spam')").get(email, dateStr) as any;

    dailyStats.push({
      date: dateStr,
      sent: sent?.count || 0,
      inbox: inbox?.count || 0,
      spam: spam?.count || 0
    });
  }

  res.json({
    totalSent,
    totalReceived,
    landedInbox,
    savedFromSpam,
    replied,
    landedInboxPercent,
    savedFromSpamPercent,
    dailyStats,
    daysLabels
  });
});

// ─── POST /api/warmup/trigger ────────────────────────────────────────────────
// Triggers an immediate sending and receiving check for active warmup accounts (admin/diagnostic tool)
router.post('/trigger', requireAuth, async (req: AuthRequest, res: Response) => {
  const logs: string[] = [];
  logs.push("=== MANUALLY TRIGGERING WARMUP ENGINE ===");
  
  try {
    logs.push("1. Running Warmup Sending Loop...");
    const sendRes = await runWarmupSending();
    logs.push(`Warmup sending finished. Sent ${sendRes.sent} emails.`);
    logs.push(...sendRes.logs.map(l => `  [Send] ${l}`));

    logs.push("2. Running Warmup Monitoring & Auto-Reply Loop...");
    const recvRes = await runWarmupReceiving();
    logs.push(`Warmup receiving finished. Processed ${recvRes.processed} emails.`);
    logs.push(...recvRes.logs.map(l => `  [Recv] ${l}`));

    res.json({
      success: true,
      logs
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      logs
    });
  }
});

export default router;
