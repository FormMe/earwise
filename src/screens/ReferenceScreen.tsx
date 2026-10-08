import { useState } from 'react';
import { audio } from '../audio/engine';
import { intervalEvents } from '../exercises/generate';
import { useNav } from '../game/nav';
import { useStore } from '../game/store';
import { useLang, useT } from '../i18n';
import { CHORDS } from '../theory/chords';
import { INTERVALS } from '../theory/intervals';
import { SCALES } from '../theory/scales';
import { Piano } from '../components/Piano';
import { GLOSSARY } from '../game/help';

type Tab = 'gloss' | 'int' | 'chord' | 'scale' | 'piano';

export function ReferenceScreen() {
  const t = useT();
  const lang = useLang();
  const back = useNav((s) => s.back);
  const [tab, setTab] = useState<Tab>('gloss');
  const [active, setActive] = useState<Record<number, 'active'>>({});
  const tempo = { slow: 1.35, normal: 1, fast: 0.78 }[useStore((s) => s.settings.tempo)];
  const root = 60;

  const play = (ev: Parameters<typeof audio.play>[0]) => {
    audio.unlock();
    audio.play(ev);
  };

  return (
    <div className="page ref">
      <header className="sub-head">
        <button className="icon-btn" onClick={back} aria-label="back">
          ‹
        </button>
        <h1>{t('reference')}</h1>
      </header>
      <div className="seg tabs">
        {(
          [
            ['gloss', t('glossary')],
            ['int', lang === 'ru' ? 'Интервалы' : 'Intervals'],
            ['chord', lang === 'ru' ? 'Аккорды' : 'Chords'],
            ['scale', lang === 'ru' ? 'Лады' : 'Scales'],
            ['piano', t('piano_')],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'gloss' && (
        <dl className="gloss card">
          {GLOSSARY.map((g) => (
            <div key={g.ru[0]}>
              <dt>{g[lang][0]}</dt>
              <dd>{g[lang][1]}</dd>
            </div>
          ))}
        </dl>
      )}

      {tab === 'int' &&
        INTERVALS.filter((i) => i.semis >= 1 && i.semis <= 12).map((i) => (
          <div key={i.id} className="ref-item">
            <div className="ref-main">
              <div className="ref-title">
                <span className="badge">{lang === 'ru' ? i.short : i.id}</span> {lang === 'ru' ? i.ru : i.en}
                <span className="muted small nowrap"> · {i.semis} {lang === 'ru' ? ruSemis(i.semis) : 'st'}</span>
              </div>
              {i.up && (
                <div className="small">
                  ↑ <span className="muted">{songs(i.up, lang)}</span>
                </div>
              )}
              {i.down && (
                <div className="small">
                  ↓ <span className="muted">{songs(i.down, lang)}</span>
                </div>
              )}
            </div>
            <div className="ref-btns">
              <button className="chip" aria-label={lang === 'ru' ? 'вверх' : 'up'} title={lang === 'ru' ? 'вверх' : 'up'} onClick={() => play(intervalEvents(root, i.semis, 'up', tempo))}>
                ↑ {lang === 'ru' ? 'вверх' : 'up'}
              </button>
              <button className="chip" aria-label={lang === 'ru' ? 'вниз' : 'down'} title={lang === 'ru' ? 'вниз' : 'down'} onClick={() => play(intervalEvents(root + 12, i.semis, 'down', tempo))}>
                ↓ {lang === 'ru' ? 'вниз' : 'down'}
              </button>
              <button className="chip" aria-label={lang === 'ru' ? 'вместе' : 'together'} title={lang === 'ru' ? 'вместе' : 'together'} onClick={() => play(intervalEvents(root, i.semis, 'harm', tempo))}>
                ⇅ {lang === 'ru' ? 'вместе' : 'together'}
              </button>
            </div>
          </div>
        ))}

      {tab === 'chord' &&
        CHORDS.map((c) => (
          <div key={c.id} className="ref-item">
            <div className="ref-main">
              <div className="ref-title">
                <span className="badge">C{c.symbol}</span> {lang === 'ru' ? c.ru : c.en}
              </div>
              {c.hint && <div className="small muted">{lang === 'ru' ? c.hint.ru : c.hint.en}</div>}
            </div>
            <div className="ref-btns">
              <button className="chip" onClick={() => play([{ t: 0, d: 1.8, midi: c.intervals.map((x) => root + x), strum: 0.012 }])}>
                ▶
              </button>
              <button className="chip" onClick={() => play(c.intervals.map((x, k) => ({ t: k * 0.35, d: 1.5 - k * 0.2, midi: root + x })))}>
                ♪♪
              </button>
            </div>
          </div>
        ))}

      {tab === 'scale' &&
        SCALES.map((s) => (
          <div key={s.id} className="ref-item">
            <div className="ref-main">
              <div className="ref-title">{lang === 'ru' ? s.ru : s.en}</div>
              {s.hint && <div className="small muted">{lang === 'ru' ? s.hint.ru : s.hint.en}</div>}
            </div>
            <div className="ref-btns">
              <button className="chip" onClick={() => play([...s.steps, 12].map((x, k) => ({ t: k * 0.28 * tempo, d: 0.35, midi: root + x })))}>
                ▶
              </button>
            </div>
          </div>
        ))}

      {tab === 'piano' && (
        <div className="free-piano">
          <Piano
            low={48}
            high={72}
            marks={active}
            onPress={(m) => {
              audio.unlock();
              audio.play([{ t: 0, d: 1.5, midi: m }], { stopPrevious: false });
              setActive({ [m]: 'active' });
              setTimeout(() => setActive({}), 250);
            }}
          />
          <p className="muted small center">{lang === 'ru' ? 'Подбирай мелодии, которые слышишь в голове 🎶' : 'Pick out melodies you hear in your head 🎶'}</p>
        </div>
      )}
    </div>
  );
}

/** English UI: drop the Russian-only song notes and titles */
function songs(list: string[], lang: string) {
  const out = lang === 'ru' ? list : list.map((x) => x.replace(/\s*\([^)]*[А-яЁё][^)]*\)/g, '')).filter((x) => !/[А-яЁё]/.test(x));
  return out.join(' · ');
}

/** 1 полутон, 2 полутона, 5 полутонов */
function ruSemis(n: number) {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return 'полутон';
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return 'полутона';
  return 'полутонов';
}
