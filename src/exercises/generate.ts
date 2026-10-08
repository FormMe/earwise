import type { NoteEvent } from '../audio/engine';
import { CHORDS, chordById, invert, INVERSION_NAMES } from '../theory/chords';
import { cadence, generateProgression, romanById, voiceChord, voiceProgression } from '../theory/harmony';
import { INTERVALS, intervalBySemis } from '../theory/intervals';
import { generateMelody } from '../theory/melody';
import { FLAT_KEYS, noteName, pc, pcName } from '../theory/notes';
import { pick, randInt, weightedPick } from '../theory/random';
import { generateRhythm } from '../theory/rhythm';
import { DEGREES, degreeById, MAJOR, NAT_MINOR, scaleById, SOLF_RU } from '../theory/scales';
import type { Choice, Dir, ExerciseConfig, GenCtx, Question } from './types';

const tr = (ctx: GenCtx, ru: string, en: string) => (ctx.lang === 'ru' ? ru : en);

function pickKey<T>(ctx: GenCtx, items: T[], key: (t: T) => string): T {
  return weightedPick(ctx.rng, items, (t) => {
    const k = key(t);
    return ctx.weight(k) * (k === ctx.prevKey && items.length > 1 ? 0.25 : 1);
  });
}

const solf = (ctx: GenCtx, s: string) => (ctx.lang === 'ru' ? SOLF_RU[s] : s.toLowerCase());

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
    explain: tr(ctx, `Разница: ${diff} полутон(а)`, `Difference: ${diff} semitone(s)`),
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
  else root = ctx.fixedRoot ? 60 : randInt(ctx.rng, 48, Math.max(48, 79 - s));
  const def = intervalBySemis(s);
  const name = (sm: number) => (ctx.lang === 'ru' ? intervalBySemis(sm).ru : intervalBySemis(sm).en);
  const short = (sm: number) => (ctx.lang === 'ru' ? intervalBySemis(sm).short : intervalBySemis(sm).id);
  const choices: Choice[] = [...cfg.set]
    .sort((a, b) => a - b)
    .map((sm) => ({ id: String(sm), label: short(sm), sub: name(sm), audio: intervalEvents(root, sm, dir, ctx.tempo) }));
  const songs = dir === 'down' ? def.down : def.up;
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
      songs && dir !== 'harm' && ctx.lang === 'ru'
        ? `🎵 Как в: ${songs.join(', ')}`
        : songs && dir !== 'harm'
          ? `🎵 Like: ${songs.join(', ')}`
          : undefined,
  };
}

// ───────────────────────── chords ─────────────────────────
function chordEvents(notes: number[], tempo: number, arp = false): NoteEvent[] {
  if (arp)
    return notes.map((m, i) => ({ t: i * 0.38 * tempo, d: (notes.length - i) * 0.38 * tempo + 0.6, midi: m, vel: 0.7 }));
  return [{ t: 0, d: 1.8 * tempo, midi: notes, strum: 0.012 }];
}

function genChord(cfg: Extract<ExerciseConfig, { kind: 'chord' }>, ctx: GenCtx): Question {
  const id = pickKey(ctx, cfg.set, (x) => `chord:${x}`);
  const def = chordById(id);
  const root = randInt(ctx.rng, 50, 62);
  const inv = cfg.inversions ? randInt(ctx.rng, 0, def.intervals.length - 1) : 0;
  const shape = invert(def.intervals, inv);
  const bass = root + def.intervals[inv] - (inv ? 12 : 0);
  const notes = shape.map((x) => bass + x);
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
    alt: [{ label: tr(ctx, 'Арпеджио', 'Arpeggio'), events: chordEvents(notes, ctx.tempo, true) }],
    input: 'choice',
    choices,
    answer: [id],
    itemKeys: [`chord:${id}`],
    answerLabel: `${ctx.lang === 'ru' ? def.ru : def.en} (${pcName(root, ctx.naming, ctx.lang)}${def.symbol})`,
    explain: def.hint ? (ctx.lang === 'ru' ? def.hint.ru : def.hint.en) : undefined,
  };
}

