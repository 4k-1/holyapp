import { useNavigate, useOutletContext } from "react-router-dom";
import { ParishBrandingPanel } from "@/features/auth/components/ParishBrandingPanel";
import { MobileParishHeader } from "@/features/auth/components/MobileParishHeader";
import { LoginForm } from "@/features/auth/components/LoginForm";
import type { Parish } from "@/types";

export function ParishLoginPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col md:grid md:grid-cols-2">
      <ParishBrandingPanel parish={parish} />
      <MobileParishHeader parish={parish} />
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">
          <LoginForm parish={parish} onBack={() => navigate("/login")} />
        </div>
      </div>
    </div>
  );
}