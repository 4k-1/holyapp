import { useEffect, useState, type FormEvent } from "react";
import { AdminButton, AdminInput } from "@/features/parish-admin/components/AdminForm";

interface MassCapacitySettingProps {
  capacity: number;
  onSave: (next: number) => Promise<void>;
}

/** Parish-wide intention slots per Mass — same cap on every Mass, edited inline right here. */
export function MassCapacitySetting({ capacity, onSave }: MassCapacitySettingProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(capacity));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) setValue(String(capacity));
  }, [capacity, editing]);

  const next = Number(value);
  const canSave = Number.isInteger(next) && next >= 1 && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSubmitting(true);
    setError("");
    try {
      await onSave(next);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update capacity.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 rounded-[9px] border border-admin-border bg-admin-surface-alt px-3.5 py-2">
        <span className="text-admin-support text-admin-ink-muted">
          Intention slots per Mass{" "}
          <span className="font-semibold tabular-nums text-admin-ink">{capacity}</span>
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
      className="flex flex-wrap items-start gap-2 rounded-[9px] border border-admin-green-600/40 bg-admin-surface-alt px-3.5 py-2"
    >
      <label className="flex items-center gap-2">
        <span className="whitespace-nowrap text-admin-support text-admin-ink-muted">Intention slots per Mass</span>
        <AdminInput
          type="number"
          min={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="!w-20 !py-1"
          autoFocus
          disabled={submitting}
        />
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
