import { useState, useEffect, useCallback, useMemo } from 'react';
import { schedules as schedulesApi, classes as classesApi } from '../api';

import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

/**
 * Mirror of the backend generateOccurrences — used for the live preview.
 */
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

export default function Schedules() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showCreate,    setShowCreate]    = useState(false);
  const [showZoomSetup, setShowZoomSetup] = useState(false);
  const [myClasses, setMyClasses] = useState([]);

  // Admins + teachers can create sessions; admins also get the delete button
  const canCreateSchedule = ['admin', 'superadmin', 'teacher'].includes(user?.role);
  const canCreateZoom     = ['admin', 'superadmin', 'teacher'].includes(user?.role);
  const isAdmin           = ['admin', 'superadmin'].includes(user?.role);

  const [upcoming, setUpcoming] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Use end-of-day for the `to` param so Sunday sessions aren't cut off
      const from = week.toISOString();
      const to   = new Date(addDays(week, 6).setHours(23, 59, 59, 999)).toISOString();
      const res  = await schedulesApi.list({ from, to });
      setItems(res.data || []);
    } catch {} finally { setLoading(false); }
  }, [week]);

  // Load upcoming sessions (for the list panel and for auto-jump)
  const loadUpcoming = useCallback(async () => {
    try {
      const res = await schedulesApi.list({ from: new Date().toISOString() });
      setUpcoming(res.data || []);
      return res.data || [];
    } catch { return []; }
  }, []);

  // Jump the calendar to the week containing the next upcoming session
  const jumpToNextSession = useCallback(async () => {
    const sessions = await loadUpcoming();
    if (sessions.length === 0) return;
    const nextStart = new Date(sessions[0].start_time);
    setWeek(startOfWeek(nextStart, { weekStartsOn: 1 }));
  }, [loadUpcoming]);

  // On mount: load upcoming and auto-jump if current week is empty
  useEffect(() => {
    loadUpcoming().then((sessions) => {
      if (sessions.length === 0) return;
      // Check if any session falls in the current week; if not, jump to the first one
      const weekEnd = new Date(addDays(week, 6).setHours(23, 59, 59, 999));
      const hasThisWeek = sessions.some((s) => {
        const t = new Date(s.start_time);
        return t >= week && t <= weekEnd;
      });
      if (!hasThisWeek) {
        const nextStart = new Date(sessions[0].start_time);
        setWeek(startOfWeek(nextStart, { weekStartsOn: 1 }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (canCreateSchedule) classesApi.list({ limit: 100 }).then((r) => setMyClasses(r.data.classes || [])).catch(() => {});
  }, [canCreateSchedule]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(week, i));

  const getItemsForDay = (day) => items.filter((s) => isSameDay(new Date(s.start_time), day));

  const createZoom = async (scheduleId) => {
    try {
      await schedulesApi.createZoom(scheduleId);
      load();
      alert('Zoom meeting created and notifications sent!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create Zoom meeting. Configure Zoom credentials first.');
    }
  };

  const bulkZoom = async (classId) => {
    const res = await schedulesApi.bulkZoom(classId);
    load();
    return res.data; // let callers handle feedback
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Schedule</h1>
          <p className="text-sm text-gray-500">
            {format(week, 'MMM d')} — {format(addDays(week, 6), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeek((w) => addDays(w, -7))} className="btn-secondary px-3">←</button>
          <button onClick={() => setWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="btn-secondary px-3 text-xs">Today</button>
          <button onClick={jumpToNextSession} className="btn-secondary px-3 text-xs" title="Jump to next scheduled session">Next Session →</button>
          <button onClick={() => setWeek((w) => addDays(w, 7))} className="btn-secondary px-3">→</button>
          {canCreateZoom && (
            <button onClick={() => setShowZoomSetup(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-colors">
              🎥 Zoom Setup
            </button>
          )}
          {canCreateSchedule && <button onClick={() => setShowCreate(true)} className="btn-primary">+ Schedule</button>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {weekDays.map((day) => (
            <div key={day.toISOString()} className={`p-3 text-center border-r border-gray-50 last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-brand-50' : ''}`}>
              <p className="text-xs text-gray-500">{format(day, 'EEE')}</p>
              <p className={`text-lg font-bold ${isSameDay(day, new Date()) ? 'text-brand-600' : 'text-gray-900'}`}>
                {format(day, 'd')}
              </p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-48">
          {weekDays.map((day) => {
            const dayItems = getItemsForDay(day);
            return (
              <div key={day.toISOString()} className="p-2 border-r border-gray-50 last:border-r-0 space-y-1 min-h-48">
                {dayItems.map((s) => (
                  <ScheduleCard key={s.id} schedule={s} isAdmin={isAdmin} canCreateZoom={canCreateZoom} onCreateZoom={createZoom} onDeleted={load} />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming sessions list */}
      {upcoming.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Upcoming Sessions</h2>
          <div className="space-y-2">
            {upcoming.slice(0, 10).map((s) => (
              <div key={s.id} className="card p-3 flex items-center gap-3">
                <div className="text-center min-w-[3rem]">
                  <p className="text-xs text-gray-400 uppercase">{format(new Date(s.start_time), 'EEE')}</p>
                  <p className="text-lg font-bold text-brand-600 leading-none">{format(new Date(s.start_time), 'd')}</p>
                  <p className="text-xs text-gray-400">{format(new Date(s.start_time), 'MMM')}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.class_name}</p>
                    {s.session_code && (
                      <span className="shrink-0 text-[10px] font-mono bg-gray-100 text-gray-500 px-1 py-0.5 rounded">
                        {s.session_code}
                      </span>
                    )}
                  </div>
                  {s.teacher_name && <p className="text-xs text-gray-500 truncate">👤 {s.teacher_name}</p>}
                  <p className="text-xs text-gray-400">
                    {format(new Date(s.start_time), 'h:mm a')} – {format(new Date(s.end_time), 'h:mm a')}
                  </p>
                </div>
                <button
                  onClick={() => setWeek(startOfWeek(new Date(s.start_time), { weekStartsOn: 1 }))}
                  className="text-xs text-brand-600 hover:underline shrink-0"
                >
                  View week →
                </button>
                {s.zoom_join_url && (
                  <a href={s.zoom_join_url} target="_blank" rel="noreferrer"
                    className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-lg font-medium shrink-0">
                    Join Zoom
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <CreateScheduleModal
          classes={myClasses}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
          onBulkZoom={bulkZoom}
        />
      )}

      {showZoomSetup && (
        <ZoomSetupModal
          classes={myClasses}
          onClose={() => setShowZoomSetup(false)}
          onBulkZoom={bulkZoom}
        />
      )}
    </div>
  );
}

function ScheduleCard({ schedule: s, isAdmin, canCreateZoom, onCreateZoom, onDeleted }) {
  return (
    <div className="bg-brand-50 border border-brand-100 rounded-lg p-2 text-xs group">
      <div className="flex items-start justify-between gap-1">
        <p className="font-semibold text-brand-900 truncate leading-tight">{s.class_name}</p>
        {s.session_code && (
          <span className="shrink-0 text-[10px] font-mono bg-brand-100 text-brand-700 px-1 py-0.5 rounded">
            {s.session_code}
          </span>
        )}
      </div>
      <p className="text-brand-600">{format(new Date(s.start_time), 'h:mm')}–{format(new Date(s.end_time), 'h:mm a')}</p>
      {s.teacher_name && (
        <p className="text-gray-500 truncate flex items-center gap-0.5">
          <span>👤</span> {s.teacher_name}
        </p>
      )}
      {s.title && !s.session_code && <p className="text-brand-700 truncate">{s.title}</p>}
      <div className="mt-1 flex flex-wrap gap-1">
        {s.zoom_join_url ? (
          <a href={s.zoom_join_url} target="_blank" rel="noopener noreferrer"
            className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium hover:bg-purple-200">
            Join Zoom
          </a>
        ) : canCreateZoom ? (
          <button onClick={() => onCreateZoom(s.id)}
            className="px-1.5 py-0.5 bg-white border border-gray-200 text-gray-600 rounded hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200">
            + Zoom
          </button>
        ) : null}
        {isAdmin && (
          <button onClick={async () => { await schedulesApi.remove(s.id); onDeleted(); }}
            className="px-1.5 py-0.5 bg-white border border-gray-200 text-gray-400 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function CreateScheduleModal({ classes, onClose, onCreated, onBulkZoom }) {
  const [form, setForm] = useState({
    classId: '', title: '', startTime: '', endTime: '',
    recurringType: 'once', repeatUntil: '', notes: '', teacherId: '',
  });
  const [enableZoom,    setEnableZoom]    = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [zoomBusy,      setZoomBusy]      = useState(false);
  const [classTeachers, setClassTeachers] = useState([]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Load teachers for the selected class
  useEffect(() => {
    if (!form.classId) { setClassTeachers([]); set('teacherId', ''); return; }
    classesApi.get(form.classId)
      .then((r) => {
        const teachers = r.data.teachers || [];
        setClassTeachers(teachers);
        // Auto-select if only one teacher
        if (teachers.length === 1) set('teacherId', teachers[0].id);
        else set('teacherId', '');
      })
      .catch(() => setClassTeachers([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.classId]);

  // When the start date/time changes, keep endTime on the same calendar date
  // (just shift the date portion so the duration stays sensible).
  const handleStartChange = (newStart) => {
    set('startTime', newStart);
    if (newStart && form.endTime) {
      const startDate = newStart.split('T')[0];
      const endTimePart = form.endTime.split('T')[1] || '';
      if (endTimePart) set('endTime', `${startDate}T${endTimePart}`);
    } else if (newStart && !form.endTime) {
      // Pre-fill endTime as start + 1 hour
      const startDate = new Date(newStart);
      startDate.setHours(startDate.getHours() + 1);
      const pad = (n) => String(n).padStart(2, '0');
      set('endTime', `${newStart.split('T')[0]}T${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`);
    }
  };

  const isRecurring    = form.recurringType !== 'once';
  const minRepeatUntil = form.startTime ? form.startTime.split('T')[0] : undefined;

  const sessionCount = useMemo(
    () => countOccurrences(form.startTime, form.recurringType, form.repeatUntil),
    [form.startTime, form.recurringType, form.repeatUntil]
  );

  const freqLabel = {
    once: 'session', daily: 'daily sessions', weekly: 'weekly sessions',
    biweekly: 'bi-weekly sessions', monthly: 'monthly sessions',
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    // Client-side guard: end must be after start
    if (form.endTime && form.startTime && new Date(form.endTime) <= new Date(form.startTime)) {
      setError('Session end time must be after the start time.');
      setLoading(false);
      return;
    }
    try {
      const payload = {
        classId:       form.classId,
        title:         form.title || undefined,
        startTime:     new Date(form.startTime).toISOString(),
        endTime:       new Date(form.endTime).toISOString(),
        recurringType: form.recurringType,
        notes:         form.notes || undefined,
        repeatUntil:   (isRecurring && form.repeatUntil)
                         ? new Date(form.repeatUntil + 'T23:59:59').toISOString()
                         : undefined,
        teacherId:     form.teacherId || undefined,
      };
      await schedulesApi.create(payload);

      if (enableZoom && form.classId && onBulkZoom) {
        setZoomBusy(true);
        await onBulkZoom(form.classId);
        setZoomBusy(false);
      }

      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create schedule');
      setZoomBusy(false);
    } finally { setLoading(false); }
  };

  return (
    <Modal open title="Schedule Sessions" onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        {/* Class */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Class *</label>
          <select className="input" value={form.classId} onChange={(e) => set('classId', e.target.value)} required>
            <option value="">Select a class…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code ? `${c.code} — ` : ''}{c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Teacher (shown when class has teachers assigned) */}
        {classTeachers.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Teacher {classTeachers.length > 1 ? '*' : ''}
            </label>
            <select className="input" value={form.teacherId}
              onChange={(e) => set('teacherId', e.target.value)}
              required={classTeachers.length > 1}>
              {classTeachers.length > 1 && <option value="">Select teacher…</option>}
              {classTeachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {classTeachers.length > 1 && (
              <p className="text-xs text-gray-400 mt-1">
                This class has {classTeachers.length} teachers — sessions can have different teachers.
              </p>
            )}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Session Title <span className="text-gray-400 font-normal">(optional)</span></label>
          <input className="input" placeholder="e.g. Chapter 3 Review" value={form.title} onChange={(e) => set('title', e.target.value)} />
        </div>

        {/* Start / End */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">First session starts *</label>
            <input type="datetime-local" className="input" value={form.startTime}
              onChange={(e) => handleStartChange(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">First session ends *</label>
            <input type="datetime-local" className="input" value={form.endTime}
              onChange={(e) => set('endTime', e.target.value)} required />
          </div>
        </div>

        {/* Frequency */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
            <select className="input" value={form.recurringType}
              onChange={(e) => { set('recurringType', e.target.value); if (e.target.value === 'once') set('repeatUntil', ''); }}>
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
              <input type="date" className="input" value={form.repeatUntil}
                min={minRepeatUntil}
                onChange={(e) => set('repeatUntil', e.target.value)}
                required={isRecurring} />
            </div>
          )}
        </div>

        {/* Live preview pill */}
        {(form.startTime && form.endTime) && (
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
            sessionCount > 1 ? 'bg-brand-50 text-brand-700 border border-brand-100' : 'bg-gray-50 text-gray-600 border border-gray-100'
          }`}>
            <span className="text-base">{sessionCount > 1 ? '📅' : '📆'}</span>
            <span>
              {sessionCount === 1 ? 'Creates 1 session' : `Creates ${sessionCount} ${freqLabel[form.recurringType]}`}
              {sessionCount > 1 && form.repeatUntil && (
                <span className="font-normal opacity-70">
                  {' '}· ends {new Date(form.repeatUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
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
              Creates a Zoom meeting for every upcoming session of the selected class (including any
              previously scheduled sessions without Zoom). Students will be notified with the join link.
            </p>
          </div>
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading || zoomBusy} className="btn-primary">
            {loading || zoomBusy
              ? (zoomBusy ? 'Setting up Zoom…' : 'Creating…')
              : `${sessionCount > 1 ? `Create ${sessionCount} sessions` : 'Create session'}${enableZoom ? ' + Zoom' : ''}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Zoom Setup Modal — bulk-enable Zoom for all sessions of a class ───────────
function ZoomSetupModal({ classes, onClose, onBulkZoom }) {
  const [classId, setClassId] = useState('');
  const [busy,    setBusy]    = useState(false);
  const [result,  setResult]  = useState(null);  // { updated, failed } after run
  const [error,   setError]   = useState('');

  const run = async () => {
    if (!classId) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const data = await onBulkZoom(classId);
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to set up Zoom. Check Zoom credentials.');
    } finally { setBusy(false); }
  };

  const selectedClass = classes.find((c) => c.id === classId);

  return (
    <Modal open title="🎥 Zoom Setup" onClose={onClose} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          Select a class to automatically create a Zoom meeting for every upcoming session
          that doesn't already have one. Enrolled students will receive the join link via notification.
        </p>

        {/* Class picker */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Select Class *</label>
          <select
            className="input"
            value={classId}
            onChange={(e) => { setClassId(e.target.value); setResult(null); setError(''); }}
            disabled={busy}
          >
            <option value="">Choose a class…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.level ? ` — ${c.level}` : ''}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>
        )}

        {/* Result */}
        {result && !error && (
          <div className={`p-4 rounded-xl border ${result.updated > 0 ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
            {result.updated > 0 ? (
              <>
                <p className="text-sm font-semibold text-green-800 mb-1">
                  ✅ Zoom enabled for {result.updated} session{result.updated !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-green-700">
                  Students enrolled in <strong>{selectedClass?.name}</strong> have been notified with their Zoom join links.
                </p>
                {result.failed > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ {result.failed} session{result.failed !== 1 ? 's' : ''} could not be set up — check your Zoom API credentials.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-amber-700">
                No upcoming sessions without Zoom found for this class.
                All sessions may already have Zoom meetings set up.
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={run}
              disabled={!classId || busy}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Setting up Zoom…
                </>
              ) : (
                '🎥 Enable Zoom for all sessions'
              )}
            </button>
          )}
          {result && result.updated > 0 && (
            <button
              onClick={() => { setClassId(''); setResult(null); }}
              className="flex-1 btn-secondary"
            >
              Set up another class
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
