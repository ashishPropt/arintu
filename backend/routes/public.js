/**
 * Public routes — no authentication required.
 * Used by the landing page.
 */
const express = require('express');
const db = require('../database/db');

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
      `SELECT c.id, c.name, c.description, c.subject, c.level, c.max_students, c.is_active,
              u.name as admin_name,
              (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) as enrolled_count,
              (SELECT json_agg(json_build_object('name', t.name))
               FROM teacher_assignments ta JOIN users t ON t.id = ta.teacher_id
               WHERE ta.class_id = c.id) as teachers
       FROM classes c
       JOIN users u ON u.id = c.admin_id
       WHERE c.is_active = TRUE
       ORDER BY c.created_at DESC`
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
            currencySymbol = country?.currency_symbol || '$';
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

// GET /api/public/team — active team members, ordered by display_order
router.get('/team', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, title, bio, photo_url, linkedin_url, display_order
       FROM team_members
       WHERE is_active = TRUE
       ORDER BY display_order ASC, created_at ASC`
    );
    res.json(result.rows);
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
