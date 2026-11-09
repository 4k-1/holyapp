import { apiFetch, ApiError } from "@/lib/api";
import type {
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
