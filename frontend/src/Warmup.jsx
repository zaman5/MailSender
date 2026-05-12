import React, { useState } from 'react';
import AccountPanel from './AccountPanel';

const ACCOUNTS = [
  { email: 'sarah@hddp.live', esp: 'Google', status: 'active', sent: 0, limit: 25, warmup: 5, bounce: 'N/A', reply: '0%', campaigns: 2, spf: true, dkim: true, dmarc: true, mx: true },
  { email: 'a.hayes@hddpcrm.website', esp: 'Google', status: 'active', sent: 0, limit: 25, warmup: 5, bounce: 'N/A', reply: '2.9%', campaigns: 2, spf: true, dkim: true, dmarc: true, mx: true },
  { email: 'chris@hddpcrm.website', esp: 'Google', status: 'active', sent: 0, limit: 25, warmup: 5, bounce: 'N/A', reply: '2.9%', campaigns: 2, spf: true, dkim: true, dmarc: true, mx: true },
  { email: 'megan@hddp.shop', esp: 'Google', status: 'active', sent: 0, limit: 25, warmup: 5, bounce: '0%', reply: '0%', campaigns: 2, spf: true, dkim: true, dmarc: true, mx: true },
  { email: 'james@outreach.io', esp: 'Microsoft', status: 'active', sent: 12, limit: 25, warmup: 3, bounce: '1.2%', reply: '4.1%', campaigns: 1, spf: true, dkim: true, dmarc: false, mx: true },
  { email: 'anna@coldmail.co', esp: 'Google', status: 'paused', sent: 0, limit: 25, warmup: 0, bounce: 'N/A', reply: '0%', campaigns: 0, spf: true, dkim: false, dmarc: false, mx: true },
];

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);
const MicrosoftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path d="M11.5 11.5H2v-9h9.5v9z" fill="#F25022"/>
    <path d="M22 11.5h-9.5v-9H22v9z" fill="#7FBA00"/>
    <path d="M11.5 22H2v-9h9.5v9z" fill="#00A4EF"/>
    <path d="M22 22h-9.5v-9H22v9z" fill="#FFB900"/>
  </svg>
);

function DnsBadge({ label, ok }) {
  return (
    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: ok ? '#10b98120' : '#ef444420', color: ok ? '#10b981' : '#ef4444', border: `1px solid ${ok ? '#10b98140' : '#ef444440'}` }}>
      {label}
    </span>
  );
}

