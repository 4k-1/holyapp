import { useMemo } from "react";
import { useAsync } from "@/hooks/useAsync";
import { getPlatformDashboard } from "@/features/super-admin/api/superAdminApi";

/**
 * Platform-wide figures, straight from the current parish registers. Everything here is a real count, all time;
 * there are no date ranges or exports yet.
 */
export function SuperAdminReportsPage() {
  const { data, loading, error } = useAsync(() => getPlatformDashboard(), []);

  const requestTotal =
    data?.requestsBySacrament.reduce((s, x) => s + x.count, 0) ?? 0;
  const sacramentStops = useMemo(() => {
    if (!data || requestTotal === 0) return "";
    let cursor = 0;
    return data.requestsBySacrament
      .map((s) => {
        const start = cursor;
        cursor += (s.count / requestTotal) * 360;
        return `${s.color} ${start}deg ${cursor}deg`;
      })
      .join(", ");
  }, [data, requestTotal]);

  if (error) {
    return (
      <p className="text-[13.5px] text-admin-red-700">
        Couldn't load the figures. Refresh the page to try again.
      </p>
    );
  }
  if (loading || !data) {
    return (
      <p className="text-[13.5px] text-admin-ink-muted">Loading figures…</p>
    );
  }

  return (
    <div>
      <div className="mb-[18px] grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <Stat
          label="Records Digitized"
          value={data.recordTotal}
          sub="in the current registers"
        />
        <Stat
          label="Certificates Issued"
          value={data.certificateTotal}
          sub="all time"
        />
        <Stat
          label="Parishes"
          value={data.parishCount}
          sub={`${data.pendingSetupCount} still without an admin`}
        />
        <Stat
          label="Parishioner Accounts"
          value={data.parishionerCount}
          sub="across all parishes"
        />
      </div>

      <div className="mb-[18px] grid grid-cols-1 gap-[18px] xl:grid-cols-2">
        <div className="rounded-lg border border-admin-border bg-admin-surface p-[18px]">
          <h3 className="m-0 text-[14.5px] font-bold text-admin-ink">
            Requests by Sacrament Type
          </h3>
          <p className="mt-0.5 text-[13px] text-admin-ink-faint">
            Share of all certificate requests, open and completed (
            {requestTotal})
          </p>
          {requestTotal === 0 ? (
            <p className="py-10 text-center text-[13.5px] text-admin-ink-faint">
              No certificate requests yet.
            </p>
          ) : (
            <>
              <div
                className="mx-auto mt-5 h-[140px] w-[140px] rounded-full"
                style={{ background: `conic-gradient(${sacramentStops})` }}
                aria-hidden
              />
              <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
                {data.requestsBySacrament.map((s) => (
                  <span
                    key={s.key}
                    className="text-[12.5px] text-admin-ink-muted"
                  >
                    <span
                      className="mr-1 inline-block h-2 w-2 rounded-full"
                      style={{ background: s.color }}
                    />
                    {s.label}: {s.count} (
                    {Math.round((s.count / requestTotal) * 100)}%)
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
          <div className="border-b border-admin-border px-[18px] py-4">
            <h2 className="font-sans text-[16px] font-bold text-admin-ink">
              By parish
            </h2>
            <p className="mt-0.5 text-[13px] text-admin-ink-faint">
              Records and certificates for each parish
            </p>
          </div>
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse">
              <thead>
                <tr className="bg-admin-surface-alt">
                  {["Parish", "Records", "Certificates", "Status"].map((h) => (
                    <th
                      key={h}
                      className="border-b border-admin-border px-[18px] py-2.5 text-left text-[12.5px] font-semibold text-admin-ink-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.parishes.map((row) => {
                  const active = row.admins.length > 0;
                  return (
                    <tr key={row.parish.id}>
                      <td className="border-b border-admin-border px-[18px] py-3">
                        <p className="text-[14px] font-bold text-admin-ink">
                          {row.parish.name}
                        </p>
                        <p className="text-[12.5px] text-admin-ink-faint">
                          {row.parish.address}
                        </p>
                      </td>
                      <td className="border-b border-admin-border px-[18px] py-3 text-[14px] tabular-nums">
                        {row.records.total}
                      </td>
                      <td className="border-b border-admin-border px-[18px] py-3 text-[14px] tabular-nums">
                        {row.certificateCount}
                      </td>
                      <td className="border-b border-admin-border px-[18px] py-3">
                        <span
                          className={`whitespace-nowrap rounded-full px-2.5 py-[3px] text-[12.5px] font-bold ${
                            active
                              ? "bg-admin-green-100 text-admin-green-900"
                              : "bg-admin-gold-100 text-admin-gold-700"
                          }`}
                        >
                          {active ? "Active" : "Pending Setup"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="mt-3.5 text-center text-[12.5px] text-admin-ink-faint">
        Figures are counted across parishes and exclude individually
        identifiable parishioner data.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-admin-border bg-admin-surface px-4 pb-3.5 pt-4">
      <p className="text-[13px] font-semibold text-admin-ink-muted">{label}</p>
      <p className="mt-2 text-2xl font-extrabold leading-none tabular-nums text-admin-ink">
        {value.toLocaleString()}
      </p>
      <p className="mt-1.5 text-[12px] font-semibold text-admin-ink-faint">
        {sub}
      </p>
    </div>
  );
}
