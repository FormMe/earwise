import type { NoteEvent } from '../audio/engine';
import { CHORDS, chordById, invert, INVERSION_NAMES } from '../theory/chords';
import { cadence, generateProgression, romanById, voiceChord, voiceProgression } from '../theory/harmony';
import { INTERVALS, intervalBySemis } from '../theory/intervals';
import { generateMelody } from '../theory/melody';
import { keyFlats, noteName, pc, pcName } from '../theory/notes';
import { pick, randInt, weightedPick } from '../theory/random';
import { generateRhythm } from '../theory/rhythm';
import { DEGREES, degreeById, degreeBySemis, MAJOR, NAT_MINOR, scaleById, SOLF_RU } from '../theory/scales';
import type { AccompStyle, CadenceType, Choice, Dir, ExerciseConfig, GenCtx, Question } from './types';
import { cellById, cellsForLevel, cellsToDurations, generateBeatRhythm } from '../theory/rhythmCells';
import { genFullDictation, genFunction, genIntervalInKey, genModulation, genPulse, genTonicFind, genTwoVoice } from './generate2';

export const tr = (ctx: GenCtx, ru: string, en: string) => (ctx.lang === 'ru' ? ru : en);
/** Russian plural: 1 нота, 2 ноты, 5 нот */
export const ruPlural = (n: number, one: string, few: string, many: string) =>
  n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many;

export function pickKey<T>(ctx: GenCtx, items: T[], key: (t: T) => string): T {
  return weightedPick(ctx.rng, items, (t) => {
    const k = key(t);
    return ctx.weight(k) * (k === ctx.prevKey && items.length > 1 ? 0.25 : 1);
  });
}

export const solf = (ctx: GenCtx, s: string) => (ctx.lang === 'ru' ? SOLF_RU[s] : s.toLowerCase());

export function generate(cfg: ExerciseConfig, ctx: GenCtx): Question {
  switch (cfg.kind) {
    case 'pitch':
      return genPitch(cfg, ctx);
    case 'interval':
      return genInterval(cfg, ctx);
    case 'chord':
      return genChord(cfg, ctx);
    case 'inversion':
      return genInversion(cfg, ctx);
    case 'scale':
      return genScale(cfg, ctx);
    case 'degree':
      return genDegree(cfg, ctx);
    case 'melody':
      return genMelody(cfg, ctx);
    case 'progression':
      return genProgression(cfg, ctx);
    case 'noteName':
      return genNoteName(cfg, ctx);
    case 'sing':
      return genSing(cfg, ctx);
    case 'rhythm':
      return genRhythm(cfg, ctx);
    case 'rhythmDictation':
      return genRhythmDictation(cfg, ctx);
    case 'bass':
      return genBass(cfg, ctx);
    case 'cadence':
      return genCadence(cfg, ctx);
    case 'function':
      return genFunction(cfg, ctx);
    case 'tonicFind':
      return genTonicFind(cfg, ctx);
    case 'intervalInKey':
      return genIntervalInKey(cfg, ctx);
    case 'modulation':
      return genModulation(cfg, ctx);
    case 'twoVoice':
      return genTwoVoice(cfg, ctx);
    case 'fullDictation':
      return genFullDictation(cfg, ctx);
    case 'pulse':
      return genPulse(cfg, ctx);
  }
}

// ───────────────────────── pitch ─────────────────────────
function genPitch(cfg: Extract<ExerciseConfig, { kind: 'pitch' }>, ctx: GenCtx): Question {
  const buckets = [
    { id: 'wide', min: 6, max: 12 },
    { id: 'mid', min: 3, max: 5 },
    { id: 'fine', min: 1, max: 2 },
  ].filter((b) => b.max >= cfg.min && b.min <= cfg.max);
  const b = pickKey(ctx, buckets, (x) => `pitch:${x.id}`);
  const diff = randInt(ctx.rng, Math.max(b.min, cfg.min), Math.min(b.max, cfg.max));
  const up = ctx.rng() < 0.5;
  const a = randInt(ctx.rng, 55, 74);
  const c = a + (up ? diff : -diff);
  const d = 0.8 * ctx.tempo;
  return {
    kind: 'pitch',
    prompt: tr(ctx, 'Вторая нота выше или ниже первой?', 'Is the second note higher or lower?'),
    stimulus: [
      { t: 0, d, midi: a },
      { t: d * 1.1, d, midi: c },
    ],
    input: 'choice',
    choices: [
      { id: 'down', label: tr(ctx, 'Ниже ↓', 'Lower ↓') },
      { id: 'up', label: tr(ctx, 'Выше ↑', 'Higher ↑') },
    ],
    answer: [up ? 'up' : 'down'],
    itemKeys: [`pitch:${b.id}`],
    answerLabel: up ? tr(ctx, 'Выше', 'Higher') : tr(ctx, 'Ниже', 'Lower'),
    explain: tr(ctx, `Разница: ${diff} ${ruPlural(diff, 'полутон', 'полутона', 'полутонов')}`, `Difference: ${diff} semitone(s)`),
  };
}

// ───────────────────────── intervals ─────────────────────────
export function intervalEvents(root: number, semis: number, dir: Dir, tempo: number): NoteEvent[] {
  const d = 0.85 * tempo;
  if (dir === 'harm') return [{ t: 0, d: 1.7 * tempo, midi: [root, root + semis] }];
  if (dir === 'up')
    return [
      { t: 0, d, midi: root },
      { t: d * 1.05, d: d * 1.2, midi: root + semis },
    ];
  return [
    { t: 0, d, midi: root },
    { t: d * 1.05, d: d * 1.2, midi: root - semis },
  ];
}

