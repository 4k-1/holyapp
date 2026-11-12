import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChurchList, GiveModeTabs, GivePanel, GiveSite, type GiveMode } from "@/features/public/PublicGiveLayout";

/** Choose what to do and which church, then on to the form. No account needed for either. */
export function GivePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<GiveMode>("donate");

  return (
    <GiveSite>
      <GivePanel
        title="Give to your parish"
        description="Give a donation through GCash or request a Mass for someone you love. No account needed."
        controls={<GiveModeTabs mode={mode} onChange={setMode} />}
      >
        <p className="mb-2 mt-5 text-[0.875rem] font-medium">Choose your church</p>
        <ChurchList onSelect={(parish) => navigate(`/give/${parish.slug}/${mode}`)} />
      </GivePanel>
    </GiveSite>
  );
}
