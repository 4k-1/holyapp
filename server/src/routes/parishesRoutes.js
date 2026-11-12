const express = require('express');
const pool = require('../config/db');
const { getLogo } = require('../controllers/parishLogoController');

const router = express.Router();

function slugify(name) {
  return String(name)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'parish';
}

function toParish(row) {
  return {
    id: row.id,
    slug: row.slug || slugify(row.name),
    name: row.name,
    address: row.address,
    contact: row.contact,
    email: row.email,
    seal_url: row.seal_url || null,
    tagline: row.tagline || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, slug, name, address, contact, email, seal_url, created_at, updated_at
       FROM parish
       ORDER BY name`
    );
    res.json({ parishes: result.rows.map(toParish) });
  } catch (err) {
    if (err.code === '42703') {
      const result = await pool.query(
        `SELECT id, name, address, contact, email, seal_url, created_at, updated_at
         FROM parish
         ORDER BY name`
      );
      return res.json({
        parishes: result.rows.map((row) => toParish({ ...row, slug: null })),
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// Public: the sign-in page, the certificate check page and printed certificates all show it.
router.get('/:parishId/logo', getLogo);

module.exports = router;
