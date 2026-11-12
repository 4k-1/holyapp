/**
 * Built-in marriage requirements ("Philippines – standard"), item 5a. Each parish gets its own copy and
 * can rename, turn off or add items. `key` never changes, so a renamed or removed item stays that way;
 * a key added in a later version is added to every parish once.
 *
 * condition: applies only when the couple's answer is yes. skipWhen: no longer applies when it is yes.
 * validForDays: the document must still be valid on the wedding day.
 */

const CIRCUMSTANCES = Object.freeze([
  { key: 'widowed', question: 'Was either party widowed?' },
  { key: 'previously_married', question: 'Was either party married before (annulled or declared null)?' },
  { key: 'mixed_religion', question: 'Is one party not Catholic?' },
  { key: 'foreign_party', question: 'Is one party a foreign national?' },
  { key: 'cohabiting_5yrs', question: 'Have they lived together as husband and wife for 5 years or more?' },
  { key: 'outside_home_parish', question: 'Is the wedding outside their home parish?' },
]);

const CIRCUMSTANCE_KEYS = Object.freeze(CIRCUMSTANCES.map((c) => c.key));

const SIX_MONTHS = 180;

const TEMPLATES = Object.freeze([
  { key: 'baptism_groom', name: 'Baptismal certificate (groom)', days: SIX_MONTHS, order: 10, note: 'Marked "for marriage purposes".' },
  { key: 'baptism_bride', name: 'Baptismal certificate (bride)', days: SIX_MONTHS, order: 20, note: 'Marked "for marriage purposes".' },
  { key: 'confirmation_groom', name: 'Confirmation certificate (groom)', days: SIX_MONTHS, order: 30, note: 'Marked "for marriage purposes".' },
  { key: 'confirmation_bride', name: 'Confirmation certificate (bride)', days: SIX_MONTHS, order: 40, note: 'Marked "for marriage purposes".' },
  { key: 'birth_groom', name: 'Civil birth certificate (groom)', order: 50, note: 'PSA copy.' },
  { key: 'birth_bride', name: 'Civil birth certificate (bride)', order: 60, note: 'PSA copy.' },
  { key: 'cenomar_groom', name: 'CENOMAR (groom)', days: SIX_MONTHS, order: 70, note: 'PSA Certificate of No Marriage.' },
  { key: 'cenomar_bride', name: 'CENOMAR (bride)', days: SIX_MONTHS, order: 80, note: 'PSA Certificate of No Marriage.' },
  { key: 'license', name: 'Marriage license', days: 120, order: 90, skipWhen: 'cohabiting_5yrs', note: 'From the city or municipal civil registrar.' },
  { key: 'death_spouse', name: 'Death certificate of the late spouse', condition: 'widowed', order: 100 },
  { key: 'nullity', name: 'Decree of nullity or annulment', condition: 'previously_married', order: 110, note: 'Church decree, and the court decision if there was a civil marriage.' },
  { key: 'mixed_permission', name: 'Permission or dispensation for a mixed marriage', condition: 'mixed_religion', order: 120, note: 'Requested through the parish from the diocese.' },
  { key: 'legal_capacity', name: 'Certificate of Legal Capacity to Marry', condition: 'foreign_party', order: 130, note: "From the foreign party's embassy." },
  { key: 'art34_affidavit', name: 'Affidavit of cohabitation (Family Code Art. 34)', condition: 'cohabiting_5yrs', order: 140, note: 'Replaces the marriage license.' },
  { key: 'home_permission', name: 'Letter of permission from the home parish', condition: 'outside_home_parish', order: 150 },
  { key: 'precana', name: 'Pre-Cana / marriage preparation', order: 200 },
  { key: 'interview', name: 'Canonical interview', order: 210 },
  { key: 'banns', name: 'Banns published (three Sundays)', order: 220 },
]);

/** { widowed: true, ... } with only the known keys, as booleans. */
function normalizeCircumstances(value) {
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(CIRCUMSTANCE_KEYS.map((key) => [key, source[key] === true]));
}

/** Whether a requirement belongs on the couple's checklist, given their answers. */
function applies(type, circumstances) {
  if (type.active === false) return false;
  const answers = circumstances || {};
  if (type.condition && type.condition !== 'always' && answers[type.condition] !== true) return false;
  if (type.skip_when && answers[type.skip_when] === true) return false;
  return true;
}

module.exports = { CIRCUMSTANCES, CIRCUMSTANCE_KEYS, TEMPLATES, normalizeCircumstances, applies };
