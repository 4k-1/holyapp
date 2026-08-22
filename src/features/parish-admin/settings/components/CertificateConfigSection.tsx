import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { CandleIcon, DoveIcon, DropletIcon, HeartIcon } from "@/components/ui/icons/SacramentIcons";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import {
  CertificateDocument,
  type CertificateFields,
} from "@/features/parish-admin/components/CertificateDocument";
import { AdminButton, AdminField, AdminInput, AdminTextarea } from "@/features/parish-admin/components/AdminForm";
import { normalizeNumberingPrefix, previewCertificateCode } from "@/features/parish-admin/certificates/numbering";
import { getCertificateConfig, updateCertificateConfig } from "../api/certificateConfigApi";
import type { CertificateAppearance, CertificateConfigBySacrament } from "../types";
import type { Parish, SacramentType } from "@/types";

const SACRAMENTS: {
  type: SacramentType;
  label: string;
  Icon: typeof DropletIcon;
}[] = [
  { type: "baptism", label: "Baptism", Icon: DropletIcon },
  { type: "confirmation", label: "Confirmation", Icon: DoveIcon },
  { type: "marriage", label: "Marriage", Icon: HeartIcon },
  { type: "death", label: "Death", Icon: CandleIcon },
];

const SAMPLE: Record<SacramentType, { name: string; fields: Omit<CertificateFields, "certCode"> }> = {
  baptism: {
    name: "Maria Teresa Santos",
    fields: {
      requestId: "REQ-SAMPLE",
      registerRef: "Book 12, Page 48, Entry 16",
      birthdate: "April 12, 1998",
      birthplace: "Cebu City",
      baptismDate: "April 26, 1998",
      motherName: "Ana Marie Santos",
      fatherName: "Roberto Santos",
    },
  },
  confirmation: {
    name: "Miguel Angel Torres",
    fields: {
      requestId: "REQ-SAMPLE",
      registerRef: "Book 4, Page 21, Entry 8",
      birthdate: "August 3, 2009",
      birthplace: "Cebu City",
      confirmationDate: "May 18, 2024",
      motherName: "Lourdes Torres",
      fatherName: "Paolo Torres",
    },
  },
  marriage: {
    name: "Maria Teresa Santos and Juan Miguel Cruz",
    fields: {
      requestId: "REQ-SAMPLE",
      registerRef: "Book 7, Page 11, Entry 3",
      marriageDate: "June 14, 2022",
    },
  },
  death: {
    name: "Rosario Elena Bautista",
    fields: {
      requestId: "REQ-SAMPLE",
      registerRef: "Book 3, Page 9, Entry 2",
      birthdate: "January 8, 1947",
      birthplace: "Cebu City",
      deathDate: "March 2, 2026",
    },
  },
};

type FieldErrors = Partial<Record<keyof CertificateAppearance, string>>;

function cloneConfig(config: CertificateConfigBySacrament): CertificateConfigBySacrament {
  return {
    baptism: { ...config.baptism },
    confirmation: { ...config.confirmation },
    marriage: { ...config.marriage },
    death: { ...config.death },
  };
}

function sameAppearance(a: CertificateAppearance, b: CertificateAppearance) {
  return (
    a.signatoryName === b.signatoryName &&
    a.signatoryTitle === b.signatoryTitle &&
    a.numberingPrefix === b.numberingPrefix &&
    a.footerText === b.footerText
  );
}

function validateAppearance(value: CertificateAppearance): FieldErrors {
  const errors: FieldErrors = {};
  if (!value.signatoryName.trim()) errors.signatoryName = "Enter the name that will print under the signature line.";
  if (!value.signatoryTitle.trim()) errors.signatoryTitle = "Enter the office or title under that name.";
  if (!/^[A-Z0-9]{2,5}$/.test(value.numberingPrefix)) {
    errors.numberingPrefix = "Use 2 to 5 letters or numbers. This becomes the middle of CF-XXX-…";
  }
  return errors;
}

