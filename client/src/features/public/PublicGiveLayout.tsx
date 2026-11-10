import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listParishes } from "@/features/parish/parishApi";
import type { Parish } from "@/types";
import { Cloud } from "./Cloud";
import "./give.css";

export type GiveMode = "donate" | "intention";

const MODE_LABEL: Record<GiveMode, string> = { donate: "Give a donation", intention: "Request a Mass" };

/** Frame for the signed-out giving pages: a teal page with a slim top bar and one white card in the middle. */
export function GiveSite({ parish, children }: { parish?: Parish | null; children: ReactNode }) {
  return (
    <div className="give relative min-h-screen overflow-hidden">
      {/* The sign-in pages' sky: faint drawn clouds high up and a soft bank along the bottom. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <Cloud className="left-[-12%] top-[6%] w-[46vw] max-w-[620px] opacity-[0.14]" drift={80} />
        <Cloud className="right-[-14%] top-[2%] w-[40vw] max-w-[540px] opacity-[0.1]" drift={95} delay={-30} flip />
        <Cloud className="bottom-[-9vw] left-[-14%] w-[56vw] opacity-[0.3]" drift={60} delay={-10} />
        <Cloud className="bottom-[-12vw] left-[26%] w-[58vw] opacity-[0.24]" drift={75} delay={-35} flip />
        <Cloud className="bottom-[-8vw] right-[-16%] w-[52vw] opacity-[0.3]" drift={65} delay={-25} />
      </div>
      <header className="relative">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-2 no-underline">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white">
              <img src="/holyapp-logo.webp" alt="" className="h-[27px] w-[27px] object-contain" />
            </span>
            <span className="text-[1.0625rem] font-bold tracking-tight text-white">HolyApp</span>
          </Link>
          <Link
            to={parish ? `/${parish.slug}/login` : "/login"}
            className="inline-flex rounded-full px-4 py-1.5 text-[0.875rem] font-semibold text-white ring-1 ring-white/35 hover:bg-white/10"
          >
            Sign in
          </Link>
        </div>
      </header>
      <main className="relative mx-auto w-full max-w-[600px] px-4 pb-10 pt-4 sm:px-6 sm:pt-8">{children}</main>
      <p className="relative pb-8 text-center text-[0.8125rem] text-white/55">Secure giving for Catholic parishes in the Philippines, by HolyApp</p>
    </div>
  );
}

/** The white card: serif title and a line under it, the controls that set up the form (switch, church), the form. */
export function GivePanel({
  title,
  description,
  controls,
  children,
}: {
  title: string;
  description: ReactNode;
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[28px] bg-white px-5 py-7 text-[var(--l-ink)] shadow-[0_30px_70px_-30px_rgb(5_30_36/0.75)] sm:px-9 sm:py-9">
      <h1 className="give-title text-[2.125rem] leading-[1.1] text-[var(--l-ink)] sm:text-[2.5rem]">{title}</h1>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--l-muted)]">{description}</p>
      {controls && <div className="mt-6 space-y-5">{controls}</div>}
      <div className="mt-6 border-t border-[var(--l-line)] pt-1">{children}</div>
    </div>
  );
}

/** Segmented switch between the two giving pages: the chosen one is a teal pill on a grey track. */
export function GiveModeTabs({
  mode,
  hrefFor,
  onChange,
}: {
  mode: GiveMode;
  /** Links to the other page; leave out and pass `onChange` to switch in place. */
  hrefFor?: (mode: GiveMode) => string;
  onChange?: (mode: GiveMode) => void;
}) {
  return (
    <div role="tablist" aria-label="What would you like to do?" className="flex w-full rounded-full bg-[var(--l-track)] p-1">
      {(["donate", "intention"] as const).map((item) => {
        const active = item === mode;
        const cls = `flex min-h-[44px] flex-1 items-center justify-center rounded-full px-3 text-[0.9375rem] font-semibold transition-colors ${
          active
            ? "bg-[var(--l-teal)] text-white shadow-[0_6px_16px_-8px_rgb(14_59_70/0.7)]"
            : "text-[var(--l-ink)] hover:text-[var(--l-teal)]"
        }`;
        return hrefFor ? (
          <Link key={item} role="tab" aria-selected={active} to={hrefFor(item)} replace className={cls}>
            {MODE_LABEL[item]}
          </Link>
        ) : (
          <button key={item} type="button" role="tab" aria-selected={active} onClick={() => onChange?.(item)} className={cls}>
            {MODE_LABEL[item]}
          </button>
        );
      })}
    </div>
  );
}

/** The chosen church, with a Change button that opens a search of every parish on HolyApp. */
export function ChurchPicker({ parish, mode }: { parish: Parish; mode: GiveMode }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full">
      <p className="mb-1.5 text-[0.875rem] font-medium text-[var(--l-ink)]">Your church</p>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-full border border-[var(--l-line)] py-2 pl-2 pr-2.5 text-left transition-colors hover:border-[var(--l-teal)]/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--l-teal-light)]/60"
      >
        <ChurchSeal parish={parish} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-semibold text-[var(--l-ink)]">{parish.name}</span>
          <span className="block truncate text-[0.8125rem] text-[var(--l-muted)]">{parish.address}</span>
        </span>
        <span className="shrink-0 rounded-full bg-[var(--l-track)] px-3.5 py-1.5 text-[0.8125rem] font-semibold text-[var(--l-teal-deep)]">
          Change
        </span>
      </button>
      {open && (
        <div className="mt-2 rounded-[20px] border border-[var(--l-line)] bg-white p-2.5 shadow-[0_18px_40px_-24px_rgb(5_30_36/0.5)]">
          <ChurchList
            currentId={parish.id}
            autoFocus
            onSelect={(next) => {
              setOpen(false);
              if (next.id !== parish.id) navigate(`/give/${next.slug}/${mode}`);
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Search box over every parish, filtered as the visitor types. */
export function ChurchList({
  onSelect,
  currentId,
  autoFocus = false,
}: {
  onSelect: (parish: Parish) => void;
  currentId?: string;
  autoFocus?: boolean;
}) {
  const [parishes, setParishes] = useState<Parish[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    listParishes()
      .then((all) => !cancelled && setParishes(all))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Could not load churches."));
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!parishes || !q) return parishes ?? [];
    return parishes.filter((p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q));
  }, [parishes, query]);

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Search churches</span>
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by church name or town"
          autoFocus={autoFocus}
          className="h-12 w-full rounded-full border border-[var(--l-line)] bg-white pl-10 pr-3 text-[0.9375rem] text-[var(--l-ink)] outline-none placeholder:text-[#8aa1a8] focus:border-[var(--l-teal)] focus:ring-[3px] focus:ring-[var(--l-teal-light)]/50"
        />
      </label>
      <div className="mt-2 max-h-[min(20rem,50vh)] overflow-y-auto">
        {error ? (
          <p role="alert" className="px-2 py-4 text-[0.875rem] text-[#b42318]">{error}</p>
        ) : !parishes ? (
          <p className="px-2 py-4 text-[0.875rem] text-[var(--l-muted)]">Loading churches…</p>
        ) : results.length === 0 ? (
          <p className="px-2 py-4 text-[0.875rem] text-[var(--l-muted)]">No church matches “{query}”.</p>
        ) : (
          <ul className="space-y-1">
            {results.map((p) => {
              const current = p.id === currentId;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(p)}
                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-[var(--l-mist)] focus-visible:bg-[var(--l-mist)] focus-visible:outline-none ${
                      current ? "bg-[var(--l-mist)]" : ""
                    }`}
                  >
                    <ChurchSeal parish={p} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-semibold text-[var(--l-ink)]">{p.name}</span>
                      <span className="block truncate text-[0.8125rem] text-[var(--l-muted)]">{p.address}</span>
                    </span>
                    {current ? (
                      <span className="shrink-0 text-[0.75rem] font-semibold text-[var(--l-teal)]">Current</span>
                    ) : (
                      <ChevronIcon />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ChurchSeal({ parish }: { parish: Parish }) {
  if (parish.sealUrl) {
    return <img src={parish.sealUrl} alt="" className="h-11 w-11 shrink-0 rounded-full border border-[var(--l-line)] bg-white object-contain p-0.5" />;
  }
  return (
    <span
      className="give-title flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--l-mist)] text-[1.25rem] text-[var(--l-teal-deep)]"
      aria-hidden="true"
    >
      {parish.name.charAt(0)}
    </span>
  );
}

/* ---------- Icons ---------- */

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa1a8]" aria-hidden="true">
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13.2 13.2 3.3 3.3" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 text-[#8aa1a8]" aria-hidden="true">
      <path d="m8 5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
