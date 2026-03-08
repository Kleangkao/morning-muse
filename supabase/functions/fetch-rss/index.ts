import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RSSFeed {
  url: string;
  source: string;
  category: string;
  subtopic?: string;
  tier: 1 | 2 | 3;
}

interface NormalizedArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  subtopic: string;
  url: string;
  published_at: string;
  read_time: number;
  is_top_signal: boolean;
  impact_level: 'low' | 'medium' | 'high';
  market_direction: 'bullish' | 'bearish' | 'neutral';
  badges: string[];
  signal_score: number;
  title_hash: string;
  related_sources: string[];
  related_count: number;
  image_url: string;
}

// ─── Tier-based Source Priority ───
// Tier 1: highest priority, Tier 2: medium, Tier 3: lowest
const TIER_SCORE_BONUS: Record<number, number> = { 1: 15, 2: 5, 3: 0 };

const RSS_FEEDS: RSSFeed[] = [
  // ═══ Tier 1: Premium Sources ═══
  // Crypto
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk', category: 'crypto', subtopic: 'L1', tier: 1 },
  { url: 'https://cointelegraph.com/rss', source: 'CoinTelegraph', category: 'crypto', subtopic: 'Altcoins', tier: 1 },
  { url: 'https://www.theblock.co/rss.xml', source: 'The Block', category: 'crypto', subtopic: 'DeFi', tier: 1 },
  { url: 'https://decrypt.co/feed', source: 'Decrypt', category: 'crypto', subtopic: 'L1', tier: 1 },
  { url: 'https://bitcoinmagazine.com/.rss/full/', source: 'Bitcoin Magazine', category: 'crypto', subtopic: 'L1', tier: 1 },

  // Macro / Investment / Markets — EXPANDED
  { url: 'https://www.reuters.com/rssFeed/businessNews', source: 'Reuters', category: 'macro', subtopic: 'Macro Economy', tier: 1 },
  { url: 'https://www.reuters.com/rssFeed/GCA-Commodities', source: 'Reuters Commodities', category: 'commodities', subtopic: 'Gold', tier: 1 },
  { url: 'https://www.reuters.com/rssFeed/GCA-CentralBanksTop', source: 'Reuters Central Banks', category: 'macro', subtopic: 'Central Bank', tier: 1 },
  { url: 'https://www.reuters.com/rssFeed/GCA-EconomicNews', source: 'Reuters Economy', category: 'macro', subtopic: 'Macro Economy', tier: 1 },
  { url: 'https://www.reuters.com/rssFeed/GCA-BondsNews', source: 'Reuters Bonds', category: 'macro', subtopic: 'Market Movements', tier: 1 },
  { url: 'https://www.reuters.com/rssFeed/GCA-ForeignExchange', source: 'Reuters FX', category: 'macro', subtopic: 'Macro Economy', tier: 1 },
  { url: 'https://www.reuters.com/rssFeed/GCA-EnergyTop', source: 'Reuters Energy', category: 'commodities', subtopic: 'Oil', tier: 1 },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC Business', category: 'macro', subtopic: 'Macro Economy', tier: 1 },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147', source: 'CNBC', category: 'investment', subtopic: 'Market Movements', tier: 1 },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069', source: 'CNBC Tech', category: 'tech-stocks', subtopic: 'Tech Stocks', tier: 1 },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258', source: 'CNBC Economy', category: 'macro', subtopic: 'Central Bank', tier: 1 },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', source: 'CNBC Finance', category: 'investment', subtopic: 'Earnings', tier: 1 },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000115', source: 'CNBC World', category: 'macro', subtopic: 'Macro Economy', tier: 1 },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=19854910', source: 'CNBC Bonds', category: 'macro', subtopic: 'Market Movements', tier: 1 },

  // ═══ Tier 2: Quality Sources ═══
  // AI
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', source: 'TechCrunch AI', category: 'ai', subtopic: 'Companies', tier: 2 },
  { url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', source: 'The Verge AI', category: 'ai', subtopic: 'Companies', tier: 2 },
  { url: 'https://arstechnica.com/ai/feed/', source: 'Ars Technica AI', category: 'ai', subtopic: 'Research', tier: 2 },
  { url: 'https://www.technologyreview.com/feed/', source: 'MIT Tech Review', category: 'ai', subtopic: 'Research', tier: 2 },
  { url: 'https://venturebeat.com/category/ai/feed/', source: 'VentureBeat', category: 'ai', subtopic: 'Startups', tier: 2 },

  // Tech — EXPANDED
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch', category: 'tech-stocks', subtopic: 'Tech Stocks', tier: 1 },
  { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge', category: 'tech-stocks', subtopic: 'Tech Stocks', tier: 2 },
  { url: 'https://arstechnica.com/gadgets/feed/', source: 'Ars Technica', category: 'tech-stocks', subtopic: 'Tech Stocks', tier: 2 },
  { url: 'https://www.wired.com/feed/rss', source: 'Wired', category: 'tech-stocks', subtopic: 'Tech Stocks', tier: 2 },
  { url: 'https://feeds.feedburner.com/TechCrunch/startups', source: 'TechCrunch Startups', category: 'tech-stocks', subtopic: 'Startups', tier: 2 },
  { url: 'https://www.tomshardware.com/feeds/all', source: "Tom's Hardware", category: 'tech-stocks', subtopic: 'Tech Stocks', tier: 2 },
  { url: 'https://siliconangle.com/feed/', source: 'SiliconANGLE', category: 'tech-stocks', subtopic: 'Tech Stocks', tier: 2 },
  { url: 'https://9to5mac.com/feed/', source: '9to5Mac', category: 'tech-stocks', subtopic: 'Tech Stocks', tier: 2 },

  // Macro — EXPANDED
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', source: 'MarketWatch', category: 'investment', subtopic: 'Market Movements', tier: 2 },
  { url: 'https://feeds.marketwatch.com/marketwatch/marketpulse/', source: 'MarketWatch Pulse', category: 'macro', subtopic: 'Macro Economy', tier: 2 },
  { url: 'https://feeds.marketwatch.com/marketwatch/economyandpolitics/', source: 'MarketWatch Economy', category: 'macro', subtopic: 'Macro Economy', tier: 2 },
  { url: 'https://www.investing.com/rss/news.rss', source: 'Investing.com', category: 'investment', subtopic: 'Market Movements', tier: 2 },
  { url: 'https://www.investing.com/rss/news_14.rss', source: 'Investing.com Commodities', category: 'commodities', subtopic: 'Gold', tier: 2 },
  { url: 'https://www.investing.com/rss/news_301.rss', source: 'Investing.com Economy', category: 'macro', subtopic: 'Macro Economy', tier: 2 },
  { url: 'https://tradingeconomics.com/rss/news.aspx', source: 'TradingEconomics', category: 'macro', subtopic: 'Macro Economy', tier: 2 },

  // Commodities
  { url: 'https://www.kitco.com/rss/gold.xml', source: 'Kitco Gold', category: 'commodities', subtopic: 'Gold', tier: 2 },
  { url: 'https://oilprice.com/rss/main', source: 'OilPrice', category: 'commodities', subtopic: 'Oil', tier: 2 },

  // ═══ Tier 3: Secondary Sources ═══
  { url: 'https://thedefiant.io/feed', source: 'The Defiant', category: 'crypto', subtopic: 'DeFi', tier: 3 },
  { url: 'https://feeds.feedburner.com/zabornet', source: 'ZeroHedge', category: 'macro', subtopic: 'Macro Economy', tier: 3 },
  { url: 'https://www.mining.com/feed/', source: 'Mining.com', category: 'commodities', subtopic: 'Metals', tier: 3 },

  // ═══ X / Twitter Signal Feeds — Curated Nitter Sources ═══
  // AI
  { url: 'https://nitter.net/OpenAI/rss', source: 'X @OpenAI', category: 'ai', subtopic: 'Companies', tier: 1 },
  { url: 'https://nitter.net/OpenAIDevs/rss', source: 'X @OpenAIDevs', category: 'ai', subtopic: 'Models', tier: 2 },
  { url: 'https://nitter.net/sama/rss', source: 'X @sama', category: 'ai', subtopic: 'Companies', tier: 1 },
  { url: 'https://nitter.net/AnthropicAI/rss', source: 'X @AnthropicAI', category: 'ai', subtopic: 'Models', tier: 1 },
  { url: 'https://nitter.net/GoogleDeepMind/rss', source: 'X @GoogleDeepMind', category: 'ai', subtopic: 'Research', tier: 1 },
  { url: 'https://nitter.net/ilyasut/rss', source: 'X @ilyasut', category: 'ai', subtopic: 'Research', tier: 2 },
  { url: 'https://nitter.net/karpathy/rss', source: 'X @karpathy', category: 'ai', subtopic: 'Research', tier: 1 },
  { url: 'https://nitter.net/TheAITimeline/rss', source: 'X @TheAITimeline', category: 'ai', subtopic: 'Companies', tier: 2 },
  { url: 'https://nitter.net/perplexity_ai/rss', source: 'X @perplexity_ai', category: 'ai', subtopic: 'Startups', tier: 2 },
  { url: 'https://nitter.net/stabilityai/rss', source: 'X @stabilityai', category: 'ai', subtopic: 'Models', tier: 2 },
  // Crypto
  { url: 'https://nitter.net/CoinDesk/rss', source: 'X @CoinDesk', category: 'crypto', subtopic: 'L1', tier: 1 },
  { url: 'https://nitter.net/Cointelegraph/rss', source: 'X @Cointelegraph', category: 'crypto', subtopic: 'Altcoins', tier: 1 },
  { url: 'https://nitter.net/TheBlock__/rss', source: 'X @TheBlock__', category: 'crypto', subtopic: 'DeFi', tier: 1 },
  { url: 'https://nitter.net/DecryptMedia/rss', source: 'X @DecryptMedia', category: 'crypto', subtopic: 'L1', tier: 2 },
  { url: 'https://nitter.net/BitcoinMagazine/rss', source: 'X @BitcoinMagazine', category: 'crypto', subtopic: 'L1', tier: 1 },
  { url: 'https://nitter.net/WuBlockchain/rss', source: 'X @WuBlockchain', category: 'crypto', subtopic: 'Altcoins', tier: 2 },
  { url: 'https://nitter.net/DocumentingBTC/rss', source: 'X @DocumentingBTC', category: 'crypto', subtopic: 'L1', tier: 2 },
  { url: 'https://nitter.net/glabornet/rss', source: 'X @Glassnode', category: 'crypto', subtopic: 'L1', tier: 2 },
  { url: 'https://nitter.net/lookonchain/rss', source: 'X @lookonchain', category: 'crypto', subtopic: 'DeFi', tier: 1 },
  { url: 'https://nitter.net/ArkhamIntel/rss', source: 'X @ArkhamIntel', category: 'crypto', subtopic: 'L1', tier: 1 },
  // Macro
  { url: 'https://nitter.net/KobeissiLetter/rss', source: 'X @KobeissiLetter', category: 'macro', subtopic: 'Macro Economy', tier: 1 },
  { url: 'https://nitter.net/unusual_whales/rss', source: 'X @unusual_whales', category: 'macro', subtopic: 'Market Movements', tier: 1 },
  { url: 'https://nitter.net/WatcherGuru/rss', source: 'X @WatcherGuru', category: 'macro', subtopic: 'Market Movements', tier: 1 },
  { url: 'https://nitter.net/WalterBloomberg/rss', source: 'X @WalterBloomberg', category: 'macro', subtopic: 'Market Movements', tier: 1 },
  { url: 'https://nitter.net/MacroAlf/rss', source: 'X @MacroAlf', category: 'macro', subtopic: 'Macro Economy', tier: 2 },
  { url: 'https://nitter.net/LynAldenContact/rss', source: 'X @LynAldenContact', category: 'macro', subtopic: 'Macro Economy', tier: 2 },
  { url: 'https://nitter.net/RaoulGMI/rss', source: 'X @RaoulGMI', category: 'macro', subtopic: 'Macro Economy', tier: 2 },
  { url: 'https://nitter.net/LukeGromen/rss', source: 'X @LukeGromen', category: 'macro', subtopic: 'Macro Economy', tier: 2 },
  { url: 'https://nitter.net/biancoresearch/rss', source: 'X @biancoresearch', category: 'macro', subtopic: 'Macro Economy', tier: 2 },
  { url: 'https://nitter.net/TheMarketEar/rss', source: 'X @TheMarketEar', category: 'macro', subtopic: 'Market Movements', tier: 2 },
  // Tech & Markets
  { url: 'https://nitter.net/TechCrunch/rss', source: 'X @TechCrunch', category: 'tech-stocks', subtopic: 'Tech Stocks', tier: 1 },
  { url: 'https://nitter.net/verge/rss', source: 'X @verge', category: 'tech-stocks', subtopic: 'Tech Stocks', tier: 2 },
  { url: 'https://nitter.net/ArsTechnica/rss', source: 'X @ArsTechnica', category: 'tech-stocks', subtopic: 'Tech Stocks', tier: 2 },
  { url: 'https://nitter.net/CNBC/rss', source: 'X @CNBC', category: 'investment', subtopic: 'Market Movements', tier: 1 },
  { url: 'https://nitter.net/ReutersBiz/rss', source: 'X @ReutersBiz', category: 'investment', subtopic: 'Market Movements', tier: 1 },
  { url: 'https://nitter.net/BloombergTech/rss', source: 'X @BloombergTech', category: 'tech-stocks', subtopic: 'Tech Stocks', tier: 1 },
  { url: 'https://nitter.net/StockMKTNewz/rss', source: 'X @StockMKTNewz', category: 'investment', subtopic: 'Market Movements', tier: 2 },
  { url: 'https://nitter.net/DeItaone/rss', source: 'X @DeItaone', category: 'investment', subtopic: 'Market Movements', tier: 1 },
  { url: 'https://nitter.net/business/rss', source: 'X @business', category: 'investment', subtopic: 'Market Movements', tier: 1 },
  { url: 'https://nitter.net/WSJmarkets/rss', source: 'X @WSJmarkets', category: 'investment', subtopic: 'Market Movements', tier: 1 },
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
  let result = text;
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    result = result.replaceAll(entity, char);
  }
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    try { return String.fromCodePoint(parseInt(hex, 16)); } catch { return ''; }
  });
  result = result.replace(/&#(\d+);/g, (_, dec) => {
    try { return String.fromCodePoint(parseInt(dec, 10)); } catch { return ''; }
  });
  return result;
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').replace(/<[^>]*>/g, '').trim()
  );
}

