// 5b: one couple's banns as a poster, for the bulletin board or the parish Facebook page.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link,
  useOutletContext,
  useParams,
} from "react-router-dom";
import type { Parish } from "@/types";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import {
  AdminPage,
  AdminPageHeader,
} from "@/features/parish-admin/components/AdminPageHeader";
import { notifyError } from "@/lib/notify";
import { getBannsPoster, updateBanns } from "./api/marriageApplicationsApi";
import { EMPTY_PARENTS } from "./bannsPapers";
import {
  canSharePoster,
  downloadPoster,
  loadPosterFont,
  POSTER_FONT,
  POSTER_HEADING_FONT,
  POSTER_HEIGHT,
  POSTER_WIDTH,
  printPoster,
  sharePoster,
} from "./bannsPoster";
import type { BannsParishHeading, MarriageApplication } from "./types";
import { AdminBackLink } from "@/features/parish-admin/components/AdminBackLink";

// Fixed colours, not theme tokens: the image must look the same whoever makes it.
const DEEP = "#0E3B46";
const INK = "#1E2E33";
const MUTED = "#5B6B70";
const GOLD = "#B08D3C";

function weekdayDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminBannsPosterPage() {
  const { applicationId = "" } = useParams();
  const { parish: currentParish } = useOutletContext<{ parish: Parish }>();
  const [data, setData] = useState<{
    application: MarriageApplication;
    parish: BannsParishHeading;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scale, setScale] = useState(0.5);
  const posterRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    () =>
      getBannsPoster(applicationId)
        .then((result) => {
          setData(result);
          setError("");
        })
        .catch((err: unknown) =>
          setError(
            err instanceof Error ? err.message : "Couldn't load the banns.",
          ),
        ),
    [applicationId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const [, setFontReady] = useState(false);
  useEffect(() => {
    // Draw again once the poster's typeface has arrived.
    loadPosterFont().then(() => setFontReady(true));
  }, []);

  // Fit the full-size poster to the space on screen.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const fit = () => setScale(Math.min(0.55, box.clientWidth / POSTER_WIDTH));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [data]);

  if (error || !data) {
    return (
      <AdminPage>
        <AdminPageHeader title="Banns poster" />
        <p
          className={
            error
              ? "text-admin-support text-red-700"
              : "text-admin-support text-admin-ink-faint"
          }
        >
          {error || "Loading…"}
        </p>
      </AdminPage>
    );
  }

  const { application, parish } = data;
  const consent = application.banns.onlineConsent;
  const filename = `banns-${application.referenceNo}.png`;
  const title = `Banns — ${application.groomName} and ${application.brideName}`;

  async function run(action: (node: HTMLElement) => Promise<void>) {
    if (!posterRef.current) return;
    setBusy(true);
    try {
      await action(posterRef.current);
    } catch (err) {
      notifyError(err, "Couldn't make the poster.");
    } finally {
      setBusy(false);
    }
  }

  async function giveConsent() {
    setBusy(true);
    try {
      await updateBanns(application.id, {
        ...application.banns,
        onlineConsent: true,
      });
      await load();
    } catch (err) {
      notifyError(err, "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminPage>
      <AdminBackLink />
      <AdminPageHeader
        title="Banns poster"
        description={`${application.groomName} and ${application.brideName} · ${application.referenceNo}`}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* A grey desk behind the poster, so its white edges show where the image ends. */}
        <div className="rounded-[var(--radius)] border border-admin-border bg-[#D9E1E3] p-4 sm:p-6">
          <div ref={boxRef} className="mx-auto w-full max-w-[594px]">
            <div
              style={{
                width: POSTER_WIDTH * scale,
                height: POSTER_HEIGHT * scale,
              }}
              className="overflow-hidden bg-white shadow-[0_2px_4px_rgba(0,0,0,0.08),0_10px_28px_-6px_rgba(10,40,30,0.28)] ring-1 ring-black/10"
            >
              <div
                data-poster-frame
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  width: POSTER_WIDTH,
                }}
              >
                <Poster
                  ref={posterRef}
                  application={application}
                  parish={parish}
                  sealUrl={currentParish.sealUrl}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <AdminCard className="space-y-3 p-4">
            <h2 className="font-serif text-admin-section font-semibold text-admin-ink">
              Share or print
            </h2>
            {consent ? (
              <p className="text-admin-support text-admin-green-700">
                The couple agreed to have their banns posted online.
              </p>
            ) : (
              <div className="rounded-lg bg-admin-amber-100 px-3 py-2.5 text-admin-support text-admin-amber-700">
                <p>Ask the couple before posting their banns online.</p>
                <AdminButton
                  type="button"
                  size="sm"
                  className="mt-2"
                  disabled={busy}
                  onClick={giveConsent}
                >
                  The couple agreed
                </AdminButton>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <AdminButton
                type="button"
                disabled={busy || !consent}
                onClick={() => run((node) => downloadPoster(node, filename))}
              >
                Download image
              </AdminButton>
              {canSharePoster() && (
                <AdminButton
                  type="button"
                  variant="secondary"
                  disabled={busy || !consent}
                  onClick={() =>
                    run((node) => sharePoster(node, filename, title))
                  }
                >
                  Share…
                </AdminButton>
              )}
              <AdminButton
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => run((node) => printPoster(node, title))}
              >
                Print for the bulletin board
              </AdminButton>
            </div>
          </AdminCard>
          <p className="px-1 text-admin-support text-admin-ink-muted">
            Addresses and parents come from{" "}
            <Link
              to={
                application.weddingElsewhere
                  ? `/${currentParish.slug}/admin/marriage-applications/banns`
                  : `/${currentParish.slug}/admin/marriage-applications/${encodeURIComponent(application.id)}`
              }
              className="font-semibold text-admin-green-700 hover:underline"
            >
              Edit banns
            </Link>
            . Only barangay and city are shown.
          </p>
        </div>
      </div>
    </AdminPage>
  );
}

interface PosterProps {
  application: MarriageApplication;
  parish: BannsParishHeading;
  sealUrl?: string;
  ref?: React.Ref<HTMLDivElement>;
}

/** Long names step down in size so each stays on one line where it can. */
function nameSize(name: string) {
  if (name.length > 38) return 26;
  if (name.length > 30) return 29;
  return 32;
}

/** "Nov. 15, 2026" */
function publicationDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const month = d.toLocaleDateString("en-US", { month: "short" });
  return `${month}${month.length > 3 || month === "May" ? "" : "."} ${d.getDate()}, ${d.getFullYear()}`;
}

