import { useState, useEffect } from 'react';
import { countries as countriesApi } from '../../api';
import Modal from '../../components/Modal';

export default function Countries() {
  const [list, setList] = useState([]);
  const [fees, setFees] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editFee, setEditFee] = useState(null); // { country_id, fee, currency_symbol, country_name }

  const load = async () => {
    const [c, f] = await Promise.all([countriesApi.list(), countriesApi.fees()]);
    setList(c.data);
    setFees(f.data);
  };

  useEffect(() => { load(); }, []);

  const del = async (id) => {
    if (!confirm('Delete this country? This will remove all associated pricing.')) return;
    await countriesApi.remove(id);
    load();
  };

  const feeFor = (countryId) => fees.find((f) => f.country_id === countryId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Countries & Fees</h1>
          <p className="text-sm text-gray-500">Countries for regional pricing and application fees</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Country</button>
      </div>

      <div className="card overflow-hidden mb-6">
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
                    <span className="badge bg-gray-100 text-gray-600">{c.code}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.currency_symbol} {c.currency_code} — {c.currency_name}
                  </td>
                  <td className="px-4 py-3">
                    {fee ? (
                      <button
                        onClick={() => setEditFee({ country_id: c.id, fee: fee.fee, currency_symbol: c.currency_symbol, country_name: c.name, currency_code: c.currency_code })}
                        className="text-sm font-semibold text-brand-600 hover:underline"
                      >
                        {c.currency_symbol}{fee.fee}
                      </button>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => del(c.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card p-4 bg-blue-50 border-blue-100 text-xs text-blue-700">
        💡 Click on an application fee amount to edit it. These are one-time fees charged to first-time applicants per country.
      </div>

      {showAdd && (
        <AddCountryModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load(); }} />
      )}

      {editFee && (
        <EditFeeModal
          data={editFee}
          onClose={() => setEditFee(null)}
          onSaved={() => { setEditFee(null); load(); }}
        />
      )}
    </div>
  );
}

function AddCountryModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', code: '', currencyCode: '', currencySymbol: '', currencyName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await countriesApi.create(form); onCreated(); }
    catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <Modal open title="Add Country" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Country Name *</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. United Kingdom" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Country Code * (2-letter ISO)</label>
            <input className="input uppercase" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="GB" maxLength={2} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Currency Code * (3-letter)</label>
            <input className="input uppercase" value={form.currencyCode} onChange={(e) => set('currencyCode', e.target.value.toUpperCase())} placeholder="GBP" maxLength={3} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Currency Symbol *</label>
            <input className="input" value={form.currencySymbol} onChange={(e) => set('currencySymbol', e.target.value)} placeholder="£" maxLength={5} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Currency Name</label>
            <input className="input" value={form.currencyName} onChange={(e) => set('currencyName', e.target.value)} placeholder="British Pound" />
          </div>
        </div>
        <p className="text-xs text-gray-500">An application fee of 15 will be set automatically and can be changed after.</p>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Adding…' : 'Add Country'}</button>
        </div>
      </form>
    </Modal>
  );
}

function EditFeeModal({ data, onClose, onSaved }) {
  const [fee, setFee] = useState(data.fee);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await countriesApi.setFee(data.country_id, fee); onSaved(); }
    catch {} finally { setLoading(false); }
  };

  return (
    <Modal open title={`Application Fee — ${data.country_name}`} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Set the one-time application fee for first-time students from {data.country_name}.
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Fee ({data.currency_symbol} {data.currency_code}) *
          </label>
          <input type="number" step="0.01" min="0" className="input" value={fee}
            onChange={(e) => setFee(e.target.value)} required />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Save Fee'}</button>
        </div>
      </form>
    </Modal>
  );
}
