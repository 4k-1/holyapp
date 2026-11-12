import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { PortalFormCard, PortalFormPage } from "@/features/parishioner/components/PortalForm";
import { QrScanner } from "@/features/verification/QrScanner";
import { verificationCode } from "@/features/verification/verificationCode";

/** Check a certificate from inside the portal: scan its QR code or paste its link, then see the public check page. */
export function VerifyPage() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function open(code: string) {
    navigate(`/verify/${code}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = verificationCode(value);
    if (!code) {
      setError("That isn't a verification link or code. Copy the whole link, or scan the QR code on the certificate.");
      return;
    }
    open(code);
  }

  return (
    <PortalFormPage
      title="Verify a certificate"
      description="Check whether a certificate is real and whether the issuing parish still stands behind it."
    >
      <PortalFormCard>
        <section className="px-5 py-5 sm:px-6">
          <h2 className="text-[0.9375rem] font-semibold text-ink">Scan the QR code</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Every HolyApp certificate has one in its corner. Your camera turns on only while you scan.
          </p>
          <div className="mt-3">
            {scanning ? (
              <QrScanner onCode={open} onClose={() => setScanning(false)} />
            ) : (
              <Button type="button" onClick={() => setScanning(true)} className="min-h-[46px] w-full px-5 sm:w-auto">
                <CameraIcon />
                Open camera
              </Button>
            )}
          </div>
        </section>

        <form onSubmit={handleSubmit} noValidate className="px-5 py-5 sm:px-6">
          <label htmlFor="verify-code" className="text-[0.9375rem] font-semibold text-ink">
            Or paste the link or code
          </label>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Use the verification link the certificate was sent with, or just the code from it.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              id="verify-code"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              placeholder="Paste the link or code"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "verify-error" : undefined}
              className={`min-h-[46px] min-w-0 flex-1 rounded-xl border bg-surface px-3.5 text-[0.9375rem] text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15 ${
                error ? "border-danger" : "border-border"
              }`}
            />
            <Button type="submit" variant="secondary" className="min-h-[46px] shrink-0 px-5">
              Check certificate
            </Button>
          </div>
          {error && (
            <p id="verify-error" role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </form>
      </PortalFormCard>
    </PortalFormPage>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path
        d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
