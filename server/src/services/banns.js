// 5b: banns as a parish step. The couple's names are announced at Mass on three Sundays in the parish
// where each of them lives. The couple carries paper banns forms to each parish; after three Sundays the
// form is signed and stamped there and the couple brings it back. The bishop may waive the banns.
//
// Kept on the marriage application as one JSON value:
// { groomParish, brideParish, sundays, announced, received: { groom, bride }, dispensed, parents }
// `received`: that person's banns form came back signed and stamped from their parish.
// `parents`: { groomFather, groomMother, brideFather, brideMother }, optional, for the Certificate of Banns.
// `groomAddress`, `brideAddress`: barangay and city only, optional, for the banns poster.
// `onlineConsent`: the couple agreed to have their banns poster shared online.
// An empty parish means that person lives here. A couple marrying in another parish who need the banns
// announced here is a marriage application with wedding_elsewhere set.

const { manilaToday } = require('../constants/purposes');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SUNDAYS_NEEDED = 3;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const isSunday = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay() === 0;

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).filter((d) => ISO_DATE.test(d)))].sort();
}

function normalizeBanns(raw) {
  const b = raw && typeof raw === 'object' ? raw : {};
  const text = (v) => String(v || '').trim().slice(0, 255);
  return {
    groomParish: text(b.groomParish),
    brideParish: text(b.brideParish),
    sundays: dateList(b.sundays),
    announced: dateList(b.announced),
    received: { groom: b.received?.groom === true, bride: b.received?.bride === true },
    dispensed: b.dispensed === true,
    groomAddress: text(b.groomAddress),
    brideAddress: text(b.brideAddress),
    onlineConsent: b.onlineConsent === true,
    parents: {
      groomFather: text(b.parents?.groomFather),
      groomMother: text(b.parents?.groomMother),
      brideFather: text(b.parents?.brideFather),
      brideMother: text(b.parents?.brideMother),
    },
  };
}

/** Announced here when at least one of them lives in this parish. */
function announcedHere(banns) {
  return !banns.groomParish || !banns.brideParish;
}

/**
 * Complete when all three Sundays here are announced and, for a wedding here, each banns form from another
 * parish has come back. For a wedding elsewhere the couple takes those forms to the wedding parish, not us.
 */
function bannsComplete(banns, { elsewhere = false } = {}) {
  if (banns.dispensed) return true;
  const hereDone =
    !announcedHere(banns) ||
    (banns.sundays.length === SUNDAYS_NEEDED && banns.sundays.every((d) => banns.announced.includes(d)));
  const groomDone = elsewhere || !banns.groomParish || banns.received.groom;
  const brideDone = elsewhere || !banns.brideParish || banns.received.bride;
  return hereDone && groomDone && brideDone;
}

/** The next three Sundays from today, all before the wedding when it has a date. */
function suggestSundays(weddingDate, today = manilaToday()) {
  let d = today;
  while (!isSunday(d)) d = addDays(d, 1);
  const found = [];
  while (found.length < SUNDAYS_NEEDED && (!weddingDate || d < weddingDate)) {
    found.push(d);
    d = addDays(d, 7);
  }
  return found;
}

/** Throws 400 when the plan can't be right. */
function checkBanns(banns, { weddingDate, elsewhere }) {
  if (elsewhere && !announcedHere(banns)) {
    throw httpError(400, 'At least one of them must live in this parish for the banns to be announced here.');
  }
  if (banns.sundays.length > SUNDAYS_NEEDED) throw httpError(400, 'Choose three Sundays.');
  if (banns.sundays.some((d) => !isSunday(d))) throw httpError(400, 'Banns are announced on Sundays.');
  if (weddingDate && banns.sundays.some((d) => d >= weddingDate)) {
    throw httpError(400, 'The banns must be announced before the wedding.');
  }
  if (banns.announced.some((d) => !banns.sundays.includes(d))) {
    throw httpError(400, 'Only a planned Sunday can be marked announced.');
  }
  if (banns.announced.some((d) => d > manilaToday())) {
    throw httpError(400, 'A Sunday can be marked announced only once it has come.');
  }
}

/** "1st", "2nd" or "3rd" time of asking on this Sunday, or 0 when the couple isn't announced then. */
function askingOn(banns, date) {
  if (banns.dispensed || !announcedHere(banns)) return 0;
  return banns.sundays.indexOf(date) + 1;
}

module.exports = {
  SUNDAYS_NEEDED,
  normalizeBanns,
  announcedHere,
  bannsComplete,
  suggestSundays,
  checkBanns,
  askingOn,
  isSunday,
};
