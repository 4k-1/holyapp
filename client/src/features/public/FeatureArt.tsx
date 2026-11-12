import { useId, type ReactNode } from "react";

/** Which drawing a feature card shows when it is open. */
export type FeatureArtName =
  | "book"
  | "scan"
  | "inbox"
  | "qr"
  | "calendar"
  | "candle"
  | "heart"
  | "rings"
  | "people"
  | "request"
  | "track"
  | "wallet"
  | "gift"
  | "timeline";

const TEAL = "#16798c";
const MID = "#2a9d9c";
const GOLD = "#eeb531";
const DOT = "#6f949b";

type Point = [number, number];

/** A thin dotted line: the outline of the thing being drawn. */
function Dots({ d, className }: { d: string; className?: string }) {
  return <path d={d} className={className} fill="none" stroke={DOT} strokeWidth="2" strokeLinecap="round" strokeDasharray="0.1 5.5" />;
}

/**
 * A thick stroke in one colour. With `fade` it is solid at its head, marked with a dot, and fades away toward its
 * tail: kept for the arcs that turn and the path already travelled, where the fade shows movement.
 */
function Stroke({
  d,
  head,
  tail,
  color,
  width = 10,
  fade = false,
}: {
  d: string;
  head: Point;
  tail: Point;
  color: string;
  width?: number;
  fade?: boolean;
}) {
  const id = useId();
  if (!fade) {
    return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />;
  }
  return (
    <>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={head[0]} y1={head[1]} x2={tail[0]} y2={tail[1]}>
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={`url(#${id})`} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={head[0]} cy={head[1]} r={width * 0.62} fill={color} />
    </>
  );
}

