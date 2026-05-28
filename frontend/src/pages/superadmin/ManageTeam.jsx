import { useState, useEffect } from 'react';
import { content as contentApi } from '../../api';
import Modal from '../../components/Modal';

export default function ManageTeam() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null); // null = add, obj = edit
  const [showModal, setShowModal] = useState(false);

  const load = () =>
    contentApi.getTeam()
      .then((r) => setMembers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this team member?')) return;
    await contentApi.deleteTeamMember(id);
    load();
  };

  const handleToggle = async (m) => {
    await contentApi.updateTeamMember(m.id, { is_active: !m.is_active });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Manage Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">Team members shown on the public About Us / Team page</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true); }}
          className="btn-primary text-sm"
        >
          + Add Member
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-400">Loading…</div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {members.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-400">No team members yet.</p>
          )}
          {members.map((m) => (
            <div key={m.id} className="p-4 flex items-center gap-4">
              {m.photo_url ? (
                <img src={m.photo_url} alt={m.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 font-bold text-sm flex items-center justify-center shrink-0">
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                <p className="text-xs text-gray-500">{m.title}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`badge ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {m.is_active ? 'Visible' : 'Hidden'}
                </span>
                <button
                  onClick={() => handleToggle(m)}
                  className="text-xs text-gray-500 hover:text-brand-600 px-2 py-1 rounded hover:bg-brand-50 transition-colors"
                >
                  {m.is_active ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => { setEditTarget(m); setShowModal(true); }}
                  className="text-xs text-gray-500 hover:text-brand-600 px-2 py-1 rounded hover:bg-brand-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <MemberModal
          member={editTarget}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function MemberModal({ member, onClose, onSaved }) {
  const isNew = !member;
  const [form, setForm] = useState({
    name: member?.name || '',
    title: member?.title || '',
    bio: member?.bio || '',
    photo_url: member?.photo_url || '',
    linkedin_url: member?.linkedin_url || '',
    display_order: member?.display_order ?? 99,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isNew) {
        await contentApi.createTeamMember(form);
      } else {
        await contentApi.updateTeamMember(member.id, form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title={isNew ? 'Add Team Member' : 'Edit Team Member'} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Title / Role *</label>
            <input className="input" placeholder="e.g. Chief Executive Officer" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Bio</label>
            <textarea className="input" rows={4} value={form.bio} onChange={(e) => set('bio', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Photo URL</label>
            <input className="input" placeholder="https://…" value={form.photo_url} onChange={(e) => set('photo_url', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn URL</label>
            <input className="input" placeholder="https://linkedin.com/in/…" value={form.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Display Order</label>
            <input type="number" className="input" value={form.display_order} onChange={(e) => set('display_order', parseInt(e.target.value) || 99)} />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving…' : isNew ? 'Add Member' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
