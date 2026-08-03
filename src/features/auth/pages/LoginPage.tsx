import { useState } from "react";
import { ParishBrandingPanel } from "@/features/auth/components/ParishBrandingPanel";
import { ParishSearchStep } from "@/features/auth/components/ParishSearchStep";
// import { MobileParishHeader } from "@/features/auth/components/MobileParishHeader";
import { LoginForm } from "@/features/auth/components/LoginForm";
import type { Parish } from "@/types";

export function LoginPage() {
  const [selectedParish, setSelectedParish] = useState<Parish | null>(null);

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2 h-screen">
      <ParishBrandingPanel parish={selectedParish} />
      {/* <MobileParishHeader parish={selectedParish} /> */}
      <div className="relative flex items-center justify-center overflow-hidden bg-canvas p-6 md:p-8 ">
        {/* ambient glow, subject-appropriate: soft, not decorative-for-its-own-sake */}
        {/* <div
          className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full opacity-[0.07] blur-3xl"
          style={{ background: "#1a3d2b" }}
          aria-hidden
        /> */}
        <div className="relative w-full lg:w-md max-w-[90%]">
          {selectedParish ? (
            <LoginForm parish={selectedParish} onBack={() => setSelectedParish(null)} />
          ) : (
            <ParishSearchStep onSelect={setSelectedParish} />
          )}
        </div>
      </div>
    </div>
  );
}