import { useState, useEffect, useCallback, useRef } from 'react';
import { NewsItem, UserPreferences } from '@/lib/types';
import { demoNews } from '@/lib/demo-data';
import { supabase } from '@/integrations/supabase/client';

const CACHE_KEY = 'morning-feed-cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 min

interface CachedData {
  articles: NewsItem[];
  fetchedAt: string;
}

function loadCache(): CachedData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data: CachedData = JSON.parse(raw);
    if (Date.now() - new Date(data.fetchedAt).getTime() > CACHE_DURATION) return null;
    return data;
  } catch {
    return null;
  }
}

function saveCache(data: CachedData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch { }
}

// Scheduled refresh times
const REFRESH_HOURS = [7, 12, 18, 22];

function getNextRefreshTime(): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const h of REFRESH_HOURS) {
    const t = new Date(today.getTime() + h * 60 * 60 * 1000);
    if (t > now) return t;
  }

  // Next day 07:00
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000);
  return tomorrow;
}

export function useNews(prefs: UserPreferences) {
  const [articles, setArticles] = useState<NewsItem[]>(() => {
    const cached = loadCache();
    return cached ? cached.articles : demoNews;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(() => {
    const cached = loadCache();
    return cached?.fetchedAt ?? null;
  });
  const [isLive, setIsLive] = useState(() => !!loadCache());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-rss');

      if (error) throw error;
      if (!data?.success || !data?.articles?.length) throw new Error('No articles');

      const mapped: NewsItem[] = data.articles.map((a: any) => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        source: a.source,
        category: a.category as NewsItem['category'],
        subtopic: a.subtopic,
        url: a.url,
        publishedAt: a.publishedAt,
        readTime: a.readTime,
        isTopSignal: a.isTopSignal,
      }));

      setArticles(mapped);
      setLastUpdated(data.fetchedAt);
      setIsLive(true);
      saveCache({ articles: mapped, fetchedAt: data.fetchedAt });
    } catch (err) {
      console.error('Failed to fetch live news, using fallback:', err);
      // Keep whatever we have (cached or demo)
      if (!loadCache()) {
        setArticles(demoNews);
        setIsLive(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Schedule next refresh
  const scheduleRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const next = getNextRefreshTime();
    const delay = next.getTime() - Date.now();
    console.log(`Next news refresh at ${next.toLocaleTimeString()} (in ${Math.round(delay / 60000)}min)`);
    timerRef.current = setTimeout(() => {
      fetchNews().then(scheduleRefresh);
    }, delay);
  }, [fetchNews]);

  useEffect(() => {
    // Fetch on mount if cache is stale
    const cached = loadCache();
    if (!cached) {
      fetchNews().then(scheduleRefresh);
    } else {
      scheduleRefresh();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchNews, scheduleRefresh]);

  // Filter by user prefs
  const filteredArticles = articles.filter(a => {
    if (prefs.mutedSources.includes(a.source)) return false;
    return true;
  });

  return {
    articles: filteredArticles,
    isLoading,
    lastUpdated,
    isLive,
    refresh: fetchNews,
  };
}
