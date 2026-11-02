import { DropletIcon, DoveIcon, HeartIcon, CandleIcon } from "@/components/ui/icons/SacramentIcons";
import type { IssuedCertificate, SacramentType } from "@/types";
import { Button } from "@/components/ui/Button";

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
  downloading?: boolean;
}

export function CertificateCard({ certificate, onView, onDownload, downloading = false }: CertificateCardProps) {
  const Icon = sacramentIcons[certificate.sacramentType];
  const revoked = certificate.state === "invalid";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        revoked ? "border-[#c9a4a0]" : "border-border"
      }`}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-[90px] w-[100px] rounded-full bg-primary/5"
        aria-hidden="true"
      />
      {revoked && (
        <span className="absolute right-3 top-3 rounded-full bg-[#7A3C35] px-2.5 py-0.5 text-[12px] font-bold text-white">
          Revoked
        </span>
      )}
      <div
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg ${
          revoked ? "bg-[#7A3C35]/10 text-[#7A3C35]" : "bg-primary/10 text-primary"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="relative mt-3 font-serif text-[16.5px] font-bold leading-tight text-ink">
        {sacramentLabels[certificate.sacramentType]}
      </p>
      <p className="relative mt-1 text-[13px] text-ink-muted">
        {certificate.holderName} · Issued{" "}
        {new Date(certificate.issuedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>
      {revoked && (
        <p className="relative mt-1.5 text-[13px] font-medium text-[#7A3C35]">
          This certificate is no longer valid.
        </p>
      )}
      <div className="relative mt-3.5 flex gap-1.5">
      <Button
        variant="outline"
        className="flex-1 py-2.5 text-sm active:scale-95"
        onClick={() => onView(certificate)}
      >
        View
      </Button>
      <Button
        variant="primary"
        className="flex-1 py-2.5 text-sm active:scale-95"
        onClick={() => onDownload(certificate)}
        disabled={downloading || revoked}
      >
        {downloading ? "Saving…" : "Download"}
      </Button>
      </div>
    </div>
  );
}