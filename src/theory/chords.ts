export interface ChordDef {
  id: string;
  ru: string;
  en: string;
  symbol: string;
  intervals: number[];
  hint?: { ru: string; en: string };
}

export const CHORDS: ChordDef[] = [
  { id: 'maj', ru: 'Мажор', en: 'Major', symbol: '', intervals: [0, 4, 7], hint: { ru: 'Светлый, устойчивый', en: 'Bright, stable' } },
  { id: 'min', ru: 'Минор', en: 'Minor', symbol: 'm', intervals: [0, 3, 7], hint: { ru: 'Грустный, мягкий', en: 'Sad, soft' } },
  { id: 'dim', ru: 'Уменьшённый', en: 'Diminished', symbol: '°', intervals: [0, 3, 6], hint: { ru: 'Напряжённый, тесный', en: 'Tense, cramped' } },
  { id: 'aug', ru: 'Увеличенный', en: 'Augmented', symbol: '+', intervals: [0, 4, 8], hint: { ru: 'Загадочный, «повисший»', en: 'Mysterious, floating' } },
  { id: 'sus2', ru: 'Sus2', en: 'Sus2', symbol: 'sus2', intervals: [0, 2, 7], hint: { ru: 'Открытый, пустой', en: 'Open, airy' } },
  { id: 'sus4', ru: 'Sus4', en: 'Sus4', symbol: 'sus4', intervals: [0, 5, 7], hint: { ru: 'Хочет разрешиться в мажор', en: 'Wants to resolve' } },
  { id: 'maj7', ru: 'Большой мажорный септ.', en: 'Major 7th', symbol: 'maj7', intervals: [0, 4, 7, 11], hint: { ru: 'Мечтательный, джазовый', en: 'Dreamy, jazzy' } },
  { id: 'dom7', ru: 'Доминантсептаккорд', en: 'Dominant 7th', symbol: '7', intervals: [0, 4, 7, 10], hint: { ru: 'Блюзовый, тянет к тонике', en: 'Bluesy, pulls home' } },
  { id: 'min7', ru: 'Малый минорный септ.', en: 'Minor 7th', symbol: 'm7', intervals: [0, 3, 7, 10], hint: { ru: 'Мягкий, соул', en: 'Mellow, soulful' } },
  { id: 'm7b5', ru: 'Малый уменьшённый (полууменьш.)', en: 'Half-diminished', symbol: 'm7♭5', intervals: [0, 3, 6, 10], hint: { ru: 'Тёмный, неустойчивый', en: 'Dark, unstable' } },
  { id: 'dim7', ru: 'Уменьшённый септ.', en: 'Diminished 7th', symbol: '°7', intervals: [0, 3, 6, 9], hint: { ru: 'Драматичный, киношный', en: 'Dramatic, cinematic' } },
  { id: 'mMaj7', ru: 'Минорный с большой септимой', en: 'Minor-major 7th', symbol: 'm(maj7)', intervals: [0, 3, 7, 11], hint: { ru: 'Шпионский, нуарный', en: 'Spy-movie noir' } },
  { id: 'maj6', ru: 'Мажорный с секстой (6)', en: 'Major 6th', symbol: '6', intervals: [0, 4, 7, 9], hint: { ru: 'Ретро, свинг', en: 'Retro, swing' } },
  { id: 'add9', ru: 'Add9', en: 'Add9', symbol: 'add9', intervals: [0, 4, 7, 14], hint: { ru: 'Яркий, поп', en: 'Shimmering pop' } },
  { id: 'dom9', ru: 'Доминантнонаккорд', en: 'Dominant 9th', symbol: '9', intervals: [0, 4, 7, 10, 14], hint: { ru: 'Фанк', en: 'Funky' } },
];

export const chordById = (id: string) => CHORDS.find((c) => c.id === id)!;

/** Apply an inversion (0 = root position) by raising the lowest notes an octave. */
export function invert(intervals: number[], inversion: number): number[] {
  const r = [...intervals];
  for (let i = 0; i < inversion; i++) {
    const low = r.shift()!;
    r.push(low + 12);
  }
  const base = r[0];
  return r.map((x) => x - base);
}

export const INVERSION_NAMES = {
  ru: ['Основной вид', '1-е обращение', '2-е обращение', '3-е обращение'],
  /** classical Russian names: [triad names, seventh-chord names] */
  ruTriad: ['Трезвучие', 'Секстаккорд', 'Квартсекстаккорд'],
  ruSeventh: ['Септаккорд', 'Квинтсекстаккорд', 'Терцквартаккорд', 'Секундаккорд'],
  en: ['Root position', '1st inversion', '2nd inversion', '3rd inversion'],
};
