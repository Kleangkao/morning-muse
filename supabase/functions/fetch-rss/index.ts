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
  impactLevel: 'low' | 'medium' | 'high';
  marketDirection: 'bullish' | 'bearish' | 'neutral';
  badges: string[];
  signalScore: number;
}

const RSS_FEEDS: RSSFeed[] = [
  // AI
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', source: 'TechCrunch', category: 'ai', subtopic: 'Companies' },
  { url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', source: 'The Verge', category: 'ai', subtopic: 'Companies' },
  { url: 'https://arstechnica.com/ai/feed/', source: 'Ars Technica', category: 'ai', subtopic: 'Research' },
  { url: 'https://www.technologyreview.com/feed/', source: 'MIT Tech Review', category: 'ai', subtopic: 'Research' },
  { url: 'https://venturebeat.com/category/ai/feed/', source: 'VentureBeat', category: 'ai', subtopic: 'Startups' },

  // Crypto
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk', category: 'crypto', subtopic: 'L1' },
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

// ─── HTML Entity Decoding ───

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&#039;': "'", '&apos;': "'", '&nbsp;': ' ',
  '&mdash;': '—', '&ndash;': '–', '&hellip;': '…',
  '&lsquo;': '\u2018', '&rsquo;': '\u2019',
  '&ldquo;': '\u201C', '&rdquo;': '\u201D',
  '&bull;': '•', '&middot;': '·', '&copy;': '©',
  '&reg;': '®', '&trade;': '™', '&euro;': '€',
  '&pound;': '£', '&yen;': '¥', '&cent;': '¢',
};

function decodeHtmlEntities(text: string): string {
  // Named entities
  let result = text;
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    result = result.replaceAll(entity, char);
  }
  // Hex entities: &#x2018; &#x2019; etc.
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    try { return String.fromCodePoint(parseInt(hex, 16)); } catch { return ''; }
  });
  // Decimal entities: &#8217; etc.
  result = result.replace(/&#(\d+);/g, (_, dec) => {
    try { return String.fromCodePoint(parseInt(dec, 10)); } catch { return ''; }
  });
  return result;
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
      .replace(/<[^>]*>/g, '')
      .trim()
  );
}

// ─── Subtopic Classification ───

const SUBTOPIC_KEYWORDS: Record<string, string[]> = {
  'Gold': ['gold', 'xau', 'bullion', 'precious metal'],
  'Silver': ['silver', 'xag'],
  'Tech Stocks': ['nvidia', 'apple', 'microsoft', 'google', 'alphabet', 'amazon', 'meta', 'tesla', 'stock', 'shares', 'earnings', 'nasdaq', 'magnificent', 'aapl', 'msft', 'nvda', 'googl', 'amzn', 'tsla'],
  'Macro Economy': ['fed', 'federal reserve', 'inflation', 'gdp', 'interest rate', 'recession', 'stimulus', 'economy', 'employment', 'jobs', 'cpi', 'pce', 'treasury', 'yield curve', 'unemployment', 'payroll'],
  'Central Bank': ['central bank', 'ecb', 'boj', 'bank of england', 'pboc', 'rate decision', 'rate cut', 'rate hike', 'monetary policy', 'quantitative', 'fomc'],
  'Market Movements': ['s&p', 'dow jones', 'rally', 'crash', 'bull', 'bear', 'market cap', 'ipo', 'all-time high', 'correction', 'sell-off', 'volatility', 'vix'],
  'Earnings': ['earnings', 'revenue', 'profit', 'quarterly results', 'guidance', 'beat expectations', 'missed expectations', 'eps', 'q1', 'q2', 'q3', 'q4'],
  'L1': ['bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'layer 1', 'l1', 'blockchain', 'proof of stake', 'proof of work', 'mainnet'],
  'L2': ['layer 2', 'l2', 'rollup', 'base', 'arbitrum', 'optimism', 'zksync', 'starknet', 'polygon zkevm', 'op stack', 'blob'],
  'DeFi': ['defi', 'uniswap', 'aave', 'lending', 'liquidity', 'tvl', 'yield', 'amm', 'swap', 'lido', 'staking', 'restaking', 'eigenlayer', 'compound', 'makerdao'],
  'Memecoins': ['meme', 'doge', 'shib', 'pepe', 'memecoin', 'bonk', 'wif', 'floki', 'pump.fun'],
  'RWA': ['rwa', 'tokeniz', 'real world asset', 'treasury token', 'ondo', 'securitize', 'buidl'],
  'DePIN': ['depin', 'helium', 'decentralized infrastructure', 'hivemapper', 'render', 'decentralized physical'],
  'GameFi': ['gamefi', 'gaming', 'nft game', 'play to earn', 'immutable', 'axie', 'illuvium', 'web3 gaming'],
  'Prediction Markets': ['polymarket', 'prediction market', 'betting', 'kalshi', 'augur'],
  'Altcoins': ['altcoin', 'sui', 'aptos', 'avalanche', 'cardano', 'polkadot', 'cosmos', 'near', 'sei', 'injective', 'tia', 'celestia'],
  'Models': ['gpt', 'claude', 'llama', 'gemini', 'model', 'benchmark', 'llm', 'transformer', 'training', 'fine-tun', 'reasoning', 'multimodal', 'context window'],
  'Startups': ['startup', 'funding', 'raised', 'valuation', 'series a', 'series b', 'seed round', 'venture', 'accelerator', 'yc', 'y combinator'],
  'Research': ['research', 'paper', 'arxiv', 'breakthrough', 'deepmind', 'openai research', 'scientific', 'algorithm'],
  'Companies': ['microsoft', 'google', 'meta', 'apple', 'amazon', 'openai', 'anthropic', 'copilot', 'agent', 'enterprise ai'],
};

// Category re-classification keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'ai': ['artificial intelligence', 'ai', 'machine learning', 'deep learning', 'neural network', 'llm', 'gpt', 'claude', 'gemini', 'openai', 'anthropic', 'deepmind', 'transformer', 'chatbot', 'generative ai'],
  'crypto': ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain', 'defi', 'nft', 'web3', 'token', 'solana', 'altcoin', 'memecoin', 'staking', 'mining'],
  'macro': ['federal reserve', 'fed', 'inflation', 'gdp', 'interest rate', 'recession', 'central bank', 'ecb', 'monetary policy', 'fiscal', 'geopolit', 'tariff', 'sanctions'],
  'tech-stocks': ['nvidia', 'nvda', 'aapl', 'msft', 'googl', 'amzn', 'tsla', 'magnificent seven', 'tech stock', 'nasdaq', 'semiconductor', 'chip'],
  'commodities': ['gold', 'silver', 'oil', 'crude', 'commodity', 'precious metal', 'copper', 'natural gas', 'xau', 'xag', 'wti', 'brent'],
};

