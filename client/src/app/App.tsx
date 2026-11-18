import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { ConfirmHost } from "@/components/ui/ConfirmHost";
import { LoadingBar } from "@/components/ui/LoadingBar";
import { PageLoader } from "@/components/ui/PageLoader";
import { Notices } from "@/components/ui/Notices";
import { validateSession } from "@/features/auth/api/authApi";
import { bindEnterAdvancesField } from "@/lib/enterAdvancesField";
import { TestGuide } from "@/features/test-guide/TestGuide";

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
    return <PageLoader />;
  }

  return (
    <>
      <RouterProvider router={router} />
      {/* Shared by every portal; data-portal gives them the HolyApp colours and type. */}
      <div data-portal="admin" className="contents">
        <LoadingBar />
        <Notices />
        <ConfirmHost />
        <TestGuide />
      </div>
    </>
  );
}
