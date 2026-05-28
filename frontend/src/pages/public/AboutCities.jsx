import { useState, useEffect } from 'react';
import { publicApi } from '../../api';

export default function AboutCities() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.cities()
      .then((r) => setCities(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Our Cities</h1>
      <p className="text-gray-500 mb-10">
        Arintu is a global platform with a local heart. These are the cities where we have an active presence — teachers, student groups, or partner institutions.
      </p>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : cities.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🌏</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Expanding soon</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            We're actively growing our city network. Check back soon to see where Arintu is coming to next.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cities.map((city) => (
            <div key={city.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center shrink-0 text-base font-bold">
                  {city.name[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{city.name}</h3>
                  {city.country_name && (
                    <p className="text-xs text-gray-500">{city.country_name}</p>
                  )}
                </div>
              </div>
              {city.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{city.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
