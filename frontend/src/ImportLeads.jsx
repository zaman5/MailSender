import React, { useState, useRef } from 'react';

const PLUSVIBE_FIELDS = [
  'Email','First Name','Last Name','Company Name','Job Title',
  'Phone Number','City','State','Country','Company Website',
  'LinkedIn URL','Industry','Company Size','Company Founded',
];

const COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#ef4444','#f97316'];

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,''));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/"/g,''));
    const obj = {};
    headers.forEach((h,i) => { obj[h] = vals[i] || ''; });
    return obj;
  }).filter(r => Object.values(r).some(v => v));
  return { headers, rows };
}

function autoMap(header) {
  const h = header.toLowerCase();
  if (h.includes('email')) return 'Email';
  if (h === 'first_name' || h === 'firstname') return 'First Name';
  if (h === 'last_name' || h === 'lastname') return 'Last Name';
  if (h.includes('company') && !h.includes('website') && !h.includes('size') && !h.includes('phone') && !h.includes('industry') && !h.includes('found')) return 'Company Name';
  if (h.includes('title') || h.includes('job_title')) return 'Job Title';
  if (h.includes('phone')) return 'Phone Number';
  if (h === 'city' || h === 'location') return 'City';
  if (h === 'state') return 'State';
  if (h.includes('website')) return 'Company Website';
  if (h.includes('linkedin')) return 'LinkedIn URL';
  if (h.includes('industry')) return 'Industry';
  return '';
}

