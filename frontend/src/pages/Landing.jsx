import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicApi, countries as countriesApi, applications } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import axios from 'axios';

// ── Stripe Checkout redirect ───────────────────────────────────────────────
// No @stripe/stripe-js needed — we just redirect to the hosted Stripe URL
// returned by the backend. The backend handles session creation.
// ─────────────────────────────────────────────────────────────────────────

// Detect country from IP using ipapi.co (free, no key needed)
async function detectCountryCode() {
  try {
    const r = await axios.get('https://ipapi.co/json/', { timeout: 4000 });
    return r.data?.country_code || 'US';
  } catch {
    return 'US';
  }
}

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [countries, setCountries] = useState([]);
  const [selectedCode, setSelectedCode] = useState('US');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyTarget, setApplyTarget] = useState(null);  // class to apply to (logged-in student)
  const [authTarget, setAuthTarget] = useState(null);    // class that triggered auth modal (guest)

  // Auto-detect country on mount
  useEffect(() => {
    detectCountryCode().then(setSelectedCode);
    countriesApi.list().then((r) => setCountries(r.data)).catch(() => {});
  }, []);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await publicApi.classes(selectedCode);
      setClasses(res.data);
    } catch {} finally { setLoading(false); }
  }, [selectedCode]);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  const selectedCountry = countries.find((c) => c.code === selectedCode);

  const handleApply = (cls) => {
    if (!user) {
      // Guest: show auth modal, remember which class they want
      setAuthTarget(cls);
    } else if (user.role === 'student') {
      // Blocked if fee waiver is pending
      if (user.fee_waiver_status === 'pending') {
        setApplyTarget({ ...cls, _waiverBlocked: true });
      } else {
        setApplyTarget(cls);
      }
    } else {
      navigate('/app/dashboard');
    }
  };

  // Called when auth succeeds inside the auth modal
  const handleAuthSuccess = () => {
    const cls = authTarget;
    setAuthTarget(null);
    // Small delay so auth state propagates
    setTimeout(() => setApplyTarget(cls), 100);
  };

  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          Learn with{' '}
          <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
            Arintu
          </span>
        </h1>
        <p className="text-gray-500 max-w-xl mx-auto text-base">
          Expert-led classes for every learner. Browse, apply, and start learning today.
        </p>
        {/* Country picker */}
        <div className="mt-5 inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
          <span className="text-xs text-gray-500">Showing prices for:</span>
          <select
            className="text-sm border-0 bg-transparent focus:outline-none font-medium text-gray-800"
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.currency_code})
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Classes grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 -mt-2">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading classes…</div>
        ) : classes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No classes available yet. Check back soon!</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map((c) => (
              <ClassCard
                key={c.id}
                cls={c}
                selectedCountry={selectedCountry}
                user={user}
                onApply={() => handleApply(c)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Auth modal — shown to guests who click Apply Now */}
      {authTarget && (
        <AuthModal
          cls={authTarget}
          onClose={() => setAuthTarget(null)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Apply modal — shown to logged-in students */}
      {applyTarget && (
        <ApplyModal
          cls={applyTarget}
          countryCode={selectedCode}
          country={selectedCountry}
          onClose={() => setApplyTarget(null)}
          onApplied={() => { setApplyTarget(null); loadClasses(); }}
        />
      )}
    </div>
  );
}

// ─── Auth Modal (Sign In / Create Account tabs) ────────────────────────────

function AuthModal({ cls, onClose, onSuccess }) {
  const [tab, setTab] = useState('register'); // 'register' | 'login'

  return (
    <Modal open title={`Apply to: ${cls.name}`} onClose={onClose} size="sm">
      {/* Tabs */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-5">
        {[
          { key: 'register', label: 'Create Account' },
          { key: 'login',    label: 'Sign In' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === key ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'register'
        ? <RegisterForm onSuccess={onSuccess} />
        : <LoginForm onSuccess={onSuccess} />
      }
    </Modal>
  );
}

function RegisterForm({ onSuccess }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
        <input
          className="input"
          placeholder="Your name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          className="input"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          className="input"
          placeholder="At least 6 characters"
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          required
          minLength={6}
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
        {loading ? 'Creating account…' : 'Create Account & Continue'}
      </button>
      <p className="text-xs text-gray-400 text-center">
        You'll be able to review the application fee on the next screen.
      </p>
    </form>
  );
}

function LoginForm({ onSuccess }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(email, password);
      if (u.role !== 'student') {
        setError('Only student accounts can apply from here.');
        return;
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
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
      <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
        {loading ? 'Signing in…' : 'Sign In & Continue'}
      </button>
    </form>
  );
}

// ─── Class Card ─────────────────────────────────────────────────────────────

function ClassCard({ cls, selectedCountry, user, onApply }) {
  const teacher = cls.teachers?.[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <div className="h-1.5 bg-gradient-to-r from-brand-500 to-accent-500" />

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 font-bold text-base flex items-center justify-center shrink-0">
            {cls.name[0]}
          </div>
          <div className="text-right">
            {cls.price != null ? (
              <div>
                <span className="text-xl font-bold text-brand-600">
                  {selectedCountry?.currency_symbol || ''}{Number(cls.price).toLocaleString()}
                </span>
                <span className="text-xs text-gray-400 ml-1">{cls.currency_code}</span>
              </div>
            ) : (
              <span className="text-sm text-gray-400 italic">Price on request</span>
            )}
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 text-base mb-1">{cls.name}</h3>
        {cls.subject && (
          <p className="text-xs text-gray-500 mb-1">
            {cls.subject}{cls.level ? ` · ${cls.level}` : ''}
          </p>
        )}
        {cls.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{cls.description}</p>
        )}

        <div className="mt-auto space-y-2">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>👤 {cls.enrolled_count || 0}/{cls.max_students} enrolled</span>
            {teacher && <span>🎓 {teacher.name}</span>}
          </div>

          <button
            onClick={onApply}
            disabled={Number(cls.enrolled_count) >= Number(cls.max_students)}
            className="w-full btn-primary text-sm py-2 disabled:opacity-40"
          >
            {Number(cls.enrolled_count) >= Number(cls.max_students) ? 'Class Full' : 'Apply Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Apply Modal (after login/register) ─────────────────────────────────────

function ApplyModal({ cls, countryCode, country, onClose, onApplied }) {
  const [feeInfo, setFeeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [scholarshipRequested, setScholarshipRequested] = useState(false);
  const [scholarshipType, setScholarshipType] = useState('full');

  // Waiver blocked: student has a pending waiver request
  if (cls._waiverBlocked) {
    return (
      <Modal open title="Application Paused" onClose={onClose} size="sm">
        <div className="text-center py-4 space-y-3">
          <div className="text-4xl">⏳</div>
          <p className="text-gray-800 font-semibold">Fee Waiver Pending Review</p>
          <p className="text-sm text-gray-500">
            You requested an application fee waiver. You cannot apply to classes until the super admin reviews your request.
          </p>
          <p className="text-sm text-gray-500">
            Check your <strong>Dashboard</strong> for updates. You'll be notified once a decision is made.
          </p>
          <button onClick={onClose} className="btn-secondary w-full mt-2">Close</button>
        </div>
      </Modal>
    );
  }

  useEffect(() => {
    publicApi.applicationFee(countryCode)
      .then((r) => setFeeInfo(r.data))
      .catch(() => setFeeInfo({ fee: 15, currency_symbol: country?.currency_symbol || '$' }))
      .finally(() => setLoading(false));
  }, [countryCode, country]);

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await applications.apply(
        cls.id,
        countryCode,
        scholarshipRequested,
        scholarshipRequested ? scholarshipType : undefined
      );
      const data = res.data;

      if (data.checkoutUrl) {
        // ── Stripe configured: redirect to hosted Checkout page ───────────────
        // User will return to /payment/success or /payment/cancel
        window.location.href = data.checkoutUrl;
        return; // don't clear submitting — page is navigating away
      }

      if (data.stripeNotConfigured) {
        // ── Placeholder mode: Stripe keys not yet added to .env ───────────────
        // Application is saved; admin can see it and process payment offline
        setSuccess('placeholder');
      } else {
        // ── Fee waived: no payment needed ─────────────────────────────────────
        setSuccess('waived');
      }
      setTimeout(onApplied, 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit application');
    } finally { setSubmitting(false); }
  };

  if (success === 'waived') {
    return (
      <Modal open title="Application Submitted!" onClose={onClose} size="sm">
        <div className="text-center py-6">
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-gray-800 font-semibold text-base">Application received!</p>
          <p className="text-sm text-gray-500 mt-2">
            Your application for <strong>{cls.name}</strong> has been submitted — your application fee was waived.
            {scholarshipRequested && " Your scholarship request is included and will be reviewed by the super admin."}
          </p>
        </div>
      </Modal>
    );
  }

  if (success === 'placeholder') {
    return (
      <Modal open title="Application Received" onClose={onClose} size="sm">
        <div className="text-center py-6">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-gray-800 font-semibold text-base">Application submitted</p>
          <p className="text-sm text-gray-500 mt-2">
            Your application for <strong>{cls.name}</strong> has been received. Payment collection is being set up — our team will contact you about the application fee.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open title={`Apply: ${cls.name}`} onClose={onClose} size="sm">
      {loading ? (
        <div className="py-8 text-center text-gray-400">Loading…</div>
      ) : (
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <Row label="Class" value={cls.name} />
            {cls.subject && <Row label="Subject" value={cls.subject} />}
            {cls.price != null && (
              <Row label="Class Fee" value={`${country?.currency_symbol || ''}${Number(cls.price).toLocaleString()} ${cls.currency_code}`} />
            )}
          </div>

          {/* Application fee */}
          <div className={`rounded-xl p-4 text-sm ${feeInfo?.fee_waived || Number(feeInfo?.fee) === 0 ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'}`}>
            <p className="font-medium text-gray-900 mb-1">Application Fee</p>
            {feeInfo?.fee_waived || Number(feeInfo?.fee) === 0 ? (
              <p className="text-green-700 text-xs">✅ Waived — your fee has been approved or you're already enrolled elsewhere.</p>
            ) : (
              <div>
                <p className="text-amber-700 font-semibold text-base">
                  {feeInfo?.currency_symbol || country?.currency_symbol || ''}{feeInfo?.fee}
                  <span className="text-xs font-normal ml-1">{feeInfo?.currency_code}</span>
                </p>
                <p className="text-amber-600 text-xs mt-0.5">One-time fee for your first class application.</p>
              </div>
            )}
          </div>

          {/* Scholarship request */}
          <div className="border border-gray-200 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={scholarshipRequested}
                onChange={(e) => setScholarshipRequested(e.target.checked)}
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Request a scholarship</p>
                <p className="text-xs text-gray-500 mt-0.5">Up to 20% of class seats are reserved for scholarship recipients. The super admin makes the final decision.</p>
              </div>
            </label>

            {scholarshipRequested && (
              <div className="mt-3 ml-6 space-y-2">
                <p className="text-xs font-medium text-gray-700">Scholarship type preference:</p>
                {[
                  { value: 'full',    label: 'Full scholarship', desc: 'Class fee fully covered' },
                  { value: 'partial', label: 'Partial scholarship', desc: 'Partial reduction in class fee' },
                ].map(({ value, label, desc }) => (
                  <label key={value} className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${scholarshipType === value ? 'border-brand-400 bg-brand-50' : 'border-gray-200'}`}>
                    <input type="radio" name="scholType" value={value}
                      checked={scholarshipType === value}
                      onChange={() => setScholarshipType(value)} />
                    <div>
                      <span className="font-medium text-gray-900">{label}</span>
                      <span className="text-gray-500 ml-1.5 text-xs">{desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Payment note */}
          {!(feeInfo?.fee_waived || Number(feeInfo?.fee) === 0) && (
            <div className="flex items-center gap-2 px-1 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
              </svg>
              You'll be taken to Stripe's secure checkout page to complete payment.
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submit} disabled={submitting} className="btn-primary flex-1">
              {submitting
                ? 'Processing…'
                : (feeInfo?.fee_waived || Number(feeInfo?.fee) === 0)
                  ? 'Submit Application'
                  : `Pay ${feeInfo?.currency_symbol || ''}${feeInfo?.fee} & Apply`
              }
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
