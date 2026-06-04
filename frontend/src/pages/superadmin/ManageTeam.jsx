import { useState, useEffect, useRef } from 'react';
import { content as contentApi, teacherProfile as teacherProfileApi } from '../../api';
import Modal from '../../components/Modal';

export default function ManageTeam() {
  const [tab, setTab] = useState('staff');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Manage Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">Team members and teachers shown on the public Team page</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {[
          { key: 'staff',    label: '👥 Staff & Leadership' },
          { key: 'teachers', label: '🎓 Teachers' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === key ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'staff'    && <StaffPanel />}
      {tab === 'teachers' && <TeachersPanel />}
    </div>
  );
}

// ─── Staff / Leadership (existing team_members table) ────────────────────────

function StaffPanel() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null);
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
      <div className="flex justify-end mb-4">
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
          {members.map((m) => {
            const displayPhoto =
              m.photo_source === 'upload' && m.has_uploaded_photo
                ? `/api/public/team/${m.id}/photo`
                : m.photo_url || null;

            return (
              <div key={m.id} className="p-4 flex items-center gap-4">
                {displayPhoto ? (
                  <img src={displayPhoto} alt={m.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 font-bold text-sm flex items-center justify-center shrink-0">
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Photo:{' '}
                    {m.photo_source === 'upload'
                      ? m.has_uploaded_photo ? '📁 Uploaded file' : '📁 Upload (no file yet)'
                      : m.photo_url ? '🔗 External URL' : '— None'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`badge ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {m.is_active ? 'Visible' : 'Hidden'}
                  </span>
                  <button onClick={() => handleToggle(m)}
                    className="text-xs text-gray-500 hover:text-brand-600 px-2 py-1 rounded hover:bg-brand-50 transition-colors">
                    {m.is_active ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => { setEditTarget(m); setShowModal(true); }}
                    className="text-xs text-gray-500 hover:text-brand-600 px-2 py-1 rounded hover:bg-brand-50 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(m.id)}
                    className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
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

// ─── Teachers panel ───────────────────────────────────────────────────────────

function TeachersPanel() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editTarget, setEditTarget] = useState(null);

  const load = () =>
    teacherProfileApi.list()
      .then((r) => setTeachers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const toggleVisibility = async (t) => {
    await teacherProfileApi.update(t.id, { show_on_team: !t.show_on_team });
    load();
  };

  if (loading) return <div className="py-10 text-center text-gray-400">Loading…</div>;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Teachers appear on the public Team page when "Visible" is on.
        Click <strong>Edit Profile</strong> to update their bio or photo on their behalf.
      </p>

      <div className="card divide-y divide-gray-50">
        {teachers.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-400">No teachers found.</p>
        )}
        {teachers.map((t) => (
          <div key={t.id} className="p-4 flex items-center gap-4">
            {t.photo_url ? (
              <img src={`${t.photo_url}?t=${Date.now()}`} alt={t.name}
                className="w-10 h-10 rounded-xl object-cover shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 font-bold text-sm flex items-center justify-center shrink-0">
                {t.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
              <p className="text-xs text-gray-400 truncate">{t.email}</p>
              {t.bio ? (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.bio}</p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5 italic">No bio yet</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={`badge ${t.is_active ? '' : 'bg-red-50 text-red-500'} ${t.show_on_team && t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {!t.is_active ? 'Inactive' : t.show_on_team ? 'Visible' : 'Hidden'}
              </span>
              {t.is_active && (
                <button onClick={() => toggleVisibility(t)}
                  className="text-xs text-gray-500 hover:text-brand-600 px-2 py-1 rounded hover:bg-brand-50 transition-colors">
                  {t.show_on_team ? 'Hide' : 'Show'}
                </button>
              )}
              <button onClick={() => setEditTarget(t)}
                className="text-xs text-gray-500 hover:text-brand-600 px-2 py-1 rounded hover:bg-brand-50 transition-colors">
                Edit Profile
              </button>
            </div>
          </div>
        ))}
      </div>

      {editTarget && (
        <TeacherProfileModal
          teacher={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); load(); }}
        />
      )}
    </div>
  );
}

// ─── Teacher profile edit modal (admin/superadmin) ────────────────────────────

function TeacherProfileModal({ teacher, onClose, onSaved }) {
  const [bio, setBio]           = useState(teacher.bio || '');
  const [linkedin, setLinkedin] = useState(teacher.linkedin_url || '');
  const [showOnTeam, setShow]   = useState(teacher.show_on_team !== false);
  const [photoFile, setPhotoFile]       = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await teacherProfileApi.update(teacher.id, { bio, linkedin_url: linkedin, show_on_team: showOnTeam });
      if (photoFile) await teacherProfileApi.uploadPhoto(teacher.id, photoFile);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setLoading(false); }
  };

  const currentPhoto = photoPreview
    || (teacher.has_uploaded_photo ? `/api/public/teacher/${teacher.id}/photo` : null)
    || teacher.avatar_url
    || null;

  const initials = teacher.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Modal open title={`Edit Profile — ${teacher.name}`} onClose={onClose} size="md">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        {/* Photo */}
        <div className="flex items-center gap-4">
          {currentPhoto ? (
            <img src={currentPhoto} alt={teacher.name}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-brand-200 shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-brand-100 text-brand-700 font-bold text-lg flex items-center justify-center ring-2 ring-brand-200 shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{teacher.name}</p>
            <p className="text-xs text-gray-500">{teacher.email}</p>
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={handleFileChange} />
            {photoFile ? (
              <p className="text-xs text-brand-600 mt-1">📷 {photoFile.name}</p>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="mt-1 text-xs text-brand-600 hover:underline">
                {currentPhoto ? 'Replace photo…' : 'Upload photo…'}
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Bio / Profile Message</label>
          <textarea className="input" rows={4} value={bio} onChange={(e) => setBio(e.target.value)}
            placeholder="About this teacher — background, teaching style, interests…" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn URL (optional)</label>
          <input type="url" className="input" value={linkedin} onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/…" />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showOnTeam} onChange={(e) => setShow(e.target.checked)}
            className="accent-brand-600 w-4 h-4" />
          <span className="text-sm text-gray-700">Show on public Team page</span>
        </label>

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Staff member add/edit modal (unchanged from before) ─────────────────────

function MemberModal({ member, onClose, onSaved }) {
  const isNew = !member;

  const [form, setForm] = useState({
    name:          member?.name          || '',
    title:         member?.title         || '',
    bio:           member?.bio           || '',
    photo_url:     member?.photo_url     || '',
    linkedin_url:  member?.linkedin_url  || '',
    display_order: member?.display_order ?? 99,
    photo_source:  member?.photo_source  || 'url',
  });

  const [photoFile,    setPhotoFile]    = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const fileRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const savedUploadedUrl =
    !isNew && member?.has_uploaded_photo
      ? `/api/public/team/${member.id}/photo`
      : null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const clearFile = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let savedId = member?.id;
      if (isNew) {
        const res = await contentApi.createTeamMember(form);
        savedId = res.data.id;
      } else {
        await contentApi.updateTeamMember(member.id, form);
      }
      if (photoFile && savedId) {
        await contentApi.uploadTeamPhoto(savedId, photoFile);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setLoading(false); }
  };

  return (
    <Modal open title={isNew ? 'Add Team Member' : 'Edit Team Member'} onClose={onClose} size="md">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
            <input className="input" value={form.name}
              onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Title / Role *</label>
            <input className="input" placeholder="e.g. Chief Executive Officer"
              value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Bio</label>
            <textarea className="input" rows={3}
              value={form.bio} onChange={(e) => set('bio', e.target.value)} />
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-700">Photo</p>
          <div className="flex gap-3">
            {[
              { value: 'url',    label: '🔗 External URL' },
              { value: 'upload', label: '📁 Upload image' },
            ].map(({ value, label }) => (
              <label key={value}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                  form.photo_source === value
                    ? 'border-brand-400 bg-brand-50 text-brand-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <input type="radio" name="photo_source" value={value}
                  checked={form.photo_source === value}
                  onChange={() => set('photo_source', value)} className="accent-brand-600" />
                {label}
              </label>
            ))}
          </div>

          {form.photo_source === 'url' && (
            <div className="space-y-2">
              <input className="input" placeholder="https://example.com/photo.jpg"
                value={form.photo_url} onChange={(e) => set('photo_url', e.target.value)} />
              {form.photo_url && (
                <img src={form.photo_url} alt="preview"
                  className="w-16 h-16 rounded-xl object-cover border border-gray-200"
                  onError={(e) => { e.target.style.display = 'none'; }} />
              )}
            </div>
          )}

          {form.photo_source === 'upload' && (
            <div className="space-y-2">
              {savedUploadedUrl && !photoFile && (
                <div className="flex items-center gap-3">
                  <img src={savedUploadedUrl} alt="current"
                    className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Current uploaded photo</p>
                    <p className="text-xs text-gray-400">Choose a new file below to replace it</p>
                  </div>
                </div>
              )}
              {photoFile && photoPreview && (
                <div className="flex items-center gap-3">
                  <img src={photoPreview} alt="preview"
                    className="w-16 h-16 rounded-xl object-cover border border-brand-200" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{photoFile.name}</p>
                    <p className="text-xs text-gray-400">{(photoFile.size / 1024).toFixed(0)} KB</p>
                    <button type="button" onClick={clearFile}
                      className="text-xs text-red-500 hover:text-red-700 mt-0.5">Remove</button>
                  </div>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={handleFileChange} />
              {!photoFile && (
                <button type="button" onClick={() => fileRef.current.click()}
                  className="w-full py-2 px-3 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:border-brand-300 transition-colors">
                  {savedUploadedUrl ? 'Replace photo — click to choose file' : 'Click to choose photo — JPG, PNG, WebP, GIF, max 5 MB'}
                </button>
              )}
              {photoFile && (
                <button type="button" onClick={() => fileRef.current.click()}
                  className="text-xs text-brand-600 hover:underline">
                  Choose a different file
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-gray-400">
            The <strong>{form.photo_source === 'url' ? 'URL' : 'uploaded'}</strong> image will be shown on the public Team page.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn URL</label>
            <input className="input" placeholder="https://linkedin.com/in/…"
              value={form.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Display Order</label>
            <input type="number" className="input" value={form.display_order}
              onChange={(e) => set('display_order', parseInt(e.target.value) || 99)} />
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
