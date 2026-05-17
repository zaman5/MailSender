import { Router, Response } from 'express';
import db from '../db';
import { requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/users', requireAdmin, (_req: AuthRequest, res: Response) => {
  const users = db.prepare('SELECT id, name, email, role, verified, active, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

router.patch('/users/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  const { active, role } = req.body;
  if (active !== undefined) db.prepare('UPDATE users SET active=? WHERE id=?').run(active ? 1 : 0, req.params.id);
  if (role !== undefined) db.prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  const user = db.prepare('SELECT id,name,email,role,verified,active FROM users WHERE id=?').get(req.params.id);
  res.json(user);
});

router.delete('/users/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  const target = db.prepare('SELECT role FROM users WHERE id=?').get(req.params.id) as any;
  if (target?.role === 'admin') return res.status(400).json({ error: 'Cannot delete admin' });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

export default router;
