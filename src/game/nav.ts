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
