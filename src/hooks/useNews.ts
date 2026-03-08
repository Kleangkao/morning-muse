import { useState, useEffect, useCallback, useRef } from 'react';
import { NewsItem, Narrative, UserPreferences } from '@/lib/types';
import { demoNews, demoNarratives } from '@/lib/demo-data';
import { supabase } from '@/integrations/supabase/client';

const CACHE_KEY = 'morning-feed-cache';
const ENRICHMENT_CACHE_KEY = 'morning-feed-enrichment';
const CACHE_DURATION = 30 * 60 * 1000; // 30 min

interface CachedData {
  articles: NewsItem[];
  fetchedAt: string;
}

interface EnrichmentCache {
  thaiSummaries: Record<string, string>;
  narratives: Narrative[];
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
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { }
}

function loadEnrichmentCache(): EnrichmentCache | null {
  try {
    const raw = localStorage.getItem(ENRICHMENT_CACHE_KEY);
    if (!raw) return null;
    const data: EnrichmentCache = JSON.parse(raw);
    if (Date.now() - new Date(data.fetchedAt).getTime() > CACHE_DURATION) return null;
    return data;
  } catch {
    return null;
  }
}

function saveEnrichmentCache(data: EnrichmentCache) {
  try { localStorage.setItem(ENRICHMENT_CACHE_KEY, JSON.stringify(data)); } catch { }
}

const REFRESH_HOURS = [7, 12, 18, 22];

function getNextRefreshTime(): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (const h of REFRESH_HOURS) {
    const t = new Date(today.getTime() + h * 60 * 60 * 1000);
    if (t > now) return t;
  }
  return new Date(today.getTime() + 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000);
}

export function useNews(prefs: UserPreferences) {
  const [articles, setArticles] = useState<NewsItem[]>(() => {
    const cached = loadCache();
    return cached ? cached.articles : demoNews;
  });
  const [narratives, setNarratives] = useState<Narrative[]>(() => {
    const cached = loadEnrichmentCache();
    return cached ? cached.narratives : demoNarratives;
  });
  const [thaiSummaries, setThaiSummaries] = useState<Record<string, string>>(() => {
    const cached = loadEnrichmentCache();
    return cached?.thaiSummaries ?? {};
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(() => {
    const cached = loadCache();
    return cached?.fetchedAt ?? null;
  });
  const [isLive, setIsLive] = useState(() => !!loadCache());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enrichArticles = useCallback(async (mapped: NewsItem[]) => {
    try {
      const summaries = mapped.slice(0, 20).map(a => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        category: a.category,
        subtopic: a.subtopic || '',
      }));

      const { data, error } = await supabase.functions.invoke('enrich-articles', {
        body: { articles: summaries },
      });

      if (error || !data) {
        console.error('Enrichment failed:', error);
        return;
      }

      if (data.thaiSummaries && Object.keys(data.thaiSummaries).length > 0) {
        setThaiSummaries(data.thaiSummaries);
      }

      if (data.narratives?.length > 0) {
        const narrs: Narrative[] = data.narratives.map((n: any) => ({
          id: n.id,
          title: n.title,
          whyItMatters: n.whyItMatters,
          articleCount: n.articleCount || n.articleIds?.length || 0,
          category: n.category as any,
          momentum: n.momentum as any,
          articleIds: n.articleIds || [],
        }));
        setNarratives(narrs);
        saveEnrichmentCache({
          thaiSummaries: data.thaiSummaries || {},
          narratives: narrs,
          fetchedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Enrichment error:', err);
    }
  }, []);

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
        impactLevel: a.impactLevel,
        marketDirection: a.marketDirection,
        badges: a.badges,
        signalScore: a.signalScore,
      }));

      setArticles(mapped);
      setLastUpdated(data.fetchedAt);
      setIsLive(true);
      saveCache({ articles: mapped, fetchedAt: data.fetchedAt });

      // Enrich with AI in the background (don't await)
      enrichArticles(mapped);
    } catch (err) {
      console.error('Failed to fetch live news, using fallback:', err);
      if (!loadCache()) {
        setArticles(demoNews);
        setNarratives(demoNarratives);
        setIsLive(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enrichArticles]);

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
    const cached = loadCache();
    if (!cached) {
      fetchNews().then(scheduleRefresh);
    } else {
      // Check if enrichment is cached; if not, run it
      if (!loadEnrichmentCache()) {
        enrichArticles(cached.articles);
      }
      scheduleRefresh();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchNews, scheduleRefresh, enrichArticles]);

  // Filter by user prefs
  const filteredArticles = articles.filter(a => {
    if (prefs.mutedSources.includes(a.source)) return false;
    return true;
  });

  return {
    articles: filteredArticles,
    narratives,
    thaiSummaries,
    isLoading,
    lastUpdated,
    isLive,
    refresh: fetchNews,
  };
}
