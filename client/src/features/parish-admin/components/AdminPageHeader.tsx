import type { ReactNode } from "react";
import { PAGE_TITLE_CLASS, PAGE_WIDTH_CLASS } from "./adminPageStyles";

/** Every admin page sits in the same centred column as the dashboard. `narrow` is for single forms. */
export function AdminPage({
  children,
  narrow = false,
  className = "",
}: {
  children: ReactNode;
  narrow?: boolean;
  className?: string;
}) {
  return <div className={`${narrow ? "mx-auto w-full max-w-[760px]" : PAGE_WIDTH_CLASS} ${className}`}>{children}</div>;
}

/**
 * The page title block, sized like the dashboard greeting: title and one muted line on the left,
 * the page's buttons on the right (below the title on phones). `back` sits above the title.
 */
export function AdminPageHeader({
  title,
  description,
  actions,
  back,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`mb-6 sm:mb-7 ${className}`}>
      {back && <div className="mb-2">{back}</div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className={PAGE_TITLE_CLASS}>{title}</h1>
          {description && <p className="mt-1.5 max-w-[68ch] text-admin-body text-admin-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