// ─── Image Extraction ───

function extractImage(block: string): string {
  // media:content
  const mediaContent = block.match(/<media:content[^>]+url="([^"]+)"/i);
  if (mediaContent?.[1]) return mediaContent[1];

  // media:thumbnail
  const mediaThumbnail = block.match(/<media:thumbnail[^>]+url="([^"]+)"/i);
  if (mediaThumbnail?.[1]) return mediaThumbnail[1];

  // enclosure (image type)
  const enclosure = block.match(/<enclosure[^>]+type="image\/[^"]*"[^>]+url="([^"]+)"/i)
    || block.match(/<enclosure[^>]+url="([^"]+)"[^>]+type="image\/[^"]*"/i);
  if (enclosure?.[1]) return enclosure[1];

  // img tag inside content
  const imgTag = block.match(/<img[^>]+src="([^"]+)"/i);
  if (imgTag?.[1] && !imgTag[1].includes('tracking') && !imgTag[1].includes('pixel')) return imgTag[1];

  return '';
}

// ─── Classification ───

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

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'ai': ['artificial intelligence', 'ai', 'machine learning', 'deep learning', 'neural network', 'llm', 'gpt', 'claude', 'gemini', 'openai', 'anthropic', 'deepmind', 'transformer', 'chatbot', 'generative ai'],
  'crypto': ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain', 'defi', 'nft', 'web3', 'token', 'solana', 'altcoin', 'memecoin', 'staking', 'mining'],
  'macro': ['federal reserve', 'fed', 'inflation', 'gdp', 'interest rate', 'recession', 'central bank', 'ecb', 'monetary policy', 'fiscal', 'geopolit', 'tariff', 'sanctions', 'tax', 'taxation', 'duty', 'duties', 'import tax', 'export tax', 'trade war', 'antitrust', 'regulation', 'regulatory', 'lawsuit', 'legal', 'court ruling', 'fine', 'penalty', 'compliance'],
  'tech-stocks': ['nvidia', 'nvda', 'aapl', 'msft', 'googl', 'amzn', 'tsla', 'magnificent seven', 'tech stock', 'nasdaq', 'semiconductor', 'chip'],
  'commodities': ['gold', 'silver', 'oil', 'crude', 'commodity', 'precious metal', 'copper', 'natural gas', 'xau', 'xag', 'wti', 'brent'],
  'investment': ['market', 'stock', 'bond', 'fund', 'etf', 'portfolio', 'investor', 'wall street', 'dow', 's&p'],
};

