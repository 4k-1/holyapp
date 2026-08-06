import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminStatCard } from "@/features/parish-admin/components/AdminStatCard";
import { AdminDeliveryTag } from "@/features/parish-admin/components/AdminDeliveryTag";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { MOCK_REQUESTS } from "@/services/mocks/requests.mock";
import { deriveStatusLabel } from "@/features/parishioner/dashboard/deriveStatusLabel";
import { getAdminStatusTone, getAdminActionLabel } from "@/features/parish-admin/requests/adminRequestHelpers";
import type { CertificateRequest, Parish, SacramentType } from "@/types";
import { deriveStatusKey } from "@/features/parishioner/dashboard/deriveStatusLabel";


const sacramentLabels: Record<SacramentType, string> = {
  baptism: "Baptism",
  confirmation: "Confirmation",
  marriage: "Marriage",
  death: "Death",
};

type StatusFilter = "All statuses" | "Pending" | "Awaiting Payment" | "Processing" | "Ready" | "Released" | "Rejected";

const filterToKey: Record<Exclude<StatusFilter, "All statuses">, ReturnType<typeof deriveStatusKey>> = {
  Pending: "pending",
  "Awaiting Payment": "awaiting_payment",
  Processing: "processing",
  Ready: "ready",
  Released: "released",
  Rejected: "rejected",
};

export function AdminRequestsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All statuses");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const parishRequests = useMemo(
    () => MOCK_REQUESTS.filter((r) => r.parishId === parish.id),
    [parish.id]
  );

  const counts = useMemo(() => {
    const dateMatched = parishRequests.filter((r) => !dateFilter || r.createdAt.startsWith(dateFilter));
    return {
      "All statuses": dateMatched.length,
      Pending: dateMatched.filter((r) => deriveStatusKey(r) === "pending").length,
      "Awaiting Payment": dateMatched.filter((r) => deriveStatusKey(r) === "awaiting_payment").length,
      Processing: dateMatched.filter((r) => deriveStatusKey(r) === "processing").length,
      Ready: dateMatched.filter((r) => deriveStatusKey(r) === "ready").length,
      Released: dateMatched.filter((r) => deriveStatusKey(r) === "released").length,
      Rejected: dateMatched.filter((r) => deriveStatusKey(r) === "rejected").length,
    };
  }, [parishRequests, dateFilter]);

  const filtered = useMemo(() => {
    return parishRequests.filter((r) => {
      const label = deriveStatusLabel(r);
      const matchesStatus =
        statusFilter === "All statuses" ||
        (statusFilter === "In Progress"
          ? label === "Processing" || label === "Ready for Pickup"
          : label === statusFilter || (statusFilter === "Pending" && r.status === "pending"));
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || r.id.toLowerCase().includes(q);
      const matchesDate = !dateFilter || r.createdAt.startsWith(dateFilter);
      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [parishRequests, statusFilter, search, dateFilter]);

  const columns: AdminTableColumn<CertificateRequest>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-medium text-admin-ink">{r.id}</span> },
    {
      key: "requestedBy",
      header: "Request by",
      render: (r) => (
        <span>
          {r.requesterId}
          {r.origin === "walkin" && (
            <span className="ml-2 inline-flex items-center rounded-full bg-admin-surface-alt px-2 py-0.5 text-[11px] font-semibold text-admin-ink-muted">
              Walk-in
            </span>
          )}
        </span>
      ),
    },
    {
      key: "requestDate",
      header: "Request date",
      render: (r) =>
        new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    },
    {
      key: "type",
      header: "Type",
      render: (r) => (
        <span className="inline-flex items-center rounded-full bg-admin-surface-alt px-2.5 py-1 text-[11.5px] font-semibold text-admin-ink-muted">
          {sacramentLabels[r.sacramentType]}
        </span>
      ),
    },
    { key: "delivery", header: "Delivery", render: (r) => <AdminDeliveryTag method={r.deliveryMethod} /> },
    {
      key: "status",
      header: "Status",
      render: (r) => <AdminBadge tone={getAdminStatusTone(r)}>{deriveStatusLabel(r)}</AdminBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <button
          type="button"
          onClick={() => console.info("[mock] action for", r.id)}
          className="font-semibold text-admin-green-700 hover:underline"
        >
          {getAdminActionLabel(r)}
        </button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="mb-1 text-[26px] font-semibold text-admin-ink">Requests</h1>
          <p className="text-[13.5px] text-admin-ink-muted">Online certificate requests submitted by parishioners.</p>
        </div>
      </div>

      <div className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(148px,1fr))] gap-3.5">
        {(Object.keys(counts) as StatusFilter[]).map((key) => (
            <AdminStatCard
            key={key}
            label={key === "All statuses" ? "Total Requests" : key === "Awaiting Payment" ? "To Be Paid" : key}
            value={counts[key]}
            active={statusFilter === key}
            onClick={() => setStatusFilter(key)}
            />
        ))}
    </div>

      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
      <div className="relative max-w-[320px] flex-1">
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="pointer-events-none absolute left-[11px] top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-admin-ink-faint"
        >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
            placeholder="Search by request ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-admin-border-strong py-[9px] pl-[34px] pr-3 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-admin-green-600/25"
        />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-admin-border-strong bg-white py-[9px] pl-3 pr-[30px] text-[13.5px]"
        >
          {(["All statuses", "Pending", "Awaiting Payment", "In Progress", "Released", "Rejected"] as StatusFilter[]).map(
            (s) => (
              <option key={s}>{s}</option>
            )
          )}
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className={`rounded-lg border py-[9px] pl-3 pr-[30px] text-[13.5px] ${
            dateFilter ? "border-2 border-admin-green-600 bg-admin-green-050 font-semibold text-admin-green-900" : "border-admin-border-strong"
          }`}
        />
        {dateFilter && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-admin-green-100 py-[7px] pl-3 pr-2 text-[12.5px] font-semibold text-admin-green-700">
             {new Date(dateFilter + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            <button
              type="button"
              onClick={() => setDateFilter("")}
              className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-admin-green-600 hover:text-white"
            >
              ✕
            </button>
          </span>
        )}
      </div>

      <AdminCard>
        <AdminTable
          columns={columns}
          rows={filtered}
          getRowKey={(r) => r.id}
          emptyMessage="No matching requests. Try a different status or search term."
        />
      </AdminCard>
    </div>
  );
}