import { useNavigate, useOutletContext } from "react-router-dom";
import { SignupFlow } from "@/features/auth/components/SignupFlow";
import type { Parish } from "@/types";

export function ParishRegisterPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const navigate = useNavigate();
  return <SignupFlow parish={parish} onChangeParish={() => navigate("/register")} />;
}
