import React, { useState } from 'react';
import CampaignDetail from './CampaignDetail';

const initialCampaigns = [
  { id: 1, name: 'Q2 Agency Outreach', status: 'active', sent: 1240, opens: 528, replies: 62, bounced: 14, prospects: 1500, created: '2026-04-18' },
  { id: 2, name: 'SaaS Founders Cold Pitch', status: 'active', sent: 880, opens: 412, replies: 38, bounced: 9, prospects: 1000, created: '2026-04-22' },
  { id: 3, name: 'E-commerce Decision Makers', status: 'paused', sent: 3200, opens: 1104, replies: 144, bounced: 47, prospects: 3200, created: '2026-04-01' },
  { id: 4, name: 'Real Estate Brokers List', status: 'draft', sent: 0, opens: 0, replies: 0, bounced: 0, prospects: 600, created: '2026-05-01' },
  { id: 5, name: 'LinkedIn Replied Leads', status: 'completed', sent: 450, opens: 261, replies: 89, bounced: 3, prospects: 450, created: '2026-03-10' },
];

const statusMap = {
  active: { label: 'Active', cls: 'badge-success' },
  paused: { label: 'Paused', cls: 'badge-warning' },
  draft: { label: 'Draft', cls: 'badge-default' },
  completed: { label: 'Completed', cls: 'badge-info' },
};

function pct(a, b) { return b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '—'; }

export default function Campaigns() {
  const [list, setList] = useState(initialCampaigns);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200); }

  const filtered = list.filter(c => {
    const matchFilter = filter === 'all' || c.status === filter;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  function toggleStatus(id) {
    setList(prev => prev.map(c => c.id === id
      ? { ...c, status: c.status === 'active' ? 'paused' : c.status === 'paused' ? 'active' : c.status }
      : c));
  }

  function addCampaign() {
    if (!newName.trim()) return;
    const nc = { id: Date.now(), name: newName.trim(), status: 'draft', sent: 0, opens: 0, replies: 0, bounced: 0, prospects: 0, created: new Date().toISOString().split('T')[0] };
    setList(prev => [...prev, nc]);
    setNewName('');
    setShowModal(false);
    showToast('Campaign created');
  }

  function deleteCampaign(id) {
    setList(prev => prev.filter(c => c.id !== id));
    if (selected?.id === id) setSelected(null);
    showToast('Campaign deleted');
  }

  // If a campaign is selected, show the full detail view
  if (selected) {
    const live = list.find(c => c.id === selected.id) || selected;
    return (
      <div className="fade-up" style={{ height: '100%' }}>
        <CampaignDetail
          campaign={live}
          onBack={() => setSelected(null)}
          onToggleStatus={toggleStatus}
        />
      </div>
    );
  }

  return (
    <div className="page-block fade-up">
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#10b981', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 10, fontWeight: 500, zIndex: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', fontSize: '0.875rem' }}>
          ✅ {toast}
        </div>
      )}

      <div className="flex-between">
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Campaigns</h2>
          <p className="text-secondary fs-sm" style={{ marginTop: '0.25rem' }}>{list.length} campaigns total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Campaign</button>
      </div>

      <div className="flex-row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
          <span className="text-muted">🔍</span>
          <input placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {['all', 'active', 'paused', 'draft', 'completed'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Campaign</th><th>Status</th><th>Prospects</th>
              <th>Sent</th><th>Open %</th><th>Reply %</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(c)}>
                <td>
                  <div style={{ fontWeight: 500 }}>{c.name}</div>
                  <div className="fs-xs text-muted">Created {c.created}</div>
                </td>
                <td><span className={`badge ${statusMap[c.status].cls}`}>{statusMap[c.status].label}</span></td>
                <td className="col-num">{c.prospects.toLocaleString()}</td>
                <td className="col-num">{c.sent.toLocaleString()}</td>
                <td><span className={pct(c.opens, c.sent) !== '—' ? 'text-info' : 'text-muted'}>{pct(c.opens, c.sent)}</span></td>
                <td><span className={pct(c.replies, c.sent) !== '—' ? 'text-success' : 'text-muted'}>{pct(c.replies, c.sent)}</span></td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="flex-row" style={{ gap: '0.5rem' }}>
                    {(c.status === 'active' || c.status === 'paused') && (
                      <button className={`btn btn-sm ${c.status === 'active' ? 'btn-secondary' : 'btn-success'}`} onClick={() => { toggleStatus(c.id); showToast(c.status === 'active' ? 'Campaign paused' : 'Campaign resumed'); }}>
                        {c.status === 'active' ? '⏸' : '▶'}
                      </button>
                    )}
                    <button className="btn btn-sm btn-danger" onClick={() => deleteCampaign(c.id)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>No campaigns found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card card-p" style={{ width: 420 }}>
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>New Campaign</h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Campaign Name</label>
              <input className="form-input" placeholder="e.g. Q3 SaaS Outreach" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCampaign()} autoFocus />
            </div>
            <div className="flex-row" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addCampaign}>Create Campaign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
