import React, { useState, useRef, useEffect, useCallback } from 'react';
import { subscribeUnread } from './inboxStore';
import { api } from './api';
import './index.css';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import Signup from './Signup';
import ForgotPassword from './ForgotPassword';
import Dashboard from './Dashboard';
import Campaigns from './Campaigns';
import Prospects from './Prospects';
import Inbox from './Inbox';
import Accounts from './Accounts';
import Warmup from './Warmup';
import Settings from './Settings';
import AdminPanel from './AdminPanel';

const NAV = [
  { key: 'dashboard', label: 'Dashboard',     icon: '🏠', badge: null },
  { key: 'campaigns', label: 'Campaigns',      icon: '📢', badge: null },
  { key: 'prospects', label: 'Prospects',      icon: '👥', badge: null },
  { key: 'inbox',     label: 'Unified Inbox',  icon: '💬', badge: null, badgeCls: 'green' },
  { key: 'accounts',  label: 'Email Accounts', icon: '📧', badge: null },
  { key: 'warmup',    label: 'Email Warmup',   icon: '🔥', badge: null },
];

function NavItem({ item, active, onClick }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={() => onClick(item.key)}>
      <span className="nav-icon">{item.icon}</span>
      <span>{item.label}</span>
      {item.badge && <span className={`nav-badge ${item.badgeCls || ''}`}>{item.badge}</span>}
    </button>
  );
}

// ── User avatar dropdown ───────────────────────────────────────────────────────
function UserMenu({ user, initials, logout, onSettings }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        className="avatar"
        title={user?.name}
        onClick={() => setOpen(v => !v)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        {initials}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          borderRadius: 12, boxShadow: 'var(--shadow-md)', zIndex: 200,
          minWidth: 220, overflow: 'hidden',
        }}>
          {/* User info header */}
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', color: '#fff', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
              {user?.role === 'admin' && (
                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)', marginTop: '0.2rem', display: 'inline-block' }}>
                  Admin
                </span>
              )}
            </div>
          </div>

          {/* Menu items */}
          {[
            { icon: '⚙️', label: 'Settings', action: () => { onSettings(); setOpen(false); } },
          ].map(item => (
            <button key={item.label} onClick={item.action} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none',
              color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.875rem', textAlign: 'left',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}

          <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.25rem 0' }} />

          {/* Logout */}
          <button onClick={() => { logout(); setOpen(false); }} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none',
            color: 'var(--danger)', cursor: 'pointer', fontSize: '0.875rem', textAlign: 'left',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span>🚪</span> Logout
          </button>
        </div>
      )}
    </div>
  );
}

