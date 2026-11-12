/**
 * Full-screen loading state while the app starts or a page loads its first data: the HolyApp logo in the middle
 * with a teal arc circling it, on a soft light background. It fades in after a moment, so quick loads don't flash it.
 */
export function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="Loading">
      <div className="page-loader__mark">
        <svg viewBox="0 0 120 120" className="page-loader__ring" aria-hidden="true">
          <circle cx="60" cy="60" r="56" className="page-loader__track" />
          <circle cx="60" cy="60" r="56" className="page-loader__arc" />
        </svg>
        <span className="page-loader__logo">
          <img src="/holyapp-logo.webp" alt="" />
        </span>
      </div>
    </div>
  );
}
