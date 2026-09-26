import type { SVGProps } from "react";
import { cn } from "../cn";

/**
 * The house icon set — one family, drawn for Tycoonhood.
 *
 * 24px grid, 1.5 stroke, square caps, mitred joins, no fills except where a
 * solid mark carries meaning. Geometric and architectural on purpose: every
 * glyph should read as drawn with a rule and a set square. Emoji and mixed
 * third-party sets are not used anywhere in the product (see DESIGN_SYSTEM).
 */
const paths = {
  "arrow-right": <path d="M4 12h15M13 6l6 6-6 6" />,
  "arrow-left": <path d="M20 12H5M11 6l-6 6 6 6" />,
  "arrow-up-right": <path d="M7 17 17 7M8 7h9v9" />,
  "chevron-right": <path d="m9 5 7 7-7 7" />,
  "chevron-down": <path d="m5 9 7 7 7-7" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M3.5 7h17M3.5 12h17M3.5 17h11" />,
  plus: <path d="M12 5v14M5 12h14" />,
  // Districts of the HQ
  command: (
    <>
      <path d="M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7z" />
      <path d="M17 13.5v7M13.5 17h7" />
    </>
  ),
  academy: (
    <>
      <path d="M2.5 9 12 4l9.5 5" />
      <path d="M5 10v8M9.667 10v8M14.333 10v8M19 10v8M3 20.5h18" />
    </>
  ),
  arena: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  vault: (
    <>
      <path d="M3.5 3.5h17v17h-17z" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 7.5v2M12 14.5v2M7.5 12h2M14.5 12h2M3.5 20.5v1.5M20.5 20.5v1.5" />
    </>
  ),
  network: (
    <>
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="18" r="2" />
      <circle cx="12" cy="13" r="1.5" />
      <path d="M12 7v4.5M10.8 14 6.5 16.8M13.2 14l4.3 2.8M7 18h10" />
    </>
  ),
  exchange: (
    <>
      <path d="M4 8h14M14 4l4 4-4 4" />
      <path d="M20 16H6M10 12l-4 4 4 4" />
    </>
  ),
  treasury: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 8.5h7M12 8.5v7.5M10 16h4" />
    </>
  ),
  journal: (
    <>
      <path d="M5 3.5h11.5a2 2 0 0 1 2 2v15H7a2 2 0 0 1-2-2z" />
      <path d="M5 18.5a2 2 0 0 1 2-2h11.5M9 8h6M9 11h4" />
    </>
  ),
  // Member instruments
  wallet: (
    <>
      <path d="M3.5 6.5h15a2 2 0 0 1 2 2v10h-17z" />
      <path d="M3.5 6.5 16 3.5v3M15 13.5h2.5" />
    </>
  ),
  orders: (
    <>
      <path d="m3.5 7.5 8.5-4 8.5 4v9l-8.5 4-8.5-4z" />
      <path d="m3.5 7.5 8.5 4 8.5-4M12 11.5v9" />
    </>
  ),
  settings: (
    <>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <path d="M15 4v4M9 10v4M17 16v4" />
    </>
  ),
  leaderboard: <path d="M3.5 20.5h17M6 20.5V13M10.667 20.5V8M15.333 20.5V11M20 20.5V4.5" />,
  miner: (
    <>
      <path d="M4 20 14 10" />
      <path d="M9.5 4.5c3.5-1 7.5.5 10 4-2.5-1-5-1.2-7 0l-3-4z" />
    </>
  ),
  shield: <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6z" />,
  logout: (
    <>
      <path d="M9.5 20.5h-5v-17h5" />
      <path d="M15 7.5 19.5 12 15 16.5M19.5 12H9" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5" />
    </>
  ),
  // States & signals
  streak: (
    <>
      <path d="M5 20 12 4l7 16" />
      <path d="M8.5 13h7" />
    </>
  ),
  ascent: <path d="m4 14 8-7 8 7M4 20l8-7 8 7" />,
  seal: (
    <>
      <path d="m12 2.5 2.3 1.7 2.9-.1.9 2.7 2.3 1.7-.9 2.7.9 2.7-2.3 1.7-.9 2.7-2.9-.1L12 19.9l-2.3-1.7-2.9.1-.9-2.7-2.3-1.7.9-2.7-.9-2.7 2.3-1.7.9-2.7 2.9.1z" />
      <path d="m9 11.5 2 2 4-4.5" />
    </>
  ),
  mission: (
    <>
      <path d="M5 21V3.5" />
      <path d="M5 4h12l-2.5 4L17 12H5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  lock: (
    <>
      <path d="M5 10.5h14v10H5z" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  play: <path d="M7 4.5v15l12-7.5z" />,
  book: (
    <>
      <path d="M12 6.5c-2-1.5-5-2-8.5-1.5v14c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5v-14c-3.5-.5-6.5 0-8.5 1.5z" />
      <path d="M12 6.5v14" />
    </>
  ),
  quiz: (
    <>
      <path d="M3.5 3.5h17v17h-17z" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5v.7M12 16.5v.5" />
    </>
  ),
  calendar: (
    <>
      <path d="M3.5 5.5h17v15h-17z" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  bolt: <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.5v.5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 2.5 20h19z" />
      <path d="M12 10v4.5M12 17v.5" />
    </>
  ),
  external: (
    <>
      <path d="M13.5 3.5h7v7M20.5 3.5 11 13" />
      <path d="M18 14v6.5H3.5V6H10" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  pillar: <path d="M6 3.5h12M7 20.5h10M8.5 6v12M12 6v12M15.5 6v12M5 21h14" />,
} as const;

export type IconName = keyof typeof paths;
export const iconNames = Object.keys(paths) as IconName[];

export function Icon({
  name,
  size = 18,
  className,
  title,
  strokeWidth = 1.5,
  ...props
}: Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  size?: number;
  title?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={cn("shrink-0", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title && <title>{title}</title>}
      {paths[name]}
    </svg>
  );
}
