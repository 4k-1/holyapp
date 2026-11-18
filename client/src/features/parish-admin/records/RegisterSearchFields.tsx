import { AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import type { RegisterCriteria } from "@/features/parish-admin/records/searchCriteria";

/** Book, page and entry (line) search fields, for finding a record by where it sits in the register. */
export function RegisterSearchFields({
  value,
  onChange,
}: {
  value: RegisterCriteria;
  onChange: (key: keyof RegisterCriteria, value: string) => void;
}) {
  const fields: [keyof RegisterCriteria, string][] = [
    ["book", "Book no."],
    ["page", "Page no."],
    ["entry", "Entry (line) no."],
  ];
  return (
    <div className="grid grid-cols-1 gap-4 md:col-span-3 md:grid-cols-3">
      {fields.map(([key, label]) => (
        <AdminField key={key} label={label} className="mb-0">
          <AdminInput inputMode="numeric" value={value[key]} onChange={(e) => onChange(key, e.target.value)} />
        </AdminField>
      ))}
    </div>
  );
}
