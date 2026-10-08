export type NoteNaming = 'letter' | 'solfege';

const LETTER_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const LETTER_FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const SOLF_RU_SHARP = ['До', 'До♯', 'Ре', 'Ре♯', 'Ми', 'Фа', 'Фа♯', 'Соль', 'Соль♯', 'Ля', 'Ля♯', 'Си'];
const SOLF_RU_FLAT = ['До', 'Ре♭', 'Ре', 'Ми♭', 'Ми', 'Фа', 'Соль♭', 'Соль', 'Ля♭', 'Ля', 'Си♭', 'Си'];
const SOLF_EN_SHARP = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const SOLF_EN_FLAT = ['Do', 'Re♭', 'Re', 'Mi♭', 'Mi', 'Fa', 'Sol♭', 'Sol', 'La♭', 'La', 'Si♭', 'Si'];

export const pc = (midi: number) => ((midi % 12) + 12) % 12;
export const octaveOf = (midi: number) => Math.floor(midi / 12) - 1;
export const isBlack = (midi: number) => [1, 3, 6, 8, 10].includes(pc(midi));
export const midiToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
export const freqToMidi = (f: number) => 69 + 12 * Math.log2(f / 440);

export function pcName(p: number, naming: NoteNaming, lang: 'ru' | 'en', preferFlat = false): string {
  const i = pc(p);
  if (naming === 'letter') return (preferFlat ? LETTER_FLAT : LETTER_SHARP)[i];
  if (lang === 'ru') return (preferFlat ? SOLF_RU_FLAT : SOLF_RU_SHARP)[i];
  return (preferFlat ? SOLF_EN_FLAT : SOLF_EN_SHARP)[i];
}

export function noteName(midi: number, naming: NoteNaming, lang: 'ru' | 'en', withOctave = false, preferFlat = false) {
  const n = pcName(midi, naming, lang, preferFlat);
  return withOctave ? `${n}${octaveOf(midi)}` : n;
}

/** Major keys that are conventionally spelled with flats (F, B♭, E♭, A♭, D♭). */
export const FLAT_KEYS = new Set([5, 10, 3, 8, 1]);
/** Minor keys spelled with flats (C, D, F, G, B♭ minor; E♭ minor as well). */
export const MINOR_FLAT_KEYS = new Set([0, 2, 5, 7, 10]);

/** Should notes in this key be written with flats? */
export const keyFlats = (tonic: number, minor = false) => (minor ? MINOR_FLAT_KEYS : FLAT_KEYS).has(pc(tonic));
