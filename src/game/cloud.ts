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

const KEYS = ['settings', 'onboarded', 'xp', 'days', 'streak', 'freezes', 'lessons', 'items', 'achievements', 'highs', 'totals', 'dailyDone', 'resetGen', 'settingsAt'] as const;
/** bump together with the store's persist version when lesson ids change */
const SCHEMA = 2;


function snapshot() {
  const s = useStore.getState() as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of KEYS) out[k] = s[k];
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type S = Record<string, any>;

const maxMap = (a: Record<string, number> = {}, b: Record<string, number> = {}) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
  return out;
};

/**
 * Merge two progress snapshots (this device + cloud) without losing anything learned on either:
 * per-item the latest answer wins, lessons keep the best result, counters keep the maximum.
 * A newer "reset progress" on either side wins outright.
 */
export function mergeState(local: S, remote: S): S {
  if (!remote || !Object.keys(remote).length) return local;
  const lg = local.resetGen ?? 0;
  const rg = remote.resetGen ?? 0;
  // settings: the newer change wins; a fresh install (not onboarded yet) takes the saved ones
  const settings = !local.onboarded || (remote.settingsAt ?? 0) > (local.settingsAt ?? 0) ? { ...local.settings, ...remote.settings } : local.settings;
  const settingsAt = Math.max(local.settingsAt ?? 0, remote.settingsAt ?? 0);
  if (rg > lg) return { ...remote, settings, settingsAt };
  if (lg > rg) return local;
  const ls = local.streak ?? {};
  const rs = remote.streak ?? {};
  const remoteLater = (rs.last ?? '') > (ls.last ?? '');
  const later = remoteLater ? rs : ls;
  const earlier = remoteLater ? ls : rs;
  // a run on the other device that the later one continues by exactly a day is kept
  const dayGap = later.last && earlier.last ? Math.round((Date.parse(later.last) - Date.parse(earlier.last)) / 864e5) : NaN;
  const count = dayGap === 1 ? Math.max(later.count ?? 0, (earlier.count ?? 0) + 1) : later.count;
  const items = { ...(local.items ?? {}) };
  for (const [k, v] of Object.entries<S>(remote.items ?? {})) if (!items[k] || (v.t ?? 0) > (items[k].t ?? 0)) items[k] = v;
  const lessons = { ...(local.lessons ?? {}) };
  for (const [k, v] of Object.entries<S>(remote.lessons ?? {})) {
    const x = lessons[k];
    lessons[k] = x
      ? { stars: Math.max(x.stars, v.stars), best: Math.max(x.best, v.best), plays: Math.max(x.plays, v.plays), level: Math.max(x.level ?? 0, v.level ?? 0) || undefined }
      : v;
  }
  return {
    ...local,
    settings,
    settingsAt,
    onboarded: local.onboarded || remote.onboarded,
    xp: Math.max(local.xp ?? 0, remote.xp ?? 0),
    items,
    lessons,
    days: maxMap(local.days, remote.days),
    achievements: { ...(remote.achievements ?? {}), ...(local.achievements ?? {}) },
    highs: maxMap(local.highs, remote.highs),
    totals: { ...maxMap(local.totals, remote.totals), kinds: [...new Set([...(local.totals?.kinds ?? []), ...(remote.totals?.kinds ?? [])])] },
    streak: { ...later, count, best: Math.max(rs.best ?? 0, ls.best ?? 0, count ?? 0) },
    // a used freeze must not come back: take the side that played last
    freezes: remoteLater ? remote.freezes ?? 0 : local.freezes ?? 0,
    dailyDone: (remote.dailyDone ?? '') > (local.dailyDone ?? '') ? remote.dailyDone : local.dailyDone,
  };
}

export async function startCloudSync() {
  try {
    await sync();
  } catch {
    useCloud.setState({ status: 'error' });
  }
}

async function sync() {
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
  const remoteState = async () => {
    const snap = await ref.get();
    const remote = snap.exists ? (snap.data() as { state?: S; v?: number }) : undefined;
    if (!remote?.state) return {};
    // an older app version's lesson ids don't apply to this curriculum
    return (remote.v ?? 1) < SCHEMA ? { ...remote.state, lessons: {} } : remote.state;
  };
  /** read the cloud, merge with this device, apply locally and write the result back */
  const reconcile = async () => {
    // read the cloud first, THEN snapshot: progress made during the request must not be lost
    const remote = await remoteState();
    const merged = mergeState(snapshot(), remote);
    applying = true;
    useStore.setState(merged as Partial<ReturnType<typeof useStore.getState>>);
    applying = false;
    if (merged.onboarded || merged.xp > 0) await ref.set({ state: snapshot(), updatedAt: Date.now(), v: SCHEMA });
  };

  try {
    await reconcile();
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
      await reconcile();
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
    schedule();
  });
  // save promptly when the app is hidden; pick up other devices' progress when it comes back
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && timer) {
      clearTimeout(timer);
      void flush();
    } else if (document.visibilityState === 'visible') void flush();
  });
}
