import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { publicApi, countries as countriesApi, applications } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import Modal from '../components/Modal';
import axios from 'axios';

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
  const [applyTarget, setApplyTarget] = useState(null); // class to apply to

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

  // Auto-open apply modal if student was redirected here from login
  useEffect(() => {
    const pendingId = sessionStorage.getItem('applyClassId');
    if (pendingId && user?.role === 'student' && classes.length > 0) {
      const cls = classes.find((c) => String(c.id) === String(pendingId));
      if (cls) {
        sessionStorage.removeItem('applyClassId');
        setApplyTarget(cls);
      }
    }
  }, [user, classes]);

  const selectedCountry = countries.find((c) => c.code === selectedCode);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-accent-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            {/* Country picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 hidden sm:block">Pricing for:</span>
              <select
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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

            {user ? (
              <button onClick={() => navigate('/app/dashboard')} className="btn-primary text-sm">
                Dashboard
              </button>
            ) : (
              <Link to="/login" className="btn-primary text-sm">Sign in</Link>
            )}
          </div>
        </div>
      </header>

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
        {selectedCountry && (
          <p className="mt-3 text-sm text-brand-600 font-medium">
            Showing prices in {selectedCountry.currency_name} ({selectedCountry.currency_symbol})
          </p>
        )}
      </section>

      {/* Classes grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
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
                onApply={() => {
                  if (!user) {
                    sessionStorage.setItem('applyClassId', c.id);
                    navigate('/login');
                  } else if (user.role === 'student') {
                    setApplyTarget(c);
                  } else {
                    navigate('/app/dashboard');
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>

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

function ClassCard({ cls, selectedCountry, user, onApply }) {
  const teacher = cls.teachers?.[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Color bar */}
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

function ApplyModal({ cls, countryCode, country, onClose, onApplied }) {
  const [feeInfo, setFeeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
      await applications.apply(cls.id, countryCode);
      setSuccess(true);
      setTimeout(onApplied, 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit application');
    } finally { setSubmitting(false); }
  };

  if (success) {
    return (
      <Modal open title="Application Submitted" onClose={onClose} size="sm">
        <div className="text-center py-4">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-gray-700 font-medium">Your application has been submitted!</p>
          <p className="text-sm text-gray-500 mt-1">You'll be notified once the admin reviews it.</p>
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

          {/* Application fee info */}
          <div className={`rounded-xl p-4 text-sm ${feeInfo?.fee_waived || feeInfo?.fee === 0 ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'}`}>
            <p className="font-medium text-gray-900 mb-1">Application Fee</p>
            {feeInfo?.fee_waived || feeInfo?.fee === 0 ? (
              <p className="text-green-700 text-xs">✅ Waived — you're already enrolled in another class.</p>
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

          <p className="text-xs text-gray-500">
            Your application will be reviewed by the admin. Payment will be collected upon approval.
          </p>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submit} disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Submitting…' : 'Submit Application'}
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
