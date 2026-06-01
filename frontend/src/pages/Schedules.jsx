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
  const [showCreate, setShowCreate] = useState(false);
  const [myClasses, setMyClasses] = useState([]);

  // Admins + teachers can create sessions; admins also get the delete button
  const canCreateSchedule = ['admin', 'superadmin', 'teacher'].includes(user?.role);
  const canCreateZoom     = ['admin', 'superadmin', 'teacher'].includes(user?.role);
  const isAdmin           = ['admin', 'superadmin'].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = week.toISOString();
      const to = addDays(week, 6).toISOString();
      const res = await schedulesApi.list({ from, to });
      setItems(res.data || []);
    } catch {} finally { setLoading(false); }
  }, [week]);

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
    try {
      const res = await schedulesApi.bulkZoom(classId);
      load();
      const { updated, failed } = res.data;
      if (updated === 0) alert('No upcoming sessions without Zoom found for this class.');
      else alert(`✅ Zoom enabled for ${updated} session${updated !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed — check Zoom credentials)` : ''}. Students have been notified.`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to set up Zoom. Make sure Zoom credentials are configured on the server.');
    }
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
          <button onClick={() => setWeek((w) => addDays(w, 7))} className="btn-secondary px-3">→</button>
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

      {showCreate && (
        <CreateScheduleModal
          classes={myClasses}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
          onBulkZoom={bulkZoom}
        />
      )}
    </div>
  );
}

function ScheduleCard({ schedule: s, isAdmin, canCreateZoom, onCreateZoom, onDeleted }) {
  return (
    <div className="bg-brand-50 border border-brand-100 rounded-lg p-2 text-xs group">
      <p className="font-semibold text-brand-900 truncate">{s.class_name}</p>
      <p className="text-brand-600">{format(new Date(s.start_time), 'h:mm')}–{format(new Date(s.end_time), 'h:mm a')}</p>
      {s.title && <p className="text-brand-700 truncate">{s.title}</p>}
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
    recurringType: 'once', repeatUntil: '', notes: '',
  });
  const [enableZoom, setEnableZoom] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [zoomBusy,   setZoomBusy]   = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

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
              onChange={(e) => set('startTime', e.target.value)} required />
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
