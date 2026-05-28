import { useState, useEffect, useCallback } from 'react';
import { schedules as schedulesApi, classes as classesApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

export default function Schedules() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showCreate, setShowCreate] = useState(false);
  const [myClasses, setMyClasses] = useState([]);
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);

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
    if (isAdmin) classesApi.list({ limit: 100 }).then((r) => setMyClasses(r.data.classes || [])).catch(() => {});
  }, [isAdmin]);

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
          {isAdmin && <button onClick={() => setShowCreate(true)} className="btn-primary">+ Schedule</button>}
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
                  <ScheduleCard key={s.id} schedule={s} isAdmin={isAdmin} onCreateZoom={createZoom} onDeleted={load} />
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
        />
      )}
    </div>
  );
}

function ScheduleCard({ schedule: s, isAdmin, onCreateZoom, onDeleted }) {
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
        ) : isAdmin ? (
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

function CreateScheduleModal({ classes, onClose, onCreated }) {
  const [form, setForm] = useState({
    classId: '', title: '', startTime: '', endTime: '',
    recurringType: 'once', notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await schedulesApi.create({ ...form, startTime: new Date(form.startTime).toISOString(), endTime: new Date(form.endTime).toISOString() });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <Modal open title="Schedule a Session" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Class *</label>
          <select className="input" value={form.classId} onChange={(e) => set('classId', e.target.value)} required>
            <option value="">Select a class…</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Session Title (optional)</label>
          <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start *</label>
            <input type="datetime-local" className="input" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End *</label>
            <input type="datetime-local" className="input" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Recurring</label>
          <select className="input" value={form.recurringType} onChange={(e) => set('recurringType', e.target.value)}>
            <option value="once">One-time</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Create Session'}</button>
        </div>
      </form>
    </Modal>
  );
}
