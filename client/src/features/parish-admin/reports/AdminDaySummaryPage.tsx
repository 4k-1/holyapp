import { useEffect, useState, type ReactNode } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { PrintSheet } from "@/components/print/PrintSheet";
import { usePrintJob } from "@/components/print/usePrintJob";
import { AdminButton, AdminInput, AdminSelect, PrintIcon } from "@/features/parish-admin/components/AdminForm";
import { AdminPage, AdminPageHeader } from "@/features/parish-admin/components/AdminPageHeader";
import { formatAmount } from "@/features/parish-admin/donations/donationsHelpers";
import { REPRINT_REASONS } from "@/features/parish-admin/requests/api/requestsAdminApi";
import type { ReportsOutletContext } from "@/features/parish-admin/reports/AdminReportsLayout";
import {
  getDaySummary,
  type DaySummary,
  type MoneyMethod,
  type ReceiptKind,
} from "@/features/parish-admin/reports/api/daySummaryApi";
import "./daySummaryPrint.css";

const KIND_LABELS: Record<ReceiptKind, string> = {
  certificate: "Certificate fees",
  intention: "Mass intention offerings",
  donation: "Donations",
};

const METHOD_LABELS: Record<MoneyMethod, string> = { cash: "Cash", gcash: "GCash", other: "Cheque / transfer" };

const CHANNEL_LABELS = { walkin: "Walk-in", pickup: "Online, pickup", digital: "Online, digital" } as const;

const labelClass = "mb-1.5 block text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted";

