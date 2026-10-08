import type { NoteEvent } from '../audio/engine';
import type { Lang } from '../game/store';
import type { NoteNaming } from '../theory/notes';
import type { Rng } from '../theory/random';

export type Dir = 'up' | 'down' | 'harm';

export type AccompStyle = 'block' | 'ballad' | 'pop' | 'strum' | 'jazz';
export type CadenceType = 'PAC' | 'HC' | 'PC' | 'DC';

export type ExerciseConfig =
  | { kind: 'pitch'; min: number; max: number }
  | { kind: 'interval'; set: number[]; dirs: Dir[] }
  | { kind: 'chord'; set: string[]; inversions?: boolean; open?: boolean }
  | { kind: 'inversion'; chords: string[]; invs: number[] }
  /** vamp: hear the mode over a drone + melody instead of a plain scale */
  | { kind: 'scale'; set: string[]; dir?: 'up' | 'down' | 'both'; vamp?: boolean }
  /** holdKey: same key for 5 questions; context 'tonic' = only the tonic note instead of a cadence. Low notes as '5,' */
  | { kind: 'degree'; set: string[]; minor?: boolean; wide?: boolean; holdKey?: boolean; context?: 'cadence' | 'tonic' }
  /** rhythmic: real note values (bars) instead of even notes */
  | { kind: 'melody'; set: string[]; length: number; minor?: boolean; maxLeap?: number; startOnTonic?: boolean; endOnTonic?: boolean; rhythmic?: boolean }
  /** free: may start on any chord, repeats allowed, nothing pre-filled. style: accompaniment pattern, 1 chord per bar */
  | { kind: 'progression'; set: string[]; length: number; minor?: boolean; free?: boolean; inversions?: boolean; style?: AccompStyle }
  | { kind: 'bass'; set: string[]; length: number; minor?: boolean; inversions?: boolean }
  | { kind: 'cadence'; set: CadenceType[] }
  | { kind: 'noteName'; set: number[]; reference: boolean }
  | { kind: 'sing'; mode: 'note' | 'degree' | 'interval' | 'echo'; set?: string[]; length?: number; minor?: boolean }
  | { kind: 'rhythm'; level: number; bars?: number }
  | { kind: 'rhythmDictation'; level: number; bars?: number };

export type ExerciseKind = ExerciseConfig['kind'];

export interface Choice {
  id: string;
  label: string;
  /** render a rhythm cell glyph instead of text */
  glyph?: string;
  sub?: string;
  audio?: NoteEvent[];
}

export type InputMode = 'choice' | 'sequence' | 'keys' | 'sing' | 'rhythm';

export interface Question {
  kind: ExerciseKind;
  prompt: string;
  stimulus: NoteEvent[];
  alt?: { label: string; events: NoteEvent[] }[];
  input: InputMode;
  choices: Choice[];
  answer: string[];
  /** stats keys: one for choice questions, one per (non-given) element for sequences */
  itemKeys: string[];
  given?: number;
  afterAnswer?: NoteEvent[];
  /** for sequences: how a sequence of choice ids sounds (to compare "yours vs correct") */
  answerAudio?: NoteEvent[];
  renderSequence?: (ids: string[]) => NoteEvent[];
  explain?: string;
  answerLabel: string;
  sing?: { targets: number[]; target: string; sequential?: boolean };
  rhythm?: { pattern: number[]; bpm: number };
  keysRange?: [number, number];
}

export interface GenCtx {
  rng: Rng;
  weight: (key: string) => number;
  lang: Lang;
  naming: NoteNaming;
  fixedRoot: boolean;
  tempo: number;
  voice: 'low' | 'high';
  prevKey?: string;
  /** a key held across several questions (for holdKey exercises) */
  keyTonic?: number;
  /** true on the first question in a held key (play the full cadence) */
  keyIsNew?: boolean;
}
