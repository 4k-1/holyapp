// Sits above the baptismal record form when it was filled in from a ledger row.
// Shows the row's handwriting from both pages (it stays on screen while scrolling, so every
// field can be compared with the register) and what still needs a person.
import { useEffect, useMemo, useState } from "react";
import { RowStrip } from "@/features/parish-admin/ledgers/RowStrip";
import type {
  DraftNote,
  LedgerRowHandoff,
} from "@/features/parish-admin/ledgers/ledgerToRecord";

const TONE: Record<DraftNote["tone"], string> = {
  missing: "text-admin-red-700",
  check: "text-admin-gold-700",
  info: "text-admin-ink-muted",
};

export function LedgerSourcePanel({
  handoff,
  notes,
}: {
  handoff: LedgerRowHandoff;
  notes: DraftNote[];
}) {
  const [open, setOpen] = useState(true);
  const url = useMemo(
    () => (handoff.file ? URL.createObjectURL(handoff.file) : null),
    [handoff.file],
  );
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);

  const sides = (["left", "right"] as const).filter((s) =>
    handoff.cells.some((c) => c.side === s),
  );

  return (
    <>
      {notes.length > 0 && (
        <ul className="mb-3 grid gap-1 rounded-2xl border border-admin-border bg-admin-surface px-4 py-3 text-admin-support">
          {notes.map((n) => (
            <li key={n.label + n.message} className={TONE[n.tone]}>
              <span className="font-semibold">{n.label}:</span> {n.message}
            </li>
          ))}
        </ul>
      )}
      <div className="sticky top-[4.75rem] z-[9] mb-4 rounded-2xl border border-admin-gold-600/30 bg-admin-surface shadow-[0_6px_20px_rgb(14_59_70/0.08)] sm:top-[5.25rem]">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <p className="text-admin-support text-admin-ink">
            <span className="font-semibold">
              Filled in from the register photo
            </span>
            <span className="text-admin-ink-muted">
              {" "}
              · row {handoff.row}
              {handoff.bookNumber ? ` · book ${handoff.bookNumber}, page ${handoff.pageNumber}` : ""}
            </span>
          </p>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-admin-support font-medium text-admin-green-700 hover:underline"
            aria-expanded={open}
          >
            {open ? "Hide" : "Show"} handwriting
          </button>
        </div>
        {open && (
          <div className="grid gap-2 border-t border-admin-border px-4 py-3">
            {sides.length === 0 ? (
              <p className="text-admin-support text-admin-ink-muted">
                No picture of this row (the grid wasn't found).
              </p>
            ) : (
              sides.map((side) => (
                <RowStrip
                  key={side}
                  imageUrl={url}
                  page={handoff.page}
                  cells={handoff.cells.filter((c) => c.side === side)}
                  focusField={null}
                  flagged={new Set()}
                  onPick={() => {}}
                />
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
