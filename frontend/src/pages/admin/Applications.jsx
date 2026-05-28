import { useState, useEffect } from 'react';
import { applications as appsApi } from '../../api';
import { formatDistanceToNow } from 'date-fns';
import Modal from '../../components/Modal';

const statusColor = {
  pending:  'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

export default function Applications() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await appsApi.list({ status: filter || undefined });
      setList(r.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const approve = async (id) => {
    await appsApi.approve(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Student Applications</h1>
          <p className="text-sm text-gray-500">{list.length} applications</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit mb-4">
        {['pending', 'approved', 'rejected', ''].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 text-xs font-medium transition-colors capitalize ${
              filter === s ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No applications found</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Student</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Class</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Country</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">App Fee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Applied</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
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
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {formatDistanceToNow(new Date(a.applied_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusColor[a.status]}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.status === 'pending' && (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => approve(a.id)}
                          className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100">
                          Approve
                        </button>
                        <button onClick={() => setRejectTarget(a)}
                          className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100">
                          Reject
                        </button>
                      </div>
                    )}
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
