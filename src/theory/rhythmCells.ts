import { Rng, weightedPick } from './random';

/** One-beat rhythmic cells (a beat = 4 sixteenths). Negative = rest. */
export interface BeatCell {
  id: string;
  durs: number[];
  level: number;
  w: number;
  ru: string;
  en: string;
}

export const BEAT_CELLS: BeatCell[] = [
  { id: 'q', durs: [4], level: 1, w: 5, ru: 'Четверть', en: 'Quarter' },
  { id: 'ee', durs: [2, 2], level: 1, w: 5, ru: 'Две восьмые', en: 'Two eighths' },
  { id: 'r', durs: [-4], level: 1, w: 1.5, ru: 'Пауза', en: 'Rest' },
  { id: 're', durs: [-2, 2], level: 2, w: 2.5, ru: 'Пауза + восьмая', en: 'Rest + eighth' },
  { id: 'ss', durs: [1, 1, 1, 1], level: 3, w: 3, ru: 'Четыре шестнадцатых', en: 'Four sixteenths' },
  { id: 'ess', durs: [2, 1, 1], level: 3, w: 3, ru: 'Восьмая + две 16-х', en: 'Eighth + two 16ths' },
  { id: 'sse', durs: [1, 1, 2], level: 3, w: 3, ru: 'Две 16-х + восьмая', en: 'Two 16ths + eighth' },
  { id: 'de', durs: [3, 1], level: 3, w: 2.5, ru: 'Восьмая с точкой + 16-я', en: 'Dotted eighth + 16th' },
  { id: 'ses', durs: [1, 2, 1], level: 4, w: 2.5, ru: 'Синкопа 16-8-16', en: 'Syncopation 16-8-16' },
  { id: 'tri', durs: [4 / 3, 4 / 3, 4 / 3], level: 4, w: 3, ru: 'Триоль', en: 'Triplet' },
];

export const cellById = (id: string) => BEAT_CELLS.find((c) => c.id === id)!;

export function cellsForLevel(level: number) {
  return BEAT_CELLS.filter((c) => c.level <= level);
}

/** A rhythm as one cell per beat. First beat always sounds. */
export function generateBeatRhythm(rng: Rng, level: number, beats: number): string[] {
  const pool = cellsForLevel(level);
  const out: string[] = [];
  for (let i = 0; i < beats; i++) {
    const avail = i === 0 ? pool.filter((c) => c.durs[0] > 0) : pool;
    const c = weightedPick(rng, avail, (x) => x.w * (x.level === level ? 1.7 : 1) * (out[out.length - 1] === x.id ? 0.6 : 1));
    out.push(c.id);
  }
  // ending on a long note sounds like a phrase ending
  if (beats >= 4 && rng() < 0.6) out[beats - 1] = 'q';
  return out;
}

/** Flatten cells into a duration list (sixteenths). */
export const cellsToDurations = (ids: string[]) => ids.flatMap((id) => cellById(id).durs);
