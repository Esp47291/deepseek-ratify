/**
 * Decorative rolling-hills illustration used as a background under hero panels and cards.
 * Pure SVG, no images: light, sharp at any size and free of licensing questions.
 */

export type LandscapeVariant = "meadow" | "blush" | "dawn" | "sage";

interface Palette {
  sky: [string, string];
  far: string;
  mid: [string, string];
  field: [string, string];
  hill: [string, string];
  front: [string, string];
}

const palettes: Record<LandscapeVariant, Palette> = {
  // Hero: white haze, pale hills, a pink field on the left, deep green on the right
  meadow: {
    sky: ["#FFFFFF", "#EEF2EC"],
    far: "#D5DFD8",
    mid: ["#E4EBDC", "#CBDBBE"],
    field: ["#F4E1DF", "#E2BFC0"],
    hill: ["#A7C695", "#5E8C52"],
    front: ["#86AE74", "#3E6B3B"],
  },
  // Pink flower field under a blue sky
  blush: {
    sky: ["#B9D3EC", "#E4EEF5"],
    far: "#CFDCE6",
    mid: ["#EBCBD3", "#DDA9B8"],
    field: ["#E6AFC0", "#C76F8A"],
    hill: ["#D98AA3", "#A8506E"],
    front: ["#C46A88", "#8E3E5B"],
  },
  // Clear morning: blue sky, soft green
  dawn: {
    sky: ["#C4DAEF", "#F1F5F2"],
    far: "#D6E2E2",
    mid: ["#DDE8D3", "#C2D6B2"],
    field: ["#F2DCD9", "#E3C1C3"],
    hill: ["#B4CFA2", "#6E9A60"],
    front: ["#93B781", "#4F7E47"],
  },
  // Muted green-grey, for quieter places
  sage: {
    sky: ["#F4F5F2", "#E7ECE6"],
    far: "#DAE1DB",
    mid: ["#DCE4D6", "#C7D3C0"],
    field: ["#E9E3DA", "#D6CBBE"],
    hill: ["#B7C9AE", "#7D9673"],
    front: ["#9CB492", "#5C7653"],
  },
};

const shapes = {
  far: "M0 360C180 318 360 332 540 324C740 315 900 282 1100 296C1250 306 1360 322 1440 318V720H0Z",
  mid: "M0 440C170 396 360 404 560 428C760 452 900 392 1100 398C1260 403 1370 424 1440 418V720H0Z",
  field: "M0 488C190 444 390 458 580 512C700 546 790 610 850 720H0Z",
  hill: "M480 720C640 604 840 516 1060 494C1230 477 1360 474 1440 466V720Z",
  front: "M0 628C170 590 330 598 480 640C570 665 640 694 690 720H0Z",
};

interface LandscapeProps {
  /** Unique per page: used to namespace gradient ids */
  id: string;
  variant?: LandscapeVariant;
  className?: string;
}

export default function Landscape({ id, variant = "meadow", className = "" }: LandscapeProps) {
  const p = palettes[variant];
  const g = (name: string) => `${id}-${name}`;

  return (
    <svg
      viewBox="0 0 1440 720"
      preserveAspectRatio="xMidYMax slice"
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={g("sky")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="0.7" stopColor={p.sky[1]} />
        </linearGradient>
        <radialGradient id={g("glow")} cx="0.5" cy="0.32" r="0.55">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g("mid")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.mid[0]} />
          <stop offset="0.6" stopColor={p.mid[1]} />
        </linearGradient>
        <linearGradient id={g("field")} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={p.field[0]} />
          <stop offset="0.8" stopColor={p.field[1]} />
        </linearGradient>
        <linearGradient id={g("hill")} x1="0.2" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={p.hill[0]} />
          <stop offset="0.75" stopColor={p.hill[1]} />
        </linearGradient>
        <linearGradient id={g("front")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.front[0]} />
          <stop offset="1" stopColor={p.front[1]} />
        </linearGradient>
        {/* Thin furrows: the striped texture of ploughed or planted fields */}
        <pattern id={g("rows")} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)">
          <rect width="9" height="1.4" fill="#FFFFFF" fillOpacity="0.22" />
        </pattern>
        <pattern id={g("rows-fine")} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(9)">
          <rect width="6" height="1" fill="#FFFFFF" fillOpacity="0.16" />
        </pattern>
        <linearGradient id={g("fog")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        {/* Light catching the crest of each hill */}
        <linearGradient id={g("sheen")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.28" />
          <stop offset="0.35" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id={g("haze")} x="-5%" y="-20%" width="110%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      <rect width="1440" height="720" fill={`url(#${g("sky")})`} />
      <rect width="1440" height="720" fill={`url(#${g("glow")})`} />

      <path d={shapes.far} fill={p.far} fillOpacity="0.85" filter={`url(#${g("haze")})`} />
      <path d={shapes.mid} fill={`url(#${g("mid")})`} />
      <path d={shapes.mid} fill={`url(#${g("rows-fine")})`} />
      <rect y="300" width="1440" height="200" fill={`url(#${g("fog")})`} />

      <path d={shapes.field} fill={`url(#${g("field")})`} />
      <path d={shapes.field} fill={`url(#${g("rows")})`} />
      <path d={shapes.field} fill={`url(#${g("sheen")})`} />

      <path d={shapes.hill} fill={`url(#${g("hill")})`} />
      <path d={shapes.hill} fill={`url(#${g("rows-fine")})`} />
      <path d={shapes.hill} fill={`url(#${g("sheen")})`} />

      <path d={shapes.front} fill={`url(#${g("front")})`} />
      <path d={shapes.front} fill={`url(#${g("rows")})`} />
      <path d={shapes.front} fill={`url(#${g("sheen")})`} />
    </svg>
  );
}
