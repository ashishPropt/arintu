import { useState, useEffect } from 'react';
import { regions as regionsApi } from '../../api';
import Modal from '../../components/Modal';

export default function Regions() {
  const [list, setList] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    try { const r = await regionsApi.list(); setList(r.data); } catch {}
  };

  useEffect(() => { load(); }, []);

  const del = async (id) => {
    if (!confirm('Delete this region?')) return;
    await regionsApi.remove(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Regions</h1>
          <p className="text-sm text-gray-500">Regions for regional pricing and user assignment</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ Add Region</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Region</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Code</th>
              <th className="px-4 py-3"/>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                <td className="px-4 py-3"><span className="badge bg-gray-100 text-gray-600">{r.code}</span></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => del(r.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal open title="Add Region" onClose={() => setShowCreate(false)}>
          <AddRegionForm onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
        </Modal>
      )}
    </div>
  );
}

function AddRegionForm({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await regionsApi.create({ name, code }); onCreated(); }
    catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Region Name *</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Code (e.g. NA, EU) *</label>
        <input className="input uppercase" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={10} required />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Add Region'}</button>
      </div>
    </form>
  );
}
