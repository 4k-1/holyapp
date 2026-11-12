import { useEffect, useId, useState } from "react";
import { AdminButton, AdminTextarea } from "@/features/parish-admin/components/AdminForm";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";
import { CONFIRM_EVENT, type ConfirmRequest } from "@/lib/notify";

/** Shows askConfirm() and askText() questions one at a time, in the same dialog as the rest of the app. */
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

  function answer(ok: boolean, text?: string) {
    current.resolve(ok, text);
    setQueue((q) => q.slice(1));
  }

  return <ConfirmDialog key={queue.length} request={current} onAnswer={answer} />;
}

function ConfirmDialog({ request, onAnswer }: { request: ConfirmRequest; onAnswer: (ok: boolean, text?: string) => void }) {
  const [text, setText] = useState("");
  const inputId = useId();
  const needsText = Boolean(request.input);
  const canConfirm = !needsText || text.trim() !== "";

  return (
    <AdminModalFrame
      onClose={() => onAnswer(false)}
      role="alertdialog"
      align="center"
      layer="z-[150]"
      panelClassName="max-w-[420px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canConfirm) onAnswer(true, text);
        }}
      >
        <div className="px-6 py-5">
          <h3 className="font-serif text-admin-section font-semibold text-admin-ink">{request.title}</h3>
          {request.message && <p className="mt-2 text-admin-body text-admin-ink-muted">{request.message}</p>}
          {request.input && (
            <div className="mt-4">
              <label htmlFor={inputId} className="mb-1.5 block text-admin-body font-semibold text-admin-ink">
                {request.input.label}
              </label>
              <AdminTextarea
                id={inputId}
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={request.input.placeholder}
                className="min-h-[88px]"
                onKeyDown={(e) => {
                  // Enter confirms; Shift+Enter adds a new line.
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (canConfirm) onAnswer(true, text);
                  }
                }}
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          <AdminButton type="button" variant="secondary" onClick={() => onAnswer(false)}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" variant={request.danger ? "danger" : "primary"} disabled={!canConfirm}>
            {request.confirmLabel ?? "Confirm"}
          </AdminButton>
        </div>
      </form>
    </AdminModalFrame>
  );
}
