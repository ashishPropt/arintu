import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth as authApi } from '../api';


const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('arintu_token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await authApi.me();
      setUser(res.data);
    } catch {
      localStorage.removeItem('arintu_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('arintu_token', res.data.token);
    await loadUser(); // fetch full user from /me so field names are consistent (snake_case)
    return res.data.user;
  };

  const register = async (nameOrFormData, email, password) => {
    // Accept either a FormData object (full registration with ID upload)
    // or plain (name, email, password) strings for simple registration.
    const payload = nameOrFormData instanceof FormData
      ? nameOrFormData
      : { name: nameOrFormData, email, password };
    const res = await authApi.register(payload);
    // Full registration (with ID upload) returns { pending: true } — no token.
    // Simple registration (without ID, internal use) may return a token directly.
    if (res.data.pending) {
      return { pending: true };
    }
    localStorage.setItem('arintu_token', res.data.token);
    await loadUser();
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('arintu_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, reload: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
