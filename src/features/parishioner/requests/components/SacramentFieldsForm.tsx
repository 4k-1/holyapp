import type { SacramentType } from "@/types";

interface FieldConfig {
  key: string;
  label: string;
  type?: "text" | "date";
  optional?: boolean;
  placeholder?: string;
}

const fieldsBySacrament: Record<SacramentType, FieldConfig[][]> = {
  baptism: [
    [{ key: "firstName", label: "First name", placeholder: "e.g. Maria Clara" },
     { key: "middleName", label: "Middle name", optional: true },
     { key: "lastName", label: "Last name", placeholder: "e.g. Santos" }],
    [{ key: "birthdate", label: "Birthdate", type: "date" },
     { key: "birthplace", label: "Birthplace", placeholder: "e.g. Quezon City" }],
    [{ key: "parishOfBaptism", label: "Parish where baptized", optional: true, placeholder: "Leave blank if this parish" },
     { key: "addressAtTime", label: "Address at the time", optional: true, placeholder: "e.g. Barangay, city" }],
    [{ key: "mothersName", label: "Mother's name", optional: true },
     { key: "fathersName", label: "Father's name", optional: true }],
    [{ key: "godmothersName", label: "Godmother's name", optional: true },
     { key: "godfathersName", label: "Godfather's name", optional: true }],
  ],
  confirmation: [
    [{ key: "firstName", label: "First name", placeholder: "e.g. Maria Clara" },
     { key: "middleName", label: "Middle name", optional: true },
     { key: "lastName", label: "Last name", placeholder: "e.g. Santos" }],
    [{ key: "birthdate", label: "Birthdate", type: "date" },
     { key: "birthplace", label: "Birthplace", optional: true, placeholder: "e.g. Quezon City" }],
    [{ key: "parishOfConfirmation", label: "Parish where confirmed", optional: true, placeholder: "Leave blank if this parish" },
     { key: "sponsorName", label: "Confirmation sponsor's name", optional: true }],
  ],
  marriage: [
    [{ key: "groomFirstName", label: "Groom's first name" },
     { key: "groomMiddleName", label: "Middle name", optional: true },
     { key: "groomLastName", label: "Groom's last name" }],
    [{ key: "brideFirstName", label: "Bride's first name" },
     { key: "brideMiddleName", label: "Middle name", optional: true },
     { key: "brideMaidenLastName", label: "Bride's maiden last name" }],
    [{ key: "parishOfMarriage", label: "Parish where married", optional: true, placeholder: "Leave blank if this parish" },
     { key: "placeOfMarriage", label: "Place of marriage", optional: true, placeholder: "e.g. Barangay, city" }],
    [{ key: "witness1", label: "Witness 1", optional: true },
     { key: "witness2", label: "Witness 2", optional: true }],
  ],
  death: [
    [{ key: "firstName", label: "First name", placeholder: "e.g. Jose" },
     { key: "middleName", label: "Middle name", optional: true },
     { key: "lastName", label: "Last name", placeholder: "e.g. Reyes" }],
    [{ key: "dateOfBirth", label: "Date of birth", type: "date", optional: true },
     { key: "placeOfDeath", label: "Place of death", optional: true }],
    [{ key: "parish", label: "Parish", optional: true, placeholder: "Leave blank if this parish" },
     { key: "nextOfKin", label: "Next of kin", optional: true }],
  ],
};

interface SacramentFieldsFormProps {
  sacramentType: SacramentType;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function SacramentFieldsForm({ sacramentType, values, onChange }: SacramentFieldsFormProps) {
  const rows = fieldsBySacrament[sacramentType];

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, i) => (
        <div key={i} className={`grid grid-cols-1 gap-4 ${row.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {row.map((field) => (
            <div key={field.key}>
              <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-accent">
                {field.label}
                {field.optional && (
                  <span className="ml-1 font-medium normal-case tracking-normal text-ink-muted">(optional)</span>
                )}
              </label>
              <input
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}