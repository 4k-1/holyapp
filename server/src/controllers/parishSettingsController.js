const pool = require('../config/db');
const { toDataUrl } = require('./certificateSignatureController');
const { writeAudit } = require('../utils/audit');
const { isMonthDay } = require('../utils/liturgicalCalendar');

const SACRAMENTS = ['baptism', 'confirmation', 'marriage', 'death'];

const DEFAULT_FEES = [
  { label: 'Baptismal Certificate', amount: 100 },
  { label: 'Confirmation Certificate', amount: 100 },
  { label: 'Marriage Certificate', amount: 150 },
  { label: 'Death Certificate', amount: 100 },
  { label: 'Additional copy (per copy)', amount: 50 },
  { label: 'Mass Intention (per intention)', amount: 100 },
  { label: 'House Blessing', amount: 500 },
  { label: 'Car Blessing', amount: 300 },
  { label: 'Business Blessing', amount: 500 },
];

const DEFAULT_CERTS = {
  baptism: {
    signatoryName: 'Fr. Juan Santos',
    signatoryTitle: 'Parish Priest',
    numberingPrefix: 'BAP',
    footerText:
      'This certificate is a true extract from the baptismal register of this parish and is issued for the purposes permitted by canon law.',
  },
  confirmation: {
    signatoryName: 'Fr. Juan Santos',
    signatoryTitle: 'Parish Priest',
    numberingPrefix: 'CFM',
    footerText:
      'This certificate is a true extract from the confirmation register of this parish and is issued for the purposes permitted by canon law.',
  },
  marriage: {
    signatoryName: 'Fr. Juan Santos',
    signatoryTitle: 'Parish Priest',
    numberingPrefix: 'MRG',
    footerText:
      'This certificate is a true extract from the marriage register of this parish and is issued for the purposes permitted by canon law.',
  },
  death: {
    signatoryName: 'Fr. Juan Santos',
    signatoryTitle: 'Parish Priest',
    numberingPrefix: 'DTH',
    footerText:
      'This certificate is a true extract from the death register of this parish and is issued for the purposes permitted by canon law.',
  },
};

function formatFeeDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function toProfile(parish, settings) {
  return {
    name: parish.name,
    address: parish.address,
    patron: (settings && settings.patron) || '',
    diocese: (settings && settings.diocese) || '',
    phone: parish.contact,
    email: parish.email || '',
    sealUrl: parish.seal_url || (settings && settings.logo_url) || undefined,
    fiestaDate: (settings && settings.fiesta_date) || '',
    localFeasts: (settings && Array.isArray(settings.local_feasts) && settings.local_feasts) || [],
  };
}

/** The parish's own yearly dates (B5 + C5): a fiesta "MM-DD" and other local feasts { name, date }. */
function parseLocalDates(body) {
  const fiestaDate = String(body.fiestaDate || '').trim();
  if (fiestaDate && !isMonthDay(fiestaDate)) {
    const err = new Error('The fiesta date is not a valid day of the year.');
    err.status = 400;
    throw err;
  }
  const list = Array.isArray(body.localFeasts) ? body.localFeasts : [];
  if (list.length > 30) {
    const err = new Error('Add at most 30 local feasts.');
    err.status = 400;
    throw err;
  }
  const localFeasts = list.map((item) => ({
    name: String((item && item.name) || '').trim().slice(0, 120),
    date: String((item && item.date) || '').trim(),
  }));
  if (localFeasts.some((item) => !item.name || !isMonthDay(item.date))) {
    const err = new Error('Each local feast needs a name and a valid day of the year.');
    err.status = 400;
    throw err;
  }
  // Left out (an older screen): keep what's saved.
  const given = 'fiestaDate' in body || 'localFeasts' in body;
  return { given, fiestaDate: fiestaDate || null, localFeasts };
}

function toFee(row) {
  return {
    id: row.id,
    label: row.label,
    amount: Number(row.amount),
    updatedBy: row.updated_by_name || 'Parish office',
    updatedOn: formatFeeDate(row.updated_at),
  };
}

function toAppearance(row, type) {
  const fallback = DEFAULT_CERTS[type];
  return {
    signatoryName: row.signatory_name || fallback.signatoryName,
    signatoryTitle: row.signatory_title || fallback.signatoryTitle,
    numberingPrefix: row.numbering_prefix || fallback.numberingPrefix,
    footerText: row.footer_text || fallback.footerText,
    signatureImage: toDataUrl(row.signature_image),
  };
}

