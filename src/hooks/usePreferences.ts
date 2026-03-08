import { useState, useCallback } from 'react';
import { UserPreferences, Interest } from '@/lib/types';

const STORAGE_KEY = 'morning-feed-prefs';

const defaultPrefs: UserPreferences = {
  interests: [],
  customKeywords: [],
  sources: ['TechCrunch', 'Hacker News', 'The Verge'],
  morningTime: '08:00',
  onboardingComplete: false,
};

function loadPrefs(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultPrefs;
}

export function usePreferences() {
  const [prefs, setPrefsState] = useState<UserPreferences>(loadPrefs);

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
  const [saved, setSavedState] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('morning-feed-saved') || '[]');
    } catch { return []; }
  });

  const toggle = useCallback((id: string) => {
    setSavedState(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      localStorage.setItem('morning-feed-saved', JSON.stringify(next));
      return next;
    });
  }, []);

  return { saved, toggle };
}
