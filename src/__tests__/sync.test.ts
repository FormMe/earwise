import { beforeEach, describe, expect, it, vi } from 'vitest';

// minimal browser globals for the sync module (tests run in node)
const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
});
vi.stubGlobal('document', { addEventListener() {}, removeEventListener() {}, visibilityState: 'visible' });
vi.stubGlobal('window', globalThis);

const { useStore } = await import('../game/store');
const cloud = await import('../game/cloud');

/** a fake GitHub gist API holding one user's gists in memory */
function fakeGitHub() {
  const gists = new Map<string, { files: Record<string, { content: string }> }>();
  let n = 0;
  const calls: string[] = [];
  const fetch = vi.fn(async (url: string, init: RequestInit = {}) => {
    const path = url.replace('https://api.github.com', '');
    const method = init.method ?? 'GET';
    calls.push(`${method} ${path.split('?')[0]}`);
    const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status });
    if ((init.headers as Record<string, string>).Authorization !== 'Bearer ghp_valid_token_1234567890') return json({}, 401);
    if (path === '/user') return json({ login: 'me' });
    if (path.startsWith('/gists?')) return json([...gists].map(([id, g]) => ({ id, files: g.files })));
    if (path === '/gists' && method === 'POST') {
      const id = `g${++n}`;
      gists.set(id, JSON.parse(String(init.body)));
      return json({ id }, 201);
    }
    const m = path.match(/^\/gists\/(\w+)$/);
    if (m && method === 'GET') return json(gists.get(m[1]));
    if (m && method === 'PATCH') {
      gists.get(m[1])!.files = { ...gists.get(m[1])!.files, ...JSON.parse(String(init.body)).files };
      return json({});
    }
    return json({}, 404);
  });
  return { fetch, gists, calls };
}

const TOKEN = 'ghp_valid_token_1234567890';

describe('progress sync', () => {
  beforeEach(() => {
    mem.clear();
    cloud.disconnectGist();
    useStore.setState({ onboarded: true, xp: 0, items: {}, lessons: {} });
  });

  it('transfer code round-trips and merges', async () => {
    useStore.setState({ xp: 1234, lessons: { a1: { stars: 3, best: 1, plays: 2 } } });
    const code = await cloud.exportCode();
    expect(code.startsWith('EW1:')).toBe(true);
    useStore.setState({ xp: 10, lessons: { b1: { stars: 1, best: 0.8, plays: 1 } } });
    await cloud.importCode(code);
    const s = useStore.getState();
    expect(s.xp).toBe(1234);
    expect(s.lessons.a1.stars).toBe(3);
    expect(s.lessons.b1.stars).toBe(1);
    await expect(cloud.importCode('EW1:garbage')).rejects.toThrow();
  });

  it('two devices share progress through one secret gist', async () => {
    const gh = fakeGitHub();
    vi.stubGlobal('fetch', gh.fetch);
    // device A connects: creates the gist and uploads its progress
    useStore.setState({ xp: 500, lessons: { a1: { stars: 2, best: 0.9, plays: 1 } } });
    expect(await cloud.connectGist(TOKEN)).toBe('me');
    expect(gh.gists.size).toBe(1);
    expect(cloud.useCloud.getState()).toMatchObject({ status: 'ok', backend: 'gist' });
    const [g] = [...gh.gists.values()];
    expect(JSON.parse(g.files['earwise-progress.json'].content).state.xp).toBe(500);
    // the token never travels inside the synced state
    expect(g.files['earwise-progress.json'].content).not.toContain(TOKEN);

    // device B (fresh storage) connects with the same account: finds the gist and merges both ways
    mem.clear();
    cloud.disconnectGist();
    useStore.setState({ xp: 50, lessons: { b2: { stars: 1, best: 0.8, plays: 1 } } });
    await cloud.connectGist(TOKEN);
    expect(gh.gists.size).toBe(1);
    const s = useStore.getState();
    expect(s.xp).toBe(500);
    expect(s.lessons.a1.stars).toBe(2);
    expect(s.lessons.b2.stars).toBe(1);
    const saved = JSON.parse(g.files['earwise-progress.json'].content).state;
    expect(Object.keys(saved.lessons).sort()).toEqual(['a1', 'b2']);
  });

  it('a bad token is reported, not stored', async () => {
    vi.stubGlobal('fetch', fakeGitHub().fetch);
    await expect(cloud.connectGist('ghp_wrong_token_0000000000')).rejects.toThrow();
    expect(cloud.gistConfig()).toBeNull();
  });
});
