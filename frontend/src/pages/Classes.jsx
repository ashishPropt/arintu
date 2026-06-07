import { useState, useEffect, useCallback, useMemo } from 'react';
import { classes as classesApi, schedules as schedulesApi, users, countries as countriesApi, applications, publicApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import SharedApplyModal from '../components/ApplyModal';

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function formatSlotTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pstH = ((d.getUTCHours() - 8) + 24) % 24;
  const ampm = pstH >= 12 ? 'PM' : 'AM';
  const h12  = pstH % 12 || 12;
  const mm   = d.getUTCMinutes() === 0 ? '' : `:${String(d.getUTCMinutes()).padStart(2,'0')}`;
  return `${h12}${mm} ${ampm}`;
}
function formatPSTDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pst = new Date(d.getTime() - 8 * 3600 * 1000);
  return `${pst.getUTCMonth() + 1}/${pst.getUTCDate()}/${pst.getUTCFullYear()}`;
}
function formatDateRange(firstIso, lastIso) {
  if (!firstIso) return '';
  const a = formatPSTDate(firstIso);
  const b = formatPSTDate(lastIso);
  return a === b || !lastIso ? a : `${a} – ${b}`;
}

export default function Classes() {
  const { user } = useAuth();

  // Students get a public-style rich card view with apply buttons
  if (user?.role === 'student') {
    return <StudentClassesPage user={user} />;
  }

  return <AdminTeacherClassesPage user={user} />;
}

// ── New rich student view ─────────────────────────────────────────────────────
function StudentClassesPage({ user }) {
  const [classes, setClasses]       = useState([]);
  const [myApps,  setMyApps]        = useState([]);
  const [loading, setLoading]       = useState(true);
  const [countries, setCountries]   = useState([]);
  const [selectedCode, setSelectedCode] = useState('US');
  const [applyTarget, setApplyTarget]   = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

  useEffect(() => {
    countriesApi.list().then((r) => {
      setCountries(r.data || []);
      // Default to user's stored country if available
      if (user?.country_code) setSelectedCode(user.country_code);
    }).catch(() => {});
  }, [user?.country_code]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      publicApi.classes(selectedCode),
      applications.list(),
    ]).then(([cls, apps]) => {
      setClasses(cls.data || []);
      setMyApps(Array.isArray(apps.data) ? apps.data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedCode]);

  useEffect(() => { load(); }, [load]);

  const appByClass = useMemo(() => {
    const m = {};
    for (const a of myApps) m[a.class_id] = a;
    return m;
  }, [myApps]);

  const selectedCountry = countries.find((c) => c.code === selectedCode);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Classes</h1>
          <p className="text-sm text-gray-500">{classes.length} available</p>
        </div>
        {countries.length > 0 && (
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-xs text-gray-500">Prices for:</span>
            <select
              className="text-sm border-0 bg-transparent focus:outline-none font-medium text-gray-800"
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name} ({c.currency_code})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading classes…</div>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No classes available yet. Check back soon!</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((c) => (
            <StudentClassCard
              key={c.id}
              cls={c}
              myApp={appByClass[c.id]}
              selectedCountry={selectedCountry}
              onApply={() => {
                if (user?.fee_waiver_status === 'pending') {
                  setApplyTarget({ ...c, _waiverBlocked: true });
                } else {
                  setApplyTarget(c);
                }
              }}
              onView={() => setDetailTarget(c.id)}
            />
          ))}
        </div>
      )}

      {applyTarget && (
        <SharedApplyModal
          cls={applyTarget}
          countryCode={selectedCode}
          country={selectedCountry}
          onClose={() => setApplyTarget(null)}
          onApplied={() => { setApplyTarget(null); load(); }}
        />
      )}

      {detailTarget && (
        <StudentClassModal
          classId={detailTarget}
          onClose={() => { setDetailTarget(null); load(); }}
        />
      )}
    </div>
  );
}

