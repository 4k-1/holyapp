import { useRef, useState } from "react";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import { AdminButton, AdminInput, AdminSelect, PrintIcon } from "@/features/parish-admin/components/AdminForm";
import {
  CertificateDocument,
  CertificatePreviewStage,
  type CertificateFields,
} from "@/features/parish-admin/components/CertificateDocument";
import { CERT_PREVIEW_STAGE_BG, sacramentCertTitles } from "@/features/parish-admin/components/certificate/constants";
import { printElement, waitForQrCode } from "@/features/parish-admin/requests/printUtils";
import { PrintCheck } from "@/features/parish-admin/components/certificate/PrintCheck";
import {
  getIssuedCertificate,
  REPRINT_REASONS,
  reprintCertificate,
  type ReprintReason,
} from "@/features/parish-admin/requests/api/requestsAdminApi";
import { getCertificateAppearance } from "@/features/parish-admin/settings/api/certificateConfigApi";
import { useAsync } from "@/hooks/useAsync";
import type { IssuedRecordCertificate } from "@/features/parish-admin/records/types";
import type { IssuedCertificate, Parish, SacramentType } from "@/types";
import { OTHER_PURPOSE, PURPOSES_BY_SACRAMENT, validUntilFor } from "@/lib/purposes";

interface AdminGenerateCertificateModalProps {
  parish: Parish;
  sacramentType: SacramentType;
  subjectName: string;
  fields: CertificateFields;
  issued?: IssuedRecordCertificate;
  onClose: () => void;
  /** Records a new copy for `purpose` (B2). */
  onIssue: (purpose: string) => Promise<{ certificates: IssuedRecordCertificate[] }>;
  onIssued?: (cert: IssuedRecordCertificate) => void;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AdminGenerateCertificateModal({
  parish,
  sacramentType,
  subjectName,
  fields,
  issued,
  onClose,
  onIssue,
  onIssued,
}: AdminGenerateCertificateModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: appearance, loading } = useAsync(() => getCertificateAppearance(sacramentType), [sacramentType]);
  const [issuing, setIssuing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState("");
  const [issuedCert, setIssuedCert] = useState<IssuedRecordCertificate | undefined>(issued);
  const [justIssued, setJustIssued] = useState(false);
  const [reprints, setReprints] = useState(issued?.reprints ?? 0);
  const [askingReprint, setAskingReprint] = useState(false);
  const [reason, setReason] = useState<ReprintReason | "">("");
  const [reasonNote, setReasonNote] = useState("");
  // A printed copy stays "not confirmed" until someone says it printed correctly (A3).
  const [confirmed, setConfirmed] = useState(issued?.printConfirmed !== false);
  const [justSpoiled, setJustSpoiled] = useState(false);
  // What the new copy is for (B2): a listed purpose, or "Other…" with a typed one.
  const [purposeChoice, setPurposeChoice] = useState("");
  const [purposeOther, setPurposeOther] = useState("");
  const purpose = purposeChoice === OTHER_PURPOSE ? purposeOther.trim() : purposeChoice;
  // The copy as it was issued: a reprint shows that, not the record as it is now.
  const savedId = issuedCert?.id;
  const { data: loadedCopy, loading: loadingSaved } = useAsync(
    () => (savedId ? getIssuedCertificate(savedId) : Promise.resolve(null)),
    [savedId]
  );
  // Fetched straight after issuing, so the first print already matches every later reprint.
  const [freshCopy, setFreshCopy] = useState<IssuedCertificate | null>(null);
  const saved = freshCopy && freshCopy.id === savedId ? freshCopy : loadedCopy;

  const title = sacramentCertTitles[sacramentType];
  const printable = issuedCert?.status === "Valid";
  // Anything that isn't a valid issued copy prints only as a watermarked specimen.
  const specimen = !printable;
  const busy = issuing || printing;
  // Copies issued before snapshots were kept have no saved layout; those show the record as it is.
  const base: CertificateFields = saved?.fields.printed ? { ...fields, ...saved.fields } : fields;
  const previewFields: CertificateFields = {
    ...base,
    certCode: issuedCert?.code ?? fields.certCode,
    verifyUrl: printable ? (issuedCert?.verifyUrl ?? fields.verifyUrl) : undefined,
    issuedOn: saved?.fields.issuedOn ?? issuedCert?.date ?? fields.issuedOn,
    // An issued copy shows the purpose it was issued for; a preview shows the one chosen.
    purpose: issuedCert ? saved?.fields.purpose : purpose || undefined,
    validUntil: issuedCert ? saved?.fields.validUntil : purpose ? validUntilFor(purpose, todayIso()) : undefined,
    specimen,
  };

  /** `issuedCopy`: wait for the copy's QR code (and the redraw without the watermark) before printing. */
  async function print(issuedCopy: boolean) {
    setPrinting(true);
    try {
      if (issuedCopy) await waitForQrCode(() => printRef.current);
      if (printRef.current) printElement(printRef.current, `${title} — ${subjectName}`);
    } finally {
      setPrinting(false);
    }
  }

  /** Records the copy on the server first; only a recorded copy (with its code and QR) is printed. */
  async function handleIssueAndPrint() {
    if (!purpose) {
      setError(purposeChoice === OTHER_PURPOSE ? "Type what the certificate is for." : "Choose what the certificate is for.");
      return;
    }
    setIssuing(true);
    setError("");
    let newest: IssuedRecordCertificate | undefined;
    try {
      const next = await onIssue(purpose);
      newest = next.certificates.find((c) => c.status === "Valid") ?? next.certificates.at(-1);
      const copyId = newest?.id;
      if (copyId) setFreshCopy(await getIssuedCertificate(copyId).catch(() => null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't issue this copy. Nothing was printed.");
    } finally {
      setIssuing(false);
    }
    if (!newest) return;
    setIssuedCert(newest);
    setJustIssued(true);
    setJustSpoiled(false);
    setConfirmed(newest.printConfirmed !== false);
    onIssued?.(newest);
    if (newest.status === "Valid") await print(true);
  }

  /** Logs who reprinted the copy and why, then prints the same copy again. */
  async function handleReprint() {
    if (!issuedCert?.id) return;
    if (!reason) {
      setError("Choose why this copy is being reprinted.");
      return;
    }
    if (reason === "other" && !reasonNote.trim()) {
      setError("Say why this copy is being reprinted.");
      return;
    }
    setError("");
    setPrinting(true);
    try {
      const result = await reprintCertificate(issuedCert.id, reason, reasonNote.trim() || undefined);
      setReprints(result.reprints);
      setAskingReprint(false);
      setReason("");
      setReasonNote("");
      setConfirmed(false);
      onIssued?.({ ...issuedCert, reprints: result.reprints, printConfirmed: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record the reprint. Nothing was printed.");
      setPrinting(false);
      return;
    }
    await print(true);
  }

  const checking = printable && !confirmed && !askingReprint && Boolean(issuedCert?.id) && !busy;

  function startReprint() {
    setError("");
    setAskingReprint(true);
  }

  /** After a spoiled copy: back to the preview, ready to issue a good copy with a new number. */
  function issueAnother() {
    setIssuedCert(undefined);
    setFreshCopy(null);
    setJustIssued(false);
    setJustSpoiled(false);
    setReprints(0);
    setConfirmed(true);
    setPurposeChoice("");
    setPurposeOther("");
  }

  const subtitle = issuedCert
    ? `${subjectName} · ${issuedCert.code}${printable ? "" : ` · ${issuedCert.status}`}`
    : `${subjectName} · Preview — not yet issued`;

  const note = !issuedCert
    ? "Choose what it's for, then Issue & print records this copy with its code and QR and prints it. A preview prints marked SPECIMEN – NOT VALID."
    : justSpoiled
      ? `${issuedCert.code} is void. Its number stays used. Issue a new copy to give the parishioner a good certificate.`
      : !printable
      ? `This copy is ${issuedCert.status.toLowerCase()} and can't be printed. Issue a new copy from the record instead.`
      : checking
        ? "Check the paper before handing it over. If nobody answers, this copy stays on the dashboard as not confirmed."
      : askingReprint
        ? "Why is this copy being reprinted? It keeps the same number and isn't counted as a new copy."
        : justIssued && reprints === 0
          ? `Issued as ${issuedCert.code}. If the printout failed, use Reprint: it prints this same copy and isn't counted again.`
          : `Reprint prints this copy as it was issued, with the same number. It isn't counted as a new copy.${
              reprints > 0 ? ` Reprinted ${reprints}×.` : ""
            }`;

  return (
    <AdminDialog onClose={onClose} busy={busy} panelClassName="max-w-[720px]">
      <AdminDialogHeader title={title} subtitle={subtitle} onClose={onClose} busy={busy} />

      <div className="overflow-hidden px-4 py-3" style={{ background: CERT_PREVIEW_STAGE_BG }}>
        {loading ? (
          <p className="text-admin-body text-admin-ink-muted">Loading certificate template…</p>
        ) : (
          <CertificatePreviewStage>
            <CertificateDocument
              ref={printRef}
              parish={parish}
              sacramentType={sacramentType}
              subjectName={subjectName}
              fields={previewFields}
              appearance={appearance}
            />
          </CertificatePreviewStage>
        )}
      </div>

      <AdminDialogFooter className="flex-wrap">
        {checking && issuedCert?.id && (
          <PrintCheck
            certificateId={issuedCert.id}
            code={issuedCert.code}
            onReprint={startReprint}
            onConfirmed={() => {
              setConfirmed(true);
              onIssued?.({ ...issuedCert, printConfirmed: true });
            }}
            onSpoiled={() => {
              const spoiled = { ...issuedCert, status: "Spoiled" as const };
              setIssuedCert(spoiled);
              setJustSpoiled(true);
              onIssued?.(spoiled);
            }}
          />
        )}
        <p className={`w-full text-admin-support ${error ? "font-semibold text-red-700" : "text-admin-ink-muted"}`}>
          {error || note}
        </p>
        <AdminButton
          variant="secondary"
          onClick={askingReprint ? () => setAskingReprint(false) : onClose}
          disabled={busy}
        >
          {askingReprint ? "Back" : "Close"}
        </AdminButton>
        {!issuedCert && (
          <>
            <AdminSelect
              value={purposeChoice}
              onChange={(e) => {
                setPurposeChoice(e.target.value);
                setError("");
              }}
              className="w-auto min-w-[190px]"
              aria-label="What the certificate is for"
              disabled={busy}
            >
              <option value="" disabled>
                What is it for?
              </option>
              {PURPOSES_BY_SACRAMENT[sacramentType].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value={OTHER_PURPOSE}>Other…</option>
            </AdminSelect>
            {purposeChoice === OTHER_PURPOSE && (
              <AdminInput
                value={purposeOther}
                onChange={(e) => setPurposeOther(e.target.value)}
                placeholder="e.g. Scholarship"
                className="w-auto min-w-[170px]"
                aria-label="Other purpose"
                maxLength={120}
                autoFocus
              />
            )}
            <AdminButton variant="secondary" onClick={() => print(false)} disabled={loading || busy}>
              <PrintIcon />
              Print preview
            </AdminButton>
            <AdminButton onClick={handleIssueAndPrint} disabled={loading || busy}>
              <PrintIcon />
              {issuing ? "Issuing…" : "Issue & print"}
            </AdminButton>
          </>
        )}
        {justSpoiled && (
          <AdminButton onClick={issueAnother} disabled={busy}>
            Issue a new copy
          </AdminButton>
        )}
        {printable && !askingReprint && !checking && (
          <AdminButton onClick={startReprint} disabled={loading || loadingSaved || busy}>
            <PrintIcon />
            Reprint
          </AdminButton>
        )}
        {printable && askingReprint && (
          <>
            <AdminSelect
              value={reason}
              onChange={(e) => setReason(e.target.value as ReprintReason)}
              className="w-auto min-w-[200px]"
              aria-label="Reason for reprinting"
              autoFocus
            >
              <option value="" disabled>
                Reason for reprinting…
              </option>
              {REPRINT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </AdminSelect>
            {reason === "other" && (
              <AdminInput
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                placeholder="What happened?"
                className="w-auto min-w-[200px]"
                aria-label="What happened"
              />
            )}
            <AdminButton onClick={handleReprint} disabled={busy}>
              <PrintIcon />
              {printing ? "Preparing…" : "Log & reprint"}
            </AdminButton>
          </>
        )}
      </AdminDialogFooter>
    </AdminDialog>
  );
}
