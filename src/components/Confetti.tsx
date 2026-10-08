import { useMemo } from 'react';

const COLORS = ['#7c5cff', '#ff5c8a', '#ffb020', '#22c3a6', '#3fa9ff', '#ffd23f'];

export function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.8 + Math.random() * 1.6,
        rot: Math.random() * 360,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 8,
        drift: (Math.random() - 0.5) * 120,
      })),
    [count],
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              width: p.size,
              height: p.size * 0.45,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              '--rot': `${p.rot}deg`,
              '--drift': `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
