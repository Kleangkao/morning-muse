import { useMemo, useState } from 'react';
import { UserPreferences, TopicCategory } from '@/lib/types';
import { useNews } from '@/hooks/useNews';
import NewsCard from '@/components/NewsCard';
import BottomNav from '@/components/BottomNav';
import { Sun, Search, X, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface Props {
  prefs: UserPreferences;
  saved: string[];
  read: string[];
  onToggleSave: (id: string) => void;
  onToggleRead: (id: string) => void;
  onMuteSource: (source: string) => void;
}

const FILTER_TABS: { id: TopicCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ai', label: '🤖 AI' },
  { id: 'crypto', label: '₿ Crypto' },
  { id: 'investment', label: '📈 Investment' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatLastUpdated(iso: string | null): string {
  if (!iso) return 'Demo data';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TodayPage({ prefs, saved, read, onToggleSave, onToggleRead, onMuteSource }: Props) {
  const [activeFilter, setActiveFilter] = useState<TopicCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { articles: liveArticles, isLoading, lastUpdated, isLive, refresh } = useNews(prefs);

  const articles = useMemo(() => {
    return liveArticles.filter(n => {
      if (activeFilter !== 'all' && n.category !== activeFilter && !n.isTopSignal) return false;
      if (search) {
        const q = search.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q) || n.source.toLowerCase().includes(q) || (n.subtopic?.toLowerCase().includes(q) ?? false);
      }
      return true;
    });
  }, [liveArticles, activeFilter, search]);

  const topSignals = articles.filter(a => a.isTopSignal);
  const aiArticles = articles.filter(a => a.category === 'ai' && !a.isTopSignal);
  const cryptoArticles = articles.filter(a => a.category === 'crypto' && !a.isTopSignal);
  const investmentArticles = articles.filter(a => a.category === 'investment' && !a.isTopSignal);

  const showSections = activeFilter === 'all';
  const flatList = !showSections ? articles : [];

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const unreadCount = articles.filter(a => !read.includes(a.id)).length;

  return (
    <div className="min-h-screen bg-background safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold text-primary tracking-wide">Morning Feed</span>
              {isLive ? (
                <Wifi className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={refresh}
                disabled={isLoading}
                className="rounded-full p-2 hover:bg-secondary transition-colors"
                aria-label="Refresh news"
              >
                <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setShowSearch(!showSearch)} className="rounded-full p-2 hover:bg-secondary transition-colors">
                {showSearch ? <X className="h-5 w-5 text-foreground" /> : <Search className="h-5 w-5 text-muted-foreground" />}
              </button>
            </div>
          </div>
          <h1 className="text-2xl font-display">{getGreeting()}</h1>
          <p className="text-sm text-muted-foreground">
            {today} · {unreadCount} unread · Updated {formatLastUpdated(lastUpdated)}
          </p>

          {/* Search */}
          {showSearch && (
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search headlines, sources, topics…"
              className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeFilter === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-6">
        {/* Loading indicator */}
        {isLoading && (
          <div className="text-center py-4">
            <RefreshCw className="h-5 w-5 text-primary animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Fetching latest news…</p>
          </div>
        )}

        {showSections ? (
          <>
            {topSignals.length > 0 && (
              <FeedSection title="⚡ Top Signals" items={topSignals} saved={saved} read={read} onToggleSave={onToggleSave} onToggleRead={onToggleRead} onMuteSource={onMuteSource} />
            )}
            {aiArticles.length > 0 && (
              <FeedSection title="🤖 AI" items={aiArticles} saved={saved} read={read} onToggleSave={onToggleSave} onToggleRead={onToggleRead} onMuteSource={onMuteSource} />
            )}
            {cryptoArticles.length > 0 && (
              <FeedSection title="₿ Crypto" items={cryptoArticles} saved={saved} read={read} onToggleSave={onToggleSave} onToggleRead={onToggleRead} onMuteSource={onMuteSource} />
            )}
            {investmentArticles.length > 0 && (
              <FeedSection title="📈 Investment" items={investmentArticles} saved={saved} read={read} onToggleSave={onToggleSave} onToggleRead={onToggleRead} onMuteSource={onMuteSource} />
            )}
          </>
        ) : (
          <div className="space-y-3">
            {flatList.map((item, i) => (
              <NewsCard key={item.id} item={item} saved={saved.includes(item.id)} isRead={read.includes(item.id)} onToggleSave={onToggleSave} onToggleRead={onToggleRead} onMuteSource={onMuteSource} index={i} />
            ))}
          </div>
        )}

        {articles.length === 0 && !isLoading && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-display">No results</p>
            <p className="text-sm mt-1">{search ? 'Try a different search.' : 'Adjust your filters or unmute sources in Settings.'}</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function FeedSection({ title, items, saved, read, onToggleSave, onToggleRead, onMuteSource }: {
  title: string;
  items: import('@/lib/types').NewsItem[];
  saved: string[];
  read: string[];
  onToggleSave: (id: string) => void;
  onToggleRead: (id: string) => void;
  onMuteSource: (source: string) => void;
}) {
  return (
    <section>
      <h2 className="font-display text-xl mb-3 px-1">{title}</h2>
      <div className="space-y-3">
        {items.map((item, i) => (
          <NewsCard key={item.id} item={item} saved={saved.includes(item.id)} isRead={read.includes(item.id)} onToggleSave={onToggleSave} onToggleRead={onToggleRead} onMuteSource={onMuteSource} index={i} />
        ))}
      </div>
    </section>
  );
}
