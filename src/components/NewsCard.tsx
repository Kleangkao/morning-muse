import { NewsItem, SmartBadge } from '@/lib/types';
import { Bookmark, BookmarkCheck, Clock, Check, Circle, VolumeX, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  item: NewsItem;
  saved: boolean;
  isRead: boolean;
  onToggleSave: (id: string) => void;
  onToggleRead: (id: string) => void;
  onMuteSource?: (source: string) => void;
  index?: number;
  compact?: boolean;
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

export default function NewsCard({ item, saved, isRead, onToggleSave, onToggleRead, onMuteSource, index = 0, compact, thaiSummary }: Props) {
  const timeAgo = getTimeAgo(item.publishedAt);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.25 }}
      className={`glass-card rounded-lg overflow-hidden transition-all ${isRead ? 'opacity-50' : ''}`}
    >
      <div className={`${compact ? 'p-3' : 'p-4'} space-y-2`}>
        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${categoryColors[item.category] || 'bg-secondary text-secondary-foreground'}`}>
            {item.category === 'tech-stocks' ? 'Tech' : item.category}
          </span>
          {item.subtopic && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
              {item.subtopic}
            </span>
          )}
          {item.badges?.map(badge => (
            <span key={badge} className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeStyles[badge]}`}>
              {badge}
            </span>
          ))}
          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
        </div>

        {/* Headline */}
        <h3 className={`font-display ${compact ? 'text-[15px]' : 'text-[17px]'} leading-snug font-medium text-foreground`}>
          {item.title}
        </h3>

        {/* Summary */}
        {!compact && (
          <div className="space-y-1">
            {thaiSummary && (
              <p className="text-[13px] leading-relaxed text-foreground/80">
                🇹🇭 {thaiSummary}
              </p>
            )}
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {item.summary}
            </p>
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">
              {item.source} · {item.readTime}m
            </span>
            {item.marketDirection && (
              <span className="flex items-center gap-0.5">
                {directionIcon[item.marketDirection]}
              </span>
            )}
            {item.impactLevel === 'high' && (
              <span className="text-[9px] font-bold text-amber-600 uppercase">⚡ High Impact</span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onToggleRead(item.id)}
              className="rounded-full p-1.5 transition-colors hover:bg-secondary"
              aria-label={isRead ? 'Mark unread' : 'Mark read'}
            >
              {isRead ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            <button
              onClick={() => onToggleSave(item.id)}
              className="rounded-full p-1.5 transition-colors hover:bg-secondary"
              aria-label={saved ? 'Unsave' : 'Save'}
            >
              {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            {onMuteSource && (
              <button
                onClick={() => onMuteSource(item.source)}
                className="rounded-full p-1.5 transition-colors hover:bg-secondary"
                aria-label={`Mute ${item.source}`}
              >
                <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
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
