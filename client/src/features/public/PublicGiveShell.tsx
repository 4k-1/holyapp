import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getParishBySlug } from "@/features/parish/parishApi";
import { ChurchList, ChurchPicker, GiveModeTabs, GivePanel, GiveSite, type GiveMode } from "@/features/public/PublicGiveLayout";
import type { Parish } from "@/types";

const COPY: Record<GiveMode, { title: string; description: string }> = {
  donate: {
    title: "Donate now",
    description: "Your gift keeps the parish's ministries, upkeep and outreach going. Pay securely through GCash; no account needed.",
  },
  intention: {
    title: "Offer a Mass",
    description: "In thanksgiving, for healing, or in memory of a loved one. No account needed, and a donation is optional.",
  },
};

/**
 * Frame for the signed-out giving pages: loads the parish from the URL and hands it to the page's form, under the
 * donate / Mass switch and the church picker. Visitors need no account.
 */
export function PublicGiveShell({ mode, children }: { mode: GiveMode; children: (parish: Parish) => ReactNode }) {
  const { parishSlug } = useParams();
  const navigate = useNavigate();
  const [parish, setParish] = useState<Parish | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (parishSlug ? getParishBySlug(parishSlug) : Promise.resolve(null)).then((found) => {
      if (!cancelled) setParish(found ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [parishSlug]);

  if (parish === undefined) {
    return (
      <GiveSite>
        <p className="py-24 text-center text-white/80">Loading…</p>
      </GiveSite>
    );
  }

  if (!parish) {
    return (
      <GiveSite>
        <GivePanel title="We couldn't find that church" description="The link may be old or mistyped. Search for your church to continue.">
          <div className="pt-5">
            <ChurchList autoFocus onSelect={(next) => navigate(`/give/${next.slug}/${mode}`)} />
          </div>
        </GivePanel>
      </GiveSite>
    );
  }

  return (
    <GiveSite parish={parish}>
      <GivePanel
        title={COPY[mode].title}
        description={COPY[mode].description}
        controls={
          <>
            <GiveModeTabs mode={mode} hrefFor={(m) => `/give/${parish.slug}/${m}`} />
            <ChurchPicker parish={parish} mode={mode} />
          </>
        }
      >
        {children(parish)}
      </GivePanel>
    </GiveSite>
  );
}
