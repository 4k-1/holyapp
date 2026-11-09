import { useState } from "react";
import { NOBODY, type AssignableStaff, type AssigneeValue } from "../types";

const GUEST = "__guest";

interface StaffSelectProps {
  staff: AssignableStaff[];
  value: AssigneeValue;
  onChange: (next: AssigneeValue) => void;
  emptyLabel?: string;
  id?: string;
  className?: string;
}

/**
 * Picks someone from the parish staff directory, saved by their record id (C2), so a renamed person stays
 * assigned and two people with the same name are never mixed up. Clergy are listed first, and every option shows
 * the person's role. "Someone else (guest)" takes a typed name for a visiting priest who isn't on the staff list.
 */
export function StaffSelect({
  staff,
  value,
  onChange,
  emptyLabel = "Unassigned",
  id,
  className = "w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink",
}: StaffSelectProps) {
  const [guestMode, setGuestMode] = useState(!value.assigneeId && Boolean(value.assignee));
  const clergy = staff.filter((person) => person.clergy);
  const others = staff.filter((person) => !person.clergy);
  // Someone assigned before they left the active list still shows, under their current name.
  const missing = Boolean(value.assigneeId) && !staff.some((person) => person.id === value.assigneeId);
  const selected = value.assigneeId ?? (guestMode ? GUEST : "");

  function choose(next: string) {
    if (next === GUEST) {
      setGuestMode(true);
      onChange({ assigneeId: null, assignee: value.assigneeId ? "" : value.assignee });
      return;
    }
    setGuestMode(false);
    if (!next) return onChange(NOBODY);
    const person = staff.find((p) => p.id === next);
    onChange({ assigneeId: next, assignee: person?.name ?? value.assignee });
  }

  return (
    <div className="space-y-2">
      <select id={id} value={selected} onChange={(e) => choose(e.target.value)} className={className}>
        <option value="">{emptyLabel}</option>
        {missing && value.assigneeId && (
          <option value={value.assigneeId}>{value.assignee || "Former staff"} · no longer active</option>
        )}
        {clergy.length > 0 && (
          <optgroup label="Clergy">
            {clergy.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} · {person.role}
              </option>
            ))}
          </optgroup>
        )}
        {others.length > 0 && (
          <optgroup label="Other staff">
            {others.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} · {person.role}
              </option>
            ))}
          </optgroup>
        )}
        <option value={GUEST}>Someone else (guest)…</option>
      </select>
      {guestMode && !value.assigneeId && (
        <div>
          <input
            type="text"
            value={value.assignee}
            maxLength={255}
            autoFocus
            aria-label="Guest's name"
            placeholder="Name, e.g. Fr. Jose Cruz (visiting)"
            onChange={(e) => onChange({ assigneeId: null, assignee: e.target.value })}
            className={className}
          />
          <p className="mt-1 text-admin-label text-admin-ink-faint">
            Guests aren't on the staff list, so they aren't checked for clashes with staff.
          </p>
        </div>
      )}
    </div>
  );
}

/** "Fr. Jose Cruz" with a small Guest tag when they aren't on the staff list. */
export function AssigneeName({ name, guest }: { name: string; guest?: boolean }) {
  return (
    <>
      {name}
      {guest && (
        <span className="ml-1.5 rounded-full bg-admin-surface-alt px-1.5 py-0.5 text-admin-label font-semibold text-admin-ink-muted">
          Guest
        </span>
      )}
    </>
  );
}
