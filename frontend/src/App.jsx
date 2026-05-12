import React, { useState } from 'react';
import './index.css';
import Dashboard from './Dashboard';
import Campaigns from './Campaigns';
import Prospects from './Prospects';
import Inbox from './Inbox';
import Accounts from './Accounts';
import Warmup from './Warmup';
import Settings from './Settings';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠', badge: null },
  { key: 'campaigns', label: 'Campaigns', icon: '📢', badge: '12' },
  { key: 'prospects', label: 'Prospects', icon: '👥', badge: null },
  { key: 'inbox', label: 'Unified Inbox', icon: '💬', badge: '3', badgeCls: 'green' },
  { key: 'accounts', label: 'Email Accounts', icon: '📧', badge: null },
  { key: 'warmup', label: 'Email Warmup', icon: '🔥', badge: null },
];

const BOTTOM_NAV = [
  { key: 'settings', label: 'Settings', icon: '⚙️', badge: null },
];

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  campaigns: 'Campaigns',
  prospects: 'Prospects',
  inbox: 'Unified Inbox',
  accounts: 'Email Accounts',
  warmup: 'Email Warmup',
  settings: 'Settings',
};

function NavItem({ item, active, onClick }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={() => onClick(item.key)}>
      <span className="nav-icon">{item.icon}</span>
      <span>{item.label}</span>
      {item.badge && <span className={`nav-badge ${item.badgeCls || ''}`}>{item.badge}</span>}
    </button>
  );
}

export default function App() {
  const [tab, setTab] = useState('accounts');
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <div className="app-container">
      {/* ===== SIDEBAR ===== */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">M</div>
          <div className="logo-text">Mail<span>Sender</span></div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Main Menu</div>
          {NAV.map(item => (
            <NavItem key={item.key} item={item} active={tab === item.key} onClick={setTab} />
          ))}
        </div>

        <div className="sidebar-section" style={{ marginTop: 'auto' }}>
          <div className="sidebar-section-label">Account</div>
          {BOTTOM_NAV.map(item => (
            <NavItem key={item.key} item={item} active={tab === item.key} onClick={setTab} />
          ))}
        </div>

        {/* Warmup Health Widget */}
        <div className="sidebar-footer">
          <div className="warmup-widget">
            <div className="warmup-widget-title">
              <span>🔥</span> Warmup Health
            </div>
            <div className="warmup-score">88 / 100</div>
            <div className="progress-bar">
              <div className="progress-fill green" style={{ width: '88%' }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <span className="fs-xs text-secondary">96.2% deliverability</span>
              <span className="fs-xs" style={{ color: 'var(--success)' }}>↑ +3 today</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <main className="main-content">
        {/* Header */}
        <header className="main-header">
          <div>
            <h1 className="page-title">{PAGE_TITLES[tab]}</h1>
          </div>
          <div className="header-actions">
            {/* Search */}
            <div className="search-box" style={{ width: 220 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>🔍</span>
              <input placeholder="Search anything..." />
            </div>

            {/* Notifications */}
            <button className="header-icon-btn" onClick={() => setNotifOpen(v => !v)} style={{ position: 'relative' }}>
              🔔
              <span className="notif-dot"></span>
              {notifOpen && (
                <div style={{ position: 'absolute', top: '110%', right: 0, width: 300, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: 'var(--shadow-md)', zIndex: 50, overflow: 'hidden' }}>
                  <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: '0.875rem' }}>Notifications</div>
                  {[
                    { icon: '💬', text: 'Alex Turner replied to your campaign', time: '10m ago' },
                    { icon: '⚠️', text: 'Warmup score dropped for info@domain2.com', time: '3h ago' },
                    { icon: '✅', text: 'Campaign "SaaS Founders Q1" completed', time: '1d ago' },
                  ].map((n, i) => (
                    <div key={i} style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', borderBottom: i < 2 ? '1px solid var(--border-color)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ fontSize: '1.1rem' }}>{n.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>{n.text}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </button>

            {/* New Campaign CTA */}
            <button className="btn btn-primary btn-sm" onClick={() => setTab('campaigns')}>+ New Campaign</button>

            {/* Avatar */}
            <div className="avatar" title="Zaman Khan">ZK</div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          {tab === 'dashboard' && <Dashboard onNavigate={setTab} />}
          {tab === 'campaigns' && <Campaigns />}
          {tab === 'prospects' && <Prospects />}
          {tab === 'inbox' && <Inbox />}
          {tab === 'accounts' && <Accounts />}
          {tab === 'warmup' && <Warmup />}
          {tab === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
}
