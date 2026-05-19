import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { api } from './api';

export default function Signup({ onGoLogin }) {
  const { login } = useAuth();
  const [step, setStep] = useState(1); // 1=form, 2=verify
  const [form, setForm] = useState({ name:'', email:'', password:'' });
  const [otp, setOtp]   = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg]     = useState('');
  const [loading, setLoading] = useState(false);
  const [debugOtp, setDebugOtp] = useState('');

  async function handleSignup(e) {
    e.preventDefault(); setError(''); setLoading(true);
    const res = await api.post('/auth/signup', form);
    setLoading(false);
    if (!res) return setError('Server error');
    if (res.error) return setError(res.error);
    setMsg(res.message);
    if (res.debugOtp) setDebugOtp(res.debugOtp);
    setStep(2);
  }

  async function handleVerify(e) {
    e.preventDefault(); setError(''); setLoading(true);
    const res = await api.post('/auth/verify-email', { email: form.email, code: otp });
    setLoading(false);
    if (!res) return setError('Server error');
    if (res.error) return setError(res.error);
    login(res.user, res.token);
  }

  const sharedCard = { background:'var(--bg-secondary)', border:'1px solid var(--border-color)', borderRadius:16, padding:'2.5rem', width:'100%', maxWidth:420, boxShadow:'var(--shadow-md)' };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-primary)', padding: '1rem' }}>
      <div style={sharedCard}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'1.75rem' }}>
          <div style={{ width:38, height:38, background:'var(--accent-primary)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:20, color:'#fff' }}>M</div>
          <span style={{ fontSize:'1.3rem', fontWeight:700 }}>Mail<b>Sender</b></span>
        </div>

        {step === 1 ? (
          <>
            <h2 style={{ fontSize:'1.4rem', fontWeight:700, marginBottom:'0.25rem' }}>Create account</h2>
            <p style={{ color:'var(--text-muted)', fontSize:'0.875rem', marginBottom:'1.5rem' }}>Start your outreach journey</p>
            <form onSubmit={handleSignup} style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" placeholder="John Doe" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="Min 6 characters" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} required />
              </div>
              {error && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', borderRadius:8, padding:'0.6rem 0.85rem', fontSize:'0.82rem' }}>⚠ {error}</div>}
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ padding:'0.75rem', marginTop:'0.5rem' }}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
            <div style={{ textAlign:'center', marginTop:'1.25rem', fontSize:'0.85rem', color:'var(--text-muted)' }}>
              Already have an account?{' '}
              <button onClick={onGoLogin} style={{ background:'none', border:'none', color:'var(--accent-primary)', cursor:'pointer', fontSize:'0.85rem' }}>Sign in</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>📧</div>
              <h2 style={{ fontSize:'1.3rem', fontWeight:700, marginBottom:'0.35rem' }}>Check your email</h2>
              <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>
                We sent a 6-digit verification code to <strong>{form.email}</strong>
              </p>
              <p style={{ color:'var(--text-muted)', fontSize:'0.78rem', marginTop:'0.4rem' }}>
                Didn't receive it? Check your spam folder.
              </p>
            </div>

            {/* Fallback: show OTP on screen when email can't be delivered */}
            {debugOtp && (
              <div style={{ marginBottom:'1rem', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.4)', borderRadius:10, padding:'0.85rem 1rem', textAlign:'center' }}>
                <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'0.4rem' }}>⚠️ Email not configured — your verification code is:</div>
                <div style={{ fontSize:'2rem', fontWeight:900, letterSpacing:'8px', color:'var(--accent-primary)', fontFamily:'monospace' }}>{debugOtp}</div>
                <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:'0.3rem' }}>Copy this code and paste it below</div>
              </div>
            )}

            <form onSubmit={handleVerify} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div className="form-group">
                <label className="form-label">Verification Code</label>
                <input className="form-input" placeholder="123456" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} style={{ textAlign:'center', fontSize:'1.5rem', letterSpacing:'8px', fontWeight:700 }} required />
              </div>
              {error && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', borderRadius:8, padding:'0.6rem 0.85rem', fontSize:'0.82rem' }}>⚠ {error}</div>}
              <button className="btn btn-primary" type="submit" disabled={loading || otp.length !== 6} style={{ padding:'0.75rem' }}>
                {loading ? 'Verifying…' : 'Verify & Create Account'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
