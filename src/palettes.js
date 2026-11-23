/**
 * 《潮汐之外》三套莫蘭迪色票系統、預設記憶存檔與台灣繁體文學文案（單一真理來源）
 */

function hexToRgb01(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const PALETTES = {
  mist: {
    id: 'mist',
    label: '青霧晨汐',
    swatch: '#89A3A7',
    coords: "25°07'N 121°44'E",
    skyUpper: hexToRgb01('#6F878E'),
    skyMid: hexToRgb01('#B6C7C6'),
    horizon: hexToRgb01('#E4E9E5'),
    waterFar: hexToRgb01('#A9BCBF'),
    waterNear: hexToRgb01('#91A6AC'),
    shore: hexToRgb01('#2E4048'),
    beam: hexToRgb01('#FBF5E4'),
    accentHex: '#734231',
    inkHex: '#1C2A30',
    paperHex: '#F5F2EB',
    rainIntensity: 0.0
  },
  rose: {
    id: 'rose',
    label: '暮靄玫瑰',
    swatch: '#B099A0',
    coords: "25°07'N 121°44'E",
    skyUpper: hexToRgb01('#7B6972'),
    skyMid: hexToRgb01('#C2B0B4'),
    horizon: hexToRgb01('#E9DFDA'),
    waterFar: hexToRgb01('#B8A8AD'),
    waterNear: hexToRgb01('#A29198'),
    shore: hexToRgb01('#3B2F36'),
    beam: hexToRgb01('#FBF0DC'),
    accentHex: '#7D3F4B',
    inkHex: '#261D22',
    paperHex: '#F6F1EE',
    rainIntensity: 0.0
  },
  rain: {
    id: 'rain',
    label: '銀灰靜雨',
    swatch: '#9AA4AE',
    coords: "25°07'N 121°44'E",
    skyUpper: hexToRgb01('#76808A'),
    skyMid: hexToRgb01('#BEC5CB'),
    horizon: hexToRgb01('#E4E7EA'),
    waterFar: hexToRgb01('#B3BBC2'),
    waterNear: hexToRgb01('#9BA4AC'),
    shore: hexToRgb01('#2A323A'),
    beam: hexToRgb01('#F7F5EE'),
    accentHex: '#35536B',
    inkHex: '#1B2127',
    paperHex: '#F3F4F5',
    rainIntensity: 1.0
  }
};

export const ACT_TEMPLATES = {
  act1: {
    actCode: 'ACT I',
    actZh: '第一幕',
    actEn: 'ACT I — THE HARBOR CORRESPONDENT',
    chapter: '第一幕：霧港寄信人',
    location: '北岬舊郵政出張所・石階口',
    playtime: '00 小時 42 分',
    excerpt: '天色還沒完全轉亮，港口的霧低得幾乎貼住水面。門縫下壓著一封沒貼郵票的長信，紙緣還帶著隔夜的潮氣。',
    sceneKey: 'act1'
  },
  act2: {
    actCode: 'ACT II',
    actZh: '第二幕',
    actEn: 'ACT II — BREAKWATER AT LOW TIDE',
    chapter: '第二幕：退潮後的防波堤',
    location: '南岸淺灘・舊驗潮亭',
    playtime: '02 小時 18 分',
    excerpt: '信封邊角被海風吹得發軟，郵戳只剩半個模糊的十月。她說要是今晚燈塔沒亮，就別再等下一班渡輪。',
    sceneKey: 'act2'
  },
  act3: {
    actCode: 'ACT III',
    actZh: '第三幕',
    actEn: 'ACT III — UNCLAIMED POSTCARDS',
    chapter: '第三幕：無人領取的雨季明信片',
    location: '外港渡輪候船室・二樓窗邊',
    playtime: '04 小時 51 分',
    excerpt: '潮位計的指針停在漲潮前一刻。木桌上攤著三張沒寫收件人的明信片，窗外只聽見纜繩偶爾輕輕拍打堤岸。',
    sceneKey: 'act3'
  }
};

export const PROLOGUE_LINES = [
  '這座港口一年有兩百天在起霧。',
  '漲潮的時候，海水會漫過舊郵局前最後一級石階。',
  '有人說，那些始終沒有抵達地址的信，其實只是被潮水暫時收留了。',
  '你在黎明前推開門，霧裡正傳來燈塔緩慢轉動的微光。'
];

export const CREDITS_SECTIONS = [
  { role: '導演・劇本　DIRECTED & WRITTEN BY', names: ['林棲霧', '陳予潮'] },
  { role: '美術指導與水彩著色　ART DIRECTION & SHADER', names: ['許靜舟', '周白露'] },
  { role: '字體微排印與書籍裝幀　TYPOGRAPHY & BOOK DESIGN', names: ['基隆北岬裝幀研習社', '蘇墨安'] },
  { role: '敘事架構與田野採集　NARRATIVE ARCHITECTURE', names: ['沈臨岸', '唐季雨'] },
  { role: '程式與互動技術指導　TECHNICAL DIRECTION', names: ['江微瀾', '高遠帆'] },
  { role: '特別致謝　SPECIAL THANKS', names: ['所有在霧雨午後讀完一封舊信的人', '北岬舊郵政出張所檔案室', '以及尚未寄出的每一張明信片'] }
];
