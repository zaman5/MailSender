import React, { useState } from 'react';

const DAYS = ['19 Apr','21 Apr','23 Apr','25 Apr','27 Apr','29 Apr','1 May'];
const BAR_DATA = [3,3,3,3,5,10,10,7];
const METRIC_DATA = [0,0,0,1,1,1,0,1];

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

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '1rem' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <span>{label}</span><span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>ⓘ</span>
      </div>
      <div style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: 700 }}>{value}</div>
      {sub !== undefined && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{sub}</div>}
    </div>
  );
}

function CssBarChart({ data, label, colors }) {
  const max = Math.max(...data, 1);
  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        {colors.map((c, i) => <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ width: 12, height: 12, borderRadius: 2, background: c.color, display: 'inline-block' }} />{c.label}</span>)}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: 100, paddingBottom: 4, borderBottom: '1px solid var(--border-color)' }}>
        {data.map((v, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', background: colors[0].color, borderRadius: '3px 3px 0 0', height: `${(v / max) * 85}%`, minHeight: v > 0 ? 4 : 0, transition: 'height 0.3s' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '0.4rem' }}>
        {DAYS.map((d, i) => <div key={i} style={{ flex: 1, fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center' }}>{d}</div>)}
      </div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 42, height: 24, borderRadius: 99, cursor: 'pointer', background: value ? 'var(--accent-primary)' : 'var(--bg-tertiary)', border: `2px solid ${value ? 'var(--accent-primary)' : 'var(--border-color)'}`, position: 'relative', transition: 'all 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 1, left: value ? 18 : 1, width: 18, height: 18, borderRadius: '50%', background: value ? '#fff' : 'var(--text-muted)', transition: 'left 0.2s' }} />
    </div>
  );
}

export default function AccountPanel({ account, accounts, onClose, onNavigate, onUpdate, showToast }) {
  const [mainTab, setMainTab] = useState('Account');
  const [subTab, setSubTab] = useState('Analytics');
  const [dateRange, setDateRange] = useState('Custom');
  const [warmupSettings, setWarmupSettings] = useState({
    filterTag: 'helpful', includeFilterTag: false, dailyLimit: 20,
    emailReply: true, activeLimit: 1, dailyIncrement: 1,
    universe: '', signature: '', replyRate: 50,
  });
  const idx = accounts.findIndex(a => a.email === account.email);

  function saveWarmup() { showToast('Warmup settings saved'); }

  const EspIcon = account.esp === 'Google' ? GoogleIcon : MicrosoftIcon;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ width: '68%', maxWidth: 720, height: '100%', background: 'var(--bg-secondary)', boxShadow: '-8px 0 40px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        
        {/* Panel Header */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button onClick={() => onNavigate(idx - 1)} disabled={idx === 0} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, width: 28, height: 28, cursor: idx === 0 ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', opacity: idx === 0 ? 0.4 : 1 }}>◀</button>
            <button onClick={() => onNavigate(idx + 1)} disabled={idx === accounts.length - 1} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, width: 28, height: 28, cursor: idx === accounts.length - 1 ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', opacity: idx === accounts.length - 1 ? 0.4 : 1 }}>▶</button>
          </div>
          <EspIcon />
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{account.email}</span>
          <span style={{ fontSize: '0.9rem' }}>🏷</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* Main Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
          {['Account', 'Warmup'].map(t => (
            <button key={t} onClick={() => { setMainTab(t); setSubTab('Analytics'); }}
              style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: mainTab === t ? '2px solid var(--accent-primary)' : '2px solid transparent', color: mainTab === t ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: mainTab === t ? 600 : 400, fontSize: '0.875rem' }}>{t}</button>
          ))}
        </div>

        {/* Sub Tabs + Date */}
        <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['Analytics', 'Settings'].map(t => (
              <button key={t} onClick={() => setSubTab(t)}
                style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: subTab === t ? 'var(--accent-primary)' : 'transparent', color: subTab === t ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: subTab === t ? 600 : 400, fontSize: '0.825rem' }}>{t}</button>
            ))}
          </div>
          {subTab === 'Analytics' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {mainTab === 'Account' && (
                <select className="form-input" style={{ fontSize: '0.75rem', padding: '4px 10px', width: 'auto' }}>
                  <option>All Recipient Providers</option><option>Google</option><option>Microsoft</option>
                </select>
              )}
              <select className="form-input" style={{ fontSize: '0.75rem', padding: '4px 10px', width: 'auto' }} value={dateRange} onChange={e => setDateRange(e.target.value)}>
                <option>Custom</option><option>Last 2 Weeks</option><option>Last 30 Days</option>
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

          {/* ACCOUNT > ANALYTICS */}
          {mainTab === 'Account' && subTab === 'Analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                <StatCard label="Total Email Sent" value="50" />
                <StatCard label="Total Contacted Leads" value="50" />
                <StatCard label="New Leads Contacted" value="50" />
                <StatCard label="Total Completed Leads" value="50" />
                <StatCard label="Reply Rate (with OOO)" value="0%" sub="0" />
                <StatCard label="Reply Rate" value="0%" sub="0" />
                <StatCard label="Positive Reply" value="0%" sub="0" />
                <StatCard label="Bounce Rate" value="0%" sub="0" />
              </div>
              <div className="card card-p">
                <div style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem' }}>Daily Email Sent</div>
                <CssBarChart data={BAR_DATA} label="Daily" colors={[{ color: '#06b6d4', label: 'New Lead' }, { color: '#6366f1', label: 'Follow-up' }]} />
              </div>
              <div className="card card-p">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Daily Metrics</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem' }}>Show Count</button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }}>Show %</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem', fontSize: '0.72rem' }}>
                  {[['#8b5cf6','Reply Count (with OOO)'],['#6366f1','Reply Count'],['#ef4444','Positive Reply Count'],['#f59e0b','Bounce Count']].map(([c,l]) => (
                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}</span>
                  ))}
                </div>
                <CssBarChart data={METRIC_DATA} label="Metrics" colors={[{ color: '#8b5cf6', label: '' }]} />
              </div>
            </div>
          )}

          {/* ACCOUNT > SETTINGS */}
          {mainTab === 'Account' && subTab === 'Settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {[['Email Address', account.email, 'text'], ['First Name', '', 'text'], ['Last Name', '', 'text'], ['Daily Sending Limit', account.limit, 'number'], ['Minimum Time Gap (minutes)', '5', 'number']].map(([label, val, type]) => (
                <div key={label} className="form-group">
                  <label className="form-label">{label}</label>
                  <input className="form-input" type={type} defaultValue={val} />
                </div>
              ))}
              <div className="flex-between">
                <div><div style={{ fontWeight: 500, fontSize: '0.875rem' }}>Unsubscribe Link</div><div className="fs-xs text-secondary">Include unsubscribe link in emails</div></div>
                <Toggle value={false} onChange={() => {}} />
              </div>
              <button className="btn btn-primary" onClick={() => showToast('Account settings saved')}>Save Settings</button>
            </div>
          )}

          {/* WARMUP > ANALYTICS */}
          {mainTab === 'Warmup' && subTab === 'Analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <StatCard label="Warmup Email Sent" value="0" />
                <StatCard label="Landed in Inbox" value="0%" sub="0" />
                <StatCard label="Saved from Spam" value="0%" sub="0" />
                <StatCard label="Saved from Promotion" value="0%" sub="0" />
              </div>
              <div className="card card-p">
                <div style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem' }}>Daily Warmup Deliverability <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ⓘ</span></div>
                <CssBarChart data={[0,0,0,0,0,0,0,0]} label="Warmup" colors={[{ color: '#8b5cf6', label: 'Sent' }, { color: '#06b6d4', label: 'Inbox' }, { color: '#06b6d4', label: 'Promotion' }, { color: '#ef4444', label: 'Spam' }]} />
              </div>
              <div className="card card-p">
                <div style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem' }}>Deliverability Breakdown by Recipient ESP</div>
                {[['Google', <svg key="g" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>], ['Microsoft', <svg key="m" width="14" height="14" viewBox="0 0 24 24"><path d="M11.5 11.5H2v-9h9.5v9z" fill="#F25022"/><path d="M22 11.5h-9.5v-9H22v9z" fill="#7FBA00"/><path d="M11.5 22H2v-9h9.5v9z" fill="#00A4EF"/><path d="M22 22h-9.5v-9H22v9z" fill="#FFB900"/></svg>], ['Others', <span key="o" style={{ fontSize: '0.9rem' }}>🌐</span>]].map(([name, icon]) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>{icon}<span>{name}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem' }}>
                      <div style={{ width: 120, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99 }}><div style={{ height: '100%', width: '0%', background: 'var(--accent-primary)', borderRadius: 99 }} /></div>
                      <span style={{ color: 'var(--text-muted)' }}>0%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WARMUP > SETTINGS */}
          {mainTab === 'Warmup' && subTab === 'Settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Bootstrapping our Human-Email-Human (H2H) approach, the warmup engine is expertly adjusted to mirror natural human behavior and also key inbox tracking email patterns.
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.04em' }}>Basic Warmup Settings</div>
              <div className="form-group">
                <label className="form-label">Warmup Filter Tag <span className="fs-xs text-muted">(tag name used to filter warmup emails)</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
                  <input className="form-input" value={warmupSettings.filterTag} onChange={e => setWarmupSettings(p => ({...p, filterTag: e.target.value}))} />
                  <input className="form-input" defaultValue="quicklink" style={{ maxWidth: 120 }} />
                </div>
              </div>
              <div className="flex-between card card-p" style={{ padding: '0.875rem' }}>
                <div><div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Include Filter Tag in Outgoing Warmup</div><div className="fs-xs text-secondary">Adding this tag in the email body helps identify and avoid flagging warmup emails.</div></div>
                <Toggle value={warmupSettings.includeFilterTag} onChange={v => setWarmupSettings(p => ({...p, includeFilterTag: v}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Daily Warmup Limit <span className="fs-xs text-muted">(max: 50 limit)</span></label>
                <input className="form-input" type="number" min={1} max={50} value={warmupSettings.dailyLimit} onChange={e => setWarmupSettings(p => ({...p, dailyLimit: e.target.value}))} style={{ maxWidth: 100 }} />
              </div>
              <div className="flex-between card card-p" style={{ padding: '0.875rem' }}>
                <div><div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Warmup Email Reply</div><div className="fs-xs text-secondary">Automatically reply to warmup emails to simulate engagement.</div></div>
                <Toggle value={warmupSettings.emailReply} onChange={v => setWarmupSettings(p => ({...p, emailReply: v}))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Active Daily Enable Limit</label>
                  <input className="form-input" type="number" value={warmupSettings.activeLimit} onChange={e => setWarmupSettings(p => ({...p, activeLimit: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Daily Increment to Enable</label>
                  <input className="form-input" type="number" value={warmupSettings.dailyIncrement} onChange={e => setWarmupSettings(p => ({...p, dailyIncrement: e.target.value}))} />
                </div>
              </div>
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>Advanced Startup Settings</div>
                <p className="fs-xs text-secondary" style={{ marginBottom: '1rem' }}>These settings control the content and style of warmup email exchanges to maximize domain reputation.</p>
                {[['Personalized Warmup List', 'Use a custom list of contacts for warmup'], ['Business Type', ''], ['Warmup Universe', ''], ['Warmup Custom Training Content', ''], ['Warmup Signature', '']].map(([label, ph]) => (
                  <div key={label} className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>{label}</label>
                    <input className="form-input" style={{ fontSize: '0.8rem' }} placeholder={ph} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Message Reply Rate: {warmupSettings.replyRate}%</label>
                  <input type="range" min={0} max={100} value={warmupSettings.replyRate} onChange={e => setWarmupSettings(p => ({...p, replyRate: e.target.value}))} style={{ width: '100%', accentColor: 'var(--accent-primary)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={saveWarmup}>Save Warmup Settings</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
