import { useState, useEffect, useCallback } from 'react';
import { classes as classesApi, users, countries as countriesApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { Link } from 'react-router-dom';

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

  const isAdmin = ['admin', 'superadmin'].includes(user?.role);

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
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            + New Class
          </button>
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
          {classList.map((c) => (
            <div key={c.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
                  {c.name[0]}
                </div>
                <span className={`badge ${c.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mt-2">{c.name}</h3>
              {c.subject && <p className="text-xs text-gray-500 mt-0.5">{c.subject} {c.level && `· ${c.level}`}</p>}
              <p className="text-xs text-gray-400 mt-1">{c.enrolled_count || 0} students enrolled</p>
              {c.price && (
                <p className="text-xs font-medium text-brand-600 mt-1">${c.price} {c.currency || 'USD'}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setShowDetail(c.id)}
                  className="btn-secondary text-xs py-1.5 px-3 flex-1"
                >
                  Manage
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
          countries={regions}
        />
      )}

      {showDetail && (
        <ClassDetailModal
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

function CreateClassModal({ onClose, onCreated, countries }) {
  const [form, setForm] = useState({ name: '', description: '', subject: '', level: '', maxStudents: 30 });
  const [pricing, setPricing] = useState([{ countryId: null, price: '', isDefault: true }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Find currency symbol for a country id
  const currencyFor = (countryId) => {
    if (!countryId) return '';
    const c = countries.find((c) => c.id === countryId);
    return c ? `${c.currency_symbol} (${c.currency_code})` : '';
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await classesApi.create(form);
      for (const p of pricing.filter((x) => x.price)) {
        await classesApi.setPricing(res.data.id, { countryId: p.countryId || undefined, price: parseFloat(p.price) });
      }
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create class');
    } finally { setLoading(false); }
  };

  return (
    <Modal open title="Create Class" onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Class Name *</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
            <input className="input" value={form.subject} onChange={(e) => set('subject', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Level</label>
            <input className="input" placeholder="e.g. Beginner" value={form.level} onChange={(e) => set('level', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Max Students</label>
            <input type="number" className="input" value={form.maxStudents} onChange={(e) => set('maxStudents', e.target.value)} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700">Pricing per Country</label>
            <button type="button" onClick={() => setPricing((p) => [...p, { countryId: null, price: '', isDefault: false }])}
              className="text-xs text-brand-600 hover:underline">+ Add country price</button>
          </div>
          {pricing.map((p, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <select className="input text-sm flex-1" value={p.countryId || ''}
                onChange={(e) => setPricing((arr) => arr.map((x, j) => j === i ? { ...x, countryId: e.target.value || null } : x))}>
                <option value="">Default (all countries)</option>
                {countries.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.currency_symbol} {c.currency_code})</option>)}
              </select>
              <div className="relative">
                {p.countryId && (
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                    {countries.find((c) => c.id === p.countryId)?.currency_symbol}
                  </span>
                )}
                <input type="number" className={`input w-28 ${p.countryId ? 'pl-6' : ''}`} placeholder="Price" value={p.price}
                  onChange={(e) => setPricing((arr) => arr.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} />
              </div>
              {i > 0 && <button type="button" onClick={() => setPricing((arr) => arr.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 text-sm">✕</button>}
            </div>
          ))}
          <p className="text-xs text-gray-400 mt-1">Prices are in the local currency of each country.</p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating…' : 'Create Class'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ClassDetailModal({ classId, onClose, onChanged, teachers, students, countries, isAdmin }) {
  const [data, setData] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [tab, setTab] = useState('info');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');

  useEffect(() => {
    classesApi.get(classId).then((r) => setData(r.data)).catch(() => {});
    classesApi.enrollments(classId).then((r) => setEnrollments(r.data)).catch(() => {});
  }, [classId]);

  if (!data) return <Modal open title="Class Details" onClose={onClose}><div className="py-8 text-center text-gray-400">Loading…</div></Modal>;

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
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${tab === t ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="space-y-3 text-sm">
          <Row label="Subject" value={data.subject || '—'} />
          <Row label="Level" value={data.level || '—'} />
          <Row label="Max Students" value={data.max_students} />
          <Row label="Enrolled" value={data.enrolled_count} />
          <Row label="Admin" value={data.admin_name} />
          {data.description && <p className="text-gray-600 text-xs mt-2">{data.description}</p>}
        </div>
      )}

      {tab === 'teachers' && (
        <div>
          {isAdmin && (data.teachers || []).length === 0 && (
            <div className="flex gap-2 mb-3">
              <select className="input flex-1 text-sm" value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)}>
                <option value="">Select teacher…</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.email})</option>)}
              </select>
              <button onClick={assignTeacher} disabled={!selectedTeacher} className="btn-primary text-sm">Assign</button>
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
                  <button onClick={async () => { await classesApi.removeTeacher(classId, t.id); const r = await classesApi.get(classId); setData(r.data); onChanged(); }}
                    className="text-xs text-red-500 hover:text-red-700">Remove</button>
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
              <select className="input flex-1 text-sm" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
                <option value="">Select student…</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
              </select>
              <button onClick={enrollStudent} disabled={!selectedStudent} className="btn-primary text-sm">Enroll</button>
            </div>
          )}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {enrollments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">No students enrolled</p>
            ) : enrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium">{e.name}</p>
                  <p className="text-xs text-gray-400">{e.email}</p>
                </div>
                <span className={`badge ${e.payment_status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                  {e.payment_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'pricing' && (
        <div>
          {(data.pricing || []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">No pricing set</p>
          ) : (
            <div className="space-y-2">
              {data.pricing.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg border border-gray-100">
                  <span className="text-sm text-gray-700">{p.region_name || 'Global'}</span>
                  <span className="text-sm font-semibold text-brand-600">${p.price} {p.currency}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
