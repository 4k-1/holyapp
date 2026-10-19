import { apiFetch, ApiError } from "@/lib/api";
import type {
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

export async function verifyMarriageRequirement(
  applicationId: string,
  requirementId: string,
  submitted: boolean
): Promise<MarriageApplication> {
  try {
    const data = await apiFetch<{ application: MarriageApplication }>(
      `/marriage-applications/${encodeURIComponent(applicationId)}/requirements/${encodeURIComponent(requirementId)}`,
      { method: "PATCH", body: { submitted } }
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
  input: { date: string; start: string; end: string; assignee: string }
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
