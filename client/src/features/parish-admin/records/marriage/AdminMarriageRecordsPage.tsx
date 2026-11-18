import { formatTableDate } from "@/lib/dates";
import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { RegisterSearchFields } from "@/features/parish-admin/records/RegisterSearchFields";
import { SearchCriteriaCard } from "@/features/parish-admin/records/SearchCriteriaCard";
import { hasCriteria } from "@/features/parish-admin/records/searchCriteria";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { RecordRegisterActions } from "@/features/parish-admin/records/RecordRegisterActions";
import { listMarriageRecords } from "@/features/parish-admin/records/api/marriageRecordsApi";
import { useAsync } from "@/hooks/useAsync";
import {
  brideFullName,
  emptyMarriageSearchCriteria,
  filterMarriageRecords,
  groomFullName,
  marriageRecordRef,
} from "@/features/parish-admin/records/marriageHelpers";
import type { MarriageRecord, MarriageSearchCriteria } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";
import "@/features/parish-admin/styles/adminDesk.css";

export function AdminMarriageRecordsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [draft, setDraft] = useState<MarriageSearchCriteria>(emptyMarriageSearchCriteria);
  const [applied, setApplied] = useState<MarriageSearchCriteria>(emptyMarriageSearchCriteria);

  const [showArchived, setShowArchived] = useState(false);

  const { data: parishRecords = [], error, loading } = useAsync(
    () => listMarriageRecords(parish.id, { archived: showArchived }),
    [parish.id, showArchived]
  );
  const filtered = filterMarriageRecords(parishRecords, applied);

  const columns: AdminTableColumn<MarriageRecord>[] = [
    {
      key: "ref",
      header: "Bk:Page:Entry",
      sortValue: (r) => marriageRecordRef(r),
      render: (r) => <span className="admin-table__primary">{marriageRecordRef(r)}</span>,
    },
    { key: "groom", header: "Groom", sortValue: (r) => groomFullName(r), render: (r) => groomFullName(r) },
    { key: "bride", header: "Bride", sortValue: (r) => brideFullName(r), render: (r) => brideFullName(r) },
    {
      key: "dateOfMarriage",
      header: "Marriage date",
      sortValue: (r) => r.dateOfMarriage,
      render: (r) => formatTableDate(r.dateOfMarriage),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <Link to={encodeURIComponent(r.id)} className="admin-table__action">
          View
        </Link>
      ),
    },
  ];

  function setField<K extends keyof MarriageSearchCriteria>(key: K, value: MarriageSearchCriteria[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="admin-dash mx-auto w-full max-w-[1920px]">
      <header className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-[1.35rem] font-bold tracking-[-0.01em] text-[var(--dash-ink)] sm:text-[1.5rem]">
            Marriage Records
          </h1>
          <p className="admin-dash__muted mt-1.5 text-admin-body">
            Search and manage marriage register entries for this parish.
          </p>
        </div>
        <RecordRegisterActions
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived((prev) => !prev)}
        />
      </header>

      <SearchCriteriaCard
        onSearch={() => setApplied({ ...draft })}
        onClear={() => {
          setDraft(emptyMarriageSearchCriteria());
          setApplied(emptyMarriageSearchCriteria());
        }}
        canClear={hasCriteria(draft) || hasCriteria(applied)}
      >
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
          <AdminField label="Witness" className="mb-0">
            <AdminInput
              placeholder="Ramon Lim"
              value={draft.witness}
              onChange={(e) => setField("witness", e.target.value)}
            />
          </AdminField>
          <RegisterSearchFields value={draft} onChange={(key, value) => setField(key, value)} />
        </div>
      </SearchCriteriaCard>

      <AdminTable
        loading={loading}
        pageKey="records"
        defaultSort={{ key: "dateOfMarriage", dir: "desc" }}
        title={showArchived ? "Archived records" : "Records"}
        subtitle={`${filtered.length} matching ${filtered.length === 1 ? "entry" : "entries"}`}
        columns={columns}
        rows={error ? [] : filtered}
        getRowKey={(r) => r.id}
        emptyMessage={
          error
            ? `Could not load marriage records: ${error.message}`
            : showArchived
              ? "No archived marriage records."
              : "No marriage records in this parish yet. Add a record to save it to the database."
        }
      />
    </div>
  );
}
