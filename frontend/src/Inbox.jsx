import React, { useState } from 'react';

const THREADS = [
  { id: 1, initials: 'JB', color: '#6366f1', name: 'Jeffrey Bryan', email: 'jbryan@onestream.com', subject: 'Automatic reply: quick question about missed calls', preview: 'Thank you for your message. Jeff Bryan is no longer with th...', date: 'Apr 29, 2026', campaign: 'HDDP outreach - HVAC - 2 Step', tags: ['Automatic Reply'], unread: true, starred: false, messages: [{ from: 'me', body: 'Quick question about missed calls — worth a quick chat?', time: '9:14 AM' }, { from: 'them', body: 'Thank you for your message. Jeff Bryan is no longer with the organization.', time: '9:22 AM' }] },
  { id: 2, initials: 'KP', color: '#10b981', name: 'Kelly Palmer', email: 'kelly.palmer@regalci.com', subject: 'Automatic reply: did I get this right?', preview: 'Thank you for your message. Please note that Kelly Palmer n...', date: 'Apr 28, 2026', campaign: 'HDDP outreach - HVAC - 2 Step', tags: ['Automatic Reply'], unread: false, starred: true, messages: [{ from: 'me', body: 'Hi Kelly, did I get this right?', time: '10:05 AM' }, { from: 'them', body: 'Thank you for your message. Please note that Kelly Palmer no longer works at this organization.', time: '10:18 AM' }] },
  { id: 3, initials: 'IL', color: '#f59e0b', name: 'Iesha Loyd', email: 'iesha.loyd@landmark.com', subject: 'Automatic reply: quick question about missed calls', preview: 'Hello, I am out of the office attending the RD Summit 4/27...', date: 'Apr 28, 2026', campaign: 'HDDP outreach - HVAC - 2 Step', tags: ['Out of Office'], unread: false, starred: false, messages: [{ from: 'me', body: 'Quick question about missed calls...', time: '11:00 AM' }, { from: 'them', body: 'Hello, I am out of the office attending the RD Summit 4/27 - 4/30. I will return on May 1.', time: '11:08 AM' }] },
  { id: 4, initials: 'JM', color: '#ec4899', name: 'Joseph Marlowe', email: 'joseph.marlowe@corp.com', subject: 'RE: is this Regal', preview: 'Hi, thanks for reaching out. Yes this is the right contact...', date: 'Apr 28, 2026', campaign: 'HDDP outreach - HVAC - 2 Step', tags: ['Replied'], unread: true, starred: false, messages: [{ from: 'me', body: 'Is this Regal? I had a quick question about HVAC procurement.', time: '2:00 PM' }, { from: 'them', body: 'Hi, thanks for reaching out. Yes this is the right contact. Let me know what you need.', time: '2:45 PM' }] },
  { id: 5, initials: 'SR', color: '#8b5cf6', name: 'Sara Nguyen', email: 'sara@nextvp.com', subject: 'RE: following up about your expansion plans', preview: 'Great timing! We are actually looking at solutions right now...', date: 'Apr 27, 2026', campaign: 'Q2 Agency Outreach', tags: ['Positive Reply'], unread: false, starred: true, messages: [{ from: 'me', body: 'Hi Sara, following up about your expansion plans...', time: '8:30 AM' }, { from: 'them', body: 'Great timing! We are actually looking at solutions right now. Can we set up a call?', time: '9:15 AM' }] },
];

const TAG_COLORS = { 'Automatic Reply': '#6366f140', 'Out of Office': '#f59e0b40', 'Replied': '#10b98140', 'Positive Reply': '#10b98140' };
const TAG_TEXT = { 'Automatic Reply': '#a78bfa', 'Out of Office': '#f59e0b', 'Replied': '#10b981', 'Positive Reply': '#10b981' };

const LEFT_SECTIONS = [
  { key: 'inbox', label: 'Inbox', icon: '📥' },
  { key: 'warmup', label: 'Email Accounts & Warm-up', icon: '🔥', expandable: true },
  { key: 'campaigns', label: 'Campaigns', icon: '📢', expandable: true },
  { key: 'emails', label: 'Emails', icon: '✉️', expandable: true },
  { key: 'members', label: 'Members', icon: '👥', expandable: true },
];
const LEFT_EXTRAS = [
  { key: 'others', label: 'Others', icon: '📦' },
  { key: 'scheduled', label: 'Scheduled', icon: '📅' },
  { key: 'sent', label: 'Sent', icon: '📤' },
  { key: 'starred', label: 'Starred', icon: '⭐' },
  { key: 'archive', label: 'Archive', icon: '🗃' },
  { key: 'drafts', label: 'Drafts', icon: '📝' },
];

