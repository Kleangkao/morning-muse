import { useState, useCallback } from 'react';
import { UserPreferences } from '@/lib/types';

const STORAGE_KEY = 'alpha-dash-prefs';
const SAVED_KEY = 'alpha-dash-saved';
const READ_KEY = 'alpha-dash-read';

const defaultPrefs: UserPreferences = {
  interests: ['ai', 'crypto', 'investment', 'macro', 'tech-stocks', 'commodities'],
  customKeywords: [],
  sources: ['TechCrunch', 'CoinDesk', 'Bloomberg', 'The Verge', 'Reuters', 'CNBC'],
  mutedSources: [],
  morningTime: '08:00',
  summaryLength: 'medium',
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

export function usePreferences() {
  const [prefs, setPrefsState] = useState<UserPreferences>(() => load(STORAGE_KEY, defaultPrefs));

  const setPrefs = useCallback((updater: Partial<UserPreferences> | ((prev: UserPreferences) => UserPreferences)) => {
    setPrefsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { prefs, setPrefs };
}

export function useSavedArticles() {
  const [saved, setSavedState] = useState<string[]>(() => load(SAVED_KEY, []));

  const toggle = useCallback((id: string) => {
    setSavedState(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { saved, toggle };
}

export function useReadArticles() {
  const [read, setReadState] = useState<string[]>(() => load(READ_KEY, []));

  const markRead = useCallback((id: string) => {
    setReadState(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem(READ_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleRead = useCallback((id: string) => {
    setReadState(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      localStorage.setItem(READ_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { read, markRead, toggleRead };
}
