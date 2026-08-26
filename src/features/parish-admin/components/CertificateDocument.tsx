import { forwardRef, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { CertificateAppearance } from "@/features/parish-admin/settings/types";
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
  confirmationDate?: string;
  marriageDate?: string;
  deathDate?: string;
  motherName?: string;
  fatherName?: string;
  certCode?: string;
  notations?: string[];
}

interface CertificateDocumentProps {
  parish: Parish;
  sacramentType: SacramentType;
  subjectName: string;
  fields: CertificateFields;
  appearance?: CertificateAppearance;
}

/**
 * A certificate is a fixed printed document — it must read the same regardless of the
 * admin app's own light/dark UI preference. These are the document's own ink colors,
 * not the app theme: a deep chancel green and a muted liturgical gold.
 */
const PRIMARY = "#1a3d2b";
const ACCENT = "#a9791f";

const INK = "#211f1a";
const INK_MUTED = "#5c5646";
const INK_FAINT = "#8c8471";
const PAPER = "#fbf7ea";

const FALLBACK_SIGNATORY_TITLE = "Parish Priest / Secretary";
const SHEET_WIDTH = 580;

/** The certificate's own type voice — a classical book-serif, distinct from the admin app's UI font. */
export const CERT_SERIF = "'Cormorant Garamond', ui-serif, Georgia, 'Times New Roman', serif";