// ─── Content-based Re-categorization ───
// Override category when content clearly belongs elsewhere regardless of source feed
const RECATEGORIZE_RULES: Array<{ patterns: RegExp[]; targetCategory: string; targetSubtopic: string }> = [
  // Tax / tariff / trade policy → macro
  { patterns: [/\btax(?:es|ation|ed)?\b/i, /\btariff/i, /\bduty|duties\b/i, /\btrade\s*war/i, /\bimport\s*(?:tax|duty|ban)/i, /\bexport\s*(?:tax|duty|ban)/i], targetCategory: 'macro', targetSubtopic: 'Macro Economy' },
  // Regulation / legal / antitrust → macro
  { patterns: [/\bantitrust/i, /\bregulat(?:ion|ory|or)\b/i, /\blawsuit/i, /\bcourt\s*rul/i, /\bfine[sd]?\s+\$[\d]/i, /\bpenalt/i, /\bsanction/i], targetCategory: 'macro', targetSubtopic: 'Macro Economy' },
  // Gaming / entertainment (not tech) — when combined with tax/regulation/legal
  { patterns: [/\bnintendo\b/i, /\bsony\b.*\bgam/i, /\bplaystation\b/i, /\bxbox\b/i, /\bgaming\b.*\b(?:tax|tariff|regulat|lawsuit|ban|fine)/i], targetCategory: 'macro', targetSubtopic: 'Macro Economy' },
];

