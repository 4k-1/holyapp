import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { listDeathRecords } from "@/features/parish-admin/records/api/deathRecordsApi";
import { useAsync } from "@/hooks/useAsync";
import {
  deathRecordRef,
  emptyDeathSearchCriteria,
  filterDeathRecords,
  formatAge,
  formatRecordDate,
  recordFullName,
} from "@/features/parish-admin/records/deathHelpers";
import type { DeathRecord, DeathSearchCriteria } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";

export function AdminDeathRecordsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [draft, setDraft] = useState<DeathSearchCriteria>(emptyDeathSearchCriteria);
  const [applied, setApplied] = useState<DeathSearchCriteria>(emptyDeathSearchCriteria);

  const { data: parishRecords = [] } = useAsync(() => listDeathRecords(parish.id), [parish.id]);
  const filtered = filterDeathRecords(parishRecords, applied);

  const columns: AdminTableColumn<DeathRecord>[] = [
    {
      key: "ref",
      header: "Bk:Page:Entry",
      render: (r) => <span className="font-medium text-admin-ink">{deathRecordRef(r)}</span>,
    },
    { key: "name", header: "Name", render: (r) => recordFullName(r) },
    {
      key: "dateOfDeath",
      header: "Date of death",
      render: (r) => formatRecordDate(r.dateOfDeath),
    },
    {
      key: "dateOfBurial",
      header: "Date of burial",
      render: (r) => formatRecordDate(r.dateOfBurial),
    },
    { key: "age", header: "Age", render: (r) => formatAge(r) },
    { key: "placeOfBurial", header: "Place of burial", render: (r) => r.placeOfBurial },
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

  function setField<K extends keyof DeathSearchCriteria>(key: K, value: DeathSearchCriteria[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-admin-page font-semibold text-admin-ink">Death Records</h1>
          <p className="text-admin-body text-admin-ink-muted">
            Search and manage death and burial register entries for this parish.
          </p>
        </div>
        <Link to="new">
          <AdminButton>
            <PlusIcon />
            Add record
          </AdminButton>
        </Link>
      </div>

      <AdminCard className="mb-[18px] p-5 px-[22px]">
        <h2 className="mb-3.5 font-sans text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
          Search criteria
        </h2>
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
          <AdminField label="Place of burial" className="mb-0">
            <AdminInput
              placeholder="Manila Memorial Park"
              value={draft.placeOfBurial}
              onChange={(e) => setField("placeOfBurial", e.target.value)}
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
        </div>
        <div className="mt-3.5 flex justify-end">
          <AdminButton onClick={() => setApplied({ ...draft })}>
            <SearchIcon />
            Search
          </AdminButton>
        </div>
      </AdminCard>

      <AdminCard>
        <AdminTable
          columns={columns}
          rows={filtered}
          getRowKey={(r) => r.id}
          emptyMessage="No matching death records. Try different search criteria."
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