function AppInner() {
  const { user, logout, isAdmin } = useAuth();
  const [tab, setTab]             = useState('dashboard');
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [newEmailPopup, setNewEmailPopup] = useState(null); // { count, senders }
  const notifRef     = useRef(null);
  const knownIdsRef  = useRef(null); // Set of email IDs we've already seen
  const tabRef       = useRef(tab);
  useEffect(() => { tabRef.current = tab; }, [tab]);

  // Live unread count from Inbox component (when on inbox page)
  useEffect(() => subscribeUnread(setInboxUnread), []);

  // ── Global background poll — runs even when user is NOT on inbox tab ──────
  useEffect(() => {
    // Reset known IDs when user changes — prevents cross-user notification leaks
    knownIdsRef.current = null;
    let timer;
    async function poll() {
      try {
        const res = await api.get('/inbox?folder=inbox');
        if (!res || res.error) return;
        const emails = res.emails || [];
        const unread = emails.filter(e => e.unread);
        // First run: just record current IDs, no popup
        if (knownIdsRef.current === null) {
          knownIdsRef.current = new Set(emails.map(e => e.id));
          return;
        }
        // Find genuinely new unread emails
        const fresh = unread.filter(e => !knownIdsRef.current.has(e.id));
        if (fresh.length > 0) {
          // Update known IDs
          emails.forEach(e => knownIdsRef.current.add(e.id));
          // Only show popup if user is NOT on the inbox page
          if (tabRef.current !== 'inbox') {
            const senders = [...new Set(fresh.map(e => e.name || e.email))].slice(0, 3);
            setNewEmailPopup({ count: fresh.length, senders });
            // Update sidebar badge
            setInboxUnread(prev => prev + fresh.length);
          }
        }
      } catch { /* ignore network errors */ }
    }
    // First poll after 5s, then every 60s
    const initial = setTimeout(() => { poll(); timer = setInterval(poll, 60_000); }, 5_000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [user?.id]); // Re-run when user changes

  // Build nav with live badge — only show badge when > 0
  const nav = NAV.map(item =>
    item.key === 'inbox'
      ? { ...item, badge: inboxUnread > 0 ? String(inboxUnread) : null }
      : item
  );

  const initials = user ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  const PAGE_TITLES = {
    dashboard: 'Dashboard', campaigns: 'Campaigns', prospects: 'Prospects',
    inbox: 'Unified Inbox', accounts: 'Email Accounts', warmup: 'Email Warmup',
    settings: 'Settings', admin: 'Admin Panel',
  };

  function navigate(key) {
    setTab(key);
    setSidebarOpen(false);
    if (key === 'inbox') setNewEmailPopup(null);
  }

  // Close notifications on outside click
  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    if (notifOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);



  return (
    <div className="app-container">
      {/* ── Global new-email popup (shows when away from inbox) ── */}
      {newEmailPopup && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          border: '1px solid rgba(99,102,241,0.5)',
          borderRadius: 14, padding: '1rem 1.25rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)', maxWidth: 320,
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
          animation: 'slideUp 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>📬</span>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
              {newEmailPopup.count} new email{newEmailPopup.count > 1 ? 's' : ''}
            </span>
            <button onClick={() => setNewEmailPopup(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>✕</button>
          </div>
          {newEmailPopup.senders.length > 0 && (
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>
              From: {newEmailPopup.senders.join(', ')}{newEmailPopup.count > 3 ? ` +${newEmailPopup.count - 3} more` : ''}
            </div>
          )}
          <button
            onClick={() => navigate('inbox')}
            style={{ background: 'rgba(99,102,241,0.9)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.4rem 0.9rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}
          >View Inbox →</button>
        </div>
      )}

      {/* Mobile sidebar backdrop */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />


      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">M</div>
          <div className="logo-text">Mail<span>Sender</span></div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Main Menu</div>
          {nav.map(item => <NavItem key={item.key} item={item} active={tab === item.key} onClick={navigate} />)}
        </div>

        <div className="sidebar-section" style={{ marginTop: 'auto' }}>
          <div className="sidebar-section-label">Account</div>
          <NavItem item={{ key: 'settings', label: 'Settings', icon: '⚙️' }} active={tab === 'settings'} onClick={navigate} />
          {isAdmin && <NavItem item={{ key: 'admin', label: 'Admin Panel', icon: '👑' }} active={tab === 'admin'} onClick={navigate} />}
          <button className="nav-item" onClick={() => { logout(); setSidebarOpen(false); }} style={{ color: 'var(--danger)' }}>
            <span className="nav-icon">🚪</span><span>Logout</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="warmup-widget">
            <div className="warmup-widget-title"><span>🔥</span> Warmup Health</div>
            <div className="warmup-score">88 / 100</div>
            <div className="progress-bar"><div className="progress-fill green" style={{ width: '88%' }}></div></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <span className="fs-xs text-secondary">96.2% deliverability</span>
              <span className="fs-xs" style={{ color: 'var(--success)' }}>↑ +3 today</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-header">
          {/* Hamburger — only visible on mobile */}
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>

          <div><h1 className="page-title">{PAGE_TITLES[tab]}</h1></div>
          
          <div className="header-actions">
            <div className="search-box header-search-box" style={{ width: 220 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>🔍</span>
              <input placeholder="Search anything..." />
            </div>

            {/* Notifications */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button className="header-icon-btn" onClick={() => setNotifOpen(v => !v)} style={{ position: 'relative' }}>
                🔔<span className="notif-dot"></span>
              </button>
              {notifOpen && (
                <div style={{ position: 'absolute', top: '110%', right: 0, width: 'min(300px, 90vw)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: 'var(--shadow-md)', zIndex: 50 }}>
                  <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: '0.875rem' }}>Notifications</div>
                  {[
                    { icon: '💬', text: 'Alex Turner replied to your campaign', time: '10m ago' },
                    { icon: '⚠️', text: 'Warmup score dropped for info@domain2.com', time: '3h ago' },
                    { icon: '✅', text: 'Campaign "SaaS Founders Q1" completed', time: '1d ago' },
                  ].map((n, i) => (
                    <div key={i} style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', borderBottom: i < 2 ? '1px solid var(--border-color)' : 'none', cursor: 'pointer' }}>
                      <span style={{ fontSize: '1.1rem' }}>{n.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.8rem' }}>{n.text}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="btn btn-primary btn-sm" onClick={() => navigate('campaigns')}>+ New Campaign</button>

            {/* User avatar dropdown */}
            <UserMenu user={user} initials={initials} logout={logout} onSettings={() => navigate('settings')} />
          </div>
        </header>

        <div className="page-content">
          {tab === 'dashboard' && <Dashboard onNavigate={navigate} />}
          {tab === 'campaigns' && <Campaigns userId={user?.id} />}
          {tab === 'prospects' && <Prospects />}
          {tab === 'inbox'     && <Inbox userId={user?.id} />}
          {tab === 'accounts'  && <Accounts userId={user?.id} />}
          {tab === 'warmup'    && <Warmup />}
          {tab === 'settings'  && <Settings />}
          {tab === 'admin'     && isAdmin && <AdminPanel />}
        </div>
      </main>
    </div>
  );
}

function AuthGate() {
  const { isAuth } = useAuth();
  const [authPage, setAuthPage] = useState('login');
  if (isAuth) return <AppInner />;
  if (authPage === 'signup') return <Signup onGoLogin={() => setAuthPage('login')} />;
  if (authPage === 'forgot') return <ForgotPassword onGoLogin={() => setAuthPage('login')} />;
  return <Login onGoSignup={() => setAuthPage('signup')} onGoForgot={() => setAuthPage('forgot')} />;
}

export default function App() {
  return <AuthProvider><AuthGate /></AuthProvider>;
}
