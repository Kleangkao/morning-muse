export type TopicCategory = 'ai' | 'crypto' | 'investment' | 'top-signals';

export type CryptoSubtopic = 'L1/L2' | 'DeFi' | 'GameFi' | 'Prediction Markets' | 'Altcoins' | 'Memecoins' | 'RWA' | 'DePIN';
export type InvestmentSubtopic = 'Gold' | 'Silver' | 'Tech Stocks' | 'Macro Economy' | 'Market Movements';
export type AISubtopic = 'Models' | 'Startups' | 'Research' | 'Companies';

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
}

export interface UserPreferences {
  interests: TopicCategory[];
  customKeywords: string[];
  sources: string[];
  mutedSources: string[];
  morningTime: string;
  summaryLength: 'short' | 'medium' | 'long';
  onboardingComplete: boolean;
}

export const TOPIC_CONFIG: { id: TopicCategory; label: string; emoji: string; description: string }[] = [
  { id: 'ai', label: 'AI', emoji: '🤖', description: 'Models, startups, research' },
  { id: 'crypto', label: 'Crypto', emoji: '₿', description: 'DeFi, L1/L2, altcoins & more' },
  { id: 'investment', label: 'Investment', emoji: '📈', description: 'Stocks, gold, macro economy' },
];

export const CRYPTO_SUBTOPICS: CryptoSubtopic[] = ['L1/L2', 'DeFi', 'GameFi', 'Prediction Markets', 'Altcoins', 'Memecoins', 'RWA', 'DePIN'];
export const INVESTMENT_SUBTOPICS: InvestmentSubtopic[] = ['Gold', 'Silver', 'Tech Stocks', 'Macro Economy', 'Market Movements'];
export const AI_SUBTOPICS: AISubtopic[] = ['Models', 'Startups', 'Research', 'Companies'];

export const ALL_SOURCES = [
  'TechCrunch', 'The Verge', 'Hacker News', 'Wired', 'Ars Technica',
  'CoinDesk', 'The Block', 'Decrypt', 'Bloomberg', 'Reuters',
  'CNBC', 'Financial Times', 'The Information', 'VentureBeat',
  'MIT Tech Review', 'Product Hunt', 'ArXiv',
];
