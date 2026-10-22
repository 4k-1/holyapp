import { useRef, useState } from "react";
import {
  SuperAdminModal,
  SuperAdminToast,
  saBtnPrimary,
  saBtnSecondary,
  saInputClass,
} from "@/features/super-admin/components/SuperAdminModal";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import {
  CertificateDocument,
  CertificatePreviewStage,
} from "@/features/parish-admin/components/CertificateDocument";
import { CERT_PREVIEW_STAGE_BG, sacramentCertTitles } from "@/features/parish-admin/components/certificate/constants";
import { SAMPLE_CERTIFICATE } from "@/features/parish-admin/components/certificate/sampleCertificate";
import { printElement } from "@/features/parish-admin/requests/printUtils";
import { getCertificateAppearance } from "@/features/parish-admin/settings/api/certificateConfigApi";
import { useAsync } from "@/hooks/useAsync";
import { MOCK_PARISHES } from "@/services/mocks/parishes.mock";
import type { SacramentType } from "@/types";

interface CertTemplate {
  id: string;
  sacramentType: SacramentType;
  label: string;
  version: string;
  updated: string;
  zones: { z: string; f: string }[];
}

const COVER = [
  "linear-gradient(135deg,#1F6347,#123328)",
  "linear-gradient(135deg,#3B4E8A,#22305C)",
  "linear-gradient(135deg,#AD8A2C,#8A6B1E)",
  "linear-gradient(135deg,#5C5750,#38342F)",
];

const INITIAL: CertTemplate[] = [
  {
    id: "baptismal",
    sacramentType: "baptism",
    label: "Baptismal Certificate",
    version: "v3",
    updated: "May 12, 2026",
    zones: [
      { z: "Header", f: "Parish crest, parish name, address" },
      { z: "Body", f: "Full name, date of birth, date of baptism, place of baptism, minister, parents, godparents" },
      { z: "Footer", f: "Officiating priest signature line, book/page/entry number" },
      { z: "Corner", f: "QR code + SHA-256 verification hash" },
    ],
  },
  {
    id: "confirmation",
    sacramentType: "confirmation",
    label: "Confirmation Certificate",
    version: "v2",
    updated: "Apr 30, 2026",
    zones: [
      { z: "Header", f: "Parish crest, parish name, address" },
      { z: "Body", f: "Full name, date of birth, date of confirmation, place, minister, sponsor" },
      { z: "Footer", f: "Officiating minister signature line, book/page/entry number" },
      { z: "Corner", f: "QR code + SHA-256 verification hash" },
    ],
  },
  {
    id: "marriage",
    sacramentType: "marriage",
    label: "Marriage Certificate",
    version: "v2",
    updated: "Apr 30, 2026",
    zones: [
      { z: "Header", f: "Parish crest, parish name, address" },
      { z: "Body", f: "Bride & groom full names, dates of birth, date & place of marriage, witnesses" },
      { z: "Footer", f: "Officiating priest signature line, book/page/entry number" },
      { z: "Corner", f: "QR code + SHA-256 verification hash" },
    ],
  },
  {
    id: "death",
    sacramentType: "death",
    label: "Death Certificate",
    version: "v1",
    updated: "Jan 5, 2026",
    zones: [
      { z: "Header", f: "Parish crest, parish name, address" },
      { z: "Body", f: "Full name, date of birth, date of death, date & place of burial, parents" },
      { z: "Footer", f: "Officiating priest signature line, book/page/entry number" },
      { z: "Corner", f: "QR code + SHA-256 verification hash" },
    ],
  },
];

