import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { verification as verificationApi } from '../api';
import Logo from '../components/Logo';

export default function PendingVerification() {
  const { user, logout, reload } = useAuth();
  const navigate = useNavigate();

  const [verStatus,     setVerStatus]     = useState(null);
  const [notes,         setNotes]         = useState('');
  const [idFile,        setIdFile]        = useState(null);
  const [uploading,     setUploading]     = useState(false);
  const [uploadError,   setUploadError]   = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileRef = useRef(null);

  const loadStatus = async () => {
    try {
      const res = await verificationApi.status();
      setVerStatus(res.data.verification_status);
      setNotes(res.data.verification_notes || '');
    } catch {}
  };

  // If account becomes active (e.g. admin approves while page is open) redirect to app
  useEffect(() => {
    if (user?.account_status === 'active') {
      navigate('/app/dashboard', { replace: true });
      return;
    }
    loadStatus();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll every 30 s — re-fetch user from /me so account_status stays in sync
  useEffect(() => {
    const iv = setInterval(async () => {
      await reload();
      await loadStatus();
    }, 30000);
    return () => clearInterval(iv);
  }, [reload]);

  const handleUpload = async () => {
    if (!idFile) return;
    setUploading(true);
    setUploadError('');
    setUploadSuccess(false);
    try {
      await verificationApi.uploadId(idFile);
      setIdFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setUploadSuccess(true);
      await loadStatus(); // will switch verStatus back to 'pending'
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isRejected = verStatus === 'rejected';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
            Account Verification
          </h1>
          {user && (
            <p className="text-gray-500 text-sm mt-1">Hi {user.name} 👋</p>
          )}
        </div>

        <div className="card p-6 shadow-sm space-y-5">

          {/* ── Pending state ────────────────────────────────────────────────── */}
          {!isRejected && (
            <div className="text-center py-2">
              <div className="text-5xl mb-4">⏳</div>
              <h2 className="text-base font-semibold text-gray-900 mb-2">
                ID Verification Pending
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Your identity document is being reviewed by our team.
                This usually takes up to 24 hours. We'll send you an email
                once your account is approved.
              </p>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700 text-left">
                <strong>What happens next?</strong><br />
                Once your ID is verified you'll receive an email and can sign
                in normally. You can sign out and check back any time.
              </div>
            </div>
          )}

          {/* ── Rejected state ───────────────────────────────────────────────── */}
          {isRejected && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-5xl mb-3">⚠️</div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">
                  ID Verification Not Approved
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Please upload a new, clear photo or scan of your
                  government-issued ID to resubmit for review.
                </p>
              </div>

              {notes && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
                  <p className="font-medium mb-0.5">Reason from reviewer:</p>
                  <p>{notes}</p>
                </div>
              )}

              {/* Re-upload widget */}
              <div className="border border-amber-100 rounded-xl p-4 bg-amber-50 space-y-2">
                <p className="text-xs font-semibold text-amber-800">
                  🪪 Upload a new ID document
                </p>
                <p className="text-xs text-amber-700">
                  Accepted: JPG, PNG, or PDF — max 5 MB
                </p>

                <input
                  ref={fileRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    setIdFile(e.target.files?.[0] || null);
                    setUploadSuccess(false);
                    setUploadError('');
                  }}
                />

                {idFile ? (
                  <div className="flex items-center gap-2 p-2 bg-white border border-amber-200 rounded-lg">
                    <span className="text-base">📄</span>
                    <span className="text-xs text-gray-700 flex-1 truncate">{idFile.name}</span>
                    <span className="text-xs text-gray-400">{(idFile.size / 1024).toFixed(0)} KB</span>
                    <button
                      type="button"
                      onClick={() => { setIdFile(null); fileRef.current.value = ''; }}
                      className="text-xs text-red-400 hover:text-red-600 ml-1"
                    >✕</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current.click()}
                    className="w-full py-2 px-3 border-2 border-dashed border-amber-200 rounded-lg text-xs text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    Click to choose file — JPG, PNG, or PDF
                  </button>
                )}

                {uploadError && (
                  <p className="text-xs text-red-600">{uploadError}</p>
                )}
                {uploadSuccess && (
                  <p className="text-xs text-green-700 font-medium">
                    ✓ Document submitted. Your verification is now pending review.
                  </p>
                )}

                {idFile && !uploading && (
                  <button
                    onClick={handleUpload}
                    className="btn-primary w-full text-sm"
                  >
                    Submit New ID
                  </button>
                )}
                {uploading && (
                  <button disabled className="btn-primary w-full text-sm opacity-60">
                    Uploading…
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Sign out */}
          <button
            onClick={handleLogout}
            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors border-t border-gray-100 pt-4"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
