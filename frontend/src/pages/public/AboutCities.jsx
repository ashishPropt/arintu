import { useState, useEffect } from 'react';
import { publicApi } from '../../api';

// ISO 3166-1 alpha-2 → flag emoji
const flagEmoji = (code) => {
  if (!code || code.length !== 2) return '🌍';
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map((c) => 0x1f1e6 - 65 + c.charCodeAt(0))
  );
};

export default function AboutCities() {
  const [cities,           setCities]           = useState([]);
  const [studentCountries, setStudentCountries] = useState([]);
  const [loading,          setLoading]          = useState(true);

  useEffect(() => {
    Promise.all([
      publicApi.cities(),
      publicApi.studentCountries(),
    ])
      .then(([citiesRes, countriesRes]) => {
        setCities(citiesRes.data || []);
        setStudentCountries(countriesRes.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-24 text-center text-gray-400">Loading…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14">

      {/* ── Student countries section ─────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Where our students are from</h2>
        <p className="text-gray-500 mb-8">
          Our learners come from all over the world. Here's a live look at the countries
          represented in our student community.
        </p>

        {studentCountries.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🌐</div>
            <p className="text-sm text-gray-500">Student country data will appear here as learners join.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {studentCountries.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                <span className="text-3xl leading-none">{flagEmoji(c.code)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400">
                    {c.student_count} {Number(c.student_count) === 1 ? 'student' : 'students'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