function timeOf(at: string) {
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function longDay(day: string) {
  const date = new Date(`${day}T00:00:00`);
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function reprintReason(reason: string, note: string | null) {
  const label = REPRINT_REASONS.find((r) => r.value === reason)?.label ?? reason;
  return note ? `${label}: ${note}` : label;
}

function Tile({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="day-sheet__tile rounded-[var(--radius)] border border-admin-border bg-admin-surface px-4 py-3">
      <p className="text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">{label}</p>
      <p className="mt-1 text-[1.35rem] font-semibold text-admin-ink tabular-nums">{value}</p>
      {note && <p className="text-admin-support text-admin-ink-muted">{note}</p>}
    </div>
  );
}

function Section({ title, children, empty }: { title: string; children: ReactNode; empty?: string }) {
  return (
    <section className="day-sheet__section mb-5 rounded-[var(--radius)] border border-admin-border bg-admin-surface px-4 py-3.5 shadow-[var(--shadow-card)]">
      <h2 className="mb-2 text-[0.95rem] font-semibold text-admin-ink">{title}</h2>
      {empty ? <p className="text-admin-support text-admin-ink-muted">{empty}</p> : children}
    </section>
  );
}

function Table({ headers, right = [], children }: { headers: string[]; right?: number[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-admin-support">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={h}
                className={`border-b border-admin-border py-2 pr-3 font-medium text-admin-ink-faint ${
                  right.includes(i) ? "text-right" : "text-left"
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const td = "border-b border-admin-border/60 py-2 pr-3 align-top text-admin-ink";
const tdRight = `${td} text-right tabular-nums`;

/** The summary itself. The same sheet shows on screen and prints; `forPrint` adds the lines to sign. */
function DaySheet({ day, parishName, forPrint = false }: { day: DaySummary; parishName: string; forPrint?: boolean }) {
  const who = day.staffId ? (day.staff.find((s) => s.id === day.staffId)?.name ?? "Staff") : "Whole office";
  const { certificates: certs, money } = day;
  const anyOther = money.other > 0;

  return (
    <div className="day-sheet">
      {forPrint && (
        <header className="mb-4">
          <p className="text-admin-support">{parishName}</p>
          <h1 className="text-[1.3rem] font-semibold">Day summary</h1>
          <p className="text-admin-support">
            {longDay(day.date)} · {who}
          </p>
        </header>
      )}

      <div className="day-sheet__tiles mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Copies issued" value={certs.issued} />
        <Tile label="Reprints" value={certs.reprinted} note="Same copy, not counted again" />
        <Tile label="Spoiled" value={certs.spoiled} />
        <Tile label="Cash" value={formatAmount(money.cash)} note={day.staffId ? "Collected by this person" : "Should be in the drawer"} />
        {day.staffId ? (
          <Tile label="GCash" value="—" note="Paid online, not by staff" />
        ) : (
          <Tile label="GCash" value={formatAmount(money.gcash)} note="Paid online" />
        )}
        <Tile
          label="Total"
          value={formatAmount(money.total)}
          note={
            [
              anyOther ? `Includes ${formatAmount(money.other)} cheque / transfer` : "",
              money.pending > 0 ? `${formatAmount(money.pending)} waiting to clear, not counted` : "",
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          }
        />
      </div>

      {day.warnings.length > 0 && (
        <section className="day-sheet__warnings mb-5 rounded-[var(--radius)] border border-admin-gold-600/40 bg-admin-gold-100 px-4 py-3">
          <h2 className="mb-1 text-[0.95rem] font-semibold text-admin-gold-700">Check before closing</h2>
          <ul className="list-disc space-y-0.5 pl-5 text-admin-support text-admin-ink">
            {day.warnings.map((w) => (
              <li key={`${w.kind}-${w.certificateId}`}>{w.message}</li>
            ))}
          </ul>
        </section>
      )}

      <Section title="Money by source" empty={money.byKind.length === 0 ? "No money came in on this day." : undefined}>
        <Table headers={["Source", "Receipts", "Cash", "GCash", ...(anyOther ? ["Cheque / transfer"] : []), "Total"]} right={[1, 2, 3, 4, 5]}>
          {money.byKind.map((line) => (
            <tr key={line.kind}>
              <td className={td}>{KIND_LABELS[line.kind]}</td>
              <td className={tdRight}>{line.count}</td>
              <td className={tdRight}>{formatAmount(line.cash)}</td>
              <td className={tdRight}>{formatAmount(line.gcash)}</td>
              {anyOther && <td className={tdRight}>{formatAmount(line.other)}</td>}
              <td className={`${tdRight} font-semibold`}>{formatAmount(line.total)}</td>
            </tr>
          ))}
          <tr>
            <td className={`${td} font-semibold`}>Total</td>
            <td className={`${tdRight} font-semibold`}>{day.receipts.length}</td>
            <td className={`${tdRight} font-semibold`}>{formatAmount(money.cash)}</td>
            <td className={`${tdRight} font-semibold`}>{formatAmount(money.gcash)}</td>
            {anyOther && <td className={`${tdRight} font-semibold`}>{formatAmount(money.other)}</td>}
            <td className={`${tdRight} font-semibold`}>{formatAmount(money.total)}</td>
          </tr>
        </Table>
      </Section>

      <Section title="Certificates issued" empty={certs.copies.length === 0 ? "No copies were issued on this day." : undefined}>
        <Table headers={["Time", "Number", "Name", "How", "Receipt", "Fee", "Issued by"]} right={[5]}>
          {certs.copies.map((c) => (
            <tr key={c.id}>
              <td className={td}>{timeOf(c.issuedAt)}</td>
              <td className={`${td} font-semibold`}>
                {c.code}
                {c.status === "spoiled" && <span className="ml-1.5 font-normal text-admin-red-700">Spoiled</span>}
                {c.status !== "valid" && c.status !== "spoiled" && (
                  <span className="ml-1.5 font-normal capitalize text-admin-ink-muted">{c.status}</span>
                )}
              </td>
              <td className={td}>
                {forPrint ? (
                  c.holderName
                ) : (
                  <Link to={`../../${c.recordPath}`} relative="path" className="text-admin-green-700 hover:underline">
                    {c.holderName}
                  </Link>
                )}
              </td>
              <td className={td}>{CHANNEL_LABELS[c.channel]}</td>
              <td className={td}>{c.receiptNumber ?? (c.channel === "walkin" ? <span className="text-admin-red-700">None</span> : "—")}</td>
              <td className={tdRight}>
                {c.amount == null ? "—" : `${formatAmount(c.amount)}${c.paid ? "" : " (unpaid)"}`}
              </td>
              <td className={td}>{c.issuedBy}</td>
            </tr>
          ))}
        </Table>
      </Section>

      {(certs.reprints.length > 0 || certs.spoiledCopies.length > 0) && (
        <Section title="Reprints and spoiled copies">
          <Table headers={["Time", "Number", "Name", "What", "Why", "By"]}>
            {certs.reprints.map((r) => (
              <tr key={r.id}>
                <td className={td}>{timeOf(r.at)}</td>
                <td className={td}>{r.code}</td>
                <td className={td}>{r.holderName}</td>
                <td className={td}>Reprinted</td>
                <td className={td}>{reprintReason(r.reason, r.note)}</td>
                <td className={td}>{r.by}</td>
              </tr>
            ))}
            {certs.spoiledCopies.map((s) => (
              <tr key={s.id}>
                <td className={td}>{timeOf(s.at)}</td>
                <td className={td}>{s.code}</td>
                <td className={td}>{s.holderName}</td>
                <td className={`${td} text-admin-red-700`}>Spoiled</td>
                <td className={td}>{s.reason}</td>
                <td className={td}>{s.by}</td>
              </tr>
            ))}
          </Table>
        </Section>
      )}

      <Section title="Receipts" empty={day.receipts.length === 0 ? "No receipts on this day." : undefined}>
        <Table headers={["Time", "Receipt", "For", "Name", "Paid by", "Amount", "Collected by"]} right={[5]}>
          {day.receipts.map((r) => (
            <tr key={`${r.kind}-${r.id}`}>
              <td className={td}>{timeOf(r.at)}</td>
              <td className={`${td} font-semibold`}>{r.receipt ?? "—"}</td>
              <td className={td}>
                {r.kind === "certificate"
                  ? `Certificate${r.certificateCode ? ` ${r.certificateCode}` : ""}`
                  : r.kind === "intention"
                    ? "Mass intention"
                    : "Donation"}
              </td>
              <td className={td}>{r.name ?? "—"}</td>
              <td className={td}>
                {METHOD_LABELS[r.method]}
                {r.reference ? ` ${r.reference}` : ""}
                {r.clearing === "pending" && <span className="block text-admin-gold-700">Waiting to clear</span>}
                {r.clearing === "bounced" && <span className="block text-admin-red-700">Bounced</span>}
              </td>
              <td className={`${tdRight} ${r.clearing === "cleared" ? "" : "text-admin-ink-faint line-through"}`}>
                {formatAmount(r.amount)}
              </td>
              <td className={td}>{r.by}</td>
            </tr>
          ))}
        </Table>
      </Section>

      {forPrint && (
        <section className="day-sheet__sign mt-6">
          <p className="mb-6">
            Cash counted: ₱ ____________________ &nbsp;&nbsp; Difference: ₱ ____________________
          </p>
          <div className="grid grid-cols-2 gap-10">
            <p className="border-t border-black pt-1 text-admin-support">Prepared by (staff)</p>
            <p className="border-t border-black pt-1 text-admin-support">Checked by (parish priest / admin)</p>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * A4: what happened on one day, for the whole office or one person. Worked out from the records each
 * time it opens; nothing is saved. Print it to count the drawer against it and sign it on paper.
 */
export function AdminDaySummaryPage() {
  const { parish } = useOutletContext<ReportsOutletContext>();
  // "" means today (Philippine time); the server says which day that is.
  const [date, setDate] = useState("");
  const [staffId, setStaffId] = useState("");
  const query = `${date}|${staffId}`;
  const [loaded, setLoaded] = useState<{ query: string; day: DaySummary } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printJob, setPrintJob] = usePrintJob<DaySummary>();
  // The last day stays on screen while the next one loads.
  const day = loaded?.day ?? null;
  const loading = loaded?.query !== query && !error;

  useEffect(() => {
    let cancelled = false;
    getDaySummary(date || undefined, staffId || undefined)
      .then((result) => {
        if (cancelled) return;
        setLoaded({ query: `${date}|${staffId}`, day: result });
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load this day.");
      });
    return () => {
      cancelled = true;
    };
  }, [date, staffId]);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Day Summary"
        description="Copies, receipts and money for one day, worked out from the records. Print it to count the drawer and sign it."
        actions={
          <AdminButton variant="secondary" onClick={() => day && setPrintJob(day)} disabled={!day || loading}>
            <PrintIcon />
            Print
          </AdminButton>
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-x-3 gap-y-3 rounded-[var(--radius)] border border-admin-border bg-admin-surface px-4 py-3.5 shadow-[var(--shadow-card)]">
        <label className="block">
          <span className={labelClass}>Day</span>
          <AdminInput
            type="date"
            value={date || day?.date || ""}
            onChange={(e) => {
              if (!e.target.value) return;
              setError(null);
              setDate(e.target.value);
            }}
            className="w-[170px]"
          />
        </label>
        <label className="block">
          <span className={labelClass}>Whose day</span>
          <AdminSelect value={staffId} onChange={(e) => {
              setError(null);
              setStaffId(e.target.value);
            }} className="w-auto min-w-[200px]">
            <option value="">Whole office</option>
            {day?.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </AdminSelect>
        </label>
        {day && (
          <p className="w-full text-admin-support text-admin-ink-muted sm:ml-auto sm:w-auto sm:self-center">
            {loading ? "Loading…" : longDay(day.date)}
          </p>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-admin-red-100 bg-admin-red-100 px-4 py-3 text-admin-body text-admin-red-700">
          {error}
        </p>
      )}

      {day ? (
        <DaySheet day={day} parishName={parish.name} />
      ) : (
        !error && <p className="text-admin-body text-admin-ink-muted">Loading this day…</p>
      )}

      {printJob && (
        <PrintSheet className="day-print-sheet">
          <div data-portal="admin">
            <DaySheet day={printJob} parishName={parish.name} forPrint />
          </div>
        </PrintSheet>
      )}
    </AdminPage>
  );
}
