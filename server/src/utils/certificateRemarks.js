// The Remarks line on a baptism certificate: one line per margin note in the register, with the
// sacrament, its date and the place or detail staff typed, e.g.
//   "Confirmed on 25 September 2026 at Santuario."
// Mirrored in client/src/features/parish-admin/records/baptismalHelpers.ts
// (baptismCertificateNotationLine) so the preview and the printed copy read the same.

const VERBS = { Confirmation: 'Confirmed', Marriage: 'Married', Death: 'Died' };
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function longDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!match) return '';
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

function sentence(text) {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/** One remark from an annotation shaped like the client's: { category, date, note }. */
function certificateRemark(annotation) {
  const note = String(annotation.note || '').trim().replace(/\s+/g, ' ');
  const verb = VERBS[annotation.category];
  if (!verb) return note ? sentence(note) : '';

  const date = longDate(annotation.date);
  const base = date ? `${verb} on ${date}` : verb;
  if (!note) return `${base}.`;

  // "Confirmed at Santuario." already says what happened; keep only the detail after the verb.
  const rest = note.replace(new RegExp(`^${verb}\\b\\s*`, 'i'), '').replace(/\.$/, '').trim();
  if (!rest) return `${base}.`;
  if (/^(at|in|by|with|to)\b/i.test(rest)) return `${base} ${rest}.`;
  return `${base}. ${sentence(rest.charAt(0).toUpperCase() + rest.slice(1))}`;
}

function certificateRemarks(annotations) {
  return annotations.map(certificateRemark).filter(Boolean);
}

module.exports = { certificateRemark, certificateRemarks, longDate };
