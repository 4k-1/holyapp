import { type ReactNode } from "react";

type Tone = "neutral" | "primary" | "accent" | "danger";

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-alt text-ink-muted border border-border",
  primary: "bg-primary/10 text-primary border border-primary/20",
  accent: "bg-accent/10 text-accent border border-accent/20",
  danger: "bg-danger/10 text-danger border border-danger/20",
};

export function Badge({ tone = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}