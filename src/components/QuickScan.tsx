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

const CACHE_KEY_PREFIX = 'quick-scan-v2-';
const CACHE_DURATION = 15 * 60 * 1000;

export default function QuickScan({ articles, narratives, lang }: Props) {
  const [bullets, setBullets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const prevLangRef = useRef(lang);

  const articleHash = articles.slice(0, 5).map(a => a.id).join(',');
  const cacheKey = `${CACHE_KEY_PREFIX}${lang}`;

  useEffect(() => {
    if (articles.length === 0) return;

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
    generateBrief(articles, narratives, lang).then(b => {
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
    return articles.slice(0, 5).map(a => a.title);
  }
}
