import { useId } from "react";
import { SHEET_COLORS, type ReportSeries, type ReportSlice } from "@/features/parish-admin/reports/reportDocument";

/*
 * Static charts for the report sheet. They carry literal colours and fonts because html2canvas draws an SVG
 * as a standalone image, where CSS variables and the page's classes don't apply.
 */

const FONT = "Inter, Arial, Helvetica, sans-serif";

function niceMax(max: number) {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function shortNumber(value: number, money: boolean) {
  const prefix = money ? "₱" : "";
  if (value >= 1000) return `${prefix}${Math.round(value / 100) / 10}k`;
  return `${prefix}${Math.round(value)}`;
}

/** Catmull-Rom through the points as cubic Béziers, with control points kept inside the plot. */
function smoothPath(points: [number, number][], minY: number, maxY: number) {
  if (points.length === 1) return `M${points[0][0]},${points[0][1]}`;
  const clamp = (y: number) => Math.min(Math.max(y, minY), maxY);
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = clamp(p1[1] + (p2[1] - p0[1]) / 6);
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = clamp(p2[1] - (p3[1] - p1[1]) / 6);
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function SheetLineChart({
  labels,
  series,
  money,
  active = null,
  onActive,
  height = 230,
}: {
  labels: string[];
  series: ReportSeries[];
  money: boolean;
  /** The point to call out; the lead series' peak when nothing is hovered. */
  active?: number | null;
  /** Given in the on-screen preview to follow the pointer; left out for the PDF and print. */
  onActive?: (index: number | null) => void;
  /** Height in chart units (the width is 460); taller fills a stretched card without stretching the text. */
  height?: number;
}) {
  const gradientId = useId().replace(/[^\w-]/g, "");
  const w = 460;
  const h = height;
  const padL = 40;
  // Room for half of the last month label, which is centred on the last point.
  const padR = 22;
  const padT = 30;
  const padB = 26;
  // Counts get at least 0–4 on the axis, so small numbers don't round to repeated tick labels.
  const max = Math.max(niceMax(Math.max(...series.flatMap((item) => item.values), 0)), money ? 0 : 4);
  const stepX = (w - padL - padR) / Math.max(labels.length - 1, 1);
  const x = (index: number) => (labels.length === 1 ? (w + padL - padR) / 2 : padL + index * stepX);
  const y = (value: number) => padT + ((max - value) / max) * (h - padT - padB);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((step) => max * step);
  const labelEvery = labels.length > 9 ? 2 : 1;

  const lead = series[0];
  const peakIndex = active ?? lead.values.indexOf(Math.max(...lead.values));
  const peakX = x(peakIndex);
  const peakY = y(lead.values[peakIndex]);
  const peakText = money ? `₱${lead.values[peakIndex].toLocaleString()}` : lead.values[peakIndex].toLocaleString();
  const pillW = Math.max(peakText.length * 6.6 + 16, 34);
  const pillX = Math.min(Math.max(peakX - pillW / 2, padL), w - padR - pillW);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Line chart" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lead.color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={lead.color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={padL} y1={y(tick)} x2={w - padR} y2={y(tick)} stroke={SHEET_COLORS.grid} strokeWidth={1} />
          <text x={padL - 8} y={y(tick) + 3.5} textAnchor="end" fill={SHEET_COLORS.faint} fontSize={10} fontFamily={FONT}>
            {shortNumber(tick, money)}
          </text>
        </g>
      ))}
      {labels.map((label, index) =>
        index % labelEvery === 0 ? (
          <text
            key={label}
            x={x(index)}
            y={h - 7}
            textAnchor="middle"
            fill={index === peakIndex ? lead.color : SHEET_COLORS.faint}
            fontWeight={index === peakIndex ? 600 : 400}
            fontSize={10}
            fontFamily={FONT}
          >
            {label}
          </text>
        ) : null
      )}

      {series.map((item, seriesIndex) => {
        const coords = item.values.map((value, index): [number, number] => [x(index), y(value)]);
        const line = smoothPath(coords, padT, h - padB);
        return (
          <g key={item.id}>
            {seriesIndex === 0 && labels.length > 1 && (
              <path
                d={`${line} L${coords[coords.length - 1][0].toFixed(1)},${h - padB} L${coords[0][0].toFixed(1)},${h - padB} Z`}
                fill={`url(#${gradientId})`}
              />
            )}
            <path d={line} fill="none" stroke={item.color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}

      <line x1={peakX} y1={peakY} x2={peakX} y2={h - padB} stroke={lead.color} strokeWidth={1} strokeDasharray="3 3" />
      <circle cx={peakX} cy={peakY} r={5} fill={lead.color} stroke="#fff" strokeWidth={2} />
      <rect x={pillX} y={Math.max(peakY - 30, 2)} width={pillW} height={20} rx={6} fill={lead.color} />
      <text
        x={pillX + pillW / 2}
        y={Math.max(peakY - 30, 2) + 13.5}
        textAnchor="middle"
        fill="#fff"
        fontSize={10.5}
        fontWeight={600}
        fontFamily={FONT}
      >
        {peakText}
      </text>

      {onActive &&
        labels.map((label, index) => (
          <rect
            key={`${label}-hit`}
            x={x(index) - Math.max(stepX, 16) / 2}
            y={padT}
            width={Math.max(stepX, 16)}
            height={h - padT - padB}
            fill="transparent"
            onMouseEnter={() => onActive(index)}
            onMouseLeave={() => onActive(null)}
          />
        ))}
    </svg>
  );
}

export function SheetDonutChart({ slices, centerLabel, centerValue }: { slices: ReportSlice[]; centerLabel: string; centerValue: string }) {
  const size = 180;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const shown = slices.filter((slice) => slice.value > 0);
  // A small gap between slices, skipped when there is only one.
  const gap = shown.length > 1 ? 0.035 : 0;
  let angle = -Math.PI / 2;

  return (
    // Fixed size, centred by the wrapper: html2canvas crops an SVG centred with auto margins.
    <div style={{ display: "flex", justifyContent: "center" }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Donut chart" style={{ display: "block" }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={SHEET_COLORS.grid} strokeWidth={stroke} />
        {total > 0 &&
          shown.map((slice) => {
            const sweep = (slice.value / total) * Math.PI * 2;
            const from = angle + gap / 2;
            const to = angle + sweep - gap / 2;
            angle += sweep;
            if (shown.length === 1) {
              return <circle key={slice.id} cx={c} cy={c} r={r} fill="none" stroke={slice.color} strokeWidth={stroke} />;
            }
            const large = to - from > Math.PI ? 1 : 0;
            const d = `M${c + r * Math.cos(from)},${c + r * Math.sin(from)} A${r},${r} 0 ${large} 1 ${c + r * Math.cos(to)},${c + r * Math.sin(to)}`;
            return <path key={slice.id} d={d} fill="none" stroke={slice.color} strokeWidth={stroke} />;
          })}
        <text x={c} y={c - 2} textAnchor="middle" fill={SHEET_COLORS.ink} fontSize={20} fontWeight={700} fontFamily={FONT}>
          {centerValue}
        </text>
        <text x={c} y={c + 16} textAnchor="middle" fill={SHEET_COLORS.muted} fontSize={10} fontFamily={FONT}>
          {centerLabel}
        </text>
      </svg>
    </div>
  );
}
