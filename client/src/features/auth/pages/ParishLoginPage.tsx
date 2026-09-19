import { useNavigate, useOutletContext } from "react-router-dom";
import { ParishBrandingPanel } from "@/features/auth/components/ParishBrandingPanel";
import { MobileParishHeader } from "@/features/auth/components/MobileParishHeader";
import { LoginForm } from "@/features/auth/components/LoginForm";
import type { Parish } from "@/types";
import "@/features/auth/styles/authDesk.css";

export function ParishLoginPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const navigate = useNavigate();

  return (
    <div data-portal="admin" className="auth-desk flex min-h-dvh flex-col md:grid md:grid-cols-2">
      <ParishBrandingPanel parish={parish} />
      <MobileParishHeader parish={parish} />
      <div className="relative flex flex-1 flex-col bg-[var(--auth-bg)]">
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="auth-desk__ghost absolute top-5 left-5 z-10 sm:top-6 sm:left-6"
        >
          <span aria-hidden>←</span>
          Change parish
        </button>
        <div className="flex flex-1 items-center justify-center px-5 py-16 sm:px-10">
          <div className="w-full max-w-[28rem]">
            <LoginForm parish={parish} />
          </div>
        </div>
      </div>
    </div>
  );
}