function Poster({ application, parish, sealUrl, ref }: PosterProps) {
  const banns = application.banns;
  const parents = banns.parents ?? EMPTY_PARENTS;
  const weddingDate =
    application.weddingEvent?.date || application.preferredWeddingDate;
  const here = !application.weddingElsewhere;
  const place = here ? parish.name : application.weddingParish;
  // Each parish announces only its own parishioners; the one from another parish is named, not described.
  const groomHere = !banns.groomParish;
  const brideHere = !banns.brideParish;
  const both = groomHere && brideHere;
  const groom = {
    name: `MR. ${application.groomName}`,
    address: banns.groomAddress,
    parents: [parents.groomFather, parents.groomMother],
  };
  const bride = {
    name: `MS. ${application.brideName}`,
    address: banns.brideAddress,
    parents: [parents.brideFather, parents.brideMother],
  };
  const footer = [
    parish.address,
    parish.contact && `Tel. ${parish.contact}`,
    parish.email,
  ].filter(Boolean);

  return (
    <div
      ref={ref}
      style={{
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
        background: "#ffffff",
        color: INK,
        fontFamily: POSTER_FONT,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Letterhead */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "56px 88px 0",
        }}
      >
        {sealUrl && (
          <img
            src={sealUrl}
            alt=""
            style={{
              width: 100,
              height: 100,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ minWidth: 0, maxWidth: 560 }}>
          <div
            style={{
              fontFamily: POSTER_HEADING_FONT,
              fontSize: 23,
              fontWeight: 500,
              lineHeight: 1.35,
              letterSpacing: 1.5,
              color: DEEP,
              textWrap: "balance",
            }}
          >
            {parish.name}
          </div>
          {parish.diocese && (
            <div style={{ marginTop: 4, fontSize: 20, color: MUTED }}>
              {parish.diocese}
            </div>
          )}
        </div>
      </div>

      {/* Notice */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          padding: "0 64px",
          textAlign: "center",
          fontSize: 26,
          lineHeight: 1.4,
        }}
      >
        <div
          style={{
            marginTop: 48,
            fontFamily: POSTER_HEADING_FONT,
            fontSize: 58,
            fontWeight: 600,
            lineHeight: 1.3,
            letterSpacing: 3,
            color: DEEP,
          }}
        >
          Marriage Banns
        </div>
        <Ornament />

        {/* A short notice sits in the middle of the space instead of leaving a gap above the dates. */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingBottom: 24,
          }}
        >
          <p style={{ margin: 0, textWrap: "pretty" }}>
            {both
              ? "The following couple has expressed their intention"
              : "The following parishioner has expressed the intention"}{" "}
            to be made one in the Sacrament of Matrimony
            {weddingDate ? ` on ${weekdayDate(weddingDate)}` : ""} at{" "}
            <span
              style={{
                fontWeight: 700,
                textTransform: "uppercase",
                fontSize: 22,
                letterSpacing: 0.5,
              }}
            >
              {keepLastWordsTogether(place)}
            </span>
            {here && parish.address ? (
              <>
                ,{" "}
                <span style={{ whiteSpace: "nowrap" }}>{parish.address}:</span>
              </>
            ) : (
              ":"
            )}
          </p>

          {both ? (
            <>
              <PosterParty {...groom} />
              <div style={{ marginTop: 16 }}>and</div>
              <PosterParty {...bride} />
            </>
          ) : (
            <>
              <PosterParty {...(groomHere ? groom : bride)} />
              <PosterPartner
                name={groomHere ? bride.name : groom.name}
                parish={groomHere ? banns.brideParish : banns.groomParish}
              />
            </>
          )}

          <p style={{ margin: "30px 0 0", textWrap: "pretty" }}>
            For any known impediment, please inform the parish priest
            {parish.contact && (
              <>
                {" "}
                or call our Parish Office at{" "}
                <span style={{ whiteSpace: "nowrap" }}>{parish.contact}</span>
              </>
            )}
            {parish.email && (
              <>
                {parish.contact ? "," : ""} or send an email to{" "}
                <span style={{ whiteSpace: "nowrap" }}>{parish.email}</span>
              </>
            )}
            .
          </p>
          <p style={{ margin: "16px 0 0", textWrap: "pretty" }}>
            Thank you, and please remember them in your prayers as they prepare
            to be made one in the Sacrament of Matrimony.
          </p>
        </div>
      </div>

      {/* Dates of publication */}
      <div style={{ padding: "0 88px 40px", fontSize: 24, lineHeight: 1.4 }}>
        <div>Dates of Publication:</div>
        {banns.sundays.map((d) => (
          <div key={d}>{publicationDate(d)}</div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          background: DEEP,
          color: "#ffffff",
          padding: "22px 60px 26px",
          fontSize: 19,
          lineHeight: 1.4,
          textAlign: "center",
          borderTop: `5px solid ${GOLD}`,
        }}
      >
        {footer.join("   |   ")}
      </div>
    </div>
  );
}

function PosterParty({
  name,
  address,
  parents,
}: {
  name: string;
  address: string;
  parents: string[];
}) {
  const parentNames = parents.map((p) => p.trim()).filter(Boolean);
  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          fontFamily: POSTER_HEADING_FONT,
          fontSize: nameSize(name),
          fontWeight: 700,
          lineHeight: 1.25,
          letterSpacing: 1,
          color: DEEP,
          textWrap: "balance",
        }}
      >
        {name}
      </div>
      {address && <div style={{ marginTop: 2 }}>{address}</div>}
      {parentNames.length > 0 && <div>Parents: {parentNames.join(" & ")}</div>}
    </div>
  );
}

