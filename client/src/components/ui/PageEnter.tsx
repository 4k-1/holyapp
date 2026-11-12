import { type ReactNode, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const EASE = "cubic-bezier(0.2, 0.7, 0.2, 1)";
const MAX_STAGGER = 6;

/**
 * Wraps a layout's page area so each page eases in when it opens: the page's top-level
 * sections fade up one after another. It plays again whenever the path changes, without
 * remounting the page, so state held in nested layouts (report ranges, settings) survives.
 */
export function PageEnter({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Stagger the page's own sections; a page with a single block just rises as one.
    const root = el.firstElementChild;
    const parts = root && root.children.length > 1 ? Array.from(root.children) : [el];
    const animations = parts.map((part, i) =>
      part.animate(
        [
          { opacity: 0, transform: "translateY(12px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 420, delay: Math.min(i, MAX_STAGGER) * 50, easing: EASE, fill: "backwards" }
      )
    );
    return () => animations.forEach((a) => a.cancel());
  }, [pathname]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
