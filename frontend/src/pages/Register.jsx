import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { auth as authApi, publicApi } from '../api';
import Logo from '../components/Logo';

const ROLES = [
  { value: 'student', label: 'Student',  desc: 'Browse and apply to classes',           color: 'orange' },
  { value: 'parent',  label: 'Parent',   desc: 'Monitor your child\'s progress',        color: 'green'  },
  { value: 'teacher', label: 'Teacher',  desc: 'Teach classes',                         color: 'blue'   },
  { value: 'admin',   label: 'Admin',    desc: 'Manage classes and students',            color: 'purple' },
];

const CONTACT_PREFS = [
  { value: 'email',    label: 'Email'    },
  { value: 'phone',    label: 'Phone'    },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'any',      label: 'Any'      },
];

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'student',
    parentName: '', parentEmail: '', parentPhone: '',
    contactPreference: 'email',
    countryId: '',
  });
  const [idFile,     setIdFile]     = useState(null);
  const [countries,  setCountries]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [submitted,  setSubmitted]  = useState(false);
  const [submittedViaParent, setSubmittedViaParent] = useState(false);
  const [verifyViaParent,    setVerifyViaParent]    = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    publicApi.countries().then((r) => setCountries(r.data || [])).catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.role === 'student') {
      if (!form.parentName.trim()) return setError('Parent/guardian name is required');
      if (!form.parentEmail.trim()) return setError('Parent/guardian email is required');
    }
    const allowedViaParent = form.role === 'student' && verifyViaParent;
    if (!allowedViaParent && !idFile) {
      return setError('Please upload a government-issued ID document, or pick the parent-verification option.');
    }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (allowedViaParent) {
        fd.append('verifyViaParent', 'true');
      } else if (idFile) {
        fd.append('id_document', idFile);
      }

      const res = await authApi.register(fd);
      if (allowedViaParent) {
        setSubmittedViaParent(true);
      } else if (res.data.pending) {
        setSubmitted(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const isStudent = form.role === 'student';

  // ── Submitted / pending screen ────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 p-4">
        <div className="w-full max-w-sm">
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Account created!</h2>
            <p className="text-sm text-gray-500 mb-2">
              Your ID is now being reviewed. We'll send you an email once your account is approved —
              usually within 24 hours.
            </p>
            <p className="text-sm text-gray-400 mb-6">
              You can sign in to check your verification status at any time.
            </p>
            <Link to="/login" className="btn-primary w-full block text-center">Go to sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  if (submittedViaParent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 p-4">
        <div className="w-full max-w-sm">
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Account verified through your parent!
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Your account is active. Sign in to start applying for classes.
            </p>
            <Link to="/login" className="btn-primary w-full block text-center">Go to sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
            Create your account
          </h1>
          <p className="text-gray-500 text-sm mt-1">Join Arintu Learning</p>
        </div>

        <div className="card p-6 shadow-sm">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">

            {/* Role selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">I am a…</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => set('role', r.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.role === r.value
                        ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-400'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-900">{r.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Personal info */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
              <input className="input" placeholder="Your full name" value={form.name}
                onChange={(e) => set('name', e.target.value)} required />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input" placeholder="you@example.com" value={form.email}
                onChange={(e) => set('email', e.target.value)} required />
            </div>

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
                {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">Used to determine applicable fees.</p>
            </div>

            {/* Parent/Guardian info — students only */}
            {isStudent && (
              <div className="border border-blue-100 rounded-xl p-4 bg-blue-50 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-blue-800 mb-1">Parent / Guardian Information</p>
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
            )}

            {/* Identity verification */}
            <div className="border border-amber-100 rounded-xl p-4 bg-amber-50 space-y-3">
              <p className="text-xs font-semibold text-amber-800">
                🪪 Identity verification <span className="text-red-500">*</span>
              </p>

              {isStudent && (
                <div className="space-y-1.5">
                  <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer text-xs ${!verifyViaParent ? 'border-amber-300 bg-white' : 'border-amber-100'}`}>
                    <input
                      type="radio"
                      name="verifyMode"
                      checked={!verifyViaParent}
                      onChange={() => setVerifyViaParent(false)}
                      className="mt-0.5"
                    />
                    <span>
                      <strong className="text-amber-900">I have a government-issued ID</strong>
                      <span className="block text-amber-700">Passport, national ID, or driving licence.</span>
                    </span>
                  </label>
                  <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer text-xs ${verifyViaParent ? 'border-amber-300 bg-white' : 'border-amber-100'}`}>
                    <input
                      type="radio"
                      name="verifyMode"
                      checked={verifyViaParent}
                      onChange={() => { setVerifyViaParent(true); setIdFile(null); }}
                      className="mt-0.5"
                    />
                    <span>
                      <strong className="text-amber-900">Verify through my parent</strong>
                      <span className="block text-amber-700">
                        Use this if you don't have a government-issued ID. Your parent must already have an Arintu account with their ID approved — we'll look them up by the email above.
                      </span>
                    </span>
                  </label>
                </div>
              )}

              {(!isStudent || !verifyViaParent) && (
                <>
                  <p className="text-xs text-amber-700 leading-snug">
                    Upload a clear photo or scan of your passport, national ID, or driving licence.
                    Your account will be activated once the document is verified (usually within 24 hours).
                  </p>

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
                      <button type="button" onClick={() => { setIdFile(null); fileRef.current.value = ''; }}
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
                </>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
              {loading ? 'Creating account…' : 'Create Account & Submit ID'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
