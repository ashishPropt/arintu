import { useState, useEffect } from 'react';
import { waivers as waiversApi, users as usersApi } from '../../api';
import { formatDistanceToNow } from 'date-fns';
import Modal from '../../components/Modal';

const statusColor = {
  pending:  'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

export default function FeeWaivers() {
  const [list,         setList]         = useState([]);
  const [filter,       setFilter]       = useState('pending');
  const [loading,      setLoading]      = useState(true);
  const [reviewTarget, setReviewTarget] = useState(null); // { student, action }
  const [showGrant,    setShowGrant]    = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await waiversApi.list({ status: filter || undefined });
      setList(r.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const tabs = [
    { value: 'pending',  label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: '',         label: 'All' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Application Fee Waivers</h1>
          <p className="text-sm text-gray-500">
            Review student requests or proactively grant a waiver to any student.
            Students with a <strong>pending</strong> request cannot apply to any class until you decide.
          </p>
        </div>
        <button onClick={() => setShowGrant(true)} className="btn-primary">
          + Grant Waiver
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit mb-5">
        {tabs.map(({ value, label }) => (
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
        <div className="text-center py-12 text-gray-400">
          {filter === 'pending'
            ? 'No pending waiver requests. Use "+ Grant Waiver" to proactively approve a student.'
            : 'No waiver records found for this filter.'}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Student</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Requested</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Reviewed by</th>
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
                      : <span className="text-xs text-gray-400 italic">
                          {w.fee_waiver_status === 'approved' ? 'Admin granted' : 'No reason provided'}
                        </span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {w.fee_waiver_requested_at
                      ? formatDistanceToNow(new Date(w.fee_waiver_requested_at), { addSuffix: true })
                      : <span className="italic">Not requested — admin granted</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusColor[w.fee_waiver_status]}`}>
                      {w.fee_waiver_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {w.reviewed_by_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                    {w.fee_waiver_notes || '—'}
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
                    {w.fee_waiver_status === 'approved' && (
                      <button
                        onClick={() => setReviewTarget({ student: w, action: 'reject' })}
                        className="px-3 py-1 bg-gray-50 text-gray-500 rounded-lg text-xs font-medium hover:bg-red-50 hover:text-red-600">
                        Revoke
                      </button>
                    )}
                    {w.fee_waiver_status === 'rejected' && (
                      <button
                        onClick={() => setReviewTarget({ student: w, action: 'approve' })}
                        className="px-3 py-1 bg-gray-50 text-gray-500 rounded-lg text-xs font-medium hover:bg-green-50 hover:text-green-700">
                        Grant
                      </button>
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

      {showGrant && (
        <GrantWaiverModal
          onClose={() => setShowGrant(false)}
          onGranted={() => { setShowGrant(false); setFilter('approved'); load(); }}
        />
      )}
    </div>
  );
}

// ── Review Modal (approve/reject a pending request or revoke/re-grant) ─────────
function ReviewModal({ target, onClose, onDone }) {
  const { student, action } = target;
  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const isApprove = action === 'approve';

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await waiversApi.review(student.id, action, notes);
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setLoading(false); }
  };

  const actionLabel = isApprove
    ? (student.fee_waiver_status === 'rejected' ? 'Grant Waiver' : 'Approve Waiver')
    : (student.fee_waiver_status === 'approved' ? 'Revoke Waiver' : 'Reject Waiver');

  return (
    <Modal open title={actionLabel} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <p className="text-sm text-gray-600">
          {isApprove
            ? <>You are <strong>approving</strong> the fee waiver for <strong>{student.name}</strong>. They will be able to apply to classes without paying the application fee.</>
            : <>You are <strong>revoking/rejecting</strong> the waiver for <strong>{student.name}</strong>. They will need to pay the standard application fee.</>}
        </p>

        {student.fee_waiver_reason && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
            <span className="font-medium">Student's reason: </span>{student.fee_waiver_reason}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {isApprove ? 'Notes (optional)' : 'Reason (optional — sent to student)'}
          </label>
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder={isApprove ? 'Any notes…' : 'Explain why the waiver was not granted…'} />
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading}
            className={isApprove ? 'btn-primary' : 'btn-danger'}>
            {loading ? 'Saving…' : actionLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Grant Waiver Modal — proactively grant to any student ─────────────────────
function GrantWaiverModal({ onClose, onGranted }) {
  const [students,  setStudents]  = useState([]);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(null);
  const [notes,     setNotes]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [fetching,  setFetching]  = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    usersApi.list({ role: 'student', limit: 200 })
      .then((r) => setStudents(r.data.users || []))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const filtered = students.filter((s) =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!selected) { setError('Please select a student.'); return; }
    setLoading(true);
    setError('');
    try {
      await waiversApi.review(selected.id, 'approve', notes);
      onGranted();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to grant waiver');
    } finally { setLoading(false); }
  };

  return (
    <Modal open title="Grant Fee Waiver" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
          Granting a waiver lets the student apply to classes without paying the one-time application fee.
          This takes effect immediately.
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Search student</label>
          <input
            className="input"
            placeholder="Name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
          />
        </div>

        {fetching ? (
          <div className="text-center text-gray-400 text-sm py-4">Loading students…</div>
        ) : (
          <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No students found</p>
            ) : filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(s)}
                className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                  selected?.id === s.id ? 'bg-brand-50 border-l-2 border-brand-500' : ''
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{s.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-400">{s.email}</p>
                  {s.fee_waiver_status && (
                    <span className={`badge text-xs ${statusColor[s.fee_waiver_status]}`}>
                      {s.fee_waiver_status}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-800">
            Selected: <strong>{selected.name}</strong> ({selected.email})
            {selected.fee_waiver_status === 'approved' && (
              <p className="text-xs mt-1 text-green-600">⚠️ This student already has an approved waiver.</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for granting this waiver…"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading || !selected} className="btn-primary">
            {loading ? 'Granting…' : 'Grant Waiver'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
