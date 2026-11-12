import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { saBtnPrimary, saBtnSecondary } from "@/features/super-admin/components/SuperAdminModal";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import {
  CertificateDocument,
  CertificatePreviewStage,
} from "@/features/parish-admin/components/CertificateDocument";
import { CERTIFICATE_TITLES } from "@/features/parish-admin/components/certificate/certificateData";
import { CERT_PREVIEW_STAGE_BG, CERT_SHEET_WIDTH } from "@/features/parish-admin/components/certificate/constants";
import { SAMPLE_CERTIFICATE } from "@/features/parish-admin/components/certificate/sampleCertificate";
import type { CertificateAppearance } from "@/features/parish-admin/settings/types";
import { printElement } from "@/features/parish-admin/requests/printUtils";
import type { Parish, SacramentType } from "@/types";

interface CertTemplate {
  sacramentType: SacramentType;
  title: string;
  usedFor: string;
  paper: string;
}

const TEMPLATES: CertTemplate[] = [
  {
    sacramentType: "baptism",
    title: CERTIFICATE_TITLES.BAPTISM,
    usedFor: "Asked for at school enrolment, for DFA passports and before a wedding.",
    paper: "A5 · 148 × 210 mm",
  },
  {
    sacramentType: "confirmation",
    title: CERTIFICATE_TITLES.CONFIRMATION,
    usedFor: "Asked for before a wedding and before being a godparent.",
    paper: "Letter · 8.5 × 11 in",
  },
  {
    sacramentType: "marriage",
    title: CERTIFICATE_TITLES.MARRIAGE,
    usedFor: "Follows the government's Municipal Form No. 97.",
    paper: "Two pages of 8.5 × 13 in",
  },
  {
    sacramentType: "death",
    title: CERTIFICATE_TITLES.DEATH,
    usedFor: "For families settling burial, estate and insurance papers.",
    paper: "Letter · 8.5 × 11 in",
  },
];

