const { dateOnly } = require('./recordFields');

const TYPE_TO_CATEGORY = {
  confirmation: 'Confirmation',
  marriage: 'Marriage',
  death: 'Death',
  other: 'Other',
};

function toClientAnnotation(row) {
  const category = TYPE_TO_CATEGORY[row.annotation_type] || 'Other';
  const linkedCategory = TYPE_TO_CATEGORY[row.reference_record_type] || category;
  const book = row.book_number || '';
  const page = row.page_number || '';
  const linked = book && page
    ? {
        category: linkedCategory === 'Other' ? 'Confirmation' : linkedCategory,
        book,
        page,
        line: row.entry_number || undefined,
        recordId: row.reference_record_id || undefined,
      }
    : undefined;

  return {
    id: row.id,
    category,
    date: dateOnly(row.event_date) || dateOnly(row.annotated_at),
    note: row.notes || '',
    by: row.annotated_by_name || 'Parish staff',
    source: row.source === 'auto' ? 'auto' : 'manual',
    ...(linked ? { linked } : {}),
  };
}

async function listBaptismAnnotations(db, baptismId) {
  const result = await db.query(
    `SELECT a.*,
            TRIM(BOTH ' ' FROM CONCAT_WS(' ', u.first_name, u.last_name)) AS annotated_by_name
     FROM annotation a
     JOIN app_user u ON u.id = a.annotated_by
     WHERE a.baptism_id = $1
     ORDER BY COALESCE(a.event_date, a.annotated_at::date), a.annotated_at`,
    [baptismId]
  );
  return result.rows.map(toClientAnnotation);
}

async function baptismInParish(db, parishId, baptismId) {
  if (!baptismId) return false;
  const found = await db.query(
    'SELECT id FROM baptism WHERE id = $1 AND parish_id = $2',
    [baptismId, parishId]
  );
  return found.rowCount > 0;
}

async function annotateFromSacrament(db, {
  parishId,
  baptismId,
  annotationType,
  referenceRecordId,
  actorId,
  notes,
  eventDate,
  bookNumber,
  pageNumber,
  entryNumber,
}) {
  if (!baptismId) return null;
  if (!(await baptismInParish(db, parishId, baptismId))) return null;

  const existing = await db.query(
    `SELECT id FROM annotation
     WHERE baptism_id = $1
       AND reference_record_type = $2
       AND reference_record_id = $3`,
    [baptismId, annotationType, referenceRecordId]
  );
  if (existing.rowCount) return existing.rows[0];

  const inserted = await db.query(
    `INSERT INTO annotation (
       baptism_id, annotation_type, reference_record_type, reference_record_id,
       annotated_by, notes, event_date, book_number, page_number, entry_number, source
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'auto')
     RETURNING *`,
    [
      baptismId,
      annotationType,
      annotationType,
      referenceRecordId,
      actorId,
      notes,
      eventDate,
      bookNumber,
      pageNumber,
      entryNumber,
    ]
  );
  return inserted.rows[0];
}

async function insertManualAnnotation(db, {
  parishId,
  baptismId,
  annotationType,
  referenceRecordType,
  referenceRecordId,
  actorId,
  notes,
  eventDate,
  bookNumber,
  pageNumber,
  entryNumber,
  source,
}) {
  if (!(await baptismInParish(db, parishId, baptismId))) {
    const err = new Error('That baptismal record was not found in this parish.');
    err.status = 404;
    throw err;
  }

  if (referenceRecordId) {
    const existing = await db.query(
      `SELECT id FROM annotation
       WHERE baptism_id = $1
         AND reference_record_type = $2
         AND reference_record_id = $3`,
      [baptismId, referenceRecordType, referenceRecordId]
    );
    if (existing.rowCount) return existing.rows[0];
  }

  const inserted = await db.query(
    `INSERT INTO annotation (
       baptism_id, annotation_type, reference_record_type, reference_record_id,
       annotated_by, notes, event_date, book_number, page_number, entry_number, source
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      baptismId,
      annotationType,
      referenceRecordType,
      referenceRecordId,
      actorId,
      notes,
      eventDate,
      bookNumber,
      pageNumber,
      entryNumber,
      source,
    ]
  );
  return inserted.rows[0];
}

module.exports = {
  TYPE_TO_CATEGORY,
  listBaptismAnnotations,
  annotateFromSacrament,
  insertManualAnnotation,
  toClientAnnotation,
};
