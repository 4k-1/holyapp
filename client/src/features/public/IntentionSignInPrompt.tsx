import { Link } from "react-router-dom";
import type { Parish } from "@/types";

const COPY = {
  intention: {
    title: "Sign in to request a Mass intention",
    body: "Intentions are requested from your parish account, so the office can reach you and you can follow your request. A donation is welcome but not required.",
  },
  donation: {
    title: "Sign in to give online",
    body: "Online gifts are made from your parish account, so you can see each gift and whether it was received. You can also give in person at the parish office.",
  },
};

/**
 * Mass intentions and online gifts are made from a parish account, so the office knows who gave or asked and the
 * parishioner can follow it. Public pages point people there instead of offering a form that cannot be submitted.
 */
export function IntentionSignInPrompt({ parish, purpose = "intention" }: { parish: Parish; purpose?: keyof typeof COPY }) {
  const copy = COPY[purpose];
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-sm sm:p-8">
      <h2 className="font-serif text-xl font-bold text-ink">{copy.title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">{copy.body}</p>
      <div className="mt-5 flex flex-col justify-center gap-2.5 sm:flex-row">
        <Link
          to={`/${parish.slug}/login`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
        >
          Sign in
        </Link>
        <Link
          to={`/${parish.slug}/register`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border px-5 text-sm font-semibold text-ink hover:bg-surface-alt"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
