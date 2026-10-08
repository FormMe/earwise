import { Drum, Instrument, INSTRUMENT_LENGTH, renderClick, renderDrum, renderNote } from './synth';

export interface NoteEvent {
  /** start, seconds from the beginning of the sequence */
  t: number;
  /** duration in seconds */
  d: number;
  midi: number | number[];
  vel?: number;
  /** play with a specific instrument instead of the current one */
  inst?: Instrument;
  /** percussion hit instead of pitched notes (midi is ignored) */
  drum?: Drum;
  /** stagger for chords (seconds between notes) */
  strum?: number;
}

type Voice = { src: AudioBufferSourceNode; gain: GainNode };

const RELEASE: Record<Instrument, number> = { piano: 0.25, epiano: 0.3, guitar: 0.2, eguitar: 0.25, recorder: 0.07, organ: 0.08 };

/** Drop the silent tail of a rendered note (below -60 dB) to save memory. */
function trimTail(data: Float32Array): Float32Array {
  let end = data.length;
  while (end > 1000 && Math.abs(data[end - 1]) < 0.001) end--;
  if (end >= data.length - 1000) return data;
  const out = data.slice(0, end + 200);
  const fade = Math.min(200, out.length);
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  return out;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private dry!: GainNode;
  private wet!: GainNode;
  private cache = new Map<string, AudioBuffer>();
  private clicks: AudioBuffer[] = [];
  private drums: Partial<Record<Drum, AudioBuffer>> = {};
  private voices = new Set<Voice>();
  private timers = new Set<number>();
  instrument: Instrument = 'piano';
  private volume = 0.8;

  get context() {
    return this.ctx;
  }

  ensure(): AudioContext {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'interactive' });
      const ctx = this.ctx;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 6;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      // brick-wall limiter as the very last stage: chords + bass + drums + reverb never clip
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -2;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.1;
      this.master = ctx.createGain();
      this.master.gain.value = this.volume;
      this.dry = ctx.createGain();
      this.wet = ctx.createGain();
      this.wet.gain.value = 0.22;
      const conv = ctx.createConvolver();
      conv.buffer = this.makeImpulse(ctx, 1.6);
      this.dry.connect(this.master);
      this.wet.connect(conv).connect(this.master);
      this.master.connect(comp).connect(limiter).connect(ctx.destination);
      this.clicks = [false, true].map((acc) => this.toBuffer(renderClick(ctx.sampleRate, acc)));
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Must be called from a user gesture on iOS. Plays a silent buffer to unlock audio. */
  unlock() {
    const ctx = this.ensure();
    const b = ctx.createBuffer(1, 1, ctx.sampleRate);
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.connect(ctx.destination);
    s.start();
    this.prewarm();
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  setInstrument(i: Instrument) {
    if (i !== this.instrument) {
      this.instrument = i;
      this.prewarm();
    }
  }

  private makeImpulse(ctx: AudioContext, seconds: number) {
    const len = Math.floor(seconds * ctx.sampleRate);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3) * (i < 200 ? i / 200 : 1);
      }
    }
    return buf;
  }

  private toBuffer(data: Float32Array) {
    const ctx = this.ensure();
    const b = ctx.createBuffer(1, data.length, ctx.sampleRate);
    b.getChannelData(0).set(data);
    return b;
  }

  private buffer(midi: number, inst = this.instrument) {
    const key = `${inst}:${midi}`;
    let b = this.cache.get(key);
    if (b) {
      // LRU: re-insert so the most recently used notes survive eviction
      this.cache.delete(key);
      this.cache.set(key, b);
      return b;
    }
    b = this.toBuffer(trimTail(renderNote(inst, midi, this.ensure().sampleRate)));
    this.cache.set(key, b);
    // keep memory bounded on phones (≈150 notes)
    while (this.cache.size > 150) this.cache.delete(this.cache.keys().next().value!);
    return b;
  }

  private prewarmHandle = 0;
  /** Render the most used range in idle time so the first play is instant. */
  prewarm() {
    if (!this.ctx) return;
    const inst = this.instrument;
    const order: number[] = [];
    for (let d = 0; d <= 26; d++) {
      order.push(62 + d);
      if (d) order.push(62 - d);
    }
    const gen = ++this.prewarmHandle;
    let i = 0;
    const step = () => {
      if (gen !== this.prewarmHandle) return;
      const start = performance.now();
      while (i < order.length && performance.now() - start < 12) {
        this.buffer(order[i++], inst);
      }
      if (i < order.length) setTimeout(step, 30);
    };
    setTimeout(step, 50);
  }

  now() {
    return this.ensure().currentTime;
  }

  /** Play a single note. `at` is an absolute AudioContext time. */
  note(midi: number, at: number, dur: number, vel = 0.8, inst = this.instrument) {
    const ctx = this.ensure();
    const buf = this.buffer(midi, inst);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    const v = Math.max(0, Math.min(1, vel * (0.94 + Math.random() * 0.08)));
    g.gain.setValueAtTime(v, at);
    const maxDur = INSTRUMENT_LENGTH[inst] - 0.05;
    const end = at + Math.min(dur, maxDur);
    const rel = RELEASE[inst];
    g.gain.setValueAtTime(v, end);
    g.gain.setTargetAtTime(0, end, rel / 3);
    src.connect(g);
    g.connect(this.dry);
    g.connect(this.wet);
    src.start(at);
    src.stop(end + rel * 2);
    const voice = { src, gain: g };
    this.voices.add(voice);
    src.onended = () => {
      this.voices.delete(voice);
      g.disconnect();
    };
  }

  drum(kind: Drum, at: number, vel = 0.8) {
    const ctx = this.ensure();
    const buf = (this.drums[kind] ??= this.toBuffer(renderDrum(kind, ctx.sampleRate)));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vel;
    src.connect(g).connect(this.dry);
    src.start(at);
    const voice = { src, gain: g };
    this.voices.add(voice);
    src.onended = () => this.voices.delete(voice);
  }

  click(at: number, accent = false) {
    const ctx = this.ensure();
    const src = ctx.createBufferSource();
    src.buffer = this.clicks[accent ? 1 : 0];
    const g = ctx.createGain();
    g.gain.value = 0.9;
    src.connect(g).connect(this.master);
    src.start(at);
    const voice = { src, gain: g };
    this.voices.add(voice);
    src.onended = () => this.voices.delete(voice);
  }

  /**
   * Play a list of events. Resolves when the sequence has finished.
   * Stops anything that is currently playing first.
   */
  play(events: NoteEvent[], opts: { stopPrevious?: boolean } = {}): Promise<void> {
    if (opts.stopPrevious !== false) this.stopAll();
    const ctx = this.ensure();
    // the recorder only plays single notes in its own register; anything else falls back to piano
    const pitched = events.filter((e) => !e.drum).flatMap((e) => (Array.isArray(e.midi) ? e.midi : [e.midi]));
    const lowest = pitched.length ? Math.min(...pitched) : 127;
    const instFor = (e: NoteEvent, n: number) => e.inst ?? (this.instrument === 'recorder' && (n > 1 || lowest < 60) ? 'piano' : this.instrument);
    // render every note first, then schedule — otherwise slow first renders smear chords and rhythms
    for (const e of events) {
      if (e.drum) continue;
      const notes = Array.isArray(e.midi) ? e.midi : [e.midi];
      for (const m of notes) this.buffer(m, instFor(e, notes.length));
    }
    const t0 = ctx.currentTime + 0.06;
    let end = 0;
    for (const e of events) {
      if (e.drum) {
        this.drum(e.drum, t0 + e.t, e.vel ?? 0.8);
        end = Math.max(end, e.t + 0.2);
        continue;
      }
      const notes = Array.isArray(e.midi) ? e.midi : [e.midi];
      notes.forEach((m, i) => {
        const at = t0 + e.t + (e.strum ?? 0) * i;
        // chords are scaled by 1/√n so they sit at the level of a single note
        this.note(m, at, e.d, e.vel ?? (notes.length > 1 ? 0.8 / Math.sqrt(notes.length) : 0.8), instFor(e, notes.length));
      });
      end = Math.max(end, e.t + e.d + (e.strum ?? 0) * notes.length);
    }
    return this.wait(end + 0.1);
  }

  wait(seconds: number): Promise<void> {
    return new Promise((res) => {
      const id = window.setTimeout(() => {
        this.timers.delete(id);
        res();
      }, seconds * 1000);
      this.timers.add(id);
    });
  }

  /** Short UI feedback sounds (not musical content). */
  sfx(kind: 'ok' | 'bad' | 'win' | 'tap') {
    const ctx = this.ensure();
    const t = ctx.currentTime + 0.01;
    const blip = (f: number, at: number, d: number, type: OscillatorType, v: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, at);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(v, at + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, at + d);
      o.connect(g).connect(this.master);
      o.start(at);
      o.stop(at + d + 0.02);
    };
    if (kind === 'ok') {
      blip(1318.5, t, 0.12, 'sine', 0.12);
      blip(1975.5, t + 0.07, 0.2, 'sine', 0.1);
    } else if (kind === 'bad') {
      blip(196, t, 0.18, 'triangle', 0.14);
      blip(185, t + 0.09, 0.22, 'triangle', 0.12);
    } else if (kind === 'win') {
      [1046.5, 1318.5, 1568, 2093].forEach((f, i) => blip(f, t + i * 0.09, 0.3, 'sine', 0.1));
    } else {
      blip(2400, t, 0.03, 'sine', 0.05);
    }
  }

  stopAll() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const v of this.voices) {
      try {
        v.gain.gain.cancelScheduledValues(t);
        v.gain.gain.setTargetAtTime(0, t, 0.02);
        v.src.stop(t + 0.1);
      } catch {
        /* already stopped */
      }
    }
    this.voices.clear();
  }
}

export const audio = new AudioEngine();
