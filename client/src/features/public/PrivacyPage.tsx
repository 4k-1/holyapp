import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { HOLYAPP_CONTACT_EMAIL } from "./contact";
import "./landing.css";

// A plain-language privacy notice written from what HolyApp actually stores. Have it reviewed by the parish's or
// diocese's data protection officer before going live; the contact address in ./contact is still a placeholder.

/** HolyApp's privacy notice: what is collected, who sees it, and how to ask about it. */
export function PrivacyPage() {
  return (
    <div className="landing min-h-screen">
      <header className="border-b border-[#e3eef0] bg-white">
        <div className="mx-auto flex max-w-[860px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-2.5 no-underline">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_2px_8px_rgb(14_59_70/0.12)]">
              <img src="/holyapp-logo.webp" alt="" className="h-[30px] w-[30px] object-contain" />
            </span>
            <span className="text-[1.25rem] font-bold tracking-tight text-[var(--l-teal-deep)]">HolyApp</span>
          </Link>
          <Link to="/" className="text-[0.9375rem] font-medium text-[var(--l-muted)] hover:text-[var(--l-teal-deep)]">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="landing-display text-[2.25rem] leading-[1.1] sm:text-[2.75rem]">Privacy notice</h1>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-[var(--l-muted)]">
          HolyApp keeps sacramental records and parish services for Catholic parishes, and a portal for the faithful
          they serve. This notice explains what we collect, why, who can see it, and the rights you have under the
          Data Privacy Act of 2012 (Republic Act No. 10173).
        </p>

        <Section title="Who is responsible">
          <p>
            Each parish is responsible for its own sacramental records and for the requests, donations and Mass
            intentions made to it. HolyApp provides the system the parish uses to keep them. Questions about a
            particular record are best sent to the parish office that holds it.
          </p>
        </Section>

        <Section title="What we collect">
          <List
            items={[
              <>
                <strong>Your account:</strong> your name, email address and password, and if you add them, your
                birthday, address and contact number. Passwords are stored scrambled and cannot be read by anyone.
              </>,
              <>
                <strong>Certificate requests:</strong> the certificate you ask for, the details needed to find the
                record, its purpose, its progress until release, and any photos you attach to help find the record.
                Only you and the parish office can see those photos, and they are stored encrypted.
              </>,
              <>
                <strong>Sacramental records:</strong> the entries in the parish's baptism, confirmation, marriage and
                death registers, including scans of the register books, kept by the parish office.
              </>,
              <>
                <strong>Donations and Mass intentions:</strong> the amount, the name you give (or none, if you give
                anonymously), the intention and the Mass it is offered at. GCash payments are handled by our payment
                provider; HolyApp never sees your GCash login or PIN.
              </>,
              <>
                <strong>Marriage applications:</strong> the couple's details and the documents asked for by the
                parish during preparation.
              </>,
            ]}
          />
        </Section>

        <Section title="Why we use it">
          <List
            items={[
              "To keep the parish's registers and issue certificates from them.",
              "To process your requests, donations and Mass intentions, and send you receipts and updates.",
              "To let anyone holding a certificate confirm that it is genuine.",
              "To keep the system secure, including a record of changes made to records, certificates and donations.",
            ]}
          />
          <p className="mt-3">We do not sell your information or use it for advertising.</p>
        </Section>

        <Section title="Who can see it">
          <List
            items={[
              "You can see your own account, requests, certificates, donations and Mass intentions.",
              "Parish staff can see what their role allows. Only the parish administrator can change a sacramental record.",
              "One parish cannot see another parish's records, requests or donations.",
              "HolyApp's platform administrators can see parish accounts and activity logs to keep the system running.",
              "Anyone who scans a certificate's QR code sees the holder's name, the sacrament, the issuing parish, the date issued and the certificate number, and whether the certificate is still valid.",
            ]}
          />
        </Section>

        <Section title="How long we keep it">
          <p>
            Sacramental records are permanent records of the Church and are kept for as long as the parish keeps its
            registers. Account details, requests and donation records are kept while your account is open and for as
            long as the parish needs them for its own records. Photos attached to a certificate request are deleted
            7 days after the request is released or not approved.
          </p>
        </Section>

        <Section title="Your rights">
          <p>Under the Data Privacy Act of 2012 you may:</p>
          <List
            items={[
              "Ask what information is kept about you, and get a copy.",
              "Have wrong or incomplete information corrected.",
              "Object to its use, or ask for it to be removed where the law allows. Entries in a sacramental register are corrected by annotation rather than deleted.",
              "Close your portal account by contacting your parish office.",
              "Complain to the National Privacy Commission if you believe your information was mishandled.",
            ]}
          />
        </Section>

        <Section title="Contact us">
          <p>
            For a record in a parish's register, contact that parish office. For anything else about this notice,
            write to{" "}
            <a href={`mailto:${HOLYAPP_CONTACT_EMAIL}`} className="font-semibold text-[var(--l-teal)] underline-offset-2 hover:underline">
              {HOLYAPP_CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="landing-display text-[1.5rem] leading-tight text-[var(--l-ink)]">{title}</h2>
      <div className="mt-3 text-[1rem] leading-relaxed text-[var(--l-ink)]/85">{children}</div>
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-3 space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--l-teal)]" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
