/** Generators for the second wave of exercises (functions, tonic finding, modulation, two voices, full dictation, pulse). */
import type { NoteEvent } from '../audio/engine';
import { romanById, voiceChord, voiceProgression, generateProgression } from '../theory/harmony';
import { intervalBySemis } from '../theory/intervals';
import { generateMelody } from '../theory/melody';
import { keyFlats, pcName } from '../theory/notes';
import { pick, randInt, shuffle } from '../theory/random';
import { cellsForLevel, cellsToDurations, cellById, generateBeatRhythm } from '../theory/rhythmCells';
import { degreeById, degreeBySemis } from '../theory/scales';
import { accompany, cadenceEvents, degreeLabel, melSemis, pickKey, ruPlural, tonicFor, tr } from './generate';
import type { Choice, ExerciseConfig, GenCtx, ModTarget, Question } from './types';

// ───────────────────────── harmonic function T / S / D ─────────────────────────
const FUNC: Record<string, 'T' | 'S' | 'D'> = { I: 'T', vi: 'T', iii: 'T', IV: 'S', ii: 'S', V: 'D', V7: 'D', 'vii°': 'D' };

export function genFunction(cfg: Extract<ExerciseConfig, { kind: 'function' }>, ctx: GenCtx): Question {
  const r = pickKey(ctx, cfg.set, (x) => `fn:${x}`);
  const tonic = tonicFor(ctx);
  const cad = cadenceEvents(tonic, false, ctx.tempo);
  const chord = voiceChord(tonic, romanById(r));
  const names = {
    T: tr(ctx, 'Тоника (T)', 'Tonic (T)'),
    S: tr(ctx, 'Субдоминанта (S)', 'Subdominant (S)'),
    D: tr(ctx, 'Доминанта (D)', 'Dominant (D)'),
  };
  const subs = { T: tr(ctx, 'Тоника: покой', 'Tonic: rest'), S: tr(ctx, 'Субдоминанта: уход', 'Subdominant: away'), D: tr(ctx, 'Доминанта: напряжение', 'Dominant: tension') };
  const example = { T: 'I', S: 'IV', D: 'V' } as const;
  const f = FUNC[r];
  return {
    kind: 'function',
    prompt: tr(ctx, 'Какая функция у аккорда?', 'What is the chord’s function?'),
    stimulus: [...cad.events, { t: cad.end + 0.2, d: 1.6, midi: chord, vel: 0.6 }],
    alt: [{ label: tr(ctx, 'Только аккорд', 'Chord only'), events: [{ t: 0, d: 1.6, midi: chord, vel: 0.6 }] }],
    input: 'choice',
    choices: (['T', 'S', 'D'] as const).map((x) => ({ id: x, label: x, sub: subs[x], audio: [{ t: 0, d: 1.4, midi: voiceChord(tonic, romanById(example[x])), vel: 0.6 }] })),
    answer: [f],
    itemKeys: [`fn:${r}`],
    answerLabel: `${names[f]} — ${r}`,
    afterAnswer: voiceProgression(tonic, r === 'I' ? ['I', 'V', 'I'] : [r, f === 'S' ? 'V' : 'I']).map((v, i) => ({ t: i * 0.7, d: 0.68, midi: v, vel: 0.5 })),
    explain: tr(ctx, 'T — I, vi (iii); S — IV, ii; D — V, V7, vii°', 'T: I, vi (iii); S: IV, ii; D: V, V7, vii°'),
  };
}

