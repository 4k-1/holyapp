import { forwardRef, type ReactNode } from "react";
import {
  CERTIFICATE_TITLES,
  CERTIFICATE_PAPER,
  type BaptismCertificateData,
  type CertificateData,
  type CertificateParish,
  type CertificateSignatory,
  type ConfirmationCertificateData,
  type DeathCertificateData,
} from "./certificateData";
import { ageText, dateParts, fullDate, present, townFromAddress } from "./certificateFormat";
import { VerificationArea } from "./CertificateVerification";
import { MarriageCertificate } from "./MarriageCertificate";
import { CertificateMark } from "./SpecimenMark";
import "./parishCertificate.css";

interface ParishCertificateProps {
  data: CertificateData;
  /**
   * Base URL of the public app, e.g. "https://holyapp.ph". The QR code encodes
   * `{appUrl}/verify/{certificateId}`.
   */
  appUrl: string;
}

/**
 * The printed parish certificate: one layout, a variant per type.
 * BAPTISM prints on A5; CONFIRMATION and DEATH print on Letter; MARRIAGE prints Municipal
 * Form No. 97 on 8.5 × 13 in (MarriageCertificate). All sizes are in mm so
 * the on-screen sheet and the printed page match.
 */
export const ParishCertificate = forwardRef<HTMLDivElement, ParishCertificateProps>(function ParishCertificate(
  { data, appUrl },
  ref
) {
  // Marriage prints on the government's own form.
  if (data.type === "MARRIAGE") return <MarriageCertificate ref={ref} data={data} appUrl={appUrl} />;
  const paper = CERTIFICATE_PAPER[data.type];

  return (
    <div
      ref={ref}
      className={`pcert pcert--${paper === "A5" ? "a5" : "letter"}`}
      data-certificate-type={data.type}
    >
      <CertificateMark specimen={data.specimen} />
      <div className="pcert__frame">
        <ParishHeader parish={data.parish} />
        {/* Blackletter, in the style of the parish's printed forms. */}
        <h1 className="pcert__title pcert__title--blackletter">{CERTIFICATE_TITLES[data.type]}</h1>

        {data.type === "BAPTISM" && <BaptismBody data={data} />}
        {data.type === "CONFIRMATION" && <ConfirmationBody data={data} />}
        {data.type === "DEATH" && <DeathBody data={data} />}

        <footer className="pcert__footer">
          <VerificationArea
            verification={data.verification}
            appUrl={appUrl}
            purpose={data.purpose}
            validUntil={data.validUntil}
          />
          <SignatureBlock
            signatory={data.signatory}
            fallbackTitle="Parish Priest"
            signOff={data.type === "CONFIRMATION" ? "In Christ," : data.type === "DEATH" ? "Yours in Christ," : undefined}
            keepSpaceBelow={data.type === "BAPTISM"}
          />
        </footer>
      </div>
    </div>
  );
});

/* ---------------- Shared pieces ---------------- */

function ParishHeader({ parish }: { parish: CertificateParish }) {
  const logoUrl = present(parish.logoUrl);
  const address = present(parish.address);

  return (
    <header className="pcert__header">
      {logoUrl ? (
        <img className="pcert__logo" src={logoUrl} alt="" crossOrigin="anonymous" />
      ) : (
        <div className="pcert__logo pcert__logo--initial" aria-hidden="true">
          {parish.name.trim().charAt(0)}
        </div>
      )}
      <div>
        <p className="pcert__parish-name">{parish.name}</p>
        {address && <p className="pcert__parish-address">{address}</p>}
      </div>
      <div aria-hidden="true" />
    </header>
  );
}

type FillSize = "xs" | "sm" | "md" | "lg";

/** An underlined value; a blank underline when there is nothing to print. */
function Fill({
  value,
  size,
  strong,
  half,
}: {
  value?: string | number;
  size?: FillSize;
  strong?: boolean;
  /** Half-width line (sponsors): shrinks sooner. */
  half?: boolean;
}) {
  const text = present(value);
  // Long values are set a little smaller, the way a clerk writes smaller to keep to one line.
  const length = text?.length ?? 0;
  const [tight, tighter] = half ? [20, 27] : strong ? [34, 56] : [42, 56];
  const fit = length > tighter ? "pcert__fill--tighter" : length > tight ? "pcert__fill--tight" : "";
  const classes = ["pcert__fill", size ? `pcert__fill--${size}` : "", strong ? "pcert__fill--strong" : "", fit];
  return <span className={classes.filter(Boolean).join(" ")}>{text ?? " "}</span>;
}

