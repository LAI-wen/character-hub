import type { Character } from '../types'

// The sample character "莉央" — ported verbatim from DEMO in the original DC.
// Used as the initial state and by the "載入範例" action.
export const DEMO: Character = {
  name: '莉央',
  nickname: '小央',
  tagline: '我把每一個願望，都記在星圖上。',
  avatarUrl: 'https://picsum.photos/seed/octool-luna-av/400/400',
  mainVisualUrl: 'https://picsum.photos/seed/octool-luna-main/1280/820',
  palette: [
    { id: 'p1', label: '髮色', hex: '#aebfdc' },
    { id: 'p2', label: '瞳色', hex: '#e0a93b' },
    { id: 'p3', label: '膚色', hex: '#f3e2d2' },
    { id: 'p4', label: '主服裝', hex: '#39456b' },
    { id: 'p5', label: '點綴金', hex: '#d9a441' },
  ],
  sections: [
    {
      id: 's1',
      title: '基本資料',
      group: 'text',
      fields: [
        { id: 'f1', label: '種族 / 身分', type: 'text', value: '半精靈・星辰守望者' },
        { id: 'f2', label: '年齡', type: 'text', value: '看起來 19，實際 124' },
        { id: 'f3', label: '身高', type: 'text', value: '162 cm' },
      ],
    },
    {
      id: 's2',
      title: '個性與故事',
      group: 'text',
      fields: [
        {
          id: 'f4',
          label: '性格',
          type: 'longtext',
          value:
            '表面慵懶愛睏，骨子裡固執又認真。對世界永遠保有好奇，遇到喜歡的事會一頭栽進去到忘記時間，唯獨不擅長說再見。',
        },
        {
          id: 'f5',
          label: '背景故事',
          type: 'longtext',
          value:
            '出生在被世人遺忘的觀星塔，由守望星辰的老精靈撫養長大。她的工作，是守著星圖上每一個願望不讓它熄滅——直到某個雨夜，一位迷路的旅人敲響了塔門。',
        },
        { id: 'f6', label: '喜歡', type: 'tags', value: '熱可可、舊地圖、雨後的青草味、收集碎玻璃' },
        { id: 'f7', label: '討厭', type: 'tags', value: '說謊的人、太亮的燈、被人催促' },
      ],
    },
    {
      id: 's3',
      title: '補充',
      group: 'text',
      fields: [
        {
          id: 'f8',
          label: '備註',
          type: 'longtext',
          value: '右眼在月圓之夜會泛起淡淡金光。非常怕冷，冬天幾乎離不開毛毯。',
        },
      ],
    },
  ],
  albums: [
    {
      id: 'a1',
      name: '角色插圖',
      kind: 'gallery',
      images: [
        {
          id: 'i1',
          url: 'https://picsum.photos/seed/octool-art1/640/800',
          caption: '觀星塔的清晨',
          annotations: [],
        },
        {
          id: 'i2',
          url: 'https://picsum.photos/seed/octool-art2/680/520',
          caption: '雨夜的訪客',
          annotations: [],
        },
      ],
    },
    {
      id: 'a2',
      name: '漫畫塗鴉',
      kind: 'gallery',
      linkRef: 'a4',
      images: [
        {
          id: 'i3',
          url: 'https://picsum.photos/seed/octool-room/720/540',
          caption: '塔頂的書房',
          annotations: [],
        },
      ],
    },
    {
      id: 'a3',
      name: '日常服設定',
      kind: 'ref',
      images: [
        {
          id: 'i4',
          url: 'https://picsum.photos/seed/octool-cosref/620/820',
          caption: '日常服參考',
          annotations: [],
        },
      ],
    },
    {
      id: 'a4',
      name: '觀星正裝設定',
      kind: 'ref',
      images: [
        {
          id: 'i5',
          url: 'https://picsum.photos/seed/octool-cos/640/860',
          caption: '觀星正裝',
          annotations: [
            {
              id: 'an1',
              kind: 'pin',
              x: 0.5,
              y: 0.17,
              label: '星形領釦',
              note: '象徵守望者的身分，月光下會微亮。',
            },
            {
              id: 'an2',
              kind: 'rect',
              x: 0.1,
              y: 0.42,
              w: 0.34,
              h: 0.2,
              label: '袖口刺繡',
              note: '手工縫的星圖紋路，每一顆都對應一個願望。',
            },
          ],
        },
      ],
    },
    {
      id: 'a5',
      name: '立繪設定',
      kind: 'ref',
      images: [
        {
          id: 'i6',
          url: 'https://picsum.photos/seed/octool-ref/620/860',
          caption: '三面立繪',
          annotations: [
            {
              id: 'an3',
              kind: 'pin',
              x: 0.66,
              y: 0.28,
              label: '右眼金光',
              note: '月圓之夜浮現的金色光暈。',
            },
          ],
        },
      ],
    },
  ],
  templates: [
    {
      id: 't1',
      name: '名片',
      design: { bg: '#ffffff', primary: '#c98a5e', font: 'noto-sans', width: 'normal' },
      blocks: [
        { id: 'b1', type: 'cover', style: { align: 'center', padding: 0, radius: 18, opacity: 100 } },
        { id: 'b2', type: 'avatar', style: { align: 'center', padding: 8, opacity: 100 } },
        { id: 'b3', type: 'heading', style: { align: 'center', padding: 4, opacity: 100 } },
        { id: 'b4', type: 'tagline', style: { align: 'center', padding: 4, opacity: 100 } },
        { id: 'b5', type: 'palette', style: { align: 'center', padding: 14, opacity: 100 } },
        {
          id: 'b6',
          type: 'section',
          sourceId: 's1',
          style: {
            align: 'left',
            padding: 18,
            bgColor: '#fffdf8',
            radius: 18,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: '#e6dccb',
            opacity: 100,
          },
        },
      ],
    },
    {
      id: 't2',
      name: '完整設定',
      design: { bg: '#faf6ef', primary: '#6c8db0', font: 'wenkai', width: 'wide' },
      blocks: [
        { id: 'c1', type: 'heading', style: { align: 'left', padding: 4, opacity: 100 } },
        { id: 'c2', type: 'tagline', style: { align: 'left', padding: 4, opacity: 100 } },
        {
          id: 'c3',
          type: 'section',
          sourceId: 's1',
          style: { align: 'left', padding: 18, bgColor: '#fffdf8', radius: 16, opacity: 100 },
        },
        {
          id: 'c4',
          type: 'section',
          sourceId: 's2',
          style: { align: 'left', padding: 18, bgColor: '#fffdf8', radius: 16, opacity: 100 },
        },
        { id: 'c5', type: 'palette', style: { align: 'left', padding: 14, opacity: 100 } },
        { id: 'c6', type: 'album', sourceId: 'a4', style: { align: 'left', padding: 14, opacity: 100 } },
        { id: 'c7', type: 'album', sourceId: 'a5', style: { align: 'left', padding: 14, opacity: 100 } },
        {
          id: 'c8',
          type: 'section',
          sourceId: 's3',
          style: { align: 'left', padding: 18, bgColor: '#fffdf8', radius: 16, opacity: 100 },
        },
      ],
    },
  ],
}
