import React, { useState } from 'react';
import ImportLeads from './ImportLeads';

const STATUSES = [
  { label: 'Replied', cls: 'badge-success' },
  { label: 'Completed', cls: 'badge-info' },
  { label: 'In Progress', cls: 'badge-warning' },
  { label: 'Bounced', cls: 'badge-danger' },
];

const SAMPLE_LEADS = [
  { initials: 'IA', color: '#6366f1', name: 'Infintum Ali', email: 'infinitumail71@gmail.com', esp: 'Google', sent: 1, opened: 0, clicked: 0, replied: 1, status: 'Replied', step: '1/1', label: null },
  { initials: 'AI', color: '#10b981', name: 'Ali Infintum', email: 'aliinfintummoida@gmail.com', esp: 'Google', sent: 1, opened: 0, clicked: 0, replied: 1, status: 'Replied', step: '1/1', label: null },
  { initials: 'ZM', color: '#f59e0b', name: 'Zaman Muhammad', email: '2019f-mulbscs-132@mul.edu.pk', esp: 'Google', sent: 1, opened: 0, clicked: 0, replied: 0, status: 'Completed', step: '1/1', label: null },
  { initials: 'MZ', color: '#ec4899', name: 'Muhammad Zaman', email: 'zamantech5@gmail.com', esp: 'Google', sent: 1, opened: 0, clicked: 0, replied: 0, status: 'Completed', step: '1/1', label: null },
  { initials: 'N', color: '#8b5cf6', name: 'Naina', email: 'gnaineg8@gmail.com', esp: 'Google', sent: 1, opened: 0, clicked: 0, replied: 1, status: 'Replied', step: '1/1', label: null },
  { initials: 'TH', color: '#06b6d4', name: 'Taimur H', email: 'taimur.h@dakia.ai', esp: 'Microsoft', sent: 1, opened: 0, clicked: 0, replied: 0, status: 'Completed', step: '1/1', label: null },
  { initials: 'MA', color: '#10b981', name: 'Mehdi A', email: 'mehdi@startup.io', esp: 'Google', sent: 1, opened: 1, clicked: 1, replied: 0, status: 'In Progress', step: '1/2', label: null },
  { initials: 'SR', color: '#ef4444', name: 'Sarah R', email: 'sarah@bigcorp.com', esp: 'Google', sent: 1, opened: 0, clicked: 0, replied: 0, status: 'Bounced', step: '1/1', label: null },
];

const ESP_ICON = {
  Google: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  ),
  Microsoft: (
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.5 11.5H2v-9h9.5v9z" fill="#F25022"/>
      <path d="M22 11.5h-9.5v-9H22v9z" fill="#7FBA00"/>
      <path d="M11.5 22H2v-9h9.5v9z" fill="#00A4EF"/>
      <path d="M22 22h-9.5v-9H22v9z" fill="#FFB900"/>
    </svg>
  ),
};

const COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#ef4444','#f97316'];

