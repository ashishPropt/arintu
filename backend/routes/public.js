/**
 * Public routes — no authentication required.
 * Used by the landing page.
 */
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const db      = require('../database/db');

const router = express.Router();

// GET /api/public/classes?countryCode=IN
// Returns all active classes with pricing for the given country,
// falling back to the default (no-country) price if no country-specific one exists.
router.get('/classes', async (req, res) => {
  const { countryCode } = req.query;
  try {
    // Resolve country
    let country = null;
    if (countryCode) {
      const cr = await db.query('SELECT * FROM countries WHERE code = $1', [countryCode.toUpperCase()]);
      country = cr.rows[0] || null;
    }

    const classes = await db.query(
      `SELECT c.id, c.name, c.code, c.description, c.subject, c.level, c.max_students, c.is_active,
              u.name as admin_name,
              (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) as enrolled_count,
              (SELECT json_agg(json_build_object('name', t.name))
               FROM teacher_assignments ta JOIN users t ON t.id = ta.teacher_id
               WHERE ta.class_id = c.id) as teachers,
              (SELECT json_agg(slot ORDER BY slot->>'session_code')
               FROM (
                 SELECT DISTINCT ON (cs2.session_code)
                   jsonb_build_object(
                     'session_code', cs2.session_code,
                     'day_of_week',  cs2.day_of_week,
                     'start_time',   cs2.start_time,
                     'end_time',     cs2.end_time,
                     'teacher',      tu.name
                   ) AS slot
                 FROM class_schedules cs2
                 LEFT JOIN users tu ON tu.id = cs2.teacher_id
                 WHERE cs2.class_id = c.id AND cs2.session_code IS NOT NULL
                 ORDER BY cs2.session_code, cs2.start_time
               ) slots) as schedules
       FROM classes c
       JOIN users u ON u.id = c.admin_id
       WHERE c.is_active = TRUE
       ORDER BY c.code ASC NULLS LAST, c.created_at DESC`
    );

    // For each class, find the best price for the requested country
    const result = await Promise.all(
      classes.rows.map(async (cls) => {
        let price = null;
        let currencyCode = null;
        let currencySymbol = null;

        if (country) {
          // Try country-specific price first
          const cp = await db.query(
            `SELECT cp.price, cp.currency, co.currency_symbol
             FROM class_pricing cp
             LEFT JOIN countries co ON co.currency_code = cp.currency
             WHERE cp.class_id = $1 AND cp.country_id = $2`,
            [cls.id, country.id]
          );
          if (cp.rows[0]) {
            price = cp.rows[0].price;
            currencyCode = cp.rows[0].currency;
            currencySymbol = country.currency_symbol;
          }
        }

        // Fall back to default price (no country_id, no region_id)
        if (price === null) {
          const dp = await db.query(
            `SELECT price, currency FROM class_pricing
             WHERE class_id = $1 AND country_id IS NULL AND is_default = TRUE
             LIMIT 1`,
            [cls.id]
          );
          if (dp.rows[0]) {
            price = dp.rows[0].price;
            currencyCode = dp.rows[0].currency;
            // Look up the symbol for the default currency (don't use the selected country's symbol)
            const symRes = await db.query(
              'SELECT currency_symbol FROM countries WHERE currency_code = $1 LIMIT 1',
              [dp.rows[0].currency]
            );
            currencySymbol = symRes.rows[0]?.currency_symbol || '$';
          }
        }

        return {
          ...cls,
          price,
          currency_code: currencyCode,
          currency_symbol: currencySymbol || (country?.currency_symbol),
          country: country ? { code: country.code, name: country.name } : null,
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/public/application-fee?countryCode=IN
// Returns the application fee for a given country (flat 500 INR, auto-converted).
router.get('/application-fee', async (req, res) => {
  const { countryCode } = req.query;
  try {
    // Fetch global base fee
    const settingsRes = await db.query(
      `SELECT value FROM global_settings WHERE key = 'app_fee_inr'`
    );
    const baseINR = parseFloat(settingsRes.rows[0]?.value || '500');

    if (countryCode) {
      const result = await db.query(
        `SELECT id, name, currency_code, currency_symbol, inr_exchange_rate
         FROM countries WHERE code = $1`,
        [countryCode.toUpperCase()]
      );
      if (result.rows[0]) {
        const rate = parseFloat(result.rows[0].inr_exchange_rate || 0.012);
        const fee  = Math.max(1, Math.round(baseINR * rate));
        return res.json({
          fee,
          currency_code: result.rows[0].currency_code,
          currency_symbol: result.rows[0].currency_symbol || '',
          country_name: result.rows[0].name,
          base_inr: baseINR,
        });
      }
    }
    // Default: USD equivalent
    const usdFee = Math.max(1, Math.round(baseINR * 0.012));
    res.json({ fee: usdFee, currency_code: 'USD', currency_symbol: '$', base_inr: baseINR });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/public/team/:id/photo — serve an uploaded team member photo
router.get('/team/:id/photo', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT photo_uploaded_path FROM team_members WHERE id = $1',
      [req.params.id]
    );
    const row = result.rows[0];
    if (!row || !row.photo_uploaded_path) return res.status(404).end();
    const absPath = path.resolve(row.photo_uploaded_path);
    if (!fs.existsSync(absPath)) return res.status(404).end();
    res.sendFile(absPath);
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

// GET /api/public/teacher/:id/photo — serve an uploaded teacher profile photo
router.get('/teacher/:id/photo', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT profile_photo_path FROM users WHERE id = $1 AND role = \'teacher\'',
      [req.params.id]
    );
    const row = result.rows[0];
    if (!row || !row.profile_photo_path) return res.status(404).end();
    const absPath = path.resolve(row.profile_photo_path);
    if (!fs.existsSync(absPath)) return res.status(404).end();
    res.sendFile(absPath);
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

// GET /api/public/team — active team members + teachers, ordered by display_order then name
router.get('/team', async (req, res) => {
  try {
    // Staff / leadership team members
    const teamRes = await db.query(
      `SELECT id, name, title, bio, photo_url, linkedin_url, display_order,
              photo_source, (photo_uploaded_path IS NOT NULL) AS has_uploaded_photo
       FROM team_members
       WHERE is_active = TRUE
       ORDER BY display_order ASC, created_at ASC`
    );

    // Teachers who have opted into the team page (show_on_team = TRUE)
    const teacherRes = await db.query(
      `SELECT id, name, bio, linkedin_url, avatar_url,
              (profile_photo_path IS NOT NULL) AS has_uploaded_photo
       FROM users
       WHERE role = 'teacher' AND is_active = TRUE AND show_on_team = TRUE
       ORDER BY name ASC`
    );

    const teamRows = teamRes.rows.map((m) => ({
      id:           m.id,
      name:         m.name,
      title:        m.title,
      bio:          m.bio,
      linkedin_url: m.linkedin_url,
      display_order: m.display_order,
      member_type:  'team',
      photo_url:
        m.photo_source === 'upload' && m.has_uploaded_photo
          ? `/api/public/team/${m.id}/photo`
          : (m.photo_url || null),
    }));

    const teacherRows = teacherRes.rows.map((t) => ({
      id:           t.id,
      name:         t.name,
      title:        'Teacher',
      bio:          t.bio,
      linkedin_url: t.linkedin_url,
      display_order: 999,
      member_type:  'teacher',
      photo_url:    t.has_uploaded_photo
        ? `/api/public/teacher/${t.id}/photo`
        : (t.avatar_url || null),
    }));

    // Staff first (by display_order), teachers after (by name)
    res.json([...teamRows, ...teacherRows]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/public/cities — active cities with country info
router.get('/cities', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ci.id, ci.name, ci.description, ci.display_order,
              co.name as country_name, co.code as country_code
       FROM cities ci
       LEFT JOIN countries co ON co.id = ci.country_id
       WHERE ci.is_active = TRUE
       ORDER BY ci.display_order ASC, ci.name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/public/countries — all active countries
router.get('/countries', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, code, currency_code, currency_symbol
       FROM countries
       ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/public/stats — platform stats for public pages
router.get('/stats', async (_req, res) => {
  try {
    const [studentsRes, countriesRes, classesRes] = await Promise.all([
      db.query(`SELECT COUNT(DISTINCT e.student_id) as total_students
                FROM enrollments e`),
      db.query(`SELECT COUNT(DISTINCT co.id) as total_countries
                FROM users u
                JOIN countries co ON co.code = u.phone  -- placeholder; derive from users' registration country
                WHERE u.role = 'student'`),
      db.query(`SELECT COUNT(*) as total_classes FROM classes WHERE is_active = TRUE`),
    ]);

    // Simpler: count distinct countries based on user country field if exists, else just count active classes
    const byCountryRes = await db.query(`
      SELECT co.name as country_name, co.code as country_code,
             COUNT(DISTINCT u.id) as student_count
      FROM users u
      JOIN class_applications ca ON ca.student_id = u.id
      JOIN countries co ON co.id = ca.country_id
      WHERE u.role = 'student' AND ca.payment_status = 'paid'
      GROUP BY co.id, co.name, co.code
      ORDER BY student_count DESC
      LIMIT 20
    `);

    const totalStudentsRes = await db.query(
      `SELECT COUNT(DISTINCT student_id) as count FROM enrollments`
    );
    const totalClassesRes = await db.query(
      `SELECT COUNT(*) as count FROM classes WHERE is_active = TRUE`
    );

    res.json({
      totalStudents: parseInt(totalStudentsRes.rows[0]?.count || 0),
      totalClasses:  parseInt(totalClassesRes.rows[0]?.count || 0),
      totalCountries: byCountryRes.rows.length,
      byCountry: byCountryRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/public/student-countries — distinct countries derived from student user metadata
router.get('/student-countries', async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT co.id, co.name, co.code,
              COUNT(DISTINCT u.id) AS student_count
       FROM users u
       JOIN countries co ON co.id = u.country_id
       WHERE u.role = 'student' AND u.country_id IS NOT NULL
       GROUP BY co.id, co.name, co.code
       ORDER BY student_count DESC, co.name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/public/content/:section — no auth required, used by public pages
router.get('/content/:section', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT content FROM site_content WHERE section = $1',
      [req.params.section]
    );
    res.json(result.rows[0]?.content || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/public/gallery — approved gallery items only
router.get('/gallery', async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, description, file_type, mime_type, file_size,
              uploader_name, created_at
       FROM gallery_items
       WHERE status = 'approved'
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/public/gallery/:id/file — serve an approved gallery file
router.get('/gallery/:id/file', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT file_path, mime_type FROM gallery_items WHERE id = $1 AND status = 'approved'",
      [req.params.id]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).end();
    const abs = path.resolve(row.file_path);
    if (!fs.existsSync(abs)) return res.status(404).end();

    const stat = fs.statSync(abs);
    const rangeHeader = req.headers.range;
    if (rangeHeader && row.mime_type.startsWith('video/')) {
      const parts    = rangeHeader.replace(/bytes=/, '').split('-');
      const start    = parseInt(parts[0], 10);
      const end      = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Range':  `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': chunkSize,
        'Content-Type':   row.mime_type,
      });
      fs.createReadStream(abs, { start, end }).pipe(res);
    } else {
      res.setHeader('Content-Type', row.mime_type);
      res.setHeader('Content-Length', stat.size);
      fs.createReadStream(abs).pipe(res);
    }
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

// GET /api/public/jobs — active job postings (empty array = "hiring soon" shown by frontend)
router.get('/jobs', async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, department, location, type, description, requirements, display_order, created_at
       FROM jobs
       WHERE is_active = TRUE
       ORDER BY display_order ASC, created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/public/books — approved book submissions only
router.get('/books', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT bs.id, bs.amazon_url, bs.title, bs.author, bs.reason, bs.created_at,
              u.name as submitter_name
       FROM book_submissions bs
       JOIN users u ON u.id = bs.user_id
       WHERE bs.status = 'approved'
       ORDER BY bs.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
