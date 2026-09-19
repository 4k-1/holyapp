import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function DropletIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <path
        d="M12 2.5c-3.2 4.2-6.5 8.9-6.5 12.5a6.5 6.5 0 0 0 13 0c0-3.6-3.3-8.3-6.5-12.5z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DoveIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
      <path
        d="M3 12c2-3.5 5-4 7-2.5C11.5 6 15 4 19 5c-1.5 1-2 2.3-1.7 3.6C19 9 20.5 10 21 11.5c-2 .3-3.4-.2-4.3-1-.3 2-2 3.7-4.4 4.2.6.7 1.7 1 3 1-1.6 1.4-4 1.8-6 .8-1.7-.8-3-2.3-3.8-4-.7 0-1.7-.2-2.5-.5z"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <path
        d="M12 20.2s-7.6-4.6-9.9-9.6C.7 6.9 3 3.4 6.6 3.4c2 0 3.6 1 5.4 3 1.8-2 3.4-3 5.4-3 3.6 0 5.9 3.5 4.5 7.2-2.3 5-9.9 9.6-9.9 9.6z"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CandleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path
        d="M12 3c.9 1.1 1.5 1.9 1.5 2.8 0 .9-.7 1.4-1.5 1.4s-1.5-.5-1.5-1.4c0-.9.6-1.7 1.5-2.8z"
        strokeLinejoin="round"
      />
      <rect x="9.3" y="8.5" width="5.4" height="12" rx="1" />
      <line x1="9.3" y1="12.5" x2="14.7" y2="12.5" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M12 3l7 3v5.5c0 4.6-3 8.3-7 9.5-4-1.2-7-4.9-7-9.5V6l7-3z" strokeLinejoin="round" />
      <path d="M8.7 12.2l2.3 2.3 4.3-4.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GiveIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path
        d="M12 20.2s-7.6-4.6-9.9-9.6C.7 6.9 3 3.4 6.6 3.4c2 0 3.6 1 5.4 3 1.8-2 3.4-3 5.4-3 3.6 0 5.9 3.5 4.5 7.2-2.3 5-9.9 9.6-9.9 9.6z"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M8.5 12l2 2 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IntentionIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path
        d="M12 3c.9 1.1 1.6 1.9 1.6 2.9 0 1-.7 1.5-1.6 1.5s-1.6-.5-1.6-1.5C10.4 4.9 11.1 4.1 12 3z"
        strokeLinejoin="round"
      />
      <rect x="9.3" y="8.6" width="5.4" height="11.4" rx="1" />
      <line x1="6.5" y1="20" x2="17.5" y2="20" strokeLinecap="round" />
    </svg>
  );
}