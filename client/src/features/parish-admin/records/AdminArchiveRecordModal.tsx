import { useState } from "react";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";

interface AdminArchiveRecordModalProps {
  recordName: string;
  registerLabel: string;
  intent?: "archive" | "restore";
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function AdminArchiveRecordModal({
  recordName,
  registerLabel,
  intent = "archive",
  onClose,
  onConfirm,
}: AdminArchiveRecordModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const restoring = intent === "restore";

  async function handleConfirm() {
    setSaving(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : restoring
            ? "Could not restore this record."
            : "Could not archive this record."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog onClose={onClose} busy={saving} panelClassName="max-w-[440px]">
      <AdminDialogHeader
        title={restoring ? "Restore this record?" : "Archive this record?"}
        onClose={onClose}
        busy={saving}
      />
      <div className="px-5 py-4">
        {restoring ? (
          <>
            <p className="text-admin-body text-admin-ink">
              Restore <span className="font-semibold">{recordName}</span> to the active {registerLabel}{" "}
              register?
            </p>
            <p className="mt-2 text-admin-support text-admin-ink-muted">
              It will show in the main records list again. Certificates already issued are unchanged.
            </p>
          </>
        ) : (
          <>
            <p className="text-admin-body text-admin-ink">
              Archive <span className="font-semibold">{recordName}</span>? This {registerLabel} stays in
              the parish register, but it will be hidden from the main records list.
            </p>
            <p className="mt-2 text-admin-support text-admin-ink-muted">
              Nothing is deleted. You can restore it later from Archived. Certificates already issued
              stay valid unless they are revoked separately.
            </p>
          </>
        )}
        {error ? <p className="mt-3 text-admin-support font-semibold text-red-700">{error}</p> : null}
      </div>
      <AdminDialogFooter>
        <AdminButton variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </AdminButton>
        <AdminButton variant={restoring ? "primary" : "danger"} onClick={handleConfirm} disabled={saving}>
          {saving
            ? restoring
              ? "Restoring…"
              : "Archiving…"
            : restoring
              ? "Restore record"
              : "Archive record"}
        </AdminButton>
      </AdminDialogFooter>
    </AdminDialog>
  );
}
