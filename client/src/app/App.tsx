import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { validateSession } from "@/features/auth/api/authApi";
import { bindEnterAdvancesField } from "@/lib/enterAdvancesField";

export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void validateSession().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => bindEnterAdvancesField(), []);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f4f6f6] text-sm text-[#5a6d71]">
        Loading…
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
