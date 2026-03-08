import { useState, useEffect, useCallback, useRef } from 'react';
import { NewsItem, Narrative, UserPreferences } from '@/lib/types';
import { demoNews, demoNarratives } from '@/lib/demo-data';
import { supabase } from '@/integrations/supabase/client';

const ENRICHMENT_CACHE_KEY = 'morning-feed-enrichment-v2';
const ENRICHMENT_CACHE_DURATION = 30 * 60 * 1000; // 30 min
const UI_POLL_INTERVAL = 60 * 1000; // 1 minute
const RSS_FETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface EnrichmentCache {
  thaiTitles: Record<string, string>;
  thaiSummaries: Record<string, string>;
  narratives: Narrative[];
  fetchedAt: string;
}

function loadEnrichmentCache(): EnrichmentCache | null {
  try {
    const raw = localStorage.getItem(ENRICHMENT_CACHE_KEY);
    if (!raw) return null;
    const data: EnrichmentCache = JSON.parse(raw);
    if (Date.now() - new Date(data.fetchedAt).getTime() > ENRICHMENT_CACHE_DURATION) return null;
    return data;
  } catch { return null; }
}

function saveEnrichmentCache(data: EnrichmentCache) {
  try { localStorage.setItem(ENRICHMENT_CACHE_KEY, JSON.stringify(data)); } catch { }
}

// Map DB row to frontend NewsItem
function mapDbRow(row: any): NewsItem {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    source: row.source,
    category: row.category,
    subtopic: row.subtopic,
    url: row.url,
    publishedAt: row.published_at,
    readTime: row.read_time,
    isTopSignal: row.is_top_signal,
    impactLevel: row.impact_level,
    marketDirection: row.market_direction,
    badges: row.badges,
    signalScore: row.signal_score,
    imageUrl: row.image_url || '',
  };
}

export function useNews(prefs: UserPreferences) {
  const [articles, setArticles] = useState<NewsItem[]>(demoNews);
  const [narratives, setNarratives] = useState<Narrative[]>(() => {
    const cached = loadEnrichmentCache();
    return cached ? cached.narratives : demoNarratives;
  });
  const [thaiTitles, setThaiTitles] = useState<Record<string, string>>(() => {
    const cached = loadEnrichmentCache();
    return cached?.thaiTitles ?? {};
  });
  const [thaiSummaries, setThaiSummaries] = useState<Record<string, string>>(() => {
    const cached = loadEnrichmentCache();
    return cached?.thaiSummaries ?? {};
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const uiPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rssFetchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRssFetch = useRef<number>(0);

  // Load articles from DB
  const loadFromDb = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('signal_score', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(100);

      if (error || !data?.length) return false;

      const mapped = data.map(mapDbRow);
      setArticles(mapped);
      setLastUpdated(new Date().toISOString());
      setIsLive(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Trigger RSS fetch edge function
  const triggerRssFetch = useCallback(async () => {
    try {
      const { error } = await supabase.functions.invoke('fetch-rss');
      if (error) throw error;
      lastRssFetch.current = Date.now();
      // After fetching, reload from DB
      await loadFromDb();
    } catch (err) {
      console.error('RSS fetch failed:', err);
    }
  }, [loadFromDb]);

  // Enrich articles with AI
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

      if (error || !data) return;

      if (data.thaiTitles && Object.keys(data.thaiTitles).length > 0) {
        setThaiTitles(data.thaiTitles);
      }
      if (data.thaiSummaries && Object.keys(data.thaiSummaries).length > 0) {
        setThaiSummaries(data.thaiSummaries);
      }

      if (data.narratives?.length > 0) {
        const narrs: Narrative[] = data.narratives.map((n: any) => ({
          id: n.id,
          title: n.title,
          whyItMatters: n.whyItMatters,
          whyItMattersTh: n.whyItMattersTh || n.whyItMatters,
          articleCount: n.articleCount || n.articleIds?.length || 0,
          category: n.category as any,
          momentum: n.momentum as any,
          articleIds: n.articleIds || [],
        }));
        setNarratives(narrs);
        saveEnrichmentCache({
          thaiTitles: data.thaiTitles || {},
          thaiSummaries: data.thaiSummaries || {},
          narratives: narrs,
          fetchedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Enrichment error:', err);
    }
  }, []);

  // Manual refresh: trigger RSS + reload
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await triggerRssFetch();
    } finally {
      setIsLoading(false);
    }
  }, [triggerRssFetch]);

  // Initial load
  useEffect(() => {
    let mounted = true;

    async function init() {
      setIsLoading(true);
      // Try loading from DB first
      const hasData = await loadFromDb();

      if (!hasData) {
        // No data in DB yet — trigger RSS fetch
        await triggerRssFetch();
      } else {
        // Data exists, check if RSS fetch is needed (>5 min old)
        if (Date.now() - lastRssFetch.current > RSS_FETCH_INTERVAL) {
          // Trigger in background
          triggerRssFetch();
        }
      }

      // Run enrichment if no cache
      if (!loadEnrichmentCache() && mounted) {
        const { data } = await supabase
          .from('articles')
          .select('*')
          .order('signal_score', { ascending: false })
          .limit(20);
        if (data?.length) {
          enrichArticles(data.map(mapDbRow));
        }
      }

      if (mounted) setIsLoading(false);
    }

    init();

    // UI poll: reload from DB every 1 minute
    uiPollRef.current = setInterval(() => {
      loadFromDb();
    }, UI_POLL_INTERVAL);

    // RSS fetch: every 5 minutes
    rssFetchRef.current = setInterval(() => {
      triggerRssFetch();
    }, RSS_FETCH_INTERVAL);

    return () => {
      mounted = false;
      if (uiPollRef.current) clearInterval(uiPollRef.current);
      if (rssFetchRef.current) clearInterval(rssFetchRef.current);
    };
  }, [loadFromDb, triggerRssFetch, enrichArticles]);

  // Filter by user prefs
  const filteredArticles = articles.filter(a => {
    if (prefs.mutedSources.includes(a.source)) return false;
    return true;
  });

  return {
    articles: filteredArticles,
    narratives,
    thaiTitles,
    thaiSummaries,
    isLoading,
    lastUpdated,
    isLive,
    refresh,
  };
}
