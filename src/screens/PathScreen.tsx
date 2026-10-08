import { useEffect, useRef, useState } from 'react';
import { ALL_LESSONS, isUnlocked, KIND_META, UNITS } from '../game/curriculum';
import { useNav } from '../game/nav';
import { dailySpec, lessonSpec, reviewSpec } from '../game/sessions';
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

  const current = ALL_LESSONS.find((l) => !(lessons[l.id]?.stars > 0))?.id;

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  const start = (id: string) => {
    audio.unlock();
    startSession(lessonSpec(id, lang));
  };

  const review = reviewSpec(lessons, items, lang);

  let globalIdx = 0;
  return (
    <div className="path">
      <div className="quick">
        <button
          className={`quick-card daily ${dailyDone ? 'done' : ''}`}
          onClick={() => {
            audio.unlock();
            startSession(dailySpec(lang));
          }}
        >
          <span className="qc-icon">📆</span>
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
                return (
                  <div
                    key={l.id}
                    className={`node-wrap ${sel === l.id ? 'sel' : ''}`}
                    style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}px)` }}
                    ref={isCur ? currentRef : undefined}
                  >
                    {isCur && <div className="node-start">{t('start')}!</div>}
                    <button
                      className={`node ${unlocked ? '' : 'locked'} ${stars ? 'done' : ''} ${stars === 3 ? 'gold' : ''} ${isCur ? 'current' : ''}`}
                      style={{ '--uc': u.color } as React.CSSProperties}
                      onClick={() => setSel(sel === l.id ? null : l.id)}
                      aria-label={lang === 'ru' ? l.ru : l.en}
                    >
                      <span className="node-icon">{unlocked ? meta.icon : '🔒'}</span>
                    </button>
                    <div className="node-stars">
                      {[1, 2, 3].map((s) => (
                        <span key={s} className={s <= stars ? 'on' : ''}>
                          ★
                        </span>
                      ))}
                    </div>
                    {sel === l.id && (
                      <div className="node-pop" style={{ '--uc': u.color } as React.CSSProperties}>
                        <div className="np-kind">
                          {meta.icon} {lang === 'ru' ? meta.ru : meta.en}
                        </div>
                        <div className="np-title">{lang === 'ru' ? l.ru : l.en}</div>
                        <div className="np-sub">
                          {l.questions ?? 10} {t('questions')}
                          {lessons[l.id]?.best ? ` · ${t('accuracy')} ${Math.round(lessons[l.id].best * 100)}%` : ''}
                        </div>
                        {unlocked ? (
                          <button className="btn primary block" onClick={() => start(l.id)}>
                            {stars ? t('again') : t('start')}
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
    </div>
  );
}
