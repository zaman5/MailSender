import React, { useState } from 'react';
import SequenceBuilder from './SequenceBuilder';
import CampaignSchedule from './CampaignSchedule';
import CampaignSettings from './CampaignSettings';
import CampaignSubsequences from './CampaignSubsequences';
import CampaignLeads from './CampaignLeads';

const TABS = ['Leads', 'Sequences', 'Schedule', 'Settings', 'Subsequences', 'Analytics'];

const TAB_ICONS = {
  Leads: '👥',
  Sequences: '🔗',
  Schedule: '📅',
  Settings: '⚙️',
  Subsequences: '🔀',
  Analytics: '📊',
};

const ANALYTICS_STATS = [
  { label: 'Total Email Sent', icon: '📤', value: '1,240' },
  { label: 'Total Contacted Leads', icon: '👥', value: '842' },
  { label: 'New Leads Contacted', icon: '✨', value: '612' },
  { label: 'Total Completed Leads', icon: '✅', value: '528' },
  { label: 'Reply Rate (with OOO)', icon: '↩', value: '14.2%', sub: '119' },
  { label: 'Reply Rate', icon: '↩', value: '12.4%', sub: '104' },
  { label: 'Positive Reply', icon: '⭐', value: '5.1%', sub: '$0k' },
  { label: 'Bounce Rate', icon: '⚡', value: '1.1%', sub: '14' },
  { label: 'Open rate', icon: '👁', value: '42.6%', wide: true },
  { label: 'Unsubscribe rate', icon: '🚫', value: '0.0%', wide: true },
];

export default function CampaignDetail({ campaign, onBack, onToggleStatus }) {
  const [tab, setTab] = useState('Leads');
  const [active, setActive] = useState(campaign.status === 'active');
  const [toast, setToast] = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200); }

  function toggleCampaign() {
    setActive(v => !v);
    onToggleStatus(campaign.id);
    showToast(active ? 'Campaign paused' : 'Campaign resumed');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#10b981', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 10, fontWeight: 500, zIndex: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', fontSize: '0.875rem' }}>
          ✅ {toast}
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
        Home › Campaigns › <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>{campaign.name}</span>
      </div>

      {/* Campaign Tab Bar (PlusVibe style top nav) */}
      <div className="card" style={{ padding: '0 1rem', display: 'flex', alignItems: 'center', gap: 0, marginBottom: '1.5rem', overflow: 'hidden', flexShrink: 0 }}>
        {/* Campaign Name + Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingRight: '1.5rem', borderRight: '1px solid var(--border-color)', marginRight: '0.5rem' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: active ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{campaign.name}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{active ? 'Active' : 'Paused'}</span>
          {/* Toggle Switch */}
          <div
            onClick={toggleCampaign}
            style={{ width: 36, height: 20, borderRadius: 99, cursor: 'pointer', background: active ? 'var(--accent-primary)' : 'var(--bg-tertiary)', border: `2px solid ${active ? 'var(--accent-primary)' : 'var(--border-color)'}`, position: 'relative', transition: 'all 0.2s', flexShrink: 0 }}
          >
            <div style={{ position: 'absolute', top: 1, left: active ? 14 : 1, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', flex: 1, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none', border: 'none',
                borderBottom: tab === t ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: tab === t ? 'var(--accent-primary)' : 'var(--text-secondary)',
                padding: '1rem 0.875rem', cursor: 'pointer', fontWeight: tab === t ? 600 : 400,
                fontSize: '0.85rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem',
                transition: 'color 0.15s',
              }}
            >
              {TAB_ICONS[t]} {t}
            </button>
          ))}
        </div>

        {/* Back Button */}
        <button
          onClick={onBack}
          className="btn btn-secondary btn-sm"
          style={{ marginLeft: '0.5rem', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          ← Back to Campaigns
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
        {tab === 'Leads' && <CampaignLeads campaign={campaign} />}
        {tab === 'Sequences' && <SequenceBuilder campaign={campaign} />}
        {tab === 'Schedule' && <CampaignSchedule />}
        {tab === 'Settings' && <CampaignSettings campaign={campaign} />}
        {tab === 'Subsequences' && <CampaignSubsequences />}
        {tab === 'Analytics' && (
          <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontWeight: 700 }}>Campaign Analytics</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['Today', 'Last 7 days', 'Last 30 days', 'All time'].map(r => (
                  <button key={r} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>{r}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {ANALYTICS_STATS.map((s, i) => (
                <div key={i} className="card card-p" style={{ gridColumn: s.wide ? 'span 2' : 'span 1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    <span>{s.icon}</span><span>{s.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontFamily: 'Outfit', fontSize: '1.5rem', fontWeight: 700 }}>{s.value}</span>
                    {s.sub && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.sub}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
