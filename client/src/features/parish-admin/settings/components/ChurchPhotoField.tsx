import { useEffect, useRef, useState } from "react";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import { churchPhotoFade } from "@/features/parish/churchPhotoFade";
import { askConfirm, notifyError } from "@/lib/notify";
import { PHOTO_MAX_BYTES, PHOTO_TYPES, removeChurchPhoto, uploadChurchPhoto } from "../api/settingsApi";
import { SettingsPanel } from "./SettingsUI";

/** The top of the parishioner dashboard, small: the teal banner with the photo faded in on the right. */
function BannerPreview({ photoUrl }: { photoUrl: string }) {
  return (
    <div className="relative isolate h-[120px] w-full max-w-[460px] overflow-hidden rounded-[14px] bg-[linear-gradient(135deg,#16798c_0%,#13697a_60%,#12606f_100%)] text-white">
      <img
        src={photoUrl}
        alt=""
        className="absolute inset-y-0 right-0 -z-10 h-full w-[50%] object-cover object-[40%_42%] opacity-45"
        style={churchPhotoFade}
      />
      <div className="flex h-full flex-col justify-center px-4">
        <p className="font-[Plus_Jakarta_Sans,ui-sans-serif,system-ui,sans-serif] text-[1.125rem] font-bold leading-tight">
          Good morning, Maria
        </p>
        <p className="mt-1 text-[0.75rem] text-white/90">What would you like to do today?</p>
      </div>
    </div>
  );
}

/**
 * The church photo at the top of the parishioner dashboard. Without an uploaded photo the dashboard keeps its
 * default: the photo bundled for the parish, or a drawing of a church.
 */
export function ChurchPhotoField({
  uploadedUrl,
  shownUrl,
  onChanged,
}: {
  /** The photo this parish uploaded, if any. */
  uploadedUrl?: string;
  /** What the dashboard shows now: the uploaded photo or the bundled one; none means the drawing. */
  shownUrl?: string;
  onChanged: (photoUrl: string | undefined, message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<{ file: File; url: string } | null>(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!chosen) return;
    return () => URL.revokeObjectURL(chosen.url);
  }, [chosen]);

  function choose(picked: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!picked) return;
    if (!PHOTO_TYPES.includes(picked.type)) {
      setProblem("Use a JPG, PNG or WebP photo.");
      return;
    }
    if (picked.size > PHOTO_MAX_BYTES) {
      setProblem("That photo is over 10 MB. Choose a smaller one.");
      return;
    }
    setProblem("");
    setChosen({ file: picked, url: URL.createObjectURL(picked) });
  }

  function close() {
    if (!busy) setChosen(null);
  }

  async function save() {
    if (!chosen) return;
    setBusy(true);
    try {
      const photoUrl = await uploadChurchPhoto(chosen.file);
      setChosen(null);
      onChanged(photoUrl, "Church photo updated. Parishioners see it on their dashboard.");
    } catch (err) {
      notifyError(err, "Couldn't save the photo.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await askConfirm({
      title: "Remove the church photo?",
      message: "The parishioner dashboard will go back to its default picture.",
      confirmLabel: "Remove photo",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await removeChurchPhoto();
      onChanged(undefined, "Church photo removed. The dashboard shows its default picture again.");
    } catch (err) {
      notifyError(err, "Couldn't remove the photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsPanel
      title="Church photo"
      description="Shown at the top of every parishioner's dashboard. A wide photo of the church front works best."
    >
      <div className="flex flex-col gap-3 pb-5 pt-3">
        {shownUrl ? (
          <BannerPreview photoUrl={shownUrl} />
        ) : (
          <p className="text-admin-support text-admin-ink-muted">
            No photo yet. The dashboard shows a drawing of a church until you upload one.
          </p>
        )}
        {shownUrl && !uploadedUrl && (
          <p className="text-admin-support text-admin-ink-muted">This is the default photo. Upload your own to replace it.</p>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <AdminButton type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            {uploadedUrl ? "Change photo" : "Upload photo"}
          </AdminButton>
          {uploadedUrl && (
            <AdminButton type="button" variant="ghost" size="sm" onClick={remove} disabled={busy}>
              Remove
            </AdminButton>
          )}
          <span className="text-admin-label text-admin-ink-faint">JPG, PNG or WebP, up to 10 MB</span>
          <input
            ref={inputRef}
            type="file"
            accept={PHOTO_TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => choose(e.target.files?.[0])}
          />
        </div>
        {problem && (
          <p role="alert" className="text-admin-support text-red-700">
            {problem}
          </p>
        )}
      </div>

      {chosen && (
        <AdminDialog onClose={close} busy={busy} panelClassName="w-full max-w-[520px]">
          <AdminDialogHeader
            title="Use this church photo?"
            subtitle="This is how it will look at the top of the parishioner dashboard."
            onClose={close}
            busy={busy}
          />
          <div className="flex justify-center px-5 py-6">
            <BannerPreview photoUrl={chosen.url} />
          </div>
          <AdminDialogFooter>
            <AdminButton type="button" variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </AdminButton>
            <AdminButton type="button" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save photo"}
            </AdminButton>
          </AdminDialogFooter>
        </AdminDialog>
      )}
    </SettingsPanel>
  );
}
