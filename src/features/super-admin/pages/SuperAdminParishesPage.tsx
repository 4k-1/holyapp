import { Link } from "react-router-dom";
import { useAsync } from "@/hooks/useAsync";
import { listPlatformParishes } from "@/features/super-admin/api/superAdminApi";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";

function formatCount(n: number, noun: string) {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

export function SuperAdminParishesPage() {
  const { data: parishes = [], loading } = useAsync(() => listPlatformParishes(), []);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <AdminCard className="overflow-hidden p-0">
        {loading ? (
          <p className="px-5 py-8 text-admin-body text-admin-ink-muted">Loading parishes…</p>
        ) : parishes.length === 0 ? (
          <p className="px-5 py-8 text-admin-body text-admin-ink-muted">No parishes on the platform yet.</p>
        ) : (
          <ul>
            {parishes.map((row, index) => {
              const officeCount = row.admins.length + row.staff.length;
              return (
                <li
                  key={row.parish.id}
                  className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
                    index > 0 ? "border-t border-admin-border" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[13.3px] font-bold text-admin-ink">{row.parish.name}</p>
                    <p className="text-admin-support text-admin-ink-muted">{row.parish.address}</p>
                    <p className="mt-1 text-admin-support text-admin-ink-faint">
                      {formatCount(officeCount, "office account")} ·{" "}
                      {formatCount(row.parishioners.length, "parishioner")} ·{" "}
                      {formatCount(row.records.total, "record")}
                    </p>
                  </div>
                  <Link
                    to={`/super-admin/accounts?parish=${row.parish.id}`}
                    className="shrink-0 text-admin-body font-semibold text-admin-green-700 underline decoration-admin-green-100 underline-offset-2 hover:text-admin-green-900"
                  >
                    View accounts
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}
