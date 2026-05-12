import React, { useState } from 'react';

const SAMPLE_LISTS = [
  { id: 1, name: 'List - 260317092915', count: 13, created: '2026-03-17' },
  { id: 2, name: 'SaaS Founders Q2', count: 220, created: '2026-04-01' },
  { id: 3, name: 'Agency Decision Makers', count: 512, created: '2026-04-18' },
];

const RESOURCES = [
  { icon: '🎓', title: 'Cold Outreach Academy', desc: 'Learn effective outreach strategies' },
  { icon: '📋', title: '30+ List Building Strategies', desc: 'Grow your prospect database' },
  { icon: '👤', title: 'Ideal Customer Profile', desc: 'Swipe file templates' },
  { icon: '✉️', title: 'Email Templates Library', desc: '100+ proven email templates' },
];

export default function Prospects() {
  const [lists, setLists] = useState(SAMPLE_LISTS);
  const [selectedList, setSelectedList] = useState(null);
  const [searchList, setSearchList] = useState('');
  const [listActionsOpen, setListActionsOpen] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [importModal, setImportModal] = useState(false);
  const [pasteEmails, setPasteEmails] = useState('');
  const [toast, setToast] = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200); }

  function createList() {
    if (!newListName.trim()) return;
    const nl = { id: Date.now(), name: newListName.trim(), count: 0, created: new Date().toISOString().split('T')[0] };
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

  const filteredLists = lists.filter(l => l.name.toLowerCase().includes(searchList.toLowerCase()));

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
              onClick={() => setSelectedList(l)}
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
                <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Spread the word about plusvibe.ai</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {[['⭐', 'Write a review on G2 or publish a post about your experience on Twitter or LinkedIn to help us reach more people'], ['🎁', 'Send us a screenshot or a link to your review/post to support@plusvibe.ai and we will add a bonus of 1000 email credits']].map(([icon, text], i) => (
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
                <div className="fs-sm text-secondary">{selectedList.count} leads · Created {selectedList.created}</div>
              </div>
              <div className="flex-row">
                <button className="btn btn-secondary btn-sm" onClick={() => setImportModal(true)}>+ Add Leads</button>
                <button className="btn btn-primary btn-sm" onClick={() => showToast('Launching campaign...')}>🚀 Launch Campaign</button>
              </div>
            </div>
            {selectedList.count === 0 ? (
              <div className="card card-p" style={{ textAlign: 'center', padding: '4rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>This list is empty</div>
                <p className="fs-sm text-secondary" style={{ marginBottom: '1.25rem' }}>Import a CSV or add leads manually to get started.</p>
                <button className="btn btn-primary btn-sm" onClick={() => setImportModal(true)}>+ Import Leads</button>
              </div>
            ) : (
              <div className="card" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>{selectedList.count} leads in this list</div>
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
              <button onClick={() => setImportModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ border: '2px dashed var(--border-color)', borderRadius: 12, padding: '2.5rem', textAlign: 'center', background: 'rgba(99,102,241,0.02)' }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); showToast('CSV imported'); setImportModal(false); }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📂</div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Drop your CSV here</div>
                <div className="fs-sm text-secondary" style={{ marginBottom: '1rem' }}>Required columns: email. Optional: first_name, last_name, company</div>
                <label style={{ cursor: 'pointer' }}>
                  <input type="file" accept=".csv" style={{ display: 'none' }} onChange={() => { showToast('CSV imported successfully'); setImportModal(false); }} />
                  <span className="btn btn-primary btn-sm">Browse File</span>
                </label>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>— or paste emails below —</div>
              <textarea className="form-input" rows={4} placeholder="email1@domain.com&#10;email2@domain.com" value={pasteEmails} onChange={e => setPasteEmails(e.target.value)} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button className="btn btn-ghost" onClick={() => setImportModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => {
                  const count = pasteEmails.split('\n').filter(l => l.includes('@')).length;
                  if (count > 0 && selectedList) setLists(prev => prev.map(l => l.id === selectedList.id ? {...l, count: l.count + count} : l));
                  setImportModal(false); setPasteEmails('');
                  showToast(count > 0 ? `${count} leads imported` : 'No valid emails found');
                }}>Import</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
