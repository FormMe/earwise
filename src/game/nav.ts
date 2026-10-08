import { create } from 'zustand';
import type { ExerciseConfig } from '../exercises/types';
import type { SessionResult } from './store';

export type Tab = 'path' | 'practice' | 'arcade' | 'stats' | 'settings';

export interface SessionSpec {
  mode: SessionResult['mode'];
  title: string;
  lessonId?: string;
  configs: ExerciseConfig[];
  /** number of questions; null = endless */
  count: number | null;
  timeLimit?: number;
  lives?: number;
  seed?: number;
  xpMult?: number;
  /** survival: configs are ordered by difficulty and unlocked progressively */
  escalate?: boolean;
  /** configs[0..primary-1] are the lesson's own; the rest are review material mixed in at `mix` rate */
  primary?: number;
  mix?: number;
  /** accuracy needed to pass */
  pass?: number;
  /** show the intro card before the first question */
  intro?: boolean;
  /** play each question on a random instrument */
  randomTimbre?: boolean;
}

type Screen = { name: 'tabs' } | { name: 'session'; spec: SessionSpec; key: number } | { name: 'reference' };

interface Nav {
  tab: Tab;
  screen: Screen;
  setTab: (t: Tab) => void;
  startSession: (spec: SessionSpec) => void;
  open: (s: Screen) => void;
  back: () => void;
}

export const useNav = create<Nav>((set) => ({
  tab: 'path',
  screen: { name: 'tabs' },
  setTab: (tab) => set({ tab, screen: { name: 'tabs' } }),
  startSession: (spec) => set({ screen: { name: 'session', spec, key: Date.now() } }),
  open: (screen) => set({ screen }),
  back: () => set({ screen: { name: 'tabs' } }),
}));
