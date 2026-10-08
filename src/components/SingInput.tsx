import { useEffect, useRef, useState } from 'react';
import { MicPitch } from '../audio/pitch';
import { freqToMidi, noteName } from '../theory/notes';
import { useStore } from '../game/store';
import { useT } from '../i18n';

export const sharedMic = new MicPitch();
let micOn = false;
let micP: Promise<void> | null = null;
let gen = 0;

/** Start the mic once; a double tap or leaving mid-prompt never leaves a stream running. */
export function ensureMic() {
  const g = gen;
  return (micP ??= sharedMic
    .start()
    .then(() => {
      if (g !== gen) {
        sharedMic.stop();
        throw new Error('cancelled');
      }
      micOn = true;
    })
    .catch((e) => {
      micP = null;
      throw e;
    }));
}
export function stopMic() {
  gen++;
  micP = null;
  sharedMic.stop();
  micOn = false;
}

interface Props {
  targets: number[];
  /** sing the targets one after another (echo a phrase) */
  sequential?: boolean;
  targetLabel: string;
  busy: boolean;
  done: boolean;
  onResult: (ok: boolean, skipped?: boolean) => void;
}

const HOLD_MS = 700;
const TOL = 45; // cents

export function SingInput({ targets, sequential, targetLabel, busy, done, onResult }: Props) {
  const t = useT();
  const { naming, lang } = useStore((s) => s.settings);
  const [status, setStatus] = useState<'idle' | 'on' | 'denied'>(micOn ? 'on' : 'idle');
  const [silent, setSilent] = useState(false);
  const lastVoice = useRef(performance.now());
  const [cents, setCents] = useState<number | null>(null);
  const [heard, setHeard] = useState<number | null>(null);
  const [hold, setHold] = useState(0);
  const holdStart = useRef<number | null>(null);
  const hist = useRef<number[]>([]);
  const quietUntil = useRef(0);
  const fired = useRef(false);
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);

  useEffect(() => {
    fired.current = false;
    posRef.current = 0;
    setPos(0);
  }, [targets]);

  const finish = (ok: boolean, skipped = false) => {
    if (fired.current) return;
    fired.current = true;
    onResult(ok, skipped);
  };

  useEffect(() => {
    // ignore the mic while sound plays and for its reverb tail afterwards
    quietUntil.current = performance.now() + (busy ? 1e9 : 700);
  }, [busy]);

  useEffect(() => {
    if (status !== 'on' || done) return;
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 45) return;
      last = now;
      if (busy || now < quietUntil.current) {
        holdStart.current = null;
        setHold(0);
        return;
      }
      const r = sharedMic.read();
      if (r && r.clarity >= 0.8) {
        lastVoice.current = now;
        setSilent(false);
      } else if (now - Math.max(lastVoice.current, quietUntil.current) > 8000) setSilent(true);
      if (!r || r.clarity < 0.8) {
        hist.current = [];
        holdStart.current = null;
        setHold(0);
        setCents(null);
        return;
      }
      const m = freqToMidi(r.freq);
      hist.current = [...hist.current.slice(-4), m];
      const sorted = [...hist.current].sort((a, b) => a - b);
      const med = sorted[Math.floor(sorted.length / 2)];
      setHeard(med);
      // octave-agnostic distance to the closest target
      let best = Infinity;
      for (const tg of sequential ? [targets[posRef.current]] : targets) {
        let d = (med - tg) % 12;
        if (d > 6) d -= 12;
        if (d < -6) d += 12;
        if (Math.abs(d) < Math.abs(best)) best = d;
      }
      const c = best * 100;
      setCents(c);
      if (Math.abs(c) <= TOL) {
        if (holdStart.current == null) holdStart.current = now;
        const p = Math.min(1, (now - holdStart.current) / (sequential ? 300 : HOLD_MS));
        setHold(p);
        if (p >= 1) {
          if (sequential && posRef.current < targets.length - 1) {
            posRef.current++;
            setPos(posRef.current);
            holdStart.current = null;
            hist.current = [];
            setHold(0);
          } else finish(true);
        }
      } else {
        holdStart.current = null;
        setHold(0);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, busy, done, targets]);

  const start = async () => {
    try {
      await ensureMic();
      setStatus('on');
    } catch {
      setStatus('denied');
    }
  };

  if (status === 'idle')
    return (
      <div className="sing">
        <div className="sing-target">🎤 {targetLabel}</div>
        <button className="btn primary big" onClick={start}>
          {t('micStart')}
        </button>
        <button className="btn ghost small" onClick={() => finish(false, true)}>
          {t('skip')}
        </button>
      </div>
    );
  if (status === 'denied')
    return (
      <div className="sing">
        <p className="muted">{t('micDenied')}</p>
        <button className="btn ghost" onClick={() => finish(false, true)}>
          {t('singSkip')}
        </button>
      </div>
    );

  const clamped = cents == null ? 0 : Math.max(-100, Math.min(100, cents));
  const inTune = cents != null && Math.abs(cents) <= TOL;
  return (
    <div className="sing">
      <div className="sing-target">🎤 {targetLabel}</div>
      <div className={`tuner ${inTune ? 'in' : ''}`}>
        <div className="tuner-zone" />
        <div className="tuner-center" />
        {cents != null && <div className="tuner-needle" style={{ left: `${50 + clamped / 2}%` }} />}
        <div className="tuner-labels">
          <span>♭ {t('tooLow')}</span>
          <span>{t('tooHigh')} ♯</span>
        </div>
      </div>
      <div className="sing-status">
        {done ? '' : busy ? t('listenFirst') : cents == null ? t('micListening') : inTune ? t('holdIt') : heard != null ? noteName(Math.round(heard), naming, lang, true) : ''}
      </div>
      {sequential && (
        <div className="echo-dots">
          {targets.map((_, i) => (
            <span key={i} className={i < pos || (done && fired.current) ? 'ok' : i === pos ? 'cur' : ''} />
          ))}
        </div>
      )}
      {silent && !done && <p className="muted small center">🎙️ {t('noVoice')}</p>}
      <div className="hold-bar">
        <div style={{ width: `${hold * 100}%` }} />
      </div>
      {!done && (
        <button className="btn ghost small" onClick={() => finish(false, true)}>
          {t('singSkip')}
        </button>
      )}
    </div>
  );
}
