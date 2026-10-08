import { generate } from '../exercises/generate';
import type { ExerciseConfig } from '../exercises/types';
import { hashString, mulberry32, shuffle } from '../theory/random';
import { ALL_LESSONS, isUnlocked, itemCount, lessonById, lessonsBefore, levelConfig, MAX_LEVEL, passFor, PathLesson, questionCount, UNITS } from './curriculum';
import type { SessionSpec } from './nav';
import { isDue, itemAcc, ItemStat, Lang, LessonProgress, todayStr } from './store';

const FAST_KINDS = new Set(['pitch', 'interval', 'chord', 'inversion', 'scale', 'degree', 'cadence']);
/** kinds that can be mixed into reviews and tests (no mic / tapping) */
const MIXABLE = new Set([...FAST_KINDS, 'function', 'tonicFind', 'intervalInKey', 'modulation', 'melody', 'progression', 'bass', 'rhythmDictation', 'twoVoice', 'fullDictation']);

type Lessons = Record<string, LessonProgress>;
type Items = Record<string, ItemStat>;

const keyCache = new Map<string, string[]>();
/** Collect the item keys a config can produce (by sampling). */
export function sampleKeys(cfg: ExerciseConfig): string[] {
  const id = JSON.stringify(cfg);
  const hit = keyCache.get(id);
  if (hit) return hit;
  const rng = mulberry32(42);
  const keys = new Set<string>();
  for (let i = 0; i < 24; i++) {
    const q = generate(cfg, { rng, weight: () => 1, lang: 'en', naming: 'letter', fixedRoot: false, tempo: 1, voice: 'low' });
    q.itemKeys.forEach((k) => keys.add(k));
  }
  const res = [...keys];
  keyCache.set(id, res);
  return res;
}

/** Share of a lesson's practised items that are due for review (0..1). */
export function dueShare(cfg: ExerciseConfig, items: Items, now = Date.now()) {
  const keys = sampleKeys(cfg).filter((k) => items[k]?.n);
  if (!keys.length) return 0;
  return keys.filter((k) => isDue(items[k], now)).length / keys.length;
}

const passed = (lessons: Lessons, id: string) => (lessons[id]?.stars ?? 0) > 0;

