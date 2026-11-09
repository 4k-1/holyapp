import { useLedgerPageImage } from "@/features/parish-admin/ledgers/useLedgerPageImage";

export function LedgerPageImage({
  parishId,
  pageId,
  size = "full",
  alt,
  className,
}: {
  parishId: string;
  pageId: string;
  size?: "thumb" | "full";
  alt: string;
  className?: string;
}) {
  const { url, failed } = useLedgerPageImage(parishId, pageId, size);
  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-admin-surface-alt ${className ?? ""}`} role="img" aria-label={alt}>
        <span className="text-admin-support text-admin-ink-muted">{failed ? "Photo couldn't load" : "Loading photo…"}</span>
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} />;
}
