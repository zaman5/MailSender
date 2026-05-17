import React, { useState } from 'react';
import { api } from './api';

export default function ForgotPassword({ onGoLogin }) {
  const [step, setStep] = useState(1); // 1=email, 2=otp+newpass, 3=done
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [debugOtp, setDebugOtp] = useState('');

  async function handleSend(e) {
    e.preventDefault(); setError(''); setLoading(true);
    const res = await api.post('/auth/forgot-password', { email });
    setLoading(false);
    if (!res) return setError('Server error');
    if (res.debugOtp) setDebugOtp(res.debugOtp);
    setStep(2);
  }

  async function handleReset(e) {
    e.preventDefault(); setError(''); setLoading(true);
    const res = await api.post('/auth/reset-password', { email, code: otp, password });
    setLoading(false);
    if (!res) return setError('Server error');
    if (res.error) return setError(res.error);
    setStep(3);
  }

  const card = { background:'var(--bg-secondary)', border:'1px solid var(--border-color)', borderRadius:16, padding:'2.5rem', width:'100%', maxWidth:400, boxShadow:'var(--shadow-md)' };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-primary)' }}>
      <div style={card}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'1.75rem' }}>
          <div style={{ width:38, height:38, background:'var(--accent-primary)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:20, color:'#fff' }}>M</div>
          <span style={{ fontSize:'1.3rem', fontWeight:700 }}>Mail<b>Sender</b></span>
        </div>

        {step === 1 && (
          <>
            <h2 style={{ fontSize:'1.3rem', fontWeight:700, marginBottom:'0.35rem' }}>Forgot Password?</h2>
            <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:'1.5rem' }}>Enter your email and we'll send a reset code.</p>
            <form onSubmit={handleSend} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
              </div>
              {error && <div style={{ color:'#ef4444', fontSize:'0.82rem' }}>⚠ {error}</div>}
              <button className="btn btn-primary" disabled={loading} style={{ padding:'0.75rem' }}>{loading ? 'Sending…' : 'Send Reset Code'}</button>
              <button type="button" className="btn btn-ghost" onClick={onGoLogin}>← Back to Login</button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ fontSize:'1.3rem', fontWeight:700, marginBottom:'0.35rem' }}>Reset Password</h2>
            <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:'1rem' }}>Enter the code sent to <strong>{email}</strong></p>
            {debugOtp && <div style={{ marginBottom:'1rem', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:8, padding:'0.5rem 0.75rem', fontSize:'0.82rem', color:'var(--accent-primary)' }}>🧪 Dev OTP: <strong>{debugOtp}</strong></div>}
            <form onSubmit={handleReset} style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
              <div className="form-group">
                <label className="form-label">6-Digit Code</label>
                <input className="form-input" placeholder="123456" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} style={{ textAlign:'center', fontSize:'1.4rem', letterSpacing:'6px', fontWeight:700 }} required />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" placeholder="Min 6 characters" value={password} onChange={e=>setPassword(e.target.value)} required />
              </div>
              {error && <div style={{ color:'#ef4444', fontSize:'0.82rem' }}>⚠ {error}</div>}
              <button className="btn btn-primary" disabled={loading || otp.length!==6} style={{ padding:'0.75rem' }}>{loading ? 'Resetting…' : 'Reset Password'}</button>
            </form>
          </>
        )}

        {step === 3 && (
          <div style={{ textAlign:'center', padding:'1rem 0' }}>
            <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>✅</div>
            <h2 style={{ fontWeight:700, marginBottom:'0.5rem' }}>Password Reset!</h2>
            <p style={{ color:'var(--text-muted)', marginBottom:'1.5rem', fontSize:'0.875rem' }}>Your password has been updated. You can now log in.</p>
            <button className="btn btn-primary" onClick={onGoLogin}>Go to Login</button>
          </div>
        )}
      </div>
    </div>
  );
}
