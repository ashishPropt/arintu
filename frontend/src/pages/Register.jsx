import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth as authApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';

const ROLES = [
  { value: 'student', label: 'Student', desc: 'Browse and apply to classes', color: 'orange' },
  { value: 'parent',  label: 'Parent',  desc: 'Monitor your child\'s progress', color: 'green' },
  { value: 'teacher', label: 'Teacher', desc: 'Teach classes (pending approval)', color: 'blue' },
  { value: 'admin',   label: 'Admin',   desc: 'Manage classes and students (pending approval)', color: 'purple' },
];

const CONTACT_PREFS = [
  { value: 'email',     label: 'Email' },
  { value: 'phone',     label: 'Phone' },
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'any',       label: 'Any' },
];

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'student',
    parentName: '', parentEmail: '', parentPhone: '',
    contactPreference: 'email',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend validation for parent fields
    if (form.role === 'student') {
      if (!form.parentName.trim()) return setError('Parent/guardian name is required');
      if (!form.parentEmail.trim()) return setError('Parent/guardian email is required');
    }

    setLoading(true);
    try {
      const res = await authApi.register(form);
      if (res.data.pending) {
        setPending(true);
      } else {
        localStorage.setItem('arintu_token', res.data.token);
        await login(form.email, form.password);
        navigate('/app/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLES.find((r) => r.value === form.role);
  const needsApproval = form.role === 'teacher' || form.role === 'admin';
  const isStudent = form.role === 'student';

  if (pending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 p-4">
        <div className="w-full max-w-sm">
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Account created — pending approval</h2>
            <p className="text-sm text-gray-500 mb-6">
              Your <strong>{form.role}</strong> account has been created. The super admin will review
              and approve your account. You will receive an email notification once approved.
            </p>
            <Link to="/login" className="btn-secondary">Back to sign in</Link>
          </div>
        </div>
      </div>
    );
  }

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

            {needsApproval && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
                ⚠️ <strong>{selectedRole?.label}</strong> accounts require super admin approval before you can sign in. You will be notified via email.
              </div>
            )}

            {/* Student info */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
              <input
                className="input"
                placeholder="Your full name"
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

            {/* Contact preference */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Preferred contact method</label>
              <select
                className="input"
                value={form.contactPreference}
                onChange={(e) => set('contactPreference', e.target.value)}
              >
                {CONTACT_PREFS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Parent/Guardian info — required for students */}
            {isStudent && (
              <div className="border border-blue-100 rounded-xl p-4 bg-blue-50 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-blue-800 mb-1">Parent / Guardian Information</p>
                  <p className="text-xs text-blue-600">Required for student accounts. Your parent/guardian will receive updates about your progress.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Parent / Guardian Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input"
                    placeholder="Parent or guardian full name"
                    value={form.parentName}
                    onChange={(e) => set('parentName', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Parent / Guardian Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    className="input"
                    placeholder="parent@example.com"
                    value={form.parentEmail}
                    onChange={(e) => set('parentEmail', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Parent / Guardian Phone <span className="text-xs text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="+1 555 000 0000"
                    value={form.parentPhone}
                    onChange={(e) => set('parentPhone', e.target.value)}
                  />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
              {loading ? 'Creating account…' : needsApproval ? `Request ${selectedRole?.label} Account` : 'Create Account'}
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
