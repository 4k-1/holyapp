const crypto = require('crypto');

const PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const JSON_KEY = '__enc';

let warnedMissingKey = false;

function encryptionKey() {
  const raw = String(process.env.DATA_ENCRYPTION_KEY || '').trim();
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  if (raw) {
    return crypto.createHash('sha256').update(raw).digest();
  }
  return null;
}

function hasEncryptionKey() {
  return Boolean(encryptionKey());
}

function warnMissingKey() {
  if (warnedMissingKey) return;
  warnedMissingKey = true;
  console.warn(
    '[crypto] DATA_ENCRYPTION_KEY is not set. Sensitive fields will be stored in plaintext until you add a 64-character hex key to server/.env.'
  );
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

function encrypt(value) {
  if (value == null) return value;
  const text = String(value);
  if (text === '' || isEncrypted(text)) return text === '' ? value : text;

  const key = encryptionKey();
  if (!key) {
    warnMissingKey();
    return text;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

function decrypt(value) {
  if (value == null || !isEncrypted(value)) return value;

  const key = encryptionKey();
  if (!key) {
    warnMissingKey();
    return value;
  }

  try {
    const blob = Buffer.from(value.slice(PREFIX.length), 'base64');
    const iv = blob.subarray(0, IV_LENGTH);
    const tag = blob.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = blob.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch (err) {
    console.error('[crypto] decrypt failed:', err.message);
    return value;
  }
}

function decryptRow(row, columns) {
  if (!row) return row;
  const next = { ...row };
  for (const column of columns) {
    if (next[column] != null) next[column] = decrypt(next[column]);
  }
  return next;
}

function encryptJson(value) {
  if (value == null) return value;
  const object = typeof value === 'string' ? safeParse(value) : value;
  if (!object || typeof object !== 'object') return value;
  if (object[JSON_KEY] && isEncrypted(object[JSON_KEY])) return object;

  const sealed = encrypt(JSON.stringify(object));
  const extras = { [JSON_KEY]: sealed };
  const subjectName = object.subjectName || object.holderName || object.fullName;
  if (subjectName) extras.subjectName = subjectName;
  if (object.verifyUrl) extras.verifyUrl = object.verifyUrl;
  return extras;
}

function decryptJson(value) {
  if (value == null) return value;
  const object = typeof value === 'string' ? safeParse(value) : value;
  if (!object || typeof object !== 'object') return value;
  if (!object[JSON_KEY]) return object;
  const plain = decrypt(object[JSON_KEY]);
  if (typeof plain !== 'string' || isEncrypted(plain)) return object;
  try {
    return JSON.parse(plain);
  } catch {
    return object;
  }
}

// Files (supporting documents) are always encrypted. Without DATA_ENCRYPTION_KEY a production server
// refuses them; elsewhere a fixed development key is used so local uploads still work.
const FILE_MAGIC = Buffer.from('HAF1');
const DEV_FILE_KEY = crypto.createHash('sha256').update('holyapp-development-only-file-key').digest();
let warnedDevFileKey = false;

function fileKey() {
  const key = encryptionKey();
  if (key) return key;
  if (process.env.NODE_ENV === 'production') return null;
  if (!warnedDevFileKey && process.env.NODE_ENV !== 'test') {
    warnedDevFileKey = true;
    console.warn('[crypto] DATA_ENCRYPTION_KEY is not set: uploaded files use a development-only key.');
  }
  return DEV_FILE_KEY;
}

function canEncryptFiles() {
  return Boolean(fileKey());
}

/** The file encrypted: "HAF1", then the 12-byte IV, the 16-byte tag and the ciphertext. */
function encryptBuffer(buffer) {
  const key = fileKey();
  if (!key) throw Object.assign(new Error('DATA_ENCRYPTION_KEY is not set.'), { code: 'NO_FILE_KEY' });
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([FILE_MAGIC, iv, cipher.getAuthTag(), ciphertext]);
}

/** The original file, or an error if the key is wrong or the data was changed. */
function decryptBuffer(blob) {
  const key = fileKey();
  if (!key) throw Object.assign(new Error('DATA_ENCRYPTION_KEY is not set.'), { code: 'NO_FILE_KEY' });
  if (!Buffer.isBuffer(blob) || !blob.subarray(0, FILE_MAGIC.length).equals(FILE_MAGIC)) {
    throw new Error('Not an encrypted file.');
  }
  let at = FILE_MAGIC.length;
  const iv = blob.subarray(at, (at += IV_LENGTH));
  const tag = blob.subarray(at, (at += AUTH_TAG_LENGTH));
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(at)), decipher.final()]);
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

module.exports = {
  PREFIX,
  JSON_KEY,
  hasEncryptionKey,
  isEncrypted,
  encrypt,
  decrypt,
  decryptRow,
  encryptJson,
  decryptJson,
  canEncryptFiles,
  encryptBuffer,
  decryptBuffer,
};
