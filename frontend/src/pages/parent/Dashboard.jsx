import { useState, useEffect, useCallback } from 'react';
import { family as familyApi, applications as applicationsApi } from '../../api';
import { format } from 'date-fns';

// ── Shared helpers ─────────────────────────────────────────────────────────────

const PAY_COLORS = {
  paid:            'bg-green-50 text-green-700',
  pending_payment: 'bg-amber-50 text-amber-700',
  waived:          'bg-blue-50 text-blue-700',
  not_required:    'bg-gray-50 text-gray-500',
  failed:          'bg-red-50 text-red-600',
};

const ACCT_COLORS = {
  active:   'bg-green-50 text-green-700 border-green-100',
  pending:  'bg-amber-50 text-amber-700 border-amber-100',
  rejected: 'bg-red-50 text-red-700 border-red-100',
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
    <div className="flex gap-1 mb-4 bg-gray-50 p-1 rounded-xl w-fit">
      {tabs.map(({ key, label, count }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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

// ── Classes panel ──────────────────────────────────────────────────────────────

function ClassesPanel({ classes }) {
  if (classes.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-3xl mb-2">📚</div>
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

// ── Schedule panel ─────────────────────────────────────────────────────────────

function SchedulePanel({ sessions }) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-3xl mb-2">📅</div>
        <p className="text-sm text-gray-400">No upcoming sessions.</p>
      </div>
    );
  }

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
              const start   = new Date(s.start_time);
              const end     = new Date(s.end_time);
              const durMins = Math.round((end - start) / 60000);
              const durLabel = durMins >= 60
                ? `${Math.floor(durMins / 60)}h${durMins % 60 ? ` ${durMins % 60}m` : ''}`
                : `${durMins}m`;
              return (
                <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100">
                  <div className="w-12 shrink-0 text-right">
                    <p className="text-sm font-semibold text-gray-800">{format(start, 'h:mm')}</p>
                    <p className="text-xs text-gray-400">{format(start, 'a')}</p>
                  </div>
                  <div className="w-px bg-brand-200 self-stretch mx-1" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900">{s.title || s.class_name}</p>
                    {s.title && s.class_name !== s.title && (
                      <p className="text-xs text-gray-400">{s.class_name}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(start, 'h:mm a')} – {format(end, 'h:mm a')} · {durLabel}
                    </p>
                    {s.zoom_join_url && (
                      <a href={s.zoom_join_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1.5 text-xs text-purple-600 hover:underline">
                        🎥 Join Zoom
                      </a>
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

// ── Applications panel ─────────────────────────────────────────────────────────

function ApplicationsPanel({ apps, paying, onPayAppFee, onPayClassFee }) {
  if (apps.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-3xl mb-2">📋</div>
        <p className="text-sm text-gray-400">No applications yet.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {apps.map((a) => (
        <div key={a.id} className="border border-gray-100 rounded-xl p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900">{a.class_name}</p>
              {a.subject && <p className="text-xs text-gray-400">{a.subject}</p>}
              <div className="flex flex-wrap gap-1.5 mt-1">
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
            <div className="shrink-0 flex flex-col gap-1">
              {a.payment_status === 'pending_payment' && (
                <button onClick={() => onPayAppFee(a)} disabled={paying === a.id}
                  className="btn-primary text-xs py-1 px-3">
                  {paying === a.id ? 'Redirecting…' : 'Pay App Fee'}
                </button>
              )}
              {a.class_fee_status === 'pending_payment' && (
                <button onClick={() => onPayClassFee(a)} disabled={paying === a.id}
                  className="btn-primary text-xs py-1 px-3">
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

// ── Inline child dashboard ─────────────────────────────────────────────────────

function ChildDashboard({ child }) {
  const [tab,      setTab]      = useState('classes');
  const [classes,  setClasses]  = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [apps,     setApps]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [paying,   setPaying]   = useState(null);

  useEffect(() => {
    if (!expanded) return;           // lazy-load: only fetch when expanded
    Promise.all([
      familyApi.childClasses(child.id),
      familyApi.childSchedule(child.id),
      familyApi.childApplications(child.id),
    ])
      .then(([c, s, a]) => {
        setClasses(c.data || []);
        setSchedule(s.data || []);
        setApps(a.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id, expanded]);

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
    <div className="card overflow-hidden">
      {/* Child header bar */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-sm shrink-0">
            {child.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900 text-sm">{child.name}</p>
              <AccountBadge status={child.account_status} />
            </div>
            <p className="text-xs text-gray-400">{child.email}</p>
          </div>
        </div>
        <span className="text-xs text-gray-400 shrink-0">
          {expanded ? '▲ Collapse' : '▼ Expand'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4">
          {child.account_status !== 'active' ? (
            <div className="py-6 text-center">
              <div className="text-3xl mb-2">⏳</div>
              <p className="text-sm text-gray-500 font-medium">Account pending activation</p>
              <p className="text-xs text-gray-400 mt-1">
                {child.name}'s account must be activated before classes are visible.
              </p>
            </div>
          ) : loading ? (
            <div className="py-8 text-center text-gray-400">Loading…</div>
          ) : (
            <>
              {/* Quick-stats row */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="rounded-xl bg-brand-50 p-3 text-center">
                  <p className="text-xl font-bold text-brand-600">{classes.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Classes</p>
                </div>
                <div className="rounded-xl bg-green-50 p-3 text-center">
                  <p className="text-xl font-bold text-green-600">{schedule.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Upcoming</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3 text-center">
                  <p className="text-xl font-bold text-amber-600">{apps.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Applications</p>
                </div>
              </div>

              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { key: 'classes',      label: 'Classes',      count: classes.length  },
                  { key: 'schedule',     label: 'Schedule',     count: schedule.length },
                  { key: 'applications', label: 'Applications', count: apps.length     },
                ]}
              />

              {tab === 'classes'      && <ClassesPanel classes={classes} />}
              {tab === 'schedule'     && <SchedulePanel sessions={schedule} />}
              {tab === 'applications' && (
                <ApplicationsPanel
                  apps={apps}
                  paying={paying}
                  onPayAppFee={payAppFee}
                  onPayClassFee={payClassFee}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main parent dashboard ──────────────────────────────────────────────────────

export default function ParentDashboard() {
  const [children, setChildren] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await familyApi.children();
      setChildren(r.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">My Children's Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Classes, schedules and applications for each of your children
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : children.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">👨‍👧</div>
          <p className="text-gray-500 text-sm mb-2">No children linked to your account yet.</p>
          <p className="text-xs text-gray-400 mb-5">
            Go to <strong>My Family</strong> in the sidebar to add your children.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {children.map((child) => (
            <ChildDashboard key={child.id} child={child} />
          ))}
        </div>
      )}
    </div>
  );
}
