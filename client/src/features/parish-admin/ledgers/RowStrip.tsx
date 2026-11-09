// One ledger row cut out of the uploaded photo, with a box on each cell.
import { useMemo } from "react";
import type { OcrCell } from "@/features/parish-admin/ledgers/api/ledgerScanApi";
import { columnFieldOf } from "@/features/parish-admin/ledgers/ocrColumns";

/** The row cut out of the photo, with a box on each cell. Click a box to edit that field. */
export function RowStrip({
  imageUrl,
  page,
  cells,
  focusField,
  flagged,
  onPick,
  note,
}: {
  imageUrl: string | null;
  page: { width: number; height: number };
  cells: OcrCell[];
  focusField: string | null;
  flagged: Set<string>;
  onPick: (field: string) => void;
  note?: string | null;
}) {
  const box = useMemo(() => {
    if (cells.length === 0) return null;
    const pad = 12;
    const x0 = Math.max(0, Math.min(...cells.map((c) => c.box.x0)) - pad);
    const y0 = Math.max(0, Math.min(...cells.map((c) => c.box.y0)) - pad);
    const x1 = Math.min(
      page.width,
      Math.max(...cells.map((c) => c.box.x1)) + pad,
    );
    const y1 = Math.min(
      page.height,
      Math.max(...cells.map((c) => c.box.y1)) + pad,
    );
    return { x0, y0, w: x1 - x0, h: y1 - y0 };
  }, [cells, page.width, page.height]);

  if (!imageUrl || !box) {
    return (
      <p className="admin-dash__muted rounded-[10px] border border-dashed border-[var(--dash-border-strong)] px-4 py-3 text-admin-support">
        {!imageUrl
          ? "No row picture when the pages are uploaded as two files. Use one photo, or one page at a time."
          : (note ?? "The row couldn't be found on the photo.")}
      </p>
    );
  }

  // The border sits on an outer box: the picture's % offsets are measured inside the border,
  // so a border on the sized box would shift the picture by a few pixels per row.
  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--dash-border)] bg-white">
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: `${box.w} / ${box.h}` }}
      >
        <img
          src={imageUrl}
          alt="This row on the page"
          draggable={false}
          className="absolute max-w-none select-none"
          style={{
            left: `${(-box.x0 / box.w) * 100}%`,
            top: `${(-box.y0 / box.h) * 100}%`,
            width: `${(page.width / box.w) * 100}%`,
          }}
        />
        <svg
          viewBox={`${box.x0} ${box.y0} ${box.w} ${box.h}`}
          className="absolute inset-0 h-full w-full"
        >
          {cells.map((cell) => {
            const field = columnFieldOf(cell);
            const active = field === focusField;
            const warn = flagged.has(field);
            const { x0, y0, x1, y1 } = cell.box;
            return (
              <rect
                key={cell.field}
                x={x0}
                y={y0}
                width={Math.max(1, x1 - x0)}
                height={Math.max(1, y1 - y0)}
                fill={warn ? "#d18a12" : "#16798c"}
                fillOpacity={active ? 0.16 : warn ? 0.1 : 0}
                stroke={active ? "#16798c" : warn ? "#d18a12" : "transparent"}
                strokeWidth={active ? 3 : 2}
                strokeDasharray={warn && !active ? "6 4" : undefined}
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer hover:stroke-[#16798c]"
                onClick={() => onPick(field)}
              >
                <title>{cell.field}</title>
              </rect>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
