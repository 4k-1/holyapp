// B5 + C5: the Church calendar as used in the Philippines, worked out from the date (no table).
//
// - Seasons: Advent, Christmas, Lent, the Easter Triduum, Easter, Ordinary Time.
// - Sundays and the main celebrations: solemnities, feasts of the Lord, Holy Week, Simbang Gabi.
// - Philippine rules: holy days of obligation are every Sunday plus 1 January, 8 December and
//   25 December. Epiphany, Ascension and Corpus Christi are kept on Sunday.
// - Booking warnings: funeral Masses (GIRM 380) and weddings on days the Church doesn't allow them.
//
// Dates are ISO strings ("2026-12-08"); arithmetic is done in UTC days so time zones don't matter.

const DAY = 86400000;

function parse(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function isoOf(t) {
  return new Date(t).toISOString().slice(0, 10);
}

const dow = (t) => new Date(t).getUTCDay();
const add = (t, days) => t + days * DAY;
const weeksBetween = (from, to) => Math.round((to - from) / (7 * DAY));

function ordinal(n) {
  const rem = n % 100;
  if (rem >= 11 && rem <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
}

/** Easter Sunday (Gregorian), by the anonymous algorithm. */
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(year, month - 1, day);
}

const SEASONS = {
  advent: 'Advent',
  christmas: 'Christmas',
  lent: 'Lent',
  triduum: 'Easter Triduum',
  easter: 'Easter',
  ordinary: 'Ordinary Time',
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const yearCache = new Map();

/** The dates each year's calendar hangs on, and its named days. */
function yearOf(year) {
  if (yearCache.has(year)) return yearCache.get(year);

  const easter = easterSunday(year);
  const christmas = Date.UTC(year, 11, 25);
  const advent1 = add(christmas, -((dow(christmas) || 7) + 21));
  const jan2 = Date.UTC(year, 0, 2);
  const epiphany = add(jan2, (7 - dow(jan2)) % 7); // the Sunday from 2 to 8 January
  const epiphanyDay = new Date(epiphany).getUTCDate();
  const baptism = epiphanyDay >= 7 ? add(epiphany, 1) : add(epiphany, 7);
  const dec26 = Date.UTC(year, 11, 26);
  const familySunday = add(dec26, (7 - dow(dec26)) % 7);
  const holyFamily = familySunday > Date.UTC(year, 11, 31) ? Date.UTC(year, 11, 30) : familySunday;
  const jan1 = Date.UTC(year, 0, 1);
  const santoNino = add(add(jan1, (7 - dow(jan1)) % 7), 14); // third Sunday of January

  const a = {
    easter,
    christmas,
    advent1,
    christKing: add(advent1, -7),
    ash: add(easter, -46),
    lent1: add(easter, -42),
    palm: add(easter, -7),
    holyThursday: add(easter, -3),
    goodFriday: add(easter, -2),
    holySaturday: add(easter, -1),
    pentecost: add(easter, 49),
    baptism,
    // The first Sunday after the Baptism of the Lord is the 2nd Sunday in Ordinary Time.
    ordinary2: add(baptism, 7 - dow(baptism)),
  };

  /** Named days: { title, rank: 'solemnity' | 'feast' | 'day', obligation }. Later entries win. */
  const named = new Map();
  const put = (t, title, rank, obligation = false) => named.set(t, { title, rank, obligation });
  const inHolyWeekOrOctave = (t) => t >= a.palm && t <= add(easter, 7);
  const lentSunday = (t) => dow(t) === 0 && t >= a.ash && t < easter;

  // Feasts, kept only when they don't fall on a Sunday of Advent, Lent or Easter.
  const feast = (month, day, title) => {
    const t = Date.UTC(year, month - 1, day);
    const privileged = dow(t) === 0 && (t >= advent1 || (t >= a.ash && t <= a.pentecost));
    if (!privileged) put(t, title, 'feast');
  };
  put(santoNino, 'Feast of the Santo Niño', 'feast');
  feast(2, 2, 'Feast of the Presentation of the Lord');
  feast(8, 6, 'Feast of the Transfiguration of the Lord');
  feast(9, 14, 'Feast of the Exaltation of the Holy Cross');
  put(Date.UTC(year, 10, 2), 'Commemoration of All the Faithful Departed (All Souls)', 'day');
  feast(12, 12, 'Feast of Our Lady of Guadalupe');
  put(holyFamily, 'Feast of the Holy Family', 'feast');
  put(baptism, 'Feast of the Baptism of the Lord', 'feast');

  // Fixed solemnities.
  put(jan1, 'Solemnity of Mary, Mother of God', 'solemnity', true);
  let joseph = Date.UTC(year, 2, 19);
  if (joseph >= a.palm && joseph < easter) joseph = add(a.palm, -1);
  else if (lentSunday(joseph)) joseph = add(joseph, 1);
  put(joseph, 'Solemnity of St Joseph', 'solemnity');
  let annunciation = Date.UTC(year, 2, 25);
  if (inHolyWeekOrOctave(annunciation)) annunciation = add(easter, 8);
  else if (lentSunday(annunciation)) annunciation = add(annunciation, 1);
  put(annunciation, 'Solemnity of the Annunciation of the Lord', 'solemnity');
  put(Date.UTC(year, 5, 24), 'Solemnity of the Nativity of St John the Baptist', 'solemnity');
  put(Date.UTC(year, 5, 29), 'Solemnity of Sts Peter and Paul', 'solemnity');
  put(Date.UTC(year, 7, 15), 'Solemnity of the Assumption of the Blessed Virgin Mary', 'solemnity');
  put(Date.UTC(year, 10, 1), 'Solemnity of All Saints', 'solemnity');
  const dec8 = Date.UTC(year, 11, 8);
  if (dow(dec8) === 0) put(add(dec8, 1), 'Solemnity of the Immaculate Conception', 'solemnity');
  else put(dec8, 'Solemnity of the Immaculate Conception', 'solemnity', true);
  put(christmas, 'Solemnity of the Nativity of the Lord (Christmas)', 'solemnity', true);
  put(epiphany, 'Solemnity of the Epiphany of the Lord', 'solemnity');
  put(a.christKing, 'Solemnity of Our Lord Jesus Christ, King of the Universe', 'solemnity');

  // Lent, Holy Week and Easter.
  put(a.ash, 'Ash Wednesday', 'day');
  put(a.palm, "Palm Sunday of the Lord's Passion", 'day');
  for (let i = 1; i <= 3; i += 1) put(add(a.palm, i), `${WEEKDAYS[i]} of Holy Week`, 'day');
  put(a.holyThursday, 'Holy Thursday', 'day');
  put(a.goodFriday, "Good Friday of the Lord's Passion", 'day');
  put(a.holySaturday, 'Holy Saturday (Easter Vigil at night)', 'day');
  put(easter, "Easter Sunday of the Lord's Resurrection", 'solemnity');
  for (let i = 1; i <= 6; i += 1) put(add(easter, i), `Easter ${WEEKDAYS[i]} (Octave of Easter)`, 'solemnity');
  put(add(easter, 7), '2nd Sunday of Easter (Divine Mercy Sunday)', 'day');
  put(add(easter, 42), 'Solemnity of the Ascension of the Lord', 'solemnity');
  put(a.pentecost, 'Solemnity of Pentecost', 'solemnity');
  put(add(easter, 56), 'Solemnity of the Most Holy Trinity', 'solemnity');
  put(add(easter, 63), 'Solemnity of the Most Holy Body and Blood of Christ (Corpus Christi)', 'solemnity');
  put(add(easter, 68), 'Solemnity of the Most Sacred Heart of Jesus', 'solemnity');

  const result = { anchors: a, named };
  yearCache.set(year, result);
  return result;
}

function seasonOf(t, a) {
  if (t >= a.christmas) return 'christmas';
  if (t >= a.advent1) return 'advent';
  if (t <= a.baptism) return 'christmas';
  if (t < a.ash) return 'ordinary';
  if (t < a.holyThursday) return 'lent';
  if (t < a.easter) return 'triduum';
  if (t <= a.pentecost) return 'easter';
  return 'ordinary';
}

function sundayTitle(t, season, a) {
  if (season === 'advent') return `${ordinal(weeksBetween(a.advent1, t) + 1)} Sunday of Advent`;
  if (season === 'lent') return `${ordinal(weeksBetween(a.lent1, t) + 1)} Sunday of Lent`;
  if (season === 'easter') return `${ordinal(weeksBetween(a.easter, t) + 1)} Sunday of Easter`;
  if (season === 'ordinary') {
    const n = t < a.ash ? weeksBetween(a.ordinary2, t) + 2 : 34 - weeksBetween(t, a.christKing);
    return `${ordinal(n)} Sunday in Ordinary Time`;
  }
  return 'Sunday';
}

/** Valid "MM-DD" (29 February allowed), for the parish's own yearly dates. */
function isMonthDay(value) {
  const match = /^(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(2024, month, 0)).getUTCDate();
}

/** The parish's own dates on this day: the fiesta and any other local feast. */
function localDatesOn(iso, local = {}) {
  const monthDay = String(iso).slice(5);
  const found = [];
  if (local.fiestaDate === monthDay) {
    found.push(local.patron ? `Parish fiesta (${local.patron})` : 'Parish fiesta');
  }
  for (const item of local.localFeasts || []) {
    if (item && item.date === monthDay && item.name) found.push(item.name);
  }
  return found;
}

/**
 * One day of the calendar:
 * { date, season, seasonLabel, title, rank, sunday, obligation, notes, local }.
 * `title` is empty on an ordinary weekday; `obligation` is a holy day of obligation (every Sunday too).
 */
function liturgicalDay(iso, local) {
  const t = parse(iso);
  const year = new Date(t).getUTCFullYear();
  const { anchors, named } = yearOf(year);
  const season = seasonOf(t, anchors);
  const sunday = dow(t) === 0;
  const special = named.get(t);

  let title = '';
  let rank = sunday ? 'sunday' : 'weekday';
  let obligation = sunday;
  if (special) {
    title = special.title;
    if (special.rank !== 'day') rank = special.rank;
    obligation = obligation || special.obligation;
  } else if (sunday) {
    title = sundayTitle(t, season, anchors);
  } else if (season === 'christmas' && t > anchors.christmas && t <= Date.UTC(year, 11, 31)) {
    title = `${WEEKDAYS[dow(t)]} within the Octave of Christmas`;
  }

  const notes = [];
  const month = new Date(t).getUTCMonth();
  const date = new Date(t).getUTCDate();
  if (month === 11 && date >= 16 && date <= 24) notes.push(`Simbang Gabi, day ${date - 15} of 9`);
  if (obligation && !sunday) notes.push('Holy day of obligation');

  return {
    date: iso,
    season,
    seasonLabel: SEASONS[season],
    title,
    rank,
    sunday,
    obligation,
    notes,
    local: localDatesOn(iso, local),
  };
}

/** Every day of a month (month 0–11), keyed by ISO date. */
function monthCalendar(year, month, local) {
  const days = {};
  const total = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  for (let d = 1; d <= total; d += 1) {
    const iso = isoOf(Date.UTC(year, month, d));
    days[iso] = liturgicalDay(iso, local);
  }
  return days;
}

/**
 * Why a booking on this day may not be allowed. Each warning is { level, message }:
 * - 'rule': the Church doesn't allow it; staff must choose to book anyway.
 * - 'note': worth knowing (Lent weddings, the parish fiesta); no confirmation needed.
 * Regular Masses aren't bookings, so they get none.
 */
function bookingWarnings(type, iso, local) {
  if (!type || type === 'mass') return [];
  const day = liturgicalDay(iso, local);
  const { anchors } = yearOf(new Date(parse(iso)).getUTCFullYear());
  const t = parse(iso);
  const name = day.title || day.seasonLabel;
  const warnings = [];

  if (type === 'funeral') {
    const holyThursday = t === anchors.holyThursday;
    const forbidden =
      holyThursday ||
      day.season === 'triduum' ||
      (day.rank === 'solemnity' && day.obligation) ||
      (day.sunday && ['advent', 'lent', 'easter'].includes(day.season));
    if (forbidden) {
      warnings.push({
        level: 'rule',
        message: `A funeral Mass isn't allowed on this day (${name}; GIRM 380). The funeral rite without Mass can still be held.`,
      });
    }
  }

  if (type === 'wedding') {
    if (t === anchors.goodFriday || t === anchors.holySaturday) {
      warnings.push({ level: 'rule', message: `Weddings aren't celebrated on this day (${name}).` });
    } else if (day.season === 'lent' || t === anchors.holyThursday) {
      warnings.push({
        level: 'note',
        message: 'This is during Lent. Many dioceses discourage weddings in Lent; check with the parish priest.',
      });
    }
  }

  for (const label of day.local) {
    warnings.push({ level: 'note', message: `${label} falls on this day. The church and priests may be busy.` });
  }
  return warnings;
}

module.exports = {
  easterSunday: (year) => isoOf(easterSunday(year)),
  liturgicalDay,
  monthCalendar,
  bookingWarnings,
  isMonthDay,
};
