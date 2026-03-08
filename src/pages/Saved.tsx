import { demoNews } from '@/lib/demo-data';
import NewsCard from '@/components/NewsCard';
import BottomNav from '@/components/BottomNav';
import { Bookmark } from 'lucide-react';

interface Props {
  saved: string[];
  read: string[];
  onToggleSave: (id: string) => void;
  onToggleRead: (id: string) => void;
}

export default function SavedPage({ saved, read, onToggleSave, onToggleRead }: Props) {
  const items = demoNews.filter(n => saved.includes(n.id));

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50 px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Bookmark className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold text-primary">Morning Feed</span>
        </div>
        <h1 className="text-2xl font-display">Saved</h1>
        <p className="text-sm text-muted-foreground">{items.length} article{items.length !== 1 ? 's' : ''}</p>
      </header>

      <main className="px-4 py-4 space-y-3 max-w-lg mx-auto">
        {items.map((item, i) => (
          <NewsCard
            key={item.id}
            item={item}
            saved={true}
            isRead={read.includes(item.id)}
            onToggleSave={onToggleSave}
            onToggleRead={onToggleRead}
            index={i}
          />
        ))}
        {items.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-display">Nothing saved yet</p>
            <p className="text-sm mt-1">Bookmark articles from your feed.</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