function recategorize(title: string, summary: string, category: string, subtopic: string): { category: string; subtopic: string } {
  const text = `${title} ${summary}`.toLowerCase();

  for (const rule of RECATEGORIZE_RULES) {
    const matchCount = rule.patterns.filter(p => p.test(text)).length;
    if (matchCount >= 1) {
      // Only recategorize if it's currently in a "wrong" category
      // e.g. tax news from tech-stocks source should go to macro
      if (category === 'tech-stocks' || category === 'ai') {
        return { category: rule.targetCategory, subtopic: rule.targetSubtopic };
      }
    }
  }
  return { category, subtopic };
}

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

function scoreImpact(title: string, summary: string, tierBonus: number): { level: 'low' | 'medium' | 'high'; score: number } {
  const text = `${title} ${summary}`.toLowerCase();
  const highHits = HIGH_IMPACT_KEYWORDS.filter(k => text.includes(k)).length;
  const medHits = MEDIUM_IMPACT_KEYWORDS.filter(k => text.includes(k)).length;
  let score: number;
  let level: 'low' | 'medium' | 'high';
  if (highHits >= 3) { level = 'high'; score = Math.min(98, 80 + highHits * 4); }
  else if (highHits >= 1) { level = 'high'; score = Math.min(92, 70 + highHits * 8 + medHits * 2); }
  else if (medHits >= 3) { level = 'medium'; score = Math.min(75, 55 + medHits * 5); }
  else if (medHits >= 1) { level = 'medium'; score = Math.min(65, 45 + medHits * 5); }
  else { level = 'low'; score = 30 + Math.floor(Math.random() * 15); }
  // Apply tier bonus
  score = Math.min(99, score + tierBonus);
  return { level, score };
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

function assignBadges(article: { title: string; summary: string; category: string; subtopic: string; impact_level: string; signal_score: number; published_at: string }): string[] {
  const badges: string[] = [];
  const text = `${article.title} ${article.summary}`.toLowerCase();
  const ageHours = (Date.now() - new Date(article.published_at).getTime()) / (1000 * 60 * 60);
  if (ageHours < 2 && article.signal_score >= 80) badges.push('Breaking');
  if (article.impact_level === 'high') badges.push('High Impact');
  if (article.signal_score >= 70 && article.signal_score < 85 && !badges.includes('Breaking')) badges.push('Rising');
  if (['macro', 'investment'].includes(article.category) && ['Central Bank', 'Macro Economy'].includes(article.subtopic)) badges.push('Macro');
  if (article.subtopic === 'Earnings' || text.includes('earnings') || text.includes('revenue')) badges.push('Earnings');
  if (['L1', 'L2', 'DeFi', 'DePIN'].includes(article.subtopic) || text.includes('on-chain') || text.includes('tvl')) badges.push('On-chain');
  return [...new Set(badges)].slice(0, 3);
}

// ─── RSS Parsing ───

function estimateReadTime(text: string): number {
  return Math.max(2, Math.ceil(text.split(/\s+/).length / 200));
}

function makeTitleHash(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function parseItems(xml: string): Array<{ title: string; link: string; description: string; pubDate: string; imageUrl: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string; imageUrl: string }> = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = stripHtml(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
    const link = stripHtml(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || block.match(/<link[^>]*href="([^"]+)"/i)?.[1] || '');
    const description = stripHtml(block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] || block.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i)?.[1] || '');
    const pubDate = stripHtml(block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] || block.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i)?.[1] || '');
    const imageUrl = extractImage(block);
    if (title) items.push({ title, link, description, pubDate, imageUrl });
  }
  if (items.length === 0) {
    const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = stripHtml(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
      const link = block.match(/<link[^>]*href="([^"]+)"/i)?.[1] || '';
      const description = stripHtml(block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] || block.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1] || '');
      const pubDate = stripHtml(block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1] || block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1] || '');
      const imageUrl = extractImage(block);
      if (title) items.push({ title, link, description, pubDate, imageUrl });
    }
  }
  return items;
}

