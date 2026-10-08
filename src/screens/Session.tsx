import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio, NoteEvent } from '../audio/engine';
import { generate } from '../exercises/generate';
import type { ExerciseConfig, Question } from '../exercises/types';
import type { Instrument } from '../audio/synth';
import { useNav, SessionSpec } from '../game/nav';
import { FinishOutcome, itemWeight, starsFor, useStore } from '../game/store';
import { useT } from '../i18n';
import { mulberry32, pick, Rng } from '../theory/random';
import { pc } from '../theory/notes';
import { Piano } from '../components/Piano';
import { SingInput, stopMic } from '../components/SingInput';
import { RhythmInput } from '../components/RhythmInput';
import { PulseInput } from '../components/PulseInput';
import { Results } from './Results';
import { RhythmGlyph } from '../components/RhythmGlyph';
import { lessonById } from '../game/curriculum';
import { focusSpec } from '../game/sessions';
import { GLOSSARY, KIND_HELP } from '../game/help';
import { haptic } from '../components/haptics';

interface Mistake {
  q: Question;
  user: string[];
}

const TEMPO = { slow: 1.35, normal: 1, fast: 0.78 };
/** placement: questions per unit and how many must be right */
const BLOCK = 8;
const BLOCK_PASS = 7;

type SQuestion = Question & { review?: boolean; cfg?: ExerciseConfig };

/** Play a question on a random instrument (timbre variety builds transferable hearing). */
function retimbre(q: Question, rng: Rng) {
  const lowest = Math.min(...q.stimulus.flatMap((e) => (e.drum ? [] : Array.isArray(e.midi) ? e.midi : [e.midi])));
  const opts: Instrument[] = ['piano', 'epiano', 'guitar', 'eguitar'];
  // the recorder only sounds natural in its own (high) register
  if (lowest >= 65 && !q.stimulus.some((e) => Array.isArray(e.midi) && e.midi.length > 1)) opts.push('recorder');
  const inst = opts[Math.floor(rng() * opts.length)];
  const map = (ev?: NoteEvent[]) => ev?.forEach((e) => (e.inst ??= inst));
  map(q.stimulus);
  q.choices.forEach((c) => map(c.audio));
}

/** Split sequence slots into labelled groups (one per stage: bass / top, pitches / rhythm) and short rows. */
function slotGroups(q: Question) {
  const bounds = q.stages?.length ? q.stages.map((st) => st.until) : [q.answer.length];
  const groups: { from: number; title?: string; rows: number[][] }[] = [];
  let from = 0;
  bounds.forEach((until, gi) => {
    const idx = Array.from({ length: until - from }, (_, k) => from + k);
    // rows of at most 6; rhythm groups split per bar of 4 beats
    const per = idx.length <= 6 ? idx.length : q.stages?.[gi]?.choices.some((c) => c.glyph) ? 4 : Math.ceil(idx.length / Math.ceil(idx.length / 6));
    const rows: number[][] = [];
    for (let k = 0; k < idx.length; k += per) rows.push(idx.slice(k, k + per));
    if (idx.length) groups.push({ from, title: q.stages && q.stages.length > 1 ? q.stages[gi].title : undefined, rows });
    from = until;
  });
  return groups;
}

