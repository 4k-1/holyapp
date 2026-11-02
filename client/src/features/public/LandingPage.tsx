import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
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
        <Features />
        <ParishOffice />
        <Feature
          id="parishioners"
          eyebrow="For parishioners"
          title={
            <>
              Request a certificate
              <br />
              from home.
            </>
          }
          tone="cream"
          items={[
            "Ask for a baptismal, confirmation, marriage or death certificate",
            "Follow your request from received to ready for release",
            "Keep released certificates in your own wallet, with a QR code anyone can verify",
          ]}
          art={<CertificateArt />}
        />
        <Feature
          id="giving"
          eyebrow="Giving and Mass intentions"
          title={
            <>
              Give and offer Masses,
              <br />
              no account needed.
            </>
          }
          tone="mist"
          items={[
            "Give to your parish through GCash in a few taps",
            "Offer a Mass for thanksgiving, healing, or in memory of a loved one",
            "Every gift gets a receipt, and the parish office sees it right away",
          ]}
          art={<GivingArt />}
          reverse
        />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ---------- Header ---------- */

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5 no-underline">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-[0_2px_8px_rgb(14_59_70/0.12)]">
        <img src="/holyapp-logo.webp" alt="" className="h-9 w-9" />
      </span>
      <span className={`text-[1.25rem] font-bold tracking-tight ${light ? "text-white" : "text-[var(--l-teal-deep)]"}`}>HolyApp</span>
    </Link>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e3eef0]/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-7 text-[0.9375rem] font-medium text-[var(--l-muted)] md:flex">
          <a href="#features-office" className="hover:text-[var(--l-teal-deep)]">For parishes</a>
          <a href="#features-parishioners" className="hover:text-[var(--l-teal-deep)]">For parishioners</a>
          <a href="#giving" className="hover:text-[var(--l-teal-deep)]">Giving</a>
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
    <section className="landing-hero relative overflow-hidden px-4 pb-14 pt-8 sm:px-6 sm:pt-12">

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
      </div>

      <ProductStage />
    </section>
  );
}

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

