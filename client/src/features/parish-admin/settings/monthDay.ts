export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "08-16" → "August 16". */
export function formatMonthDay(value: string) {
  const [month, day] = value.split("-").map(Number);
  if (!month || !day) return value;
  return `${MONTHS[month - 1]} ${day}`;
}
