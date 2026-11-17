import { useCertificateTestMode } from "@/lib/certificateMode";

interface TestCertificateNoticeProps {
  /** "result" on the page a certificate's QR code opens; "scan" where someone is about to check one. */
  kind?: "result" | "scan";
  className?: string;
}

/**
 * Says plainly, wherever a certificate is checked, that HolyApp is being tested and its certificates
 * are test copies. Shows nothing once the site issues real certificates.
 */
export function TestCertificateNotice({ kind = "result", className = "" }: TestCertificateNoticeProps) {
  const testMode = useCertificateTestMode();
  if (!testMode) return null;
  return (
    <div
      role="note"
      className={`rounded-xl border-2 border-dashed border-[#C98200] bg-[#FFF5D6] px-4 py-3 text-left text-[0.875rem] leading-snug text-[#4F3300] ${className}`}
    >
      <p className="text-[0.9375rem] font-extrabold">
        {kind === "result" ? "Test certificate. Not a valid church record." : "Certificates are test copies for now."}
      </p>
      <p className="mt-1">
        {kind === "result"
          ? "HolyApp is being tested, so this certificate was made only for testing. Don't accept it as proof of a sacrament. For a real certificate, ask the parish office."
          : "HolyApp is being tested. Any certificate you check here is a test copy and is not a valid church record."}
      </p>
    </div>
  );
}
