const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RSSFeed {
  url: string;
  source: string;
  category: string;
  subtopic?: string;
}

interface NormalizedArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  subtopic: string;
  url: string;
  publishedAt: string;
  readTime: number;
  isTopSignal: boolean;
}

const RSS_FEEDS: RSSFeed[] = [
  // AI
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', source: 'TechCrunch', category: 'ai', subtopic: 'Companies' },
  { url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', source: 'The Verge', category: 'ai', subtopic: 'Companies' },
  { url: 'https://arstechnica.com/ai/feed/', source: 'Ars Technica', category: 'ai', subtopic: 'Research' },
  { url: 'https://www.technologyreview.com/feed/', source: 'MIT Tech Review', category: 'ai', subtopic: 'Research' },
  { url: 'https://venturebeat.com/category/ai/feed/', source: 'VentureBeat', category: 'ai', subtopic: 'Startups' },

  // Crypto
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk', category: 'crypto', subtopic: 'L1/L2' },
  { url: 'https://decrypt.co/feed', source: 'Decrypt', category: 'crypto', subtopic: 'DeFi' },
  { url: 'https://cointelegraph.com/rss', source: 'CoinTelegraph', category: 'crypto', subtopic: 'Altcoins' },
  { url: 'https://thedefiant.io/feed', source: 'The Defiant', category: 'crypto', subtopic: 'DeFi' },

  // Investment / Macro
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC Business', category: 'investment', subtopic: 'Macro Economy' },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147', source: 'CNBC', category: 'investment', subtopic: 'Market Movements' },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069', source: 'CNBC Tech', category: 'investment', subtopic: 'Tech Stocks' },
  { url: 'https://www.reuters.com/rssFeed/businessNews', source: 'Reuters', category: 'investment', subtopic: 'Macro Economy' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', source: 'MarketWatch', category: 'investment', subtopic: 'Market Movements' },
];

// Keywords for classifying subtopics more precisely
const SUBTOPIC_KEYWORDS: Record<string, string[]> = {
  'Gold': ['gold', 'xau', 'bullion', 'precious metal'],
  'Silver': ['silver', 'xag'],
  'Tech Stocks': ['nvidia', 'apple', 'microsoft', 'google', 'alphabet', 'amazon', 'meta', 'tesla', 'stock', 'shares', 'earnings', 'nasdaq', 'magnificent'],
  'Macro Economy': ['fed', 'federal reserve', 'inflation', 'gdp', 'interest rate', 'recession', 'stimulus', 'economy', 'employment', 'jobs'],
  'Market Movements': ['s&p', 'dow jones', 'rally', 'crash', 'bull', 'bear', 'market cap', 'ipo'],
  'L1/L2': ['ethereum', 'bitcoin', 'solana', 'layer 2', 'l2', 'rollup', 'base', 'arbitrum', 'optimism', 'btc', 'eth'],
  'DeFi': ['defi', 'uniswap', 'aave', 'lending', 'liquidity', 'tvl', 'yield', 'amm', 'swap'],
  'Memecoins': ['meme', 'doge', 'shib', 'pepe', 'memecoin'],
  'RWA': ['rwa', 'tokeniz', 'real world asset', 'treasury'],
  'DePIN': ['depin', 'helium', 'decentralized infrastructure'],
  'GameFi': ['gamefi', 'gaming', 'nft game', 'play to earn', 'immutable'],
  'Prediction Markets': ['polymarket', 'prediction market', 'betting'],
  'Altcoins': ['altcoin', 'sui', 'aptos', 'avalanche', 'cardano', 'polkadot'],
  'Models': ['gpt', 'claude', 'llama', 'gemini', 'model', 'benchmark', 'llm', 'transformer', 'training'],
  'Startups': ['startup', 'funding', 'raised', 'valuation', 'series a', 'series b', 'seed round', 'venture'],
  'Research': ['research', 'paper', 'arxiv', 'breakthrough', 'deepmind', 'openai research'],
  'Companies': ['microsoft', 'google', 'meta', 'apple', 'amazon', 'openai', 'anthropic', 'copilot', 'agent'],
};

function classifySubtopic(title: string, summary: string, defaultSubtopic: string): string {
  const text = `${title} ${summary}`.toLowerCase();
  let bestMatch = defaultSubtopic;
  let bestScore = 0;

  for (const [subtopic, keywords] of Object.entries(SUBTOPIC_KEYWORDS)) {
    const score = keywords.filter(k => text.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = subtopic;
    }
  }

  return bestMatch;
}

function estimateReadTime(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.max(2, Math.ceil(words / 200));
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function parseItems(xml: string): Array<{ title: string; link: string; description: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];

  // Try RSS <item> tags
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = stripHtml(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
    const link = stripHtml(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || block.match(/<link[^>]*href="([^"]+)"/i)?.[1] || '');
    const description = stripHtml(block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] || block.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i)?.[1] || '');
    const pubDate = stripHtml(block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] || block.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i)?.[1] || '');
    if (title) items.push({ title, link, description, pubDate });
  }

  // Try Atom <entry> tags if no items found
  if (items.length === 0) {
    const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = stripHtml(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
      const link = block.match(/<link[^>]*href="([^"]+)"/i)?.[1] || '';
      const description = stripHtml(block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] || block.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1] || '');
      const pubDate = stripHtml(block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1] || block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1] || '');
      if (title) items.push({ title, link, description, pubDate });
    }
  }

  return items;
}

