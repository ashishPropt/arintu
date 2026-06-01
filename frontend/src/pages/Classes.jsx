import { useState, useEffect, useCallback } from 'react';
import { classes as classesApi, users, countries as countriesApi, applications, publicApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';

export default function Classes() {
  const { user } = useAuth();
  const [classList, setClassList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [regions, setRegions] = useState([]);

  const isAdmin   = ['admin', 'superadmin'].includes(user?.role);
  const isStudent = user?.role === 'student';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await classesApi.list({ search });
      setClassList(res.data.classes || []);
    } catch {} finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isAdmin) {
      Promise.all([
        users.list({ role: 'teacher', limit: 100 }),
        users.list({ role: 'student', limit: 100 }),
        countriesApi.list(),
      ]).then(([t, s, r]) => {
        setTeachers(t.data.users || []);
        setStudents(s.data.users || []);
        setRegions(r.data || []);
      }).catch(() => {});
    }
  }, [isAdmin]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Classes</h1>
          <p className="text-sm text-gray-500">{classList.length} total</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Class</button>
        )}
      </div>

      <div className="mb-4">
        <input
          className="input max-w-sm"
          placeholder="Search classes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : classList.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No classes found</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Sort enrolled classes to the top for students */}
          {[...classList]
            .sort((a, b) => isStudent ? (b.is_enrolled ? 1 : 0) - (a.is_enrolled ? 1 : 0) : 0)
            .map((c) => (
            <div key={c.id} className={`card p-4 hover:shadow-md transition-shadow ${isStudent && c.is_enrolled ? 'ring-1 ring-green-200' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                  isStudent && c.is_enrolled ? 'bg-green-50 text-green-700' : 'bg-brand-50 text-brand-600'
                }`}>
                  {c.name[0]}
                </div>
                <div className="flex items-center gap-1.5">
                  {isStudent && c.is_enrolled && (
                    <span className="badge bg-green-50 text-green-700 font-medium">✓ Enrolled</span>
                  )}
                  {!isStudent && (
                    <span className={`badge ${c.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mt-2">{c.name}</h3>
              {c.subject && (
                <p className="text-xs text-gray-500 mt-0.5">{c.subject}{c.level ? ` · ${c.level}` : ''}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{c.enrolled_count || 0} students enrolled</p>
              {c.price && (
                <p className="text-xs font-medium text-brand-600 mt-1">
                  {c.price} {c.currency || 'USD'}
                </p>
              )}
              <div className="mt-3">
                <button
                  onClick={() => setShowDetail(c.id)}
                  className={`text-xs py-1.5 px-3 w-full rounded-lg border font-medium transition-colors ${
                    isStudent && c.is_enrolled
                      ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                      : 'btn-secondary'
                  }`}
                >
                  {isStudent ? (c.is_enrolled ? 'View My Class →' : 'View Details') : 'Manage'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateClassModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}

      {showDetail && isStudent && (
        <StudentClassModal
          classId={showDetail}
          onClose={() => setShowDetail(null)}
        />
      )}

      {showDetail && !isStudent && (
        <AdminClassModal
          classId={showDetail}
          onClose={() => setShowDetail(null)}
          onChanged={load}
          teachers={teachers}
          students={students}
          countries={regions}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

// ── Student class view — flat, no tabs ────────────────────────────────────────
function StudentClassModal({ classId, onClose }) {
  const [data,      setData]      = useState(null);
  const [myApp,     setMyApp]     = useState(undefined); // undefined = loading, null = none, obj = application
  const [view,      setView]      = useState('detail');   // 'detail' | 'apply' | 'scholarship'
  const [loading,   setLoading]   = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionErr,  setActionErr]  = useState('');

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      classesApi.get(classId),
      applications.list({ classId }),
    ]).then(([cls, apps]) => {
      setData(cls.data);
      const arr = Array.isArray(apps.data) ? apps.data : [];
      setMyApp(arr[0] || null);
    }).catch(() => {
      setMyApp(null);
    }).finally(() => setLoading(false));
  }, [classId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Go to Stripe ─────────────────────────────────────────────────────────────
  const goToCheckout = (url) => { window.location.href = url; };

  // ── Pay app fee (retry existing app, recreate Stripe session) ────────────────
  const handlePayAppFee = async () => {
    setActionBusy(true);
    setActionErr('');
    try {
      const res = await applications.retryAppFee(myApp.id);
      goToCheckout(res.data.checkoutUrl);
    } catch (err) {
      setActionErr(err.response?.data?.error || 'Failed to start payment');
      setActionBusy(false);
    }
  };

  // ── Pay class fee ─────────────────────────────────────────────────────────────
  const handlePayClassFee = async () => {
    setActionBusy(true);
    setActionErr('');
    try {
      const res = await applications.payClassFee(myApp.id);
      goToCheckout(res.data.checkoutUrl);
    } catch (err) {
      setActionErr(err.response?.data?.error || 'Failed to start payment');
      setActionBusy(false);
    }
  };

  if (loading || !data) {
    return (
      <Modal open title="Class Details" onClose={onClose}>
        <div className="py-8 text-center text-gray-400">Loading…</div>
      </Modal>
    );
  }

  if (view === 'apply') {
    return (
      <ApplyModal
        classId={classId}
        className={data.name}
        onClose={onClose}
        onBack={() => setView('detail')}
        onApplied={(app) => {
          if (app.checkoutUrl) {
            goToCheckout(app.checkoutUrl);
          } else {
            // Free class or waiver — auto-enrolled
            setMyApp(app);
            setView('detail');
            loadData();
          }
        }}
      />
    );
  }

  if (view === 'scholarship') {
    return (
      <ScholarshipRequestModal
        appId={myApp?.id}
        className={data.name}
        onClose={onClose}
        onBack={() => setView('detail')}
        onSubmitted={(updatedApp) => {
          setMyApp(updatedApp);
          setView('detail');
        }}
      />
    );
  }

  // ── Derive class info ─────────────────────────────────────────────────────────
  const teacherList  = data.teachers || [];
  const enrolled     = parseInt(data.enrolled_count || 0);
  const maxStudents  = parseInt(data.max_students   || 0);
  const spotsLeft    = Math.max(0, maxStudents - enrolled);
  const isFull       = maxStudents > 0 && spotsLeft === 0;
  const defaultPrice = (data.pricing || []).find((p) => p.is_default) || (data.pricing || [])[0];

  // ── Determine state ───────────────────────────────────────────────────────────
  const ps  = myApp?.payment_status;    // app fee status
  const cfs = myApp?.class_fee_status;  // class fee status
  const st  = myApp?.status;            // application status

  // App fee is settled when it's paid, waived, or not required
  const appFeeSettled = ['paid', 'waived', 'not_required'].includes(ps);

  const isEnrolled   = st === 'approved' || ['paid', 'full_scholarship', 'not_required'].includes(cfs);
  const isSchPending = cfs === 'scholarship_pending';
  // Any application where app fee isn't settled yet needs app fee payment
  const appFeeOwed   = myApp && !appFeeSettled;
  const classFeeOwed = myApp && appFeeSettled && cfs === 'pending_payment';
  const isRejected   = st === 'rejected';
  const noApp        = myApp === null;
  const notActive   = !data.is_active;

  // Scholarship discount info
  const hasDiscount   = myApp?.scholarship_type === 'partial' && myApp?.class_fee_amount != null;
  const discountedAmt = hasDiscount ? parseFloat(myApp.class_fee_amount) : null;

  const noteColors = {
    success: 'bg-green-50 border-green-100 text-green-700',
    warning: 'bg-amber-50 border-amber-100 text-amber-700',
    error:   'bg-red-50 border-red-100 text-red-700',
    info:    'bg-blue-50 border-blue-100 text-blue-700',
    purple:  'bg-purple-50 border-purple-100 text-purple-700',
  };

  return (
    <Modal open title={data.name} onClose={onClose}>
      <div className="space-y-5">
        {/* Subject / level */}
        {(data.subject || data.level) && (
          <p className="text-sm text-gray-500">
            {[data.subject, data.level].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Description */}
        {data.description && (
          <p className="text-sm text-gray-600 leading-relaxed">{data.description}</p>
        )}

        {/* Three info blocks */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Teacher</p>
            {teacherList.length === 0 ? (
              <p className="text-sm text-gray-400 italic">TBD</p>
            ) : teacherList.map((t) => (
              <p key={t.id} className="text-sm font-semibold text-gray-900">{t.name}</p>
            ))}
          </div>

          <div className={`p-4 rounded-xl border ${isFull ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
            <p className="text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Spots</p>
            <p className={`text-sm font-semibold ${isFull ? 'text-red-700' : 'text-green-700'}`}>
              {isFull ? 'Full' : `${spotsLeft} left`}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{enrolled} / {maxStudents} enrolled</p>
          </div>

          <div className="p-4 rounded-xl bg-brand-50 border border-brand-100">
            <p className="text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Class Fee</p>
            {defaultPrice ? (
              <>
                <p className="text-sm font-semibold text-brand-700">
                  {defaultPrice.currency_symbol || ''}{Number(defaultPrice.price).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{defaultPrice.currency}</p>
              </>
            ) : (
              <p className="text-sm text-gray-400 italic">Free</p>
            )}
          </div>
        </div>

        {/* ── Status messages ── */}

        {isEnrolled && (
          <div className={`p-3 border rounded-xl text-sm ${noteColors.success}`}>
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span className="font-semibold">You are enrolled in this class.</span>
            </div>
            {cfs === 'full_scholarship' && <p className="text-xs mt-1">Full scholarship awarded.</p>}
          </div>
        )}

        {isRejected && (
          <div className={`p-3 border rounded-xl text-sm ${noteColors.error}`}>
            Your application was not approved. Contact your admin for more information.
          </div>
        )}

        {isSchPending && (
          <div className={`p-3 border rounded-xl text-sm ${noteColors.purple}`}>
            <div className="font-semibold mb-1">⏳ Scholarship request under review</div>
            <p className="text-xs">The admin is reviewing your scholarship request. You'll be notified once a decision is made.</p>
          </div>
        )}

        {classFeeOwed && (
          <div className={`p-3 border rounded-xl text-sm ${noteColors.warning}`}>
            <div className="font-semibold mb-1">
              {hasDiscount
                ? `Partial scholarship applied — pay remaining amount`
                : 'Class fee payment required to complete enrolment'}
            </div>
            {hasDiscount && (
              <p className="text-xs mb-1">
                After {myApp.scholarship_discount_pct}% scholarship:{' '}
                <strong>{discountedAmt?.toLocaleString()}</strong>
              </p>
            )}
            <p className="text-xs text-amber-600">Application fee: ✓ Settled</p>
          </div>
        )}

        {appFeeOwed && (
          <div className={`p-3 border rounded-xl text-sm ${noteColors.info}`}>
            <div className="font-semibold mb-1">Application fee payment pending</div>
            <p className="text-xs">You have an existing application for this class. Complete the application fee to continue.</p>
          </div>
        )}

        {noApp && !notActive && !isFull && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
            💡 A one-time application fee applies for first-time students — waived on all future class applications.
          </div>
        )}

        {/* ── Error banner ── */}
        {actionErr && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{actionErr}</div>
        )}

        {/* ── Action buttons ── */}

        {isEnrolled && (
          <button disabled className="w-full py-3 rounded-xl text-sm font-semibold bg-green-100 text-green-700 cursor-not-allowed">
            ✓ Enrolled
          </button>
        )}

        {isRejected && (
          <button disabled className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed">
            Application Not Approved
          </button>
        )}

        {isSchPending && (
          <button disabled className="w-full py-3 rounded-xl text-sm font-semibold bg-purple-100 text-purple-500 cursor-not-allowed">
            Scholarship Under Review
          </button>
        )}

        {classFeeOwed && (
          <div className="space-y-2">
            <button
              onClick={handlePayClassFee}
              disabled={actionBusy}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 transition-colors"
            >
              {actionBusy ? 'Redirecting to payment…' : hasDiscount
                ? `Pay Discounted Class Fee →`
                : 'Pay Class Fee →'}
            </button>
            {!hasDiscount && (
              <button
                onClick={() => setView('scholarship')}
                className="w-full py-2 text-xs text-brand-600 hover:text-brand-800 hover:underline"
              >
                Request a scholarship or financial assistance
              </button>
            )}
          </div>
        )}

        {appFeeOwed && (
          <button
            onClick={handlePayAppFee}
            disabled={actionBusy}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 transition-colors"
          >
            {actionBusy ? 'Redirecting to payment…' : 'Pay Application Fee →'}
          </button>
        )}

        {noApp && !notActive && !isFull && (
          <button
            onClick={() => setView('apply')}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 transition-colors"
          >
            Apply to Class →
          </button>
        )}

        {noApp && notActive && (
          <button disabled className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed">
            Class Not Active
          </button>
        )}

        {noApp && !notActive && isFull && (
          <button disabled className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed">
            Class Full
          </button>
        )}
      </div>
    </Modal>
  );
}

// ── Apply modal — country selector ────────────────────────────────────────────
function ApplyModal({ classId, className, onClose, onBack, onApplied }) {
  const [countries,   setCountries]   = useState([]);
  const [countryCode, setCountryCode] = useState('');
  const [feeInfo,     setFeeInfo]     = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    publicApi.countries().then((r) => setCountries(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!countryCode) { setFeeInfo(null); return; }
    publicApi.applicationFee(countryCode)
      .then((r) => setFeeInfo(r.data))
      .catch(() => setFeeInfo(null));
  }, [countryCode]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await applications.apply(classId, countryCode || null);
      onApplied(res.data);
    } catch (err) {
      const code = err.response?.data?.code;
      const msg  = err.response?.data?.error || 'Failed to submit application';
      if (code === 'WAIVER_PENDING') {
        setError('Your fee waiver request is pending super admin review. You cannot apply until a decision is made.');
      } else if (code === 'VERIFICATION_PENDING') {
        setError('Your ID verification is still under review. Please wait for it to be approved before applying.');
      } else if (code === 'VERIFICATION_REQUIRED') {
        setError('You must verify your ID before applying. Go to your dashboard to upload your ID document.');
      } else {
        setError(msg);
      }
    } finally { setLoading(false); }
  };

  return (
    <Modal open title={`Apply — ${className}`} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Your Country *</label>
          <select
            className="input"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            required
          >
            <option value="">Select your country…</option>
            {countries.map((c) => (
              <option key={c.id} value={c.code}>
                {c.name} ({c.currency_symbol} {c.currency_code})
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Used to determine your one-time application fee.</p>
        </div>

        {feeInfo && feeInfo.fee > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
            <strong>One-time application fee: </strong>
            {feeInfo.currency_symbol}{Number(feeInfo.fee).toLocaleString()} {feeInfo.currency_code}
            <p className="text-xs mt-1 text-amber-600">
              This is a one-time fee waived on all future class applications.
              You can request a waiver from your dashboard if you need financial assistance.
            </p>
          </div>
        )}

        {feeInfo && (!feeInfo.fee || feeInfo.fee === 0) && (
          <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-700">
            No application fee for your country.
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onBack} className="btn-secondary flex-1">← Back</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Submitting…' : 'Continue →'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Scholarship request modal ────────────────────────────────────────────────
function ScholarshipRequestModal({ appId, className, onClose, onBack, onSubmitted }) {
  const [reason,  setReason]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) { setError('Please provide a reason for your scholarship request.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await applications.requestScholarship(appId, reason);
      onSubmitted(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit scholarship request');
    } finally { setLoading(false); }
  };

  return (
    <Modal open title={`Scholarship Request — ${className}`} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-700">
          <strong>How it works:</strong> Describe why you need financial assistance. The admin will review
          your request and may award a full scholarship (free enrolment) or a partial discount. You will
          be notified by the outcome.
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Why are you requesting a scholarship? *
          </label>
          <textarea
            className="input"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please explain your financial situation and why you need assistance…"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onBack} className="btn-secondary flex-1">← Back</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Admin / Teacher tabbed class modal ────────────────────────────────────────
function AdminClassModal({ classId, onClose, onChanged, teachers, students, countries, isAdmin }) {
  const [data, setData] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [tab, setTab] = useState('info');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [editingPrice, setEditingPrice] = useState(null); // { rowId, value }
  const [savingPrice,  setSavingPrice]  = useState(false);
  const [removingStudent, setRemovingStudent] = useState(null); // student_id being removed
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  useEffect(() => {
    classesApi.get(classId).then((r) => setData(r.data)).catch(() => {});
    classesApi.enrollments(classId).then((r) => setEnrollments(r.data)).catch(() => {});
  }, [classId]);

  if (!data) {
    return (
      <Modal open title="Class Details" onClose={onClose}>
        <div className="py-8 text-center text-gray-400">Loading…</div>
      </Modal>
    );
  }

  const assignTeacher = async () => {
    if (!selectedTeacher) return;
    await classesApi.assignTeacher(classId, selectedTeacher);
    const res = await classesApi.get(classId);
    setData(res.data);
    setSelectedTeacher('');
    onChanged();
  };

  const enrollStudent = async () => {
    if (!selectedStudent) return;
    await classesApi.enroll(classId, selectedStudent);
    const [detail, enroll] = await Promise.all([classesApi.get(classId), classesApi.enrollments(classId)]);
    setData(detail.data);
    setEnrollments(enroll.data);
    setSelectedStudent('');
    onChanged();
  };

  const tabs = ['info', 'teachers', 'students', 'pricing'];

  return (
    <Modal open title={data.name} onClose={onClose} size="lg">
      <div className="flex gap-1 mb-4 border-b border-gray-100 pb-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              tab === t ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="space-y-3 text-sm">
          <Row label="Subject"      value={data.subject      || '—'} />
          <Row label="Level"        value={data.level        || '—'} />
          <Row label="Max Students" value={data.max_students} />
          <Row label="Enrolled"     value={data.enrolled_count} />
          <Row label="Admin"        value={data.admin_name} />
          {(data.prerequisites || []).length > 0 && (
            <div className="py-1 border-b border-gray-50">
              <span className="text-gray-500 text-xs">Prerequisites</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {data.prerequisites.map((p) => (
                  <span key={p.id} className="inline-block px-2 py-0.5 rounded-lg bg-brand-50 text-brand-700 text-xs font-medium">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.description && <p className="text-gray-600 text-xs mt-2">{data.description}</p>}

          {/* ── Danger zone ── */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-red-100">
              {enrollments.length > 0 ? (
                <p className="text-xs text-gray-400 italic">
                  Remove all enrolled students before deleting this class.
                </p>
              ) : confirmDelete ? (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl space-y-2">
                  <p className="text-xs font-medium text-red-700">
                    Delete <strong>{data.name}</strong>? This will deactivate the class and cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true);
                        try {
                          await classesApi.remove(classId);
                          onChanged();
                          onClose();
                        } catch {} finally { setDeleting(false); }
                      }}
                      className="btn-danger text-xs py-1 px-3"
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="btn-secondary text-xs py-1 px-3"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline"
                >
                  Delete class
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'teachers' && (
        <div>
          {isAdmin && (data.teachers || []).length === 0 && (
            <div className="flex gap-2 mb-3">
              <select
                className="input flex-1 text-sm"
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
              >
                <option value="">Select teacher…</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                ))}
              </select>
              <button onClick={assignTeacher} disabled={!selectedTeacher} className="btn-primary text-sm">
                Assign
              </button>
            </div>
          )}
          {isAdmin && (data.teachers || []).length > 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
              Remove the current teacher before assigning a new one.
            </p>
          )}
          <div className="space-y-2">
            {(data.teachers || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">No teacher assigned yet</p>
            ) : (data.teachers || []).map((t) => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.email}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={async () => {
                      await classesApi.removeTeacher(classId, t.id);
                      const r = await classesApi.get(classId);
                      setData(r.data);
                      onChanged();
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'students' && (
        <div>
          {isAdmin && (
            <div className="flex gap-2 mb-3">
              <select
                className="input flex-1 text-sm"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
              >
                <option value="">Select student…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                ))}
              </select>
              <button onClick={enrollStudent} disabled={!selectedStudent} className="btn-primary text-sm">
                Enroll
              </button>
            </div>
          )}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {enrollments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">No students enrolled</p>
            ) : enrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium">{e.name}</p>
                  <p className="text-xs text-gray-400">{e.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`badge ${e.payment_status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                    {e.payment_status}
                  </span>
                  {isAdmin && (
                    <button
                      disabled={removingStudent === e.student_id}
                      onClick={async () => {
                        setRemovingStudent(e.student_id);
                        try {
                          await classesApi.unenroll(classId, e.student_id);
                          const [detail, enroll] = await Promise.all([
                            classesApi.get(classId),
                            classesApi.enrollments(classId),
                          ]);
                          setData(detail.data);
                          setEnrollments(enroll.data);
                          onChanged();
                        } catch {} finally { setRemovingStudent(null); }
                      }}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-40"
                    >
                      {removingStudent === e.student_id ? '…' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'pricing' && (
        <div>
          {/* Warn when students are enrolled — must remove first */}
          {isAdmin && enrollments.length > 0 && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 leading-relaxed">
              <strong>{enrollments.length} student{enrollments.length > 1 ? 's' : ''} currently enrolled.</strong>
              {' '}You must remove all students from the{' '}
              <button
                onClick={() => setTab('students')}
                className="underline font-semibold hover:text-amber-900"
              >
                Students tab
              </button>
              {' '}before editing prices.
            </div>
          )}

          {(data.pricing || []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">No pricing set</p>
          ) : (
            <div className="space-y-2">
              {data.pricing.map((p) => {
                const isEditingThis = editingPrice?.rowId === p.id;
                return (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100">
                    <span className="text-sm text-gray-700">{p.country_name || 'Global default'}</span>

                    {isEditingThis ? (
                      /* ── Inline edit row ── */
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          {p.currency_symbol && (
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                              {p.currency_symbol}
                            </span>
                          )}
                          <input
                            type="number"
                            min="0"
                            step="any"
                            autoFocus
                            className={`input w-28 text-sm py-1 ${p.currency_symbol ? 'pl-6' : ''}`}
                            value={editingPrice.value}
                            onChange={(e) => setEditingPrice((ep) => ({ ...ep, value: e.target.value }))}
                          />
                        </div>
                        <button
                          disabled={savingPrice || !editingPrice.value}
                          onClick={async () => {
                            setSavingPrice(true);
                            try {
                              await classesApi.setPricing(classId, {
                                countryId: p.country_id || undefined,
                                price: parseFloat(editingPrice.value),
                              });
                              const res = await classesApi.get(classId);
                              setData(res.data);
                              setEditingPrice(null);
                              onChanged();
                            } catch {} finally { setSavingPrice(false); }
                          }}
                          className="btn-primary text-xs py-1 px-2.5"
                        >
                          {savingPrice ? '…' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingPrice(null)}
                          className="text-xs text-gray-400 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      /* ── Read-only row ── */
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-brand-600">
                          {p.currency_symbol}{Number(p.price).toLocaleString()} {p.currency}
                        </span>
                        {isAdmin && enrollments.length === 0 && (
                          <button
                            onClick={() => setEditingPrice({ rowId: p.id, value: p.price })}
                            className="text-xs text-gray-400 hover:text-brand-600 px-1.5 py-0.5 rounded hover:bg-brand-50 transition-colors"
                            title="Edit price"
                          >
                            ✏
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

// ── Create class modal ────────────────────────────────────────────────────────
function CreateClassModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', description: '', subject: '', level: '', maxStudents: 30,
  });
  const [price,          setPrice]          = useState('');
  const [prereqIds,      setPrereqIds]      = useState([]); // selected prerequisite class IDs
  const [allClasses,     setAllClasses]     = useState([]); // for prerequisite picker
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Load all active classes for the prerequisite picker
  useEffect(() => {
    classesApi.list({ limit: 200 })
      .then((r) => setAllClasses(r.data.classes || []))
      .catch(() => {});
  }, []);

  const togglePrereq = (id) => {
    setPrereqIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.level) { setError('Please select a level.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await classesApi.create({ ...form, prerequisiteClassIds: prereqIds });
      const classId = res.data.id;
      if (price && parseFloat(price) > 0) {
        await classesApi.setPricing(classId, { price: parseFloat(price) });
      }
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create class');
    } finally { setLoading(false); }
  };

  // Classes available as prerequisites (exclude any already picked)
  const availableClasses = allClasses.filter((c) => !prereqIds.includes(c.id));

  return (
    <Modal open title="Create Class" onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          {/* Class name */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Class Name *</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
            <input className="input" value={form.subject} onChange={(e) => set('subject', e.target.value)} />
          </div>

          {/* Level dropdown */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Level *</label>
            <select
              className="input"
              value={form.level}
              onChange={(e) => set('level', e.target.value)}
              required
            >
              <option value="">Select level…</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Description */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          {/* Max students */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Max Students</label>
            <input type="number" className="input" min="1" value={form.maxStudents} onChange={(e) => set('maxStudents', e.target.value)} />
          </div>

          {/* Class price — single global price */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Class Price (USD)</label>
            <input
              type="number"
              className="input"
              min="0"
              step="any"
              placeholder="0 = free"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        {/* Prerequisites — shown after level selected, searchable multi-pick */}
        {form.level && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Prerequisites
              <span className="text-gray-400 font-normal ml-1">— select classes students must have completed</span>
            </label>

            {/* Selected chips */}
            {prereqIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {prereqIds.map((id) => {
                  const cls = allClasses.find((c) => c.id === id);
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-50 text-brand-700 text-xs font-medium">
                      {cls?.name || id}
                      <button type="button" onClick={() => togglePrereq(id)} className="hover:text-red-600 ml-0.5">✕</button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Scrollable picker */}
            {availableClasses.length > 0 ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                {availableClasses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => togglePrereq(c.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50 hover:text-brand-700 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <span className="text-gray-300 text-xs">＋</span>
                    <span className="flex-1">{c.name}</span>
                    {c.level && <span className="text-xs text-gray-400">{c.level}</span>}
                  </button>
                ))}
              </div>
            ) : prereqIds.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No other classes available to set as prerequisites.</p>
            ) : (
              <p className="text-xs text-gray-400 italic">All available classes are already selected.</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating…' : 'Create Class'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-50">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="font-medium text-xs text-gray-900">{value}</span>
    </div>
  );
}
