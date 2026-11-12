import { useEffect, useState } from "react";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";
import { CONFIRM_EVENT, type ConfirmRequest } from "@/lib/notify";

/** Shows askConfirm() questions one at a time, in the same dialog as the rest of the app. */
export function ConfirmHost() {
  const [queue, setQueue] = useState<ConfirmRequest[]>([]);
  const current = queue[0];

  useEffect(() => {
    function onConfirm(event: Event) {
      const request = (event as CustomEvent<ConfirmRequest>).detail;
      setQueue((q) => [...q, request]);
    }
    window.addEventListener(CONFIRM_EVENT, onConfirm);
    return () => window.removeEventListener(CONFIRM_EVENT, onConfirm);
  }, []);

  if (!current) return null;

  function answer(ok: boolean) {
    current.resolve(ok);
    setQueue((q) => q.slice(1));
  }

  return (
    <AdminModalFrame
      key={queue.length}
      onClose={() => answer(false)}
      role="alertdialog"
      align="center"
      layer="z-[150]"
      panelClassName="max-w-[420px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
    >
      <div className="px-6 py-5">
        <h3 className="font-serif text-admin-section font-semibold text-admin-ink">{current.title}</h3>
        {current.message && <p className="mt-2 text-admin-body text-admin-ink-muted">{current.message}</p>}
      </div>
      <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
        <AdminButton variant="secondary" onClick={() => answer(false)}>
          Cancel
        </AdminButton>
        <AdminButton variant={current.danger ? "danger" : "primary"} onClick={() => answer(true)}>
          {current.confirmLabel ?? "Confirm"}
        </AdminButton>
      </div>
    </AdminModalFrame>
  );
}
