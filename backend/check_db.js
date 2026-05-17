const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/mailsender.db');
const db = new Database(dbPath);

console.log("USERS:");
const users = db.prepare('SELECT id, name, email FROM users').all();
console.table(users);

console.log("\nEMAIL ACCOUNTS:");
const accounts = db.prepare('SELECT id, user_id, email FROM email_accounts').all();
console.table(accounts);

console.log("\nINBOX CACHE (Summary):");
const cache = db.prepare('SELECT user_id, count(*) as count FROM inbox_cache GROUP BY user_id').all();
console.table(cache);

db.close();