export const CertificateDocument = forwardRef<HTMLDivElement, CertificateDocumentProps>(
  function CertificateDocument({ parish, sacramentType, subjectName, fields, appearance }, ref) {
    const signatoryTitle = appearance?.signatoryTitle.trim() || FALLBACK_SIGNATORY_TITLE;
    const signatoryName = appearance?.signatoryName.trim() ?? "";
    const footerText = appearance?.footerText.trim() ?? "";
    const qrSeed = fields.certCode || fields.requestId;

    return (
      <div
        ref={ref}
        style={{
          boxSizing: "border-box",
          position: "relative",
          padding: 15,
          background: PAPER,
          fontFamily: CERT_SERIF,
          color: INK,
        }}
      >
        <CornerOrnament style={{ top: 5, left: 5 }} />
        <CornerOrnament style={{ top: 5, right: 5, transform: "scaleX(-1)" }} />
        <CornerOrnament style={{ bottom: 5, left: 5, transform: "scaleY(-1)" }} />
        <CornerOrnament style={{ bottom: 5, right: 5, transform: "scale(-1, -1)" }} />

        <div style={{ border: `1.5px solid ${PRIMARY}`, padding: 3 }}>
          <div
            style={{
              border: `1px solid ${ACCENT}`,
              padding: "30px 34px 22px",
              textAlign: "center",
            }}
          >
            <ParishMark parish={parish} />

            <p
              style={{
                margin: "12px 0 0",
                fontSize: 12.5,
                fontWeight: 600,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                lineHeight: 1.35,
                color: PRIMARY,
              }}
            >
              {parish.name}
            </p>
            {parish.address && (
              <p style={{ margin: "4px 0 0", fontSize: 11, fontStyle: "italic", color: INK_MUTED }}>
                {parish.address}
              </p>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 16px" }}>
              <Rule />
              <CrossOrnament />
              <Rule />
            </div>

            <p
              style={{
                margin: 0,
                fontSize: 21,
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: PRIMARY,
                lineHeight: 1.3,
              }}
            >
              {sacramentCertTitles[sacramentType]}
            </p>
            <div style={{ width: 44, height: 2, margin: "10px auto 0", background: ACCENT }} />

            <p
              style={{
                margin: "24px 0 0",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: INK_MUTED,
              }}
            >
              This is to certify that
            </p>
            <p
              style={{
                margin: "7px 0 0",
                fontSize: 27,
                fontWeight: 700,
                lineHeight: 1.25,
                color: INK,
              }}
            >
              {subjectName}
            </p>

            <div style={{ margin: "14px auto 0", maxWidth: 440, fontSize: 13.5, lineHeight: 1.65, color: INK }}>
              <CertificateBody sacramentType={sacramentType} fields={fields} />
            </div>

            <div
              style={{
                margin: "18px 0 0",
                paddingTop: 10,
                borderTop: `1px solid ${ACCENT}55`,
                maxWidth: 400,
                marginLeft: "auto",
                marginRight: "auto",
                fontSize: 10.5,
                color: INK_MUTED,
                lineHeight: 1.55,
              }}
            >
              {footerText && <p style={{ margin: "0 0 6px" }}>{footerText}</p>}
              <p style={{ margin: 0 }}>Register reference: {fields.registerRef}</p>
            </div>

            <div
              style={{
                marginTop: 22,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div style={{ textAlign: "left", minWidth: 0 }}>
                <div style={{ width: 172, height: 30, borderBottom: `1px solid ${INK_FAINT}` }} />
                {signatoryName && (
                  <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 700, color: INK }}>{signatoryName}</p>
                )}
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 9.5,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: INK_MUTED,
                  }}
                >
                  {signatoryTitle}
                </p>
              </div>
              <FakeQrCode seed={qrSeed} />
            </div>

            <p style={{ margin: "14px 0 0", fontFamily: "ui-monospace, Consolas, monospace", fontSize: 9, color: INK_FAINT }}>
              {fields.certCode ? (
                <>
                  Certificate No. <span style={{ color: INK_MUTED, fontWeight: 600 }}>{fields.certCode}</span>
                </>
              ) : (
                <span style={{ fontStyle: "italic" }}>Preview copy · reference {fields.requestId}</span>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

/** Scales the certificate sheet to fit the stage so the whole document stays in view. */
export function CertificatePreviewStage({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, width: SHEET_WIDTH, height: 640 });

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const sheet = sheetRef.current;
    if (!stage || !sheet) return;

    const update = () => {
      const natW = sheet.offsetWidth;
      const natH = sheet.offsetHeight;
      const availW = stage.clientWidth;
      const panel = stage.closest("[data-cert-preview-panel]");
      const header = panel?.querySelector("[data-cert-preview-header]");
      const footer = panel?.querySelector("[data-cert-preview-footer]");
      const panelMax = Math.min(window.innerHeight * 0.92, 840);
      const chrome =
        (header instanceof HTMLElement ? header.offsetHeight : 56) +
        (footer instanceof HTMLElement ? footer.offsetHeight : 56) +
        24;
      const availH = Math.max(160, panelMax - chrome);
      if (natW < 8 || natH < 8 || availW < 8) return;
      const scale = Math.min(availW / natW, availH / natH);
      setFit((prev) =>
        Math.abs(prev.scale - scale) < 0.002 && prev.width === natW && prev.height === natH
          ? prev
          : { scale, width: natW, height: natH }
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    observer.observe(sheet);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [children]);

  return (
    <div ref={stageRef} className="flex h-full w-full items-center justify-center overflow-hidden">
      <div
        className="shadow-[0_10px_28px_-8px_rgba(40,36,20,0.35)]"
        style={{
          width: fit.width * fit.scale,
          height: fit.height * fit.scale,
          position: "relative",
        }}
      >
        <div
          ref={sheetRef}
          style={{
            width: SHEET_WIDTH,
            transform: `scale(${fit.scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function ParishMark({ parish }: { parish: Parish }) {
  const markStyle = {
    height: 58,
    width: 58,
    flexShrink: 0,
    borderRadius: 9999,
    border: `1.5px solid ${ACCENT}`,
    objectFit: "contain" as const,
    background: "white",
  };

  if (parish.sealUrl) {
    return <img src={parish.sealUrl} alt="" style={{ ...markStyle, padding: 4, margin: "0 auto" }} />;
  }

  return (
    <div
      style={{
        ...markStyle,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        fontWeight: 700,
        fontFamily: CERT_SERIF,
        color: PRIMARY,
      }}
    >
      {parish.name.charAt(0)}
    </div>
  );
}

function Rule() {
  return (
    <div
      style={{
        flex: 1,
        height: 1,
        background: `linear-gradient(90deg, transparent, ${ACCENT}99, transparent)`,
      }}
    />
  );
}

/** A small authored Latin cross — the certificate's religious mark, not a display font glyph. */
function CrossOrnament() {
  return (
    <svg width={12} height={17} viewBox="0 0 12 17" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x={5.1} y={0} width={1.8} height={17} rx={0.9} fill={ACCENT} />
      <rect x={0} y={4.6} width={12} height={1.8} rx={0.9} fill={ACCENT} />
    </svg>
  );
}

/** A simple authored corner bracket, echoing the double-rule frame at each corner. */
function CornerOrnament({ style }: { style: React.CSSProperties }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      aria-hidden="true"
      style={{ position: "absolute", pointerEvents: "none", ...style }}
    >
      <path d="M1 13 V5 Q1 1 5 1 H13" stroke={ACCENT} strokeWidth={1.3} fill="none" strokeLinecap="round" />
      <path d="M1 18 V16" stroke={ACCENT} strokeWidth={1.3} strokeLinecap="round" />
      <path d="M16 1 H18" stroke={ACCENT} strokeWidth={1.3} strokeLinecap="round" />
    </svg>
  );
}

function FakeQrCode({ seed }: { seed: string }) {
  const modules = buildFakeQr(seed, 21);
  const n = 21;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0 }}>
      <div
        style={{
          padding: 5,
          background: "#fff",
          border: `1px solid ${INK}`,
          lineHeight: 0,
        }}
        aria-hidden="true"
      >
        <svg width={62} height={62} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges">
          <rect width={n} height={n} fill="#fff" />
          {modules.map((row, y) =>
            row.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#111" /> : null))
          )}
        </svg>
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: 7,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: INK_FAINT,
        }}
      >
        Scan to verify
      </p>
    </div>
  );
}

function buildFakeQr(seed: string, n: number) {
  const grid = Array.from({ length: n }, () => Array<boolean>(n).fill(false));

  const paintFinder = (fx: number, fy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const outer = x === 0 || y === 0 || x === 6 || y === 6;
        const inner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        grid[fy + y][fx + x] = outer || inner;
      }
    }
  };

  paintFinder(0, 0);
  paintFinder(n - 7, 0);
  paintFinder(0, n - 7);

  for (let i = 8; i < n - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  const reserved = (x: number, y: number) => {
    const inFinder = (fx: number, fy: number) => x >= fx && x < fx + 8 && y >= fy && y < fy + 8;
    return inFinder(0, 0) || inFinder(n - 8, 0) || inFinder(0, n - 8) || y === 6 || x === 6;
  };

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (reserved(x, y)) continue;
      grid[y][x] = hashedOn(seed, x + y * n);
    }
  }

  return grid;
}

function hashedOn(seed: string, i: number) {
  let h = 2166136261;
  for (let k = 0; k < seed.length; k++) {
    h ^= seed.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  h ^= Math.imul(i + 1, 374761393);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h >>> 0) % 5 !== 0;
}

function CertificateBody({
  sacramentType,
  fields,
}: {
  sacramentType: SacramentType;
  fields: CertificateFields;
}) {
  const showParents =
    (sacramentType === "baptism" || sacramentType === "confirmation") &&
    (fields.motherName || fields.fatherName);

  return (
    <>
      {fields.birthdate && sacramentType !== "marriage" && (
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
      {sacramentType === "confirmation" && fields.confirmationDate && (
        <p style={{ margin: 0 }}>
          and was confirmed on <b>{fields.confirmationDate}</b>
        </p>
      )}
      {sacramentType === "marriage" && fields.marriageDate && (
        <p style={{ margin: 0 }}>
          were united in holy matrimony on <b>{fields.marriageDate}</b>
        </p>
      )}
      {sacramentType === "death" && fields.deathDate && (
        <p style={{ margin: 0 }}>
          departed this life on <b>{fields.deathDate}</b>
        </p>
      )}
      {showParents && (
        <p style={{ margin: 0 }}>
          child of{" "}
          <b>
            {fields.motherName || "—"} &amp; {fields.fatherName || "—"}
          </b>
        </p>
      )}
      {fields.notations?.map((line) => (
        <p key={line} style={{ margin: "9px 0 0", fontSize: 12, fontStyle: "italic", color: INK_MUTED }}>
          {line}
        </p>
      ))}
    </>
  );
}
