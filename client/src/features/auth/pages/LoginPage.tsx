import { useState } from "react";
import { ParishBrandingPanel } from "@/features/auth/components/ParishBrandingPanel";
import { ParishSearchStep } from "@/features/auth/components/ParishSearchStep";
import { LoginForm } from "@/features/auth/components/LoginForm";
import type { Parish } from "@/types";
import "@/features/auth/styles/authDesk.css";

export function LoginPage() {
  const [selectedParish, setSelectedParish] = useState<Parish | null>(null);

  return (
    <div
      data-portal="admin"
      className="auth-desk grid min-h-dvh grid-cols-1 md:grid-cols-2"
    >
      <ParishBrandingPanel parish={selectedParish} />
      <div className="relative flex min-h-dvh flex-col bg-[var(--auth-bg)]">
        {selectedParish && (
          <button
            type="button"
            onClick={() => setSelectedParish(null)}
            className="auth-desk__ghost absolute top-5 left-5 z-10 sm:top-6 sm:left-6"
          >
            <span aria-hidden>←</span>
            Change parish
          </button>
        )}
        <div className="flex flex-1 items-center justify-center px-6 py-16 sm:px-10">
          <div className="w-full max-w-[28rem]">
            {selectedParish ? (
              <LoginForm parish={selectedParish} />
            ) : (
              <ParishSearchStep onSelect={setSelectedParish} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
