import { useMemo, useState, type ReactNode } from "react";
import { SuperAdminChromeContext, type SuperAdminHeading } from "@/features/super-admin/superAdminChromeContext";

export function SuperAdminChromeProvider({ children }: { children: ReactNode }) {
  const [heading, setHeading] = useState<SuperAdminHeading | null>(null);
  const value = useMemo(() => ({ heading, setHeading }), [heading]);
  return <SuperAdminChromeContext.Provider value={value}>{children}</SuperAdminChromeContext.Provider>;
}