// ───────────────────────── find the tonic ─────────────────────────
export function genTonicFind(cfg: Extract<ExerciseConfig, { kind: 'tonicFind' }>, ctx: GenCtx): Question {
  const minor = !!cfg.minor;
  const tonic = tonicFor(ctx);
  const pool = minor ? [-5, -2, 0, 2, 3, 5, 7, 8, 10, 12] : [-5, -3, -1, 0, 2, 4, 5, 7, 9, 11, 12];
  const mel = generateMelody(ctx.rng, { pool, length: 7, startOnTonic: false, endOnTonic: true, maxLeap: 5 });
  // the phrase should end at home; candidates: the tonic plus two other scale notes
  const others = shuffle(ctx.rng, minor ? [2, 3, 5, 7, 8] : [2, 4, 5, 7, 9]).slice(0, 2);
  const cands = shuffle(ctx.rng, [0, ...others]);
  const step = 0.45 * ctx.tempo;
  const durs = mel.map((_, i) => (i === mel.length - 1 ? 3 : i % 3 === 2 ? 2 : 1));
  let t = 0;
  const phrase: NoteEvent[] = mel.map((x, i) => {
    const e = { t, d: durs[i] * step * 0.92, midi: tonic + x };
    t += durs[i] * step;
    return e;
  });
  const letters = ['1', '2', '3'];
  const choices: Choice[] = cands.map((x, i) => ({
    id: 'c' + i,
    label: tr(ctx, `${letters[i]}-я нота`, `Note ${letters[i]}`),
    audio: [{ t: 0, d: 1.2, midi: tonic + x }],
  }));
  const ans = 'c' + cands.indexOf(0);
  const cad = cadenceEvents(tonic, minor, ctx.tempo);
  return {
    kind: 'tonicFind',
    prompt: tr(ctx, 'После мелодии звучат 3 ноты. Какая из них — «дом» мелодии?', 'Which of the three notes is “home” (the tonic)?'),
    stimulus: [...phrase, ...cands.map((x, i) => ({ t: t + 0.6 + i * 1.1, d: 0.9, midi: tonic + x }))],
    alt: [{ label: tr(ctx, 'Только мелодия', 'Melody only'), events: phrase }],
    input: 'choice',
    choices,
    answer: [ans],
    itemKeys: [`tonic:${minor ? 'm' : 'M'}`],
    answerLabel: tr(ctx, `${letters[cands.indexOf(0)]}-я нота`, `Note ${letters[cands.indexOf(0)]}`),
    afterAnswer: cad.events,
    explain: tr(ctx, 'Тоника — нота, на которой мелодия «успокаивается». Каденция подтверждает дом.', 'The tonic is where the melody comes to rest. The cadence confirms it.'),
  };
}

// ───────────────────────── intervals inside a key ─────────────────────────
export function genIntervalInKey(cfg: Extract<ExerciseConfig, { kind: 'intervalInKey' }>, ctx: GenCtx): Question {
  const tonic = tonicFor(ctx);
  const ids = cfg.set.filter((x) => x !== '1');
  const top = pickKey(ctx, ids, (x) => `iik:${melSemis(x)}`);
  const semis = melSemis(top);
  const cad = cadenceEvents(tonic, false, ctx.tempo);
  const d = 0.85 * ctx.tempo;
  const iv = intervalBySemis(semis);
  const nm = (s: number) => (ctx.lang === 'ru' ? intervalBySemis(s).ru : intervalBySemis(s).en);
  const short = (s: number) => (ctx.lang === 'ru' ? intervalBySemis(s).short : intervalBySemis(s).id);
  const all = [...new Set(ids.map(melSemis))].sort((a, b) => a - b);
  return {
    kind: 'intervalInKey',
    prompt: tr(ctx, 'От тоники вверх — какой интервал?', 'From the tonic up — which interval?'),
    stimulus: [...cad.events, { t: cad.end, d, midi: tonic }, { t: cad.end + d * 1.05, d: d * 1.3, midi: tonic + semis }],
    input: 'choice',
    choices: all.map((s) => ({ id: String(s), label: short(s), sub: nm(s), audio: [{ t: 0, d, midi: tonic }, { t: d * 1.05, d, midi: tonic + s }] })),
    answer: [String(semis)],
    itemKeys: [`iik:${semis}`],
    answerLabel: `${ctx.lang === 'ru' ? iv.ru : iv.en}: 1 → ${degreeLabel(ctx, top).label} (${degreeLabel(ctx, top).sub})`,
    explain: tr(ctx, 'Связка ступеней и интервалов: 1→3 — терция, 1→5 — квинта, 1→8 — октава', 'Degrees ↔ intervals: 1→3 a third, 1→5 a fifth, 1→8 an octave'),
  };
}

// ───────────────────────── modulation ─────────────────────────
const MOD: Record<ModTarget, { semis: number; minor: boolean; ru: string; en: string; sub: string }> = {
  none: { semis: 0, minor: false, ru: 'Без модуляции', en: 'No modulation', sub: 'I → … → I' },
  V: { semis: 7, minor: false, ru: 'В доминанту', en: 'To the dominant', sub: 'V' },
  IV: { semis: 5, minor: false, ru: 'В субдоминанту', en: 'To the subdominant', sub: 'IV' },
  vi: { semis: 9, minor: true, ru: 'В параллельный минор', en: 'To the relative minor', sub: 'vi' },
  i: { semis: 0, minor: true, ru: 'В одноимённый минор', en: 'To the parallel minor', sub: 'i' },
};