function genInterval(cfg: Extract<ExerciseConfig, { kind: 'interval' }>, ctx: GenCtx): Question {
  const combos = cfg.set.flatMap((s) => cfg.dirs.map((dir) => ({ s, dir })));
  const { s, dir } = pickKey(ctx, combos, (x) => `int:${x.s}:${x.dir}`);
  let root: number;
  if (dir === 'down') root = ctx.fixedRoot ? 72 : randInt(ctx.rng, Math.max(60, 45 + s), 79);
  // harmonic seconds are mush in the low register
  else root = ctx.fixedRoot ? 60 : randInt(ctx.rng, dir === 'harm' ? 55 : 48, Math.max(dir === 'harm' ? 55 : 48, 79 - s));
  const def = intervalBySemis(s);
  const name = (sm: number) => (ctx.lang === 'ru' ? intervalBySemis(sm).ru : intervalBySemis(sm).en);
  const short = (sm: number) => (ctx.lang === 'ru' ? intervalBySemis(sm).short : intervalBySemis(sm).id);
  const choices: Choice[] = [...cfg.set]
    .sort((a, b) => a - b)
    .map((sm) => ({ id: String(sm), label: short(sm), sub: name(sm), audio: intervalEvents(root, sm, dir, ctx.tempo) }));
  // Russian song titles only make sense in the Russian UI
  const allSongs = dir === 'down' ? def.down : def.up;
  const songs = ctx.lang === 'ru' ? allSongs : allSongs?.filter((x) => !/[а-яё]/i.test(x));
  const dirLabel = { up: tr(ctx, 'восходящий', 'ascending'), down: tr(ctx, 'нисходящий', 'descending'), harm: tr(ctx, 'гармонический', 'harmonic') }[dir];
  const prompt =
    cfg.dirs.length > 1
      ? tr(ctx, `Какой интервал? (${dirLabel})`, `Which interval? (${dirLabel})`)
      : tr(ctx, 'Какой интервал прозвучал?', 'Which interval did you hear?');
  const alt: Question['alt'] = [];
  if (dir === 'harm')
    alt.push({
      label: tr(ctx, 'По очереди', 'Melodic'),
      events: intervalEvents(root, s, 'up', ctx.tempo),
    });
  return {
    kind: 'interval',
    prompt,
    stimulus: intervalEvents(root, s, dir, ctx.tempo),
    alt,
    input: 'choice',
    choices,
    answer: [String(s)],
    itemKeys: [`int:${s}:${dir}`],
    answerLabel: name(s),
    explain:
      songs?.length && dir !== 'harm' && ctx.lang === 'ru'
        ? `🎵 Как в: ${songs.join(', ')}`
        : songs?.length && dir !== 'harm'
          ? `🎵 Like: ${songs.join(', ')}`
          : undefined,
  };
}

// ───────────────────────── chords ─────────────────────────
export function chordEvents(notes: number[], tempo: number, arp = false): NoteEvent[] {
  if (arp)
    return notes.map((m, i) => ({ t: i * 0.38 * tempo, d: (notes.length - i) * 0.38 * tempo + 0.6, midi: m, vel: 0.7 }));
  return [{ t: 0, d: 1.8 * tempo, midi: notes, strum: 0.012 }];
}

function genChord(cfg: Extract<ExerciseConfig, { kind: 'chord' }>, ctx: GenCtx): Question {
  const id = pickKey(ctx, cfg.set, (x) => `chord:${x}`);
  const def = chordById(id);
  // big chords sound muddy low: keep their root higher
  const root = def.intervals.length > 3 ? randInt(ctx.rng, 55, 63) : randInt(ctx.rng, 50, 62);
  // sus2/sus4, 6/m7 and add9 turn into each other when inverted, so they always stay in root position
  const ambiguous = ['sus2', 'sus4', 'maj6', 'add9', 'dom9', 'min7', 'aug', 'dim7'].includes(id);
  const inv = cfg.inversions && !ambiguous ? randInt(ctx.rng, 0, def.intervals.length - 1) : 0;
  const shape = invert(def.intervals, inv);
  const bass = root + def.intervals[inv] - (inv ? 12 : 0);
  let notes = shape.map((x) => bass + x);
  // open voicing: bass an octave down, second voice raised (drop-2 style) — never below E2
  if (cfg.open && ctx.rng() < 0.6 && notes[0] - 12 >= 40) notes = [notes[0] - 12, ...notes.slice(2), notes[1] + 12].sort((a, b) => a - b);
  const choices = cfg.set.map((cid) => {
    const c = chordById(cid);
    return {
      id: cid,
      label: ctx.lang === 'ru' ? c.ru : c.en,
      sub: c.hint ? (ctx.lang === 'ru' ? c.hint.ru : c.hint.en) : undefined,
      audio: chordEvents(c.intervals.map((x) => root + x), ctx.tempo),
    };
  });
  return {
    kind: 'chord',
    prompt: tr(ctx, 'Какой это аккорд?', 'What chord quality is this?'),
    stimulus: chordEvents(notes, ctx.tempo),
    alt: [{ label: tr(ctx, 'По одной ноте', 'Note by note'), events: chordEvents(notes, ctx.tempo, true) }],
    input: 'choice',
    choices,
    answer: [id],
    itemKeys: [`chord:${id}`],
    answerLabel: `${ctx.lang === 'ru' ? def.ru : def.en} (${pcName(root, ctx.naming, ctx.lang, [3, 8, 10].includes(pc(root)))}${def.symbol})`,
    explain: def.hint ? (ctx.lang === 'ru' ? def.hint.ru : def.hint.en) : undefined,
  };
}

function genInversion(cfg: Extract<ExerciseConfig, { kind: 'inversion' }>, ctx: GenCtx): Question {
  const chordId = pick(ctx.rng, cfg.chords);
  const def = chordById(chordId);
  const invs = cfg.invs.filter((i) => i < def.intervals.length);
  const inv = pickKey(ctx, invs, (i) => `inv:${i}`);
  const root = randInt(ctx.rng, 57, 64);
  const shape = invert(def.intervals, inv);
  const bassNote = root + def.intervals[inv] - 12;
  const voicing = (i: number) => {
    const sh = invert(def.intervals, i);
    const b = root + def.intervals[i] - 12;
    return sh.map((x) => b + x);
  };
  const notes = shape.map((x) => bassNote + x);
  const names = INVERSION_NAMES[ctx.lang];
  return {
    kind: 'inversion',
    prompt: tr(ctx, `Какое обращение? (${def.ru.toLowerCase()})`, `Which inversion? (${def.en.toLowerCase()})`),
    stimulus: chordEvents(notes, ctx.tempo),
    alt: [{ label: tr(ctx, 'Арпеджио', 'Arpeggio'), events: chordEvents(notes, ctx.tempo, true) }],
    input: 'choice',
    choices: invs.map((i) => ({ id: String(i), label: names[i], audio: chordEvents(voicing(i), ctx.tempo) })),
    answer: [String(inv)],
    itemKeys: [`inv:${inv}`],
    answerLabel: names[inv],
    explain: tr(ctx, 'Слушай самую нижнюю ноту — бас: прима, терция, квинта или септима?', 'Listen to the bass: root, 3rd, 5th or 7th?'),
  };
}

// ───────────────────────── scales ─────────────────────────
function scaleEvents(tonic: number, steps: number[], dir: 'up' | 'down' | 'both', tempo: number): NoteEvent[] {
  const up = [...steps, 12].map((s) => tonic + s);
  const seq = dir === 'up' ? up : dir === 'down' ? [...up].reverse() : [...up, ...[...up].reverse().slice(1)];
  const step = 0.3 * tempo;
  return seq.map((m, i) => ({ t: i * step, d: i === seq.length - 1 ? 0.9 : step * 1.1, midi: m, vel: 0.75 }));
}

