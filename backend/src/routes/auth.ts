import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db';
import { sendOtpEmail } from '../mailer';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

function genOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }
function makeToken(user: any) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/signup — send OTP first, do NOT create user yet
router.post('/signup', async (req: any, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  // Check if email already registered as active user
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  // Hash password and store as pending (not in users table yet)
  const hash = bcrypt.hashSync(password, 10);
  const otp = genOtp();
  const expires = Date.now() + 15 * 60 * 1000;

  // Upsert pending registration
  db.prepare('DELETE FROM pending_registrations WHERE email = ?').run(email);
  db.prepare(
    'INSERT INTO pending_registrations (name, email, password_hash, otp, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).run(name, email, hash, otp, expires);

  // Send OTP email — if it fails for any reason, include OTP in response as fallback
  let emailSent = false;
  try { await sendOtpEmail(email, otp, 'verify'); emailSent = true; } catch (e) { console.error('[OTP Email Error]:', e); }

  // Return OTP in response if email wasn't sent (missing config OR send failure)
  const debugOtp = !emailSent ? otp : undefined;
  const message  = emailSent
    ? 'Verification code sent to your email'
    : 'Email could not be sent — use the code displayed on screen';
  res.json({ message, debugOtp });
});

// POST /api/auth/verify-email — create account ONLY if OTP is correct
router.post('/verify-email', (req: any, res: Response) => {
  const { email, code } = req.body;

  // Look up pending registration
  const pending = db.prepare('SELECT * FROM pending_registrations WHERE email = ?').get(email) as any;
  if (!pending) return res.status(400).json({ error: 'No pending registration found. Please sign up again.' });
  if (pending.otp !== code) return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
  if (Date.now() > pending.expires_at) {
    db.prepare('DELETE FROM pending_registrations WHERE email = ?').run(email);
    return res.status(400).json({ error: 'Code expired. Please sign up again.' });
  }

  // OTP correct — now create the real user account
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  let user: any;
  if (existingUser) {
    // Edge case: user was somehow already created — just mark verified
    db.prepare('UPDATE users SET verified=1, active=1 WHERE email=?').run(email);
    user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  } else {
    const result = db.prepare(
      'INSERT INTO users (name, email, password, verified, active) VALUES (?, ?, ?, 1, 1)'
    ).run(pending.name, pending.email, pending.password_hash);
    user = db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid);
  }

  // Clean up pending record
  db.prepare('DELETE FROM pending_registrations WHERE email = ?').run(email);

  res.json({
    message: 'Account created successfully!',
    token: makeToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});


// POST /api/auth/login
router.post('/login', (req: any, res: Response) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email) as any;
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid email or password' });
  if (!user.verified) return res.status(403).json({ error: 'Please verify your email first' });
  if (!user.active) return res.status(403).json({ error: 'Account is deactivated. Contact admin.' });
  res.json({ token: makeToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: any, res: Response) => {
  const { email } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (!user) return res.json({ message: 'If that email exists, a code was sent.' });
  const otp = genOtp();
  const expires = Date.now() + 15 * 60 * 1000;
  db.prepare('DELETE FROM verification_codes WHERE email=? AND type=?').run(email, 'reset');
  db.prepare('INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)').run(email, otp, 'reset', expires);
  try { await sendOtpEmail(email, otp, 'reset'); } catch (e) { console.error('Email error:', e); }
  const debugOtp = (!process.env.EMAIL_USER) ? otp : undefined;
  res.json({ message: 'If that email exists, a reset code was sent.', debugOtp });
});

// POST /api/auth/reset-password
router.post('/reset-password', (req: any, res: Response) => {
  const { email, code, password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const row = db.prepare('SELECT * FROM verification_codes WHERE email=? AND type=? AND used=0').get(email, 'reset') as any;
  if (!row || row.code !== code) return res.status(400).json({ error: 'Invalid or expired code' });
  if (Date.now() > row.expires_at) return res.status(400).json({ error: 'Code expired' });
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password=? WHERE email=?').run(hash, email);
  db.prepare('UPDATE verification_codes SET used=1 WHERE id=?').run(row.id);
  res.json({ message: 'Password reset successfully. You can now log in.' });
});

// GET /api/auth/me
router.get('/me', (req: any, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET) as any;
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id=?').get(decoded.id) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

// PATCH /api/auth/profile — update name and email
router.patch('/profile', (req: any, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET) as any;
    const { name, email } = req.body;
    
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!email?.trim() || !email.includes('@')) return res.status(400).json({ error: 'Valid email is required' });

    // Ensure the new email isn't already taken by another account
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.trim(), decoded.id);
    if (existing) return res.status(400).json({ error: 'Email is already in use by another account' });

    db.prepare('UPDATE users SET name=?, email=? WHERE id=?').run(name.trim(), email.trim(), decoded.id);
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id=?').get(decoded.id) as any;
    res.json({ user });
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

// PATCH /api/auth/password — change password
router.patch('/password', (req: any, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET) as any;
    const { current, next } = req.body;
    if (!current || !next) return res.status(400).json({ error: 'Both current and new password required' });
    if (next.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(decoded.id) as any;
    if (!bcrypt.compareSync(current, user.password)) return res.status(400).json({ error: 'Current password is incorrect' });
    const hash = bcrypt.hashSync(next, 10);
    db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, decoded.id);
    res.json({ success: true });
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

export default router;

