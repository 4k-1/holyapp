import { Link } from "react-router-dom";
import type { Parish } from "@/types";

/**
 * Mass intentions are requested from a parish account, so the office knows who asked and the parishioner can
 * follow the request. Public pages point people there instead of offering a form that cannot be submitted.
 */
export function IntentionSignInPrompt({ parish }: { parish: Parish }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-sm sm:p-8">
      <h2 className="font-serif text-xl font-bold text-ink">Sign in to request a Mass intention</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
        Intentions are requested from your {parish.name} account, so the office can reach you and you can follow
        your request. A donation is welcome but not required.
      </p>
      <div className="mt-5 flex flex-col justify-center gap-2.5 sm:flex-row">
        <Link
          to={`/${parish.slug}/login`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-accent px-5 text-sm font-bold text-white shadow-sm hover:opacity-90"
        >
          Sign in
        </Link>
        <Link
          to={`/${parish.slug}/register`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border px-5 text-sm font-bold text-ink hover:bg-surface-alt"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
