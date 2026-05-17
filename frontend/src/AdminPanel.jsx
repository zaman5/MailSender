import React, { useState, useEffect } from 'react';
import { api } from './api';
import { useAuth } from './AuthContext';

export default function AdminPanel() {
  const { user } = useAuth();
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]   = useState('');

  function showToast(m) { setToast(m); setTimeout(() => setToast(''), 2500); }

  useEffect(() => {
    api.get('/admin/users').then(res => { if (res && !res.error) setUsers(res); setLoading(false); });
  }, []);

  async function toggleActive(u) {
    const res = await api.patch(`/admin/users/${u.id}`, { active: u.active ? 0 : 1 });
    if (res && !res.error) { setUsers(prev => prev.map(x => x.id === u.id ? res : x)); showToast(`${u.name} ${u.active ? 'deactivated' : 'activated'}`); }
  }

  async function makeAdmin(u) {
    const res = await api.patch(`/admin/users/${u.id}`, { role: u.role === 'admin' ? 'user' : 'admin' });
    if (res && !res.error) { setUsers(prev => prev.map(x => x.id === u.id ? res : x)); showToast(`Role updated`); }
  }

  async function deleteUser(u) {
    if (!confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    const res = await api.delete(`/admin/users/${u.id}`);
    if (res?.success) { setUsers(prev => prev.filter(x => x.id !== u.id)); showToast('User deleted'); }
  }

  return (
    <div className="page-block fade-up" style={{ position:'relative' }}>
      {toast && <div style={{ position:'fixed', bottom:24, right:24, background:'#10b981', color:'#fff', padding:'0.75rem 1.25rem', borderRadius:10, fontWeight:500, zIndex:999 }}>✅ {toast}</div>}

      <div className="flex-between" style={{ marginBottom:'1.5rem' }}>
        <div>
          <h2 style={{ fontSize:'1.4rem', fontWeight:700 }}>👑 Admin Panel</h2>
          <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginTop:'0.25rem' }}>Manage all users · {users.length} total</p>
        </div>
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'3rem', textAlign:'center', color:'var(--text-muted)' }}>Loading users…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Verified</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ opacity: u.active ? 1 : 0.5 }}>
                  <td style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>{i+1}</td>
                  <td style={{ fontWeight:500 }}>{u.name} {u.id === user?.id && <span style={{ fontSize:'0.7rem', color:'var(--accent-primary)' }}>(you)</span>}</td>
                  <td style={{ fontSize:'0.85rem', color:'var(--text-secondary)' }}>{u.email}</td>
                  <td>
                    <span style={{ fontSize:'0.72rem', fontWeight:700, padding:'2px 8px', borderRadius:4, background: u.role==='admin'?'rgba(99,102,241,0.2)':'rgba(255,255,255,0.07)', color: u.role==='admin'?'var(--accent-primary)':'var(--text-muted)' }}>
                      {u.role==='admin'?'👑 Admin':'👤 User'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize:'0.78rem', fontWeight:600, color: u.active?'#10b981':'#ef4444' }}>
                      {u.active ? '● Active' : '● Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign:'center' }}>{u.verified ? '✅' : '⏳'}</td>
                  <td style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{u.created_at?.slice(0,10)}</td>
                  <td>
                    {u.id !== user?.id && (
                      <div style={{ display:'flex', gap:'0.35rem' }}>
                        <button onClick={()=>toggleActive(u)} className="btn btn-sm btn-secondary" style={{ fontSize:'0.72rem', padding:'3px 8px' }}>
                          {u.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={()=>makeAdmin(u)} className="btn btn-sm btn-ghost" style={{ fontSize:'0.72rem', padding:'3px 8px' }}>
                          {u.role==='admin'?'Remove Admin':'Make Admin'}
                        </button>
                        <button onClick={()=>deleteUser(u)} className="btn btn-sm btn-danger" style={{ fontSize:'0.72rem', padding:'3px 8px' }}>🗑</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
