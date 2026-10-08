import { cellById } from '../theory/rhythmCells';

/** Draws one beat of rhythm in simple stem-up notation. */
export function RhythmGlyph({ id, size = 44 }: { id: string; size?: number }) {
  const cell = cellById(id);
  if (!cell) return <span>{id}</span>;
  const W = 44;
  const H = 48;
  const headY = 36;
  const stemTop = 10;
  const notes: { x: number; d: number; rest: boolean }[] = [];
  const n = cell.durs.length;
  cell.durs.forEach((d, i) => {
    const x = n === 1 ? W / 2 : 8 + (i * (W - 16)) / (n - 1);
    notes.push({ x, d: Math.abs(d), rest: d < 0 });
  });
  const sounding = notes.filter((x) => !x.rest);
  const beamed = sounding.length >= 2 && sounding.every((x) => x.d < 4);
  const els: React.ReactNode[] = [];

  notes.forEach((nt, i) => {
    if (nt.rest) {
      if (nt.d >= 4) {
        els.push(<path key={'r' + i} d={`M${nt.x - 3} 14 L${nt.x + 3} 21 L${nt.x - 3} 27 L${nt.x + 3} 33 Q${nt.x - 6} 31 ${nt.x - 1} 40`} className="rg-line" />);
      } else {
        els.push(<circle key={'rd' + i} cx={nt.x - 2} cy={22} r={2.6} className="rg-fill" />);
        els.push(<path key={'r' + i} d={`M${nt.x - 2} 24 Q${nt.x + 3} 24 ${nt.x + 4} 20 L${nt.x - 1} 38`} className="rg-line" />);
      }
      return;
    }
    els.push(<ellipse key={'h' + i} cx={nt.x - 3} cy={headY} rx={5} ry={3.6} transform={`rotate(-20 ${nt.x - 3} ${headY})`} className="rg-fill" />);
    els.push(<line key={'s' + i} x1={nt.x + 1.6} y1={headY - 1} x2={nt.x + 1.6} y2={stemTop} className="rg-line" />);
    // dotted note
    if (nt.d === 3 || nt.d === 6) els.push(<circle key={'dot' + i} cx={nt.x + 6} cy={headY} r={1.6} className="rg-fill" />);
    // single eighth/16th: flags
    if (!beamed && nt.d < 4) {
      const flags = nt.d <= 1 ? 2 : 1;
      for (let f = 0; f < flags; f++)
        els.push(<path key={`f${i}${f}`} d={`M${nt.x + 1.6} ${stemTop + f * 6} q7 5 4 13`} className="rg-line" />);
    }
  });

  if (beamed) {
    const first = sounding[0];
    const last = sounding[sounding.length - 1];
    els.push(<rect key="b1" x={first.x + 0.6} y={stemTop - 1} width={last.x - first.x + 2} height={4} className="rg-fill" />);
    // secondary beams for sixteenths
    for (let i = 0; i < sounding.length; i++) {
      const a = sounding[i];
      if (a.d > 1) continue;
      const b = sounding[i + 1];
      const prev = sounding[i - 1];
      if (b && b.d <= 1) {
        els.push(<rect key={'b2' + i} x={a.x + 0.6} y={stemTop + 5} width={b.x - a.x + 2} height={4} className="rg-fill" />);
      } else if (!(prev && prev.d <= 1)) {
        // lone sixteenth: stub towards its neighbour
        const dir = b ? 1 : -1;
        const x0 = dir > 0 ? a.x + 0.6 : a.x - 7;
        els.push(<rect key={'st' + i} x={x0} y={stemTop + 5} width={9} height={4} className="rg-fill" />);
      }
    }
    if (id === 'tri') els.push(<text key="t3" x={W / 2} y={7} className="rg-text" textAnchor="middle">3</text>);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={size} height={(size * H) / W} className="rglyph" aria-label={id}>
      {els}
    </svg>
  );
}