function classifyCategory(title: string, summary: string, defaultCategory: string): string {
  const text = `${title} ${summary}`.toLowerCase();
  let bestCat = defaultCategory;
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(k => text.includes(k)).length;
    if (score > bestScore) { bestScore = score; bestCat = cat; }
  }
  return bestScore >= 2 ? bestCat : defaultCategory;
}

function classifySubtopic(title: string, summary: string, defaultSubtopic: string): string {
  const text = `${title} ${summary}`.toLowerCase();
  let bestMatch = defaultSubtopic;
  let bestScore = 0;
  for (const [subtopic, keywords] of Object.entries(SUBTOPIC_KEYWORDS)) {
    const score = keywords.filter(k => text.includes(k)).length;
    if (score > bestScore) { bestScore = score; bestMatch = subtopic; }
  }
  return bestMatch;
}

// ─── Impact Scoring ───

const HIGH_IMPACT_KEYWORDS = [
  'federal reserve', 'fed rate', 'rate cut', 'rate hike', 'fomc', 'central bank',
  'etf approved', 'etf inflow', 'etf launch', 'bitcoin etf', 'ethereum etf',
  'regulation', 'sec', 'ban', 'lawsuit', 'sanction', 'executive order',
  'raises', 'funding round', 'ipo', 'acquisition', 'merger',
  'all-time high', 'record', 'crash', 'collapse', 'hack', 'exploit',
  'gpt-5', 'gpt-6', 'claude', 'gemini', 'llama', 'model launch',
  'earnings beat', 'earnings miss', 'revenue record',
  'war', 'invasion', 'crisis', 'emergency', 'breaking',
  'trillion', 'billion',
];

const MEDIUM_IMPACT_KEYWORDS = [
  'partnership', 'integration', 'launch', 'update', 'upgrade',
  'growth', 'surge', 'rally', 'decline', 'drop',
  'report', 'analysis', 'forecast', 'outlook',
  'adoption', 'institutional', 'enterprise',
  'testnet', 'mainnet', 'airdrop', 'tokenomics',
];

function scoreImpact(title: string, summary: string): { level: 'low' | 'medium' | 'high'; score: number } {
  const text = `${title} ${summary}`.toLowerCase();
  let highHits = HIGH_IMPACT_KEYWORDS.filter(k => text.includes(k)).length;
  let medHits = MEDIUM_IMPACT_KEYWORDS.filter(k => text.includes(k)).length;

  if (highHits >= 3) return { level: 'high', score: Math.min(98, 80 + highHits * 4) };
  if (highHits >= 1) return { level: 'high', score: Math.min(92, 70 + highHits * 8 + medHits * 2) };
  if (medHits >= 3) return { level: 'medium', score: Math.min(75, 55 + medHits * 5) };
  if (medHits >= 1) return { level: 'medium', score: Math.min(65, 45 + medHits * 5) };
  return { level: 'low', score: 30 + Math.floor(Math.random() * 15) };
}