function genScale(cfg: Extract<ExerciseConfig, { kind: 'scale' }>, ctx: GenCtx): Question {
  const id = pickKey(ctx, cfg.set, (x) => `scale:${x}`);
  const def = scaleById(id);
  const tonic = randInt(ctx.rng, 55, 64);
  const dir = cfg.dir ?? 'up';
  const stimulus = cfg.vamp ? modeVampEvents(ctx, tonic, def.steps) : scaleEvents(tonic, def.steps, dir, ctx.tempo);
  return {
    kind: 'scale',
    prompt: cfg.vamp ? tr(ctx, 'В каком ладу эта мелодия?', 'Which mode is this melody in?') : tr(ctx, 'Какой лад / гамма?', 'Which scale or mode?'),
    stimulus,
    alt: cfg.vamp ? [{ label: tr(ctx, 'Гамма', 'Scale'), events: scaleEvents(tonic, def.steps, 'up', ctx.tempo) }] : undefined,
    input: 'choice',
    choices: cfg.set.map((sid) => {
      const s = scaleById(sid);
      return {
        id: sid,
        label: ctx.lang === 'ru' ? s.ru : s.en,
        sub: s.hint ? (ctx.lang === 'ru' ? s.hint.ru : s.hint.en) : undefined,
        audio: scaleEvents(tonic, s.steps, 'up', ctx.tempo),
      };
    }),
    answer: [id],
    itemKeys: [`scale:${id}`],
    answerLabel: ctx.lang === 'ru' ? def.ru : def.en,
    explain: def.hint ? (ctx.lang === 'ru' ? def.hint.ru : def.hint.en) : undefined,
  };
}

/** A drone (tonic + fifth) under a short modal melody that leans on the mode's colour notes. */
function modeVampEvents(ctx: GenCtx, tonic: number, steps: number[]): NoteEvent[] {
  const pool = [...steps, 12];
  const mel = generateMelody(ctx.rng, { pool, length: 9, startOnTonic: true, endOnTonic: true, maxLeap: 4 });
  // make sure every scale step is heard at least once: append a turn through any missing ones
  const missing = steps.filter((x) => !mel.includes(x));
  const line = [...mel.slice(0, -1), ...missing.sort((a, b) => a - b), 0];
  const step = 0.42 * ctx.tempo;
  const durs = line.map((_, i) => (i % 4 === 3 || i === line.length - 1 ? 2 : 1));
  const out: NoteEvent[] = [];
  let t = 0.6;
  line.forEach((x, i) => {
    out.push({ t, d: durs[i] * step * 0.95, midi: tonic + x, vel: 0.8 });
    t += durs[i] * step;
  });
  // drone: tonic + fifth, or just octaves for modes without a perfect fifth (Locrian)
  out.unshift({ t: 0, d: t + 0.6, midi: steps.includes(7) ? [tonic - 12, tonic - 5] : [tonic - 12, tonic], vel: 0.3, inst: 'organ' });
  return out;
}

// ───────────────────────── functional degrees ─────────────────────────
export function cadenceEvents(tonic: number, minor: boolean, tempo: number): { events: NoteEvent[]; end: number } {
  const chords = cadence(tonic, minor);
  const d = 0.55 * tempo;
  const events = chords.map((c, i) => ({ t: i * d, d: i === chords.length - 1 ? d * 1.6 : d * 0.98, midi: c, vel: 0.5 }));
  return { events, end: chords.length * d + d * 0.9 };
}

/** Walk from a degree to the nearest tonic along the scale, Functional-Ear-Trainer style. */
const CHROMATIC_RES: Record<number, number[]> = {
  1: [1, 0],
  3: [3, 2, 0],
  6: [6, 7, 9, 11, 12],
  8: [8, 7, 5, 4, 2, 0],
  10: [10, 9, 7, 5, 4, 2, 0],
};

export function resolution(semis: number, minor: boolean): number[] {
  // altered notes resolve along their own tendency (♯4 up to 5, ♭6 down to 5, ♭7 down to 6…)
  if (!minor && CHROMATIC_RES[semis]) return CHROMATIC_RES[semis];
  if (minor) {
    const MINOR_RES: Record<number, number[]> = { 11: [11, 12], 9: [9, 11, 12], 1: [1, 0], 4: [4, 3, 2, 0], 6: [6, 7, 8, 7] };
    if (MINOR_RES[semis]) return MINOR_RES[semis];
  }
  const scale = minor ? NAT_MINOR : MAJOR;
  const full = [...scale, 12];
  const path = [semis];
  const goUp = semis >= 7 && !(minor && semis === 7);
  let cur = semis;
  if (goUp) {
    while (cur < 12) {
      cur = full.find((s) => s > cur) ?? 12;
      path.push(cur);
    }
  } else {
    while (cur > 0) {
      const lower = [...full].reverse().find((s) => s < cur);
      cur = lower ?? 0;
      path.push(cur);
    }
  }
  return path;
}

/** degree id + optional "," (octave below) */
export const melSemis = (id: string) => (id.endsWith(',') ? degreeById(id.slice(0, -1)).semis - 12 : degreeById(id).semis);

export function tonicFor(ctx: GenCtx) {
  return ctx.fixedRoot ? 60 : randInt(ctx.rng, 55, 66);
}

export function degreeLabel(ctx: GenCtx, id: string) {
  const low = id.endsWith(',');
  const d = degreeById(low ? id.slice(0, -1) : id);
  return { label: low ? `${d.label}̣` : d.label, sub: solf(ctx, d.solf) };
}

