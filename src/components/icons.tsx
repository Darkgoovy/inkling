// Icônes minimales en ligne fine (cf. spec §10 : iconographie minimale).
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (props: P) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const ArrowLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const ArrowRight = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export const Check = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 13l4 4L19 7" />
  </svg>
);

export const Bulb = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3z" />
  </svg>
);

export const Target = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="0.6" fill="currentColor" />
  </svg>
);

export const Flame = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3c.5 3-2 4-2 7a2 2 0 1 0 4 0c0-.7-.3-1.3-.3-1.3 1.8 1 3.3 2.8 3.3 5.3a5 5 0 1 1-10 0c0-3.6 3-5.4 5-11z" />
  </svg>
);

export const Gear = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8" />
  </svg>
);

export const User = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
  </svg>
);

export const Book = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 0-2 2V4z" />
    <path d="M5 18a2 2 0 0 1 2-2h11" />
  </svg>
);

export const Play = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 5l11 7-11 7V5z" />
  </svg>
);

export const ChevronLeft = ArrowLeft;
export const ChevronRight = ArrowRight;
