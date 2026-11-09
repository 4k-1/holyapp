import { forwardRef, type ReactNode } from "react";
import type { FormName, MarriageCertificateData, MarriageCertificateParty } from "./certificateData";
import { dateParts, fullDate, present } from "./certificateFormat";
import { VerificationArea } from "./CertificateVerification";
import "./marriageCertificate.css";

/**
 * The Certificate of Marriage on the government's form: Municipal Form No. 97 (Revised
 * August 2016), Office of the Civil Registrar General, two pages of 8.5 × 13 in.
 *
 * The form's wording and boxes are kept as printed. What the parish register has is typed in;
 * everything else (registry numbers, signatures, the civil registrar's boxes, the affidavits)
 * is left blank to be completed by hand. The parish's QR verification strip sits under the
 * form on page 2.
 */
export const MarriageCertificate = forwardRef<
  HTMLDivElement,
  { data: MarriageCertificateData; appUrl: string }
>(function MarriageCertificate({ data, appUrl }, ref) {
  return (
    <div ref={ref} className="mcert" data-certificate-type="MARRIAGE">
      <FrontPage data={data} />
      <BackPage data={data} appUrl={appUrl} />
    </div>
  );
});

/* ---------------- Small pieces ---------------- */

/** A typed value on a line; blank when there is nothing to print. */
function Blank({
  value,
  w,
  dotted,
  center,
  stretch,
}: {
  value?: string | number;
  /** Width in mm; grows to fill when absent. */
  w?: number;
  dotted?: boolean;
  center?: boolean;
  /** Grow past `w` and wrap instead of cutting a long value short (names). */
  stretch?: boolean;
}) {
  const text = present(value);
  const classes = [
    "mf-blank",
    dotted ? "mf-blank--dotted" : "",
    w ? "" : "mf-blank--grow",
    center ? "mf-center" : "",
    stretch ? "mf-blank--stretch" : "",
  ];
  const style = w ? (stretch ? { minWidth: `${w}mm` } : { width: `${w}mm` }) : undefined;
  return (
    <span className={classes.filter(Boolean).join(" ")} style={style}>
      {text ?? " "}
    </span>
  );
}

function Box({ checked }: { checked?: boolean }) {
  return <span className="mf-box">{checked ? "✓" : ""}</span>;
}

/** Values over the form's small hints, e.g. (Day) (Month) (Year). One value spans them all. */
function Slots({ hints, values, hintsBelow }: { hints: string[]; values: (string | number | undefined)[]; hintsBelow?: boolean }) {
  const hintRow = (
    <div className="mf-slots__hints">
      {hints.map((h) => (
        <span key={h}>{h}</span>
      ))}
    </div>
  );
  const shown = values.map((v) => present(v));
  const valueRow =
    shown.length === 1 ? (
      <div className="mf-slots__values mf-slots__values--span">{shown[0] ?? " "}</div>
    ) : (
      <div className="mf-slots__values">
        {shown.map((v, i) => (
          <span key={i}>{v ?? " "}</span>
        ))}
      </div>
    );
  return (
    <div className="mf-slots">
      {hintsBelow ? (
        <>
          {valueRow}
          {hintRow}
        </>
      ) : (
        <>
          {hintRow}
          {valueRow}
        </>
      )}
    </div>
  );
}

function nameParts(name?: FormName) {
  return [name?.first, name?.middle, name?.last];
}

function displayName(name?: FormName) {
  return nameParts(name)
    .map((p) => present(p))
    .filter(Boolean)
    .join(" ");
}

/** Whole years between two ISO dates. */
function ageOn(dob?: string, on?: string) {
  const b = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob ?? "");
  const a = /^(\d{4})-(\d{2})-(\d{2})/.exec(on ?? "");
  if (!a || !b) return undefined;
  let age = Number(a[1]) - Number(b[1]);
  if (Number(a[2]) < Number(b[2]) || (a[2] === b[2] && Number(a[3]) < Number(b[3]))) age--;
  return age >= 0 ? age : undefined;
}

