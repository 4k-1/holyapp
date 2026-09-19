function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function requiredText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw httpError(400, `${label} is required.`);
  return text;
}

function optionalText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function dateValue(value, label, { required = true } = {}) {
  const text = String(value ?? '').trim();
  if (!text) {
    if (!required) return null;
    throw httpError(400, `${label} is required.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw httpError(400, `${label} must be a valid date.`);
  }
  return text;
}

function dateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function timeValue(value, label, { required = false } = {}) {
  const text = String(value ?? '').trim();
  if (!text) {
    if (!required) return null;
    throw httpError(400, `${label} is required.`);
  }
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(text)) {
    throw httpError(400, `${label} must be a valid time.`);
  }
  return text.length === 5 ? `${text}:00` : text;
}

function timeOnly(value) {
  if (!value) return null;
  const text = String(value);
  return text.slice(0, 5);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function optionalUuid(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (!UUID_RE.test(text)) return null;
  return text;
}

function optionalInt(value, label, { min = 0, max } = {}) {
  if (value == null || String(value).trim() === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw httpError(400, `${label} must be a whole number.`);
  }
  if (n < min) {
    throw httpError(400, `${label} is not valid.`);
  }
  if (max != null && n > max) {
    throw httpError(400, `${label} is not valid.`);
  }
  return n;
}

function sendRecordError(res, err) {
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  return res.status(500).json({ error: err.message });
}

module.exports = {
  httpError,
  requiredText,
  optionalText,
  dateValue,
  dateOnly,
  timeValue,
  timeOnly,
  optionalUuid,
  optionalInt,
  sendRecordError,
};
