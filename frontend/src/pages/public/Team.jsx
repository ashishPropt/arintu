import { useState, useEffect } from 'react';
import { publicApi } from '../../api';

function initials(name) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

const RING_COLORS = [
  'ring-brand-400',
  'ring-accent-400',
  'ring-purple-400',
  'ring-emerald-400',
  'ring-rose-400',
];

const BG_COLORS = [
  'bg-brand-100 text-brand-700',
  'bg-accent-100 text-accent-700',
  'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
];

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    publicApi.team()
      .then((r) => setMembers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Our Team</h1>
      <p className="text-gray-500 mb-10">
        Meet the people dedicated to making quality education accessible everywhere.
        Click on any team member to learn more.
      </p>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading team…</div>
      ) : members.length === 0 ? (
        <div className="py-16 text-center text-gray-400">Team information coming soon.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {members.map((m, i) => {
            const isExpanded = expandedId === m.id;
            const ringColor = RING_COLORS[i % RING_COLORS.length];
            const bgColor   = BG_COLORS[i % BG_COLORS.length];

            return (
              <div
                key={m.id}
                className={`col-span-1 ${isExpanded ? 'sm:col-span-3 lg:col-span-4' : ''}`}
              >
                {/* Collapsed card — always visible */}
                <button
                  onClick={() => toggle(m.id)}
                  className={`w-full bg-white rounded-2xl border shadow-sm p-5 flex flex-col items-center text-center gap-3 transition-all hover:shadow-md focus:outline-none ${
                    isExpanded ? 'border-brand-300 ring-2 ring-brand-200' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  {/* Avatar */}
                  {m.photo_url ? (
                    <img
                      src={m.photo_url}
                      alt={m.name}
                      className={`w-20 h-20 rounded-full object-cover ring-2 ${ringColor}`}
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold ring-2 ${ringColor} ${bgColor}`}>
                      {initials(m.name)}
                    </div>
                  )}

                  <div>
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{m.name}</p>
                    {m.title && (
                      <p className="text-xs text-brand-600 mt-0.5 leading-tight">{m.title}</p>
                    )}
                  </div>

                  {/* Chevron */}
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20" fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="mt-3 bg-white rounded-2xl border border-brand-200 shadow-md p-6 flex flex-col sm:flex-row gap-6 text-left">
                    {/* Large avatar */}
                    <div className="shrink-0 flex flex-col items-center gap-3">
                      {m.photo_url ? (
                        <img
                          src={m.photo_url}
                          alt={m.name}
                          className={`w-28 h-28 rounded-2xl object-cover ring-2 ${ringColor}`}
                        />
                      ) : (
                        <div className={`w-28 h-28 rounded-2xl flex items-center justify-center text-3xl font-bold ring-2 ${ringColor} ${bgColor}`}>
                          {initials(m.name)}
                        </div>
                      )}
                      {m.linkedin_url && (
                        <a
                          href={m.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          LinkedIn
                        </a>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{m.name}</h3>
                      {m.title && (
                        <p className="text-sm font-medium text-brand-600 mb-3">{m.title}</p>
                      )}
                      {m.bio ? (
                        <p className="text-sm text-gray-600 leading-relaxed">{m.bio}</p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Bio coming soon.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Values */}
      <div className="mt-16 grid sm:grid-cols-3 gap-5">
        {[
          { icon: '🌍', title: 'Global by design', desc: 'Our team spans multiple countries and time zones, giving us a unique perspective on what learners around the world need.' },
          { icon: '📖', title: 'Educators first', desc: 'Everyone at Arintu, regardless of their role, has a deep personal connection to education and its power to transform lives.' },
          { icon: '🔬', title: 'Evidence-driven', desc: 'We draw on the best research in learning science, cognitive psychology, and instructional design to continuously improve.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="text-2xl mb-2">{icon}</div>
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">{title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