export default function ImportLeads({ onImport, onClose }) {
  const [step, setStep] = useState(1);
  const [csvData, setCsvData] = useState(null);
  const [mapping, setMapping] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [settings, setSettings] = useState({
    skipOtherCampaigns: true, skipFromAll: 'Skip From All Campaigns',
    skipLists: false, doNotImportUnselected: false, replaceExisting: false,
  });
  const fileRef = useRef();

  function loadFile(file) {
    if (!file || !file.name.endsWith('.csv')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const { headers, rows } = parseCSV(e.target.result);
      const autoMapping = {};
      headers.forEach(h => { autoMapping[h] = autoMap(h); });
      setMapping(autoMapping);
      setCsvData({ headers, rows });
      setStep(2);
    };
    reader.readAsText(file);
  }

  function doImport() {
    const emailField = Object.entries(mapping).find(([,v]) => v === 'Email')?.[0];
    const firstField = Object.entries(mapping).find(([,v]) => v === 'First Name')?.[0];
    const lastField = Object.entries(mapping).find(([,v]) => v === 'Last Name')?.[0];
    const compField = Object.entries(mapping).find(([,v]) => v === 'Company Name')?.[0];
    const titleField = Object.entries(mapping).find(([,v]) => v === 'Job Title')?.[0];

    const newLeads = csvData.rows.map((row, i) => {
      const email = row[emailField] || `lead${i}@unknown.com`;
      const first = row[firstField] || '';
      const last = row[lastField] || '';
      const name = [first, last].filter(Boolean).join(' ') || email.split('@')[0];
      return {
        initials: name.slice(0,2).toUpperCase(),
        color: COLORS[i % COLORS.length],
        name, email,
        company: row[compField] || '',
        title: row[titleField] || '',
        esp: email.includes('gmail') ? 'Google' : 'Microsoft',
        sent: 0, opened: 0, clicked: 0, replied: 0,
        status: 'In Progress', step: '0/1', label: null,
      };
    });
    onImport(newLeads);
    onClose();
  }

  const samples = csvData ? csvData.rows.slice(0,2) : [];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
      <div style={{ background:'var(--bg-secondary)', borderRadius:16, width:860, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'var(--shadow-lg)' }}>

        {/* Header */}
        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <h3 style={{ fontWeight:700, fontSize:'1.1rem' }}>Import Leads</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'1.2rem' }}>✕</button>
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div style={{ padding:'2rem', flex:1, display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div
              style={{ border:`2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-color)'}`, borderRadius:14, padding:'3.5rem', textAlign:'center', background: dragOver ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.02)', transition:'all 0.2s', cursor:'pointer' }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); loadFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current.click()}
            >
              <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>📂</div>
              <div style={{ fontWeight:600, fontSize:'1rem', marginBottom:'0.4rem' }}>Drop your CSV file here or click to browse</div>
              <div style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>Required column: <strong>email</strong> — Optional: first_name, last_name, company, job_title, phone, city…</div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={e => loadFile(e.target.files[0])} />
            </div>
            <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', textAlign:'center' }}>
              Download a <span style={{ color:'var(--accent-primary)', cursor:'pointer' }}>sample CSV template</span> to get started
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 2 && csvData && (
          <>
            <div style={{ flex:1, overflowY:'auto', padding:'0' }}>
              {/* Column headers */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 24px 1fr 24px 1fr', gap:'0.5rem', padding:'0.875rem 1.5rem', borderBottom:'1px solid var(--border-color)', fontSize:'0.78rem', fontWeight:600, color:'var(--text-secondary)', background:'rgba(255,255,255,0.02)', position:'sticky', top:0 }}>
                <span>Your Columns</span><span></span><span>Select Fields</span><span></span><span>Samples</span>
              </div>

              {csvData.headers.map((h, i) => (
                <div key={h} style={{ display:'grid', gridTemplateColumns:'1fr 24px 1fr 24px 1fr', gap:'0.75rem', padding:'0.6rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.04)', alignItems:'center' }}>
                  {/* Column name */}
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:6, padding:'6px 10px', fontSize:'0.8rem', fontWeight:500 }}>
                    <span style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>⊞</span>{h}
                  </div>

                  <span style={{ color:'var(--text-muted)', textAlign:'center' }}>→</span>

                  {/* Field selector */}
                  <select
                    value={mapping[h] || ''}
                    onChange={e => setMapping(prev => ({ ...prev, [h]: e.target.value }))}
                    style={{ background:'var(--bg-tertiary)', border:'1px solid var(--border-color)', borderRadius:8, padding:'6px 10px', color: mapping[h] ? 'var(--text-primary)' : 'var(--text-muted)', fontSize:'0.8rem', cursor:'pointer', width:'100%' }}
                  >
                    <option value="">Search or select field...</option>
                    {PLUSVIBE_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>

                  <span style={{ color:'var(--text-muted)', textAlign:'center' }}>—</span>

                  {/* Samples */}
                  <div style={{ fontSize:'0.75rem' }}>
                    {samples.map((row, si) => (
                      <div key={si} style={{ color: row[h] ? 'var(--accent-primary)' : 'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.6 }}>
                        {row[h] || '—'}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Import Settings */}
              <div style={{ padding:'1.25rem 1.5rem', borderTop:'1px solid var(--border-color)' }}>
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:'1rem' }}>Import Settings</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:'0.6rem', fontSize:'0.85rem', cursor:'pointer' }}>
                    <input type="checkbox" checked={settings.skipOtherCampaigns} onChange={e => setSettings(p=>({...p,skipOtherCampaigns:e.target.checked}))} style={{ accentColor:'var(--accent-primary)' }} />
                    Skip leads that exist in other campaigns
                    {settings.skipOtherCampaigns && (
                      <select className="form-input" style={{ fontSize:'0.78rem', padding:'4px 10px', width:'auto', marginLeft:'0.5rem' }}
                        value={settings.skipFromAll} onChange={e => setSettings(p=>({...p,skipFromAll:e.target.value}))}>
                        <option>Skip From All Campaigns</option><option>Skip From Active Only</option>
                      </select>
                    )}
                  </label>
                  {[['skipLists','Skip leads that exists in lists'],['doNotImportUnselected','Do not import unselected columns'],['replaceExisting','Replace existing lead data in this campaign']].map(([key,label]) => (
                    <label key={key} style={{ display:'flex', alignItems:'center', gap:'0.6rem', fontSize:'0.85rem', cursor:'pointer' }}>
                      <input type="checkbox" checked={settings[key]} onChange={e => setSettings(p=>({...p,[key]:e.target.checked}))} style={{ accentColor:'var(--accent-primary)' }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" onClick={doImport}>
                Import ({csvData.rows.length})
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