function genDegree(cfg: Extract<ExerciseConfig, { kind: 'degree' }>, ctx: GenCtx): Question {
  const minor = !!cfg.minor;
  const mode = minor ? 'm' : 'M';
  const id = pickKey(ctx, cfg.set, (x) => `deg:${x}:${mode}`);
  const low = id.endsWith(',');
  const deg = degreeById(low ? id.slice(0, -1) : id);
  const semis = melSemis(id);
  const tonic = cfg.holdKey && ctx.keyTonic != null ? ctx.keyTonic : tonicFor(ctx);
  let note = tonic + semis;
  if (cfg.wide && ctx.rng() < 0.4 && deg.semis !== 12 && !low) note += ctx.rng() < 0.5 ? -12 : 12;
  // context: full cadence, or (when the key is held / at higher levels) just the tonic
  const tonicOnly = cfg.context === 'tonic' || (cfg.holdKey && !ctx.keyIsNew);
  const cad = tonicOnly ? { events: [{ t: 0, d: 0.8, midi: tonic, vel: 0.55 }] as NoteEvent[], end: 1.1 * ctx.tempo } : cadenceEvents(tonic, minor, ctx.tempo);
  const stimulus = [...cad.events, { t: cad.end, d: 1.3, midi: note }];
  const base = ((semis % 12) + 12) % 12;
  const res = resolution(base === 0 && semis === 12 ? 12 : base, minor).map((s) => note - (base === 0 && semis === 12 ? 12 : base) + s);
  const step = 0.42 * ctx.tempo;
  const keyName = pcName(tonic, ctx.naming, ctx.lang, keyFlats(tonic, minor));
  return {
    kind: 'degree',
    prompt: tr(ctx, `Какая это ступень? (${keyName} ${minor ? 'минор' : 'мажор'})`, `Which scale degree? (${keyName} ${minor ? 'minor' : 'major'})`),
    stimulus,
    alt: [
      { label: tr(ctx, 'Только нота', 'Note only'), events: [{ t: 0, d: 1.3, midi: note }] },
      { label: tr(ctx, 'Тоника', 'Tonic'), events: [{ t: 0, d: 1.2, midi: tonic }] },
    ],
    input: 'choice',
    choices: [...cfg.set]
      .sort((a, b) => melSemis(a) - melSemis(b))
      .map((cid) => ({
        id: cid,
        ...degreeLabel(ctx, cid),
        audio: [{ t: 0, d: 1, midi: tonic + melSemis(cid) }],
      })),
    answer: [id],
    itemKeys: [`deg:${id}:${mode}`],
    answerLabel: `${degreeLabel(ctx, id).label} (${solf(ctx, deg.solf)})`,
    afterAnswer: res.map((m, i) => ({ t: i * step, d: i === res.length - 1 ? 1 : step, midi: m, vel: 0.7 })),
    explain: tr(ctx, 'Слушай, как нота разрешается в тонику', 'Hear how the note resolves to the tonic'),
  };
}

// ───────────────────────── melodic dictation ─────────────────────────

/** Note values (in eighths) for a singable phrase: mostly quarters/eighths, long final note, filling whole 4/4 bars. */
export function phraseRhythm(ctx: GenCtx, n: number): number[] {
  const durs: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const r = ctx.rng();
    durs.push(r < 0.45 ? 2 : r < 0.8 ? 1 : r < 0.92 ? 3 : 4);
  }
  // pair up lone eighths so the beat stays clear
  for (let i = 0; i < durs.length; i++) {
    if (durs[i] === 1 && durs[i + 1] !== 1 && i + 1 < durs.length) durs[i + 1] = 1;
    if (durs[i] === 3 && i + 1 < durs.length) durs[i + 1] = 1;
  }
  const used = durs.reduce((a, b) => a + b, 0);
  const bar = 8;
  let last = bar - (used % bar);
  if (last < 2) last += bar;
  durs.push(last);
  return durs;
}

function genMelody(cfg: Extract<ExerciseConfig, { kind: 'melody' }>, ctx: GenCtx): Question {
  const minor = !!cfg.minor;
  const tonic = tonicFor(ctx);
  const poolIds = cfg.set;
  const semisToId = new Map(poolIds.map((id) => [melSemis(id), id]));
  const pool = poolIds.map(melSemis);
  const mel = generateMelody(ctx.rng, {
    pool,
    length: cfg.length,
    startOnTonic: cfg.startOnTonic,
    endOnTonic: cfg.endOnTonic ?? true,
    maxLeap: cfg.maxLeap ?? 7,
  });
  const cad = cadenceEvents(tonic, minor, ctx.tempo * 0.8);
  let melEvents: NoteEvent[];
  if (cfg.rhythmic) {
    const e8 = 0.33 * ctx.tempo;
    const durs = phraseRhythm(ctx, mel.length);
    let t = 0;
    melEvents = mel.map((s, i) => {
      const ev = { t, d: durs[i] * e8 * 0.92, midi: tonic + s };
      t += durs[i] * e8;
      return ev;
    });
  } else {
    const step = 0.62 * ctx.tempo;
    melEvents = mel.map((s, i) => ({ t: i * step, d: step * 0.95, midi: tonic + s }));
  }
  const start = cad.end + 0.3;
  const stimulus: NoteEvent[] = [...cad.events, ...melEvents.map((e) => ({ ...e, t: e.t + start }))];
  const ids = mel.map((s) => semisToId.get(s)!);
  const choices: Choice[] = [...poolIds]
    .sort((a, b) => melSemis(a) - melSemis(b))
    .map((id) => ({
      id,
      ...degreeLabel(ctx, id),
      audio: [{ t: 0, d: 0.6, midi: tonic + melSemis(id) }],
    }));
  const labels = ids.map((id) => choices.find((c) => c.id === id)!.label).join(' ');
  return {
    kind: 'melody',
    prompt: tr(ctx, `Запиши мелодию из ${cfg.length} нот`, `Write down the melody: ${cfg.length} notes`),
    stimulus,
    alt: [
      { label: tr(ctx, 'Только мелодия', 'Melody only'), events: melEvents },
      { label: tr(ctx, 'Медленно', 'Slowly'), events: melEvents.map((e) => ({ ...e, t: e.t * 1.6, d: e.d * 1.4 })) },
      { label: tr(ctx, 'Тоника', 'Tonic'), events: [{ t: 0, d: 1.2, midi: tonic }] },
    ],
    input: 'sequence',
    choices,
    answer: ids,
    itemKeys: ids.map((id) => `mel:${id.replace(',', '')}`),
    answerLabel: labels,
    answerAudio: melEvents,
    renderSequence: (seq) => seq.map((id, i) => ({ ...melEvents[i], midi: tonic + melSemis(id) })),
    explain: tr(
      ctx,
      `Ноты (абсолютные названия): ${mel.map((s) => noteName(tonic + s, ctx.naming, ctx.lang, false, keyFlats(tonic, minor))).join(' – ')}`,
      `Notes: ${mel.map((s) => noteName(tonic + s, ctx.naming, ctx.lang, false, keyFlats(tonic, minor))).join(' – ')}`,
    ),
  };
}

// ───────────────────────── progressions ─────────────────────────
const chordSymbol = (ctx: GenCtx, tonic: number, r: string, minor = false) => {
  const rd = romanById(r);
  // borrowed ♭ chords are spelled with flats whatever the key
  const root = pcName(tonic + rd.root, 'letter', ctx.lang, r.startsWith('♭') || keyFlats(tonic, minor));
  const q = rd.quality;
  const sym =
    q.length === 4
      ? q[1] === 4 && q[3] === 11
        ? 'maj7'
        : q[1] === 3 && q[2] === 6
          ? 'm7♭5'
          : q[1] === 3
            ? 'm7'
            : '7'
      : q[1] === 3
        ? q[2] === 6
          ? '°'
          : 'm'
        : '';
  return root + sym;
};

