export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden className="logo">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c5cff" />
          <stop offset="0.55" stopColor="#ff5c8a" />
          <stop offset="1" stopColor="#ffb020" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="30" fill="url(#lg)" />
      <path d="M44 86a22 22 0 1 1 40-12c0 10-8 13-12 18-3 4-3 10-10 10" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
      <path d="M58 72a8 8 0 1 1 12-6" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <path d="M96 40c6 6 9 14 9 22M104 30c9 9 13 20 13 32" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