function SignatureBlock({
  signatory,
  fallbackTitle,
  signOff,
  keepSpaceBelow,
}: {
  signatory: CertificateSignatory;
  fallbackTitle: string;
  signOff?: string;
  /** Baptism: an empty space under the signatory, so the signature sits where it did when a verse filled it. */
  keepSpaceBelow?: boolean;
}) {
  return (
    <div className="pcert__signature">
      {signOff && <p className="pcert__signoff-in-sig">{signOff}</p>}
      <div className="pcert__sign-line">
        {signatory.signatureUrl && <img className="pcert__sign-image" src={signatory.signatureUrl} alt="" />}
      </div>
      <p className="pcert__sign-name">{present(signatory.name) ?? " "}</p>
      <p className="pcert__sign-title">{present(signatory.title) ?? fallbackTitle}</p>
      {keepSpaceBelow && <div className="pcert__sign-space" aria-hidden="true" />}
    </div>
  );
}

/* ---------------- 1) Birth & Baptism (A5) ---------------- */

function BaptismBody({ data }: { data: BaptismCertificateData }) {
  const sponsors = data.sponsors.map((s) => present(s)).filter((s): s is string => Boolean(s));
  // The first sponsor follows "The Sponsors Being", the last follows "and"; at least two lines.
  const sponsorLines = sponsors.length >= 2 ? sponsors : [sponsors[0], undefined];
  const remarks = (data.remarks ?? []).map((r) => present(r)).filter((r): r is string => Boolean(r));

  return (
    <>
      <p className="pcert__subtitle pcert__subtitle--blackletter">This is to Certify</p>
      {/* Extra sponsor or remarks lines: a slightly tighter pitch keeps it on one page. */}
      <div className={`pcert__body pcert__bap${sponsorLines.length > 2 || remarks.length > 0 ? " pcert__bap--dense" : ""}`}>
        <Line label="That">
          <Fill value={data.childName} strong />
        </Line>
        <Line label="Child of">
          <Fill value={data.fatherName} />
        </Line>
        <Line label="And">
          <Fill value={data.motherName} />
        </Line>
        <Line label="Born in">
          <Fill value={data.placeOfBirth} />
        </Line>
        <DateLine iso={data.dateOfBirth} />
        <p className="pcert__bap-rite">was solemnly Baptized according to the Rite of the Roman Catholic Church</p>
        <DateLine iso={data.dateOfBaptism} />
        <Line label="By the Rev.">
          <Fill value={withoutRev(data.minister)} />
        </Line>
        {sponsorLines.map((name, i) => (
          <Line key={i} label={i === 0 ? "The Sponsors Being" : i === sponsorLines.length - 1 ? "and" : ""}>
            <Fill value={name} />
          </Line>
        ))}
        <p className="pcert__bap-line pcert__bap-register">
          As appears on the Baptismal Book No. <Fill value={data.bookNo} size="xs" /> Page No.{" "}
          <Fill value={data.pageNo} size="xs" /> Line No. <Fill value={data.lineNo} size="xs" /> of this Church
        </p>
        <Line label="Date of Issue">
          <Fill value={fullDate(data.issuedOn)} />
        </Line>
        {remarks.length > 0 && (
          <Line label="Remarks">
            <Fill value={remarks.join("; ")} />
          </Line>
        )}
      </div>
    </>
  );
}

/** "Label ________" with the line running to the right margin. */
function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="pcert__bap-line">
      {label && <span className="pcert__bap-label">{label}</span>}
      {children}
    </p>
  );
}

/** "On the [12th] day of [April], Year [1998]" */
function DateLine({ iso }: { iso?: string }) {
  const parts = dateParts(iso);
  return (
    <p className="pcert__bap-line pcert__bap-date">
      <span className="pcert__bap-label">On the</span>
      <Fill value={parts?.day} />
      <span>day of</span>
      <Fill value={parts?.month} />
      <span>, Year</span>
      <Fill value={parts?.year} />
    </p>
  );
}