/** Accompaniment patterns: one chord per bar of 4 beats. voiced = [bass, ...upper]. */
export function accompany(voiced: number[][], style: AccompStyle, tempo: number): { events: NoteEvent[]; bar: number } {
  const beat = (style === 'jazz' ? 0.6 : 0.52) * tempo;
  const bar = beat * 4;
  const ev: NoteEvent[] = [];
  voiced.forEach((v, i) => {
    const t0 = i * bar;
    const [bass, ...up] = v;
    const last = i === voiced.length - 1;
    switch (style) {
      case 'block':
        ev.push({ t: t0, d: bar * 0.95, midi: v, vel: 0.55 });
        break;
      case 'ballad': {
        ev.push({ t: t0, d: bar * 0.98, midi: bass, vel: 0.7 });
        const arp = [up[0], up[1], up[2] ?? up[0] + 12, up[1], up[0] + 12, up[1], up[2] ?? up[0] + 12, up[1]];
        if (last) ev.push({ t: t0, d: bar, midi: up, vel: 0.5 });
        else arp.forEach((m, k) => ev.push({ t: t0 + (k * beat) / 2, d: beat * 0.9, midi: m, vel: 0.45 }));
        break;
      }
      case 'pop':
        ev.push({ t: t0, d: beat * 1.8, midi: bass, vel: 0.75 }, { t: t0 + 2 * beat, d: beat * 1.8, midi: bass, vel: 0.65 });
        if (last) ev.push({ t: t0, d: bar, midi: up, vel: 0.5 });
        else
          for (const b of [0, 1.5, 2, 3]) ev.push({ t: t0 + b * beat, d: beat * 0.8, midi: up, vel: 0.42 });
        for (let k = 0; k < 8 && !last; k++) ev.push({ t: t0 + (k * beat) / 2, d: 0.05, midi: 0, drum: 'hat', vel: k % 2 ? 0.25 : 0.4 });
        ev.push({ t: t0, d: 0.1, midi: 0, drum: 'kick', vel: 0.9 });
        if (!last) ev.push({ t: t0 + 2 * beat, d: 0.1, midi: 0, drum: 'kick', vel: 0.8 }, { t: t0 + beat, d: 0.1, midi: 0, drum: 'snare', vel: 0.6 }, { t: t0 + 3 * beat, d: 0.1, midi: 0, drum: 'snare', vel: 0.6 });
        break;
      case 'strum': {
        ev.push({ t: t0, d: bar * 0.95, midi: bass, vel: 0.6, inst: 'guitar' });
        const shape = [bass + 12, ...up].sort((a, b) => a - b);
        const strokes: [number, boolean][] = last ? [[0, true]] : [[0, true], [1, true], [1.5, false], [2.5, false], [3, true], [3.5, false]];
        for (const [b, down] of strokes)
          ev.push({ t: t0 + b * beat, d: last ? bar : beat * 0.9, midi: down ? shape : [...shape].reverse(), vel: down ? 0.5 : 0.35, strum: 0.014, inst: 'guitar' });
        break;
      }
      case 'jazz': {
        // walking-ish bass: root, chord tone, chord tone, chromatic approach to the next root
        const next = voiced[i + 1]?.[0] ?? bass;
        // chord tones taken from the actual chord (minor/major 3rd, perfect/diminished 5th)
        const pcsUp = up.map(pc);
        const tone = (opts: number[]) => bass + (opts.find((x) => pcsUp.includes(pc(bass + x))) ?? opts[opts.length - 1]);
        const walk = [bass, tone([4, 3]), tone([7, 6, 8]), next + (next > bass ? -1 : 1)];
        if (last) ev.push({ t: t0, d: bar, midi: bass, vel: 0.7 });
        else walk.forEach((m, k) => ev.push({ t: t0 + k * beat, d: beat * 0.9, midi: m, vel: 0.65, inst: 'guitar' }));
        ev.push({ t: t0, d: beat * 1.3, midi: up, vel: 0.45, inst: 'epiano' });
        if (!last) ev.push({ t: t0 + 2.5 * beat, d: beat * 1.2, midi: up, vel: 0.38, inst: 'epiano' });
        for (const b of [1, 3]) if (!last) ev.push({ t: t0 + b * beat, d: 0.05, midi: 0, drum: 'hat', vel: 0.35 });
        break;
      }
    }
  });
  return { events: ev, bar };
}

const STYLE_NAMES: Record<AccompStyle, [string, string]> = {
  block: ['аккорды', 'block chords'],
  ballad: ['фортепианная баллада', 'piano ballad'],
  pop: ['поп-группа', 'pop band'],
  strum: ['гитара', 'guitar strum'],
  jazz: ['джаз-трио', 'jazz trio'],
};

/** Choose some first inversions (bass on the 3rd) for passing-chord colour, never on the first/last chord. */
function pickInversions(ctx: GenCtx, romans: string[]): number[] {
  return romans.map((r, i) => (i > 0 && i < romans.length - 1 && romanById(r).quality.length === 3 && ctx.rng() < 0.35 ? 1 : 0));
}

function genProgression(cfg: Extract<ExerciseConfig, { kind: 'progression' }>, ctx: GenCtx): Question {
  const minor = !!cfg.minor;
  const tonic = ctx.fixedRoot ? 60 : randInt(ctx.rng, 55, 66);
  const romans = generateProgression(ctx.rng, cfg.set, cfg.length, minor, cfg.free);
  const invs = cfg.inversions ? pickInversions(ctx, romans) : undefined;
  const voiced = voiceProgression(tonic, romans, invs);
  const style: AccompStyle = cfg.style ?? 'block';
  const keyName = pcName(tonic, ctx.naming, ctx.lang, keyFlats(tonic, minor));
  let stimulus: NoteEvent[];
  let body: NoteEvent[];
  if (style === 'block' && !cfg.free) {
    const d = 1.0 * ctx.tempo;
    body = voiced.map((v, i) => ({ t: i * d, d: i === voiced.length - 1 ? d * 1.6 : d * 0.97, midi: v, vel: 0.55 }));
    stimulus = body;
  } else {
    body = accompany(voiced, style, ctx.tempo).events;
    // establish the key first when the progression may not start on the tonic
    const cad = cadenceEvents(tonic, minor, ctx.tempo * 0.8);
    stimulus = cfg.free ? [...cad.events, ...body.map((e) => ({ ...e, t: e.t + cad.end + 0.5 }))] : body;
  }
  const choices: Choice[] = cfg.set.map((r) => ({
    id: r,
    label: r,
    sub: chordSymbol(ctx, tonic, r, minor),
    audio: [{ t: 0, d: 1.2, midi: voiceChord(tonic, romanById(r)), vel: 0.55 }],
  }));
  const given = cfg.free ? 0 : 1;
  const styleName = STYLE_NAMES[style][ctx.lang === 'ru' ? 0 : 1];
  return {
    kind: 'progression',
    prompt: cfg.style
      ? tr(ctx, `Аккорды по тактам (${keyName} ${minor ? 'минор' : 'мажор'}, ${styleName})`, `Chords bar by bar (${keyName} ${minor ? 'minor' : 'major'}, ${styleName})`)
      : tr(ctx, `Какие аккорды? (${keyName} ${minor ? 'минор' : 'мажор'})`, `Name the chords (${keyName} ${minor ? 'minor' : 'major'})`),
    stimulus,
    alt: [
      { label: tr(ctx, 'Без вступления', 'No intro'), events: body },
      { label: tr(ctx, 'Только бас', 'Bass only'), events: voiced.map((v, i) => ({ t: i * 0.9 * ctx.tempo, d: 0.85 * ctx.tempo, midi: v[0] })) },
      { label: tr(ctx, 'Тоника', 'Tonic'), events: [{ t: 0, d: 1.5, midi: voiceChord(tonic, romanById(minor ? 'i' : 'I')), vel: 0.55 }] },
    ],
    input: 'sequence',
    given,
    choices,
    answer: romans,
    itemKeys: romans.slice(given).map((r) => `prog:${r}`),
    answerLabel: romans.map((r, i) => (invs?.[i] ? `${r}⁶` : r)).join(' – '),
    renderSequence: (seq) => {
      const v = voiceProgression(tonic, seq.map((r) => (cfg.set.includes(r) || romans.includes(r) ? r : romans[0])));
      return v.map((x, i) => ({ t: i * 0.9 * ctx.tempo, d: 0.85 * ctx.tempo, midi: x, vel: 0.55 }));
    },
    explain: invs?.some(Boolean)
      ? tr(ctx, '⁶ — аккорд с терцией в басу (обращение)', '⁶ = chord with its 3rd in the bass')
      : tr(ctx, 'Следи за басом и характером: мажор/минор', 'Follow the bass line and major/minor colour'),
  };
}

