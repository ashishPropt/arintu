import { useState, useEffect, useRef } from 'react';
import { classes, schedules, verification as verificationApi, auth as authApi, publicApi, applications as appsApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import Modal from '../../components/Modal';

export default function StudentDashboard() {
  const { user, reload: reloadUser } = useAuth();
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [totalSchedules, setTotalSchedules] = useState(0);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    Promise.all([
      // enrolledOnly=true gives accurate count of actually enrolled classes
      classes.list({ enrolledOnly: true, limit: 200 }),
      // Fetch all upcoming — use count for badge, slice for display
      schedules.list({ from: new Date().toISOString() }),
    ]).then(([cls, sched]) => {
      const enrolled = cls.data.classes || [];
      const allUpcoming = sched.data || [];
      setEnrolledCount(enrolled.length);
      setTotalSchedules(allUpcoming.length);
      setUpcoming(allUpcoming.slice(0, 5));
    }).catch(() => {});
  }, []);

  const verificationStatus = user?.verification_status;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">My Learning</h1>
      <p className="text-sm text-gray-500 mb-6">Your enrolled classes and upcoming sessions</p>

      {/* ID Verification Card */}
      <VerificationCard status={verificationStatus} notes={user?.verification_notes} onUploaded={reloadUser} />

      {/* Country Card */}
      <CountryCard user={user} onSaved={reloadUser} />

      {/* Pending Payments & Scholarship */}
      <PendingPayments />

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center font-bold text-lg">
            {enrolledCount}
          </div>
          <div>
            <p className="text-xs text-gray-500">Enrolled Classes</p>
            <Link to="/app/classes" className="text-sm font-semibold text-gray-900 hover:text-brand-600">View classes</Link>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center font-bold text-lg">
            {totalSchedules}
          </div>
          <div>
            <p className="text-xs text-gray-500">Upcoming Sessions</p>
            <Link to="/app/schedules" className="text-sm font-semibold text-gray-900 hover:text-brand-600">View schedule</Link>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold mb-3">Next Sessions</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No upcoming sessions</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcoming.map((s) => (
              <div key={s.id} className="py-3 flex items-start gap-3">
                <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs font-bold leading-none">{format(new Date(s.start_time), 'MMM')}</span>
                  <span className="text-base font-bold leading-none">{format(new Date(s.start_time), 'd')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{s.class_name}</p>
                  <p className="text-xs text-gray-500">{format(new Date(s.start_time), 'h:mm a')} — {format(new Date(s.end_time), 'h:mm a')}</p>
                  {s.zoom_join_url && (
                    <a href={s.zoom_join_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1 px-2.5 py-1 bg-purple-50 text-purple-600 text-xs rounded-lg hover:bg-purple-100 transition-colors">
                      Join Zoom Meeting
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ─── Pending Payments & Scholarship ─────────────────────────────────────────

function PendingPayments() {
  const [apps, setApps] = useState([]);
  const [scholarshipTarget, setScholarshipTarget] = useState(null); // app object
  const [paying, setPaying] = useState(null); // appId being processed

  const load = () => {
    appsApi.list({}).then((r) => {
      const all = r.data || [];
      // Only show apps needing action (exclude fully enrolled / not_required / rejected)
      const actionable = all.filter((a) =>
        a.payment_status === 'pending_payment' ||
        ['pending_payment', 'scholarship_pending'].includes(a.class_fee_status)
      );
      setApps(actionable);
    }).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handlePayClassFee = async (appId) => {
    setPaying(appId);
    try {
      const r = await appsApi.payClassFee(appId);
      if (r.data.checkoutUrl) window.location.href = r.data.checkoutUrl;
    } catch (err) {
      alert(err.response?.data?.error || 'Could not start payment. Please try again.');
    } finally { setPaying(null); }
  };

  const handlePayAppFee = async (appId) => {
    setPaying(appId);
    try {
      const r = await appsApi.retryAppFee(appId);
      if (r.data.checkoutUrl) window.location.href = r.data.checkoutUrl;
    } catch (err) {
      alert(err.response?.data?.error || 'Could not start payment. Please try again.');
    } finally { setPaying(null); }
  };

  if (apps.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Action Required</h2>
      <div className="space-y-3">
        {apps.map((a) => {
          const isBusy = paying === a.id;

          /* ── Application fee still unpaid ── */
          if (a.payment_status === 'pending_payment' && a.class_fee_status !== 'scholarship_pending') {
            return (
              <div key={a.id} className="card p-4 border-l-4 border-amber-400">
                <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1">Application Fee Pending</p>
                <p className="text-sm font-semibold text-gray-900 mb-3">{a.class_name}</p>
                <button
                  onClick={() => handlePayAppFee(a.id)}
                  disabled={isBusy}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors disabled:opacity-60"
                >
                  {isBusy ? 'Processing…' : `Pay Application Fee${a.currency_symbol && a.application_fee_charged ? ` · ${a.currency_symbol}${Number(a.application_fee_charged).toLocaleString()}` : ''}`}
                </button>
              </div>
            );
          }

          /* ── Scholarship waiting for review ── */
          if (a.class_fee_status === 'scholarship_pending') {
            return (
              <div key={a.id} className="card p-4 border-l-4 border-violet-400">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⏳</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{a.class_name}</p>
                    <p className="text-xs text-violet-700 font-medium mt-0.5">
                      Scholarship application under review — payment is locked until a decision is made.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">You will be notified once the admin has reviewed your request.</p>
                  </div>
                </div>
              </div>
            );
          }

          /* ── Class fee ready to pay (may have discount from partial scholarship) ── */
          if (a.class_fee_status === 'pending_payment') {
            const hasDiscount = a.scholarship_discount_pct > 0;
            return (
              <div key={a.id} className="card p-5 border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-violet-600 font-semibold uppercase tracking-wide">Class Fee Due</p>
                  {hasDiscount && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                      🎉 {a.scholarship_discount_pct}% scholarship applied!
                    </span>
                  )}
                </div>
                <p className="text-base font-bold text-gray-900 mb-1">{a.class_name}</p>
                {a.class_fee_amount && (
                  <p className="text-2xl font-extrabold text-violet-700 mb-4">
                    {a.currency_symbol}{Number(a.class_fee_amount).toLocaleString()}
                    {hasDiscount && <span className="text-sm font-normal text-gray-400 ml-2">after scholarship</span>}
                  </p>
                )}

                {/* PRIMARY: Scholarship button (large, unmissable) */}
                {!hasDiscount && (
                  <button
                    onClick={() => setScholarshipTarget(a)}
                    className="w-full py-3.5 mb-3 rounded-2xl font-bold text-base text-white shadow-lg transition-all active:scale-95
                      bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700
                      flex items-center justify-center gap-2"
                  >
                    <span className="text-xl">🎓</span>
                    Apply for Scholarship
                    <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold">May reduce or waive your fee</span>
                  </button>
                )}

                {/* SECONDARY: Pay full / discounted fee */}
                <button
                  onClick={() => handlePayClassFee(a.id)}
                  disabled={isBusy}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 ${
                    hasDiscount
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md'
                      : 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {isBusy ? 'Processing…' : hasDiscount ? '💳 Pay Discounted Fee' : 'Pay Full Fee Instead'}
                </button>
              </div>
            );
          }

          return null;
        })}
      </div>

      {scholarshipTarget && (
        <ScholarshipModal
          app={scholarshipTarget}
          onClose={() => setScholarshipTarget(null)}
          onRequested={() => { setScholarshipTarget(null); load(); }}
        />
      )}
    </div>
  );
}

function ScholarshipModal({ app, onClose, onRequested }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await appsApi.requestScholarship(app.id, reason);
      onRequested();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <Modal open title="Apply for Scholarship" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
          <p className="text-sm font-semibold text-violet-900">🎓 {app.class_name}</p>
          <p className="text-xs text-violet-700 mt-1">
            Scholarship applications are reviewed by the admin. While your application is under review,
            your payment will be <strong>locked</strong> until a decision is made.
          </p>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Why are you applying for a scholarship? <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            className="input"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Briefly describe your situation — financial need, academic merit, or any other reason…"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold text-sm disabled:opacity-60"
          >
            {loading ? 'Submitting…' : 'Submit Scholarship Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Country Card ─────────────────────────────────────────────────────────────

function CountryCard({ user, onSaved }) {
  const [editing,   setEditing]   = useState(false);
  const [countries, setCountries] = useState([]);
  const [selected,  setSelected]  = useState('');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  // Open edit mode — load countries and pre-fill current value
  const startEdit = () => {
    setError('');
    setSelected(user?.country_id || '');
    if (countries.length === 0) {
      publicApi.countries().then((r) => setCountries(r.data || [])).catch(() => {});
    }
    setEditing(true);
  };

  const save = async () => {
    if (!selected) { setError('Please select a country'); return; }
    setSaving(true);
    setError('');
    try {
      await authApi.updateProfile({ countryId: selected });
      await onSaved(); // refresh auth context → user object updates everywhere
      setEditing(false);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false); }
  };

  // Country already set — show a compact pill with an Edit link
  if (user?.country_name && !editing) {
    return (
      <div className="mb-5 flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span className="text-base">🌍</span>
          <span className="font-medium">{user.country_name}</span>
          {user.currency_code && (
            <span className="text-gray-400">· {user.currency_symbol}{user.currency_code}</span>
          )}
        </div>
        <button onClick={startEdit} className="text-xs text-brand-600 hover:underline">
          Change country
        </button>
      </div>
    );
  }

  // No country set — show a prompt card (or edit form)
  if (!editing) {
    return (
      <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-100">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">🌍</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Set your country</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Your country is used to calculate the one-time application fee when you apply to a class.
            </p>
          </div>
        </div>
        <button
          onClick={startEdit}
          className="text-xs font-medium text-amber-800 bg-white border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-50 transition-colors"
        >
          Set country →
        </button>
      </div>
    );
  }

  // Edit form
  return (
    <div className="mb-5 p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
      <p className="text-sm font-semibold text-gray-800">
        {user?.country_name ? 'Change country' : 'Set your country'}
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <select
        className="input"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Select your country…</option>
        {countries.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} {c.currency_code ? `(${c.currency_symbol}${c.currency_code})` : ''}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button onClick={() => setEditing(false)} className="btn-secondary flex-1 text-xs py-1.5">
          Cancel
        </button>
        <button onClick={save} disabled={saving} className="btn-primary flex-1 text-xs py-1.5">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function VerificationCard({ status, notes, onUploaded }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      await verificationApi.uploadId(file);
      onUploaded(); // reload user so verification_status updates
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (status === 'approved') {
    return (
      <div className="mb-5 flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-100">
        <span className="text-2xl">✅</span>
        <div>
          <p className="text-sm font-semibold text-green-800">Identity Verified</p>
          <p className="text-xs text-green-700">Your ID has been verified. You are eligible to apply to classes.</p>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="mb-5 flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
        <span className="text-2xl">⏳</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">ID Verification Pending</p>
          <p className="text-xs text-amber-700">Your document is under review. You can apply once it is approved.</p>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-100">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">❌</span>
          <div>
            <p className="text-sm font-semibold text-red-800">ID Verification Not Approved</p>
            <p className="text-xs text-red-700">
              {notes ? `Reason: ${notes}` : 'Your document could not be verified.'}
              {' '}Please upload a clear government-issued ID.
            </p>
          </div>
        </div>
        {uploadError && <p className="text-xs text-red-600 mb-2">{uploadError}</p>}
        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleFile} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-red-600 underline hover:no-underline disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Re-upload ID document'}
        </button>
      </div>
    );
  }

  // Not yet uploaded
  return (
    <div className="mb-5 p-4 rounded-xl bg-blue-50 border border-blue-100">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">🪪</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-800">ID Verification Required</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Upload a government-issued ID (passport, driver license, or national ID) to apply to classes.
            Accepted: JPG, PNG, PDF · Max 5 MB.
          </p>
        </div>
      </div>
      {uploadError && <p className="text-xs text-red-600 mb-2">{uploadError}</p>}
      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleFile} />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : 'Upload ID Document →'}
      </button>
    </div>
  );
}

