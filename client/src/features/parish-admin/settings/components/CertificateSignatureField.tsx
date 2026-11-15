import { useRef, useState } from "react";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { askConfirm, notifyError } from "@/lib/notify";
import type { SacramentType } from "@/types";
import {
  SIGNED_CERTIFICATES,
  SIGNATURE_MAX_BYTES,
  SIGNATURE_TYPES,
  removeCertificateSignature,
  uploadCertificateSignature,
} from "../api/certificateConfigApi";
import type { CertificateConfigBySacrament } from "../types";

const LABEL: Record<SacramentType, string> = {
  baptism: "baptism",
  confirmation: "confirmation",
  marriage: "marriage",
  death: "death",
};

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The signatory's signature for one certificate type. A photo of it on paper is uploaded straight away; HolyApp
 * makes the paper see-through, and the preview beside it shows it on the line. It can go on every certificate
 * the same person signs in one step.
 */
export function CertificateSignatureField({
  type,
  saved,
  draftName,
  onChanged,
}: {
  type: SacramentType;
  /** The saved settings: whose signature this is, and which other certificates they sign. */
  saved: CertificateConfigBySacrament;
  /** The name being typed now, to warn that saving a different name takes the signature off. */
  draftName: string;
  onChanged: (config: CertificateConfigBySacrament, message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const signer = saved[type].signatoryName;
  const sameSigner = SIGNED_CERTIFICATES.filter((t) => sameName(saved[t].signatoryName, signer));
  const [everywhere, setEverywhere] = useState(true);
  const image = saved[type].signatureImage;
  const nameChanged = !sameName(draftName, signer);

  const targets = (): SacramentType[] => (everywhere ? sameSigner : [type]);

  async function upload(picked: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!picked) return;
    if (!SIGNATURE_TYPES.includes(picked.type)) {
      setProblem("Use a PNG, JPG or WebP image.");
      return;
    }
    if (picked.size > SIGNATURE_MAX_BYTES) {
      setProblem("That image is over 8 MB. Choose a smaller one.");
      return;
    }
    setProblem("");
    setBusy(true);
    try {
      const types = targets();
      const config = await uploadCertificateSignature(types, picked);
      onChanged(
        config,
        types.length > 1 ? `Signature saved on the ${types.map((t) => LABEL[t]).join(", ")} certificates.` : "Signature saved."
      );
    } catch (err) {
      setProblem(err instanceof Error && err.message ? err.message : "Couldn't save the signature.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const types = targets();
    const ok = await askConfirm({
      title: "Remove the signature?",
      message:
        types.length > 1
          ? `It will be taken off the ${types.map((t) => LABEL[t]).join(", ")} certificates. They print with a blank line for signing by hand.`
          : "This certificate will print with a blank line for signing by hand.",
      confirmLabel: "Remove signature",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      onChanged(await removeCertificateSignature(types), "Signature removed.");
    } catch (err) {
      notifyError(err, "Couldn't remove the signature.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4">
      <p className="mb-1.5 text-admin-label font-semibold text-admin-ink">Signature</p>
      <div className="flex min-h-[64px] items-end justify-center rounded-md border border-admin-border bg-white px-3 pb-2 pt-3">
        {image ? (
          <img src={image} alt={`${signer}'s signature`} className="max-h-14 max-w-full object-contain" />
        ) : (
          <p className="self-center text-admin-support text-admin-ink-faint">None. The line is left blank for signing by hand.</p>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <AdminButton type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={busy || nameChanged}>
          {busy ? "Saving…" : image ? "Replace" : "Upload signature"}
        </AdminButton>
        {image && (
          <AdminButton type="button" variant="ghost" size="sm" onClick={remove} disabled={busy}>
            Remove
          </AdminButton>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={SIGNATURE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </div>

      {sameSigner.length > 1 && (
        <label className="mt-2.5 flex items-start gap-2 text-admin-support text-admin-ink-muted">
          <input
            type="checkbox"
            checked={everywhere}
            onChange={(e) => setEverywhere(e.target.checked)}
            className="mt-0.5 accent-admin-green-700"
          />
          <span>
            Also on the {sameSigner.filter((t) => t !== type).map((t) => LABEL[t]).join(" and ")}{" "}
            {sameSigner.length > 2 ? "certificates" : "certificate"}, which {signer} also signs
          </span>
        </label>
      )}

      {problem ? (
        <p role="alert" className="mt-1.5 text-admin-support text-admin-red-700">
          {problem}
        </p>
      ) : nameChanged ? (
        <p className="mt-1.5 text-admin-support text-admin-gold-700">
          {image
            ? "Saving a different signatory takes this signature off. Save first, then upload the new signatory's."
            : "Save the new signatory first, then upload their signature."}
        </p>
      ) : (
        <p className="mt-1.5 text-admin-label text-admin-ink-faint">
          Have {signer || "the signatory"} sign on plain white paper and take a close, straight-on photo. HolyApp
          removes the paper so only the ink prints.
        </p>
      )}
    </div>
  );
}
