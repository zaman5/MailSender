import React, { useState, useRef } from 'react';
import AccountPanel from './AccountPanel';

const ACCOUNTS = [
  { email: 'sarah@hddp.live', esp: 'Google', status: 'active', sent: 120, limit: 150, warmup: 5, bounce: '1.2%', reply: '4.1%', campaigns: 2, spf: true, dkim: true, dmarc: true, mx: true },
  { email: 'a.hayes@hddpcrm.website', esp: 'Google', status: 'active', sent: 80, limit: 150, warmup: 5, bounce: '0.5%', reply: '2.9%', campaigns: 2, spf: true, dkim: true, dmarc: true, mx: true },
];

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
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

export default function Accounts() {
  const [accounts, setAccounts] = useState(ACCOUNTS);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [actionsOpen, setActionsOpen] = useState(null);
  
  // Modals
  const [addModal, setAddModal] = useState(false);
  const [csvModal, setCsvModal] = useState(false);

  // Single Add State
  const [addStep, setAddStep] = useState(1);
  const [newForm, setNewForm] = useState({
    firstName: '', lastName: '',
    email: '', provider: 'Google',
    smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '',
    imapHost: '', imapPort: '993', appPassword: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // CSV Import State
  const fileInputRef = useRef(null);
  const [csvFile, setCsvFile] = useState(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [csvProvider, setCsvProvider] = useState('Google');

  // Send Email modal
  const [sendModal, setSendModal] = useState(null); // account object
  const [sendForm, setSendForm] = useState({ to: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [sendDone, setSendDone] = useState(false);

  // Email Tester modal
  const [testerModal, setTesterModal] = useState(null); // account object
  const [testerEmail, setTesterEmail] = useState('');
  const [testerRunning, setTesterRunning] = useState(false);
  const [testerResult, setTesterResult] = useState(null);

  // Email Tracking modal
  const [trackingModal, setTrackingModal] = useState(null); // account object

  // Mock sent-email tracking log keyed by account email
  const [trackingLog, setTrackingLog] = useState({
    'sarah@hddp.live': [
      { id: 1, to: 'client1@acmecorp.com', subject: 'Q2 Outreach', sentAt: '2026-05-12 09:14', type: 'Cold', delivered: true, opened: true, openedAt: '2026-05-12 09:52', clicked: true, bounced: false },
      { id: 2, to: 'ceo@startupx.io', subject: 'Partnership Proposal', sentAt: '2026-05-12 11:30', type: 'Follow-up', delivered: true, opened: false, openedAt: null, clicked: false, bounced: false },
      { id: 3, to: 'ops@retailbig.com', subject: 'Intro Email', sentAt: '2026-05-13 08:05', type: 'Cold', delivered: false, opened: false, openedAt: null, clicked: false, bounced: true },
    ],
    'a.hayes@hddpcrm.website': [
      { id: 4, to: 'hr@techfirm.com', subject: 'SaaS Demo Invite', sentAt: '2026-05-11 14:20', type: 'Cold', delivered: true, opened: true, openedAt: '2026-05-11 15:01', clicked: false, bounced: false },
      { id: 5, to: 'sales@agency.co', subject: 'Follow-up #2', sentAt: '2026-05-13 10:00', type: 'Follow-up', delivered: true, opened: true, openedAt: '2026-05-13 10:45', clicked: true, bounced: false },
    ],
  });

  // Leads state
  const [leadsModal, setLeadsModal] = useState(false);
  const [leads, setLeads] = useState([]);
  const [leadForm, setLeadForm] = useState({ name: '', email: '', company: '', phone: '' });
  const [leadErrors, setLeadErrors] = useState({});

  const [toast, setToast] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  const filtered = accounts.filter(a => a.email.toLowerCase().includes(search.toLowerCase()));
  const toggleSelect = (email) => setSelected(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  const allSel = filtered.length > 0 && filtered.every(a => selected.includes(a.email));

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // ---- SINGLE ACCOUNT ADD LOGIC ----
  function openAddModal() {
    setNewForm({ firstName: '', lastName: '', email: '', provider: 'Google', smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '', imapHost: '', imapPort: '993', appPassword: '' });
    setFormErrors({});
    setAddStep(1);
    setAddModal(true);
  }

  function validateForm() {
    const errs = {};
    if (!newForm.firstName.trim()) errs.firstName = 'First name is required';
    if (!newForm.lastName.trim()) errs.lastName = 'Last name is required';
    if (!EMAIL_RE.test(newForm.email)) errs.email = 'Enter a valid email address';
    else if (accounts.some(a => a.email.toLowerCase() === newForm.email.toLowerCase())) errs.email = 'This email is already added';
    
    if (newForm.provider === 'SMTP') {
      if (!newForm.smtpHost.trim()) errs.smtpHost = 'SMTP host required';
      if (!newForm.smtpPort) errs.smtpPort = 'Port required';
      if (!newForm.smtpUser.trim()) errs.smtpUser = 'SMTP user required';
      if (!newForm.smtpPass.trim()) errs.smtpPass = 'SMTP password required';
      if (!newForm.imapHost.trim()) errs.imapHost = 'IMAP host required';
    } else {
      if (!newForm.appPassword.trim()) errs.appPassword = 'App password is required';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function testConnection() {
    if (!validateForm()) return;
    setAddStep(2);
    setTimeout(() => {
      if (newForm.appPassword && newForm.appPassword.length < 8) {
        setFormErrors({ appPassword: 'Password is incorrect or too short' });
        setAddStep(1);
        showToast('Connection failed. Please check credentials.');
        return;
      }
      if (newForm.smtpPass && newForm.smtpPass.length < 8) {
        setFormErrors({ smtpPass: 'SMTP password is incorrect or too short' });
        setAddStep(1);
        showToast('Connection failed. Please check credentials.');
        return;
      }
      setAddStep(3);
    }, 2000);
  }

  function confirmAddAccount() {
    setAccounts(prev => [...prev, {
      firstName: newForm.firstName,
      lastName: newForm.lastName,
      email: newForm.email,
      esp: newForm.provider,
      status: 'active', sent: 0, limit: 150, warmup: 5,
      bounce: 'N/A', reply: '0%', campaigns: 0,
      spf: true, dkim: true, dmarc: true, mx: true,
    }]);
    setAddModal(false);
    showToast(`${newForm.firstName} ${newForm.lastName} (${newForm.email}) connected successfully`);
  }

  function setField(key, val) {
    setNewForm(p => ({ ...p, [key]: val }));
    if (formErrors[key]) setFormErrors(p => { const n = { ...p }; delete n[key]; return n; });
  }

  // ---- SEND EMAIL LOGIC ----
  function openSendModal(account) {
    setSendForm({ to: account.email, subject: '', body: '' });
    setSendDone(false);
    setSendModal(account);
  }
  function handleSend() {
    if (!sendForm.subject.trim() || !sendForm.body.trim()) return;
    setSending(true);
    setTimeout(() => { setSending(false); setSendDone(true); showToast(`Email sent to ${sendForm.to}`); }, 1800);
  }

  // ---- LEADS LOGIC ----
  function validateLead() {
    const errs = {};
    if (!leadForm.name.trim()) errs.name = 'Name required';
    if (!EMAIL_RE.test(leadForm.email)) errs.email = 'Valid email required';
    else if (leads.some(l => l.email.toLowerCase() === leadForm.email.toLowerCase())) errs.email = 'Already in list';
    setLeadErrors(errs);
    return Object.keys(errs).length === 0;
  }
  function addLead() {
    if (!validateLead()) return;
    setLeads(prev => [...prev, { ...leadForm, id: Date.now() }]);
    setLeadForm({ name: '', email: '', company: '', phone: '' });
    setLeadErrors({});
    showToast('Lead added');
  }
  function removeLead(id) { setLeads(prev => prev.filter(l => l.id !== id)); }

  // ---- CSV IMPORT LOGIC ----
  function openCsvModal() {
    setCsvFile(null);
    setCsvResult(null);
    setCsvImporting(false);
    setCsvProvider('Google');
    setCsvModal(true);
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.csv')) {
      setCsvFile(file);
    } else {
      showToast('Please upload a valid CSV file');
    }
  }

  function processCsv() {
    if (!csvFile) return;
    setCsvImporting(true);
    setTimeout(() => {
      const n = Math.floor(Math.random()*3)+2;
      const newAccs = Array.from({ length: n }, (_, i) => ({
        email: `bulk${i+1}_${Math.floor(Math.random()*100)}@import.io`,
        esp: csvProvider, status: 'active', sent: 0, limit: 100, warmup: 0,
        bounce: '0%', reply: '0%', campaigns: 0,
        spf: true, dkim: true, dmarc: csvProvider !== 'Other', mx: true
      }));
      setAccounts(prev => [...prev, ...newAccs]);
      setCsvResult({ added: n, failed: 0 });
      setCsvImporting(false);
      showToast(`Successfully imported ${n} accounts via ${csvProvider}`);
    }, 2500);
  }

  function downloadCsvTemplate() {
    const csvContent = "data:text/csv;charset=utf-8,Email,Provider,AppPassword,SmtpHost,SmtpPort,SmtpUser,SmtpPass,ImapHost,ImapPort\njohn@example.com,Google,xxxx-xxxx-xxxx,smtp.gmail.com,587,john@example.com,pass123,imap.gmail.com,993\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "accounts_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="page-block fade-up" style={{ position: 'relative' }}>
      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#10b981', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 10, fontWeight: 500, zIndex: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', fontSize: '0.875rem' }}>✅ {toast}</div>}

      <div className="flex-between">
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Email Accounts</h2>
        <div className="flex-row">
          <button className="btn btn-ghost" onClick={() => setLeadsModal(true)} style={{ gap: '0.4rem' }}>
            👥 Leads List
          </button>
          <button className="btn btn-secondary" onClick={openCsvModal}>
            <span style={{ fontSize: '1.1rem' }}>📄</span> Bulk Import (CSV)
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>
            + Add New Account
          </button>
        </div>
      </div>

      <div className="card card-p" style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Accounts</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Outfit', color: 'var(--accent-primary)' }}>{accounts.length}</div>
        </div>
        <div style={{ width: '1px', background: 'var(--border-color)' }}></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Active Accounts</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Outfit', color: 'var(--success)' }}>{accounts.filter(a => a.status === 'active').length}</div>
        </div>
        <div style={{ width: '1px', background: 'var(--border-color)' }}></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Warming Up</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Outfit', color: 'var(--warning)' }}>{accounts.filter(a => a.warmup > 0).length}</div>
        </div>
      </div>

      {/* Search & Bulk Actions */}
      <div className="flex-between">
        <div className="search-box" style={{ width: 300 }}>
          <span style={{ color: 'var(--text-muted)' }}>🔍</span>
          <input placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        </div>
        
        {selected.length > 0 && (
          <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '0.4rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.875rem' }}>
            <span>{selected.length} selected</span>
            <button className="btn btn-danger btn-sm" onClick={() => { setAccounts(prev => prev.filter(a => !selected.includes(a.email))); setSelected([]); showToast('Accounts removed'); }}>🗑 Remove</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected([])}>Clear</button>
          </div>
        )}
      </div>

      {/* Accounts Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={allSel} onChange={() => setSelected(allSel ? [] : filtered.map(a => a.email))} style={{ accentColor: 'var(--accent-primary)' }} /></th>
              <th>Account</th>
              <th>Status</th>
              <th>Sent / Limit</th>
              <th>DNS Config</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={i} style={{ background: selected.includes(a.email) ? 'rgba(99,102,241,0.05)' : 'transparent' }}>
                <td><input type="checkbox" checked={selected.includes(a.email)} onChange={() => toggleSelect(a.email)} style={{ accentColor: 'var(--accent-primary)' }} /></td>
                <td>
                  <div className="flex-row" style={{ gap: '0.5rem' }}>
                    {a.esp === 'Google' ? <GoogleIcon /> : a.esp === 'Microsoft' ? <MicrosoftIcon /> : <span style={{fontSize: '1rem'}}>⚙️</span>}
                    <div>
                      {(a.firstName || a.lastName) && <div style={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.2 }}>{a.firstName} {a.lastName}</div>}
                      <span style={{ fontWeight: 500, fontSize: '0.875rem', color: a.firstName ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{a.email}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: a.status === 'active' ? '#10b981' : '#f59e0b' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.status === 'active' ? '#10b981' : '#f59e0b', display: 'inline-block' }} />
                    {a.status === 'active' ? 'Active' : 'Paused'}
                  </span>
                </td>
                <td className="col-num fs-sm">{a.sent}/{a.limit}</td>
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
                    <button title="Settings" onClick={e => { e.stopPropagation(); setSelectedAccount(a); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem' }}>⚙️</button>
                    <button onClick={e => { e.stopPropagation(); setActionsOpen(actionsOpen === i ? null : i); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem' }}>⋯</button>
                  </div>
                  {actionsOpen === i && (
                    <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, boxShadow: 'var(--shadow-md)', zIndex: 50, minWidth: 185, overflow: 'hidden' }}>
                      {[{ icon: '✉️', label: 'Send Email', action: () => { openSendModal(a); setActionsOpen(null); }, color: 'var(--text-primary)' },
                        { icon: '🧪', label: 'Test Email', action: () => { setTesterEmail(''); setTesterResult(null); setTesterRunning(false); setTesterModal(a); setActionsOpen(null); }, color: 'var(--text-primary)' },
                        { icon: '📊', label: 'View Tracking', action: () => { setTrackingModal(a); setActionsOpen(null); }, color: 'var(--text-primary)' },
                        { icon: '🗑', label: 'Remove', action: () => { setAccounts(prev => prev.filter((_,xi) => xi!==i)); showToast('Account removed'); setActionsOpen(null); }, color: 'var(--danger)' }
                      ].map(item => (
                        <button key={item.label} onClick={item.action}
                          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.6rem 1rem', color: item.color, cursor: 'pointer', fontSize: '0.8rem' }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                          onMouseLeave={e => e.currentTarget.style.background='none'}>{item.icon} {item.label}</button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>No accounts found.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* ===================== ADD SINGLE ACCOUNT MODAL ===================== */}
      {addModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setAddModal(false)}>
          <div className="card card-p" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
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

            {addStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">First Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input className="form-input" placeholder="John" value={newForm.firstName} onChange={e => setField('firstName', e.target.value)} autoFocus style={formErrors.firstName ? { borderColor: 'var(--danger)' } : {}} />
                    {formErrors.firstName && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.3rem' }}>⚠ {formErrors.firstName}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input className="form-input" placeholder="Doe" value={newForm.lastName} onChange={e => setField('lastName', e.target.value)} style={formErrors.lastName ? { borderColor: 'var(--danger)' } : {}} />
                    {formErrors.lastName && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.3rem' }}>⚠ {formErrors.lastName}</div>}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input className="form-input" placeholder="you@yourdomain.com" value={newForm.email} onChange={e => setField('email', e.target.value)} style={formErrors.email ? { borderColor: 'var(--danger)' } : {}} />
                  {formErrors.email && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.3rem' }}>⚠ {formErrors.email}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Provider</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    {['Google', 'Microsoft', 'SMTP'].map(p => (
                      <button key={p} onClick={() => setField('provider', p)}
                        style={{ padding: '0.6rem', borderRadius: 8, border: `2px solid ${newForm.provider === p ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          background: newForm.provider === p ? 'rgba(99,102,241,0.12)' : 'var(--bg-tertiary)', color: newForm.provider === p ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {(newForm.provider === 'Google' || newForm.provider === 'Microsoft') && (
                  <div className="form-group">
                    <label className="form-label">App Password <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input className="form-input" type="password" placeholder="App password" value={newForm.appPassword} onChange={e => setField('appPassword', e.target.value)} style={formErrors.appPassword ? { borderColor: 'var(--danger)' } : {}} />
                    {formErrors.appPassword && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.3rem' }}>⚠ {formErrors.appPassword}</div>}
                  </div>
                )}

                {newForm.provider === 'SMTP' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>SMTP Settings (Outgoing)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>SMTP Host <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <input className="form-input" placeholder="smtp.gmail.com" value={newForm.smtpHost} onChange={e => setField('smtpHost', e.target.value)} />
                      </div>
                      <div className="form-group" style={{ minWidth: 80 }}>
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>Port</label>
                        <input className="form-input" placeholder="587" value={newForm.smtpPort} onChange={e => setField('smtpPort', e.target.value)} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>SMTP Username <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input className="form-input" placeholder="your@email.com" value={newForm.smtpUser} onChange={e => setField('smtpUser', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>SMTP Password <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input className="form-input" type="password" placeholder="••••••••" value={newForm.smtpPass} onChange={e => setField('smtpPass', e.target.value)} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>IMAP Settings (Incoming)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>IMAP Host <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <input className="form-input" placeholder="imap.gmail.com" value={newForm.imapHost} onChange={e => setField('imapHost', e.target.value)} />
                      </div>
                      <div className="form-group" style={{ minWidth: 80 }}>
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>Port</label>
                        <input className="form-input" placeholder="993" value={newForm.imapPort} onChange={e => setField('imapPort', e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex-row" style={{ justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button className="btn btn-ghost" onClick={() => setAddModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={testConnection}>Test Connection →</button>
                </div>
              </div>
            )}

            {addStep === 2 && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</div>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Testing connection…</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Verifying credentials for <strong>{newForm.email}</strong></div>
              </div>
            )}

            {addStep === 3 && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.8rem' }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.5rem' }}>Connection Successful!</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                  <strong>{newForm.email}</strong> is verified and ready to use.
                </div>
                <div className="flex-row" style={{ justifyContent: 'center', gap: '1rem' }}>
                  <button className="btn btn-ghost" onClick={() => setAddStep(1)}>← Back</button>
                  <button className="btn btn-primary" onClick={confirmAddAccount}>Add Account</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== EMAIL TESTER MODAL ===================== */}
      {testerModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:120 }} onClick={() => setTesterModal(null)}>
          <div className="card card-p" style={{ width:520 }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
              <div>
                <h3 style={{ fontWeight:700, fontSize:'1.05rem' }}>🧪 Email Deliverability Test</h3>
                <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:'0.2rem' }}>Test how your emails land — inbox, spam score, open tracking</div>
              </div>
              <button onClick={() => setTesterModal(null)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'1.2rem' }}>✕</button>
            </div>

            <div style={{ background:'rgba(99,102,241,0.07)', borderRadius:8, padding:'0.6rem 0.9rem', marginBottom:'1rem', fontSize:'0.82rem', color:'var(--text-secondary)' }}>
              Sending from: <strong style={{ color:'var(--text-primary)' }}>{testerModal.email}</strong> &nbsp;·&nbsp; Provider: <strong>{testerModal.esp}</strong>
            </div>

            {!testerResult ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                <div className="form-group">
                  <label className="form-label">Send Test Email To <span style={{ color:'var(--danger)' }}>*</span></label>
                  <input className="form-input" placeholder="your-inbox@gmail.com" value={testerEmail} onChange={e => setTesterEmail(e.target.value)} />
                  <div style={{ fontSize:'0.73rem', color:'var(--text-muted)', marginTop:'0.3rem' }}>We'll send a test email and analyse spam score, placement & headers.</div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.65rem' }}>
                  {[{ icon:'📩', label:'Cold Email', desc:'Outreach template' },{ icon:'🔁', label:'Follow-up', desc:'Reply-style' },{ icon:'📢', label:'Newsletter', desc:'Broadcast style' }].map(t => (
                    <div key={t.label} style={{ border:'1px solid var(--border-color)', borderRadius:8, padding:'0.65rem 0.5rem', textAlign:'center', background:'var(--bg-tertiary)', fontSize:'0.78rem' }}>
                      <div style={{ fontSize:'1.3rem', marginBottom:'0.3rem' }}>{t.icon}</div>
                      <div style={{ fontWeight:600, fontSize:'0.78rem' }}>{t.label}</div>
                      <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{t.desc}</div>
                    </div>
                  ))}
                </div>
                <div className="flex-row" style={{ justifyContent:'flex-end', gap:'0.75rem' }}>
                  <button className="btn btn-ghost" onClick={() => setTesterModal(null)}>Cancel</button>
                  <button className="btn btn-primary" disabled={testerRunning || !testerEmail.trim()} onClick={() => {
                    setTesterRunning(true);
                    setTimeout(() => {
                      const spamScore = (Math.random() * 3).toFixed(1);
                      const placement = spamScore < 1.5 ? 'Inbox' : spamScore < 2.5 ? 'Promotions' : 'Spam';
                      setTesterResult({
                        spamScore, placement,
                        delivered: true,
                        spf: testerModal.spf, dkim: testerModal.dkim, dmarc: testerModal.dmarc,
                        openTracking: true,
                        clickTracking: true,
                        replyTo: testerModal.email,
                        headers: ['Message-ID: OK', 'X-Mailer: MailSender v2', 'Content-Type: text/html'],
                        types: [{ name:'Cold Email', inbox: spamScore<2?'✅ Inbox':'⚠️ Promotions', score: spamScore },
                                { name:'Follow-up',  inbox: spamScore<2.5?'✅ Inbox':'🚫 Spam', score: (spamScore*0.8).toFixed(1) },
                                { name:'Newsletter', inbox: spamScore<1?'✅ Inbox':'⚠️ Promotions', score: (parseFloat(spamScore)+0.8).toFixed(1) }],
                      });
                      setTesterRunning(false);
                      // Also add to tracking log
                      setTrackingLog(prev => ({ ...prev, [testerModal.email]: [...(prev[testerModal.email]||[]), { id: Date.now(), to: testerEmail, subject: '[Test Email]', sentAt: new Date().toLocaleString('en-GB',{hour12:false}).slice(0,16).replace('T',' '), type: 'Test', delivered: true, opened: false, openedAt: null, clicked: false, bounced: false }] }));
                    }, 2200);
                  }}>{testerRunning ? 'Running test…' : '🧪 Run Deliverability Test'}</button>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'1.1rem' }}>
                {/* Score banner */}
                <div style={{ display:'flex', gap:'1rem', alignItems:'center', background: testerResult.spamScore < 1.5 ? 'rgba(16,185,129,0.1)' : testerResult.spamScore < 2.5 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${testerResult.spamScore < 1.5 ? '#10b981' : testerResult.spamScore < 2.5 ? '#f59e0b' : '#ef4444'}40`, borderRadius:10, padding:'0.9rem 1.1rem' }}>
                  <div style={{ fontSize:'2.5rem' }}>{testerResult.spamScore < 1.5 ? '✅' : testerResult.spamScore < 2.5 ? '⚠️' : '🚫'}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'1rem' }}>Spam Score: {testerResult.spamScore} / 5.0</div>
                    <div style={{ fontSize:'0.82rem', color:'var(--text-secondary)' }}>Placement: <strong>{testerResult.placement}</strong> &nbsp;·&nbsp; Delivered: <strong style={{ color:'#10b981' }}>Yes</strong></div>
                  </div>
                </div>
                {/* Email type breakdown */}
                <div>
                  <div style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:'0.5rem' }}>📬 Placement by Email Type</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                    {testerResult.types.map(t => (
                      <div key={t.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.5rem 0.75rem', background:'var(--bg-tertiary)', borderRadius:7, fontSize:'0.82rem' }}>
                        <span style={{ fontWeight:500 }}>{t.name}</span>
                        <span>{t.inbox}</span>
                        <span style={{ color:'var(--text-muted)' }}>Score: {t.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Auth checks */}
                <div>
                  <div style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:'0.5rem' }}>🔐 Authentication</div>
                  <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                    {[['SPF', testerResult.spf],['DKIM', testerResult.dkim],['DMARC', testerResult.dmarc],['Open Tracking', testerResult.openTracking],['Click Tracking', testerResult.clickTracking]].map(([lbl, ok]) => (
                      <span key={lbl} style={{ fontSize:'0.73rem', fontWeight:700, padding:'3px 8px', borderRadius:5, background: ok?'#10b98120':'#ef444420', color: ok?'#10b981':'#ef4444', border:`1px solid ${ok?'#10b98140':'#ef444440'}` }}>{ok?'✓':'✗'} {lbl}</span>
                    ))}
                  </div>
                </div>
                {/* Headers */}
                <div style={{ background:'var(--bg-tertiary)', borderRadius:8, padding:'0.6rem 0.8rem' }}>
                  <div style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-muted)', marginBottom:'0.4rem' }}>📋 Email Headers</div>
                  {testerResult.headers.map((h,i) => <div key={i} style={{ fontSize:'0.73rem', fontFamily:'monospace', color:'var(--text-secondary)', lineHeight:1.6 }}>{h}</div>)}
                </div>
                <div className="flex-row" style={{ justifyContent:'flex-end', gap:'0.75rem' }}>
                  <button className="btn btn-ghost" onClick={() => { setTesterResult(null); setTesterEmail(''); }}>← Re-test</button>
                  <button className="btn btn-primary" onClick={() => setTesterModal(null)}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== EMAIL TRACKING MODAL ===================== */}
      {trackingModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:120 }} onClick={() => setTrackingModal(null)}>
          <div className="card card-p" style={{ width:700, maxHeight:'88vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
              <div>
                <h3 style={{ fontWeight:700, fontSize:'1.05rem' }}>📊 Email Tracking — {trackingModal.email}</h3>
                <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:'0.2rem' }}>Delivery status, open tracking & click analytics per email sent</div>
              </div>
              <button onClick={() => setTrackingModal(null)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'1.2rem' }}>✕</button>
            </div>
            {/* Summary stats */}
            {(() => {
              const log = trackingLog[trackingModal.email] || [];
              const delivered = log.filter(l => l.delivered).length;
              const opened = log.filter(l => l.opened).length;
              const clicked = log.filter(l => l.clicked).length;
              const bounced = log.filter(l => l.bounced).length;
              return (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.75rem', marginBottom:'1.25rem' }}>
                    {[{ label:'Delivered', val: delivered, color:'#10b981', icon:'✅' },
                      { label:'Opened', val: opened, color:'#6366f1', icon:'👁️' },
                      { label:'Clicked', val: clicked, color:'#f59e0b', icon:'🖱️' },
                      { label:'Bounced', val: bounced, color:'#ef4444', icon:'⛔' }
                    ].map(s => (
                      <div key={s.label} style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:'0.75rem', textAlign:'center', border:`1px solid ${s.color}30` }}>
                        <div style={{ fontSize:'1.3rem' }}>{s.icon}</div>
                        <div style={{ fontSize:'1.4rem', fontWeight:700, color:s.color }}>{s.val}</div>
                        <div style={{ fontSize:'0.73rem', color:'var(--text-muted)' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {log.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:'0.875rem' }}>No emails sent yet from this account.</div>
                  ) : (
                    <div className="card" style={{ overflow:'hidden' }}>
                      <table className="data-table">
                        <thead><tr>
                          <th>To</th><th>Subject</th><th>Type</th><th>Sent At</th>
                          <th>Delivered</th><th>Opened</th><th>Clicked</th>
                        </tr></thead>
                        <tbody>
                          {log.map(l => (
                            <tr key={l.id}>
                              <td style={{ fontSize:'0.8rem' }}>{l.to}</td>
                              <td style={{ fontSize:'0.8rem', maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.subject}</td>
                              <td><span style={{ fontSize:'0.7rem', fontWeight:700, padding:'2px 7px', borderRadius:4, background: l.type==='Cold'?'rgba(99,102,241,0.15)':l.type==='Follow-up'?'rgba(245,158,11,0.15)':l.type==='Test'?'rgba(16,185,129,0.15)':'rgba(255,255,255,0.08)', color: l.type==='Cold'?'#6366f1':l.type==='Follow-up'?'#f59e0b':l.type==='Test'?'#10b981':'var(--text-secondary)' }}>{l.type}</span></td>
                              <td style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{l.sentAt}</td>
                              <td style={{ textAlign:'center' }}>{l.bounced ? <span style={{ color:'#ef4444', fontSize:'0.8rem' }}>⛔ Bounced</span> : l.delivered ? <span style={{ color:'#10b981', fontSize:'0.85rem' }}>✅</span> : <span style={{ color:'#f59e0b' }}>⏳</span>}</td>
                              <td style={{ textAlign:'center' }}>
                                {l.opened
                                  ? <span style={{ fontSize:'0.75rem', color:'#6366f1' }}>👁️ {l.openedAt?.slice(11)}</span>
                                  : <span style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>—</span>}
                              </td>
                              <td style={{ textAlign:'center' }}>{l.clicked ? <span style={{ color:'#f59e0b', fontSize:'0.85rem' }}>🖱️</span> : <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'1rem' }}>
                    <button className="btn btn-ghost" onClick={() => setTrackingModal(null)}>Close</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===================== SEND EMAIL MODAL ===================== */}
      {sendModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.82)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:110 }} onClick={() => { setSendModal(null); setSendDone(false); }}>
          <div className="card card-p" style={{ width:480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
              <h3 style={{ fontWeight:700, fontSize:'1.05rem' }}>✉️ Send Email</h3>
              <button onClick={() => { setSendModal(null); setSendDone(false); }} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'1.2rem' }}>✕</button>
            </div>
            {!sendDone ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">From Account</label>
                  <div style={{ padding:'0.5rem 0.75rem', background:'var(--bg-tertiary)', borderRadius:8, fontSize:'0.85rem', color:'var(--text-secondary)' }}>{sendModal.email}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">To <span style={{ color:'var(--danger)' }}>*</span></label>
                  <input className="form-input" value={sendForm.to} onChange={e => setSendForm(p=>({...p,to:e.target.value}))} placeholder="recipient@example.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Subject <span style={{ color:'var(--danger)' }}>*</span></label>
                  <input className="form-input" value={sendForm.subject} onChange={e => setSendForm(p=>({...p,subject:e.target.value}))} placeholder="Email subject…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Body <span style={{ color:'var(--danger)' }}>*</span></label>
                  <textarea className="form-input" rows={5} value={sendForm.body} onChange={e => setSendForm(p=>({...p,body:e.target.value}))} placeholder="Write your email here…" style={{ resize:'vertical' }} />
                </div>
                <div className="flex-row" style={{ justifyContent:'flex-end', gap:'0.75rem' }}>
                  <button className="btn btn-ghost" onClick={() => setSendModal(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSend} disabled={sending || !sendForm.subject.trim() || !sendForm.body.trim()}>
                    {sending ? 'Sending…' : '✉️ Send Email'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'2rem 1rem' }}>
                <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>✅</div>
                <div style={{ fontWeight:700, fontSize:'1.1rem', marginBottom:'0.5rem' }}>Email Sent!</div>
                <div style={{ fontSize:'0.85rem', color:'var(--text-secondary)', marginBottom:'1.5rem' }}>Your email was sent from <strong>{sendModal.email}</strong> to <strong>{sendForm.to}</strong>.</div>
                <button className="btn btn-primary" onClick={() => { setSendModal(null); setSendDone(false); }}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== LEADS LIST MODAL ===================== */}
      {leadsModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.82)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:110 }} onClick={() => setLeadsModal(false)}>
          <div className="card card-p" style={{ width:620, maxHeight:'88vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:'1.25rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <h3 style={{ fontWeight:700, fontSize:'1.1rem' }}>👥 Leads List</h3>
                <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>Add leads one by one to build your outreach list</div>
              </div>
              <button onClick={() => setLeadsModal(false)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'1.2rem' }}>✕</button>
            </div>
            {/* Add lead form */}
            <div style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:'1rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              <div style={{ fontWeight:600, fontSize:'0.85rem', color:'var(--text-secondary)' }}>➕ Add New Lead</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.65rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize:'0.78rem' }}>Full Name *</label>
                  <input className="form-input" placeholder="John Doe" value={leadForm.name} onChange={e => { setLeadForm(p=>({...p,name:e.target.value})); if(leadErrors.name) setLeadErrors(p=>{const n={...p};delete n.name;return n;}); }} style={leadErrors.name?{borderColor:'var(--danger)'}:{}} />
                  {leadErrors.name && <div style={{ color:'var(--danger)', fontSize:'0.72rem', marginTop:'0.2rem' }}>⚠ {leadErrors.name}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize:'0.78rem' }}>Email *</label>
                  <input className="form-input" placeholder="lead@company.com" value={leadForm.email} onChange={e => { setLeadForm(p=>({...p,email:e.target.value})); if(leadErrors.email) setLeadErrors(p=>{const n={...p};delete n.email;return n;}); }} style={leadErrors.email?{borderColor:'var(--danger)'}:{}} />
                  {leadErrors.email && <div style={{ color:'var(--danger)', fontSize:'0.72rem', marginTop:'0.2rem' }}>⚠ {leadErrors.email}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize:'0.78rem' }}>Company</label>
                  <input className="form-input" placeholder="Acme Corp" value={leadForm.company} onChange={e => setLeadForm(p=>({...p,company:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize:'0.78rem' }}>Phone</label>
                  <input className="form-input" placeholder="+1 555 000 0000" value={leadForm.phone} onChange={e => setLeadForm(p=>({...p,phone:e.target.value}))} />
                </div>
              </div>
              <button className="btn btn-primary" style={{ alignSelf:'flex-end' }} onClick={addLead}>+ Add Lead</button>
            </div>
            {/* Leads table */}
            {leads.length === 0 ? (
              <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:'0.875rem' }}>No leads yet. Add your first lead above.</div>
            ) : (
              <div className="card" style={{ overflow:'hidden' }}>
                <table className="data-table">
                  <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Company</th><th>Phone</th><th></th></tr></thead>
                  <tbody>
                    {leads.map((l, i) => (
                      <tr key={l.id}>
                        <td style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>{i+1}</td>
                        <td style={{ fontWeight:500, fontSize:'0.875rem' }}>{l.name}</td>
                        <td style={{ fontSize:'0.85rem', color:'var(--text-secondary)' }}>{l.email}</td>
                        <td style={{ fontSize:'0.8rem' }}>{l.company || '—'}</td>
                        <td style={{ fontSize:'0.8rem' }}>{l.phone || '—'}</td>
                        <td><button onClick={() => removeLead(l.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--danger)', fontSize:'0.9rem' }}>🗑</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{leads.length} lead{leads.length !== 1 ? 's' : ''} in list</span>
              <button className="btn btn-ghost" onClick={() => setLeadsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== BULK IMPORT CSV MODAL ===================== */}
      {csvModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setCsvModal(false)}>
          <div className="card card-p" style={{ width: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>Bulk Import Accounts via CSV</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Upload a CSV file containing multiple email accounts</div>
              </div>
              <button onClick={() => setCsvModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            {!csvResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Provider selection for bulk import */}
                <div className="form-group">
                  <label className="form-label">Email Provider (for all imported accounts)</label>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.5rem' }}>
                    {['Google','Microsoft','SMTP','Other'].map(p => (
                      <button key={p} onClick={() => setCsvProvider(p)}
                        style={{ padding:'0.55rem 0.25rem', borderRadius:8, border:`2px solid ${csvProvider===p?'var(--accent-primary)':'var(--border-color)'}`, background:csvProvider===p?'rgba(99,102,241,0.12)':'var(--bg-tertiary)', color:csvProvider===p?'var(--accent-primary)':'var(--text-secondary)', cursor:'pointer', fontSize:'0.8rem', fontWeight:600 }}>
                        {p==='Google'?'🔵 ':p==='Microsoft'?'🟧 ':p==='SMTP'?'⚙️ ':'📧 '}{p}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📄</div>
                  <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Upload your CSV file</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>File must include Email, Provider, and App Password/SMTP details.</p>
                  
                  <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
                  
                  <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                    Choose File
                  </button>
                  
                  {csvFile && (
                    <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--accent-primary)' }}>✓</span> {csvFile.name} selected
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Need a template?</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Download our sample CSV to format your data correctly.</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={downloadCsvTemplate}>Download Template</button>
                </div>

                <div className="flex-row" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button className="btn btn-ghost" onClick={() => setCsvModal(false)} disabled={csvImporting}>Cancel</button>
                  <button className="btn btn-primary" onClick={processCsv} disabled={!csvFile || csvImporting}>
                    {csvImporting ? 'Importing & Testing...' : 'Import Accounts'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.8rem' }}>✅</div>
                <h3 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.5rem' }}>Import Successful!</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                  Successfully added <strong>{csvResult.added}</strong> accounts.
                </p>
                <button className="btn btn-primary" onClick={() => setCsvModal(false)}>Done</button>
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
