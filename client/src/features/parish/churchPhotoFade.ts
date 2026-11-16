import type { CSSProperties } from "react";

/**
 * Fades the church photo out on its left, top and bottom edges, so it melts into the dashboard's teal banner
 * with no visible border. Shared by the parishioner dashboard and the preview in Parish settings.
 */
export const churchPhotoFade: CSSProperties = {
  maskImage:
    "linear-gradient(to right, transparent, #000 60%), linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)",
  maskComposite: "intersect",
  WebkitMaskImage:
    "linear-gradient(to right, transparent, #000 60%), linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)",
  WebkitMaskComposite: "source-in",
};
