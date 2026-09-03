import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { SearchCriteriaCard } from "@/features/parish-admin/records/SearchCriteriaCard";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { listMarriageRecords } from "@/features/parish-admin/records/api/marriageRecordsApi";
import { useAsync } from "@/hooks/useAsync";
import {
  brideFullName,
  emptyMarriageSearchCriteria,
  filterMarriageRecords,
  formatRecordDate,
  groomFullName,
  marriageRecordRef,
} from "@/features/parish-admin/records/marriageHelpers";
import type { MarriageRecord, MarriageSearchCriteria } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";

export function AdminMarriageRecordsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [draft, setDraft] = useState<MarriageSearchCriteria>(emptyMarriageSearchCriteria);
  const [applied, setApplied] = useState<MarriageSearchCriteria>(emptyMarriageSearchCriteria);

  const { data: parishRecords = [] } = useAsync(() => listMarriageRecords(parish.id), [parish.id]);
  const filtered = filterMarriageRecords(parishRecords, applied);

  const columns: AdminTableColumn<MarriageRecord>[] = [
    {
      key: "ref",
      header: "Bk:Page:Entry",
      render: (r) => <span className="font-medium text-admin-ink">{marriageRecordRef(r)}</span>,
    },
    { key: "groom", header: "Groom", render: (r) => groomFullName(r) },
    { key: "bride", header: "Bride", render: (r) => brideFullName(r) },
    {
      key: "dateOfMarriage",
      header: "Marriage date",
      render: (r) => formatRecordDate(r.dateOfMarriage),
    },
    { key: "place", header: "Place", render: (r) => r.placeOfMarriage },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <Link
          to={encodeURIComponent(r.id)}
          className="font-semibold text-admin-green-700 hover:underline"
        >
          View details
        </Link>
      ),
    },
  ];

  function setField<K extends keyof MarriageSearchCriteria>(key: K, value: MarriageSearchCriteria[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-admin-page font-semibold text-admin-ink">Marriage Records</h1>
          <p className="text-admin-body text-admin-ink-muted">
            Search and manage marriage register entries for this parish.
          </p>
        </div>
        <Link to="new">
          <AdminButton>
            <PlusIcon />
            Add record
          </AdminButton>
        </Link>
      </div>

      <SearchCriteriaCard>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminField label="Groom's name" className="mb-0">
            <AdminInput
              placeholder="Jose Reyes"
              value={draft.groom}
              onChange={(e) => setField("groom", e.target.value)}
            />
          </AdminField>
          <AdminField label="Bride's name" className="mb-0">
            <AdminInput
              placeholder="Maria Santos"
              value={draft.bride}
              onChange={(e) => setField("bride", e.target.value)}
            />
          </AdminField>
          <AdminField label="Date of marriage" className="mb-0">
            <AdminInput
              type="date"
              value={draft.marriageDate}
              onChange={(e) => setField("marriageDate", e.target.value)}
            />
          </AdminField>
          <AdminField label="Minister" className="mb-0">
            <AdminInput
              placeholder="Fr. Juan Santos"
              value={draft.minister}
              onChange={(e) => setField("minister", e.target.value)}
            />
          </AdminField>
          <AdminField label="Witness" className="mb-0 md:col-span-2">
            <AdminInput
              placeholder="Ramon Lim"
              value={draft.witness}
              onChange={(e) => setField("witness", e.target.value)}
            />
          </AdminField>
        </div>
        <div className="mt-3.5 flex justify-end">
          <AdminButton onClick={() => setApplied({ ...draft })}>
            <SearchIcon />
            Search
          </AdminButton>
        </div>
      </SearchCriteriaCard>

      <AdminCard>
        <AdminTable
          columns={columns}
          rows={filtered}
          getRowKey={(r) => r.id}
          emptyMessage="No matching marriage records. Try different search criteria."
        />
      </AdminCard>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
    </svg>
  );
}
