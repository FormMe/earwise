/**
 * Offline synthesis of instrument tones into raw sample arrays.
 * Each note is rendered once and cached as an AudioBuffer by the engine.
 */
import { midiToFreq } from '../theory/notes';

export type Instrument = 'piano' | 'epiano' | 'guitar' | 'eguitar' | 'recorder' | 'organ';

export const INSTRUMENT_LENGTH: Record<Instrument, number> = {
  piano: 3.2,
  epiano: 2.8,
  guitar: 2.6,
  eguitar: 3.2,
  recorder: 3.0,
  organ: 3.0,
};

const TAU = Math.PI * 2;

export function renderNote(inst: Instrument, midi: number, sr: number): Float32Array {
  switch (inst) {
    case 'piano':
      return renderPiano(midi, sr);
    case 'epiano':
      return renderEPiano(midi, sr);
    case 'guitar':
      return renderGuitar(midi, sr);
    case 'organ':
      return renderOrgan(midi, sr);
    case 'eguitar':
      return renderEGuitar(midi, sr);
    case 'recorder':
      return renderRecorder(midi, sr);
  }
}

function normalize(out: Float32Array, peak = 0.55) {
  let m = 0;
  for (let i = 0; i < out.length; i++) m = Math.max(m, Math.abs(out[i]));
  if (m > 0) {
    const k = peak / m;
    for (let i = 0; i < out.length; i++) out[i] *= k;
  }
  // tiny fade-out at the end to avoid clicks
  const fade = Math.min(out.length, Math.floor(sr_fade(out.length)));
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  return out;
}
const sr_fade = (len: number) => Math.min(2000, len / 10);

function renderPiano(midi: number, sr: number) {
  const f0 = midiToFreq(midi);
  const len = Math.floor(INSTRUMENT_LENGTH.piano * sr);
  const out = new Float32Array(len);
  const B = 0.00018 * Math.pow(2, (midi - 60) / 24); // inharmonicity grows with pitch
  const nyq = Math.min(sr * 0.45, 10000);
  const baseDecay = Math.min(6, Math.max(0.7, 3.2 * Math.sqrt(261.6 / f0)));
  const bright = midi < 48 ? 1.35 : midi > 76 ? 1.05 : 1.2;
  const attack = Math.floor(0.002 * sr);
  for (let n = 1; n <= 18; n++) {
    const fn = f0 * n * Math.sqrt(1 + B * n * n);
    if (fn > nyq) break;
    let amp = Math.abs(Math.sin(Math.PI * n * 0.118)) / Math.pow(n, bright);
    if (n === 1 && midi < 45) amp *= 0.6;
    const t2 = baseDecay / (1 + 0.32 * (n - 1));
    const t1 = 0.22 / (1 + 0.15 * (n - 1));
    // two slightly detuned strings → natural beating
    for (const det of [-0.00045, 0.00045]) {
      const w = (TAU * fn * (1 + det)) / sr;
      const phase = Math.random() * TAU;
      const a = amp * 0.5;
      const k1 = Math.exp(-1 / (t1 * sr));
      const k2 = Math.exp(-1 / (t2 * sr));
      let e1 = 0.55;
      let e2 = 0.45;
      for (let i = 0; i < len; i++) {
        const env = e1 + e2;
        if (env < 0.0004) break;
        out[i] += a * env * Math.sin(w * i + phase);
        e1 *= k1;
        e2 *= k2;
      }
    }
  }
  // attack ramp
  for (let i = 0; i < attack; i++) out[i] *= i / attack;
  // hammer thump: short filtered noise burst
  const hl = Math.floor(0.018 * sr);
  let lp = 0;
  const coef = Math.min(0.9, (f0 * 6) / sr);
  for (let i = 0; i < hl; i++) {
    lp += coef * (Math.random() * 2 - 1 - lp);
    out[i] += lp * 0.06 * Math.exp(-i / (0.004 * sr));
  }
  return normalize(out);
}

