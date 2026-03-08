export type Interest = 'ai' | 'crypto' | 'gaming' | 'startups' | 'productivity';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceIcon?: string;
  category: Interest | string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  readTime: number;
}

export interface UserPreferences {
  interests: Interest[];
  customKeywords: string[];
  sources: string[];
  morningTime: string;
  onboardingComplete: boolean;
}

export const DEFAULT_INTERESTS: { id: Interest; label: string; emoji: string }[] = [
  { id: 'ai', label: 'AI', emoji: '🤖' },
  { id: 'crypto', label: 'Crypto', emoji: '₿' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'startups', label: 'Startups', emoji: '🚀' },
  { id: 'productivity', label: 'Productivity', emoji: '⚡' },
];

export const DEFAULT_SOURCES = [
  'TechCrunch',
  'The Verge',
  'Hacker News',
  'Wired',
  'Ars Technica',
  'Product Hunt',
  'CoinDesk',
  'IGN',
];
