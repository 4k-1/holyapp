import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HOLYAPP_CONTACT_EMAIL } from "./contact";
import { FeatureArt } from "./FeatureArt";
import "./landing.css";

/** HolyApp's front door: what it is, who it's for, and the way into a parish. */
export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  // Sections fade up as they scroll into view. The hidden start only applies once this runs, so nothing stays
  // invisible if it doesn't.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );
    root.classList.add("landing--reveal");
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="landing min-h-screen">
      <SiteHeader />
      <main>
        <Hero />
        <ParishionerPart />
        <ParishPart />
        <VerifySection />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ---------- Header ---------- */

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5 no-underline">
      <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_2px_8px_rgb(14_59_70/0.12)]">
        <img src="/holyapp-logo.webp" alt="" className="h-[30px] w-[30px] object-contain" />
      </span>
      <span className={`text-[1.25rem] font-bold tracking-tight ${light ? "text-white" : "text-[var(--l-teal-deep)]"}`}>HolyApp</span>
    </Link>
  );
}

const NAV_LINKS = [
  { id: "parishioners", label: "For parishioners" },
  { id: "parishes", label: "For parishes" },
  { id: "verify", label: "Verify a certificate" },
];

/** The part of the page being read: the last one whose top has passed under the header, or the last part at the page's end. */
function sectionInView() {
  const doc = document.documentElement;
  if (window.scrollY + window.innerHeight >= doc.scrollHeight - 4) return NAV_LINKS[NAV_LINKS.length - 1].id;
  let current: string | null = null;
  for (const { id } of NAV_LINKS) {
    const top = document.getElementById(id)?.getBoundingClientRect().top;
    if (top !== undefined && top <= window.innerHeight * 0.35) current = id;
  }
  return current;
}

/**
 * Clear over the hero at first, so it shares the hero's wash; white and pinned to the top once the page scrolls.
 * The link for the part being read is underlined.
 */
