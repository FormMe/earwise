export interface ScaleDef {
  id: string;
  ru: string;
  en: string;
  steps: number[];
  hint?: { ru: string; en: string };
}

export const SCALES: ScaleDef[] = [
  { id: 'major', ru: 'Мажор (ионийский)', en: 'Major (Ionian)', steps: [0, 2, 4, 5, 7, 9, 11], hint: { ru: 'Светлый, «до-ре-ми»', en: 'Bright do-re-mi' } },
  { id: 'minor', ru: 'Натуральный минор', en: 'Natural minor', steps: [0, 2, 3, 5, 7, 8, 10], hint: { ru: 'Печальный', en: 'Sad' } },
  { id: 'harmMinor', ru: 'Гармонический минор', en: 'Harmonic minor', steps: [0, 2, 3, 5, 7, 8, 11], hint: { ru: 'Восточная увеличенная секунда (♭6→7)', en: 'Exotic augmented 2nd (♭6→7)' } },
  { id: 'melMinor', ru: 'Мелодический минор (джазовый)', en: 'Melodic minor', steps: [0, 2, 3, 5, 7, 9, 11], hint: { ru: 'Минор внизу, мажор вверху', en: 'Minor bottom, major top' } },
  { id: 'dorian', ru: 'Дорийский', en: 'Dorian', steps: [0, 2, 3, 5, 7, 9, 10], hint: { ru: 'Минор с высокой 6 ступенью', en: 'Minor with a raised 6th' } },
  { id: 'phrygian', ru: 'Фригийский', en: 'Phrygian', steps: [0, 1, 3, 5, 7, 8, 10], hint: { ru: 'Испанский, м2 в начале', en: 'Spanish, flat 2' } },
  { id: 'lydian', ru: 'Лидийский', en: 'Lydian', steps: [0, 2, 4, 6, 7, 9, 11], hint: { ru: 'Сказочный, ув4', en: 'Dreamy, raised 4' } },
  { id: 'mixolydian', ru: 'Миксолидийский', en: 'Mixolydian', steps: [0, 2, 4, 5, 7, 9, 10], hint: { ru: 'Рок-мажор, м7', en: 'Rock major, flat 7' } },
  { id: 'locrian', ru: 'Локрийский', en: 'Locrian', steps: [0, 1, 3, 5, 6, 8, 10], hint: { ru: 'Самый тёмный, ум5', en: 'Darkest, flat 5' } },
  { id: 'majPent', ru: 'Мажорная пентатоника', en: 'Major pentatonic', steps: [0, 2, 4, 7, 9], hint: { ru: 'Кантри, фолк', en: 'Country, folk' } },
  { id: 'minPent', ru: 'Минорная пентатоника', en: 'Minor pentatonic', steps: [0, 3, 5, 7, 10], hint: { ru: 'Рок-соло', en: 'Rock solos' } },
  { id: 'blues', ru: 'Блюзовая', en: 'Blues', steps: [0, 3, 5, 6, 7, 10], hint: { ru: 'С «блюзовой нотой»', en: 'With the blue note' } },
  { id: 'wholeTone', ru: 'Целотонная', en: 'Whole tone', steps: [0, 2, 4, 6, 8, 10], hint: { ru: 'Сон, Дебюсси', en: 'Dream sequence' } },
];

export const scaleById = (id: string) => SCALES.find((s) => s.id === id)!;

export const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export const NAT_MINOR = [0, 2, 3, 5, 7, 8, 10];

/** Scale degrees within an octave, incl. chromatic ones. id → semitones above tonic */
export interface DegreeDef {
  id: string;
  semis: number;
  label: string;
  solf: string;
}

export const DEGREES: DegreeDef[] = [
  { id: '1', semis: 0, label: '1', solf: 'Do' },
  { id: 'b2', semis: 1, label: '♭2', solf: 'Ra' },
  { id: '2', semis: 2, label: '2', solf: 'Re' },
  { id: 'b3', semis: 3, label: '♭3', solf: 'Me' },
  { id: '3', semis: 4, label: '3', solf: 'Mi' },
  { id: '4', semis: 5, label: '4', solf: 'Fa' },
  { id: '#4', semis: 6, label: '♯4', solf: 'Fi' },
  { id: '5', semis: 7, label: '5', solf: 'Sol' },
  { id: 'b6', semis: 8, label: '♭6', solf: 'Le' },
  { id: '6', semis: 9, label: '6', solf: 'La' },
  { id: 'b7', semis: 10, label: '♭7', solf: 'Te' },
  { id: '7', semis: 11, label: '7', solf: 'Ti' },
  { id: '8', semis: 12, label: '1̇', solf: 'Do' },
];

export const degreeById = (id: string) => DEGREES.find((d) => d.id === id)!;
export const degreeBySemis = (s: number) => DEGREES.find((d) => d.semis === ((s % 12) + 12) % 12)!;

/** Romanized solfege for Russian UI (movable do) */
export const SOLF_RU: Record<string, string> = {
  Do: 'до', Ra: 'ра', Re: 'ре', Me: 'ме', Mi: 'ми', Fa: 'фа', Fi: 'фи', Sol: 'соль', Le: 'ле', La: 'ля', Te: 'те', Ti: 'си',
};