export function Session({ spec }: { spec: SessionSpec }) {
  const t = useT();
  const settings = useStore((s) => s.settings);
  const recordAnswer = useStore((s) => s.recordAnswer);
  const recordSung = useStore((s) => s.recordSung);
  const finishSession = useStore((s) => s.finishSession);
  const back = useNav((s) => s.back);
  const startSession = useNav((s) => s.startSession);

  const rng = useRef<Rng>(spec.seed ? mulberry32(spec.seed) : Math.random);
  const [q, setQ] = useState<SQuestion | null>(null);
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
  const [xpPop, setXpPop] = useState<{ v: number; k: number; m?: number } | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [timeLeft, setTimeLeft] = useState(spec.timeLimit ?? 0);
  const [lives, setLives] = useState(spec.lives ?? 0);
  const [outcome, setOutcome] = useState<FinishOutcome | null>(null);
  const [kinds, setKinds] = useState<string[]>([]);
  const [askQuit, setAskQuit] = useState(false);
  const [showIntro, setShowIntro] = useState(!!spec.intro);
  const playToken = useRef(0);
  const introRef = useRef(!!spec.intro);
  const playsLeftRef = useRef<number | null>(spec.replays ?? null);
  /** when the current question appeared: taps in the first moments are the tail of a double tap */
  const shownAt = useRef(0);
  const tooSoon = () => performance.now() - shownAt.current < 350;
  const phaseRef = useRef<'answer' | 'feedback' | 'done'>('answer');
  const prevKey = useRef<string | undefined>(undefined);
  const nextTimer = useRef<number | null>(null);
  /** sounds scheduled for later (autoplay, resolution) — cleared when moving on */
  const soundTimers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      soundTimers.current = soundTimers.current.filter((x) => x !== id);
      if (!finished.current) fn();
    }, ms);
    soundTimers.current.push(id);
  };
  const clearSoundTimers = () => {
    soundTimers.current.forEach((id) => clearTimeout(id));
    soundTimers.current = [];
  };
  /** a pending end of the session (so tapping "Next" can't skip it) */
  const pendingEnd = useRef<null | { correct: number; total: number; xp: number; maxCombo: number }>(null);
  const finished = useRef(false);

  // per-session state that shapes question choice
  const seen = useRef<Record<string, number>>({});
  const requeued = useRef<Record<string, number>>({});
  const retries = useRef<{ key: string; cfg: ExerciseConfig; at: number; review?: boolean }[]>([]);
  const held = useRef<{ tonic: number; left: number } | null>(null);
  // placement test progress
  const block = useRef({ i: 0, n: 0, ok: 0, dk: 0, fails: 0, placed: [] as string[] });
  const [showHelp, setShowHelp] = useState(false);
  const fbRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [playsLeft, setPlaysLeft] = useState<number | null>(null);
  const [mastered, setMastered] = useState<number>(0);

  const makeQuestion = useCallback(
    (i: number, score: number) => {
      let cfg = spec.configs[0];
      let review = false;
      const primary = spec.primary ?? spec.configs.length;
      let forced: string | undefined;
      const due = retries.current.find((r) => r.at <= i);
      if (due) {
        // a missed item comes back a few questions later
        retries.current = retries.current.filter((r) => r !== due);
        cfg = due.cfg;
        forced = due.key;
        review = !!due.review;
      } else if (spec.blocks) {
        cfg = pick(rng.current, spec.blocks[Math.min(block.current.i, spec.blocks.length - 1)].configs);
      } else if (spec.escalate) {
        const n = Math.min(spec.configs.length, 3 + Math.floor(score / 3));
        cfg = pick(rng.current, spec.configs.slice(0, n));
      } else if (spec.mode === 'daily') cfg = spec.configs[i % spec.configs.length];
      else if (spec.mix && primary < spec.configs.length && i > 0 && rng.current() < spec.mix) {
        cfg = pick(rng.current, spec.configs.slice(primary));
        review = true;
      } else if (primary > 1) cfg = pick(rng.current, spec.configs.slice(0, primary));
      const items = useStore.getState().items;
      // hold the key for 5 questions in holdKey drills
      let keyTonic: number | undefined;
      let keyIsNew = false;
      if (cfg.kind === 'degree' && cfg.holdKey) {
        if (!held.current || held.current.left <= 0) {
          held.current = { tonic: settings.fixedRoot ? 60 : 55 + Math.floor(rng.current() * 12), left: 5 };
          keyIsNew = true;
        }
        held.current.left--;
        keyTonic = held.current.tonic;
      }
      const question = generate(cfg, {
        rng: rng.current,
        weight: (k) => {
          if (forced) return k === forced ? 1000 : 0.001;
          if (spec.focus) return k === spec.focus ? 6 : 1;
          // make sure every item comes up (and is answered) at least twice in a lesson
          const cover = (seen.current[k] ?? 0) < 2 ? 2.5 : 0.8;
          return itemWeight(items, k) * cover;
        },
        lang: settings.lang,
        naming: settings.naming,
        fixedRoot: settings.fixedRoot,
        tempo: TEMPO[settings.tempo] * (spec.tempoMul ?? 1),
        voice: settings.voice,
        level: spec.level,
        prevKey: forced ? undefined : prevKey.current,
        keyTonic,
        keyIsNew,
      });
      prevKey.current = question.itemKeys[0];
      if (spec.randomTimbre) retimbre(question, rng.current);
      return { ...question, review, cfg };
    },
    [spec, settings],
  );

  const play = useCallback(async (events: NoteEvent[]) => {
    const token = ++playToken.current;
    setPlaying(true);
    await audio.play(events);
    if (token === playToken.current) setPlaying(false);
  }, []);

  /** listening to the question itself (counted when the lesson limits replays) */
  const listen = useCallback(
    (events: NoteEvent[]) => {
      if (spec.replays != null && phaseRef.current === 'answer') {
        if ((playsLeftRef.current ?? 0) <= 0) return;
        playsLeftRef.current = (playsLeftRef.current ?? 0) - 1;
        setPlaysLeft(playsLeftRef.current);
      }
      play(events);
    },
    [play, spec.replays],
  );

  const showQuestion = useCallback(
    (question: Question) => {
      shownAt.current = performance.now();
      // visual cue for the short window in which taps are ignored
      rootRef.current?.classList.add('settling');
      window.setTimeout(() => rootRef.current?.classList.remove('settling'), 350);
      playsLeftRef.current = spec.replays ?? null;
      setPlaysLeft(playsLeftRef.current);
      phaseRef.current = 'answer';
      setQ(question);
      setPicked(question.given ? question.answer.slice(0, question.given) : []);
      setIsCorrect(null);
      setPhase('answer');
      setKinds((k) => (k.includes(question.kind) ? k : [...k, question.kind]));
      if (question.input !== 'rhythm' && question.input !== 'pulse' && !introRef.current) later(() => listen(question.stimulus), 250);
    },
    [listen, spec.replays],
  );

  // first question
  useEffect(() => {
    showQuestion(makeQuestion(0, 0));
    return () => {
      audio.stopAll();
      stopMic();
      clearSoundTimers();
      if (nextTimer.current) clearTimeout(nextTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = useCallback(
    (final?: { correct: number; total: number; xp: number; maxCombo: number }) => {
      if (finished.current) return;
      finished.current = true;
      clearSoundTimers();
      if (nextTimer.current) clearTimeout(nextTimer.current);
      audio.stopAll();
      stopMic();
      const f = final ?? { correct, total, xp, maxCombo };
      const acc = f.total ? f.correct / f.total : 0;
      const bonus = spec.mode === 'lesson' ? starsFor(acc, spec.pass) * 5 : 0;
      const res = finishSession({
        mode: spec.mode,
        lessonId: spec.lessonId,
        correct: f.correct,
        total: f.total,
        xp: f.xp + bonus,
        maxCombo: f.maxCombo,
        score: f.correct,
        kinds,
        pass: spec.pass,
        level: spec.level,
        placedUnits: spec.blocks ? block.current.placed : undefined,
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
    if (!spec.timeLimit || phase === 'done' || (phase === 'feedback' && !isCorrect)) return;
    const id = setInterval(() => setTimeLeft((x) => Math.max(0, x - 0.1)), 100);
    return () => clearInterval(id);
  }, [spec.timeLimit, phase, isCorrect]);
  useEffect(() => {
    if (spec.timeLimit && timeLeft <= 0 && !finished.current) finish();
  }, [timeLeft, spec.timeLimit, finish]);

  const advance = useCallback(() => {
    if (nextTimer.current) {
      clearTimeout(nextTimer.current);
      nextTimer.current = null;
    }
    if (finished.current) return;
    clearSoundTimers();
    if (pendingEnd.current) return finish(pendingEnd.current);
    const n = idx + 1;
    if (spec.count != null && total >= spec.count) return finish();
    if (spec.lives != null && lives <= 0) return finish();
    setIdx(n);
    showQuestion(makeQuestion(n, correct));
  }, [idx, spec, lives, correct, finish, makeQuestion, showQuestion]);

  const judge = useCallback(
    (user: string[], okOverride?: boolean, dontKnow = false) => {
      if (!q || phase !== 'answer') return;
      const given = q.given ?? 0;
      const ok = okOverride ?? (user.length === q.answer.length && user.every((u, i) => u === q.answer[i]));
      // stats
      phaseRef.current = 'feedback';
      let newlyMastered = 0;
      if (q.input === 'sequence') {
        // per-note memory for each slot; the lifetime answer count goes up once per question
        q.answer.slice(given).forEach((a, i) => (newlyMastered += recordAnswer([q.itemKeys[i]], user[i + given] === a, false)));
        recordAnswer([], ok);
      } else newlyMastered += recordAnswer(q.itemKeys, ok);
      if (newlyMastered) setMastered((m) => m + newlyMastered);
      if (ok) q.itemKeys.forEach((k) => (seen.current[k] = (seen.current[k] ?? 0) + 1));
      else if (q.cfg && (q.input === 'choice' || q.input === 'keys') && spec.mode !== 'blitz' && spec.mode !== 'survival' && !spec.blocks)
        // bring a miss back after a short gap — unless the lesson is about to end (it's on the due list anyway)
        (() => {
          const at = idx + 2 + Math.floor(Math.random() * 3);
          const k = q.itemKeys[0];
          requeued.current[k] = (requeued.current[k] ?? 0) + 1;
          if (requeued.current[k] <= 1 && (spec.count == null || total + (at - idx) < spec.count)) retries.current.push({ key: q.itemKeys[0], cfg: q.cfg, at, review: !!q.review });
        })();
      if (q.input === 'sing' && ok) recordSung();

      const newCombo = ok ? combo + 1 : 0;
      const mult = spec.xpMult ?? 1;
      const gained = ok ? Math.round((10 + Math.min(10, Math.floor(newCombo / 3) * 2)) * mult) : 0;
      // sequences earn partial credit (share of right slots); review questions don't affect the lesson score
      const graded = q.input === 'sequence' && !dontKnow ? q.answer.slice(given).filter((a, i) => user[i + given] === a).length / Math.max(1, q.answer.length - given) : ok ? 1 : 0;
      const counts = !q.review;
      const nc = correct + (counts ? graded : 0);
      const nt = total + (counts ? 1 : 0);
      const nmax = Math.max(maxCombo, newCombo);
      const nxp = xp + gained + newlyMastered * 5;
      setCombo(newCombo);
      setMaxCombo(nmax);
      setCorrect(nc);
      setTotal(nt);
      setXp(nxp);
      setPicked(user);
      setIsCorrect(ok);
      setPhase('feedback');
      if (gained || newlyMastered) {
        setXpPop({ v: gained + newlyMastered * 5, k: Date.now(), m: newlyMastered });
        later(() => setXpPop(null), 1200);
      }
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
      if (!ok && q.afterWrong) later(() => play(q.afterWrong!), settings.sfx ? 450 : 200);
      if (q.afterAnswer) {
        const dur = Math.max(...q.afterAnswer.map((e) => e.t + e.d));
        later(() => play(q.afterAnswer!), settings.sfx ? 350 : 150);
        wait = Math.max(wait, dur * 1000 + 600);
      }
      const arcade = spec.mode === 'blitz' || spec.mode === 'survival';
      if (spec.blocks) {
        const b = block.current;
        b.n++;
        if (ok) b.ok++;
        if (dontKnow) b.dk++;
        // a unit is credited only for near-perfect answers; two "don't know"s end it at once
        if (b.n >= BLOCK || b.dk >= 2 || b.n - b.ok > BLOCK - BLOCK_PASS) {
          const passedBlock = b.ok >= BLOCK_PASS;
          if (passedBlock && spec.blocks[b.i]) {
            // unit 1 (2-option drills) isn't tested: it is credited together with unit 2
            if (spec.blocks[b.i].unitId === 'u2') b.placed.push('u1');
            b.placed.push(spec.blocks[b.i].unitId);
          } else b.fails++;
          b.i++;
          b.n = 0;
          b.ok = 0;
          b.dk = 0;
          // one weak unit doesn't end the test; the second one does
          if (b.fails >= 2 || b.i >= spec.blocks.length) {
            pendingEnd.current = { correct: nc, total: nt, xp: nxp, maxCombo: nmax };
            if (ok) nextTimer.current = window.setTimeout(() => finish(pendingEnd.current!), 1200);
            return;
          }
        }
      }
      if (spec.lives != null && nlives <= 0) {
        // the last life is gone on a miss: show the right answer until "Next"
        pendingEnd.current = { correct: nc, total: nt, xp: nxp, maxCombo: nmax };
        return;
      }
      if (spec.count != null && nt >= spec.count && ok && settings.autoNext) {
        pendingEnd.current = { correct: nc, total: nt, xp: nxp, maxCombo: nmax };
            nextTimer.current = window.setTimeout(() => finish(pendingEnd.current!), wait + 200);
        return;
      }
      // only a right answer moves on by itself; after a miss or "don't know" the answer stays until "Next"
      if (ok && (settings.autoNext || arcade)) {
        nextTimer.current = window.setTimeout(() => advanceRef.current(), arcade ? Math.min(wait, 500) : wait);
      } else if (ok && spec.blocks) nextTimer.current = window.setTimeout(() => advanceRef.current(), 600);
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
    if (phase !== 'answer' || tooSoon()) return;
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
    if (!q.choices.some((c) => c.id === id) || tooSoon()) return;
    judge([id]);
  };

  const undo = () => {
    if (!q || phase !== 'answer') return;
    if (picked.length > (q.given ?? 0)) setPicked(picked.slice(0, -1));
  };

  // keyboard shortcuts for desktop
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (showHelp || askQuit)) {
        setShowHelp(false);
        setAskQuit(false);
        return;
      }
      if (!q || phase === 'done' || q.input === 'rhythm' || q.input === 'pulse' || showIntro || showHelp || askQuit || e.repeat) return;
      // a focused button would also react to Enter/Space and answer the next question
      if ((e.key === 'Enter' || e.code === 'Space') && (e.target as HTMLElement)?.closest?.('button')) e.preventDefault();
      if (e.code === 'Space' || e.key === 'r') {
        e.preventDefault();
        listen(q.stimulus);
      } else if (e.key === 'Enter') {
        if (phase === 'feedback') advance();
        else if (q.input === 'sequence' && picked.length === q.answer.length) judge(picked);
      } else if (e.key === 'Backspace') undo();
      else if (/^[1-9]$/.test(e.key) && q.input !== 'sing') {
        e.preventDefault();
        const st = q.stages?.find((x) => picked.length < x.until);
        const c = (st ? st.choices : q.choices)[Number(e.key) - 1];
        if (c) onChoice(c.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const quit = () => {
    if ((spec.mode === 'practice' || spec.blocks) && total > 0) return finish();
    if (total === 0) back();
    else setAskQuit(true);
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

  // keep the answer visible above the feedback sheet
  useEffect(() => {
    const root = rootRef.current;
    const el = fbRef.current;
    if (!root) return;
    if (!el) {
      root.style.setProperty('--fb-h', '0px');
      return;
    }
    const ro = new ResizeObserver(() => root.style.setProperty('--fb-h', `${el.offsetHeight}px`));
    ro.observe(el);
    root.style.setProperty('--fb-h', `${el.offsetHeight}px`);
    // bring the answer above the sheet (the slots of a dictation first: they hold the corrections)
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      const target = root.querySelector<HTMLElement>('.slot-groups, .choices, .keys-wrap');
      if (!target) return;
      target.style.scrollMarginBottom = `${el.offsetHeight + 16}px`;
      target.scrollIntoView({ block: target.classList.contains('slot-groups') ? 'end' : 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    });
    return () => ro.disconnect();
  }, [phase]);

  if (phase === 'done' && outcome)
    return (
      <Results
        onDrill={() => {
          // focus on the item missed most often, inside its own exercise
          const tally = new Map<string, { n: number; m: Mistake }>();
          const add = (k: string, m: Mistake) => {
            const e = tally.get(k) ?? { n: 0, m };
            e.n++;
            tally.set(k, e);
          };
          for (const m of mistakes) {
            if (m.q.input === 'sequence' && m.user[0] !== '?') {
              // count the slots that were actually wrong, not the first one
              const g = m.q.given ?? 0;
              m.q.answer.slice(g).forEach((a, i) => m.user[i + g] !== a && add(m.q.itemKeys[i], m));
            } else add(m.q.itemKeys[0], m);
          }
          const top = [...tally.entries()].sort((a, b) => b[1].n - a[1].n)[0];
          const cfg = (top?.[1].m.q as SQuestion | undefined)?.cfg;
          if (top && cfg) startSession(focusSpec(top[0], cfg, settings.lang === 'ru' ? 'Работа над ошибкой' : 'Fix a mistake'));
        }}
        mastered={mastered}
        placed={spec.blocks ? block.current.placed.length : undefined}
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

  const showLabel = (id?: string) => {
    if (!id) return '';
    const c = q.choices.find((x) => x.id === id);
    if (c?.glyph) return <RhythmGlyph id={c.glyph} size={34} />;
    return c?.label ?? id;
  };

  if (showIntro) {
    const sample = q;
    const degreeCtx = sample.kind === 'degree' ? sample.stimulus.slice(0, -1) : null;
    const lastT = degreeCtx ? sample.stimulus[sample.stimulus.length - 1].t : 0;
    const lesson = spec.lessonId ? lessonById(spec.lessonId) : undefined;
    const intro = lesson?.intro?.[settings.lang];
    const listable = sample.choices.filter((c) => c.audio);
    return (
      <div className="session intro">
        <header className="session-top">
          <button className="icon-btn" onClick={back} aria-label={t('quit')}>
            ✕
          </button>
          <div className="session-title">{t('introTitle')}</div>
        </header>
        <main className="intro-body">
          <h2 className="prompt">{spec.title}</h2>
          {(intro || spec.introText) && <p className="intro-text">{intro ?? spec.introText![settings.lang]}</p>}
          {!!spec.mix && <p className="muted small">↻ {t('reviewNote')}</p>}
          {listable.length > 0 && (
            <>
              <p className="muted small center">🎧 {t('introListen')}</p>
              <div className={`choices intro-choices n${listable.length}`}>
                {listable.map((c) => (
                  <button
                    key={c.id}
                    className="choice"
                    onClick={() => play(degreeCtx ? [...degreeCtx, ...c.audio!.map((e) => ({ ...e, t: e.t + lastT }))] : c.audio!)}
                  >
                    <span className="choice-label">{c.glyph ? <RhythmGlyph id={c.glyph} size={40} /> : <>▶ {c.label}</>}</span>
                    {c.sub && <span className="choice-sub">{c.sub}</span>}
                  </button>
                ))}
              </div>
            </>
          )}
          <button className="chip center-chip" onClick={() => play(sample.stimulus)}>
            ▶ {t('introExample')}
          </button>
        </main>
        <button
          className="btn primary big block"
          onClick={() => {
            audio.stopAll();
            setShowIntro(false);
            introRef.current = false;
            if (q.input !== 'rhythm' && q.input !== 'pulse') later(() => listen(q.stimulus), 250);
          }}
        >
          {t('introStart')}
        </button>
      </div>
    );
  }

  const stage = q.stages?.find((st) => picked.length < st.until) ?? q.stages?.[q.stages.length - 1];
  const palette = stage ? stage.choices : q.choices;
  const progress = spec.count ? (total / spec.count) * 100 : spec.timeLimit ? (timeLeft / spec.timeLimit) * 100 : 0;
  const given = q.given ?? 0;

  return (
    <div className="session" ref={rootRef}>
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
        {(spec.mode === 'practice' || spec.mode === 'blitz' || spec.mode === 'survival') && total > 0 ? (
          <div className="pill">
            {Math.round(correct)}/{total}
          </div>
        ) : null}
        {spec.blocks && phase === 'answer' && (
          <div className="pill">
            {settings.lang === 'ru' ? 'Раздел' : 'Unit'} {Math.min(block.current.i + 1, spec.blocks.length)} · {block.current.n + (phase === 'answer' ? 1 : 0)}/{BLOCK}
          </div>
        )}
        {spec.level != null && spec.level > 1 && <div className="pill crown" title={settings.lang === 'ru' ? `Уровень мастерства ${spec.level}: быстрее, меньше прослушиваний` : `Crown level ${spec.level}: faster, fewer replays`}>👑 {spec.level}</div>}
        <button className="icon-btn help-btn" onClick={() => setShowHelp(true)} aria-label={t('helpTitle')}>
          ?
        </button>
        <div className={`combo ${combo >= 3 ? 'hot' : ''}`} title={t('combo')}>
          🔥 {combo}
        </div>
        {xpPop && (
          <div key={xpPop.k} className="xp-pop">
            +{xpPop.v} XP{xpPop.m ? ` · ✨ ${settings.lang === 'ru' ? 'освоено' : 'mastered'}` : ''}
          </div>
        )}
      </header>

      <main className="session-body">
        {q.review && <div className="review-tag">↻ {t('reviewTag')}</div>}
        <h2 className="prompt">{q.prompt}</h2>

        {q.input !== 'rhythm' && (
          <div className="play-area">
            <button
              className={`play-btn ${playing ? 'playing' : ''} ${playsLeft === 0 && phase === 'answer' ? 'spent' : ''}`}
              onClick={() => (phase === 'answer' ? listen(q.stimulus) : play(q.stimulus))}
              aria-label={t('replay')}
            >
              {playsLeft != null && phase === 'answer' && <span className="plays-left">{playsLeft}</span>}
              <span className="ring" />
              <span className="ring r2" />
              <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden>
                {playing ? <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" /> : <path fill="currentColor" d="M8 5v14l11-7z" />}
              </svg>
            </button>
            {q.alt && q.alt.length > 0 && (
              <div className="alt-row">
                {q.alt.map((a) => (
                  <button key={a.label} className="chip" disabled={playsLeft === 0 && phase === 'answer'} onClick={() => (phase === 'answer' ? listen(a.events) : play(a.events))}>
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="answer-zone">
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
            <div className="slot-groups">
              {slotGroups(q).map((g) => (
                <div key={g.from} className="slot-group">
                  {g.title && <div className="slot-group-title">{g.title}</div>}
                  {g.rows.map((row) => (
                    <div key={row[0]} className="slots">
                      {row.map((i) => {
                        const a = q.answer[i];
                        const v = picked[i];
                        const label = showLabel(v);
                        const st = phase === 'feedback' && i >= given ? (v === a ? 'ok' : 'bad') : i < given ? 'given' : '';
                        return (
                          <div key={i} className={`slot ${st} ${i === picked.length && phase === 'answer' ? 'cur' : ''}`}>
                            <span>{label}</span>
                            {phase === 'feedback' && v !== a && i >= given && <small>{showLabel(a)}</small>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {stage && <div className="stage-title">{stage.title}</div>}
            <div className={`choices seq n${palette.length}`}>
              {palette.map((c) => (
                <button key={c.id} className={`choice small ${c.glyph ? 'glyph' : ''}`} onClick={() => onChoice(c.id)} title={c.glyph ? c.sub : undefined}>
                  <span className="choice-label">{c.glyph ? <RhythmGlyph id={c.glyph} size={38} /> : c.label}</span>
                  {c.sub && <span className="choice-sub">{c.sub}</span>}
                </button>
              ))}
            </div>
            {phase === 'answer' && (
              <div className="row center gap">
                <button className="btn ghost" onClick={undo} disabled={picked.length <= given} aria-label={settings.lang === 'ru' ? 'Стереть' : 'Undo'}>
                  ⌫
                </button>
                <button className="btn primary" disabled={picked.length !== q.answer.length} onClick={() => judge(picked)}>
                  {t('check')}
                </button>
              </div>
            )}
          </>
        )}

        {q.score && (
          <div className="score">
            {q.score.map((x, i) => {
              const [l, sub] = x.split('|');
              return (
                <div key={i} className="score-note">
                  <b>{l}</b>
                  <small>{sub}</small>
                </div>
              );
            })}
          </div>
        )}

        {q.input === 'sing' && q.sing && (
          <SingInput key={idx} targets={q.sing.targets} sequential={q.sing.sequential} targetLabel={q.sing.target} busy={playing} done={phase !== 'answer'} onResult={(ok, skipped) => (skipped ? judge(['?'], false, true) : judge([ok ? 'ok' : 'no'], ok))} />
        )}

        {q.input === 'pulse' && q.pulse && (
          <PulseInput key={idx} pulse={q.pulse} done={phase !== 'answer'} onResult={(ok) => judge([ok ? 'ok' : 'no'], ok)} />
        )}

        {q.input === 'rhythm' && q.rhythm && (
          <RhythmInput key={idx} pattern={q.rhythm.pattern} bpm={q.rhythm.bpm} done={phase !== 'answer'} onResult={(ok) => judge([ok ? 'ok' : 'no'], ok)} />
        )}
        {phase === 'answer' && q.input !== 'sing' && (
          <div className="dk-row">
            <button className="btn ghost small" onClick={() => !tooSoon() && judge(['?'], false, true)}>
              🤷 {t('dontKnow')}
            </button>
            {spec.blocks && (
              <button className="btn ghost small" onClick={() => finish()}>
                🏁 {t('endTest')}
              </button>
            )}
          </div>
        )}
        </div>
      </main>

      {showHelp && (
        <div className="modal-bg" onClick={() => setShowHelp(false)}>
          <div className="modal help" onClick={(e) => e.stopPropagation()}>
            <h3>❓ {t('helpTitle')}</h3>
            {spec.lessonId && lessonById(spec.lessonId)?.intro && <p className="intro-text">{lessonById(spec.lessonId)!.intro![settings.lang]}</p>}
            <p>
              <b>👂 {t('helpHear')}</b> {KIND_HELP[q.kind][settings.lang][0]}
            </p>
            <p>
              <b>👉 {t('helpDo')}</b> {KIND_HELP[q.kind][settings.lang][1]}
            </p>
            <p className="muted small">{t('helpHonest')}</p>
            <details className="small">
              <summary>📖 {t('glossary')}</summary>
              <dl className="gloss">
                {GLOSSARY.map((g) => (
                  <div key={g.ru[0]}>
                    <dt>{g[settings.lang][0]}</dt>
                    <dd>{g[settings.lang][1]}</dd>
                  </div>
                ))}
              </dl>
            </details>
            <div className="row gap wrap">
              {/* at higher crowns the number of listens is limited: no free replay from here */}
              {spec.replays == null && (
                <button className="chip" onClick={() => play(q.stimulus)}>
                  ▶ {t('introExample')}
                </button>
              )}
              {q.choices
                .filter((c) => c.audio)
                .slice(0, 8)
                .map((c) => (
                  <button key={c.id} className="chip" onClick={() => play(c.audio!)}>
                    {c.glyph ? <RhythmGlyph id={c.glyph} size={22} /> : `▶ ${c.label}`}
                  </button>
                ))}
            </div>
            <button className="btn primary" onClick={() => setShowHelp(false)}>
              {t('gotIt')}
            </button>
          </div>
        </div>
      )}

      {askQuit && (
        <div className="modal-bg" onClick={() => setAskQuit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p>{t('quitConfirm')}</p>
            <div className="row gap">
              <button className="btn danger-ghost" onClick={back}>
                {t('quit')}
              </button>
              <button className="btn primary" onClick={() => setAskQuit(false)}>
                {t('continue')}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'feedback' && (
        <div className={`feedback ${isCorrect ? 'ok' : picked[0] === '?' ? 'dk' : 'bad'}`}>
          <div className="feedback-inner" ref={fbRef}>
            <div className="fb-title">{isCorrect ? `✓ ${t('correct')}` : picked[0] === '?' ? `🤷 ${q.input === 'sing' ? t('skipped') : t('dkTitle')}` : `✗ ${t('wrong')}`}</div>
            {!isCorrect && q.answerLabel && (
              <div className="fb-answer">
                {q.input === 'pulse' ? t('hintLabel') : t('answerWas')} <b>{q.answerLabel}</b>
              </div>
            )}
            {isCorrect && q.answerLabel && q.input !== 'choice' && !q.choices.some((c) => c.glyph) && <div className="fb-answer">{q.answerLabel}</div>}
            {!isCorrect && q.choices.some((c) => c.glyph) && (
              <div className="fb-glyphs">
                {q.answer.filter((a) => q.choices.find((c) => c.id === a)?.glyph).map((a, i) => (
                  <RhythmGlyph key={i} id={a} size={30} />
                ))}
              </div>
            )}
            {q.explain && <div className="fb-explain">{q.explain}</div>}
            {!isCorrect && q.input === 'sequence' && q.renderSequence && picked[0] !== '?' && (
              <div className="row gap">
                <button className="chip" onClick={() => play(q.renderSequence!(picked))}>
                  {t('yourVersion')}
                </button>
                <button className="chip on" onClick={() => play(q.answerAudio ?? q.renderSequence!(q.answer))}>
                  {t('rightVersion')}
                </button>
              </div>
            )}
            {!isCorrect && (q.input === 'choice' || q.input === 'sequence' || q.input === 'keys') && <div className="fb-hint">{t('compare')}</div>}
            <button className={`btn big ${isCorrect ? 'success' : picked[0] === '?' ? 'primary' : 'danger'}`} onClick={advance}>
              {t('next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
