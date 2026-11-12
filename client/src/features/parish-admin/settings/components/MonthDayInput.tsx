import { MONTHS } from "../monthDay";

/** Days in each month; February allows the 29th since these dates recur every year. */
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const pad = (n: number) => String(n).padStart(2, "0");

/** A yearly date without a year (a fiesta or feast), as "MM-DD"; "" when not set. */
export function MonthDayInput({
  value,
  onChange,
  label,
  allowEmpty = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  allowEmpty?: boolean;
}) {
  const [month, day] = value ? value.split("-").map(Number) : [0, 0];
  const selectClass =
    "rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink";

  function change(nextMonth: number, nextDay: number) {
    if (!nextMonth) return onChange("");
    const safeDay = Math.min(nextDay || 1, DAYS_IN_MONTH[nextMonth - 1]);
    onChange(`${pad(nextMonth)}-${pad(safeDay)}`);
  }

  return (
    <div className="flex gap-2">
      <select
        value={month || ""}
        onChange={(e) => change(Number(e.target.value), day)}
        aria-label={`${label}: month`}
        className={selectClass}
      >
        <option value="" disabled={!allowEmpty}>
          {allowEmpty ? "Not set" : "Month"}
        </option>
        {MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        value={day || ""}
        onChange={(e) => change(month, Number(e.target.value))}
        aria-label={`${label}: day`}
        disabled={!month}
        className={selectClass}
      >
        <option value="" disabled>
          Day
        </option>
        {Array.from({ length: month ? DAYS_IN_MONTH[month - 1] : 31 }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            {i + 1}
          </option>
        ))}
      </select>
    </div>
  );
}
