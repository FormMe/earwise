import { describe, expect, it } from 'vitest';
import { generate, resolution } from '../exercises/generate';
import type { ExerciseConfig, GenCtx } from '../exercises/types';
import { ALL_LESSONS } from '../game/curriculum';
import { sampleKeys } from '../game/sessions';
import { invert } from '../theory/chords';
import { cadence, generateProgression, voiceProgression } from '../theory/harmony';
import { generateMelody } from '../theory/melody';
import { pc } from '../theory/notes';
import { mulberry32 } from '../theory/random';
import { generateRhythm, onsets, scoreTaps } from '../theory/rhythm';
import { detectPitch } from '../audio/pitch';
import { levelFromXp, xpForLevel, starsFor } from '../game/store';

const ctx = (seed = 1): GenCtx => ({ rng: mulberry32(seed), weight: () => 1, lang: 'ru', naming: 'solfege', fixedRoot: false, tempo: 1, voice: 'low' });

describe('theory', () => {
  it('inverts chords', () => {
    expect(invert([0, 4, 7], 1)).toEqual([0, 3, 8]);
    expect(invert([0, 4, 7], 2)).toEqual([0, 5, 9]);
  });

  it('voices a cadence with the right roots in the bass', () => {
    const c = cadence(60);
    expect(c.map((ch) => pc(ch[0]))).toEqual([0, 5, 7, 0]);
    // upper voices contain the chord tones
    expect(new Set(c[1].slice(1).map(pc))).toEqual(new Set([5, 9, 0]));
  });

  it('voice leading keeps upper voices close', () => {
    const v = voiceProgression(62, ['I', 'IV', 'V', 'I']);
    for (let i = 1; i < v.length; i++) {
      const moved = v[i].slice(1).reduce((s, n, k) => s + Math.abs(n - v[i - 1][k + 1]), 0);
      expect(moved).toBeLessThanOrEqual(9);
    }
  });

  it('progressions start on the tonic and stay in the pool', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 50; i++) {
      const p = generateProgression(rng, ['I', 'IV', 'V', 'vi'], 4);
      expect(p[0]).toBe('I');
      expect(p).toHaveLength(4);
      p.forEach((c) => expect(['I', 'IV', 'V', 'vi']).toContain(c));
      for (let k = 1; k < p.length; k++) expect(p[k]).not.toBe(p[k - 1]);
    }
  });

  it('melodies respect pool and max leap', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 50; i++) {
      const m = generateMelody(rng, { pool: [0, 2, 4, 5, 7], length: 6, maxLeap: 4, startOnTonic: true });
      expect(m[0]).toBe(0);
      for (let k = 1; k < m.length; k++) expect(Math.abs(m[k] - m[k - 1])).toBeLessThanOrEqual(4);
    }
  });

  it('rhythms fill exactly one bar', () => {
    const rng = mulberry32(9);
    for (let lvl = 1; lvl <= 4; lvl++)
      for (let i = 0; i < 30; i++) {
        const r = generateRhythm(rng, lvl, 1);
        expect(r.reduce((a, b) => a + Math.abs(b), 0)).toBe(16);
        expect(onsets(r).length).toBeGreaterThanOrEqual(3);
      }
  });

  it('scores taps with tolerance', () => {
    const exp = [0, 0.5, 1, 1.5];
    expect(scoreTaps(exp, [0.02, 0.49, 1.05, 1.52], 0.08).acc).toBe(1);
    expect(scoreTaps(exp, [0.02, 0.49], 0.08).acc).toBe(0.5);
    expect(scoreTaps(exp, [0, 0.25, 0.5, 0.75, 1, 1.5], 0.08).extra).toBe(2);
  });

  it('degree resolution walks to the tonic', () => {
    expect(resolution(4, false)).toEqual([4, 2, 0]);
    expect(resolution(9, false)).toEqual([9, 11, 12]);
    expect(resolution(0, false)).toEqual([0]);
    expect(resolution(6, false)).toEqual([6, 5, 4, 2, 0]);
  });

  it('detects pitch of a sine', () => {
    const sr = 44100;
    for (const f of [110, 220, 330.5, 440, 659.3]) {
      const buf = new Float32Array(2048).map((_, i) => 0.5 * Math.sin((2 * Math.PI * f * i) / sr) + 0.15 * Math.sin((4 * Math.PI * f * i) / sr));
      const r = detectPitch(buf, sr)!;
      expect(r).not.toBeNull();
      expect(Math.abs(1200 * Math.log2(r.freq / f))).toBeLessThan(10);
    }
  });

  it('levels and stars', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(xpForLevel(2))).toBe(2);
    expect(levelFromXp(xpForLevel(5) - 1)).toBe(4);
    expect(starsFor(0.6)).toBe(0);
    expect(starsFor(0.8)).toBe(1);
    expect(starsFor(0.9)).toBe(2);
    expect(starsFor(1)).toBe(3);
    expect(starsFor(0.84, 0.85)).toBe(0);
  });
});

