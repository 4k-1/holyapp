import type { BookingWarning } from "../types";

/** Shows the booking warnings; a 'rule' warning asks staff to confirm before the booking can be saved. */
export function CalendarWarningNotice({
  warnings,
  bookAnyway,
  onBookAnywayChange,
}: {
  warnings: BookingWarning[];
  bookAnyway: boolean;
  onBookAnywayChange: (value: boolean) => void;
}) {
  if (warnings.length === 0) return null;
  const rule = warnings.some((w) => w.level === "rule");
  return (
    <div
      role="status"
      className="rounded-[10px] border border-admin-gold-600/30 bg-admin-gold-100 px-3.5 py-3 text-admin-support text-admin-gold-700"
    >
      <ul className="space-y-1">
        {warnings.map((w) => (
          <li key={w.message} className={w.level === "rule" ? "font-semibold" : undefined}>
            {w.message}
          </li>
        ))}
      </ul>
      {rule && (
        <label className="mt-2 flex cursor-pointer items-center gap-2 font-semibold text-admin-ink">
          <input
            type="checkbox"
            checked={bookAnyway}
            onChange={(e) => onBookAnywayChange(e.target.checked)}
            className="h-4 w-4 accent-admin-green-700"
          />
          Book anyway (the parish priest has allowed it)
        </label>
      )}
    </div>
  );
}
