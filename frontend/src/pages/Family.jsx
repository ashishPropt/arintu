import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { family as familyApi, applications as applicationsApi } from '../api';
import Modal from '../components/Modal';
import { format, formatDuration, intervalToDuration } from 'date-fns';

// ── Shared helpers ────────────────────────────────────────────────────────────

const ACCT_COLORS = {
  active:  'bg-green-50 text-green-700 border-green-100',
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  rejected:'bg-red-50 text-red-700 border-red-100',
};

const PAY_COLORS = {
  paid:            'bg-green-50 text-green-700',
  pending_payment: 'bg-amber-50 text-amber-700',
  waived:          'bg-blue-50 text-blue-700',
  not_required:    'bg-gray-50 text-gray-500',
  failed:          'bg-red-50 text-red-600',
};

function AccountBadge({ status }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${ACCT_COLORS[status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {status || 'unknown'}
    </span>
  );
}

function Tabs({ value, onChange, tabs }) {
  return (
    <div className="flex gap-1 mb-5 bg-gray-50 p-1 rounded-xl w-fit">
      {tabs.map(({ key, label, count }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            value === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {label}
          {count != null && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              value === key ? 'bg-brand-100 text-brand-700' : 'bg-gray-200 text-gray-500'
            }`}>
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Classes tab ───────────────────────────────────────────────────────────────

function ClassesTab({ classes }) {
  if (classes.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="text-4xl mb-2">📚</div>
        <p className="text-sm text-gray-400">Not enrolled in any classes yet.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {classes.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
          <div>
            <p className="font-medium text-sm text-gray-900">{c.class_name}</p>
            {c.subject && <p className="text-xs text-gray-400">{c.subject}</p>}
            <p className="text-xs text-gray-400 mt-0.5">
              Enrolled {c.enrolled_at ? format(new Date(c.enrolled_at), 'MMM d, yyyy') : '—'}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
            c.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {c.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Schedule tab ──────────────────────────────────────────────────────────────

function ScheduleTab({ sessions }) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="text-4xl mb-2">📅</div>
        <p className="text-sm text-gray-400">No upcoming sessions.</p>
      </div>
    );
  }

  // Group by date
  const byDate = sessions.reduce((acc, s) => {
    const day = format(new Date(s.start_time), 'yyyy-MM-dd');
    if (!acc[day]) acc[day] = [];
    acc[day].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(byDate).map(([day, daySessions]) => (
        <div key={day}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            {format(new Date(day + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
          </p>
          <div className="space-y-2">
            {daySessions.map((s) => {
              const start    = new Date(s.start_time);
              const end      = new Date(s.end_time);
              const durMins  = Math.round((end - start) / 60000);
              const durLabel = durMins >= 60
                ? `${Math.floor(durMins / 60)}h${durMins % 60 ? ` ${durMins % 60}m` : ''}`
                : `${durMins}m`;
              return (
                <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100">
                  {/* Time column */}
                  <div className="w-14 shrink-0 text-right">
                    <p className="text-sm font-semibold text-gray-800">{format(start, 'h:mm')}</p>
                    <p className="text-xs text-gray-400">{format(start, 'a')}</p>
                  </div>
                  {/* Divider */}
                  <div className="w-px bg-brand-200 self-stretch mx-1" />
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900">
                      {s.title || s.class_name}
                    </p>
                    {s.title && s.class_name !== s.title && (
                      <p className="text-xs text-gray-400">{s.class_name}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(start, 'h:mm a')} – {format(end, 'h:mm a')} · {durLabel}
                    </p>
                    {s.zoom_join_url && (
                      <a
                        href={s.zoom_join_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:underline"
                      >
                        🎥 Join Zoom
                      </a>
                    )}
                    {s.notes && (
                      <p className="text-xs text-gray-500 mt-1 italic">{s.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Applications tab ──────────────────────────────────────────────────────────

function ApplicationsTab({ apps, paying, onPayAppFee, onPayClassFee }) {
  if (apps.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="text-4xl mb-2">📋</div>
        <p className="text-sm text-gray-400">No applications yet.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {apps.map((a) => (
        <div key={a.id} className="border border-gray-100 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900">{a.class_name}</p>
              {a.subject && <p className="text-xs text-gray-400">{a.subject}</p>}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className={`text-xs px-2 py-0.5 rounded-full ${PAY_COLORS[a.payment_status] || 'bg-gray-50 text-gray-500'}`}>
                  App fee: {(a.payment_status || '—').replace(/_/g, ' ')}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${PAY_COLORS[a.class_fee_status] || 'bg-gray-50 text-gray-500'}`}>
                  Class fee: {(a.class_fee_status || '—').replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Applied {format(new Date(a.applied_at), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="shrink-0 flex flex-col gap-1.5">
              {a.payment_status === 'pending_payment' && (
                <button
                  onClick={() => onPayAppFee(a)}
                  disabled={paying === a.id}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  {paying === a.id ? 'Redirecting…' : 'Pay App Fee'}
                </button>
              )}
              {a.class_fee_status === 'pending_payment' && (
                <button
                  onClick={() => onPayClassFee(a)}
                  disabled={paying === a.id}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  {paying === a.id ? 'Redirecting…' : 'Pay Class Fee'}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Child details modal (tabbed) ──────────────────────────────────────────────

function ChildDetailsModal({ child, onClose }) {
  const [tab,      setTab]      = useState('classes');
  const [classes,  setClasses]  = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [apps,     setApps]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [paying,   setPaying]   = useState(null);

  useEffect(() => {
    Promise.all([
      familyApi.childClasses(child.id),
      familyApi.childSchedule(child.id),
      familyApi.childApplications(child.id),
    ])
      .then(([c, s, a]) => {
        setClasses(c.data);
        setSchedule(s.data);
        setApps(a.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [child.id]);

  const payAppFee = async (app) => {
    setPaying(app.id);
    try {
      const res = await applicationsApi.retryAppFee(app.id);
      if (res.data.checkoutUrl) window.location.href = res.data.checkoutUrl;
    } catch (err) {
      alert(err.response?.data?.error || 'Payment failed');
    } finally { setPaying(null); }
  };

  const payClassFee = async (app) => {
    setPaying(app.id);
    try {
      const res = await applicationsApi.payClassFee(app.id);
      if (res.data.checkoutUrl) window.location.href = res.data.checkoutUrl;
    } catch (err) {
      alert(err.response?.data?.error || 'Payment failed');
    } finally { setPaying(null); }
  };

  return (
    <Modal open title={child.name} onClose={onClose} size="lg">
      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading…</div>
      ) : (
        <>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'classes',      label: 'Classes',      count: classes.length  },
              { key: 'schedule',     label: 'Schedule',     count: schedule.length },
              { key: 'applications', label: 'Applications', count: apps.length     },
            ]}
          />

          {tab === 'classes'      && <ClassesTab classes={classes} />}
          {tab === 'schedule'     && <ScheduleTab sessions={schedule} />}
          {tab === 'applications' && (
            <ApplicationsTab
              apps={apps}
              paying={paying}
              onPayAppFee={payAppFee}
              onPayClassFee={payClassFee}
            />
          )}
        </>
      )}
    </Modal>
  );
}

// ── Add-family modal ──────────────────────────────────────────────────────────

function AddFamilyModal({ open, onClose, type, onSuccess }) {
  const [email,   setEmail]   = useState('');
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const reset = () => { setEmail(''); setName(''); setPhone(''); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fn  = type === 'child' ? familyApi.addChild : familyApi.addParent;
      const res = await fn({ email, name: name || undefined, phone: phone || undefined });
      reset();
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const title  = type === 'child' ? 'Add Child'  : 'Add Parent';
  const target = type === 'child' ? 'child'      : 'parent';

  return (
    <Modal open={open} title={title} onClose={() => { reset(); onClose(); }} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-500">
          Enter the {target}'s email. If they already have an Arintu account it will be
          linked. Otherwise a new account will be created and they'll receive login
          credentials by email.
        </p>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input type="email" className="input" placeholder={`${target}@example.com`}
            value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Full Name{' '}
            <span className="text-xs text-gray-400">(required if creating new account)</span>
          </label>
          <input className="input"
            placeholder={`${type === 'child' ? "Child's" : "Parent's"} full name`}
            value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Phone <span className="text-xs text-gray-400">(optional)</span>
          </label>
          <input type="tel" className="input" placeholder="+1 555 000 0000"
            value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => { reset(); onClose(); }} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving…' : title}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Parent view ───────────────────────────────────────────────────────────────

function ParentView() {
  const [children,   setChildren]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showAdd,    setShowAdd]    = useState(false);
  const [detailsFor, setDetailsFor] = useState(null); // child object

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await familyApi.children();
      setChildren(r.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Children</h1>
          <p className="text-sm text-gray-500">
            View your children's classes and schedule, and pay fees on their behalf
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          + Add Child
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : children.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">👨‍👧</div>
          <p className="text-gray-500 text-sm mb-4">No children linked yet.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            Add Your First Child
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {children.map((child) => (
            <div key={child.id} className="card p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-gray-900 text-sm">{child.name}</p>
                    <AccountBadge status={child.account_status} />
                  </div>
                  <p className="text-xs text-gray-500">{child.email}</p>
                  {child.account_status !== 'active' && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⏳ Account pending ID verification
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setDetailsFor(child)}
                  className="btn-secondary text-xs py-1.5 px-3 shrink-0"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddFamilyModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        type="child"
        onSuccess={() => { setShowAdd(false); load(); }}
      />
      {detailsFor && (
        <ChildDetailsModal child={detailsFor} onClose={() => setDetailsFor(null)} />
      )}
    </div>
  );
}

// ── Student view ──────────────────────────────────────────────────────────────

function StudentView() {
  const [parent,  setParent]  = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await familyApi.parent();
      setParent(r.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Parent / Guardian</h1>
          <p className="text-sm text-gray-500">
            Link your parent or guardian so they can monitor your progress and pay on your behalf
          </p>
        </div>
        {!parent && !loading && (
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            + Add Parent
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : !parent ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">👨‍👩‍👦</div>
          <p className="text-gray-500 text-sm mb-4">No parent or guardian linked yet.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            Add Parent / Guardian
          </button>
        </div>
      ) : (
        <div className="card p-5 max-w-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
              {parent.name?.[0]?.toUpperCase() || 'P'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-semibold text-gray-900">{parent.name}</p>
                <AccountBadge status={parent.account_status} />
              </div>
              <p className="text-xs text-gray-500">{parent.email}</p>
              {parent.account_status !== 'active' && (
                <p className="text-xs text-amber-600 mt-1">
                  ⏳ Parent account pending ID verification
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <AddFamilyModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        type="parent"
        onSuccess={() => { setShowAdd(false); load(); }}
      />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function Family() {
  const { user } = useAuth();

  if (user?.role === 'parent')  return <ParentView />;
  if (user?.role === 'student') return <StudentView />;

  return (
    <div className="text-center py-16 text-gray-400">
      Family management is available for student and parent accounts.
    </div>
  );
}
