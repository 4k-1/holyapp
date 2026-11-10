// The desk's everyday jobs, one click from the dashboard. Tiles that start a form open it straight away
// (the ?new=… link is read by that page), the rest go to the page where the job is done.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

const BOOKS = [
  { label: "Baptism", path: "records/baptismal" },
  { label: "Confirmation", path: "records/confirmation" },
  { label: "Marriage", path: "records/marriage" },
  { label: "Death", path: "records/death" },
];

const TILE =
  "admin-dash__nested flex w-full items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-green)]";

export function QuickActionsCard() {
  return (
    <section className="admin-dash__card mb-5 p-4 sm:mb-6 sm:p-5" aria-label="Quick actions">
      <h2 className="mb-3.5 text-[0.95rem] font-semibold text-[var(--dash-ink)]">Quick actions</h2>
      <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Tile to="donations?new=donation" icon={<CoinIcon />} label="Record a donation" />
        <Tile to="marriage-applications?new=application" icon={<RingsIcon />} label="New marriage application" />
        <Tile to="schedule?new=funeral" icon={<CrossIcon />} label="Book a funeral" />
        <Tile to="mass-intentions" icon={<CandleIcon />} label="Book a Mass intention" />
        <li>
          <BookMenuTile
            icon={<PlusIcon />}
            label="Add a record"
            note="Baptism, Confirmation…"
            items={BOOKS.map((b) => ({ label: b.label, to: `${b.path}/new` }))}
          />
        </li>
        <li>
          <BookMenuTile
            icon={<CertificateIcon />}
            label="Walk-in certificate"
            note="Find the record, then print"
            items={BOOKS.map((b) => ({ label: `${b.label} record`, to: b.path }))}
          />
        </li>
        <Tile to="marriage-applications/banns" icon={<BookIcon />} label="Sunday banns list" />
        <Tile to="reports/day" icon={<SummaryIcon />} label="Today’s summary" />
      </ul>
    </section>
  );
}

interface TileProps {
  icon: ReactNode;
  label: string;
  note?: string;
}

function Tile({ to, ...body }: TileProps & { to: string }) {
  return (
    <li>
      <Link to={to} className={`${TILE} h-full`}>
        <TileBody {...body} />
      </Link>
    </li>
  );
}

function TileBody({ icon, label, note }: TileProps) {
  return (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-card)] text-[var(--dash-green)]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-admin-body font-medium leading-snug text-[var(--dash-ink)]">{label}</span>
        {note && <span className="admin-dash__muted mt-0.5 block text-admin-label">{note}</span>}
      </span>
    </>
  );
}

/** A tile that first asks which book (Baptism, Confirmation…), then goes there. */
function BookMenuTile({ items, ...body }: TileProps & { items: { label: string; to: string }[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={box} className="relative h-full">
      <button
        type="button"
        className={`${TILE} h-full`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <TileBody {...body} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1.5 rounded-[var(--dash-radius-sm)] border border-[var(--dash-border)] bg-[var(--dash-card)] p-1.5 shadow-[var(--dash-shadow-hover)]">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="block rounded-md px-3 py-2 text-admin-body text-[var(--dash-ink)] hover:bg-[var(--dash-green-soft)]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const CoinIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6.5v11" />
  </Svg>
);
const RingsIcon = () => (
  <Svg>
    <circle cx="9" cy="14" r="5" />
    <circle cx="15" cy="14" r="5" />
    <path d="M10 5l2-2 2 2" />
  </Svg>
);
const CrossIcon = () => (
  <Svg>
    <path d="M12 3v18M7 8h10" />
  </Svg>
);
const CandleIcon = () => (
  <Svg>
    <rect x="9" y="10" width="6" height="11" rx="1" />
    <path d="M12 3c1.2 1.5 1.5 2.6 1.5 3.3a1.5 1.5 0 0 1-3 0C10.5 5.6 10.8 4.5 12 3z" />
  </Svg>
);
const PlusIcon = () => (
  <Svg>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
const CertificateIcon = () => (
  <Svg>
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path d="M7 9h10M7 12.5h6" />
    <circle cx="16.5" cy="17.5" r="2.5" />
    <path d="M15.3 19.7 14.5 22l2-1 2 1-.8-2.3" />
  </Svg>
);
const BookIcon = () => (
  <Svg>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
  </Svg>
);
const SummaryIcon = () => (
  <Svg>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M8 13h8M8 17h5" />
  </Svg>
);
