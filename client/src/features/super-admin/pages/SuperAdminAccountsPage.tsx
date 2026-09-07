import { useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAsync } from "@/hooks/useAsync";
import { listPlatformParishes, type SuperAdminParishOverview } from "@/features/super-admin/api/superAdminApi";
import { PlusIcon, SearchIcon } from "@/components/ui/icons/AdminIcons";
import { AddAccountModal } from "@/features/super-admin/components/AddAccountModal";
import { CredentialsModal } from "@/features/super-admin/components/OnboardParishModal";

function setupStatus(row: SuperAdminParishOverview): "Active" | "Pending Setup" {
  return row.admins.length > 0 ? "Active" : "Pending Setup";
}

export function SuperAdminAccountsPage() {
  const [searchParams] = useSearchParams();
  const parishFromUrl = searchParams.get("parish");
  const { data: parishes = [], loading, refetch } = useAsync(() => listPlatformParishes(), []);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parishes;
    return parishes.filter(
      (row) => row.parish.name.toLowerCase().includes(q) || row.parish.address.toLowerCase().includes(q)
    );
  }, [parishes, query]);

  if (parishFromUrl) {
    return <Navigate to={`/super-admin/accounts/${parishFromUrl}`} replace />;
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-[18px] py-4">
          <div>
            <h2 className="font-sans text-[14.5px] font-bold text-admin-ink">Parish Admin Accounts</h2>
            <p className="mt-0.5 text-[11.5px] text-admin-ink-faint">Select a parish to open its admin accounts</p>
          </div>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-admin-green-700 px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-admin-green-900"
          >
            <PlusIcon className="h-[13px] w-[13px] stroke-white" />
            Add Admin Account
          </button>
        </div>

        <div className="px-[18px] pb-0 pt-3.5">
          <label className="flex items-center gap-2 rounded-lg border border-admin-border px-2.5 py-[7px] text-admin-ink-faint">
            <SearchIcon className="h-3.5 w-3.5 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search parish name or location"
              aria-label="Search parishes"
              className="w-full bg-transparent font-sans text-[12.5px] text-admin-ink outline-none placeholder:text-admin-ink-faint"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="mt-3 w-full border-collapse">
            <thead>
              <tr className="bg-admin-surface-alt">
                {["Parish", "Admins", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="border-b border-admin-border px-[18px] py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-admin-ink-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-[18px] py-[26px] text-center text-[12.5px] text-admin-ink-faint">
                    Loading parishes…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-[18px] py-[26px] text-center text-[12.5px] text-admin-ink-faint">
                    No parishes match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const status = setupStatus(row);
                  const count = row.admins.length;
                  return (
                    <tr key={row.parish.id} className="hover:bg-admin-green-100 last:[&>td]:border-b-0">
                      <td className="border-b border-admin-border px-[18px] py-3">
                        <p className="text-[13px] font-bold text-admin-ink">{row.parish.name}</p>
                        <p className="mt-px text-[11.3px] text-admin-ink-faint">{row.parish.address}</p>
                      </td>
                      <td className="border-b border-admin-border px-[18px] py-3 text-[13px] text-admin-ink">
                        {count} admin{count === 1 ? "" : "s"}
                      </td>
                      <td className="border-b border-admin-border px-[18px] py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-[3px] text-[11px] font-bold ${
                            status === "Active"
                              ? "bg-admin-green-100 text-admin-green-900"
                              : "bg-admin-gold-100 text-admin-gold-700"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="border-b border-admin-border px-[18px] py-3">
                        <Link
                          to={`/super-admin/accounts/${row.parish.id}`}
                          className="text-[12px] font-bold text-admin-green-700 hover:text-admin-green-900"
                        >
                          Open Accounts
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {adding ? (
        <AddAccountModal
          role="parish_admin"
          parishes={parishes}
          onClose={() => setAdding(false)}
          onCreated={({ credentials: creds }) => {
            setAdding(false);
            refetch();
            setCredentials(creds);
          }}
        />
      ) : null}

      {credentials ? (
        <CredentialsModal
          email={credentials.email}
          password={credentials.password}
          onClose={() => setCredentials(null)}
        />
      ) : null}
    </div>
  );
}
