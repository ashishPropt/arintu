import { useEffect, useState, useCallback } from 'react';
import { blogs as blogsApi } from '../../api';
import Markdown from '../../components/Markdown';
import Modal from '../../components/Modal';

const EMPTY = {
  title: '',
  subtitle: '',
  slug: '',
  author_name: '',
  author_role: '',
  excerpt: '',
  content: '',
  tags: '',           // entered as comma-separated, stored as array
  published: true,
  hero_image: '',
};

function toFormState(blog) {
  if (!blog) return EMPTY;
  return {
    ...EMPTY,
    ...blog,
    tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : (blog.tags || ''),
  };
}

function fromFormState(form) {
  return {
    ...form,
    tags: form.tags
      ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [],
  };
}

export default function ManageBlogs() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);   // null | 'new' | post object
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);   // id to delete
  const [previewMode, setPreviewMode] = useState('split'); // 'edit'|'split'|'preview'
  const [heroFile, setHeroFile] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await blogsApi.listAll();
      setList(r.data || []);
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(EMPTY); setEditing('new'); setHeroFile(null); setError(''); };
  const openEdit = (p) => { setForm(toFormState(p)); setEditing(p); setHeroFile(null); setError(''); };
  const closeForm = () => { setEditing(null); setError(''); setHeroFile(null); };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required.');
      return;
    }
    setSaving(true); setError('');
    try {
      const payload = fromFormState(form);
      let saved;
      if (editing === 'new') {
        const r = await blogsApi.create(payload);
        saved = r.data;
      } else {
        const r = await blogsApi.update(editing.id, payload);
        saved = r.data;
      }
      // Upload hero image if a new file was selected
      if (heroFile && saved?.id) {
        try { await blogsApi.uploadHero(saved.id, heroFile); } catch {}
      }
      await load();
      closeForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save post.');
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (p) => {
    try { await blogsApi.update(p.id, { published: !p.published }); await load(); } catch {}
  };

  const handleDelete = async (id) => {
    try { await blogsApi.remove(id); setConfirm(null); await load(); } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Blog Posts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Write and manage posts published on the public <strong>/blog</strong> page.
          </p>
        </div>
        <button onClick={openNew} className="btn-primary text-sm">+ New Post</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : list.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-3">📝</p>
          <p className="text-gray-500 text-sm">No posts yet.</p>
          <button onClick={openNew} className="btn-primary text-sm mt-4">Write your first post</button>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <div key={p.id} className={`card p-5 flex gap-4 items-start ${!p.published ? 'opacity-60' : ''}`}>
              {p.hero_image && (
                <img src={p.hero_image} alt="" className="w-24 h-16 rounded-lg object-cover shrink-0 border border-gray-100" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="font-semibold text-gray-900 text-sm">{p.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {p.published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  /{p.slug} {p.author_name && <>· by {p.author_name}</>} {p.view_count > 0 && <>· {p.view_count} views</>}
                </p>
                {p.excerpt && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{p.excerpt}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => togglePublished(p)}
                  className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
                  {p.published ? 'Unpublish' : 'Publish'}
                </button>
                <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
                  View
                </a>
                <button onClick={() => openEdit(p)}
                  className="text-xs text-brand-600 hover:text-brand-800 border border-brand-200 rounded-lg px-3 py-1.5 hover:bg-brand-50">
                  Edit
                </button>
                <button onClick={() => setConfirm(p.id)}
                  className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirm && (
        <Modal open title="Delete post?" size="sm" onClose={() => setConfirm(null)}>
          <p className="text-sm text-gray-600 mb-5">This cannot be undone.</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setConfirm(null)} className="btn-secondary text-sm">Cancel</button>
            <button onClick={() => handleDelete(confirm)} className="btn-primary bg-red-600 hover:bg-red-700 text-sm">Delete</button>
          </div>
        </Modal>
      )}

      {editing !== null && (
        <Modal open title={editing === 'new' ? 'New Post' : 'Edit Post'} size="lg" onClose={closeForm}>
          <div className="space-y-4">
            {/* Title + Slug + Subtitle */}
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Slug (URL)</label>
                <input className="input text-xs" placeholder="auto-generated" value={form.slug}
                  onChange={(e) => set('slug', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Subtitle</label>
              <input className="input" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
            </div>

            {/* Author */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Author Name</label>
                <input className="input" value={form.author_name} onChange={(e) => set('author_name', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Author Role / Affiliation</label>
                <input className="input" value={form.author_role} onChange={(e) => set('author_role', e.target.value)} />
              </div>
            </div>

            {/* Hero image */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hero Image</label>
              <div className="flex items-center gap-3">
                {form.hero_image && (
                  <img src={form.hero_image} alt="" className="w-24 h-16 rounded-lg object-cover border border-gray-100" />
                )}
                <input type="file" accept="image/*"
                  onChange={(e) => setHeroFile(e.target.files?.[0] || null)}
                  className="text-xs" />
                {heroFile && <span className="text-xs text-gray-500">{heroFile.name}</span>}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">JPG, PNG, WebP or GIF up to 8 MB. Uploaded on save.</p>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
              <input className="input" placeholder="education, math, olympiads"
                value={form.tags} onChange={(e) => set('tags', e.target.value)} />
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Excerpt (shown on the index card)</label>
              <textarea className="input" rows={2} value={form.excerpt}
                onChange={(e) => set('excerpt', e.target.value)} />
            </div>

            {/* Content + Preview */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">Content (Markdown) *</label>
                <div className="flex gap-1 text-xs">
                  {['edit', 'split', 'preview'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setPreviewMode(m)}
                      className={`px-2 py-0.5 rounded ${previewMode === m ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {m === 'edit' ? 'Editor' : m === 'split' ? 'Split' : 'Preview'}
                    </button>
                  ))}
                </div>
              </div>
              <div className={`grid gap-3 ${previewMode === 'split' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {previewMode !== 'preview' && (
                  <textarea
                    className="input font-mono text-xs"
                    rows={18}
                    placeholder="# Heading&#10;&#10;Body paragraph with **bold** and *italic*.&#10;&#10;> A quote&#10;&#10;- List item"
                    value={form.content}
                    onChange={(e) => set('content', e.target.value)}
                  />
                )}
                {previewMode !== 'edit' && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-white max-h-[28rem] overflow-y-auto">
                    {form.content
                      ? <Markdown source={form.content} />
                      : <p className="text-xs text-gray-400 italic">Preview will appear here…</p>}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Supports headings (#, ##, ###), <strong>**bold**</strong>, <em>*italic*</em>, [links](url),
                &gt; blockquotes, lists (- or 1.), and `inline code`.
              </p>
            </div>

            {/* Published */}
            <div className="flex items-center gap-2">
              <input id="published" type="checkbox" className="rounded"
                checked={!!form.published} onChange={(e) => set('published', e.target.checked)} />
              <label htmlFor="published" className="text-sm text-gray-700">
                Publish on the public blog
              </label>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button onClick={closeForm} className="btn-secondary text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary text-sm">
                {saving ? 'Saving…' : editing === 'new' ? 'Create Post' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