// Nitter fallback instances for X feeds
const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
  'https://nitter.1d4.us',
];

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MorningFeed/1.0)' },
    });
    clearTimeout(timeout);
    return response;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

async function fetchFeed(feed: RSSFeed): Promise<NormalizedArticle[]> {
  try {
    const isXFeed = feed.source.startsWith('X @');
    let xml = '';

    if (isXFeed) {
      // Try multiple nitter instances for X feeds
      const username = feed.url.replace(/^https:\/\/[^/]+\//, '').replace(/\/rss$/, '');
      let fetched = false;
      for (const instance of NITTER_INSTANCES) {
        try {
          const url = `${instance}/${username}/rss`;
          const response = await fetchWithTimeout(url, 6000);
          if (response.ok) {
            xml = await response.text();
            if (xml.includes('<item') || xml.includes('<entry')) {
              fetched = true;
              break;
            }
          }
        } catch {
          // Try next instance
        }
      }
      if (!fetched) {
        console.warn(`All nitter instances failed for ${feed.source}`);
        return [];
      }
    } else {
      const response = await fetchWithTimeout(feed.url, 8000);
      if (!response.ok) return [];
      xml = await response.text();
    }

    const items = parseItems(xml);
    if (isXFeed && items.length > 0) {
      console.log(`✓ X feed ${feed.source}: ${items.length} posts`);
    }
    const tierBonus = TIER_SCORE_BONUS[feed.tier] || 0;

    return items.slice(0, 15).map(item => {
      const summary = item.description.slice(0, 300) + (item.description.length > 300 ? '…' : '');
      let category = classifyCategory(item.title, summary, feed.category);
      let subtopic = classifySubtopic(item.title, summary, feed.subtopic || '');
      // Apply re-categorization rules (e.g. Nintendo tax → macro)
      const recat = recategorize(item.title, summary, category, subtopic);
      category = recat.category;
      subtopic = recat.subtopic;
      const { level: impact_level, score: signal_score } = scoreImpact(item.title, summary, tierBonus);
      const market_direction = inferDirection(item.title, summary);
      const published_at = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
      const titleHash = makeTitleHash(item.title);

      // For X feeds, convert nitter links back to twitter.com links
      let articleUrl = item.link || '#';
      if (isXFeed && articleUrl.includes('nitter')) {
        articleUrl = articleUrl.replace(/https?:\/\/[^/]*nitter[^/]*/, 'https://x.com');
      }

      const article: NormalizedArticle = {
        id: `rss-${hashString(item.title + feed.source)}`,
        title: item.title,
        summary: summary || 'No summary available.',
        source: feed.source,
        category,
        subtopic,
        url: articleUrl,
        published_at,
        read_time: estimateReadTime(item.description || item.title),
        is_top_signal: false,
        impact_level,
        market_direction,
        badges: [],
        signal_score,
        title_hash: titleHash,
        related_sources: [],
        related_count: 0,
        image_url: item.imageUrl,
      };

      article.badges = assignBadges(article);
      return article;
    });
  } catch (error) {
    console.error(`Error fetching ${feed.source}:`, error);
    return [];
  }
}

// ─── Smart Deduplication with Story Clustering ───

// Extract key entities (numbers, proper nouns, tickers) from title
function extractEntities(title: string): string[] {
  const entities: string[] = [];
  // Extract dollar amounts, percentages, large numbers
  const numbers = title.match(/\$[\d,.]+\s*(?:trillion|billion|million|T|B|M)?/gi) || [];
  entities.push(...numbers.map(n => n.toLowerCase().replace(/\s+/g, '')));
  const percents = title.match(/[\d.]+%/g) || [];
  entities.push(...percents);
  // Extract tickers and known names
  const tickers = title.match(/\b(?:BTC|ETH|SOL|XRP|DOGE|NVDA|AAPL|MSFT|GOOGL|AMZN|TSLA|META)\b/gi) || [];
  entities.push(...tickers.map(t => t.toUpperCase()));
  return entities;
}

// Categories that tend to produce many duplicates — use more aggressive thresholds
const AGGRESSIVE_DEDUP_CATEGORIES = new Set(['macro', 'commodities', 'investment']);
const AGGRESSIVE_DEDUP_KEYWORDS = [
  'etf', 'oil', 'gold', 'crude', 'bitcoin etf', 'regulation', 'fed', 'interest rate',
  'inflation', 'tariff', 'sanctions', 'stablecoin', 'cbdc', 'sec ', 'iran', 'war',
  'middle east', 'barrel', 'opec', 'aramco',
];

function isAggressiveDedupCandidate(article: NormalizedArticle): boolean {
  if (AGGRESSIVE_DEDUP_CATEGORIES.has(article.category)) return true;
  const text = `${article.title} ${article.summary}`.toLowerCase();
  return AGGRESSIVE_DEDUP_KEYWORDS.some(k => text.includes(k));
}

// ─── Source Family Grouping ───
// Treat sub-feeds from same publisher as same source for dedup
function getSourceFamily(source: string): string {
  if (source.startsWith('Investing.com')) return 'Investing.com';
  if (source.startsWith('CNBC')) return 'CNBC';
  if (source.startsWith('Reuters')) return 'Reuters';
  if (source.startsWith('MarketWatch')) return 'MarketWatch';
  if (source.startsWith('CoinDesk') || source === 'X @CoinDesk') return 'CoinDesk';
  if (source.startsWith('CoinTelegraph') || source === 'X @Cointelegraph') return 'CoinTelegraph';
  if (source.startsWith('The Verge') || source === 'X @verge') return 'The Verge';
  if (source.startsWith('TechCrunch') || source === 'X @TechCrunch') return 'TechCrunch';
  if (source.startsWith('Ars Technica') || source === 'X @ArsTechnica') return 'Ars Technica';
  if (source.startsWith('BBC')) return 'BBC';
  return source;
}

function similarityScore(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) { if (wordsB.has(w)) overlap++; }
  return overlap / Math.min(wordsA.size, wordsB.size);
}

function entityOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let matches = 0;
  for (const e of a) { if (setB.has(e)) matches++; }
  return matches / Math.max(a.length, b.length);
}

function smartDeduplicate(articles: NormalizedArticle[]): NormalizedArticle[] {
  const urlSeen = new Set<string>();
  const kept: NormalizedArticle[] = [];
  const sorted = [...articles].sort((a, b) => b.signal_score - a.signal_score);

  for (const article of sorted) {
    // 1. Exact URL dedup
    const normalizedUrl = article.url.replace(/\/$/, '').replace(/\?.*$/, '').replace(/#.*$/, '');
    if (urlSeen.has(normalizedUrl)) continue;
    urlSeen.add(normalizedUrl);

    let isDuplicate = false;
    const articleEntities = extractEntities(article.title);
    const isAggressive = isAggressiveDedupCandidate(article);

    for (const existing of kept) {
      // 2. Same title hash = definite duplicate
      if (article.title_hash === existing.title_hash) {
        existing.related_sources = [...new Set([...existing.related_sources, article.source])];
        existing.related_count = existing.related_sources.length;
        if (!existing.image_url && article.image_url) existing.image_url = article.image_url;
        isDuplicate = true;
        break;
      }

      const sim = similarityScore(article.title, existing.title);
      const timeDiffHours = Math.abs(new Date(article.published_at).getTime() - new Date(existing.published_at).getTime()) / (1000 * 60 * 60);

      // 3. Same source + similar title = duplicate (lower threshold)
      if (article.source === existing.source && sim >= 0.3 && timeDiffHours < 24) {
        isDuplicate = true;
        break;
      }

      // 4. Entity-based clustering: same entities + similar event wording
      const existingEntities = extractEntities(existing.title);
      const eOverlap = entityOverlap(articleEntities, existingEntities);

      // 5. Aggressive dedup for market-moving topics
      const bothAggressive = isAggressive || isAggressiveDedupCandidate(existing);
      const aggressiveThreshold = bothAggressive ? 0.28 : 0.42;
      const aggressiveTimeWindow = bothAggressive ? 24 : 14;

      if (sim >= 0.5 && timeDiffHours < aggressiveTimeWindow) {
        existing.related_sources = [...new Set([...existing.related_sources, article.source])];
        existing.related_count = existing.related_sources.length;
        if (!existing.image_url && article.image_url) existing.image_url = article.image_url;
        isDuplicate = true;
        break;
      }

      // Cross-source same event: similar title + same or related category + recent
      const relatedCategories = article.category === existing.category || 
        (new Set(['macro', 'investment', 'commodities']).has(article.category) && new Set(['macro', 'investment', 'commodities']).has(existing.category));
      if (sim >= aggressiveThreshold && relatedCategories && timeDiffHours < aggressiveTimeWindow) {
        existing.related_sources = [...new Set([...existing.related_sources, article.source])];
        existing.related_count = existing.related_sources.length;
        if (!existing.image_url && article.image_url) existing.image_url = article.image_url;
        isDuplicate = true;
        break;
      }

      // Entity + similarity combo: if entities match and titles are somewhat similar
      if (eOverlap >= 0.4 && sim >= 0.25 && relatedCategories && timeDiffHours < 18) {
        existing.related_sources = [...new Set([...existing.related_sources, article.source])];
        existing.related_count = existing.related_sources.length;
        if (!existing.image_url && article.image_url) existing.image_url = article.image_url;
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) kept.push(article);
  }
  return kept;
}

// ─── Source Diversity ───
// Limit max articles per source, with category balancing
function applySourceDiversity(articles: NormalizedArticle[], maxPerSource: number = 6): NormalizedArticle[] {
  const sourceCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const result: NormalizedArticle[] = [];
  const maxPerCategory = 25; // ensure no single category dominates

  for (const article of articles) {
    const srcCount = sourceCounts.get(article.source) || 0;
    const catCount = categoryCounts.get(article.category) || 0;
    if (srcCount < maxPerSource && catCount < maxPerCategory) {
      result.push(article);
      sourceCounts.set(article.source, srcCount + 1);
      categoryCounts.set(article.category, catCount + 1);
    }
  }
  return result;
}

function markTopSignals(articles: NormalizedArticle[]): NormalizedArticle[] {
  const sorted = [...articles].sort((a, b) => b.signal_score - a.signal_score);
  const categories = new Map<string, number>();
  let signalCount = 0;
  return sorted.map(article => {
    const catCount = categories.get(article.category) || 0;
    if (signalCount < 6 && catCount < 2 && article.signal_score >= 60) {
      categories.set(article.category, catCount + 1);
      signalCount++;
      return { ...article, is_top_signal: true };
    }
    return article;
  });
}

// ─── Irrelevant Content Filter ───
// Remove Web2 gaming, lifestyle, consumer electronics that don't match our topics
const IRRELEVANT_PATTERNS: RegExp[] = [
  // Pure Web2 gaming (not GameFi/blockchain)
  /\b(?:steam\s*machine|steam\s*deck|playstation|xbox|ps5|ps4|switch\s*2|game\s*pass)\b/i,
  /\b(?:gta|call\s*of\s*duty|fortnite|minecraft|valorant|overwatch|zelda|mario|elden\s*ring)\b/i,
  /\b(?:dlc|expansion\s*pack|game\s*update|patch\s*notes|game\s*review|game\s*trailer)\b/i,
  /\b(?:fps|rpg|mmorpg)\b.*\b(?:game|play|release)/i,
  // Retro gaming / consoles (unless related to business/valuation)
  /\b(?:retro\s*gaming|emulat(?:or|ion)|rom|cartridge|clone\s*console)\b/i,
  // Consumer electronics / lifestyle
  /\b(?:best\s+(?:mid\s+layer|hiking|backpack|travel|laptop bag|headphones|earbuds))\b/i,
  /\b(?:buying\s*guide|gift\s*guide|product\s*review|unboxing)\b/i,
  /\b(?:furby|tamagotchi|toy|lego)\b/i,
  // Hybrid vehicles / automotive (not EV/Tesla business)
  /\b(?:hybrid\s*vehicle|car\s*review|test\s*drive|mpg|fuel\s*economy)\b/i,
  // Home / lifestyle / cooking
  /\b(?:recipe|cooking|kitchen|garden|home\s*improvement|diy\s*project)\b/i,
  // Linux hacking on consoles (hobbyist, not business)
  /\blinux\s*(?:hacked|installed|running)\s*(?:on|onto)\b/i,
  // Consumer watchdog / enshittification (opinion, not market-moving)
  /\benshittification\b/i,
  // Robovac / smart home
  /\b(?:robovac|robot\s*vacuum|smart\s*home|thermostat)\b/i,
];

// Keywords that OVERRIDE the irrelevant filter (keep the article)
const RELEVANCE_OVERRIDES: RegExp[] = [
  /\b(?:gamefi|web3\s*gaming|play.to.earn|blockchain\s*game|nft\s*game|token|crypto)\b/i,
  /\b(?:ipo|valuation|billion|million|acquisition|merger|stock|shares|revenue|earnings)\b/i,
  /\b(?:tariff|tax|lawsuit|regulation|antitrust|ban|sanction)\b/i,
  /\b(?:etf|fed|inflation|interest\s*rate|gdp)\b/i,
  /\b(?:artificial\s*intelligence|llm|gpt|claude|gemini|openai|anthropic)\b/i,  // require specific AI terms, not just "ai"
];

function isIrrelevantContent(title: string, summary: string): boolean {
  const text = `${title} ${summary}`.toLowerCase();
  
  // Check if any irrelevant pattern matches
  const matchesIrrelevant = IRRELEVANT_PATTERNS.some(p => p.test(text));
  if (!matchesIrrelevant) return false;
  
  // Check overrides - if it's about business/finance/crypto/AI aspects, keep it
  const hasOverride = RELEVANCE_OVERRIDES.some(p => p.test(text));
  if (hasOverride) return false;
  
  return true; // irrelevant
}

// ─── Main Handler ───

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('Fetching RSS feeds...');
    const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));

    let allArticles: NormalizedArticle[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') allArticles.push(...result.value);
    }
    console.log(`Fetched ${allArticles.length} total articles`);

    // Filter out irrelevant Web2/lifestyle content
    const beforeFilter = allArticles.length;
    allArticles = allArticles.filter(a => !isIrrelevantContent(a.title, a.summary));
    const filtered = beforeFilter - allArticles.length;
    if (filtered > 0) console.log(`Filtered ${filtered} irrelevant articles`);

    allArticles = smartDeduplicate(allArticles);
    console.log(`${allArticles.length} after dedup`);

    // ─── DB-level title_hash dedup ───
    // Fetch existing title_hashes from DB to prevent cross-run duplicates
    const { data: existingRows } = await supabase
      .from('articles')
      .select('id, title_hash, related_sources, related_count, image_url');
    
    if (existingRows?.length) {
      const existingByHash = new Map<string, typeof existingRows[0]>();
      for (const row of existingRows) {
        if (row.title_hash) existingByHash.set(row.title_hash, row);
      }
      
      // Remove articles whose title_hash already exists in DB under a different id
      allArticles = allArticles.filter(article => {
        const existing = existingByHash.get(article.title_hash);
        if (existing && existing.id !== article.id) {
          // Merge related_sources into existing record (will update below)
          return false;
        }
        return true;
      });
      console.log(`${allArticles.length} after DB title_hash dedup`);
    }

    // Sort by signal then recency
    allArticles.sort((a, b) => {
      const scoreDiff = b.signal_score - a.signal_score;
      if (Math.abs(scoreDiff) > 10) return scoreDiff;
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });

    // Apply source diversity
    allArticles = applySourceDiversity(allArticles);

    allArticles = markTopSignals(allArticles);

    // Limit to ~100 best articles
    allArticles = allArticles.slice(0, 100);

    const { error: upsertError } = await supabase
      .from('articles')
      .upsert(allArticles, { onConflict: 'id', ignoreDuplicates: false });

    if (upsertError) console.error('Upsert error:', upsertError);

    // Clean articles older than 36 hours
    const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
    const { error: deleteError } = await supabase
      .from('articles')
      .delete()
      .lt('published_at', cutoff);

    if (deleteError) console.error('Cleanup error:', deleteError);

    return new Response(
      JSON.stringify({
        success: true,
        articlesStored: allArticles.length,
        fetchedAt: new Date().toISOString(),
        feedCount: RSS_FEEDS.length,
        filteredIrrelevant: filtered,
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
