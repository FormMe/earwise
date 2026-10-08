import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Instrument } from '../audio/synth';
import type { NoteNaming } from '../theory/notes';
import { ACHIEVEMENTS, AchievementCtx } from './achievements';
import { lessonById, lessonsBefore, UNITS } from './curriculum';

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
  /** Leitner box 0..5 (spaced repetition) */
  b?: number;
  /** next review due, epoch ms */
  due?: number;
}

/** Review intervals per Leitner box, in days. */
export const BOX_DAYS = [0, 1, 3, 7, 16, 35];
const DAY = 86400000;

export interface LessonProgress {
  /** highest difficulty level (crown) completed, 1..5 */
  level?: number;
  stars: number;
  best: number;
  plays: number;
}

export interface SessionResult {
  mode: 'lesson' | 'practice' | 'blitz' | 'survival' | 'daily' | 'review' | 'placement';
  lessonId?: string;
  correct: number;
  total: number;
  xp: number;
  maxCombo: number;
  score?: number;
  kinds: string[];
  pass?: number;
  level?: number;
  /** placement test: units the learner tested out of */
  placedUnits?: string[];
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
  /** returns how many items just became mastered */
  recordAnswer: (keys: string[], correct: boolean) => number;
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

/** Pass = 80%: below that the learner hasn't shown the skill (2-option lessons are guessable at 60%). */
export const PASS = 0.8;
export function starsFor(acc: number, pass = PASS) {
  return acc >= 0.97 ? 3 : acc >= Math.min(0.9, pass + 0.08) ? 2 : acc >= pass ? 1 : 0;
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
        let newlyMastered = 0;
        const items = { ...get().items };
        const now = Date.now();
        for (const k of keys) {
          const it = items[k] ?? { n: 0, c: 0, s: 0, t: 0 };
          const prevBox = it.b ?? 0;
          // promote at most once per due period, so drilling the same day doesn't fake long-term memory
          const isDue = !it.due || it.due <= now;
          // a slip drops two boxes, not all the way down
          const b = correct ? (isDue ? Math.min(5, prevBox + 1) : prevBox) : Math.max(0, prevBox - 2);
          const due = correct ? (isDue ? now + BOX_DAYS[b] * DAY : it.due) : now + 10 * 60000;
          items[k] = { n: it.n + 1, c: it.c + (correct ? 1 : 0), s: correct ? it.s + 1 : 0, t: now, b, due };
          if (b >= 3 && prevBox < 3) newlyMastered++;
        }
        const totals = get().totals;
        set({ items, totals: { ...totals, answers: totals.answers + 1, correct: totals.correct + (correct ? 1 : 0) } });
        return newlyMastered;
      },

      recordSung: () => set({ totals: { ...get().totals, sung: get().totals.sung + 1 } }),

      finishSession: (r) => {
        const st = get();
        const today = todayStr();
        const prevLevel = levelFromXp(st.xp);
        const xp = st.xp + r.xp;
        const allDays = { ...st.days, [today]: (st.days[today] ?? 0) + r.xp };
        // keep about a year of history so storage doesn't grow forever
        const days = Object.fromEntries(Object.entries(allDays).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-400));
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
          stars = starsFor(acc, r.pass);
          const lvl = stars > 0 ? Math.max(lp.level ?? 0, r.level ?? 1) : lp.level;
          lessons[r.lessonId] = { stars: Math.max(lp.stars, stars), best: Math.max(lp.best, acc), plays: lp.plays + 1, level: lvl };
          // passing a checkpoint opens everything before it (jumping ahead for experienced musicians)
          if (stars > 0 && lessonById(r.lessonId)?.checkpoint)
            for (const l of lessonsBefore(r.lessonId)) if (!(lessons[l.id]?.stars > 0)) lessons[l.id] = { stars: 1, best: lessons[l.id]?.best ?? 0, plays: lessons[l.id]?.plays ?? 0 };
        }

        // placement: every lesson of a tested-out unit counts as passed
        for (const uid of r.placedUnits ?? [])
          for (const l of UNITS.find((u) => u.id === uid)?.lessons ?? [])
            if (!(lessons[l.id]?.stars > 0)) lessons[l.id] = { stars: 1, best: 0, plays: 0, level: 1 };

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
      // v2: new curriculum with different lesson ids — lesson stars are reset, everything else is kept
      version: 2,
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2) p.lessons = {};
        return p as unknown as State;
      },
      storage: createJSONStorage(() => {
        try {
          localStorage.setItem('__t', '1');
          localStorage.removeItem('__t');
          // never let a full quota (or private mode) throw inside a state update
          return {
            getItem: (k: string) => {
              try {
                return localStorage.getItem(k);
              } catch {
                return null;
              }
            },
            setItem: (k: string, v: string) => {
              try {
                localStorage.setItem(k, v);
              } catch {
                /* quota exceeded: keep running from memory; cloud sync still saves */
              }
            },
            removeItem: (k: string) => {
              try {
                localStorage.removeItem(k);
              } catch {
                /* ignore */
              }
            },
          };
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
export function itemWeight(items: Record<string, ItemStat>, key: string, now = Date.now()) {
  const it = items[key];
  if (!it || it.n === 0) return 2.2;
  const acc = itemAcc(it);
  const box = it.b ?? 0;
  // overdue items come up more, well-learned (high box, not due) less
  const overdue = it.due != null && it.due <= now ? 1.6 : box >= 3 ? 0.55 : 1;
  return (0.8 + 3 * (1 - acc)) * overdue;
}

export const isDue = (it: ItemStat | undefined, now = Date.now()) => !!it && it.n > 0 && (it.due ?? 0) <= now;
export const isMastered = (it: ItemStat | undefined) => !!it && (it.b ?? 0) >= 3;

export function currentStreak(st: { streak: { count: number; last: string | null }; freezes: number }) {
  if (!st.streak.last) return 0;
  const gap = daysBetween(st.streak.last, todayStr());
  if (gap <= 1) return st.streak.count;
  if (gap === 2 && st.freezes > 0) return st.streak.count;
  return 0;
}
