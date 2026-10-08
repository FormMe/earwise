import { audio } from '../audio/engine';
import { useNav } from '../game/nav';
import { blitzSpec, dailySpec, survivalSpec } from '../game/sessions';
import { todayStr, useStore } from '../game/store';
import { useLang, useT } from '../i18n';

export function ArcadeScreen() {
  const t = useT();
  const lang = useLang();
  const highs = useStore((s) => s.highs);
  const lessons = useStore((s) => s.lessons);
  const items = useStore((s) => s.items);
  const unlockAll = useStore((s) => s.settings.unlockAll);
  const dailyDone = useStore((s) => s.dailyDone) === todayStr();
  const startSession = useNav((s) => s.startSession);
  const go = (spec: Parameters<typeof startSession>[0]) => {
    audio.unlock();
    startSession(spec);
  };
  return (
    <div className="page">
      <h1 className="page-title">{t('arcadeTitle')}</h1>
      <div className="arcade-list">
        <button className="arcade-card blitz" onClick={() => go(blitzSpec(lessons, lang, unlockAll))}>
          <div className="ac-icon">⚡</div>
          <div className="ac-body">
            <h2>{t('blitz')}</h2>
            <p>{t('blitzDesc')}</p>
          </div>
          <div className="ac-high">
            <small>{t('highScore')}</small>
            <b>{highs.blitz ?? 0}</b>
          </div>
        </button>
        <button className="arcade-card survival" onClick={() => go(survivalSpec(lessons, lang, unlockAll))}>
          <div className="ac-icon">❤️</div>
          <div className="ac-body">
            <h2>{t('survival')}</h2>
            <p>{t('survivalDesc')}</p>
          </div>
          <div className="ac-high">
            <small>{t('highScore')}</small>
            <b>{highs.survival ?? 0}</b>
          </div>
        </button>
        <button className={`arcade-card daily ${dailyDone ? 'done' : ''}`} onClick={() => go(dailySpec(lessons, items, lang, unlockAll))}>
          <div className="ac-icon">📆</div>
          <div className="ac-body">
            <h2>{t('daily')}</h2>
            <p>{dailyDone ? t('dailyDone') : t('dailyDesc')}</p>
          </div>
          <div className="ac-high">
            <b>×2</b>
            <small>XP</small>
          </div>
        </button>
      </div>
    </div>
  );
}
