import { type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "accent" | "role" | "secondary" | "outline" | "danger" | "danger-ghost" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}


const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-white hover:opacity-90",
  accent: "bg-accent text-primary hover:bg-accent/85",
  role: "bg-role-accent text-white hover:opacity-90",
  secondary: "bg-surface-alt text-ink border border-border hover:bg-border/40",
  outline: "bg-transparent text-ink border border-border hover:bg-surface-alt",
  danger: "bg-danger text-white hover:opacity-90",
  "danger-ghost": "bg-transparent text-danger border border-border hover:bg-danger/5",
  ghost: "bg-transparent text-ink hover:bg-surface-alt",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-base px-5 py-2.5",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`cursor-pointer inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}