function renderEPiano(midi: number, sr: number) {
  const f0 = midiToFreq(midi);
  const len = Math.floor(INSTRUMENT_LENGTH.epiano * sr);
  const out = new Float32Array(len);
  const w = (TAU * f0) / sr;
  const wt = (TAU * f0 * 14) / sr;
  const decay = Math.min(3, Math.max(0.6, 1.8 * Math.sqrt(261.6 / f0)));
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const idx = 1.4 * Math.exp(-t / 0.18) + 0.25;
    const env = Math.exp(-t / decay) * Math.min(1, t / 0.003);
    const tine = 0.12 * Math.exp(-t / 0.05) * Math.sin(wt * i);
    const trem = 1 + 0.06 * Math.sin(TAU * 4.5 * t);
    out[i] = env * trem * (Math.sin(w * i + idx * Math.sin(w * i)) + tine);
  }
  return normalize(out, 0.5);
}

function renderGuitar(midi: number, sr: number) {
  const f0 = midiToFreq(midi);
  const len = Math.floor(INSTRUMENT_LENGTH.guitar * sr);
  const out = new Float32Array(len);
  const P = sr / f0 - 0.5;
  const Ni = Math.floor(P);
  const fr = P - Ni;
  const tau = Math.min(3, Math.max(0.8, 2.2 * Math.sqrt(196 / f0)));
  const decay = Math.exp(-1 / (tau * f0));
  // excitation: lowpassed noise (softer pick)
  let lp = 0;
  for (let i = 0; i < Ni + 2 && i < len; i++) {
    lp += 0.55 * (Math.random() * 2 - 1 - lp);
    out[i] = lp;
  }
  let prevY = 0;
  for (let i = Ni + 2; i < len; i++) {
    const y = (1 - fr) * out[i - Ni] + fr * out[i - Ni - 1];
    out[i] = decay * 0.5 * (y + prevY);
    prevY = y;
  }
  // gentle body resonance: one-pole lowpass + DC block
  let s = 0;
  let px = 0;
  let py = 0;
  for (let i = 0; i < len; i++) {
    s += 0.6 * (out[i] - s);
    const yy = s - px + 0.995 * py;
    px = s;
    py = yy;
    out[i] = yy;
  }
  return normalize(out, 0.55);
}

/** Clean-ish electric guitar: bright, long Karplus–Strong string through a soft amp drive. */
function renderEGuitar(midi: number, sr: number) {
  const f0 = midiToFreq(midi);
  const len = Math.floor(INSTRUMENT_LENGTH.eguitar * sr);
  const out = new Float32Array(len);
  const P = sr / f0 - 0.5;
  const Ni = Math.floor(P);
  const fr = P - Ni;
  const tau = Math.min(4.5, Math.max(1.2, 3.4 * Math.sqrt(196 / f0)));
  const decay = Math.exp(-1 / (tau * f0));
  let lp = 0;
  for (let i = 0; i < Ni + 2 && i < len; i++) {
    lp += 0.85 * (Math.random() * 2 - 1 - lp);
    out[i] = lp;
  }
  let prevY = 0;
  for (let i = Ni + 2; i < len; i++) {
    const y = (1 - fr) * out[i - Ni] + fr * out[i - Ni - 1];
    // less damping than the acoustic: blend towards the undamped sample
    out[i] = decay * (0.7 * y + 0.3 * (0.5 * (y + prevY)));
    prevY = y;
  }
  // pickup: comb filter (pickup near the bridge thins the low end)
  const d = Math.max(1, Math.floor(sr / f0 / 7));
  const picked = new Float32Array(len);
  for (let i = 0; i < len; i++) picked[i] = out[i] - 0.55 * (i >= d ? out[i - d] : 0);
  // amp: soft drive + tone control + DC block
  let s = 0;
  let px = 0;
  let py = 0;
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(picked[i]));
  const gain = peak > 0 ? 2.2 / peak : 1;
  for (let i = 0; i < len; i++) {
    const x = Math.tanh(picked[i] * gain);
    s += 0.45 * (x - s);
    const yy = s - px + 0.995 * py;
    px = s;
    py = yy;
    out[i] = yy;
  }
  return normalize(out, 0.5);
}

