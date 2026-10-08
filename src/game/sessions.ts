import { generate } from '../exercises/generate';
import type { ExerciseConfig } from '../exercises/types';
import { hashString, mulberry32, shuffle } from '../theory/random';
import { ALL_LESSONS, lessonById } from './curriculum';
import type { SessionSpec } from './nav';
import { itemAcc, ItemStat, Lang, todayStr } from './store';

const FAST_KINDS = new Set(['pitch', 'interval', 'chord', 'inversion', 'scale', 'degree', 'noteName']);

export function lessonSpec(lessonId: string, lang: Lang): SessionSpec {
  const l = lessonById(lessonId)!;
  return { mode: 'lesson', lessonId, title: lang === 'ru' ? l.ru : l.en, configs: [l.cfg], count: l.questions ?? 10 };
}

export function practiceSpec(cfg: ExerciseConfig, title: string): SessionSpec {
  return { mode: 'practice', title, configs: [cfg], count: null };
}

const arcadePool = () => ALL_LESSONS.filter((l) => FAST_KINDS.has(l.cfg.kind) && l.cfg.kind !== 'noteName');

export function blitzSpec(lessons: Record<string, { stars: number }>, lang: Lang): SessionSpec {
  const pool = arcadePool();
  // played lessons + the next couple, so beginners still get a fair game
  const played = pool.filter((l) => (lessons[l.id]?.stars ?? 0) > 0);
  const extra = pool.filter((l) => !played.includes(l)).slice(0, 3);
  const chosen = [...played, ...extra];
  return { mode: 'blitz', title: lang === 'ru' ? 'Блиц' : 'Blitz', configs: chosen.map((l) => l.cfg), count: null, timeLimit: 60 };
}

export function survivalSpec(lang: Lang): SessionSpec {
  return { mode: 'survival', title: lang === 'ru' ? 'Выживание' : 'Survival', configs: arcadePool().map((l) => l.cfg), count: null, lives: 3, escalate: true };
}

export function dailySpec(lang: Lang): SessionSpec {
  const seed = hashString('earwise-daily-' + todayStr());
  const rng = mulberry32(seed);
  const pool = ALL_LESSONS.filter((l) => FAST_KINDS.has(l.cfg.kind) || l.cfg.kind === 'melody' || l.cfg.kind === 'progression').slice(0, 30);
  const picked = shuffle(rng, pool).slice(0, 10);
  return { mode: 'daily', title: lang === 'ru' ? 'Испытание дня' : 'Daily challenge', configs: picked.map((l) => l.cfg), count: 10, seed, xpMult: 2 };
}

/** Pick the lessons whose items the user struggles with most. */
export function reviewSpec(lessons: Record<string, { stars: number }>, items: Record<string, ItemStat>, lang: Lang): SessionSpec | null {
  const played = ALL_LESSONS.filter((l) => (lessons[l.id]?.stars ?? 0) > 0 || (lessons[l.id] as { plays?: number } | undefined)?.plays);
  if (!played.length) return null;
  const scored = played
    .filter((l) => l.cfg.kind !== 'sing' && l.cfg.kind !== 'rhythm')
    .map((l) => {
      const keys = sampleKeys(l.cfg);
      const weak = keys.map((k) => 1 - itemAcc(items[k]));
      const score = weak.length ? weak.reduce((a, b) => a + b, 0) / weak.length : 0;
      return { l, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  if (!scored.length) return null;
  return { mode: 'review', title: lang === 'ru' ? 'Работа над ошибками' : 'Fix mistakes', configs: scored.map((s) => s.l.cfg), count: 10 };
}

/** Collect the item keys a config can produce (by sampling). */
export function sampleKeys(cfg: ExerciseConfig): string[] {
  const rng = mulberry32(42);
  const keys = new Set<string>();
  for (let i = 0; i < 24; i++) {
    const q = generate(cfg, { rng, weight: () => 1, lang: 'en', naming: 'letter', fixedRoot: false, tempo: 1, voice: 'low' });
    q.itemKeys.forEach((k) => keys.add(k));
  }
  return [...keys];
}
