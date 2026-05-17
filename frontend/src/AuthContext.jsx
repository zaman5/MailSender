import React, { createContext, useContext, useState, useEffect } from 'react';
import { clearInboxCache } from './Inbox';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(() => { try { return JSON.parse(localStorage.getItem('ms_user')); } catch { return null; } });
  const [token, setToken] = useState(() => localStorage.getItem('ms_token'));

  useEffect(() => {
    const handle = () => { setUser(null); setToken(null); };
    window.addEventListener('ms_logout', handle);
    return () => window.removeEventListener('ms_logout', handle);
  }, []);

  function login(userData, tokenData) {
    setUser(userData); setToken(tokenData);
    localStorage.setItem('ms_user', JSON.stringify(userData));
    localStorage.setItem('ms_token', tokenData);
  }

  function logout() {
    // Clear all module-level inbox/body caches to prevent data leak to next user
    clearInboxCache();
    setUser(null); setToken(null);
    localStorage.removeItem('ms_user');
    localStorage.removeItem('ms_token');
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin: user?.role === 'admin', isAuth: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

