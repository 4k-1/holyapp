import { useNavigate } from "react-router-dom";

/**
 * The one "‹ Back" link on admin pages, above the page title. It goes to the page the person came from;
 * when the page was opened directly (a shared link or a refresh), it goes up to the parent page instead
 * of leaving the app.
 */
export function AdminBackLink({ className = "mb-3.5" }: { className?: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        // React Router numbers history entries; idx 0 means this page was the first one opened.
        if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
        else navigate("..", { relative: "path" });
      }}
      className={`inline-flex items-center gap-1.5 rounded-md text-admin-body text-admin-ink-muted hover:text-admin-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40 ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </button>
  );
}
