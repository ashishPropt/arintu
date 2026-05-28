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
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (name, email, password) => {
    const res = await authApi.register({ name, email, password });
    localStorage.setItem('arintu_token', res.data.token);
    setUser(res.data.user);
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
