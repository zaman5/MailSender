import React, { useState, useRef, useEffect } from 'react';

const VARIABLES = ['{{first_name}}', '{{last_name}}', '{{company_name}}', '{{email}}', '{{sender_name}}', '{{sender_signature}}'];
const SPINTAX_EXAMPLES = [
  '{{random|Hi|Hello|Hey}}',
  '{{random|quick question|just checking in|following up}}',
];

function RichEditor({ value, onChange }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, []);

  function exec(cmd, val = null) {
    editorRef.current.focus();
    document.execCommand(cmd, false, val);
    onChange(editorRef.current.innerHTML);
  }

  function insertVariable(v) {
    editorRef.current.focus();
    document.execCommand('insertText', false, v);
    onChange(editorRef.current.innerHTML);
  }

  const charCount = (editorRef.current?.innerText || '').length;

  const ToolBtn = ({ title, cmd, val, icon }) => (
    <button
      title={title}
      onMouseDown={(e) => { e.preventDefault(); exec(cmd, val); }}
      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, fontSize: '0.875rem', lineHeight: 1 }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {icon}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 10px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)' }}>
        <ToolBtn title="Bold" cmd="bold" icon={<b>B</b>} />
        <ToolBtn title="Italic" cmd="italic" icon={<i>i</i>} />
        <ToolBtn title="Underline" cmd="underline" icon={<u>U</u>} />
        <div style={{ width: 1, height: 18, background: 'var(--border-color)', margin: '0 4px' }} />
        <ToolBtn title="Align Left" cmd="justifyLeft" icon="⬅" />
        <ToolBtn title="Center" cmd="justifyCenter" icon="↔" />
        <ToolBtn title="Align Right" cmd="justifyRight" icon="➡" />
        <div style={{ width: 1, height: 18, background: 'var(--border-color)', margin: '0 4px' }} />
        <ToolBtn title="Bullet List" cmd="insertUnorderedList" icon="≡" />
        <ToolBtn title="Numbered List" cmd="insertOrderedList" icon="№" />
        <div style={{ width: 1, height: 18, background: 'var(--border-color)', margin: '0 4px' }} />
        <button
          title="Insert Link"
          onMouseDown={(e) => { e.preventDefault(); const url = prompt('Enter URL:'); if (url) exec('createLink', url); }}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, fontSize: '0.875rem' }}
        >🔗</button>
        <button
          title="Insert Image"
          onMouseDown={(e) => { e.preventDefault(); const url = prompt('Image URL:'); if (url) exec('insertImage', url); }}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, fontSize: '0.875rem' }}
        >🖼</button>
        <div style={{ width: 1, height: 18, background: 'var(--border-color)', margin: '0 4px' }} />
        <ToolBtn title="Undo" cmd="undo" icon="↩" />
        <ToolBtn title="Redo" cmd="redo" icon="↪" />
        <div style={{ width: 1, height: 18, background: 'var(--border-color)', margin: '0 4px' }} />
        <select
          onChange={e => { if (e.target.value) { insertVariable(e.target.value); e.target.value = ''; } }}
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: '0.75rem', padding: '3px 6px', cursor: 'pointer' }}
        >
          <option value="">{'{ } Variable'}</option>
          {VARIABLES.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select
          onChange={e => { if (e.target.value) { insertVariable(e.target.value); e.target.value = ''; } }}
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 6, color: '#a78bfa', fontSize: '0.75rem', padding: '3px 6px', cursor: 'pointer' }}
        >
          <option value="">Spintax</option>
          {SPINTAX_EXAMPLES.map(v => <option key={v} value={v}>{v.slice(0, 30)}…</option>)}
        </select>
      </div>

      {/* Editor Body */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current.innerHTML)}
        style={{
          flex: 1,
          padding: '1rem 1.25rem',
          outline: 'none',
          color: 'var(--text-primary)',
          fontSize: '0.9rem',
          lineHeight: 1.7,
          overflowY: 'auto',
          minHeight: 200,
          background: 'transparent',
        }}
        dangerouslySetInnerHTML={undefined}
      />

      {/* Footer */}
      <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>Characters: {charCount}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <span style={{ background: '#10b98120', color: '#10b981', padding: '2px 10px', borderRadius: 99, fontWeight: 600 }}>Overall score: Excellent</span>
        </div>
      </div>
    </div>
  );
}

