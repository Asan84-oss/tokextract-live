import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="tx-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00f2fe" />
          <stop offset="1" stopColor="#fe0979" />
        </linearGradient>
      </defs>
      <rect x="2.5" y="2.5" width="35" height="35" rx="10" stroke="url(#tx-grad)" strokeWidth="2.4" />
      <path d="M16 12.8 27.2 20 16 27.2z" fill="url(#tx-grad)" />
      <path d="M13 31.5h14" stroke="url(#tx-grad)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export const IconLink = (p: P) => (
  <svg {...base} {...p}>
    <path d="M10 14a4.5 4.5 0 0 0 6.4.4l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.6 1.6" />
    <path d="M14 10a4.5 4.5 0 0 0-6.4-.4l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.6-1.6" />
  </svg>
);

export const IconDownload = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 4v10" />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    <path d="M4.5 19.5h15" />
  </svg>
);

export const IconMusic = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="7" cy="17.5" r="3" />
    <circle cx="17.5" cy="15" r="3" />
    <path d="M10 17.5V6.8L20.5 4v11" />
  </svg>
);

export const IconPlay = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const IconAlert = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 4 2.8 19.5h18.4z" />
    <path d="M12 10v4.2" />
    <path d="M12 16.8v.2" strokeWidth={2.4} />
  </svg>
);

export const IconInfo = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5" />
    <path d="M12 7.8v.2" strokeWidth={2.4} />
  </svg>
);

export const IconX = (p: P) => (
  <svg {...base} {...p}>
    <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
  </svg>
);

export const IconChevron = (p: P) => (
  <svg {...base} {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </svg>
);

export const IconClipboard = (p: P) => (
  <svg {...base} {...p}>
    <rect x="6" y="5" width="12" height="15" rx="2" />
    <path d="M9.5 5V3.8A1.3 1.3 0 0 1 10.8 2.5h2.4a1.3 1.3 0 0 1 1.3 1.3V5" />
    <path d="M9.5 11h5M9.5 14.5h5" />
  </svg>
);

export const IconBolt = (p: P) => (
  <svg {...base} {...p}>
    <path d="M13 3 5.5 13.5H11L10 21l7.5-10.5H13z" />
  </svg>
);

export const IconShield = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3.5 5 6v5.5c0 4.4 2.9 7.6 7 9 4.1-1.4 7-4.6 7-9V6z" />
    <path d="m9 11.8 2.2 2.2 4-4.5" />
  </svg>
);

export const IconHeart = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 20s-7-4.4-9-9c-1.2-2.8.6-6 3.8-6 2 0 3.6 1.2 5.2 3.4C13.6 6.2 15.2 5 17.2 5c3.2 0 5 3.2 3.8 6-2 4.6-9 9-9 9z" />
  </svg>
);

export function IconSpinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.6" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
