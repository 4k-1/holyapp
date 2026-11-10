import { useState, type FormEvent } from "react";
import { AdminButton, AdminInput } from "@/features/parish-admin/components/AdminForm";

interface MassCapacitySettingProps {
  /** Intentions allowed per Mass, or null for no limit. */
  capacity: number | null;
  onSave: (next: number | null) => Promise<void>;
}

/** Parish-wide intention slots per Mass — same cap on every Mass, or none, edited inline right here. */
export function MassCapacitySetting({ capacity, onSave }: MassCapacitySettingProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(capacity ?? 5));
  const [unlimited, setUnlimited] = useState(capacity === null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [synced, setSynced] = useState({ capacity, editing });
  if (synced.capacity !== capacity || synced.editing !== editing) {
    setSynced({ capacity, editing });
    if (!editing) {
      setValue(String(capacity ?? 5));
      setUnlimited(capacity === null);
    }
  }

  const next = Number(value);
  const canSave = (unlimited || (Number.isInteger(next) && next >= 1)) && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSubmitting(true);
    setError("");
    try {
      await onSave(unlimited ? null : next);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update capacity.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-admin-border bg-admin-surface-alt px-3.5 py-2">
        <span className="text-admin-support text-admin-ink-muted">
          Intention slots per Mass{" "}
          <span className="font-semibold tabular-nums text-admin-ink">{capacity === null ? "No limit" : capacity}</span>
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-admin-support font-semibold text-admin-green-700 hover:underline"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-admin-green-600/40 bg-admin-surface-alt px-3.5 py-2"
    >
      <label className="flex items-center gap-2">
        <span className="whitespace-nowrap text-admin-support text-admin-ink-muted">Intention slots per Mass</span>
        <AdminInput
          type="number"
          min={1}
          value={unlimited ? "" : value}
          placeholder={unlimited ? "—" : undefined}
          onChange={(e) => setValue(e.target.value)}
          className="!w-20 !py-1"
          autoFocus
          disabled={submitting || unlimited}
          aria-label="Intention slots per Mass"
        />
      </label>
      <label className="flex cursor-pointer items-center gap-2 text-admin-support text-admin-ink">
        <input
          type="checkbox"
          checked={unlimited}
          onChange={(e) => setUnlimited(e.target.checked)}
          disabled={submitting}
          className="h-4 w-4 accent-admin-green-700"
        />
        No limit
      </label>
      <div className="flex items-center gap-2">
        <AdminButton type="submit" size="sm" disabled={!canSave}>
          {submitting ? "Saving…" : "Save"}
        </AdminButton>
        <AdminButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setEditing(false);
            setError("");
          }}
          disabled={submitting}
        >
          Cancel
        </AdminButton>
      </div>
      {error && <p className="w-full text-admin-support text-admin-red-700">{error}</p>}
    </form>
  );
}
