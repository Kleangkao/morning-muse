import { useMemo, useState } from 'react';
import { UserPreferences, TopicCategory, NewsItem, Narrative } from '@/lib/types';
import { useNews } from '@/hooks/useNews';
import { demoNarratives } from '@/lib/demo-data';
import NewsCard from '@/components/NewsCard';
import NarrativeCard from '@/components/NarrativeCard';
import DashboardHeader from '@/components/DashboardHeader';
import SettingsPanel from '@/components/SettingsPanel';
import { Zap, Search, X, RefreshCw, Wifi, WifiOff, Settings, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  prefs: UserPreferences;
  setPrefs: (u: Partial<UserPreferences> | ((p: UserPreferences) => UserPreferences)) => void;
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
  { id: 'macro', label: '🌍 Macro' },
  { id: 'tech-stocks', label: '💻 Tech' },
  { id: 'commodities', label: '🪙 Commodities' },
];

function formatLastUpdated(iso: string | null): string {
  if (!iso) return 'Demo data';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard({ prefs, setPrefs, saved, read, onToggleSave, onToggleRead, onMuteSource }: Props) {
  const [activeFilter, setActiveFilter] = useState<TopicCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { articles: liveArticles, isLoading, lastUpdated, isLive, refresh } = useNews(prefs);
  const navigate = useNavigate();

  const articles = useMemo(() => {
    return liveArticles.filter(n => {
      if (activeFilter !== 'all' && n.category !== activeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q) || n.source.toLowerCase().includes(q) || (n.subtopic?.toLowerCase().includes(q) ?? false);
      }
      return true;
    });
  }, [liveArticles, activeFilter, search]);

  // Signal vs Noise: sort by signalScore desc, filter out low signal
  const signalArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => (b.signalScore ?? 50) - (a.signalScore ?? 50));
  }, [articles]);

  const topSignals = signalArticles.filter(a => a.isTopSignal).slice(0, 6);
  const highSignal = signalArticles.filter(a => (a.signalScore ?? 50) >= 65 && !a.isTopSignal);
  const lowSignal = signalArticles.filter(a => (a.signalScore ?? 50) < 65 && !a.isTopSignal);

  // Dashboard stats
  const unreadCount = articles.filter(a => !read.includes(a.id)).length;
  const highImpactCount = articles.filter(a => a.impactLevel === 'high').length;
  const hottestNarrative = demoNarratives.find(n => n.momentum === 'Hot')?.title ?? '';
  const categoryCounts = articles.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {});
  const strongestCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Category sections for "all" filter
  const categoryOrder: TopicCategory[] = ['ai', 'crypto', 'investment', 'macro', 'tech-stocks', 'commodities'];
  const categoryLabels: Record<string, string> = {
    ai: '🤖 AI', crypto: '₿ Crypto', investment: '📈 Investment',
    macro: '🌍 Macro', 'tech-stocks': '💻 Tech Stocks', commodities: '🪙 Commodities',
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="text-sm font-bold text-primary tracking-wide">Alpha Intelligence</span>
                {isLive ? <Wifi className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3 text-muted-foreground" />}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={refresh} disabled={isLoading} className="rounded-full p-2 hover:bg-secondary transition-colors" aria-label="Refresh">
                  <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setShowSearch(!showSearch)} className="rounded-full p-2 hover:bg-secondary transition-colors">
                  {showSearch ? <X className="h-4 w-4 text-foreground" /> : <Search className="h-4 w-4 text-muted-foreground" />}
                </button>
                <button onClick={() => navigate('/saved')} className="rounded-full p-2 hover:bg-secondary transition-colors" aria-label="Saved">
                  <Bookmark className="h-4 w-4 text-muted-foreground" />
                </button>
                <button onClick={() => setSettingsOpen(true)} className="rounded-full p-2 hover:bg-secondary transition-colors" aria-label="Settings">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {today} · {unreadCount} unread · Updated {formatLastUpdated(lastUpdated)}
            </p>

            {showSearch && (
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search headlines, sources, topics…"
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            )}
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-none">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
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

        <main className="px-4 py-4 max-w-2xl mx-auto space-y-5">
          {isLoading && (
            <div className="text-center py-4">
              <RefreshCw className="h-5 w-5 text-primary animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Fetching intelligence…</p>
            </div>
          )}

          {/* Dashboard Stats */}
          <DashboardHeader
            articles={articles}
            narratives={demoNarratives}
            newCount={unreadCount}
            highImpactCount={highImpactCount}
            hottestNarrative={hottestNarrative}
            strongestCategory={categoryLabels[strongestCategory] || strongestCategory}
            lastUpdated={lastUpdated}
            isLive={isLive}
          />

          {activeFilter === 'all' ? (
            <>
              {/* Top Signals */}
              {topSignals.length > 0 && (
                <FeedSection title="⚡ Live Alpha Feed" items={topSignals} saved={saved} read={read} onToggleSave={onToggleSave} onToggleRead={onToggleRead} onMuteSource={onMuteSource} />
              )}

              {/* Emerging Narratives */}
              <NarrativeCard narratives={demoNarratives} />

              {/* High Signal */}
              {highSignal.length > 0 && (
                <FeedSection title="📡 High Signal" items={highSignal} saved={saved} read={read} onToggleSave={onToggleSave} onToggleRead={onToggleRead} onMuteSource={onMuteSource} />
              )}

              {/* Category sections */}
              {categoryOrder.map(cat => {
                const catItems = highSignal.concat(lowSignal).filter(a => a.category === cat);
                if (catItems.length === 0) return null;
                return (
                  <FeedSection key={cat} title={categoryLabels[cat]} items={catItems.slice(0, 5)} saved={saved} read={read} onToggleSave={onToggleSave} onToggleRead={onToggleRead} onMuteSource={onMuteSource} />
                );
              })}

              {/* Low Signal / Noise */}
              {lowSignal.length > 0 && (
                <section>
                  <h2 className="font-display text-lg mb-2 text-muted-foreground">📉 Lower Signal</h2>
                  <div className="space-y-2">
                    {lowSignal.map((item, i) => (
                      <NewsCard key={item.id} item={item} saved={saved.includes(item.id)} isRead={read.includes(item.id)} onToggleSave={onToggleSave} onToggleRead={onToggleRead} onMuteSource={onMuteSource} index={i} compact />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="space-y-2">
              {signalArticles.map((item, i) => (
                <NewsCard key={item.id} item={item} saved={saved.includes(item.id)} isRead={read.includes(item.id)} onToggleSave={onToggleSave} onToggleRead={onToggleRead} onMuteSource={onMuteSource} index={i} />
              ))}
            </div>
          )}

          {articles.length === 0 && !isLoading && (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg font-display">No results</p>
              <p className="text-sm mt-1">{search ? 'Try a different search.' : 'Adjust your filters in Settings.'}</p>
            </div>
          )}
        </main>
      </div>

      {/* Settings Panel */}
      <SettingsPanel prefs={prefs} setPrefs={setPrefs} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function FeedSection({ title, items, saved, read, onToggleSave, onToggleRead, onMuteSource }: {
  title: string;
  items: NewsItem[];
  saved: string[];
  read: string[];
  onToggleSave: (id: string) => void;
  onToggleRead: (id: string) => void;
  onMuteSource: (source: string) => void;
}) {
  return (
    <section>
      <h2 className="font-display text-xl mb-2">{title}</h2>
      <div className="space-y-2">
        {items.map((item, i) => (
          <NewsCard key={item.id} item={item} saved={saved.includes(item.id)} isRead={read.includes(item.id)} onToggleSave={onToggleSave} onToggleRead={onToggleRead} onMuteSource={onMuteSource} index={i} />
        ))}
      </div>
    </section>
  );
}
