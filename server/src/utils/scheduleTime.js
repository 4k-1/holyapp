function parseTimeToMinutes(t) {
  const text = String(t || '').trim();
  const twelve = text.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (twelve) {
    let h = parseInt(twelve[1], 10);
    const min = parseInt(twelve[2], 10);
    const ap = twelve[3].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  }
  const twentyFour = text.match(/^(\d{1,2}):(\d{2})/);
  if (twentyFour) {
    return parseInt(twentyFour[1], 10) * 60 + parseInt(twentyFour[2], 10);
  }
  return 0;
}

function minutesToTime(total) {
  let value = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(value / 60);
  const m = value % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

function convert24to12(t) {
  if (!t) return '12:00 AM';
  const [h, m] = String(t).split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

function to24Hour(t) {
  const mins = parseTimeToMinutes(t);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayAbbrev(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
}

function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

function toTimestamp(date, time12) {
  return `${date} ${to24Hour(time12)}:00`;
}

function findConflict(occurrences, start, end, excludeId, assignee) {
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  return occurrences.find((b) => {
    if (excludeId && b.id === excludeId) return false;
    if (assignee && b.assignee !== assignee) return false;
    const bStart = parseTimeToMinutes(b.start);
    const bEnd = parseTimeToMinutes(b.end);
    return startMin < bEnd && endMin > bStart;
  });
}

module.exports = {
  parseTimeToMinutes,
  minutesToTime,
  convert24to12,
  to24Hour,
  toISO,
  dayAbbrev,
  daysInMonth,
  toTimestamp,
  findConflict,
};
