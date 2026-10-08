import { useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { audio } from '../audio/engine';
import type { Dir, ExerciseConfig, ExerciseKind } from '../exercises/types';
import { KIND_META } from '../game/curriculum';
import { useNav } from '../game/nav';
import { practiceSpec } from '../game/sessions';
import { useStore } from '../game/store';
import { useLang, useT } from '../i18n';
import { CHORDS } from '../theory/chords';
import { INTERVALS } from '../theory/intervals';
import { pcName } from '../theory/notes';
import { DEGREES, SCALES } from '../theory/scales';
import { ROMANS } from '../theory/harmony';

const DEFAULTS: Record<ExerciseKind, ExerciseConfig> = {
  pitch: { kind: 'pitch', min: 1, max: 12 },
  interval: { kind: 'interval', set: [3, 4, 5, 7, 12], dirs: ['up'] },
  chord: { kind: 'chord', set: ['maj', 'min', 'dim', 'aug'] },
  inversion: { kind: 'inversion', chords: ['maj', 'min'], invs: [0, 1, 2] },
  scale: { kind: 'scale', set: ['major', 'minor', 'harmMinor'] },
  degree: { kind: 'degree', set: ['1', '2', '3', '4', '5', '6', '7'] },
  melody: { kind: 'melody', set: ['1', '2', '3', '4', '5', '6', '7', '8'], length: 4 },
  progression: { kind: 'progression', set: ['I', 'IV', 'V', 'vi'], length: 4 },
  noteName: { kind: 'noteName', set: [0, 2, 4, 5, 7, 9, 11], reference: true },
  sing: { kind: 'sing', mode: 'note' },
  rhythm: { kind: 'rhythm', level: 1 },
  rhythmDictation: { kind: 'rhythmDictation', level: 1 },
  bass: { kind: 'bass', set: ['I', 'IV', 'V'], length: 4 },
  cadence: { kind: 'cadence', set: ['PAC', 'HC', 'PC', 'DC'] },
  function: { kind: 'function', set: ['I', 'ii', 'IV', 'V', 'vi'] },
  tonicFind: { kind: 'tonicFind' },
  intervalInKey: { kind: 'intervalInKey', set: ['1', '2', '3', '4', '5', '6', '7', '8'] },
  modulation: { kind: 'modulation', set: ['none', 'V', 'IV', 'vi', 'i'] },
  twoVoice: { kind: 'twoVoice', set: ['I', 'IV', 'V', 'vi'], length: 4 },
  fullDictation: { kind: 'fullDictation', set: ['5,', '7,', '1', '2', '3', '4', '5', '6', '8'], bars: 1, level: 1 },
  pulse: { kind: 'pulse' },
};

const ru_ = (lang: string, ru: string, en: string) => (lang === 'ru' ? ru : en);

const usePractice = create<{ cfgs: Partial<Record<ExerciseKind, ExerciseConfig>>; kind: ExerciseKind; set: (c: ExerciseConfig) => void; setKind: (k: ExerciseKind) => void }>()(
  persist(
    (set, get) => ({
      cfgs: {},
      kind: 'interval',
      set: (c) => set({ cfgs: { ...get().cfgs, [c.kind]: c } }),
      setKind: (kind) => set({ kind }),
    }),
    { name: 'earwise-practice' },
  ),
);

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function Chips<T extends string | number>({ items, value, onChange, label }: { items: { v: T; l: string; s?: string }[]; value: T[]; onChange: (v: T[]) => void; label?: string }) {
  return (
    <div className="field">
      {label && <div className="field-label">{label}</div>}
      <div className="chips">
        {items.map((it) => (
          <button key={String(it.v)} className={`chip ${value.includes(it.v) ? 'on' : ''}`} onClick={() => onChange(toggle(value, it.v))} title={it.s}>
            {it.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Seg<T extends string | number | boolean>({ items, value, onChange, label }: { items: { v: T; l: string }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="field">
      {label && <div className="field-label">{label}</div>}
      <div className="seg">
        {items.map((it) => (
          <button key={String(it.v)} className={value === it.v ? 'on' : ''} onClick={() => onChange(it.v)}>
            {it.l}
          </button>
        ))}
      </div>
    </div>
  );
}

const MEL_PRESETS: { id: string; ru: string; en: string; set: string[] }[] = [
  { id: '123', ru: '1–3', en: '1–3', set: ['1', '2', '3'] },
  { id: '15', ru: '1–5', en: '1–5', set: ['1', '2', '3', '4', '5'] },
  { id: 'pent', ru: 'Пентатоника', en: 'Pentatonic', set: ['1', '2', '3', '5', '6', '8'] },
  { id: 'dia', ru: 'Октава', en: 'Octave', set: ['1', '2', '3', '4', '5', '6', '7', '8'] },
  { id: 'wide', ru: 'Шире октавы', en: 'Wide', set: ['5,', '6,', '7,', '1', '2', '3', '4', '5', '6', '7', '8'] },
  { id: 'chrom', ru: 'Хроматика', en: 'Chromatic', set: ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7', '8'] },
];

export function PracticeScreen() {
  const t = useT();
  const lang = useLang();
  const naming = useStore((s) => s.settings.naming);
  const { cfgs, kind, set, setKind } = usePractice();
  const startSession = useNav((s) => s.startSession);
  const open = useNav((s) => s.open);
  const cfg = (cfgs[kind] ?? DEFAULTS[kind]) as ExerciseConfig;
  const [err, setErr] = useState('');

  const go = () => {
    const tooFew =
      ('set' in cfg && Array.isArray(cfg.set) && cfg.set.length < 2 && cfg.kind !== 'sing') ||
      (cfg.kind === 'interval' && cfg.dirs.length === 0) ||
      (cfg.kind === 'inversion' && (cfg.chords.length < 1 || cfg.invs.length < 2));
    if (tooFew) {
      setErr(t('min2'));
      return;
    }
    setErr('');
    audio.unlock();
    const meta = KIND_META[kind];
    startSession(practiceSpec(cfg, lang === 'ru' ? meta.ru : meta.en));
  };

  const ed = () => {
    switch (cfg.kind) {
      case 'pitch':
        return (
          <Seg
            label={t('level_')}
            value={cfg.min}
            onChange={(min) => set({ ...cfg, min, max: min >= 6 ? 12 : min >= 3 ? 7 : 3 })}
            items={[
              { v: 6, l: lang === 'ru' ? 'Легко' : 'Easy' },
              { v: 3, l: lang === 'ru' ? 'Средне' : 'Medium' },
              { v: 1, l: lang === 'ru' ? 'Тонко' : 'Fine' },
            ]}
          />
        );
      case 'interval':
        return (
          <>
            <Chips
              label={t('options')}
              value={cfg.set}
              onChange={(s) => set({ ...cfg, set: s })}
              items={INTERVALS.filter((i) => i.semis > 0).map((i) => ({ v: i.semis, l: lang === 'ru' ? i.short : i.id, s: lang === 'ru' ? i.ru : i.en }))}
            />
            <Chips<Dir>
              label={t('directions')}
              value={cfg.dirs}
              onChange={(d) => set({ ...cfg, dirs: d })}
              items={[
                { v: 'up', l: '↑ ' + t('up') },
                { v: 'down', l: '↓ ' + t('down') },
                { v: 'harm', l: '⇅ ' + t('harm') },
              ]}
            />
          </>
        );
      case 'chord':
        return (
          <>
            <Chips label={t('options')} value={cfg.set} onChange={(s) => set({ ...cfg, set: s })} items={CHORDS.map((c) => ({ v: c.id, l: lang === 'ru' ? c.ru : c.en }))} />
            <Seg value={!!cfg.inversions} onChange={(v) => set({ ...cfg, inversions: v })} items={[{ v: false, l: '—' }, { v: true, l: t('withInversions') }]} />
          </>
        );
      case 'inversion':
        return (
          <Chips
            label={t('options')}
            value={cfg.chords}
            onChange={(s) => set({ ...cfg, chords: s, invs: s.some((x) => ['maj7', 'dom7', 'min7', 'm7b5', 'dim7'].includes(x)) ? [0, 1, 2, 3] : [0, 1, 2] })}
            items={['maj', 'min', 'dim', 'aug', 'maj7', 'dom7', 'min7', 'm7b5'].map((id) => {
              const c = CHORDS.find((x) => x.id === id)!;
              return { v: id, l: lang === 'ru' ? c.ru : c.en };
            })}
          />
        );
      case 'scale':
        return (
          <>
            <Chips label={t('options')} value={cfg.set} onChange={(s) => set({ ...cfg, set: s })} items={SCALES.map((s) => ({ v: s.id, l: lang === 'ru' ? s.ru : s.en }))} />
            <Seg
              label={t('directions')}
              value={cfg.dir ?? 'up'}
              onChange={(dir) => set({ ...cfg, dir })}
              items={[
                { v: 'up', l: '↑' },
                { v: 'down', l: '↓' },
                { v: 'both', l: '↑↓' },
              ]}
            />
            <Seg value={!!cfg.vamp} onChange={(vamp) => set({ ...cfg, vamp })} items={[{ v: false, l: ru_(lang, 'Гамма', 'Scale') }, { v: true, l: ru_(lang, 'Мелодия на бурдоне', 'Melody over drone') }]} />
          </>
        );
      case 'degree':
        return (
          <>
            <Seg
              value={!!cfg.minor}
              onChange={(minor) => set({ ...cfg, minor, set: minor ? ['1', '2', 'b3', '4', '5', 'b6', 'b7'] : ['1', '2', '3', '4', '5', '6', '7'] })}
              items={[
                { v: false, l: t('majorKey') },
                { v: true, l: t('minorKey') },
              ]}
            />
            <Chips label={t('options')} value={cfg.set} onChange={(s) => set({ ...cfg, set: s })} items={DEGREES.map((d) => ({ v: d.id, l: d.label }))} />
            <Seg value={!!cfg.wide} onChange={(wide) => set({ ...cfg, wide })} items={[{ v: false, l: lang === 'ru' ? 'Одна октава' : 'One octave' }, { v: true, l: lang === 'ru' ? 'Разные октавы' : 'Across octaves' }]} />
            <Seg
              label={ru_(lang, 'Контекст', 'Context')}
              value={cfg.holdKey ? 'hold' : cfg.context === 'tonic' ? 'tonic' : 'cad'}
              onChange={(v) => set({ ...cfg, holdKey: v === 'hold', context: v === 'tonic' ? 'tonic' : 'cadence' })}
              items={[
                { v: 'cad', l: ru_(lang, 'Каденция', 'Cadence') },
                { v: 'hold', l: ru_(lang, 'Держать тональность', 'Hold key') },
                { v: 'tonic', l: ru_(lang, 'Только тоника', 'Tonic only') },
              ]}
            />
          </>
        );
      case 'melody':
        return (
          <>
            <Seg
              value={!!cfg.minor}
              onChange={(minor) =>
                set({
                  ...cfg,
                  minor,
                  set: minor ? ['1', '2', 'b3', '4', '5', 'b6', 'b7', '8'] : ['1', '2', '3', '4', '5', '6', '7', '8'],
                })
              }
              items={[
                { v: false, l: t('majorKey') },
                { v: true, l: t('minorKey') },
              ]}
            />
            {!cfg.minor && (
              <Seg
                label={t('options')}
                value={MEL_PRESETS.find((p) => p.set.join() === cfg.set.join())?.id ?? ''}
                onChange={(id) => set({ ...cfg, set: MEL_PRESETS.find((p) => p.id === id)!.set })}
                items={MEL_PRESETS.map((p) => ({ v: p.id, l: lang === 'ru' ? p.ru : p.en }))}
              />
            )}
            <Seg label={t('length')} value={cfg.length} onChange={(length) => set({ ...cfg, length })} items={[3, 4, 5, 6, 7, 8].map((n) => ({ v: n, l: String(n) }))} />
            <Seg value={!!cfg.rhythmic} onChange={(rhythmic) => set({ ...cfg, rhythmic })} items={[{ v: false, l: ru_(lang, 'Ровные ноты', 'Even notes') }, { v: true, l: ru_(lang, 'С ритмом', 'With rhythm') }]} />
          </>
        );
      case 'progression':
        return (
          <>
            <Seg
              value={!!cfg.minor}
              onChange={(minor) => set({ ...cfg, minor, set: minor ? ['i', 'iv', 'V', 'VI', 'VII'] : ['I', 'IV', 'V', 'vi'] })}
              items={[
                { v: false, l: t('majorKey') },
                { v: true, l: t('minorKey') },
              ]}
            />
            <Chips
              label={t('options')}
              value={cfg.set}
              onChange={(s) => set({ ...cfg, set: s.includes(cfg.minor ? 'i' : 'I') ? s : [cfg.minor ? 'i' : 'I', ...s] })}
              items={ROMANS.filter((r) => (cfg.minor ? r.minorKey || ['V', 'V7', 'iv'].includes(r.id) : !r.minorKey)).map((r) => ({ v: r.id, l: r.id }))}
            />
            <Seg label={t('length')} value={cfg.length} onChange={(length) => set({ ...cfg, length })} items={[3, 4, 5, 6, 8].map((n) => ({ v: n, l: String(n) }))} />
            <Seg
              label={ru_(lang, 'Звучание', 'Sound')}
              value={cfg.style ?? 'block'}
              onChange={(style) => set({ ...cfg, style, free: style !== 'block' })}
              items={[
                { v: 'block', l: ru_(lang, 'Аккорды', 'Block') },
                { v: 'ballad', l: ru_(lang, 'Баллада', 'Ballad') },
                { v: 'pop', l: ru_(lang, 'Поп', 'Pop') },
                { v: 'strum', l: ru_(lang, 'Гитара', 'Guitar') },
                { v: 'jazz', l: ru_(lang, 'Джаз', 'Jazz') },
              ]}
            />
            <Seg value={!!cfg.inversions} onChange={(inversions) => set({ ...cfg, inversions })} items={[{ v: false, l: '—' }, { v: true, l: t('withInversions') }]} />
          </>
        );
      case 'bass':
        return (
          <>
            <Chips label={t('options')} value={cfg.set} onChange={(s) => set({ ...cfg, set: s.includes('I') ? s : ['I', ...s] })} items={['I', 'ii', 'iii', 'IV', 'V', 'vi'].map((r) => ({ v: r, l: r }))} />
            <Seg label={t('length')} value={cfg.length} onChange={(length) => set({ ...cfg, length })} items={[3, 4, 5, 6].map((n) => ({ v: n, l: String(n) }))} />
            <Seg value={!!cfg.inversions} onChange={(inversions) => set({ ...cfg, inversions })} items={[{ v: false, l: '—' }, { v: true, l: t('withInversions') }]} />
          </>
        );
      case 'cadence':
        return (
          <Chips
            label={t('options')}
            value={cfg.set}
            onChange={(s) => set({ ...cfg, set: s })}
            items={[
              { v: 'PAC' as const, l: ru_(lang, 'Полная', 'Authentic') },
              { v: 'HC' as const, l: ru_(lang, 'Половинная', 'Half') },
              { v: 'PC' as const, l: ru_(lang, 'Плагальная', 'Plagal') },
              { v: 'DC' as const, l: ru_(lang, 'Прерванная', 'Deceptive') },
            ]}
          />
        );
      case 'rhythmDictation':
        return (
          <>
            <Seg label={t('level_')} value={cfg.level} onChange={(level) => set({ ...cfg, level })} items={[1, 2, 3, 4].map((n) => ({ v: n, l: '★'.repeat(n) }))} />
            <Seg label={t('length')} value={cfg.bars ?? 1} onChange={(bars) => set({ ...cfg, bars })} items={[{ v: 1, l: ru_(lang, '1 такт', '1 bar') }, { v: 2, l: ru_(lang, '2 такта', '2 bars') }]} />
            <Seg label={ru_(lang, 'Размер', 'Meter')} value={cfg.meter ?? 4} onChange={(meter) => set({ ...cfg, meter })} items={[{ v: 4 as const, l: '4/4' }, { v: 3 as const, l: '3/4' }, { v: 6 as const, l: '6/8' }]} />
          </>
        );
      case 'function':
        return (
          <Chips label={t('options')} value={cfg.set} onChange={(s) => set({ ...cfg, set: s })} items={['I', 'ii', 'iii', 'IV', 'V', 'V7', 'vi', 'vii°'].map((r) => ({ v: r, l: r }))} />
        );
      case 'tonicFind':
        return <Seg value={!!cfg.minor} onChange={(minor) => set({ ...cfg, minor })} items={[{ v: false, l: t('majorKey') }, { v: true, l: t('minorKey') }]} />;
      case 'intervalInKey':
        return <Chips label={t('options')} value={cfg.set} onChange={(s) => set({ ...cfg, set: s.includes('1') ? s : ['1', ...s] })} items={['1', '2', '3', '4', '5', '6', '7', '8'].map((d) => ({ v: d, l: d }))} />;
      case 'modulation':
        return (
          <Chips
            label={t('options')}
            value={cfg.set}
            onChange={(s) => set({ ...cfg, set: s })}
            items={[
              { v: 'none' as const, l: ru_(lang, 'Нет', 'None') },
              { v: 'V' as const, l: 'V' },
              { v: 'IV' as const, l: 'IV' },
              { v: 'vi' as const, l: 'vi' },
              { v: 'i' as const, l: 'i' },
            ]}
          />
        );
      case 'twoVoice':
        return (
          <>
            <Chips label={t('options')} value={cfg.set} onChange={(s) => set({ ...cfg, set: s.includes('I') ? s : ['I', ...s] })} items={['I', 'ii', 'iii', 'IV', 'V', 'vi'].map((r) => ({ v: r, l: r }))} />
            <Seg label={t('length')} value={cfg.length} onChange={(length) => set({ ...cfg, length })} items={[3, 4, 5, 6].map((n) => ({ v: n, l: String(n) }))} />
          </>
        );
      case 'fullDictation':
        return (
          <>
            <Seg value={!!cfg.minor} onChange={(minor) => set({ ...cfg, minor, set: minor ? ['5,', '7,', '1', '2', 'b3', '4', '5', 'b6', '8'] : ['5,', '7,', '1', '2', '3', '4', '5', '6', '8'] })} items={[{ v: false, l: t('majorKey') }, { v: true, l: t('minorKey') }]} />
            <Seg label={t('level_')} value={cfg.level} onChange={(level) => set({ ...cfg, level })} items={[1, 2, 3].map((n) => ({ v: n, l: '★'.repeat(n) }))} />
            <Seg label={t('length')} value={cfg.bars} onChange={(bars) => set({ ...cfg, bars })} items={[{ v: 1, l: ru_(lang, '1 такт', '1 bar') }, { v: 2, l: ru_(lang, '2 такта', '2 bars') }]} />
          </>
        );
      case 'pulse':
        return <Seg label="BPM" value={cfg.bpm ?? 90} onChange={(bpm) => set({ ...cfg, bpm })} items={[70, 90, 110, 130].map((n) => ({ v: n, l: String(n) }))} />;
      case 'noteName':
        return (
          <>
            <Chips label={t('options')} value={cfg.set} onChange={(s) => set({ ...cfg, set: s })} items={Array.from({ length: 12 }, (_, i) => ({ v: i, l: pcName(i, naming, lang) }))} />
            <Seg value={cfg.reference} onChange={(reference) => set({ ...cfg, reference })} items={[{ v: true, l: t('withReference') }, { v: false, l: lang === 'ru' ? 'Без эталона' : 'No reference' }]} />
          </>
        );
      case 'sing':
        return (
          <Seg
            label={t('options')}
            value={cfg.mode}
            onChange={(mode) => set({ ...cfg, mode, length: mode === 'echo' || mode === 'sight' ? 4 : undefined, set: mode === 'interval' ? ['3', '4', '5', '7', '12'] : mode === 'degree' ? ['1', '2', '3', '4', '5', '6', '7'] : mode === 'echo' || mode === 'sight' ? ['5,', '6,', '7,', '1', '2', '3', '4', '5'] : undefined })}
            items={[
              { v: 'note', l: lang === 'ru' ? 'Нота' : 'Note' },
              { v: 'degree', l: lang === 'ru' ? 'Ступень' : 'Degree' },
              { v: 'interval', l: lang === 'ru' ? 'Интервал' : 'Interval' },
              { v: 'echo', l: lang === 'ru' ? 'Эхо фразы' : 'Phrase echo' },
              { v: 'sight', l: lang === 'ru' ? 'С листа' : 'Sight-singing' },
            ]}
          />
        );
      case 'rhythm':
        return (
          <>
            <Seg label={t('level_')} value={cfg.level} onChange={(level) => set({ ...cfg, level })} items={[1, 2, 3, 4].map((n) => ({ v: n, l: '★'.repeat(n) }))} />
            <Seg label={t('length')} value={cfg.bars ?? 1} onChange={(bars) => set({ ...cfg, bars })} items={[{ v: 1, l: lang === 'ru' ? '1 такт' : '1 bar' }, { v: 2, l: lang === 'ru' ? '2 такта' : '2 bars' }]} />
          </>
        );
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">{t('practiceTitle')}</h1>
      <p className="muted">{t('practiceSub')}</p>

      <button className="ref-card" onClick={() => open({ name: 'reference' })}>
        <span className="qc-icon">📚</span>
        <span className="qc-text">
          <b>{t('reference')}</b>
          <small>{t('referenceSub')}</small>
        </span>
        <span className="chev">›</span>
      </button>

      <div className="kind-grid">
        {(Object.keys(KIND_META) as ExerciseKind[]).map((k) => (
          <button key={k} className={`kind ${k === kind ? 'on' : ''}`} onClick={() => setKind(k)}>
            <span className="kind-icon">{KIND_META[k].icon}</span>
            <span className="kind-name">{lang === 'ru' ? KIND_META[k].ru : KIND_META[k].en}</span>
          </button>
        ))}
      </div>

      <div className="card editor">
        <div className="editor-head">
          <span className="kind-icon">{KIND_META[kind].icon}</span>
          <div>
            <b>{lang === 'ru' ? KIND_META[kind].ru : KIND_META[kind].en}</b>
            <div className="muted small">{lang === 'ru' ? KIND_META[kind].descRu : KIND_META[kind].descEn}</div>
          </div>
        </div>
        {ed()}
        {err && <div className="err">{err}</div>}
        <button className="btn primary big block" onClick={go}>
          ▶ {t('practiceStart')}
        </button>
      </div>
    </div>
  );
}
