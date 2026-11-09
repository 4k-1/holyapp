import { apiFetch, ApiError } from "@/lib/api";

export type ClergyRank = "priest" | "deacon" | "religious" | "lay";

/** One of a person's titles; `scope` says where, e.g. "St. Jude School". */
export interface PersonTitle {
  title: string;
  scope: string | null;
}

/** Someone who serves the parish, whether or not they can sign in. */
export interface ParishPerson {
  id: string;
  /** In full, e.g. "Rev. Fr. Juan Santos, SVD". */
  name: string;
  plainName: string;
  honorific: string;
  postNominals: string;
  clergyRank: ClergyRank;
  /** The primary title. */
  role: string;
  /** All titles, primary first. */
  titles: PersonTitle[];
  /** From the clergy status: priests and deacons. */
  clergy: boolean;
  contact: string;
  status: "active" | "inactive";
  /** Linked to a staff account; name and status then follow the account. */
  hasAccount: boolean;
}

export interface PersonInput {
  name?: string;
  honorific?: string;
  postNominals?: string;
  clergyRank?: ClergyRank;
  /** Primary first. */
  titles?: PersonTitle[];
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
