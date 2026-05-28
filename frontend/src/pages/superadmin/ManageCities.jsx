import { useState, useEffect } from 'react';
import { content as contentApi, countries as countriesApi } from '../../api';
import Modal from '../../components/Modal';

export default function ManageCities() {
  const [cities, setCities] = useState([]);
  const [allCountries, setAllCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const load = () =>
    Promise.all([contentApi.getCities(), countriesApi.list()])
      .then(([c, co]) => {
        setCities(c.data);
        setAllCountries(co.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this city?')) return;
    await contentApi.deleteCity(id);
    load();
  };

  const handleToggle = async (c) => {
    await contentApi.updateCity(c.id, { is_active: !c.is_active });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Manage Cities</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cities shown on the public About Us / Cities page</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true); }}
          className="btn-primary text-sm"
        >
          + Add City
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-400">Loading…</div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {cities.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-400">
              No cities added yet. Click "Add City" to get started.
            </p>
          )}
          {cities.map((c) => (
            <div key={c.id} className="p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 font-bold text-sm flex items-center justify-center shrink-0">
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                {c.country_name && (
                  <p className="text-xs text-gray-500">{c.country_name}</p>
                )}
                {c.description && (
                  <p className="text-xs text-gray-400 truncate">{c.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`badge ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.is_active ? 'Visible' : 'Hidden'}
                </span>
                <button onClick={() => handleToggle(c)}
                  className="text-xs text-gray-500 hover:text-brand-600 px-2 py-1 rounded hover:bg-brand-50 transition-colors">
                  {c.is_active ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => { setEditTarget(c); setShowModal(true); }}
                  className="text-xs text-gray-500 hover:text-brand-600 px-2 py-1 rounded hover:bg-brand-50 transition-colors">
                  Edit
                </button>
                <button onClick={() => handleDelete(c.id)}
                  className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CityModal
          city={editTarget}
          countries={allCountries}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function CityModal({ city, countries, onClose, onSaved }) {
  const isNew = !city;
  const [form, setForm] = useState({
    name: city?.name || '',
    country_id: city?.country_id || '',
    description: city?.description || '',
    display_order: city?.display_order ?? 99,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, country_id: form.country_id || null };
      if (isNew) {
        await contentApi.createCity(payload);
      } else {
        await contentApi.updateCity(city.id, payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title={isNew ? 'Add City' : 'Edit City'} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">City Name *</label>
          <input className="input" placeholder="e.g. Mumbai" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
          <select className="input" value={form.country_id} onChange={(e) => set('country_id', e.target.value)}>
            <option value="">— Select country —</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
          <textarea className="input" rows={3} placeholder="Brief description of Arintu's presence in this city" value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Display Order</label>
          <input type="number" className="input" value={form.display_order} onChange={(e) => set('display_order', parseInt(e.target.value) || 99)} />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving…' : isNew ? 'Add City' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
