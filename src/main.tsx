import { createRoot } from 'react-dom/client';
import '@fontsource-variable/nunito';
import './styles.css';
import { App } from './App';
import { registerSW } from 'virtual:pwa-register';

// service workers are unavailable inside embedded frames (e.g. hosted previews)
try {
  if (window.self === window.top && 'serviceWorker' in navigator) registerSW({ immediate: true });
} catch {
  /* offline support is optional */
}

createRoot(document.getElementById('root')!).render(
  <App />,
);
