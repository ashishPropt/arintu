import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth as authApi } from '../api';
import Logo from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA challenge state
  const [pendingToken, setPendingToken] = useState(null);
  const [totpCode, setTotpCode] = useState('');

  const { login, reload } = useAuth();
  const navigate = useNavigate();

  const goToDashboard = () => {
    const pendingClass = sessionStorage.getItem('applyClassId');
    navigate(pendingClass ? '/' : '/app/dashboard');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      if (res.data.pendingVerification) {
        // Account exists but is awaiting ID verification — store token so /me works
        localStorage.setItem('arintu_token', res.data.token);
        await reload();
        navigate('/pending-verification', { replace: true });
      } else if (res.data.mustChangePassword) {
        // Account was created by a family member — must set own password first
        localStorage.setItem('arintu_token', res.data.token);
        await reload();
        navigate('/change-password', { replace: true });
      } else if (res.data.require2fa) {
        // Need TOTP code — show second step
        setPendingToken(res.data.pendingToken);
      } else {
        // Normal login
        localStorage.setItem('arintu_token', res.data.token);
        await reload();
        goToDashboard();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const submit2FA = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.twoFaVerify(pendingToken, totpCode);
      localStorage.setItem('arintu_token', res.data.token);
      await reload();
      goToDashboard();
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code. Please try again.');
      setTotpCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block group" title="Back to home">
            <div className="flex justify-center mb-3">
              <Logo size="lg" showText={false} />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
              Arintu
            </h1>
          </Link>
          <p className="text-gray-500 text-sm mt-1">Education Management Platform</p>
        </div>

        <div className="card p-6 shadow-sm">
          {/* ── Step 1: credentials ── */}
          {!pendingToken && (
            <>
              <h2 className="text-base font-semibold text-gray-900 mb-5">Sign in to your account</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-xs text-brand-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <p className="text-center text-xs text-gray-400 mt-4">
                Need an account?{' '}
                <Link to="/register" className="text-brand-600 hover:underline">Create one</Link>
              </p>
            </>
          )}

          {/* ── Step 2: 2FA code ── */}
          {pendingToken && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => { setPendingToken(null); setError(''); setTotpCode(''); }}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  ← Back
                </button>
              </div>
              <div className="text-center mb-5">
                <div className="text-3xl mb-2">🔐</div>
                <h2 className="text-base font-semibold text-gray-900">Two-factor verification</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={submit2FA} className="space-y-4">
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9 ]*"
                    maxLength={7}
                    autoFocus
                    className="input text-center text-2xl tracking-widest font-mono"
                    placeholder="000 000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                  />
                </div>
                <button type="submit" disabled={loading || totpCode.length < 6} className="btn-primary w-full">
                  {loading ? 'Verifying…' : 'Verify'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="text-xs text-gray-500 hover:text-brand-600 hover:underline">
            ← Back to home
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          © {new Date().getFullYear()} Arintu. All rights reserved.
        </p>
      </div>
    </div>
  );
}