function inferDirection(title: string, summary: string): 'bullish' | 'bearish' | 'neutral' {
  const text = `${title} ${summary}`.toLowerCase();
  const bullish = ['surge', 'rally', 'record', 'all-time high', 'growth', 'beat', 'bullish', 'inflow', 'adoption', 'upgrade', 'launch', 'approved', 'rises', 'jumps', 'soars', 'gains'].filter(k => text.includes(k)).length;
  const bearish = ['crash', 'collapse', 'hack', 'exploit', 'ban', 'decline', 'drop', 'bearish', 'sell-off', 'outflow', 'warning', 'risk', 'falls', 'plunges', 'slumps', 'losses'].filter(k => text.includes(k)).length;
  if (bullish > bearish + 1) return 'bullish';
  if (bearish > bullish + 1) return 'bearish';
  if (bullish > bearish) return 'bullish';
  if (bearish > bullish) return 'bearish';
  return 'neutral';
}

function assignBadges(article: { title: string; summary: string; category: string; subtopic: string; impactLevel: string; signalScore: number; publishedAt: string }): string[] {
  const badges: string[] = [];
  const text = `${article.title} ${article.summary}`.toLowerCase();
  const ageHours = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);

  if (ageHours < 2 && article.signalScore >= 80) badges.push('Breaking');
  if (article.impactLevel === 'high') badges.push('High Impact');
  if (article.signalScore >= 70 && article.signalScore < 85 && !badges.includes('Breaking')) badges.push('Rising');
  if (['macro', 'investment'].includes(article.category) && ['Central Bank', 'Macro Economy'].includes(article.subtopic)) badges.push('Macro');
  if (article.subtopic === 'Earnings' || text.includes('earnings') || text.includes('revenue')) badges.push('Earnings');
  if (['L1', 'L2', 'DeFi', 'DePIN'].includes(article.subtopic) || text.includes('on-chain') || text.includes('tvl')) badges.push('On-chain');

  return [...new Set(badges)].slice(0, 3);
}

// ─── RSS Parsing ───

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

function parseItems(xml: string): Array<{ title: string; link: string; description: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];

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
      const category = classifyCategory(item.title, summary, feed.category);
      const subtopic = classifySubtopic(item.title, summary, feed.subtopic || '');
      const { level: impactLevel, score: signalScore } = scoreImpact(item.title, summary);
      const marketDirection = inferDirection(item.title, summary);
      const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();

      const article: NormalizedArticle = {
        id: `rss-${hashString(item.title + feed.source)}`,
        title: item.title,
        summary: summary || 'No summary available.',
        source: feed.source,
        category,
        subtopic,
        url: item.link || '#',
        publishedAt,
        readTime: estimateReadTime(item.description || item.title),
        isTopSignal: false,
        impactLevel,
        marketDirection,
        badges: [],
        signalScore,
      };

      article.badges = assignBadges(article);
      return article;
    });
  } catch (error) {
    console.error(`Error fetching ${feed.source}:`, error);
    return [];
  }
}

// ─── Dedup & Ranking ───

function deduplicateArticles(articles: NormalizedArticle[]): NormalizedArticle[] {
  const seen = new Map<string, NormalizedArticle>();
  for (const article of articles) {
    const key = article.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
    const existing = seen.get(key);
    if (!existing || article.signalScore > existing.signalScore) {
      seen.set(key, article);
    }
  }
  return Array.from(seen.values());
}

function markTopSignals(articles: NormalizedArticle[]): NormalizedArticle[] {
  // Top signals = highest signal score, diversity across categories
  const sorted = [...articles].sort((a, b) => b.signalScore - a.signalScore);
  const categories = new Map<string, number>();
  let signalCount = 0;

  return sorted.map(article => {
    const catCount = categories.get(article.category) || 0;
    if (signalCount < 6 && catCount < 2 && article.signalScore >= 60) {
      categories.set(article.category, catCount + 1);
      signalCount++;
      return { ...article, isTopSignal: true };
    }
    return article;
  });
}

// ─── Main Handler ───

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

    allArticles = deduplicateArticles(allArticles);
    console.log(`${allArticles.length} after dedup`);

    // Sort by signal score then recency
    allArticles.sort((a, b) => {
      const scoreDiff = b.signalScore - a.signalScore;
      if (Math.abs(scoreDiff) > 10) return scoreDiff;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

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
