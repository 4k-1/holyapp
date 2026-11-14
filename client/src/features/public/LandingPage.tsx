import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { verificationCode } from "@/features/verification/verificationCode";
import { HOLYAPP_CONTACT_EMAIL } from "./contact";
import { BookDemoDialog } from "./BookDemoDialog";
import { Cloud } from "./Cloud";
import { ParishIcon, type ParishIconName } from "./ParishIcons";
import "./landing.css";

/** HolyApp's front door: what it is, who it's for, and the way into a parish. */
export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  // Sections fade up as they scroll into view, and the cards in a group follow one another. The hidden start
  // only applies once this runs, so nothing stays invisible if it doesn't.
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
    root.querySelectorAll<HTMLElement>("[data-stagger]").forEach((group) => {
      Array.from(group.children).forEach((child, i) => (child as HTMLElement).style.setProperty("--i", String(i)));
    });
    root.classList.add("landing--reveal");
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="landing min-h-screen">
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />
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
  { id: "how-it-works", label: "How it works" },
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
            className="landing-btn hidden rounded-full border border-[#c6d5d8] px-4 py-2 text-[0.9375rem] font-medium text-[var(--l-teal-deep)] hover:bg-[var(--l-mist)] sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            to="/give"
            className="landing-btn inline-flex rounded-full bg-[var(--l-teal-deep)] px-4 py-2 text-[0.9375rem] font-semibold text-white shadow-[0_6px_16px_-6px_rgb(14_59_70/0.6)] hover:bg-[var(--l-teal)]"
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
      {/* High clouds behind the headline. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <Cloud className="left-[-9%] top-[5%] w-[44vw] max-w-[560px] opacity-90" drift={70} />
        <Cloud className="right-[-10%] top-[1%] w-[40vw] max-w-[520px] opacity-80" drift={85} delay={-30} flip />
        <Cloud className="right-[13%] top-[24%] hidden w-[15vw] max-w-[200px] opacity-70 sm:block" drift={60} delay={-12} />
        <Cloud className="left-[9%] top-[33%] hidden w-[12vw] max-w-[170px] opacity-60 sm:block" drift={75} delay={-45} flip />
      </div>

      <div className="relative text-center">
        <h1 className="landing-display mx-auto max-w-[900px] text-[2.75rem] leading-[1.08] text-[var(--l-ink)] sm:text-[4.5rem]">
          <span className="landing-in block">Your church</span>
          <span className="landing-in block [animation-delay:120ms]">
            on the <span className="landing-mark landing-mark--in">cloud.</span>
          </span>
        </h1>
        <p className="landing-in mx-auto mt-6 max-w-[560px] [animation-delay:240ms] text-[1.0625rem] leading-relaxed text-[var(--l-muted)] sm:text-[1.125rem]">
          Sacramental records, certificate requests, the Mass schedule and offerings, kept safe in one place for
          Catholic parishes in the Philippines and the faithful they serve.
        </p>
        <div className="landing-in mt-8 flex flex-col items-center justify-center gap-3 [animation-delay:340ms] sm:flex-row">
          <Link
            to="/login"
            className="landing-btn inline-flex min-h-[52px] items-center gap-2 rounded-full bg-[var(--l-teal-deep)] px-7 text-[1rem] font-semibold text-white shadow-[0_10px_24px_-10px_rgb(14_59_70/0.7)] hover:bg-[var(--l-teal)]"
          >
            Find your parish
            <ArrowIcon />
          </Link>
          <Link
            to="/give"
            className="landing-btn inline-flex min-h-[52px] items-center gap-2 rounded-full bg-white px-6 text-[1rem] font-medium text-[var(--l-teal-deep)] ring-1 ring-[#c6d5d8] hover:bg-[var(--l-mist)]"
          >
            <HeartIcon />
            Give or offer a Mass
          </Link>
        </div>
        <ul className="landing-in mx-auto mt-9 flex max-w-[1000px] flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[0.875rem] text-[var(--l-muted)] [animation-delay:420ms]">
          {HERO_FACTS.map((fact) => (
            <li key={fact.label} className="inline-flex items-center gap-2">
              <ParishIcon name={fact.icon} size={20} />
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
      {/* The clouds settle into the white page below. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-16 bg-gradient-to-b from-white/0 to-white sm:h-24" aria-hidden="true" />
    </section>
  );
}

// True things about HolyApp, in place of compliance badges we don't hold.
const HERO_FACTS: { icon: ParishIconName; label: string }[] = [
  { icon: "shield", label: "Data Privacy Act 2012" },
  { icon: "qr", label: "Certificates checked by QR code" },
  { icon: "church", label: "Each parish's records kept separate" },
  { icon: "phone", label: "No app to download" },
];

/** The parish dashboard on a laptop, the parishioner portal on a phone, and small cards around them. */
function ProductStage() {
  return (
    <div className="relative mx-auto mt-10 max-w-[1080px] pb-6 sm:mt-12">
      {/* A bank of cloud behind the laptop. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <Cloud className="left-[-30%] top-[14%] w-[52%]" drift={65} delay={-20} />
        <Cloud className="right-[-30%] top-[38%] w-[52%]" drift={80} delay={-50} flip />
      </div>
      {/* Low clouds behind the laptop and phone, so the screens stay clear. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[-4%] h-[40%]" aria-hidden="true">
        <Cloud className="bottom-[-30%] left-[-26%] w-[54%]" drift={55} delay={-10} />
        <Cloud className="bottom-[-26%] left-[16%] w-[66%]" drift={70} delay={-35} flip />
        <Cloud className="bottom-[-12%] right-[-26%] w-[58%]" drift={60} delay={-25} />
      </div>

      <figure className="landing-in-stage relative z-10 mx-auto w-[92%] max-w-[860px]">
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

      <figure className="landing-in-phone absolute -bottom-2 right-[2%] z-10 w-[24%] max-w-[170px] sm:right-[6%] md:bottom-[-4%]">
        <div className="rounded-[26px] bg-[#132a30] p-[5px] shadow-[0_30px_50px_-20px_rgb(14_59_70/0.7)] sm:rounded-[30px] sm:p-[6px]">
          <img
            src="/landing/portal-phone.png"
            alt="The parishioner portal on a phone, listing certificate requests"
            className="block aspect-[9/19.5] w-full rounded-[21px] object-cover object-top sm:rounded-[24px]"
          />
        </div>
      </figure>

      <FloatCard order={1} side="left" className="left-[0%] top-[18%] w-[210px]">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--l-mist)] text-[var(--l-teal)]">
            <CheckIcon />
          </span>
          <div>
            <p className="text-[0.875rem] font-semibold text-[var(--l-ink)]">Baptismal certificate</p>
            <p className="text-[0.8125rem] text-[var(--l-teal)]">Ready for release</p>
          </div>
        </div>
      </FloatCard>

      <FloatCard order={2} side="left" className="left-[3%] top-[56%] w-[190px] !bg-[var(--l-gold)]">
        <p className="text-[0.8125rem] font-medium text-[var(--l-teal-deep)]/80">Mass intentions this Sunday</p>
        <div className="mt-2 flex items-end gap-3">
          <span className="landing-display text-[2.25rem] leading-none text-[var(--l-teal-deep)]">12</span>
          <span className="mb-1 flex items-end gap-1" aria-hidden="true">
            {[14, 22, 10, 28].map((h, i) => (
              <span
                key={h}
                className="landing-bar w-2 rounded-sm bg-[var(--l-teal-deep)]"
                style={{ height: h, "--i": i } as CSSProperties}
              />
            ))}
          </span>
        </div>
      </FloatCard>

      <FloatCard order={0} side="right" className="right-[0%] top-[8%] w-[200px] !bg-[#dff3f1]">
        <p className="text-[0.8125rem] font-medium text-[var(--l-teal)]">Gift received · GCash</p>
        <p className="landing-display mt-1.5 text-[1.875rem] leading-none text-[var(--l-teal-deep)]">₱500.00</p>
        <p className="mt-2 inline-flex rounded-full bg-white px-2.5 py-0.5 text-[0.75rem] font-semibold text-[var(--l-teal-deep)]">
          Receipt sent
        </p>
      </FloatCard>

      <FloatCard order={3} side="right" className="right-[19%] top-[48%] w-auto !rounded-full !px-4 !py-2">
        <span className="flex items-center gap-2 text-[0.8125rem] font-semibold text-[var(--l-teal-deep)]">
          <span className="h-2 w-2 rounded-full bg-[var(--l-gold)]" />
          Simbang Gabi · Dec 16, 4:30 AM
        </span>
      </FloatCard>

    </div>
  );
}

/**
 * A small card around the laptop. They arrive one at a time from their own side once the laptop and phone are in
 * (`order` sets the turn), then keep a slow bob.
 */
function FloatCard({
  className,
  order,
  side,
  children,
}: {
  className: string;
  order: number;
  side: "left" | "right";
  children: ReactNode;
}) {
  return (
    <div
      style={{ "--order": order, "--from-x": side === "left" ? "-28px" : "28px" } as CSSProperties}
      className={`landing-float-card pointer-events-none absolute z-10 hidden rounded-2xl bg-white p-4 shadow-[0_20px_40px_-18px_rgb(14_59_70/0.45)] ring-1 ring-black/5 lg:block ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

/* ---------- Feature boxes ---------- */

type FeatureBox = { title: string; body: string };

type Feature = FeatureBox & { icon: ParishIconName };

const OFFICE_FEATURES: Feature[] = [
  { icon: "book", title: "Sacramental registers", body: "Baptism, confirmation, marriage and death records, each with its book, page and entry." },
  { icon: "scan", title: "Digitized ledgers", body: "Scan the old register books so a page can be found in seconds, not hours." },
  { icon: "inbox", title: "Certificate requests", body: "Find the record, issue the certificate and release it, for online and walk-in requests." },
  { icon: "qr", title: "QR-verified certificates", body: "Every certificate carries a code anyone can scan to check it is genuine." },
  { icon: "calendar", title: "Parish calendar", body: "Masses, fiestas, Simbang Gabi, weddings, baptisms and house blessings, with a warning when a priest or place is double-booked." },
  { icon: "candle", title: "Mass intentions", body: "See every intention per Mass and print the list for the presider." },
  { icon: "heart", title: "Donations and receipts", body: "Record cash gifts, receive GCash online, and print a receipt for every one." },
  { icon: "rings", title: "Marriage preparation", body: "Follow each couple through documents, the canonical interview, Pre-Cana seminar and the banns." },
  { icon: "people", title: "Staff and reports", body: "Keep the list of priests and staff, and see monthly reports at a glance." },
];

const PARISHIONER_FEATURES: Feature[] = [
  { icon: "request", title: "Request a certificate", body: "Ask for a baptismal, confirmation, marriage or death certificate from home." },
  { icon: "track", title: "Follow your request", body: "See when it is received, being prepared, and ready to pick up." },
  { icon: "wallet", title: "Certificate wallet", body: "Keep released certificates on your phone, ready to show or share." },
  { icon: "gift", title: "Give to the parish", body: "Give through GCash in a few taps. No account needed." },
  { icon: "candle", title: "Offer a Mass", body: "Request a Mass for thanksgiving, healing, or in memory of a loved one." },
  { icon: "timeline", title: "Your sacramental timeline", body: "Your baptism, confirmation and marriage on the parish's records, in one place." },
];

/** The office's features under three headings, so a priest or secretary can find their part of the work. */
const OFFICE_GROUPS: { title: string; features: string[] }[] = [
  { title: "Records", features: ["Sacramental registers", "Digitized ledgers", "Staff and reports"] },
  { title: "Certificates & requests", features: ["Certificate requests", "QR-verified certificates", "Marriage preparation"] },
  { title: "Calendar & giving", features: ["Parish calendar", "Mass intentions", "Donations and receipts"] },
];

/** One of HolyApp's drawn icons on a small white tile, like a stamp laid on the card. */
function IconTile({ name, size = "md" }: { name: ParishIconName; size?: "sm" | "md" }) {
  const box = size === "md" ? "h-14 w-14 rounded-[16px]" : "h-12 w-12 rounded-[14px]";
  return (
    <span
      className={`flex shrink-0 items-center justify-center bg-gradient-to-b from-white to-[#f3f8f8] shadow-[0_8px_18px_-10px_rgb(14_59_70/0.4)] ring-1 ring-[#e0eaec] ${box}`}
    >
      <ParishIcon name={name} size={size === "md" ? 40 : 34} />
    </span>
  );
}

/** A small tick, for the "With HolyApp" column. */
function Tick({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** A heading in two tones: the plain words in ink, the promise in logo teal (5.1:1 on white). */
function TwoTone({ strong, soft }: { strong: string; soft: string }) {
  return (
    <>
      {strong}
      <span className="text-[var(--l-teal)]">{soft}</span>
    </>
  );
}

/** A section's label, heading and one line of introduction. */
function SectionIntro({
  title,
  intro,
  center = false,
  filipino,
}: {
  title: [string, string];
  intro: string;
  center?: boolean;
  /** A short line in Filipino under the heading. */
  filipino?: string;
}) {
  return (
    <div data-reveal className={`mb-10 max-w-[680px] ${center ? "mx-auto text-center" : ""}`}>
      <h2 className="landing-display text-[2rem] leading-[1.1] text-[var(--l-ink)] sm:text-[2.75rem]">
        <TwoTone strong={title[0]} soft={title[1]} />
      </h2>
      {filipino && (
        <p lang="fil" className="mt-3 text-[1.0625rem] font-semibold italic text-[var(--l-teal)]">
          {filipino}
        </p>
      )}
      <p className="mt-3 text-[1.0625rem] leading-relaxed text-[var(--l-muted)]">{intro}</p>
    </div>
  );
}

/* ---------- How HolyApp works ---------- */

const FAITHFUL_SIDE: { icon: ParishIconName; title: string; body: string }[] = [
  { icon: "request", title: "Request a certificate", body: "From home, any time" },
  { icon: "gift", title: "Give to the parish", body: "Through GCash" },
  { icon: "candle", title: "Offer a Mass", body: "For a loved one or an intention" },
];

const OFFICE_SIDE: { icon: ParishIconName; title: string; body: string }[] = [
  { icon: "book", title: "Registers and books", body: "Every entry, easy to find" },
  { icon: "inbox", title: "Certificates", body: "Prepared, signed and released" },
  { icon: "calendar", title: "Masses and schedule", body: "Intentions, weddings, baptisms" },
];

/** The whole idea in one picture: the faithful on one side, the parish office on the other, HolyApp between them. */
function HowItWorks() {
  // Where each side's three cards meet the middle, in the drawing's 1000 × 300 box.
  const rows = [40, 150, 260];
  return (
    <section id="how-it-works" aria-label="How HolyApp works" className="scroll-mt-16 px-4 pb-6 pt-16 sm:px-6 sm:pt-20">
      <div className="mx-auto max-w-[1060px]">
        <SectionIntro
          title={["One place between ", "the faithful and their parish."]}
          intro="Parishioners ask from home. The office answers from its own records. Anyone can check what the parish issued."
          filipino="Para sa parokya at sa sambayanan."
          center
        />

        <div data-reveal className="relative">
          {/* The lines that join each side to HolyApp, on wide screens. */}
          <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-[44px] hidden h-[300px] w-full md:block" aria-hidden="true">
            {rows.map((y) => (
              <g key={y} fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke">
                <path d={`M340 ${y} C385 ${y} 385 150 425 150`} stroke="#d6e6e8" vectorEffect="non-scaling-stroke" />
                <path d={`M340 ${y} C385 ${y} 385 150 425 150`} stroke="#eeb531" className="landing-flow" vectorEffect="non-scaling-stroke" />
                <path d={`M660 ${y} C615 ${y} 615 150 575 150`} stroke="#d6e6e8" vectorEffect="non-scaling-stroke" />
                <path d={`M575 150 C615 150 615 ${y} 660 ${y}`} stroke="#16798c" className="landing-flow" vectorEffect="non-scaling-stroke" />
              </g>
            ))}
          </svg>

          <div className="grid gap-4 md:grid-cols-[34fr_32fr_34fr] md:gap-0">
            <FlowSide label="The faithful" items={FAITHFUL_SIDE} />

            <div className="flex flex-col items-center md:pt-[44px]">
              <FlowArrow />
              <div className="relative z-10 flex h-auto w-[60%] min-w-[170px] flex-col items-center justify-center rounded-[24px] bg-white px-5 py-6 text-center shadow-[0_24px_48px_-24px_rgb(14_59_70/0.45)] ring-1 ring-[#d9ecec] md:mt-[85px] md:h-[130px] md:py-0">
                <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_2px_8px_rgb(14_59_70/0.15)]">
                  <img src="/holyapp-logo.webp" alt="" className="h-9 w-9 object-contain" />
                </span>
                <p className="landing-display mt-2 text-[1.125rem] text-[var(--l-teal-deep)]">HolyApp</p>
                <p className="text-[0.8125rem] text-[var(--l-muted)]">Kept safe for the parish</p>
              </div>
              <FlowArrow />
            </div>

            <FlowSide label="The parish office" items={OFFICE_SIDE} />
          </div>

          {/* What leaves the parish: a certificate anyone can check. */}
          <div className="mt-6 flex flex-col items-center md:mt-8">
            <span className="hidden h-8 w-px bg-[#d6e6e8] md:block" aria-hidden="true" />
            <a
              href="#verify"
              className="mt-0 inline-flex items-center gap-3 rounded-full bg-[var(--l-teal-deep)] py-2.5 pl-3 pr-5 text-[0.9375rem] font-medium text-white shadow-[0_12px_28px_-14px_rgb(14_59_70/0.8)] hover:bg-[var(--l-teal)] md:mt-2"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                <ParishIcon name="qr" size={20} />
              </span>
              Every certificate carries a QR code anyone can check
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowSide({ label, items }: { label: string; items: { icon: ParishIconName; title: string; body: string }[] }) {
  return (
    <div>
      <p className="mb-4 h-7 text-center text-[0.8125rem] font-bold uppercase tracking-[0.14em] text-[var(--l-muted)] md:mb-[16px]">{label}</p>
      <ul className="flex flex-col gap-3 md:h-[300px] md:justify-between md:gap-0">
        {items.map((item) => (
          <li key={item.title} className="relative z-10 flex h-[72px] items-center gap-3 rounded-2xl bg-white px-4 shadow-[0_14px_30px_-22px_rgb(14_59_70/0.5)] ring-1 ring-[#e3eef0]">
            <IconTile name={item.icon} size="sm" />
            <div className="min-w-0">
              <p className="font-semibold leading-tight tracking-[-0.01em] text-[var(--l-ink)]">{item.title}</p>
              <p className="mt-0.5 text-[0.875rem] leading-tight text-[var(--l-muted)]">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A small down arrow between the stacked parts on phones. */
function FlowArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#9fc4c8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="my-1 h-6 w-6 md:hidden" aria-hidden="true">
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

/** Feature cards in a plain grid, every one in view. */
function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <ul data-reveal data-stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((f) => (
        <li key={f.title} className="rounded-[24px] bg-white p-6 ring-1 ring-[#e9eef0] shadow-[0_16px_36px_-30px_rgb(14_59_70/0.5)]">
          <IconTile name={f.icon} />
          <p className="mt-5 text-[1.125rem] font-semibold leading-snug tracking-[-0.015em] text-[var(--l-ink)]">{f.title}</p>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--l-muted)]">{f.body}</p>
        </li>
      ))}
    </ul>
  );
}

/** The office's features under Records, Certificates & requests, and Calendar & giving. */
function OfficeGroups() {
  return (
    <div data-reveal data-stagger className="grid gap-4 lg:grid-cols-3">
      {OFFICE_GROUPS.map((group) => (
        <section key={group.title} aria-label={group.title} className="rounded-[24px] bg-white p-6 ring-1 ring-[#e3eef0] sm:p-7">
          <h3 className="landing-display text-[1.25rem] text-[var(--l-teal-deep)]">{group.title}</h3>
          <ul className="mt-5 flex flex-col gap-5">
            {group.features.map((name) => {
              const f = OFFICE_FEATURES.find((feature) => feature.title === name)!;
              return (
                <li key={f.title} className="flex gap-3.5">
                  <IconTile name={f.icon} size="sm" />
                  <div>
                    <p className="font-semibold tracking-[-0.01em] text-[var(--l-ink)]">{f.title}</p>
                    <p className="mt-1 text-[0.9375rem] leading-relaxed text-[var(--l-muted)]">{f.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ---------- Before and with HolyApp ---------- */

const BEFORE_AFTER: [string, string, string][] = [
  ["Finding an old entry", "Turning the pages of the register books, sometimes for hours.", "Search by name and open the scanned page in seconds."],
  ["Asking for a certificate", "Coming to the office during office hours, often twice.", "Requesting from home, and coming once to pick it up."],
  ["“Is it ready yet?”", "Phone calls and repeat visits.", "The status shows on the parishioner's phone."],
  ["Checking a certificate", "Calling the parish that issued it, and waiting.", "Scanning its QR code."],
  ["Mass intentions", "Handwritten slips gathered before each Mass.", "One printed list for the presider, per Mass."],
  ["Gifts and receipts", "Handwritten receipts and a separate tally.", "A receipt for every gift, cash or GCash, with monthly totals."],
  ["Bookings", "A double booking found on the day.", "A warning when a priest or place is already booked."],
];

function BeforeAfter() {
  return (
    <div className="mt-20">
      <div data-reveal className="mb-8 max-w-[680px]">
        <h3 className="landing-display text-[1.75rem] leading-[1.15] text-[var(--l-ink)] sm:text-[2rem]">
          <TwoTone strong="The parish office, " soft="before and with HolyApp." />
        </h3>
        <p className="mt-3 text-[1.0625rem] leading-relaxed text-[var(--l-muted)]">
          The register books stay the parish's record. HolyApp makes the everyday work around them lighter.
        </p>
      </div>

      {/* Wide screens: a table. */}
      <div data-reveal className="hidden overflow-hidden rounded-[24px] bg-white ring-1 ring-[#e3eef0] md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[0.8125rem] font-bold uppercase tracking-[0.12em]">
              <th scope="col" className="w-[24%] px-6 py-4 text-[var(--l-muted)]">
                <span className="sr-only">Task</span>
              </th>
              <th scope="col" className="w-[36%] px-6 py-4 text-[var(--l-muted)]">Before</th>
              <th scope="col" className="w-[40%] bg-[var(--l-teal-deep)] px-6 py-4 text-white">With HolyApp</th>
            </tr>
          </thead>
          <tbody data-stagger>
            {BEFORE_AFTER.map(([task, before, after]) => (
              <tr key={task} className="border-t border-[#e9eff0]">
                <th scope="row" className="px-6 py-4 font-semibold text-[var(--l-ink)]">{task}</th>
                <td className="px-6 py-4 text-[0.9375rem] leading-relaxed text-[var(--l-muted)]">
                  <span className="flex gap-2.5">
                    <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#b9c7ca]" aria-hidden="true" />
                    {before}
                  </span>
                </td>
                <td className="bg-[#eef7f7] px-6 py-4 text-[0.9375rem] leading-relaxed text-[var(--l-ink)]">
                  <span className="flex gap-2.5">
                    <Tick className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--l-teal)]" />
                    {after}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: one card per task. */}
      <ul data-reveal data-stagger className="flex flex-col gap-3 md:hidden">
        {BEFORE_AFTER.map(([task, before, after]) => (
          <li key={task} className="overflow-hidden rounded-[20px] bg-white ring-1 ring-[#e3eef0]">
            <p className="px-5 pt-4 font-semibold text-[var(--l-ink)]">{task}</p>
            <p className="px-5 pb-3 pt-1.5 text-[0.9375rem] leading-relaxed text-[var(--l-muted)]">
              <span className="font-semibold">Before: </span>
              {before}
            </p>
            <p className="flex gap-2.5 bg-[#eef7f7] px-5 py-3 text-[0.9375rem] leading-relaxed text-[var(--l-ink)]">
              <Tick className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--l-teal)]" />
              <span>
                <span className="font-semibold">With HolyApp: </span>
                {after}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- For parishioners ---------- */

const REQUEST_STEPS = [
  ["Request from home", "Find your parish, choose the certificate, and say what it's for: school, a passport or your wedding."],
  ["Follow its progress", "See when the office receives it, prepares it, and has it ready for you."],
  ["Pick it up and keep it", "Collect the signed copy at the office. A copy stays in your wallet, with a QR code anyone can check."],
];

/** Everything for the faithful in one place: what they can do, how a request goes, and the way in. */
function ParishionerPart() {
  return (
    <section id="parishioners" aria-label="For parishioners" className="scroll-mt-16 px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-[1120px]">
        <SectionIntro
          title={["Your parish, ", "a tap away."]}
          intro="Request certificates, give and offer Masses from your phone. Nothing to download."
          filipino="Para sa bawat mananampalataya."
        />
        <FeatureGrid features={PARISHIONER_FEATURES} />

        <div data-reveal className="mt-8 flex flex-col gap-4 rounded-[24px] bg-[var(--l-gold-soft)] p-6 sm:flex-row sm:items-center sm:gap-5 sm:p-7">
          <IconTile name="request" />
          <div>
            <p className="text-[1.125rem] font-semibold leading-snug tracking-[-0.015em] text-[var(--l-ink)]">
              Need your baptismal certificate for school, a DFA passport or your wedding?
            </p>
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-[var(--l-muted)]">
              Request it from home and go to the parish office once, when it's ready to pick up.
            </p>
          </div>
        </div>

        <div data-reveal className="mt-14">
          <h3 className="landing-display text-[1.5rem] leading-tight text-[var(--l-ink)]">How a certificate request works</h3>
          {/* As the steps come into view a gold line runs along each card in turn and its number fills gold. */}
          <ol data-steps className="mt-6 grid gap-4 md:grid-cols-3">
            {REQUEST_STEPS.map(([title, body], i) => (
              <li
                key={title}
                style={{ "--i": i } as CSSProperties}
                className="relative flex gap-4 overflow-hidden rounded-[24px] bg-[var(--l-cream)] p-6 ring-1 ring-[#f0e7d2]"
              >
                <span className="landing-step-line absolute inset-x-0 bottom-0 h-[3px] bg-[var(--l-gold)]" aria-hidden="true" />
                <span className="landing-step-num landing-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--l-gold-soft)] text-[1rem] text-[#8a5f0a]">
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
            className="landing-btn inline-flex min-h-[52px] items-center gap-2 rounded-full bg-[var(--l-teal-deep)] px-7 text-[1rem] font-semibold text-white shadow-[0_10px_24px_-10px_rgb(14_59_70/0.7)] hover:bg-[var(--l-teal)]"
          >
            Find your parish
            <ArrowIcon />
          </Link>
          <Link
            to="/give"
            className="landing-btn inline-flex min-h-[52px] items-center gap-2 rounded-full bg-white px-6 text-[1rem] font-medium text-[var(--l-teal-deep)] ring-1 ring-[#c6d5d8] hover:bg-[var(--l-mist)]"
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

/** Everything for parish offices in one place: what the office gets, how records stay safe, and how to start. */
function ParishPart() {
  return (
    <section id="parishes" aria-label="For parish offices" className="scroll-mt-16 bg-[#f6fafa] px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-[1120px]">
        <SectionIntro
          title={["Run the parish office ", "in one place."]}
          intro="For the parish priest, secretary and staff, on any computer at the office."
          filipino="Para sa opisina ng parokya."
        />
        <OfficeGroups />
        <BeforeAfter />
        <TrustBlock />
        <ForParishes />
      </div>
    </section>
  );
}

/* ---------- Verify a certificate ---------- */

function VerifySection() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (opening) return;
    const code = verificationCode(value);
    if (!code) {
      setError("That isn't a verification link or code. Scan the QR code on the certificate, or copy the whole link.");
      // A short side-to-side shake, restarted on every wrong try.
      const input = inputRef.current;
      if (input) {
        input.classList.remove("landing-shake");
        void input.offsetWidth;
        input.classList.add("landing-shake");
      }
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate(`/verify/${code}`);
      return;
    }
    // Let the check mark draw itself, then open the result.
    setOpening(true);
    window.setTimeout(() => navigate(`/verify/${code}`), 550);
  }

  return (
    <section id="verify" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
      <div data-reveal className="mx-auto grid max-w-[1060px] items-center gap-10 md:grid-cols-[1fr_1.1fr]">
        <div>
          <h2 className="landing-display text-[2rem] leading-[1.12] sm:text-[2.5rem]">
            <TwoTone strong="Check a certificate " soft="in seconds." />
          </h2>
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
                ref={inputRef}
                id="verify-code"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError("");
                }}
                onAnimationEnd={(e) => e.currentTarget.classList.remove("landing-shake")}
                placeholder="Paste the link or code"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "verify-error" : undefined}
                className="min-h-[50px] min-w-0 flex-1 rounded-full border border-[#c6d5d8] bg-white px-5 text-[1rem] text-[var(--l-ink)] placeholder:text-[#8aa1a7] focus:border-[var(--l-teal)] focus:outline-none focus:ring-[3px] focus:ring-[var(--l-teal-light)]/60"
              />
              <button
                type="submit"
                aria-live="polite"
                className="landing-btn inline-flex min-h-[50px] shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--l-teal-deep)] px-6 text-[1rem] font-semibold text-white hover:bg-[var(--l-teal)]"
              >
                {opening ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                      <path className="landing-check-draw" d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} />
                    </svg>
                    Opening…
                  </>
                ) : (
                  "Check certificate"
                )}
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

const TRUST_POINTS: { icon: ParishIconName; title: string; body: string }[] = [
  {
    icon: "shield",
    title: "Only the right people",
    body: "Parishioners see only their own requests. Staff see what their role allows, and only the parish administrator can change a sacramental record.",
  },
  {
    icon: "history",
    title: "Every change is recorded",
    body: "Edits to records, certificates and donations are logged with who made them and when.",
  },
  {
    icon: "church",
    title: "Each parish keeps its own records",
    body: "One parish can never see another parish's registers, requests or donations.",
  },
  {
    icon: "lock",
    title: "Passwords stay secret",
    body: "Passwords are stored scrambled, so no one can read them, not even HolyApp.",
  },
  {
    icon: "seal",
    title: "Certificates can't be faked",
    body: "Anyone can scan a certificate to check it against the register, and the parish can withdraw one that was issued in error.",
  },
  {
    icon: "rights",
    title: "Your data, your rights",
    body: "Under the Data Privacy Act of 2012 you can ask to see or correct the information kept about you.",
  },
];

function TrustBlock() {
  return (
    <div id="privacy" className="mt-20 scroll-mt-24">
      <div>
        <div data-reveal className="mb-10 max-w-[640px]">
          <h3 className="landing-display text-[1.75rem] leading-[1.15] text-[var(--l-ink)] sm:text-[2rem]">
            <TwoTone strong="Kept safe, " soft="kept private." />
          </h3>
          <p className="mt-3 text-[1.0625rem] leading-relaxed text-[var(--l-muted)]">
            Sacramental records are the parish's to keep and the faithful's to trust. HolyApp is built so they stay in
            the right hands.
          </p>
        </div>
        <ul data-reveal data-stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST_POINTS.map((point) => (
            <li key={point.title} className="rounded-[24px] bg-white p-6 ring-1 ring-[#e3eef0]">
              <IconTile name={point.icon} />
              <p className="mt-5 text-[1.125rem] font-semibold leading-snug tracking-[-0.015em] text-[var(--l-ink)]">{point.title}</p>
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

/* ---------- Bringing HolyApp to a parish ---------- */

function ForParishes() {
  const mailto = `mailto:${HOLYAPP_CONTACT_EMAIL}?subject=${encodeURIComponent("Bringing HolyApp to our parish")}`;
  const [showEmail, setShowEmail] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const closeDemo = useCallback(() => setShowDemo(false), []);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(HOLYAPP_CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard access: the address is on screen to select by hand.
    }
  }

  return (
    <div id="for-parishes" className="mt-16 scroll-mt-24">
      <div
        data-reveal
        className="grid gap-10 rounded-[32px] bg-white p-7 ring-1 ring-[#d9ecec] shadow-[0_20px_44px_-32px_rgb(14_59_70/0.45)] sm:p-12 md:grid-cols-[1.1fr_1fr]"
      >
        <div>
          <h3 className="landing-display text-[1.75rem] leading-[1.15] text-[var(--l-ink)] sm:text-[2rem]">
            <TwoTone strong="Bring HolyApp " soft="to your parish." />
          </h3>
          <p className="mt-4 max-w-[440px] text-[1.0625rem] leading-relaxed text-[var(--l-muted)]">
            Tell us about your parish and we'll help you get started: your registers, your staff, your certificate
            design and your fees.
          </p>
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setShowDemo(true)}
              aria-haspopup="dialog"
              className="landing-btn inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[var(--l-teal-deep)] px-7 text-[1rem] font-semibold text-white shadow-[0_10px_24px_-10px_rgb(14_59_70/0.7)] hover:bg-[var(--l-teal)] sm:w-auto"
            >
              Book a demo
              <ArrowIcon />
            </button>
            <p className="mt-3 text-[0.9375rem] text-[var(--l-muted)]">
              Free, about 30 minutes, online or at your parish office.{" "}
              <button
                type="button"
                onClick={() => setShowEmail((v) => !v)}
                aria-expanded={showEmail}
                aria-controls="landing-email"
                className="font-semibold text-[var(--l-teal)] underline underline-offset-2 hover:text-[var(--l-teal-deep)]"
              >
                Or email us
              </button>
            </p>
          </div>
          {showDemo && <BookDemoDialog onClose={closeDemo} />}
          {/* A mail link alone does nothing on a computer with no email app, so the address is always shown too. */}
          {showEmail && (
            <div
              id="landing-email"
              className="mt-4 max-w-[440px] rounded-2xl bg-[#f1f9f8] p-4 ring-1 ring-[#d9ecec]"
            >
              <p className="text-[0.9375rem] text-[var(--l-muted)]">Write to us at</p>
              <p className="mt-0.5 break-all text-[1.0625rem] font-semibold text-[var(--l-ink)]">{HOLYAPP_CONTACT_EMAIL}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyEmail}
                  className="inline-flex min-h-[44px] items-center rounded-full bg-white px-5 text-[0.9375rem] font-semibold text-[var(--l-teal-deep)] ring-1 ring-[#cfe6e6] hover:bg-[#e6f4f3]"
                >
                  {copied ? "Copied" : "Copy address"}
                </button>
                <a
                  href={mailto}
                  className="inline-flex min-h-[44px] items-center rounded-full bg-white px-5 text-[0.9375rem] font-semibold text-[var(--l-teal-deep)] ring-1 ring-[#cfe6e6] hover:bg-[#e6f4f3]"
                >
                  Open email app
                </a>
              </div>
              <p role="status" className="sr-only">{copied ? "Email address copied" : ""}</p>
            </div>
          )}
        </div>

        <ol data-stagger className="space-y-5 self-center">
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
          {/* To the contact section (Book a demo, and the email address shown): a mail link alone does nothing without an email app. */}
          <a href="#for-parishes" className="hover:text-[var(--l-teal-deep)]">Contact</a>
        </nav>
      </div>
    </footer>
  );
}

/* ---------- Icons ---------- */

function HeartIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="landing-btn-heart h-4 w-4" aria-hidden="true">
      <path d="M9.65 16.9 9.6 16.87a20.8 20.8 0 0 1-3.6-2.6C4.1 12.6 2 10.2 2 7.25 2 4.9 3.9 3 6.25 3c1.5 0 2.84.78 3.75 1.95A4.73 4.73 0 0 1 13.75 3C16.1 3 18 4.9 18 7.25c0 2.95-2.1 5.35-4 7.02a20.8 20.8 0 0 1-3.65 2.62l-.05.03a.75.75 0 0 1-.65 0Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="landing-btn-arrow h-4 w-4" aria-hidden="true">
      <path d="M4 10h11M11 5.5 15.5 10 11 14.5" />
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

