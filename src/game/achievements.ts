import type { ItemStat, LessonProgress, SessionResult } from './store';
import { UNITS } from './curriculum';

export interface AchievementCtx {
  /** the session that just ended was a passed lesson */
  passedNow?: boolean;
  xp: number;
  streak: { count: number; best: number };
  lessons: Record<string, LessonProgress>;
  items: Record<string, ItemStat>;
  totals: { answers: number; correct: number; sessions: number; perfect: number; sung: number; bestCombo: number; kinds: string[] };
  highs: Record<string, number>;
  lastSession: SessionResult;
}

export interface Achievement {
  id: string;
  icon: string;
  ru: [string, string];
  en: [string, string];
  check: (c: AchievementCtx) => boolean;
}

const unitDone = (c: AchievementCtx, unitId: string) => {
  const u = UNITS.find((x) => x.id === unitId);
  return !!u && u.lessons.every((l) => (c.lessons[l.id]?.stars ?? 0) > 0);
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', icon: '🎧', ru: ['Первый звук', 'Пройди первый урок'], en: ['First sound', 'Pass your first lesson'], check: (c) => !!c.passedNow },
  { id: 'perfect', icon: '💎', ru: ['Без ошибок', 'Пройди урок на 100%'], en: ['Flawless', 'Finish a lesson with 100%'], check: (c) => c.totals.perfect >= 1 },
  { id: 'perfect10', icon: '👑', ru: ['Перфекционист', '10 идеальных занятий'], en: ['Perfectionist', '10 perfect sessions'], check: (c) => c.totals.perfect >= 10 },
  { id: 'combo10', icon: '🔥', ru: ['В ударе', 'Серия из 10 верных ответов'], en: ['On fire', '10 correct in a row'], check: (c) => c.totals.bestCombo >= 10 },
  { id: 'combo30', icon: '☄️', ru: ['Неудержимый', 'Серия из 30 верных ответов'], en: ['Unstoppable', '30 correct in a row'], check: (c) => c.totals.bestCombo >= 30 },
  { id: 'streak3', icon: '📅', ru: ['Привычка', '3 дня подряд'], en: ['Habit', '3-day streak'], check: (c) => c.streak.best >= 3 },
  { id: 'streak7', icon: '🗓️', ru: ['Неделя слуха', '7 дней подряд'], en: ['Week of ears', '7-day streak'], check: (c) => c.streak.best >= 7 },
  { id: 'streak30', icon: '🏅', ru: ['Месяц практики', '30 дней подряд'], en: ['Month of practice', '30-day streak'], check: (c) => c.streak.best >= 30 },
  { id: 'answers100', icon: '💯', ru: ['Сотня', '100 верных ответов'], en: ['Century', '100 correct answers'], check: (c) => c.totals.correct >= 100 },
  { id: 'answers1000', icon: '🎼', ru: ['Тысяча', '1000 верных ответов'], en: ['Thousand', '1000 correct answers'], check: (c) => c.totals.correct >= 1000 },
  { id: 'xp1000', icon: '⚡', ru: ['Тысяча XP', 'Набери 1000 опыта'], en: ['1000 XP', 'Earn 1000 XP'], check: (c) => c.xp >= 1000 },
  { id: 'xp10000', icon: '🌟', ru: ['Легенда', 'Набери 10 000 опыта'], en: ['Legend', 'Earn 10,000 XP'], check: (c) => c.xp >= 10000 },
  { id: 'singer', icon: '🎤', ru: ['Голос', 'Спой 10 нот точно'], en: ['Voice', 'Sing 10 notes in tune'], check: (c) => c.totals.sung >= 10 },
  { id: 'intervals', icon: '📐', ru: ['Интервальщик', 'Пройди все уроки по интервалам'], en: ['Interval pro', 'Finish all interval units'], check: (c) => unitDone(c, 'u6') && unitDone(c, 'u9') },
  { id: 'harmony', icon: '🎹', ru: ['Гармонист', 'Пройди раздел «Аккорды в песнях»'], en: ['Harmonist', 'Finish “Chords in songs”'], check: (c) => unitDone(c, 'u10') },
  { id: 'dictation', icon: '✍️', ru: ['Стенограф', 'Пройди мелодический диктант'], en: ['Transcriber', 'Finish melodic dictation'], check: (c) => unitDone(c, 'u4') },
  { id: 'rhythm', icon: '🥁', ru: ['Чувство ритма', 'Пройди раздел «Ритм»'], en: ['Groove', 'Finish the rhythm unit'], check: (c) => unitDone(c, 'u8') },
  { id: 'blitz20', icon: '⏱️', ru: ['Молния', '20 очков в «Блице»'], en: ['Lightning', 'Score 20 in Blitz'], check: (c) => (c.highs.blitz ?? 0) >= 20 },
  { id: 'survival25', icon: '❤️', ru: ['Выживший', '25 очков в «Выживании»'], en: ['Survivor', 'Score 25 in Survival'], check: (c) => (c.highs.survival ?? 0) >= 25 },
  { id: 'explorer', icon: '🧭', ru: ['Исследователь', 'Попробуй 8 разных типов упражнений'], en: ['Explorer', 'Try 8 exercise types'], check: (c) => c.totals.kinds.length >= 8 },
  { id: 'master', icon: '🏆', ru: ['Маэстро', 'Получи 3 звезды во всех уроках'], en: ['Maestro', '3 stars in every lesson'], check: (c) => UNITS.filter((u) => !u.optional).every((u) => u.lessons.every((l) => (c.lessons[l.id]?.stars ?? 0) >= 3)) },
];
