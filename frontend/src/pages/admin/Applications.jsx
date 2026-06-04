import { useState, useEffect } from 'react';
import { applications as appsApi } from '../../api';
import { formatDistanceToNow } from 'date-fns';
import Modal from '../../components/Modal';

const statusColor = {
  pending:  'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

const classFeeLabel = {
  pending:             { label: 'Waiting',          cls: 'bg-gray-100 text-gray-500' },
  pending_payment:     { label: 'Fee Due',           cls: 'bg-amber-50 text-amber-700' },
  scholarship_pending: { label: '🎓 Scholarship',    cls: 'bg-violet-100 text-violet-700 font-semibold' },
  paid:                { label: 'Fee Paid',          cls: 'bg-green-50 text-green-600' },
  full_scholarship:    { label: 'Full Scholarship',  cls: 'bg-purple-50 text-purple-700' },
  not_required:        { label: 'Not Required',      cls: 'bg-gray-100 text-gray-400' },
};

export default function Applications() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [scholarshipTarget, setScholarshipTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter === 'scholarship'
        ? { scholarshipOnly: true }
        : { status: filter || undefined };
      const r = await appsApi.list(params);
      setList(r.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const approve = async (id) => {
    await appsApi.approve(id);
    load();
  };

  const tabs = [
    { key: 'pending',      label: 'Pending' },
    { key: 'approved',     label: 'Approved' },
    { key: 'rejected',     label: 'Rejected' },
    { key: 'scholarship',  label: '🎓 Scholarship Requests' },
    { key: '',             label: 'All' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Student Applications</h1>
          <p className="text-sm text-gray-500">{list.length} applications</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-1 mb-4">
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
              filter === key
                ? key === 'scholarship' ? 'bg-violet-600 text-white' : 'bg-brand-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Scholarship notice banner */}
      {filter === 'scholarship' && (
        <div className="mb-4 p-3 rounded-xl bg-violet-50 border border-violet-100 text-sm text-violet-800">
          <strong>Scholarship requests</strong> — these students have applied for financial aid. Approve (full or partial) or reject their request.
          Once approved, students can pay the adjusted fee or will be auto-enrolled (full scholarship).
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {filter === 'scholarship' ? 'No scholarship requests yet' : 'No applications found'}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Student</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Class</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Country</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">App Fee</th>
                {filter === 'scholarship' && (
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Class Fee</th>
                )}
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Applied</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                {filter !== 'scholarship' && (
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Class Fee</th>
                )}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((a) => (
                <tr key={a.id} className={`hover:bg-gray-50 ${a.class_fee_status === 'scholarship_pending' ? 'bg-violet-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{a.student_name}</p>
                    <p className="text-xs text-gray-400">{a.student_email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{a.class_name}</td>
                  <td className="px-4 py-3 text-gray-500">{a.country_name || '—'}</td>
                  <td className="px-4 py-3">
                    {a.fee_waived ? (
                      <span className="badge bg-green-50 text-green-600">Waived</span>
                    ) : a.application_fee_charged != null ? (
                      <span className="text-sm font-medium text-gray-900">
                        {a.currency_symbol}{Number(a.application_fee_charged).toLocaleString()}
                      </span>
                    ) : '—'}
                  </td>
                  {filter === 'scholarship' && (
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {a.class_fee_amount && (
                          <p className="text-sm font-semibold text-gray-900">
                            {a.currency_symbol}{Number(a.class_fee_amount).toLocaleString()}
                            {a.scholarship_discount_pct > 0 && (
                              <span className="ml-1 text-xs text-green-600">({a.scholarship_discount_pct}% off)</span>
                            )}
                          </p>
                        )}
                        {a.scholarship_reason && (
                          <p className="text-xs text-gray-500 max-w-xs truncate" title={a.scholarship_reason}>
                            "{a.scholarship_reason}"
                          </p>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {formatDistanceToNow(new Date(a.applied_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusColor[a.status] || 'bg-gray-100 text-gray-500'}`}>{a.status}</span>
                  </td>
                  {filter !== 'scholarship' && (
                    <td className="px-4 py-3">
                      {a.class_fee_status && classFeeLabel[a.class_fee_status] ? (
                        <span className={`badge ${classFeeLabel[a.class_fee_status].cls}`}>
                          {classFeeLabel[a.class_fee_status].label}
                        </span>
                      ) : '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end flex-wrap">
                      {/* Scholarship review button — shown whenever scholarship_pending */}
                      {a.class_fee_status === 'scholarship_pending' && (
                        <button
                          onClick={() => setScholarshipTarget(a)}
                          className="px-3 py-1 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 whitespace-nowrap"
                        >
                          Review Scholarship
                        </button>
                      )}
                      {a.status === 'pending' && filter !== 'scholarship' && (
                        <>
                          <button onClick={() => approve(a.id)}
                            className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100">
                            Approve
                          </button>
                          <button onClick={() => setRejectTarget(a)}
                            className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100">
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rejectTarget && (
        <RejectModal
          app={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={() => { setRejectTarget(null); load(); }}
        />
      )}

      {scholarshipTarget && (
        <ScholarshipReviewModal
          app={scholarshipTarget}
          onClose={() => setScholarshipTarget(null)}
          onSaved={() => { setScholarshipTarget(null); load(); }}
        />
      )}
    </div>
  );
}

function RejectModal({ app, onClose, onRejected }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await appsApi.reject(app.id, notes); onRejected(); }
    catch {} finally { setLoading(false); }
  };

  return (
    <Modal open title="Reject Application" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Rejecting <strong>{app.student_name}'s</strong> application for <strong>{app.class_name}</strong>.
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Reason (optional)</label>
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="This will be sent to the student…" />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-danger">{loading ? 'Rejecting…' : 'Reject'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ScholarshipReviewModal({ app, onClose, onSaved }) {
  const [type, setType] = useState('full');
  const [discountPct, setDiscountPct] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const approve = async (e) => {
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

  const reject = async () => {
    setLoading(true);
    try {
      await appsApi.awardScholarship(app.id, 'reject');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject');
    } finally { setLoading(false); }
  };

  return (
    <Modal open title="Review Scholarship Request" onClose={onClose} size="sm">
      <div className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        {/* Student + class info */}
        <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
          <p><span className="text-gray-500">Student:</span> <strong>{app.student_name}</strong></p>
          <p><span className="text-gray-500">Class:</span> {app.class_name}</p>
          {app.class_fee_amount && (
            <p><span className="text-gray-500">Class fee:</span> <strong>{app.currency_symbol}{Number(app.class_fee_amount).toLocaleString()}</strong></p>
          )}
        </div>

        {/* Student's reason */}
        {app.scholarship_reason && (
          <div className="bg-violet-50 rounded-xl p-3 border border-violet-100">
            <p className="text-xs font-semibold text-violet-700 mb-1">Student's reason:</p>
            <p className="text-sm text-gray-700 italic">"{app.scholarship_reason}"</p>
          </div>
        )}

        <form onSubmit={approve} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Award Type</label>
            <div className="space-y-2">
              {[
                { value: 'full',    label: 'Full Scholarship', desc: '100% waived — student enrolled immediately' },
                { value: 'partial', label: 'Partial Scholarship', desc: 'Reduce the class fee by a percentage' },
              ].map(({ value, label, desc }) => (
                <label key={value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${type === value ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'}`}>
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
                {app.class_fee_amount && (
                  <span className="text-sm font-semibold text-violet-700">
                    → {app.currency_symbol}{Math.round(Number(app.class_fee_amount) * (1 - discountPct / 100)).toLocaleString()} due
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-between pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={reject}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 disabled:opacity-60"
            >
              Reject Request
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm disabled:opacity-60"
              >
                {loading ? 'Saving…' : 'Approve Scholarship'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}
