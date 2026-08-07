import { forwardRef } from "react";
import type { Parish, SacramentType } from "@/types";

export const sacramentCertTitles: Record<SacramentType, string> = {
  baptism: "Certificate of Baptism",
  confirmation: "Certificate of Confirmation",
  marriage: "Certificate of Marriage",
  death: "Certificate of Death",
};

export interface CertificateFields {
  requestId: string;
  registerRef: string;
  birthdate?: string;
  birthplace?: string;
  baptismDate?: string;
  motherName?: string;
  fatherName?: string;
  certCode?: string;
}

interface CertificateDocumentProps {
  parish: Parish;
  sacramentType: SacramentType;
  subjectName: string;
  fields: CertificateFields;
}

const PRIMARY = "var(--color-primary, #0d3d30)";
const ACCENT = "var(--color-accent, #c49a1a)";

export const CertificateDocument = forwardRef<HTMLDivElement, CertificateDocumentProps>(
  function CertificateDocument({ parish, sacramentType, subjectName, fields }, ref) {
    return (
      <div
        ref={ref}
        style={{
          position: "relative",
          padding: "40px 36px",
          textAlign: "center",
          border: `3px solid ${ACCENT}`,
          borderRadius: 6,
          background: "linear-gradient(180deg, #fdfbf3 0%, #ffffff 55%)",
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "#20261f",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 8,
            border: `1px solid ${ACCENT}`,
            opacity: 0.4,
            borderRadius: 3,
            pointerEvents: "none",
          }}
        />

        {parish.sealUrl ? (
          <img
            src={parish.sealUrl}
            alt=""
            style={{
              height: 64,
              width: 64,
              margin: "0 auto 12px",
              borderRadius: 9999,
              border: `1px solid ${ACCENT}`,
              objectFit: "contain",
              background: "white",
              padding: 4,
            }}
          />
        ) : (
          <div
            style={{
              height: 64,
              width: 64,
              margin: "0 auto 12px",
              borderRadius: 9999,
              border: `1px solid ${ACCENT}`,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 700,
              color: PRIMARY,
            }}
          >
            {parish.name.charAt(0)}
          </div>
        )}

        <p style={{ fontSize: 15, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: PRIMARY, margin: 0 }}>
          {parish.name}
        </p>
        {parish.address && <p style={{ marginTop: 4, fontSize: 11, color: "#7a8580" }}>{parish.address}</p>}

        <div style={{ width: 64, height: 1, background: ACCENT, margin: "18px auto" }} />

        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: ACCENT, margin: 0 }}>
          {sacramentCertTitles[sacramentType]}
        </p>

        <p style={{ marginTop: 26, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#a3a39a" }}>
          This is to certify that
        </p>
        <p style={{ marginTop: 8, fontSize: 28, fontWeight: 600, lineHeight: 1.2, color: "#1a1f19" }}>{subjectName}</p>

        <div style={{ maxWidth: 420, margin: "22px auto 0", fontSize: 13, lineHeight: 1.7, color: "#3d443c" }}>
          {fields.birthdate && (
            <p style={{ margin: 0 }}>
              was born on <b>{fields.birthdate}</b>
              {fields.birthplace ? (
                <>
                  {" "}
                  in <b>{fields.birthplace}</b>
                </>
              ) : null}
            </p>
          )}
          {sacramentType === "baptism" && fields.baptismDate && (
            <p style={{ margin: 0 }}>
              and was baptized on <b>{fields.baptismDate}</b>
            </p>
          )}
          {(fields.motherName || fields.fatherName) && (
            <p style={{ margin: 0 }}>
              child of{" "}
              <b>
                {fields.motherName || "—"} &amp; {fields.fatherName || "—"}
              </b>
            </p>
          )}
        </div>

        <div
          style={{
            maxWidth: 300,
            margin: "22px auto 0",
            paddingTop: 8,
            borderTop: "1px solid #e6e6e0",
            fontSize: 10.5,
            color: "#a3a39a",
          }}
        >
          Register reference: {fields.registerRef}
        </div>

        <div style={{ marginTop: 34, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 8px" }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ width: 120, height: 32, borderBottom: "1px solid #999" }} />
            <p style={{ marginTop: 4, fontSize: 9.5, letterSpacing: 0.5, textTransform: "uppercase", color: "#a3a39a" }}>
              Parish Priest / Secretary
            </p>
          </div>
          <div
            style={{
              height: 64,
              width: 64,
              border: "1px dashed #c4c4bb",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 8.5,
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: "#a3a39a",
            }}
          >
            QR
          </div>
        </div>

        <p style={{ marginTop: 20, fontFamily: "monospace", fontSize: 9.5, color: "#c7c7be" }}>
          {fields.requestId}
          {fields.certCode ? ` · ${fields.certCode}` : ""}
        </p>
      </div>
    );
  }
);
