/** The page title, sized like the dashboard greeting. Used by AdminPageHeader and by identity cards on detail pages. */
export const PAGE_TITLE_CLASS =
  "font-serif text-[1.35rem] font-bold leading-tight tracking-[-0.01em] text-admin-ink sm:text-[1.5rem]";

/**
 * The column every admin page sits in. It fills the space beside the sidebar, so tables widen when the sidebar
 * collapses, and only stops growing on very wide monitors.
 */
export const PAGE_WIDTH_CLASS = "mx-auto w-full max-w-[1920px]";

/**
 * The narrower column for a single sacramental record (baptism, confirmation, marriage, death).
 * Its label/value rows stay short enough to read across, with room on both sides.
 */
export const RECORD_DETAIL_WIDTH_CLASS = "mx-auto w-full max-w-[1180px] px-1 sm:px-4 lg:px-8";