async function fetchFeed(feed: RSSFeed): Promise<NormalizedArticle[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MorningFeed/1.0' },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`Feed ${feed.source} returned ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const items = parseItems(xml);

    return items.slice(0, 15).map(item => {
      const summary = item.description.slice(0, 300) + (item.description.length > 300 ? '…' : '');
      const subtopic = classifySubtopic(item.title, summary, feed.subtopic || '');

      return {
        id: `rss-${hashString(item.title + feed.source)}`,
        title: item.title,
        summary: summary || 'No summary available.',
        source: feed.source,
        category: feed.category,
        subtopic,
        url: item.link || '#',
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        readTime: estimateReadTime(item.description || item.title),
        isTopSignal: false,
      };
    });
  } catch (error) {
    console.error(`Error fetching ${feed.source}:`, error);
    return [];
  }
}

function deduplicateArticles(articles: NormalizedArticle[]): NormalizedArticle[] {
  const seen = new Map<string, NormalizedArticle>();

  for (const article of articles) {
    // Normalize title for dedup
    const key = article.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 60);

    if (!seen.has(key)) {
      seen.set(key, article);
    }
  }

  return Array.from(seen.values());
}

function markTopSignals(articles: NormalizedArticle[]): NormalizedArticle[] {
  // Sort by recency, pick top 4-5 across categories
  const sorted = [...articles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const categories = new Set<string>();
  let signalCount = 0;

  return sorted.map(article => {
    if (signalCount < 5 && !categories.has(article.category)) {
      categories.add(article.category);
      signalCount++;
      return { ...article, isTopSignal: true };
    }
    return article;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching RSS feeds...');
    const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));

    let allArticles: NormalizedArticle[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value);
      }
    }

    console.log(`Fetched ${allArticles.length} total articles`);

    // Deduplicate
    allArticles = deduplicateArticles(allArticles);
    console.log(`${allArticles.length} after dedup`);

    // Sort by date
    allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    // Mark top signals
    allArticles = markTopSignals(allArticles);

    // Limit per category to ~15
    const byCat: Record<string, NormalizedArticle[]> = {};
    const final: NormalizedArticle[] = [];

    for (const article of allArticles) {
      const cat = article.category;
      if (!byCat[cat]) byCat[cat] = [];
      if (article.isTopSignal || byCat[cat].length < 15) {
        byCat[cat].push(article);
        final.push(article);
      }
    }

    console.log(`Returning ${final.length} articles`);

    return new Response(
      JSON.stringify({
        success: true,
        articles: final,
        fetchedAt: new Date().toISOString(),
        feedCount: RSS_FEEDS.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-rss:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
