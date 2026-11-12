import "./cloud.css";

// One cloud as overlapping soft puffs, in % of a 2:1 box.
const PUFFS = [
  { x: 2, y: 46, w: 38, h: 50 },
  { x: 16, y: 20, w: 40, h: 68 },
  { x: 36, y: 2, w: 42, h: 84 },
  { x: 58, y: 24, w: 36, h: 62 },
  { x: 70, y: 46, w: 28, h: 46 },
  { x: 8, y: 56, w: 84, h: 44 },
];

/** A soft drawn cloud, shared by the landing page and the sign-in pages, that drifts a little from side to side. */
export function Cloud({
  className,
  drift = 60,
  delay = 0,
  flip = false,
}: {
  className: string;
  /** Seconds for one sway across and back. */
  drift?: number;
  delay?: number;
  /** Mirror the shape so neighbouring clouds don't match. */
  flip?: boolean;
}) {
  return (
    <div
      className={`landing-cloud absolute aspect-[2/1] ${className}`}
      style={{ animationDuration: `${drift}s`, animationDelay: `${delay}s` }}
    >
      <div className={`absolute inset-0 ${flip ? "-scale-x-100" : ""}`}>
        {PUFFS.map((p, i) => (
          <span
            key={i}
            className="landing-puff"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, height: `${p.h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
