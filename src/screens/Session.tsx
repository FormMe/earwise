import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio, NoteEvent } from '../audio/engine';
import { generate } from '../exercises/generate';
import type { Question } from '../exercises/types';
import { useNav, SessionSpec } from '../game/nav';
import { FinishOutcome, itemWeight, starsFor, useStore } from '../game/store';
import { useT } from '../i18n';
import { mulberry32, pick, Rng } from '../theory/random';
import { pc } from '../theory/notes';
import { Piano } from '../components/Piano';
import { SingInput, stopMic } from '../components/SingInput';
import { RhythmInput } from '../components/RhythmInput';
import { Results } from './Results';
import { haptic } from '../components/haptics';

interface Mistake {
  q: Question;
  user: string[];
}

const TEMPO = { slow: 1.35, normal: 1, fast: 0.78 };

export function Session({ spec }: { spec: SessionSpec }) {
  const t = useT();
  const settings = useStore((s) => s.settings);
  const recordAnswer = useStore((s) => s.recordAnswer);
  const recordSung = useStore((s) => s.recordSung);
  const finishSession = useStore((s) => s.finishSession);
  const back = useNav((s) => s.back);
  const startSession = useNav((s) => s.startSession);

  const rng = useRef<Rng>(spec.seed ? mulberry32(spec.seed) : Math.random);
  const [q, setQ] = useState<Question | null>(null);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'answer' | 'feedback' | 'done'>('answer');
  const [picked, setPicked] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [xpPop, setXpPop] = useState<{ v: number; k: number } | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [timeLeft, setTimeLeft] = useState(spec.timeLimit ?? 0);
  const [lives, setLives] = useState(spec.lives ?? 0);
  const [outcome, setOutcome] = useState<FinishOutcome | null>(null);
  const [kinds, setKinds] = useState<string[]>([]);
  const playToken = useRef(0);
  const prevKey = useRef<string | undefined>(undefined);
  const nextTimer = useRef<number | null>(null);
  const finished = useRef(false);

  const makeQuestion = useCallback(
    (i: number, score: number) => {
      let cfg = spec.configs[0];
      if (spec.escalate) {
        const n = Math.min(spec.configs.length, 3 + Math.floor(score / 3));
        cfg = pick(rng.current, spec.configs.slice(0, n));
      } else if (spec.mode === 'daily') cfg = spec.configs[i % spec.configs.length];
      else if (spec.configs.length > 1) cfg = pick(rng.current, spec.configs);
      const items = useStore.getState().items;
      const question = generate(cfg, {
        rng: rng.current,
        weight: (k) => itemWeight(items, k),
        lang: settings.lang,
        naming: settings.naming,
        fixedRoot: settings.fixedRoot,
        tempo: TEMPO[settings.tempo],
        voice: settings.voice,
        prevKey: prevKey.current,
      });
      prevKey.current = question.itemKeys[0];
      return question;
    },
    [spec, settings],
  );

  const play = useCallback(async (events: NoteEvent[]) => {
    const token = ++playToken.current;
    setPlaying(true);
    await audio.play(events);
    if (token === playToken.current) setPlaying(false);
  }, []);

  const showQuestion = useCallback(
    (question: Question) => {
      setQ(question);
      setPicked(question.given ? question.answer.slice(0, question.given) : []);
      setIsCorrect(null);
      setPhase('answer');
      setKinds((k) => (k.includes(question.kind) ? k : [...k, question.kind]));
      if (question.input !== 'rhythm') setTimeout(() => play(question.stimulus), 250);
    },
    [play],
  );

  // first question
  useEffect(() => {
    showQuestion(makeQuestion(0, 0));
    return () => {
      audio.stopAll();
      stopMic();
      if (nextTimer.current) clearTimeout(nextTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = useCallback(
    (final?: { correct: number; total: number; xp: number; maxCombo: number }) => {
      if (finished.current) return;
      finished.current = true;
      if (nextTimer.current) clearTimeout(nextTimer.current);
      audio.stopAll();
      stopMic();
      const f = final ?? { correct, total, xp, maxCombo };
      const acc = f.total ? f.correct / f.total : 0;
      const bonus = spec.mode === 'lesson' ? starsFor(acc) * 5 : 0;
      const res = finishSession({
        mode: spec.mode,
        lessonId: spec.lessonId,
        correct: f.correct,
        total: f.total,
        xp: f.xp + bonus,
        maxCombo: f.maxCombo,
        score: f.correct,
        kinds,
      });
      setXp(f.xp + bonus);
      setOutcome(res);
      setPhase('done');
      if (settings.sfx && (res.stars > 0 || spec.mode !== 'lesson')) audio.sfx('win');
    },
    [correct, total, xp, maxCombo, spec, finishSession, kinds, settings.sfx],
  );

  // blitz timer
  useEffect(() => {
    if (!spec.timeLimit || phase === 'done') return;
    const id = setInterval(() => setTimeLeft((x) => Math.max(0, x - 0.1)), 100);
    return () => clearInterval(id);
  }, [spec.timeLimit, phase]);
  useEffect(() => {
    if (spec.timeLimit && timeLeft <= 0 && !finished.current) finish();
  }, [timeLeft, spec.timeLimit, finish]);

  const advance = useCallback(() => {
    if (nextTimer.current) {
      clearTimeout(nextTimer.current);
      nextTimer.current = null;
    }
    if (finished.current) return;
    const n = idx + 1;
    if (spec.count != null && n >= spec.count) return finish();
    if (spec.lives != null && lives <= 0) return finish();
    setIdx(n);
    showQuestion(makeQuestion(n, correct));
  }, [idx, spec, lives, correct, finish, makeQuestion, showQuestion]);

  const judge = useCallback(
    (user: string[], okOverride?: boolean) => {
      if (!q || phase !== 'answer') return;
      const given = q.given ?? 0;
      const ok = okOverride ?? (user.length === q.answer.length && user.every((u, i) => u === q.answer[i]));
      // stats
      if (q.input === 'sequence') {
        q.answer.slice(given).forEach((a, i) => recordAnswer([q.itemKeys[i]], user[i + given] === a));
      } else recordAnswer(q.itemKeys, ok);
      if (q.input === 'sing' && ok) recordSung();

      const newCombo = ok ? combo + 1 : 0;
      const mult = spec.xpMult ?? 1;
      const gained = ok ? Math.round((10 + Math.min(10, Math.floor(newCombo / 3) * 2)) * mult) : 0;
      const nc = correct + (ok ? 1 : 0);
      const nt = total + 1;
      const nmax = Math.max(maxCombo, newCombo);
      const nxp = xp + gained;
      setCombo(newCombo);
      setMaxCombo(nmax);
      setCorrect(nc);
      setTotal(nt);
      setXp(nxp);
      setPicked(user);
      setIsCorrect(ok);
      setPhase('feedback');
      if (gained) setXpPop({ v: gained, k: Date.now() });
      if (!ok) setMistakes((m) => [...m, { q, user }]);
      if (settings.sfx) audio.sfx(ok ? 'ok' : 'bad');
      if (settings.haptics) haptic(ok ? 15 : [30, 40, 30]);

      let nlives = lives;
      if (!ok && spec.lives != null) {
        nlives = lives - 1;
        setLives(nlives);
      }
      if (!ok && spec.timeLimit) setTimeLeft((x) => Math.max(0, x - 3));

      // resolution / follow-up audio
      let wait = ok ? 650 : 0;
      if (q.afterAnswer) {
        const dur = Math.max(...q.afterAnswer.map((e) => e.t + e.d));
        setTimeout(() => play(q.afterAnswer!), settings.sfx ? 350 : 150);
        wait = Math.max(wait, dur * 1000 + 600);
      }
      const arcade = spec.mode === 'blitz' || spec.mode === 'survival';
      if (spec.lives != null && nlives <= 0) {
        nextTimer.current = window.setTimeout(() => finish({ correct: nc, total: nt, xp: nxp, maxCombo: nmax }), 1400);
        return;
      }
      if (spec.count != null && nt >= spec.count && ok && settings.autoNext) {
        nextTimer.current = window.setTimeout(() => finish({ correct: nc, total: nt, xp: nxp, maxCombo: nmax }), wait + 200);
        return;
      }
      if ((ok && (settings.autoNext || arcade)) || (!ok && spec.mode === 'blitz')) {
        nextTimer.current = window.setTimeout(() => advanceRef.current(), ok ? (arcade ? Math.min(wait, 500) : wait) : 1500);
      }
    },
    [q, phase, combo, correct, total, maxCombo, xp, lives, spec, settings, recordAnswer, recordSung, play, finish],
  );

  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  const onChoice = (id: string) => {
    if (!q) return;
    const c = q.choices.find((x) => x.id === id);
    if (phase === 'feedback') {
      if (c?.audio) play(c.audio);
      return;
    }
    if (phase !== 'answer') return;
    if (q.input === 'sequence') {
      if (c?.audio) play(c.audio);
      if (picked.length < q.answer.length) setPicked([...picked, id]);
      return;
    }
    judge([id]);
  };

  const onKey = (midi: number) => {
    if (!q) return;
    const id = String(pc(midi));
    if (phase === 'feedback') {
      play([{ t: 0, d: 0.9, midi }]);
      return;
    }
    if (!q.choices.some((c) => c.id === id)) return;
    judge([id]);
  };

  const undo = () => {
    if (!q || phase !== 'answer') return;
    if (picked.length > (q.given ?? 0)) setPicked(picked.slice(0, -1));
  };

  // keyboard shortcuts for desktop
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!q || phase === 'done' || q.input === 'rhythm') return;
      if (e.code === 'Space' || e.key === 'r') {
        e.preventDefault();
        play(q.stimulus);
      } else if (e.key === 'Enter') {
        if (phase === 'feedback') advance();
        else if (q.input === 'sequence' && picked.length === q.answer.length) judge(picked);
      } else if (e.key === 'Backspace') undo();
      else if (/^[1-9]$/.test(e.key) && q.input !== 'sing') {
        const c = q.choices[Number(e.key) - 1];
        if (c) onChoice(c.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const quit = () => {
    if (spec.mode === 'practice' && total > 0) return finish();
    if (total === 0 || confirm(t('quitConfirm'))) back();
  };

  const restart = () => startSession(spec);

  const keysMarks = useMemo(() => {
    if (!q || q.input !== 'keys' || phase !== 'feedback') return {};
    const m: Record<number, 'ok' | 'bad'> = {};
    const [lo] = q.keysRange!;
    m[lo + Number(q.answer[0])] = 'ok';
    if (!isCorrect && picked[0] != null) m[lo + Number(picked[0])] = 'bad';
    return m;
  }, [q, phase, isCorrect, picked]);

  if (phase === 'done' && outcome)
    return (
      <Results
        spec={spec}
        outcome={outcome}
        correct={correct}
        total={total}
        xp={xp}
        maxCombo={maxCombo}
        mistakes={mistakes}
        onReplay={(ev) => play(ev)}
        onAgain={restart}
        onClose={back}
      />
    );
  if (!q) return null;

  const progress = spec.count ? (total / spec.count) * 100 : spec.timeLimit ? (timeLeft / spec.timeLimit) * 100 : 0;
  const given = q.given ?? 0;

  return (
    <div className="session">
      <header className="session-top">
        <button className="icon-btn" onClick={quit} aria-label={t('quit')}>
          ✕
        </button>
        {spec.count != null || spec.timeLimit ? (
          <div className={`bar ${spec.timeLimit && timeLeft < 10 ? 'danger' : ''}`}>
            <div style={{ width: `${progress}%` }} />
          </div>
        ) : (
          <div className="session-title">{spec.title}</div>
        )}
        {spec.timeLimit ? <div className="pill">⏱ {Math.ceil(timeLeft)}</div> : null}
        {spec.lives != null ? <div className="pill hearts">{'❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, (spec.lives ?? 0) - lives))}</div> : null}
        {spec.mode === 'practice' || spec.mode === 'blitz' || spec.mode === 'survival' ? (
          <div className="pill">
            {correct}/{total}
          </div>
        ) : null}
        <div className={`combo ${combo >= 3 ? 'hot' : ''}`} title={t('combo')}>
          🔥 {combo}
        </div>
        {xpPop && (
          <div key={xpPop.k} className="xp-pop">
            +{xpPop.v} XP
          </div>
        )}
      </header>

      <main className="session-body">
        <h2 className="prompt">{q.prompt}</h2>

        {q.input !== 'rhythm' && (
          <div className="play-area">
            <button className={`play-btn ${playing ? 'playing' : ''}`} onClick={() => play(q.stimulus)} aria-label={t('replay')}>
              <span className="ring" />
              <span className="ring r2" />
              <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden>
                {playing ? <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" /> : <path fill="currentColor" d="M8 5v14l11-7z" />}
              </svg>
            </button>
            {q.alt && q.alt.length > 0 && (
              <div className="alt-row">
                {q.alt.map((a) => (
                  <button key={a.label} className="chip" onClick={() => play(a.events)}>
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {q.input === 'choice' && (
          <div className={`choices n${q.choices.length}`}>
            {q.choices.map((c, i) => {
              const st =
                phase === 'feedback' ? (c.id === q.answer[0] ? 'ok' : c.id === picked[0] ? 'bad' : 'dim') : '';
              return (
                <button key={c.id} className={`choice ${st}`} onClick={() => onChoice(c.id)}>
                  <span className="choice-label">{c.label}</span>
                  {c.sub && <span className="choice-sub">{c.sub}</span>}
                  <span className="kbd">{i + 1}</span>
                </button>
              );
            })}
          </div>
        )}

        {q.input === 'keys' && q.keysRange && (
          <div className="keys-wrap">
            <Piano low={q.keysRange[0]} high={q.keysRange[1]} onPress={onKey} marks={keysMarks} enabled={(m) => phase === 'feedback' || q.choices.some((c) => c.id === String(pc(m)))} />
          </div>
        )}

        {q.input === 'sequence' && (
          <>
            <div className="slots">
              {q.answer.map((a, i) => {
                const v = picked[i];
                const label = v ? q.choices.find((c) => c.id === v)?.label ?? v : '';
                const st = phase === 'feedback' && i >= given ? (v === a ? 'ok' : 'bad') : i < given ? 'given' : '';
                return (
                  <div key={i} className={`slot ${st} ${i === picked.length && phase === 'answer' ? 'cur' : ''}`}>
                    <span>{label}</span>
                    {phase === 'feedback' && v !== a && i >= given && <small>{q.choices.find((c) => c.id === a)?.label}</small>}
                  </div>
                );
              })}
            </div>
            <div className={`choices seq n${q.choices.length}`}>
              {q.choices.map((c) => (
                <button key={c.id} className="choice small" onClick={() => onChoice(c.id)}>
                  <span className="choice-label">{c.label}</span>
                  {c.sub && <span className="choice-sub">{c.sub}</span>}
                </button>
              ))}
            </div>
            {phase === 'answer' && (
              <div className="row center gap">
                <button className="btn ghost" onClick={undo} disabled={picked.length <= given}>
                  ⌫
                </button>
                <button className="btn primary" disabled={picked.length !== q.answer.length} onClick={() => judge(picked)}>
                  {t('check')}
                </button>
              </div>
            )}
          </>
        )}

        {q.input === 'sing' && q.sing && (
          <SingInput key={idx} targets={q.sing.targets} targetLabel={q.sing.target} busy={playing} done={phase !== 'answer'} onResult={(ok) => judge([ok ? 'ok' : 'no'], ok)} />
        )}

        {q.input === 'rhythm' && q.rhythm && (
          <RhythmInput key={idx} pattern={q.rhythm.pattern} bpm={q.rhythm.bpm} done={phase !== 'answer'} onResult={(ok) => judge([ok ? 'ok' : 'no'], ok)} />
        )}
      </main>

      {phase === 'feedback' && (
        <div className={`feedback ${isCorrect ? 'ok' : 'bad'}`}>
          <div className="feedback-inner">
            <div className="fb-title">{isCorrect ? `✓ ${t('correct')}` : `✗ ${t('wrong')}`}</div>
            {!isCorrect && q.answerLabel && (
              <div className="fb-answer">
                {t('answerWas')} <b>{q.answerLabel}</b>
              </div>
            )}
            {isCorrect && q.answerLabel && q.input !== 'choice' && <div className="fb-answer">{q.answerLabel}</div>}
            {q.explain && <div className="fb-explain">{q.explain}</div>}
            {!isCorrect && (q.input === 'choice' || q.input === 'sequence' || q.input === 'keys') && <div className="fb-hint">{t('compare')}</div>}
            <button className={`btn big ${isCorrect ? 'success' : 'danger'}`} onClick={advance}>
              {t('next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
