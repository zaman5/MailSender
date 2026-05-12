import React, { useState } from 'react';

const SAFETY_SETTINGS = [
  { key: 'stopOnReply', label: 'Stop sending emails on reply', desc: 'When a lead replies, subsequent emails steps in the sequence will not be sent.', default: true },
  { key: 'continueOOO', label: 'Continue sending for Out of Office replies and Automatic replies', desc: 'Enabling this option will continue with subsequent emails if a reply is detected as an Out of Office message or an automatic reply', default: false },
  { key: 'stopSameDomain', label: 'Stop sending to same Domain on reply', desc: 'When a lead replies to a campaign email, further emails will not be sent to other leads from the same domain.', default: false },
  { key: 'openTracking', label: 'Open Rate Tracking', desc: 'Open rate tracking is no longer a reliable metric due to recent updates by email service providers. Enabling it can reduce deliverability by up to 80%. There is no reason to turn it on.', default: false },
  { key: 'unsubLink', label: 'Unsubscribe link', desc: 'Enabling this will include an unsubscribe link in the email body and header. We do not recommend enabling this unless you are legally required to, as it can drastically reduce email deliverability.', default: false },
  { key: 'plainText', label: 'Send as Plain Text', desc: 'When plain text sending is on, images and links will be displayed as text URLs. Please send a test email to ensure this meets your requirements.', default: false },
  { key: 'riskyEmails', label: 'Send to Risky Emails', desc: 'If email verification has been run for these leads\' emails, enabling this will allow contacting risky addresses.', default: false },
  { key: 'autoPause', label: 'Auto-Pause Campaign on High Bounce Rate', desc: 'When the bounce rate reaches or exceeds your defined percentage and at least 100 campaign emails have been sent, the campaign will auto-pause.', default: true },
];

const PREFERENCE_OPTIONS = [
  { label: 'All New', ratio: '100/0' },
  { label: 'Growth', ratio: '70/30' },
  { label: 'Balanced', ratio: '50/50' },
  { label: 'Retention', ratio: '30/70' },
  { label: 'All Follow-ups', ratio: '0/100' },
];

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 42, height: 24, borderRadius: 99, cursor: 'pointer',
        background: value ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
        border: `2px solid ${value ? 'var(--accent-primary)' : 'var(--border-color)'}`,
        position: 'relative', transition: 'all 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 1, left: value ? 18 : 1,
        width: 18, height: 18, borderRadius: '50%',
        background: value ? '#fff' : 'var(--text-muted)',
        transition: 'left 0.2s',
      }} />
    </div>
  );
}

