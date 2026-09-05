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

  return (
    <div className="flex min-h-screen flex-col md:grid md:grid-cols-2">
      <ParishBrandingPanel parish={parish} />
      <MobileParishHeader parish={parish} />
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          {step === "register" && (
            <RegisterForm
              parish={parish}
              onBack={() => navigate("/register")}
              onSubmit={handleRegisterSubmit}
            />
          )}
          {step === "otp" && (
            <OtpStep
              email={pendingEmail}
              onBack={() => setStep("register")}
              onVerify={handleVerify}
              onResend={resendVerificationCode}
            />
          )}
          {step === "success" && <VerificationSuccessStep />}
        </div>
      </div>
    </div>
  );
}