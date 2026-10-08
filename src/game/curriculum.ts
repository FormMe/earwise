import type { ExerciseConfig, ExerciseKind } from '../exercises/types';

export interface Lesson {
  id: string;
  ru: string;
  en: string;
  cfg: ExerciseConfig;
  questions?: number;
}

export interface Unit {
  id: string;
  icon: string;
  color: string;
  ru: string;
  en: string;
  descRu: string;
  descEn: string;
  lessons: Lesson[];
}

const L = (id: string, ru: string, en: string, cfg: ExerciseConfig, questions?: number): Lesson => ({ id, ru, en, cfg, questions });

export const UNITS: Unit[] = [
  {
    id: 'u-basics', icon: '🎧', color: '#7c5cff', ru: 'Первые шаги', en: 'First steps',
    descRu: 'Высота звука и первые интервалы', descEn: 'Pitch direction and first intervals',
    lessons: [
      L('b1', 'Выше или ниже', 'Higher or lower', { kind: 'pitch', min: 4, max: 12 }),
      L('b2', 'Тонкое различие', 'Fine differences', { kind: 'pitch', min: 1, max: 4 }),
      L('b3', 'Квинта и октава', 'Fifth vs octave', { kind: 'interval', set: [7, 12], dirs: ['up'] }),
      L('b4', 'Терция, квинта, октава', 'Third, fifth, octave', { kind: 'interval', set: [4, 7, 12], dirs: ['up'] }),
    ],
  },
  {
    id: 'u-majmin', icon: '☯️', color: '#ff5c8a', ru: 'Мажор и минор', en: 'Major & minor',
    descRu: 'Светлое и тёмное в музыке', descEn: 'Bright vs dark in music',
    lessons: [
      L('mm1', 'Мажорный или минорный', 'Major or minor chord', { kind: 'chord', set: ['maj', 'min'] }),
      L('mm2', 'Большая и малая терция', 'Major vs minor third', { kind: 'interval', set: [3, 4], dirs: ['up'] }),
      L('mm3', 'Мажорная и минорная гамма', 'Major vs minor scale', { kind: 'scale', set: ['major', 'minor'] }),
      L('mm4', 'Аккорды в обращениях', 'Chords in inversions', { kind: 'chord', set: ['maj', 'min'], inversions: true }),
    ],
  },
  {
    id: 'u-deg1', icon: '🎯', color: '#22c3a6', ru: 'Ступени лада', en: 'Scale degrees',
    descRu: 'Главный навык: слышать ноту относительно тоники', descEn: 'The key skill: hear notes relative to the tonic',
    lessons: [
      L('d1', 'До, ми, соль', 'Do, mi, sol', { kind: 'degree', set: ['1', '3', '5'] }),
      L('d2', 'Первые пять ступеней', 'Degrees 1–5', { kind: 'degree', set: ['1', '2', '3', '4', '5'] }),
      L('d3', 'Верх лада: 5–8', 'Upper degrees 5–8', { kind: 'degree', set: ['5', '6', '7', '8'] }),
      L('d4', 'Все ступени мажора', 'All major degrees', { kind: 'degree', set: ['1', '2', '3', '4', '5', '6', '7'] }),
      L('d5', 'В разных октавах', 'Across octaves', { kind: 'degree', set: ['1', '2', '3', '4', '5', '6', '7'], wide: true }),
    ],
  },
  {
    id: 'u-int-up', icon: '📐', color: '#ffb020', ru: 'Интервалы ↑', en: 'Intervals ↑',
    descRu: 'Восходящие интервалы с песнями-подсказками', descEn: 'Ascending intervals with song hints',
    lessons: [
      L('iu1', 'Секунды и кварта', 'Seconds and fourth', { kind: 'interval', set: [2, 4, 5, 7], dirs: ['up'] }),
      L('iu2', 'Терции и сексты', 'Thirds and sixths', { kind: 'interval', set: [3, 4, 8, 9], dirs: ['up'] }),
      L('iu3', 'Тритон и чистые', 'Tritone & perfect', { kind: 'interval', set: [5, 6, 7], dirs: ['up'] }),
      L('iu4', 'Септимы и секунды', 'Sevenths and seconds', { kind: 'interval', set: [1, 2, 10, 11], dirs: ['up'] }),
      L('iu5', 'Все интервалы ↑', 'All ascending', { kind: 'interval', set: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], dirs: ['up'] }, 15),
    ],
  },
  {
    id: 'u-mel1', icon: '✍️', color: '#3fa9ff', ru: 'Диктант I', en: 'Dictation I',
    descRu: 'Записывай мелодии на слух', descEn: 'Write melodies by ear',
    lessons: [
      L('m1', 'До-ре-ми', 'Do-re-mi', { kind: 'melody', set: ['1', '2', '3'], length: 3, startOnTonic: true }, 8),
      L('m2', 'Пять нот', 'Five-note melodies', { kind: 'melody', set: ['1', '2', '3', '4', '5'], length: 4 }, 8),
      L('m3', 'Пентатоника', 'Pentatonic', { kind: 'melody', set: ['1', '2', '3', '5', '6'], length: 4 }, 8),
      L('m4', 'Весь мажор', 'Full major', { kind: 'melody', set: ['5,', '6,', '7,', '1', '2', '3', '4', '5', '6', '7', '8'], length: 5 }, 8),
    ],
  },
  {
    id: 'u-int-down', icon: '🪂', color: '#ff7a45', ru: 'Интервалы ↓ и гармонические', en: 'Intervals ↓ & harmonic',
    descRu: 'Нисходящие и одновременные интервалы', descEn: 'Descending and simultaneous',
    lessons: [
      L('id1', 'Нисходящие: основа', 'Descending basics', { kind: 'interval', set: [3, 4, 5, 7, 12], dirs: ['down'] }),
      L('id2', 'Все нисходящие', 'All descending', { kind: 'interval', set: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], dirs: ['down'] }, 15),
      L('id3', 'Гармонические: основа', 'Harmonic basics', { kind: 'interval', set: [3, 4, 5, 7, 12], dirs: ['harm'] }),
      L('id4', 'Все гармонические', 'All harmonic', { kind: 'interval', set: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], dirs: ['harm'] }, 15),
      L('id5', 'Микс направлений', 'Mixed directions', { kind: 'interval', set: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], dirs: ['up', 'down', 'harm'] }, 15),
    ],
  },
  {
    id: 'u-sing', icon: '🎤', color: '#e35cff', ru: 'Пой!', en: 'Sing!',
    descRu: 'Микрофон проверит точность твоего голоса', descEn: 'The mic checks your pitch',
    lessons: [
      L('s1', 'Повтори ноту', 'Match the note', { kind: 'sing', mode: 'note' }, 6),
      L('s2', 'Спой ступень', 'Sing a degree', { kind: 'sing', mode: 'degree', set: ['1', '3', '5'] }, 6),
      L('s3', 'Спой интервал', 'Sing an interval', { kind: 'sing', mode: 'interval', set: ['4', '7', '12'] }, 6),
      L('s4', 'Все ступени голосом', 'All degrees, sung', { kind: 'sing', mode: 'degree', set: ['1', '2', '3', '4', '5', '6', '7'] }, 6),
    ],
  },
  {
    id: 'u-triads', icon: '🎹', color: '#5c7cff', ru: 'Все трезвучия', en: 'All triads',
    descRu: 'Уменьшённые, увеличенные, sus', descEn: 'Diminished, augmented, sus',
    lessons: [
      L('t1', 'Мажор, минор, ум.', 'Maj, min, dim', { kind: 'chord', set: ['maj', 'min', 'dim'] }),
      L('t2', '+ увеличенный', '+ augmented', { kind: 'chord', set: ['maj', 'min', 'dim', 'aug'] }),
      L('t3', 'Sus-аккорды', 'Sus chords', { kind: 'chord', set: ['maj', 'sus2', 'sus4'] }),
      L('t4', 'Обращения', 'Inversions', { kind: 'inversion', chords: ['maj', 'min'], invs: [0, 1, 2] }),
    ],
  },
  {
    id: 'u-prog', icon: '🎸', color: '#20c060', ru: 'Аккорды в песнях', en: 'Chords in songs',
    descRu: 'Подбирай гармонию как профи', descEn: 'Hear progressions like a pro',
    lessons: [
      L('p1', 'I, IV, V', 'I, IV, V', { kind: 'progression', set: ['I', 'IV', 'V'], length: 4 }, 8),
      L('p2', '+ vi (поп-формула)', '+ vi (pop formula)', { kind: 'progression', set: ['I', 'IV', 'V', 'vi'], length: 4 }, 8),
      L('p3', '+ ii', '+ ii', { kind: 'progression', set: ['I', 'ii', 'IV', 'V', 'vi'], length: 4 }, 8),
      L('p4', 'Все диатонические', 'All diatonic', { kind: 'progression', set: ['I', 'ii', 'iii', 'IV', 'V', 'vi'], length: 5 }, 8),
    ],
  },
  {
    id: 'u-rhythm', icon: '🥁', color: '#ff4f4f', ru: 'Ритм', en: 'Rhythm',
    descRu: 'Слушай и простукивай', descEn: 'Listen and tap back',
    lessons: [
      L('r1', 'Четверти и восьмые', 'Quarters & eighths', { kind: 'rhythm', level: 1 }, 6),
      L('r2', 'Паузы и точки', 'Rests & dots', { kind: 'rhythm', level: 2 }, 6),
      L('r3', 'Шестнадцатые', 'Sixteenths', { kind: 'rhythm', level: 3 }, 6),
      L('r4', 'Синкопы', 'Syncopation', { kind: 'rhythm', level: 4 }, 6),
    ],
  },
  {
    id: 'u-sevenths', icon: '🌙', color: '#9b6bff', ru: 'Септаккорды', en: 'Seventh chords',
    descRu: 'Джаз, соул и неоклассика', descEn: 'Jazz, soul, neo-soul colours',
    lessons: [
      L('s7a', 'maj7, 7, m7', 'maj7, 7, m7', { kind: 'chord', set: ['maj7', 'dom7', 'min7'] }),
      L('s7b', '+ m7♭5 и °7', '+ m7♭5 & °7', { kind: 'chord', set: ['maj7', 'dom7', 'min7', 'm7b5', 'dim7'] }),
      L('s7c', 'Все септ- и секстаккорды', 'All 7ths & 6ths', { kind: 'chord', set: ['maj7', 'dom7', 'min7', 'm7b5', 'dim7', 'mMaj7', 'maj6'] }),
      L('s7d', 'Обращения септаккордов', '7th chord inversions', { kind: 'inversion', chords: ['dom7', 'maj7'], invs: [0, 1, 2, 3] }),
    ],
  },
  {
    id: 'u-minor', icon: '🌒', color: '#4f6bd8', ru: 'Минор и хроматика', en: 'Minor & chromatic',
    descRu: 'Ступени в миноре и альтерации', descEn: 'Minor-key degrees and chromatics',
    lessons: [
      L('n1', 'Ступени минора', 'Minor-key degrees', { kind: 'degree', set: ['1', '2', 'b3', '4', '5', 'b6', 'b7'], minor: true }),
      L('n2', 'Диктант в миноре', 'Minor dictation', { kind: 'melody', set: ['1', '2', 'b3', '4', '5', 'b6', 'b7', '8'], length: 5, minor: true }, 8),
      L('n3', 'Минорная гармония', 'Minor harmony', { kind: 'progression', set: ['i', 'iv', 'V', 'VI', 'VII'], length: 4, minor: true }, 8),
      L('n4', 'Все 12 ступеней', 'All 12 degrees', { kind: 'degree', set: ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'] }, 15),
    ],
  },
  {
    id: 'u-modes', icon: '🌈', color: '#ff9f1c', ru: 'Лады', en: 'Modes',
    descRu: 'Дорийский, лидийский и компания', descEn: 'Dorian, Lydian and friends',
    lessons: [
      L('md1', 'Три минора', 'Three minors', { kind: 'scale', set: ['minor', 'harmMinor', 'melMinor'] }),
      L('md2', 'Мажорные лады', 'Major-ish modes', { kind: 'scale', set: ['major', 'lydian', 'mixolydian'] }),
      L('md3', 'Минорные лады', 'Minor-ish modes', { kind: 'scale', set: ['minor', 'dorian', 'phrygian', 'locrian'] }),
      L('md4', 'Пентатоники и блюз', 'Pentatonics & blues', { kind: 'scale', set: ['majPent', 'minPent', 'blues', 'wholeTone'] }),
    ],
  },
  {
    id: 'u-notes', icon: '🔤', color: '#00b3d6', ru: 'Названия нот', en: 'Note names',
    descRu: 'От относительного слуха к абсолютному', descEn: 'From relative to absolute pitch',
    lessons: [
      L('nn1', 'Белые клавиши (с эталоном)', 'White keys (with reference)', { kind: 'noteName', set: [0, 2, 4, 5, 7, 9, 11], reference: true }),
      L('nn2', 'Все 12 нот (с эталоном)', 'All 12 (with reference)', { kind: 'noteName', set: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], reference: true }),
      L('nn3', 'Без эталона: до, фа, соль', 'No reference: C, F, G', { kind: 'noteName', set: [0, 5, 7], reference: false }),
      L('nn4', 'Абсолютный слух', 'Perfect pitch', { kind: 'noteName', set: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], reference: false }),
    ],
  },
  {
    id: 'u-master', icon: '🏆', color: '#ffd23f', ru: 'Мастерство', en: 'Mastery',
    descRu: 'Финальные испытания', descEn: 'Final challenges',
    lessons: [
      L('x1', 'Длинный диктант', 'Long dictation', { kind: 'melody', set: ['5,', '6,', '7,', '1', '2', '3', '4', '5', '6', '7', '8'], length: 7, maxLeap: 9 }, 6),
      L('x2', 'Заимствованные аккорды', 'Borrowed chords', { kind: 'progression', set: ['I', 'IV', 'V', 'vi', '♭VII', '♭VI', 'iv'], length: 5 }, 8),
      L('x3', 'Составные интервалы', 'Compound intervals', { kind: 'interval', set: [12, 13, 14, 15, 16], dirs: ['up', 'harm'] }),
      L('x4', 'Хроматический диктант', 'Chromatic dictation', { kind: 'melody', set: ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7', '8'], length: 5, maxLeap: 7 }, 6),
      L('x5', 'Ритм: 2 такта', 'Rhythm: 2 bars', { kind: 'rhythm', level: 4, bars: 2 }, 6),
    ],
  },
];

export const ALL_LESSONS = UNITS.flatMap((u) => u.lessons.map((l) => ({ ...l, unit: u })));

export function lessonById(id: string) {
  return ALL_LESSONS.find((l) => l.id === id);
}

export function isUnlocked(lessonId: string, lessons: Record<string, { stars: number }>, unlockAll: boolean) {
  if (unlockAll) return true;
  const idx = ALL_LESSONS.findIndex((l) => l.id === lessonId);
  if (idx <= 0) return true;
  return (lessons[ALL_LESSONS[idx - 1].id]?.stars ?? 0) > 0;
}

export const KIND_META: Record<ExerciseKind, { icon: string; ru: string; en: string; descRu: string; descEn: string }> = {
  pitch: { icon: '🎚️', ru: 'Выше / ниже', en: 'Higher / lower', descRu: 'Направление движения звука', descEn: 'Pitch direction' },
  interval: { icon: '📐', ru: 'Интервалы', en: 'Intervals', descRu: 'Расстояние между двумя нотами', descEn: 'Distance between two notes' },
  chord: { icon: '🎹', ru: 'Аккорды', en: 'Chords', descRu: 'Тип аккорда по звучанию', descEn: 'Chord quality' },
  inversion: { icon: '🔄', ru: 'Обращения', en: 'Inversions', descRu: 'Какой звук в басу', descEn: 'Which note is in the bass' },
  scale: { icon: '🪜', ru: 'Лады и гаммы', en: 'Scales & modes', descRu: 'Мажор, минор, дорийский…', descEn: 'Major, minor, Dorian…' },
  degree: { icon: '🎯', ru: 'Ступени лада', en: 'Scale degrees', descRu: 'Нота относительно тоники', descEn: 'Notes in a key' },
  melody: { icon: '✍️', ru: 'Диктант', en: 'Dictation', descRu: 'Запиши мелодию на слух', descEn: 'Transcribe melodies' },
  progression: { icon: '🎸', ru: 'Гармония', en: 'Progressions', descRu: 'Последовательности аккордов', descEn: 'Chord progressions' },
  noteName: { icon: '🔤', ru: 'Ноты', en: 'Note names', descRu: 'Назови ноту', descEn: 'Name the note' },
  sing: { icon: '🎤', ru: 'Пение', en: 'Singing', descRu: 'Спой ноту, микрофон оценит', descEn: 'Sing it, the mic grades it' },
  rhythm: { icon: '🥁', ru: 'Ритм', en: 'Rhythm', descRu: 'Простучи услышанный ритм', descEn: 'Tap back the rhythm' },
};
