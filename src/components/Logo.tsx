/** EarWise mark: an eighth note whose flag curls into an ear. Keep in sync with public/icon.svg. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden className="logo">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d4bff" />
          <stop offset="0.55" stopColor="#ff4f8b" />
          <stop offset="1" stopColor="#ffb020" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="30" fill="url(#lg)" />
      <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="9">
        <path d="M62 94V42c0-14 13-21 25-17 13 4 17 19 11 29-5 9-13 11-14 20-1 6 3 9 3 9" />
        <path d="M74 59c-1-8 11-10 12-2" strokeWidth="7" />
      </g>
      <ellipse cx="49" cy="94" rx="16" ry="12" fill="#fff" transform="rotate(-24 49 94)" />
    </svg>
  );
}