export default function SequenceBuilder({ campaign }) {
  const defaultStep = (n) => ({
    id: n,
    waitDays: n === 1 ? 0 : 3,
    variations: [{ id: 'A', subject: '', body: '<p>{{random|Hi|Hello|Hey}} {{first_name}},</p><p></p><p>- {{sender_signature}}</p>' }],
    activeVar: 0,
  });

  const [steps, setSteps] = useState([defaultStep(1), defaultStep(2)]);
  const [activeStep, setActiveStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200); }

  function addStep() {
    const newStep = defaultStep(steps.length + 1);
    setSteps(prev => [...prev, newStep]);
    setActiveStep(steps.length);
  }

  function removeStep(idx) {
    if (steps.length === 1) return;
    const updated = steps.filter((_, i) => i !== idx);
    setSteps(updated);
    setActiveStep(Math.max(0, idx - 1));
  }

  function addVariation(stepIdx) {
    setSteps(prev => prev.map((s, i) => {
      if (i !== stepIdx) return s;
      const letters = 'ABCDEFGH';
      const newId = letters[s.variations.length] || `V${s.variations.length + 1}`;
      return { ...s, variations: [...s.variations, { id: newId, subject: '', body: '<p>{{random|Hi|Hello|Hey}} {{first_name}},</p><p></p><p>- {{sender_signature}}</p>' }], activeVar: s.variations.length };
    }));
  }

  function removeVariation(stepIdx, varIdx) {
    setSteps(prev => prev.map((s, i) => {
      if (i !== stepIdx || s.variations.length === 1) return s;
      const updated = s.variations.filter((_, vi) => vi !== varIdx);
      return { ...s, variations: updated, activeVar: Math.max(0, varIdx - 1) };
    }));
  }

  function setActiveVar(stepIdx, varIdx) {
    setSteps(prev => prev.map((s, i) => i === stepIdx ? { ...s, activeVar: varIdx } : s));
  }

  function updateWait(stepIdx, val) {
    setSteps(prev => prev.map((s, i) => i === stepIdx ? { ...s, waitDays: parseInt(val) || 0 } : s));
  }

  function updateSubject(stepIdx, varIdx, val) {
    setSteps(prev => prev.map((s, i) => i !== stepIdx ? s : {
      ...s,
      variations: s.variations.map((v, vi) => vi !== varIdx ? v : { ...v, subject: val })
    }));
  }

  function updateBody(stepIdx, varIdx, val) {
    setSteps(prev => prev.map((s, i) => i !== stepIdx ? s : {
      ...s,
      variations: s.variations.map((v, vi) => vi !== varIdx ? v : { ...v, body: val })
    }));
  }

  function saveAll() {
    setSaved(true);
    showToast('Sequence saved successfully');
    setTimeout(() => setSaved(false), 2500);
  }

  const step = steps[activeStep];
  const variation = step?.variations[step.activeVar];

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 280px)', minHeight: 500, position: 'relative' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#10b981', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 10, fontWeight: 500, zIndex: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', fontSize: '0.875rem' }}>
          ✅ {toast}
        </div>
      )}

      {/* Left: Steps Panel */}
      <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.015)' }}>
        {steps.map((s, si) => (
          <div
            key={s.id}
            onClick={() => setActiveStep(si)}
            style={{
              marginBottom: '0.75rem',
              padding: '0.875rem',
              borderRadius: 10,
              border: `1px solid ${activeStep === si ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              background: activeStep === si ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: activeStep === si ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                  📧 Step {si + 1}
                </span>
                {s.variations.length > 1 && (
                  <span style={{ fontSize: '0.65rem', background: 'rgba(139,92,246,0.2)', color: '#a78bfa', padding: '1px 6px', borderRadius: 99 }}>
                    {s.variations.length} variations
                  </span>
                )}
              </div>
              {steps.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); removeStep(si); }}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', padding: 2 }}
                  title="Delete step"
                >🗑</button>
              )}
            </div>

            {/* Variation tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              {s.variations.map((v, vi) => (
                <button
                  key={v.id}
                  onClick={e => { e.stopPropagation(); setActiveStep(si); setActiveVar(si, vi); }}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: s.activeVar === vi ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: s.activeVar === vi ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer',
                  }}
                >
                  {v.id}
                </button>
              ))}
              <button
                onClick={e => { e.stopPropagation(); addVariation(si); }}
                style={{ width: 28, height: 28, borderRadius: '50%', background: 'none', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Add variation"
              >+</button>
              {s.variations.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); removeVariation(si, s.activeVar); }}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: 'none', border: '1px dashed rgba(239,68,68,0.4)', color: 'var(--danger)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Remove active variation"
                >−</button>
              )}
            </div>

            {si > 0 && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Wait</span>
                <input
                  type="number"
                  min="0"
                  value={s.waitDays}
                  onClick={e => e.stopPropagation()}
                  onChange={e => { e.stopPropagation(); updateWait(si, e.target.value); }}
                  style={{ width: 40, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: '0.75rem', padding: '2px 4px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>days, then</span>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={addStep}
          style={{
            width: '100%', padding: '0.65rem', borderRadius: 8,
            background: 'none', border: '1px dashed var(--border-color)',
            color: 'var(--accent-primary)', cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
        >
          + Add Step
        </button>
      </div>

      {/* Right: Email Designer */}
      {step && variation && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Step/Var header bar */}
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
            <span style={{ background: 'var(--accent-primary)', color: '#fff', padding: '2px 10px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700 }}>
              Step {activeStep + 1}{variation.id}
            </span>
            <input
              value={variation.subject}
              onChange={e => updateSubject(activeStep, step.activeVar, e.target.value)}
              placeholder="{{random|quick question|just checking in}} about {{company_name}}?"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)',
                borderRadius: 6, color: 'var(--text-primary)', padding: '5px 10px', fontSize: '0.875rem', outline: 'none',
              }}
            />
            <button
              onClick={saveAll}
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '6px 20px', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem',
              }}
            >
              {saved ? '✅ Saved' : 'Save All'}
            </button>
          </div>

          {/* Rich Text Editor */}
          <RichEditor
            key={`${activeStep}-${step.activeVar}`}
            value={variation.body}
            onChange={val => updateBody(activeStep, step.activeVar, val)}
          />

          {/* Status bar */}
          <div style={{ padding: '6px 14px', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--success)', fontWeight: 500 }}>
            Status: {saved ? 'Saved' : 'Unsaved changes'}
          </div>
        </div>
      )}
    </div>
  );
}
