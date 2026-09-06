import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { ParishBrandingPanel } from "@/features/auth/components/ParishBrandingPanel";
import { MobileParishHeader } from "@/features/auth/components/MobileParishHeader";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { OtpStep } from "@/features/auth/components/OtpStep";
import { VerificationSuccessStep } from "@/features/auth/components/VerificationSuccessStep";
import {
  startRegistration,
  verifyRegistrationCode,
  resendVerificationCode,
  type RegisterInput,
} from "@/features/auth/api/authApi";
import type { Parish } from "@/types";
import "@/features/auth/styles/authDesk.css";

type Step = "register" | "otp" | "success";

export function ParishRegisterPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("register");
  const [pendingEmail, setPendingEmail] = useState("");

  async function handleRegisterSubmit(data: RegisterInput) {
    await startRegistration(data);
    setPendingEmail(data.email);
    setStep("otp");
  }

  async function handleVerify(code: string) {
    await verifyRegistrationCode(code);
    setStep("success");
    setTimeout(() => {
      navigate(`/${parish.slug}/portal`);
    }, 1500);
  }

  const showBack = step === "register" || step === "otp";
  const backLabel = step === "otp" ? "Back" : "Change parish";

  function handleBack() {
    if (step === "otp") {
      setStep("register");
      return;
    }
    navigate("/register");
  }

  return (
    <div data-portal="admin" className="auth-desk flex min-h-dvh flex-col md:grid md:grid-cols-2">
      <ParishBrandingPanel parish={parish} />
      <MobileParishHeader parish={parish} />
      <div className="relative flex flex-1 flex-col bg-[var(--auth-bg)]">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            className="auth-desk__ghost absolute top-5 left-5 z-10 sm:top-6 sm:left-6"
          >
            <span aria-hidden>←</span>
            {backLabel}
          </button>
        )}
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-16 sm:px-10">
          <div className="w-full max-w-[28rem]">
            {step === "register" && (
              <RegisterForm parish={parish} onSubmit={handleRegisterSubmit} />
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
  );
}
