import { useState, useEffect } from 'react';
import { pricing as pricingApi } from '../../api';
import Modal from '../../components/Modal';

export default function Pricing() {
  const [tiers, setTiers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editTier, setEditTier] = useState(null);

  const load = async () => {
    try { const r = await pricingApi.list(); setTiers(r.data); } catch {}
  };

  useEffect(() => { load(); }, []);

  const del = async (id) => {
    if (!confirm('Delete this pricing tier?')) return;
    await pricingApi.remove(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pricing Tiers</h1>
          <p className="text-sm text-gray-500">Global pricing managed by Super Admin</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Tier</button>
      </div>

      {tiers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No pricing tiers yet</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiers.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                </div>
                <span className="text-xl font-bold text-brand-600">${t.base_price}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{t.currency}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setEditTier(t)} className="btn-secondary text-xs py-1.5 px-3 flex-1">Edit</button>
                <button onClick={() => del(t.id)} className="btn-danger text-xs py-1.5 px-3">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreate || editTier) && (
        <TierModal
          tier={editTier}
          onClose={() => { setShowCreate(false); setEditTier(null); }}
          onSaved={() => { setShowCreate(false); setEditTier(null); load(); }}
        />
      )}
    </div>
  );
}

function TierModal({ tier, onClose, onSaved }) {
  const [form, setForm] = useState({ name: tier?.name || '', description: tier?.description || '', basePrice: tier?.base_price || '', currency: tier?.currency || 'USD' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tier) await pricingApi.update(tier.id, form);
      else await pricingApi.create(form);
      onSaved();
    } catch {} finally { setLoading(false); }
  };

  return (
    <Modal open title={tier ? 'Edit Pricing Tier' : 'New Pricing Tier'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tier Name *</label>
          <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
          <input className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Base Price *</label>
            <input type="number" step="0.01" className="input" value={form.basePrice} onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
            <select className="input" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
              <option>USD</option><option>EUR</option><option>GBP</option><option>INR</option><option>AED</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
