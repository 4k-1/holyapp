import { useRef, useState } from "react";
import { saBtnPrimary, saBtnSecondary } from "@/features/super-admin/components/SuperAdminModal";
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
}

const COVER = [
  "linear-gradient(135deg,#16798c,#0e3b46)",
  "linear-gradient(135deg,#3B4E8A,#22305C)",
  "linear-gradient(135deg,#AD8A2C,#8A6B1E)",
  "linear-gradient(135deg,#5C5750,#38342F)",
];

const TEMPLATES: CertTemplate[] = [
  {
    id: "baptismal",
    sacramentType: "baptism",
    label: "Baptismal Certificate",
  },
  {
    id: "confirmation",
    sacramentType: "confirmation",
    label: "Confirmation Certificate",
  },
  {
    id: "marriage",
    sacramentType: "marriage",
    label: "Marriage Certificate",
  },
  {
    id: "death",
    sacramentType: "death",
    label: "Death Certificate",
  },
];

export function SuperAdminTemplatesPage() {
  const [previewing, setPreviewing] = useState<CertTemplate | null>(null);

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
        <div className="border-b border-admin-border px-[18px] py-4">
          <h2 className="font-sans text-[14.5px] font-bold text-admin-ink">Master Templates</h2>
          <p className="mt-0.5 text-[11.5px] text-admin-ink-faint">
            One layout per sacrament, shared by every parish on the platform
          </p>
        </div>
        <p className="mx-[18px] mt-4 rounded-lg bg-admin-surface-alt px-3 py-2.5 text-[12px] leading-relaxed text-admin-ink-muted">
          Every parish's certificates use these layouts. A parish's colours and crest are set under Parishes, then
          Manage, then Certificate Style. Changing the layouts themselves isn't possible here yet.
        </p>
        <div className="grid grid-cols-1 gap-3.5 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {TEMPLATES.map((tpl, idx) => (
            <div key={tpl.id} className="overflow-hidden rounded-md border border-admin-border bg-white">
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
                <div className="mt-2.5 flex gap-2">
                  <button type="button" className={`${saBtnSecondary} flex-1`} onClick={() => setPreviewing(tpl)}>
                    Preview
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {previewing ? (
        <TemplatePreviewModal template={previewing} onClose={() => setPreviewing(null)} />
      ) : null}

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
        subtitle="Sample names only"
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
              fields={{ ...sample.fields, specimen: true }}
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
