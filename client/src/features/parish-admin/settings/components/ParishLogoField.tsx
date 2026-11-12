import { useEffect, useRef, useState } from "react";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import { askConfirm, notifyError } from "@/lib/notify";
import { LOGO_MAX_BYTES, LOGO_TYPES, removeParishLogo, uploadParishLogo } from "../api/settingsApi";

/**
 * Change or remove the parish logo. It is the parish's picture everywhere HolyApp shows the parish, so the
 * new one is previewed at the sizes people will see before it is saved.
 */
export function ParishLogoField({
  logoUrl,
  uploaded,
  parishName,
  onChanged,
}: {
  /** What shows now: the uploaded logo, or the one bundled for this parish. */
  logoUrl?: string;
  /** Whether the parish has uploaded its own logo, which can then be removed. */
  uploaded: boolean;
  parishName: string;
  onChanged: (sealUrl: string | undefined, message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  /** The chosen image and a local address for previewing it. */
  const [chosen, setChosen] = useState<{ file: File; url: string } | null>(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  // Let go of the preview's local address when it is replaced or closed.
  useEffect(() => {
    if (!chosen) return;
    return () => URL.revokeObjectURL(chosen.url);
  }, [chosen]);

  function choose(picked: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!picked) return;
    if (!LOGO_TYPES.includes(picked.type)) {
      setProblem("Use a PNG, JPG or WebP image.");
      return;
    }
    if (picked.size > LOGO_MAX_BYTES) {
      setProblem("That image is over 5 MB. Choose a smaller one.");
      return;
    }
    setProblem("");
    setChosen({ file: picked, url: URL.createObjectURL(picked) });
  }

  function close() {
    if (busy) return;
    setChosen(null);
  }

  async function save() {
    if (!chosen) return;
    setBusy(true);
    try {
      const sealUrl = await uploadParishLogo(chosen.file);
      setChosen(null);
      onChanged(sealUrl, "Logo updated. It now shows everywhere HolyApp shows your parish.");
    } catch (err) {
      notifyError(err, "Couldn't save the logo.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await askConfirm({
      title: "Remove the logo?",
      message: "It will be taken off the portal, the sign-in page, receipts and certificates printed from now on.",
      confirmLabel: "Remove logo",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await removeParishLogo();
      onChanged(undefined, "Logo removed.");
    } catch (err) {
      notifyError(err, "Couldn't remove the logo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-admin-border pt-4">
      <p className="text-admin-body font-semibold text-admin-ink">
        {logoUrl ? "Your parish logo" : "Upload your parish logo"}
      </p>
      <p className="mt-0.5 max-w-[560px] text-admin-support leading-relaxed text-admin-ink-muted">
        It's shown everywhere HolyApp shows your parish: the portal, the sign-in page, certificates, the certificate
        check page and receipts. Changing it updates all of them. Use a PNG, JPG or WebP up to 5 MB; a square
        image with a see-through background looks best.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <AdminButton type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          {logoUrl ? "Change logo" : "Upload logo"}
        </AdminButton>
        {uploaded && (
          <AdminButton type="button" variant="ghost" size="sm" onClick={remove} disabled={busy}>
            Remove
          </AdminButton>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={LOGO_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => choose(e.target.files?.[0])}
        />
      </div>
      {problem && (
        <p role="alert" className="mt-2 text-admin-support text-red-700">
          {problem}
        </p>
      )}

      {chosen && (
        <AdminDialog onClose={close} busy={busy} panelClassName="w-full max-w-[460px]">
          <AdminDialogHeader
            title="Use this as your logo?"
            subtitle="This is how it will look across HolyApp."
            onClose={close}
            busy={busy}
          />
          <div className="flex flex-col items-center gap-5 px-5 py-6">
            <img
              src={chosen.url}
              alt="The new logo"
              className="h-40 w-40 rounded-full border border-admin-border bg-white object-contain p-2"
            />
            <div className="flex items-center gap-2.5 rounded-lg border border-admin-border bg-admin-surface px-3 py-2">
              <img src={chosen.url} alt="" className="h-[34px] w-[34px] rounded-full object-contain" />
              <div className="leading-tight">
                <p className="text-admin-support font-semibold text-admin-ink">Parish Admin Portal</p>
                <p className="max-w-[260px] truncate text-admin-label text-admin-ink-muted">{parishName}</p>
              </div>
            </div>
            <p className="text-admin-label text-admin-ink-faint">As it appears in the top bar</p>
          </div>
          <AdminDialogFooter>
            <AdminButton type="button" variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </AdminButton>
            <AdminButton type="button" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save logo"}
            </AdminButton>
          </AdminDialogFooter>
        </AdminDialog>
      )}
    </div>
  );
}