export function genModulation(cfg: Extract<ExerciseConfig, { kind: 'modulation' }>, ctx: GenCtx): Question {
  const target = pickKey(ctx, cfg.set, (x) => `mod:${x}`);
  const tonic = randInt(ctx.rng, 55, 64);
  const m = MOD[target];
  let nt = tonic + m.semis;
  if (nt > 66) nt -= 12;
  const d = 0.75 * ctx.tempo;
  const first = voiceProgression(tonic, ['I', pick(ctx.rng, ['IV', 'vi']), 'V', 'I']);
  // pivot into the new key with ii/iv – V7 – I/i and confirm it with a second cadence
  // continue the voice leading from the first half so the pivot doesn't jump
  const second = voiceProgression(nt, m.minor ? ['iv', 'V7', 'i', 'iv', 'V7', 'i'] : ['ii', 'V7', 'I', 'IV', 'V7', 'I'], undefined, { start: first[first.length - 1], endTopPc: nt });
  const all = [...first, ...second];
  const mk = (chords: number[][]) => chords.map((v, i) => ({ t: i * d, d: i === chords.length - 1 ? d * 2 : d * 0.97, midi: v, vel: 0.52 }));
  return {
    kind: 'modulation',
    prompt: tr(ctx, 'Куда пришла музыка в конце?', 'Where does the music end up?'),
    stimulus: mk(all),
    alt: [
      { label: tr(ctx, 'Начальная тоника', 'Starting tonic'), events: [{ t: 0, d: 1.4, midi: first[0], vel: 0.55 }] },
      { label: tr(ctx, 'Конец', 'Ending'), events: mk(second.slice(-3)) },
    ],
    input: 'choice',
    choices: cfg.set.map((x) => ({ id: x, label: ctx.lang === 'ru' ? MOD[x].ru : MOD[x].en, sub: MOD[x].sub })),
    answer: [target],
    itemKeys: [`mod:${target}`],
    answerLabel: `${ctx.lang === 'ru' ? m.ru : m.en} (${pcName(tonic, ctx.naming, ctx.lang, keyFlats(tonic))} → ${pcName(nt, ctx.naming, ctx.lang, keyFlats(nt, m.minor))}${m.minor ? 'm' : ''})`,
    afterAnswer: [
      { t: 0, d: 1, midi: first[0], vel: 0.5 },
      { t: 1.2, d: 1.4, midi: second[second.length - 1], vel: 0.5 },
    ],
    explain: tr(ctx, 'Сравни последний аккорд с первым: тот же «дом» или новый?', 'Compare the last chord to the first: same home or a new one?'),
  };
}

