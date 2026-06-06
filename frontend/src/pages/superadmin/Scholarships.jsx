import { useState, useEffect } from 'react';
import { applications as appsApi, classes as classesApi } from '../../api';
import Modal from '../../components/Modal';

const typeColor = {
  none:    'bg-gray-100 text-gray-500',
  partial: 'bg-blue-50 text-blue-700',
  full:    'bg-purple-50 text-purple-700',
};

export default function Scholarships() {
  const [list, setList] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filterClass, setFilterClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [awardTarget, setAwardTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [apps, cls] = await Promise.all([
        appsApi.list({ scholarshipOnly: true, ...(filterClass ? { classId: filterClass } : {}) }),
        classesApi.list({ limit: 200 }),
      ]);
      setList(apps.data);
      setClasses(cls.data.classes || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterClass]);

  // Group scholarship slot usage by class
  const slotUsage = list.reduce((acc, a) => {
    if (!acc[a.class_id]) {
      acc[a.class_id] = { name: a.class_name, total: a.scholarship_slots || 0, awarded: 0 };
    }
    if (a.scholarship_type && a.scholarship_type !== 'none') acc[a.class_id].awarded++;
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Scholarships</h1>
        <p className="text-sm text-gray-500">
          Award full or partial scholarships to students. Each class has 20% of seats reserved for scholarship recipients.
        </p>
      </div>

      {/* Slot summary cards */}
      {Object.keys(slotUsage).length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {Object.entries(slotUsage).map(([classId, info]) => (
            <div key={classId} className="card p-4">
              <p className="text-xs font-medium text-gray-700 truncate">{info.name}</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-2xl font-bold text-brand-600">{info.awarded}</span>
                <span className="text-sm text-gray-400 mb-0.5">/ {info.total} scholarship slots awarded</span>
              </div>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: info.total > 0 ? `${Math.min(100, (info.awarded / info.total) * 100)}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <select className="input max-w-xs text-sm" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-xs text-gray-400">{list.length} scholarship request{list.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No scholarship requests yet</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Student</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Class</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Requested</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">App Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Scholarship</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{a.student_name}</p>
                    <p className="text-xs text-gray-400">{a.student_email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{a.class_name}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${a.scholarship_type === 'full' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                      {a.scholarship_type === 'none' || !a.scholarship_type ? 'Partial or Full' : a.scholarship_type === 'full' ? 'Full' : 'Partial'}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {a.scholarship_reason ? (
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-3" title={a.scholarship_reason}>
                        {a.scholarship_reason}
                      </p>
                    ) : (
                      <span className="text-xs text-gray-300 italic">No reason given</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${a.status === 'approved' ? 'bg-green-50 text-green-700' : a.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.scholarship_type && a.scholarship_type !== 'none' ? (
                      <span className={`badge ${typeColor[a.scholarship_type]}`}>
                        {a.scholarship_type === 'full' ? 'Full scholarship' : `Partial — ${a.scholarship_discount_pct}% off`}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Not awarded yet</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setAwardTarget(a)}
                      className="px-3 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-medium hover:bg-brand-100">
                      {a.scholarship_type && a.scholarship_type !== 'none' ? 'Edit' : 'Award'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {awardTarget && (
        <AwardModal
          app={awardTarget}
          onClose={() => setAwardTarget(null)}
          onSaved={() => { setAwardTarget(null); load(); }}
        />
      )}
    </div>
  );
}

function AwardModal({ app, onClose, onSaved }) {
  const [type, setType] = useState(app.scholarship_type && app.scholarship_type !== 'none' ? app.scholarship_type : 'full');
  const [discountPct, setDiscountPct] = useState(app.scholarship_discount_pct || 50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await appsApi.awardScholarship(app.id, 'approve', type, type === 'partial' ? parseFloat(discountPct) : undefined);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setLoading(false); }
  };

  const removeScholarship = async () => {
    setLoading(true);
    try {
      await appsApi.awardScholarship(app.id, 'reject');
      onSaved();
    } catch {} finally { setLoading(false); }
  };

  return (
    <Modal open title="Award Scholarship" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
          <p><span className="text-gray-500">Student:</span> <strong>{app.student_name}</strong></p>
          <p><span className="text-gray-500">Class:</span> {app.class_name}</p>
        </div>

        {app.scholarship_reason && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs font-semibold text-blue-700 mb-1">Reason for request</p>
            <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{app.scholarship_reason}</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Scholarship Type</label>
          <div className="space-y-2">
            {[
              { value: 'full',    label: 'Full Scholarship', desc: '100% of class fee covered' },
              { value: 'partial', label: 'Partial Scholarship', desc: 'A percentage of the class fee is covered' },
            ].map(({ value, label, desc }) => (
              <label key={value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${type === value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="type" value={value} checked={type === value}
                  onChange={() => setType(value)} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {type === 'partial' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Discount Percentage</label>
            <div className="flex items-center gap-2">
              <input type="number" min="1" max="99" step="1" className="input w-24"
                value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} required />
              <span className="text-sm text-gray-500">% off the class fee</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-between pt-1">
          <div>
            {app.scholarship_type && app.scholarship_type !== 'none' && (
              <button type="button" onClick={removeScholarship} disabled={loading}
                className="btn-danger text-xs">
                Remove Scholarship
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving…' : 'Award Scholarship'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