function Line({ w, className = "" }: { w: string; className?: string }) {
  return <span className={`block h-2.5 rounded-full ${w} ${className}`} />;
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
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
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

function FeatureIcon({ name, tone, large = false }: { name: keyof typeof ICONS; tone: "teal" | "gold"; large?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${large ? "h-24 w-24 rounded-[28px]" : "h-12 w-12 rounded-2xl"} ${
        tone === "teal" ? "bg-[var(--l-mist)] text-[var(--l-teal)]" : "bg-[var(--l-gold-soft)] text-[#9a6f0c]"
      }`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={large ? 1.5 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={large ? "h-11 w-11" : "h-6 w-6"}
      >
        <path d={ICONS[name]} />
      </svg>
    </span>
  );
}

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
 * A row of feature cards. On wide screens one card is open (big icon, title and description) and the rest sit
 * beside it as narrow cards; clicking one, or the arrows, opens it. On phones every card is open and the row swipes.
 */
function FeatureGroup({
  id,
  title,
  intro,
  features,
  tone,
}: {
  id: string;
  title: string;
  intro: string;
  features: (FeatureBox & { icon: keyof typeof ICONS })[];
  tone: "teal" | "gold";
}) {
  const [active, setActive] = useState(0);
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);
  const moved = useRef(false);

  // Bring the open card into view, but not on first load, which would scroll the page.
  useEffect(() => {
    if (!moved.current) return;
    cardRefs.current[active]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [active]);

  function open(index: number) {
    moved.current = true;
    setActive((index + features.length) % features.length);
  }

  function step(delta: number) {
    moved.current = true;
    setActive((current) => (current + delta + features.length) % features.length);
  }

  return (
    <div id={id} data-reveal className="scroll-mt-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[640px]">
          <h3 className="landing-display text-[1.875rem] leading-[1.15] text-[var(--l-ink)] sm:text-[2.25rem]">{title}</h3>
          <p className="mt-3 text-[1.0625rem] leading-relaxed text-[var(--l-muted)]">{intro}</p>
        </div>
        <div className="flex gap-2">
          <ArrowButton dir="prev" onClick={() => step(-1)} label={`Previous: ${title}`} />
          <ArrowButton dir="next" onClick={() => step(1)} label={`Next: ${title}`} />
        </div>
      </div>

      <ul className="landing-carousel -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
        {features.map((f, i) => {
          const isOpen = i === active;
          const number = String(i + 1).padStart(2, "0");
          return (
            <li
              key={f.title}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className={`relative flex w-[82%] shrink-0 snap-start focus-within:ring-[3px] focus-within:ring-[var(--l-teal-light)] flex-col rounded-[28px] p-6 transition-[width,background-color,box-shadow] duration-500 ease-out sm:w-[340px] md:h-[400px] md:p-7 ${
                isOpen
                  ? "bg-white shadow-[0_1px_2px_rgb(14_59_70/0.05),0_24px_48px_-28px_rgb(14_59_70/0.45)] ring-1 ring-[#e3eef0] md:w-[440px]"
                  : "bg-[#eef5f5] ring-1 ring-[#e3eef0] md:w-[150px] md:hover:bg-[#e6f1f1]"
              }`}
            >
              {/* Open card: big icon, number, title and description. Always shown on phones. */}
              <div className={`flex h-full flex-col ${isOpen ? "" : "md:hidden"}`}>
                <FeatureIcon name={f.icon} tone={tone} large />
                <div className="mt-auto pt-8">
                  <p className="text-[0.875rem] font-bold text-[var(--l-teal)]">{number}</p>
                  <p className="landing-display mt-2 text-[1.625rem] leading-[1.15] text-[var(--l-ink)] md:text-[1.875rem]">{f.title}</p>
                  <p className="mt-3 text-[1rem] leading-relaxed text-[var(--l-muted)]">{f.body}</p>
                </div>
              </div>

              {/* Closed card on wide screens: small icon and the name, opens on click. */}
              <button
                type="button"
                onClick={() => open(i)}
                aria-label={`Show ${f.title}`}
                className={`hidden h-full flex-col items-start text-left focus-visible:outline-none ${isOpen ? "" : "md:flex"}`}
              >
                <FeatureIcon name={f.icon} tone={tone} />
                <span className="mt-auto">
                  <span className="block text-[0.8125rem] font-bold text-[var(--l-teal)]">{number}</span>
                  <span className="mt-1.5 block text-[0.9375rem] font-bold leading-snug text-[var(--l-ink)]">{f.title}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-20 bg-[#f6fafa] px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-[1120px]">
        <div data-reveal className="mx-auto mb-14 max-w-[680px] text-center">
          <h2 id="features-title" className="landing-display text-[2.25rem] leading-[1.1] sm:text-[2.875rem]">
            Everything your parish needs
          </h2>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-[var(--l-muted)] sm:text-[1.125rem]">
            One system for the parish office, and a simple portal for the faithful.
          </p>
        </div>
        <div className="space-y-16">
          <FeatureGroup
            id="features-office"
            title="Run the parish office in one place"
            intro="For the parish priest, secretary and staff, on any computer at the office."
            features={OFFICE_FEATURES}
            tone="teal"
          />
          <FeatureGroup
            id="features-parishioners"
            title="The parish, a tap away"
            intro="For the faithful, on any phone. Nothing to download."
            features={PARISHIONER_FEATURES}
            tone="gold"
          />
        </div>
      </div>
    </section>
  );
}

/* ---------- For the parish office ---------- */

function ParishOffice() {
  const parts = [
    ["Records", "Baptism, confirmation, marriage and death registers", "border-[var(--l-teal)]"],
    ["Requests", "Certificates from request to release", "border-[var(--l-gold)]"],
    ["Schedule", "Masses, weddings and blessings without clashes", "border-[var(--l-teal-mid)]"],
    ["Donations", "Gifts and receipts, at the office or online", "border-[var(--l-teal-light)]"],
  ];
  return (
    <section id="parish-office" className="scroll-mt-20 px-4 pb-24 sm:px-6">
      <div data-reveal className="mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[1fr_1.05fr_0.9fr]">
        <div>
          <h2 className="landing-display text-[2.25rem] leading-[1.1] sm:text-[2.875rem]">Every register, one place.</h2>
          <p className="mt-5 max-w-[420px] text-[1.0625rem] leading-relaxed text-[var(--l-muted)]">
            Whether you are looking up a baptism from 1987 or getting Saturday's weddings ready, everyone in the office
            sees the same records and the same calendar.
          </p>
        </div>

        <div className="rounded-[28px] bg-[var(--l-cream)] p-6 shadow-[0_20px_44px_-28px_rgb(14_59_70/0.45)] ring-1 ring-[#f0e7d2]">
          <div className="mb-5 flex items-center gap-2.5">
            <img src="/holyapp-logo.webp" alt="" className="h-7 w-7" />
            <span className="text-[1.0625rem] font-semibold text-[var(--l-teal-deep)]">Parish office</span>
            <span className="ml-auto flex -space-x-2" aria-hidden="true">
              {["FJ", "IS", "SH"].map((who, i) => (
                <span
                  key={who}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[0.6875rem] font-bold ring-2 ring-[var(--l-cream)] ${
                    ["bg-[var(--l-teal)] text-white", "bg-[var(--l-gold)] text-[var(--l-teal-deep)]", "bg-[var(--l-teal-light)] text-[var(--l-teal-deep)]"][i]
                  }`}
                >
                  {who}
                </span>
              ))}
            </span>
          </div>
          <div className="space-y-3" aria-hidden="true">
            <div className="flex gap-2">
              <Line w="w-1/3" className="bg-[#efe6cf]" />
              <Line w="w-1/5" className="bg-[#efe6cf]" />
            </div>
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 ${row === 1 ? "bg-[var(--l-gold-soft)] ring-1 ring-[#f3dd9f]" : "bg-white"}`}
              >
                <span className={`h-8 w-8 shrink-0 rounded-xl ${row === 1 ? "bg-white" : "bg-[var(--l-mist)]"}`} />
                <Line w={row === 1 ? "w-1/2" : "w-2/5"} className={row === 1 ? "bg-white" : "bg-[#e3eef0]"} />
                <Line w="w-1/5" className={row === 1 ? "bg-white" : "bg-[#e3eef0]"} />
              </div>
            ))}
          </div>
        </div>

        <ul className="space-y-6">
          {parts.map(([name, note, ring]) => (
            <li key={name} className="flex gap-3.5">
              <span className={`mt-1 h-5 w-5 shrink-0 rounded-full border-[3px] ${ring}`} aria-hidden="true" />
              <div>
                <p className="text-[1.1875rem] font-semibold text-[var(--l-ink)]">{name}</p>
                <p className="mt-0.5 text-[0.9375rem] text-[var(--l-muted)]">{note}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Feature panels ---------- */

function Feature({
  id,
  eyebrow,
  title,
  items,
  art,
  tone,
  reverse = false,
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  items: string[];
  art: ReactNode;
  tone: "cream" | "mist";
  reverse?: boolean;
}) {
  const bg = tone === "cream" ? "bg-[var(--l-cream)] ring-[#f0e7d2]" : "bg-[#f1f8f8] ring-[#d9ecec]";
  return (
    <section id={id} className="scroll-mt-20 px-4 pb-8 sm:px-6">
      <div
        data-reveal
        className={`mx-auto grid max-w-[1060px] items-center gap-10 rounded-[32px] p-7 ring-1 sm:p-12 md:grid-cols-[1.2fr_1fr] ${bg}`}
      >
        <div className={reverse ? "md:order-2" : ""}>
          <p className="mb-4 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-[var(--l-teal)]">{eyebrow}</p>
          <h2 className="landing-display text-[2rem] leading-[1.12] sm:text-[2.5rem]">{title}</h2>
          <ul className="mt-7 space-y-3">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_1px_2px_rgb(14_59_70/0.06)]">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--l-teal)] text-white" aria-hidden="true">
                  <CheckIcon />
                </span>
                <span className="text-[1rem] leading-snug text-[var(--l-ink)]">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={reverse ? "md:order-1" : ""}>{art}</div>
      </div>
    </section>
  );
}

function CertificateArt() {
  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-[320px] rounded-[26px] bg-gradient-to-br from-[#17707f] via-[#0f5262] to-[#0a3a46] p-6 shadow-[0_24px_48px_-20px_rgb(14_59_70/0.7)]" aria-hidden="true">
      <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-[var(--l-gold)]/90 blur-2xl" />
      <div className="relative flex h-full flex-col rounded-2xl bg-white p-5 shadow-xl">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--l-mist)]">
          <img src="/holyapp-logo.webp" alt="" className="h-8 w-8" />
        </div>
        <p className="landing-display mt-3 text-center text-[1.125rem] leading-tight text-[var(--l-teal-deep)]">Certificate of Baptism</p>
        <div className="mx-auto mt-2 h-px w-16 bg-[var(--l-gold)]" />
        <div className="mt-5 space-y-2.5">
          <Line w="w-full" className="bg-[#e3eef0]" />
          <Line w="w-5/6" className="bg-[#e3eef0]" />
          <Line w="w-2/3" className="bg-[#e3eef0]" />
        </div>
        <div className="mt-auto flex items-end justify-between">
          <div className="space-y-1.5">
            <Line w="w-20" className="bg-[#e3eef0]" />
            <Line w="w-14" className="bg-[#e3eef0]" />
          </div>
          <QrMark />
        </div>
      </div>
    </div>
  );
}

function GivingArt() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] space-y-4" aria-hidden="true">
      <div className="rounded-[24px] bg-[var(--l-teal)] p-6 text-white shadow-[0_24px_48px_-20px_rgb(14_59_70/0.7)]">
        <p className="text-[0.875rem] font-medium opacity-80">Gift to the parish</p>
        <p className="landing-display mt-1 text-[2.25rem] leading-none">₱500.00</p>
        <div className="mt-5 flex gap-2">
          {["₱100", "₱500", "₱1,000"].map((amount, i) => (
            <span
              key={amount}
              className={`rounded-full px-3.5 py-1.5 text-[0.875rem] font-semibold ${i === 1 ? "bg-white text-[var(--l-teal-deep)]" : "bg-white/15"}`}
            >
              {amount}
            </span>
          ))}
        </div>
      </div>
      <div className="ml-8 rotate-2 rounded-[24px] bg-white p-5 shadow-[0_18px_40px_-20px_rgb(14_59_70/0.5)] ring-1 ring-[#e3eef0]">
        <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-[var(--l-gold)]">Mass intention</p>
        <p className="mt-1.5 text-[1.0625rem] font-semibold text-[var(--l-ink)]">For the soul of Lola Remedios</p>
        <p className="mt-1 text-[0.875rem] text-[var(--l-muted)]">Sunday · 6:00 AM Mass</p>
      </div>
    </div>
  );
}

/* ---------- Closing and footer ---------- */

function Closing() {
  return (
    <section className="px-4 pb-20 pt-16 sm:px-6">
      <div data-reveal className="relative mx-auto max-w-[1060px] overflow-hidden rounded-[32px] bg-gradient-to-br from-[#17707f] via-[#0f5262] to-[#0a3a46] px-7 py-14 text-center text-white sm:px-12">
        <div className="absolute -left-10 -top-10 h-44 w-44 rounded-full bg-[var(--l-teal-light)]/25 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-12 -right-6 h-40 w-40 rounded-full bg-[var(--l-gold)]/30 blur-3xl" aria-hidden="true" />
        <h2 className="landing-display relative text-[2rem] leading-[1.12] sm:text-[2.75rem]">
          Your parish, a tap away.
        </h2>
        <p className="relative mx-auto mt-4 max-w-[520px] text-[1.0625rem] leading-relaxed text-white/80">
          Choose your parish to sign in, request a certificate, or see what's coming up this week.
        </p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/login"
            className="inline-flex min-h-[52px] items-center rounded-full bg-white px-7 text-[1rem] font-semibold text-[var(--l-teal-deep)] hover:bg-[var(--l-mist)]"
          >
            Find your parish
          </Link>
          <Link
            to="/register"
            className="inline-flex min-h-[52px] items-center rounded-full px-6 text-[1rem] font-medium text-white ring-1 ring-white/40 hover:bg-white/10"
          >
            Create an account
          </Link>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[#e3eef0] px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-4 text-[0.875rem] text-[var(--l-muted)] sm:flex-row">
        <Logo />
        <p>Your church on the cloud.</p>
        <Link to="/super-admin/login" className="hover:text-[var(--l-teal-deep)]">
          Diocese sign-in
        </Link>
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

function QrMark() {
  const cells = [1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1];
  return (
    <span className="grid h-12 w-12 grid-cols-5 gap-[2px] rounded-md bg-white p-1 ring-1 ring-[#e3eef0]">
      {cells.map((on, i) => (
        <span key={i} className={on ? "bg-[var(--l-teal-deep)]" : ""} />
      ))}
    </span>
  );
}