// ───────────────────────── two-voice dictation ─────────────────────────
export function genTwoVoice(cfg: Extract<ExerciseConfig, { kind: 'twoVoice' }>, ctx: GenCtx): Question {
  const tonic = randInt(ctx.rng, 57, 64);
  const romans = generateProgression(ctx.rng, cfg.set, cfg.length);
  const voiced = voiceProgression(tonic, romans);
  const bass = voiced.map((v) => v[0]);
  const sop = voiced.map((v) => v[v.length - 1]);
  const d = 0.9 * ctx.tempo;
  const deg = (m: number) => degreeBySemis(m - tonic).id;
  const bassIds = bass.map((m) => 'b' + deg(m));
  const sopIds = sop.map((m) => deg(m));
  const DIA = ['1', '2', '3', '4', '5', '6', '7'];
  const bassChoices: Choice[] = DIA.map((id) => ({ id: 'b' + id, ...degreeLabel(ctx, id), audio: [{ t: 0, d: 0.7, midi: tonic - 12 + degreeById(id).semis }] }));
  const sopChoices: Choice[] = DIA.map((id) => ({ id, ...degreeLabel(ctx, id), audio: [{ t: 0, d: 0.7, midi: tonic + 12 + degreeById(id).semis - (degreeById(id).semis > 7 ? 12 : 0) }] }));
  const mk = (b: number[], s: number[]) => b.flatMap((m, i) => [
    { t: i * d, d: d * 0.95, midi: m, vel: 0.8 },
    { t: i * d, d: d * 0.95, midi: s[i], vel: 0.75 },
  ]);
  const n = cfg.length;
  const cad = cadenceEvents(tonic, false, ctx.tempo * 0.8);
  return {
    kind: 'twoVoice',
    prompt: tr(ctx, `Двухголосие: запиши бас, потом верхний голос (${n} ${ruPlural(n, 'нота', 'ноты', 'нот')})`, `Two voices: write the bass, then the top line (${n} notes)`),
    stimulus: [...cad.events, ...mk(bass, sop).map((e) => ({ ...e, t: e.t + cad.end + 0.3 }))],
    alt: [
      { label: tr(ctx, 'Только бас', 'Bass only'), events: bass.map((m, i) => ({ t: i * d, d: d * 0.95, midi: m, vel: 0.9 })) },
      { label: tr(ctx, 'Только верх', 'Top only'), events: sop.map((m, i) => ({ t: i * d, d: d * 0.95, midi: m })) },
      { label: tr(ctx, 'Без вступления', 'No intro'), events: mk(bass, sop) },
    ],
    input: 'sequence',
    stages: [
      { until: n, title: tr(ctx, 'Бас', 'Bass'), choices: bassChoices },
      { until: 2 * n, title: tr(ctx, 'Верхний голос', 'Top voice'), choices: sopChoices },
    ],
    choices: [...bassChoices, ...sopChoices],
    answer: [...bassIds, ...sopIds],
    itemKeys: [...bassIds.map((x) => `bass:${x.slice(1)}`), ...sopIds.map((x) => `mel:${x}`)],
    answerLabel: `${tr(ctx, 'бас', 'bass')}: ${bassIds.map((x) => degreeById(x.slice(1)).label).join(' ')} · ${tr(ctx, 'верх', 'top')}: ${sopIds.map((x) => degreeById(x).label).join(' ')}`,
    renderSequence: (ids) => {
      const b = ids.slice(0, n).map((x) => tonic - 12 + degreeById(x.slice(1)).semis);
      const s = ids.slice(n).map((x) => tonic + degreeById(x).semis);
      return mk(b, s);
    },
    answerAudio: mk(bass, sop),
    explain: tr(ctx, `Аккорды: ${romans.join(' – ')}`, `Chords: ${romans.join(' – ')}`),
  };
}

