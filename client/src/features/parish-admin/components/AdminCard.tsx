import type { HTMLAttributes, ReactNode } from "react";

interface AdminCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function AdminCard({ children, className = "", ...props }: AdminCardProps) {
  return (
    <div
      className={`rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_2px_8px_rgba(10,40,30,0.06),0_0_0_1px_rgba(10,40,30,0.03)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}