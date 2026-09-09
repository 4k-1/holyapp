import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ParishBrandingPanel } from "@/features/auth/components/ParishBrandingPanel";
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

  const initialParish = (() => {
    const slug = searchParams.get("parish");
    return slug ? getParishBySlug(slug) ?? null : null;
  })();

  const [step, setStep] = useState<Step>(initialParish ? "register" : "search");
  const [selectedParish, setSelectedParish] = useState<Parish | null>(initialParish);
  const [pendingEmail, setPendingEmail] = useState("");
  const navigate = useNavigate();

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
    <div
      data-portal="admin"
      className="auth-desk grid h-dvh overflow-hidden grid-cols-1 md:grid-cols-2"
    >
      <div className="hidden min-h-0 md:block">
        <ParishBrandingPanel parish={selectedParish} />
      </div>
      <div className="relative flex min-h-0 flex-col bg-[var(--auth-bg)]">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            className="auth-desk__ghost absolute top-5 left-5 z-20 sm:top-6 sm:left-6"
          >
            <span aria-hidden>←</span>
            {backLabel}
          </button>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex min-h-full flex-col justify-center px-6 py-16 sm:px-10">
            <div className="mx-auto w-full max-w-[28rem]">
              {step === "search" && (
                <ParishSearchStep
                  onSelect={(parish) => {
                    setSelectedParish(parish);
                    setStep("register");
                  }}
                />
              )}
              {step === "register" && selectedParish && (
                <RegisterForm parish={selectedParish} onSubmit={handleRegisterSubmit} />
              )}
              {step === "otp" && (
                <OtpStep
                  email={pendingEmail}
                  onVerify={handleVerify}
                  onResend={resendVerificationCode}
                />
              )}
              {step === "success" && <VerificationSuccessStep />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
