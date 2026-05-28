import { useState, useEffect } from 'react';
import { publicApi } from '../../api';

function initials(name) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

const GRADIENT_CLASSES = [
  'from-brand-500 to-brand-700',
  'from-accent-500 to-accent-700',
  'from-purple-500 to-purple-700',
  'from-green-500 to-emerald-700',
  'from-pink-500 to-rose-700',
];

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.team()
      .then((r) => setMembers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Our Team</h1>
      <p className="text-gray-500 mb-10">
        Meet the people dedicated to making quality education accessible everywhere.
      </p>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading team…</div>
      ) : members.length === 0 ? (
        <div className="py-16 text-center text-gray-400">Team information coming soon.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {members.map((m, i) => (
            <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              {/* Colourful top bar + avatar */}
              <div className={`h-20 bg-gradient-to-r ${GRADIENT_CLASSES[i % GRADIENT_CLASSES.length]} relative`}>
                <div className="absolute -bottom-8 left-6">
                  {m.photo_url ? (
                    <img
                      src={m.photo_url}
                      alt={m.name}
                      className="w-16 h-16 rounded-xl object-cover border-4 border-white shadow"
                    />
                  ) : (
                    <div className={`w-16 h-16 rounded-xl bg-white border-4 border-white shadow flex items-center justify-center`}>
                      <span className={`text-xl font-bold bg-gradient-to-br ${GRADIENT_CLASSES[i % GRADIENT_CLASSES.length]} bg-clip-text text-transparent`}>
                        {initials(m.name)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="pt-12 pb-5 px-6 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{m.name}</h3>
                    <p className="text-xs font-medium text-brand-600 mt-0.5">{m.title}</p>
                  </div>
                  {m.linkedin_url && (
                    <a
                      href={m.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      aria-label="LinkedIn"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                  )}
                </div>

                {m.bio && (
                  <p className="text-sm text-gray-600 leading-relaxed">{m.bio}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Values section */}
      <div className="mt-14 grid sm:grid-cols-3 gap-5">
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
