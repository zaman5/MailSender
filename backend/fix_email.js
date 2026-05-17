const Database = require('better-sqlite3');
const db = new Database('data/mailsender.db');

const oldAdminEmail = 'admin@mailsender.com';
const targetEmail = 'zamantech5@gmail.com';

// Delete the target email if it exists (so we can take its place)
console.log('Checking for existing user...', targetEmail);
db.prepare('DELETE FROM users WHERE email = ? AND email != ?').run(targetEmail, oldAdminEmail);

// Rename admin@mailsender.com to zamantech5@gmail.com
console.log('Updating admin email...');
db.prepare("UPDATE users SET email = ? WHERE email = ?").run(targetEmail, oldAdminEmail);

console.log('Done!');
