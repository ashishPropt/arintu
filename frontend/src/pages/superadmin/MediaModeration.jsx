import { useState, useEffect } from 'react';
import { gallery as galleryApi } from '../../api';
import { formatDistanceToNow } from 'date-fns';
import Modal from '../../components/Modal';

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const statusBadge = {
  pending:  'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
};

export default function MediaModeration() {
  const [items,       setItems]       = useState([]);
  const [filter,      setFilter]      = useState('pending');
  const [loading,     setLoading]     = useState(true);
  const [previewItem, setPreviewItem] = useState(null);
  const [reviewItem,  setReviewItem]  = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await galleryApi.list(filter ? { status: filter } : {});
      setItems(r.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this item and its file?')) return;
    await galleryApi.remove(id);
    load();
  };

  const pendingCount = items.filter((i) => i.status === 'pending').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Media Gallery — Moderation</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review community-submitted photos and videos before they appear publicly</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {[
          { key: 'pending',  label: 'Pending Review' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
          { key: '',         label: 'All' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors relative ${
              filter === key ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {label}
            {key === 'pending' && pendingCount > 0 && filter !== 'pending' && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {filter === 'pending' ? '✓ No pending submissions' : 'No items found'}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onPreview={() => setPreviewItem(item)}
              onReview={() => setReviewItem(item)}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      )}

      {/* Preview lightbox */}
      {previewItem && (
        <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}

      {/* Review modal */}
      {reviewItem && (
        <ReviewModal
          item={reviewItem}
          onClose={() => setReviewItem(null)}
          onSaved={() => { setReviewItem(null); load(); }}
        />
      )}
    </div>
  );
}

// ── Media card ────────────────────────────────────────────────────────────────
function MediaCard({ item, onPreview, onReview, onDelete }) {
  const fileUrl = galleryApi.fileUrl(item.id);

  return (
    <div className="card overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <div className="relative bg-gray-100 cursor-pointer group" onClick={onPreview}>
        {item.file_type === 'photo' ? (
          <img src={fileUrl} alt={item.title || 'Photo'}
            className="w-full h-40 object-cover group-hover:opacity-90 transition-opacity" />
        ) : (
          <div className="w-full h-40 flex items-center justify-center bg-gray-800 relative">
            <video src={fileUrl} className="w-full h-40 object-cover" muted preload="metadata" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-800 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>
        )}
        <span className={`absolute top-2 right-2 badge text-[10px] ${statusBadge[item.status]}`}>
          {item.status}
        </span>
        <span className="absolute top-2 left-2 badge bg-black/50 text-white text-[10px]">
          {item.file_type === 'photo' ? '🖼️ Photo' : '🎬 Video'}
        </span>
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div>
          {item.title && <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>}
          <p className="text-xs text-gray-600 font-medium mt-0.5">{item.uploader_name}</p>
          <p className="text-xs text-gray-400">{item.uploader_email}</p>
          {item.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 mt-auto">
          <span>{formatSize(item.file_size)}</span>
          <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
        </div>
        {item.admin_notes && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 italic">"{item.admin_notes}"</p>
        )}

        {/* Actions */}
        <div className="flex gap-1.5 flex-wrap mt-1">
          <button onClick={onPreview}
            className="flex-1 px-2 py-1.5 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 font-medium">
            Preview
          </button>
          {item.status === 'pending' && (
            <button onClick={onReview}
              className="flex-1 px-2 py-1.5 text-xs bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 font-semibold">
              Review
            </button>
          )}
          {item.status !== 'pending' && (
            <button onClick={onReview}
              className="flex-1 px-2 py-1.5 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 font-medium">
              Change
            </button>
          )}
          <button onClick={onDelete}
            className="px-2 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({ item, onClose }) {
  const fileUrl = galleryApi.fileUrl(item.id);
  return (
    <Modal open title={item.title || (item.file_type === 'photo' ? 'Photo preview' : 'Video preview')} onClose={onClose} size="lg">
      <div className="space-y-3">
        {item.file_type === 'photo' ? (
          <img src={fileUrl} alt={item.title || 'preview'}
            className="w-full max-h-[60vh] object-contain rounded-xl bg-gray-100" />
        ) : (
          <video src={fileUrl} controls
            className="w-full max-h-[60vh] rounded-xl bg-black" />
        )}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-gray-400">From: </span><strong>{item.uploader_name}</strong></div>
          <div><span className="text-gray-400">Email: </span>{item.uploader_email}</div>
          <div><span className="text-gray-400">Size: </span>{formatSize(item.file_size)}</div>
          <div><span className="text-gray-400">Submitted: </span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</div>
        </div>
        {item.description && (
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{item.description}</p>
        )}
      </div>
    </Modal>
  );
}

// ── Review Modal ──────────────────────────────────────────────────────────────
function ReviewModal({ item, onClose, onSaved }) {
  const [notes,   setNotes]   = useState(item.admin_notes || '');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const decide = async (action) => {
    setLoading(true);
    setError('');
    try {
      await galleryApi.review(item.id, action, notes);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <Modal open title="Review Submission" onClose={onClose} size="sm">
      <div className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
          <p><span className="text-gray-400">From:</span> <strong>{item.uploader_name}</strong> ({item.uploader_email})</p>
          {item.title && <p><span className="text-gray-400">Caption:</span> {item.title}</p>}
          {item.description && <p><span className="text-gray-400">Description:</span> {item.description}</p>}
          <p><span className="text-gray-400">Type:</span> {item.file_type} · {formatSize(item.file_size)}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional — only visible to admins)</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal note about this decision…" />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="button" onClick={() => decide('reject')} disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 disabled:opacity-60">
            {loading ? '…' : 'Reject'}
          </button>
          <button type="button" onClick={() => decide('approve')} disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm disabled:opacity-60">
            {loading ? '…' : '✓ Approve'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
