import { isBlack, noteName } from '../theory/notes';
import { useStore } from '../game/store';

interface Props {
  low: number;
  high: number;
  onPress: (midi: number) => void;
  marks?: Record<number, 'ok' | 'bad' | 'hint' | 'active'>;
  enabled?: (midi: number) => boolean;
  labels?: boolean;
}

export function Piano({ low, high, onPress, marks = {}, enabled, labels = true }: Props) {
  const { naming, lang } = useStore((s) => s.settings);
  const whites: number[] = [];
  for (let m = low; m <= high; m++) if (!isBlack(m)) whites.push(m);
  const w = 100 / whites.length;
  const blacks: { m: number; left: number }[] = [];
  for (let m = low; m <= high; m++) {
    if (!isBlack(m)) continue;
    const idx = whites.findIndex((x) => x > m);
    if (idx <= 0) continue;
    blacks.push({ m, left: idx * w - w * 0.3 });
  }
  const press = (m: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    if (enabled && !enabled(m)) return;
    onPress(m);
  };
  return (
    <div className="piano" role="group">
      {whites.map((m) => (
        <button
          key={m}
          className={`pk white ${marks[m] ?? ''} ${enabled && !enabled(m) ? 'off' : ''}`}
          style={{ width: `${w}%` }}
          onPointerDown={press(m)}
          aria-label={noteName(m, naming, lang, true)}
        >
          {labels && <span>{noteName(m, naming, lang)}</span>}
        </button>
      ))}
      {blacks.map(({ m, left }) => (
        <button
          key={m}
          className={`pk black ${marks[m] ?? ''} ${enabled && !enabled(m) ? 'off' : ''}`}
          style={{ left: `${left}%`, width: `${w * 0.6}%` }}
          onPointerDown={press(m)}
          aria-label={noteName(m, naming, lang, true)}
        >
          {labels && whites.length <= 8 && <span>{noteName(m, naming, lang)}</span>}
        </button>
      ))}
    </div>
  );
}
