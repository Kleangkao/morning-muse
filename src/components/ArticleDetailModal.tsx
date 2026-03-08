import { NewsItem } from '@/lib/types';
import { Language, t } from '@/hooks/useLanguage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  item: NewsItem | null;
  open: boolean;
  onClose: () => void;
  lang: Language;
  thaiTitle?: string;
  thaiSummary?: string;
}

const categoryColors: Record<string, string> = {
  ai: 'bg-blue-500/10 text-blue-700',
  crypto: 'bg-amber-500/10 text-amber-700',
  investment: 'bg-emerald-500/10 text-emerald-700',
  macro: 'bg-violet-500/10 text-violet-700',
  'tech-stocks': 'bg-cyan-500/10 text-cyan-700',
  commodities: 'bg-orange-500/10 text-orange-700',
};

const directionIcon = {
  bullish: <TrendingUp className="h-4 w-4 text-emerald-600" />,
  bearish: <TrendingDown className="h-4 w-4 text-red-600" />,
  neutral: <Minus className="h-4 w-4 text-muted-foreground" />,
};

interface DetailData {
  paragraphs: string[];
  takeaways: string[];
}

export default function ArticleDetailModal({ item, open, onClose, lang, thaiTitle, thaiSummary }: Props) {
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const showThai = lang === 'th';

  useEffect(() => {
    if (!open || !item) { setDetail(null); return; }
    setImgError(false);

    // Cache is keyed by both article ID and language
    const cacheKey = `article-detail-${item.id}-${lang}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < 30 * 60 * 1000) {
          setDetail(parsed.data);
          return;
        }
      }
    } catch {}

    // Always generate AI summary — never show RSS text
    setLoading(true);
    setDetail(null);
    generateDetail(item, lang).then(d => {
      setDetail(d);
      try { localStorage.setItem(cacheKey, JSON.stringify({ data: d, ts: Date.now() })); } catch {}
    }).finally(() => setLoading(false));
  }, [open, item?.id, lang]);

  if (!item) return null;

  const displayTitle = showThai && thaiTitle ? thaiTitle : item.title;
  const secondaryTitle = undefined; // No mixed language

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Image */}
        {item.imageUrl && !imgError && (
          <div className="w-full h-48 overflow-hidden bg-muted">
            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
          </div>
        )}

        <div className="p-5 space-y-4">
          <DialogHeader className="space-y-2">
            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${categoryColors[item.category] || 'bg-secondary text-secondary-foreground'}`}>
                {item.category === 'tech-stocks' ? 'Tech' : item.category}
              </span>
              {item.subtopic && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">{item.subtopic}</span>
              )}
              {item.marketDirection && directionIcon[item.marketDirection]}
              <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {getTimeAgo(item.publishedAt)}
              </span>
            </div>

            <DialogTitle className="font-display text-xl leading-tight">{displayTitle}</DialogTitle>
            {secondaryTitle && (
              <p className="text-[13px] text-muted-foreground/70 leading-snug">{secondaryTitle}</p>
            )}
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{item.source} · {item.readTime} min read</p>
          </DialogHeader>

          {/* AI-generated summary paragraphs */}
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${90 - i * 10}%` }} />)}
              </div>
            ) : detail ? (
              detail.paragraphs.map((p, i) => (
                <p key={i} className="text-[14px] leading-relaxed text-foreground/90">{p}</p>
              ))
            ) : null}
          </div>

          {/* Key Points */}
          {detail && detail.takeaways.length > 0 && (
            <div className="glass-card rounded-lg p-4 space-y-2">
              <h4 className="font-display text-sm font-semibold text-foreground">
                {showThai ? '💡 จุดสำคัญ' : '💡 Key Points'}
              </h4>
              <ul className="space-y-1.5">
                {detail.takeaways.map((tk, i) => (
                  <li key={i} className="text-[13px] leading-snug text-muted-foreground flex gap-2">
                    <span className="shrink-0 text-primary font-bold">•</span>
                    <span>{tk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Source + link */}
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{item.source}</p>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold transition-colors hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4" />
              {showThai ? 'เปิดบทความต้นฉบับ' : 'Open Original Article'}
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function generateDetail(item: NewsItem, lang: Language): Promise<DetailData> {
  try {
    const { data, error } = await supabase.functions.invoke('enrich-articles', {
      body: {
        mode: 'detail',
        article: { id: item.id, title: item.title, summary: item.summary, category: item.category, subtopic: item.subtopic || '', source: item.source },
        lang,
      },
    });
    if (error || !data?.paragraphs) throw new Error('No detail');
    return { paragraphs: data.paragraphs, takeaways: data.takeaways || [] };
  } catch {
    return {
      paragraphs: [item.summary || 'No summary available.'],
      takeaways: [],
    };
  }
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
