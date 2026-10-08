import { chordById, INVERSION_NAMES } from '../theory/chords';
import { intervalBySemis } from '../theory/intervals';
import { NoteNaming, pcName } from '../theory/notes';
import { degreeById, scaleById, SOLF_RU } from '../theory/scales';
import { KIND_META } from './curriculum';
import { cellById } from '../theory/rhythmCells';
import type { Lang } from './store';

const PREFIX_KIND: Record<string, keyof typeof KIND_META> = {
  pitch: 'pitch',
  int: 'interval',
  chord: 'chord',
  inv: 'inversion',
  scale: 'scale',
  deg: 'degree',
  mel: 'melody',
  prog: 'progression',
  note: 'noteName',
  sing: 'sing',
  singdeg: 'sing',
  singint: 'sing',
  rhythm: 'rhythm',
  rdict: 'rhythmDictation',
  bass: 'bass',
  cad: 'cadence',
  fn: 'function',
  tonic: 'tonicFind',
  iik: 'intervalInKey',
  mod: 'modulation',
  pulse: 'pulse',
};

export const kindOfKey = (key: string) => PREFIX_KIND[key.split(':')[0]];

export function labelForKey(key: string, lang: Lang, naming: NoteNaming): string {
  const [p, a, b] = key.split(':');
  const ru = lang === 'ru';
  try {
    switch (p) {
      case 'pitch':
        return (ru ? 'Высота: ' : 'Pitch: ') + ({ wide: ru ? 'крупно' : 'wide', mid: ru ? 'средне' : 'medium', fine: ru ? 'тонко' : 'fine' }[a] ?? a);
      case 'int': {
        const i = intervalBySemis(Number(a));
        const d = { up: '↑', down: '↓', harm: '⇅' }[b] ?? '';
        return `${ru ? i.ru : i.en} ${d}`;
      }
      case 'chord': {
        const c = chordById(a);
        return ru ? c.ru : c.en;
      }
      case 'inv':
        return INVERSION_NAMES[lang][Number(a)];
      case 'scale': {
        const s = scaleById(a);
        return ru ? s.ru : s.en;
      }
      case 'deg': {
        const d = degreeById(a.replace(',', ''));
        return `${ru ? 'Ступень' : 'Degree'} ${d.label}${a.endsWith(',') ? '̣' : ''} (${ru ? SOLF_RU[d.solf] : d.solf.toLowerCase()})${b === 'm' ? (ru ? ', минор' : ', minor') : ''}`;
      }
      case 'mel': {
        const d = degreeById(a);
        return `${ru ? 'Диктант: ' : 'Dictation: '}${d.label}`;
      }
      case 'prog':
        return `${ru ? 'Аккорд' : 'Chord'} ${a}`;
      case 'note':
        return `${ru ? 'Нота' : 'Note'} ${pcName(Number(a), naming, lang)}`;
      case 'sing':
      case 'singdeg':
      case 'singint':
        return ru ? 'Пение' : 'Singing';
      case 'rhythm':
        return `${ru ? 'Ритм' : 'Rhythm'} ${'★'.repeat(Number(a))}`;
      case 'rdict': {
        const c = cellById(a);
        return `${ru ? 'Ритм' : 'Rhythm'}: ${ru ? c.ru : c.en}`;
      }
      case 'bass': {
        const d = degreeById(a);
        return `${ru ? 'Бас' : 'Bass'}: ${d.label}`;
      }
      case 'cad':
        return `${ru ? 'Каденция' : 'Cadence'} ${a}`;
      case 'fn':
        return `${ru ? 'Функция' : 'Function'}: ${a}`;
      case 'tonic':
        return ru ? 'Найти тонику' : 'Find the tonic';
      case 'iik': {
        const i = intervalBySemis(Number(a));
        return `${ru ? i.ru : i.en} ${ru ? 'от тоники' : 'from tonic'}`;
      }
      case 'mod':
        return `${ru ? 'Модуляция' : 'Modulation'}: ${a}`;
      case 'pulse':
        return ru ? 'Пульс' : 'Pulse';
    }
  } catch {
    /* unknown */
  }
  return key;
}
