import type { AssignableStaff } from "../types";

interface StaffSelectProps {
  staff: AssignableStaff[];
  value: string;
  onChange: (name: string) => void;
  emptyLabel?: string;
  id?: string;
  className?: string;
}

/**
 * Picks someone from the parish staff directory. Clergy are listed first, and every option shows the person's
 * role so two people with similar names can be told apart.
 */
export function StaffSelect({
  staff,
  value,
  onChange,
  emptyLabel = "Unassigned",
  id,
  className = "w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink",
}: StaffSelectProps) {
  const clergy = staff.filter((person) => person.clergy);
  const others = staff.filter((person) => !person.clergy);
  // Keep a name that was assigned before the person left the directory, so it still shows.
  const missing = value && !staff.some((person) => person.name === value);

  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">{emptyLabel}</option>
      {missing && <option value={value}>{value}</option>}
      {clergy.length > 0 && (
        <optgroup label="Clergy">
          {clergy.map((person) => (
            <option key={person.id} value={person.name}>
              {person.name} · {person.role}
            </option>
          ))}
        </optgroup>
      )}
      {others.length > 0 && (
        <optgroup label="Other staff">
          {others.map((person) => (
            <option key={person.id} value={person.name}>
              {person.name} · {person.role}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
