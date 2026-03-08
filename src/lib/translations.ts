// Bilingual category and UI label translations

export const categoryLabels = {
  en: {
    ai: 'AI',
    crypto: 'Crypto',
    investment: 'Investment',
    macro: 'Macro',
    'tech-stocks': 'Tech',
    commodities: 'Commodities',
  },
  th: {
    ai: 'AI',
    crypto: 'คริปโต',
    investment: 'การลงทุน',
    macro: 'มหภาค',
    'tech-stocks': 'หุ้นเทค',
    commodities: 'โภคภัณฑ์',
  },
} as const;

export const subtopicLabels = {
  en: {
    'L1': 'L1',
    'L2': 'L2',
    'Altcoins': 'Altcoins',
    'DeFi': 'DeFi',
    'NFT': 'NFT',
    'Stablecoins': 'Stablecoins',
    'Market Movements': 'Market Movements',
    'Macro Economy': 'Macro Economy',
    'RWA': 'RWA',
    'On-chain': 'On-chain',
    'Earnings': 'Earnings',
    'IPO': 'IPO',
    'M&A': 'M&A',
  },
  th: {
    'L1': 'L1',
    'L2': 'L2',
    'Altcoins': 'Altcoin',
    'DeFi': 'DeFi',
    'NFT': 'NFT',
    'Stablecoins': 'Stablecoin',
    'Market Movements': 'ตลาดเคลื่อนไหว',
    'Macro Economy': 'เศรษฐกิจมหภาค',
    'RWA': 'RWA',
    'On-chain': 'On-chain',
    'Earnings': 'งบกำไร',
    'IPO': 'IPO',
    'M&A': 'M&A',
  },
} as const;

export const badgeLabels = {
  en: {
    'Breaking': 'Breaking',
    'Rising': 'Rising',
    'High Impact': 'High Impact',
    'Narrative': 'Narrative',
    'Macro': 'Macro',
    'Earnings': 'Earnings',
    'On-chain': 'On-chain',
  },
  th: {
    'Breaking': 'ด่วน',
    'Rising': 'มาแรง',
    'High Impact': 'สำคัญ',
    'Narrative': 'เทรนด์',
    'Macro': 'มหภาค',
    'Earnings': 'งบกำไร',
    'On-chain': 'On-chain',
  },
} as const;

export type Language = 'en' | 'th';

export function getCategoryLabel(category: string, lang: Language): string {
  return categoryLabels[lang][category as keyof typeof categoryLabels.en] || category;
}

export function getSubtopicLabel(subtopic: string, lang: Language): string {
  return subtopicLabels[lang][subtopic as keyof typeof subtopicLabels.en] || subtopic;
}

export function getBadgeLabel(badge: string, lang: Language): string {
  return badgeLabels[lang][badge as keyof typeof badgeLabels.en] || badge;
}
