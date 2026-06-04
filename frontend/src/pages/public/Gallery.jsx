import { useState, useEffect, useRef } from 'react';
import { gallery as galleryApi, publicApi } from '../../api';

const MAX_IMAGE_MB = 15;
const MAX_VIDEO_MB = 200;
const ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm';

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ item, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const fileUrl = publicApi.galleryFileUrl(item.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm flex items-center gap-1">
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
          </svg>
          Close
        </button>

        {item.file_type === 'photo' ? (
          <img src={fileUrl} alt={item.title || 'Gallery photo'}
            className="max-h-[80vh] max-w-full rounded-xl object-contain" />
        ) : (
          <video src={fileUrl} controls autoPlay
            className="max-h-[80vh] max-w-full rounded-xl" />
        )}

        {(item.title || item.uploader_name) && (
          <div className="mt-3 text-center">
            {item.title && <p className="text-white font-semibold">{item.title}</p>}
            {item.uploader_name && (
              <p className="text-white/60 text-sm mt-0.5">by {item.uploader_name}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose, onUploaded }) {
  const [file,        setFile]        = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [done,        setDone]        = useState(false);
  const fileRef = useRef(null);

  const isVideo = file?.type?.startsWith('video/');

  const handleFile = (f) => {
    if (!f) return;
    const maxMB = f.type.startsWith('video/') ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    if (f.size > maxMB * 1024 * 1024) {
      setError(`File too large. Max ${maxMB} MB for ${f.type.startsWith('video/') ? 'videos' : 'images'}.`);
      return;
    }
    setError('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setError('Please choose a file to upload.');
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('uploader_name', name);
      fd.append('uploader_email', email);
      fd.append('title', title);
      fd.append('description', description);
      await galleryApi.upload(fd);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally { setLoading(false); }
  };

  if (done) return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Thank you!</h3>
        <p className="text-sm text-gray-500 mb-6">
          Your submission is under review. It will appear in the gallery once approved by our team.
        </p>
        <button onClick={() => { setDone(false); onClose(); }} className="btn-primary w-full">
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Share a Memory</h3>
            <p className="text-xs text-gray-500 mt-0.5">Photos up to 15 MB · Videos up to 200 MB</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl cursor-pointer transition-colors overflow-hidden ${
              file ? 'border-brand-300' : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/30'
            }`}
          >
            <input ref={fileRef} type="file" accept={ACCEPT} className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])} />

            {!file ? (
              <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
                <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18M21 15.75V5.625a2.625 2.625 0 00-2.625-2.625H5.625A2.625 2.625 0 003 5.625v10.125"/>
                </svg>
                <p className="text-sm font-medium text-gray-500">Click or drag to upload a photo or video</p>
                <p className="text-xs">JPG, PNG, WebP, GIF, MP4, MOV, WebM</p>
              </div>
            ) : (
              <div className="relative">
                {!isVideo ? (
                  <img src={preview} alt="preview"
                    className="w-full h-48 object-cover" />
                ) : (
                  <video src={preview} className="w-full h-48 object-cover" muted />
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm font-medium">Click to change</p>
                </div>
                {/* File info strip */}
                <div className="px-3 py-2 bg-gray-50 flex items-center justify-between border-t border-gray-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{isVideo ? '🎬' : '🖼️'}</span>
                    <p className="text-xs text-gray-700 truncate font-medium">{file.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">{formatSize(file.size)}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                      className="text-xs text-red-500 hover:text-red-700 font-medium">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Name + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Your Name *</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Full name" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com" required />
            </div>
          </div>

          {/* Caption + Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Caption (optional)</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="A short title for your photo or video" maxLength={120} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="When was this? What's the story?" maxLength={500} />
          </div>

          <p className="text-xs text-gray-400">
            All uploads are reviewed before appearing publicly. By submitting you agree to our{' '}
            <a href="/terms" target="_blank" className="hover:underline text-brand-600">Terms of Service</a>.
          </p>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading || !file}
              className="btn-primary flex-1 disabled:opacity-60">
              {loading ? 'Uploading…' : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Gallery Page ─────────────────────────────────────────────────────────
export default function Gallery() {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [lightbox,    setLightbox]    = useState(null);
  const [showUpload,  setShowUpload]  = useState(false);
  const [filter,      setFilter]      = useState('all'); // 'all' | 'photo' | 'video'

  useEffect(() => {
    publicApi.galleryItems()
      .then((r) => setItems(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayed = filter === 'all' ? items : items.filter((i) => i.file_type === filter);
  const photos = items.filter((i) => i.file_type === 'photo').length;
  const videos = items.filter((i) => i.file_type === 'video').length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Community Gallery</h1>
        <p className="text-gray-500 max-w-xl mx-auto mb-6">
          A living archive of Arintu's journey — shared by our students, teachers, families, and friends.
          Have a memory to share? We'd love to see it.
        </p>
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all text-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
          </svg>
          Share a Memory
        </button>
      </div>

      {/* Filter tabs */}
      {!loading && items.length > 0 && (
        <div className="flex items-center gap-2 mb-6">
          {[
            { key: 'all',   label: `All (${items.length})` },
            { key: 'photo', label: `Photos (${photos})` },
            { key: 'video', label: `Videos (${videos})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-gray-400">Loading gallery…</div>
      ) : displayed.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-5xl mb-4">📷</div>
          <p className="text-gray-500 font-medium">No {filter !== 'all' ? filter + 's' : 'media'} yet</p>
          <p className="text-sm text-gray-400 mt-1">Be the first to share a memory!</p>
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
          {displayed.map((item) => (
            <GalleryCard key={item.id} item={item} onClick={() => setLightbox(item)} />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <Lightbox item={lightbox} onClose={() => setLightbox(null)} />
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}

function GalleryCard({ item, onClick }) {
  const fileUrl = publicApi.galleryFileUrl(item.id);
  return (
    <div
      onClick={onClick}
      className="break-inside-avoid cursor-pointer group relative rounded-2xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-lg transition-all"
    >
      {item.file_type === 'photo' ? (
        <img src={fileUrl} alt={item.title || 'Gallery photo'}
          className="w-full object-cover group-hover:scale-105 transition-transform duration-300" />
      ) : (
        <div className="relative">
          <video src={fileUrl} className="w-full object-cover" muted preload="metadata" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {item.title && <p className="text-white text-xs font-semibold truncate">{item.title}</p>}
          <p className="text-white/70 text-xs">{item.uploader_name}</p>
        </div>
      </div>
    </div>
  );
}