function StudentClassCard({ cls, myApp, selectedCountry, onApply, onView }) {
  const [descExpanded, setDescExpanded] = useState(false);
  const CHAR_LIMIT = 140;
  const longDesc = cls.description && cls.description.length > CHAR_LIMIT;

  const ps  = myApp?.payment_status;
  const cfs = myApp?.class_fee_status;
  const st  = myApp?.status;

  const appFeeSettled = ['paid','waived','not_required'].includes(ps);
  const isEnrolled    = st === 'approved' || ['paid','full_scholarship','not_required'].includes(cfs);
  const isRejected    = st === 'rejected';
  const isSchPending  = cfs === 'scholarship_pending';
  const classFeeOwed  = myApp && appFeeSettled && cfs === 'pending_payment';
  const appFeeOwed    = myApp && !appFeeSettled;

  // Action button state
  let action;
  if (isEnrolled) {
    action = { label: '✓ Enrolled — Open', cls: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100', onClick: onView };
  } else if (classFeeOwed) {
    action = { label: 'Pay Class Fee →', cls: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100', onClick: onView };
  } else if (appFeeOwed) {
    action = { label: 'Complete Payment →', cls: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100', onClick: onView };
  } else if (isSchPending) {
    action = { label: '⏳ Scholarship Pending', cls: 'bg-purple-50 border-purple-200 text-purple-700', onClick: onView };
  } else if (isRejected) {
    action = { label: 'Application Rejected', cls: 'bg-red-50 border-red-200 text-red-700', onClick: onView };
  } else if (myApp) {
    action = { label: 'View Application', cls: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100', onClick: onView };
  } else {
    action = { label: 'Apply Now', cls: 'btn-primary', onClick: onApply };
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <div className="h-1.5 bg-gradient-to-r from-brand-500 to-accent-500" />

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="text-right ml-auto">
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
          <span className="inline-block text-xs font-bold tracking-wide text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md mb-1 self-start">
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
            <div className="space-y-1.5">
              {cls.schedules.map((s) => {
                const enrolled = Number(s.enrolled_count) || 0;
                const capacity = Number(s.capacity) || 0;
                const isFull   = capacity > 0 && enrolled >= capacity;
                const dateRange = formatDateRange(s.first_session_at || s.start_time, s.last_session_at);
                return (
                  <div key={s.session_code} className="text-xs">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="font-medium text-brand-600 w-14 shrink-0">{s.session_code}</span>
                      <span>{DAY_NAMES[s.day_of_week]}</span>
                      <span className="text-gray-400">·</span>
                      <span>{formatSlotTime(s.start_time)}–{formatSlotTime(s.end_time)} PST</span>
                      {s.teacher && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-gray-400">{s.teacher.split(' ').pop()}</span>
                        </>
                      )}
                    </div>
                    <div className="ml-16 text-[11px] text-gray-400">
                      {dateRange && <span>{dateRange}</span>}
                      {isFull && (
                        <>
                          {dateRange && <span className="mx-1.5">·</span>}
                          <span className="text-red-500 font-medium">Full</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-auto space-y-2">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {cls.teachers?.[0] && <span>🎓 {cls.teachers[0].name}</span>}
          </div>
          <button
            onClick={action.onClick}
            className={`w-full text-sm py-2 px-3 rounded-lg border font-medium transition-colors ${action.cls}`}
          >
            {action.label}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminTeacherClassesPage({ user }) {
  const [classList, setClassList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [regions, setRegions] = useState([]);

  const isAdmin   = ['admin', 'superadmin'].includes(user?.role);
  const isStudent = false;

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

        {/* Schedule */}
        {data.schedules && data.schedules.length > 0 && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Schedule</p>
            <div className="space-y-1.5">
              {data.schedules.map((s) => {
                const dateRange = formatDateRange(s.first_session_at || s.start_time, s.last_session_at);
                return (
                  <div key={s.session_code} className="text-sm">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-semibold text-brand-600 text-xs">{s.session_code}</span>
                      <span className="text-gray-700">{DAY_NAMES[s.day_of_week]}</span>
                      <span className="text-gray-400 text-xs">·</span>
                      <span className="text-gray-700">{formatSlotTime(s.start_time)}–{formatSlotTime(s.end_time)} PST</span>
                      {s.teacher && (
                        <>
                          <span className="text-gray-300 text-xs">·</span>
                          <span className="text-gray-500 text-xs">{s.teacher}</span>
                        </>
                      )}
                    </div>
                    {dateRange && (
                      <div className="text-xs text-gray-500 ml-12">{dateRange}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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
            <p className="text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Availability</p>
            <p className={`text-sm font-semibold ${isFull ? 'text-red-700' : 'text-green-700'}`}>
              {isFull ? 'Full' : 'Open'}
            </p>
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
                : 'Class fee payment required to complete enrollment'}
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

// ── Apply modal — auto-derives country from student profile ──────────────────
function ApplyModal({ classId, className, onClose, onBack, onApplied }) {
  const { user }                      = useAuth();
  const [feeInfo,  setFeeInfo]        = useState(null);
  const [feeReady, setFeeReady]       = useState(false);
  const [loading,  setLoading]        = useState(false);
  const [error,    setError]          = useState('');

  // Auto-fetch application fee using the country stored on the user's profile
  useEffect(() => {
    if (!user?.country_code) { setFeeReady(true); return; }
    publicApi.applicationFee(user.country_code)
      .then((r) => { setFeeInfo(r.data); setFeeReady(true); })
      .catch(() => setFeeReady(true));
  }, [user?.country_code]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await applications.apply(classId, null);
      onApplied(res.data);
    } catch (err) {
      const code = err.response?.data?.code;
      const msg  = err.response?.data?.error || 'Failed to submit application';
      if (code === 'VERIFICATION_PENDING') {
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

        {/* Country pill — read-only, derived from profile */}
        {user?.country_name && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-700">
            <span className="text-base">🌍</span>
            <div>
              <span className="font-medium">{user.country_name}</span>
              {user.currency_code && (
                <span className="text-gray-400 ml-1">· {user.currency_symbol}{user.currency_code}</span>
              )}
            </div>
          </div>
        )}

        {!feeReady && (
          <div className="text-xs text-gray-400 text-center py-2">Checking application fee…</div>
        )}

        {feeReady && feeInfo && feeInfo.fee > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
            <strong>One-time application fee: </strong>
            {feeInfo.currency_symbol}{Number(feeInfo.fee).toLocaleString()} {feeInfo.currency_code}
            <p className="text-xs mt-1 text-amber-600">
              This is a one-time fee. It is waived on all your future class applications.
            </p>
          </div>
        )}

        {feeReady && (!feeInfo || !feeInfo.fee || feeInfo.fee === 0) && (
          <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-700">
            ✓ No application fee required.
          </div>
        )}

        {!user?.country_name && feeReady && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700">
            No country is set on your profile. Update your profile to see applicable fees.
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onBack} className="btn-secondary flex-1">← Back</button>
          <button type="submit" disabled={loading || !feeReady} className="btn-primary flex-1">
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
          your request and may award a full scholarship (free enrollment) or a partial discount. You will
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
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

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
  const [editMaxStudents,  setEditMaxStudents]  = useState(false);
  const [maxStudentsVal,   setMaxStudentsVal]   = useState('');
  const [savingMaxStudents, setSavingMaxStudents] = useState(false);
  const [editDesc,    setEditDesc]    = useState(false);
  const [descVal,     setDescVal]     = useState('');
  const [savingDesc,  setSavingDesc]  = useState(false);

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
          <Row label="Subject"  value={data.subject || '—'} />
          <Row label="Level"    value={data.level   || '—'} />
          {/* Max Students — editable by admins */}
          <div className="py-1 border-b border-gray-50 flex items-center justify-between gap-2">
            <span className="text-gray-500 text-xs shrink-0">Max Students</span>
            {isAdmin && editMaxStudents ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  autoFocus
                  className="input w-20 text-sm py-0.5 px-2"
                  value={maxStudentsVal}
                  onChange={(e) => setMaxStudentsVal(e.target.value)}
                />
                <button
                  disabled={savingMaxStudents}
                  onClick={async () => {
                    const val = parseInt(maxStudentsVal);
                    if (!val || val < 1) return;
                    setSavingMaxStudents(true);
                    try {
                      await classesApi.update(classId, { max_students: val });
                      const res = await classesApi.get(classId);
                      setData(res.data);
                      onChanged();
                      setEditMaxStudents(false);
                    } catch {} finally { setSavingMaxStudents(false); }
                  }}
                  className="text-xs px-2 py-0.5 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
                >
                  {savingMaxStudents ? '…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditMaxStudents(false)}
                  className="text-xs px-2 py-0.5 border border-gray-200 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{data.max_students}</span>
                {isAdmin && (
                  <button
                    onClick={() => { setMaxStudentsVal(String(data.max_students)); setEditMaxStudents(true); }}
                    className="text-xs text-brand-500 hover:text-brand-700 hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
          <Row label="Enrolled" value={data.enrolled_count} />
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
          {/* Description — editable by admin/superadmin and assigned teacher */}
          <div className="py-1 border-b border-gray-50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500 text-xs font-medium">Description</span>
              {(isAdmin || isTeacher) && !editDesc && (
                <button
                  onClick={() => { setDescVal(data.description || ''); setEditDesc(true); }}
                  className="text-xs text-brand-500 hover:text-brand-700 hover:underline"
                >
                  {data.description ? 'Edit' : '+ Add'}
                </button>
              )}
            </div>
            {editDesc ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  rows={5}
                  className="input text-sm w-full"
                  value={descVal}
                  onChange={(e) => setDescVal(e.target.value)}
                  placeholder="Describe what students will learn in this class…"
                />
                <div className="flex gap-2">
                  <button
                    disabled={savingDesc}
                    onClick={async () => {
                      setSavingDesc(true);
                      try {
                        await classesApi.update(classId, { description: descVal });
                        const res = await classesApi.get(classId);
                        setData(res.data);
                        onChanged();
                        setEditDesc(false);
                      } catch {} finally { setSavingDesc(false); }
                    }}
                    className="text-xs px-3 py-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                  >
                    {savingDesc ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditDesc(false)}
                    className="text-xs px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 text-xs leading-relaxed">
                {data.description || <span className="text-gray-400 italic">No description yet.</span>}
              </p>
            )}
          </div>

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

/** Mirror of the backend generateOccurrences — used for live preview. */
function countOccurrences(startTime, recurringType, repeatUntil) {
  if (!startTime || recurringType === 'once' || !repeatUntil) return 1;
  const start = new Date(startTime);
  const until = new Date(repeatUntil);
  if (isNaN(start) || isNaN(until) || until <= start) return 1;
  function next(d) {
    const n = new Date(d);
    switch (recurringType) {
      case 'daily':    n.setDate(n.getDate() + 1);   break;
      case 'weekly':   n.setDate(n.getDate() + 7);   break;
      case 'biweekly': n.setDate(n.getDate() + 14);  break;
      case 'monthly':  n.setMonth(n.getMonth() + 1); break;
      default: return null;
    }
    return n;
  }
  let count = 1;
  let cursor = next(start);
  while (cursor && cursor <= until && count < 365) { count++; cursor = next(cursor); }
  return count;
}

// ── Create class modal — 3-step: details → schedule-prompt → schedule form ────
function CreateClassModal({ onClose, onCreated }) {
  // ── step 1: class details ─────────────────────────────────────────────────
  const [step,       setStep]       = useState('details'); // 'details' | 'prompt' | 'schedule'
  const [created,    setCreated]    = useState(null);       // the newly created class object

  const [form,       setForm]       = useState({ name: '', description: '', subject: '', level: '', maxStudents: 30 });
  const [price,      setPrice]      = useState('');
  const [prereqIds,  setPrereqIds]  = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  // ── step 3: schedule form ─────────────────────────────────────────────────
  const [sched, setSched] = useState({
    title: '', startTime: '', endTime: '',
    recurringType: 'once', repeatUntil: '', notes: '',
  });
  const [enableZoom,   setEnableZoom]   = useState(false);
  const [schedLoading, setSchedLoading] = useState(false);
  const [schedError,   setSchedError]   = useState('');
  const [zoomResult,   setZoomResult]   = useState(null); // { updated, failed }

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setS = (k, v) => setSched((s) => ({ ...s, [k]: v }));

  const isRecurring  = sched.recurringType !== 'once';
  const sessionCount = useMemo(
    () => countOccurrences(sched.startTime, sched.recurringType, sched.repeatUntil),
    [sched.startTime, sched.recurringType, sched.repeatUntil]
  );

  // Load all classes for prerequisite picker
  useEffect(() => {
    classesApi.list({ limit: 200 }).then((r) => setAllClasses(r.data.classes || [])).catch(() => {});
  }, []);

  const togglePrereq = (id) =>
    setPrereqIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  // ── Submit step 1: create the class ──────────────────────────────────────
  const submitDetails = async (e) => {
    e.preventDefault();
    if (!form.level) { setError('Please select a level.'); return; }
    setLoading(true); setError('');
    try {
      const res = await classesApi.create({ ...form, prerequisiteClassIds: prereqIds });
      const classId = res.data.id;
      if (price && parseFloat(price) > 0) {
        await classesApi.setPricing(classId, { price: parseFloat(price) });
      }
      setCreated(res.data);
      setStep('prompt');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create class');
    } finally { setLoading(false); }
  };

  // ── Submit step 3: create schedule (+ optional Zoom) ─────────────────────
  const submitSchedule = async (e) => {
    e.preventDefault();
    setSchedLoading(true); setSchedError(''); setZoomResult(null);
    try {
      const payload = {
        classId:       created.id,
        title:         sched.title || undefined,
        startTime:     new Date(sched.startTime).toISOString(),
        endTime:       new Date(sched.endTime).toISOString(),
        recurringType: sched.recurringType,
        notes:         sched.notes || undefined,
        repeatUntil:   (isRecurring && sched.repeatUntil)
                         ? new Date(sched.repeatUntil + 'T23:59:59').toISOString()
                         : undefined,
      };
      await schedulesApi.create(payload);

      if (enableZoom) {
        const zr = await schedulesApi.bulkZoom(created.id);
        setZoomResult(zr.data);
      }
      // Short pause so user sees the result, then close
      setTimeout(onCreated, enableZoom ? 1400 : 0);
    } catch (err) {
      setSchedError(err.response?.data?.error || 'Failed to create schedule');
    } finally { setSchedLoading(false); }
  };

  const availableForPrereq = allClasses.filter((c) => !prereqIds.includes(c.id));

  // ─────────────────────────────────────────────────────────────────────────
  // Step 2: schedule-prompt
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'prompt') {
    return (
      <Modal open title="Class Created!" onClose={onCreated} size="sm">
        <div className="space-y-5">
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
            <span className="text-3xl">🎉</span>
            <div>
              <p className="text-sm font-semibold text-green-800">{created.name}</p>
              <p className="text-xs text-green-700 mt-0.5">Your class has been created successfully.</p>
            </div>
          </div>
          <p className="text-sm text-gray-700 font-medium text-center">Would you like to schedule sessions for this class now?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setStep('schedule')}
              className="flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 border-brand-200 bg-brand-50 hover:border-brand-400 hover:bg-brand-100 transition-colors text-brand-700"
            >
              <span className="text-2xl">📅</span>
              <span className="text-sm font-semibold">Schedule now</span>
              <span className="text-xs text-brand-500 text-center">Set up sessions &amp; optionally enable Zoom</span>
            </button>
            <button
              onClick={onCreated}
              className="flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 transition-colors text-gray-600"
            >
              <span className="text-2xl">⏭</span>
              <span className="text-sm font-semibold">Skip for now</span>
              <span className="text-xs text-gray-400 text-center">You can schedule from the Schedules page later</span>
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 3: schedule form
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'schedule') {
    const freqLabel = { once: 'session', daily: 'daily sessions', weekly: 'weekly sessions', biweekly: 'bi-weekly sessions', monthly: 'monthly sessions' };

    return (
      <Modal open title={`Schedule — ${created.name}`} onClose={onCreated} size="lg">
        <form onSubmit={submitSchedule} className="space-y-4">
          {schedError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{schedError}</div>}

          {zoomResult && (
            <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-sm text-purple-700 flex items-center gap-2">
              <span>✅</span>
              <span>Zoom enabled for <strong>{zoomResult.updated}</strong> session{zoomResult.updated !== 1 ? 's' : ''}{zoomResult.failed > 0 ? ` (${zoomResult.failed} failed)` : ''}.</span>
            </div>
          )}

          {/* Session title */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Session Title <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className="input" placeholder="e.g. Chapter 1 Intro" value={sched.title} onChange={(e) => setS('title', e.target.value)} />
          </div>

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">First session starts *</label>
              <input type="datetime-local" className="input" value={sched.startTime}
                onChange={(e) => setS('startTime', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">First session ends *</label>
              <input type="datetime-local" className="input" value={sched.endTime}
                onChange={(e) => setS('endTime', e.target.value)} required />
            </div>
          </div>

          {/* Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
              <select className="input" value={sched.recurringType}
                onChange={(e) => { setS('recurringType', e.target.value); if (e.target.value === 'once') setS('repeatUntil', ''); }}>
                <option value="once">One-time only</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            {isRecurring && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Repeat until *</label>
                <input type="date" className="input" value={sched.repeatUntil}
                  min={sched.startTime ? sched.startTime.split('T')[0] : undefined}
                  onChange={(e) => setS('repeatUntil', e.target.value)} required />
              </div>
            )}
          </div>

          {/* Live session count preview */}
          {sched.startTime && sched.endTime && (
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
              sessionCount > 1 ? 'bg-brand-50 text-brand-700 border border-brand-100' : 'bg-gray-50 text-gray-600 border border-gray-100'
            }`}>
              <span className="text-base">{sessionCount > 1 ? '📅' : '📆'}</span>
              <span>
                {sessionCount === 1
                  ? 'Creates 1 session'
                  : `Creates ${sessionCount} ${freqLabel[sched.recurringType]}`}
                {sessionCount > 1 && sched.repeatUntil && (
                  <span className="font-normal opacity-70">
                    {' '}· ends {new Date(sched.repeatUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="input" rows={2} value={sched.notes} onChange={(e) => setS('notes', e.target.value)} />
          </div>

          {/* Zoom toggle */}
          <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
            enableZoom ? 'border-purple-300 bg-purple-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}>
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 accent-purple-600 shrink-0"
              checked={enableZoom}
              onChange={(e) => setEnableZoom(e.target.checked)}
            />
            <div>
              <p className="text-sm font-semibold text-gray-800">🎥 Enable Zoom for all sessions</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                A Zoom meeting will be automatically created for each session scheduled above.
                Enrolled students will receive the join link via notification.
              </p>
            </div>
          </label>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCreated} className="btn-secondary">Skip scheduling</button>
            <button type="submit" disabled={schedLoading} className="btn-primary flex-1">
              {schedLoading
                ? (enableZoom ? 'Creating sessions & Zoom…' : 'Creating sessions…')
                : `Create ${sessionCount} session${sessionCount !== 1 ? 's' : ''}${enableZoom ? ' + Zoom' : ''} →`}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1: class details form
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Modal open title="Create Class" onClose={onClose} size="lg">
      <form onSubmit={submitDetails} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Class Name *</label>
            <input className="input" value={form.name} onChange={(e) => setF('name', e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
            <input className="input" value={form.subject} onChange={(e) => setF('subject', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Level *</label>
            <select className="input" value={form.level} onChange={(e) => setF('level', e.target.value)} required>
              <option value="">Select level…</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setF('description', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Max Students</label>
            <input type="number" className="input" min="1" value={form.maxStudents} onChange={(e) => setF('maxStudents', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Class Price (USD)</label>
            <input type="number" className="input" min="0" step="any" placeholder="0 = free"
              value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>

        {/* Prerequisites */}
        {form.level && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Prerequisites
              <span className="text-gray-400 font-normal ml-1">— classes students must have completed first</span>
            </label>
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
            {availableForPrereq.length > 0 ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                {availableForPrereq.map((c) => (
                  <button key={c.id} type="button" onClick={() => togglePrereq(c.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50 hover:text-brand-700 transition-colors border-b border-gray-50 last:border-0">
                    <span className="text-gray-300 text-xs">＋</span>
                    <span className="flex-1">{c.name}</span>
                    {c.level && <span className="text-xs text-gray-400">{c.level}</span>}
                  </button>
                ))}
              </div>
            ) : prereqIds.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No other classes available to set as prerequisites.</p>
            ) : (
              <p className="text-xs text-gray-400 italic">All available classes selected.</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating…' : 'Create Class →'}
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