/** A plain cross on a teal disc, standing in for a parish crest. */
const SAMPLE_CREST = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#16798c"/><path d="M29 14h6v12h12v6H35v18h-6V32H17v-6h12z" fill="#fff"/></svg>'
)}`;

/** Made up, so the shared layout isn't mistaken for one parish's certificate. */
const SAMPLE_PARISH: Parish = {
  id: "sample",
  slug: "sample",
  name: "Sample Parish of San Isidro Labrador",
  address: "Sample Town, Philippines",
  contact: "",
  email: "",
  sealUrl: SAMPLE_CREST,
  createdAt: "",
  updatedAt: "",
};

const SAMPLE_PREFIX: Record<SacramentType, string> = {
  baptism: "BAP",
  confirmation: "CON",
  marriage: "MAR",
  death: "DTH",
};

function sampleAppearance(sacramentType: SacramentType): CertificateAppearance {
  return {
    signatoryName: "Rev. Fr. Juan Dela Cruz",
    signatoryTitle: "Parish Priest",
    numberingPrefix: SAMPLE_PREFIX[sacramentType],
    footerText: "",
  };
}

const EACH_PARISH_SETS = [
  "Parish name and address",
  "Parish crest",
  "Who signs each certificate, and their title",
  "The certificate number prefix, e.g. BAP-2026-000143",
];

export function SuperAdminTemplatesPage() {
  const [previewing, setPreviewing] = useState<CertTemplate | null>(null);

  return (
    <div className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
      <div className="border-b border-admin-border px-[18px] py-4">
        <h2 className="font-sans text-[16px] font-bold text-admin-ink">Master Templates</h2>
        <p className="mt-0.5 text-[13px] text-admin-ink-faint">
          One layout per sacrament, shared by every parish on the platform
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 p-4 sm:grid-cols-2 xl:grid-cols-4">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.sacramentType}
            type="button"
            onClick={() => setPreviewing(tpl)}
            className="group overflow-hidden rounded-md border border-admin-border bg-white text-left hover:border-admin-green-600"
          >
            <Thumbnail>
              <SampleCertificate sacramentType={tpl.sacramentType} />
            </Thumbnail>
            <div className="border-t border-admin-border px-3.5 pb-3.5 pt-3">
              <p className="text-[14px] font-bold text-admin-ink">{tpl.title}</p>
              <p className="mt-1 text-[13px] leading-snug text-admin-ink-muted">{tpl.usedFor}</p>
              <p className="mt-1.5 text-[12.5px] text-admin-ink-faint">{tpl.paper}</p>
              <p className="mt-2.5 text-[13px] font-semibold text-admin-green-700 group-hover:underline">
                Open sample
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="mx-4 mb-4 rounded-lg bg-admin-surface-alt px-4 py-3.5">
        <h3 className="text-[14px] font-bold text-admin-ink">Each parish sets</h3>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13px] leading-relaxed text-admin-ink-muted">
          {EACH_PARISH_SETS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-2 text-[13px] leading-relaxed text-admin-ink-muted">
          Parish admins change these in their own Settings. Everything else is the same for every parish, and
          changing the layouts themselves isn't possible here yet.
        </p>
      </div>

      {previewing ? <TemplatePreviewModal template={previewing} onClose={() => setPreviewing(null)} /> : null}
    </div>
  );
}

function SampleCertificate({ sacramentType }: { sacramentType: SacramentType }) {
  const sample = SAMPLE_CERTIFICATE[sacramentType];
  return (
    <CertificateDocument
      parish={SAMPLE_PARISH}
      sacramentType={sacramentType}
      subjectName={sample.name}
      fields={{ ...sample.fields, specimen: true }}
      appearance={sampleAppearance(sacramentType)}
    />
  );
}

/** A small, top-cropped picture of the certificate, scaled to the card's width. */
function Thumbnail({ children }: { children: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 0.4, width: CERT_SHEET_WIDTH });

  // Sheets differ in width (A5, Letter, the two-page Form 97), so each is measured rather than assumed.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const page = sheetRef.current?.firstElementChild;
    if (!box || !(page instanceof HTMLElement)) return;
    const update = () => {
      const width = Math.max(page.offsetWidth, 100);
      const scale = Math.max(0.1, (box.clientWidth - 24) / width);
      setFit((prev) => (prev.width === width && Math.abs(prev.scale - scale) < 0.002 ? prev : { scale, width }));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(box);
    observer.observe(page);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={boxRef}
      className="relative h-[190px] overflow-hidden px-3 pt-3"
      style={{ background: CERT_PREVIEW_STAGE_BG }}
      aria-hidden
      inert
    >
      <div
        className="shadow-[0_4px_14px_-6px_rgba(40,36,20,0.4)]"
        ref={sheetRef}
        style={{ width: fit.width, transform: `scale(${fit.scale})`, transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  );
}

function TemplatePreviewModal({ template, onClose }: { template: CertTemplate; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const sample = SAMPLE_CERTIFICATE[template.sacramentType];

  function handlePrint() {
    if (!printRef.current) return;
    printElement(printRef.current, `${template.title} — ${sample.name}`);
  }

  return (
    <AdminDialog onClose={onClose} panelClassName="max-w-[720px]">
      <AdminDialogHeader title={template.title} subtitle="Sample parish and names only" onClose={onClose} />
      <div className="overflow-hidden px-4 py-3" style={{ background: CERT_PREVIEW_STAGE_BG }}>
        <CertificatePreviewStage>
          <CertificateDocument
            ref={printRef}
            parish={SAMPLE_PARISH}
            sacramentType={template.sacramentType}
            subjectName={sample.name}
            fields={{ ...sample.fields, specimen: true }}
            appearance={sampleAppearance(template.sacramentType)}
          />
        </CertificatePreviewStage>
      </div>
      <AdminDialogFooter className="flex-wrap items-center">
        <p className="mr-auto text-[13px] text-admin-ink-faint">The QR code is added when a certificate is issued.</p>
        <button type="button" className={saBtnSecondary} onClick={onClose}>
          Close
        </button>
        <button type="button" className={saBtnPrimary} onClick={handlePrint}>
          Print
        </button>
      </AdminDialogFooter>
    </AdminDialog>
  );
}