async function actorName(userId) {
  const result = await pool.query(
    `SELECT NULLIF(trim(concat_ws(' ', first_name, middle_name, last_name)), '') AS full_name
     FROM app_user WHERE id = $1`,
    [userId]
  );
  return (result.rows[0] && result.rows[0].full_name) || 'Parish office';
}

async function ensureSettings(parishId, actorId) {
  await pool.query(
    `INSERT INTO parish_settings (parish_id, updated_by)
     VALUES ($1, $2)
     ON CONFLICT (parish_id) DO NOTHING`,
    [parishId, actorId]
  );
}

async function ensureFees(parishId, actorId) {
  const existing = await pool.query('SELECT id FROM service_fee WHERE parish_id = $1', [parishId]);
  if (existing.rows.length > 0) return;
  for (const fee of DEFAULT_FEES) {
    await pool.query(
      `INSERT INTO service_fee (parish_id, service_name, amount, updated_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (parish_id, service_name) DO NOTHING`,
      [parishId, fee.label, fee.amount, actorId]
    );
  }
}

async function ensureCertificates(parishId, actorId) {
  for (const type of SACRAMENTS) {
    const defaults = DEFAULT_CERTS[type];
    await pool.query(
      `INSERT INTO certificate_configuration (
         parish_id, certificate_type, signatory_name, signatory_title,
         numbering_prefix, footer_text, updated_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (parish_id, certificate_type) DO NOTHING`,
      [
        parishId,
        type,
        defaults.signatoryName,
        defaults.signatoryTitle,
        defaults.numberingPrefix,
        defaults.footerText,
        actorId,
      ]
    );
  }
}

