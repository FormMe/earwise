export interface IntervalDef {
  semis: number;
  id: string;
  short: string;
  ru: string;
  /** Russian accusative ("спой малую терцию") */
  acc?: string;
  en: string;
  /** Mnemonic songs, ascending / descending */
  up?: string[];
  down?: string[];
}

export const INTERVALS: IntervalDef[] = [
  { semis: 0, id: 'P1', short: 'Ч1', ru: 'Прима', en: 'Unison' },
  {
    semis: 1, id: 'm2', short: 'М2', ru: 'Малая секунда', acc: 'малую секунду', en: 'Minor 2nd',
    up: ['«Челюсти» (Jaws)', 'Pink Panther'], down: ['«К Элизе» Бетховена'],
  },
  {
    semis: 2, id: 'M2', short: 'Б2', ru: 'Большая секунда', acc: 'большую секунду', en: 'Major 2nd',
    up: ['«Катюша» («Рас-цве…»)', 'Happy Birthday', '«Silent Night»'], down: ['Mary Had a Little Lamb', '«Yesterday» (The Beatles)'],
  },
  {
    semis: 3, id: 'm3', short: 'М3', ru: 'Малая терция', acc: 'малую терцию', en: 'Minor 3rd',
    up: ['«Подмосковные вечера» («Не слыш-…»)', 'Greensleeves', 'Smoke on the Water'], down: ['Hey Jude', '«Frosty the Snowman»'],
  },
  {
    semis: 4, id: 'M3', short: 'Б3', ru: 'Большая терция', acc: 'большую терцию', en: 'Major 3rd',
    up: ['When the Saints Go Marching In', '«Kumbaya»'], down: ['«Чижик-пыжик»', 'Swing Low, Sweet Chariot'],
  },
  {
    semis: 5, id: 'P4', short: 'Ч4', ru: 'Чистая кварта', acc: 'чистую кварту', en: 'Perfect 4th',
    up: ['Гимн России («Рос-сия…»)', 'Here Comes the Bride', '«Интернационал»'], down: ['Eine kleine Nachtmusik (Моцарт)'],
  },
  {
    semis: 6, id: 'TT', short: 'ТТ', ru: 'Тритон', en: 'Tritone',
    up: ['«Maria» (West Side Story)', 'The Simpsons'], down: ['Black Sabbath — «Black Sabbath»'],
  },
  {
    semis: 7, id: 'P5', short: 'Ч5', ru: 'Чистая квинта', acc: 'чистую квинту', en: 'Perfect 5th',
    up: ['Star Wars (главная тема)', 'Twinkle Twinkle Little Star'], down: ['The Flintstones'],
  },
  {
    semis: 8, id: 'm6', short: 'М6', ru: 'Малая секста', acc: 'малую сексту', en: 'Minor 6th',
    up: ['The Entertainer (3→4 нота)'],
  },
  {
    semis: 9, id: 'M6', short: 'Б6', ru: 'Большая секста', acc: 'большую сексту', en: 'Major 6th',
    up: ['«В лесу родилась ёлочка»', 'My Bonnie Lies Over the Ocean', 'NBC chime'], down: ['Nobody Knows the Trouble I\'ve Seen'],
  },
  {
    semis: 10, id: 'm7', short: 'М7', ru: 'Малая септима', acc: 'малую септиму', en: 'Minor 7th',
    up: ['Star Trek (оригинальная тема)', '«Somewhere» (West Side Story)'],
  },
  {
    semis: 11, id: 'M7', short: 'Б7', ru: 'Большая септима', acc: 'большую септиму', en: 'Major 7th',
    up: ['Take On Me (припев)'], down: ['«I Love You» (Cole Porter)'],
  },
  {
    semis: 12, id: 'P8', short: 'Ч8', ru: 'Октава', acc: 'октаву', en: 'Octave',
    up: ['Somewhere Over the Rainbow'], down: ['Willow Weep for Me'],
  },
  { semis: 13, id: 'm9', short: 'М9', ru: 'Малая нона', en: 'Minor 9th' },
  { semis: 14, id: 'M9', short: 'Б9', ru: 'Большая нона', en: 'Major 9th' },
  { semis: 15, id: 'm10', short: 'М10', ru: 'Малая децима', en: 'Minor 10th' },
  { semis: 16, id: 'M10', short: 'Б10', ru: 'Большая децима', en: 'Major 10th' },
];

export const intervalBySemis = (s: number) => INTERVALS.find((i) => i.semis === s)!;
