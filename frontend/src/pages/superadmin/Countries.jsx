import { useState, useEffect, useCallback } from 'react';
import { countries as countriesApi } from '../../api';
import Modal from '../../components/Modal';

export default function Countries() {
  const [list, setList]     = useState([]);
  const [fees, setFees]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [editTarget, setEditTarget] = useState(null); // country object to edit
  const [editFee, setEditFee]   = useState(null);     // { country_id, fee, … }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, f] = await Promise.all([countriesApi.list(), countriesApi.fees()]);
      setList(c.data);
      setFees(f.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const del = async (id, name) => {
    if (!confirm(`Delete "${name}"? This will remove all associated pricing.`)) return;
    try {
      await countriesApi.remove(id);
      setList((l) => l.filter((c) => c.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const feeFor = (countryId) => fees.find((f) => f.country_id === countryId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Countries &amp; Fees</h1>
          <p className="text-sm text-gray-500">Countries for regional pricing and application fees</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Country</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No countries yet. Click "+ Add Country" to get started.
        </div>
      ) : (
        <div className="card overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Country</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Code</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Currency</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Application Fee</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((c) => {
                const fee = feeFor(c.id);
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-gray-100 text-gray-600 text-xs font-mono px-2 py-0.5 rounded">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="font-medium">{c.currency_symbol}</span>
                      {' '}{c.currency_code}
                      {c.currency_name && <span className="text-gray-400 ml-1">— {c.currency_name}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {fee ? (
                        <button
                          onClick={() => setEditFee({
                            country_id: c.id,
                            fee: fee.fee,
                            currency_symbol: c.currency_symbol,
                            currency_code: c.currency_code,
                            country_name: c.name,
                          })}
                          className="text-sm font-semibold text-brand-600 hover:underline"
                          title="Click to edit fee"
                        >
                          {c.currency_symbol}{Number(fee.fee).toLocaleString()}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs italic">not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setEditTarget(c)}
                          className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => del(c.id, c.name)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
        💡 Click an application fee amount to change it. Click <strong>Edit</strong> to update a country's name or currency details.
      </div>

      {showAdd && (
        <CountryModal
          onClose={() => setShowAdd(false)}
          onSaved={(newCountry) => {
            setList((l) => [...l, newCountry].sort((a, b) => a.name.localeCompare(b.name)));
            setShowAdd(false);
            // reload fees to get the auto-created default fee
            countriesApi.fees().then((r) => setFees(r.data)).catch(() => {});
          }}
        />
      )}

      {editTarget && (
        <CountryModal
          country={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            setList((l) => l.map((c) => c.id === updated.id ? updated : c));
            setEditTarget(null);
          }}
        />
      )}

      {editFee && (
        <EditFeeModal
          data={editFee}
          onClose={() => setEditFee(null)}
          onSaved={(updated) => {
            setFees((f) => f.map((x) => x.country_id === updated.country_id ? updated : x));
            setEditFee(null);
          }}
        />
      )}
    </div>
  );
}

// ── Add / Edit country modal ───────────────────────────────────────────────────
function CountryModal({ country, onClose, onSaved }) {
  const isEdit = Boolean(country);
  const [form, setForm] = useState({
    name:           country?.name            || '',
    code:           country?.code            || '',
    currencyCode:   country?.currency_code   || '',
    currencySymbol: country?.currency_symbol || '',
    currencyName:   country?.currency_name   || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (isEdit) {
        res = await countriesApi.update(country.id, form);
      } else {
        res = await countriesApi.create(form);
      }
      onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title={isEdit ? `Edit: ${country.name}` : 'Add Country'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Country Name *</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. United Kingdom"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Country Code * <span className="text-gray-400">(2-letter ISO)</span>
            </label>
            <input
              className="input uppercase"
              value={form.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
              placeholder="GB"
              maxLength={2}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Currency Code * <span className="text-gray-400">(3-letter)</span>
            </label>
            <input
              className="input uppercase"
              value={form.currencyCode}
              onChange={(e) => set('currencyCode', e.target.value.toUpperCase())}
              placeholder="GBP"
              maxLength={3}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Currency Symbol *</label>
            <input
              className="input"
              value={form.currencySymbol}
              onChange={(e) => set('currencySymbol', e.target.value)}
              placeholder="£"
              maxLength={5}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Currency Name</label>
            <input
              className="input"
              value={form.currencyName}
              onChange={(e) => set('currencyName', e.target.value)}
              placeholder="British Pound"
            />
          </div>
        </div>

        {!isEdit && (
          <p className="text-xs text-gray-400">
            A default application fee of 15 will be set automatically — you can change it after.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Country'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Edit application fee modal ─────────────────────────────────────────────────
function EditFeeModal({ data, onClose, onSaved }) {
  const [fee, setFee]       = useState(data.fee);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await countriesApi.setFee(data.country_id, fee);
      onSaved({ ...res.data, country_id: data.country_id });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setLoading(false); }
  };

  return (
    <Modal open title={`Application Fee — ${data.country_name}`} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
        <p className="text-sm text-gray-600">
          One-time fee charged to first-time applicants from <strong>{data.country_name}</strong>.
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Fee ({data.currency_symbol} {data.currency_code})
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            required
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving…' : 'Save Fee'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
