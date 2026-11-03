interface LogoProps {
  className?: string;
  /** Hides the wordmark, leaving only the mark */
  markOnly?: boolean;
}

/** Wordmark + mark: three layered hills, the same motif as the site illustrations. */
export default function Logo({ className = "", markOnly = false }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden="true" className="shrink-0">
        <defs>
          <clipPath id="ratify-mark-clip">
            <rect x="1" y="1" width="26" height="26" rx="8" />
          </clipPath>
        </defs>
        <g clipPath="url(#ratify-mark-clip)" fill="currentColor">
          <path d="M1 15C6 7.5 11.5 6.5 16 9.5C19.5 11.8 23 11 27 7.5V27H1Z" fillOpacity="0.22" />
          <path d="M1 20C6.5 14.5 12.5 14 17.5 17C21 19 24 18.5 27 16.5V27H1Z" fillOpacity="0.5" />
          <path d="M1 24.5C8 21.5 16 21.5 27 24V27H1Z" />
        </g>
      </svg>
      {!markOnly && <span className="text-[1.3125rem] font-semibold leading-none tracking-[-0.04em]">ratify</span>}
    </span>
  );
}