export default function Warmup() {
  const [accounts, setAccounts] = useState(ACCOUNTS);
  const [search, setSearch] = useState('');
  const [warmupFilter, setWarmupFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState([]);
  const [actionsOpen, setActionsOpen] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [addStep, setAddStep] = useState(1); // 1 = fill form, 2 = testing, 3 = success
  const [newForm, setNewForm] = useState({
    email: '', provider: 'Google',
    smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '',
    imapHost: '', imapPort: '993',
    appPassword: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [testResult, setTestResult] = useState(null); // null | 'ok' | 'fail'
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState('accounts');
  const [selectedAccount, setSelectedAccount] = useState(null);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200); }

  const totalDomains = [...new Set(accounts.map(a => a.email.split('@')[1]))].length;
  const warmupCount = accounts.filter(a => a.warmup > 0).length;
  const errorCount = accounts.filter(a => !a.spf || !a.dkim).length;

  const filtered = accounts.filter(a => {
    const ms = a.email.toLowerCase().includes(search.toLowerCase());
    const mw = warmupFilter === 'All' || (warmupFilter === 'Warming' && a.warmup > 0) || (warmupFilter === 'Stopped' && a.warmup === 0);
    const mst = statusFilter === 'All' || a.status === statusFilter.toLowerCase();
    return ms && mw && mst;
  });

  const toggleSelect = (email) => setSelected(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  const allSel = filtered.length > 0 && filtered.every(a => selected.includes(a.email));

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function openAddModal() {
    setNewForm({ email: '', provider: 'Google', smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '', imapHost: '', imapPort: '993', appPassword: '' });
    setFormErrors({});
    setAddStep(1);
    setTestResult(null);
    setAddModal(true);
  }

  function validateForm() {
    const errs = {};
    if (!EMAIL_RE.test(newForm.email)) errs.email = 'Enter a valid email address (e.g. you@domain.com)';
    else if (accounts.some(a => a.email.toLowerCase() === newForm.email.toLowerCase())) errs.email = 'This email is already added';
    if (newForm.provider === 'SMTP') {
      if (!newForm.smtpHost.trim()) errs.smtpHost = 'SMTP host is required';
      if (!newForm.smtpPort || isNaN(newForm.smtpPort) || newForm.smtpPort < 1 || newForm.smtpPort > 65535) errs.smtpPort = 'Enter a valid port (e.g. 587)';
      if (!newForm.smtpUser.trim()) errs.smtpUser = 'SMTP username is required';
      if (!newForm.smtpPass.trim()) errs.smtpPass = 'SMTP password is required';
      if (!newForm.imapHost.trim()) errs.imapHost = 'IMAP host is required';
    } else {
      if (!newForm.appPassword.trim()) errs.appPassword = `${newForm.provider === 'Google' ? 'App password' : 'App password'} is required`;
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function testConnection() {
    if (!validateForm()) return;
    setAddStep(2);
    setTestResult(null);
    // Simulate async connection test
    setTimeout(() => {
      setTestResult('ok');
      setAddStep(3);
    }, 2000);
  }

  function confirmAddAccount() {
    setAccounts(prev => [...prev, {
      email: newForm.email,
      esp: newForm.provider === 'SMTP' ? 'Google' : newForm.provider,
      status: 'active', sent: 0, limit: 25, warmup: 5,
      bounce: 'N/A', reply: '0%', campaigns: 0,
      spf: true, dkim: true, dmarc: true, mx: true,
    }]);
    setAddModal(false);
    showToast(`${newForm.email} connected successfully`);
  }

  function setField(key, val) {
    setNewForm(p => ({ ...p, [key]: val }));
    if (formErrors[key]) setFormErrors(p => { const n = { ...p }; delete n[key]; return n; });
  }

  const STAT_CARDS = [
    { label: 'Total Accounts', value: accounts.length, icon: '📧', color: '#6366f1', active: tab === 'accounts' },
    { label: 'Total Domains', value: totalDomains, icon: '🌐', color: '#06b6d4' },
    { label: 'Warmup', value: warmupCount, icon: '🌡', color: '#f59e0b' },
    { label: 'Error', value: errorCount, icon: '⚠️', color: '#ef4444' },
    { label: 'Alert', value: 0, icon: '🔔', color: '#f97316' },
  ];

  return (
    <div className="page-block fade-up" style={{ position: 'relative' }}>
      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#10b981', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 10, fontWeight: 500, zIndex: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', fontSize: '0.875rem' }}>✅ {toast}</div>}

      <div className="flex-between">
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Email Accounts</h2>
        <div className="flex-row">
          <select className="form-input" style={{ width: 'auto', fontSize: '0.8rem' }}>
            <option>Sender Providers &amp; Tags</option>
            <option>Google</option>
            <option>Microsoft</option>
          </select>
          <button className="btn btn-primary" onClick={openAddModal}>+ Add New Account</button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {STAT_CARDS.map((s, i) => (
          <div key={i} className="card card-p" style={{ flex: 1, minWidth: 120, border: s.active ? `1px solid ${s.color}` : undefined, cursor: 'pointer' }} onClick={() => showToast(`Filtering by ${s.label}`)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>{s.icon}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{s.label}</span>
            </div>
            <div style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 700, color: s.value > 0 ? s.color : 'var(--text-primary)' }}>{s.value}</div>
          </div>
        ))}
        <div className="card card-p" style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => showToast('Opening detailed analytics...')}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📊</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600 }}>See Detailed Analytics →</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={allSel} onChange={() => setSelected(allSel ? [] : filtered.map(a => a.email))} style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Your accounts ({accounts.length})</span>
          <button onClick={openAddModal} style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
        </div>
        <div className="flex-row">
          <select className="form-input" style={{ width: 'auto', fontSize: '0.8rem' }} value={warmupFilter} onChange={e => setWarmupFilter(e.target.value)}>
            <option>All</option><option>Warming</option><option>Stopped</option>
          </select>
          <select className="form-input" style={{ width: 'auto', fontSize: '0.8rem' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option>All</option><option>Active</option><option>Paused</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="search-box">
        <span style={{ color: 'var(--text-muted)' }}>🔍</span>
        <input placeholder="Search by account address, first name or campaign name (Press enter)" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Show <strong>50</strong> accounts per page</span>
      </div>

      {selected.length > 0 && (
        <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '0.6rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.875rem' }}>
          <span>{selected.length} selected</span>
          <button className="btn btn-danger btn-sm" onClick={() => { setAccounts(prev => prev.filter(a => !selected.includes(a.email))); setSelected([]); showToast('Accounts removed'); }}>🗑 Remove</button>
          <button className="btn btn-secondary btn-sm" onClick={() => { showToast('Warmup paused for selected'); setSelected([]); }}>⏸ Pause Warmup</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected([])}>Clear</button>
        </div>
      )}

      {/* Accounts Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={allSel} onChange={() => setSelected(allSel ? [] : filtered.map(a => a.email))} style={{ accentColor: 'var(--accent-primary)' }} /></th>
              <th>Account</th>
              <th>Status</th>
              <th>Sent / Limit</th>
              <th>Warmup</th>
              <th>Bounce</th>
              <th>Reply</th>
              <th>Campaigns</th>
              <th>DNS</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={i} style={{ background: selected.includes(a.email) ? 'rgba(99,102,241,0.05)' : 'transparent' }}>
                <td><input type="checkbox" checked={selected.includes(a.email)} onChange={() => toggleSelect(a.email)} style={{ accentColor: 'var(--accent-primary)' }} /></td>
                <td>
                  <div className="flex-row" style={{ gap: '0.5rem' }}>
                    {a.esp === 'Google' ? <GoogleIcon /> : <MicrosoftIcon />}
                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{a.email}</span>
                    <span style={{ fontSize: '0.8rem' }}>🏷</span>
                  </div>
                </td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: a.status === 'active' ? '#10b981' : '#f59e0b' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.status === 'active' ? '#10b981' : '#f59e0b', display: 'inline-block' }} />
                    {a.status === 'active' ? 'Active' : 'Paused'}
                  </span>
                </td>
                <td className="col-num fs-sm">{a.sent}/{a.limit}</td>
                <td className="col-num fs-sm">🌡 {a.warmup}/5</td>
                <td className="fs-sm text-secondary">{a.bounce}</td>
                <td className="fs-sm text-secondary">{a.reply}</td>
                <td className="col-num">
                  <span style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)', borderRadius: 99, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>{a.campaigns}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'nowrap' }}>
                    <DnsBadge label="SPF" ok={a.spf} />
                    <DnsBadge label="DKIM" ok={a.dkim} />
                    <DnsBadge label="DMARC" ok={a.dmarc} />
                    <DnsBadge label="MX" ok={a.mx} />
                  </div>
                </td>
                <td style={{ position: 'relative' }}>
                  <div className="flex-row" style={{ gap: '0.25rem' }}>
                    <button title="Warmup" onClick={e => { e.stopPropagation(); setSelectedAccount(a); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem' }}>🔄</button>
                    <button title="Analytics" onClick={e => { e.stopPropagation(); setSelectedAccount(a); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem' }}>📊</button>
                    <button onClick={e => { e.stopPropagation(); setActionsOpen(actionsOpen === i ? null : i); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem' }}>⋯</button>
                  </div>
                  {actionsOpen === i && (
                    <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, boxShadow: 'var(--shadow-md)', zIndex: 50, minWidth: 170, overflow: 'hidden' }}>
                      {[['⚙️ Edit Account', () => showToast('Opening account settings...')], ['⏸ Pause Warmup', () => { setAccounts(prev => prev.map((x,xi) => xi===i ? {...x, warmup:0} : x)); showToast('Warmup paused'); }], ['▶ Resume Warmup', () => { setAccounts(prev => prev.map((x,xi) => xi===i ? {...x, warmup:5} : x)); showToast('Warmup resumed'); }], ['🗑 Remove', () => { setAccounts(prev => prev.filter((_,xi) => xi!==i)); showToast('Account removed'); }]].map(([label, fn]) => (
                        <button key={label} onClick={() => { fn(); setActionsOpen(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.6rem 1rem', color: label.includes('Remove') ? 'var(--danger)' : 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem' }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                          onMouseLeave={e => e.currentTarget.style.background='none'}>{label}</button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>No accounts found.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Add Account Modal */}
      {addModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setAddModal(false)}>
          <div className="card card-p" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>Add New Email Account</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {addStep === 1 && 'Fill in your account details'}
                  {addStep === 2 && 'Testing connection…'}
                  {addStep === 3 && 'Connection verified!'}
                </div>
              </div>
              <button onClick={() => setAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            {/* Step indicators */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[['1','Account Info'], ['2','Test Connection'], ['3','Done']].map(([num, label], i) => (
                <div key={num} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', margin: '0 auto 0.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700,
                    background: addStep > i + 1 ? '#10b981' : addStep === i + 1 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: addStep >= i + 1 ? '#fff' : 'var(--text-muted)',
                    border: addStep === i + 1 ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    transition: 'all 0.3s'
                  }}>{addStep > i + 1 ? '✓' : num}</div>
                  <div style={{ fontSize: '0.68rem', color: addStep === i + 1 ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: addStep === i + 1 ? 600 : 400 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* STEP 1: Form */}
            {addStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Email */}
                <div className="form-group">
                  <label className="form-label">Email Address <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    id="add-account-email"
                    className="form-input"
                    placeholder="you@yourdomain.com"
                    value={newForm.email}
                    onChange={e => setField('email', e.target.value)}
                    autoFocus
                    style={formErrors.email ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' } : {}}
                  />
                  {formErrors.email && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>⚠ {formErrors.email}</div>}
                </div>

                {/* Provider */}
                <div className="form-group">
                  <label className="form-label">Email Provider <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    {['Google', 'Microsoft', 'SMTP'].map(p => (
                      <button key={p} onClick={() => setField('provider', p)}
                        style={{ padding: '0.6rem', borderRadius: 8, border: `2px solid ${newForm.provider === p ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          background: newForm.provider === p ? 'rgba(99,102,241,0.12)' : 'var(--bg-tertiary)',
                          color: newForm.provider === p ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer', fontWeight: newForm.provider === p ? 700 : 400, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.2s' }}>
                        {p === 'Google' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
                        {p === 'Microsoft' && <svg width="14" height="14" viewBox="0 0 24 24"><path d="M11.5 11.5H2v-9h9.5v9z" fill="#F25022"/><path d="M22 11.5h-9.5v-9H22v9z" fill="#7FBA00"/><path d="M11.5 22H2v-9h9.5v9z" fill="#00A4EF"/><path d="M22 22h-9.5v-9H22v9z" fill="#FFB900"/></svg>}
                        {p === 'SMTP' && '⚙️'}
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Google / Microsoft: App Password */}
                {(newForm.provider === 'Google' || newForm.provider === 'Microsoft') && (
                  <div>
                    <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
                      {newForm.provider === 'Google'
                        ? '🔐 Use a Google App Password (not your regular Gmail password). Go to Google Account → Security → App Passwords to generate one.'
                        : '🔐 Use a Microsoft App Password. Go to Microsoft Account → Security → Advanced Security → App Passwords.'}
                    </div>
                    <div className="form-group">
                      <label className="form-label">App Password <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input
                        className="form-input"
                        type="password"
                        placeholder={newForm.provider === 'Google' ? 'xxxx xxxx xxxx xxxx' : 'Your app password'}
                        value={newForm.appPassword}
                        onChange={e => setField('appPassword', e.target.value)}
                        style={formErrors.appPassword ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' } : {}}
                      />
                      {formErrors.appPassword && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.3rem' }}>⚠ {formErrors.appPassword}</div>}
                    </div>
                  </div>
                )}

                {/* SMTP fields */}
                {newForm.provider === 'SMTP' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>SMTP Settings (Outgoing)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>SMTP Host <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <input className="form-input" placeholder="smtp.gmail.com" value={newForm.smtpHost} onChange={e => setField('smtpHost', e.target.value)}
                          style={formErrors.smtpHost ? { borderColor: 'var(--danger)' } : {}} />
                        {formErrors.smtpHost && <div style={{ color: 'var(--danger)', fontSize: '0.72rem', marginTop: '0.2rem' }}>⚠ {formErrors.smtpHost}</div>}
                      </div>
                      <div className="form-group" style={{ minWidth: 80 }}>
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>Port</label>
                        <input className="form-input" placeholder="587" value={newForm.smtpPort} onChange={e => setField('smtpPort', e.target.value)}
                          style={formErrors.smtpPort ? { borderColor: 'var(--danger)' } : {}} />
                        {formErrors.smtpPort && <div style={{ color: 'var(--danger)', fontSize: '0.72rem', marginTop: '0.2rem' }}>⚠ {formErrors.smtpPort}</div>}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>SMTP Username <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input className="form-input" placeholder="your@email.com" value={newForm.smtpUser} onChange={e => setField('smtpUser', e.target.value)}
                        style={formErrors.smtpUser ? { borderColor: 'var(--danger)' } : {}} />
                      {formErrors.smtpUser && <div style={{ color: 'var(--danger)', fontSize: '0.72rem', marginTop: '0.2rem' }}>⚠ {formErrors.smtpUser}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>SMTP Password <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input className="form-input" type="password" placeholder="••••••••" value={newForm.smtpPass} onChange={e => setField('smtpPass', e.target.value)}
                        style={formErrors.smtpPass ? { borderColor: 'var(--danger)' } : {}} />
                      {formErrors.smtpPass && <div style={{ color: 'var(--danger)', fontSize: '0.72rem', marginTop: '0.2rem' }}>⚠ {formErrors.smtpPass}</div>}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>IMAP Settings (Incoming)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>IMAP Host <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <input className="form-input" placeholder="imap.gmail.com" value={newForm.imapHost} onChange={e => setField('imapHost', e.target.value)}
                          style={formErrors.imapHost ? { borderColor: 'var(--danger)' } : {}} />
                        {formErrors.imapHost && <div style={{ color: 'var(--danger)', fontSize: '0.72rem', marginTop: '0.2rem' }}>⚠ {formErrors.imapHost}</div>}
                      </div>
                      <div className="form-group" style={{ minWidth: 80 }}>
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>Port</label>
                        <input className="form-input" placeholder="993" value={newForm.imapPort} onChange={e => setField('imapPort', e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex-row" style={{ justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button className="btn btn-ghost" onClick={() => setAddModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={testConnection}>Test Connection →</button>
                </div>
              </div>
            )}

            {/* STEP 2: Testing */}
            {addStep === 2 && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</div>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Testing connection…</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Verifying SMTP/IMAP credentials for <strong>{newForm.email}</strong></div>
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left', background: 'var(--bg-tertiary)', borderRadius: 8, padding: '1rem', fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  <div>▶ Resolving host…</div>
                  <div style={{ opacity: 0.7 }}>▶ Establishing secure connection…</div>
                  <div style={{ opacity: 0.5 }}>▶ Authenticating credentials…</div>
                </div>
              </div>
            )}

            {/* STEP 3: Success */}
            {addStep === 3 && (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.8rem' }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.5rem' }}>Connection Successful!</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  <strong>{newForm.email}</strong> is verified and ready to use.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '0.875rem 1rem', fontSize: '0.78rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><span style={{ color: '#10b981' }}>✓</span> SMTP connection verified</div>
                  {newForm.provider === 'SMTP' && <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><span style={{ color: '#10b981' }}>✓</span> IMAP connection verified</div>}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><span style={{ color: '#10b981' }}>✓</span> Authentication successful</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><span style={{ color: '#10b981' }}>✓</span> Email address valid</div>
                </div>
                <div className="flex-row" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button className="btn btn-ghost" onClick={() => { setAddStep(1); }}>← Back</button>
                  <button className="btn btn-primary" onClick={confirmAddAccount}>Add Account ✓</button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {selectedAccount && (
        <AccountPanel
          account={selectedAccount}
          accounts={accounts}
          onClose={() => setSelectedAccount(null)}
          onNavigate={idx => { if (idx >= 0 && idx < accounts.length) setSelectedAccount(accounts[idx]); }}
          onUpdate={() => {}}
          showToast={showToast}
        />
      )}
    </div>
  );
}
