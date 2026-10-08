import { useEffect, useRef, useState } from 'react';
import { audio, NoteEvent } from '../audio/engine';
import { scoreTaps } from '../theory/rhythm';
import { useT } from '../i18n';

interface Props {
  pulse: { events: NoteEvent[]; beats: number[]; tapFrom: number; total: number };
  done: boolean;
  onResult: (ok: boolean) => void;
}

/** Tap the beat while the music plays. Taps are compared with the beats after the first bar. */
export function PulseInput({ pulse, done, onResult }: Props) {
  const t = useT();
  const [phase, setPhase] = useState<'ready' | 'playing' | 'result'>('ready');
  const [flash, setFlash] = useState(false);
  const [hits, setHits] = useState<number | null>(null);
  const start = useRef(0);
  const taps = useRef<number[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    audio.stopAll();
  }, []);

  const go = async () => {
    await audio.ready();
    taps.current = [];
    setHits(null);
    const ctx = audio.ensure();
    const lat = (ctx.outputLatency || ctx.baseLatency || 0) * 1000;
    start.current = performance.now() + 60 + lat;
    audio.play(pulse.events);
    setPhase('playing');
    timer.current = window.setTimeout(() => {
      const raw = taps.current.filter((x) => x >= pulse.tapFrom);
      // compensate a steady latency offset before grading
      const errs = pulse.beats
        .map((b) => raw.reduce((best, x) => (Math.abs(x - b) < Math.abs(best - b) ? x : best), Infinity) - b)
        .filter((e) => Math.abs(e) < 0.35)
        .sort((a, b) => a - b);
      const off = errs.length > 2 ? Math.max(-0.12, Math.min(0.12, errs[Math.floor(errs.length / 2)])) : 0;
      const res = scoreTaps(pulse.beats, raw.map((x) => x - off), 0.09);
      setHits(res.hits.filter(Boolean).length);
      setPhase('result');
      onResult(res.acc >= 0.75);
    }, pulse.total * 1000 + 200);
  };

  const tap = (ts: number = performance.now()) => {
    if (phase !== 'playing') return;
    taps.current.push((ts - start.current) / 1000);
    setFlash(true);
    setTimeout(() => setFlash(false), 80);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        tap(e.timeStamp);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  return (
    <div className="rhythm">
      <div className="beats" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="beat-dot" />
        ))}
      </div>
      {phase === 'ready' && !done && (
        <button className="btn primary big" onClick={go}>
          ▶ {t('rhythmStart')}
        </button>
      )}
      {phase === 'playing' && (
        <button className={`tap-pad live ${flash ? 'flash' : ''}`} onPointerDown={(e) => (e.preventDefault(), tap(e.timeStamp))}>
          {t('rhythmTap')}
        </button>
      )}
      {hits != null && (
        <p className="center muted">
          {t('hits')}: {hits}/{pulse.beats.length}
        </p>
      )}
    </div>
  );
}