// ───────────────────────── bass line dictation ─────────────────────────
function genBass(cfg: Extract<ExerciseConfig, { kind: 'bass' }>, ctx: GenCtx): Question {
  const minor = !!cfg.minor;
  const tonic = ctx.fixedRoot ? 60 : randInt(ctx.rng, 55, 64);
  const romans = generateProgression(ctx.rng, cfg.set, cfg.length, minor);
  const invs = cfg.inversions ? pickInversions(ctx, romans) : romans.map(() => 0);
  const voiced = voiceProgression(tonic, romans, invs);
  const d = 1.0 * ctx.tempo;
  const stimulus: NoteEvent[] = voiced.flatMap((v, i) => [
    { t: i * d, d: d * 0.97, midi: v[0], vel: 0.85 },
    { t: i * d, d: d * 0.97, midi: v.slice(1), vel: 0.4 },
  ]);
  const degSet = minor ? ['1', '2', 'b3', '4', '5', 'b6', 'b7', '7'] : ['1', '2', '3', '4', '5', '6', '7'];
  const ids = voiced.map((v) => degreeBySemis(v[0] - tonic).id);
  const choices: Choice[] = degSet.map((id) => ({ id, ...degreeLabel(ctx, id), audio: [{ t: 0, d: 0.8, midi: tonic - 12 + degreeById(id).semis, vel: 0.85 }] }));
  return {
    kind: 'bass',
    prompt: tr(ctx, 'Запиши ступени баса', 'Write down the bass line (scale degrees)'),
    stimulus,
    alt: [
      { label: tr(ctx, 'Только бас', 'Bass only'), events: voiced.map((v, i) => ({ t: i * d, d: d * 0.95, midi: v[0], vel: 0.9 })) },
      { label: tr(ctx, 'Тоника', 'Tonic'), events: [{ t: 0, d: 1.2, midi: tonic - 12 }] },
    ],
    input: 'sequence',
    given: 1,
    choices,
    answer: ids,
    itemKeys: ids.slice(1).map((id) => `bass:${id}`),
    answerLabel: ids.map((id) => degreeById(id).label).join(' – ') + `  (${romans.map((r, i) => (invs[i] ? r + '⁶' : r)).join(' ')})`,
    renderSequence: (seq) => seq.map((id, i) => ({ t: i * 0.7, d: 0.65, midi: tonic - 12 + degreeById(id).semis, vel: 0.9 })),
    explain: tr(ctx, 'Бас — фундамент гармонии: по нему проще всего определить аккорд', 'The bass is the foundation: it tells you the chord'),
  };
}

// ───────────────────────── cadences ─────────────────────────
const CADENCES: Record<CadenceType, { ru: string; en: string; sub: string; end: string[] }> = {
  PAC: { ru: 'Автентическая (полная)', en: 'Authentic', sub: 'V → I', end: ['V7', 'I'] },
  HC: { ru: 'Половинная', en: 'Half', sub: '… → V', end: ['IV', 'V'] },
  PC: { ru: 'Плагальная', en: 'Plagal', sub: 'IV → I', end: ['IV', 'I'] },
  DC: { ru: 'Прерванная', en: 'Deceptive', sub: 'V → vi', end: ['V', 'vi'] },
};

function genCadence(cfg: Extract<ExerciseConfig, { kind: 'cadence' }>, ctx: GenCtx): Question {
  const id = pickKey(ctx, cfg.set, (x) => `cad:${x}`);
  const tonic = ctx.fixedRoot ? 60 : randInt(ctx.rng, 55, 66);
  const lead = ['I', pick(ctx.rng, id === 'HC' ? ['vi', 'I'] : id === 'PC' ? ['vi', 'iii'] : ['vi', 'IV', 'ii'])];
  if (id === 'HC') lead[1] = pick(ctx.rng, ['vi', 'iii']);
  const romans = [...lead, ...CADENCES[id].end];
  const d = 0.85 * ctx.tempo;
  // a full stop needs the tonic in the soprano
  const mk = (rs: string[]) => voiceProgression(tonic, rs, undefined, { endTopPc: rs[rs.length - 1] === 'I' ? tonic : undefined }).map((v, i) => ({ t: i * d, d: i === rs.length - 1 ? d * 2 : d * 0.97, midi: v, vel: 0.55 }));
  return {
    kind: 'cadence',
    prompt: tr(ctx, 'Как закончилась фраза?', 'How does the phrase end?'),
    stimulus: mk(romans),
    input: 'choice',
    choices: cfg.set.map((c) => ({ id: c, label: ctx.lang === 'ru' ? CADENCES[c].ru : CADENCES[c].en, sub: CADENCES[c].sub, audio: mk([...lead, ...CADENCES[c].end]) })),
    answer: [id],
    itemKeys: [`cad:${id}`],
    answerLabel: `${ctx.lang === 'ru' ? CADENCES[id].ru : CADENCES[id].en} (${romans.join(' – ')})`,
    explain: {
      PAC: tr(ctx, 'Точка: доминанта пришла домой', 'Full stop: dominant goes home'),
      HC: tr(ctx, 'Запятая: фраза повисла на доминанте', 'Comma: phrase hangs on V'),
      PC: tr(ctx, '«Аминь»: мягкое IV → I', '"Amen": soft IV → I'),
      DC: tr(ctx, 'Обман: ждали I, а пришла vi', 'Surprise: expected I, got vi'),
    }[id],
  };
}

