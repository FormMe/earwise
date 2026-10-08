import { pc } from './notes';
import { Rng, weightedPick } from './random';

export interface RomanDef {
  id: string;
  /** semitones of the root above the tonic */
  root: number;
  /** chord intervals above its root */
  quality: number[];
  minorKey?: boolean;
}

const MAJ = [0, 4, 7];
const MIN = [0, 3, 7];
const DIM = [0, 3, 6];
const DOM7 = [0, 4, 7, 10];

export const ROMANS: RomanDef[] = [
  // major key
  { id: 'I', root: 0, quality: MAJ },
  { id: 'ii', root: 2, quality: MIN },
  { id: 'iii', root: 4, quality: MIN },
  { id: 'IV', root: 5, quality: MAJ },
  { id: 'V', root: 7, quality: MAJ },
  { id: 'V7', root: 7, quality: DOM7 },
  { id: 'vi', root: 9, quality: MIN },
  { id: 'vii°', root: 11, quality: DIM },
  // borrowed / chromatic in major
  { id: '♭VII', root: 10, quality: MAJ },
  { id: '♭VI', root: 8, quality: MAJ },
  { id: '♭III', root: 3, quality: MAJ },
  { id: 'iv', root: 5, quality: MIN },
  { id: 'II', root: 2, quality: MAJ },
  // minor key
  { id: 'i', root: 0, quality: MIN, minorKey: true },
  { id: 'ii°', root: 2, quality: DIM, minorKey: true },
  { id: 'III', root: 3, quality: MAJ, minorKey: true },
  { id: 'v', root: 7, quality: MIN, minorKey: true },
  { id: 'VI', root: 8, quality: MAJ, minorKey: true },
  { id: 'VII', root: 10, quality: MAJ, minorKey: true },
];

export const romanById = (id: string) => {
  const r = ROMANS.find((x) => x.id === id);
  if (!r) throw new Error('Unknown roman ' + id);
  return r;
};

/** Functional "pull": how natural is a move from a → b. Unlisted moves get weight 1. */
const PULL: Record<string, Record<string, number>> = {
  I: { IV: 4, V: 4, vi: 4, ii: 2, V7: 3 },
  ii: { V: 6, V7: 6, 'vii°': 2, IV: 1.5 },
  iii: { vi: 5, IV: 4 },
  IV: { V: 5, I: 4, V7: 4, ii: 2, vi: 2, iv: 2 },
  V: { I: 7, vi: 4, IV: 2 },
  V7: { I: 8, vi: 3 },
  vi: { ii: 4, IV: 5, V: 3, iii: 1.5 },
  'vii°': { I: 8 },
  '♭VII': { I: 5, IV: 3 },
  '♭VI': { '♭VII': 5, V: 3 },
  i: { iv: 4, V: 4, VI: 4, VII: 3, 'ii°': 2, III: 2 },
  iv: { V: 5, i: 4, VII: 3 },
  VI: { VII: 5, iv: 3, III: 2 },
  VII: { III: 5, i: 4 },
  III: { VI: 4, iv: 3 },
  'ii°': { V: 6 },
  v: { VI: 4, i: 3 },
};

export function generateProgression(rng: Rng, pool: string[], length: number, minor = false): string[] {
  const tonic = minor ? 'i' : 'I';
  const seq = [tonic];
  while (seq.length < length) {
    const prev = seq[seq.length - 1];
    const candidates = pool.filter((c) => c !== prev);
    const isLast = seq.length === length - 1;
    const next = weightedPick(rng, candidates, (c) => {
      let w = PULL[prev]?.[c] ?? 1;
      if (c === tonic && !isLast) w *= 0.35; // don't come home too early
      if (isLast && (c === 'V' || c === 'V7' || c === tonic)) w *= 1.5;
      return w;
    });
    seq.push(next);
  }
  return seq;
}

/** Voice a chord close to the previous voicing (smooth voice leading). Returns midi notes (bass first). */
export function voiceChord(tonicMidi: number, roman: RomanDef, prevUpper?: number[]): number[] {
  const rootPc = pc(tonicMidi + roman.root);
  const pcs = roman.quality.map((q) => pc(rootPc + q));
  // Upper voices live in G3..F5 area
  const LO = 55;
  const HI = 77;
  const candidates: number[][] = [];
  for (let base = LO; base <= HI - 7; base++) {
    if (!pcs.includes(pc(base))) continue;
    // build a closed voicing starting at base containing each pc once
    const v: number[] = [base];
    const remaining = pcs.filter((p) => p !== pc(base));
    let cur = base;
    while (remaining.length) {
      cur++;
      const idx = remaining.indexOf(pc(cur));
      if (idx >= 0) {
        v.push(cur);
        remaining.splice(idx, 1);
      }
    }
    if (v[v.length - 1] <= HI) candidates.push(v);
  }
  let best = candidates[0];
  if (prevUpper && prevUpper.length) {
    let bestCost = Infinity;
    for (const c of candidates) {
      const cost = voiceDistance(prevUpper, c);
      if (cost < bestCost) {
        bestCost = cost;
        best = c;
      }
    }
  } else {
    // prefer voicings centered around E4
    best = candidates.reduce((a, b) => (Math.abs(avg(a) - 66) < Math.abs(avg(b) - 66) ? a : b));
  }
  let bass = 36 + pc(rootPc - 36);
  if (bass < 40) bass += 12;
  return [bass, ...best];
}

const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

function voiceDistance(a: number[], b: number[]) {
  // compare sorted voices; tolerate different sizes by comparing against nearest
  let cost = 0;
  for (const n of b) cost += Math.min(...a.map((m) => Math.abs(m - n)));
  for (const n of a) cost += Math.min(...b.map((m) => Math.abs(m - n)));
  return cost;
}

export function voiceProgression(tonicMidi: number, romans: string[]): number[][] {
  const out: number[][] = [];
  let prev: number[] | undefined;
  for (const id of romans) {
    const v = voiceChord(tonicMidi, romanById(id), prev);
    out.push(v);
    prev = v.slice(1);
  }
  return out;
}

export function cadence(tonicMidi: number, minor = false): number[][] {
  return voiceProgression(tonicMidi, minor ? ['i', 'iv', 'V', 'i'] : ['I', 'IV', 'V', 'I']);
}
