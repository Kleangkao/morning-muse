export type TopicCategory = 'ai' | 'crypto' | 'investment' | 'macro' | 'tech-stocks' | 'commodities';

export type CryptoSubtopic = 'L1' | 'L2' | 'DeFi' | 'GameFi' | 'Prediction Markets' | 'Altcoins' | 'Memecoins' | 'RWA' | 'DePIN';
export type InvestmentSubtopic = 'Gold' | 'Silver' | 'Tech Stocks' | 'Macro Economy' | 'Market Movements' | 'Central Bank' | 'Earnings';
export type AISubtopic = 'Models' | 'Startups' | 'Research' | 'Companies';

export type ImpactLevel = 'low' | 'medium' | 'high';
export type MarketDirection = 'bullish' | 'bearish' | 'neutral';
export type MomentumLabel = 'Rising' | 'Hot' | 'Watchlist';
export type SmartBadge = 'Breaking' | 'Rising' | 'High Impact' | 'Narrative' | 'Macro' | 'Earnings' | 'On-chain';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: TopicCategory;
  subtopic?: string;
  url: string;
  publishedAt: string;
  readTime: number;
  isTopSignal?: boolean;
  impactLevel?: ImpactLevel;
  marketDirection?: MarketDirection;
  badges?: SmartBadge[];
  narrativeId?: string;
  signalScore?: number; // 0-100, higher = more signal
  imageUrl?: string;
}

export interface Narrative {
  id: string;
  title: string;
  whyItMatters: string;
  whyItMattersTh: string;
  articleCount: number;
  category: TopicCategory;
  momentum: MomentumLabel;
  articleIds: string[];
}

export interface UserPreferences {
  interests: TopicCategory[];
  customKeywords: string[];
  sources: string[];
  mutedSources: string[];
  morningTime: string;
  summaryLength: 'short' | 'medium' | 'long';
}

export const TOPIC_CONFIG: { id: TopicCategory; label: string; emoji: string; description: string }[] = [
  { id: 'ai', label: 'AI', emoji: '🤖', description: 'Models, startups, research' },
  { id: 'crypto', label: 'Crypto', emoji: '₿', description: 'DeFi, L1/L2, altcoins & more' },
  { id: 'investment', label: 'Investment', emoji: '📈', description: 'Stocks, gold, macro economy' },
  { id: 'macro', label: 'Macro', emoji: '🌍', description: 'Central banks, inflation, GDP' },
  { id: 'tech-stocks', label: 'Tech Stocks', emoji: '💻', description: 'NVIDIA, Apple, Microsoft & more' },
  { id: 'commodities', label: 'Commodities', emoji: '🪙', description: 'Gold, silver, oil' },
];

export const CRYPTO_SUBTOPICS: CryptoSubtopic[] = ['L1', 'L2', 'DeFi', 'GameFi', 'Prediction Markets', 'Altcoins', 'Memecoins', 'RWA', 'DePIN'];
export const INVESTMENT_SUBTOPICS: InvestmentSubtopic[] = ['Gold', 'Silver', 'Tech Stocks', 'Macro Economy', 'Market Movements', 'Central Bank', 'Earnings'];
export const AI_SUBTOPICS: AISubtopic[] = ['Models', 'Startups', 'Research', 'Companies'];

export const ALL_SOURCES = [
  'TechCrunch', 'The Verge', 'Hacker News', 'Wired', 'Ars Technica',
  'CoinDesk', 'The Block', 'Decrypt', 'Bloomberg', 'Reuters',
  'CNBC', 'Financial Times', 'The Information', 'VentureBeat',
  'MIT Tech Review', 'Product Hunt', 'ArXiv',
];
