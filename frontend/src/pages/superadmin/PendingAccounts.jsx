import { useState, useEffect, useCallback } from 'react';
import { users as usersApi } from '../../api';
import Modal from '../../components/Modal';
import { format } from 'date-fns';

export default function PendingAccounts() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.pendingApproval();
      setPending(res.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    setActionLoading(true);
    try {
      await usersApi.approveAccount(id);
      setPending((p) => p.filter((u) => u.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve');
    } finally { setActionLoading(false); }
  };

  const reject = async () => {
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      await usersApi.rejectAccount(rejectTarget.id, rejectNotes);
      setPending((p) => p.filter((u) => u.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectNotes('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject');
    } finally { setActionLoading(false); }
  };

  const ROLE_COLORS = {
    admin:   'bg-blue-50 text-blue-700',
    teacher: 'bg-green-50 text-green-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pending Account Approvals</h1>
          <p className="text-sm text-gray-500">Review and approve admin and teacher account requests</p>
        </div>
        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {pending.length} pending
        </span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : pending.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-500 font-medium">All caught up!</p>
          <p className="text-sm text-gray-400 mt-1">No pending account requests at the moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((u) => (
            <div key={u.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">{u.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{u.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Registered {format(new Date(u.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => approve(u.id)}
                    disabled={actionLoading}
                    className="btn-primary text-sm py-2 px-4 bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => { setRejectTarget(u); setRejectNotes(''); }}
                    disabled={actionLoading}
                    className="text-sm py-2 px-4 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectTarget && (
        <Modal open title="Reject Account Request" onClose={() => setRejectTarget(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You are about to reject the <strong>{rejectTarget.role}</strong> account request from{' '}
              <strong>{rejectTarget.name}</strong>. They will be notified via email.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reason <span className="text-gray-400">(optional — sent to applicant)</span>
              </label>
              <textarea
                className="input"
                rows={3}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Provide a reason for rejection…"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectTarget(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={reject}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting…' : 'Reject Account'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
