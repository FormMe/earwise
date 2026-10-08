import { useCallback, useEffect, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { onsets, scoreTaps } from '../theory/rhythm';
import { useT } from '../i18n';

interface Props {
  pattern: number[];
  bpm: number;
  done: boolean;
  onResult: (ok: boolean, acc: number) => void;
}

type Phase = 'listening' | 'ready' | 'countin' | 'tapping' | 'result';

export function RhythmInput({ pattern, bpm, done, onResult }: Props) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>('listening');
  const [beat, setBeat] = useState(-1);
  const [taps, setTaps] = useState<number[]>([]);
  const [hits, setHits] = useState<boolean[]>([]);
  const [flash, setFlash] = useState(false);
  const startPerf = useRef(0);
  const tapsRef = useRef<number[]>([]);
  const timers = useRef<number[]>([]);
  const s16 = 60 / bpm / 4;
  const total16 = pattern.reduce((a, b) => a + Math.abs(b), 0);
  const beats = total16 / 4;
  const expected = onsets(pattern).map((o) => o * s16);

  const clearTimers = () => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];
  };

  const schedule = useCallback(
    (withPattern: boolean) => {
      audio.stopAll();
      const ctx = audio.ensure();
      const t0 = ctx.currentTime + 0.15;
      const beat = s16 * 4;
      // 4-beat count-in, then clicks through the pattern
      for (let i = 0; i < 4 + beats; i++) audio.click(t0 + i * beat, i % 4 === 0);
      if (withPattern) {
        let pos = 0;
        for (const d of pattern) {
          if (d > 0) audio.note(76, t0 + 4 * beat + pos * s16, Math.min(0.3, d * s16 * 0.9), 0.85);
          pos += Math.abs(d);
        }
      }
      const lat = (ctx.outputLatency || ctx.baseLatency || 0) * 1000;
      const startAt = performance.now() + (t0 - ctx.currentTime) * 1000 + lat;
      clearTimers();
      for (let i = 0; i < 4 + beats; i++) {
        timers.current.push(window.setTimeout(() => setBeat(i), startAt - performance.now() + i * beat * 1000));
      }
      return { startAt, beat };
    },
    [pattern, s16, beats],
  );

  const listen = useCallback(() => {
    setPhase('listening');
    const { startAt, beat } = schedule(true);
    timers.current.push(window.setTimeout(() => {
      setPhase((p) => (p === 'listening' ? 'ready' : p));
      setBeat(-1);
    }, startAt - performance.now() + (4 + beats) * beat * 1000 + 200));
  }, [schedule, beats]);

  useEffect(() => {
    tapsRef.current = [];
    setTaps([]);
    setHits([]);
    const id = window.setTimeout(listen, 300);
    return () => {
      clearTimeout(id);
      clearTimers();
    };
  }, [pattern, listen]);

  const evaluate = useCallback(() => {
    const raw = tapsRef.current;
    // compensate a systematic latency offset (median error of rough matches)
    const rough = expected.map((e) => {
      const near = raw.reduce((b, x) => (Math.abs(x - e) < Math.abs(b - e) ? x : b), Infinity);
      return Math.abs(near - e) < 0.2 ? near - e : null;
    });
    const errs = rough.filter((x): x is number => x != null).sort((a, b) => a - b);
    const offset = errs.length >= 2 ? errs[Math.floor(errs.length / 2)] : 0;
    const adj = raw.map((x) => x - offset);
    const tol = Math.max(0.085, s16 * 0.45);
    const res = scoreTaps(expected, adj, tol);
    setTaps(adj);
    setHits(res.hits);
    setPhase('result');
    onResult(res.acc >= 0.8 && res.extra <= 1, res.acc);
  }, [expected, s16, onResult]);

  const startTapping = () => {
    tapsRef.current = [];
    setTaps([]);
    setPhase('countin');
    const { startAt, beat } = schedule(false);
    startPerf.current = startAt + 4 * beat * 1000;
    timers.current.push(window.setTimeout(() => setPhase('tapping'), startPerf.current - performance.now() - beat * 500));
    timers.current.push(window.setTimeout(evaluate, startPerf.current - performance.now() + beats * beat * 1000 + 350));
  };

  const tap = useCallback(() => {
    if (phase !== 'tapping' && phase !== 'countin') return;
    const tt = (performance.now() - startPerf.current) / 1000;
    if (tt < -0.25) return;
    tapsRef.current.push(tt);
    setTaps([...tapsRef.current]);
    setFlash(true);
    setTimeout(() => setFlash(false), 90);
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tap]);

  const dur = total16 * s16;
  const showPattern = phase === 'result' || done;

  return (
    <div className="rhythm">
      <div className="beats">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`beat-dot ${beat >= 0 && beat % 4 === i ? 'on' : ''} ${beat >= 0 && beat < 4 ? 'count' : ''}`} />
        ))}
      </div>
      <div className="timeline">
        {Array.from({ length: beats }).map((_, i) => (
          <div key={i} className="tl-beat" style={{ left: `${((i * 4) / total16) * 100}%` }} />
        ))}
        {showPattern &&
          expected.map((e, i) => <div key={'e' + i} className={`tl-exp ${hits[i] ? 'hit' : 'miss'}`} style={{ left: `${(e / dur) * 100}%` }} />)}
        {taps.map((x, i) => (
          <div key={'t' + i} className="tl-tap" style={{ left: `${Math.max(0, Math.min(100, (x / dur) * 100))}%` }} />
        ))}
      </div>
      {phase === 'listening' && <p className="muted center">{t('rhythmListen')} 👂</p>}
      {phase === 'ready' && !done && (
        <div className="row center gap">
          <button className="btn ghost" onClick={listen}>
            🔁 {t('replay')}
          </button>
          <button className="btn primary" onClick={startTapping}>
            {t('rhythmStart')}
          </button>
        </div>
      )}
      {(phase === 'countin' || phase === 'tapping') && (
        <button className={`tap-pad ${flash ? 'flash' : ''} ${phase === 'tapping' ? 'live' : ''}`} onPointerDown={(e) => (e.preventDefault(), tap())}>
          {phase === 'countin' ? (beat >= 0 && beat < 4 ? 4 - beat : '…') : t('rhythmTap')}
        </button>
      )}
      {phase === 'result' && (
        <p className="center muted">
          {t('hits')}: {hits.filter(Boolean).length}/{expected.length}
        </p>
      )}
    </div>
  );
}
