/**
 * Halftone (dot-matrix) illustrations for dark sections.
 * Shapes are filled with a dot pattern and fade out towards the edges.
 */

export type DotArtShape = "report" | "shield" | "chat";

interface DotArtProps {
  shape: DotArtShape;
  className?: string;
}

/** Must match the card background so the "cut" lines read as gaps */
const CUT = { stroke: "var(--night-raised)" };

function ShapeBody({ shape, fill }: { shape: DotArtShape; fill: string }) {
  switch (shape) {
    case "report":
      return (
        <g fill={fill}>
          <rect x="52" y="92" width="26" height="44" rx="5" />
          <rect x="88" y="70" width="26" height="66" rx="5" />
          <rect x="124" y="80" width="26" height="56" rx="5" />
          <rect x="160" y="44" width="26" height="92" rx="5" />
          <path d="M50 74L98 46L134 58L186 20" stroke={fill} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      );
    case "shield":
      return (
        <g>
          <path d="M120 16L176 36V80C176 112 152 134 120 146C88 134 64 112 64 80V36Z" fill={fill} />
          <path d="M94 80L113 99L148 62" style={CUT} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      );
    case "chat":
      return (
        <g>
          <path d="M48 30H140C150 30 158 38 158 48V84C158 94 150 102 140 102H84L62 120V102H48C38 102 30 94 30 84V48C30 38 38 30 48 30Z" fill={fill} />
          <path
            d="M118 66H194C204 66 212 74 212 84V114C212 124 204 132 194 132H184V148L164 132H118C108 132 100 124 100 114V84C100 74 108 66 118 66Z"
            fill={fill}
            style={CUT}
            strokeWidth="8"
          />
        </g>
      );
  }
}

export default function DotArt({ shape, className = "" }: DotArtProps) {
  const id = `dotart-${shape}`;
  return (
    <svg viewBox="0 0 240 160" className={className} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`${id}-bg`} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="0.8" fill="#FFFFFF" fillOpacity="0.16" />
        </pattern>
        <pattern id={`${id}-fg`} width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.25" fill="#FFFFFF" />
        </pattern>
        <radialGradient id={`${id}-fade`} cx="0.5" cy="0.5" r="0.62">
          <stop offset="0.45" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-mask`}>
          <rect width="240" height="160" fill={`url(#${id}-fade)`} />
        </mask>
      </defs>
      <g mask={`url(#${id}-mask)`}>
        <rect width="240" height="160" fill={`url(#${id}-bg)`} />
        <ShapeBody shape={shape} fill={`url(#${id}-fg)`} />
      </g>
    </svg>
  );
}