export default function CampaignLeads() {
  const [leads, setLeads] = useState(SAMPLE_LEADS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selected, setSelected] = useState([]);
  const [importModal, setImportModal] = useState(false);
  const [importTab, setImportTab] = useState('csv');
  const [pasteText, setPasteText] = useState('');
  const [manualForm, setManualForm] = useState({ name: '', email: '', company: '' });
  const [actionsOpen, setActionsOpen] = useState(null);
  const [toast, setToast] = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200); }

  function importFromPaste() {
    const lines = pasteText.split('\n').map(l => l.trim()).filter(l => l.includes('@'));
    const newLeads = lines.map(line => {
      const parts = line.split(',');
      const email = parts.find(p => p.includes('@'))?.trim() || line.trim();
      const name = parts[0]?.trim().includes('@') ? email.split('@')[0] : parts[0]?.trim() || email.split('@')[0];
      return { initials: name.slice(0,2).toUpperCase(), color: COLORS[Math.floor(Math.random()*COLORS.length)], name, email, esp: email.includes('gmail') ? 'Google' : 'Microsoft', sent: 0, opened: 0, clicked: 0, replied: 0, status: 'In Progress', step: '0/1', label: null };
    });
    if (newLeads.length === 0) { showToast('No valid emails found'); return; }
    setLeads(prev => [...prev, ...newLeads]);
    setPasteText('');
    setImportModal(false);
    showToast(`${newLeads.length} lead(s) imported`);
  }

  function importManual() {
    if (!manualForm.email.includes('@')) { showToast('Enter a valid email'); return; }
    const name = manualForm.name || manualForm.email.split('@')[0];
    const newLead = { initials: name.slice(0,2).toUpperCase(), color: COLORS[Math.floor(Math.random()*COLORS.length)], name, email: manualForm.email, esp: manualForm.email.includes('gmail') ? 'Google' : 'Microsoft', sent: 0, opened: 0, clicked: 0, replied: 0, status: 'In Progress', step: '0/1', label: null, company: manualForm.company };
    setLeads(prev => [...prev, newLead]);
    setManualForm({ name: '', email: '', company: '' });
    setImportModal(false);
    showToast('Lead added successfully');
  }

  const filtered = leads.filter(l => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const toggleSelect = (email) => setSelected(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  const allSelected = filtered.length > 0 && filtered.every(l => selected.includes(l.email));
  const toggleAll = () => setSelected(allSelected ? [] : filtered.map(l => l.email));

  const StatIcon = ({ icon, count, color }) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', color: count > 0 ? color : 'var(--text-muted)' }}>
      <span>{icon}</span><span style={{ fontWeight: count > 0 ? 600 : 400 }}>{count}</span>
    </span>
  );

  function handleImport(newLeads) {
    setLeads(prev => [...prev, ...newLeads]);
    showToast(`${newLeads.length} lead(s) imported successfully`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#10b981', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 10, fontWeight: 500, zIndex: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', fontSize: '0.875rem' }}>✅ {toast}</div>}
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>🔍</span>
          <input placeholder="Search by Email or Name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-secondary btn-sm" style={{ borderColor: '#10b981', color: '#10b981' }} onClick={() => showToast('Enriching leads with Apollo.io data...')}>✨ Enrich</button>
        <button className="btn btn-secondary btn-sm" onClick={() => showToast('Verifying email addresses...')}>✅ Verify Leads</button>
        <button className="btn btn-primary btn-sm" onClick={() => setImportModal(true)}>⬇ Import Leads</button>
        <select className="form-input" style={{ width: 'auto', fontSize: '0.8rem', padding: '6px 12px' }}
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option>All</option>
          {STATUSES.map(s => <option key={s.label}>{s.label}</option>)}
        </select>
      </div>

      {selected.length > 0 && (
        <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem' }}>
          <span>{selected.length} lead(s) selected</span>
          <button className="btn btn-danger btn-sm" onClick={() => { setLeads(prev => prev.filter(l => !selected.includes(l.email))); setSelected([]); }}>🗑 Remove Selected</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected([])}>Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }} />
              </th>
              <th>
                Leads <span style={{ background: 'var(--accent-primary)', color: '#fff', borderRadius: 99, padding: '1px 8px', fontSize: '0.7rem', marginLeft: 4 }}>{leads.length}</span>
              </th>
              <th>Lead ESP</th>
              <th>Performance</th>
              <th>Status</th>
              <th>Label</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l, i) => (
              <tr key={i} style={{ background: selected.includes(l.email) ? 'rgba(99,102,241,0.05)' : 'transparent' }}>
                <td>
                  <input type="checkbox" checked={selected.includes(l.email)} onChange={() => toggleSelect(l.email)} style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }} />
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: l.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: '#fff', flexShrink: 0 }}>
                      {l.initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{l.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {ESP_ICON[l.esp] || <span style={{ fontSize: '0.75rem' }}>{l.esp}</span>}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <StatIcon icon="📤" count={l.sent} color="var(--text-secondary)" />
                    <StatIcon icon="👁" count={l.opened} color="var(--info)" />
                    <StatIcon icon="🖱" count={l.clicked} color="var(--accent-secondary)" />
                    <StatIcon icon="↩" count={l.replied} color="var(--success)" />
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`badge ${STATUSES.find(s => s.label === l.status)?.cls || 'badge-default'}`} style={{ fontSize: '0.72rem' }}>
                      {l.status === 'Replied' ? '↩ ' : l.status === 'Completed' ? '✅ ' : ''}{l.status}
                    </span>
                    <div style={{ flex: 1, minWidth: 60, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99 }}>
                      <div style={{ height: '100%', borderRadius: 99, background: 'var(--accent-primary)', width: l.step === '1/1' ? '100%' : '50%' }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Step {l.step}</span>
                  </div>
                </td>
                <td>
                  <select
                    className="form-input"
                    style={{ fontSize: '0.75rem', padding: '4px 8px', width: 'auto' }}
                    value={l.label || ''}
                    onChange={e => setLeads(prev => prev.map((x, xi) => xi === i ? { ...x, label: e.target.value || null } : x))}
                  >
                    <option value="">Not assigned</option>
                    <option value="Interested">Interested</option>
                    <option value="Not Interested">Not Interested</option>
                    <option value="Meeting Booked">Meeting Booked</option>
                    <option value="Follow Up">Follow Up</option>
                  </select>
                </td>
                <td style={{ position: 'relative' }}>
                  <button onClick={() => setActionsOpen(actionsOpen === i ? null : i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px 8px' }}>⋯</button>
                  {actionsOpen === i && (
                    <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, boxShadow: 'var(--shadow-md)', zIndex: 50, minWidth: 160, overflow: 'hidden' }}>
                      {[['👁 View Profile', () => showToast('Opening profile...')], ['↩ Mark Replied', () => { setLeads(prev => prev.map((x,xi) => xi===i ? {...x, status:'Replied', replied: 1} : x)); setActionsOpen(null); showToast('Marked as Replied'); }], ['✅ Mark Complete', () => { setLeads(prev => prev.map((x,xi) => xi===i ? {...x, status:'Completed'} : x)); setActionsOpen(null); showToast('Marked as Completed'); }], ['🗑 Remove', () => { setLeads(prev => prev.filter((_,xi) => xi!==i)); setActionsOpen(null); showToast('Lead removed'); }]].map(([label, fn]) => (
                        <button key={label} onClick={() => { fn(); setActionsOpen(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.6rem 1rem', color: label.includes('Remove') ? 'var(--danger)' : 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem' }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                          onMouseLeave={e => e.currentTarget.style.background='none'}>{label}</button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>No leads match your filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Import Leads Modal */}
      {importModal && (
        <ImportLeads
          onImport={handleImport}
          onClose={() => setImportModal(false)}
        />
      )}
    </div>
  );
}
