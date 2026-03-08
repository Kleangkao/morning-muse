import { useEffect, useRef, useState } from 'react';
import { NewsItem, SmartBadge } from '@/lib/types';
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
  showThai?: boolean;
}

const categoryColors: Record<string, string> = {
  ai: 'bg-blue-500/10 text-blue-700',
  crypto: 'bg-amber-500/10 text-amber-700',
  investment: 'bg-emerald-500/10 text-emerald-700',
  macro: 'bg-violet-500/10 text-violet-700',
  'tech-stocks': 'bg-cyan-500/10 text-cyan-700',
  commodities: 'bg-orange-500/10 text-orange-700',
};

const badgeStyles: Record<SmartBadge, string> = {
  'Breaking': 'bg-red-500/15 text-red-700 border-red-500/20',
  'Rising': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20',
  'High Impact': 'bg-amber-500/15 text-amber-700 border-amber-500/20',
  'Narrative': 'bg-violet-500/15 text-violet-700 border-violet-500/20',
  'Macro': 'bg-blue-500/15 text-blue-700 border-blue-500/20',
  'Earnings': 'bg-cyan-500/15 text-cyan-700 border-cyan-500/20',
  'On-chain': 'bg-orange-500/15 text-orange-700 border-orange-500/20',
};

const directionIcon = {
  bullish: <TrendingUp className="h-3 w-3 text-emerald-600" />,
  bearish: <TrendingDown className="h-3 w-3 text-red-600" />,
  neutral: <Minus className="h-3 w-3 text-muted-foreground" />,
};

export default function NewsCard({ item, saved, isRead, onToggleSave, onMarkRead, onMuteSource, onOpenDetail, index = 0, compact, thaiTitle, thaiSummary, showThai }: Props) {
  const timeAgo = getTimeAgo(item.publishedAt);
  const ref = useRef<HTMLElement>(null);
  const [imgError, setImgError] = useState(false);

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

  // Strict language: EN = English only, TH = Thai only (fallback to English title if no translation yet)
  const displayTitle = showThai && thaiTitle ? thaiTitle : item.title;
  const secondaryTitle = undefined; // Never show mixed-language secondary title
  // For summary: show Thai if available, otherwise show English (don't hide content)
  const summaryText = showThai ? (thaiSummary || item.summary) : item.summary;
  const hasImage = item.imageUrl && !imgError;

  // Determine if this is an X/Twitter source
  const isXSource = item.source.toLowerCase() === 'x' || item.source.toLowerCase() === 'twitter';

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.25 }}
      onClick={handleCardClick}
      className={`glass-card rounded-lg overflow-hidden transition-all cursor-pointer hover:shadow-md hover:border-primary/20 ${isRead ? 'opacity-60' : ''} ${isXSource ? 'border-l-[3px] border-l-blue-400' : ''}`}
    >
      <div className={`${compact ? 'p-3' : 'p-4'} flex gap-3`}>
        {/* Text content — dominant */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Badges row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${categoryColors[item.category] || 'bg-secondary text-secondary-foreground'}`}>
              {item.category === 'tech-stocks' ? 'Tech' : item.category}
            </span>
            {isXSource && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/10 text-blue-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                𝕏 Signal
              </span>
            )}
            {item.subtopic && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">{item.subtopic}</span>
            )}
            {item.badges?.slice(0, 2).map(badge => (
              <span key={badge} className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeStyles[badge]}`}>{badge}</span>
            ))}
          </div>

          {/* Headline */}
          <h3 className={`font-display ${compact ? 'text-[14px]' : 'text-[16px]'} leading-snug font-medium text-foreground`}>
            {displayTitle}
          </h3>

          {secondaryTitle && !compact && (
            <p className="text-[11px] text-muted-foreground/60 leading-snug truncate">{secondaryTitle}</p>
          )}

          {!compact && (
            <p className="text-[12px] leading-relaxed text-muted-foreground line-clamp-2">{summaryText}</p>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">{item.source}</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {timeAgo}
            </span>
            {item.marketDirection && directionIcon[item.marketDirection]}
            {item.impactLevel === 'high' && (
              <span className="text-[9px] font-bold text-amber-600 uppercase">⚡</span>
            )}
            <div className="ml-auto flex items-center gap-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSave(item.id); }}
                className="rounded-full p-1 transition-colors hover:bg-secondary"
                aria-label={saved ? 'Unsave' : 'Save'}
              >
                {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              {onMuteSource && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMuteSource(item.source); }}
                  className="rounded-full p-1 transition-colors hover:bg-secondary"
                  aria-label={`Mute ${item.source}`}
                >
                  <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
              <ExternalLink className="h-3 w-3 text-muted-foreground/40 ml-0.5" />
            </div>
          </div>
        </div>

        {/* Side thumbnail */}
        {hasImage && (
          <div className={`shrink-0 ${compact ? 'w-14 h-14' : 'w-20 h-20'} rounded-lg overflow-hidden bg-muted`}>
            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} loading="lazy" />
          </div>
        )}
      </div>
    </motion.article>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
