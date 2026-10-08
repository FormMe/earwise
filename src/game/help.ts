import type { ExerciseKind } from '../exercises/types';

/** Plain-language "what do I do here?" for every exercise type: what you hear, and what to answer. */
export const KIND_HELP: Record<ExerciseKind, { ru: [string, string]; en: [string, string] }> = {
  pitch: {
    ru: ['Звучат две ноты одна за другой.', 'Реши, вторая нота выше первой или ниже. Представь лестницу: шаг вверх или вниз?'],
    en: ['Two notes play one after another.', 'Decide whether the second one is higher or lower.'],
  },
  interval: {
    ru: ['Звучат две ноты — по очереди или вместе.', 'Назови расстояние между ними (интервал). Подсказка: вспомни песню, которая начинается так же — список в «Справочнике».'],
    en: ['Two notes play — one after another or together.', 'Name the distance between them. Tip: think of a song that starts the same way (see Reference).'],
  },
  chord: {
    ru: ['Звучит аккорд — несколько нот одновременно.', 'Определи его окраску: светлый (мажор), грустный (минор), напряжённый (уменьшённый) и т.д. Кнопка «Арпеджио» сыграет ноты по очереди.'],
    en: ['A chord plays — several notes at once.', 'Name its colour: bright (major), sad (minor), tense (diminished)… “Arpeggio” plays it note by note.'],
  },
  inversion: {
    ru: ['Звучит аккорд, но внизу (в басу) может быть не основной тон.', 'Слушай только самую нижнюю ноту и определи, какой это вид аккорда.'],
    en: ['A chord plays; its lowest note may not be the root.', 'Listen to the lowest note only and pick the inversion.'],
  },
  scale: {
    ru: ['Звучит гамма или мелодия на фоне гудящего баса.', 'Определи лад по окраске. Нажимай варианты, чтобы сравнить, как звучит каждый.'],
    en: ['A scale, or a melody over a drone, plays.', 'Name the mode by its colour. Tap options to compare.'],
  },
  degree: {
    ru: ['Сначала звучат 4 аккорда — они задают «дом» (тональность). Потом одна нота.', 'Определи, какая это ступень относительно дома: 1 — сам дом, 5 — устойчивая опора, 7 — тянется вверх к дому и т.д. После ответа нота «пойдёт домой» — слушай это движение.'],
    en: ['Four chords set "home" (the key), then one note plays.', 'Say which degree it is relative to home. After answering, the note walks home — listen to that motion.'],
  },
  melody: {
    ru: ['Звучит аккорд (дом), потом короткая мелодия.', 'Запиши мелодию ступенями по порядку: нажимай кнопки — каждая звучит, можно подбирать. Потом «Проверить».'],
    en: ['A home chord, then a short melody.', 'Write the melody as degrees in order (buttons play as you tap), then Check.'],
  },
  progression: {
    ru: ['Звучит последовательность аккордов (иногда с аккомпанементом и барабанами).', 'Назови аккорды по порядку римскими цифрами: I — дом, IV и V — главные соседи, vi — минорный. Кнопка «Только бас» помогает: бас обычно поёт основной тон.'],
    en: ['A chord progression plays (sometimes with a band).', 'Name the chords in order in Roman numerals. “Bass only” helps — the bass usually sings the root.'],
  },
  bass: {
    ru: ['Звучат аккорды, бас выделен громче.', 'Запиши ступени, по которым идёт самая нижняя линия. Включи «Только бас», если сложно.'],
    en: ['Chords play with a loud bass.', 'Write the degrees of the lowest line. Use “Bass only” if needed.'],
  },
  cadence: {
    ru: ['Звучит короткая фраза из аккордов.', 'Как она закончилась? Точкой (полная), запятой (половинная — повисла), мягким «аминь» (плагальная) или обманом (прерванная).'],
    en: ['A short chord phrase plays.', 'How does it end: full stop, comma, soft “amen”, or a surprise?'],
  },
  noteName: {
    ru: ['Звучит эталонная нота до, потом загаданная нота.', 'Найди загаданную ноту на клавиатуре, сравнивая её с до.'],
    en: ['Reference C, then a mystery note.', 'Find the note on the keyboard by comparing it with C.'],
  },
  sing: {
    ru: ['Звучит нота, фраза или тональность.', 'Спой в микрофон то, что просят. Полоска покажет, выше ты или ниже — держи ноту в зелёной зоне. Петь можно в любой октаве.'],
    en: ['A note, phrase or key plays.', 'Sing what is asked; keep the needle in the green zone. Any octave is fine.'],
  },
  rhythm: {
    ru: ['Звучит ритм, потом отсчёт «4-3-2-1».', 'После отсчёта простучи тот же ритм по большой кнопке (или пробелом).'],
    en: ['A rhythm plays, then a 4-beat count-in.', 'Tap it back on the big button (or Space).'],
  },
  rhythmDictation: {
    ru: ['Отсчёт щелчками, потом ритм на одной ноте. Каждый щелчок — одна доля.', 'Для каждой доли выбери «кирпичик»: одна длинная нота, две короткие, пауза и т.д. Нажимай кирпичики, чтобы услышать, как они звучат.'],
    en: ['Clicks count in, then a rhythm. Each click is one beat.', 'For each beat choose a block: one long note, two short ones, a rest… Tap blocks to hear them.'],
  },
  function: {
    ru: ['Звучат 4 аккорда (дом), потом один аккорд.', 'Какая у него роль: T — покой, дом; S — «уход из дома»; D — напряжение, тянет вернуться.'],
    en: ['Home chords, then one chord.', 'Its role: T rest, S moving away, D tension pulling home.'],
  },
  tonicFind: {
    ru: ['Звучит мелодия, потом три отдельные ноты A, B, C.', 'Какая из трёх нот звучит как «дом» — на ней мелодии хочется остановиться?'],
    en: ['A melody, then three notes A, B, C.', 'Which one feels like home — where the melody wants to stop?'],
  },
  intervalInKey: {
    ru: ['Звучит тональность, потом тоника и ещё одна нота.', 'Назови интервал между ними. Это мост между ступенями и интервалами: 1→5 — квинта и т.д.'],
    en: ['A key, then the tonic and another note.', 'Name the interval: 1→5 is a fifth, and so on.'],
  },
  modulation: {
    ru: ['Звучат 10 аккордов.', 'Сравни конец с началом: музыка вернулась в тот же «дом» или пришла в новый? Кнопки «Начальная тоника» и «Конец» помогут сравнить.'],
    en: ['Ten chords play.', 'Compare the end with the start: same home, or a new one?'],
  },
  twoVoice: {
    ru: ['Звучат два голоса — низкий (бас) и высокий.', 'Сначала запиши ступени баса, потом верхнего голоса. Кнопки «Только бас» / «Только верх» играют их по отдельности.'],
    en: ['Two voices: bass and top.', 'Write the bass degrees, then the top line. Use “Bass only” / “Top only”.'],
  },
  fullDictation: {
    ru: ['Звучит тональность, отсчёт, потом мелодия с ритмом.', 'Шаг 1 — запиши ступени нот. Шаг 2 — для каждой доли выбери ритмический «кирпичик».'],
    en: ['Key, count-in, then a melody with rhythm.', 'Step 1: the degrees. Step 2: a rhythm block for each beat.'],
  },
  pulse: {
    ru: ['Играет музыка с барабанами.', 'Первый такт слушай, потом стучи по кнопке на каждую долю — как будто притопываешь ногой.'],
    en: ['Music with drums plays.', 'Listen for a bar, then tap every beat as if tapping your foot.'],
  },
};