// ───────────────────────── full dictation: pitch + rhythm ─────────────────────────
export function genFullDictation(cfg: Extract<ExerciseConfig, { kind: 'fullDictation' }>, ctx: GenCtx): Question {
  const minor = !!cfg.minor;
  const tonic = tonicFor(ctx);
  const beats = 4 * cfg.bars;
  let cells = generateBeatRhythm(ctx.rng, cfg.level, beats);
  // keep it singable: at most ~2 notes per beat on average
  const count = () => cellsToDurations(cells).filter((x) => x > 0).length;
  // keep long dictations manageable: at most ~1.6 notes per beat and 16 notes overall
  while (count() > Math.min(beats * 1.6, 16)) cells = generateBeatRhythm(ctx.rng, cfg.level, beats);
  const durs = cellsToDurations(cells);
  const n = count();
  const pool = cfg.set.map(melSemis);
  const semisToId = new Map(cfg.set.map((id) => [melSemis(id), id]));
  const mel = generateMelody(ctx.rng, { pool, length: n, endOnTonic: true, maxLeap: 7 });
  const pitchIds = mel.map((x) => semisToId.get(x)!);
  const bpm = 84 / ctx.tempo;
  const beatS = 60 / bpm;
  const realize = (pitches: number[], ds: number[]): NoteEvent[] => {
    const ev: NoteEvent[] = [];
    let t = 0;
    let k = 0;
    for (const dd of ds) {
      if (dd > 0 && pitches.length) ev.push({ t: (t * beatS) / 4, d: ((dd * beatS) / 4) * 0.92, midi: tonic + pitches[k++ % pitches.length] });
      t += Math.abs(dd);
    }
    return ev;
  };
  const melEvents = realize(mel, durs);
  const cad = cadenceEvents(tonic, minor, ctx.tempo * 0.8);
  const clicks: NoteEvent[] = Array.from({ length: 4 }, (_, i) => ({ t: cad.end + 0.3 + i * beatS, d: 0.05, midi: 0, drum: 'hat' as const, vel: i ? 0.35 : 0.55 }));
  const start = cad.end + 0.3 + 4 * beatS;
  const pitchChoices: Choice[] = [...cfg.set].sort((a, b) => melSemis(a) - melSemis(b)).map((id) => ({ id, ...degreeLabel(ctx, id), audio: [{ t: 0, d: 0.6, midi: tonic + melSemis(id) }] }));
  const cellChoices: Choice[] = cellsForLevel(cfg.level).map((c) => ({ id: c.id, label: '', glyph: c.id, sub: ctx.lang === 'ru' ? c.ru : c.en }));
  return {
    kind: 'fullDictation',
    prompt: tr(ctx, `Полный диктант: ${n} ${ruPlural(n, 'нота', 'ноты', 'нот')} и ритм (${cfg.bars} ${cfg.bars === 1 ? 'такт' : 'такта'})`, `Full dictation: ${n} notes and rhythm (${cfg.bars} bar(s))`),
    stimulus: [...cad.events, ...clicks, ...melEvents.map((e) => ({ ...e, t: e.t + start }))],
    alt: [
      { label: tr(ctx, 'Только мелодия', 'Melody only'), events: melEvents },
      { label: tr(ctx, 'Медленно', 'Slowly'), events: melEvents.map((e) => ({ ...e, t: e.t * 1.5, d: e.d * 1.5 })) },
    ],
    input: 'sequence',
    stages: [
      { until: n, title: tr(ctx, 'Шаг 1: высота', 'Step 1: pitches'), choices: pitchChoices },
      { until: n + beats, title: tr(ctx, 'Шаг 2: ритм по долям', 'Step 2: rhythm per beat'), choices: cellChoices },
    ],
    choices: [...pitchChoices, ...cellChoices],
    answer: [...pitchIds, ...cells],
    itemKeys: [...pitchIds.map((x) => `mel:${x.replace(',', '')}`), ...cells.map((c) => `rdict:${c}`)],
    answerLabel: pitchIds.map((x) => degreeLabel(ctx, x).label).join(' ') + ' · ' + cells.map((c) => cellById(c)[ctx.lang === 'ru' ? 'ru' : 'en']).join(', '),
    renderSequence: (ids) => {
      const p = ids.slice(0, n).map(melSemis);
      const r = ids.slice(n);
      return realize(p, r.length ? cellsToDurations(r) : durs);
    },
    answerAudio: melEvents,
    explain: tr(ctx, 'Сначала запиши ступени, потом расставь их по долям', 'Write the degrees first, then fit them into beats'),
  };
}

// ───────────────────────── pulse ─────────────────────────
export function genPulse(cfg: Extract<ExerciseConfig, { kind: 'pulse' }>, ctx: GenCtx): Question {
  const bpm = (cfg.bpm ?? pick(ctx.rng, [80, 90, 100])) / ctx.tempo;
  const tonic = randInt(ctx.rng, 55, 62);
  const romans = pick(ctx.rng, [
    ['I', 'V', 'vi', 'IV'],
    ['I', 'IV', 'V', 'I'],
    ['vi', 'IV', 'I', 'V'],
  ]);
  const voiced = voiceProgression(tonic, [...romans, ...romans.slice(0, 1)]);
  const tempo = 60 / bpm / 0.52;
  const { events, bar } = accompany(voiced, 'pop', tempo);
  const beat = bar / 4;
  // listen for one bar, then tap the beats of the next three
  const beats = Array.from({ length: 12 }, (_, i) => bar + i * beat);
  return {
    kind: 'pulse',
    prompt: tr(ctx, 'Слушай такт, потом стучи на каждую долю', 'Listen for a bar, then tap every beat'),
    stimulus: events,
    input: 'pulse',
    choices: [],
    answer: ['ok'],
    itemKeys: ['pulse'],
    answerLabel: tr(ctx, 'Стучи ровно, как шаги: раз-два-три-четыре', 'Tap evenly, like walking: one-two-three-four'),
    pulse: { events, beats, tapFrom: bar - beat / 2, total: bar * 4 + 0.3 },
  };
}
