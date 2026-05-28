import { useState, useEffect, useCallback } from 'react';
import { users as usersApi, regions as regionsApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { useSearchParams } from 'react-router-dom';

const roleBadge = {
  admin: 'bg-blue-50 text-blue-700',
  teacher: 'bg-green-50 text-green-700',
  student: 'bg-orange-50 text-orange-700',
  superadmin: 'bg-purple-50 text-purple-700',
};

export default function Users() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [userList, setUserList] = useState([]);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || '');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [regions, setRegions] = useState([]);

  const isSuperAdmin = user?.role === 'superadmin';
  const allowedRoles = isSuperAdmin ? ['admin', 'teacher', 'student'] : ['teacher', 'student'];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({ role: roleFilter || undefined, search: search || undefined, limit: 50 });
      setUserList(res.data.users || []);
      setTotal(res.data.total || 0);
    } catch {} finally { setLoading(false); }
  }, [roleFilter, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { regionsApi.list().then((r) => setRegions(r.data || [])).catch(() => {}); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">{total} total</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ Add User</button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input className="input max-w-xs" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {['', ...allowedRoles].map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${roleFilter === r ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {r || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : userList.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No users found</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Region</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {userList.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-accent-400 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><span className={`badge ${roleBadge[u.role]}`}>{u.role}</span></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.region_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          allowedRoles={allowedRoles}
          regions={regions}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ allowedRoles, regions, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: allowedRoles[0] || 'teacher', phone: '', regionId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await usersApi.create({ ...form, regionId: form.regionId || undefined });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <Modal open title="Add User" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
          <input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
          <input type="password" className="input" placeholder="Min 6 characters" value={form.password} onChange={(e) => set('password', e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
            <select className="input" value={form.role} onChange={(e) => set('role', e.target.value)}>
              {allowedRoles.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Region</label>
            <select className="input" value={form.regionId} onChange={(e) => set('regionId', e.target.value)}>
              <option value="">— Select —</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
          <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating…' : 'Create User'}</button>
        </div>
      </form>
    </Modal>
  );
}