function genInversion(cfg: Extract<ExerciseConfig, { kind: 'inversion' }>, ctx: GenCtx): Question {
  const chordId = pick(ctx.rng, cfg.chords);
  const def = chordById(chordId);
  const invs = cfg.invs.filter((i) => i < def.intervals.length);
  const inv = pickKey(ctx, invs, (i) => `inv:${i}`);
  const root = randInt(ctx.rng, 52, 62);
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
  return {
    kind: 'scale',
    prompt: tr(ctx, 'Какой лад / гамма?', 'Which scale or mode?'),
    stimulus: scaleEvents(tonic, def.steps, dir, ctx.tempo),
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

// ───────────────────────── functional degrees ─────────────────────────
function cadenceEvents(tonic: number, minor: boolean, tempo: number): { events: NoteEvent[]; end: number } {
  const chords = cadence(tonic, minor);
  const d = 0.55 * tempo;
  const events = chords.map((c, i) => ({ t: i * d, d: i === chords.length - 1 ? d * 1.6 : d * 0.98, midi: c, vel: 0.5 }));
  return { events, end: chords.length * d + d * 0.9 };
}

/** Walk from a degree to the nearest tonic along the scale, Functional-Ear-Trainer style. */
export function resolution(semis: number, minor: boolean): number[] {
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

function tonicFor(ctx: GenCtx) {
  return ctx.fixedRoot ? 60 : randInt(ctx.rng, 55, 66);
}

function degreeLabel(ctx: GenCtx, id: string) {
  const d = degreeById(id);
  return { label: d.label, sub: solf(ctx, d.solf) };
}

function genDegree(cfg: Extract<ExerciseConfig, { kind: 'degree' }>, ctx: GenCtx): Question {
  const minor = !!cfg.minor;
  const mode = minor ? 'm' : 'M';
  const id = pickKey(ctx, cfg.set, (x) => `deg:${x}:${mode}`);
  const deg = degreeById(id);
  const tonic = tonicFor(ctx);
  let note = tonic + deg.semis;
  if (cfg.wide && ctx.rng() < 0.4 && deg.semis !== 12) note += ctx.rng() < 0.5 ? -12 : 12;
  const cad = cadenceEvents(tonic, minor, ctx.tempo);
  const stimulus = [...cad.events, { t: cad.end, d: 1.3, midi: note }];
  const res = resolution(deg.semis, minor).map((s) => note - deg.semis + s);
  const step = 0.42 * ctx.tempo;
  const keyName = pcName(tonic, ctx.naming, ctx.lang, FLAT_KEYS.has(pc(tonic)));
  return {
    kind: 'degree',
    prompt: tr(ctx, `Какая это ступень? (${keyName} ${minor ? 'минор' : 'мажор'})`, `Which scale degree? (${keyName} ${minor ? 'minor' : 'major'})`),
    stimulus,
    alt: [
      { label: tr(ctx, 'Только нота', 'Note only'), events: [{ t: 0, d: 1.3, midi: note }] },
      { label: tr(ctx, 'Тоника', 'Tonic'), events: [{ t: 0, d: 1.2, midi: tonic }] },
    ],
    input: 'choice',
    choices: cfg.set.map((cid) => ({
      id: cid,
      ...degreeLabel(ctx, cid),
      audio: [{ t: 0, d: 1, midi: tonic + degreeById(cid).semis }],
    })),
    answer: [id],
    itemKeys: [`deg:${id}:${mode}`],
    answerLabel: `${deg.label} (${solf(ctx, deg.solf)})`,
    afterAnswer: res.map((m, i) => ({ t: i * step, d: i === res.length - 1 ? 1 : step, midi: m, vel: 0.7 })),
    explain: tr(ctx, 'Слушай, как нота разрешается в тонику', 'Hear how the note resolves to the tonic'),
  };
}

// ───────────────────────── melodic dictation ─────────────────────────
/** degree id + optional "," (octave below) */
const melSemis = (id: string) => (id.endsWith(',') ? degreeById(id.slice(0, -1)).semis - 12 : degreeById(id).semis);

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
    maxLeap: cfg.maxLeap ?? 7,
  });
  const cadChord = voiceChord(tonic, romanById(minor ? 'i' : 'I'));
  const step = 0.62 * ctx.tempo;
  const start = 1.5 * ctx.tempo;
  const melEvents: NoteEvent[] = mel.map((s, i) => ({ t: i * step, d: step * 0.95, midi: tonic + s }));
  const stimulus: NoteEvent[] = [
    { t: 0, d: 1.1 * ctx.tempo, midi: cadChord, vel: 0.45 },
    ...melEvents.map((e) => ({ ...e, t: e.t + start })),
  ];
  const ids = mel.map((s) => semisToId.get(s)!);
  const choices: Choice[] = [...poolIds]
    .sort((a, b) => melSemis(a) - melSemis(b))
    .map((id) => {
      const low = id.endsWith(',');
      const d = degreeById(low ? id.slice(0, -1) : id);
      return {
        id,
        label: low ? `${d.label}̣` : d.label,
        sub: solf(ctx, d.solf),
        audio: [{ t: 0, d: 0.6, midi: tonic + melSemis(id) }],
      };
    });
  const labels = ids.map((id) => choices.find((c) => c.id === id)!.label).join(' ');
  return {
    kind: 'melody',
    prompt: tr(ctx, `Запиши мелодию из ${cfg.length} нот`, `Write down the melody: ${cfg.length} notes`),
    stimulus,
    alt: [
      { label: tr(ctx, 'Без аккорда', 'Melody only'), events: melEvents },
      { label: tr(ctx, 'Тоника', 'Tonic'), events: [{ t: 0, d: 1.2, midi: tonic }] },
    ],
    input: 'sequence',
    choices,
    answer: ids,
    itemKeys: ids.map((id) => `mel:${id.replace(',', '')}`),
    answerLabel: labels,
    explain: tr(
      ctx,
      `Ноты: ${mel.map((s) => noteName(tonic + s, ctx.naming, ctx.lang)).join(' – ')}`,
      `Notes: ${mel.map((s) => noteName(tonic + s, ctx.naming, ctx.lang)).join(' – ')}`,
    ),
  };
}