// ───────────────────────── note names ─────────────────────────
function genNoteName(cfg: Extract<ExerciseConfig, { kind: 'noteName' }>, ctx: GenCtx): Question {
  const p = pickKey(ctx, cfg.set, (x) => `note:${x}`);
  const octave = cfg.reference ? 60 : pick(ctx.rng, [48, 60, 60, 72]);
  const midi = octave + p;
  const ref = 60;
  const stimulus: NoteEvent[] = cfg.reference
    ? [
        { t: 0, d: 0.9, midi: ref, vel: 0.6 },
        { t: 1.3 * ctx.tempo, d: 1.2, midi },
      ]
    : [{ t: 0, d: 1.3, midi }];
  return {
    kind: 'noteName',
    prompt: cfg.reference
      ? tr(ctx, `Сначала ${pcName(0, ctx.naming, ctx.lang)}, потом загаданная нота. Какая?`, `First ${pcName(0, ctx.naming, ctx.lang)}, then the mystery note. Which?`)
      : tr(ctx, 'Какая это нота? (абсолютный слух)', 'Which note is this? (absolute pitch)'),
    stimulus,
    alt: [{ label: tr(ctx, `Эталон ${pcName(0, ctx.naming, ctx.lang)}`, `Reference ${pcName(0, ctx.naming, ctx.lang)}`), events: [{ t: 0, d: 1, midi: ref }] }],
    input: 'keys',
    keysRange: [60, 71],
    choices: [...cfg.set].sort((a, b) => a - b).map((x) => ({ id: String(x), label: pcName(x, ctx.naming, ctx.lang), audio: [{ t: 0, d: 0.9, midi: 60 + x }] })),
    answer: [String(p)],
    itemKeys: [`note:${p}`],
    answerLabel: noteName(midi, ctx.naming, ctx.lang, true),
  };
}

// ───────────────────────── singing ─────────────────────────
export const VOICE_RANGE = { low: [45, 62], high: [57, 74] } as const;

function genSing(cfg: Extract<ExerciseConfig, { kind: 'sing' }>, ctx: GenCtx): Question {
  const [lo, hi] = VOICE_RANGE[ctx.voice];
  const base = {
    kind: 'sing' as const,
    input: 'sing' as const,
    choices: [],
    itemKeys: [`sing:${cfg.mode}`],
  };
  if (cfg.mode === 'note') {
    const m = randInt(ctx.rng, lo + 2, hi - 2);
    const nm = noteName(m, ctx.naming, ctx.lang, true);
    return {
      ...base,
      prompt: tr(ctx, 'Послушай и спой эту ноту', 'Listen and sing this note'),
      stimulus: [{ t: 0, d: 1.6, midi: m }],
      answer: [String(m)],
      answerLabel: nm,
      sing: { targets: [m], target: nm },
    };
  }
  if (cfg.mode === 'degree') {
    const set = cfg.set ?? ['1', '3', '5'];
    const id = pickKey(ctx, set, (x) => `singdeg:${x}`);
    const tonic = randInt(ctx.rng, lo + 1, Math.min(hi - 8, lo + 8));
    const deg = degreeById(id);
    const target = tonic + deg.semis;
    const cad = cadenceEvents(tonic + 12 > 66 ? tonic : tonic + 12, !!cfg.minor, ctx.tempo);
    const lbl = `${deg.label} (${solf(ctx, deg.solf)})`;
    return {
      ...base,
      prompt: tr(ctx, `Спой ступень ${lbl}`, `Sing scale degree ${lbl}`),
      stimulus: [...cad.events, { t: cad.end, d: 1, midi: tonic, vel: 0.6 }],
      alt: [{ label: tr(ctx, 'Подсказка', 'Hint'), events: [{ t: 0, d: 1.2, midi: target }] }],
      answer: [String(target)],
      answerLabel: lbl,
      sing: { targets: [target], target: lbl },
    };
  }
  if (cfg.mode === 'sight') {
    // sight-singing: degrees are shown, only the key is played
    const set = cfg.set ?? ['1', '2', '3', '4', '5'];
    const len = cfg.length ?? 4;
    const tonic = randInt(ctx.rng, lo + 2, Math.max(lo + 2, hi - 9));
    const mel = generateMelody(ctx.rng, { pool: set.map(melSemis), length: len, startOnTonic: true, endOnTonic: true, maxLeap: 5 });
    const semisToId = new Map(set.map((id) => [melSemis(id), id]));
    const ids = mel.map((x) => semisToId.get(x)!);
    const targets = mel.map((x) => tonic + x);
    const cad = cadenceEvents(tonic + 12 > 66 ? tonic : tonic + 12, !!cfg.minor, ctx.tempo);
    return {
      ...base,
      itemKeys: ['sing:sight'],
      prompt: tr(ctx, 'Спой с листа: ступени на экране', 'Sight-sing the degrees on screen'),
      stimulus: [...cad.events, { t: cad.end, d: 1, midi: tonic, vel: 0.6 }],
      alt: [{ label: tr(ctx, 'Подсказка', 'Hint'), events: targets.map((m, i) => ({ t: i * 0.6, d: 0.55, midi: m })) }],
      answer: targets.map(String),
      answerLabel: ids.map((id) => degreeLabel(ctx, id).label).join(' '),
      score: ids.map((id) => `${degreeLabel(ctx, id).label}|${degreeLabel(ctx, id).sub}`),
      sing: { targets, target: tr(ctx, 'с листа', 'sight'), sequential: true },
    };
  }
  if (cfg.mode === 'echo') {
    const set = cfg.set ?? ['1', '2', '3', '4', '5'];
    const len = cfg.length ?? 3;
    const tonic = randInt(ctx.rng, lo + 2, Math.max(lo + 2, hi - 9));
    const mel = generateMelody(ctx.rng, { pool: set.map(melSemis), length: len, startOnTonic: ctx.rng() < 0.5, maxLeap: 4 });
    const step = 0.6 * ctx.tempo;
    const chord = voiceChord(tonic + 12, romanById(cfg.minor ? 'i' : 'I'));
    const targets = mel.map((x) => tonic + x);
    return {
      ...base,
      itemKeys: ['sing:echo'],
      prompt: tr(ctx, `Повтори голосом фразу: ${len} ${ruPlural(len, 'нота', 'ноты', 'нот')}`, `Sing back the ${len}-note phrase`),
      stimulus: [{ t: 0, d: 1, midi: chord, vel: 0.4 }, ...targets.map((m, i) => ({ t: 1.3 + i * step, d: step * 0.95, midi: m }))],
      alt: [{ label: tr(ctx, 'Только фраза', 'Phrase only'), events: targets.map((m, i) => ({ t: i * step, d: step * 0.95, midi: m })) }],
      answer: targets.map(String),
      answerLabel: mel.map((x) => degreeBySemis(x).label).join(' '),
      sing: { targets, target: tr(ctx, `${len} ${ruPlural(len, 'нота', 'ноты', 'нот')}`, `${len} notes`), sequential: true },
    };
  }
  const set = (cfg.set ?? ['4', '7', '12']).map(Number);
  const s = pickKey(ctx, set, (x) => `singint:${x}`);
  const root = randInt(ctx.rng, lo, hi - s);
  const def = intervalBySemis(s);
  const lbl = ctx.lang === 'ru' ? def.ru : def.en;
  return {
    ...base,
    prompt: tr(ctx, `Спой вверх от этой ноты: ${(def.acc ?? def.ru).toLowerCase()}`, `Sing a ${lbl.toLowerCase()} up from this note`),
    stimulus: [{ t: 0, d: 1.4, midi: root }],
    alt: [{ label: tr(ctx, 'Подсказка', 'Hint'), events: intervalEvents(root, s, 'up', ctx.tempo) }],
    answer: [String(root + s)],
    answerLabel: noteName(root + s, ctx.naming, ctx.lang, true),
    sing: { targets: [root + s], target: lbl },
  };
}

