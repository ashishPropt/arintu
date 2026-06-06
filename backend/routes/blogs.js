/**
 * Blog routes.
 *
 * Public:
 *   GET  /api/blogs                — list published posts
 *   GET  /api/blogs/:slug          — fetch one post by slug
 *
 * Superadmin:
 *   GET  /api/blogs/admin/all      — list ALL posts (drafts + published)
 *   POST /api/blogs                — create
 *   PUT  /api/blogs/:id            — update
 *   DELETE /api/blogs/:id          — delete
 *   POST /api/blogs/:id/image      — upload hero image (multipart 'image')
 */
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── Storage for hero images ──────────────────────────────────────────────────
const HERO_DIR = path.join(__dirname, '..', 'uploads', 'blog-hero');
if (!fs.existsSync(HERO_DIR)) fs.mkdirSync(HERO_DIR, { recursive: true });

const ALLOWED = {
  'image/jpeg': '.jpg', 'image/png': '.png',
  'image/webp': '.webp', 'image/gif': '.gif',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, HERO_DIR),
    filename: (req, file, cb) => {
      const ext = ALLOWED[file.mimetype] || '.jpg';
      cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    cb(new Error('Only JPG, PNG, WebP, or GIF images are allowed.'));
  },
});

// Helper: slugify a title to URL-friendly form
function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

async function ensureUniqueSlug(base, ignoreId) {
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const params = ignoreId ? [slug, ignoreId] : [slug];
    const sql = ignoreId
      ? 'SELECT id FROM blogs WHERE slug = $1 AND id <> $2'
      : 'SELECT id FROM blogs WHERE slug = $1';
    const r = await db.query(sql, params);
    if (!r.rows[0]) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

// ── Public: list published blogs ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, slug, title, subtitle, author_name, author_role,
              hero_image, excerpt, tags, published_at, view_count
       FROM blogs
       WHERE published = TRUE
       ORDER BY published_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Public: read by slug + increment view count ──────────────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, slug, title, subtitle, author_name, author_role, hero_image,
              excerpt, content, tags, published, published_at, view_count
       FROM blogs WHERE slug = $1`,
      [req.params.slug]
    );
    const blog = result.rows[0];
    if (!blog || !blog.published) return res.status(404).json({ error: 'Blog post not found' });

    // Best-effort view counter (ignored on failure)
    db.query('UPDATE blogs SET view_count = view_count + 1 WHERE id = $1', [blog.id]).catch(() => {});

    res.json(blog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Superadmin: list ALL (drafts + published) ────────────────────────────────
router.get('/admin/all', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, slug, title, subtitle, author_name, hero_image, excerpt,
              tags, published, published_at, view_count, created_at, updated_at
       FROM blogs
       ORDER BY published_at DESC NULLS LAST, created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Superadmin: create ───────────────────────────────────────────────────────
router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
  const {
    title, subtitle, author_name, author_role,
    excerpt, content, tags, published, slug: customSlug, hero_image, published_at,
  } = req.body;

  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  try {
    const baseSlug = customSlug ? slugify(customSlug) : slugify(title);
    const slug = await ensureUniqueSlug(baseSlug);

    const result = await db.query(
      `INSERT INTO blogs (slug, title, subtitle, author_name, author_role,
                          hero_image, excerpt, content, tags, published, published_at,
                          created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [slug, title.trim(), subtitle || null,
       author_name || null, author_role || null,
       hero_image || null,
       excerpt || null,
       content,
       Array.isArray(tags) ? tags : null,
       published !== false,
       published_at || new Date(),
       req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Superadmin: update ───────────────────────────────────────────────────────
router.put('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  const {
    title, subtitle, author_name, author_role,
    excerpt, content, tags, published, slug: customSlug, hero_image, published_at,
  } = req.body;

  try {
    // If slug was changed (or title changed and there's no custom slug), regenerate.
    let nextSlug = null;
    if (customSlug !== undefined && customSlug !== null) {
      nextSlug = await ensureUniqueSlug(slugify(customSlug), req.params.id);
    }

    const result = await db.query(
      `UPDATE blogs SET
         title         = COALESCE($1, title),
         subtitle      = $2,
         author_name   = $3,
         author_role   = $4,
         hero_image    = COALESCE($5, hero_image),
         excerpt       = $6,
         content       = COALESCE($7, content),
         tags          = $8,
         published     = COALESCE($9, published),
         published_at  = COALESCE($10, published_at),
         slug          = COALESCE($11, slug),
         updated_at    = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        title?.trim() || null,
        subtitle ?? null,
        author_name ?? null,
        author_role ?? null,
        hero_image || null,
        excerpt ?? null,
        content?.trim() || null,
        Array.isArray(tags) ? tags : null,
        published === undefined ? null : !!published,
        published_at || null,
        nextSlug,
        req.params.id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Blog not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Superadmin: delete ───────────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const r = await db.query('DELETE FROM blogs WHERE id = $1 RETURNING hero_image', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Blog not found' });
    // Best-effort: delete the hero image file if it was uploaded
    const hero = r.rows[0].hero_image;
    if (hero && hero.startsWith('/api/blogs/hero/')) {
      const fname = hero.split('/').pop();
      const abs = path.join(HERO_DIR, fname);
      fs.unlink(abs, () => {});
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Superadmin: upload hero image ────────────────────────────────────────────
router.post('/:id/image', authenticate, authorize('superadmin'), upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  try {
    const url = `/api/blogs/hero/${req.file.filename}`;
    await db.query('UPDATE blogs SET hero_image = $1, updated_at = NOW() WHERE id = $2',
                   [url, req.params.id]);
    res.json({ hero_image: url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Public: serve hero image files ───────────────────────────────────────────
router.get('/hero/:filename', (req, res) => {
  const fname = req.params.filename;
  if (!/^[a-zA-Z0-9._-]+$/.test(fname)) return res.status(400).end();
  const abs = path.join(HERO_DIR, fname);
  if (!fs.existsSync(abs)) return res.status(404).end();
  res.sendFile(abs);
});

module.exports = router;
