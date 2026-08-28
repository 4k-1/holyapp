import { delay } from "@/services/delay";
import { MOCK_SPONSOR_ASSIGNMENTS, MOCK_SPONSORS } from "@/services/mocks/sponsors.mock";
import type { Sponsor, SponsorSacramentType } from "@/features/parish-admin/records/types";

export interface RecordSponsor extends Sponsor {
  assignmentId: string;
  role?: string;
  relationshipToRecipient?: string;
  isPrimary: boolean;
  isSigned: boolean;
}

export function sponsorFullName(s: Sponsor) {
  return [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ");
}

/**
 * Every sponsor for every record of a sacrament type, joined and keyed by
 * sacramentRecordId — one fetch per sacrament type, then look up per record
 * on the client (same shape the search page and candidate table both need).
 * Primary sponsor (e.g. Ninang) sorts first within each record's list.
 */
export async function listSponsorsBySacrament(
  sacramentType: SponsorSacramentType
): Promise<Record<string, RecordSponsor[]>> {
  await delay(150);
  const sponsorById = new Map(MOCK_SPONSORS.map((s) => [s.id, s]));
  const byRecordId: Record<string, RecordSponsor[]> = {};

  MOCK_SPONSOR_ASSIGNMENTS.filter((a) => a.sacramentType === sacramentType).forEach((a) => {
    const sponsor = sponsorById.get(a.sponsorId);
    if (!sponsor) return;
    const list = (byRecordId[a.sacramentRecordId] ??= []);
    list.push({
      ...sponsor,
      assignmentId: a.id,
      role: a.role,
      relationshipToRecipient: a.relationshipToRecipient,
      isPrimary: a.isPrimary,
      isSigned: a.isSigned,
    });
  });

  Object.values(byRecordId).forEach((list) => list.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)));
  return byRecordId;
}
