import { useEffect, useMemo, useRef, useState } from "react";
import { useAsync } from "@/hooks/useAsync";
import { listPlatformParishes, type SuperAdminParishOverview } from "@/features/super-admin/api/superAdminApi";
import { ChevronDownIcon, PlusIcon, SearchIcon } from "@/components/ui/icons/AdminIcons";
import { CredentialsModal, OnboardParishModal } from "@/features/super-admin/components/OnboardParishModal";
import { ManageParishModal } from "@/features/super-admin/components/ManageParishModal";

type SetupFilter = "all" | "Active" | "Pending Setup";

function setupStatus(row: SuperAdminParishOverview): "Active" | "Pending Setup" {
  return row.admins.length > 0 ? "Active" : "Pending Setup";
}

function adminsSummary(row: SuperAdminParishOverview) {
  if (row.admins.length === 0) return "— unassigned —";
  const first = row.admins[0].fullName;
  if (row.admins.length === 1) return first;
  return `${first} +${row.admins.length - 1} more`;
}

export function SuperAdminParishesPage() {
  const { data: parishes = [], loading, refetch } = useAsync(() => listPlatformParishes(), []);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SetupFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const [onboardOpen, setOnboardOpen] = useState(false);
  const [managing, setManaging] = useState<SuperAdminParishOverview | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parishes.filter((row) => {
      const status = setupStatus(row);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q) return true;
      return row.parish.name.toLowerCase().includes(q) || row.parish.address.toLowerCase().includes(q);
    });
  }, [parishes, query, statusFilter]);

  const filterLabel = statusFilter === "all" ? "All Status" : statusFilter;

  function showToast(msg: string) {
    setToast(msg);
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-[18px] py-4">
          <div>
            <h2 className="font-sans text-[14.5px] font-bold text-admin-ink">All Parishes</h2>
            <p className="mt-0.5 text-[11.5px] text-admin-ink-faint">Create or edit parish accounts</p>
          </div>
          <button
            type="button"
            onClick={() => setOnboardOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-admin-green-700 px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-admin-green-900"
          >
            <PlusIcon className="h-[13px] w-[13px] stroke-white" />
            Onboard Parish
          </button>
        </div>

        <div className="flex flex-col gap-2.5 px-[18px] pt-3.5 sm:flex-row">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-admin-border px-2.5 py-[7px] text-admin-ink-faint">
            <SearchIcon className="h-3.5 w-3.5 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search parish name or location"
              aria-label="Search parishes"
              className="w-full bg-transparent font-sans text-[12.5px] text-admin-ink outline-none placeholder:text-admin-ink-faint"
            />
          </label>
          <div className="relative shrink-0" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className="flex w-full items-center gap-1.5 rounded-lg border border-admin-border bg-white px-3 py-[7px] text-[12.5px] text-admin-ink-muted sm:w-auto"
              aria-haspopup="listbox"
              aria-expanded={filterOpen}
            >
              <ChevronDownIcon className="h-[11px] w-[11px]" />
              {filterLabel}
            </button>
            {filterOpen ? (
              <div
                role="listbox"
                className="absolute right-0 top-[38px] z-40 min-w-[150px] overflow-hidden rounded-lg border border-admin-border bg-white shadow-[0_8px_24px_rgba(20,30,25,0.10)]"
              >
                {(["all", "Active", "Pending Setup"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={statusFilter === option}
                    className="block w-full px-3 py-2 text-left text-[12.3px] text-admin-ink-muted hover:bg-admin-green-100 hover:text-admin-green-900"
                    onClick={() => {
                      setStatusFilter(option);
                      setFilterOpen(false);
                    }}
                  >
                    {option === "all" ? "All Status" : option}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="mt-3 w-full border-collapse">
            <thead>
              <tr className="bg-admin-surface-alt">
                {["Parish", "Admin", "Records", "Status", "Actions"].map((h) => (
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
                  <td colSpan={5} className="px-[18px] py-[26px] text-center text-[12.5px] text-admin-ink-faint">
                    Loading parishes…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-[18px] py-[26px] text-center text-[12.5px] text-admin-ink-faint">
                    No parishes match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const status = setupStatus(row);
                  return (
                    <tr key={row.parish.id} className="hover:bg-admin-green-100 last:[&>td]:border-b-0">
                      <td className="border-b border-admin-border px-[18px] py-3">
                        <p className="font-bold text-[13px] text-admin-ink">{row.parish.name}</p>
                        <p className="mt-px text-[11.3px] text-admin-ink-faint">{row.parish.address}</p>
                      </td>
                      <td className="border-b border-admin-border px-[18px] py-3 text-[13px] text-admin-ink">
                        {adminsSummary(row)}
                      </td>
                      <td className="border-b border-admin-border px-[18px] py-3 text-[13px] tabular-nums text-admin-ink">
                        {row.records.total.toLocaleString()}
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
                        <button
                          type="button"
                          onClick={() => setManaging(row)}
                          className="text-[12px] font-bold text-admin-green-700 hover:text-admin-green-900"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {onboardOpen ? (
        <OnboardParishModal
          onClose={() => setOnboardOpen(false)}
          onCreated={({ parishName, credentials: creds }) => {
            setOnboardOpen(false);
            refetch();
            if (creds) setCredentials(creds);
            else showToast(`${parishName} created successfully`);
          }}
        />
      ) : null}

      {managing ? (
        <ManageParishModal
          row={managing}
          onClose={() => setManaging(null)}
          onSaved={(name) => {
            setManaging(null);
            refetch();
            showToast(`${name} updated`);
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

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 rounded-[9px] bg-admin-ink px-[18px] py-[11px] text-[12.8px] font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
        >
          <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-admin-gold-600" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}
