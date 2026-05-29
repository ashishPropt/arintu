import { useState, useEffect, useCallback } from 'react';
import { worksheets as worksheetsApi, classes as classesApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { format } from 'date-fns';

const TYPE_COLORS = {
  worksheet:  'bg-blue-50 text-blue-700',
  quiz:       'bg-purple-50 text-purple-700',
  assignment: 'bg-orange-50 text-orange-700',
};

export default function Worksheets() {
  const { user } = useAuth();
  const isManager = ['admin', 'superadmin', 'teacher'].includes(user?.role);

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // Load classes
  useEffect(() => {
    classesApi.list({ limit: 100 }).then((r) => {
      const list = r.data.classes || [];
      setClasses(list);
      if (list.length > 0) setSelectedClass(list[0].id);
    }).catch(() => {});
  }, []);

  const loadItems = useCallback(async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const res = await worksheetsApi.list(selectedClass);
      setItems(res.data);
    } catch {} finally { setLoading(false); }
  }, [selectedClass]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const download = async (id, fileName) => {
    try {
      const token = localStorage.getItem('arintu_token');
      const a = document.createElement('a');
      a.href = `/api/worksheets/${id}/download`;
      // We need auth header — use a fetch approach
      const res = await fetch(`/api/worksheets/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { alert('Download failed'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = fileName || 'worksheet';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { alert('Download failed'); }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this worksheet?')) return;
    try {
      await worksheetsApi.remove(id);
      setItems((i) => i.filter((w) => w.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const togglePublish = async (item) => {
    try {
      const fd = new FormData();
      fd.append('isPublished', String(!item.is_published));
      const res = await worksheetsApi.update(item.id, fd);
      setItems((list) => list.map((w) => w.id === item.id ? res.data : w));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Worksheets & Quizzes</h1>
          <p className="text-sm text-gray-500">Course materials for students</p>
        </div>
        {isManager && selectedClass && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            + Upload Material
          </button>
        )}
      </div>

      {/* Class selector */}
      {classes.length > 0 && (
        <div className="mb-5">
          <select
            className="input max-w-xs"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : !selectedClass ? (
        <div className="text-center py-12 text-gray-400">Select a class to view materials</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {isManager ? 'No materials uploaded yet. Click "+ Upload Material" to add one.' : 'No materials available yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[item.type] || 'bg-gray-100 text-gray-600'}`}>
                      {item.type}
                    </span>
                    {!item.is_published && isManager && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Draft</span>
                    )}
                    <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-500 mb-1">{item.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                    {item.due_date && (
                      <span>Due: {format(new Date(item.due_date), 'MMM d, yyyy')}</span>
                    )}
                    {item.file_name && <span>📎 {item.file_name}</span>}
                    {isManager && item.created_by_name && (
                      <span>by {item.created_by_name}</span>
                    )}
                    <span>{format(new Date(item.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.file_path && (
                    <button
                      onClick={() => download(item.id, item.file_name)}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      Download
                    </button>
                  )}
                  {isManager && (
                    <>
                      <button
                        onClick={() => togglePublish(item)}
                        className={`text-xs py-1.5 px-3 rounded-lg border transition-colors ${
                          item.is_published
                            ? 'border-gray-200 text-gray-500 hover:bg-gray-50'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {item.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => setEditTarget(item)}
                        className="text-xs py-1.5 px-3 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-xs py-1.5 px-3 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <WorksheetModal
          classId={selectedClass}
          onClose={() => setShowCreate(false)}
          onSaved={(item) => { setItems((i) => [item, ...i]); setShowCreate(false); }}
        />
      )}

      {editTarget && (
        <WorksheetModal
          classId={selectedClass}
          item={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(item) => { setItems((i) => i.map((w) => w.id === item.id ? item : w)); setEditTarget(null); }}
        />
      )}
    </div>
  );
}

function WorksheetModal({ classId, item, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: item?.title || '',
    description: item?.description || '',
    type: item?.type || 'worksheet',
    dueDate: item?.due_date ? item.due_date.split('T')[0] : '',
    isPublished: item?.is_published || false,
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('classId', classId);
      fd.append('title', form.title);
      if (form.description) fd.append('description', form.description);
      fd.append('type', form.type);
      if (form.dueDate) fd.append('dueDate', new Date(form.dueDate).toISOString());
      fd.append('isPublished', String(form.isPublished));
      if (file) fd.append('file', file);

      let res;
      if (item) {
        res = await worksheetsApi.update(item.id, fd);
      } else {
        res = await worksheetsApi.create(fd);
      }
      onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setLoading(false); }
  };

  return (
    <Modal open title={item ? 'Edit Material' : 'Upload Material'} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
          <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder="e.g. Week 3 Algebra Worksheet" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select className="input" value={form.type} onChange={(e) => set('type', e.target.value)}>
              <option value="worksheet">Worksheet</option>
              <option value="quiz">Quiz</option>
              <option value="assignment">Assignment</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" className="input" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
          <textarea className="input" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional notes for students" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            File <span className="text-gray-400">(PDF, Word, JPG, PNG — max 10 MB)</span>
          </label>
          <input
            type="file"
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 file:text-xs file:font-medium"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
          {item?.file_name && !file && (
            <p className="text-xs text-gray-400 mt-1">Current: {item.file_name}</p>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => set('isPublished', e.target.checked)}
          />
          <span className="text-sm text-gray-700">Publish now (visible to students)</span>
        </label>

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving…' : item ? 'Save Changes' : 'Upload'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
