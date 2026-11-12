import { Link } from "react-router-dom";
import type { ScheduleBlock } from "../types";

/** Register entries made from a schedule event (C11), each linking to its record. */
export function RecordedEntries({ entries }: { entries?: ScheduleBlock["recorded"] }) {
  if (!entries || entries.length === 0) return null;
  return (
    <p className="mt-0.5 text-admin-support text-admin-ink-muted">
      {entries.length} in the register:{" "}
      {entries.map((entry, i) => (
        <span key={entry.id}>
          {i > 0 && ", "}
          <Link
            to={`../records/${entry.register}/${encodeURIComponent(entry.id)}`}
            className="font-semibold text-admin-green-700 hover:underline"
          >
            {entry.name || "Entry"}
          </Link>
        </span>
      ))}
    </p>
  );
}
