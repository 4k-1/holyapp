import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { WizardStepTrack } from "@/features/parishioner/requests/components/WizardStepTrack";
import { SacramentStep } from "@/features/parishioner/requests/components/SacramentStep";
import { SacramentFieldsForm } from "@/features/parishioner/requests/components/SacramentFieldsForm";
import { DetailsStepExtras } from "@/features/parishioner/requests/components/DetailsStepExtras";
import { ConfirmationStep } from "@/features/parishioner/requests/components/ConfirmationStep";
import { getCurrentUser } from "@/features/auth/api/authApi";
import { submitRequest } from "@/features/parishioner/requests/api/requestsApi";
import type { RequestFormState } from "@/features/parishioner/requests/types";
import type { Parish } from "@/types";

const initialForm: RequestFormState = {
  sacramentType: "baptism",
  deliveryMethod: "digital",
  purpose: "School enrollment",
  relationship: "Myself",
  sacramentDate: "",
  fields: {},
  documents: [],
};

export function NewRequestWizard() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<RequestFormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  async function handleNext() {
    if (step === 2) {
      setSubmitting(true);
      const requesterId = getCurrentUser()?.id;
      if (!requesterId) throw new Error("Not logged in.");
      await submitRequest(form, parish.id, requesterId);
      setSubmitting(false);
      setStep(3);
      return;
    }
    if (step < 3) setStep((s) => (s + 1) as 1 | 2 | 3);
  }

  function handleBack() {
    if (step === 1) return;
    if (step === 3) {
      navigate(`/${parish.slug}/portal/requests`);
      return;
    }
    setStep((s) => (s - 1) as 1 | 2 | 3);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-1.5 font-serif text-2xl font-bold text-ink sm:text-[26px]">Request a Certificate</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Fill in a few details and we'll locate your sacramental record.
      </p>

      <WizardStepTrack currentStep={step} />

      <div className="rounded-[20px] border border-border bg-surface p-6 shadow-md sm:p-8">
        {step === 1 && (
          <SacramentStep
            sacramentType={form.sacramentType}
            deliveryMethod={form.deliveryMethod}
            purpose={form.purpose}
            onSacramentChange={(sacramentType) => setForm((f) => ({ ...f, sacramentType, fields: {} }))}
            onDeliveryChange={(deliveryMethod) => setForm((f) => ({ ...f, deliveryMethod }))}
            onPurposeChange={(purpose) => setForm((f) => ({ ...f, purpose }))}
          />
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6">
            <DetailsStepExtras
              relationship={form.relationship}
              sacramentDate={form.sacramentDate}
              onRelationshipChange={(relationship) => setForm((f) => ({ ...f, relationship }))}
              onDateChange={(sacramentDate) => setForm((f) => ({ ...f, sacramentDate }))}
              documents={form.documents}
              onDocumentsChange={(documents) => setForm((f) => ({ ...f, documents }))}
            />
            <SacramentFieldsForm
              sacramentType={form.sacramentType}
              values={form.fields}
              onChange={(key, value) => setForm((f) => ({ ...f, fields: { ...f.fields, [key]: value } }))}
            />
          </div>
        )}

        {step === 3 && <ConfirmationStep />}
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={handleBack}>
          {step === 3 ? "Back to My Requests" : "Back"}
        </Button>
        {step < 3 && (
          <Button variant="primary" onClick={handleNext} disabled={submitting}>
            {submitting ? "Submitting..." : step === 2 ? "Submit Request" : "Continue"}
          </Button>
        )}
      </div>
    </div>
  );
}