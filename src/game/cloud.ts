/**
 * Optional cloud sync of progress. Active only when the app runs inside a
 * host that provides `window.claude.use("db")` (e.g. a published claude.ai
 * page); in the standalone PWA it is a no-op and localStorage is used alone.
 */
import { create } from 'zustand';
import { useStore } from './store';

type Status = 'off' | 'syncing' | 'ok' | 'error';
export const useCloud = create<{ status: Status }>(() => ({ status: 'off' }));

interface DocRef {
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  set(d: Record<string, unknown>): Promise<void>;
}
interface Host {
  use(name: string): Promise<unknown>;
}

const KEYS = ['settings', 'onboarded', 'xp', 'days', 'streak', 'freezes', 'lessons', 'items', 'achievements', 'highs', 'totals', 'dailyDone'] as const;
const STAMP = 'earwise-updated-at';
/** bump together with the store's persist version when lesson ids change */
const SCHEMA = 2;

function readStamp() {
  try {
    return Number(localStorage.getItem(STAMP) ?? 0);
  } catch {
    return 0;
  }
}
function writeStamp(v: number) {
  try {
    localStorage.setItem(STAMP, String(v));
  } catch {
    /* storage unavailable */
  }
}

function snapshot() {
  const s = useStore.getState() as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of KEYS) out[k] = s[k];
  return out;
}

export async function startCloudSync() {
  const host = (window as unknown as { claude?: Host }).claude;
  if (!host?.use) return;
  const [db, user] = (await Promise.all([host.use('db'), host.use('user')])) as [
    { doc(p: string): DocRef } | null,
    { id(): Promise<string | null> } | null,
  ];
  if (!db || !user) return;
  const id = await user.id();
  if (!id) return;
  useCloud.setState({ status: 'syncing' });
  const ref = db.doc(`data/users/${id}/progress`);

  let applying = false;
  let localStamp = readStamp();
  try {
    const snap = await ref.get();
    const remote = snap.exists ? (snap.data() as { state?: Record<string, unknown>; updatedAt?: number; v?: number }) : undefined;
    if (remote?.state && (remote.v ?? 1) < SCHEMA) remote.state = { ...remote.state, lessons: {} };
    const local = useStore.getState();
    if (remote?.state && ((remote.updatedAt ?? 0) > localStamp || Number(remote.state.xp ?? 0) > local.xp)) {
      applying = true;
      const st = remote.state as Partial<ReturnType<typeof useStore.getState>>;
      useStore.setState({ ...st, settings: { ...local.settings, ...(st.settings ?? {}) }, totals: { ...local.totals, ...(st.totals ?? {}) } });
      applying = false;
      localStamp = remote.updatedAt ?? Date.now();
      writeStamp(localStamp);
    } else if (local.onboarded || local.xp > 0) {
      await ref.set({ state: snapshot(), updatedAt: localStamp || Date.now(), v: SCHEMA });
    }
    useCloud.setState({ status: 'ok' });
  } catch {
    useCloud.setState({ status: 'error' });
    return;
  }

  // push changes, debounced, one write at a time
  let timer: number | null = null;
  let writing = false;
  let dirty = false;
  const flush = async () => {
    timer = null;
    if (writing) {
      dirty = true;
      return;
    }
    writing = true;
    try {
      await ref.set({ state: snapshot(), updatedAt: readStamp(), v: SCHEMA });
      useCloud.setState({ status: 'ok' });
    } catch {
      useCloud.setState({ status: 'error' });
    }
    writing = false;
    if (dirty) {
      dirty = false;
      schedule();
    }
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(flush, 2500);
  };
  useStore.subscribe(() => {
    if (applying) return;
    writeStamp(Date.now());
    schedule();
  });
  // save promptly when the app is hidden (switching apps, locking the phone)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && timer) {
      clearTimeout(timer);
      void flush();
    }
  });
}