/** The one being married who lives in another parish: named, with their parish, which announces them. */
function PosterPartner({ name, parish }: { name: string; parish: string }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div>to</div>
      <div
        style={{
          marginTop: 4,
          fontFamily: POSTER_HEADING_FONT,
          fontSize: nameSize(name) - 6,
          fontWeight: 600,
          lineHeight: 1.25,
          letterSpacing: 1,
          color: DEEP,
          textWrap: "balance",
        }}
      >
        {name}
      </div>
      <div style={{ marginTop: 2, fontStyle: "italic", color: MUTED }}>
        of {parish}
      </div>
    </div>
  );
}

/** A small gold cross between two fine lines, drawn with boxes so it sits exactly in the image too. */
function Ornament() {
  const line = { width: 110, height: 1, background: GOLD };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        marginTop: 22,
      }}
    >
      <div style={line} />
      <div style={{ position: "relative", width: 16, height: 24 }}>
        <div
          style={{
            position: "absolute",
            left: 6,
            top: 0,
            width: 4,
            height: 24,
            background: GOLD,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 6,
            width: 16,
            height: 4,
            background: GOLD,
          }}
        />
      </div>
      <div style={line} />
    </div>
  );
}

/** Joins the last two words with a no-break space, so a long name never leaves one word alone on a line. */
function keepLastWordsTogether(text: string) {
  return text.replace(/ (\S+)$/, " $1");
}
