import { audio } from '../audio/engine';
import type { ExerciseConfig } from '../exercises/types';
import { useNav } from '../game/nav';
import { focusSpec } from '../game/sessions';
import { isDue, ItemStat, useStore } from '../game/store';
import { CHORDS } from '../theory/chords';
import { intervalBySemis } from '../theory/intervals';
import { DEGREES } from '../theory/scales';

interface Cell {
  key: string;
  label: string;
  cfg: ExerciseConfig;
}

const ALL12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MAJ_ALL = DEGREES.filter((d) => d.semis < 12).map((d) => d.id);
const MIN_DIA = ['1', '2', 'b3', '4', '5', 'b6', 'b7', '7'];

function state(it?: ItemStat) {
  if (!it || !it.n) return 'none';
  const b = it.b ?? 0;
  return b >= 3 ? 'm' : b >= 2 ? 'g' : b >= 1 ? 'l' : 'w';
}

/** Grid of every item, coloured by spaced-repetition box; tap one to drill it. */
export function MasteryMap() {
  const items = useStore((s) => s.items);
  const lang = useStore((s) => s.settings.lang);
  const startSession = useNav((s) => s.startSession);
  const ru = lang === 'ru';
  const short = (s: number) => (ru ? intervalBySemis(s).short : intervalBySemis(s).id);

  const rows: { title: string; cells: Cell[] }[] = [
    ...(['up', 'down', 'harm'] as const).map((dir) => ({
      title: (ru ? 'Интервалы ' : 'Intervals ') + { up: '↑', down: '↓', harm: '⇅' }[dir],
      cells: ALL12.map((s) => ({ key: `int:${s}:${dir}`, label: short(s), cfg: { kind: 'interval', set: ALL12, dirs: [dir] } as ExerciseConfig })),
    })),
    {
      title: ru ? 'Ступени: мажор' : 'Degrees: major',
      cells: MAJ_ALL.map((id) => ({ key: `deg:${id}:M`, label: DEGREES.find((d) => d.id === id)!.label, cfg: { kind: 'degree', set: MAJ_ALL } as ExerciseConfig })),
    },
    {
      title: ru ? 'Ступени: минор' : 'Degrees: minor',
      cells: MIN_DIA.map((id) => ({ key: `deg:${id}:m`, label: DEGREES.find((d) => d.id === id)!.label, cfg: { kind: 'degree', set: MIN_DIA, minor: true } as ExerciseConfig })),
    },
    {
      title: ru ? 'Аккорды' : 'Chords',
      cells: CHORDS.map((c) => ({
        key: `chord:${c.id}`,
        // names without a root letter, so they read the same with do-re-mi and letter naming
        label: c.symbol || 'maj',
        cfg: { kind: 'chord', set: c.intervals.length > 3 ? CHORDS.filter((x) => x.intervals.length > 3).map((x) => x.id) : CHORDS.filter((x) => x.intervals.length === 3).map((x) => x.id), open: true } as ExerciseConfig,
      })),
    },
  ];

  return (
    <div className="mmap">
      {rows.map((r) => (
        <div key={r.title} className="mmap-row">
          <div className="mmap-title">{r.title}</div>
          <div className="mmap-cells">
            {r.cells.map((c) => {
              const it = items[c.key];
              return (
                <button
                  key={c.key}
                  className={`mmap-cell s-${state(it)} ${isDue(it) ? 'due' : ''}`}
                  title={it?.n ? `${Math.round((it.c / it.n) * 100)}% · ${it.n}` : ''}
                  onClick={() => {
                    audio.unlock();
                    startSession(focusSpec(c.key, c.cfg, `${r.title}: ${c.label}`));
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="mmap-legend small muted">
        <span>
          <i className="s-none" /> {ru ? 'не встречалось' : 'unseen'}
        </span>
        <span>
          <i className="s-w" /> {ru ? 'ошибки' : 'struggling'}
        </span>
        <span>
          <i className="s-l" /> {ru ? 'учится' : 'learning'}
        </span>
        <span>
          <i className="s-g" /> {ru ? 'почти' : 'almost'}
        </span>
        <span>
          <i className="s-m" /> {ru ? 'освоено' : 'mastered'}
        </span>
        <span>
          <i className="due-i" /> {ru ? 'пора повторить' : 'due'}
        </span>
      </div>
      <p className="small muted">{ru ? 'Нажми на клетку — начнётся тренировка именно этого элемента.' : 'Tap a cell to drill that item.'}</p>
    </div>
  );
}
