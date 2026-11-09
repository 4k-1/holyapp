import { Link } from "react-router-dom";
import type { ReportDocument } from "@/features/parish-admin/reports/reportDocument";
import {
  COPY_CHANNEL_LABELS,
  COPY_STATUS_LABELS,
  copyFilterActive,
  issuedAtLabel,
  SACRAMENT_LABELS,
  timesPrintedLabel,
  type CopyFilter,
} from "@/features/parish-admin/reports/issuedCopies";

const STATUS_CLASS: Record<string, string> = {
  valid: "text-admin-green-700",
  waiting: "text-admin-gold-700",
  replaced: "text-admin-ink-muted",
  revoked: "text-admin-red-700",
  spoiled: "text-admin-red-700",
};

const controlClass =
  "h-9 rounded-[10px] border border-admin-border bg-admin-surface px-2.5 text-admin-support text-admin-ink outline-none focus-visible:border-admin-green-700";

const th = "border-b border-admin-border py-2 pr-3 text-left font-medium text-admin-ink-faint";
const td = "border-b border-admin-border py-2 pr-3 align-top text-admin-ink";

/**
 * A7: every certificate copy issued in the period, one row each — the parish's "certificates issued"
 * logbook. On screen it has a search box and filters; the PDF and printout list what they keep.
 */
export function CopiesTable({
  copies,
  period,
  interactive,
  filter,
  onFilterChange,
}: {
  copies: NonNullable<ReportDocument["copies"]>;
  period: string;
  interactive: boolean;
  filter?: CopyFilter;
  onFilterChange?: (filter: CopyFilter) => void;
}) {
  const { rows } = copies;
  const set = (patch: Partial<CopyFilter>) => filter && onFilterChange?.({ ...filter, ...patch });

  return (
    <section data-pdf-break className="rounded-[14px] border border-admin-border bg-admin-surface p-4 @2xl:p-5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-sans text-admin-group font-semibold text-admin-ink">Certificates issued</h3>
        <p className="text-[11px] text-admin-ink-faint">
          {rows.length.toLocaleString()} {rows.length === 1 ? "copy" : "copies"}
          {copies.filtered ? " matching the filters" : ""}
          {copies.truncated ? ` · only the newest ${copies.limit.toLocaleString()}; choose shorter dates to see the rest` : ""}
        </p>
      </div>

      {interactive && filter && onFilterChange && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={filter.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search number, name, receipt or staff"
            aria-label="Search the copies"
            className={`${controlClass} w-full min-w-0 sm:w-[280px]`}
          />
          <select
            value={filter.sacrament}
            onChange={(e) => set({ sacrament: e.target.value })}
            aria-label="Sacrament"
            className={controlClass}
          >
            <option value="">All sacraments</option>
            {Object.entries(SACRAMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={filter.status}
            onChange={(e) => set({ status: e.target.value })}
            aria-label="Status"
            className={controlClass}
          >
            <option value="">Every status</option>
            {Object.entries(COPY_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {copyFilterActive(filter) && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: "", sacrament: "", status: "" })}
              className="text-admin-support font-semibold text-admin-green-700 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="py-4 text-admin-body text-admin-ink-muted">
          {copies.filtered ? "No copies match these filters." : `No copies were issued for ${period}.`}
        </p>
      ) : (
        <div className="overflow-x-auto pb-1">
          <table className="w-full min-w-[900px] border-collapse text-admin-support">
            <thead>
              <tr data-pdf-break>
                {["Number", "Sacrament", "Holder", "Issued", "Issued by", "How", "Purpose", "Receipt", "Printed", "Status"].map(
                  (h) => (
                    <th key={h} className={h === "Printed" ? `${th} text-right` : th}>
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} data-pdf-break>
                  <td className={`${td} whitespace-nowrap font-semibold tabular-nums`}>{c.code}</td>
                  <td className={td}>{SACRAMENT_LABELS[c.sacramentType] ?? c.sacramentType}</td>
                  <td className={td}>
                    {interactive ? (
                      <Link to={`../../${c.recordPath}`} relative="path" className="text-admin-green-700 hover:underline">
                        {c.holderName}
                      </Link>
                    ) : (
                      c.holderName
                    )}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{issuedAtLabel(c.issuedAt)}</td>
                  <td className={td}>{c.issuedBy}</td>
                  <td className={td}>{c.channel ? COPY_CHANNEL_LABELS[c.channel] : "—"}</td>
                  <td className={td}>{c.purpose ?? "—"}</td>
                  <td className={`${td} whitespace-nowrap tabular-nums`}>{c.receiptNumber ?? "—"}</td>
                  <td className={`${td} text-right tabular-nums`}>{timesPrintedLabel(c)}</td>
                  <td className={`${td} ${STATUS_CLASS[c.status] ?? ""}`} title={c.voidReason ?? undefined}>
                    {COPY_STATUS_LABELS[c.status]}
                    {c.voidReason && <span className="block text-[11px] text-admin-ink-faint">{c.voidReason}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!interactive && (
        <p className="mt-6 w-[280px] border-t border-admin-ink pt-1 text-admin-support text-admin-ink-muted">
          Checked by (parish priest)
        </p>
      )}
    </section>
  );
}
