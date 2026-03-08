import { NewsItem } from '@/lib/types';
import { Bookmark, BookmarkCheck, Clock, ExternalLink, Check, Circle, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  item: NewsItem;
  saved: boolean;
  isRead: boolean;
  onToggleSave: (id: string) => void;
  onToggleRead: (id: string) => void;
  onMuteSource?: (source: string) => void;
  index?: number;
}

const categoryColors: Record<string, string> = {
  ai: 'bg-blue-100 text-blue-700',
  crypto: 'bg-amber-100 text-amber-700',
  investment: 'bg-emerald-100 text-emerald-700',
  'top-signals': 'bg-rose-100 text-rose-700',
};

export default function NewsCard({ item, saved, isRead, onToggleSave, onToggleRead, onMuteSource, index = 0 }: Props) {
  const timeAgo = getTimeAgo(item.publishedAt);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className={`glass-card rounded-lg overflow-hidden transition-opacity ${isRead ? 'opacity-60' : ''}`}
    >
      <div className="p-4 space-y-2.5">
        {/* Top row: tags + time */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${categoryColors[item.category] || 'bg-secondary text-secondary-foreground'}`}>
            {item.category === 'top-signals' ? 'Signal' : item.category}
          </span>
          {item.subtopic && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
              {item.subtopic}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground whitespace-nowrap">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
        </div>

        {/* Headline */}
        <h3 className="font-display text-[17px] leading-snug font-medium text-foreground">
          {item.title}
        </h3>

        {/* Summary */}
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {item.summary}
        </p>

        {/* Bottom row */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
            {item.source} · {item.readTime} min
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleRead(item.id)}
              className="rounded-full p-1.5 transition-colors hover:bg-secondary"
              aria-label={isRead ? 'Mark unread' : 'Mark read'}
              title={isRead ? 'Mark unread' : 'Mark read'}
            >
              {isRead ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={() => onToggleSave(item.id)}
              className="rounded-full p-1.5 transition-colors hover:bg-secondary"
              aria-label={saved ? 'Unsave' : 'Save'}
            >
              {saved ? (
                <BookmarkCheck className="h-4 w-4 text-primary" />
              ) : (
                <Bookmark className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {onMuteSource && (
              <button
                onClick={() => onMuteSource(item.source)}
                className="rounded-full p-1.5 transition-colors hover:bg-secondary"
                aria-label="Mute source"
                title={`Mute ${item.source}`}
              >
                <VolumeX className="h-4 w-4 text-muted-foreground" />
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
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
