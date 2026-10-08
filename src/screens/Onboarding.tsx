import { useState } from 'react';
import { audio } from '../audio/engine';
import { useStore } from '../game/store';
import { useT } from '../i18n';
import { Logo } from '../components/Logo';
import { useNav } from '../game/nav';
import { placementSpec } from '../game/sessions';

export function Onboarding() {
  const t = useT();
  const setSettings = useStore((s) => s.setSettings);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const lang = useStore((s) => s.settings.lang);
  const voice = useStore((s) => s.settings.voice);
  const [goal, setGoal] = useState(50);
  const [feat, setFeat] = useState<number | null>(null);
  const startSession = useNav((s) => s.startSession);

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
        {FEATURES.map((f, i) => (
          <button key={f.icon} className={`ob-chip ${feat === i ? 'on' : ''}`} onClick={() => setFeat(feat === i ? null : i)}>
            {f.icon} {lang === 'ru' ? f.ru[0] : f.en[0]}
          </button>
        ))}
      </div>
      {feat != null && <p className="ob-feat-desc">{lang === 'ru' ? FEATURES[feat].ru[1] : FEATURES[feat].en[1]}</p>}
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
      <h3>{t('voice')}</h3>
      <div className="seg">
        <button className={voice === 'low' ? 'on' : ''} onClick={() => setSettings({ voice: 'low' })}>
          {t('voiceLow')}
        </button>
        <button className={voice === 'high' ? 'on' : ''} onClick={() => setSettings({ voice: 'high' })}>
          {t('voiceHigh')}
        </button>
      </div>
      <p className="muted small center">🎧 {t('headphones')}</p>
      <button className="btn primary big block" onClick={go}>
        {t('letsGo')}
      </button>
      <button
        className="btn ghost block"
        onClick={() => {
          go();
          startSession(placementSpec(lang));
        }}
      >
        🧭 {lang === 'ru' ? 'Я уже занимаюсь музыкой — входной тест' : "I'm a musician — placement test"}
      </button>
    </div>
  );
}

/** what each part of the course trains, shown when a chip is tapped */
const FEATURES = [
  { icon: '📐', ru: ['Интервалы', 'Расстояние между двумя нотами — основа слуха.'], en: ['Intervals', 'The distance between two notes — the basis of it all.'] },
  { icon: '🎹', ru: ['Аккорды', 'Слышать окраску аккорда: мажор, минор и другие.'], en: ['Chords', 'Hear a chord’s colour: major, minor and more.'] },
  { icon: '🎯', ru: ['Ступени', 'Узнавать ноту по её месту в тональности — как музыканты слышат мелодию.'], en: ['Degrees', 'Know a note by its place in the key — how musicians hear melody.'] },
  { icon: '✍️', ru: ['Диктант', 'Записывать услышанную мелодию и ритм.'], en: ['Dictation', 'Write down a melody and rhythm you hear.'] },
  { icon: '🎸', ru: ['Гармония', 'Узнавать аккорды в песнях: I, IV, V, vi…'], en: ['Harmony', 'Recognise the chords in songs: I, IV, V, vi…'] },
  { icon: '🥁', ru: ['Ритм', 'Чувствовать долю, повторять и записывать ритмы.'], en: ['Rhythm', 'Feel the beat, tap back and write rhythms.'] },
  { icon: '🎤', ru: ['Пение', 'Петь ноты и интервалы в микрофон — слух и голос вместе.'], en: ['Singing', 'Sing notes and intervals into the mic.'] },
];
