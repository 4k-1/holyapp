import { apiFetch, ApiError } from "@/lib/api";

/** Someone who serves the parish, whether or not they can sign in. */
export interface ParishPerson {
  id: string;
  name: string;
  role: string;
  clergy: boolean;
  contact: string;
  status: "active" | "inactive";
  /** Linked to a staff account; name and status then follow the account. */
  hasAccount: boolean;
}

export interface PersonInput {
  name?: string;
  role?: string;
  contact?: string;
  status?: "active" | "inactive";
}

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message, { cause: err });
  throw new Error("Unable to reach the server.", { cause: err });
}

export async function listPersonnel(): Promise<{ personnel: ParishPerson[]; roles: string[] }> {
  try {
    const data = await apiFetch<{ personnel: ParishPerson[]; roles: string[] }>("/personnel");
    return { personnel: data.personnel ?? [], roles: data.roles ?? [] };
  } catch (err) {
    fail(err);
  }
}

export async function addPerson(input: PersonInput): Promise<ParishPerson> {
  try {
    const data = await apiFetch<{ person: ParishPerson }>("/personnel", { method: "POST", body: input });
    return data.person;
  } catch (err) {
    fail(err);
  }
}

export async function updatePerson(id: string, input: PersonInput): Promise<ParishPerson> {
  try {
    const data = await apiFetch<{ person: ParishPerson }>(`/personnel/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: input,
    });
    return data.person;
  } catch (err) {
    fail(err);
  }
}

/** Deletes someone without a staff account; their past events keep their name. */
export async function removePerson(id: string): Promise<void> {
  try {
    await apiFetch(`/personnel/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (err) {
    fail(err);
  }
}