async function getProfile(req, res) {
  try {
    await ensureSettings(req.parishId, req.user.id);
    const parish = await pool.query(
      `SELECT id, name, address, contact, email, seal_url FROM parish WHERE id = $1`,
      [req.parishId]
    );
    if (parish.rows.length === 0) {
      return res.status(404).json({ error: 'Parish not found.' });
    }
    const settings = await pool.query(
      `SELECT patron, diocese, logo_url, fiesta_date, local_feasts FROM parish_settings WHERE parish_id = $1`,
      [req.parishId]
    );
    res.json({ profile: toProfile(parish.rows[0], settings.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateProfile(req, res) {
  const name = String(req.body.name || '').trim();
  const address = String(req.body.address || '').trim();
  const phone = String(req.body.phone || req.body.contact || '').trim();
  const email = String(req.body.email || '').trim();
  const patron = String(req.body.patron || '').trim();
  const diocese = String(req.body.diocese || '').trim();
  const sealUrl = req.body.sealUrl || req.body.seal_url || null;

  if (!name || !address) {
    return res.status(400).json({ error: 'Parish name and address are required.' });
  }
  let localDates;
  try {
    localDates = parseLocalDates(req.body);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  try {
    await ensureSettings(req.parishId, req.user.id);
    const parish = await pool.query(
      `UPDATE parish
       SET name = $1, address = $2, contact = $3, email = $4, seal_url = COALESCE($5, seal_url), updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, address, contact, email, seal_url`,
      [name, address, phone, email, sealUrl, req.parishId]
    );
    const settings = await pool.query(
      `UPDATE parish_settings
       SET patron = $1, diocese = $2, logo_url = COALESCE($3, logo_url), updated_by = $4, updated_at = NOW(),
           fiesta_date = CASE WHEN $8 THEN $6 ELSE fiesta_date END,
           local_feasts = CASE WHEN $8 THEN $7::jsonb ELSE local_feasts END
       WHERE parish_id = $5
       RETURNING patron, diocese, logo_url, fiesta_date, local_feasts`,
      [
        patron,
        diocese,
        sealUrl,
        req.user.id,
        req.parishId,
        localDates.fiestaDate,
        JSON.stringify(localDates.localFeasts),
        localDates.given,
      ]
    );
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'parish.updated',
      entityType: 'parish',
      entityId: req.parishId,
      metadata: { name },
    });
    res.json({ profile: toProfile(parish.rows[0], settings.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listFees(req, res) {
  try {
    await ensureFees(req.parishId, req.user.id);
    const result = await pool.query(
      `SELECT f.id, f.service_name AS label, f.amount, f.updated_at,
              NULLIF(trim(concat_ws(' ', u.first_name, u.middle_name, u.last_name)), '') AS updated_by_name
       FROM service_fee f
       LEFT JOIN app_user u ON u.id = f.updated_by
       WHERE f.parish_id = $1
       ORDER BY f.service_name`,
      [req.parishId]
    );
    res.json({ fees: result.rows.map(toFee) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateFee(req, res) {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return res.status(400).json({ error: 'Enter a valid fee amount.' });
  }

  try {
    const result = await pool.query(
      `UPDATE service_fee
       SET amount = $1, updated_by = $2, updated_at = NOW()
       WHERE id = $3 AND parish_id = $4
       RETURNING id, service_name AS label, amount, updated_at`,
      [amount, req.user.id, req.params.feeId, req.parishId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fee not found.' });
    }
    const name = await actorName(req.user.id);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'parish.fee_updated',
      entityType: 'service_fee',
      entityId: result.rows[0].id,
      metadata: { amount, label: result.rows[0].label },
    });
    res.json({
      fee: {
        id: result.rows[0].id,
        label: result.rows[0].label,
        amount: Number(result.rows[0].amount),
        updatedBy: name,
        updatedOn: formatFeeDate(result.rows[0].updated_at),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getCertificates(req, res) {
  try {
    await ensureCertificates(req.parishId, req.user.id);
    const result = await pool.query(
      `SELECT certificate_type, signatory_name, signatory_title, numbering_prefix, footer_text, signature_image
       FROM certificate_configuration
       WHERE parish_id = $1`,
      [req.parishId]
    );
    const config = {};
    for (const type of SACRAMENTS) {
      const row = result.rows.find((item) => item.certificate_type === type) || {};
      config[type] = toAppearance(row, type);
    }
    res.json({ certificates: config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

const PREFIX_FORMAT = /^[A-Z0-9]{2,5}$/;

function normalizePrefix(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Each sacrament needs its own prefix: certificate numbers are counted per sacrament, so two
 * sacraments sharing a prefix would both issue e.g. MC-2026-000001. A prefix already printed on
 * another sacrament's certificates is refused for the same reason. Returns an error message or null.
 */
async function prefixProblem(parishId, body) {
  const current = await pool.query(
    'SELECT certificate_type, numbering_prefix FROM certificate_configuration WHERE parish_id = $1',
    [parishId]
  );
  const prefixes = {};
  for (const row of current.rows) prefixes[row.certificate_type] = row.numbering_prefix;
  for (const type of SACRAMENTS) {
    if (body[type]) prefixes[type] = normalizePrefix(body[type].numberingPrefix);
  }

  for (const type of SACRAMENTS) {
    const prefix = prefixes[type] || DEFAULT_CERTS[type].numberingPrefix;
    if (!PREFIX_FORMAT.test(prefix)) {
      return `The ${type} prefix must be 2 to 5 letters or numbers.`;
    }
    const clash = SACRAMENTS.find(
      (other) => other !== type && (prefixes[other] || DEFAULT_CERTS[other].numberingPrefix) === prefix
    );
    if (clash) {
      return `${prefix} is set for both ${clash} and ${type}. Give each certificate its own prefix.`;
    }
    const used = await pool.query(
      `SELECT record_type FROM certificate
       WHERE parish_id = $1 AND record_type <> $2 AND certificate_code LIKE $3
       LIMIT 1`,
      [parishId, type, `${prefix}-%`]
    );
    if (used.rows[0]) {
      return `${prefix} is already printed on this parish's ${used.rows[0].record_type} certificates. Choose another prefix for ${type}.`;
    }
  }
  return null;
}

async function updateCertificates(req, res) {
  const body = req.body.certificates || req.body;
  try {
    await ensureCertificates(req.parishId, req.user.id);
    const problem = await prefixProblem(req.parishId, body);
    if (problem) return res.status(400).json({ error: problem });
    for (const type of SACRAMENTS) {
      const appearance = body[type];
      if (!appearance) continue;
      await pool.query(
        `UPDATE certificate_configuration
         SET -- A signature belongs to the person named under it: a new name drops it until theirs is uploaded.
             signature_image = CASE WHEN lower(trim(signatory_name)) = lower($1) THEN signature_image ELSE NULL END,
             signatory_name = $1,
             signatory_title = $2,
             numbering_prefix = $3,
             footer_text = $4,
             updated_by = $5,
             updated_at = NOW()
         WHERE parish_id = $6 AND certificate_type = $7`,
        [
          String(appearance.signatoryName || '').trim(),
          String(appearance.signatoryTitle || '').trim(),
          normalizePrefix(appearance.numberingPrefix),
          String(appearance.footerText || '').trim(),
          req.user.id,
          req.parishId,
          type,
        ]
      );
    }
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'parish.certificate_config_updated',
      entityType: 'certificate_configuration',
      entityId: req.parishId,
      metadata: {},
    });
    return getCertificates(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  listFees,
  updateFee,
  getCertificates,
  updateCertificates,
};
