import { formatCertificateCode, peekNumberingPrefix } from "@/features/parish-admin/certificates/numbering";
import { sacramentCertTitles } from "@/features/parish-admin/components/certificate/constants";
import type { IssuedRecordCertificate } from "@/features/parish-admin/records/types";
import type { SacramentType } from "@/types";

type IssuableRecord = {
  certificates: IssuedRecordCertificate[];
  bookNumber: string;
  pageNumber: string;
  updatedAt: string;
};

/** Marks prior Valid copies as Superseded and appends a new issued certificate. */
export function appendIssuedCertificate(
  record: IssuableRecord,
  sacramentType: SacramentType,
  by = "Admin Immaculada"
): IssuedRecordCertificate {
  const issued: IssuedRecordCertificate = {
    type: sacramentCertTitles[sacramentType],
    date: new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    by,
    status: "Valid",
    code: formatCertificateCode(peekNumberingPrefix(sacramentType), new Date().getFullYear(), record.certificates.length + 1),
  };

  record.certificates.forEach((c) => {
    if (c.status === "Valid") c.status = "Superseded";
  });
  record.certificates.push(issued);
  record.updatedAt = new Date().toISOString();
  return issued;
}
