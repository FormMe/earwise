import type { NoteEvent } from '../audio/engine';
import type { Lang } from '../game/store';
import type { NoteNaming } from '../theory/notes';
import type { Rng } from '../theory/random';

export type Dir = 'up' | 'down' | 'harm';

export type ExerciseConfig =
  | { kind: 'pitch'; min: number; max: number }
  | { kind: 'interval'; set: number[]; dirs: Dir[] }
  | { kind: 'chord'; set: string[]; inversions?: boolean }
  | { kind: 'inversion'; chords: string[]; invs: number[] }
  | { kind: 'scale'; set: string[]; dir?: 'up' | 'down' | 'both' }
  | { kind: 'degree'; set: string[]; minor?: boolean; wide?: boolean }
  | { kind: 'melody'; set: string[]; length: number; minor?: boolean; maxLeap?: number; startOnTonic?: boolean }
  | { kind: 'progression'; set: string[]; length: number; minor?: boolean }
  | { kind: 'noteName'; set: number[]; reference: boolean }
  | { kind: 'sing'; mode: 'note' | 'degree' | 'interval'; set?: string[] }
  | { kind: 'rhythm'; level: number; bars?: number };

export type ExerciseKind = ExerciseConfig['kind'];

export interface Choice {
  id: string;
  label: string;
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
  explain?: string;
  answerLabel: string;
  sing?: { targets: number[]; target: string };
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
}
