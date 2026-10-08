import { currentStreak, levelFromXp, todayStr, useStore, xpForLevel } from '../game/store';
import { rankFor, useLang, useT } from '../i18n';

export function GoalRing({ value, goal, size = 38 }: { value: number; goal: number; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, value / goal);
  return (
    <svg width={size} height={size} className="goal-ring" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} className="gr-bg" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className={`gr-fg ${p >= 1 ? 'full' : ''}`}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - p)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export function TopBar() {
  const t = useT();
  const lang = useLang();
  const xp = useStore((s) => s.xp);
  const days = useStore((s) => s.days);
  const goal = useStore((s) => s.settings.dailyGoal);
  const streakObj = useStore((s) => s.streak);
  const freezes = useStore((s) => s.freezes);
  const streak = currentStreak({ streak: streakObj, freezes });
  const today = days[todayStr()] ?? 0;
  const level = levelFromXp(xp);
  const lo = xpForLevel(level);
  const hi = xpForLevel(level + 1);
  const doneToday = today > 0;
  return (
    <header className="topbar">
      <div className="tb-level" title={rankFor(level, lang)}>
        <div className="lvl-badge">{level}</div>
        <div className="lvl-info">
          <div className="lvl-rank">{rankFor(level, lang)}</div>
          <div className="lvl-bar">
            <div style={{ width: `${((xp - lo) / (hi - lo)) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="tb-right">
        <div className={`tb-streak ${doneToday ? 'lit' : ''}`} title={`${t('streak')}: ${streak}`}>
          <span className="flame">🔥</span>
          <b>{streak}</b>
        </div>
        <div className="tb-goal" title={`${t('dailyGoal')}: ${today}/${goal} XP`}>
          <GoalRing value={today} goal={goal} />
          <span className="tb-goal-txt">⚡</span>
        </div>
      </div>
    </header>
  );
}
