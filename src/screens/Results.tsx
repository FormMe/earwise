import { useEffect, useState } from 'react';
import type { NoteEvent } from '../audio/engine';
import type { Question } from '../exercises/types';
import { ACHIEVEMENTS } from '../game/achievements';
import { LEVELS, MAX_LEVEL } from '../game/curriculum';
import type { SessionSpec } from '../game/nav';
import { FinishOutcome, useStore } from '../game/store';
import { rankFor, useLang, useT } from '../i18n';
import { Confetti } from '../components/Confetti';

interface Props {
  spec: SessionSpec;
  outcome: FinishOutcome;
  correct: number;
  total: number;
  xp: number;
  maxCombo: number;
  mistakes: { q: Question; user: string[] }[];
  onReplay: (ev: NoteEvent[]) => void;
  onAgain: () => void;
  onClose: () => void;
  onDrill?: () => void;
  mastered?: number;
  placed?: number;
}

export function Results({ spec, outcome, correct, total, xp, maxCombo, mistakes, onReplay, onAgain, onClose, onDrill, mastered, placed }: Props) {
  const t = useT();
  const lang = useLang();
  const highs = useStore((s) => s.highs);
  const acc = total ? Math.round((correct / total) * 100) : 0;
  const [shownStars, setShownStars] = useState(0);
  const isLesson = spec.mode === 'lesson';
  const passed = placed != null ? placed > 0 : !isLesson || outcome.stars > 0;
  const arcade = spec.mode === 'blitz' || spec.mode === 'survival';

  useEffect(() => {
    if (!isLesson || outcome.stars === 0) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShownStars(i);
      if (i >= outcome.stars) clearInterval(id);
    }, 380);
    return () => clearInterval(id);
  }, [isLesson, outcome.stars]);

  const label = (q: Question, id: string) => (id === '?' ? '🤷' : q.choices.find((c) => c.id === id)?.label ?? (id === 'no' ? '—' : id));

  return (
    <div className="results">
      {passed && <Confetti />}
      <div className="results-head">
        <div className="results-emoji">{passed ? (acc === 100 ? '🏆' : '🎉') : '💪'}</div>
        <h1>{placed != null ? spec.title : arcade ? spec.title : isLesson ? (passed ? t('lessonComplete') : t('tryAgain')) : t('sessionComplete')}</h1>
        {isLesson && passed && spec.level && (
          <div className="level-done">
            {'👑'.repeat(spec.level)} {lang === 'ru' ? 'Уровень' : 'Level'} {spec.level}/{MAX_LEVEL} · {LEVELS[lang][spec.level]}
          </div>
        )}
        {isLesson && (
          <div className="stars big">
            {[1, 2, 3].map((s) => (
              <span key={s} className={`star ${s <= shownStars ? 'on' : ''}`}>
                ★
              </span>
            ))}
          </div>
        )}
        {arcade && (
          <div className="arcade-score">
            <div className="big-num">{correct}</div>
            <div className="muted">
              {outcome.newHigh ? `🏅 ${t('newHigh')}` : `${t('highScore')}: ${highs[spec.mode] ?? 0}`}
            </div>
          </div>
        )}
      </div>

      <div className="stat-cards">
        <div className="stat-card xp">
          <div className="sc-label">{t('xpEarned')}</div>
          <div className="sc-value">⚡ {xp}</div>
        </div>
        <div className="stat-card acc">
          <div className="sc-label">{t('accuracy')}</div>
          <div className="sc-value">🎯 {acc}%</div>
        </div>
        <div className="stat-card combo">
          <div className="sc-label">{t('bestCombo')}</div>
          <div className="sc-value">🔥 {maxCombo}</div>
        </div>
      </div>

      <div className="banners">
        {placed != null && (
          <div className="banner level">
            🧭{' '}
            {placed > 0
              ? lang === 'ru'
                ? `Засчитано разделов: ${placed}. Продолжай с первого незасчитанного урока — он отмечен «Начать!». Контрольные любых разделов открыты всегда.`
                : `Units placed out: ${placed}. Continue from the first open lesson (marked “Start!”). Checkpoints are always open.`
              : lang === 'ru'
                ? 'Начни с первого раздела — так навыки лягут честно и крепко. Короткие уроки пролетишь быстро.'
                : 'Start from unit 1 — the early lessons will fly by and the skills will stick.'}
          </div>
        )}
        {!!mastered && (
          <div className="banner goal">
            ✨ {lang === 'ru' ? `Освоено новых элементов: ${mastered}` : `Newly mastered items: ${mastered}`}
          </div>
        )}
        {outcome.levelUp && (
          <div className="banner level">
            ⬆️ {t('levelUp')} {outcome.levelUp} · {rankFor(outcome.levelUp, lang)}
          </div>
        )}
        {outcome.goalReached && <div className="banner goal">{t('goalReached')}</div>}
        {outcome.streakExtended && <div className="banner streak">🔥 {t('streakUp')}</div>}
        {outcome.newAchievements.map((id) => {
          const a = ACHIEVEMENTS.find((x) => x.id === id)!;
          const [name, desc] = lang === 'ru' ? a.ru : a.en;
          return (
            <div key={id} className="banner ach">
              <span className="ach-icon">{a.icon}</span>
              <div>
                <b>
                  {t('newAchievement')} {name}
                </b>
                <div className="muted small">{desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {total > 0 && (
        <section className="mistakes">
          <h3>{t('mistakes')}</h3>
          {mistakes.length === 0 ? (
            <p className="muted">{t('noMistakes')}</p>
          ) : (
            mistakes.slice(0, 12).map((m, i) => (
              <div key={i} className="mistake">
                <button className="icon-btn play-mini" onClick={() => onReplay(m.q.stimulus)} aria-label={t('replay')}>
                  ▶
                </button>
                <div className="mistake-body">
                  <div className="small muted">{m.q.prompt}</div>
                  {m.q.input !== 'sing' && m.q.input !== 'rhythm' && (
                    <div>
                      <span className="bad-text">{m.user.slice(m.q.given ?? 0).map((u) => label(m.q, u)).join(' ')}</span> →{' '}
                      <span className="ok-text">{m.q.answerLabel}</span>
                    </div>
                  )}
                  {(m.q.input === 'sing' || m.q.input === 'rhythm') && <div className="ok-text">{m.q.answerLabel || '🥁'}</div>}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {onDrill && mistakes.length > 0 && (
        <button className="btn ghost block" onClick={onDrill}>
          🎯 {lang === 'ru' ? 'Потренировать то, где ошибся' : 'Drill what I missed'}
        </button>
      )}
      <div className="results-actions">
        <button className="btn ghost big" onClick={onAgain}>
          🔁 {t('again')}
        </button>
        <button className="btn primary big" onClick={onClose}>
          {t('continue')}
        </button>
      </div>
    </div>
  );
}