/** The line already prints "by the Rev.", so drop a "Rev." the register entry starts with. */
function withoutRev(minister: string | undefined) {
  return minister?.replace(/^\s*(the\s+)?rev(erend|\.)?\s+/i, "");
}

/* ---------------- 2) Confirmation and 3) Death (Letter) ---------------- */

interface Entry {
  label: string;
  /** One string per printed line. Empty → a blank underline. */
  lines: (string | undefined)[];
}

function LetterBody({
  archive,
  entries,
  data,
}: {
  archive: string;
  entries: Entry[];
  data: ConfirmationCertificateData | DeathCertificateData;
}) {
  const issued = dateParts(data.issuedOn);
  const city = present(data.parish.city) ?? townFromAddress(data.parish.address);

  return (
    <div className="pcert__body">
      <p className="pcert__salutation">To Whom It May Concern:</p>
      <p className="pcert__intro">
        This is to certify that in the {archive} in our Parish Archives, the following entries can be found:
      </p>
      <div className="pcert__entries">
        {entries.map((entry) => (
          <EntryRow key={entry.label} entry={entry} />
        ))}
      </div>
      <p className="pcert__closing">
        Issued this <Fill value={issued?.day} size="xs" /> day of <Fill value={issued?.month} size="md" />{" "}
        <Fill value={issued?.year} size="sm" /> at {data.parish.name}
        {city ? `, ${city}` : ""} upon request of
        interested parties.
      </p>
    </div>
  );
}

function EntryRow({ entry }: { entry: Entry }) {
  const lines = entry.lines.map((l) => present(l)).filter((l): l is string => Boolean(l));
  return (
    <>
      <span className="pcert__label">{entry.label}</span>
      {lines.length > 0 ? (
        <span className="pcert__value">
          {lines.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </span>
      ) : (
        <span className="pcert__value pcert__value--blank" />
      )}
    </>
  );
}

function ConfirmationBody({ data }: { data: ConfirmationCertificateData }) {
  const entries: Entry[] = [
    { label: "Person Confirmed", lines: [data.personConfirmed] },
    { label: "Parish of Origin", lines: [data.parishOfOrigin] },
    { label: "Address", lines: [data.address] },
    { label: "Place of Baptism", lines: [data.placeOfBaptism] },
    { label: "Parents", lines: [data.fatherName, data.motherName] },
    { label: "Sponsors", lines: data.sponsors },
    { label: "Name of Minister", lines: [data.minister] },
    { label: "Date Confirmed", lines: [fullDate(data.dateConfirmed)] },
    { label: "Book No., Page No., Line No.", lines: [registerRef(data.bookNo, data.pageNo, data.lineNo)] },
  ];
  return <LetterBody archive="Book of Confirmation" entries={entries} data={data} />;
}

function DeathBody({ data }: { data: DeathCertificateData }) {
  const childOf = data.sex === "male" ? "Son of" : data.sex === "female" ? "Daughter of" : "Son/Daughter of";
  const entries: Entry[] = [
    { label: "Name of Deceased", lines: [data.nameOfDeceased] },
    { label: "Age", lines: [ageText(data.ageYears, data.ageMonths, data.ageDays)] },
    { label: childOf, lines: [data.fatherName, data.motherName] },
    { label: "Address", lines: [data.address] },
    { label: "Date of Death", lines: [fullDate(data.dateOfDeath)] },
    { label: "Date of Burial", lines: [fullDate(data.dateOfBurial)] },
    { label: "Place of Burial", lines: [data.placeOfBurial] },
    { label: "Name of Minister", lines: [data.minister] },
    { label: "Book No.", lines: [data.bookNo] },
    { label: "Page No.", lines: [data.pageNo] },
    { label: "Line No.", lines: [data.lineNo] },
  ];
  return <LetterBody archive="Book of Death" entries={entries} data={data} />;
}

/** "Book 4, Page 21, Line 8"; a part with no value prints as "____". */
function registerRef(book?: string, page?: string, line?: string): string | undefined {
  if (!present(book) && !present(page) && !present(line)) return undefined;
  const part = (label: string, value?: string) => `${label} ${present(value) ?? "____"}`;
  return [part("Book", book), part("Page", page), part("Line", line)].join(", ");
}
