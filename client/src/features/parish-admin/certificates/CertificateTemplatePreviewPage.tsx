import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { PrintSheet } from "@/components/print/PrintSheet";
import { ParishCertificate } from "@/features/parish-admin/components/certificate/ParishCertificate";
import { CERTIFICATE_SAMPLES } from "@/features/parish-admin/components/certificate/certificateMocks";
import {
  CERTIFICATE_PAPER,
  type CertificateData,
  type CertificateParish,
  type CertificateSignatory,
  type CertificateType,
} from "@/features/parish-admin/components/certificate/certificateData";
import { getParishBySlug } from "@/features/parish/parishApi";
import { getCertificateAppearance } from "@/features/parish-admin/settings/api/certificateConfigApi";
import type { SacramentType } from "@/types";

const TYPES: { type: CertificateType; label: string; sacrament: SacramentType }[] = [
  { type: "BAPTISM", label: "Birth & Baptism (A5)", sacrament: "baptism" },
  { type: "CONFIRMATION", label: "Confirmation (Letter)", sacrament: "confirmation" },
  { type: "DEATH", label: "Death (Letter)", sacrament: "death" },
  { type: "MARRIAGE", label: "Marriage (Form 97, 8.5 × 13 in)", sacrament: "marriage" },
];

const PAPER_LABEL = {
  A5: "A5 · 148 × 210 mm",
  LETTER: "Letter · 8.5 × 11 in",
  LONG: "Municipal Form No. 97 · two pages of 8.5 × 13 in",
} as const;

/**
 * Previews the printed certificate templates with dummy record data. The parish header
 * and signatory come from this parish's settings. Print sends only the sheet, on its own
 * paper size.
 */
export function CertificateTemplatePreviewPage() {
  const { parishSlug = "" } = useParams();
  const [type, setType] = useState<CertificateType>("BAPTISM");
  const [sampleId, setSampleId] = useState("typical");
  const [previewMode, setPreviewMode] = useState(false);
  const [parish, setParish] = useState<CertificateParish | null>(null);
  const [signatories, setSignatories] = useState<Partial<Record<CertificateType, CertificateSignatory>>>({});

  useEffect(() => {
    let cancelled = false;
    getParishBySlug(parishSlug)
      .then((p) => {
        if (!cancelled && p) setParish({ name: p.name, address: p.address, logoUrl: p.sealUrl });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [parishSlug]);

  useEffect(() => {
    let cancelled = false;
    for (const t of TYPES) {
      getCertificateAppearance(t.sacrament)
        .then((a) => {
          if (cancelled) return;
          setSignatories((prev) => ({ ...prev, [t.type]: { name: a.signatoryName, title: a.signatoryTitle } }));
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const samples = CERTIFICATE_SAMPLES[type];
  const sample = samples.find((s) => s.id === sampleId) ?? samples[0];

  const data = useMemo<CertificateData | null>(() => {
    if (!parish) return null;
    return {
      ...sample.data,
      parish,
      signatory: signatories[type] ?? {},
      verification: previewMode ? undefined : sample.data.verification,
    } as CertificateData;
  }, [parish, sample, signatories, type, previewMode]);

  const appUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-[#e4e8ea] text-[#15323a]">
      <div className="sticky top-0 z-10 border-b border-black/10 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2">
          <Link to={`/${parishSlug}/admin`} className="text-sm font-medium text-[#16798c] hover:underline">
            ← Admin
          </Link>
          <h1 className="text-base font-semibold">Certificate templates</h1>
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Certificate type">
            {TYPES.map((t) => (
              <TabButton
                key={t.type}
                active={t.type === type}
                onClick={() => {
                  setType(t.type);
                  setSampleId("typical");
                }}
              >
                {t.label}
              </TabButton>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            Sample
            <select
              value={sample.id}
              onChange={(e) => setSampleId(e.target.value)}
              className="rounded-md border border-black/15 bg-white px-2 py-1 text-sm"
            >
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={previewMode} onChange={(e) => setPreviewMode(e.target.checked)} />
            Preview mode (QR placeholder)
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!data}
            className="ml-auto rounded-lg bg-[#16798c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#11616f] disabled:opacity-50"
          >
            Print
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <p className="mb-3 text-center text-xs text-[#55707a]">
          {PAPER_LABEL[CERTIFICATE_PAPER[type]]} · dummy record data
        </p>
        {data ? (
          <>
            <FitToWidth>
              <ParishCertificate data={data} appUrl={appUrl} />
            </FitToWidth>
            <PrintSheet>
              <ParishCertificate data={data} appUrl={appUrl} />
            </PrintSheet>
          </>
        ) : (
          <p className="text-center text-sm text-[#55707a]">Loading parish settings…</p>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
        active ? "bg-[#0e3b46] text-white" : "bg-[#e8f5f5] text-[#0e3b46] hover:bg-[#cfeaea]"
      }`}
    >
      {children}
    </button>
  );
}

/** Shows the sheet at real size, scaled down only when the window is narrower than the paper. */
function FitToWidth({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 1, width: 0, height: 0 });

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      const width = inner.offsetWidth;
      const height = inner.offsetHeight;
      const scale = Math.min(1, outer.clientWidth / Math.max(1, width));
      setBox((prev) =>
        prev.scale === scale && prev.width === width && prev.height === height ? prev : { scale, width, height }
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="flex w-full justify-center">
      <div
        className="shadow-[0_10px_28px_-8px_rgba(14,59,70,0.35)]"
        style={{ width: box.width * box.scale || undefined, height: box.height * box.scale || undefined }}
      >
        <div ref={innerRef} style={{ width: "max-content", transform: `scale(${box.scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
