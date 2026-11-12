import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getCurrentUser, logout } from "@/features/auth/api/authApi";
import type { Role } from "@/types";

const ACCOUNT_LABEL: Record<Role, string> = {
  parishioner: "a parishioner account",
  parish_staff: "a parish staff account",
  parish_admin: "a parish admin account",
  super_admin: "a HolyApp super admin account",
};

/** Who the refused page is for, from its address: /{parish}/portal, /{parish}/admin or /super-admin. */
function audienceOf(path: string) {
  const [first, second] = path.split("/").filter(Boolean);
  if (first === "super-admin") return "HolyApp administrators";
  if (second === "admin") return "the parish office";
  if (second === "portal") return "parishioners";
  return null;
}

/** Where this account belongs, in the parish the refused page was in. */
function homeFor(role: Role, path: string) {
  if (role === "super_admin") return "/super-admin";
  const [first] = path.split("/").filter(Boolean);
  if (!first || first === "super-admin") return "/";
  return role === "parishioner" ? `/${first}/portal` : `/${first}/admin`;
}

/**
 * Shown when someone signed in opens a page their account can't use: a parishioner on the parish admin, or
 * a parish admin on the super admin console. (Someone not signed in is sent to the sign-in page instead.)
 */
export function UnauthorizedPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const from = params.get("from") ?? "";
  const user = getCurrentUser();
  const audience = audienceOf(from);

  useEffect(() => {
    const previous = document.title;
    document.title = "No access · HolyApp";
    return () => {
      document.title = previous;
    };
  }, []);

  async function switchAccount() {
    await logout();
    const [first] = from.split("/").filter(Boolean);
    navigate(
      first === "super-admin" ? "/super-admin/login" : first ? `/${first}/login?from=${encodeURIComponent(from)}` : "/login",
      { replace: true }
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center bg-surface px-4 pb-12 pt-[12vh] text-center text-ink">
      <span className="flex h-28 w-28 items-center justify-center rounded-full border border-border bg-white shadow-sm sm:h-32 sm:w-32">
        <img src="/holyapp-logo.webp" alt="HolyApp" className="h-[4.5rem] w-[4.5rem] object-contain sm:h-20 sm:w-20" />
      </span>

      <p className="mt-10 text-[4.5rem] font-light leading-none tracking-tight text-ink-muted sm:text-[5.5rem]" aria-hidden="true">
        403
      </p>
      <h1 className="mt-8 max-w-xl text-xl text-ink sm:text-2xl">You don't have permission to view this page.</h1>

      <div className="mt-8 w-full max-w-3xl border-t border-border pt-6">
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-ink-muted">
          {audience ? `This page is for ${audience}. ` : "This page is protected. "}
          {user
            ? `You're signed in as ${user.email}, ${ACCOUNT_LABEL[user.role]}, which can't open it.`
            : "Your account can't open it."}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm">
          {user && (
            <Link
              to={homeFor(user.role, from)}
              className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              Go to your home page
            </Link>
          )}
          {user && (
            <button
              type="button"
              onClick={switchAccount}
              className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Sign in with a different account
            </button>
          )}
          {!user && (
            <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