export default function CampaignSettings({ campaign }) {
  const [name, setName] = useState(campaign?.name || 'My Campaign');
  const [selectedAccounts, setSelectedAccounts] = useState(['outreach@yourcompany.com']);
  const [preference, setPreference] = useState('Balanced');
  const [variationMode, setVariationMode] = useState('roundrobin');
  const [espMatching, setEspMatching] = useState(false);
  const [opportunityValue, setOpportunityValue] = useState('0');
  const [safety, setSafety] = useState(() =>
    Object.fromEntries(SAFETY_SETTINGS.map(s => [s.key, s.default]))
  );
  const [toast, setToast] = useState('');
  const [addAccountModal, setAddAccountModal] = useState(false);
  const [newAccount, setNewAccount] = useState('');

  const EMAIL_ACCOUNTS = ['outreach@yourcompany.com', 'sales@yourcompany.com', 'info@domain2.com', 'hello@outbound.io'];

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200); }

  function saveSettings() { showToast('Settings saved'); }

  const selectedPref = PREFERENCE_OPTIONS.find(p => p.label === preference);
  const newPct = parseInt(selectedPref?.ratio.split('/')[0] || 50);
  const followPct = 100 - newPct;

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: '1.75rem' }}>
      <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem' }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ maxWidth: 760, padding: '1.5rem 0', position: 'relative' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#10b981', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 10, fontWeight: 500, zIndex: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', fontSize: '0.875rem' }}>
          ✅ {toast}
        </div>
      )}

      {/* Campaign Name */}
      <Section title="Campaign Name">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input className="form-input" style={{ flex: 1, maxWidth: 400 }} value={name} onChange={e => setName(e.target.value)} />
          <button className="btn btn-primary" onClick={saveSettings}>Save Settings</button>
        </div>
      </Section>

      {/* Sending Email Accounts */}
      <Section title="Sending Email Accounts">
        <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Add Sending Accounts by Tags</div>
            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)', padding: '2px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 }}>
                NewAccounts (10) ✕
              </span>
              <input placeholder="Search tags..." style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-secondary)', fontSize: '0.875rem', flex: 1 }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Selected Accounts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {selectedAccounts.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: 8, fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>📧</span>
                    <span>{a}</span>
                  </div>
                  <button onClick={() => setSelectedAccounts(prev => prev.filter(x => x !== a))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                </div>
              ))}
            </div>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            style={{ width: 'fit-content' }}
            onClick={() => setAddAccountModal(true)}
          >
            + Select Email Account
          </button>
        </div>
      </Section>

      {/* Sending Preference */}
      <Section title="Sending Preference">
        <div className="card card-p">
          <p className="fs-sm text-secondary" style={{ marginBottom: '1rem' }}>Choose to prioritize emailing new leads or following up with existing ones</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {PREFERENCE_OPTIONS.map(p => (
              <button
                key={p.label}
                onClick={() => setPreference(p.label)}
                style={{
                  padding: '6px 14px', borderRadius: 99, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, border: '1px solid var(--border-color)',
                  background: preference === p.label ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: preference === p.label ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                {p.label} ({p.ratio})
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>👥</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>New Leads</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Growth focused</div>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.4rem' }}>{newPct}% of daily volume</div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${newPct}%`, background: 'var(--accent-primary)' }} /></div>
            </div>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>📬</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Follow-ups</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Retention focused</div>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.4rem' }}>{followPct}% of daily volume</div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${followPct}%`, background: 'var(--info)' }} /></div>
            </div>
          </div>
        </div>
      </Section>

      {/* Follow-up Variation Selection Mode */}
      <Section title="Follow-up Variation Selection Mode">
        <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p className="fs-sm text-secondary">Choose how MailSender assigns variation paths for steps after Step 1.</p>
          {[
            { val: 'roundrobin', label: 'Round Robin', desc: 'Each step independently rotates through variations for even distribution across all leads. This introduces more randomness and has less risk of getting flagged by email providers.' },
            { val: 'match', label: 'Match Initial Variation', desc: 'Lead stays on the same variation path. Example: 1A → 2A → 3A' },
          ].map(opt => (
            <label key={opt.val} style={{ display: 'flex', gap: '0.75rem', cursor: 'pointer', alignItems: 'flex-start' }}>
              <input type="radio" name="varmode" value={opt.val} checked={variationMode === opt.val} onChange={() => setVariationMode(opt.val)} style={{ marginTop: 3, accentColor: 'var(--accent-primary)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{opt.label}</div>
                <div className="fs-sm text-secondary">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </Section>

      {/* ESP Matching */}
      <div className="card card-p flex-between" style={{ marginBottom: '1.75rem' }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>ESP matching</div>
          <div className="fs-sm text-secondary">Email Service Provider (ESP) Matching allows you to match your sender account's provider with the recipient's ESP provider</div>
        </div>
        <Toggle value={espMatching} onChange={setEspMatching} />
      </div>

      {/* Opportunity Value */}
      <Section title="Opportunity Value">
        <p className="fs-sm text-secondary" style={{ marginBottom: '0.75rem' }}>You can assign an opportunity dollar value for each positive reply you receive for the campaign.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: 200 }}>
          <span style={{ fontWeight: 600 }}>$</span>
          <input className="form-input" type="number" min="0" value={opportunityValue} onChange={e => setOpportunityValue(e.target.value)} />
        </div>
      </Section>

      {/* Safety Settings */}
      <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Safety Settings</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {SAFETY_SETTINGS.map(s => (
          <div key={s.key} className="card card-p flex-between" style={{ padding: '0.875rem 1rem' }}>
            <div style={{ flex: 1, paddingRight: '1.5rem' }}>
              <div style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{s.label}</div>
              <div className="fs-xs text-secondary">{s.desc}</div>
            </div>
            <Toggle value={safety[s.key]} onChange={v => setSafety(prev => ({ ...prev, [s.key]: v }))} />
          </div>
        ))}
      </div>

      <button className="btn btn-primary" onClick={saveSettings}>Save Settings</button>

      {/* Add Account Modal */}
      {addAccountModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card card-p" style={{ width: 420 }}>
            <h3 style={{ marginBottom: '1rem' }}>Select Email Account</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {EMAIL_ACCOUNTS.map(a => (
                <label key={a} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedAccounts.includes(a)} onChange={() => setSelectedAccounts(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])} style={{ accentColor: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '0.875rem' }}>📧 {a}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => setAddAccountModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { setAddAccountModal(false); showToast('Accounts updated'); }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
