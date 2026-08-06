import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { MOCK_BAPTISMAL_RECORDS } from "@/services/mocks/baptismalRecords.mock";
import {
  emptySearchCriteria,
  filterBaptismalRecords,
  recordFatherName,
  recordFullName,
  recordMotherName,
  recordRef,
} from "@/features/parish-admin/records/baptismalHelpers";
import type { BaptismalRecord, BaptismalSearchCriteria } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";

export function AdminBaptismalRecordsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [draft, setDraft] = useState<BaptismalSearchCriteria>(emptySearchCriteria);
  const [applied, setApplied] = useState<BaptismalSearchCriteria>(emptySearchCriteria);

  const parishRecords = MOCK_BAPTISMAL_RECORDS.filter((r) => r.parishId === parish.id);
  const filtered = filterBaptismalRecords(parishRecords, applied);

  const columns: AdminTableColumn<BaptismalRecord>[] = [
    {
      key: "ref",
      header: "Bk:Page",
      render: (r) => <span className="font-medium text-admin-ink">{recordRef(r)}</span>,
    },
    { key: "name", header: "Name", render: (r) => recordFullName(r) },
    { key: "baptismDate", header: "Bapt. date", render: (r) => r.baptismDate },
    { key: "dob", header: "Birthdate", render: (r) => r.dob },
    { key: "mother", header: "Mother", render: (r) => recordMotherName(r) },
    { key: "father", header: "Father", render: (r) => recordFatherName(r) },
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

  function setField<K extends keyof BaptismalSearchCriteria>(key: K, value: BaptismalSearchCriteria[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[26px] font-semibold text-admin-ink">Baptismal Records</h1>
          <p className="text-[13.5px] text-admin-ink-muted">
            Search and manage sacramental records for this parish.
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
        <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
          Search criteria
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminField label="Name of baptized" className="mb-0">
            <AdminInput
              placeholder="Last, First"
              value={draft.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </AdminField>
          <AdminField label="Birthdate" className="mb-0">
            <AdminInput
              type="date"
              value={draft.birthdate}
              onChange={(e) => setField("birthdate", e.target.value)}
            />
          </AdminField>
          <AdminField label="Birthplace" className="mb-0">
            <AdminInput
              placeholder="City / Province"
              value={draft.birthplace}
              onChange={(e) => setField("birthplace", e.target.value)}
            />
          </AdminField>
          <AdminField label="Mother's name" className="mb-0">
            <AdminInput
              placeholder="Last, First"
              value={draft.mother}
              onChange={(e) => setField("mother", e.target.value)}
            />
          </AdminField>
          <AdminField label="Father's name" className="mb-0">
            <AdminInput
              placeholder="Last, First"
              value={draft.father}
              onChange={(e) => setField("father", e.target.value)}
            />
          </AdminField>
          <AdminField label="Priest" className="mb-0">
            <AdminInput
              placeholder="Officiating priest"
              value={draft.priest}
              onChange={(e) => setField("priest", e.target.value)}
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
          emptyMessage="No matching baptismal records. Try different search criteria."
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
