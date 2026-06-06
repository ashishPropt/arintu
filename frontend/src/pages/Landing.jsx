import { useState, useEffect, useCallback, useRef } from 'react';
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

      {/* About Enfinitty */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-brand-500 to-accent-500" />

          <div className="p-8 sm:p-10">
            {/* Headline */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">About Enfinitty</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-8 text-sm text-gray-600 leading-relaxed">
              {/* Left column */}
              <div className="space-y-4">
                <p>
                  Having realized the need to serve students across the world, Shiv Keyal and team created{' '}
                  <strong className="text-gray-800">Enfinitty, Inc.</strong> in 2021. Enfinitty (infinity + affinity)
                  is working to expand educational opportunities for students around the globe. Enfinitty's fundamental
                  philosophy is nurturing aspiring young minds through dynamic educational opportunities to inspire
                  innovation, creativity, and ingenuity.
                </p>
                <p>
                  Comprising a team of passionate adults and board members with extensive educational experience,
                  Enfinitty takes pride in caring about, and believing in, student centered achievement. We are here to
                  mentor and support students from around the world and provide exceptional educational experiences that
                  prepare them for life. Students need to be excited and engaged in order to achieve academic excellence.
                  Enfinitty's goal is just to provide this opportunity.
                </p>
                <p>
                  We also believe in giving back to the community we serve. To support this commitment,{' '}
                  <strong className="text-gray-800">20% of our seats are reserved</strong> for students with
                  demonstrated financial need.
                </p>
              </div>

              {/* Right column */}
              <div className="space-y-5">
                {/* Alumni achievements */}
                <div className="bg-brand-50 rounded-2xl p-5">
                  <p className="font-semibold text-gray-900 mb-2">🎓 Alumni Achievements</p>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    Over the past several years, our students have achieved outstanding results. They have been admitted
                    to leading universities, including:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'UC San Diego', 'UCLA', 'UC Berkeley', 'Caltech',
                      'Harvey Mudd College', 'Claremont McKenna', 'Yale',
                      'MIT', 'Stanford', 'Harvard', 'U of Chicago', 'Northwestern',
                    ].map((u) => (
                      <span key={u} className="inline-block bg-white border border-brand-100 text-brand-700 text-xs font-medium px-2.5 py-1 rounded-full">
                        {u}
                      </span>
                    ))}
                    <span className="inline-block bg-white border border-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full italic">
                      and more
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed">
                  Many of our alumni have since graduated from college, entered the workforce, and gone on to build
                  successful careers. We invite you to visit our{' '}
                  <a href="/about/history" className="text-brand-600 font-medium hover:underline">
                    History page
                  </a>{' '}
                  to learn more about their experiences and achievements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Classes grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-bold text-gray-900">Our Classes</h2>
          <div className="flex-1 h-px bg-gray-100" />
        </div>
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
    <Modal open title={`Apply to: ${cls.name}`} onClose={onClose} size="lg">
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

const CONTACT_PREFS = [
  { value: 'email',    label: 'Email'    },
  { value: 'phone',    label: 'Phone'    },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'any',      label: 'Any'      },
];

