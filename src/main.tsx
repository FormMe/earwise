import { createRoot } from 'react-dom/client';
import '@fontsource-variable/nunito';
import './styles.css';
import { App } from './App';
import { registerSW } from 'virtual:pwa-register';
import { startCloudSync } from './game/cloud';
import { useUpdate } from './game/updates';
import { ErrorBoundary } from './components/ErrorBoundary';

// service workers are unavailable inside embedded frames (e.g. hosted previews)
try {
  if (window.self === window.top && 'serviceWorker' in navigator) {
    const update = registerSW({
      immediate: true,
      // don't reload mid-lesson: the app shows an "update" button on its main screens
      onNeedRefresh: () => useUpdate.setState({ ready: true, apply: () => void update(true) }),
    });
  }
} catch {
  /* offline support is optional */
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

void startCloudSync();
