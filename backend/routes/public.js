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
// Returns the application fee for a given country.
router.get('/application-fee', async (req, res) => {
  const { countryCode } = req.query;
  try {
    const result = await db.query(
      `SELECT af.fee, c.currency_code, c.currency_symbol, c.name as country_name
       FROM application_fees af
       JOIN countries c ON c.id = af.country_id
       WHERE c.code = $1`,
      [(countryCode || 'US').toUpperCase()]
    );
    if (!result.rows[0]) {
      return res.json({ fee: 15, currency_code: 'USD', currency_symbol: '$' });
    }
    res.json(result.rows[0]);
  } catch {
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
