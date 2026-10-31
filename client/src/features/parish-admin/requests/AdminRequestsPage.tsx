import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminDeliveryTag } from "@/features/parish-admin/components/AdminDeliveryTag";
import { AdminInput } from "@/features/parish-admin/components/AdminForm";
import { AdminStatCard } from "@/features/parish-admin/components/AdminStatCard";
import { AdminIssueCertificateModal } from "@/features/parish-admin/requests/AdminIssueCertificateModal";
import { AdminReleaseCertificateModal } from "@/features/parish-admin/requests/AdminReleaseCertificateModal";
import { AdminRequestDetailModal } from "@/features/parish-admin/requests/AdminRequestDetailModal";
import { listAdminRequests, rejectAdminRequest } from "@/features/parish-admin/requests/api/requestsAdminApi";
import { useAsync } from "@/hooks/useAsync";
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

type StatusFilter =
  | "All statuses"
  | "Pending"
  | "Awaiting Payment"
  | "Processing"
  | "Ready"
  | "Released"
  | "Rejected"
  | "In Progress";

const filterToKey: Record<Exclude<StatusFilter, "All statuses" | "In Progress">, ReturnType<typeof deriveStatusKey>> = {
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
  const [detailRequestId, setDetailRequestId] = useState<string | null>(null);
  const [issueRequestId, setIssueRequestId] = useState<string | null>(null);
  const [releaseRequestId, setReleaseRequestId] = useState<string | null>(null);

  const { data: parishRequests = [], refetch, loading } = useAsync(
    () => listAdminRequests(parish.id),
    [parish.id]
  );

  const detailRequest = detailRequestId
    ? parishRequests.find((r) => r.id === detailRequestId) ?? null
    : null;

  const issueRequest = issueRequestId
    ? parishRequests.find((r) => r.id === issueRequestId) ?? null
    : null;

  const releaseRequest = releaseRequestId
    ? parishRequests.find((r) => r.id === releaseRequestId) ?? null
    : null;

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
      const key = deriveStatusKey(r);
      const matchesStatus =
        statusFilter === "All statuses" ||
        (statusFilter === "In Progress"
          ? key === "processing" || key === "ready"
          : key === filterToKey[statusFilter]);
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        (r.details?.subjectName ?? "").toLowerCase().includes(q);
      const matchesDate = !dateFilter || r.createdAt.startsWith(dateFilter);
      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [parishRequests, statusFilter, search, dateFilter]);

  const columns: AdminTableColumn<CertificateRequest>[] = [
    { key: "id", header: "ID", render: (r) => (
      <button
        type="button"
        onClick={() => setDetailRequestId(r.id)}
        className="font-medium text-admin-ink hover:text-admin-green-700 hover:underline"
      >
        {r.id}
      </button>
    ) },
    {
      key: "requestedBy",
      header: "Request by",
      render: (r) => (
        <span>
          {r.details?.subjectName ?? r.requesterId}
          {r.origin === "walkin" && (
            <span className="ml-2 inline-flex items-center rounded-full bg-admin-surface-alt px-2 py-0.5 text-admin-label font-semibold text-admin-ink-muted">
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
        <span className="inline-flex items-center rounded-full bg-admin-surface-alt px-2.5 py-1 text-admin-label font-semibold text-admin-ink-muted">
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
      render: (r) => {
        const primary = getAdminActionLabel(r);
        return (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDetailRequestId(r.id)}
              className="admin-table__action"
            >
              View
            </button>
            {primary !== "View" &&
              (primary === "Find record" ? (
                <Link to={`${r.id}/find-record`} className="admin-table__action">
                  Find record
                </Link>
              ) : primary === "Release →" ? (
                <button
                  type="button"
                  onClick={() => setReleaseRequestId(r.id)}
                  className="admin-table__action"
                >
                  Release
                </button>
              ) : primary.endsWith("→") ? (
                <button
                  type="button"
                  onClick={() => setIssueRequestId(r.id)}
                  className="admin-table__action"
                >
                  {primary.replace(" →", "")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => console.info("[mock] action for", r.id)}
                  className="admin-table__action"
                >
                  {primary}
                </button>
              ))}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="mb-1 text-admin-page font-semibold text-admin-ink">Requests</h1>
          <p className="text-admin-body text-admin-ink-muted">Online certificate requests submitted by parishioners.</p>
        </div>
      </div>

      <div className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(148px,1fr))] gap-3.5">
        {(Object.keys(counts) as (keyof typeof counts)[]).map((key) => (
            <AdminStatCard
            key={key}
            label={key === "All statuses" ? "Total requests" : key === "Awaiting Payment" ? "To be paid" : key}
            value={counts[key]}
            active={statusFilter === key}
            onClick={() => setStatusFilter(key)}
            />
        ))}
    </div>

      <div className="mb-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
        <div className="relative min-w-0 sm:max-w-[320px]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="pointer-events-none absolute left-[11px] top-1/2 z-10 h-[15px] w-[15px] -translate-y-1/2 text-admin-ink-faint"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <AdminInput
            placeholder="Search by request ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-[34px]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="w-full rounded-[7px] border border-admin-border-strong bg-white py-[9px] pl-3 pr-[30px] text-admin-body text-admin-ink focus:border-admin-green-600 focus:outline-none focus:ring-2 focus:ring-admin-green-600/25 sm:w-auto"
        >
          {(["All statuses", "Pending", "Awaiting Payment", "In Progress", "Released", "Rejected"] as StatusFilter[]).map(
            (s) => (
              <option key={s}>{s}</option>
            )
          )}
        </select>
        <div className="flex min-w-0 items-center gap-2.5">
          <AdminInput
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className={
              dateFilter
                ? "!w-full border-2 border-admin-green-600 bg-admin-green-050 font-semibold text-admin-green-900 sm:!w-auto"
                : "!w-full sm:!w-auto"
            }
          />
          {dateFilter && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-admin-green-100 py-[7px] pl-3 pr-2 text-admin-support font-semibold text-admin-green-700">
              {new Date(dateFilter + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
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
      </div>

      <AdminCard>
        <AdminTable
          loading={loading}
          columns={columns}
          rows={filtered}
          getRowKey={(r) => r.id}
          emptyMessage="No matching requests. Try a different status or search term."
        />
      </AdminCard>

      {detailRequest && (
        <AdminRequestDetailModal
          request={detailRequest}
          parish={parish}
          onClose={() => setDetailRequestId(null)}
          onReject={async (r) => {
            await rejectAdminRequest(r.id);
            refetch();
          }}
          onPaymentRecorded={() => refetch()}
          onIssueComplete={refetch}
          onReleaseComplete={refetch}
        />
      )}

      {issueRequest && (
        <AdminIssueCertificateModal
          request={issueRequest}
          parish={parish}
          onClose={() => setIssueRequestId(null)}
          onComplete={() => {
            setIssueRequestId(null);
            refetch();
          }}
        />
      )}

      {releaseRequest && (
        <AdminReleaseCertificateModal
          request={releaseRequest}
          parish={parish}
          onClose={() => setReleaseRequestId(null)}
          onComplete={() => {
            setReleaseRequestId(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}