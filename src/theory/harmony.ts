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
  // sevenths / secondary dominants
  { id: 'Imaj7', root: 0, quality: [0, 4, 7, 11] },
  { id: 'ii7', root: 2, quality: [0, 3, 7, 10] },
  { id: 'IVmaj7', root: 5, quality: [0, 4, 7, 11] },
  { id: 'vi7', root: 9, quality: [0, 3, 7, 10] },
  { id: 'I7', root: 0, quality: [0, 4, 7, 10] },
  { id: 'III7', root: 4, quality: [0, 4, 7, 10] },
  { id: 'VI7', root: 9, quality: [0, 4, 7, 10] },
  // minor key
  { id: 'iiø7', root: 2, quality: [0, 3, 6, 10], minorKey: true },
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
  V: { I: 7, i: 7, vi: 4, VI: 4, IV: 1 },
  V7: { I: 8, i: 8, Imaj7: 8, vi: 3, VI: 3, vi7: 3 },
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
  'iiø7': { V7: 8, V: 6 },
  Imaj7: { ii7: 4, vi7: 4, IVmaj7: 4, VI7: 3 },
  ii7: { V7: 9, V: 6 },
  IVmaj7: { V7: 3, ii7: 2, Imaj7: 3 },
  vi7: { ii7: 6, IVmaj7: 3 },
  I7: { IV: 8, IVmaj7: 6 },
  III7: { vi: 8, vi7: 7 },
  VI7: { ii: 7, ii7: 7 },
  II: { V: 7, V7: 7 },
  v: { VI: 4, i: 3 },
};

export function generateProgression(rng: Rng, pool: string[], length: number, minor = false, free = false): string[] {
  const base = minor ? 'i' : 'I';
  // jazz pools use Imaj7 / i7 etc. as their tonic
  const tonic = pool.includes(base) ? base : (pool.find((r) => new RegExp(`^${base}(maj7|7|m7)?$`).test(r)) ?? pool[0]);
  // free progressions may start anywhere (like a loop entering mid-song) and repeat chords
  const first = free && rng() < 0.45 ? weightedPick(rng, pool, (c) => (c === tonic ? 0 : 1)) : tonic;
  const seq = [first];
  while (seq.length < length) {
    const prev = seq[seq.length - 1];
    const candidates = free && rng() < 0.12 ? pool : pool.filter((c) => c !== prev);
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

/**
 * Voice a chord close to the previous voicing (smooth voice leading, no parallel 5ths/8ves).
 * `prev` is the previous full voicing (bass first). Returns midi notes, bass first.
 * `topPc` asks for a given pitch class in the soprano (e.g. the tonic at a cadence).
 */
export function voiceChord(tonicMidi: number, roman: RomanDef, prev?: number[], inversion = 0, topPc?: number): number[] {
  const rootPc = pc(tonicMidi + roman.root);
  const pcs = roman.quality.map((q) => pc(rootPc + q));
  const bassPc = pc(rootPc + roman.quality[Math.min(inversion, roman.quality.length - 1)]);
  let bass = 36 + pc(bassPc - 36);
  if (bass < 40) bass += 12;
  // Upper voices live in G3..F5 area
  const LO = 55;
  const HI = 77;
  let candidates: number[][] = [];
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
  if (topPc != null) {
    const withTop = candidates.filter((c) => pc(c[c.length - 1]) === pc(topPc));
    if (withTop.length) candidates = withTop;
  }
  let best = candidates[0];
  const prevUpper = prev?.slice(1);
  if (prev && prevUpper && prevUpper.length) {
    let bestCost = Infinity;
    for (const c of candidates) {
      const cost = voiceDistance(prevUpper, c) + parallelPenalty(prev, [bass, ...c]);
      if (cost < bestCost) {
        bestCost = cost;
        best = c;
      }
    }
  } else {
    // prefer voicings centered around E4
    best = candidates.reduce((a, b) => (Math.abs(avg(a) - 66) < Math.abs(avg(b) - 66) ? a : b));
  }
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

/** Heavy cost for parallel fifths/octaves between any two voices (classical voice-leading rule). */
function parallelPenalty(a: number[], b: number[]) {
  if (a.length !== b.length) return 0;
  let pen = 0;
  for (let i = 0; i < a.length; i++)
    for (let j = i + 1; j < a.length; j++) {
      const i1 = (((a[j] - a[i]) % 12) + 12) % 12;
      const i2 = (((b[j] - b[i]) % 12) + 12) % 12;
      const moved = a[i] !== b[i] && Math.sign(b[i] - a[i]) === Math.sign(b[j] - a[j]);
      if (moved && i1 === i2 && (i1 === 7 || i1 === 0)) pen += 40;
    }
  return pen;
}

export function voiceProgression(tonicMidi: number, romans: string[], inversions?: number[], opts: { start?: number[]; endTopPc?: number } = {}): number[][] {
  const out: number[][] = [];
  let prev: number[] | undefined = opts.start;
  for (const [i, id] of romans.entries()) {
    const top = i === romans.length - 1 ? opts.endTopPc : undefined;
    const v = voiceChord(tonicMidi, romanById(id), prev, inversions?.[i] ?? 0, top);
    out.push(v);
    prev = v;
  }
  return out;
}

export function cadence(tonicMidi: number, minor = false): number[][] {
  return voiceProgression(tonicMidi, minor ? ['i', 'iv', 'V', 'i'] : ['I', 'IV', 'V', 'I'], undefined, { endTopPc: tonicMidi });
}
