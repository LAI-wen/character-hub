import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhTW from './locales/zh-TW.json'
import en from './locales/en.json'
import ja from './locales/ja.json'

const saved = (typeof localStorage !== 'undefined' ? localStorage.getItem('lang') : null) ?? 'zh-TW'

i18next
  .use(initReactI18next)
  .init({
    resources: {
      'zh-TW': { translation: zhTW },
      en: { translation: en },
      ja: { translation: ja },
    },
    lng: saved,
    fallbackLng: 'zh-TW',
    interpolation: { escapeValue: false },
  })

i18next.on('languageChanged', (lng) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('lang', lng)
  }
})

export default i18next
