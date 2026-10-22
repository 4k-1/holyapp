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

type Step = "search" | "register" | "otp" | "success";

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const parishSlug = searchParams.get("parish");
  const [step, setStep] = useState<Step>(parishSlug ? "register" : "search");
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
          setStep("register");
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

  const showBack = step === "register" || step === "otp";
  const backLabel = step === "otp" ? "Back" : "Change parish";

  function handleBack() {
    if (step === "otp") {
      setStep("register");
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
            setStep("register");
          }}
        />
      )}
      {step === "register" && selectedParish && (
        <RegisterForm parish={selectedParish} onSubmit={handleRegisterSubmit} />
      )}
      {step === "otp" && (
        <OtpStep email={pendingEmail} onVerify={handleVerify} onResend={resendVerificationCode} />
      )}
      {step === "success" && <VerificationSuccessStep />}
    </AuthShell>
  );
}
