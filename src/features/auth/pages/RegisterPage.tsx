import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ParishBrandingPanel } from "@/features/auth/components/ParishBrandingPanel";
// import { MobileParishHeader } from "@/features/auth/components/MobileParishHeader";
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

  return (
    <div className="flex min-h-screen flex-col md:grid md:grid-cols-2 h-screen">
      <ParishBrandingPanel parish={selectedParish} />
      {/* <MobileParishHeader parish={selectedParish} /> */}
      <div className="flex flex-1  items-center justify-center px-4 py-10 sm:px-6 overflow-auto min-h-screen">
        <div className="relative w-full md:w-md max-w-[90%]">
          {step === "search" && (
            <ParishSearchStep
              onSelect={(parish) => {
                setSelectedParish(parish);
                setStep("register");
              }}
            />
          )}
          {step === "register" && selectedParish && (
            <RegisterForm
              parish={selectedParish}
              onBack={() => {
                setSelectedParish(null);
                setStep("search");
              }}
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