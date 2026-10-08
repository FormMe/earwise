import { useEffect, useState } from 'react';
import { audio } from '../audio/engine';
import type { Instrument } from '../audio/synth';
import { Settings, useStore } from '../game/store';
import { useT } from '../i18n';
import { useCloud } from '../game/cloud';

type BIPEvent = Event & { prompt: () => Promise<void> };
let deferredPrompt: BIPEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BIPEvent;
  });
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="set-row">
      <div className="set-label">{label}</div>
      <div className="set-ctl">{children}</div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return <button className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on} />;
}

export function SettingsScreen() {
  const t = useT();
  const s = useStore((x) => x.settings);
  const setSettings = useStore((x) => x.setSettings);
  const reset = useStore((x) => x.resetProgress);
  const [askReset, setAskReset] = useState(false);
  const cloud = useCloud((c) => c.status);
  const ru = s.lang === 'ru';
  const [canInstall, setCanInstall] = useState(!!deferredPrompt);
  useEffect(() => {
    const h = () => setCanInstall(true);
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  const up = (p: Partial<Settings>) => setSettings(p);
  const seg = <K extends keyof Settings>(key: K, items: { v: Settings[K]; l: string }[]) => (
    <div className="seg">
      {items.map((it) => (
        <button key={String(it.v)} className={s[key] === it.v ? 'on' : ''} onClick={() => up({ [key]: it.v } as Partial<Settings>)}>
          {it.l}
        </button>
      ))}
    </div>
  );

  const tryInstrument = (i: Instrument) => {
    up({ instrument: i });
    audio.unlock();
    audio.setInstrument(i);
    // recorder can't play chords: demo a phrase in its register instead
    audio.play(
      i === 'recorder'
        ? [72, 74, 76, 79, 77, 76, 74, 72].map((m, k) => ({ t: k * 0.3, d: k === 7 ? 1 : 0.28, midi: m }))
        : [
            { t: 0, d: 0.5, midi: 60 },
            { t: 0.25, d: 0.5, midi: 64 },
            { t: 0.5, d: 0.5, midi: 67 },
            { t: 0.75, d: 1.2, midi: [60, 64, 67, 72], strum: i.includes('guitar') ? 0.02 : 0 },
          ],
    );
  };

  return (
    <div className="page">
      <h1 className="page-title">{t('settingsTitle')}</h1>
      <div className="card">
        <Row label={t('language')}>
          {seg('lang', [
            { v: 'ru', l: 'Русский' },
            { v: 'en', l: 'English' },
          ])}
        </Row>
        <Row label={t('noteNames')}>
          {seg('naming', [
            { v: 'solfege', l: t('solfege') },
            { v: 'letter', l: t('letters') },
          ])}
        </Row>
        <Row label={t('instrument')}>
          <div className="seg wrap">
            {(['piano', 'guitar', 'eguitar', 'recorder', 'epiano', 'organ'] as Instrument[]).map((i) => (
              <button key={i} className={s.instrument === i ? 'on' : ''} onClick={() => tryInstrument(i)}>
                {t(i)}
              </button>
            ))}
          </div>
        </Row>
        <Row label={`${t('volume')} · ${Math.round(s.volume * 100)}%`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              up({ volume: v });
              audio.setVolume(v);
            }}
          />
        </Row>
        <Row label={t('tempo')}>
          {seg('tempo', [
            { v: 'slow', l: t('slow') },
            { v: 'normal', l: t('normal') },
            { v: 'fast', l: t('fast') },
          ])}
        </Row>
        <Row label={t('voice')}>
          {seg('voice', [
            { v: 'low', l: t('voiceLow') },
            { v: 'high', l: t('voiceHigh') },
          ])}
        </Row>
        <Row label={t('goal')}>
          {seg('dailyGoal', [
            { v: 30, l: '30' },
            { v: 50, l: '50' },
            { v: 100, l: '100' },
            { v: 200, l: '200' },
          ])}
        </Row>
      </div>
      <div className="card">
        <Row label={t('fixedRoot')}>
          <Toggle on={s.fixedRoot} onChange={(v) => up({ fixedRoot: v })} />
        </Row>
        <Row label={t('autoNext')}>
          <Toggle on={s.autoNext} onChange={(v) => up({ autoNext: v })} />
        </Row>
        <Row label={t('sfx')}>
          <Toggle on={s.sfx} onChange={(v) => up({ sfx: v })} />
        </Row>
        <Row label={t('haptics')}>
          <Toggle on={s.haptics} onChange={(v) => up({ haptics: v })} />
        </Row>
        <Row label={t('unlockAll')}>
          <Toggle on={s.unlockAll} onChange={(v) => up({ unlockAll: v })} />
        </Row>
      </div>
      <div className="card">
        <h3>📲 {t('install')}</h3>
        {canInstall ? (
          <button
            className="btn primary"
            onClick={async () => {
              await deferredPrompt?.prompt();
              deferredPrompt = null;
              setCanInstall(false);
            }}
          >
            {t('install')}
          </button>
        ) : (
          <p className="muted small">{t('installHint')}</p>
        )}
      </div>
      <div className="card">
        <p className="small">
          {cloud === 'ok'
            ? ru
              ? '☁️ Прогресс сохраняется в облаке и доступен на всех твоих устройствах'
              : '☁️ Progress is saved to the cloud and available on all your devices'
            : cloud === 'syncing'
              ? ru
                ? '☁️ Синхронизация…'
                : '☁️ Syncing…'
              : cloud === 'error'
                ? ru
                  ? '⚠️ Не удалось сохранить в облако — прогресс пока хранится на этом устройстве'
                  : '⚠️ Cloud save failed — progress is kept on this device for now'
                : ru
                  ? '📱 Прогресс хранится на этом устройстве'
                  : '📱 Progress is stored on this device'}
        </p>
        <p className="muted small">{t('about')}</p>
        {askReset ? (
          <div className="reset-confirm">
            <p className="small">{t('resetConfirm')}</p>
            <div className="row gap">
              <button className="btn ghost" onClick={() => setAskReset(false)}>
                ✕
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  reset();
                  setAskReset(false);
                }}
              >
                {t('reset')}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn danger-ghost" onClick={() => setAskReset(true)}>
            {t('reset')}
          </button>
        )}
      </div>
    </div>
  );
}
