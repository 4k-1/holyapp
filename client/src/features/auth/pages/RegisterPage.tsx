import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { ParishSearchStep } from "@/features/auth/components/ParishSearchStep";
import { SignupFlow } from "@/features/auth/components/SignupFlow";
import { getParishBySlug } from "@/features/parish/parishApi";
import type { Parish } from "@/types";
import "@/features/auth/styles/authDesk.css";

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const parishSlug = searchParams.get("parish");
  const [selectedParish, setSelectedParish] = useState<Parish | null>(null);
  const [loadingParish, setLoadingParish] = useState(Boolean(parishSlug));
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    if (!parishSlug) return;
    let cancelled = false;
    void getParishBySlug(parishSlug)
      .then((parish) => {
        if (cancelled) return;
        if (parish) setSelectedParish(parish);
        else setBootError("Parish not found.");
      })
      .catch(() => {
        if (!cancelled) setBootError("Could not load parish.");
      })
      .finally(() => {
        if (!cancelled) setLoadingParish(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parishSlug]);

  if (selectedParish) {
    return <SignupFlow parish={selectedParish} onChangeParish={() => setSelectedParish(null)} />;
  }

  return (
    <AuthShell parish={null}>
      {bootError && (
        <p role="alert" className="auth-desk__error mb-4">
          {bootError}
        </p>
      )}
      {!loadingParish && (
        <ParishSearchStep
          onSelect={(parish) => {
            setBootError(null);
            setSelectedParish(parish);
          }}
        />
      )}
    </AuthShell>
  );
}