/** Earlier passed lessons, most in need of review first. */
function reviewPool(before: PathLesson[], lessons: Lessons, items: Items, max: number, sameKind?: string) {
  return before
    // inside ordinary lessons only quick questions (or the lesson's own type) are mixed in
    .filter((l) => !l.checkpoint && MIXABLE.has(l.cfg.kind) && passed(lessons, l.id) && (!sameKind || FAST_KINDS.has(l.cfg.kind) || l.cfg.kind === sameKind))
    .map((l) => ({ l, score: dueShare(l.cfg, items) + (1 - avgAcc(l.cfg, items)) * 0.5 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.l.cfg);
}

function avgAcc(cfg: ExerciseConfig, items: Items) {
  const keys = sampleKeys(cfg).filter((k) => items[k]?.n);
  if (!keys.length) return 1;
  return keys.reduce((a, k) => a + itemAcc(items[k]), 0) / keys.length;
}

export function lessonSpec(lessonId: string, lang: Lang, lessons: Lessons, items: Items): SessionSpec {
  const l = lessonById(lessonId)!;
  const title = lang === 'ru' ? l.ru : l.en;
  const before = lessonsBefore(lessonId) as PathLesson[];
  const replay = passed(lessons, lessonId);
  if (l.checkpoint) {
    const own = l.id === 'n7' ? before : l.unit.lessons;
    const primary = own.filter((x) => !x.checkpoint && MIXABLE.has(x.cfg.kind)).map((x) => x.cfg);
    const earlier = reviewPool(before.filter((x) => x.unit.id !== l.unit.id), lessons, items, 6);
    return {
      mode: 'lesson',
      lessonId,
      title: `${title}: ${lang === 'ru' ? l.unit.ru : l.unit.en}`,
      configs: [...primary, ...earlier],
      primary: primary.length,
      mix: earlier.length ? 0.3 : 0,
      count: questionCount(l),
      pass: passFor(l),
      randomTimbre: true,
    };
  }
  const count = questionCount(l);
  const review = l.unit.optional || count <= 8 ? [] : reviewPool(before, lessons, items, 4, l.cfg.kind);
  // passed lessons replay at the next difficulty level (crown)
  const done = lessons[lessonId]?.level ?? (replay ? 1 : 0);
  const level = replay ? Math.min(MAX_LEVEL, done + 1) : 1;
  return {
    mode: 'lesson',
    lessonId,
    title,
    configs: [levelConfig(l.cfg, level), ...review],
    primary: 1,
    // new material first; once the lesson is known, mix in more review
    mix: review.length ? (replay ? 0.3 : 0.2) : 0,
    count,
    pass: passFor(l),
    // show the explanation again after a failed attempt
    intro: !(lessons[lessonId]?.plays ?? 0) || !(lessons[lessonId]?.stars ?? 0),
    randomTimbre: level >= 2,
    level,
    tempoMul: level >= 5 ? 0.8 : level >= 3 ? 0.9 : 1,
    replays: level >= 5 ? 2 : level >= 4 ? 3 : undefined,
  };
}

export function practiceSpec(cfg: ExerciseConfig, title: string): SessionSpec {
  return { mode: 'practice', title, configs: [cfg], count: null };
}

/** Fast lessons the learner has unlocked, in curriculum order. */
function unlockedFast(lessons: Lessons, unlockAll: boolean) {
  return ALL_LESSONS.filter((l) => !l.checkpoint && FAST_KINDS.has(l.cfg.kind) && isUnlocked(l.id, lessons, unlockAll));
}

export function blitzSpec(lessons: Lessons, lang: Lang, unlockAll = false): SessionSpec {
  const pool = unlockedFast(lessons, unlockAll);
  return { mode: 'blitz', title: lang === 'ru' ? 'Блиц' : 'Blitz', configs: pool.map((l) => l.cfg), count: null, timeLimit: 60 };
}

export function survivalSpec(lessons: Lessons, lang: Lang, unlockAll = false): SessionSpec {
  return { mode: 'survival', title: lang === 'ru' ? 'Выживание' : 'Survival', configs: unlockedFast(lessons, unlockAll).map((l) => l.cfg), count: null, lives: 3, escalate: true };
}

/** Daily: half overdue review, the rest from the current frontier — same order for everyone on the same progress. */
export function dailySpec(lessons: Lessons, items: Items, lang: Lang, unlockAll = false, dailyDoneDate: string | null = null): SessionSpec {
  const seed = hashString('earwise-daily-' + todayStr());
  const rng = mulberry32(seed);
  const open = ALL_LESSONS.filter((l) => !l.checkpoint && MIXABLE.has(l.cfg.kind) && isUnlocked(l.id, lessons, unlockAll));
  const due = open.filter((l) => passed(lessons, l.id) && dueShare(l.cfg, items) > 0);
  const frontier = open.filter((l) => !passed(lessons, l.id)).slice(0, 3);
  const rest = shuffle(rng, open);
  const picked = [...shuffle(rng, due).slice(0, 5), ...frontier, ...rest];
  const cfgs: ExerciseConfig[] = [];
  for (const l of picked) {
    if (cfgs.length >= 10) break;
    if (!cfgs.includes(l.cfg)) cfgs.push(l.cfg);
  }
  const n = cfgs.length;
  for (let i = 0; cfgs.length < 10 && n; i++) cfgs.push(cfgs[i % n]);
  // double XP only on the first run of the day
  const done = dailyDoneDate === todayStr();
  return { mode: 'daily', title: lang === 'ru' ? 'Испытание дня' : 'Daily challenge', configs: shuffle(rng, cfgs), count: 10, seed, xpMult: done ? 1 : 2, randomTimbre: true };
}

/** Review: lessons with the most overdue or weak items. */
export function reviewSpec(lessons: Lessons, items: Items, lang: Lang): SessionSpec | null {
  const played = ALL_LESSONS.filter((l) => !l.checkpoint && MIXABLE.has(l.cfg.kind) && (lessons[l.id]?.plays ?? 0) > 0);
  if (!played.length) return null;
  const scored = played
    .map((l) => ({ l, score: dueShare(l.cfg, items) * 1.5 + (1 - avgAcc(l.cfg, items)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  return { mode: 'review', title: lang === 'ru' ? 'Повторение' : 'Review', configs: scored.map((s) => s.l.cfg), count: 12, randomTimbre: true };
}

/** Lessons that need practice: passed, but many items are overdue. */
export function needsPractice(lessonId: string, lessons: Lessons, items: Items) {
  const l = lessonById(lessonId);
  if (!l || l.checkpoint || !passed(lessons, lessonId)) return false;
  return dueShare(l.cfg, items) > 0.3;
}

const SEQ_PLACEMENT = new Set(['melody', 'progression', 'bass', 'rhythmDictation', 'twoVoice', 'fullDictation']);

/** Placement test: 8 guess-resistant questions per unit in order; 7/8 tests the learner out of that unit. */
export function placementSpec(lang: Lang): SessionSpec {
  // only questions that are hard to guess: 3+ options, or a whole sequence to enter
  const guessProof = (cfg: ExerciseConfig) => {
    const n = itemCount(cfg);
    return SEQ_PLACEMENT.has(cfg.kind) || (cfg.kind !== 'pitch' && n >= 3);
  };
  const blocks = UNITS.filter((u) => !u.optional && u.id !== 'u1')
    .map((u) => ({ unitId: u.id, configs: u.lessons.filter((l) => !l.checkpoint && MIXABLE.has(l.cfg.kind) && guessProof(l.cfg)).map((l) => l.cfg) }))
    .filter((b) => b.configs.length);
  return {
    mode: 'placement',
    title: lang === 'ru' ? 'Входной тест' : 'Placement test',
    configs: blocks[0].configs,
    count: null,
    blocks,
    randomTimbre: false,
    intro: true,
    introText: {
      ru: 'Тест идёт по разделам программы, по 8 вопросов. Раздел засчитывается при 7 верных из 8. Если не знаешь — честно жми «Не знаю», а когда станет совсем незнакомо, нажми «закончить тест»: засчитанное сохранится. Угадывать не нужно — так ты быстрее начнёшь с правильного места.',
      en: 'The test goes unit by unit, 8 questions each; 7 of 8 credits the unit. Tap "Don\'t know" instead of guessing, and finish the test when it gets unfamiliar — credited units are kept.',
    },
  };
}

/** Practise one item intensively inside its natural exercise. */
export function focusSpec(key: string, cfg: ExerciseConfig, title: string): SessionSpec {
  return { mode: 'practice', title, configs: [cfg], count: 12, focus: key };
}
