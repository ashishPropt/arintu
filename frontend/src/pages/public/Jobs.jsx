import { useState, useEffect } from 'react';
import { useSiteContent } from '../../hooks/useSiteContent';
import { publicApi } from '../../api';

const DEFAULT_JOBS = {
  emoji: '🚀',
  title: "We're Hiring — Soon",
  subtitle:
    "Exciting opportunities are on the way. We're building a small, passionate team committed to making quality education accessible everywhere. Check back here for open roles as we grow.",
  contact_email: 'infoenfinitty@gmail.com',
};

const TYPE_COLORS = {
  'Full-time':  'bg-brand-100 text-brand-700',
  'Part-time':  'bg-purple-100 text-purple-700',
  'Contract':   'bg-amber-100 text-amber-700',
  'Volunteer':  'bg-emerald-100 text-emerald-700',
};

function JobCard({ job }) {
  const [open, setOpen] = useState(false);
  const typeColor = TYPE_COLORS[job.type] || 'bg-gray-100 text-gray-600';

  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{job.title}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {job.department && (
              <span className="text-xs text-gray-500">{job.department}</span>
            )}
            {job.department && job.location && (
              <span className="text-gray-200 text-xs">•</span>
            )}
            {job.location && (
              <span className="text-xs text-gray-500">{job.location}</span>
            )}
          </div>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${typeColor}`}>
          {job.type}
        </span>
      </div>

      {job.description && (
        <p className="text-sm text-gray-600 mt-3 leading-relaxed line-clamp-2">{job.description}</p>
      )}

      {(job.description?.length > 120 || job.requirements) && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-3 text-xs text-brand-600 hover:underline font-medium"
        >
          {open ? 'Show less ↑' : 'Read more ↓'}
        </button>
      )}

      {open && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          {job.description && (
            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">About the role</p>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{job.description}</p>
            </div>
          )}
          {job.requirements && (
            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">What we're looking for</p>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{job.requirements}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Jobs() {
  const { data } = useSiteContent('jobs', DEFAULT_JOBS);
  const [listings, setListings] = useState(null); // null = loading

  useEffect(() => {
    publicApi.jobs()
      .then((res) => setListings(res.data))
      .catch(() => setListings([]));
  }, []);

  // Loading
  if (listings === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  // No active jobs — show the "hiring soon" fallback
  if (listings.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="text-6xl mb-6">{data.emoji}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{data.title}</h1>
        <p className="text-gray-500 leading-relaxed mb-6">{data.subtitle}</p>
        <p className="text-sm text-gray-400">
          In the meantime, feel free to introduce yourself at{' '}
          <a href={`mailto:${data.contact_email}`} className="text-brand-600 hover:underline">
            {data.contact_email}
          </a>
          {' '}— we'd love to hear from you.
        </p>
      </div>
    );
  }

  // Active job listings
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">💼</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Open Positions</h1>
        <p className="text-gray-500 text-sm">
          We're growing our team. Find a role where you can make a real difference in education.
        </p>
      </div>

      <div className="space-y-4">
        {listings.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>

      <p className="text-center text-sm text-gray-400 mt-10">
        Don't see the right fit?{' '}
        <a href={`mailto:${data.contact_email}`} className="text-brand-600 hover:underline">
          Introduce yourself anyway
        </a>{' '}
        — we'd love to hear from you.
      </p>
    </div>
  );
}
