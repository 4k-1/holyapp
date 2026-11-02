import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AuthShell } from "@/features/auth/components/AuthShell";
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

type Step = "details" | "account" | "otp" | "success";

export function ParishRegisterPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("details");
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

  const showBack = step !== "success";
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
    navigate("/register");
  }

  return (
    <AuthShell parish={parish} back={showBack ? { label: backLabel, onClick: handleBack } : undefined}>
      {/* One form across both pages, so what was typed on page 1 is kept. */}
      {(step === "details" || step === "account") && (
        <RegisterForm
          parish={parish}
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
