import { ACHIEVEMENTS } from '../game/achievements';
import { ALL_LESSONS, KIND_META } from '../game/curriculum';
import { kindOfKey, labelForKey } from '../game/labels';
import { currentStreak, isDue, isMastered, itemAcc, levelFromXp, todayStr, useStore } from '../game/store';
import { rankFor, useLang, useT } from '../i18n';
import type { ExerciseKind } from '../exercises/types';
import { MasteryMap } from '../components/MasteryMap';

function Heatmap({ days }: { days: Record<string, number> }) {
  const weeks = 17;
  const today = new Date();
  const end = new Date(today);
  // align to Sunday-end columns (Monday-first rows)
  const dow = (today.getDay() + 6) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - dow - (weeks - 1) * 7);
  const cells: { d: string; v: number; future: boolean }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    const ds = todayStr(dt);
    cells.push({ d: ds, v: days[ds] ?? 0, future: dt > end });
  }
  const lvl = (v: number) => (v === 0 ? 0 : v < 30 ? 1 : v < 80 ? 2 : v < 150 ? 3 : 4);
  return (
    <div className="heatmap" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
      {Array.from({ length: weeks }).map((_, w) => (
        <div key={w} className="hm-col">
          {cells.slice(w * 7, w * 7 + 7).map((c) => (
            <div key={c.d} className={`hm-cell l${lvl(c.v)} ${c.future ? 'future' : ''} ${c.d === todayStr() ? 'today' : ''}`} title={`${c.d}: ${c.v} XP`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatsScreen() {
  const t = useT();
  const lang = useLang();
  const st = useStore();
  const level = levelFromXp(st.xp);
  const streak = currentStreak(st);
  const lessonsDone = ALL_LESSONS.filter((l) => (st.lessons[l.id]?.stars ?? 0) > 0).length;
  const starsTotal = ALL_LESSONS.reduce((a, l) => a + (st.lessons[l.id]?.stars ?? 0), 0);

  // accuracy per kind
  const byKind = new Map<ExerciseKind, { n: number; c: number }>();
  for (const [k, it] of Object.entries(st.items)) {
    const kind = kindOfKey(k);
    if (!kind) continue;
    const v = byKind.get(kind) ?? { n: 0, c: 0 };
    v.n += it.n;
    v.c += it.c;
    byKind.set(kind, v);
  }
  const weak = Object.entries(st.items)
    .filter(([, it]) => it.n >= 3)
    .map(([k, it]) => ({ k, acc: itemAcc(it), n: it.n }))
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 8);

  const allItems = Object.values(st.items).filter((it) => it.n > 0);
  const mastered = allItems.filter(isMastered).length;
  const dueNow = allItems.filter((it) => isDue(it)).length;
  const learning = allItems.length - mastered;
  const accTotal = st.totals.answers ? Math.round((st.totals.correct / st.totals.answers) * 100) : 0;

  return (
    <div className="page">
      <h1 className="page-title">{t('statsTitle')}</h1>
      <div className="profile-card">
        <div className="pc-level">{level}</div>
        <div>
          <div className="pc-rank">{rankFor(level, lang)}</div>
          <div className="muted small">
            {t('level')} {level} · {st.xp} XP
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-v">🔥 {streak}</div>
          <div className="stat-l">{t('streak')}</div>
        </div>
        <div className="stat">
          <div className="stat-v">🏅 {st.streak.best}</div>
          <div className="stat-l">{t('bestStreak')}</div>
        </div>
        <div className="stat">
          <div className="stat-v">🧊 {st.freezes}</div>
          <div className="stat-l">{t('freeze')}</div>
        </div>
        <div className="stat">
          <div className="stat-v">🎯 {accTotal}%</div>
          <div className="stat-l">
            {t('accuracy')} · {st.totals.answers}
          </div>
        </div>
        <div className="stat">
          <div className="stat-v">
            📚 {lessonsDone}/{ALL_LESSONS.length}
          </div>
          <div className="stat-l">{t('lessonsDone')}</div>
        </div>
        <div className="stat">
          <div className="stat-v">
            ⭐ {starsTotal}/{ALL_LESSONS.length * 3}
          </div>
          <div className="stat-l">{lang === 'ru' ? 'Звёзд' : 'Stars'}</div>
        </div>
      </div>

      {allItems.length > 0 && (
        <section className="card">
          <h3>{lang === 'ru' ? 'Память' : 'Memory'}</h3>
          <div className="mem-bar">
            <div className="mem-m" style={{ flex: mastered }} />
            <div className="mem-l" style={{ flex: Math.max(0, learning - dueNow) }} />
            <div className="mem-d" style={{ flex: dueNow }} />
          </div>
          <div className="mem-legend small">
            <span>
              <i className="mem-m" /> {lang === 'ru' ? 'Освоено' : 'Mastered'}: {mastered}
            </span>
            <span>
              <i className="mem-l" /> {lang === 'ru' ? 'Учится' : 'Learning'}: {Math.max(0, learning - dueNow)}
            </span>
            <span>
              <i className="mem-d" /> {lang === 'ru' ? 'Пора повторить' : 'Due'}: {dueNow}
            </span>
          </div>
          <p className="muted small">
            {lang === 'ru'
              ? 'Каждый интервал, ступень и аккорд повторяются через растущие промежутки: 1, 3, 7, 16 и 35 дней. «Освоено» — ответ верен и после нескольких дней перерыва.'
              : 'Every item comes back after growing gaps: 1, 3, 7, 16 and 35 days. "Mastered" means still right after a gap of several days.'}
          </p>
        </section>
      )}

      <section className="card">
        <h3>{lang === 'ru' ? 'Карта мастерства' : 'Mastery map'}</h3>
        <MasteryMap />
      </section>

      <section className="card">
        <h3>{t('activity')}</h3>
        <Heatmap days={st.days} />
      </section>

      <section className="card">
        <h3>{t('skills')}</h3>
        {byKind.size === 0 && <p className="muted">{t('noData')}</p>}
        {[...byKind.entries()].map(([k, v]) => {
          const pct = Math.round((v.c / v.n) * 100);
          return (
            <div key={k} className="skill">
              <div className="skill-head">
                <span>
                  {KIND_META[k].icon} {lang === 'ru' ? KIND_META[k].ru : KIND_META[k].en}
                </span>
                <span className="muted">
                  {pct}% · {v.n}
                </span>
              </div>
              <div className="skill-bar">
                <div style={{ width: `${pct}%`, background: pct >= 85 ? 'var(--ok)' : pct >= 65 ? 'var(--warn)' : 'var(--bad)' }} />
              </div>
            </div>
          );
        })}
      </section>

      {weak.length > 0 && (
        <section className="card">
          <h3>{t('weakSpots')}</h3>
          {weak.map((w) => (
            <div key={w.k} className="weak">
              <span>{labelForKey(w.k, lang, st.settings.naming)}</span>
              <span className={`pct ${w.acc < 0.6 ? 'bad-text' : 'warn-text'}`}>{Math.round(w.acc * 100)}%</span>
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <h3>
          {t('achievements')} · {Object.keys(st.achievements).length}/{ACHIEVEMENTS.length}
        </h3>
        <div className="ach-grid">
          {ACHIEVEMENTS.map((a) => {
            const got = !!st.achievements[a.id];
            const [name, desc] = lang === 'ru' ? a.ru : a.en;
            return (
              <div key={a.id} className={`ach ${got ? 'got' : ''}`} title={desc}>
                <div className="ach-i">{got ? a.icon : '🔒'}</div>
                <div className="ach-n">{name}</div>
                <div className="ach-d">{desc}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
