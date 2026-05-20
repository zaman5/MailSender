import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { api } from './api';

export default function Login({ onGoSignup, onGoForgot }) {
  const { login } = useAuth();
  const [form, setForm]   = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    const res = await api.post('/auth/login', form);
    setLoading(false);
    if (!res) return setError('Server error, try again');
    if (res.error) return setError(res.error);
    login(res.user, res.token);
  }

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={logo}><div style={logoIcon}>M</div><span style={logoText}>Mail<b>Sender</b></span></div>
        <h2 style={title}>Welcome back</h2>
        <p style={sub}>Sign in to your account</p>
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} required />
          </div>
          {error && <div style={errBox}>⚠ {error}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop:'0.5rem', padding:'0.75rem' }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div style={{ textAlign:'center', marginTop:'1.25rem', fontSize:'0.85rem', color:'var(--text-muted)' }}>
          <button onClick={onGoForgot} style={link}>Forgot password?</button>
          <span style={{ margin:'0 0.5rem' }}>·</span>
          <button onClick={onGoSignup} style={link}>Create account</button>
        </div>
        <div style={{ borderTop:'1px solid var(--border-color)', marginTop:'1.5rem', paddingTop:'1rem' }}>
          <a href="/MailSender-debug.apk" download className="download-apk-btn">
            <span>🤖</span> Download Android App (APK)
          </a>
        </div>
      </div>
    </div>
  );
}

const overlay = { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-primary)', padding: '1rem' };
const card    = { background:'var(--bg-secondary)', border:'1px solid var(--border-color)', borderRadius:16, padding:'2rem', width:'100%', maxWidth:400, boxShadow:'var(--shadow-md)' };
const logo    = { display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'1.75rem' };
const logoIcon= { width:38, height:38, background:'var(--accent-primary)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:20, color:'#fff' };
const logoText= { fontSize:'1.3rem', fontWeight:700, color:'var(--text-primary)' };
const title   = { fontSize:'1.4rem', fontWeight:700, marginBottom:'0.25rem' };
const sub     = { color:'var(--text-muted)', fontSize:'0.875rem', marginBottom:'1.5rem' };
const errBox  = { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', borderRadius:8, padding:'0.6rem 0.85rem', fontSize:'0.82rem' };
const link    = { background:'none', border:'none', color:'var(--accent-primary)', cursor:'pointer', fontSize:'0.85rem', padding:0 };

