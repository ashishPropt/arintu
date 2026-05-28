import { useState, useEffect } from 'react';
import { publicApi } from '../../api';

// ISO 3166-1 alpha-2 → flag emoji
const flagEmoji = (code) => {
  if (!code || code.length !== 2) return '🌐';
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map((c) => 0x1f1e6 - 65 + c.charCodeAt(0))
  );
};

export default function AboutCountries() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.countries()
      .then((r) => setCountries(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Countries We Serve</h1>
      <p className="text-gray-500 mb-10">
        Arintu offers localised pricing in each of these countries. Students pay in their local currency at a rate set by our team to keep learning affordable.
      </p>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {countries.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                <span className="text-3xl">{flagEmoji(c.code)}</span>
                <div>
                  <p className="font-semibold text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    {c.currency_symbol} {c.currency_code}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-brand-50 rounded-2xl border border-brand-100 p-6 text-center">
            <p className="text-sm font-semibold text-brand-800 mb-1">Don't see your country?</p>
            <p className="text-sm text-brand-700">
              We're continuously adding countries. Reach out at{' '}
              <a href="mailto:hello@arintu.com" className="underline hover:no-underline">hello@arintu.com</a>
              {' '}and we'll get you set up.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