/** Recorder: near-sine flue tone with breath noise, an attack "chiff" and gentle vibrato. */
function renderRecorder(midi: number, sr: number) {
  const f0 = midiToFreq(midi);
  const len = Math.floor(INSTRUMENT_LENGTH.recorder * sr);
  const out = new Float32Array(len);
  const harm: [number, number][] = [
    [1, 1],
    [2, 0.12],
    [3, 0.16],
    [4, 0.03],
    [5, 0.04],
  ];
  const nyq = sr * 0.45;
  let phase = 0;
  let nlp = 0;
  let nlp2 = 0;
  const bw = Math.min(0.5, (f0 * 2.5) / sr);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    // pitch: tiny overshoot at the start, then delayed vibrato
    const vib = t > 0.35 ? 0.0035 * Math.sin(TAU * 5.2 * t) * Math.min(1, (t - 0.35) * 3) : 0;
    const bend = 0.006 * Math.exp(-t / 0.03);
    phase += (TAU * f0 * (1 + vib + bend)) / sr;
    let v = 0;
    for (const [h, a] of harm) if (f0 * h < nyq) v += a * Math.sin(h * phase);
    // breath noise, band-limited around the note
    const n = Math.random() * 2 - 1;
    nlp += bw * (n - nlp);
    nlp2 += bw * (nlp - nlp2);
    const breath = (nlp - nlp2) * 2.2;
    const env = Math.min(1, t / 0.04) * (0.92 + 0.08 * Math.min(1, t / 0.6));
    const chiff = Math.exp(-t / 0.025) * 0.35 * n;
    out[i] = env * (v + 0.06 * breath) + chiff * Math.min(1, t / 0.004);
  }
  return normalize(out, 0.42);
}

function renderOrgan(midi: number, sr: number) {
  const f0 = midiToFreq(midi);
  const len = Math.floor(INSTRUMENT_LENGTH.organ * sr);
  const out = new Float32Array(len);
  const bars: [number, number][] = [
    [1, 1],
    [2, 0.6],
    [3, 0.35],
    [4, 0.3],
    [6, 0.12],
    [8, 0.1],
  ];
  const nyq = sr * 0.45;
  const att = 0.025 * sr;
  for (const [h, a] of bars) {
    if (f0 * h > nyq) continue;
    const w = (TAU * f0 * h) / sr;
    for (let i = 0; i < len; i++) out[i] += a * Math.sin(w * i);
  }
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    out[i] *= Math.min(1, i / att) * (1 + 0.04 * Math.sin(TAU * 5.5 * t));
  }
  return normalize(out, 0.45);
}

export function renderClick(sr: number, accent: boolean): Float32Array {
  const len = Math.floor(0.06 * sr);
  const out = new Float32Array(len);
  const f = accent ? 1800 : 1200;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    out[i] = Math.sin(TAU * f * t) * Math.exp(-t / 0.012) * (accent ? 0.6 : 0.4);
  }
  return out;
}

export type Drum = 'kick' | 'snare' | 'hat';

export function renderDrum(kind: Drum, sr: number): Float32Array {
  const len = Math.floor((kind === 'hat' ? 0.08 : kind === 'snare' ? 0.2 : 0.35) * sr);
  const out = new Float32Array(len);
  let lp = 0;
  let hp = 0;
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    if (kind === 'kick') {
      const f = 45 + 110 * Math.exp(-t / 0.035);
      out[i] = Math.sin(TAU * f * t + 0) * Math.exp(-t / 0.12) * 0.9;
    } else if (kind === 'snare') {
      const n = Math.random() * 2 - 1;
      lp += 0.35 * (n - lp);
      out[i] = (lp * 0.7 * Math.exp(-t / 0.06) + 0.35 * Math.sin(TAU * 190 * t) * Math.exp(-t / 0.04)) * 0.8;
    } else {
      const n = Math.random() * 2 - 1;
      hp = 0.6 * (hp + n - prev);
      prev = n;
      out[i] = hp * Math.exp(-t / 0.018) * 0.35;
    }
  }
  return out;
}