export function CertificateConfigSection() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [saved, setSaved] = useState<CertificateConfigBySacrament | null>(null);
  const [draft, setDraft] = useState<CertificateConfigBySacrament | null>(null);
  const [activeType, setActiveType] = useState<SacramentType>("baptism");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    getCertificateConfig().then((config) => {
      setSaved(cloneConfig(config));
      setDraft(cloneConfig(config));
      setLoading(false);
    });
  }, []);

  const dirty = useMemo(() => {
    if (!saved || !draft) return false;
    return (Object.keys(saved) as SacramentType[]).some((type) => !sameAppearance(saved[type], draft[type]));
  }, [saved, draft]);

  const appearance = draft?.[activeType];

  function setField<K extends keyof CertificateAppearance>(key: K, value: CertificateAppearance[K]) {
    if (!draft) return;
    setJustSaved(false);
    setSaveError("");
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setDraft({
      ...draft,
      [activeType]: { ...draft[activeType], [key]: value },
    });
  }

  function cancelEditing() {
    if (!saved) return;
    setDraft(cloneConfig(saved));
    setErrors({});
    setSaveError("");
    setJustSaved(false);
  }

  async function handleSave() {
    if (!draft) return;
    const nextErrors = validateAppearance(draft[activeType]);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setSaveError("Fix the highlighted fields on this sacrament before saving.");
      return;
    }

    const otherInvalid = (Object.keys(draft) as SacramentType[]).find(
      (type) => type !== activeType && Object.keys(validateAppearance(draft[type])).length > 0
    );
    if (otherInvalid) {
      setActiveType(otherInvalid);
      setErrors(validateAppearance(draft[otherInvalid]));
      setSaveError("Another sacrament still has incomplete appearance fields.");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const result = await updateCertificateConfig(draft);
      setSaved(cloneConfig(result));
      setDraft(cloneConfig(result));
      setJustSaved(true);
    } catch {
      setSaveError("Couldn't save certificate appearance. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !draft || !saved || !appearance) {
    return <p className="text-[13.5px] text-admin-ink-muted">Loading…</p>;
  }

  const sample = SAMPLE[activeType];
  const previewFields: CertificateFields = {
    ...sample.fields,
    certCode: previewCertificateCode(appearance.numberingPrefix),
  };

  return (
    <div className="selection:bg-admin-green-100 selection:text-admin-ink">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[54ch]">
          <h2 className="font-serif text-[19px] font-semibold text-admin-ink">Certificate Configuration</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-admin-ink-muted">
            How each issued certificate looks: who signs it, what it says at the foot, and how it is numbered.
            Parish name and seal come from the parish record.{" "}
            <Link to="../fees" className="font-semibold text-admin-green-700 hover:underline">
              Certificate fees
            </Link>{" "}
            stay under Service Fees.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {justSaved && !dirty && <span className="text-[12px] text-admin-green-700">Saved</span>}
          <AdminButton variant="secondary" onClick={cancelEditing} disabled={saving || !dirty}>
            Cancel
          </AdminButton>
          <AdminButton onClick={handleSave} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save changes"}
          </AdminButton>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Sacrament"
        className="mb-5 flex flex-wrap gap-1 rounded-[10px] border border-admin-border bg-admin-surface p-1"
      >
        {SACRAMENTS.map(({ type, label, Icon }) => {
          const selected = activeType === type;
          const tabDirty = !sameAppearance(saved[type], draft[type]);
          return (
            <button
              key={type}
              type="button"
              role="tab"
              id={`certificate-tab-${type}`}
              aria-selected={selected}
              aria-controls="certificate-config-panel"
              onClick={() => {
                setActiveType(type);
                setErrors({});
                setSaveError("");
              }}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/25 ${
                selected
                  ? "bg-admin-green-100 text-admin-green-900"
                  : "text-admin-ink-muted hover:bg-admin-surface-alt hover:text-admin-ink"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {tabDirty && (
                <span className="h-1.5 w-1.5 rounded-full bg-admin-gold-600" aria-label="Unsaved changes" />
              )}
            </button>
          );
        })}
      </div>

      {saveError && (
        <p className="mb-4 rounded-[9px] border border-admin-red-700/20 bg-admin-red-100 px-3.5 py-2.5 text-[13px] text-admin-red-700">
          {saveError}
        </p>
      )}

      <div
        id="certificate-config-panel"
        role="tabpanel"
        aria-labelledby={`certificate-tab-${activeType}`}
        className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"
      >
        <AdminCard className="p-5 px-[22px]">
          <AdminField label="Signatory name">
            <AdminInput
              value={appearance.signatoryName}
              onChange={(e) => setField("signatoryName", e.target.value)}
              aria-invalid={Boolean(errors.signatoryName)}
              className={errors.signatoryName ? "border-admin-red-700" : ""}
            />
            {errors.signatoryName ? (
              <p className="mt-1.5 text-[12px] text-admin-red-700">{errors.signatoryName}</p>
            ) : (
              <p className="mt-1.5 text-[11.5px] text-admin-ink-faint">Prints under the signature line.</p>
            )}
          </AdminField>

          <AdminField label="Signatory title">
            <AdminInput
              value={appearance.signatoryTitle}
              onChange={(e) => setField("signatoryTitle", e.target.value)}
              aria-invalid={Boolean(errors.signatoryTitle)}
            />
            {errors.signatoryTitle ? (
              <p className="mt-1.5 text-[12px] text-admin-red-700">{errors.signatoryTitle}</p>
            ) : (
              <p className="mt-1.5 text-[11.5px] text-admin-ink-faint">The office named on this certificate type.</p>
            )}
          </AdminField>

          <AdminField label="Numbering prefix">
            <AdminInput
              value={appearance.numberingPrefix}
              onChange={(e) => setField("numberingPrefix", normalizeNumberingPrefix(e.target.value))}
              aria-invalid={Boolean(errors.numberingPrefix)}
              maxLength={5}
              autoCapitalize="characters"
              spellCheck={false}
              className="font-mono tracking-wide"
            />
            {errors.numberingPrefix ? (
              <p className="mt-1.5 text-[12px] text-admin-red-700">{errors.numberingPrefix}</p>
            ) : (
              <p className="mt-1.5 text-[11.5px] text-admin-ink-faint">
                Future issues use{" "}
                <span className="font-mono text-admin-ink-muted">
                  {previewCertificateCode(appearance.numberingPrefix)}
                </span>
                . Already-issued certificates keep their old code.
              </p>
            )}
          </AdminField>

          <AdminField label="Footer / disclaimer" className="mb-0">
            <AdminTextarea
              value={appearance.footerText}
              onChange={(e) => setField("footerText", e.target.value)}
              rows={4}
            />
            <p className="mt-1.5 text-[11.5px] text-admin-ink-faint">
              Shown above the register reference. Leave blank to hide it.
            </p>
          </AdminField>
        </AdminCard>

        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h3 className="font-serif text-[16px] font-semibold text-admin-ink">Preview</h3>
            <p className="text-[12px] text-admin-ink-muted">Sample names only — not an issued certificate.</p>
          </div>
          <CertificateDocument
            parish={parish}
            sacramentType={activeType}
            subjectName={sample.name}
            fields={previewFields}
            appearance={appearance}
          />
        </div>
      </div>
    </div>
  );
}
