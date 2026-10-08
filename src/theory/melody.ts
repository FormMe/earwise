import { Rng, pick, weightedPick } from './random';

export interface MelodyOptions {
  /** allowed semitone offsets from tonic (may include negatives / >12) */
  pool: number[];
  length: number;
  startOnTonic?: boolean;
  maxLeap?: number;
  endOnTonic?: boolean;
}

/** Generates a singable melody as semitone offsets from the tonic. */
export function generateMelody(rng: Rng, o: MelodyOptions): number[] {
  const pool = [...new Set(o.pool)].sort((a, b) => a - b);
  const maxLeap = o.maxLeap ?? 7;
  const out: number[] = [];
  let cur = o.startOnTonic && pool.includes(0) ? 0 : pick(rng, pool.filter((p) => Math.abs(p) <= 7));
  out.push(cur);
  const tonics = pool.filter((p) => p % 12 === 0);
  const nearTonic = (p: number) => tonics.some((t) => Math.abs(t - p) <= maxLeap);
  for (let i = 1; i < o.length; i++) {
    const isLast = i === o.length - 1;
    if (isLast && o.endOnTonic && tonics.length) {
      // always land on the tonic nearest to the current note
      out.push(tonics.reduce((a, b) => (Math.abs(b - cur) < Math.abs(a - cur) ? b : a)));
      break;
    }
    let cands = pool.filter((p) => p !== cur && Math.abs(p - cur) <= maxLeap);
    // one before last: stay within reach of a tonic so the ending is a real step or small leap
    if (o.endOnTonic && i === o.length - 2 && tonics.length) {
      const near = cands.filter((p) => nearTonic(p) && p % 12 !== 0);
      if (near.length) cands = near;
    }
    if (!cands.length) cands = pool.filter((p) => p !== cur);
    if (!cands.length) cands = pool;
    const next = weightedPick(rng, cands, (p) => {
      const d = Math.abs(p - cur);
      // stepwise motion is the most common in real melodies
      return d <= 2 ? 6 : d <= 4 ? 3 : d <= 7 ? 1.5 : 0.6;
    });
    out.push(next);
    cur = next;
  }
  return out;
}
