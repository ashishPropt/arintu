import { useState, useEffect } from 'react';
import { waivers as waiversApi } from '../../api';
import { formatDistanceToNow } from 'date-fns';
import Modal from '../../components/Modal';

const statusColor = {
  pending:  'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

export default function FeeWaivers() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState(null); // { student, action }

  const load = async () => {
    setLoading(true);
    try {
      const r = await waiversApi.list({ status: filter || undefined });
      setList(r.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Application Fee Waivers</h1>
          <p className="text-sm text-gray-500">
            Review student requests to waive the one-time application fee.
            Students with a pending request <strong>cannot apply</strong> to any class until you decide.
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit mb-5">
        {[
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
          { value: '', label: 'All' },
        ].map(({ value, label }) => (
          <button key={value} onClick={() => setFilter(value)}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              filter === value ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No waiver requests found</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Student</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Requested</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{w.name}</p>
                    <p className="text-xs text-gray-400">{w.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    {w.fee_waiver_reason
                      ? <span className="text-xs">{w.fee_waiver_reason}</span>
                      : <span className="text-xs text-gray-400 italic">No reason provided</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {w.fee_waiver_requested_at
                      ? formatDistanceToNow(new Date(w.fee_waiver_requested_at), { addSuffix: true })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusColor[w.fee_waiver_status]}`}>
                      {w.fee_waiver_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                    {w.fee_waiver_notes || (w.reviewed_by_name ? `By ${w.reviewed_by_name}` : '—')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {w.fee_waiver_status === 'pending' && (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setReviewTarget({ student: w, action: 'approve' })}
                          className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100">
                          Approve
                        </button>
                        <button
                          onClick={() => setReviewTarget({ student: w, action: 'reject' })}
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

      {reviewTarget && (
        <ReviewModal
          target={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onDone={() => { setReviewTarget(null); load(); }}
        />
      )}
    </div>
  );
}

function ReviewModal({ target, onClose, onDone }) {
  const { student, action } = target;
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await waiversApi.review(student.id, action, notes);
      onDone();
    } catch {} finally { setLoading(false); }
  };

  const isApprove = action === 'approve';

  return (
    <Modal open title={isApprove ? 'Approve Fee Waiver' : 'Reject Fee Waiver'} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600">
          {isApprove
            ? <>You are <strong>approving</strong> the fee waiver for <strong>{student.name}</strong>. They will be able to apply to classes without paying the application fee.</>
            : <>You are <strong>rejecting</strong> the waiver for <strong>{student.name}</strong>. They can still apply by paying the standard fee.</>
          }
        </p>
        {student.fee_waiver_reason && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
            <span className="font-medium">Student's reason: </span>{student.fee_waiver_reason}
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {isApprove ? 'Notes (optional)' : 'Reason for rejection (optional — sent to student)'}
          </label>
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder={isApprove ? 'Any notes…' : 'Explain why the waiver was not granted…'} />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading}
            className={isApprove ? 'btn-primary' : 'btn-danger'}>
            {loading ? 'Saving…' : isApprove ? 'Approve Waiver' : 'Reject Waiver'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
