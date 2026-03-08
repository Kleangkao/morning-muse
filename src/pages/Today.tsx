import { useMemo } from 'react';
import { demoNews } from '@/lib/demo-data';
import { UserPreferences, Interest } from '@/lib/types';
import NewsCard from '@/components/NewsCard';
import BottomNav from '@/components/BottomNav';
import { Sun } from 'lucide-react';

interface Props {
  prefs: UserPreferences;
  saved: string[];
  onToggleSave: (id: string) => void;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayPage({ prefs, saved, onToggleSave }: Props) {
  const filtered = useMemo(() => {
    if (prefs.interests.length === 0) return demoNews;
    return demoNews.filter(n => prefs.interests.includes(n.category as Interest));
  }, [prefs.interests]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Sun className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-primary">Morning Feed</span>
        </div>
        <h1 className="text-2xl font-display">{getGreeting()}</h1>
        <p className="text-sm text-muted-foreground">{today} · {filtered.length} stories</p>
      </header>

      <main className="px-4 py-4 space-y-3 max-w-lg mx-auto">
        {filtered.map((item, i) => (
          <NewsCard
            key={item.id}
            item={item}
            saved={saved.includes(item.id)}
            onToggleSave={onToggleSave}
            index={i}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-display">No stories yet</p>
            <p className="text-sm mt-1">Update your interests in Settings.</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
