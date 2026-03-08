import { useEffect, useRef, useState } from 'react';
import { NewsItem, SmartBadge } from '@/lib/types';
import { Language } from '@/hooks/useLanguage';
import { getCategoryLabel, getSubtopicLabel, getBadgeLabel } from '@/lib/translations';
import { Bookmark, BookmarkCheck, Clock, VolumeX, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  item: NewsItem;
  saved: boolean;
  isRead: boolean;
  onToggleSave: (id: string) => void;
  onMarkRead: (id: string) => void;
  onMuteSource?: (source: string) => void;
  onOpenDetail?: (item: NewsItem) => void;
  index?: number;
  compact?: boolean;
  thaiTitle?: string;
  thaiSummary?: string;
  lang: Language;
}

const categoryColors: Record<string, string> = {
  ai: 'bg-blue-500/8 text-blue-600',
  crypto: 'bg-amber-500/8 text-amber-600',
  investment: 'bg-emerald-500/8 text-emerald-600',
  macro: 'bg-violet-500/8 text-violet-600',
  'tech-stocks': 'bg-cyan-500/8 text-cyan-600',
  commodities: 'bg-orange-500/8 text-orange-600',
};

const badgeStyles: Record<SmartBadge, string> = {
  'Breaking': 'bg-red-500/10 text-red-600 border-red-500/15',
  'Rising': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
  'High Impact': 'bg-amber-500/10 text-amber-600 border-amber-500/15',
  'Narrative': 'bg-violet-500/10 text-violet-600 border-violet-500/15',
  'Macro': 'bg-blue-500/10 text-blue-600 border-blue-500/15',
  'Earnings': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/15',
  'On-chain': 'bg-orange-500/10 text-orange-600 border-orange-500/15',
};

const directionIcon = {
  bullish: <TrendingUp className="h-3 w-3 text-emerald-500" />,
  bearish: <TrendingDown className="h-3 w-3 text-red-500" />,
  neutral: <Minus className="h-3 w-3 text-muted-foreground" />,
};

export default function NewsCard({ item, saved, isRead, onToggleSave, onMarkRead, onMuteSource, onOpenDetail, index = 0, compact, thaiTitle, thaiSummary, lang }: Props) {
  const timeAgo = getTimeAgo(item.publishedAt, lang);
  const ref = useRef<HTMLElement>(null);
  const [imgError, setImgError] = useState(false);

  const showThai = lang === 'th';

  useEffect(() => {
    if (isRead) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onMarkRead(item.id);
          observer.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isRead, item.id, onMarkRead]);

  const handleCardClick = () => {
    onMarkRead(item.id);
    if (onOpenDetail) {
      onOpenDetail(item);
    } else {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  const displayTitle = showThai ? (thaiTitle || item.title) : item.title;
  const summaryText = showThai ? (thaiSummary || item.summary) : item.summary;
  const hasImage = item.imageUrl && !imgError;

  const categoryLabel = getCategoryLabel(item.category, lang);
  const subtopicLabel = item.subtopic ? getSubtopicLabel(item.subtopic, lang) : null;
  const isXSource = item.source.toLowerCase() === 'x' || item.source.toLowerCase() === 'twitter';

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.015, duration: 0.2 }}
      onClick={handleCardClick}
      className={`glass-card rounded-xl overflow-hidden transition-all cursor-pointer hover:shadow-[0_4px_12px_-2px_rgb(0_0_0/0.08)] hover:border-border ${isRead ? 'opacity-55' : ''} ${isXSource ? 'border-l-[3px] border-l-blue-400' : ''}`}
    >
      <div className={`${compact ? 'p-3.5' : 'p-4'} flex gap-4`}>
        {/* Text content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Badges row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ${categoryColors[item.category] || 'bg-secondary text-secondary-foreground'}`}>
              {categoryLabel}
            </span>
            {isXSource && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-500/8 text-blue-500 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
                𝕏 {showThai ? 'สัญญาณ' : 'Signal'}
              </span>
            )}
            {subtopicLabel && (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">{subtopicLabel}</span>
            )}
            {item.badges?.slice(0, 2).map(badge => (
              <span key={badge} className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${badgeStyles[badge]}`}>
                {getBadgeLabel(badge, lang)}
              </span>
            ))}
          </div>

          {/* Headline */}
          <h3 className={`font-display ${compact ? 'text-[15px]' : 'text-[16px]'} leading-[1.5] font-semibold text-foreground tracking-[-0.01em]`}>
            {displayTitle}
          </h3>

          {!compact && (
            <p className="text-[13px] leading-[1.65] text-muted-foreground line-clamp-2">
              {summaryText}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2.5 pt-1">
            <span className="text-[11px] font-medium text-muted-foreground tracking-wide">{item.source}</span>
            <span className="text-[11px] text-border">·</span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-light">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </span>
            {item.marketDirection && directionIcon[item.marketDirection]}
            {item.impactLevel === 'high' && (
              <span className="text-[10px] font-semibold text-amber-500">⚡</span>
            )}
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSave(item.id); }}
                className="rounded-lg p-1.5 transition-colors hover:bg-secondary"
                aria-label={saved ? 'Unsave' : 'Save'}
              >
                {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              {onMuteSource && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMuteSource(item.source); }}
                  className="rounded-lg p-1.5 transition-colors hover:bg-secondary"
                  aria-label={`Mute ${item.source}`}
                >
                  <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
              <ExternalLink className="h-3 w-3 text-muted-foreground/30 ml-0.5" />
            </div>
          </div>
        </div>

        {/* Side thumbnail */}
        {hasImage && (
          <div className={`shrink-0 ${compact ? 'w-16 h-16' : 'w-[100px] h-[80px]'} rounded-lg overflow-hidden bg-muted`}>
            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} loading="lazy" />
          </div>
        )}
      </div>
    </motion.article>
  );
}

function getTimeAgo(dateStr: string, lang: Language): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return lang === 'th' ? `${mins} นาที` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === 'th' ? `${hrs} ชม.` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return lang === 'th' ? `${days} วัน` : `${days}d`;
}
