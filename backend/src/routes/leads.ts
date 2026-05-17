import { Router, Response } from 'express';
import db from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/leads — all lead lists for the user
router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  const lists = db.prepare(
    'SELECT * FROM lead_lists WHERE user_id=? ORDER BY created_at DESC'
  ).all(req.userId) as any[];

  // Attach leads to each list
  const result = lists.map((list: any) => {
    const leads = db.prepare(
      'SELECT * FROM leads WHERE list_id=? ORDER BY created_at ASC'
    ).all(list.id);
    return { ...list, leads, count: (leads as any[]).length };
  });

  res.json(result);
});

// POST /api/leads — create a new list
router.post('/', requireAuth, (req: AuthRequest, res: Response) => {
  const { name } = req.body as { name: string };
  if (!name?.trim()) return res.status(400).json({ error: 'List name is required' });

  const result = db.prepare(
    'INSERT INTO lead_lists (user_id, name) VALUES (?, ?)'
  ).run(req.userId, name.trim());

  const list = db.prepare('SELECT * FROM lead_lists WHERE id=?').get(result.lastInsertRowid) as any;
  res.json({ ...list, leads: [], count: 0 });
});

// DELETE /api/leads/:id — delete a list and its leads
router.delete('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  // Verify list belongs to requesting user before deleting
  const list = db.prepare('SELECT id FROM lead_lists WHERE id=? AND user_id=?').get(req.params.id, req.userId);
  if (!list) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM leads WHERE list_id=?').run(req.params.id);
  db.prepare('DELETE FROM lead_lists WHERE id=? AND user_id=?').run(req.params.id, req.userId);
  res.json({ success: true });
});


// PATCH /api/leads/:id — rename a list
router.patch('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const { name } = req.body as { name: string };
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  db.prepare('UPDATE lead_lists SET name=? WHERE id=? AND user_id=?')
    .run(name.trim(), req.params.id, req.userId);
  const list = db.prepare('SELECT * FROM lead_lists WHERE id=?').get(req.params.id) as any;
  const leads = db.prepare('SELECT * FROM leads WHERE list_id=?').all(req.params.id);
  res.json({ ...list, leads, count: (leads as any[]).length });
});

// POST /api/leads/:id/import — add leads to a list
router.post('/:id/import', requireAuth, (req: AuthRequest, res: Response) => {
  const { leads } = req.body as {
    leads: Array<{
      email: string; name?: string; first_name?: string; last_name?: string;
      company?: string; phone?: string; title?: string;
      city?: string; state?: string; country?: string; linkedin_url?: string;
    }>
  };
  if (!Array.isArray(leads) || leads.length === 0)
    return res.status(400).json({ error: 'No leads provided' });

  const listId = req.params.id;
  const list = db.prepare('SELECT id FROM lead_lists WHERE id=? AND user_id=?').get(listId, req.userId);
  if (!list) return res.status(404).json({ error: 'List not found' });

  const insert = db.prepare(
    `INSERT OR IGNORE INTO leads
       (list_id, user_id, name, first_name, last_name, email, company, phone, title, city, state, country, linkedin_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertMany = db.transaction((items: typeof leads) => {
    for (const lead of items) {
      if (!lead.email?.includes('@')) continue;
      const fn = lead.first_name || '';
      const ln = lead.last_name  || '';
      const fullName = lead.name || [fn, ln].filter(Boolean).join(' ') || lead.email.split('@')[0];
      insert.run(
        listId, req.userId,
        fullName, fn, ln,
        lead.email.trim(),
        lead.company     || '',
        lead.phone       || '',
        lead.title       || '',
        lead.city        || '',
        lead.state       || '',
        lead.country     || '',
        lead.linkedin_url|| '',
      );
    }
  });
  insertMany(leads);

  const updatedLeads = db.prepare('SELECT * FROM leads WHERE list_id=?').all(listId);
  const updatedList  = db.prepare('SELECT * FROM lead_lists WHERE id=?').get(listId) as any;
  res.json({ ...updatedList, leads: updatedLeads, count: (updatedLeads as any[]).length });
});

// PATCH /api/leads/:listId/lead/:leadId — edit a single lead
router.patch('/:listId/lead/:leadId', requireAuth, (req: AuthRequest, res: Response) => {
  const { listId, leadId } = req.params;
  const list = db.prepare('SELECT id FROM lead_lists WHERE id=? AND user_id=?').get(listId, req.userId);
  if (!list) return res.status(404).json({ error: 'Not found' });

  const { first_name='', last_name='', email='', company='', phone='', title='', city='', state='', country='', linkedin_url='' } = req.body as any;
  const name = [first_name, last_name].filter(Boolean).join(' ') || email.split('@')[0];

  db.prepare(
    `UPDATE leads SET name=?, first_name=?, last_name=?, email=?, company=?, phone=?,
       title=?, city=?, state=?, country=?, linkedin_url=? WHERE id=? AND list_id=?`
  ).run(name, first_name, last_name, email, company, phone, title, city, state, country, linkedin_url, leadId, listId);

  const updatedLeads = db.prepare('SELECT * FROM leads WHERE list_id=?').all(listId);
  const updatedList  = db.prepare('SELECT * FROM lead_lists WHERE id=?').get(listId) as any;
  res.json({ ...updatedList, leads: updatedLeads, count: (updatedLeads as any[]).length });
});

// DELETE /api/leads/:listId/lead/:leadId — delete a single lead
router.delete('/:listId/lead/:leadId', requireAuth, (req: AuthRequest, res: Response) => {
  const { listId, leadId } = req.params;
  const list = db.prepare('SELECT id FROM lead_lists WHERE id=? AND user_id=?').get(listId, req.userId);
  if (!list) return res.status(404).json({ error: 'Not found' });

  db.prepare('DELETE FROM leads WHERE id=? AND list_id=?').run(leadId, listId);

  const updatedLeads = db.prepare('SELECT * FROM leads WHERE list_id=?').all(listId);
  const updatedList  = db.prepare('SELECT * FROM lead_lists WHERE id=?').get(listId) as any;
  res.json({ ...updatedList, leads: updatedLeads, count: (updatedLeads as any[]).length });
});

export default router;
