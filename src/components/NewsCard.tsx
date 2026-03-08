import { NewsItem } from '@/lib/types';
import { Bookmark, BookmarkCheck, Clock, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  item: NewsItem;
  saved: boolean;
  onToggleSave: (id: string) => void;
  index?: number;
}

const categoryColors: Record<string, string> = {
  ai: 'bg-blue-100 text-blue-700',
  crypto: 'bg-amber-100 text-amber-700',
  gaming: 'bg-purple-100 text-purple-700',
  startups: 'bg-emerald-100 text-emerald-700',
  productivity: 'bg-rose-100 text-rose-700',
};

export default function NewsCard({ item, saved, onToggleSave, index = 0 }: Props) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className="glass-card rounded-lg overflow-hidden"
    >
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${categoryColors[item.category] || 'bg-secondary text-secondary-foreground'}`}>
            {item.category}
          </span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {item.readTime} min
          </div>
        </div>

        <h3 className="font-display text-lg leading-snug font-medium text-foreground">
          {item.title}
        </h3>

        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {item.summary}
        </p>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-medium text-muted-foreground">
            {item.source}
          </span>
          <div className="flex items-center gap-2">
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
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full p-1.5 transition-colors hover:bg-secondary"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
