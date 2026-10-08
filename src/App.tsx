import { lazy, Suspense, useEffect } from 'react';
import { audio } from './audio/engine';
import { TopBar } from './components/TopBar';
import { Tab, useNav } from './game/nav';
import { useStore } from './game/store';
import { useUpdate } from './game/updates';
import { TKey, useT } from './i18n';

import { Onboarding } from './screens/Onboarding';
import { PathScreen } from './screens/PathScreen';

import { Session } from './screens/Session';
// secondary screens load on demand to keep the first load small
const ArcadeScreen = lazy(() => import('./screens/ArcadeScreen').then((m) => ({ default: m.ArcadeScreen })));
const PracticeScreen = lazy(() => import('./screens/PracticeScreen').then((m) => ({ default: m.PracticeScreen })));
const ReferenceScreen = lazy(() => import('./screens/ReferenceScreen').then((m) => ({ default: m.ReferenceScreen })));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen })));
const StatsScreen = lazy(() => import('./screens/StatsScreen').then((m) => ({ default: m.StatsScreen })));

const TABS: { id: Tab; icon: string; label: TKey }[] = [
  { id: 'path', icon: '🗺️', label: 'tabPath' },
  { id: 'practice', icon: '🎛️', label: 'tabPractice' },
  { id: 'arcade', icon: '🕹️', label: 'tabArcade' },
  { id: 'stats', icon: '📊', label: 'tabStats' },
  { id: 'settings', icon: '⚙️', label: 'tabSettings' },
];

export function App() {
  const t = useT();
  const onboarded = useStore((s) => s.onboarded);
  const instrument = useStore((s) => s.settings.instrument);
  const volume = useStore((s) => s.settings.volume);
  const lang = useStore((s) => s.settings.lang);
  const { tab, screen, setTab } = useNav();
  const update = useUpdate();

  useEffect(() => {
    audio.setInstrument(instrument);
  }, [instrument]);
  useEffect(() => {
    audio.setVolume(volume);
  }, [volume]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  // a fresh start (after onboarding) opens the path from the top
  useEffect(() => {
    if (onboarded) window.scrollTo(0, 0);
  }, [onboarded]);
  // unlock audio on the first interaction anywhere (iOS)
  useEffect(() => {
    const h = () => audio.unlock();
    window.addEventListener('pointerdown', h, { once: true });
    return () => window.removeEventListener('pointerdown', h);
  }, []);

  if (!onboarded) return <Onboarding />;
  if (screen.name === 'session') return <Session key={screen.key} spec={screen.spec} />;
  if (screen.name === 'reference')
    return (
      <Suspense fallback={null}>
        <ReferenceScreen />
      </Suspense>
    );

  return (
    <div className="shell">
      <TopBar />
      <div className="content" key={tab}>
        <Suspense fallback={null}>
          {tab === 'path' && <PathScreen />}
          {tab === 'practice' && <PracticeScreen />}
          {tab === 'arcade' && <ArcadeScreen />}
          {tab === 'stats' && <StatsScreen />}
          {tab === 'settings' && <SettingsScreen />}
        </Suspense>
      </div>
      {update.ready && (
        <div className="update-toast" role="status">
          <span>✨ {lang === 'ru' ? 'Доступна новая версия' : 'New version available'}</span>
          <button className="btn primary small" onClick={() => update.apply?.()}>
            {lang === 'ru' ? 'Обновить' : 'Update'}
          </button>
        </div>
      )}
      <nav className="bottom-nav">
        {TABS.map((x) => (
          <button key={x.id} className={tab === x.id ? 'on' : ''} onClick={() => setTab(x.id)}>
            <span className="bn-icon">{x.icon}</span>
            <span className="bn-label">{t(x.label)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
