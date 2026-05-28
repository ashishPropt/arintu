import { useState, useEffect } from 'react';
import { content as contentApi } from '../../api';
import Modal from '../../components/Modal';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function ManageBooks() {
  const [books, setBooks] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState(null);

  const load = () =>
    contentApi.getBooks()
      .then((r) => setBooks(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const displayed = filter === 'all' ? books : books.filter((b) => b.status === filter);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this submission?')) return;
    await contentApi.deleteBook(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Book Club Submissions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and approve community book suggestions</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['pending', 'approved', 'rejected', 'all'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                filter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s}
              <span className="ml-1 text-gray-400">
                ({s === 'all' ? books.length : books.filter((b) => b.status === s).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-400">Loading…</div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {displayed.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-400">No {filter === 'all' ? '' : filter} submissions.</p>
          )}
          {displayed.map((book) => (
            <div key={book.id} className="p-4 flex gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{book.title}</p>
                    {book.author && <p className="text-xs text-gray-500">by {book.author}</p>}
                  </div>
                  <span className={`badge shrink-0 ${STATUS_COLORS[book.status]}`}>{book.status}</span>
                </div>

                <p className="text-xs text-gray-500 mt-1">
                  Submitted by <strong>{book.submitter_name}</strong>
                  {' · '}{format(new Date(book.created_at), 'MMM d, yyyy')}
                </p>

                {book.reason && (
                  <p className="text-xs text-gray-600 mt-2 italic">"{book.reason}"</p>
                )}

                {book.admin_notes && (
                  <p className="text-xs text-gray-400 mt-1">Admin notes: {book.admin_notes}</p>
                )}

                <a
                  href={book.amazon_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-brand-600 hover:underline"
                >
                  View on Amazon ↗
                </a>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                {book.status === 'pending' && (
                  <button
                    onClick={() => setReviewTarget(book)}
                    className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Review
                  </button>
                )}
                {book.status !== 'pending' && (
                  <button
                    onClick={() => setReviewTarget(book)}
                    className="text-xs text-gray-500 hover:text-brand-600 px-2 py-1 rounded hover:bg-brand-50 transition-colors"
                  >
                    Change
                  </button>
                )}
                <button
                  onClick={() => handleDelete(book.id)}
                  className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewTarget && (
        <ReviewModal
          book={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSaved={() => { setReviewTarget(null); load(); }}
        />
      )}
    </div>
  );
}

function ReviewModal({ book, onClose, onSaved }) {
  const [status, setStatus] = useState(book.status === 'pending' ? 'approved' : book.status);
  const [notes, setNotes] = useState(book.admin_notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await contentApi.reviewBook(book.id, status, notes);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title="Review Book Submission" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
          <p className="font-semibold text-gray-900">{book.title}</p>
          {book.author && <p className="text-gray-500">by {book.author}</p>}
          {book.reason && <p className="text-gray-600 text-xs italic mt-2">"{book.reason}"</p>}
          <a href={book.amazon_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-brand-600 hover:underline block mt-1">
            View on Amazon ↗
          </a>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Decision</label>
          <div className="grid grid-cols-2 gap-2">
            {['approved', 'rejected'].map((s) => (
              <label key={s} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                status === s
                  ? s === 'approved' ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'
                  : 'border-gray-200'
              }`}>
                <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} />
                <span className={`text-sm font-medium capitalize ${status === s ? (s === 'approved' ? 'text-green-700' : 'text-red-700') : 'text-gray-600'}`}>
                  {s === 'approved' ? '✅ Approve' : '❌ Reject'}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Notes <span className="text-gray-400">(optional, visible internally)</span>
          </label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving…' : 'Save Decision'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
