import { useState, useCallback } from 'react';

export type Language = 'en' | 'th';

const LANG_KEY = 'alpha-dash-lang';

export function useLanguage() {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(LANG_KEY);
      if (stored === 'th' || stored === 'en') return stored;
    } catch {}
    return 'en';
  });

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
    liveAlphaFeed: '⚡ ฟีดอัลฟ่าสด',
    highSignal: '📡 สัญญาณแรง',
    lowerSignal: '📉 สัญญาณอ่อน',
    emergingNarratives: '🔥 เทรนด์ที่กำลังมา',
    articles: 'บทความ',
    noResults: 'ไม่พบผลลัพธ์',
    tryDifferentSearch: 'ลองค้นหาด้วยคำอื่น',
    adjustFilters: 'ปรับตัวกรองในการตั้งค่า',
    fetchingIntelligence: 'กำลังดึงข้อมูล…',
    searchPlaceholder: 'ค้นหาหัวข้อ แหล่งข่าว…',
    unread: 'ยังไม่อ่าน',
    updated: 'อัปเดต',
    demoData: 'ข้อมูลตัวอย่าง',
    saved: 'บันทึกแล้ว',
    nothingSaved: 'ยังไม่มีรายการที่บันทึก',
    bookmarkFromFeed: 'บันทึกบทความจากฟีดของคุณ',
    new: 'ใหม่',
    highImpact: 'ผลกระทบสูง',
    hotNarrative: 'เทรนด์ร้อน',
    strongest: 'แข็งแกร่งที่สุด',
  },
} as const;

export type Translations = typeof translations['en'];

export function t(lang: Language): Translations {
  return translations[lang];
}
