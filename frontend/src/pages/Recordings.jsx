import { useState, useEffect } from 'react';
import { recordings as recordingsApi } from '../api';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function formatDuration(seconds) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s > 0 ? s + 's' : ''}`.trim();
  return `${s}s`;
}

function formatFileSize(bytes) {
  if (!bytes) return null;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

// ── Recording card ────────────────────────────────────────────────────────────
function RecordingCard({ rec }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      {/* Thumbnail placeholder */}
      <div className="w-14 h-14 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
        <VideoIcon className="w-7 h-7 text-brand-500" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm leading-snug">{rec.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{rec.class_name}</p>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="text-xs text-gray-400">{formatDate(rec.recorded_at)}</span>
          {formatDuration(rec.duration_seconds) && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {formatDuration(rec.duration_seconds)}
            </span>
          )}
          {formatFileSize(rec.file_size_bytes) && (
            <span className="text-xs text-gray-400">{formatFileSize(rec.file_size_bytes)}</span>
          )}
        </div>
      </div>

      <a
        href={rec.recording_url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors"
      >
        <PlayIcon className="w-3.5 h-3.5" />
        Watch
      </a>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Recordings() {
  const [recs, setRecs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');

  useEffect(() => {
    recordingsApi.list()
      .then((r) => setRecs(r.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load recordings'))
      .finally(() => setLoading(false));
  }, []);

  // Group by class_name, then sort by most-recent recording inside each class
  const filtered = recs.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.class_name.toLowerCase().includes(q)
    );
  });

  // Group
  const grouped = filtered.reduce((acc, rec) => {
    const key = rec.class_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(rec);
    return acc;
  }, {});

  // Sort groups by the most recent recording date
  const sortedGroups = Object.entries(grouped).sort(([, a], [, b]) => {
    const aDate = new Date(a[0]?.recorded_at || 0);
    const bDate = new Date(b[0]?.recorded_at || 0);
    return bDate - aDate;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recordings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Session recordings from your classes</p>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search recordings…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 w-56"
          />
          <SearchIcon className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {!loading && !error && recs.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <VideoIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No recordings yet</p>
          <p className="text-sm mt-1">Recordings will appear here after a class session ends.</p>
        </div>
      )}

      {!loading && !error && recs.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No recordings match your search.</p>
        </div>
      )}

      {/* Grouped list */}
      {!loading && !error && sortedGroups.map(([className, classRecs]) => (
        <section key={className} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-semibold text-gray-800">{className}</h2>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {classRecs.length} {classRecs.length === 1 ? 'recording' : 'recordings'}
            </span>
          </div>
          <div className="space-y-3">
            {classRecs.map((rec) => (
              <RecordingCard key={rec.id} rec={rec} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function VideoIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
    </svg>
  );
}
function PlayIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
    </svg>
  );
}
function ClockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
    </svg>
  );
}
function SearchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
    </svg>
  );
}
