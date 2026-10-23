import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { getParishBySlug } from "@/features/parish/parishApi";
import type { Parish } from "@/types";

/**
 * Frame for the signed-out giving pages: loads the parish from the URL, shows its seal and name, and hands the
 * parish to the page. Visitors can give or request a Mass without an account.
 */
export function PublicGiveShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: (parish: Parish) => ReactNode;
}) {
  const { parishSlug } = useParams();
  const [parish, setParish] = useState<Parish | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (parishSlug ? getParishBySlug(parishSlug) : Promise.resolve(null)).then((found) => {
      if (!cancelled) setParish(found ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [parishSlug]);

  if (parish === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-alt px-4 text-center">
        <p className="text-sm text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!parish) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-alt px-4 text-center">
        <p className="text-sm text-ink-muted">Parish not found. Check the link and try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-alt px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl">
        <div className="mb-7 flex flex-col items-center text-center">
          {parish.sealUrl ? (
            <img
              src={parish.sealUrl}
              alt=""
              className="mb-3 h-16 w-16 rounded-full border border-border bg-white object-contain shadow-sm"
            />
          ) : (
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 font-serif text-2xl font-bold text-primary shadow-sm">
              {parish.name.charAt(0)}
            </div>
          )}
          <p className="text-sm font-medium text-ink-muted">{parish.name}</p>
          <h1 className="mt-2 font-serif text-[1.75rem] font-bold leading-tight text-ink">{title}</h1>
          <p className="mt-2 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">{description}</p>
        </div>
        {children(parish)}
        <p className="mt-6 text-center text-[0.8125rem] text-ink-muted">
          Have a parish account?{" "}
          <Link to={`/${parish.slug}/login`} className="font-semibold text-primary hover:underline">
            Sign in
          </Link>{" "}
          to keep track of your gifts and requests.
        </p>
      </div>
    </div>
  );
}
