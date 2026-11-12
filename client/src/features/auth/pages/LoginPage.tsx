import { useState } from "react";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { ParishSearchStep } from "@/features/auth/components/ParishSearchStep";
import { LoginForm } from "@/features/auth/components/LoginForm";
import type { Parish } from "@/types";

export function LoginPage() {
  const [selectedParish, setSelectedParish] = useState<Parish | null>(null);

  return (
    <AuthShell
      parish={selectedParish}
      back={selectedParish ? { label: "Change parish", onClick: () => setSelectedParish(null) } : undefined}
    >
      {selectedParish ? <LoginForm parish={selectedParish} /> : <ParishSearchStep onSelect={setSelectedParish} />}
    </AuthShell>
  );
}
