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
  ai: 'bg-blue-500/8 text-blue-600',
  crypto: 'bg-amber-500/8 text-amber-600',
  investment: 'bg-emerald-500/8 text-emerald-600',
  macro: 'bg-violet-500/8 text-violet-600',
  'tech-stocks': 'bg-cyan-500/8 text-cyan-600',
  commodities: 'bg-orange-500/8 text-orange-600',
};

const directionIcon = {
  bullish: <TrendingUp className="h-4 w-4 text-emerald-500" />,
  bearish: <TrendingDown className="h-4 w-4 text-red-500" />,
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

    setLoading(true);
    setDetail(null);
    generateDetail(item, lang).then(d => {
      setDetail(d);
      try { localStorage.setItem(cacheKey, JSON.stringify({ data: d, ts: Date.now() })); } catch {}
    }).finally(() => setLoading(false));
  }, [open, item?.id, lang]);

  if (!item) return null;

  const displayTitle = showThai && thaiTitle ? thaiTitle : item.title;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">
        {/* Image */}
        {item.imageUrl && !imgError && (
          <div className="w-full h-48 overflow-hidden bg-muted">
            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
          </div>
        )}

        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-3">
            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`rounded-md px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${categoryColors[item.category] || 'bg-secondary text-secondary-foreground'}`}>
                {item.category === 'tech-stocks' ? 'Tech' : item.category}
              </span>
              {item.subtopic && (
                <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">{item.subtopic}</span>
              )}
              {item.marketDirection && directionIcon[item.marketDirection]}
              <span className="ml-auto flex items-center gap-1 text-[12px] text-muted-foreground font-light">
                <Clock className="h-3 w-3" />
                {getTimeAgo(item.publishedAt)}
              </span>
            </div>

            <DialogTitle className="font-display text-xl font-semibold leading-[1.4] tracking-[-0.02em]">{displayTitle}</DialogTitle>
            <p className="text-[12px] font-medium text-muted-foreground tracking-wide">{item.source} · {item.readTime} min read</p>
          </DialogHeader>

          {/* AI-generated summary paragraphs */}
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-4 bg-muted rounded-md animate-pulse" style={{ width: `${90 - i * 10}%` }} />)}
              </div>
            ) : detail ? (
              detail.paragraphs.map((p, i) => (
                <p key={i} className="text-[14px] leading-[1.7] text-foreground/90">{p}</p>
              ))
            ) : null}
          </div>

          {/* Key Points */}
          {detail && detail.takeaways.length > 0 && (
            <div className="glass-card rounded-xl p-5 space-y-3">
              <h4 className="font-display text-[14px] font-semibold text-foreground">
                {showThai ? '💡 ประเด็นสำคัญ' : '💡 Key Points'}
              </h4>
              <ul className="space-y-2.5">
                {detail.takeaways.map((tk, i) => (
                  <li key={i} className="text-[13px] leading-[1.65] text-muted-foreground flex gap-2.5">
                    <span className="shrink-0 text-primary font-semibold">•</span>
                    <span>{tk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Source + link */}
          <div className="space-y-3 pt-1">
            <p className="text-[12px] font-medium text-muted-foreground tracking-wide">{item.source}</p>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-foreground text-background py-3 text-[13px] font-semibold transition-colors hover:bg-foreground/90"
            >
              <ExternalLink className="h-4 w-4" />
              {showThai ? 'อ่านต้นฉบับ' : 'Open Original Article'}
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
