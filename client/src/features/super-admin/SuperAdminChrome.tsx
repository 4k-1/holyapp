import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";

export type SuperAdminHeading = { title: string; sub: string };

const SuperAdminChromeContext = createContext<{
  heading: SuperAdminHeading | null;
  setHeading: (heading: SuperAdminHeading | null) => void;
}>({ heading: null, setHeading: () => {} });

export function SuperAdminChromeProvider({ children }: { children: ReactNode }) {
  const [heading, setHeading] = useState<SuperAdminHeading | null>(null);
  const value = useMemo(() => ({ heading, setHeading }), [heading]);
  return <SuperAdminChromeContext.Provider value={value}>{children}</SuperAdminChromeContext.Provider>;
}

export function useSuperAdminPageHeading(title: string, sub: string) {
  const { setHeading } = useContext(SuperAdminChromeContext);
  useLayoutEffect(() => {
    setHeading({ title, sub });
    return () => setHeading(null);
  }, [title, sub, setHeading]);
}

export function useSuperAdminChromeHeading() {
  return useContext(SuperAdminChromeContext).heading;
}
