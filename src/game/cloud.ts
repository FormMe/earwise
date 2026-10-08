/**
 * Cloud sync of progress, with two backends:
 *  - inside a claude.ai page: the host's `window.claude.use("db")`;
 *  - anywhere else (GitHub Pages, installed PWA): a private GitHub Gist of the
 *    user's own account, connected once with a personal token (gist scope).
 * Without either, progress lives in localStorage only.
 * Both sides are merged (see mergeState), never blindly overwritten.
 */
import { create } from 'zustand';
import { useStore } from './store';

type Status = 'off' | 'syncing' | 'ok' | 'error' | 'auth';
export const useCloud = create<{ status: Status; backend: 'claude' | 'gist' | null; error?: string }>(() => ({ status: 'off', backend: null }));

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

/** Where the progress is kept remotely: read the saved snapshot, write a new one. */
interface Backend {
  kind: 'claude' | 'gist';
  read(): Promise<{ state?: S; v?: number } | undefined>;
  write(doc: { state: S; updatedAt: number; v: number }): Promise<void>;
}

async function claudeBackend(): Promise<Backend | null> {
  const host = (window as unknown as { claude?: Host }).claude;
  if (!host?.use) return null;
  const [db, user] = (await Promise.all([host.use('db'), host.use('user')])) as [
    { doc(p: string): DocRef } | null,
    { id(): Promise<string | null> } | null,
  ];
  if (!db || !user) return null;
  const id = await user.id();
  if (!id) return null;
  const ref = db.doc(`data/users/${id}/progress`);
  return {
    kind: 'claude',
    read: async () => {
      const snap = await ref.get();
      return snap.exists ? (snap.data() as { state?: S; v?: number }) : undefined;
    },
    write: (doc) => ref.set(doc),
  };
}

// ───────────── GitHub Gist backend ─────────────
const GIST_KEY = 'earwise-gist';
const GIST_FILE = 'earwise-progress.json';
const GIST_DESC = 'EarWise progress (synced by the app — do not edit)';

/** Token and gist id live in their own localStorage key: never inside the synced state. */
export function gistConfig(): { token: string; id?: string } | null {
  try {
    const raw = localStorage.getItem(GIST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveGistConfig(c: { token: string; id?: string } | null) {
  try {
    if (c) localStorage.setItem(GIST_KEY, JSON.stringify(c));
    else localStorage.removeItem(GIST_KEY);
  } catch {
    /* private mode: sync just won't persist the connection */
  }
}

class AuthError extends Error {}

async function gh(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    cache: 'no-store',
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  if (res.status === 401 || res.status === 403) throw new AuthError(String(res.status));
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return res.status === 204 ? null : res.json();
}

function gistBackend(cfg: { token: string; id?: string }): Backend {
  let id = cfg.id;
  /** find the app's gist (another device may have created it) or make a new secret one */
  const ensure = async (content?: string) => {
    if (id) return id;
    for (let page = 1; page <= 5 && !id; page++) {
      const list = (await gh(cfg.token, `/gists?per_page=100&page=${page}`)) as { id: string; files: Record<string, unknown> }[];
      id = list.find((g) => g.files?.[GIST_FILE])?.id;
      if (list.length < 100) break;
    }
    if (!id) {
      const g = (await gh(cfg.token, '/gists', { method: 'POST', body: JSON.stringify({ description: GIST_DESC, public: false, files: { [GIST_FILE]: { content: content ?? '{}' } } }) })) as { id: string };
      id = g.id;
    }
    saveGistConfig({ ...cfg, id });
    return id;
  };
  return {
    kind: 'gist',
    read: async () => {
      const gid = await ensure();
      const g = (await gh(cfg.token, `/gists/${gid}`)) as { files: Record<string, { content?: string; truncated?: boolean; raw_url?: string }> };
      const f = g.files?.[GIST_FILE];
      if (!f) return undefined;
      let text = f.content ?? '';
      if (f.truncated && f.raw_url) text = await (await fetch(f.raw_url, { cache: 'no-store' })).text();
      try {
        return text ? JSON.parse(text) : undefined;
      } catch {
        return undefined;
      }
    },
    write: async (doc) => {
      const gid = await ensure(JSON.stringify(doc));
      await gh(cfg.token, `/gists/${gid}`, { method: 'PATCH', body: JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(doc) } } }) });
    },
  };
}

