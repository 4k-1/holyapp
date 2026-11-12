import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAsync } from "@/hooks/useAsync";
import { listPlatformParishes, type SuperAdminParishOverview } from "@/features/super-admin/api/superAdminApi";
import { PlusIcon, SearchIcon } from "@/components/ui/icons/AdminIcons";
import { CredentialsModal, OnboardParishModal } from "@/features/super-admin/components/OnboardParishModal";
import { SuperAdminToast } from "@/features/super-admin/components/SuperAdminModal";

function countLabel(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function parishMeta(row: SuperAdminParishOverview) {
  const office = row.admins.length + row.staff.length;
  return [
    countLabel(office, "office account", "office accounts"),
    countLabel(row.parishioners.length, "parishioner", "parishioners"),
    countLabel(row.records.total, "record", "records"),
  ].join(" · ");
}

export function SuperAdminParishesPage() {
  const { data: parishes = [], loading, error, refetch } = useAsync(() => listPlatformParishes(), []);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [toast, setToast] = useState("");

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parishes;
    return parishes.filter(
      (row) => row.parish.name.toLowerCase().includes(q) || row.parish.address.toLowerCase().includes(q)
    );
  }, [parishes, query]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-ink-faint">
          <SearchIcon className="h-3.5 w-3.5 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search parish name or location"
            aria-label="Search parishes"
            className="w-full bg-transparent font-sans text-[12.5px] text-admin-ink outline-none placeholder:text-admin-ink-faint"
          />
        </label>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-admin-green-700 px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-admin-green-900"
        >
          <PlusIcon className="h-[13px] w-[13px] stroke-white" />
          Add parish
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
        {error ? (
          <p className="px-[18px] py-8 text-center text-[12.5px] text-admin-red-700">
            Couldn't load the parishes. Refresh the page to try again.
          </p>
        ) : loading ? (
          <p className="px-[18px] py-8 text-center text-[12.5px] text-admin-ink-faint">Loading parishes…</p>
        ) : parishes.length === 0 ? (
          <p className="px-[18px] py-8 text-center text-[12.5px] text-admin-ink-faint">No parishes on HolyApp yet.</p>
        ) : filtered.length === 0 ? (
          <p className="px-[18px] py-8 text-center text-[12.5px] text-admin-ink-faint">No parishes match your search.</p>
        ) : (
          <ul>
            {filtered.map((row) => (
              <li
                key={row.parish.id}
                className="flex items-center justify-between gap-5 border-b border-admin-border px-[18px] py-3.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-bold leading-snug text-admin-ink">{row.parish.name}</p>
                  <p className="mt-px text-[12px] text-admin-ink-muted">{row.parish.address}</p>
                  <p className="mt-0.5 text-[11.3px] text-admin-ink-faint">{parishMeta(row)}</p>
                </div>
                <Link
                  to={`/super-admin/accounts/${row.parish.id}`}
                  className="shrink-0 text-[12.5px] font-semibold text-admin-green-700 hover:text-admin-green-900"
                >
                  Manage
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {adding ? (
        <OnboardParishModal
          onClose={() => setAdding(false)}
          onCreated={({ parishName, credentials: creds }) => {
            setAdding(false);
            refetch();
            flash(`${parishName} added`);
            if (creds) setCredentials(creds);
          }}
        />
      ) : null}

      {credentials ? (
        <CredentialsModal email={credentials.email} password={credentials.password} onClose={() => setCredentials(null)} />
      ) : null}

      <SuperAdminToast message={toast} />
    </div>
  );
}
