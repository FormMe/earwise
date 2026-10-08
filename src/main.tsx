import { createRoot } from 'react-dom/client';
import '@fontsource-variable/nunito';
import './styles.css';
import { App } from './App';
import { registerSW } from 'virtual:pwa-register';
import { startCloudSync } from './game/cloud';
import { useUpdate } from './game/updates';
import { useNav } from './game/nav';
import { ErrorBoundary } from './components/ErrorBoundary';

// errors in promises and timers bypass the ErrorBoundary: at least log them
window.addEventListener('unhandledrejection', (e) => console.error('EarWise', e.reason));
window.addEventListener('error', (e) => console.error('EarWise', e.error ?? e.message));

// service workers are unavailable inside embedded frames (e.g. hosted previews)
try {
  if (window.self === window.top && 'serviceWorker' in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    const reload = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    // a new version activated: reload into it now, or right after the current lesson
    const applyNewVersion = () => {
      if (useNav.getState().screen.name !== 'session') reload();
      else useUpdate.setState({ ready: true, apply: reload });
    };
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // the very first install also "changes" the controller: nothing to reload then
      if (hadController) applyNewVersion();
    });
    registerSW({
      immediate: true,
      onNeedRefresh: applyNewVersion,
      // installed apps can stay open for days: check for a new version whenever the app comes back
      onRegisteredSW: (_url, reg) => {
        if (!reg) return;
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void reg.update().catch(() => {});
        });
      },
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