export function SuperAdminTemplatesPage() {
  const [templates, setTemplates] = useState(INITIAL);
  const [editing, setEditing] = useState<CertTemplate | null>(null);
  const [note, setNote] = useState("");
  const [previewing, setPreviewing] = useState<CertTemplate | null>(null);
  const [toast, setToast] = useState("");

  function saveLayout() {
    if (!editing) return;
    const major = parseInt(editing.version.replace("v", ""), 10) || 1;
    const next = { ...editing, version: `v${major + 1}`, updated: "Today" };
    setTemplates((list) => list.map((t) => (t.id === next.id ? next : t)));
    setEditing(null);
    setNote("");
    setToast(`${next.label} layout updated to ${next.version}`);
    window.setTimeout(() => setToast(""), 2600);
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-surface">
        <div className="border-b border-admin-border px-[18px] py-4">
          <h2 className="font-sans text-[14.5px] font-bold text-admin-ink">Master Templates</h2>
          <p className="mt-0.5 text-[11.5px] text-admin-ink-faint">
            One layout per sacrament, shared by every parish on the platform
          </p>
        </div>
        <div className="mx-[18px] mt-4 flex items-start gap-2.5 rounded-lg bg-admin-gold-100 px-3 py-2.5 text-[12px] leading-relaxed text-[#8a5f00]">
          <svg
            className="mt-0.5 h-[15px] w-[15px] shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          <p>
            Editing a layout here changes it for <b>every parish</b> using this certificate type. Parish Admins can
            only edit their own parish name, crest, and verification message — not layout or field positions.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3.5 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {templates.map((tpl, idx) => (
            <div key={tpl.id} className="overflow-hidden rounded-[10px] border border-admin-border bg-white">
              <div className="flex h-[86px] items-center justify-center" style={{ background: COVER[idx] }}>
                <svg
                  className="h-[26px] w-[26px] stroke-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="1.8"
                >
                  <circle cx="12" cy="9" r="6" />
                  <path d="M8 14.5 6.5 21l5.5-3 5.5 3-1.5-6.5" />
                </svg>
              </div>
              <div className="px-3.5 pb-3.5 pt-3">
                <p className="text-[13.3px] font-bold text-admin-ink">{tpl.label}</p>
                <p className="mt-[3px] text-[11.3px] leading-relaxed text-admin-ink-faint">
                  {tpl.version} · Updated {tpl.updated}
                </p>
                <div className="mt-2.5 flex gap-2">
                  <button type="button" className={`${saBtnSecondary} flex-1`} onClick={() => setPreviewing(tpl)}>
                    Preview
                  </button>
                  <button
                    type="button"
                    className={`${saBtnPrimary} flex-1`}
                    onClick={() => {
                      setEditing(tpl);
                      setNote("");
                    }}
                  >
                    Edit Layout
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing ? (
        <SuperAdminModal
          title={`Edit Layout — ${editing.label}`}
          onClose={() => setEditing(null)}
          widthClass="max-w-[520px]"
          footer={
            <>
              <button type="button" className={saBtnSecondary} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="button" className={saBtnPrimary} onClick={saveLayout}>
                Save Layout
              </button>
            </>
          }
        >
          <div className="flex items-start gap-2.5 rounded-lg bg-admin-gold-100 px-3 py-2.5 text-[12px] leading-relaxed text-[#8a5f00]">
            <svg className="mt-0.5 h-[15px] w-[15px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            <p>
              This applies to every parish using this template. Field positions are fixed to keep the PDF fill pipeline
              stable — only labels can be adjusted here.
            </p>
          </div>
          <div className="flex flex-col gap-1.5 rounded-[10px] border border-dashed border-admin-border p-2.5">
            {editing.zones.map((zone) => (
              <div key={zone.z} className="rounded-[7px] border border-admin-border bg-[#FAFAF7] px-3 py-2">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-admin-ink-faint">{zone.z}</p>
                <p className="mt-0.5 text-[12.5px] text-admin-ink">{zone.f}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="mb-[5px] text-[11.5px] font-bold text-admin-ink-muted">Internal version note</p>
            <input
              className={saInputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Adjusted footer signature line spacing"
              aria-label="Internal version note"
            />
          </div>
        </SuperAdminModal>
      ) : null}

      {previewing ? (
        <TemplatePreviewModal template={previewing} onClose={() => setPreviewing(null)} />
      ) : null}

      <SuperAdminToast message={toast} />
    </div>
  );
}

function TemplatePreviewModal({
  template,
  onClose,
}: {
  template: CertTemplate;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const parish = MOCK_PARISHES[0];
  const sample = SAMPLE_CERTIFICATE[template.sacramentType];
  const { data: appearance, loading } = useAsync(
    () => getCertificateAppearance(template.sacramentType),
    [template.sacramentType]
  );
  const title = sacramentCertTitles[template.sacramentType];

  function handlePrint() {
    if (!printRef.current) return;
    printElement(printRef.current, `${title} — ${sample.name}`);
  }

  return (
    <AdminDialog onClose={onClose} panelClassName="max-w-[720px]">
      <AdminDialogHeader
        title={title}
        subtitle={`${template.version} master layout · sample names only`}
        onClose={onClose}
      />
      <div className="overflow-hidden px-4 py-3" style={{ background: CERT_PREVIEW_STAGE_BG }}>
        {loading || !parish ? (
          <p className="py-10 text-center text-[12.5px] text-admin-ink-muted">Loading certificate…</p>
        ) : (
          <CertificatePreviewStage>
            <CertificateDocument
              ref={printRef}
              parish={parish}
              sacramentType={template.sacramentType}
              subjectName={sample.name}
              fields={sample.fields}
              appearance={appearance}
            />
          </CertificatePreviewStage>
        )}
      </div>
      <AdminDialogFooter>
        <button type="button" className={saBtnSecondary} onClick={onClose}>
          Close
        </button>
        <button type="button" className={saBtnPrimary} onClick={handlePrint} disabled={loading}>
          Print
        </button>
      </AdminDialogFooter>
    </AdminDialog>
  );
}
