import { useState } from 'react';
import { audio } from '../audio/engine';
import { useStore } from '../game/store';
import { useT } from '../i18n';
import { Logo } from '../components/Logo';

export function Onboarding() {
  const t = useT();
  const setSettings = useStore((s) => s.setSettings);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const lang = useStore((s) => s.settings.lang);
  const [goal, setGoal] = useState(50);

  const goals = [
    { v: 30, l: t('goalCasual'), m: '5' },
    { v: 50, l: t('goalRegular'), m: '10' },
    { v: 100, l: t('goalSerious'), m: '15' },
    { v: 200, l: t('goalIntense'), m: '25' },
  ];

  const go = () => {
    audio.unlock();
    setSettings({ dailyGoal: goal });
    setOnboarded();
    audio.play([
      { t: 0, d: 0.4, midi: 60 },
      { t: 0.15, d: 0.4, midi: 64 },
      { t: 0.3, d: 0.4, midi: 67 },
      { t: 0.45, d: 1.4, midi: [60, 64, 67, 72] },
    ]);
  };

  return (
    <div className="onboarding">
      <div className="ob-lang seg">
        <button className={lang === 'ru' ? 'on' : ''} onClick={() => setSettings({ lang: 'ru', naming: 'solfege' })}>
          RU
        </button>
        <button className={lang === 'en' ? 'on' : ''} onClick={() => setSettings({ lang: 'en', naming: 'letter' })}>
          EN
        </button>
      </div>
      <div className="ob-hero">
        <Logo size={96} />
        <h1>{t('welcome')}</h1>
        <p>{t('welcomeSub')}</p>
      </div>
      <div className="ob-features">
        <span>📐 {lang === 'ru' ? 'Интервалы' : 'Intervals'}</span>
        <span>🎹 {lang === 'ru' ? 'Аккорды' : 'Chords'}</span>
        <span>🎯 {lang === 'ru' ? 'Ступени' : 'Degrees'}</span>
        <span>✍️ {lang === 'ru' ? 'Диктант' : 'Dictation'}</span>
        <span>🎸 {lang === 'ru' ? 'Гармония' : 'Harmony'}</span>
        <span>🥁 {lang === 'ru' ? 'Ритм' : 'Rhythm'}</span>
        <span>🎤 {lang === 'ru' ? 'Пение' : 'Singing'}</span>
      </div>
      <h3>{t('welcomeGoal')}</h3>
      <div className="ob-goals">
        {goals.map((g) => (
          <button key={g.v} className={`ob-goal ${goal === g.v ? 'on' : ''}`} onClick={() => setGoal(g.v)}>
            <b>{g.l}</b>
            <small>
              ~{g.m} {lang === 'ru' ? 'мин/день' : 'min/day'}
            </small>
          </button>
        ))}
      </div>
      <p className="muted small center">🎧 {t('headphones')}</p>
      <button className="btn primary big block" onClick={go}>
        {t('letsGo')}
      </button>
    </div>
  );
}