// ───────────────────────── progressions ─────────────────────────
function genProgression(cfg: Extract<ExerciseConfig, { kind: 'progression' }>, ctx: GenCtx): Question {
  const minor = !!cfg.minor;
  const tonic = ctx.fixedRoot ? 60 : randInt(ctx.rng, 55, 66);
  const romans = generateProgression(ctx.rng, cfg.set, cfg.length, minor);
  const voiced = voiceProgression(tonic, romans);
  const d = 1.0 * ctx.tempo;
  const stimulus: NoteEvent[] = voiced.map((v, i) => ({ t: i * d, d: i === voiced.length - 1 ? d * 1.6 : d * 0.97, midi: v, vel: 0.55 }));
  const keyName = pcName(tonic, ctx.naming, ctx.lang, FLAT_KEYS.has(pc(tonic)));
  const choices: Choice[] = cfg.set.map((r) => {
    const v = voiceChord(tonic, romanById(r));
    const root = pcName(tonic + romanById(r).root, 'letter', ctx.lang, FLAT_KEYS.has(pc(tonic)));
    const q = romanById(r).quality;
    const sym = q.length === 4 ? '7' : q[1] === 3 ? (q[2] === 6 ? '°' : 'm') : '';
    return { id: r, label: r, sub: root + sym, audio: [{ t: 0, d: 1.2, midi: v, vel: 0.55 }] };
  });
  return {
    kind: 'progression',
    prompt: tr(ctx, `Какие аккорды? (${keyName} ${minor ? 'минор' : 'мажор'})`, `Name the chords (${keyName} ${minor ? 'minor' : 'major'})`),
    stimulus,
    alt: [{ label: tr(ctx, 'Тоника', 'Tonic'), events: [{ t: 0, d: 1.5, midi: voiced[0], vel: 0.55 }] }],
    input: 'sequence',
    given: 1,
    choices,
    answer: romans,
    itemKeys: romans.slice(1).map((r) => `prog:${r}`),
    answerLabel: romans.join(' – '),
    explain: tr(ctx, 'Следи за басом и характером: мажор/минор', 'Follow the bass line and major/minor colour'),
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
    const cad = cadenceEvents(tonic + 12 > 66 ? tonic : tonic + 12, false, ctx.tempo);
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
  const set = (cfg.set ?? ['4', '7', '12']).map(Number);
  const s = pickKey(ctx, set, (x) => `singint:${x}`);
  const root = randInt(ctx.rng, lo, hi - s);
  const def = intervalBySemis(s);
  const lbl = ctx.lang === 'ru' ? def.ru : def.en;
  return {
    ...base,
    prompt: tr(ctx, `Спой ${lbl.toLowerCase()} вверх от этой ноты`, `Sing a ${lbl.toLowerCase()} up from this note`),
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
