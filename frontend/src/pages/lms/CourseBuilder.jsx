import { useState, useEffect, useCallback } from 'react'
import { lms } from '../../api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function Badge({ children, className = '' }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

const contentTypeBadge = (type) => {
  const map = {
    text:  'bg-blue-50 text-blue-700',
    video: 'bg-purple-50 text-purple-700',
    file:  'bg-amber-50 text-amber-700',
  }
  return map[type] || 'bg-gray-100 text-gray-600'
}

function SectionHeader({ icon, title, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold text-gray-800 flex items-center gap-1.5">
        <span>{icon}</span> {title}
      </h3>
      {action}
    </div>
  )
}

function ErrorBanner({ msg }) {
  if (!msg) return null
  return <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 mb-3">{msg}</div>
}

// ── Announcements Section ─────────────────────────────────────────────────────

function AnnouncementsSection({ classId, announcements, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', is_pinned: false })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setErr('Title and content are required.')
      return
    }
    setSaving(true)
    setErr('')
    try {
      await lms.createAnnouncement({ classId, ...form })
      setForm({ title: '', content: '', is_pinned: false })
      setShowForm(false)
      onRefresh()
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save announcement')
    } finally {
      setSaving(false)
    }
  }

  const del = async (id) => {
    try {
      await lms.deleteAnnouncement(id)
      onRefresh()
    } catch {}
  }

  return (
    <div className="card p-4 mb-4">
      <SectionHeader
        icon="📢"
        title="Announcements"
        action={
          !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary text-xs py-1 px-3"
            >
              ＋ New Announcement
            </button>
          )
        }
      />

      {showForm && (
        <div className="mb-4 p-3 border border-brand-100 rounded-xl bg-brand-50/30 space-y-3">
          <ErrorBanner msg={err} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Announcement title"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Content *</label>
            <textarea
              className="input"
              rows={3}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Write your announcement here…"
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 accent-brand-600"
              checked={form.is_pinned}
              onChange={(e) => setForm((f) => ({ ...f, is_pinned: e.target.checked }))}
            />
            <span>📌 Pin to top</span>
          </label>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-xs py-1 px-3">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setShowForm(false); setErr('') }}
              className="btn-secondary text-xs py-1 px-3"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {announcements.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-3">No announcements yet</p>
      ) : (
        <div className="space-y-2">
          {[...announcements]
            .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
            .map((a) => (
              <div key={a.id} className="flex items-start justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800 truncate">{a.title}</span>
                    {a.is_pinned && <Badge className="bg-amber-50 text-amber-700">📌 Pinned</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.content}</p>
                </div>
                <button
                  onClick={() => del(a.id)}
                  className="text-xs text-red-400 hover:text-red-600 shrink-0 px-1 py-0.5 rounded hover:bg-red-50 transition-colors"
                  title="Delete announcement"
                >
                  🗑
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ── Lesson Form ───────────────────────────────────────────────────────────────

function LessonForm({ moduleId, classId, initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || {
      title: '',
      content_type: 'text',
      content_text: '',
      video_url: '',
      duration_mins: '',
      file_url: '',
      file_name: '',
      is_published: true,
    }
  )
  const [pickedFile, setPickedFile]   = useState(null)   // File object from <input type="file">
  const [saving, setSaving]           = useState(false)
  const [err, setErr]                 = useState('')

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.title.trim()) { setErr('Lesson title is required.'); return }
    setSaving(true)
    setErr('')
    try {
      let payload

      if (form.content_type === 'file' && pickedFile) {
        // Use FormData so the file travels as multipart
        const fd = new FormData()
        fd.append('moduleId', moduleId)
        fd.append('classId', classId)
        fd.append('title', form.title)
        fd.append('content_type', 'file')
        fd.append('is_published', form.is_published)
        fd.append('lesson_file', pickedFile)
        payload = fd
      } else {
        payload = {
          moduleId,
          classId,
          title: form.title,
          content_type: form.content_type,
          is_published: form.is_published,
          ...(form.content_type === 'text'  && { content_text: form.content_text }),
          ...(form.content_type === 'video' && {
            video_url: form.video_url,
            duration_mins: form.duration_mins ? parseInt(form.duration_mins) : undefined,
          }),
          ...(form.content_type === 'file'  && {
            file_url: form.file_url,
            file_name: form.file_name,
          }),
        }
      }

      if (initial?.id) {
        await lms.updateLesson(initial.id, payload)
      } else {
        await lms.createLesson(payload)
      }
      onSave()
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save lesson')
    } finally {
      setSaving(false)
    }
  }

  // Existing uploaded file (edit mode)
  const existingFilePath = initial?.file_path
  const existingFileName = initial?.file_name

  return (
    <div className="mt-2 p-3 rounded-xl border border-brand-100 bg-brand-50/20 space-y-3">
      <ErrorBanner msg={err} />
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Lesson Title *</label>
        <input className="input" value={form.title} onChange={(e) => setF('title', e.target.value)} placeholder="Lesson title" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Content Type</label>
        <select className="input" value={form.content_type} onChange={(e) => { setF('content_type', e.target.value); setPickedFile(null) }}>
          <option value="text">📝 Text</option>
          <option value="video">🎬 Video (YouTube / Vimeo)</option>
          <option value="file">📎 File upload</option>
        </select>
      </div>

      {form.content_type === 'text' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
          <textarea className="input" rows={4} value={form.content_text} onChange={(e) => setF('content_text', e.target.value)} placeholder="Lesson content…" />
        </div>
      )}

      {form.content_type === 'video' && (
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Video URL</label>
            <input className="input" value={form.video_url} onChange={(e) => setF('video_url', e.target.value)} placeholder="https://youtu.be/… or https://vimeo.com/…" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <input type="number" className="input" min="1" value={form.duration_mins} onChange={(e) => setF('duration_mins', e.target.value)} placeholder="e.g. 15" />
          </div>
        </div>
      )}

      {form.content_type === 'file' && (
        <div className="space-y-2">
          {/* Show existing uploaded file when editing */}
          {existingFilePath && !pickedFile && (
            <div className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg">
              <span className="text-lg">📎</span>
              <span className="text-xs text-gray-700 truncate flex-1">{existingFileName || 'Uploaded file'}</span>
              <span className="text-xs text-gray-400">Replace below ↓</span>
            </div>
          )}

          {/* File picker — uploads to server */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {existingFilePath ? 'Replace file (optional)' : 'Upload file *'}
            </label>
            <input
              type="file"
              className="block w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mp3,.wav,.zip,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0] || null
                setPickedFile(f)
                if (f) setF('file_name', f.name)
              }}
            />
            {pickedFile && (
              <p className="mt-1 text-xs text-green-700">
                ✓ {pickedFile.name} ({(pickedFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">PDF, Word, PowerPoint, Excel, images, MP4, ZIP — max 50 MB</p>
          </div>

          {/* OR paste external URL */}
          {!pickedFile && !existingFilePath && (
            <div>
              <p className="text-xs text-gray-400 mb-1 text-center">— or paste an external link —</p>
              <input className="input" value={form.file_url} onChange={(e) => setF('file_url', e.target.value)} placeholder="https://drive.google.com/…" />
            </div>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
        <input
          type="checkbox"
          className="w-3.5 h-3.5 accent-brand-600"
          checked={form.is_published}
          onChange={(e) => setF('is_published', e.target.checked)}
        />
        <span>Published (visible to students)</span>
      </label>

      <div className="flex gap-2">
        <button onClick={submit} disabled={saving} className="btn-primary text-xs py-1 px-3">
          {saving ? 'Saving…' : (initial?.id ? 'Update Lesson' : 'Add Lesson')}
        </button>
        <button onClick={onCancel} className="btn-secondary text-xs py-1 px-3">Cancel</button>
      </div>
    </div>
  )
}

// ── Module Card ───────────────────────────────────────────────────────────────

function ModuleCard({ mod, classId, isFirst, isLast, onRefresh, onMoveUp, onMoveDown }) {
  const [editingModule, setEditingModule] = useState(false)
  const [moduleForm, setModuleForm] = useState({ title: mod.title, description: mod.description || '' })
  const [savingModule, setSavingModule] = useState(false)
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [editingLesson, setEditingLesson] = useState(null) // lesson object being edited

  const saveModule = async () => {
    if (!moduleForm.title.trim()) return
    setSavingModule(true)
    try {
      await lms.updateModule(mod.id, { title: moduleForm.title, description: moduleForm.description })
      setEditingModule(false)
      onRefresh()
    } catch {} finally { setSavingModule(false) }
  }

  const deleteModule = async () => {
    if (!window.confirm(`Delete module "${mod.title}" and all its lessons?`)) return
    try {
      await lms.deleteModule(mod.id)
      onRefresh()
    } catch {}
  }

  const deleteLesson = async (id) => {
    try {
      await lms.deleteLesson(id)
      onRefresh()
    } catch {}
  }

  const lessons = mod.lessons || []

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
      {/* Module header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
        <div className="flex-1 min-w-0">
          {editingModule ? (
            <div className="space-y-1.5">
              <input
                autoFocus
                className="input text-sm py-1"
                value={moduleForm.title}
                onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Module title"
              />
              <input
                className="input text-xs py-1"
                value={moduleForm.description}
                onChange={(e) => setModuleForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description (optional)"
              />
              <div className="flex gap-1.5">
                <button onClick={saveModule} disabled={savingModule} className="btn-primary text-xs py-0.5 px-2.5">
                  {savingModule ? '…' : 'Save'}
                </button>
                <button onClick={() => setEditingModule(false)} className="btn-secondary text-xs py-0.5 px-2.5">Cancel</button>
              </div>
            </div>
          ) : (
            <div>
              <span className="font-semibold text-sm text-gray-800">{mod.title}</span>
              {mod.description && <p className="text-xs text-gray-500 mt-0.5">{mod.description}</p>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-500 text-xs"
            title="Move up"
          >↑</button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-500 text-xs"
            title="Move down"
          >↓</button>
          {!editingModule && (
            <button
              onClick={() => setEditingModule(true)}
              className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 text-xs"
              title="Edit module"
            >✏️</button>
          )}
          <button
            onClick={deleteModule}
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 text-xs"
            title="Delete module"
          >🗑️</button>
        </div>
      </div>

      {/* Lessons list */}
      <div className="px-4 py-2 space-y-1">
        {lessons.length === 0 && !showLessonForm && (
          <p className="text-xs text-gray-400 italic py-1">No lessons yet</p>
        )}
        {lessons.map((lesson) => (
          <div key={lesson.id}>
            {editingLesson?.id === lesson.id ? (
              <LessonForm
                moduleId={mod.id}
                classId={classId}
                initial={editingLesson}
                onSave={() => { setEditingLesson(null); onRefresh() }}
                onCancel={() => setEditingLesson(null)}
              />
            ) : (
              <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 group">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Badge className={contentTypeBadge(lesson.content_type)}>{lesson.content_type}</Badge>
                  <span className="text-sm text-gray-700 truncate">{lesson.title}</span>
                  {!lesson.is_published && (
                    <Badge className="bg-gray-100 text-gray-500">draft</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => setEditingLesson(lesson)}
                    className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 text-xs"
                    title="Edit lesson"
                  >✏️</button>
                  <button
                    onClick={() => deleteLesson(lesson.id)}
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 text-xs"
                    title="Delete lesson"
                  >🗑️</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {showLessonForm && !editingLesson && (
          <LessonForm
            moduleId={mod.id}
            classId={classId}
            onSave={() => { setShowLessonForm(false); onRefresh() }}
            onCancel={() => setShowLessonForm(false)}
          />
        )}

        {!showLessonForm && (
          <button
            onClick={() => { setShowLessonForm(true); setEditingLesson(null) }}
            className="text-xs text-brand-600 hover:text-brand-800 hover:underline py-1 mt-1 block"
          >
            ＋ Add Lesson
          </button>
        )}
      </div>
    </div>
  )
}

// ── Curriculum Section ────────────────────────────────────────────────────────

function CurriculumSection({ classId, modules, onRefresh }) {
  const [showModuleForm, setShowModuleForm] = useState(false)
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' })
  const [savingModule, setSavingModule] = useState(false)
  const [err, setErr] = useState('')

  // local order state — mirrors server order by position, editable client-side
  const [orderedIds, setOrderedIds] = useState(() => modules.map((m) => m.id))

  // Keep orderedIds in sync when modules prop changes
  useEffect(() => {
    setOrderedIds((prev) => {
      const incoming = modules.map((m) => m.id)
      // Preserve any local ordering and add new ones at the end
      const kept = prev.filter((id) => incoming.includes(id))
      const added = incoming.filter((id) => !prev.includes(id))
      return [...kept, ...added]
    })
  }, [modules])

  const orderedModules = orderedIds
    .map((id) => modules.find((m) => m.id === id))
    .filter(Boolean)

  const moveModule = async (index, dir) => {
    const newOrder = [...orderedIds]
    const swapIdx = index + dir
    if (swapIdx < 0 || swapIdx >= newOrder.length) return
    ;[newOrder[index], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[index]]
    setOrderedIds(newOrder)
    // Persist new positions
    try {
      await Promise.all(
        newOrder.map((id, i) => lms.updateModule(id, { position: i + 1 }))
      )
    } catch {}
  }

  const saveModule = async () => {
    if (!moduleForm.title.trim()) { setErr('Module title is required.'); return }
    setSavingModule(true)
    setErr('')
    try {
      await lms.createModule({ classId, ...moduleForm, position: orderedModules.length + 1 })
      setModuleForm({ title: '', description: '' })
      setShowModuleForm(false)
      onRefresh()
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save module')
    } finally {
      setSavingModule(false)
    }
  }

  return (
    <div className="card p-4 mb-4">
      <SectionHeader
        icon="📋"
        title="Curriculum"
        action={
          !showModuleForm && (
            <button onClick={() => setShowModuleForm(true)} className="btn-primary text-xs py-1 px-3">
              ＋ Add Module
            </button>
          )
        }
      />

      {showModuleForm && (
        <div className="mb-4 p-3 border border-brand-100 rounded-xl bg-brand-50/20 space-y-2">
          <ErrorBanner msg={err} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Module Title *</label>
            <input
              autoFocus
              className="input"
              value={moduleForm.title}
              onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Chapter 1: Introduction"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <input
              className="input"
              value={moduleForm.description}
              onChange={(e) => setModuleForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short description (optional)"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={saveModule} disabled={savingModule} className="btn-primary text-xs py-1 px-3">
              {savingModule ? 'Saving…' : 'Create Module'}
            </button>
            <button onClick={() => { setShowModuleForm(false); setErr('') }} className="btn-secondary text-xs py-1 px-3">Cancel</button>
          </div>
        </div>
      )}

      {orderedModules.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-3">No modules yet. Add one to get started.</p>
      ) : (
        orderedModules.map((mod, idx) => (
          <ModuleCard
            key={mod.id}
            mod={mod}
            classId={classId}
            isFirst={idx === 0}
            isLast={idx === orderedModules.length - 1}
            onRefresh={onRefresh}
            onMoveUp={() => moveModule(idx, -1)}
            onMoveDown={() => moveModule(idx, 1)}
          />
        ))
      )}
    </div>
  )
}

// ── Submission viewer modal ───────────────────────────────────────────────────

function SubmissionsModal({ assignmentId, onClose }) {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [grades, setGrades] = useState({}) // { [submissionId]: { score, feedback } }
  const [saving, setSaving] = useState({}) // { [submissionId]: bool }

  useEffect(() => {
    lms.assignmentSubmissions(assignmentId)
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : (r.data.submissions || [])
        setSubs(list)
        const init = {}
        list.forEach((s) => { init[s.id] = { score: s.score ?? '', feedback: s.feedback || '' } })
        setGrades(init)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [assignmentId])

  const setGrade = (id, field, val) =>
    setGrades((g) => ({ ...g, [id]: { ...g[id], [field]: val } }))

  const saveGrade = async (id) => {
    setSaving((s) => ({ ...s, [id]: true }))
    try {
      await lms.gradeSubmission(id, {
        score: grades[id].score !== '' ? parseFloat(grades[id].score) : null,
        feedback: grades[id].feedback,
      })
      setSubs((prev) => prev.map((s) => s.id === id
        ? { ...s, score: grades[id].score, feedback: grades[id].feedback }
        : s
      ))
    } catch {} finally {
      setSaving((s) => ({ ...s, [id]: false }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Submissions</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {loading && <p className="text-center text-gray-400 py-6">Loading…</p>}
          {!loading && subs.length === 0 && (
            <p className="text-center text-gray-400 py-6">No submissions yet</p>
          )}
          {subs.map((sub) => (
            <div key={sub.id} className="border border-gray-100 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-gray-800">{sub.student_name || sub.name || 'Student'}</span>
                <Badge className={sub.status === 'graded' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}>
                  {sub.status || 'submitted'}
                </Badge>
              </div>
              {sub.content && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 max-h-24 overflow-y-auto">{sub.content}</p>
              )}
              {sub.file_url && (
                <a href={sub.file_url} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">
                  📎 View file
                </a>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Score</label>
                  <input
                    type="number"
                    className="input py-1 text-sm"
                    value={grades[sub.id]?.score ?? ''}
                    onChange={(e) => setGrade(sub.id, 'score', e.target.value)}
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Feedback</label>
                  <input
                    className="input py-1 text-sm"
                    value={grades[sub.id]?.feedback ?? ''}
                    onChange={(e) => setGrade(sub.id, 'feedback', e.target.value)}
                    placeholder="Optional feedback"
                  />
                </div>
              </div>
              <button
                onClick={() => saveGrade(sub.id)}
                disabled={saving[sub.id]}
                className="btn-primary text-xs py-1 px-3 w-full"
              >
                {saving[sub.id] ? 'Saving…' : 'Save Grade'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Assignments Section ───────────────────────────────────────────────────────

function AssignmentsSection({ classId, assignments, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [viewSubsId, setViewSubsId] = useState(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    due_date: '',
    max_score: '',
    submission_type: 'any',
    is_published: true,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const resetForm = () => setForm({
    title: '', description: '', due_date: '', max_score: '', submission_type: 'any', is_published: true,
  })

  const openCreate = () => {
    resetForm()
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (a) => {
    setForm({
      title: a.title,
      description: a.description || '',
      due_date: a.due_date ? a.due_date.slice(0, 16) : '',
      max_score: a.max_score ?? '',
      submission_type: a.submission_type || 'any',
      is_published: a.is_published ?? true,
    })
    setEditingId(a.id)
    setShowForm(true)
  }

  const save = async () => {
    if (!form.title.trim()) { setErr('Title is required.'); return }
    setSaving(true)
    setErr('')
    try {
      const payload = {
        classId,
        title: form.title,
        description: form.description,
        due_date: form.due_date || undefined,
        max_score: form.max_score !== '' ? parseFloat(form.max_score) : undefined,
        submission_type: form.submission_type,
        is_published: form.is_published,
      }
      if (editingId) {
        await lms.updateAssignment(editingId, payload)
      } else {
        await lms.createAssignment(payload)
      }
      setShowForm(false)
      resetForm()
      setEditingId(null)
      onRefresh()
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save assignment')
    } finally {
      setSaving(false)
    }
  }

  const del = async (id) => {
    if (!window.confirm('Delete this assignment?')) return
    try {
      await lms.deleteAssignment(id)
      onRefresh()
    } catch {}
  }

  return (
    <div className="card p-4 mb-4">
      <SectionHeader
        icon="📝"
        title="Assignments"
        action={
          !showForm && (
            <button onClick={openCreate} className="btn-primary text-xs py-1 px-3">
              ＋ New Assignment
            </button>
          )
        }
      />

      {showForm && (
        <div className="mb-4 p-3 border border-brand-100 rounded-xl bg-brand-50/20 space-y-3">
          <ErrorBanner msg={err} />
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
              <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Assignment title" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Instructions or details…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
              <input type="datetime-local" className="input" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Score</label>
              <input type="number" className="input" min="0" value={form.max_score} onChange={(e) => setForm((f) => ({ ...f, max_score: e.target.value }))} placeholder="e.g. 100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Submission Type</label>
              <select className="input" value={form.submission_type} onChange={(e) => setForm((f) => ({ ...f, submission_type: e.target.value }))}>
                <option value="text">Text</option>
                <option value="file">File</option>
                <option value="any">Any</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 accent-brand-600"
                  checked={form.is_published}
                  onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                />
                Published
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-xs py-1 px-3">
              {saving ? 'Saving…' : (editingId ? 'Update' : 'Create')}
            </button>
            <button onClick={() => { setShowForm(false); setErr('') }} className="btn-secondary text-xs py-1 px-3">Cancel</button>
          </div>
        </div>
      )}

      {assignments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-3">No assignments yet</p>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-start justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
              <div className="flex-1 min-w-0 mr-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800 truncate">{a.title}</span>
                  {!a.is_published && <Badge className="bg-gray-100 text-gray-500">draft</Badge>}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {a.due_date && (
                    <span className="text-xs text-gray-500">
                      Due: {new Date(a.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {a.max_score != null && (
                    <span className="text-xs text-gray-500">Max: {a.max_score} pts</span>
                  )}
                  <Badge className="bg-gray-100 text-gray-500">{a.submission_type || 'any'}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setViewSubsId(a.id)}
                  className="text-xs text-brand-600 hover:text-brand-800 hover:underline px-1 py-0.5"
                >
                  Submissions
                </button>
                <button
                  onClick={() => openEdit(a)}
                  className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 text-xs"
                  title="Edit"
                >✏️</button>
                <button
                  onClick={() => del(a.id)}
                  className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 text-xs"
                  title="Delete"
                >🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewSubsId && (
        <SubmissionsModal assignmentId={viewSubsId} onClose={() => setViewSubsId(null)} />
      )}
    </div>
  )
}

// ── Quiz Builder ──────────────────────────────────────────────────────────────

function QuizBuilder({ classId, allLessons, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    pass_score: 70,
    lessonId: '',
  })
  const [questions, setQuestions] = useState([
    { text: '', points: 1, options: [{ text: '', is_correct: true }, { text: '', is_correct: false }, { text: '', is_correct: false }, { text: '', is_correct: false }] }
  ])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const addQuestion = () => setQuestions((qs) => [
    ...qs,
    { text: '', points: 1, options: [{ text: '', is_correct: true }, { text: '', is_correct: false }, { text: '', is_correct: false }, { text: '', is_correct: false }] }
  ])

  const removeQuestion = (qi) => setQuestions((qs) => qs.filter((_, i) => i !== qi))

  const setQField = (qi, field, val) =>
    setQuestions((qs) => qs.map((q, i) => i === qi ? { ...q, [field]: val } : q))

  const setOptionText = (qi, oi, val) =>
    setQuestions((qs) => qs.map((q, i) =>
      i === qi
        ? { ...q, options: q.options.map((o, j) => j === oi ? { ...o, text: val } : o) }
        : q
    ))

  const setCorrect = (qi, oi) =>
    setQuestions((qs) => qs.map((q, i) =>
      i === qi
        ? { ...q, options: q.options.map((o, j) => ({ ...o, is_correct: j === oi })) }
        : q
    ))

  const submit = async () => {
    if (!form.title.trim()) { setErr('Quiz title is required.'); return }
    if (questions.length === 0) { setErr('Add at least one question.'); return }
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text.trim()) { setErr(`Question ${i + 1} text is required.`); return }
      const hasCorrect = questions[i].options.some((o) => o.is_correct && o.text.trim())
      if (!hasCorrect) { setErr(`Question ${i + 1} must have at least one non-empty correct option.`); return }
    }
    setSaving(true)
    setErr('')
    try {
      await lms.createQuiz({
        classId,
        lessonId: form.lessonId || undefined,
        title: form.title,
        description: form.description,
        pass_score: parseInt(form.pass_score),
        questions: questions.map((q) => ({
          question_text: q.text,
          points: parseFloat(q.points) || 1,
          options: q.options.filter((o) => o.text.trim()).map((o) => ({
            option_text: o.text,
            is_correct: o.is_correct,
          })),
        })),
      })
      onSave()
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to create quiz')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-3 border border-brand-100 rounded-xl bg-brand-50/20 space-y-4">
      <ErrorBanner msg={err} />
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Quiz Title *</label>
          <input className="input" value={form.title} onChange={(e) => setF('title', e.target.value)} placeholder="e.g. Chapter 1 Quiz" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
          <input className="input" value={form.description} onChange={(e) => setF('description', e.target.value)} placeholder="Optional description" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Pass Score (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            className="input"
            value={form.pass_score}
            onChange={(e) => setF('pass_score', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Link to Lesson</label>
          <select className="input" value={form.lessonId} onChange={(e) => setF('lessonId', e.target.value)}>
            <option value="">— None —</option>
            {allLessons.map((l) => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div key={qi} className="border border-gray-200 rounded-xl p-3 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">Question {qi + 1}</span>
              {questions.length > 1 && (
                <button onClick={() => removeQuestion(qi)} className="text-xs text-red-400 hover:text-red-600">✕ Remove</button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-3">
                <input
                  className="input text-sm"
                  value={q.text}
                  onChange={(e) => setQField(qi, 'text', e.target.value)}
                  placeholder="Question text…"
                />
              </div>
              <div>
                <input
                  type="number"
                  className="input text-sm"
                  min="1"
                  value={q.points}
                  onChange={(e) => setQField(qi, 'points', e.target.value)}
                  placeholder="Pts"
                  title="Points"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qi}`}
                    checked={opt.is_correct}
                    onChange={() => setCorrect(qi, oi)}
                    className="accent-green-600 w-3.5 h-3.5 shrink-0"
                    title="Mark as correct"
                  />
                  <input
                    className="input text-xs py-1 flex-1"
                    value={opt.text}
                    onChange={(e) => setOptionText(qi, oi, e.target.value)}
                    placeholder={`Option ${oi + 1}`}
                  />
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-1">Select the radio button next to the correct answer.</p>
            </div>
          </div>
        ))}
        <button onClick={addQuestion} className="text-xs text-brand-600 hover:text-brand-800 hover:underline">
          ＋ Add Question
        </button>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={submit} disabled={saving} className="btn-primary text-xs py-1 px-3">
          {saving ? 'Saving…' : 'Create Quiz'}
        </button>
        <button onClick={onCancel} className="btn-secondary text-xs py-1 px-3">Cancel</button>
      </div>
    </div>
  )
}

// ── Quizzes Section ───────────────────────────────────────────────────────────

function QuizzesSection({ classId, quizzes, allLessons, onRefresh }) {
  const [showBuilder, setShowBuilder] = useState(false)

  const del = async (id) => {
    if (!window.confirm('Delete this quiz?')) return
    try {
      await lms.deleteQuiz(id)
      onRefresh()
    } catch {}
  }

  return (
    <div className="card p-4 mb-4">
      <SectionHeader
        icon="🧪"
        title="Quizzes"
        action={
          !showBuilder && (
            <button onClick={() => setShowBuilder(true)} className="btn-primary text-xs py-1 px-3">
              ＋ New Quiz
            </button>
          )
        }
      />

      {showBuilder && (
        <div className="mb-4">
          <QuizBuilder
            classId={classId}
            allLessons={allLessons}
            onSave={() => { setShowBuilder(false); onRefresh() }}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {quizzes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-3">No quizzes yet</p>
      ) : (
        <div className="space-y-2">
          {quizzes.map((qz) => (
            <div key={qz.id} className="flex items-start justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
              <div className="flex-1 min-w-0 mr-2">
                <span className="text-sm font-semibold text-gray-800">{qz.title}</span>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {qz.pass_score != null && (
                    <span className="text-xs text-gray-500">Pass: {qz.pass_score}%</span>
                  )}
                  {qz.question_count != null && (
                    <span className="text-xs text-gray-500">{qz.question_count} questions</span>
                  )}
                  {qz.lesson_title && (
                    <Badge className="bg-blue-50 text-blue-700">📖 {qz.lesson_title}</Badge>
                  )}
                </div>
              </div>
              <button
                onClick={() => del(qz.id)}
                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 text-xs shrink-0"
                title="Delete quiz"
              >🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main CourseBuilder component ──────────────────────────────────────────────

export default function CourseBuilder({ classId, userRole }) {
  const [curriculum, setCurriculum] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const res = await lms.curriculum(classId)
      setCurriculum(res.data)
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to load curriculum')
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="py-8 text-center text-gray-400 text-sm">Loading curriculum…</div>
  }

  if (err) {
    return (
      <div className="py-6">
        <ErrorBanner msg={err} />
        <button onClick={load} className="btn-secondary text-xs">Retry</button>
      </div>
    )
  }

  const modules       = curriculum?.modules       || []
  const announcements = curriculum?.announcements || []
  const assignments   = curriculum?.assignments   || []
  const quizzes       = curriculum?.quizzes       || []

  // Collect all lessons across all modules for the quiz lesson dropdown
  const allLessons = modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, moduleName: m.title })))

  return (
    <div className="space-y-0 overflow-y-auto max-h-[65vh] pr-1">
      <AnnouncementsSection
        classId={classId}
        announcements={announcements}
        onRefresh={load}
      />
      <CurriculumSection
        classId={classId}
        modules={modules}
        onRefresh={load}
      />
      <AssignmentsSection
        classId={classId}
        assignments={assignments}
        onRefresh={load}
      />
      <QuizzesSection
        classId={classId}
        quizzes={quizzes}
        allLessons={allLessons}
        onRefresh={load}
      />
    </div>
  )
}
