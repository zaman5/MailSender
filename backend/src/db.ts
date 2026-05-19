import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/mailsender.db');
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    verified INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS email_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    email TEXT NOT NULL,
    esp TEXT DEFAULT 'Google',
    status TEXT DEFAULT 'active',
    sent INTEGER DEFAULT 0,
    limit_per_day INTEGER DEFAULT 150,
    warmup INTEGER DEFAULT 0,
    bounce TEXT DEFAULT '0%',
    reply_rate TEXT DEFAULT '0%',
    campaigns INTEGER DEFAULT 0,
    spf INTEGER DEFAULT 1,
    dkim INTEGER DEFAULT 1,
    dmarc INTEGER DEFAULT 1,
    mx INTEGER DEFAULT 1,
    app_password TEXT DEFAULT '',
    smtp_host TEXT DEFAULT '',
    smtp_port TEXT DEFAULT '587',
    smtp_user TEXT DEFAULT '',
    smtp_pass TEXT DEFAULT '',
    imap_host TEXT DEFAULT '',
    imap_port TEXT DEFAULT '993',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    sent INTEGER DEFAULT 0,
    opens INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    bounced INTEGER DEFAULT 0,
    prospects INTEGER DEFAULT 0,
    created_at DATE DEFAULT (date('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS lead_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER,
    user_id INTEGER NOT NULL,
    name TEXT DEFAULT '',
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    email TEXT NOT NULL,
    company TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    title TEXT DEFAULT '',
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    country TEXT DEFAULT '',
    linkedin_url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(list_id, email),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (list_id) REFERENCES lead_lists(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS campaign_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    name TEXT DEFAULT '',
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    email TEXT NOT NULL,
    company TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    title TEXT DEFAULT '',
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    country TEXT DEFAULT '',
    linkedin_url TEXT DEFAULT '',
    status TEXT DEFAULT 'In Progress',
    sent INTEGER DEFAULT 0,
    opened INTEGER DEFAULT 0,
    clicked INTEGER DEFAULT 0,
    replied INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, email),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS campaign_sequences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    steps_json TEXT NOT NULL DEFAULT '[]',
    schedule_json TEXT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    signature TEXT DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS account_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    tag        TEXT NOT NULL,
    UNIQUE(account_id, tag),
    FOREIGN KEY (account_id) REFERENCES email_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS campaign_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    account_id  INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    UNIQUE(campaign_id, account_id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id)  REFERENCES email_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS pending_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS inbox_cache (
    id TEXT PRIMARY KEY,          -- "{userId}-{accountId}-{uid}"
    user_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    account_email TEXT NOT NULL,
    folder TEXT NOT NULL,
    uid INTEGER NOT NULL,
    sender_name TEXT DEFAULT '',
    sender_email TEXT DEFAULT '',
    subject TEXT DEFAULT '',
    preview TEXT DEFAULT '',
    body TEXT DEFAULT NULL,
    date_raw TEXT NOT NULL,
    unread INTEGER DEFAULT 1,
    starred INTEGER DEFAULT 0,
    spam INTEGER DEFAULT 0,
    synced_at INTEGER DEFAULT 0,
    UNIQUE(user_id, account_id, folder, uid)
  );
`);

// ── Migration: rebuild inbox_cache with user_id in UNIQUE constraint ──────────
// SQLite cannot ALTER a UNIQUE constraint, so we recreate the table if needed.
try {
  const tableInfo = db.prepare("PRAGMA index_list(inbox_cache)").all() as any[];
  const hasUserIdUnique = tableInfo.some((idx: any) => {
    const cols = db.prepare(`PRAGMA index_info(${idx.name})`).all() as any[];
    return cols.some((c: any) => c.name === 'user_id') && cols.some((c: any) => c.name === 'uid');
  });
  if (!hasUserIdUnique) {
    console.log('[DB] Migrating inbox_cache to add user_id to unique constraint...');
    db.exec(`
      BEGIN;
      CREATE TABLE IF NOT EXISTS inbox_cache_new (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        account_email TEXT NOT NULL,
        folder TEXT NOT NULL,
        uid INTEGER NOT NULL,
        sender_name TEXT DEFAULT '',
        sender_email TEXT DEFAULT '',
        subject TEXT DEFAULT '',
        preview TEXT DEFAULT '',
        body TEXT DEFAULT NULL,
        date_raw TEXT NOT NULL,
        unread INTEGER DEFAULT 1,
        starred INTEGER DEFAULT 0,
        spam INTEGER DEFAULT 0,
        synced_at INTEGER DEFAULT 0,
        UNIQUE(user_id, account_id, folder, uid)
      );
      INSERT OR IGNORE INTO inbox_cache_new
        SELECT id, user_id, account_id, account_email, folder, uid,
               sender_name, sender_email, subject, preview, body, date_raw,
               unread, starred, spam, synced_at
        FROM inbox_cache;
      DROP TABLE inbox_cache;
      ALTER TABLE inbox_cache_new RENAME TO inbox_cache;
      COMMIT;
    `);
    console.log('[DB] inbox_cache migration complete.');
  }
} catch (e) {
  console.error('[DB] inbox_cache migration error:', e);
}


const credCols = [
  ['app_password', "TEXT DEFAULT ''"],
  ['smtp_host',    "TEXT DEFAULT ''"],
  ['smtp_port',    "TEXT DEFAULT '587'"],
  ['smtp_user',    "TEXT DEFAULT ''"],
  ['smtp_pass',    "TEXT DEFAULT ''"],
  ['imap_host',    "TEXT DEFAULT ''"],
  ['imap_port',    "TEXT DEFAULT '993'"],
];
for (const [col, def] of credCols) {
  try {
    db.prepare(`ALTER TABLE email_accounts ADD COLUMN ${col} ${def}`).run();
  } catch (_) { /* column already exists — ignore */ }
}

// ── Migration: add missing columns to leads table ─────────────────────────────
const leadsCols: [string, string][] = [
  ['list_id',     'INTEGER'],
  ['user_id',     'INTEGER'],
  ['company',     "TEXT DEFAULT ''"],
  ['phone',       "TEXT DEFAULT ''"],
  ['title',       "TEXT DEFAULT ''"],
  ['city',        "TEXT DEFAULT ''"],
  ['state',       "TEXT DEFAULT ''"],
  ['country',     "TEXT DEFAULT ''"],
  ['linkedin_url',"TEXT DEFAULT ''"],
  ['first_name',  "TEXT DEFAULT ''"],
  ['last_name',   "TEXT DEFAULT ''"],
];
for (const [col, def] of leadsCols) {
  try {
    db.prepare(`ALTER TABLE leads ADD COLUMN ${col} ${def}`).run();
    console.log(`[DB] leads: added column '${col}'`);
  } catch (_) { /* column already exists — ignore */ }
}

// ── Migration: add schedule_json to campaign_sequences ────────────────────────
try {
  db.prepare(`ALTER TABLE campaign_sequences ADD COLUMN schedule_json TEXT DEFAULT NULL`).run();
  console.log('[DB] campaign_sequences: added column schedule_json');
} catch (_) { /* already exists */ }

// ── Migration: add next_step_at to campaign_leads ─────────────────────────────
try {
  db.prepare(`ALTER TABLE campaign_leads ADD COLUMN next_step_at INTEGER DEFAULT 0`).run();
  console.log('[DB] campaign_leads: added column next_step_at');
} catch (_) { /* already exists */ }

// ── Migration: add settings_json to campaigns ─────────────────────────────────
try {
  db.prepare(`ALTER TABLE campaigns ADD COLUMN settings_json TEXT DEFAULT NULL`).run();
  console.log('[DB] campaigns: added column settings_json');
} catch (_) { /* already exists */ }

// ── Migration: add replies column to campaigns (was missing, causing 500s) ─────
try {
  db.prepare(`ALTER TABLE campaigns ADD COLUMN replies INTEGER DEFAULT 0`).run();
  console.log('[DB] campaigns: added column replies');
} catch (_) { /* already exists */ }

// ── Migration: add warmup_status column to email_accounts ──────────────────────
try {
  db.prepare(`ALTER TABLE email_accounts ADD COLUMN warmup_status TEXT DEFAULT 'inactive'`).run();
  console.log('[DB] email_accounts: added column warmup_status');
} catch (_) { /* already exists */ }

// ── Migration: add step_index to campaign_leads ────────────────────────────────
try {
  db.prepare(`ALTER TABLE campaign_leads ADD COLUMN step_index INTEGER DEFAULT 0`).run();
  console.log('[DB] campaign_leads: added column step_index');
} catch (_) { /* already exists */ }

// ── Migration: add per-lead performance tracking columns ───────────────────────
const trackCols = ['sent INTEGER DEFAULT 0', 'opened INTEGER DEFAULT 0', 'clicked INTEGER DEFAULT 0', 'replied INTEGER DEFAULT 0'];
for (const col of trackCols) {
  try {
    db.prepare(`ALTER TABLE campaign_leads ADD COLUMN ${col}`).run();
    console.log(`[DB] campaign_leads: added column ${col.split(' ')[0]}`);
  } catch (_) { /* already exists */ }
}

// ── Cleanup: ensure no NULLs in tracking columns (fixes NULL + 1 = NULL bug) ──
['sent', 'opened', 'clicked', 'replied', 'step_index'].forEach(col => {
  db.prepare(`UPDATE campaign_leads SET ${col}=0 WHERE ${col} IS NULL`).run();
});
['sent', 'opens', 'replies', 'bounced'].forEach(col => {
  db.prepare(`UPDATE campaigns SET ${col}=0 WHERE ${col} IS NULL`).run();
});

// Seed admin account
const adminEmail = process.env.ADMIN_EMAIL || 'admin@mailsender.com';
const adminPass  = process.env.ADMIN_PASSWORD || 'Admin@1234';
// One-time fix: Force rename admin@mailsender.com to zamantech5@gmail.com
try {
  // If zamantech5@gmail.com already exists as a separate user, delete it so we can take the email
  db.prepare('DELETE FROM users WHERE email = ? AND email != ?').run('zamantech5@gmail.com', 'admin@mailsender.com');
  // Rename the admin account
  db.prepare("UPDATE users SET email = ? WHERE email = ?").run('zamantech5@gmail.com', 'admin@mailsender.com');
  console.log('[DB] Admin account forcefully renamed to zamantech5@gmail.com');
} catch (e) {
  console.error('[DB] Error renaming admin:', e);
}

const hash = bcrypt.hashSync(adminPass, 10);
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);

if (!existing) {
  db.prepare(`INSERT INTO users (name, email, password, role, verified) VALUES (?, ?, ?, 'admin', 1)`)
    .run('Admin', adminEmail, hash);
  console.log(`[DB] Admin account created: ${adminEmail} / ${adminPass}`);
} else {
  // Force update existing user to admin and apply the new password
  db.prepare(`UPDATE users SET password = ?, role = 'admin', verified = 1 WHERE email = ?`)
    .run(hash, adminEmail);
  console.log(`[DB] Existing account ${adminEmail} forced to Admin role with new password.`);
}

export default db;
