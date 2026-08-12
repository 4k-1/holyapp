import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useState, type ReactNode, type SVGProps } from "react";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { HeartIcon } from "@/components/ui/icons/SacramentIcons";
import {
  generateMarriageCertificate,
  getMarriageRecord,
} from "@/features/parish-admin/records/api/marriageRecordsApi";
import { getBaptismalRecord } from "@/features/parish-admin/records/api/baptismalRecordsApi";
import { recordFullName } from "@/features/parish-admin/records/baptismalHelpers";
import { useAsync } from "@/hooks/useAsync";
import {
  calcAgeAt,
  certStatusTone,
  consentPersonName,
  coupleLabel,
  encodedByLabel,
  formatDateTime,
  formatRecordDate,
  formatRecordTime,
  getMarriageParty,
  groomFullName,
  initials,
  parentName,
  partyFullName,
} from "@/features/parish-admin/records/marriageHelpers";
import type { MarriageParty, MarriagePartyRole, MarriageRecord } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";

type Tone = "gold" | "green" | "blue" | "rose" | "neutral";

const TONE_STYLES: Record<Tone, { headerBg: string; iconBg: string; iconText: string; eyebrowText: string }> = {
  gold: {
    headerBg: "bg-admin-gold-100/40",
    iconBg: "bg-admin-gold-100",
    iconText: "text-admin-gold-700",
    eyebrowText: "text-admin-gold-700",
  },
  green: {
    headerBg: "bg-admin-green-050",
    iconBg: "bg-admin-green-100",
    iconText: "text-admin-green-700",
    eyebrowText: "text-admin-green-700",
  },
  blue: {
    headerBg: "bg-[#EAF2FB]",
    iconBg: "bg-[#D6EAF8]",
    iconText: "text-[#2F6FA8]",
    eyebrowText: "text-[#2F6FA8]",
  },
  rose: {
    headerBg: "bg-[#FBEFF3]",
    iconBg: "bg-[#F8D6E0]",
    iconText: "text-[#B85A75]",
    eyebrowText: "text-[#B85A75]",
  },
  neutral: {
    headerBg: "bg-admin-surface-alt",
    iconBg: "bg-admin-surface",
    iconText: "text-admin-ink-muted",
    eyebrowText: "text-admin-ink-muted",
  },
};

export function AdminMarriageRecordDetailPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { recordId = "" } = useParams();
  const navigate = useNavigate();
  const id = decodeURIComponent(recordId);

  const { data: record, loading, refetch } = useAsync(() => getMarriageRecord(parish.id, id), [parish.id, id]);
  const [generating, setGenerating] = useState(false);

  const groom = record ? getMarriageParty(record, "Groom") : undefined;
  const bride = record ? getMarriageParty(record, "Bride") : undefined;

  const { data: groomBaptism } = useAsync(
    () =>
      groom?.baptismalRecordId
        ? getBaptismalRecord(parish.id, groom.baptismalRecordId)
        : Promise.resolve(undefined),
    [parish.id, groom?.baptismalRecordId]
  );

  const { data: brideBaptism } = useAsync(
    () =>
      bride?.baptismalRecordId
        ? getBaptismalRecord(parish.id, bride.baptismalRecordId)
        : Promise.resolve(undefined),
    [parish.id, bride?.baptismalRecordId]
  );

  if (loading) {
    return (
      <div>
        <BackLink />
        <p className="text-[13.5px] text-admin-ink-muted">Loading record…</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div>
        <BackLink />
        <h1 className="mb-1 text-[26px] font-semibold text-admin-ink">Record not found</h1>
        <p className="text-[13.5px] text-admin-ink-muted">
          This marriage record is not available for this parish.
        </p>
      </div>
    );
  }

  const couple = coupleLabel(record);
  const certs = record.certificates;
  const latestCert = certs.find((c) => c.status === "Valid") ?? certs[0];
  const witnessNames = [record.witnessOne, record.witnessTwo].filter(Boolean);

  async function handleGenerateCertificate() {
    setGenerating(true);
    try {
      await generateMarriageCertificate(parish.id, record!.id);
      refetch();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-[920px]">
      <BackLink />

      <AdminCard className="mb-[18px] flex flex-wrap items-start justify-between gap-4 p-[26px] px-7">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-admin-gold-100 font-serif text-[17px] font-bold text-admin-gold-700 ring-1 ring-inset ring-admin-gold-600/20">
            {initials(groomFullName(record))}
          </div>
          <div>
            <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.6px] text-admin-gold-700">
              Marriage Record
            </p>
            <h1 className="mb-1.5 font-serif text-[24px] font-semibold leading-tight text-admin-ink">
              {couple}
            </h1>
            <p className="mb-2.5 text-[13px] text-admin-ink-muted">
              Married {formatRecordDate(record.dateOfMarriage)} at {record.placeOfMarriage}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-admin-border bg-admin-surface-alt px-2.5 py-1 font-mono text-xs text-admin-ink-muted">
                Book {record.bookNumber}
                <span className="text-admin-border-strong">/</span>
                Page {record.pageNumber}
                <span className="text-admin-border-strong">/</span>
                Entry {record.entryNumber}
              </span>
              <AdminBadge tone={record.status === "Archived" ? "muted" : "green"}>
                {record.status}
              </AdminBadge>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <AdminButton onClick={handleGenerateCertificate} disabled={generating}>
            <FileIcon />
            {generating ? "Generating…" : "Generate Certificate"}
          </AdminButton>
          <div className="flex gap-2">
            <AdminButton variant="secondary" className="flex-1" onClick={() => navigate("edit")}>
              <EditIcon />
              Edit
            </AdminButton>
            <AdminButton
              variant="danger"
              className="flex-1"
              onClick={() => console.info("[mock] archive record", record.id)}
            >
              <TrashIcon />
              Archive
            </AdminButton>
          </div>
        </div>
      </AdminCard>

      <AdminCard className="mb-4 overflow-hidden p-0">
        <SectionHeader
          tone="gold"
          icon={<HeartIcon className="h-4.5 w-4.5" />}
          eyebrow="Marriage Information"
          title={formatRecordDate(record.dateOfMarriage)}
          subtitle={marriageInfoSubtitle(record)}
        />
        <div className="p-5 px-[22px]">
          <InfoRow label="Date of marriage" value={formatRecordDate(record.dateOfMarriage)} />
          {record.timeOfMarriage && (
            <InfoRow label="Time of marriage" value={formatRecordTime(record.timeOfMarriage)} />
          )}
          <InfoRow label="Place of marriage" value={record.placeOfMarriage} />
          <InfoRow
            label="Marriage address"
            value={record.marriageAddress || "—"}
            last
          />
        </div>
      </AdminCard>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {groom && (
          <PartyDetailCard
            party={groom}
            marriageDate={record.dateOfMarriage}
            linkedBaptism={groomBaptism}
            baptismRecordId={groom.baptismalRecordId}
            tone="blue"
          />
        )}
        {bride && (
          <PartyDetailCard
            party={bride}
            marriageDate={record.dateOfMarriage}
            linkedBaptism={brideBaptism}
            baptismRecordId={bride.baptismalRecordId}
            tone="rose"
          />
        )}
      </div>

      <AdminCard className="mb-4 overflow-hidden p-0">
        <SectionHeader
          tone="green"
          icon={<PeopleIcon className="h-4.5 w-4.5" />}
          eyebrow="Witnesses"
          title={`${witnessNames.length} Witness${witnessNames.length === 1 ? "" : "es"}`}
          subtitle={witnessNames.join(" & ") || "No witnesses on file"}
        />
        <div className="p-5 px-[22px]">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {[record.witnessOne, record.witnessTwo].map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="flex items-center justify-between gap-2.5 rounded-[9px] border border-admin-border bg-admin-surface-alt px-3.5 py-2.5"
              >
                <span className="text-[13.5px] font-semibold text-admin-ink">{name}</span>
                <span className="inline-flex items-center rounded-full bg-admin-green-100 px-2.5 py-1 text-[11px] font-semibold text-admin-green-700">
                  Witness {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </AdminCard>

      {record.remarks && (
        <AdminCard className="mb-4 overflow-hidden p-0">
          <SectionHeader
            tone="neutral"
            icon={<NoteIcon className="h-4.5 w-4.5" />}
            eyebrow="Notes"
            title="Remarks"
          />
          <div className="p-5 px-[22px]">
            <p className="text-[13.5px] leading-relaxed text-admin-ink">{record.remarks}</p>
          </div>
        </AdminCard>
      )}

      <AdminCard className="mb-4 overflow-hidden p-0">
        <SectionHeader
          tone="neutral"
          icon={<ClockIcon className="h-4.5 w-4.5" />}
          eyebrow="Record Metadata"
          title={`Logged by ${encodedByLabel(record.encodedBy)}`}
          subtitle={metadataSubtitle(record)}
        />
        <div className="p-5 px-[22px]">
          <InfoRow label="Encoded by" value={encodedByLabel(record.encodedBy)} />
          <InfoRow label="Created" value={formatDateTime(record.createdAt)} />
          <InfoRow label="Last updated" value={formatDateTime(record.updatedAt)} last />
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden p-0">
        <SectionHeader
          tone="green"
          icon={<FileIcon className="h-4.5 w-4.5" />}
          eyebrow="Certificates"
          title={certs.length ? `${certs.length} Certificate${certs.length === 1 ? "" : "s"} Issued` : "No Certificates Issued"}
          subtitle={
            latestCert
              ? `Latest: ${latestCert.status} · Issued ${latestCert.date} by ${latestCert.by}`
              : "Generate one using the button above once ready."
          }
          right={latestCert && <AdminBadge tone={certStatusTone(latestCert.status)}>{latestCert.status}</AdminBadge>}
        />

        <div className="px-[22px]">
          {certs.length === 0 ? (
            <p className="py-5 text-[11.5px] text-admin-ink-faint">
              No certificates have been generated from this record yet.
            </p>
          ) : (
            certs.map((c, i) => (
              <div
                key={c.code}
                className={`flex flex-wrap items-center justify-between gap-3 py-3 ${
                  i < certs.length - 1 ? "border-b border-admin-border" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-admin-ink">
                    {c.type}
                    <AdminBadge tone={certStatusTone(c.status)}>{c.status}</AdminBadge>
                  </div>
                  <p className="mt-0.5 text-xs text-admin-ink-muted">
                    Issued {c.date} by {c.by} · {c.code}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <AdminButton
                    variant="secondary"
                    size="sm"
                    onClick={() => console.info("[mock] verify", c.code)}
                  >
                    Verify
                  </AdminButton>
                  <AdminButton
                    variant="secondary"
                    size="sm"
                    onClick={() => console.info("[mock] download", c.code)}
                  >
                    Download
                  </AdminButton>
                </div>
              </div>
            ))
          )}
        </div>
      </AdminCard>
    </div>
  );
}

function marriageInfoSubtitle(record: MarriageRecord) {
  const parts = [record.placeOfMarriage];
  if (record.marriageAddress) parts.push(record.marriageAddress);
  const location = parts.join(", ");
  return record.timeOfMarriage ? `${location} · ${formatRecordTime(record.timeOfMarriage)}` : location;
}

function metadataSubtitle(record: MarriageRecord) {
  const created = `Created ${formatDateTime(record.createdAt)}`;
  if (record.updatedAt && record.updatedAt !== record.createdAt) {
    return `${created} · Updated ${formatDateTime(record.updatedAt)}`;
  }
  return created;
}

function SectionHeader({
  icon,
  eyebrow,
  title,
  subtitle,
  tone = "neutral",
  right,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  tone?: Tone;
  right?: ReactNode;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <div className={`flex items-center gap-3 border-b border-admin-border px-[22px] py-4 ${styles.headerBg}`}>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${styles.iconBg} ${styles.iconText}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] font-bold uppercase tracking-[0.6px] ${styles.eyebrowText}`}>{eyebrow}</p>
        <h2 className="truncate font-serif text-[17px] font-semibold leading-tight text-admin-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-[12.5px] text-admin-ink-muted">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

function PartyDetailCard({
  party,
  marriageDate,
  linkedBaptism,
  baptismRecordId,
  tone,
}: {
  party: MarriageParty;
  marriageDate: string;
  linkedBaptism?: { bookNumber: string; pageNumber: string; entryNumber: string; firstName: string; middleName: string; lastName: string };
  baptismRecordId?: string;
  tone: Tone;
}) {
  const roleLabel: Record<MarriagePartyRole, string> = { Groom: "Groom", Bride: "Bride" };
  const father = parentName({
    firstName: party.fatherFirstName,
    lastName: party.fatherLastName,
    middleInitial: party.fatherMiddleInitial,
  });
  const mother = parentName({
    firstName: party.motherFirstName,
    lastName: party.motherLastName,
    middleInitial: party.motherMiddleInitial,
  });
  const age = calcAgeAt(party.dateOfBirth, marriageDate);
  const subtitle = [age !== null ? `${age} yrs old` : null, party.civilStatus].filter(Boolean).join(" · ");

  return (
    <AdminCard className="overflow-hidden p-0">
      <SectionHeader
        tone={tone}
        icon={<span className="font-serif text-[13px] font-bold">{initials(partyFullName(party))}</span>}
        eyebrow={roleLabel[party.role]}
        title={partyFullName(party)}
        subtitle={subtitle || undefined}
      />
      <div className="p-5 px-[22px]">
        <InfoRow label="Date of birth" value={formatRecordDate(party.dateOfBirth)} />
        {party.birthplace && <InfoRow label="Birthplace" value={party.birthplace} />}
        {party.sex && <InfoRow label="Sex" value={party.sex} />}
        {party.citizenship && <InfoRow label="Citizenship" value={party.citizenship} />}
        {party.address && <InfoRow label="Address" value={party.address} />}
        {party.religion && <InfoRow label="Religion" value={party.religion} />}
        {party.civilStatus && <InfoRow label="Civil status" value={party.civilStatus} />}
        {father && <InfoRow label="Father" value={father} />}
        {mother && <InfoRow label="Mother" value={mother} />}
        {baptismRecordId ? (
          <div className="flex items-baseline justify-between gap-4 border-t border-admin-border py-[10.5px]">
            <span className="shrink-0 text-xs text-admin-ink-muted">Baptismal record</span>
            <Link
              to={`../../baptismal/${encodeURIComponent(baptismRecordId)}`}
              className="text-right text-[13.5px] font-semibold text-admin-green-700 hover:underline"
            >
              {linkedBaptism ? recordFullName(linkedBaptism) : baptismRecordId} — Bk{" "}
              {linkedBaptism?.bookNumber ?? "?"}:{linkedBaptism?.pageNumber ?? "?"}:
              {linkedBaptism?.entryNumber ?? "?"}
            </Link>
          </div>
        ) : null}
        {party.consentPersons.length > 0 && (
          <div className="mt-3 border-t border-admin-border pt-3">
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.6px] text-admin-gold-700">
              Consent given by
            </p>
            {party.consentPersons.map((c) => (
              <div
                key={c.id}
                className="mb-2 rounded-[8px] border border-admin-border bg-admin-surface-alt px-3 py-2 last:mb-0"
              >
                <p className="text-[13px] font-semibold text-admin-ink">{consentPersonName(c) || "—"}</p>
                <p className="text-xs text-admin-ink-muted">
                  {[c.relation, c.residence].filter(Boolean).join(" · ") || "No details"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminCard>
  );
}

function BackLink() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] text-admin-ink-muted hover:text-admin-green-700"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </button>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-[10.5px] ${
        last ? "" : "border-b border-admin-border"
      }`}
    >
      <span className="shrink-0 text-xs text-admin-ink-muted">{label}</span>
      <span className="text-right text-[13.5px] font-semibold text-admin-ink">{value}</span>
    </div>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" strokeLinejoin="round" />
    </svg>
  );
}

function FileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <polyline points="14 3 14 8 19 8" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <polyline points="3 6 5 6 21 6" strokeLinecap="round" />
      <path d="M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinejoin="round" />
    </svg>
  );
}

function PeopleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" strokeLinecap="round" />
      <circle cx="17" cy="8.5" r="2.4" />
      <path d="M15.5 15.2c2.6.3 4.5 2.1 4.5 4.8" strokeLinecap="round" />
    </svg>
  );
}

function NoteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" strokeLinejoin="round" />
      <path d="M15 3v5h5" strokeLinejoin="round" />
      <line x1="8" y1="13" x2="16" y2="13" strokeLinecap="round" />
      <line x1="8" y1="17" x2="13" y2="17" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
