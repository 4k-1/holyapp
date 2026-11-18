import { formatTableDate } from "@/lib/dates";
import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { RegisterSearchFields } from "@/features/parish-admin/records/RegisterSearchFields";
import { SearchCriteriaCard } from "@/features/parish-admin/records/SearchCriteriaCard";
import { hasCriteria } from "@/features/parish-admin/records/searchCriteria";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { RecordRegisterActions } from "@/features/parish-admin/records/RecordRegisterActions";
import { listDeathRecords } from "@/features/parish-admin/records/api/deathRecordsApi";
import { useAsync } from "@/hooks/useAsync";
import {
  deathRecordRef,
  emptyDeathSearchCriteria,
  filterDeathRecords,
  formatAge,
  recordFullName,
} from "@/features/parish-admin/records/deathHelpers";
import type { DeathRecord, DeathSearchCriteria } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";
import "@/features/parish-admin/styles/adminDesk.css";

export function AdminDeathRecordsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [draft, setDraft] = useState<DeathSearchCriteria>(emptyDeathSearchCriteria);
  const [applied, setApplied] = useState<DeathSearchCriteria>(emptyDeathSearchCriteria);

  const [showArchived, setShowArchived] = useState(false);

  const { data: parishRecords = [], error, loading } = useAsync(
    () => listDeathRecords(parish.id, { archived: showArchived }),
    [parish.id, showArchived]
  );
  const filtered = filterDeathRecords(parishRecords, applied);

  const columns: AdminTableColumn<DeathRecord>[] = [
    {
      key: "ref",
      header: "Bk:Page:Entry",
      sortValue: (r) => deathRecordRef(r),
      render: (r) => <span className="admin-table__primary">{deathRecordRef(r)}</span>,
    },
    { key: "name", header: "Name", sortValue: (r) => recordFullName(r), render: (r) => recordFullName(r) },
    {
      key: "dateOfDeath",
      header: "Date of death",
      sortValue: (r) => r.dateOfDeath,
      render: (r) => formatTableDate(r.dateOfDeath),
    },
    {
      key: "dateOfBurial",
      header: "Date of burial",
      sortValue: (r) => r.dateOfBurial,
      render: (r) => formatTableDate(r.dateOfBurial),
    },
    { key: "age", header: "Age", sortValue: (r) => formatAge(r), render: (r) => formatAge(r) },
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

  function setField<K extends keyof DeathSearchCriteria>(key: K, value: DeathSearchCriteria[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="admin-dash mx-auto w-full max-w-[1920px]">
      <header className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-[1.35rem] font-bold tracking-[-0.01em] text-[var(--dash-ink)] sm:text-[1.5rem]">
            Death Records
          </h1>
          <p className="admin-dash__muted mt-1.5 text-admin-body">
            Search and manage death and burial register entries for this parish.
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
          setDraft(emptyDeathSearchCriteria());
          setApplied(emptyDeathSearchCriteria());
        }}
        canClear={hasCriteria(draft) || hasCriteria(applied)}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminField label="Name of deceased" className="mb-0">
            <AdminInput
              placeholder="Juan Dela Cruz"
              value={draft.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </AdminField>
          <AdminField label="Date of death" className="mb-0">
            <AdminInput
              type="date"
              value={draft.dateOfDeath}
              onChange={(e) => setField("dateOfDeath", e.target.value)}
            />
          </AdminField>
          <AdminField label="Date of burial" className="mb-0">
            <AdminInput
              type="date"
              value={draft.dateOfBurial}
              onChange={(e) => setField("dateOfBurial", e.target.value)}
            />
          </AdminField>
          <AdminField label="Residence" className="mb-0">
            <AdminInput
              placeholder="123 Rizal St., Quezon City"
              value={draft.residence}
              onChange={(e) => setField("residence", e.target.value)}
            />
          </AdminField>
          <AdminField label="Minister" className="mb-0">
            <AdminInput
              placeholder="Fr. Juan Santos"
              value={draft.minister}
              onChange={(e) => setField("minister", e.target.value)}
            />
          </AdminField>
          <RegisterSearchFields value={draft} onChange={(key, value) => setField(key, value)} />
        </div>
      </SearchCriteriaCard>

      <AdminTable
        loading={loading}
        pageKey="records"
        defaultSort={{ key: "dateOfDeath", dir: "desc" }}
        title={showArchived ? "Archived records" : "Records"}
        subtitle={`${filtered.length} matching ${filtered.length === 1 ? "entry" : "entries"}`}
        columns={columns}
        rows={error ? [] : filtered}
        getRowKey={(r) => r.id}
        emptyMessage={
          error
            ? `Could not load death records: ${error.message}`
            : showArchived
              ? "No archived death records."
              : "No death records in this parish yet. Add a record to save it to the database."
        }
      />
    </div>
  );
}
