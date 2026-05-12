import React, { useState } from 'react';

const TIMEZONES = [
  'America/New_York (UTC -04:00)',
  'America/Chicago (UTC -05:00)',
  'America/Los_Angeles (UTC -07:00)',
  'Europe/London (UTC +01:00)',
  'Europe/Berlin (UTC +02:00)',
  'Asia/Karachi (UTC +05:00)',
  'Asia/Kolkata (UTC +05:30)',
  'Asia/Tokyo (UTC +09:00)',
  'Australia/Sydney (UTC +10:00)',
];

const TIMES = [
  '6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM',
  '1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM',
];

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export default function CampaignSchedule() {
  const [days, setDays] = useState({ Monday:true, Tuesday:true, Wednesday:true, Thursday:true, Friday:true, Saturday:false, Sunday:false });
  const [timezone, setTimezone] = useState('America/New_York (UTC -04:00)');
  const [startTime, setStartTime] = useState('8:00 AM');
  const [endTime, setEndTime] = useState('6:00 PM');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxEmails, setMaxEmails] = useState('100');
  const [maxLeads, setMaxLeads] = useState('');
  const [profile, setProfile] = useState('');
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200); }

  function saveSchedule() {
    setSaved(true);
    showToast('Schedule saved successfully');
    setTimeout(() => setSaved(false), 2500);
  }

  const toggleDay = (d) => setDays(prev => ({ ...prev, [d]: !prev[d] }));

  const Section = ({ title, children }) => (
    <div>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ maxWidth: 760, padding: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#10b981', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 10, fontWeight: 500, zIndex: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', fontSize: '0.875rem' }}>
          ✅ {toast}
        </div>
      )}

      {/* Profile Selector */}
      <Section title="Select Profile">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            className="form-input"
            style={{ flex: 1, maxWidth: 400 }}
            value={profile}
            onChange={e => setProfile(e.target.value)}
          >
            <option value="">— Select a saved schedule profile —</option>
            <option value="weekdays">Weekdays 9-5</option>
            <option value="aggressive">Aggressive (Mon-Sat 7-8)</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => showToast('Profile created')}>+ Create Profile</button>
          <button className="btn btn-primary" onClick={saveSchedule}>
            {saved ? '✅ Saved' : 'Save Schedule'}
          </button>
        </div>
        <p className="fs-xs text-muted" style={{ marginTop: '0.5rem' }}>
          A profile is a saved set of schedule settings you can reuse across campaigns.
        </p>
      </Section>

      {/* Days */}
      <Section title="Days">
        <div className="card card-p">
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {DAYS.map(d => (
              <label key={d} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={days[d]}
                  onChange={() => toggleDay(d)}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: days[d] ? 500 : 400, color: days[d] ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {d}
                </span>
              </label>
            ))}
          </div>
        </div>
      </Section>

      {/* Time */}
      <Section title="Time">
        <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Timezone</label>
            <select className="form-input" value={timezone} onChange={e => setTimezone(e.target.value)}>
              {TIMEZONES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Daily start time</label>
              <select className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)}>
                {TIMES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Daily end time</label>
              <select className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)}>
                {TIMES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Campaign start date</label>
              <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span className="fs-xs text-muted">Leave empty to start immediately</span>
            </div>
            <div className="form-group">
              <label className="form-label">Campaign end date</label>
              <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
              <span className="fs-xs text-muted">Leave empty to run until all leads complete</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Campaign-level Limit */}
      <Section title="Campaign-Level Limit">
        <div className="card card-p" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Maximum emails per day</label>
            <input className="form-input" type="number" min="1" value={maxEmails} onChange={e => setMaxEmails(e.target.value)} />
            <span className="fs-xs text-muted">AI dynamically adjusts to optimize deliverability.</span>
          </div>
          <div className="form-group">
            <label className="form-label">Maximum new leads to contact per day</label>
            <input className="form-input" type="number" placeholder="No Limit" value={maxLeads} onChange={e => setMaxLeads(e.target.value)} />
            <span className="fs-xs text-muted">New leads per day will not exceed this limit.</span>
          </div>
        </div>
      </Section>

      <div style={{ paddingBottom: '1rem' }}>
        <button className="btn btn-primary" onClick={saveSchedule}>{saved ? '✅ Saved' : 'Save Schedule'}</button>
      </div>
    </div>
  );
}
