import React, { useState, useRef } from 'react';

const SAMPLE_LISTS = [
  { id: 1, name: 'List - 260317092915', count: 13, created: '2026-03-17', leads: [] },
  { id: 2, name: 'SaaS Founders Q2', count: 220, created: '2026-04-01', leads: [] },
  { id: 3, name: 'Agency Decision Makers', count: 512, created: '2026-04-18', leads: [] },
];

const RESOURCES = [
  { icon: '🎓', title: 'Cold Outreach Academy', desc: 'Learn effective outreach strategies' },
  { icon: '📋', title: '30+ List Building Strategies', desc: 'Grow your prospect database' },
  { icon: '👤', title: 'Ideal Customer Profile', desc: 'Swipe file templates' },
  { icon: '✉️', title: 'Email Templates Library', desc: '100+ proven email templates' },
];

/** Parse a CSV string into an array of objects keyed by header row */
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/['"]/g, ''));
  return lines.slice(1).map(line => {
    // Handle quoted fields that might contain commas
    const values = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { values.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    values.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (values[i] || '').replace(/^"|"$/g, '').trim(); });
    return obj;
  }).filter(row => row.email || row.email_address);
}

/** Derive a display name from a lead row */
function getLeadName(lead) {
  const first = lead.first_name || lead.firstname || '';
  const last = lead.last_name || lead.lastname || '';
  if (first || last) return `${first} ${last}`.trim();
  // Fallback: try to extract from email  e.g. john.doe@example.com → John Doe
  const emailLocal = (lead.email || lead.email_address || '').split('@')[0];
  if (emailLocal) {
    return emailLocal.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  return '—';
}

export default function Prospects() {
  const [lists, setLists] = useState(SAMPLE_LISTS);
  const [selectedList, setSelectedList] = useState(null);
  const [searchList, setSearchList] = useState('');;
  const [searchLeads, setSearchLeads] = useState('');
  const [listActionsOpen, setListActionsOpen] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [importModal, setImportModal] = useState(false);
  const [pasteEmails, setPasteEmails] = useState('');
  const [toast, setToast] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200); }

  function createList() {
    if (!newListName.trim()) return;
    const nl = { id: Date.now(), name: newListName.trim(), count: 0, created: new Date().toISOString().split('T')[0], leads: [] };
    setLists(prev => [...prev, nl]);
    setSelectedList(nl);
    setNewListName('');
    setCreateModal(false);
    showToast(`List "${nl.name}" created`);
  }

  function deleteList(id) {
    setLists(prev => prev.filter(l => l.id !== id));
    if (selectedList?.id === id) setSelectedList(null);
    showToast('List deleted');
  }

  /** Handle CSV file upload — parses real data */
  function handleCsvFile(file) {
    if (!file || !file.name.endsWith('.csv')) {
      setImportError('Please upload a valid .csv file');
      return;
    }
    setImportError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const leads = parseCsv(e.target.result);
      if (leads.length === 0) {
        setImportError('No valid rows found. Make sure your CSV has an "email" column.');
        return;
      }
      setLists(prev => prev.map(l => {
        if (l.id === selectedList?.id) {
          const merged = [...l.leads, ...leads];
          return { ...l, leads: merged, count: merged.length };
        }
        return l;
      }));
      // update selectedList reference
      setSelectedList(prev => {
        if (!prev) return prev;
        const merged = [...(prev.leads || []), ...leads];
        return { ...prev, leads: merged, count: merged.length };
      });
      setImportModal(false);
      showToast(`${leads.length} leads imported successfully`);
    };
    reader.readAsText(file);
  }

  /** Handle paste-emails import */
  function importPasted() {
    const newLeads = pasteEmails
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.includes('@'))
      .map(email => ({ email }));
    if (newLeads.length === 0) { showToast('No valid emails found'); return; }
    setLists(prev => prev.map(l => {
      if (l.id === selectedList?.id) {
        const merged = [...l.leads, ...newLeads];
        return { ...l, leads: merged, count: merged.length };
      }
      return l;
    }));
    setSelectedList(prev => {
      if (!prev) return prev;
      const merged = [...(prev.leads || []), ...newLeads];
      return { ...prev, leads: merged, count: merged.length };
    });
    setImportModal(false);
    setPasteEmails('');
    showToast(`${newLeads.length} leads imported`);
  }

  const filteredLists = lists.filter(l => l.name.toLowerCase().includes(searchList.toLowerCase()));

  // Current list's leads (sync from lists array for display)
  const currentListLeads = lists.find(l => l.id === selectedList?.id)?.leads || [];
  const filteredLeads = currentListLeads.filter(lead => {
    const q = searchLeads.toLowerCase();
    const name = getLeadName(lead).toLowerCase();
    const email = (lead.email || lead.email_address || '').toLowerCase();
    const company = (lead.company || lead.company_name || '').toLowerCase();
    return name.includes(q) || email.includes(q) || company.includes(q);
  });

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 120px)', minHeight: 500, position: 'relative' }}>
      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#10b981', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 10, fontWeight: 500, zIndex: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', fontSize: '0.875rem' }}>✅ {toast}</div>}

      {/* Left Sidebar */}
      <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>My Lists</span>
          <div className="flex-row" style={{ gap: '0.25rem' }}>
            <button onClick={() => showToast('Grid view')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>⊞</button>
            <button onClick={() => setCreateModal(true)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700 }}>+</button>
          </div>
        </div>

        <div style={{ padding: '0.75rem' }}>
          <div className="search-box" style={{ fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>🔍</span>
            <input placeholder="Search lists" value={searchList} onChange={e => setSearchList(e.target.value)} style={{ fontSize: '0.8rem' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.5rem' }}>
          {filteredLists.map(l => (
            <div
              key={l.id}
              onClick={() => { setSelectedList(l); setSearchLeads(''); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', borderRadius: 8, cursor: 'pointer', background: selectedList?.id === l.id ? 'rgba(99,102,241,0.12)' : 'transparent', marginBottom: '0.2rem', transition: 'background 0.15s' }}
              onMouseEnter={e => { if (selectedList?.id !== l.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (selectedList?.id !== l.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>≡</span>
                <span style={{ fontSize: '0.8rem', fontWeight: selectedList?.id === l.id ? 600 : 400, color: selectedList?.id === l.id ? 'var(--accent-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</span>
              </div>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={e => { e.stopPropagation(); setListActionsOpen(listActionsOpen === l.id ? null : l.id); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0 2px' }}
                >⋯</button>
                {listActionsOpen === l.id && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: 'var(--shadow-md)', zIndex: 50, minWidth: 130, overflow: 'hidden' }}>
                    {[['✏️ Rename', () => { const n = prompt('New name:', l.name); if (n) { setLists(prev => prev.map(x => x.id === l.id ? {...x, name: n} : x)); showToast('Renamed'); }}], ['🗑 Delete', () => deleteList(l.id)]].map(([label, fn]) => (
                      <button key={label} onClick={() => { fn(); setListActionsOpen(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.5rem 0.75rem', color: label.includes('Delete') ? 'var(--danger)' : 'var(--text-primary)', cursor: 'pointer', fontSize: '0.78rem' }}>{label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
        {!selectedList ? (
          <div>
            {/* Action Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              {/* Import CSV */}
              <div className="card card-p" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', cursor: 'pointer', transition: 'transform 0.15s' }}
                onClick={() => setImportModal(true)}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                <div style={{ flexShrink: 0 }}>
                  <div style={{ width: 44, height: 44, background: 'rgba(99,102,241,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>📥</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>Import CSV</div>
                  <p className="fs-sm text-secondary">Import your list, edit it, and add enrichment, such as verifying emails and scraping website or LinkedIn data. Once your list is enriched and ready, you can launch a campaign.</p>
                </div>
                <div style={{ width: 100, height: 70, background: 'rgba(99,102,241,0.06)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>📊</div>
              </div>

              {/* Create Blank List */}
              <div className="card card-p" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', cursor: 'pointer', transition: 'transform 0.15s' }}
                onClick={() => setCreateModal(true)}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                <div style={{ flexShrink: 0 }}>
                  <div style={{ width: 44, height: 44, background: 'rgba(16,185,129,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>📝</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', color: '#10b981' }}>Create Blank List</div>
                  <p className="fs-sm text-secondary">Start with a blank list to add leads and begin your data enrichment process, such as verifying emails, scraping website or LinkedIn data, and using AI to generate personalized lines.</p>
                </div>
                <div style={{ width: 100, height: 70, background: 'rgba(16,185,129,0.06)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{['Name','Email','Company'].map(c => <div key={c} style={{ height: 8, width: 80, background: 'rgba(16,185,129,0.2)', borderRadius: 4 }} />)}</div>
                </div>
              </div>
            </div>

            {/* Spread the Word + Resources */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem' }}>
              <div className="card card-p">
                <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Spread the word about MailSender</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {[['⭐', 'Write a review on G2 or publish a post about your experience on Twitter or LinkedIn to help us reach more people'], ['🎁', 'Send us a screenshot or a link to your review/post to support@mailsender.io and we will add a bonus of 1000 email credits']].map(([icon, text], i) => (
                    <div key={i} style={{ background: i === 0 ? 'rgba(245,158,11,0.06)' : 'rgba(99,102,241,0.06)', border: `1px solid ${i === 0 ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.2)'}`, borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
                      <p className="fs-sm text-secondary">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card card-p">
                <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Resources</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {RESOURCES.map((r, i) => (
                    <div key={i} onClick={() => showToast(`Opening: ${r.title}`)} style={{ display: 'flex', gap: '0.75rem', cursor: 'pointer', padding: '0.4rem', borderRadius: 6, transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <span style={{ fontSize: '1.2rem' }}>{r.icon}</span>
                      <div><div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--accent-primary)' }}>{r.title}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.desc}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Selected List View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="flex-between">
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selectedList.name}</h3>
                <div className="fs-sm text-secondary">{currentListLeads.length} leads · Created {selectedList.created}</div>
              </div>
              <div className="flex-row">
                <button className="btn btn-secondary btn-sm" onClick={() => setImportModal(true)}>+ Add Leads</button>
                <button className="btn btn-primary btn-sm" onClick={() => showToast('Launching campaign...')}>🚀 Launch Campaign</button>
              </div>
            </div>

            {currentListLeads.length === 0 ? (
              <div className="card card-p" style={{ textAlign: 'center', padding: '4rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>This list is empty</div>
                <p className="fs-sm text-secondary" style={{ marginBottom: '1.25rem' }}>Import a CSV or add leads manually to get started.</p>
                <button className="btn btn-primary btn-sm" onClick={() => setImportModal(true)}>+ Import Leads</button>
              </div>
            ) : (
              <div className="card" style={{ overflow: 'hidden' }}>
                {/* Search bar for leads */}
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div className="search-box" style={{ width: 280 }}>
                    <span style={{ color: 'var(--text-muted)' }}>🔍</span>
                    <input placeholder="Search leads by name, email, company…" value={searchLeads} onChange={e => setSearchLeads(e.target.value)} />
                  </div>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Company</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead, i) => {
                      const name = getLeadName(lead);
                      const email = lead.email || lead.email_address || '—';
                      const company = lead.company || lead.company_name || '—';
                      const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                      return (
                        <tr key={i}>
                          <td className="fs-sm" style={{ color: 'var(--text-muted)', width: 40 }}>{i + 1}</td>
                          <td>
                            <div className="flex-row" style={{ gap: '0.6rem' }}>
                              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(99,102,241,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-primary)', flexShrink: 0 }}>{initials || '?'}</div>
                              <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{name}</span>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{email}</td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{company}</td>
                          <td><span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 20, background: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 600 }}>Active</span></td>
                        </tr>
                      );
                    })}
                    {filteredLeads.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No leads match your search.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create List Modal */}
      {createModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card card-p" style={{ width: 420 }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Create Blank List</h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">List Name</label>
              <input className="form-input" placeholder="e.g. SaaS Founders Q3" value={newListName} onChange={e => setNewListName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createList()} autoFocus />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => setCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createList}>Create List</button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {importModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, width: 500, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700 }}>Import CSV</h3>
              <button onClick={() => { setImportModal(false); setImportError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{ border: '2px dashed var(--border-color)', borderRadius: 12, padding: '2.5rem', textAlign: 'center', background: 'rgba(99,102,241,0.02)', cursor: 'pointer' }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleCsvFile(e.dataTransfer.files[0]); }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📂</div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Drop your CSV here or click to browse</div>
                <div className="fs-sm text-secondary" style={{ marginBottom: '1rem' }}>Required column: <code>email</code>. Optional: <code>first_name</code>, <code>last_name</code>, <code>company</code></div>
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={e => handleCsvFile(e.target.files[0])}
                />
                <span className="btn btn-primary btn-sm">Browse File</span>
              </div>
              {importError && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.6rem 1rem', fontSize: '0.82rem', color: '#ef4444' }}>⚠ {importError}</div>
              )}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>— or paste emails below —</div>
              <textarea className="form-input" rows={4} placeholder={"email1@domain.com\nemail2@domain.com"} value={pasteEmails} onChange={e => setPasteEmails(e.target.value)} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button className="btn btn-ghost" onClick={() => { setImportModal(false); setImportError(''); }}>Cancel</button>
                <button className="btn btn-primary" onClick={importPasted} disabled={!pasteEmails.trim()}>Import Emails</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
