import { createContext, useContext, useLayoutEffect } from "react";

export type SuperAdminHeading = { title: string; sub: string };

export const SuperAdminChromeContext = createContext<{
  heading: SuperAdminHeading | null;
  setHeading: (heading: SuperAdminHeading | null) => void;
}>({ heading: null, setHeading: () => {} });

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
