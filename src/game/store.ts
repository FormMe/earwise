import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Instrument } from '../audio/synth';
import type { NoteNaming } from '../theory/notes';
import { ACHIEVEMENTS, AchievementCtx } from './achievements';

export type Lang = 'ru' | 'en';

export interface Settings {
  lang: Lang;
  naming: NoteNaming;
  instrument: Instrument;
  volume: number;
  fixedRoot: boolean;
  autoNext: boolean;
  sfx: boolean;
  haptics: boolean;
  dailyGoal: number;
  tempo: 'slow' | 'normal' | 'fast';
  voice: 'low' | 'high';
  unlockAll: boolean;
}

export interface ItemStat {
  n: number;
  c: number;
  /** consecutive correct answers */
  s: number;
  /** last seen, epoch ms */
  t: number;
}

export interface LessonProgress {
  stars: number;
  best: number;
  plays: number;
}

export interface SessionResult {
  mode: 'lesson' | 'practice' | 'blitz' | 'survival' | 'daily' | 'review';
  lessonId?: string;
  correct: number;
  total: number;
  xp: number;
  maxCombo: number;
  score?: number;
  kinds: string[];
}

export interface FinishOutcome {
  stars: number;
  prevStars: number;
  newAchievements: string[];
  levelUp: number | null;
  streakExtended: boolean;
  goalReached: boolean;
  newHigh: boolean;
}

interface State {
  settings: Settings;
  onboarded: boolean;
  xp: number;
  days: Record<string, number>;
  streak: { count: number; last: string | null; best: number };
  freezes: number;
  lessons: Record<string, LessonProgress>;
  items: Record<string, ItemStat>;
  achievements: Record<string, string>;
  highs: Record<string, number>;
  totals: { answers: number; correct: number; sessions: number; perfect: number; sung: number; bestCombo: number; kinds: string[] };
  dailyDone: string | null;

  setSettings: (s: Partial<Settings>) => void;
  setOnboarded: () => void;
  recordAnswer: (keys: string[], correct: boolean) => void;
  recordSung: () => void;
  finishSession: (r: SessionResult) => FinishOutcome;
  resetProgress: () => void;
}

export const todayStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

export const daysBetween = (a: string, b: string) => {
  const da = new Date(a + 'T12:00:00');
  const db = new Date(b + 'T12:00:00');
  return Math.round((db.getTime() - da.getTime()) / 86400000);
};

export const xpForLevel = (level: number) => 50 * (level - 1) * level;
export function levelFromXp(xp: number) {
  let l = 1;
  while (xpForLevel(l + 1) <= xp) l++;
  return l;
}

export function starsFor(acc: number) {
  return acc >= 0.9 ? 3 : acc >= 0.75 ? 2 : acc >= 0.6 ? 1 : 0;
}

const defaultLang = (): Lang => {
  try {
    return navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
  } catch {
    return 'ru';
  }
};

const initialSettings = (): Settings => {
  const lang = defaultLang();
  return {
    lang,
    naming: lang === 'ru' ? 'solfege' : 'letter',
    instrument: 'piano',
    volume: 0.8,
    fixedRoot: false,
    autoNext: true,
    sfx: true,
    haptics: true,
    dailyGoal: 50,
    tempo: 'normal',
    voice: 'low',
    unlockAll: false,
  };
};

