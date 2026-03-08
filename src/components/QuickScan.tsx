import { useState, useEffect } from 'react';
import { NewsItem, Narrative } from '@/lib/types';
import { Language } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface Props {
  articles: NewsItem[];
  narratives: Narrative[];
  lang: Language;
}

const CACHE_KEY = 'quick-scan-cache';
const CACHE_DURATION = 15 * 60 * 1000; // 15 min

export default function QuickScan({ articles, narratives, lang }: Props) {
  const [bullets, setBullets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (articles.length === 0) return;

    // Check cache
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.lang === lang && Date.now() - cached.ts < CACHE_DURATION && cached.articleHash === articles.slice(0, 5).map(a => a.id).join(',')) {
          setBullets(cached.bullets);
          return;
        }
      }
    } catch {}

    setLoading(true);
    generateBrief(articles, narratives, lang).then(b => {
      setBullets(b);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          bullets: b, lang, ts: Date.now(),
          articleHash: articles.slice(0, 5).map(a => a.id).join(','),
        }));
      } catch {}
    }).finally(() => setLoading(false));
  }, [articles.slice(0, 3).map(a => a.id).join(','), lang]);

  if (bullets.length === 0 && !loading) return null;

  const title = lang === 'th' ? 'สรุปเร็ววันนี้' : 'Quick Scan';

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg">{title}</h2>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-3.5 bg-muted rounded animate-pulse" style={{ width: `${95 - i * 8}%` }} />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-foreground/85">
              <span className="shrink-0 text-primary font-bold mt-0.5">▸</span>
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
    const top = articles.slice(0, 15).map(a => `[${a.category}] ${a.title}: ${a.summary.slice(0, 120)}`).join('\n');
    const narrs = narratives.slice(0, 5).map(n => `${n.title} (${n.momentum})`).join(', ');

    const { data, error } = await supabase.functions.invoke('enrich-articles', {
      body: {
        mode: 'quickscan',
        briefData: { top, narrs },
        lang,
      },
    });
    if (error || !data?.bullets?.length) throw new Error('No brief');
    return data.bullets;
  } catch {
    // Fallback: use top article titles
    return articles.slice(0, 5).map(a => a.title);
  }
}
