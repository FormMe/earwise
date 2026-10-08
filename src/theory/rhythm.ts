import { Rng, weightedPick } from './random';

/** Durations are in sixteenth notes. A negative value is a rest. */
export type RhythmCell = number[];

const CELLS: { cell: RhythmCell; level: number; w: number }[] = [
  { cell: [4], level: 1, w: 5 },
  { cell: [8], level: 1, w: 2 },
  { cell: [2, 2], level: 1, w: 4 },
  { cell: [-4], level: 2, w: 1.5 },
  { cell: [6, 2], level: 2, w: 2 },
  { cell: [-2, 2], level: 2, w: 2 },
  { cell: [12], level: 2, w: 0.6 },
  { cell: [1, 1, 1, 1], level: 3, w: 3 },
  { cell: [2, 1, 1], level: 3, w: 3 },
  { cell: [1, 1, 2], level: 3, w: 3 },
  { cell: [3, 1], level: 3, w: 2.5 },
  { cell: [2, 4, 2], level: 4, w: 3 },
  { cell: [1, 2, 1], level: 4, w: 3 },
  { cell: [-1, 1, -1, 1], level: 4, w: 1.5 },
  { cell: [3, 3, 2], level: 4, w: 2.5 },
];

export function generateRhythm(rng: Rng, level: number, bars = 1): number[] {
  const total = 16 * bars;
  const out: number[] = [];
  let used = 0;
  const avail = CELLS.filter((c) => c.level <= level);
  let guard = 0;
  while (used < total && guard++ < 200) {
    const room = total - used;
    // cells must not cross a half-bar boundary unless they are at its start (keeps patterns readable)
    const fits = avail.filter((c) => sum(c.cell) <= room && (used % 8 === 0 || (used % 8) + sum(c.cell) <= 8 || sum(c.cell) <= 4));
    if (!fits.length) {
      out.push(room);
      used = total;
      break;
    }
    const c = weightedPick(rng, fits, (x) => x.w * (x.level === level ? 1.6 : 1));
    out.push(...c.cell);
    used += sum(c.cell);
  }
  // first beat should be audible
  if (out[0] < 0) out[0] = -out[0];
  // need at least 3 onsets to be interesting
  if (onsets(out).length < 3) return generateRhythm(rng, level, bars);
  return out;
}

const sum = (a: number[]) => a.reduce((x, y) => x + Math.abs(y), 0);

/** Returns onset positions in sixteenth notes. */
export function onsets(pattern: number[]): number[] {
  const res: number[] = [];
  let t = 0;
  for (const d of pattern) {
    if (d > 0) res.push(t);
    t += Math.abs(d);
  }
  return res;
}

/** Score taps against expected onsets (both in seconds, relative). Returns 0..1 accuracy and per-onset hit flags. */
export function scoreTaps(expected: number[], taps: number[], tolerance: number) {
  const used = new Set<number>();
  const hits = expected.map((e) => {
    let best = -1;
    let bestD = Infinity;
    taps.forEach((t, i) => {
      if (used.has(i)) return;
      const d = Math.abs(t - e);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best >= 0 && bestD <= tolerance) {
      used.add(best);
      return true;
    }
    return false;
  });
  const extra = taps.length - used.size;
  const hitCount = hits.filter(Boolean).length;
  const acc = Math.max(0, (hitCount - extra * 0.5) / expected.length);
  return { hits, extra, acc };
}
