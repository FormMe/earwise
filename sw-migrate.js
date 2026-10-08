// Loaded into the generated service worker (workbox importScripts).
// Versions before 2026-10-08 kept new versions waiting and never reloaded on their own.
// The first time this worker activates, reload every open page once so nobody stays on that old build;
// later updates are picked up by the page itself (main.tsx), which waits for the end of a lesson.
const FLAG = 'earwise-reloaded-once-v2';
self.addEventListener('activate', (event) => {
  const firstTime = caches.has(FLAG).then(async (done) => {
    if (done) return false;
    await caches.open(FLAG);
    return true;
  });
  event.waitUntil(firstTime.then(() => self.clients.claim()));
  // navigate only after activation has finished: page loads are held until then, so waiting here would deadlock
  firstTime.then(async (first) => {
    if (!first) return;
    await new Promise((r) => setTimeout(r, 300));
    const pages = await self.clients.matchAll({ type: 'window' });
    await Promise.all(pages.map((c) => c.navigate(c.url).catch(() => {})));
  });
});
