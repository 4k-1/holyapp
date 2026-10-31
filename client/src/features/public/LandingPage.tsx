import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import "./landing.css";

/** HolyApp's front door: what it is, who it's for, and the way into a parish. */
export function LandingPage() {
  return (
    <div className="landing min-h-screen">
      <SiteHeader />
      <main>
        <Hero />
        <SacramentStrip />
        <Facts />
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
          <a href="#parish-office" className="hover:text-[var(--l-teal-deep)]">For parishes</a>
          <a href="#parishioners" className="hover:text-[var(--l-teal-deep)]">For parishioners</a>
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

function Cross({ className, color }: { className: string; color: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`landing-deco ${className}`} aria-hidden="true">
      <path d="M10 3h4v6h6v4h-6v8h-4v-8H4V9h6z" fill={color} />
    </svg>
  );
}

/** A small church: steeple and gold cross, rose window and arched door, set in a chapel-window arch. */
function ChurchMark() {
  return (
    <svg viewBox="0 0 160 130" className="mx-auto mb-4 h-24 w-28" role="img" aria-label="A parish church">
      <path d="M28 124V66a52 52 0 0 1 104 0v58Z" fill="#e8f5f5" />
      <path d="M28 124V66a52 52 0 0 1 104 0v58" fill="none" stroke="#eeb531" strokeWidth="1.5" strokeDasharray="2 4" strokeLinecap="round" />
      <rect x="78" y="2" width="4" height="19" rx="1" fill="#eeb531" />
      <rect x="72" y="7.5" width="16" height="4" rx="1" fill="#eeb531" />
      <path d="M60 50 80 20l20 30Z" fill="#0e3b46" />
      <path d="M22 122V82l41-20v60Z" fill="#8ed8d2" />
      <path d="M138 122V82l-41-20v60Z" fill="#8ed8d2" />
      <rect x="63" y="48" width="34" height="74" fill="#16798c" />
      <circle cx="80" cy="68" r="8.5" fill="#ffffff" />
      <circle cx="80" cy="68" r="3.2" fill="#eeb531" />
      <path d="M80 59.5v17M71.5 68h17" stroke="#8ed8d2" strokeWidth="1" />
      <path d="M72 122v-18a8 8 0 0 1 16 0v18Z" fill="#eeb531" />
      <path d="M35 114v-12a4 4 0 0 1 8 0v12ZM48 114v-15a4 4 0 0 1 8 0v15Z" fill="#ffffff" />
      <path d="M117 114v-12a4 4 0 0 1 8 0v12ZM104 114v-15a4 4 0 0 1 8 0v15Z" fill="#ffffff" />
      <rect x="10" y="121" width="140" height="3" rx="1.5" fill="#c6d5d8" />
    </svg>
  );
}

function Hero() {
  return (
    <section className="landing-hero relative overflow-hidden px-4 pb-14 pt-8 sm:px-6 sm:pt-12">
      <Cross className="left-[9%] top-[14%] hidden h-7 w-7 sm:block" color="#eeb531" />
      <Cross className="right-[10%] top-[10%] h-6 w-6 [animation-delay:1.5s]" color="#8ed8d2" />
      <Cross className="right-[18%] top-[34%] hidden h-5 w-5 [animation-delay:3s] sm:block" color="#2a9d9c" />

      <div className="text-center">
        <ChurchMark />
        <p className="mx-auto mb-5 inline-flex rounded-full bg-white/80 px-4 py-1.5 text-[0.875rem] font-medium text-[var(--l-teal)] ring-1 ring-[#d9ecec]">
          For Catholic parishes and the faithful they serve
        </p>
        <h1 className="landing-display mx-auto max-w-[900px] text-[2.75rem] leading-[1.08] text-[var(--l-ink)] sm:text-[4.5rem]">
          Your church
          <br />
          on the <span className="landing-mark">cloud.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[560px] text-[1.0625rem] leading-relaxed text-[var(--l-muted)] sm:text-[1.125rem]">
          Sacramental records, certificate requests, the Mass schedule and offerings, kept safe in one place for the
          parish office and the faithful.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
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

      <figure className="relative mx-auto w-[92%] max-w-[860px]">
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

/** The sacraments and services HolyApp keeps, in a quiet row under the hero. */
function SacramentStrip() {
  const items = ["Baptism", "Confirmation", "Holy Matrimony", "Funerals", "Mass Intentions", "Offerings"];
  return (
    <section aria-label="What HolyApp keeps" className="border-y border-[#e3eef0] bg-white px-4 py-7 sm:px-6">
      <ul className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-center gap-x-6 gap-y-3">
        {items.map((item, i) => (
          <li key={item} className="flex items-center gap-6">
            {i > 0 && (
              <svg viewBox="0 0 24 24" className="hidden h-3 w-3 sm:block" aria-hidden="true">
                <path d="M10 3h4v6h6v4h-6v8h-4v-8H4V9h6z" fill="#eeb531" />
              </svg>
            )}
            <span className="landing-display text-[1.25rem] text-[#55707a]">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Line({ w, className = "" }: { w: string; className?: string }) {
  return <span className={`block h-2.5 rounded-full ${w} ${className}`} />;
}

/* ---------- Facts ---------- */

function Facts() {
  const facts = [
    ["Kept safe", "Records stay with your parish"],
    ["QR-verified", "Certificates anyone can check"],
    ["GCash", "For gifts and Mass intentions"],
    ["Any phone", "Nothing to download"],
  ];
  return (
    <section aria-label="At a glance" className="px-4 py-16 sm:px-6 sm:py-20">
      <dl className="mx-auto grid max-w-[1000px] grid-cols-2 gap-y-10 text-center md:grid-cols-4">
        {facts.map(([value, label]) => (
          <div key={value}>
            <dt className="landing-display text-[1.625rem] leading-none text-[var(--l-teal-deep)] sm:text-[1.875rem]">{value}</dt>
            <dd className="mt-2 text-[0.9375rem] text-[var(--l-muted)]">{label}</dd>
          </div>
        ))}
      </dl>
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
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[1fr_1.05fr_0.9fr]">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-[var(--l-mist)] px-3.5 py-1 text-[0.8125rem] font-medium text-[var(--l-teal)]">
            For the parish office
          </p>
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
      <div className="relative mx-auto max-w-[1060px] overflow-hidden rounded-[32px] bg-gradient-to-br from-[#17707f] via-[#0f5262] to-[#0a3a46] px-7 py-14 text-center text-white sm:px-12">
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