describe('every lesson generates valid questions', () => {
  for (const l of ALL_LESSONS) {
    it(`${l.unit.id}/${l.id}`, () => {
      for (let seed = 1; seed <= 25; seed++) {
        const q = generate(l.cfg as ExerciseConfig, ctx(seed));
        expect(q.stimulus.length).toBeGreaterThan(0);
        expect(q.itemKeys.length).toBeGreaterThan(0);
        expect(q.answer.length).toBeGreaterThan(0);
        if (q.input === 'choice' || q.input === 'keys') {
          expect(q.choices.map((c) => c.id)).toContain(q.answer[0]);
          expect(new Set(q.choices.map((c) => c.id)).size).toBe(q.choices.length);
        }
        if (q.input === 'sequence') {
          q.answer.forEach((a) => expect(q.choices.map((c) => c.id)).toContain(a));
          expect(q.itemKeys.length).toBe(q.answer.length - (q.given ?? 0));
        }
        // everything audible should be in a sane MIDI range
        for (const e of q.stimulus.filter((x) => !x.drum)) for (const m of Array.isArray(e.midi) ? e.midi : [e.midi]) {
          expect(m).toBeGreaterThanOrEqual(28);
          expect(m).toBeLessThanOrEqual(100);
        }
      }
    });
  }

  it('sampleKeys finds keys for review', () => {
    expect(sampleKeys({ kind: 'interval', set: [3, 4], dirs: ['up'] }).sort()).toEqual(['int:3:up', 'int:4:up']);
  });
});

import { generateBeatRhythm, cellsToDurations } from '../theory/rhythmCells';
import { isUnlocked, questionCount, lessonById, UNITS } from '../game/curriculum';

describe('methodology', () => {
  it('beat rhythms fill every beat', () => {
    const rng = mulberry32(3);
    for (let lvl = 1; lvl <= 4; lvl++) {
      const r = generateBeatRhythm(rng, lvl, 8);
      expect(r).toHaveLength(8);
      expect(Math.round(cellsToDurations(r).reduce((a, b) => a + Math.abs(b), 0))).toBe(32);
    }
  });

  it('two-option lessons are long enough to rule out guessing', () => {
    expect(questionCount(lessonById('a7')!)).toBe(16);
    expect(questionCount(lessonById('f8')!)).toBe(30);
  });

  it('units have enough lessons and end with a checkpoint', () => {
    for (const u of UNITS.filter((x) => !x.optional)) {
      expect(u.lessons.length).toBeGreaterThanOrEqual(7);
      expect(u.lessons[u.lessons.length - 1].checkpoint).toBe(true);
    }
  });

  it('checkpoints are always open, lessons unlock in order', () => {
    expect(isUnlocked('b10', {}, false)).toBe(true);
    expect(isUnlocked('b1', {}, false)).toBe(false);
    expect(isUnlocked('a2', { a1: { stars: 1 } }, false)).toBe(true);
    expect(isUnlocked('o1', {}, false)).toBe(true);
  });
});

import { levelConfig } from '../game/curriculum';
import { placementSpec, lessonSpec } from '../game/sessions';

describe('levels & placement', () => {
  it('higher levels make degree drills harder', () => {
    const c = levelConfig({ kind: 'degree', set: ['1', '3', '5'] }, 4);
    expect(c.kind === 'degree' && c.wide && c.context === 'tonic').toBe(true);
  });
  it('replaying a passed lesson goes to the next level', () => {
    const spec = lessonSpec('b2', 'ru', { b2: { stars: 2, best: 0.9, plays: 1, level: 1 } }, {});
    expect(spec.level).toBe(2);
    expect(spec.randomTimbre).toBe(true);
    const top = lessonSpec('b2', 'ru', { b2: { stars: 3, best: 1, plays: 9, level: 5 } }, {});
    expect(top.level).toBe(5);
    expect(top.replays).toBe(2);
  });
  it('placement covers every main unit', () => {
    // unit 1 is credited together with unit 2
    expect(placementSpec('ru').blocks!.length).toBe(13);
  });
  it('full dictation answers pitches then one cell per beat', () => {
    const q = generate({ kind: 'fullDictation', set: ['1', '2', '3', '4', '5'], bars: 1, level: 1 }, ctx(4));
    const n = q.stages![0].until;
    expect(q.answer.length).toBe(n + 4);
    expect(q.renderSequence!(q.answer).length).toBe(n);
  });
});

import { KIND_HELP } from '../game/help';
import { KIND_META, itemCount } from '../game/curriculum';

describe('honest answering', () => {
  it('every exercise type has a help card', () => {
    for (const k of Object.keys(KIND_META)) expect(KIND_HELP[k as keyof typeof KIND_HELP]).toBeTruthy();
  });
  it('placement only uses guess-resistant questions', () => {
    for (const b of placementSpec('ru').blocks!)
      for (const c of b.configs) expect(c.kind !== 'pitch' && (itemCount(c) >= 3 || ['melody', 'progression', 'bass', 'rhythmDictation', 'twoVoice', 'fullDictation'].includes(c.kind))).toBe(true);
  });
});
