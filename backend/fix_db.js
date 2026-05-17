const Database = require('better-sqlite3');
const path = require('path');

// Open the database file directly
const dbPath = path.join(__dirname, '../data/mailsender.db');
const db = new Database(dbPath);

console.log('Opening database to replace admin email...');

try {
  const targetEmail = 'zamantech5@gmail.com';
  const oldEmail = 'admin@mailsender.com';

  // 1. Delete any existing user with the target email to prevent Unique Constraint errors
  const deleted = db.prepare('DELETE FROM users WHERE email = ? AND email != ?').run(targetEmail, oldEmail);
  if (deleted.changes > 0) {
    console.log(`[INFO] Deleted conflicting user account for ${targetEmail}`);
  }

  // 2. Rename the admin account
  const updated = db.prepare("UPDATE users SET email = ? WHERE email = ?").run(targetEmail, oldEmail);
  
  if (updated.changes > 0) {
    console.log(`[SUCCESS] Admin email successfully replaced with ${targetEmail}!`);
    console.log(`[SUCCESS] You can now log in using ${targetEmail}`);
  } else {
    // Check if it was already updated
    const check = db.prepare('SELECT * FROM users WHERE email = ? AND role = "admin"').get(targetEmail);
    if (check) {
      console.log(`[SUCCESS] Admin email is ALREADY set to ${targetEmail}. No changes needed.`);
    } else {
      console.log(`[ERROR] Could not find the old admin account (${oldEmail}).`);
    }
  }

} catch (err) {
  console.error('[ERROR] Database modification failed:', err.message);
} finally {
  db.close();
}