/** A point on a circle, measured clockwise from twelve o'clock. */
function polar(cx: number, cy: number, r: number, deg: number): Point {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function Arc({ cx, cy, r, from, to, color }: { cx: number; cy: number; r: number; from: number; to: number; color: string }) {
  const head = polar(cx, cy, r, from);
  const tail = polar(cx, cy, r, to);
  return <Stroke d={`M${head[0]} ${head[1]}A${r} ${r} 0 0 1 ${tail[0]} ${tail[1]}`} head={head} tail={tail} color={color} fade />;
}

/** A dotted circle. */
function Ring({ cx, cy, r, className }: { cx: number; cy: number; r: number; className?: string }) {
  return <Dots d={`M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`} className={className} />;
}

/**
 * A feature card's big drawing: the feature traced in fine dotted lines, with a few bold strokes in HolyApp teal and
 * gold. Each grows in when its card opens and keeps one small movement going.
 */
export function FeatureArt({ name }: { name: FeatureArtName }) {
  return (
    <svg viewBox="0 0 240 240" className="landing-art h-full w-full overflow-visible" aria-hidden="true">
      <g className="landing-art-body">{ART[name]}</g>
    </svg>
  );
}

const TIMELINE_STEPS = [
  { y: 68, color: TEAL, length: 72 },
  { y: 126, color: GOLD, length: 56 },
  { y: 184, color: MID, length: 66 },
];

const ART: Record<FeatureArtName, ReactNode> = {
  // Sacramental registers: the open register, a cross on one page, the entry underlined, a ribbon marking it.
  book: (
    <>
      <Dots d="M28 92v100q46-14 92 4q46-18 92-4V92" />
      <Dots d="M36 82q42-16 82 0v100q-40-16-82 0z" />
      <Dots d="M122 82q40-16 82 0v100q-42-16-82 0z" />
      <Dots d="M138 128q22-6 48-2M138 144q22-6 48-2M138 160q14-4 30-2" />
      <Stroke d="M78 98v40" head={[78, 98]} tail={[78, 138]} color={TEAL} width={8} />
      <Stroke d="M62 114h32" head={[62, 114]} tail={[94, 114]} color={MID} width={8} />
      <Stroke d="M138 110q22-6 48-2" head={[138, 110]} tail={[186, 108]} color={TEAL} width={8} />
      <g className="landing-art-sway">
        <Stroke d="M176 70v122" head={[176, 70]} tail={[176, 192]} color={GOLD} />
      </g>
    </>
  ),

  // Digitized ledgers: an old ruled page inside a scanner's frame, a beam sweeping over it.
  scan: (
    <>
      <Dots d="M82 54h76a8 8 0 0 1 8 8v116a8 8 0 0 1-8 8H82a8 8 0 0 1-8-8V62a8 8 0 0 1 8-8z" />
      <Dots d="M90 80h60M90 96h60M90 112h40M90 128h60M90 144h60M90 160h34" />
      <Stroke d="M54 80V54h26" head={[54, 80]} tail={[80, 54]} color={TEAL} />
      <Stroke d="M160 54h26v26" head={[160, 54]} tail={[186, 80]} color={MID} />
      <Stroke d="M186 160v26h-26" head={[186, 160]} tail={[160, 186]} color={TEAL} />
      <Stroke d="M80 186H54v-26" head={[80, 186]} tail={[54, 160]} color={MID} />
      <g className="landing-art-scan">
        <Stroke d="M62 120h116" head={[62, 120]} tail={[178, 120]} color={GOLD} width={7} />
      </g>
    </>
  ),

  // Certificate requests: a sealed certificate settling into the office tray.
  inbox: (
    <>
      <g className="landing-art-drop">
        <Dots d="M90 44h60a6 6 0 0 1 6 6v84a6 6 0 0 1-6 6H90a6 6 0 0 1-6-6V50a6 6 0 0 1 6-6z" />
        <Dots d="M98 86h44M98 100h30" />
        <Stroke d="M98 68h44" head={[98, 68]} tail={[142, 68]} color={TEAL} width={8} />
        <circle cx="136" cy="118" r="9" fill={GOLD} />
        <Ring cx={136} cy={118} r={17} />
      </g>
      <Dots d="M40 142h44l8 18h56l8-18h44v40a10 10 0 0 1-10 10H50a10 10 0 0 1-10-10z" />
      <Dots d="M40 142l18-30M200 142l-18-30" />
      <Stroke d="M92 160h56" head={[92, 160]} tail={[148, 160]} color={TEAL} />
      <Stroke d="M200 142v38" head={[200, 142]} tail={[200, 180]} color={MID} width={8} />
    </>
  ),

  // QR-verified certificates: a code, a gold check across it, a ring sent out from the check.
  qr: (
    <>
      <Dots d="M72 54h80a16 16 0 0 1 16 16v80a16 16 0 0 1-16 16H72a16 16 0 0 1-16-16V70a16 16 0 0 1 16-16z" />
      {[
        [72, 72],
        [124, 72],
        [72, 124],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <Dots d={`M${x} ${y}h28v28h-28z`} />
          <circle cx={x + 14} cy={y + 14} r="5" fill={TEAL} />
        </g>
      ))}
      {[
        [112, 78],
        [112, 94],
        [124, 112],
        [140, 118],
        [112, 136],
        [128, 150],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill={DOT} />
      ))}
      <Ring cx={164} cy={164} r={32} className="landing-art-ping" />
      <Stroke d="M190 144l-30 34-14-14" head={[190, 144]} tail={[146, 164]} color={GOLD} />
    </>
  ),

  // Parish calendar: a month page, Sunday circled in gold.
  calendar: (
    <>
      <Dots d="M62 62h116a16 16 0 0 1 16 16v96a16 16 0 0 1-16 16H62a16 16 0 0 1-16-16V78a16 16 0 0 1 16-16z" />
      <Dots d="M46 96h148" />
      <Stroke d="M84 48v24" head={[84, 48]} tail={[84, 72]} color={TEAL} width={8} />
      <Stroke d="M156 48v24" head={[156, 48]} tail={[156, 72]} color={TEAL} width={8} />
      <Stroke d="M64 80h64" head={[64, 80]} tail={[128, 80]} color={MID} width={8} />
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2, 3, 4].map((col) =>
          row === 1 && col === 3 ? null : <circle key={`${row}-${col}`} cx={70 + col * 25} cy={118 + row * 24} r="3" fill={DOT} />
        )
      )}
      <circle cx="145" cy="142" r="8" fill={GOLD} />
      <g className="landing-art-spin">
        {/* Invisible full circle, so the arc turns around the date rather than its own middle. */}
        <circle cx="145" cy="142" r="20" fill="none" />
        <Arc cx={145} cy={142} r={20} from={20} to={140} color={GOLD} />
      </g>
    </>
  ),

  // Mass intentions: a candle, its flame, and the light spreading out in rings.
  candle: (
    <>
      <Ring cx={120} cy={70} r={30} className="landing-art-spin" />
      <Ring cx={120} cy={70} r={48} />
      <g className="landing-art-flame">
        <path d="M120 46c10 12 13 20 13 26a13 13 0 0 1-26 0c0-6 3-14 13-26z" fill={GOLD} />
      </g>
      <Dots d="M106 100h28v86h-28z" />
      <Stroke d="M112 110v66" head={[112, 110]} tail={[112, 176]} color={TEAL} width={8} />
      <Stroke d="M74 196h92" head={[74, 196]} tail={[166, 196]} color={MID} />
    </>
  ),

  // Donations and receipts: a large heart, traced in teal and gold, and a coin beside it.
  heart: (
    <>
      <Dots d="M120 190s-64-40-64-88a32 32 0 0 1 64-14 32 32 0 0 1 64 14c0 48-64 88-64 88z" />
      <g className="landing-art-beat">
        <Stroke d="M120 88a32 32 0 0 0-64 14" head={[120, 88]} tail={[56, 102]} color={TEAL} />
        <Stroke d="M184 104c-2 36-34 64-54 78" head={[184, 104]} tail={[130, 182]} color={GOLD} />
      </g>
      <circle cx="184" cy="56" r="7" fill={GOLD} />
      <Ring cx={184} cy={56} r={16} />
    </>
  ),

  // Marriage preparation: two linked rings turning together.
  rings: (
    <>
      <g className="landing-art-spin">
        <Ring cx={98} cy={134} r={42} />
        <Arc cx={98} cy={134} r={42} from={210} to={310} color={GOLD} />
      </g>
      <g className="landing-art-spin landing-art-spin--back">
        <Ring cx={142} cy={134} r={42} />
        <Arc cx={142} cy={134} r={42} from={30} to={130} color={TEAL} />
      </g>
      <Dots d="M98 90l-9-10 9-10 9 10z" />
      <path d="M180 62v14M173 69h14M58 70v10M53 75h10" stroke={GOLD} strokeWidth="3" strokeLinecap="round" className="landing-art-twinkle" />
    </>
  ),

  // Staff and reports: the parish team, and a small chart beside them that rises.
  people: (
    <>
      <Dots d="M144 50h48a10 10 0 0 1 10 10v40a10 10 0 0 1-10 10h-48a10 10 0 0 1-10-10V60a10 10 0 0 1 10-10z" />
      <g className="landing-art-rise">
        <Stroke d="M152 98V84" head={[152, 84]} tail={[152, 98]} color={MID} width={7} />
        <Stroke d="M168 98V68" head={[168, 68]} tail={[168, 98]} color={GOLD} width={7} />
        <Stroke d="M184 98V76" head={[184, 76]} tail={[184, 98]} color={TEAL} width={7} />
      </g>
      <Ring cx={74} cy={112} r={14} />
      <Dots d="M46 176a28 28 0 0 1 56 0" />
      <Ring cx={166} cy={136} r={12} />
      <Dots d="M142 190a24 24 0 0 1 48 0" />
      <Ring cx={118} cy={116} r={18} />
      <Stroke d="M86 194a32 32 0 0 1 64 0" head={[86, 194]} tail={[150, 194]} color={TEAL} />
    </>
  ),

  // Request a certificate: a phone with the request form, sent off as a paper plane.
  request: (
    <>
      <Dots d="M96 44h44a16 16 0 0 1 16 16v118a16 16 0 0 1-16 16H96a16 16 0 0 1-16-16V60a16 16 0 0 1 16-16z" />
      <Dots d="M96 96h44M96 112h44M96 128h26" />
      <Stroke d="M96 78h34" head={[96, 78]} tail={[130, 78]} color={TEAL} width={8} />
      <Stroke d="M98 164h40" head={[98, 164]} tail={[138, 164]} color={GOLD} />
      <Dots d="M146 140q38-16 44-70" />
      <g className="landing-art-fly">
        <path d="M178 62l28-12-11 27-6-9z" fill={TEAL} />
      </g>
    </>
  ),

  // Follow your request: the path from received to ready, done so far in teal, the last step glowing gold.
  track: (
    <>
      <Dots d="M56 182C56 122 184 142 184 70" />
      <Stroke d="M120 134C92 142 56 150 56 182" head={[120, 134]} tail={[56, 182]} color={TEAL} fade />
      <Ring cx={120} cy={134} r={18} />
      <Ring cx={184} cy={70} r={24} className="landing-art-ping" />
      <circle cx="184" cy="70" r="9" fill={GOLD} />
    </>
  ),

  // Certificate wallet: certificates peeking out of a wallet, the front one rising.
  wallet: (
    <>
      <g className="landing-art-lift">
        <Stroke d="M76 78h84" head={[76, 78]} tail={[160, 78]} color={GOLD} />
        <Stroke d="M64 96h104" head={[64, 96]} tail={[168, 96]} color={TEAL} />
      </g>
      <Dots d="M54 110h132a14 14 0 0 1 14 14v56a14 14 0 0 1-14 14H54a14 14 0 0 1-14-14v-56a14 14 0 0 1 14-14z" />
      <Dots d="M165 136h35v30h-35a15 15 0 0 1 0-30z" />
      <circle cx="166" cy="151" r="5" fill={GOLD} />
      <Stroke d="M58 176h64" head={[58, 176]} tail={[122, 176]} color={MID} width={8} />
    </>
  ),

  // Give to the parish: a gift tied with a gold ribbon, a heart rising from it.
  gift: (
    <>
      <g className="landing-art-rise-heart">
        <path d="M120 70s-16-10-16-21a8 8 0 0 1 16-5 8 8 0 0 1 16 5c0 11-16 21-16 21z" fill={TEAL} />
      </g>
      <Dots d="M64 100h112a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H64a6 6 0 0 1-6-6v-10a6 6 0 0 1 6-6zM68 122h104v62a6 6 0 0 1-6 6H74a6 6 0 0 1-6-6z" />
      <Stroke d="M120 100v90" head={[120, 100]} tail={[120, 190]} color={GOLD} />
      <Stroke d="M120 100c-8-18-32-20-32-8s20 8 32 8" head={[120, 100]} tail={[88, 92]} color={MID} width={7} />
      <Stroke d="M120 100c8-18 32-20 32-8s-20 8-32 8" head={[120, 100]} tail={[152, 92]} color={TEAL} width={7} />
    </>
  ),

  // Your sacramental timeline: baptism, confirmation and marriage on one line.
  timeline: (
    <>
      <Dots d="M76 44v160" />
      {TIMELINE_STEPS.map(({ y, color, length }, i) => (
        <g key={y} className="landing-art-pop" style={{ animationDelay: `${0.15 + i * 0.15}s` }}>
          <circle cx="76" cy={y} r="7" fill={color} />
          <Ring cx={76} cy={y} r={16} />
          <Stroke d={`M108 ${y}h${length}`} head={[108, y]} tail={[108 + length, y]} color={color} width={8} />
          <Dots d={`M108 ${y + 16}h44`} />
        </g>
      ))}
    </>
  ),
};
