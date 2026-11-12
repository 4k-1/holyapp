import { useNavigate, useOutletContext } from "react-router-dom";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { LoginForm } from "@/features/auth/components/LoginForm";
import type { Parish } from "@/types";

export function ParishLoginPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const navigate = useNavigate();

  return (
    <AuthShell parish={parish} back={{ label: "Change parish", onClick: () => navigate("/login") }}>
      <LoginForm parish={parish} />
    </AuthShell>
  );
}
