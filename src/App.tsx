import { useEffect } from 'react';
import { audio } from './audio/engine';
import { TopBar } from './components/TopBar';
import { Tab, useNav } from './game/nav';
import { useStore } from './game/store';
import { TKey, useT } from './i18n';
import { ArcadeScreen } from './screens/ArcadeScreen';
import { Onboarding } from './screens/Onboarding';
import { PathScreen } from './screens/PathScreen';
import { PracticeScreen } from './screens/PracticeScreen';
import { ReferenceScreen } from './screens/ReferenceScreen';
import { Session } from './screens/Session';
import { SettingsScreen } from './screens/SettingsScreen';
import { StatsScreen } from './screens/StatsScreen';

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

  useEffect(() => {
    audio.setInstrument(instrument);
  }, [instrument]);
  useEffect(() => {
    audio.setVolume(volume);
  }, [volume]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  // unlock audio on the first interaction anywhere (iOS)
  useEffect(() => {
    const h = () => audio.unlock();
    window.addEventListener('pointerdown', h, { once: true });
    return () => window.removeEventListener('pointerdown', h);
  }, []);

  if (!onboarded) return <Onboarding />;
  if (screen.name === 'session') return <Session key={screen.key} spec={screen.spec} />;
  if (screen.name === 'reference') return <ReferenceScreen />;

  return (
    <div className="shell">
      <TopBar />
      <div className="content" key={tab}>
        {tab === 'path' && <PathScreen />}
        {tab === 'practice' && <PracticeScreen />}
        {tab === 'arcade' && <ArcadeScreen />}
        {tab === 'stats' && <StatsScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </div>
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
