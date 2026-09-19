// src/features/parish-admin/donations/components/DonationSparkline.tsx
import type { DonationTrendPoint } from "../types";

interface DonationSparklineProps {
  data: DonationTrendPoint[];
  highlightIndex: number;
}

export function DonationSparkline({ data, highlightIndex }: DonationSparklineProps) {
  if (data.length === 0) return null;

  const w = 560;
  const h = 180;
  const padL = 8;
  const padR = 8;
  const padT = 46;
  const padB = 22;
  const max = Math.max(...data.map((d) => d.value));
  const stepX = (w - padL - padR) / (data.length - 1 || 1);
  const scaleY = (v: number) => h - padB - (v / max) * (h - padT - padB);
  const pts = data.map((d, i): [number, number] => [padL + i * stepX, scaleY(d.value)]);
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaD = `${pathD} L${pts[pts.length - 1][0].toFixed(1)},${h - padB} L${pts[0][0].toFixed(1)},${h - padB} Z`;
  const hp = pts[highlightIndex] ?? pts[pts.length - 1];
  const hVal = data[highlightIndex]?.value ?? data[data.length - 1].value;
  const hLabel = data[highlightIndex]?.label ?? data[data.length - 1].label;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full h-auto">
      <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="var(--admin-border, #e4ede9)" strokeWidth={1} />
      <path d={areaD} fill="var(--admin-green-050, #e4f5ef)" stroke="none" />
      <path d={pathD} fill="none" stroke="var(--admin-green-700, #0e7a5a)" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) =>
        i === highlightIndex ? (
          <circle key={i} cx={p[0]} cy={p[1]} r={4.5} fill="var(--admin-green-700, #0e7a5a)" stroke="#fff" strokeWidth={2.5} />
        ) : (
          <circle key={i} cx={p[0]} cy={p[1]} r={2.5} fill="var(--admin-green-100, #c8eae0)" />
        )
      )}
      <g>
        <rect x={hp[0] - 38} y={hp[1] - 40} width={76} height={30} rx={7} fill="var(--admin-green-900, #0d3d30)" />
        <polygon
          points={`${hp[0] - 5},${hp[1] - 11} ${hp[0] + 5},${hp[1] - 11} ${hp[0]},${hp[1] - 4}`}
          fill="var(--admin-green-900, #0d3d30)"
        />
        <text x={hp[0]} y={hp[1] - 25} fontSize={9.5} fill="#fff" textAnchor="middle" fontWeight={600}>
          {hLabel}
        </text>
        <text x={hp[0]} y={hp[1] - 13} fontSize={10.5} fill="#fff" textAnchor="middle" fontWeight={700}>
          ₱{hVal.toLocaleString()}
        </text>
      </g>
      {data.map((d, i) => (
        <text key={d.label} x={pts[i][0]} y={h - 6} fontSize={10} fill="var(--admin-ink-faint, #8fada7)" textAnchor="middle">
          {d.label}
        </text>
      ))}
    </svg>
  );
}