/** Short definitions of the terms the course uses, in the order a beginner meets them. */
export const GLOSSARY: { ru: [string, string]; en: [string, string] }[] = [
  { ru: ['Полутон', 'Самый маленький шаг: две соседние клавиши пианино.'], en: ['Semitone', 'The smallest step: two neighbouring piano keys.'] },
  { ru: ['Доля', 'Один ровный «шаг» музыки, то, что отстукивает метроном.'], en: ['Beat', 'One steady step of the music — what a metronome clicks.'] },
  { ru: ['Такт', 'Группа долей (обычно 4: «раз-два-три-четыре»).'], en: ['Bar', 'A group of beats (usually 4).'] },
  { ru: ['Тоника', '«Дом» мелодии: нота, на которой музыке спокойно и хочется закончить.'], en: ['Tonic', 'Home: the note where the music feels at rest.'] },
  { ru: ['Ступень', 'Номер ноты, считая от дома: дом = 1, следующая нота гаммы = 2 и т.д. Ступени поют как «до-ре-ми» от дома — в любой тональности.'], en: ['Scale degree', 'A note’s number counted from home (1, 2, 3…).'] },
  { ru: ['Хроматические ступени', 'Ступени с ♭ или ♯ — пониженные или повышенные: ♭7 («те») — пониженная си, ♯4 («фи») — повышенная фа.'], en: ['Chromatic degrees', 'Degrees with ♭ or ♯ are lowered or raised versions, e.g. ♭7 or ♯4.'] },
  { ru: ['Тональность', 'Набор нот вокруг одного «дома», например «Ре мажор».'], en: ['Key', 'The set of notes around one home, e.g. D major.'] },
  { ru: ['Каденция', 'Несколько аккордов, которые звучат как «точка» и задают дом. Перед вопросами про ступени играет именно она.'], en: ['Cadence', 'A few chords that sound like a full stop and set the key.'] },
  { ru: ['Интервал', 'Расстояние между двумя нотами (терция, квинта, октава…).'], en: ['Interval', 'The distance between two notes.'] },
  { ru: ['Аккорд', 'Три и больше нот одновременно. Мажорный — светлый, минорный — грустный.'], en: ['Chord', 'Three or more notes at once. Major is bright, minor sad.'] },
  { ru: ['Мажор / минор', 'Две главные «окраски» музыки: светлая и грустная.'], en: ['Major / minor', 'The two main colours of music: bright and sad.'] },
  { ru: ['Римские цифры (I, IV, V)', 'Номер аккорда по ступени, на которой он построен. Большие — мажорные, маленькие (ii, vi) — минорные.'], en: ['Roman numerals', 'Which degree a chord is built on; upper case = major, lower case = minor.'] },
  { ru: ['T / S / D', 'Роли аккордов: тоника — покой, субдоминанта — уход, доминанта — напряжение, тянет домой.'], en: ['T / S / D', 'Chord roles: tonic rest, subdominant away, dominant tension.'] },
  { ru: ['Обращение', 'Аккорд, у которого внизу (в басу) не главная нота, а другая.'], en: ['Inversion', 'A chord with a note other than its root in the bass.'] },
  { ru: ['Бас', 'Самый низкий голос — фундамент гармонии.'], en: ['Bass', 'The lowest voice — the foundation of the harmony.'] },
  { ru: ['Октава', 'Та же нота выше или ниже. «Ля3» — ля третьей октавы (цифра — номер октавы).'], en: ['Octave', 'The same note higher or lower; the number in “A3” is the octave.'] },
  { ru: ['Лад', 'Порядок шагов в гамме, который даёт музыке окраску (мажор, минор, дорийский…).'], en: ['Mode', 'The step pattern of a scale that gives music its colour.'] },
];