// ───────────────────────── rhythm ─────────────────────────
function genRhythm(cfg: Extract<ExerciseConfig, { kind: 'rhythm' }>, ctx: GenCtx): Question {
  const bars = cfg.bars ?? 1;
  const pattern = generateRhythm(ctx.rng, cfg.level, bars);
  const bpm = Math.round([0, 72, 80, 76, 84][cfg.level] / ctx.tempo);
  return {
    kind: 'rhythm',
    prompt: tr(ctx, 'Послушай ритм и простучи его', 'Listen, then tap the rhythm back'),
    stimulus: rhythmEvents(pattern, bpm, true),
    input: 'rhythm',
    choices: [],
    answer: [pattern.join(',')],
    itemKeys: [`rhythm:${cfg.level}`],
    answerLabel: '',
    rhythm: { pattern, bpm },
  };
}

function genRhythmDictation(cfg: Extract<ExerciseConfig, { kind: 'rhythmDictation' }>, ctx: GenCtx): Question {
  const meter = cfg.meter ?? 4;
  const compound = meter === 6;
  const perBar = meter === 6 ? 2 : meter;
  const bars = cfg.bars ?? (meter === 4 ? 1 : 2);
  const beats = perBar * bars;
  const cells = generateBeatRhythm(ctx.rng, cfg.level, beats, compound);
  const bpm = Math.round((compound ? 56 : [0, 72, 76, 70, 72][cfg.level]) / ctx.tempo);
  const unit = compound ? 6 : 4;
  const mk = (ids: string[], speed = 1, countIn = true) => {
    const beat = 60 / (bpm * speed);
    const ev: NoteEvent[] = [];
    const ci = countIn ? perBar * (compound ? 1 : 1) : 0;
    for (let i = 0; i < ci; i++) ev.push({ t: i * beat, d: 0.05, midi: 0, drum: 'hat', vel: i === 0 ? 0.6 : 0.4 });
    const start = ci * beat;
    let t = 0;
    for (const d of cellsToDurations(ids)) {
      if (d > 0) ev.push({ t: start + (t * beat) / unit, d: Math.min(0.3, ((d * beat) / unit) * 0.9), midi: 74, vel: 0.8 });
      t += Math.abs(d);
    }
    for (let i = 0; i < ids.length; i++) ev.push({ t: start + i * beat, d: 0.05, midi: 0, drum: 'hat', vel: i % perBar === 0 ? 0.3 : 0.15 });
    return ev;
  };
  const pool = cellsForLevel(cfg.level, compound);
  const sig = meter === 6 ? '6/8' : meter === 3 ? '3/4' : '';
  return {
    kind: 'rhythmDictation',
    prompt: tr(
      ctx,
      `Запиши ритм${sig ? ` (${sig})` : ''}: ${bars * perBar} ${ruPlural(bars * perBar, 'доля', 'доли', 'долей')} после отсчёта`,
      `Write the rhythm${sig ? ` (${sig})` : ''}: ${bars * perBar} beats after the count-in`,
    ),
    stimulus: mk(cells),
    alt: [{ label: tr(ctx, 'Медленно', 'Slowly'), events: mk(cells, 0.7) }],
    input: 'sequence',
    choices: pool.map((c) => ({ id: c.id, label: '', glyph: c.id, sub: ctx.lang === 'ru' ? c.ru : c.en, audio: mk([c.id], 1, false) })),
    answer: cells,
    itemKeys: cells.map((c) => `rdict:${c}`),
    answerLabel: cells.map((c) => cellById(c)[ctx.lang === 'ru' ? 'ru' : 'en'].toLowerCase()).join(' · '),
    renderSequence: (ids) => mk(ids),
    explain: compound
      ? tr(ctx, 'В 6/8 две доли, каждая делится на три восьмые: «раз-и-а, два-и-а»', 'In 6/8 there are two beats, each split in three: "1-la-li, 2-la-li"')
      : tr(ctx, 'Считай «раз-и, два-и…» и представляй, где внутри доли звучат ноты', 'Count "1-and-2-and…" and place notes inside each beat'),
  };
}

/** Rhythm as pitched notes; metronome is handled by the player via `countIn`. */
export function rhythmEvents(pattern: number[], bpm: number, withCountIn: boolean): NoteEvent[] {
  const s16 = 60 / bpm / 4;
  const offset = withCountIn ? 16 * s16 : 0;
  const out: NoteEvent[] = [];
  let t = 0;
  for (const d of pattern) {
    if (d > 0) out.push({ t: offset + t * s16, d: Math.min(0.35, d * s16 * 0.9), midi: 76, vel: 0.75 });
    t += Math.abs(d);
  }
  return out;
}

export const ALL_INTERVALS = INTERVALS.filter((i) => i.semis >= 1 && i.semis <= 12).map((i) => i.semis);
export const ALL_CHORDS = CHORDS.map((c) => c.id);
export const DIATONIC_MAJOR = ['1', '2', '3', '4', '5', '6', '7'];
export const DIATONIC_MINOR = ['1', '2', 'b3', '4', '5', 'b6', 'b7'];
export const CHROMATIC = DEGREES.filter((d) => d.semis < 12).map((d) => d.id);
