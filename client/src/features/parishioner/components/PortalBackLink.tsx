import { Link } from "react-router-dom";

/**
 * The portal's one back link, for pages under a menu page: "← My requests". Menu pages have none; the menu is there.
 * `to` is relative to this page's address, e.g. ".." from a request to the list.
 */
export function PortalBackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      relative="path"
      className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg text-[0.875rem] font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span aria-hidden="true">←</span> {label}
    </Link>
  );
}
