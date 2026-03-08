import { useState, useEffect, useRef } from 'react';
import { NewsItem, Narrative } from '@/lib/types';
import { Language } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Zap, Clock } from 'lucide-react';

interface Props {
  articles: NewsItem[];
  narratives: Narrative[];
  lang: Language;
}

const CACHE_KEY_PREFIX = 'quick-scan-v3-';
const CACHE_DURATION = 15 * 60 * 1000;

// ─── Freshness Classification ───
type FreshnessLabel = 'new-today' | 'developing' | 'background' | 'older';

function classifyFreshness(article: NewsItem): FreshnessLabel {
  const now = Date.now();
  const publishedAt = new Date(article.publishedAt).getTime();
  const ageHours = (now - publishedAt) / (1000 * 60 * 60);

  // Stale topic detection — these topics recirculate heavily
  const title = article.title.toLowerCase();
  const isRecycledTopic = isLikelyRecirculated(title, article.category);

  if (isRecycledTopic && ageHours > 8) return 'older';
  if (isRecycledTopic && ageHours > 4) return 'background';

  if (ageHours <= 6) return 'new-today';
  if (ageHours <= 12) return 'developing';
  if (ageHours <= 24) return 'background';
  return 'older';
}

// Detect topics that tend to get recirculated / are evergreen
function isLikelyRecirculated(title: string, category: string): boolean {
  const stalePatterns = [
    // BTC/ETH price milestones that repeat
    /bitcoin\s+(hits|reaches|crosses|tops|breaks)\s+\$[\d,]+/i,
    /eth(?:ereum)?\s+(hits|reaches|crosses|tops|breaks)\s+\$[\d,]+/i,
    /btc\s+(hits|reaches|crosses|tops|breaks)\s+\$[\d,]+/i,
    // Old Fed/rate headlines
    /fed\s+(holds|keeps|maintains)\s+(?:rates?|interest)/i,
    /rate\s+(decision|unchanged|steady)/i,
    // Generic milestone/record headlines
    /all.time\s+high/i,
    /record\s+(high|low|level)/i,
    // Old model launch headlines
    /(?:gpt-4|claude\s*3|gemini\s*1\.5|llama\s*3)\s+(?:launch|release|announc)/i,
    // Evergreen explainers
    /what\s+(?:is|are)\s+/i,
    /how\s+to\s+/i,
    /beginner.?s?\s+guide/i,
    /everything\s+you\s+need\s+to\s+know/i,
  ];

  return stalePatterns.some(p => p.test(title));
}

// Filter articles eligible for Quick Scan: only fresh + developing
function getQuickScanArticles(articles: NewsItem[]): NewsItem[] {
  return articles.filter(a => {
    const freshness = classifyFreshness(a);
    return freshness === 'new-today' || freshness === 'developing';
  });
}

export default function QuickScan({ articles, narratives, lang }: Props) {
  const [bullets, setBullets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Only use fresh articles for Quick Scan
  const freshArticles = getQuickScanArticles(articles);
  const articleHash = freshArticles.slice(0, 8).map(a => a.id).join(',');
  const cacheKey = `${CACHE_KEY_PREFIX}${lang}`;

  useEffect(() => {
    if (freshArticles.length === 0) {
      setBullets([]);
      return;
    }

    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Date.now() - cached.ts < CACHE_DURATION && cached.articleHash === articleHash) {
          setBullets(cached.bullets);
          return;
        }
      }
    } catch {}

    setLoading(true);
    setBullets([]);
    generateBrief(freshArticles, narratives, lang).then(b => {
      setBullets(b);
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          bullets: b, ts: Date.now(), articleHash,
        }));
      } catch {}
    }).finally(() => setLoading(false));
  }, [articleHash, lang]);

  if (bullets.length === 0 && !loading) return null;

  const title = lang === 'th' ? 'ภาพรวมวันนี้' : 'Quick Scan';
  const subtitle = lang === 'th' ? 'สรุปสั้นๆ สิ่งที่เกิดขึ้นวันนี้' : 'What changed today — read in 30 seconds';

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-5 space-y-3"
    >
      <div className="flex items-center gap-2.5">
        <Zap className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold tracking-[-0.01em]">{title}</h2>
        <span className="text-[11px] text-muted-foreground flex items-center gap-1 ml-auto font-light">
          <Clock className="h-3 w-3" />
          {lang === 'th' ? '30 วิ' : '30s read'}
        </span>
      </div>
      <p className="text-[12px] text-muted-foreground font-light">{subtitle}</p>

      {loading ? (
        <div className="space-y-2.5 pt-1">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-4 bg-muted rounded-md animate-pulse" style={{ width: `${95 - i * 8}%` }} />
          ))}
        </div>
      ) : (
        <ul className="space-y-2.5 pt-1">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2.5 text-[14px] leading-[1.65] text-foreground/90">
              <span className="shrink-0 text-primary font-semibold mt-0.5">▸</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.section>
  );
}

async function generateBrief(articles: NewsItem[], narratives: Narrative[], lang: Language): Promise<string[]> {
  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Include freshness metadata for each article
    const top = articles.slice(0, 15).map(a => {
      const ageHours = Math.round((now.getTime() - new Date(a.publishedAt).getTime()) / (1000 * 60 * 60));
      return `[${a.category}] (${ageHours}h ago) ${a.title}: ${a.summary.slice(0, 120)}`;
    }).join('\n');
    const narrs = narratives.slice(0, 5).map(n => `${n.title} (${n.momentum})`).join(', ');

    const { data, error } = await supabase.functions.invoke('enrich-articles', {
      body: {
        mode: 'quickscan',
        briefData: { top, narrs, todayDate: todayStr },
        lang,
      },
    });
    if (error || !data?.bullets?.length) throw new Error('No brief');
    return data.bullets;
  } catch {
    return articles.slice(0, 5).map(a => a.title);
  }
}
