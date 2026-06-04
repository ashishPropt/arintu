import { useState, useEffect, useCallback } from 'react';
import { jobs as jobsApi } from '../../api';

const EMPTY = {
  title: '',
  department: '',
  location: '',
  type: 'Full-time',
  description: '',
  requirements: '',
  is_active: true,
  display_order: 0,
};

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Volunteer'];

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function ManageJobs() {
  const [listing, setListing]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null);   // null | 'new' | job object
  const [form,    setForm]      = useState(EMPTY);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState(null);
  const [confirm, setConfirm]   = useState(null);   // id to delete

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobsApi.list();
      setListing(res.data);
    } catch {
      setError('Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setForm(EMPTY);
    setEditing('new');
    setError(null);
  };

  const openEdit = (job) => {
    setForm({ ...EMPTY, ...job });
    setEditing(job);
    setError(null);
  };

  const closeForm = () => { setEditing(null); setError(null); };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError(null);
    try {
      if (editing === 'new') {
        await jobsApi.create(form);
      } else {
        await jobsApi.update(editing.id, form);
      }
      await load();
      closeForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await jobsApi.remove(id);
      setConfirm(null);
      await load();
    } catch {
      setError('Failed to delete job.');
    }
  };

  const toggleActive = async (job) => {
    try {
      await jobsApi.update(job.id, { is_active: !job.is_active });
      await load();
    } catch {
      setError('Failed to update job status.');
    }
  };

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Job Postings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage open positions shown on the public Jobs page. When no active jobs exist, the page shows the "hiring soon" message.
          </p>
        </div>
        <button onClick={openNew} className="btn-primary text-sm">
          + Post a Job
        </button>
      </div>

      {error && !editing && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* Job list */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>
      ) : listing.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-3">💼</p>
          <p className="text-gray-500 text-sm">No jobs posted yet.</p>
          <p className="text-gray-400 text-xs mt-1">
            The public Jobs page is showing the "hiring soon" message.
          </p>
          <button onClick={openNew} className="btn-primary text-sm mt-4">Post your first job</button>
        </div>
      ) : (
        <div className="space-y-3">
          {listing.map((job) => (
            <div key={job.id} className={`card p-5 flex gap-4 items-start ${!job.is_active ? 'opacity-60' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="font-semibold text-gray-900 text-sm">{job.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    job.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {job.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {job.type}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {[job.department, job.location].filter(Boolean).join(' · ') || 'No department/location'}
                </p>
                {job.description && (
                  <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{job.description}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(job)}
                  className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                >
                  {job.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => openEdit(job)}
                  className="text-xs text-brand-600 hover:text-brand-800 border border-brand-200 rounded-lg px-3 py-1.5 hover:bg-brand-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirm(job.id)}
                  className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 mb-2">Delete job posting?</h3>
            <p className="text-sm text-gray-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirm(null)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={() => handleDelete(confirm)} className="btn-primary bg-red-600 hover:bg-red-700 text-sm">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {editing !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {editing === 'new' ? 'Post a New Job' : 'Edit Job'}
              </h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <Field label="Job Title *">
                <input
                  className="input"
                  placeholder="e.g. Curriculum Designer"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Department">
                  <input
                    className="input"
                    placeholder="e.g. Education"
                    value={form.department}
                    onChange={(e) => set('department', e.target.value)}
                  />
                </Field>
                <Field label="Location">
                  <input
                    className="input"
                    placeholder="e.g. Remote · San Diego, CA"
                    value={form.location}
                    onChange={(e) => set('location', e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Employment Type">
                  <select
                    className="input"
                    value={form.type}
                    onChange={(e) => set('type', e.target.value)}
                  >
                    {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Display Order">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={form.display_order}
                    onChange={(e) => set('display_order', parseInt(e.target.value) || 0)}
                  />
                </Field>
              </div>

              <Field label="Description">
                <textarea
                  className="input"
                  rows={4}
                  placeholder="What will this person do? What's the impact of the role?"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </Field>

              <Field label="Requirements">
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Skills, experience, or qualifications we're looking for."
                  value={form.requirements}
                  onChange={(e) => set('requirements', e.target.value)}
                />
              </Field>

              <div className="flex items-center gap-2">
                <input
                  id="is_active"
                  type="checkbox"
                  className="rounded"
                  checked={form.is_active}
                  onChange={(e) => set('is_active', e.target.checked)}
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Show on public Jobs page (active)
                </label>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button onClick={closeForm} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
                {saving ? 'Saving…' : editing === 'new' ? 'Post Job' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
