import { useEffect, useRef, useState } from 'react';
import { ALL_LESSONS, isUnlocked, KIND_META, LEVELS, MAX_LEVEL, passFor, questionCount, UNITS } from '../game/curriculum';
import { useNav } from '../game/nav';
import { dailySpec, lessonSpec, needsPractice, placementSpec, reviewSpec } from '../game/sessions';
import { todayStr, useStore } from '../game/store';
import { useLang, useT } from '../i18n';
import { audio } from '../audio/engine';

const OFFSETS = [0, 38, 58, 38, 0, -38, -58, -38];

export function PathScreen() {
  const t = useT();
  const lang = useLang();
  const lessons = useStore((s) => s.lessons);
  const items = useStore((s) => s.items);
  const unlockAll = useStore((s) => s.settings.unlockAll);
  const dailyDone = useStore((s) => s.dailyDone) === todayStr();
  const startSession = useNav((s) => s.startSession);
  const [sel, setSel] = useState<string | null>(null);
  const currentRef = useRef<HTMLDivElement>(null);

  const current = ALL_LESSONS.find((l) => !l.unit.optional && !(lessons[l.id]?.stars > 0))?.id;

  const [curVisible, setCurVisible] = useState(true);
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' });
    const el = currentRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setCurVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const start = (id: string) => {
    audio.unlock();
    startSession(lessonSpec(id, lang, lessons, items));
  };

  const review = reviewSpec(lessons, items, lang);

  let globalIdx = 0;
  return (
    <div className="path">
      {Object.values(lessons).some((x) => x.plays > 0) && (
      <div className="quick">
        <button
          className={`quick-card daily ${dailyDone ? 'done' : ''}`}
          onClick={() => {
            audio.unlock();
            startSession(dailySpec(lessons, items, lang, unlockAll, useStore.getState().dailyDone));
          }}
        >
          <span className="qc-icon">🎯</span>
          <span className="qc-text">
            <b>{t('daily')}</b>
            <small>{dailyDone ? t('dailyDone') : t('dailyDesc')}</small>
          </span>
        </button>
        <button
          className="quick-card review"
          disabled={!review}
          onClick={() => {
            if (!review) return;
            audio.unlock();
            startSession(review);
          }}
        >
          <span className="qc-icon">🩹</span>
          <span className="qc-text">
            <b>{t('review')}</b>
            <small>{review ? t('reviewDesc') : t('reviewEmpty')}</small>
          </span>
        </button>
      </div>

      )}

      {!Object.values(lessons).some((x) => x.stars > 0) && (
        <button
          className="ref-card placement"
          onClick={() => {
            audio.unlock();
            startSession(placementSpec(lang));
          }}
        >
          <span className="qc-icon">🧭</span>
          <span className="qc-text">
            <b>{lang === 'ru' ? 'Уже занимаешься музыкой?' : 'Already a musician?'}</b>
            <small>{lang === 'ru' ? 'Пройди входной тест — засчитаем то, что ты уже умеешь' : 'Take the placement test and skip what you know'}</small>
          </span>
          <span className="chev">›</span>
        </button>
      )}

      {UNITS.map((u) => {
        const done = u.lessons.filter((l) => (lessons[l.id]?.stars ?? 0) > 0).length;
        return (
          <section key={u.id} className="unit">
            <div className="unit-head" style={{ '--uc': u.color } as React.CSSProperties}>
              <div className="unit-icon">{u.icon}</div>
              <div className="unit-text">
                <h2>{lang === 'ru' ? u.ru : u.en}</h2>
                <p>{lang === 'ru' ? u.descRu : u.descEn}</p>
              </div>
              <div className="unit-count">
                {done}/{u.lessons.length}
              </div>
            </div>
            <div className="nodes">
              {u.lessons.map((l) => {
                const i = globalIdx++;
                const unlocked = isUnlocked(l.id, lessons, unlockAll);
                const stars = lessons[l.id]?.stars ?? 0;
                const isCur = l.id === current;
                const meta = KIND_META[l.cfg.kind];
                const stale = needsPractice(l.id, lessons, items);
                const icon = l.checkpoint ? '🏁' : meta.icon;
                return (
                  <div
                    key={l.id}
                    className={`node-wrap ${sel === l.id ? 'sel' : ''}`}
                    style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}px)` }}
                    ref={isCur ? currentRef : undefined}
                  >
                    {isCur && <div className="node-start">{t('start')}!</div>}
                    <button
                      className={`node ${l.checkpoint ? 'check' : ''} ${unlocked ? '' : 'locked'} ${stars ? 'done' : ''} ${stars === 3 ? 'gold' : ''} ${isCur ? 'current' : ''}`}
                      style={{ '--uc': u.color } as React.CSSProperties}
                      onClick={() => setSel(sel === l.id ? null : l.id)}
                      aria-label={lang === 'ru' ? l.ru : l.en}
                    >
                      <span className="node-icon">{unlocked ? icon : '🔒'}</span>
                      {stale && <span className="node-stale" title={t('needsPractice')}>↻</span>}
                    </button>
                    {isCur && <div className="node-caption">{lang === 'ru' ? l.ru : l.en}</div>}
                    <div className="node-stars">
                      {[1, 2, 3].map((s) => (
                        <span key={s} className={s <= stars ? 'on' : ''}>
                          ★
                        </span>
                      ))}
                      {(lessons[l.id]?.level ?? 0) >= 2 && <span className="node-crown">👑{lessons[l.id]?.level}</span>}
                    </div>
                    {sel === l.id && (
                      <div className="node-pop" style={{ '--uc': u.color } as React.CSSProperties}>
                        <div className="np-kind">
                          {icon} {l.checkpoint ? (lang === 'ru' ? 'Контрольная' : 'Checkpoint') : lang === 'ru' ? meta.ru : meta.en}
                        </div>
                        <div className="np-title">{lang === 'ru' ? l.ru : l.en}</div>
                        <div className="np-sub">
                          {questionCount(l)} {t('questions')} · {t('passNeed')} {Math.round(passFor(l) * 100)}%
                          {lessons[l.id]?.best ? ` · ${t('accuracy')} ${Math.round(lessons[l.id].best * 100)}%` : ''}
                        </div>
                        {l.checkpoint && !stars && <div className="np-sub">🏁 {t('checkpointHint')}</div>}
                        {stale && <div className="np-sub">↻ {t('needsPractice')}</div>}
                        {!l.checkpoint && stars > 0 && (
                          <div className="np-sub">
                            👑 {lang === 'ru' ? 'Уровень' : 'Level'} {lessons[l.id]?.level ?? 1}/{MAX_LEVEL}
                            {(lessons[l.id]?.level ?? 1) < MAX_LEVEL && ` → ${LEVELS[lang][(lessons[l.id]?.level ?? 1) + 1]}`}
                          </div>
                        )}
                        {unlocked ? (
                          <button className="btn primary block" onClick={() => start(l.id)}>
                            {stars && !l.checkpoint && (lessons[l.id]?.level ?? 1) < MAX_LEVEL
                              ? `👑 ${lang === 'ru' ? 'Уровень' : 'Level'} ${(lessons[l.id]?.level ?? 1) + 1}`
                              : stars
                                ? t('again')
                                : t('start')}
                          </button>
                        ) : (
                          <div className="np-locked">🔒 {t('locked')}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      <div className="path-end">🎼</div>
      {!curVisible && current && (
        <button className="btn primary small to-current" onClick={() => currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })}>
          {lang === 'ru' ? '📍 К текущему уроку' : '📍 Current lesson'}
        </button>
      )}
    </div>
  );
}
