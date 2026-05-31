/**
 * TwoFactorSetup — lets authenticated users enable or disable TOTP-based 2FA.
 * Accessible from the account settings section of the dashboard.
 */
import { useState, useEffect } from 'react';
import { auth as authApi } from '../api';

export default function TwoFactorSetup() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Setup flow
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [setupCode, setSetupCode] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState(false);

  // Disable flow
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disableError, setDisableError] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authApi.twoFaStatus()
      .then((r) => setEnabled(r.data.enabled))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const startSetup = async () => {
    setSaving(true);
    setSetupError('');
    try {
      const res = await authApi.twoFaSetup();
      setQrCode(res.data.qrCode);
      setSecret(res.data.secret);
    } catch (e) {
      setSetupError(e.response?.data?.error || 'Failed to start setup');
    } finally {
      setSaving(false);
    }
  };

  const confirmEnable = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSetupError('');
    try {
      await authApi.twoFaEnable(setupCode);
      setEnabled(true);
      setSetupSuccess(true);
      setQrCode(null);
      setSecret(null);
      setSetupCode('');
    } catch (e) {
      setSetupError(e.response?.data?.error || 'Invalid code. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDisable = async (e) => {
    e.preventDefault();
    setSaving(true);
    setDisableError('');
    try {
      await authApi.twoFaDisable(disablePassword, disableCode);
      setEnabled(false);
      setShowDisable(false);
      setDisablePassword('');
      setDisableCode('');
    } catch (e) {
      setDisableError(e.response?.data?.error || 'Failed to disable 2FA');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-400">Loading…</div>;
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Two-Factor Authentication</h2>
      <p className="text-sm text-gray-500 mb-6">
        Add an extra layer of security to your account using an authenticator app (Google Authenticator, Authy, etc.).
      </p>

      {/* Status badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-6 ${
        enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
      }`}>
        <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
        2FA is currently {enabled ? 'enabled' : 'disabled'}
      </div>

      {/* Setup flow */}
      {!enabled && !setupSuccess && (
        <>
          {!qrCode ? (
            <button onClick={startSetup} disabled={saving} className="btn-primary">
              {saving ? 'Setting up…' : 'Enable Two-Factor Authentication'}
            </button>
          ) : (
            <div className="card p-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900 mb-1">Step 1 — Scan the QR code</p>
                <p className="text-xs text-gray-500 mb-3">
                  Open your authenticator app and scan this code.
                </p>
                <img src={qrCode} alt="2FA QR Code" className="w-44 h-44 rounded-lg border border-gray-200" />
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">
                  Can't scan? Enter this secret manually:
                </p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono break-all">{secret}</code>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-900 mb-1">Step 2 — Enter the 6-digit code</p>
                <form onSubmit={confirmEnable} className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    className="input text-center tracking-widest font-mono w-32"
                    placeholder="000000"
                    value={setupCode}
                    onChange={(e) => setSetupCode(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                  />
                  <button
                    type="submit"
                    disabled={saving || setupCode.length < 6}
                    className="btn-primary"
                  >
                    {saving ? 'Verifying…' : 'Confirm'}
                  </button>
                </form>
                {setupError && <p className="text-xs text-red-600 mt-2">{setupError}</p>}
              </div>
            </div>
          )}
        </>
      )}

      {/* Success */}
      {setupSuccess && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
          ✅ Two-factor authentication is now enabled. You'll need your authenticator app every time you sign in.
        </div>
      )}

      {/* Disable flow */}
      {enabled && (
        <>
          {!showDisable ? (
            <button
              onClick={() => setShowDisable(true)}
              className="text-sm text-red-600 hover:text-red-700 underline"
            >
              Disable two-factor authentication
            </button>
          ) : (
            <div className="card p-5 space-y-3 border border-red-100">
              <p className="text-sm font-medium text-red-700">Disable 2FA</p>
              <p className="text-xs text-gray-500">Enter your password and current authenticator code to confirm.</p>
              <form onSubmit={confirmDisable} className="space-y-3">
                <input
                  type="password"
                  className="input"
                  placeholder="Current password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  required
                />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="input text-center tracking-widest font-mono"
                  placeholder="6-digit code"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                />
                {disableError && <p className="text-xs text-red-600">{disableError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowDisable(false); setDisableError(''); }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {saving ? 'Disabling…' : 'Disable 2FA'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