export default function Inbox() {
  const [threads, setThreads] = useState(THREADS);
  const [active, setActive] = useState(null);
  const [reply, setReply] = useState('');
  const [searchMail, setSearchMail] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [leftSection, setLeftSection] = useState('inbox');
  const [expanded, setExpanded] = useState({});
  const [toast, setToast] = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200); }

  function sendReply() {
    if (!reply.trim() || !active) return;
    setThreads(prev => prev.map(t => t.id === active.id ? { ...t, messages: [...t.messages, { from: 'me', body: reply.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }], preview: reply.trim().slice(0, 60) + '...', date: 'Just now' } : t));
    setActive(prev => ({ ...prev, messages: [...prev.messages, { from: 'me', body: reply.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }] }));
    setReply('');
    showToast('Reply sent');
  }

  function markDone(id) {
    setThreads(prev => prev.filter(t => t.id !== id));
    if (active?.id === id) setActive(null);
    showToast('Marked as done');
  }

  function toggleStar(id) {
    setThreads(prev => prev.map(t => t.id === id ? { ...t, starred: !t.starred } : t));
    if (active?.id === id) setActive(prev => ({ ...prev, starred: !prev.starred }));
  }

  const displayed = threads.filter(t => {
    const ms = t.name.toLowerCase().includes(searchMail.toLowerCase()) || t.subject.toLowerCase().includes(searchMail.toLowerCase());
    const mu = !showUnreadOnly || t.unread;
    if (leftSection === 'starred') return t.starred && ms;
    if (leftSection === 'sent') return ms;
    return ms && mu;
  });

  const toggleExpand = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', minHeight: 500, position: 'relative', overflow: 'hidden' }}>
      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#10b981', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 10, fontWeight: 500, zIndex: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', fontSize: '0.875rem' }}>✅ {toast}</div>}

      {/* LEFT PANEL */}
      <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.01)', overflowY: 'auto' }}>
        {LEFT_SECTIONS.map(s => (
          <div key={s.key}>
            <div
              onClick={() => { setLeftSection(s.key); if (s.expandable) toggleExpand(s.key); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', cursor: 'pointer', background: leftSection === s.key ? 'rgba(99,102,241,0.12)' : 'transparent', borderLeft: leftSection === s.key ? '3px solid var(--accent-primary)' : '3px solid transparent', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (leftSection !== s.key) e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (leftSection !== s.key) e.currentTarget.style.background='transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem' }}>{s.icon}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: leftSection === s.key ? 600 : 400, color: leftSection === s.key ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{s.label}</span>
              </div>
              {s.expandable && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{expanded[s.key] ? '▼' : '▶'}</span>}
            </div>
            {s.expandable && expanded[s.key] && (
              <div style={{ paddingLeft: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.4rem 1.5rem', background: 'rgba(0,0,0,0.1)' }}>No items</div>
            )}
          </div>
        ))}

        <div style={{ height: 1, background: 'var(--border-color)', margin: '0.5rem 0' }} />
        <div style={{ padding: '0.4rem 1rem' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em' }}>FOLDERS</span>
        </div>
        {LEFT_EXTRAS.map(s => (
          <div key={s.key} onClick={() => setLeftSection(s.key)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', cursor: 'pointer', background: leftSection === s.key ? 'rgba(99,102,241,0.1)' : 'transparent', borderLeft: leftSection === s.key ? '3px solid var(--accent-primary)' : '3px solid transparent', transition: 'all 0.15s' }}
            onMouseEnter={e => { if (leftSection !== s.key) e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { if (leftSection !== s.key) e.currentTarget.style.background='transparent'; }}>
            <span style={{ fontSize: '0.85rem' }}>{s.icon}</span>
            <span style={{ fontSize: '0.82rem', fontWeight: leftSection === s.key ? 600 : 400, color: leftSection === s.key ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>{s.label}</span>
          </div>
        ))}

        <div style={{ marginTop: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-secondary btn-sm" style={{ width: '100%', fontSize: '0.78rem' }} onClick={() => showToast('Opening AI Automation...')}>✨ AI Automation</button>
          <button className="btn btn-primary btn-sm" style={{ width: '100%', fontSize: '0.78rem' }} onClick={() => showToast('Compose Email opening...')}>+ Compose Email</button>
        </div>
      </div>

      {/* MIDDLE PANEL */}
      <div style={{ width: 340, flexShrink: 0, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Your Replies ({threads.length.toLocaleString()})</span>
            <div className="flex-row" style={{ gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={showUnreadOnly} onChange={() => setShowUnreadOnly(v => !v)} style={{ accentColor: 'var(--accent-primary)' }} />
                Show only unread
              </label>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>⋮</button>
            </div>
          </div>
          <div className="search-box" style={{ fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>🔍</span>
            <input placeholder="Search mail" value={searchMail} onChange={e => setSearchMail(e.target.value)} style={{ fontSize: '0.8rem' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {displayed.map(t => (
            <div
              key={t.id}
              onClick={() => { setActive(t); setThreads(prev => prev.map(x => x.id === t.id ? { ...x, unread: false } : x)); }}
              style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', background: active?.id === t.id ? 'rgba(99,102,241,0.1)' : 'transparent', borderLeft: active?.id === t.id ? '3px solid var(--accent-primary)' : '3px solid transparent', transition: 'background 0.15s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem', color: '#fff', flexShrink: 0 }}>{t.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: t.unread ? 700 : 500, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{t.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '0.25rem' }}>{t.date.split(' ').slice(0, 2).join(' ')}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: t.unread ? 600 : 400, color: t.unread ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: 40, marginBottom: '0.35rem' }}>{t.preview}</div>
              <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 40, alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>📢 {t.campaign}</span>
                {t.tags.map(tag => (
                  <span key={tag} style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 99, background: TAG_COLORS[tag] || 'rgba(255,255,255,0.08)', color: TAG_TEXT[tag] || 'var(--text-muted)', fontWeight: 500 }}>{tag}</span>
                ))}
                <button onClick={e => { e.stopPropagation(); toggleStar(t.id); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: t.starred ? '#f59e0b' : 'var(--text-muted)', flexShrink: 0 }}>★</button>
              </div>
            </div>
          ))}
          {displayed.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No emails found</div>
          )}
        </div>

        {/* Pagination */}
        <div style={{ padding: '0.6rem 1rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>1-{Math.min(50, displayed.length)} of {displayed.length}</span>
          <div className="flex-row" style={{ gap: '0.25rem' }}>
            {['«','‹','›','»'].map(c => <button key={c} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{c}</button>)}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!active ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem', opacity: 0.3 }}>✉️</div>
            <div style={{ fontWeight: 500 }}>Select an email to read</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Email Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{active.subject}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 500 }}>{active.name}</span> &lt;{active.email}&gt; · {active.date}
                </div>
              </div>
              <div className="flex-row">
                <button className="btn btn-secondary btn-sm" onClick={() => toggleStar(active.id)} style={{ color: active.starred ? '#f59e0b' : undefined }}>{active.starred ? '★ Starred' : '☆ Star'}</button>
                <button className="btn btn-success btn-sm" onClick={() => markDone(active.id)}>✅ Mark Done</button>
                <button className="btn btn-secondary btn-sm" onClick={() => showToast('Added to CRM')}>🔗 Add to CRM</button>
              </div>
            </div>

            {/* Thread */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {active.messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', flexDirection: msg.from === 'me' ? 'row-reverse' : 'row' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: msg.from === 'me' ? 'var(--accent-primary)' : active.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem', color: '#fff', flexShrink: 0 }}>
                    {msg.from === 'me' ? 'ME' : active.initials}
                  </div>
                  <div style={{ maxWidth: '70%' }}>
                    <div style={{ background: msg.from === 'me' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${msg.from === 'me' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: msg.from === 'me' ? '12px 2px 12px 12px' : '2px 12px 12px 12px', padding: '0.75rem 1rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
                      {msg.body}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem', textAlign: msg.from === 'me' ? 'right' : 'left' }}>{msg.time}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Box */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendReply())}
                  placeholder={`Reply to ${active.name}... (Enter to send, Shift+Enter for new line)`}
                  rows={3}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0.875rem 1rem', color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'none', lineHeight: 1.6 }}
                />
                <div style={{ padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex-row" style={{ gap: '0.5rem' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem' }} title="Attach file">📎</button>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem' }} title="Variables">{'{ }'}</button>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: '0.78rem', fontWeight: 600 }} onClick={() => showToast('AI generating reply...')}>✨ AI Reply</button>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={sendReply} disabled={!reply.trim()}>Send ↑</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
