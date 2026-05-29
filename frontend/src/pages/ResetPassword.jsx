import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { auth } from '../api';
import Logo from '../components/Logo';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [tokenValid, setTokenValid] = useState(null); // null = checking
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    auth.verifyResetToken(token)
      .then((r) => setTokenValid(r.data.valid))
      .catch(() => setTokenValid(false));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      await auth.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
            Arintu
          </h1>
        </div>

        <div className="card p-6 shadow-sm">
          {tokenValid === null && (
            <div className="text-center py-6">
              <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Verifying your link…</p>
            </div>
          )}

          {tokenValid === false && (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">⚠️</div>
              <h2 className="text-base font-semibold text-gray-900 mb-2">Invalid or expired link</h2>
              <p className="text-sm text-gray-500 mb-5">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link to="/forgot-password" className="btn-primary text-sm">
                Request new link
              </Link>
            </div>
          )}

          {tokenValid === true && !success && (
            <>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Set a new password</h2>
              <p className="text-xs text-gray-500 mb-5">Choose a strong password of at least 6 characters.</p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Same as above"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Updating…' : 'Reset password'}
                </button>
              </form>
            </>
          )}

          {success && (
            <div className="text-center py-4">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-base font-semibold text-gray-900 mb-2">Password updated!</h2>
              <p className="text-sm text-gray-500 mb-4">
                Your password has been reset. Redirecting you to sign in…
              </p>
              <Link to="/login" className="btn-primary text-sm">Sign in now</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
