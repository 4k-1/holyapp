import { apiFetch, ApiError } from "@/lib/api";
import type {
  BannsListResponse,
  BannsParishHeading,
  BannsPlan,
  CreateBannsElsewhereInput,
  Circumstances,
  CreateMarriageApplicationInput,
  DispensationStatus,
  MarriageApplication,
} from "../types";

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message);
  throw new Error("Unable to reach the server.");
}

export async function listMarriageApplications(): Promise<MarriageApplication[]> {
  try {
    const data = await apiFetch<{ applications: MarriageApplication[] }>("/marriage-applications");
    return data.applications ?? [];
  } catch (err) {
    fail(err);
  }
}

export async function getMarriageApplication(id: string): Promise<MarriageApplication> {
  try {
    const data = await apiFetch<{ application: MarriageApplication }>(
      `/marriage-applications/${encodeURIComponent(id)}`
    );
    return data.application;
  } catch (err) {
    fail(err);
  }
}

export async function createMarriageApplication(
  input: CreateMarriageApplicationInput
): Promise<MarriageApplication> {
  try {
    const data = await apiFetch<{ application: MarriageApplication }>("/marriage-applications", {
      method: "POST",
      body: input,
    });
    return data.application;
  } catch (err) {
    fail(err);
  }
}

/** `documentDate`: the date printed on a document that expires (ISO). */
export async function verifyMarriageRequirement(
  applicationId: string,
  requirementId: string,
  submitted: boolean,
  documentDate?: string
): Promise<MarriageApplication> {
  try {
    const data = await apiFetch<{ application: MarriageApplication }>(
      `/marriage-applications/${encodeURIComponent(applicationId)}/requirements/${encodeURIComponent(requirementId)}`,
      { method: "PATCH", body: { submitted, documentDate } }
    );
    return data.application;
  } catch (err) {
    fail(err);
  }
}

/** The couple's yes/no answers; they decide which conditional requirements are asked for. */
export async function updateMarriageCircumstances(
  applicationId: string,
  circumstances: Circumstances
): Promise<MarriageApplication> {
  try {
    const data = await apiFetch<{ application: MarriageApplication }>(
      `/marriage-applications/${encodeURIComponent(applicationId)}/circumstances`,
      { method: "PATCH", body: { circumstances } }
    );
    return data.application;
  } catch (err) {
    fail(err);
  }
}

export async function updateMarriageDispensation(
  applicationId: string,
  input: { dispensationNeeded: boolean; dispensationStatus: DispensationStatus; dispensationNotes: string }
): Promise<MarriageApplication> {
  try {
    const data = await apiFetch<{ application: MarriageApplication }>(
      `/marriage-applications/${encodeURIComponent(applicationId)}/dispensation`,
      { method: "PATCH", body: input }
    );
    return data.application;
  } catch (err) {
    fail(err);
  }
}

export async function reserveWeddingDate(
  applicationId: string,
  input: {
    date: string;
    start: string;
    end: string;
    assigneeId: string | null;
    assignee: string;
    /** Staff chose to book anyway on a day the Church calendar warns about (B5 + C5). */
    calendarOk?: boolean;
  }
): Promise<MarriageApplication> {
  try {
    const data = await apiFetch<{ application: MarriageApplication }>(
      `/marriage-applications/${encodeURIComponent(applicationId)}/reserve-date`,
      { method: "POST", body: input }
    );
    return data.application;
  } catch (err) {
    fail(err);
  }
}

/** Saves the banns; "Banns published" ticks itself once they are complete. */
export async function updateBanns(applicationId: string, banns: BannsPlan): Promise<MarriageApplication> {
  try {
    const data = await apiFetch<{ application: MarriageApplication }>(
      `/marriage-applications/${encodeURIComponent(applicationId)}/banns`,
      { method: "PATCH", body: { banns } }
    );
    return data.application;
  } catch (err) {
    fail(err);
  }
}