const initialProgress = () => ({
  onboarded: false,
  xp: 0,
  days: {} as Record<string, number>,
  streak: { count: 0, last: null as string | null, best: 0 },
  freezes: 1,
  lessons: {} as Record<string, LessonProgress>,
  items: {} as Record<string, ItemStat>,
  achievements: {} as Record<string, string>,
  highs: {} as Record<string, number>,
  totals: { answers: 0, correct: 0, sessions: 0, perfect: 0, sung: 0, bestCombo: 0, kinds: [] as string[] },
  dailyDone: null as string | null,
});

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      settings: initialSettings(),
      ...initialProgress(),

      setSettings: (s) => set({ settings: { ...get().settings, ...s } }),
      setOnboarded: () => set({ onboarded: true }),

      recordAnswer: (keys, correct) => {
        const items = { ...get().items };
        const now = Date.now();
        for (const k of keys) {
          const it = items[k] ?? { n: 0, c: 0, s: 0, t: 0 };
          items[k] = { n: it.n + 1, c: it.c + (correct ? 1 : 0), s: correct ? it.s + 1 : 0, t: now };
        }
        const totals = get().totals;
        set({ items, totals: { ...totals, answers: totals.answers + 1, correct: totals.correct + (correct ? 1 : 0) } });
      },

      recordSung: () => set({ totals: { ...get().totals, sung: get().totals.sung + 1 } }),

      finishSession: (r) => {
        const st = get();
        const today = todayStr();
        const prevLevel = levelFromXp(st.xp);
        const xp = st.xp + r.xp;
        const days = { ...st.days, [today]: (st.days[today] ?? 0) + r.xp };
        const goalBefore = (st.days[today] ?? 0) >= st.settings.dailyGoal;
        const goalReached = !goalBefore && days[today] >= st.settings.dailyGoal;

        // streak
        let streak = { ...st.streak };
        let freezes = st.freezes;
        let streakExtended = false;
        if (r.xp > 0 && streak.last !== today) {
          const gap = streak.last ? daysBetween(streak.last, today) : 999;
          if (gap === 1) streak.count += 1;
          else if (gap === 2 && freezes > 0) {
            freezes -= 1;
            streak.count += 1;
          } else streak.count = 1;
          streak.last = today;
          streak.best = Math.max(streak.best, streak.count);
          streakExtended = true;
          // earn a freeze every 7 days of streak, up to 3
          if (streak.count % 7 === 0) freezes = Math.min(3, freezes + 1);
        }

        const acc = r.total ? r.correct / r.total : 0;
        let stars = 0;
        let prevStars = 0;
        const lessons = { ...st.lessons };
        if (r.mode === 'lesson' && r.lessonId) {
          const lp = lessons[r.lessonId] ?? { stars: 0, best: 0, plays: 0 };
          prevStars = lp.stars;
          stars = starsFor(acc);
          lessons[r.lessonId] = { stars: Math.max(lp.stars, stars), best: Math.max(lp.best, acc), plays: lp.plays + 1 };
        }

        const highs = { ...st.highs };
        let newHigh = false;
        if (r.score != null && (r.mode === 'blitz' || r.mode === 'survival')) {
          if ((highs[r.mode] ?? 0) < r.score) {
            highs[r.mode] = r.score;
            newHigh = true;
          }
        }

        const totals = {
          ...st.totals,
          sessions: st.totals.sessions + 1,
          perfect: st.totals.perfect + (r.total >= 5 && r.correct === r.total ? 1 : 0),
          bestCombo: Math.max(st.totals.bestCombo, r.maxCombo),
          kinds: [...new Set([...st.totals.kinds, ...r.kinds])],
        };

        const dailyDone = r.mode === 'daily' ? today : st.dailyDone;
        const next = { xp, days, streak, freezes, lessons, highs, totals, dailyDone };
        set(next);

        // achievements
        const ctx: AchievementCtx = { ...get(), lastSession: r };
        const achievements = { ...get().achievements };
        const newAchievements: string[] = [];
        for (const a of ACHIEVEMENTS) {
          if (!achievements[a.id] && a.check(ctx)) {
            achievements[a.id] = today;
            newAchievements.push(a.id);
          }
        }
        if (newAchievements.length) set({ achievements });

        const newLevel = levelFromXp(xp);
        return {
          stars,
          prevStars,
          newAchievements,
          levelUp: newLevel > prevLevel ? newLevel : null,
          streakExtended,
          goalReached,
          newHigh,
        };
      },

      resetProgress: () => set({ ...initialProgress(), onboarded: true }),
    }),
    {
      name: 'earwise-v1',
      storage: createJSONStorage(() => {
        try {
          localStorage.setItem('__t', '1');
          localStorage.removeItem('__t');
          return localStorage;
        } catch {
          const mem = new Map<string, string>();
          return {
            getItem: (k: string) => mem.get(k) ?? null,
            setItem: (k: string, v: string) => void mem.set(k, v),
            removeItem: (k: string) => void mem.delete(k),
          };
        }
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, settings: { ...current.settings, ...(p.settings ?? {}) }, totals: { ...current.totals, ...(p.totals ?? {}) } };
      },
    },
  ),
);

/** Smoothed accuracy for an item (Laplace). */
export function itemAcc(it?: ItemStat) {
  if (!it) return 0.5;
  return (it.c + 1) / (it.n + 2);
}

/** Weight for adaptive item selection: weak and unseen items come up more often. */
export function itemWeight(items: Record<string, ItemStat>, key: string) {
  const it = items[key];
  if (!it || it.n === 0) return 2.2;
  const acc = itemAcc(it);
  const mastered = it.s >= 6 ? 0.6 : 1;
  return (0.8 + 3 * (1 - acc)) * mastered;
}

export function currentStreak(st: { streak: { count: number; last: string | null }; freezes: number }) {
  if (!st.streak.last) return 0;
  const gap = daysBetween(st.streak.last, todayStr());
  if (gap <= 1) return st.streak.count;
  if (gap === 2 && st.freezes > 0) return st.streak.count;
  return 0;
}
