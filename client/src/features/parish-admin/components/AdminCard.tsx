import type { HTMLAttributes, ReactNode } from "react";

interface AdminCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function AdminCard({ children, className = "", ...props }: AdminCardProps) {
  return (
    <div
      className={`rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[var(--shadow-card)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}