/** The couples to announce on a Sunday, with the parish heading for printing. */
export async function getBannsList(
  date: string
): Promise<BannsListResponse> {
  try {
    return await apiFetch<BannsListResponse>(
      `/marriage-applications/banns-list?date=${encodeURIComponent(date)}`
    );
  } catch (err) {
    fail(err);
  }
}

/** Couples marrying in another parish who have their banns announced here. */
export async function listBannsElsewhere(): Promise<MarriageApplication[]> {
  try {
    const data = await apiFetch<{ applications: MarriageApplication[] }>("/marriage-applications/banns-elsewhere");
    return data.applications ?? [];
  } catch (err) {
    fail(err);
  }
}

export async function createBannsElsewhere(input: CreateBannsElsewhereInput): Promise<MarriageApplication> {
  try {
    const data = await apiFetch<{ application: MarriageApplication }>("/marriage-applications/banns-elsewhere", {
      method: "POST",
      body: input,
    });
    return data.application;
  } catch (err) {
    fail(err);
  }
}

export async function removeBannsElsewhere(id: string): Promise<void> {
  try {
    await apiFetch(`/marriage-applications/banns-elsewhere/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (err) {
    fail(err);
  }
}

/** What the Certificate of Banns prints; refused until all three Sundays are announced. */
export async function getBannsCertificate(
  id: string
): Promise<{ application: MarriageApplication; parish: BannsParishHeading }> {
  try {
    return await apiFetch<{ application: MarriageApplication; parish: BannsParishHeading }>(
      `/marriage-applications/${encodeURIComponent(id)}/banns-certificate`
    );
  } catch (err) {
    fail(err);
  }
}

export async function getBannsPoster(
  id: string
): Promise<{ application: MarriageApplication; parish: BannsParishHeading }> {
  try {
    return await apiFetch<{ application: MarriageApplication; parish: BannsParishHeading }>(
      `/marriage-applications/${encodeURIComponent(id)}/banns-poster`
    );
  } catch (err) {
    fail(err);
  }
}

export async function confirmWeddingDate(applicationId: string): Promise<MarriageApplication> {
  try {
    const data = await apiFetch<{ application: MarriageApplication }>(
      `/marriage-applications/${encodeURIComponent(applicationId)}/confirm-date`,
      { method: "POST" }
    );
    return data.application;
  } catch (err) {
    fail(err);
  }
}

export async function rejectMarriageApplication(
  applicationId: string,
  remarks: string
): Promise<MarriageApplication> {
  try {
    const data = await apiFetch<{ application: MarriageApplication }>(
      `/marriage-applications/${encodeURIComponent(applicationId)}/reject`,
      { method: "POST", body: { remarks } }
    );
    return data.application;
  } catch (err) {
    fail(err);
  }
}

export async function listMyMarriageApplications(): Promise<MarriageApplication[]> {
  try {
    const data = await apiFetch<{ applications: MarriageApplication[] }>("/marriage-applications/mine");
    return data.applications ?? [];
  } catch (err) {
    fail(err);
  }
}

/** Links the couple's parishioner account by its email, so they can follow the application online. */
export async function linkParishionerAccount(applicationId: string, email: string): Promise<MarriageApplication> {
  try {
    const data = await apiFetch<{ application: MarriageApplication }>(
      `/marriage-applications/${encodeURIComponent(applicationId)}/parishioner`,
      { method: "PUT", body: { email } }
    );
    return data.application;
  } catch (err) {
    fail(err);
  }
}

export async function unlinkParishionerAccount(applicationId: string): Promise<MarriageApplication> {
  try {
    const data = await apiFetch<{ application: MarriageApplication }>(
      `/marriage-applications/${encodeURIComponent(applicationId)}/parishioner`,
      { method: "DELETE" }
    );
    return data.application;
  } catch (err) {
    fail(err);
  }
}