function RegisterForm({ onSuccess }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    parentName: '', parentEmail: '', parentPhone: '',
    contactPreference: 'email',
    countryId: '',
  });
  const [idFile,       setIdFile]       = useState(null);
  const [regCountries, setRegCountries] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [submitted,    setSubmitted]    = useState(false);
  const fileRef = useRef(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    countriesApi.list().then((r) => setRegCountries(r.data || [])).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.parentName.trim()) return setError('Parent/guardian name is required.');
    if (!form.parentEmail.trim()) return setError('Parent/guardian email is required.');
    if (!idFile) return setError('Please upload a government-issued ID to continue.');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('role', 'student');
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      fd.append('id_document', idFile);
      const result = await register(fd);
      if (result?.pending) {
        // Account created but needs ID verification before they can log in
        setSubmitted(true);
        return;
      }
      onSuccess(); // signed in immediately (shouldn't happen with ID-required flow)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  // ── Post-registration pending screen ─────────────────────────────────────
  if (submitted) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="text-5xl">🎉</div>
        <div>
          <p className="font-semibold text-gray-900">Account created!</p>
          <p className="text-sm text-gray-500 mt-1">
            We're reviewing your ID — this usually takes up to 24 hours.
            You'll receive an email once your account is approved.
          </p>
        </div>
        <div className="bg-brand-50 border border-brand-100 rounded-lg p-3 text-xs text-brand-700 text-left">
          <strong>What happens next?</strong><br />
          Once approved, sign in from this page and click{' '}
          <em>Apply Now</em> on any class you're interested in.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
        <input className="input" placeholder="Your full name" value={form.name}
          onChange={(e) => set('name', e.target.value)} required />
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
        <input type="email" className="input" placeholder="you@example.com" value={form.email}
          onChange={(e) => set('email', e.target.value)} required />
      </div>

      {/* Password */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
        <input type="password" className="input" placeholder="At least 6 characters" value={form.password}
          onChange={(e) => set('password', e.target.value)} required minLength={6} />
      </div>

      {/* Contact preference */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Preferred contact method</label>
        <select className="input" value={form.contactPreference}
          onChange={(e) => set('contactPreference', e.target.value)}>
          {CONTACT_PREFS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {/* Country */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
        <select className="input" value={form.countryId}
          onChange={(e) => set('countryId', e.target.value)}>
          <option value="">Select your country…</option>
          {regCountries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Parent / Guardian */}
      <div className="border border-blue-100 rounded-xl p-4 bg-blue-50 space-y-3">
        <div>
          <p className="text-xs font-semibold text-blue-800 mb-0.5">Parent / Guardian Information</p>
          <p className="text-xs text-blue-600">Required for student accounts.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input className="input" placeholder="Parent or guardian full name"
            value={form.parentName} onChange={(e) => set('parentName', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input type="email" className="input" placeholder="parent@example.com"
            value={form.parentEmail} onChange={(e) => set('parentEmail', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Phone <span className="text-xs text-gray-400">(optional)</span>
          </label>
          <input type="tel" className="input" placeholder="+1 555 000 0000"
            value={form.parentPhone} onChange={(e) => set('parentPhone', e.target.value)} />
        </div>
      </div>

      {/* ID Document upload */}
      <div className="border border-amber-100 rounded-xl p-4 bg-amber-50 space-y-2">
        <div>
          <p className="text-xs font-semibold text-amber-800 mb-0.5">
            🪪 Government-issued ID <span className="text-red-500">*</span>
          </p>
          <p className="text-xs text-amber-700 leading-snug">
            Upload a photo or scan of your passport, national ID, or driving licence.
            Your account will be verified within 24 hours.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          className="hidden"
          onChange={(e) => setIdFile(e.target.files?.[0] || null)}
        />
        {idFile ? (
          <div className="flex items-center gap-2 p-2 bg-white border border-amber-200 rounded-lg">
            <span className="text-base">📄</span>
            <span className="text-xs text-gray-700 flex-1 truncate">{idFile.name}</span>
            <span className="text-xs text-gray-400">{(idFile.size / 1024).toFixed(0)} KB</span>
            <button type="button"
              onClick={() => { setIdFile(null); fileRef.current.value = ''; }}
              className="text-xs text-red-400 hover:text-red-600 ml-1">✕</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current.click()}
            className="w-full py-2 px-3 border-2 border-dashed border-amber-200 rounded-lg text-xs text-amber-700 hover:bg-amber-100 transition-colors"
          >
            Click to choose file — JPG, PNG, or PDF, max 5 MB
          </button>
        )}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
        {loading ? 'Creating account…' : 'Create Account & Continue'}
      </button>
      <p className="text-xs text-gray-400 text-center">
        You can submit your class application right away — your ID will be reviewed within 24 hours.
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

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function formatSlotTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  // Display in PST (UTC-8)
  const utcH = d.getUTCHours();
  const utcM = d.getUTCMinutes();
  const pstH = ((utcH - 8) + 24) % 24;
  const ampm = pstH >= 12 ? 'PM' : 'AM';
  const h12  = pstH % 12 || 12;
  const mm   = utcM === 0 ? '' : `:${String(utcM).padStart(2,'0')}`;
  return `${h12}${mm} ${ampm}`;
}

function ClassCard({ cls, selectedCountry, user, onApply }) {
  const teacher = cls.teachers?.[0];
  const [descExpanded, setDescExpanded] = useState(false);
  const CHAR_LIMIT = 120;
  const longDesc = cls.description && cls.description.length > CHAR_LIMIT;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <div className="h-1.5 bg-gradient-to-r from-brand-500 to-accent-500" />

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="text-right">
            {cls.price != null ? (
              <div>
                <span className="text-xl font-bold text-brand-600">
                  {cls.currency_symbol || selectedCountry?.currency_symbol || ''}{Number(cls.price).toLocaleString()}
                </span>
                <span className="text-xs text-gray-400 ml-1">{cls.currency_code}</span>
              </div>
            ) : (
              <span className="text-sm text-gray-400 italic">Price on request</span>
            )}
          </div>
        </div>

        {cls.code && (
          <span className="inline-block text-xs font-bold tracking-wide text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md mb-1">
            {cls.code}
          </span>
        )}
        <h3 className="font-semibold text-gray-900 text-base mb-1">{cls.name}</h3>
        {cls.subject && (
          <p className="text-xs text-gray-500 mb-1">
            {cls.subject}{cls.level ? ` · ${cls.level}` : ''}
          </p>
        )}
        {cls.description && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              {descExpanded || !longDesc
                ? cls.description
                : cls.description.slice(0, CHAR_LIMIT).trimEnd() + '…'}
            </p>
            {longDesc && (
              <button
                onClick={() => setDescExpanded((v) => !v)}
                className="text-xs text-brand-600 hover:underline mt-0.5 font-medium"
              >
                {descExpanded ? 'See less' : 'See more'}
              </button>
            )}
          </div>
        )}

        {cls.schedules && cls.schedules.length > 0 && (
          <div className="mb-3 border-t border-gray-50 pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Schedule</p>
            <div className="space-y-1">
              {cls.schedules.map((s) => (
                <div key={s.session_code} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="font-medium text-brand-600 w-14 shrink-0">{s.session_code}</span>
                  <span>{DAY_NAMES[s.day_of_week]}s</span>
                  <span className="text-gray-400">·</span>
                  <span>{formatSlotTime(s.start_time)}–{formatSlotTime(s.end_time)} PST</span>
                  {s.teacher && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-gray-400">{s.teacher.split(' ').pop()}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
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
