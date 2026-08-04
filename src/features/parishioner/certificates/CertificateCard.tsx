import { DropletIcon, DoveIcon, HeartIcon, CandleIcon } from "@/components/ui/icons/SacramentIcons";
import type { IssuedCertificate, SacramentType } from "@/types";

const sacramentLabels: Record<SacramentType, string> = {
  baptism: "Certificate of Baptism",
  confirmation: "Certificate of Confirmation",
  marriage: "Certificate of Marriage",
  death: "Certificate of Death",
};

const sacramentIcons: Record<SacramentType, typeof DropletIcon> = {
  baptism: DropletIcon,
  confirmation: DoveIcon,
  marriage: HeartIcon,
  death: CandleIcon,
};

interface CertificateCardProps {
  certificate: IssuedCertificate;
  onView: (certificate: IssuedCertificate) => void;
  onDownload: (certificate: IssuedCertificate) => void;
}

export function CertificateCard({ certificate, onView, onDownload }: CertificateCardProps) {
  const Icon = sacramentIcons[certificate.sacramentType];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-[90px] w-[100px] rounded-full bg-primary/5"
        aria-hidden="true"
      />
      <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="relative mt-3 font-serif text-[16.5px] font-bold leading-tight text-ink">
        {sacramentLabels[certificate.sacramentType]}
      </p>
      <p className="relative mt-1 text-[11.5px] text-ink-muted">
        {certificate.holderName} · Issued{" "}
        {new Date(certificate.issuedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>
      <div className="relative mt-3.5 flex gap-1.5">
        <button
          onClick={() => onView(certificate)}
          className="flex-1 rounded-lg border border-border py-2 text-xs font-bold text-ink transition-transform hover:bg-surface-alt active:scale-95"
        >
          View
        </button>
        <button
          onClick={() => onDownload(certificate)}
          className="flex-1 rounded-lg bg-primary py-2 text-xs font-bold text-white transition-transform hover:opacity-90 active:scale-95"
        >
          Download
        </button>
      </div>
    </div>
  );
}