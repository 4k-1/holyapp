import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function GridIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

export function InboxIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 12h4.5l1.5 3h6l1.5-3H21" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="6" width="18" height="14" rx="2" strokeLinejoin="round" />
    </svg>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l1.6 2H19.5A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" strokeLinejoin="round" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      <line x1="7.5" y1="3" x2="7.5" y2="6.5" strokeLinecap="round" />
      <line x1="16.5" y1="3" x2="16.5" y2="6.5" strokeLinecap="round" />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 20.2s-7.6-4.6-9.9-9.6C.7 6.9 3 3.4 6.6 3.4c2 0 3.6 1 5.4 3 1.8-2 3.4-3 5.4-3 3.6 0 5.9 3.5 4.5 7.2-2.3 5-9.9 9.6-9.9 9.6z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <line x1="5" y1="20" x2="5" y2="12" strokeLinecap="round" />
      <line x1="12" y1="20" x2="12" y2="7" strokeLinecap="round" />
      <line x1="19" y1="20" x2="19" y2="15" strokeLinecap="round" />
      <line x1="3" y1="20" x2="21" y2="20" strokeLinecap="round" />
    </svg>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V19a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 13a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 6.6a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V1a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 1.6a1.7 1.7 0 0 0 1.87.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 6.6a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" strokeLinejoin="round" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 13 6 8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PanelLeftCloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <polyline points="16 15 13 12 16 9" />
    </svg>
  );
}

export function PanelLeftOpenIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <polyline points="13 9 16 12 13 15" />
    </svg>
  );
}

export function ChurchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3v4" />
      <path d="M10 5h4" />
      <path d="M4 21V10l8-5 8 5v11" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.6-2.6 2.8-4 5.5-4s4.9 1.4 5.5 4" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M20.5 19c-.5-2-2-3.3-4-3.6" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19c.8-3.2 3.4-5 7-5s6.2 1.8 7 5" />
    </svg>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="6" y="5" width="12" height="16" rx="2" />
      <path d="M9 5V4h6v1" />
      <path d="M9 11h6M9 15h4" />
    </svg>
  );
}

export function SealIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="11" r="6" />
      <path d="M9.5 16.5 8 21l4-1.5L16 21l-1.5-4.5" />
    </svg>
  );
}