import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicApi, content as contentApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';

export default function BookClub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmit, setShowSubmit] = useState(false);

  const load = () => {
    publicApi.books()
      .then((r) => setBooks(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Book Club</h1>
          <p className="text-gray-500">
            Our community-driven reading list. Members submit books they love; the best ones get spotlighted here.
          </p>
        </div>
        {user ? (
          <button onClick={() => setShowSubmit(true)} className="btn-primary text-sm shrink-0">
            Suggest a book
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="btn-secondary text-sm shrink-0"
          >
            Sign in to suggest
          </button>
        )}
      </div>

      {/* How it works */}
      <div className="mt-6 mb-10 bg-amber-50 border border-amber-100 rounded-2xl p-5">
        <p className="text-sm font-semibold text-amber-900 mb-1">📚 How it works</p>
        <p className="text-sm text-amber-800 leading-relaxed">
          Any logged-in Arintu member can suggest a book by submitting its Amazon link and a short reason. Our team reviews submissions and approves the best picks. Approved books are featured below for the whole community to discover.
        </p>
      </div>

      {/* Book list */}
      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading books…</div>
      ) : books.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📖</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">No books yet</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
            Be the first to suggest a book! Log in and click "Suggest a book" above.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}

      {/* Submit modal */}
      {showSubmit && (
        <SubmitModal
          onClose={() => setShowSubmit(false)}
          onSubmitted={() => { setShowSubmit(false); }}
        />
      )}
    </div>
  );
}

function BookCard({ book }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4">
      {/* Book icon placeholder */}
      <div className="shrink-0 w-12 h-16 bg-gradient-to-b from-brand-500 to-brand-700 rounded-lg flex items-center justify-center text-white text-xl">
        📘
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-0.5">{book.title}</h3>
        {book.author && <p className="text-xs text-gray-500 mb-2">by {book.author}</p>}
        {book.reason && (
          <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-3 italic">
            "{book.reason}"
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Suggested by {book.submitter_name}</span>
          <a
            href={book.amazon_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
          >
            View on Amazon
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

function SubmitModal({ onClose, onSubmitted }) {
  const [form, setForm] = useState({ amazon_url: '', title: '', author: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await contentApi.submitBook(form);
      setSuccess(true);
      setTimeout(onSubmitted, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Modal open title="Book Submitted!" onClose={onClose} size="sm">
        <div className="text-center py-6">
          <div className="text-5xl mb-3">🎉</div>
          <p className="font-semibold text-gray-900">Thanks for your suggestion!</p>
          <p className="text-sm text-gray-500 mt-2">Our team will review it and add it to the list if it's a great fit.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open title="Suggest a Book" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Amazon URL <span className="text-red-500">*</span>
          </label>
          <input
            className="input"
            placeholder="https://www.amazon.com/dp/..."
            value={form.amazon_url}
            onChange={(e) => set('amazon_url', e.target.value)}
            required
          />
          <p className="text-xs text-gray-400 mt-1">Paste the full Amazon product page URL.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Book Title <span className="text-red-500">*</span>
          </label>
          <input
            className="input"
            placeholder="e.g. The Art of Learning"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Author</label>
          <input
            className="input"
            placeholder="e.g. Josh Waitzkin"
            value={form.author}
            onChange={(e) => set('author', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Why should the community read this?
          </label>
          <textarea
            className="input"
            rows={3}
            placeholder="Share what makes this book valuable for Arintu learners…"
            value={form.reason}
            onChange={(e) => set('reason', e.target.value)}
          />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
