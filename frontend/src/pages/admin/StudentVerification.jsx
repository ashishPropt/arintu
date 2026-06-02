import { useState, useEffect, useCallback } from 'react';
import { verification } from '../../api';
import Modal from '../../components/Modal';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending:  'bg-amber-50 text-amber-700 border-amber-100',
  approved: 'bg-green-50 text-green-700 border-green-100',
  rejected: 'bg-red-50 text-red-700 border-red-100',
};

export default function StudentVerification() {
  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await verification.list(filter || undefined);
      setStudents(res.data);
    } catch {} finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (userId) => {
    setActionLoading(true);
    try {
      await verification.approve(userId);
      setStudents((s) => s.map((u) => u.id === userId ? { ...u, verification_status: 'approved' } : u));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve');
    } finally { setActionLoading(false); }
  };

  const reject = async () => {
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      await verification.reject(rejectTarget.id, rejectNotes);
      setStudents((s) => s.map((u) => u.id === rejectTarget.id ? { ...u, verification_status: 'rejected' } : u));
      setRejectTarget(null);
      setRejectNotes('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject');
    } finally { setActionLoading(false); }
  };

  const viewIdProof = async (userId) => {
    try {
      const token = localStorage.getItem('arintu_token');
      const res = await fetch(`/api/verification/${userId}/id-proof`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { alert('Could not load ID document'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch { alert('Failed to load ID document'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ID Verification</h1>
          <p className="text-sm text-gray-500">Review and verify identity documents for all new accounts</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-gray-50 p-1 rounded-xl w-fit">
        {[
          { value: 'pending',  label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
          { value: '',         label: 'All' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No {filter || ''} verifications found
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[s.verification_status] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                      {s.verification_status || 'no upload'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 capitalize">
                      {s.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{s.email}</p>
                  {s.id_document_uploaded_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      Uploaded {format(new Date(s.id_document_uploaded_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                  {s.verification_status === 'rejected' && s.verification_notes && (
                    <p className="text-xs text-red-600 mt-1">Rejection reason: {s.verification_notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => viewIdProof(s.id)}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    View ID
                  </button>
                  {s.verification_status !== 'approved' && (
                    <button
                      onClick={() => approve(s.id)}
                      disabled={actionLoading}
                      className="btn-primary text-xs py-1.5 px-3 bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </button>
                  )}
                  {s.verification_status !== 'rejected' && (
                    <button
                      onClick={() => { setRejectTarget(s); setRejectNotes(''); }}
                      disabled={actionLoading}
                      className="text-xs py-1.5 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <Modal open title="Reject ID Verification" onClose={() => setRejectTarget(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Rejecting ID verification for <strong>{rejectTarget.name}</strong>. They will be notified by email and can re-upload a new document.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reason <span className="text-gray-400">(optional — shown to student)</span>
              </label>
              <textarea
                className="input"
                rows={3}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="e.g. Image is blurry, please upload a clearer photo…"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectTarget(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={reject}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting…' : 'Reject Verification'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
