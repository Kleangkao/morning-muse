import { useState, useCallback } from 'react';

export type Language = 'en' | 'th';

const LANG_KEY = 'alpha-dash-lang';

export function useLanguage() {
  const [lang, setLangState] = useState<Language>('en');

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    try { localStorage.setItem(LANG_KEY, l); } catch {}
  }, []);

  return { lang, setLang };
}

// UI translations
const translations = {
  en: {
    allFilter: 'All',
    liveAlphaFeed: '⚡ Live Alpha Feed',
    highSignal: '📡 High Signal',
    lowerSignal: '📉 Lower Signal',
    emergingNarratives: '🔥 Emerging Narratives',
    articles: 'articles',
    noResults: 'No results',
    tryDifferentSearch: 'Try a different search.',
    adjustFilters: 'Adjust your filters in Settings.',
    fetchingIntelligence: 'Fetching intelligence…',
    searchPlaceholder: 'Search headlines, sources, topics…',
    unread: 'unread',
    updated: 'Updated',
    demoData: 'Demo data',
    saved: 'Saved',
    nothingSaved: 'Nothing saved yet',
    bookmarkFromFeed: 'Bookmark articles from your feed.',
    new: 'New',
    highImpact: 'High Impact',
    hotNarrative: 'Hot Narrative',
    strongest: 'Strongest',
  },
  th: {
    allFilter: 'ทั้งหมด',
    liveAlphaFeed: '⚡ ฟีดข่าวล่าสุด',
    highSignal: '📡 สัญญาณตลาด',
    lowerSignal: '📉 ข่าวทั่วไป',
    emergingNarratives: '🔥 เทรนด์ตลาด',
    articles: 'ข่าว',
    noResults: 'ไม่พบผลลัพธ์',
    tryDifferentSearch: 'ลองค้นหาด้วยคำอื่น',
    adjustFilters: 'ปรับตัวกรองในการตั้งค่า',
    fetchingIntelligence: 'กำลังโหลด…',
    searchPlaceholder: 'ค้นหาข่าว แหล่งที่มา…',
    unread: 'ยังไม่อ่าน',
    updated: 'อัปเดต',
    demoData: 'ข้อมูลตัวอย่าง',
    saved: 'บันทึกแล้ว',
    nothingSaved: 'ยังไม่มีรายการที่บันทึก',
    bookmarkFromFeed: 'บุ๊กมาร์กข่าวจากฟีดของคุณ',
    new: 'ใหม่',
    highImpact: 'ข่าวสำคัญ',
    hotNarrative: 'เทรนด์แรง',
    strongest: 'โดดเด่นที่สุด',
  },
} as const;

export type Translations = { [K in keyof typeof translations['en']]: string };

export function t(lang: Language): Translations {
  return translations[lang] as Translations;
}