/** Connect this device to the user's GitHub (token with the "gist" scope) and sync right away. */
export async function connectGist(token: string) {
  const t = token.trim();
  const user = (await gh(t, '/user')) as { login: string };
  saveGistConfig({ token: t });
  await startCloudSync();
  return user.login;
}

export function disconnectGist() {
  saveGistConfig(null);
  stop?.();
  stop = null;
  useCloud.setState({ status: 'off', backend: null, error: undefined });
}

// ───────────── sync loop ─────────────
let stop: (() => void) | null = null;

export async function startCloudSync() {
  stop?.();
  stop = null;
  try {
    let backend = await claudeBackend().catch(() => null);
    if (!backend) {
      const cfg = gistConfig();
      if (cfg?.token) backend = gistBackend(cfg);
    }
    if (!backend) return;
    await run(backend);
  } catch (e) {
    useCloud.setState({ status: e instanceof AuthError ? 'auth' : 'error', error: String((e as Error)?.message ?? e) });
  }
}

async function run(backend: Backend) {
  useCloud.setState({ status: 'syncing', backend: backend.kind, error: undefined });
  let applying = false;
  let alive = true;
  const remoteState = async () => {
    const remote = await backend.read();
    if (!remote?.state) return {};
    // an older app version's lesson ids don't apply to this curriculum
    return (remote.v ?? 1) < SCHEMA ? { ...remote.state, lessons: {} } : remote.state;
  };
  /** read the cloud, merge with this device, apply locally and write the result back */
  const reconcile = async () => {
    // read the cloud first, THEN snapshot: progress made during the request must not be lost
    const remote = await remoteState();
    if (!alive) return;
    const merged = mergeState(snapshot(), remote);
    applying = true;
    useStore.setState(merged as Partial<ReturnType<typeof useStore.getState>>);
    applying = false;
    if (merged.onboarded || merged.xp > 0) await backend.write({ state: snapshot(), updatedAt: Date.now(), v: SCHEMA });
  };
  const fail = (e: unknown) => useCloud.setState({ status: e instanceof AuthError ? 'auth' : 'error', error: String((e as Error)?.message ?? e) });

  await reconcile();
  useCloud.setState({ status: 'ok' });

  // push changes, debounced, one write at a time
  let timer: number | null = null;
  let writing = false;
  let dirty = false;
  const flush = async () => {
    timer = null;
    if (!alive) return;
    if (writing) {
      dirty = true;
      return;
    }
    writing = true;
    try {
      await reconcile();
      useCloud.setState({ status: 'ok' });
    } catch (e) {
      fail(e);
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
  const unsub = useStore.subscribe(() => {
    if (applying) return;
    schedule();
  });
  // save promptly when the app is hidden; pick up other devices' progress when it comes back
  const onVis = () => {
    if (document.visibilityState === 'hidden' && timer) {
      clearTimeout(timer);
      void flush();
    } else if (document.visibilityState === 'visible') void flush();
  };
  document.addEventListener('visibilitychange', onVis);
  stop = () => {
    alive = false;
    if (timer) clearTimeout(timer);
    unsub();
    document.removeEventListener('visibilitychange', onVis);
  };
}

// ───────────── transfer code (move progress between versions without any account) ─────────────
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Response(new Blob([data as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/** A copyable text code with this device's progress (gzip + base64). */
export async function exportCode() {
  const json = new TextEncoder().encode(JSON.stringify({ v: SCHEMA, state: snapshot() }));
  const gz = await pipe(json, new CompressionStream('gzip'));
  let s = '';
  // chunks (a multiple of 3 bytes, so the base64 pieces join cleanly) keep fromCharCode small
  for (let i = 0; i < gz.length; i += 8190) s += b64(gz.subarray(i, i + 8190));
  return 'EW1:' + s;
}

/** Merge progress from a transfer code into this device (nothing learned here is lost). */
export async function importCode(code: string) {
  const raw = code.trim().replace(/^EW1:/, '').replace(/\s+/g, '');
  const json = new TextDecoder().decode(await pipe(unb64(raw), new DecompressionStream('gzip')));
  const doc = JSON.parse(json) as { v?: number; state?: S };
  if (!doc?.state) throw new Error('bad code');
  const remote = (doc.v ?? 1) < SCHEMA ? { ...doc.state, lessons: {} } : doc.state;
  useStore.setState(mergeState(snapshot(), { ...remote, onboarded: true }) as Partial<ReturnType<typeof useStore.getState>>);
}
