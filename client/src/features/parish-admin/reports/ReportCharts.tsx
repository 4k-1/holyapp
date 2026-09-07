import { useState, type ReactNode } from "react";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";

export interface ChartPoint {
  key: string;
  label: string;
  value: number;
}

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
}

export interface GroupedChartPoint {
  key: string;
  label: string;
  values: Record<string, number>;
}

export function ChartPanel({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <AdminCard className="p-5 px-[22px]">
      <h2 className="font-serif text-admin-section font-semibold text-admin-ink">{title}</h2>
      {caption ? <p className="mt-1 text-admin-body text-admin-ink-muted">{caption}</p> : null}
      <div className="mt-4">{children}</div>
    </AdminCard>
  );
}

export function ChartEmpty({ message }: { message: string }) {
  return <p className="py-8 text-admin-body text-admin-ink-muted">{message}</p>;
}

export function ChartLegend({ series }: { series: ChartSeries[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {series.map((item) => (
        <li key={item.id} className="flex items-center gap-1.5 text-admin-support text-admin-ink-muted">
          <span className="h-2 w-2.5 rounded-sm" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function yTicks(max: number) {
  const top = niceMax(max);
  return [0, top / 2, top].map((value) => ({ value, label: formatTick(value) }));
}

function niceMax(max: number) {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function formatTick(value: number) {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(Math.round(value));
}

export function ReportLineChart({
  points,
  formatValue,
  color = "var(--color-admin-green-700)",
  fill = "var(--color-admin-green-050)",
}: {
  points: ChartPoint[];
  formatValue?: (value: number) => string;
  color?: string;
  fill?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  if (points.length === 0) return null;

  const w = 640;
  const h = 220;
  const padL = 42;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const max = niceMax(Math.max(...points.map((p) => p.value)));
  const stepX = (w - padL - padR) / Math.max(points.length - 1, 1);
  const scaleY = (value: number) => padT + ((max - value) / max) * (h - padT - padB);
  const coords = points.map((point, index): [number, number] => [padL + index * stepX, scaleY(point.value)]);
  const line = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${h - padB} L${coords[0][0].toFixed(1)},${h - padB} Z`;
  const ticks = yTicks(max);
  const current = active ?? points.length - 1;
  const labelEvery = points.length > 8 ? 2 : 1;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" role="img" aria-label="Line chart">
      {ticks.map((tick) => {
        const y = scaleY(tick.value);
        return (
          <g key={tick.value}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--color-admin-border)" strokeWidth={1} />
            <text x={padL - 8} y={y + 3} textAnchor="end" className="fill-admin-ink-faint" fontSize={10}>
              {tick.label}
            </text>
          </g>
        );
      })}
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((point, index) => (
        <circle
          key={points[index].key}
          cx={point[0]}
          cy={point[1]}
          r={index === current ? 4.5 : 2.5}
          fill={index === current ? color : "var(--color-admin-green-100)"}
          stroke={index === current ? "#fff" : "none"}
          strokeWidth={2}
        />
      ))}
      {points.map((point, index) =>
        index % labelEvery === 0 ? (
          <text
            key={point.key}
            x={coords[index][0]}
            y={h - 8}
            textAnchor="middle"
            className="fill-admin-ink-faint"
            fontSize={10}
          >
            {point.label}
          </text>
        ) : null
      )}
      {coords.map((point, index) => (
        <rect
          key={`${points[index].key}-hit`}
          x={point[0] - stepX / 2}
          y={padT}
          width={Math.max(stepX, 12)}
          height={h - padT - padB}
          fill="transparent"
          onMouseEnter={() => setActive(index)}
          onMouseLeave={() => setActive(null)}
        />
      ))}
      {active != null && (
        <g>
          <rect
            x={Math.min(Math.max(coords[active][0] - 46, padL), w - padR - 92)}
            y={Math.max(coords[active][1] - 38, 4)}
            width={92}
            height={28}
            rx={7}
            fill="var(--color-admin-green-900)"
          />
          <text
            x={Math.min(Math.max(coords[active][0], padL + 46), w - padR - 46)}
            y={Math.max(coords[active][1] - 20, 22)}
            textAnchor="middle"
            fill="#fff"
            fontSize={10}
            fontWeight={600}
          >
            {formatValue ? formatValue(points[active].value) : points[active].value} · {points[active].label}
          </text>
        </g>
      )}
    </svg>
  );
}

export function ReportBarChart({
  points,
  formatValue,
  color = "var(--color-admin-green-700)",
}: {
  points: ChartPoint[];
  formatValue?: (value: number) => string;
  color?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  if (points.length === 0) return null;

  const w = 640;
  const h = 220;
  const padL = 42;
  const padR = 16;
  const padT = 12;
  const padB = 28;
  const max = niceMax(Math.max(...points.map((p) => p.value), 0));
  const plotW = w - padL - padR;
  const gap = 8;
  const barW = Math.max((plotW - gap * points.length) / points.length, 8);
  const scaleY = (value: number) => ((max - value) / max) * (h - padT - padB);
  const ticks = yTicks(max);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" role="img" aria-label="Bar chart">
      {ticks.map((tick) => {
        const y = padT + scaleY(tick.value);
        return (
          <g key={tick.value}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--color-admin-border)" strokeWidth={1} />
            <text x={padL - 8} y={y + 3} textAnchor="end" className="fill-admin-ink-faint" fontSize={10}>
              {tick.label}
            </text>
          </g>
        );
      })}
      {points.map((point, index) => {
        const x = padL + index * (barW + gap) + gap / 2;
        const barH = ((point.value / max) * (h - padT - padB)) || 0;
        const y = h - padB - barH;
        const lit = active === index;
        return (
          <g
            key={point.key}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
          >
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={4}
              fill={color}
              opacity={active == null || lit ? 1 : 0.45}
            />
            <text x={x + barW / 2} y={h - 8} textAnchor="middle" className="fill-admin-ink-faint" fontSize={10}>
              {point.label}
            </text>
            {lit && (
              <text
                x={x + barW / 2}
                y={Math.max(y - 6, 12)}
                textAnchor="middle"
                className="fill-admin-ink"
                fontSize={10}
                fontWeight={600}
              >
                {formatValue ? formatValue(point.value) : point.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function ReportStackedBarChart({
  points,
  series,
}: {
  points: GroupedChartPoint[];
  series: ChartSeries[];
}) {
  const [active, setActive] = useState<{ group: number; series: string } | null>(null);
  if (points.length === 0) return null;

  const w = 640;
  const h = 240;
  const padL = 42;
  const padR = 16;
  const padT = 12;
  const padB = 28;
  const totals = points.map((point) => series.reduce((sum, item) => sum + (point.values[item.id] ?? 0), 0));
  const max = niceMax(Math.max(...totals, 0));
  const plotW = w - padL - padR;
  const gap = 10;
  const barW = Math.max((plotW - gap * points.length) / points.length, 10);
  const ticks = yTicks(max);

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" role="img" aria-label="Stacked bar chart">
        {ticks.map((tick) => {
          const y = padT + ((max - tick.value) / max) * (h - padT - padB);
          return (
            <g key={tick.value}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--color-admin-border)" strokeWidth={1} />
              <text x={padL - 8} y={y + 3} textAnchor="end" className="fill-admin-ink-faint" fontSize={10}>
                {tick.label}
              </text>
            </g>
          );
        })}
        {points.map((point, index) => {
          const x = padL + index * (barW + gap) + gap / 2;
          let y = h - padB;
          return (
            <g key={point.key}>
              {series.map((item) => {
                const value = point.values[item.id] ?? 0;
                const barH = (value / max) * (h - padT - padB);
                y -= barH;
                const lit = active?.group === index && active.series === item.id;
                return (
                  <rect
                    key={item.id}
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(barH, 0)}
                    fill={item.color}
                    opacity={active == null || lit ? 1 : 0.4}
                    onMouseEnter={() => setActive({ group: index, series: item.id })}
                    onMouseLeave={() => setActive(null)}
                  />
                );
              })}
              <text x={x + barW / 2} y={h - 8} textAnchor="middle" className="fill-admin-ink-faint" fontSize={10}>
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ChartLegend series={series} />
      {active && (
        <p className="mt-2 text-admin-support text-admin-ink">
          {points[active.group].label}: {series.find((item) => item.id === active.series)?.label}{" "}
          {points[active.group].values[active.series] ?? 0}
        </p>
      )}
    </div>
  );
}

export function ReportRowChart({
  points,
  formatValue,
  color = "var(--color-admin-green-700)",
}: {
  points: ChartPoint[];
  formatValue?: (value: number) => string;
  color?: string;
}) {
  if (points.length === 0) return null;
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <ul className="space-y-3">
      {points.map((point) => (
        <li key={point.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="text-admin-body font-semibold text-admin-ink">{point.label}</span>
            <span className="tabular-nums text-admin-support text-admin-ink-muted">
              {formatValue ? formatValue(point.value) : point.value}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-admin-surface-alt">
            <div
              className="h-full rounded-full"
              style={{ width: `${(point.value / max) * 100}%`, background: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
