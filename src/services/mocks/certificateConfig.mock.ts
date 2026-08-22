import type { CertificateConfigBySacrament } from "@/features/parish-admin/settings/types";

export let CERTIFICATE_CONFIG: CertificateConfigBySacrament = {
  baptism: {
    signatoryName: "Fr. Juan Santos",
    signatoryTitle: "Parish Priest",
    numberingPrefix: "BAP",
    footerText:
      "This certificate is a true extract from the baptismal register of this parish and is issued for the purposes permitted by canon law.",
  },
  confirmation: {
    signatoryName: "Fr. Juan Santos",
    signatoryTitle: "Parish Priest",
    numberingPrefix: "CFM",
    footerText:
      "This certificate is a true extract from the confirmation register of this parish and is issued for the purposes permitted by canon law.",
  },
  marriage: {
    signatoryName: "Fr. Juan Santos",
    signatoryTitle: "Parish Priest",
    numberingPrefix: "MRG",
    footerText:
      "This certificate is a true extract from the marriage register of this parish and is issued for the purposes permitted by canon law.",
  },
  death: {
    signatoryName: "Fr. Juan Santos",
    signatoryTitle: "Parish Priest",
    numberingPrefix: "DTH",
    footerText:
      "This certificate is a true extract from the death register of this parish and is issued for the purposes permitted by canon law.",
  },
};

export function setCertificateConfig(next: CertificateConfigBySacrament) {
  CERTIFICATE_CONFIG = {
    baptism: { ...next.baptism },
    confirmation: { ...next.confirmation },
    marriage: { ...next.marriage },
    death: { ...next.death },
  };
}