/** "16:30" → "4:30 PM"; anything else is printed as stored. */
function timeText(time?: string) {
  const text = present(time);
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(text ?? "");
  if (!m) return text;
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

/** "2022-06-14" → ["14", "June", "2022"]. */
function plainDate(iso?: string): [string?, string?, string?] {
  const parts = dateParts(iso);
  if (!parts) return [];
  return [String(Number(iso!.slice(8, 10))), parts.month, parts.year];
}

/* ---------------- Page 1 ---------------- */

function FrontPage({ data }: { data: MarriageCertificateData }) {
  const { husband, wife } = data;
  const witnesses = data.witnesses.map((w) => present(w));
  const [mDay, mMonth, mYear] = plainDate(data.dateOfMarriage);
  const signed = dateParts(data.dateOfMarriage);
  const licensed = Boolean(present(data.marriageLicenseNo));

  return (
    <section className="mcert__page">
      <div className="mf-frame">
        <header className="mf-head">
          <div className="mf-head__form">
            Municipal Form No. 97
            <br />
            (Revised August 2016)
          </div>
          <div className="mf-head__center">
            <div>Republic of the Philippines</div>
            <div>OFFICE OF THE CIVIL REGISTRAR GENERAL</div>
            <h1 className="mf-title">CERTIFICATE OF MARRIAGE</h1>
          </div>
          <div className="mf-head__note">(To be accomplished in quadruplicate using black ink)</div>
        </header>

        <div className="mf-place">
          <div className="mf-place__left">
            <p className="mf-line">
              Province <Blank value={data.province} />
            </p>
            <p className="mf-line">
              City/Municipality <Blank value={data.cityMunicipality} />
            </p>
          </div>
          <div className="mf-place__right">
            Registry No.
            <div className="mf-place__registry">{present(data.registryNo) ?? " "}</div>
          </div>
        </div>

        <div className="mf-grid">
          <div className="mf-grid__corner" />
          <div className="mf-grid__party">HUSBAND</div>
          <div className="mf-grid__party">WIFE</div>

          <Row n="1." label="Name of Contracting Parties" tall>
            <NameCell name={husband.name} />
            <NameCell name={wife.name} />
          </Row>
          <Row n="2a." label="Date of Birth" n2="2b." label2="Age">
            <BirthCell party={husband} on={data.dateOfMarriage} />
            <BirthCell party={wife} on={data.dateOfMarriage} />
          </Row>
          <Row n="3." label="Place of Birth">
            <Slots hints={["(City/Municipality)", "(Province)", "(Country)"]} values={[husband.placeOfBirth]} />
            <Slots hints={["(City/Municipality)", "(Province)", "(Country)"]} values={[wife.placeOfBirth]} />
          </Row>
          <Row n="4a." label="Sex" n2="4b." label2="Citizenship">
            <SexCell party={husband} />
            <SexCell party={wife} />
          </Row>
          <Row n="5." label="Residence">
            <Slots hints={["(House No., St., Barangay, City/Municipality, Province, Country)"]} values={[husband.residence]} />
            <Slots hints={["(House No., St., Barangay, City/Municipality, Province, Country)"]} values={[wife.residence]} />
          </Row>
          <Row n="6." label="Religion/ Religious Sect">
            <Plain value={husband.religion} />
            <Plain value={wife.religion} />
          </Row>
          <Row n="7." label="Civil Status" short>
            <Plain value={husband.civilStatus} />
            <Plain value={wife.civilStatus} />
          </Row>
          <Row n="8." label="Name of Father">
            <Slots hints={["(First)", "(Middle)", "(Last)"]} values={nameParts(husband.father)} />
            <Slots hints={["(First)", "(Middle)", "(Last)"]} values={nameParts(wife.father)} />
          </Row>
          <Row n="9." label="Citizenship" short>
            <Plain value={husband.fatherCitizenship} />
            <Plain value={wife.fatherCitizenship} />
          </Row>
          <Row n="10." label="Maiden Name of Mother">
            <Slots hints={["(First)", "(Middle)", "(Last)"]} values={nameParts(husband.mother)} />
            <Slots hints={["(First)", "(Middle)", "(Last)"]} values={nameParts(wife.mother)} />
          </Row>
          <Row n="11." label="Citizenship" short>
            <Plain value={husband.motherCitizenship} />
            <Plain value={wife.motherCitizenship} />
          </Row>
          <Row n="12." label="Name of Person/ Wali Who Gave Consent or Advice" small>
            <Slots hints={["(First)", "(Middle)", "(Last)"]} values={nameParts(husband.consent?.name)} />
            <Slots hints={["(First)", "(Middle)", "(Last)"]} values={nameParts(wife.consent?.name)} />
          </Row>
          <Row n="13." label="Relationship" short>
            <Plain value={husband.consent?.relationship} />
            <Plain value={wife.consent?.relationship} />
          </Row>
          <Row n="14." label="Residence" last>
            <Slots
              hints={["(House No., St., Barangay, City/Municipality, Province, Country)"]}
              values={[husband.consent?.residence]}
            />
            <Slots
              hints={["(House No., St., Barangay, City/Municipality, Province, Country)"]}
              values={[wife.consent?.residence]}
            />
          </Row>
        </div>

        <div className="mf-lower">
          <div className="mf-item mf-item--15">
            <span className="mf-nowrap">15. Place of Marriage:</span>
            <div className="mf-item__fill">
              <div className="mf-dotted-values">
                <span>{present(data.placeOfMarriage) ?? " "}</span>
                <span>{present(data.marriageAddress) ?? " "}</span>
              </div>
              <div className="mf-hints-under mf-hints-under--15">
                <span>(Office of the/House of/Barangay of/Church of/Mosque of)</span>
                <span>(City/Municipality)</span>
                <span>(Province)</span>
              </div>
            </div>
          </div>

          <div className="mf-item mf-item--16">
            <span className="mf-nowrap">16. Date of Marriage:</span>
            <div className="mf-item__fill mf-item__fill--date">
              <Slots hints={["(Day)", "(Month)", "(Year)"]} values={[mDay, mMonth, mYear]} hintsBelow />
            </div>
            <span className="mf-nowrap mf-item__time">
              17. Time of Marriage: <Blank value={timeText(data.timeOfMarriage)} w={32} dotted center /> am/pm
            </span>
          </div>

          <div className="mf-text">
            <p>18. CERTIFICATION OF THE CONTRACTING PARTIES:</p>
            <p className="mf-indent mf-text__left">
              THIS IS TO CERTIFY: That I, <Blank value={displayName(husband.name)} w={56} dotted center stretch />,
              and I, <Blank value={displayName(wife.name)} w={56} dotted center stretch />, both of
            </p>
            <p>
              legal age, of our own free will and accord, and in the presence of the person solemnizing this marriage
              and of the witnesses named below, take each other as husband and wife and certifying further that we:{" "}
              <Box /> have entered, a copy of which is hereto attached / <Box /> have not entered into a marriage
              settlement.
            </p>
            <p className="mf-indent">
              IN WITNESS WHEREOF, we have signed/marked with our fingerprint this certificate in quadruplicate this{" "}
              <Blank value={signed?.day} w={13} dotted center /> day of{" "}
              <Blank value={signed?.month} w={24} dotted center />, <Blank value={signed?.year} w={11} dotted center />.
            </p>
          </div>

          <div className="mf-signs mf-signs--two">
            <SignLine caption="(Signature of Husband)" />
            <SignLine caption="(Signature of Wife)" />
          </div>

          <div className="mf-text">
            <p>19. CERTIFICATION OF THE SOLEMNIZING OFFICER:</p>
            <p className="mf-indent">
              THIS IS TO CERTIFY: THAT BEFORE ME, on the date and place above-written, personally appeared the
              above-mentioned parties, with their mutual consent, lawfully joined together in marriage which was
              solemnized by me in the presence of the witnesses named below, all of legal age.
            </p>
            <p className="mf-indent">I CERTIFY FURTHER THAT:</p>
            <div className="mf-check">
              <Box checked={licensed} />
              <p>
                a. Marriage License No. <Blank value={data.marriageLicenseNo} w={52} dotted center /> issued on{" "}
                <Blank value={fullDate(data.marriageLicenseIssuedOn)} w={46} dotted center /> at{" "}
                <Blank value={data.marriageLicenseIssuedAt} dotted center />
                <br />
                in favor of said parties, was exhibited to me.
              </p>
            </div>
            <div className="mf-check">
              <Box />
              <p>
                b. no marriage license was necessary, the marriage being solemnized under Art.
                <Blank w={14} dotted /> of Executive Order No. 209.
              </p>
            </div>
            <div className="mf-check">
              <Box />
              <p>c. the marriage was solemnized in accordance with the provisions of Presidential Decree No. 1083.</p>
            </div>
          </div>

          <div className="mf-signs mf-signs--three">
            <SignLine caption="(Signature Over Printed Name of Solemnizing Officer)" value={data.solemnizingOfficer} />
            <SignLine caption="(Position/Designation)" value={data.officerPosition} />
            <SignLine
              caption="(Religion/Religious Sect, Registry No. and Expiration Date, if applicable)"
              value={data.officerReligion}
            />
          </div>

          <div className="mf-witnesses">
            <p>
              20a. WITNESSES (Print Name and Sign):
              <br />
              <span className="mf-indent-sm">Additional at the back</span>
            </p>
            <div className="mf-witnesses__row">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="mf-witness">
                  {witnesses[i] ?? " "}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mf-registrar">
          <RegistrarBox title="21. RECEIVED BY" />
          <RegistrarBox title="22. REGISTERED AT THE OFFICE OF THE CIVIL REGISTRAR" />
        </div>

        <div className="mf-remarks">REMARKS/ANNOTATIONS (For LCRO/OCRG/Shari&apos;a Circuit Registrar Use Only)</div>

        <div className="mf-codes">
          <p>TO BE FILLED-UP AT THE OFFICE OF THE CIVIL REGISTRAR</p>
          <div className="mf-codes__row">
            {CODE_BOXES.map(([label, count]) => (
              <div key={label} className="mf-code">
                <span>{label}</span>
                <div className="mf-code__boxes">
                  {Array.from({ length: count }, (_, i) => (
                    <span key={i} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const CODE_BOXES: [string, number][] = [
  ["4bH", 2],
  ["4bW", 2],
  ["5H", 8],
  ["5W", 8],
  ["6H", 2],
  ["6W", 2],
  ["7H", 2],
  ["7W", 2],
];

function Row({
  n,
  label,
  n2,
  label2,
  children,
  tall,
  short,
  small,
  last,
}: {
  n: string;
  label: string;
  n2?: string;
  label2?: string;
  children: [ReactNode, ReactNode];
  tall?: boolean;
  short?: boolean;
  small?: boolean;
  last?: boolean;
}) {
  const rowClass = ["mf-row", tall ? "mf-row--tall" : "", short ? "mf-row--short" : "", last ? "mf-row--last" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      <div className={`${rowClass} mf-row__label${small ? " mf-row__label--small" : ""}`}>
        <span>
          <span className="mf-row__n">{n}</span> {label}
        </span>
        {n2 && (
          <span>
            <span className="mf-row__n">{n2}</span> {label2}
          </span>
        )}
      </div>
      <div className={`${rowClass} mf-row__cell`}>{children[0]}</div>
      <div className={`${rowClass} mf-row__cell mf-row__cell--wife`}>{children[1]}</div>
    </>
  );
}

function Plain({ value }: { value?: string }) {
  return <div className="mf-plain">{present(value) ?? " "}</div>;
}

function NameCell({ name }: { name: FormName }) {
  return (
    <div className="mf-name">
      {(
        [
          ["(First)", name.first],
          ["(Middle)", name.middle],
          ["(Last)", name.last],
        ] as const
      ).map(([hint, value]) => (
        <div key={hint} className="mf-name__line">
          <span className="mf-hint">{hint}</span>
          <span className="mf-name__value">{present(value) ?? " "}</span>
        </div>
      ))}
    </div>
  );
}

function BirthCell({ party, on }: { party: MarriageCertificateParty; on?: string }) {
  const [day, month, year] = plainDate(party.dateOfBirth);
  const age = party.age ?? ageOn(party.dateOfBirth, on);
  return (
    <div className="mf-split mf-split--age">
      <Slots hints={["(Day)", "(Month)", "(Year)"]} values={[day, month, year]} />
      <Slots hints={["(Age)"]} values={[age]} />
    </div>
  );
}

function SexCell({ party }: { party: MarriageCertificateParty }) {
  return (
    <div className="mf-split mf-split--sex">
      <Slots hints={[""]} values={[party.sex]} />
      <Slots hints={["(Citizenship)"]} values={[party.citizenship]} />
    </div>
  );
}

function SignLine({ caption, value }: { caption: string; value?: string }) {
  return (
    <div className="mf-sign">
      <div className="mf-sign__value">{present(value) ?? " "}</div>
      <div className="mf-sign__caption">{caption}</div>
    </div>
  );
}

function RegistrarBox({ title }: { title: string }) {
  return (
    <div className="mf-registrar__box">
      <p className="mf-registrar__title">{title}</p>
      {["Signature", "Name in Print", "Title or Position", "Date"].map((label) => (
        <p key={label} className="mf-line">
          {label} <Blank />
        </p>
      ))}
    </div>
  );
}

/* ---------------- Page 2 ---------------- */

function BackPage({ data, appUrl }: { data: MarriageCertificateData; appUrl: string }) {
  const more = data.witnesses
    .map((w) => present(w))
    .filter(Boolean)
    .slice(4);
  const issued = fullDate(data.issuedOn);
  const register = [
    present(data.bookNo) && `Book ${data.bookNo}`,
    present(data.pageNo) && `Page ${data.pageNo}`,
    present(data.lineNo) && `Line ${data.lineNo}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="mcert__page mcert__page--back">
      <div className="mf-frame mf-frame--back">
        <div className="mf-back-witnesses">
          <p>
            20b. <b>WITNESSES</b> (Print Name and Sign):
          </p>
          {[0, 1].map((row) => (
            <div key={row} className="mf-witnesses__row">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="mf-witness">
                  {more[row * 4 + i] ?? " "}
                </span>
              ))}
            </div>
          ))}
        </div>

        <div className="mf-affidavit">
          <h2>AFFIDAVIT OF SOLEMNIZING OFFICER</h2>
          <p className="mf-indent">
            I, <Blank w={62} />, of legal age, Solemnizing Officer of <Blank w={58} /> with address at
          </p>
          <p>
            <Blank w={80} />, after having sworn to in accordance with law, do hereby depose and say:
          </p>
          <p>
            1. That I have solemnized the marriage between <Blank w={62} /> and <Blank w={62} />;
          </p>
          <div className="mf-check">
            <span className="mf-check__n">2.</span>
            <Box />
            <p>
              a. That I have ascertained the qualifications of the contracting parties and have found no legal
              impediment for them to marry as required by Article 34 of the Family Code;
            </p>
          </div>
          <div className="mf-check mf-check--sub">
            <Box />
            <p>b. That this marriage was performed in articulo mortis or at the point of death;</p>
          </div>
          <div className="mf-check mf-check--sub">
            <Box />
            <p>
              c. That the contracting party/ies <Blank w={58} /> and <Blank w={58} />, being at the point of death
              and physically unable to sign the foregoing certificate of marriage by signature or mark, one of the
              witnesses to the marriage; sign for him or her by writing the dying party&apos;s name and beneath it, the
              witness&apos; own signature preceded by the preposition &ldquo;By&rdquo;;
            </p>
          </div>
          <div className="mf-check mf-check--sub">
            <Box />
            <p>
              d. That the residence of either party is so located that there is no means of transportation to
              enable concerned party/parties to appear personally before the civil registrar;
            </p>
          </div>
          <div className="mf-check mf-check--sub">
            <Box />
            <p>
              e. That the marriage was among Muslims or among members of the Ethnic Cultural Communities and that
              the marriage was solemnized in accordance with their customs and practices;
            </p>
          </div>
          <p>
            3. That I took the necessary steps to ascertain the ages and relationship of the contracting parties and
            that neither of them are under any legal impediment to marry each other;
          </p>
          <p>
            4. That I am executing this affidavit to attest to the truthfulness of the foregoing statements for all
            legal intents and purposes.
          </p>
          <InTruthWhereof caption="Signature Over Printed Name of the Solemnizing Officer" />
          <SubscribedAndSworn />
        </div>

        <div className="mf-affidavit mf-affidavit--delayed">
          <h2>AFFIDAVIT FOR DELAYED REGISTRATION OF MARRIAGE</h2>
          <p className="mf-indent">
            I, <Blank w={70} />, of legal age, single/married/divorced/widow/widower, with residence and
          </p>
          <p>
            postal address <Blank />
          </p>
          <p>
            <Blank w={56} />, after having duly sworn in accordance with law do hereby depose and say:
          </p>
          <p>1. That I am the applicant for the delayed registration of</p>
          <div className="mf-check mf-check--sub">
            <Box />
            <p>
              my marriage with <Blank w={56} /> in <Blank w={46} /> on <Blank w={34} />.
            </p>
          </div>
          <div className="mf-check mf-check--sub">
            <Box />
            <p>
              the marriage between <Blank w={58} /> and <Blank w={58} /> in
              <br />
              <Blank w={46} /> on <Blank w={46} />.
            </p>
          </div>
          <p>
            2. That said marriage was solemnized by <Blank w={84} /> (Solemnizing Officer&apos;s name) under
          </p>
          <p className="mf-options">
            <span>
              a. <Box /> religious ceremony
            </span>
            <span>
              b. <Box /> civil ceremony
            </span>
            <span>
              c. <Box /> Muslim rites
            </span>
            <span>
              d. <Box /> tribal rites
            </span>
          </p>
          <p>3. That the marriage was solemnized:</p>
          <div className="mf-check mf-check--sub">
            <Box />
            <p>
              a. with marriage license no. <Blank w={34} /> issued on <Blank w={36} /> at <Blank />;
            </p>
          </div>
          <div className="mf-check mf-check--sub">
            <Box />
            <p>
              b. under Article <Blank w={16} /> (marriages of exceptional character);
            </p>
          </div>
          <p>
            4. (If the applicant is either the wife or husband) That I am a citizen of <Blank w={60} /> and my spouse
            is a citizen of <Blank w={60} />;
          </p>
          <p className="mf-indent">
            (If the applicant is other than the wife or husband) That the wife is a citizen of <Blank w={50} /> and
            the husband is a citizen of <Blank w={50} />;
          </p>
          <p>
            5. That the reason for the delay in registering our/their marriage is <Blank />;
          </p>
          <p>
            6. That I am executing this affidavit to attest to the truthfulness of the foregoing statements for all
            legal intents and purposes.
          </p>
          <InTruthWhereof caption="Signature Over Printed Name of Affiant" />
          <SubscribedAndSworn />
        </div>
      </div>

      <footer className="mcert__strip">
        <div className="mcert__strip-text">
          <strong>{data.parish.name}</strong>
          {present(data.parish.address) && <span>{data.parish.address}</span>}
          <span>Parish register: {register || "Book ____, Page ____, Line ____"}</span>
          <span>Copy issued on the {issued ?? "________________"}</span>
        </div>
        <VerificationArea verification={data.verification} appUrl={appUrl} />
      </footer>
    </section>
  );
}

function InTruthWhereof({ caption }: { caption: string }) {
  return (
    <>
      <p className="mf-indent mf-indent--deep">
        In truth whereof, I have affixed my signature below this <Blank w={13} /> day of <Blank w={36} />,{" "}
        <Blank w={16} /> at
        <br />
        <Blank w={80} />, Philippines.
      </p>
      <div className="mf-affiant">
        <SignLine caption={caption} />
      </div>
    </>
  );
}

function SubscribedAndSworn() {
  return (
    <>
      <p className="mf-indent mf-indent--deep">
        <b>SUBSCRIBED AND SWORN</b> to before me this <Blank w={16} /> day of <Blank w={36} />, <Blank w={16} /> at
      </p>
      <p>
        <Blank w={80} />, Philippines, affiant who exhibited to me his/her CTC/valid ID <Blank />
      </p>
      <p>
        issued on <Blank w={30} />, <Blank w={16} /> at <Blank />.
      </p>
      <div className="mf-signs mf-signs--admin">
        <SignLine caption="Signature of the Administering Officer" />
        <SignLine caption="Position/Title/Designation" />
        <SignLine caption="Name in Print" />
        <SignLine caption="Address" />
      </div>
    </>
  );
}
