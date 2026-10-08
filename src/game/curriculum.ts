import type { ExerciseConfig, ExerciseKind } from '../exercises/types';

export interface Lesson {
  id: string;
  ru: string;
  en: string;
  cfg: ExerciseConfig;
  questions?: number;
  /** short teaching text shown on the intro card */
  intro?: { ru: string; en: string };
  /** end-of-unit test: mixes the unit's lessons + earlier material; passing it can skip the unit */
  checkpoint?: boolean;
  /** pass threshold (accuracy) */
  pass?: number;
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
  /** side branch, not on the main path */
  optional?: boolean;
}

type I = { ru: string; en: string };
const L = (id: string, ru: string, en: string, cfg: ExerciseConfig, opts: { q?: number; intro?: I; pass?: number } = {}): Lesson => ({
  id,
  ru,
  en,
  cfg,
  questions: opts.q,
  intro: opts.intro,
  pass: opts.pass,
});
const CHECK = (id: string): Lesson => ({
  id,
  ru: 'Контрольная',
  en: 'Checkpoint',
  cfg: { kind: 'pitch', min: 1, max: 12 },
  checkpoint: true,
  questions: 20,
  pass: 0.85,
});

const MAJ = ['1', '2', '3', '4', '5', '6', '7'];
const MAJ_FULL = ['5,', '6,', '7,', '1', '2', '3', '4', '5', '6', '7', '8'];
const MIN = ['1', '2', 'b3', '4', '5', 'b6', 'b7'];
const ALL12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const UNITS: Unit[] = [
  {
    id: 'u1', icon: '🎧', color: '#7c5cff', ru: 'Звук, пульс, голос', en: 'Sound, pulse, voice',
    descRu: 'Высота, ритм и первые шаги голосом', descEn: 'Pitch, rhythm and your voice',
    lessons: [
      L('a1', 'Выше или ниже: широко', 'Higher or lower: wide', { kind: 'pitch', min: 5, max: 12 }, {
        intro: { ru: 'Слух начинается с простого: куда движется звук. Слушай обе ноты и решай — вверх или вниз.', en: 'Ear training starts simple: which way does the sound move?' },
      }),
      L('a2', 'Выше или ниже: ближе', 'Higher or lower: closer', { kind: 'pitch', min: 2, max: 5 }),
      L('a3', 'Выше или ниже: полутоны', 'Higher or lower: semitones', { kind: 'pitch', min: 1, max: 2 }),
      L('a4', 'Повтори ноту голосом', 'Match the note', { kind: 'sing', mode: 'note' }, {
        intro: { ru: 'Петь — лучший способ слышать. Не бойся фальши: микрофон покажет, выше ты или ниже. Можно петь на октаву ниже или выше.', en: 'Singing is the fastest way to hear. Any octave counts.' },
      }),
      L('a4p', 'Пульс: стучи доли', 'Pulse: tap the beat', { kind: 'pulse' }, {
        intro: { ru: 'Пульс — ровные «шаги» музыки. Послушай один такт и стучи на каждую долю вместе с песней.', en: 'The pulse is the steady beat. Listen for a bar, then tap along.' },
      }),
      L('a5', 'Ритм: повтори', 'Rhythm: echo', { kind: 'rhythm', level: 1 }, {
        intro: { ru: 'Слушай ритм, потом простучи его по большой кнопке после отсчёта «4-3-2-1».', en: 'Listen, then tap it back after the count-in.' },
      }),
      L('a6', 'Ритм на слух: четверти и восьмые', 'Rhythm by ear: quarters & eighths', { kind: 'rhythmDictation', level: 1 }, {
        intro: { ru: 'Каждая доля — один «шаг» метронома. В доле может быть одна нота (четверть), две (восьмые) или пауза. Собери ритм из таких кирпичиков.', en: 'Each beat holds one note (quarter), two (eighths) or a rest. Build the rhythm from these blocks.' },
      }),
      L('a7', 'Мажор или минор', 'Major or minor', { kind: 'chord', set: ['maj', 'min'] }, {
        intro: { ru: 'Мажор звучит светло и устойчиво, минор — мягче и грустнее. Послушай оба несколько раз.', en: 'Major sounds bright, minor softer and sadder.' },
      }),
      L('a8', 'Мажор/минор в разных регистрах', 'Major/minor across registers', { kind: 'chord', set: ['maj', 'min'], open: true, inversions: true }),
      CHECK('a9'),
    ],
  },
  {
    id: 'u2', icon: '🏠', color: '#22c3a6', ru: 'Тоника: до–ми–соль', en: 'Home: do–mi–sol',
    descRu: 'Слышать ноты относительно «дома» — главный навык', descEn: 'Hearing notes relative to home — the key skill',
    lessons: [
      L('b1', 'Тоника и квинта', 'Tonic and fifth', { kind: 'degree', set: ['1', '5'] }, {
        intro: { ru: 'Перед каждым вопросом звучит каденция — она задаёт «дом» (тонику, 1 ступень). Тоника звучит спокойно и законченно, 5 ступень — опора, но хочет вернуться домой.', en: 'A cadence sets "home" (the tonic). Degree 1 feels at rest, 5 is stable but wants to go home.' },
      }),
      L('b1t', 'Найди тонику', 'Find the tonic', { kind: 'tonicFind' }, {
        intro: { ru: 'Мелодия почти всегда «возвращается домой». Послушай фразу и выбери, какая из трёх нот — дом.', en: 'Melodies come home. Pick which of three notes is home.' },
      }),
      L('b2', 'До, ми, соль', 'Do, mi, sol', { kind: 'degree', set: ['1', '3', '5'] }, {
        intro: { ru: '1-3-5 — это звуки тонического аккорда, «каркас» тональности. 3 ступень (ми) светлая и определяет мажор.', en: '1-3-5 is the tonic chord; 3 gives major its colour.' },
      }),
      L('b3', 'В одной тональности', 'In one key', { kind: 'degree', set: ['1', '3', '5'], holdKey: true }, {
        intro: { ru: 'Теперь тональность держится 5 вопросов подряд, а между ними звучит только тоника. Удерживай «дом» в голове.', en: 'The key stays for 5 questions; keep home in your head.' },
      }),
      L('b4', 'Спой до–ми–соль', 'Sing do–mi–sol', { kind: 'sing', mode: 'degree', set: ['1', '3', '5'] }),
      L('b5', 'Эхо: 3 ноты', 'Echo: 3 notes', { kind: 'sing', mode: 'echo', set: ['1', '3', '5'], length: 3 }, {
        intro: { ru: 'Услышь фразу и повтори её голосом нота за нотой.', en: 'Hear a phrase and sing it back note by note.' },
      }),
      L('b6', 'До, ре, ми', 'Do, re, mi', { kind: 'degree', set: ['1', '2', '3'] }, {
        intro: { ru: '2 ступень (ре) неустойчива: она стремится вниз к 1 или вверх к 3.', en: 'Degree 2 is unstable: it leans to 1 or 3.' },
      }),
      L('b7', 'Диктант: до-ре-ми', 'Dictation: do-re-mi', { kind: 'melody', set: ['1', '2', '3'], length: 3, startOnTonic: true }, {
        intro: { ru: 'Запиши мелодию ступенями. Сначала найди, где звучит «дом» (1), остальные ноты отсчитывай от него.', en: 'Write the melody in degrees, starting from home.' },
      }),
      L('b8', 'Диктант: до-ми-соль', 'Dictation: do-mi-sol', { kind: 'melody', set: ['1', '3', '5', '8'], length: 3 }),
      L('b9', 'Мажорная или минорная гамма', 'Major or minor scale', { kind: 'scale', set: ['major', 'minor'] }),
      CHECK('b10'),
    ],
  },
  {
    id: 'u3', icon: '✋', color: '#3fa9ff', ru: 'Пять ступеней', en: 'Five degrees',
    descRu: 'До-ре-ми-фа-соль и первые диктанты с ритмом', descEn: 'Do to sol and first rhythmic dictations',
    lessons: [
      L('c1', 'Ступени 1–5', 'Degrees 1–5', { kind: 'degree', set: ['1', '2', '3', '4', '5'] }, {
        intro: { ru: '4 ступень (фа) тянется вниз к 3, 2 ступень — к 1. Эти «тяготения» и помогают узнавать ноты.', en: '4 pulls down to 3, 2 pulls to 1 — these pulls make notes recognisable.' },
      }),
      L('c2', 'Соседи: ре, ми, фа', 'Neighbours: re, mi, fa', { kind: 'degree', set: ['2', '3', '4'] }),
      L('c3', 'В одной тональности', 'In one key', { kind: 'degree', set: ['1', '2', '3', '4', '5'], holdKey: true }),
      L('c4', 'Спой ступени 1–5', 'Sing degrees 1–5', { kind: 'sing', mode: 'degree', set: ['1', '2', '3', '4', '5'] }),
      L('c5', 'Эхо: 4 ноты', 'Echo: 4 notes', { kind: 'sing', mode: 'echo', set: ['1', '2', '3', '4', '5'], length: 4 }),
      L('c6', 'Диктант: 4 ноты', 'Dictation: 4 notes', { kind: 'melody', set: ['1', '2', '3', '4', '5'], length: 4 }),
      L('c7', 'Ритм на слух: паузы', 'Rhythm by ear: rests', { kind: 'rhythmDictation', level: 2 }),
      L('c8', 'Диктант с ритмом: 5 нот', 'Rhythmic dictation: 5 notes', { kind: 'melody', set: ['1', '2', '3', '4', '5'], length: 5, rhythmic: true }, {
        intro: { ru: 'Теперь у нот разная длительность — как в настоящих песнях. Записывай высоту, а ритм просто слушай.', en: 'Notes now have real lengths, like in songs.' },
      }),
      L('c9', 'Ритм: повтори паузы', 'Rhythm echo: rests', { kind: 'rhythm', level: 2 }),
      CHECK('c10'),
    ],
  },
  {
    id: 'u4', icon: '🌞', color: '#ffb020', ru: 'Весь мажор', en: 'The whole major scale',
    descRu: 'Все семь ступеней, широкий диапазон, без подсказок', descEn: 'All seven degrees, wide range, less context',
    lessons: [
      L('d1', 'Верх лада: 5–8', 'Upper degrees 5–8', { kind: 'degree', set: ['5', '6', '7', '8'] }, {
        intro: { ru: '7 ступень (ти) — самая острая, она почти «впивается» в тонику сверху. 6 ступень мягко тянется к 5.', en: '7 (ti) is the sharpest — it leans hard into the tonic. 6 sinks to 5.' },
      }),
      L('d2', 'Вводный тон', 'The leading tone', { kind: 'degree', set: ['6', '7', '8'] }),
      L('d3', 'Все 7 ступеней', 'All 7 degrees', { kind: 'degree', set: MAJ }),
      L('d4', 'Ниже тоники: 5̣ 6̣ 7̣', 'Below the tonic: 5̣ 6̣ 7̣', { kind: 'degree', set: ['5,', '6,', '7,', '1', '2', '3'] }, {
        intro: { ru: 'Мелодии часто опускаются ниже тоники. 7̣ под тоникой — тот же вводный тон, просто снизу.', en: 'Melodies often dip below the tonic; low 7 still leads up to 1.' },
      }),
      L('d5', 'Разные октавы', 'Across octaves', { kind: 'degree', set: MAJ, wide: true }),
      L('d6', 'Только тоника', 'Tonic only', { kind: 'degree', set: MAJ, context: 'tonic' }, {
        intro: { ru: 'Каденции больше нет — звучит только тоника. Представь аккорд у себя в голове.', en: 'No cadence now — just the tonic. Imagine the chord yourself.' },
      }),
      L('d7', 'Спой все ступени', 'Sing all degrees', { kind: 'sing', mode: 'degree', set: MAJ }, { q: 8 }),
      L('d8', 'Эхо: 4 ноты, весь мажор', 'Echo: 4 notes, full major', { kind: 'sing', mode: 'echo', set: ['5,', '6,', '7,', '1', '2', '3', '4', '5'], length: 4 }),
      L('d8s', 'Пение с листа', 'Sight-singing', { kind: 'sing', mode: 'sight', set: ['5,', '7,', '1', '2', '3', '4', '5', '6'], length: 5 }, {
        intro: { ru: 'На экране ступени — спой их по очереди. Сначала прозвучит тональность. Это обратный навык к диктанту: видишь → слышишь внутри → поёшь.', en: 'Degrees on screen — sing them in order. The reverse of dictation.' },
      }),
      L('d9', 'Диктант: 5 нот', 'Dictation: 5 notes', { kind: 'melody', set: MAJ_FULL, length: 5 }),
      L('d10', 'Диктант с ритмом: 6 нот', 'Rhythmic dictation: 6 notes', { kind: 'melody', set: MAJ_FULL, length: 6, rhythmic: true }),
      L('d10f', 'Полный диктант: высота + ритм', 'Full dictation: pitch + rhythm', { kind: 'fullDictation', set: ['5,', '7,', '1', '2', '3', '4', '5', '6', '8'], bars: 1, level: 1 }, {
        q: 6,
        intro: { ru: 'Настоящий диктант: сначала запиши ступени, потом ритм — по долям, как в ритмическом диктанте.', en: 'Real dictation: degrees first, then rhythm beat by beat.' },
      }),
      CHECK('d11'),
    ],
  },
  {
    id: 'u5', icon: '🎸', color: '#20c060', ru: 'Гармония: T – S – D', en: 'Harmony: T – S – D',
    descRu: 'Три главных аккорда, бас и каденции', descEn: 'The three main chords, bass and cadences',
    lessons: [
      L('e1', 'Бас: I, IV, V', 'Bass: I, IV, V', { kind: 'bass', set: ['I', 'IV', 'V'], length: 4 }, {
        intro: { ru: 'Почти любая песня стоит на трёх аккордах: I (тоника, дом), IV (субдоминанта, «отход») и V (доминанта, напряжение). Их бас поёт ступени 1, 4 и 5.', en: 'Most songs rest on I (home), IV (away) and V (tension). Their bass sings degrees 1, 4 and 5.' },
      }),
      L('e1f', 'Функции: T, S, D', 'Functions: T, S, D', { kind: 'function', set: ['I', 'IV', 'V'] }, {
        intro: { ru: 'У каждого аккорда есть «роль»: T — покой, S — уход из дома, D — напряжение, которое тянет обратно.', en: 'Every chord has a role: T rest, S away, D tension.' },
      }),
      L('e2', 'I, IV, V', 'I, IV, V', { kind: 'progression', set: ['I', 'IV', 'V'], length: 4 }),
      L('e3', 'Каденции: полная и половинная', 'Cadences: authentic & half', { kind: 'cadence', set: ['PAC', 'HC'] }, {
        intro: { ru: 'Каденция — «знак препинания» в музыке. Полная (V→I) — точка, половинная (остановка на V) — запятая.', en: 'Cadences are punctuation: V→I is a full stop, ending on V is a comma.' },
      }),
      L('e4', '+ V7', '+ V7', { kind: 'progression', set: ['I', 'IV', 'V', 'V7'], length: 4 }),
      L('e5', '+ плагальная', '+ plagal', { kind: 'cadence', set: ['PAC', 'HC', 'PC'] }),
      L('e6', 'Петля: фортепиано', 'Loop: piano ballad', { kind: 'progression', set: ['I', 'IV', 'V'], length: 4, free: true, style: 'ballad' }, {
        intro: { ru: 'Теперь как в песне: аккомпанемент, один аккорд на такт, и петля может начаться не с I. Сначала звучит каденция, чтобы задать тональность.', en: 'Now like a song: accompaniment, one chord per bar, and the loop may not start on I.' },
      }),
      L('e7', '+ vi (поп-формула)', '+ vi (pop formula)', { kind: 'progression', set: ['I', 'IV', 'V', 'vi'], length: 4 }, {
        intro: { ru: 'vi — минорный аккорд на 6 ступени. I–V–vi–IV — самая популярная последовательность в поп-музыке.', en: 'vi is the minor chord on degree 6. I–V–vi–IV powers countless pop songs.' },
      }),
      L('e8', 'Бас: I, IV, V, vi', 'Bass: I, IV, V, vi', { kind: 'bass', set: ['I', 'IV', 'V', 'vi'], length: 4 }),
      L('e8f', 'Функции: + ii и vi', 'Functions: + ii and vi', { kind: 'function', set: ['I', 'ii', 'IV', 'V', 'vi', 'V7'] }),
      L('e9', 'Поп-группа', 'Pop band', { kind: 'progression', set: ['I', 'IV', 'V', 'vi'], length: 4, free: true, style: 'pop' }),
      L('e10', 'Гитара', 'Guitar strum', { kind: 'progression', set: ['I', 'IV', 'V', 'vi'], length: 4, free: true, style: 'strum' }),
      CHECK('e11'),
    ],
  },
  {
    id: 'u6', icon: '📐', color: '#ff7a45', ru: 'Интервалы I', en: 'Intervals I',
    descRu: 'Восходящие интервалы и гармонические консонансы', descEn: 'Ascending intervals and harmonic consonances',
    lessons: [
      L('f1', 'Квинта и октава', 'Fifth vs octave', { kind: 'interval', set: [7, 12], dirs: ['up'] }, {
        intro: { ru: 'Интервал — расстояние между двумя нотами. Ты уже знаешь их по ступеням: 1→5 — это квинта, 1→8 — октава. Песни-подсказки — в справочнике.', en: 'An interval is the distance between notes. 1→5 is a fifth, 1→8 an octave.' },
      }),
      L('f2', 'Большая и малая терция', 'Major vs minor third', { kind: 'interval', set: [3, 4], dirs: ['up'] }),
      L('f2k', 'Интервалы от тоники', 'Intervals from the tonic', { kind: 'intervalInKey', set: ['1', '3', '4', '5', '6', '8'] }, {
        intro: { ru: 'Связываем интервалы со ступенями: 1→3 — терция, 1→4 — кварта, 1→5 — квинта, 1→6 — секста, 1→8 — октава.', en: 'Link intervals to degrees: 1→3 a third, 1→5 a fifth…' },
      }),
      L('f3', 'Кварта и квинта', 'Fourth vs fifth', { kind: 'interval', set: [5, 7], dirs: ['up'] }, {
        intro: { ru: 'Кварта (Гимн России: «Рос-сия») и квинта (Звёздные войны) — их часто путают. Квинта звучит «пустее» и шире.', en: 'Fourth (Here Comes the Bride) vs fifth (Star Wars).' },
      }),
      L('f4', 'Секунды', 'Seconds', { kind: 'interval', set: [1, 2], dirs: ['up'] }),
      L('f5', 'Сексты', 'Sixths', { kind: 'interval', set: [8, 9], dirs: ['up'] }),
      L('f6', 'Терции, кварта, квинта, октава', 'Thirds, 4th, 5th, octave', { kind: 'interval', set: [3, 4, 5, 7, 12], dirs: ['up'] }),
      L('f7', 'Септимы и тритон', 'Sevenths & tritone', { kind: 'interval', set: [6, 10, 11], dirs: ['up'] }),
      L('f8', 'Все восходящие', 'All ascending', { kind: 'interval', set: ALL12, dirs: ['up'] }),
      L('f8k', 'Все интервалы от тоники', 'All intervals from the tonic', { kind: 'intervalInKey', set: ['1', '2', '3', '4', '5', '6', '7', '8'] }),
      L('f9', 'Гармонические консонансы', 'Harmonic consonances', { kind: 'interval', set: [3, 4, 5, 7, 8, 9, 12], dirs: ['harm'] }, {
        intro: { ru: 'Теперь обе ноты звучат одновременно. Попробуй мысленно «разложить» их по очереди.', en: 'Both notes at once — try hearing them apart in your head.' },
      }),
      L('f10', 'Спой интервал', 'Sing an interval', { kind: 'sing', mode: 'interval', set: ['3', '4', '5', '7', '12'] }, { q: 8 }),
      CHECK('f11'),
    ],
  },
  {
    id: 'u7', icon: '🌒', color: '#4f6bd8', ru: 'Минор', en: 'Minor',
    descRu: 'Тот же дом, другая окраска', descEn: 'Same home, different colour',
    lessons: [
      L('g1', 'Мажор или минор: мелодия', 'Major or minor: melody', { kind: 'scale', set: ['major', 'minor'], vamp: true }, {
        intro: { ru: 'В миноре 3, 6 и 7 ступени ниже на полтона: ♭3, ♭6, ♭7. Отсюда и «грустная» окраска.', en: 'Minor lowers degrees 3, 6 and 7: ♭3, ♭6, ♭7.' },
      }),
      L('g2', '1, ♭3, 5 в миноре', '1, ♭3, 5 in minor', { kind: 'degree', set: ['1', 'b3', '5'], minor: true }),
      L('g3', 'Все ступени минора', 'All minor degrees', { kind: 'degree', set: MIN, minor: true }),
      L('g4', 'Вводный тон в миноре', 'Leading tone in minor', { kind: 'degree', set: ['1', 'b3', '5', 'b7', '7'], minor: true }, {
        intro: { ru: 'В гармоническом миноре 7 ступень повышают, чтобы она тянулась к тонике, как в мажоре. Сравни ♭7 и 7.', en: 'Harmonic minor raises 7 to lead home. Compare ♭7 and 7.' },
      }),
      L('g5', 'Спой в миноре', 'Sing in minor', { kind: 'sing', mode: 'degree', set: ['1', 'b3', '5'], minor: true }),
      L('g6', 'Диктант в миноре', 'Minor dictation', { kind: 'melody', set: ['5,', '1', '2', 'b3', '4', '5', 'b6', 'b7', '8'], length: 5, minor: true, rhythmic: true }),
      L('g7', 'i – iv – V', 'i – iv – V', { kind: 'progression', set: ['i', 'iv', 'V'], length: 4, minor: true }),
      L('g8', '+ VI и VII', '+ VI and VII', { kind: 'progression', set: ['i', 'iv', 'V', 'VI', 'VII'], length: 4, minor: true }),
      L('g9', 'Минорная петля: гитара', 'Minor loop: guitar', { kind: 'progression', set: ['i', 'III', 'iv', 'VI', 'VII'], length: 4, minor: true, free: true, style: 'strum' }),
      CHECK('g10'),
    ],
  },
  {
    id: 'u8', icon: '🥁', color: '#ff4f4f', ru: 'Ритм II', en: 'Rhythm II',
    descRu: 'Шестнадцатые, синкопы, триоли', descEn: 'Sixteenths, syncopation, triplets',
    lessons: [
      L('h1', 'Шестнадцатые', 'Sixteenths', { kind: 'rhythmDictation', level: 3 }, {
        intro: { ru: 'Считай доли как «раз-и-а-и»: четыре шестнадцатых в одной доле. Восьмая с точкой — «длинно-коротко».', en: 'Count "1-e-and-a": four sixteenths per beat.' },
      }),
      L('h1t', 'Размер 3/4', '3/4 time', { kind: 'rhythmDictation', level: 2, meter: 3 }, {
        intro: { ru: '3/4 — вальс: «раз-два-три». Сильная доля только первая.', en: '3/4 is a waltz: "one-two-three".' },
      }),
      L('h1s', 'Размер 6/8', '6/8 time', { kind: 'rhythmDictation', level: 2, meter: 6 }, {
        intro: { ru: '6/8 — две доли, каждая из трёх восьмых: «раз-и-а, два-и-а». Звучит покачиванием.', en: '6/8 has two beats of three eighths each — a lilting feel.' },
      }),
      L('h2', 'Шестнадцатые: 2 такта', 'Sixteenths: 2 bars', { kind: 'rhythmDictation', level: 3, bars: 2 }),
      L('h3', 'Синкопы и триоли', 'Syncopation & triplets', { kind: 'rhythmDictation', level: 4 }, {
        intro: { ru: 'Триоль — три равные ноты на одну долю («ра-зи-ки»). Синкопа — акцент между долями.', en: 'A triplet is three even notes per beat; syncopation lands between beats.' },
      }),
      L('h4', 'Повтори: 2 такта', 'Echo: 2 bars', { kind: 'rhythm', level: 3, bars: 2 }),
      L('h5', 'Повтори: синкопы', 'Echo: syncopation', { kind: 'rhythm', level: 4 }),
      L('h6', 'Диктант с ритмом: 7 нот', 'Rhythmic dictation: 7 notes', { kind: 'melody', set: MAJ_FULL, length: 7, rhythmic: true }, { q: 6 }),
      L('h6f', 'Полный диктант: 2 такта', 'Full dictation: 2 bars', { kind: 'fullDictation', set: ['5,', '7,', '1', '2', '3', '4', '5', '6', '8'], bars: 2, level: 2 }, { q: 5 }),
      L('h7', 'Ритм: 2 такта, всё вместе', 'Rhythm: 2 bars, everything', { kind: 'rhythmDictation', level: 4, bars: 2 }),
      CHECK('h8'),
    ],
  },
  {
    id: 'u9', icon: '🪂', color: '#e35cff', ru: 'Интервалы II и трезвучия', en: 'Intervals II & triads',
    descRu: 'Вниз, вместе и все виды трезвучий', descEn: 'Down, together and all triad types',
    lessons: [
      L('i1', 'Нисходящие консонансы', 'Descending consonances', { kind: 'interval', set: [3, 4, 5, 7, 12], dirs: ['down'] }),
      L('i2', 'Секунды и сексты вниз', 'Seconds & sixths down', { kind: 'interval', set: [1, 2, 8, 9], dirs: ['down'] }),
      L('i3', 'Все нисходящие', 'All descending', { kind: 'interval', set: ALL12, dirs: ['down'] }),
      L('i4', 'Гармонические диссонансы', 'Harmonic dissonances', { kind: 'interval', set: [1, 2, 6, 10, 11], dirs: ['harm'] }),
      L('i5', 'Все направления', 'All directions', { kind: 'interval', set: ALL12, dirs: ['up', 'down', 'harm'] }, { q: 30 }),
      L('i6', 'Мажор, минор, уменьшённый', 'Major, minor, diminished', { kind: 'chord', set: ['maj', 'min', 'dim'], open: true }),
      L('i7', '+ увеличенный', '+ augmented', { kind: 'chord', set: ['maj', 'min', 'dim', 'aug'], open: true }),
      L('i8', 'Sus-аккорды', 'Sus chords', { kind: 'chord', set: ['maj', 'sus2', 'sus4'] }),
      L('i9', 'Обращения трезвучий', 'Triad inversions', { kind: 'inversion', chords: ['maj', 'min'], invs: [0, 1, 2] }, {
        intro: { ru: 'Обращение — когда в басу не основной тон, а терция (секстаккорд) или квинта (квартсекстаккорд). Слушай самую нижнюю ноту.', en: 'An inversion puts the 3rd or 5th in the bass. Listen to the lowest note.' },
      }),
      CHECK('i10'),
    ],
  },
  {
    id: 'u10', icon: '🎵', color: '#00b3d6', ru: 'Аккорды в песнях', en: 'Chords in songs',
    descRu: 'Петли, обращения, вторичные доминанты, заимствования', descEn: 'Loops, inversions, secondary dominants, borrowed chords',
    lessons: [
      L('j1', 'ii и iii', 'ii and iii', { kind: 'progression', set: ['I', 'ii', 'iii', 'IV', 'V', 'vi'], length: 4 }),
      L('j2', 'Бас с обращениями', 'Bass with inversions', { kind: 'bass', set: ['I', 'ii', 'IV', 'V', 'vi'], length: 4, inversions: true }, {
        intro: { ru: 'Если бас идёт плавно (1-7-6 или 1-2-3), часто это аккорд в обращении: например I⁶ — тоника с 3 ступенью в басу.', en: 'Smooth bass lines often mean inversions, e.g. I⁶ has degree 3 in the bass.' },
      }),
      L('j3', 'Обращения в гармонии', 'Inversions in harmony', { kind: 'progression', set: ['I', 'ii', 'IV', 'V', 'vi'], length: 4, inversions: true }),
      L('j4', 'Все каденции', 'All cadences', { kind: 'cadence', set: ['PAC', 'HC', 'PC', 'DC'] }, {
        intro: { ru: 'Прерванная каденция — «обман слуха»: ждём I после V, а звучит vi.', en: 'Deceptive cadence: V goes to vi instead of I.' },
      }),
      L('j5', 'Гитара: петли', 'Guitar loops', { kind: 'progression', set: ['I', 'ii', 'IV', 'V', 'vi'], length: 4, free: true, style: 'strum' }),
      L('j6', 'Поп-петли', 'Pop loops', { kind: 'progression', set: ['I', 'ii', 'iii', 'IV', 'V', 'vi'], length: 4, free: true, style: 'pop' }),
      L('j7', 'V7 и II (доминанта к V)', 'V7 and II (V of V)', { kind: 'progression', set: ['I', 'ii', 'IV', 'V', 'V7', 'II'], length: 4 }, {
        intro: { ru: 'II — мажорный аккорд на 2 ступени, «доминанта к доминанте». Он ярко ведёт к V.', en: 'Major II is the "V of V" — it drives to V.' },
      }),
      L('j8', 'Вторичные доминанты', 'Secondary dominants', { kind: 'progression', set: ['I', 'ii', 'IV', 'V', 'vi', 'III7', 'I7'], length: 4 }),
      L('j9', 'Заимствованные аккорды', 'Borrowed chords', { kind: 'progression', set: ['I', 'IV', 'V', 'vi', '♭VII', '♭VI', 'iv'], length: 4, free: true, style: 'pop' }, {
        intro: { ru: '♭VII, ♭VI и iv «заимствованы» из одноимённого минора — рок и кино их обожают.', en: '♭VII, ♭VI and iv come from the parallel minor — rock and film love them.' },
      }),
      L('j10', 'Куплет: 8 тактов', 'Verse: 8 bars', { kind: 'progression', set: ['I', 'ii', 'IV', 'V', 'vi'], length: 8, free: true, style: 'ballad' }, { q: 6 }),
      CHECK('j11'),
    ],
  },
  {
    id: 'u11', icon: '🌙', color: '#9b6bff', ru: 'Септаккорды и джаз', en: 'Sevenths & jazz',
    descRu: 'Краски джаза, соула и неоклассики', descEn: 'Colours of jazz, soul and neo-classical',
    lessons: [
      L('k1', 'maj7, 7, m7', 'maj7, 7, m7', { kind: 'chord', set: ['maj7', 'dom7', 'min7'], open: true }),
      L('k2', '+ m7♭5 и °7', '+ m7♭5 & °7', { kind: 'chord', set: ['maj7', 'dom7', 'min7', 'm7b5', 'dim7'], open: true }),
      L('k3', 'Пара: 7 и maj7', 'Pair: 7 vs maj7', { kind: 'chord', set: ['dom7', 'maj7'], open: true }),
      L('k4', 'Все септ- и секстаккорды', 'All 7ths & 6ths', { kind: 'chord', set: ['maj7', 'dom7', 'min7', 'm7b5', 'dim7', 'mMaj7', 'maj6'], open: true }),
      L('k5', 'add9 и 9', 'add9 and 9', { kind: 'chord', set: ['maj', 'add9', 'dom7', 'dom9'] }),
      L('k6', 'Обращения септаккордов', '7th chord inversions', { kind: 'inversion', chords: ['dom7', 'maj7'], invs: [0, 1, 2, 3] }),
      L('k7', 'ii – V – I', 'ii – V – I', { kind: 'progression', set: ['Imaj7', 'ii7', 'V7', 'vi7'], length: 4, style: 'jazz' }, {
        intro: { ru: 'ii7–V7–Imaj7 — главная формула джаза. Слушай, как бас ходит по квартам вверх.', en: 'ii7–V7–Imaj7 is the core of jazz; the bass moves up in fourths.' },
      }),
      L('k8', 'Джаз в миноре', 'Minor jazz', { kind: 'progression', set: ['i', 'iiø7', 'V7', 'VI'], length: 4, minor: true, style: 'jazz' }),
      CHECK('k9'),
    ],
  },
  {
    id: 'u12', icon: '🌈', color: '#ff5c8a', ru: 'Хроматика', en: 'Chromatics',
    descRu: 'Альтерации и все 12 ступеней', descEn: 'Altered notes and all 12 degrees',
    lessons: [
      L('l1', '♯4 — лидийская краска', '♯4 — Lydian colour', { kind: 'degree', set: [...MAJ, '#4'] }, {
        intro: { ru: '♯4 тянется вверх к 5. Звучит сказочно — как в мультфильмах Disney.', en: '♯4 leans up to 5 — the "Disney" sound.' },
      }),
      L('l2', '♭7 — миксолидийская краска', '♭7 — Mixolydian colour', { kind: 'degree', set: [...MAJ, 'b7'] }),
      L('l3', '♭3 и ♭6 в мажоре', '♭3 and ♭6 in major', { kind: 'degree', set: [...MAJ, 'b3', 'b6'] }),
      L('l4', '♭2', '♭2', { kind: 'degree', set: [...MAJ, 'b2'] }),
      L('l5', 'Все 12 ступеней', 'All 12 degrees', { kind: 'degree', set: ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'] }, { q: 30 }),
      L('l6', 'Хроматический диктант', 'Chromatic dictation', { kind: 'melody', set: ['1', '2', '3', '#4', '4', '5', '6', 'b7', '7', '8'], length: 5, rhythmic: true, maxLeap: 5 }, { q: 6 }),
      L('l6m', 'Модуляция: была или нет', 'Modulation: yes or no', { kind: 'modulation', set: ['none', 'V'] }, {
        intro: { ru: 'Модуляция — переход в новую тональность. Сравни последний аккорд с первым: тот же «дом» или новый?', en: 'Modulation moves to a new key. Is the last chord the same home as the first?' },
      }),
      L('l6n', 'Куда модулировали', 'Where did it modulate', { kind: 'modulation', set: ['none', 'V', 'IV', 'vi', 'i'] }),
      L('l7', 'Спой хроматику', 'Sing chromatics', { kind: 'sing', mode: 'degree', set: ['1', '#4', '5', 'b7', 'b3'] }),
      CHECK('l8'),
    ],
  },
  {
    id: 'u13', icon: '🎨', color: '#ff9f1c', ru: 'Лады в контексте', en: 'Modes in context',
    descRu: 'Дорийский, лидийский и компания — на бурдоне', descEn: 'Dorian, Lydian & friends over a drone',
    lessons: [
      L('m1', 'Три минора', 'Three minors', { kind: 'scale', set: ['minor', 'harmMinor', 'melMinor'], vamp: true }),
      L('m2', 'Дорийский или минор', 'Dorian or minor', { kind: 'scale', set: ['minor', 'dorian'], vamp: true }, {
        intro: { ru: 'Дорийский — минор с «светлой» 6 ступенью. Слушай, где мелодия касается 6.', en: 'Dorian is minor with a bright 6th.' },
      }),
      L('m3', 'Миксолидийский или мажор', 'Mixolydian or major', { kind: 'scale', set: ['major', 'mixolydian'], vamp: true }),
      L('m4', 'Лидийский', 'Lydian', { kind: 'scale', set: ['major', 'lydian', 'mixolydian'], vamp: true }),
      L('m5', 'Фригийский и локрийский', 'Phrygian & Locrian', { kind: 'scale', set: ['minor', 'phrygian', 'locrian'], vamp: true }),
      L('m6', 'Пентатоники и блюз', 'Pentatonics & blues', { kind: 'scale', set: ['majPent', 'minPent', 'blues'], vamp: true }),
      L('m7', 'Все лады', 'All modes', { kind: 'scale', set: ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian'], vamp: true }),
      CHECK('m8'),
    ],
  },
  {
    id: 'u14', icon: '🏆', color: '#ffd23f', ru: 'Мастерство', en: 'Mastery',
    descRu: 'Длинные диктанты и гармония целых песен', descEn: 'Long dictations and whole-song harmony',
    lessons: [
      L('n1', 'Диктант: 8 нот', 'Dictation: 8 notes', { kind: 'melody', set: MAJ_FULL, length: 8, rhythmic: true, maxLeap: 9 }, { q: 5 }),
      L('n2', 'Минорный диктант с вводным тоном', 'Minor dictation with leading tone', { kind: 'melody', set: ['5,', '7,', '1', '2', 'b3', '4', '5', 'b6', 'b7', '7', '8'], length: 7, minor: true, rhythmic: true }, { q: 5 }),
      L('n2v', 'Двухголосие', 'Two-voice dictation', { kind: 'twoVoice', set: ['I', 'ii', 'IV', 'V', 'vi'], length: 4 }, {
        q: 5,
        intro: { ru: 'Звучат два голоса — бас и мелодия. Сначала запиши бас, потом верхний голос. Можно слушать их по отдельности.', en: 'Two voices: write the bass, then the top line.' },
      }),
      L('n2f', 'Полный диктант: минор', 'Full dictation: minor', { kind: 'fullDictation', set: ['5,', '7,', '1', '2', 'b3', '4', '5', 'b6', '8'], bars: 2, level: 2, minor: true }, { q: 5 }),
      L('n3', 'Гармония песни: 8 тактов', 'Song harmony: 8 bars', { kind: 'progression', set: ['I', 'ii', 'iii', 'IV', 'V', 'vi', '♭VII'], length: 8, free: true, inversions: true, style: 'pop' }, { q: 5 }),
      L('n4', 'Джазовый стандарт', 'Jazz standard', { kind: 'progression', set: ['Imaj7', 'ii7', 'V7', 'vi7', 'VI7', 'IVmaj7'], length: 6, free: true, style: 'jazz' }, { q: 5 }),
      L('n5', 'Составные интервалы', 'Compound intervals', { kind: 'interval', set: [12, 13, 14, 15, 16], dirs: ['up', 'harm'] }),
      L('n6', 'Ритм: всё вместе, 2 такта', 'Rhythm: everything, 2 bars', { kind: 'rhythmDictation', level: 4, bars: 2 }),
      { ...CHECK('n7'), ru: 'Финальный экзамен', en: 'Final exam', questions: 30 },
    ],
  },
  {
    id: 'u-notes', icon: '🔤', color: '#5c7cff', ru: 'Названия нот (доп.)', en: 'Note names (extra)', optional: true,
    descRu: 'Узнавать ноты по эталону. Абсолютный слух — для экспериментов', descEn: 'Name notes from a reference; perfect pitch as an experiment',
    lessons: [
      L('o1', 'Белые клавиши от до', 'White keys from C', { kind: 'noteName', set: [0, 2, 4, 5, 7, 9, 11], reference: true }),
      L('o2', 'Все 12 нот от до', 'All 12 from C', { kind: 'noteName', set: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], reference: true }),
      L('o3', 'Без эталона: до, фа, соль', 'No reference: C, F, G', { kind: 'noteName', set: [0, 5, 7], reference: false }),
      L('o4', 'Абсолютный слух', 'Perfect pitch', { kind: 'noteName', set: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], reference: false }),
    ],
  },
];

export const ALL_LESSONS = UNITS.flatMap((u) => u.lessons.map((l) => ({ ...l, unit: u })));
export type PathLesson = (typeof ALL_LESSONS)[number];
const MAIN = ALL_LESSONS.filter((l) => !l.unit.optional);

export function lessonById(id: string) {
  return ALL_LESSONS.find((l) => l.id === id);
}

/** How many distinct items a config can ask about. */
export function itemCount(cfg: ExerciseConfig): number {
  switch (cfg.kind) {
    case 'interval':
      return cfg.set.length * cfg.dirs.length;
    case 'chord':
    case 'scale':
    case 'degree':
    case 'cadence':
    case 'noteName':
      return cfg.set.length;
    case 'inversion':
      return cfg.invs.length;
    case 'function':
    case 'tonicFind':
      return 3;
    case 'intervalInKey':
      return cfg.set.length - 1;
    case 'modulation':
      return cfg.set.length;
    default:
      return 0;
  }
}

const SEQ_KINDS = new Set(['melody', 'progression', 'bass', 'rhythmDictation', 'twoVoice', 'fullDictation']);

/** Enough questions that each item comes up ~3 times; 2-option drills need more to rule out guessing. */
export function questionCount(l: Lesson): number {
  if (l.questions) return l.questions;
  const k = l.cfg.kind;
  if (k === 'pitch') return 16;
  if (k === 'sing' || k === 'rhythm' || k === 'pulse') return 6;
  if (k === 'tonicFind') return 10;
  if (SEQ_KINDS.has(k)) return 8;
  const n = itemCount(l.cfg);
  if (n <= 2) return 16;
  return Math.max(10, Math.min(30, 3 * n));
}

export function passFor(l: Lesson): number {
  if (l.pass) return l.pass;
  return SEQ_KINDS.has(l.cfg.kind) || ['sing', 'rhythm', 'pulse'].includes(l.cfg.kind) ? 0.75 : 0.8;
}

export function isUnlocked(lessonId: string, lessons: Record<string, { stars: number }>, unlockAll: boolean) {
  if (unlockAll) return true;
  const l = lessonById(lessonId);
  if (!l) return false;
  // checkpoints are always open: passing one lets you jump over the unit
  if (l.checkpoint) return true;
  // a lesson you've already passed stays open even if new lessons were inserted before it
  if ((lessons[lessonId]?.stars ?? 0) > 0) return true;
  if (l.unit.optional) {
    const i = l.unit.lessons.findIndex((x) => x.id === lessonId);
    return i <= 0 || (lessons[l.unit.lessons[i - 1].id]?.stars ?? 0) > 0;
  }
  const idx = MAIN.findIndex((x) => x.id === lessonId);
  if (idx <= 0) return true;
  return (lessons[MAIN[idx - 1].id]?.stars ?? 0) > 0;
}

/** Main-path lessons up to and including a checkpoint (to mark as passed when the checkpoint is passed). */
export function lessonsBefore(lessonId: string) {
  const idx = MAIN.findIndex((x) => x.id === lessonId);
  return idx < 0 ? [] : MAIN.slice(0, idx);
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
  rhythm: { icon: '🥁', ru: 'Ритм: повтори', en: 'Rhythm echo', descRu: 'Простучи услышанный ритм', descEn: 'Tap back the rhythm' },
  rhythmDictation: { icon: '🎼', ru: 'Ритм на слух', en: 'Rhythm dictation', descRu: 'Запиши ритм нотами', descEn: 'Write the rhythm in notes' },
  bass: { icon: '🎻', ru: 'Бас', en: 'Bass line', descRu: 'Запиши басовую линию', descEn: 'Write the bass line' },
  cadence: { icon: '🔚', ru: 'Каденции', en: 'Cadences', descRu: 'Как заканчивается фраза', descEn: 'How a phrase ends' },
  function: { icon: '⚖️', ru: 'Функции T S D', en: 'Functions T S D', descRu: 'Роль аккорда в тональности', descEn: 'The role of a chord in a key' },
  tonicFind: { icon: '🏠', ru: 'Найди тонику', en: 'Find the tonic', descRu: 'Где «дом» у мелодии', descEn: 'Where the melody is at home' },
  intervalInKey: { icon: '📏', ru: 'Интервалы в тональности', en: 'Intervals in a key', descRu: 'Интервал от тоники', descEn: 'Interval from the tonic' },
  modulation: { icon: '🔀', ru: 'Модуляции', en: 'Modulation', descRu: 'Смена тональности', descEn: 'Key changes' },
  twoVoice: { icon: '🎶', ru: 'Двухголосие', en: 'Two voices', descRu: 'Бас и мелодия вместе', descEn: 'Bass and melody together' },
  fullDictation: { icon: '📝', ru: 'Полный диктант', en: 'Full dictation', descRu: 'Высота и ритм', descEn: 'Pitch and rhythm' },
  pulse: { icon: '💓', ru: 'Пульс', en: 'Pulse', descRu: 'Стучи доли под музыку', descEn: 'Tap the beat to music' },
};

/** Difficulty levels (crowns). Level 1 = as written; higher levels change the conditions, not the pass mark. */
export const LEVELS = {
  ru: ['', 'Базовый', 'Разные тембры', 'Шире и быстрее', 'Меньше подсказок, 3 прослушивания', 'Мастер: 2 прослушивания'],
  en: ['', 'Basic', 'Varied timbres', 'Wider and faster', 'Less context, 3 listens', 'Master: 2 listens'],
};
export const MAX_LEVEL = 5;

export function levelConfig(cfg: ExerciseConfig, level: number): ExerciseConfig {
  if (level < 3) return cfg;
  switch (cfg.kind) {
    case 'degree':
      return { ...cfg, wide: true, holdKey: level < 4 ? cfg.holdKey : false, context: level >= 4 ? 'tonic' : cfg.context };
    case 'chord':
      return { ...cfg, open: true, inversions: true };
    case 'melody':
      return { ...cfg, rhythmic: true };
    case 'progression':
      return { ...cfg, inversions: level >= 4 ? true : cfg.inversions, free: level >= 5 ? true : cfg.free };
    case 'interval':
      return level >= 4 && cfg.dirs.length === 1 && cfg.dirs[0] === 'up' ? { ...cfg, dirs: ['up', 'down'] } : cfg;
    default:
      return cfg;
  }
}
