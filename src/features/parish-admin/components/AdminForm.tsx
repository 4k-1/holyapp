import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

const fieldInputClass =
  "w-full rounded-[7px] border border-admin-border-strong bg-white px-[11px] py-[9px] text-[13.5px] text-admin-ink focus:border-admin-green-600 focus:outline-none focus:ring-2 focus:ring-admin-green-600/25";

export function AdminField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.5px] text-admin-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

export function AdminInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldInputClass} ${className}`} {...props} />;
}

type AdminBtnVariant = "primary" | "secondary" | "danger" | "ghost";

const btnVariants: Record<AdminBtnVariant, string> = {
  primary: "border-transparent bg-admin-green-700 text-white hover:bg-admin-green-900",
  secondary: "border-admin-border-strong bg-admin-surface text-admin-ink hover:bg-admin-surface-alt",
  danger: "border-[#E3C3BC] bg-admin-surface text-admin-red-700 hover:bg-admin-red-100",
  ghost: "border-transparent bg-transparent px-1.5 text-admin-green-700 hover:underline",
};

export function AdminButton({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminBtnVariant;
  size?: "sm" | "md";
  children: ReactNode;
}) {
  const sizeClass = size === "sm" ? "px-[11px] py-1.5 text-[12.5px]" : "px-4 py-[9px] text-[13.5px]";
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${btnVariants[variant]} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
