interface WizardStepTrackProps {
    currentStep: 1 | 2 | 3;
  }
  
  const steps = [
    { num: 1, name: "Sacrament", desc: "Choose type & purpose" },
    { num: 2, name: "Details", desc: "Tell us who it's for" },
    { num: 3, name: "Confirmation", desc: "Review & submit" },
  ];
  
  export function WizardStepTrack({ currentStep }: WizardStepTrackProps) {
    const fillPercent = currentStep === 1 ? 0 : currentStep === 2 ? 50 : 100;
  
    return (
      <div className="relative mb-8 grid grid-cols-3">
        <div className="absolute left-[16.667%] right-[16.667%] top-[19px] h-0.5 bg-border" />
        <div
          className="absolute left-[16.667%] top-[19px] h-0.5 bg-primary transition-all duration-300"
          style={{ width: `${fillPercent * 0.667}%` }}
        />
        {steps.map((step) => {
          const isActive = step.num === currentStep;
          const isComplete = step.num < currentStep;
          return (
            <div
              key={step.num}
              className={`relative z-10 flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center ${
                isActive ? "bg-surface shadow-md" : ""
              }`}
            >
              <div
                className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                  isActive || isComplete
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-ink-muted"
                }`}
              >
                {isComplete ? "✓" : step.num}
              </div>
              <div className="min-w-0">
                <p className={`text-[13px] font-bold ${isActive || isComplete ? "text-ink" : "text-ink-muted"}`}>
                  {step.name}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-muted">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }