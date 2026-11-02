import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { ParishSearchStep } from "@/features/auth/components/ParishSearchStep";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { OtpStep } from "@/features/auth/components/OtpStep";
import { VerificationSuccessStep } from "@/features/auth/components/VerificationSuccessStep";
import {
  startRegistration,
  verifyRegistrationCode,
  resendVerificationCode,
  type RegisterInput,
} from "@/features/auth/api/authApi";
import { getParishBySlug } from "@/features/parish/parishApi";
import type { Parish } from "@/types";
import "@/features/auth/styles/authDesk.css";

type Step = "search" | "details" | "account" | "otp" | "success";

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const parishSlug = searchParams.get("parish");
  const [step, setStep] = useState<Step>(parishSlug ? "details" : "search");
  const [selectedParish, setSelectedParish] = useState<Parish | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [bootError, setBootError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!parishSlug) return;
    let cancelled = false;
    void getParishBySlug(parishSlug)
      .then((parish) => {
        if (cancelled) return;
        if (parish) {
          setSelectedParish(parish);
          setStep("details");
        } else {
          setBootError("Parish not found.");
          setStep("search");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBootError("Could not load parish.");
          setStep("search");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [parishSlug]);

  async function handleRegisterSubmit(data: RegisterInput) {
    await startRegistration(data);
    setPendingEmail(data.email);
    setStep("otp");
  }

  async function handleVerify(code: string) {
    await verifyRegistrationCode(code);
    setStep("success");
    setTimeout(() => {
      navigate(`/${selectedParish!.slug}/portal`);
    }, 1500);
  }

  const showBack = step === "details" || step === "account" || step === "otp";
  const backLabel = step === "details" ? "Change parish" : "Back";

  function handleBack() {
    if (step === "otp") {
      setStep("account");
      return;
    }
    if (step === "account") {
      setStep("details");
      return;
    }
    setSelectedParish(null);
    setStep("search");
  }

  return (
    <AuthShell parish={selectedParish} back={showBack ? { label: backLabel, onClick: handleBack } : undefined}>
      {bootError && step === "search" && (
        <p role="alert" className="auth-desk__error mb-4">
          {bootError}
        </p>
      )}
      {step === "search" && (
        <ParishSearchStep
          onSelect={(parish) => {
            setSelectedParish(parish);
            setBootError(null);
            setStep("details");
          }}
        />
      )}
      {/* One form across both pages, so what was typed on page 1 is kept. */}
      {(step === "details" || step === "account") && selectedParish && (
        <RegisterForm
          parish={selectedParish}
          part={step === "details" ? 1 : 2}
          onNext={() => setStep("account")}
          onSubmit={handleRegisterSubmit}
        />
      )}
      {step === "otp" && (
        <OtpStep email={pendingEmail} onVerify={handleVerify} onResend={resendVerificationCode} />
      )}
      {step === "success" && <VerificationSuccessStep />}
    </AuthShell>
  );
}