function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 8);
      setCurrent(sectionInView());
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 border-b transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? "border-[#e3eef0] bg-white shadow-[0_6px_20px_-14px_rgb(14_59_70/0.35)]"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-7 text-[0.9375rem] font-medium text-[var(--l-muted)] lg:flex">
          {NAV_LINKS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={current === id ? "location" : undefined}
              className={`relative py-1 transition-colors hover:text-[var(--l-teal-deep)] after:absolute after:inset-x-0 after:-bottom-1 after:h-[2px] after:rounded-full after:bg-[var(--l-teal)] after:transition-transform after:duration-300 ${
                current === id ? "text-[var(--l-teal-deep)] after:scale-x-100" : "after:scale-x-0"
              }`}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden rounded-full border border-[#c6d5d8] px-4 py-2 text-[0.9375rem] font-medium text-[var(--l-teal-deep)] hover:bg-[var(--l-mist)] sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            to="/give"
            className="inline-flex rounded-full bg-[var(--l-teal-deep)] px-4 py-2 text-[0.9375rem] font-semibold text-white shadow-[0_6px_16px_-6px_rgb(14_59_70/0.6)] hover:bg-[var(--l-teal)]"
          >
            Give
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  return (
    <section className="landing-hero relative overflow-hidden px-4 pb-14 pt-[100px] sm:px-6 sm:pt-[116px]">

      <div className="text-center">
        <h1 className="landing-display mx-auto max-w-[900px] text-[2.75rem] leading-[1.08] text-[var(--l-ink)] sm:text-[4.5rem]">
          <span className="landing-in block">Your church</span>
          <span className="landing-in block [animation-delay:120ms]">
            on the <span className="landing-mark landing-mark--in">cloud.</span>
          </span>
        </h1>
        <p className="landing-in mx-auto mt-6 max-w-[560px] [animation-delay:240ms] text-[1.0625rem] leading-relaxed text-[var(--l-muted)] sm:text-[1.125rem]">
          Sacramental records, certificate requests, the Mass schedule and offerings, kept safe in one place for
          Catholic parishes and the faithful they serve.
        </p>
        <div className="landing-in mt-8 flex flex-col items-center justify-center gap-3 [animation-delay:340ms] sm:flex-row">
          <Link
            to="/login"
            className="inline-flex min-h-[52px] items-center rounded-full bg-[var(--l-teal-deep)] px-7 text-[1rem] font-semibold text-white shadow-[0_10px_24px_-10px_rgb(14_59_70/0.7)] hover:bg-[var(--l-teal)]"
          >
            Find your parish
          </Link>
          <Link
            to="/give"
            className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-white px-6 text-[1rem] font-medium text-[var(--l-teal-deep)] ring-1 ring-[#c6d5d8] hover:bg-[var(--l-mist)]"
          >
            <HeartIcon />
            Give or offer a Mass
          </Link>
        </div>
        <ul className="landing-in mx-auto mt-9 flex max-w-[1000px] flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[0.875rem] text-[var(--l-muted)] [animation-delay:420ms]">
          {HERO_FACTS.map((fact) => (
            <li key={fact.label} className="inline-flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] text-[var(--l-teal)]" aria-hidden="true">
                <path d={fact.icon} />
              </svg>
              {fact.label}
            </li>
          ))}
          <li>
            <a href="#verify" className="font-semibold text-[var(--l-teal)] underline-offset-2 hover:underline">
              Got a certificate? Check it
            </a>
          </li>
        </ul>
      </div>

      <ProductStage />
    </section>
  );
}

// True things about HolyApp, in place of compliance badges we don't hold.
const HERO_FACTS = [
  { icon: "M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h4", label: "Data Privacy Act 2012" },
  { icon: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2z", label: "Certificates checked by QR code" },
  { icon: "M4 20V9l8-5 8 5v11M9 20v-6h6v6M3 20h18", label: "Each parish's records kept separate" },
  { icon: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2", label: "No app to download" },
];

/** The parish dashboard on a laptop, the parishioner portal on a phone, and small cards around them. */
function ProductStage() {
  return (
    <div className="relative mx-auto mt-10 max-w-[1080px] pb-6 sm:mt-12">
      {/* A soft arch behind the laptop, like light through a chapel window. */}
      <div className="landing-arch absolute inset-x-[4%] bottom-0 top-[12%] rounded-t-full" aria-hidden="true" />

      <figure className="landing-in-stage relative mx-auto w-[92%] max-w-[860px]">
        <div className="rounded-t-[18px] bg-[#132a30] p-[2.2%] pb-[1.6%] shadow-[0_40px_80px_-30px_rgb(14_59_70/0.6)]">
          <div className="mx-auto mb-[1.2%] h-1.5 w-1.5 rounded-full bg-[#2c454b]" aria-hidden="true" />
          <img
            src="/landing/admin-dashboard.png"
            alt="The HolyApp parish dashboard: pending requests, today's Masses and recent activity"
            className="block aspect-[16/10] w-full rounded-[6px] object-cover object-top"
            loading="eager"
          />
        </div>
        <div className="relative -mx-[6%] h-[14px] rounded-b-[14px] bg-gradient-to-b from-[#dfe7e9] to-[#b9c6c9] shadow-[0_18px_30px_-14px_rgb(14_59_70/0.45)] sm:h-[18px]" aria-hidden="true">
          <span className="absolute left-1/2 top-0 h-[6px] w-[16%] -translate-x-1/2 rounded-b-lg bg-[#c4d0d3]" />
        </div>
        <figcaption className="sr-only">The parish office dashboard in HolyApp</figcaption>
      </figure>

      <figure className="absolute -bottom-2 right-[2%] w-[24%] max-w-[170px] sm:right-[6%] md:bottom-[-4%]">
        <div className="rounded-[26px] bg-[#132a30] p-[5px] shadow-[0_30px_50px_-20px_rgb(14_59_70/0.7)] sm:rounded-[30px] sm:p-[6px]">
          <img
            src="/landing/portal-phone.png"
            alt="The parishioner portal on a phone, listing certificate requests"
            className="block aspect-[9/19.5] w-full rounded-[21px] object-cover object-top sm:rounded-[24px]"
          />
        </div>
      </figure>

      <FloatCard className="left-[0%] top-[18%] w-[210px]">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--l-mist)] text-[var(--l-teal)]">
            <CheckIcon />
          </span>
          <div>
            <p className="text-[0.875rem] font-semibold text-[var(--l-ink)]">Certificate of Baptism</p>
            <p className="text-[0.8125rem] text-[var(--l-teal)]">Ready for release</p>
          </div>
        </div>
      </FloatCard>

      <FloatCard className="left-[3%] top-[56%] w-[190px] !bg-[var(--l-gold)] [animation-delay:2s]">
        <p className="text-[0.8125rem] font-medium text-[var(--l-teal-deep)]/80">Mass intentions this Sunday</p>
        <div className="mt-2 flex items-end gap-3">
          <span className="landing-display text-[2.25rem] leading-none text-[var(--l-teal-deep)]">12</span>
          <span className="mb-1 flex items-end gap-1" aria-hidden="true">
            {[14, 22, 10, 28].map((h) => (
              <span key={h} className="w-2 rounded-sm bg-[var(--l-teal-deep)]" style={{ height: h }} />
            ))}
          </span>
        </div>
      </FloatCard>

      <FloatCard className="right-[0%] top-[8%] w-[200px] !bg-[#dff3f1] [animation-delay:1s]">
        <p className="text-[0.8125rem] font-medium text-[var(--l-teal)]">Gift received · GCash</p>
        <p className="landing-display mt-1.5 text-[1.875rem] leading-none text-[var(--l-teal-deep)]">₱500.00</p>
        <p className="mt-2 inline-flex rounded-full bg-white px-2.5 py-0.5 text-[0.75rem] font-semibold text-[var(--l-teal-deep)]">
          Receipt sent
        </p>
      </FloatCard>

      <FloatCard className="right-[19%] top-[48%] w-auto !rounded-full !px-4 !py-2 [animation-delay:3s]">
        <span className="flex items-center gap-2 text-[0.8125rem] font-semibold text-[var(--l-teal-deep)]">
          <span className="h-2 w-2 rounded-full bg-[var(--l-gold)]" />
          Sun 6:00 AM · Holy Mass
        </span>
      </FloatCard>
    </div>
  );
}

function FloatCard({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      className={`landing-deco absolute z-10 hidden rounded-2xl bg-white p-4 shadow-[0_20px_40px_-18px_rgb(14_59_70/0.45)] ring-1 ring-black/5 lg:block ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

/* ---------- Feature boxes ---------- */

type FeatureBox = { title: string; body: string; icon: string };

// 24×24 stroke icons, one path string each.
const ICONS = {
  book: "M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2Zm0 0A2 2 0 0 0 6 21h14M12 7v6M9 10h6",
  scan: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 9h8M8 12h8M8 15h5",
  inbox: "M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6Z",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M14 18h2v2M18 18h2v2h-2",
  calendar: "M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1ZM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2",
  candle: "M12 3c1.5 2 2 3 2 4a2 2 0 0 1-4 0c0-1 .5-2 2-4ZM9 11h6v10H9zM6 21h12",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  rings: "M9 15a5 5 0 1 0 0-.01M15 15a5 5 0 1 0 0-.01M12 4l1.5 2h-3Z",
  people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3 20a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M17 14a5 5 0 0 1 4 6",
  request: "M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM14 3v5h5M9 13h6M9 17h4",
  track: "M5 12l4 4L19 6",
  wallet: "M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2ZM16 14.5h.01",
  gift: "M4 10h16v10H4zM2 7h20v3H2zM12 7v13M12 7c-1.5-3-5-3-5-1s3 1 5 1Zm0 0c1.5-3 5-3 5-1s-3 1-5 1Z",
  timeline: "M6 4v16M6 7h.01M6 12h.01M6 17h.01M10 7h9M10 12h7M10 17h8",
} as const;

const OFFICE_FEATURES: (FeatureBox & { icon: keyof typeof ICONS })[] = [
  { icon: "book", title: "Sacramental registers", body: "Baptism, confirmation, marriage and death records, each with its book, page and entry." },
  { icon: "scan", title: "Digitized ledgers", body: "Scan the old register books so a page can be found in seconds, not hours." },
  { icon: "inbox", title: "Certificate requests", body: "Find the record, issue the certificate and release it, for online and walk-in requests." },
  { icon: "qr", title: "QR-verified certificates", body: "Every certificate carries a code anyone can scan to check it is genuine." },
  { icon: "calendar", title: "Parish calendar", body: "Masses, weddings, baptisms and blessings, with a warning when a priest or place is double-booked." },
  { icon: "candle", title: "Mass intentions", body: "See every intention per Mass and print the list for the presider." },
  { icon: "heart", title: "Donations and receipts", body: "Record cash gifts, receive GCash online, and print a receipt for every one." },
  { icon: "rings", title: "Marriage preparation", body: "Follow each couple through documents, interview, Pre-Cana and the banns." },
  { icon: "people", title: "Staff and reports", body: "Keep the list of priests and staff, and see monthly reports at a glance." },
];

const PARISHIONER_FEATURES: (FeatureBox & { icon: keyof typeof ICONS })[] = [
  { icon: "request", title: "Request a certificate", body: "Ask for a baptismal, confirmation, marriage or death certificate from home." },
  { icon: "track", title: "Follow your request", body: "See when it is received, being prepared, and ready to pick up." },
  { icon: "wallet", title: "Certificate wallet", body: "Keep released certificates on your phone, ready to show or share." },
  { icon: "gift", title: "Give to the parish", body: "Give through GCash in a few taps. No account needed." },
  { icon: "candle", title: "Offer a Mass", body: "Request a Mass for thanksgiving, healing, or in memory of a loved one." },
  { icon: "timeline", title: "Your sacramental timeline", body: "Your baptism, confirmation and marriage on the parish's records, in one place." },
];

function ArrowButton({ dir, onClick, label }: { dir: "prev" | "next"; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--l-teal-deep)] ring-1 ring-[#d6e3e5] transition hover:bg-[var(--l-mist)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--l-teal-light)]"
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        {dir === "prev" ? <path d="M12 5l-5 5 5 5" /> : <path d="M8 5l5 5-5 5" />}
      </svg>
    </button>
  );
}

/**
 * A row of feature cards that runs the full width of the screen. On wide screens one card is open (its symbol,
 * title and description) and the rest sit beside it as short cards; clicking one, or the arrows, opens it. On phones
 * every card is open and the row swipes.
 */
function FeatureGroup({
  id,
  label,
  title,
  intro,
  features,
  tone,
}: {
  id: string;
  label: string;
  title: string;
  intro: string;
  features: (FeatureBox & { icon: keyof typeof ICONS })[];
  tone: "teal" | "gold";
}) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);
  const lastOpen = useRef(0);
  const moved = useRef(false);

  // Slide the row so the open card lines up with the heading. Only the row scrolls, never the page, and not on
  // first load. The card that was open is still shrinking, so count it at a closed card's width.
  useEffect(() => {
    const previous = lastOpen.current;
    lastOpen.current = active;
    const list = listRef.current;
    const cards = cardRefs.current;
    if (!moved.current || !list || !cards[0] || !cards[active]) return;
    let left = cards[active].offsetLeft - cards[0].offsetLeft;
    const closed = cards.find((card, i) => card && i !== active && i !== previous);
    if (previous < active && cards[previous] && closed) left -= cards[previous].offsetWidth - closed.offsetWidth;
    list.scrollTo({ left, behavior: "smooth" });
  }, [active]);

  function open(index: number) {
    moved.current = true;
    setActive((index + features.length) % features.length);
  }

  function step(delta: number) {
    moved.current = true;
    setActive((current) => (current + delta + features.length) % features.length);
  }

  const titleColour = tone === "teal" ? "text-[var(--l-teal)]" : "text-[#a87410]";
  const pill = tone === "teal" ? "bg-[var(--l-mist)] text-[var(--l-teal)]" : "bg-[var(--l-gold-soft)] text-[#8a5f0a]";

  return (
    <div id={id} data-reveal className="scroll-mt-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[640px]">
          <p className={`mb-4 inline-flex rounded-full px-3.5 py-1 text-[0.875rem] font-semibold ${pill}`}>{label}</p>
          <h2 className="landing-display text-[2rem] leading-[1.12] text-[var(--l-ink)] sm:text-[2.5rem]">{title}</h2>
          <p className="mt-3 text-[1.0625rem] leading-relaxed text-[var(--l-muted)]">{intro}</p>
        </div>
        <div className="flex gap-2">
          <ArrowButton dir="prev" onClick={() => step(-1)} label={`Previous: ${title}`} />
          <ArrowButton dir="next" onClick={() => step(1)} label={`Next: ${title}`} />
        </div>
      </div>

      {/* Breaks out of the page column to the screen's edges; the first card still lines up with the heading. */}
      {/* A fixed height, so opening a card never changes the length of the page. */}
      <ul
        ref={listRef}
        className="landing-carousel landing-bleed flex snap-x snap-mandatory items-center gap-3 overflow-x-auto pb-4 md:h-[396px] md:gap-4"
      >
        {features.map((f, i) => {
          const isOpen = i === active;
          const number = String(i + 1).padStart(2, "0");
          return (
            <li
              key={f.title}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className={`relative flex h-[400px] w-[84%] shrink-0 snap-start flex-col overflow-hidden rounded-[28px] p-6 transition-[width,height,background-color] duration-500 ease-out focus-within:ring-[3px] focus-within:ring-[var(--l-teal-light)] sm:w-[340px] md:p-7 ${
                isOpen ? "bg-[#eef5f5] md:h-[380px] md:w-[440px]" : "bg-[#eef5f5] md:h-[300px] md:w-[170px] md:hover:bg-[#e5f0f0]"
              }`}
            >
              {/* Open card: the symbol, then number, title and description. Always shown on phones. */}
              <div className={`flex h-full flex-col ${isOpen ? "" : "md:hidden"}`}>
                <div className="mx-auto h-[150px] w-[150px] shrink-0 md:h-[160px] md:w-[160px]">
                  <FeatureArt key={isOpen ? "open" : "closed"} name={f.icon} />
                </div>
                <div className="mt-auto pt-4">
                  <p className="text-[0.8125rem] font-bold uppercase tracking-[0.14em] text-[var(--l-muted)]">
                    {number} / {String(features.length).padStart(2, "0")}
                  </p>
                  <p className={`landing-display mt-2 text-[1.5rem] leading-[1.12] md:text-[1.75rem] ${titleColour}`}>{f.title}</p>
                  <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-[var(--l-muted)] md:text-[1rem]">{f.body}</p>
                </div>
              </div>

              {/* Closed card on wide screens: a small icon and the name, opens on click. */}
              <button
                type="button"
                onClick={() => open(i)}
                aria-label={`Show ${f.title}`}
                className={`hidden h-full flex-col items-start justify-end gap-5 text-left focus-visible:outline-none ${isOpen ? "" : "md:flex"}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-7 w-7 ${tone === "teal" ? "text-[var(--l-teal)]" : "text-[#a87410]"}`}
                  aria-hidden="true"
                >
                  <path d={ICONS[f.icon]} />
                </svg>
                <span className="landing-display text-[1.0625rem] leading-[1.3] text-[var(--l-ink)]">
                  {f.title}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- For parishioners ---------- */

const REQUEST_STEPS = [
  ["Request from home", "Find your parish, choose the certificate, and say what it's for."],
  ["Follow its progress", "See when the office receives it, prepares it, and has it ready for you."],
  ["Pick it up and keep it", "Collect the signed copy at the office. A copy stays in your wallet, with a QR code anyone can check."],
];

/** Everything for the faithful in one place: what they can do, how a request goes, and the way in. */
function ParishionerPart() {
  return (
    <section id="parishioners" aria-label="For parishioners" className="scroll-mt-16 px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-[1120px]">
        <FeatureGroup
          id="parishioner-features"
          label="For parishioners"
          title="Your parish, a tap away."
          intro="Request certificates, give and offer Masses from your phone. Nothing to download."
          features={PARISHIONER_FEATURES}
          tone="gold"
        />

        <div data-reveal className="mt-14">
          <h3 className="landing-display text-[1.5rem] leading-tight text-[var(--l-ink)]">How a certificate request works</h3>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {REQUEST_STEPS.map(([title, body], i) => (
              <li key={title} className="flex gap-4 rounded-[24px] bg-[var(--l-cream)] p-6 ring-1 ring-[#f0e7d2]">
                <span className="landing-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--l-gold-soft)] text-[1rem] text-[#8a5f0a]">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-[var(--l-ink)]">{title}</p>
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-[var(--l-muted)]">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div data-reveal className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Link
            to="/login"
            className="inline-flex min-h-[52px] items-center rounded-full bg-[var(--l-teal-deep)] px-7 text-[1rem] font-semibold text-white shadow-[0_10px_24px_-10px_rgb(14_59_70/0.7)] hover:bg-[var(--l-teal)]"
          >
            Find your parish
          </Link>
          <Link
            to="/give"
            className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-white px-6 text-[1rem] font-medium text-[var(--l-teal-deep)] ring-1 ring-[#c6d5d8] hover:bg-[var(--l-mist)]"
          >
            <HeartIcon />
            Give or offer a Mass
          </Link>
          <p className="text-[0.9375rem] text-[var(--l-muted)]">
            Giving needs no account.{" "}
            <Link to="/register" className="font-semibold text-[var(--l-teal)] underline-offset-2 hover:underline">
              Create an account
            </Link>{" "}
            to request certificates.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- For parish offices ---------- */

/** Everything for parish offices and dioceses in one place: what the office gets, how records stay safe, and how to start. */
function ParishPart() {
  return (
    <section id="parishes" aria-label="For parish offices and dioceses" className="scroll-mt-16 bg-[#f6fafa] px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-[1120px]">
        <FeatureGroup
          id="office-features"
          label="For parish offices and dioceses"
          title="Run the parish office in one place."
          intro="For the parish priest, secretary and staff, on any computer at the office."
          features={OFFICE_FEATURES}
          tone="teal"
        />
        <TrustBlock />
        <ForParishes />
      </div>
    </section>
  );
}

/* ---------- Verify a certificate ---------- */

/** The 32-character code from a verification link, or from the code on its own. */
function verificationCode(input: string) {
  return /[a-f0-9]{32}/.exec(input.trim().toLowerCase())?.[0] ?? null;
}

function VerifySection() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = verificationCode(value);
    if (!code) {
      setError("That isn't a verification link or code. Scan the QR code on the certificate, or copy the whole link.");
      return;
    }
    navigate(`/verify/${code}`);
  }

  return (
    <section id="verify" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
      <div data-reveal className="mx-auto grid max-w-[1060px] items-center gap-10 md:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="mb-4 text-[0.875rem] font-semibold text-[var(--l-teal)]">For schools, offices and other parishes</p>
          <h2 className="landing-display text-[2rem] leading-[1.12] sm:text-[2.5rem]">Check a certificate in seconds.</h2>
          <p className="mt-4 max-w-[460px] text-[1.0625rem] leading-relaxed text-[var(--l-muted)]">
            Every HolyApp certificate has a QR code. Scan it with your phone camera to see whether the issuing parish
            still stands behind it, and who it was issued to. No account needed.
          </p>
        </div>

        <div className="rounded-[28px] bg-[#f1f8f8] p-6 ring-1 ring-[#d9ecec] sm:p-8">
          <ol className="space-y-4">
            {[
              ["Scan the QR code", "Point your phone camera at the code in the certificate's corner and open the link."],
              ["Or paste the link", "If the certificate was sent to you, paste its verification link or code below."],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-3.5">
                <span className="landing-display flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[0.9375rem] text-[var(--l-teal)] ring-1 ring-[#d9ecec]">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-[var(--l-ink)]">{title}</p>
                  <p className="mt-0.5 text-[0.9375rem] leading-relaxed text-[var(--l-muted)]">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <form onSubmit={handleSubmit} className="mt-6" noValidate>
            <label htmlFor="verify-code" className="text-[0.9375rem] font-semibold text-[var(--l-ink)]">
              Verification link or code
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="verify-code"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError("");
                }}
                placeholder="Paste the link or code"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "verify-error" : undefined}
                className="min-h-[50px] min-w-0 flex-1 rounded-full border border-[#c6d5d8] bg-white px-5 text-[1rem] text-[var(--l-ink)] placeholder:text-[#8aa1a7] focus:border-[var(--l-teal)] focus:outline-none focus:ring-[3px] focus:ring-[var(--l-teal-light)]/60"
              />
              <button
                type="submit"
                className="min-h-[50px] shrink-0 rounded-full bg-[var(--l-teal-deep)] px-6 text-[1rem] font-semibold text-white hover:bg-[var(--l-teal)]"
              >
                Check certificate
              </button>
            </div>
            {error && (
              <p id="verify-error" role="alert" className="mt-2 text-[0.875rem] text-[#9b2c24]">
                {error}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

/* ---------- Privacy and security ---------- */

// 24×24 stroke icons for the trust cards.
const TRUST_POINTS: { icon: string; title: string; body: string }[] = [
  {
    icon: "M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4",
    title: "Only the right people",
    body: "Parishioners see only their own requests. Staff see what their role allows, and only the parish administrator can change a sacramental record.",
  },
  {
    icon: "M12 8v4l3 2M3.5 12a8.5 8.5 0 1 0 2.5-6M3 4v4h4",
    title: "Every change is recorded",
    body: "Edits to records, certificates and donations are logged with who made them and when.",
  },
  {
    icon: "M4 20V9l8-5 8 5v11M9 20v-6h6v6M3 20h18",
    title: "Each parish keeps its own records",
    body: "One parish can never see another parish's registers, requests or donations.",
  },
  {
    icon: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 15v2",
    title: "Passwords stay secret",
    body: "Passwords are stored scrambled, so no one can read them, not even HolyApp.",
  },
  {
    icon: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2z",
    title: "Certificates can't be faked",
    body: "Anyone can scan a certificate to check it against the register, and the parish can withdraw one that was issued in error.",
  },
  {
    icon: "M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h4",
    title: "Your data, your rights",
    body: "Under the Data Privacy Act of 2012 you can ask to see or correct the information kept about you.",
  },
];

function TrustBlock() {
  return (
    <div id="privacy" className="mt-20 scroll-mt-24">
      <div>
        <div data-reveal className="mb-10 max-w-[640px]">
          <h3 className="landing-display text-[1.75rem] leading-[1.15] text-[var(--l-ink)] sm:text-[2rem]">Kept safe, kept private.</h3>
          <p className="mt-3 text-[1.0625rem] leading-relaxed text-[var(--l-muted)]">
            Sacramental records are the parish's to keep and the faithful's to trust. HolyApp is built so they stay in
            the right hands.
          </p>
        </div>
        <ul data-reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST_POINTS.map((point) => (
            <li key={point.title} className="rounded-[24px] bg-white p-6 ring-1 ring-[#e3eef0]">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--l-mist)] text-[var(--l-teal)]" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                  <path d={point.icon} />
                </svg>
              </span>
              <p className="landing-display mt-4 text-[1.1875rem] leading-snug text-[var(--l-ink)]">{point.title}</p>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--l-muted)]">{point.body}</p>
            </li>
          ))}
        </ul>
        <p data-reveal className="mt-6 text-[0.9375rem] text-[var(--l-muted)]">
          Read how information is collected and used in our{" "}
          <Link to="/privacy" className="font-semibold text-[var(--l-teal)] underline-offset-2 hover:underline">
            privacy notice
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

/* ---------- For parishes and dioceses ---------- */

function ForParishes() {
  const mailto = `mailto:${HOLYAPP_CONTACT_EMAIL}?subject=${encodeURIComponent("Bringing HolyApp to our parish")}`;
  return (
    <div id="for-parishes" className="mt-16 scroll-mt-24">
      <div
        data-reveal
        className="grid gap-10 rounded-[32px] bg-white p-7 ring-1 ring-[#d9ecec] shadow-[0_20px_44px_-32px_rgb(14_59_70/0.45)] sm:p-12 md:grid-cols-[1.1fr_1fr]"
      >
        <div>
          <h3 className="landing-display text-[1.75rem] leading-[1.15] text-[var(--l-ink)] sm:text-[2rem]">Bring HolyApp to your parish.</h3>
          <p className="mt-4 max-w-[440px] text-[1.0625rem] leading-relaxed text-[var(--l-muted)]">
            Tell us about your parish and we'll help you get started: your registers, your staff, your certificate
            design and your fees. A diocese can see all its parishes in one place.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={mailto}
              className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[var(--l-teal-deep)] px-7 text-[1rem] font-semibold text-white shadow-[0_10px_24px_-10px_rgb(14_59_70/0.7)] hover:bg-[var(--l-teal)]"
            >
              Email us
            </a>
            <Link
              to="/super-admin/login"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-white px-6 text-[1rem] font-medium text-[var(--l-teal-deep)] ring-1 ring-[#c6d5d8] hover:bg-[var(--l-mist)]"
            >
              Diocese sign-in
            </Link>
          </div>
        </div>

        <ol className="space-y-5 self-center">
          {[
            ["Tell us about your parish", "Its name, address, and who will run the office."],
            ["Set up your parish", "Add staff accounts, your Mass schedule, service fees and certificate design."],
            ["Welcome the faithful online", "Parishioners find your parish, request certificates, give and offer Masses."],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-4 rounded-2xl bg-[#f6fafa] px-5 py-4 ring-1 ring-[#e3eef0]">
              <span className="landing-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--l-mist)] text-[1rem] text-[var(--l-teal)]">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-[var(--l-ink)]">{title}</p>
                <p className="mt-0.5 text-[0.9375rem] leading-relaxed text-[var(--l-muted)]">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ---------- Footer ---------- */

function SiteFooter() {
  return (
    <footer className="border-t border-[#e3eef0] px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-4 text-[0.875rem] text-[var(--l-muted)] sm:flex-row">
        <Logo />
        <p>Your church on the cloud.</p>
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a href="#verify" className="hover:text-[var(--l-teal-deep)]">Verify a certificate</a>
          <Link to="/privacy" className="hover:text-[var(--l-teal-deep)]">Privacy notice</Link>
          <a href={`mailto:${HOLYAPP_CONTACT_EMAIL}`} className="hover:text-[var(--l-teal-deep)]">Contact</a>
          <Link to="/super-admin/login" className="hover:text-[var(--l-teal-deep)]">Diocese sign-in</Link>
        </nav>
      </div>
    </footer>
  );
}

/* ---------- Icons ---------- */

function HeartIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M9.65 16.9 9.6 16.87a20.8 20.8 0 0 1-3.6-2.6C4.1 12.6 2 10.2 2 7.25 2 4.9 3.9 3 6.25 3c1.5 0 2.84.78 3.75 1.95A4.73 4.73 0 0 1 13.75 3C16.1 3 18 4.9 18 7.25c0 2.95-2.1 5.35-4 7.02a20.8 20.8 0 0 1-3.65 2.62l-.05.03a.75.75 0 0 1-.65 0Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
    </svg>
  );
}

