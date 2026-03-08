import { useMemo, useState } from 'react';
import { UserPreferences, TopicCategory, NewsItem } from '@/lib/types';
import { useNews } from '@/hooks/useNews';
import { Language, t } from '@/hooks/useLanguage';

import NewsCard from '@/components/NewsCard';
import NarrativeCard from '@/components/NarrativeCard';
import DashboardHeader from '@/components/DashboardHeader';
import SettingsPanel from '@/components/SettingsPanel';
import QuickScan from '@/components/QuickScan';
import ArticleDetailModal from '@/components/ArticleDetailModal';
import XSignalPlaceholder from '@/components/XSignalPlaceholder';
import { Zap, Search, X, RefreshCw, Wifi, WifiOff, Settings, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  prefs: UserPreferences;
  setPrefs: (u: Partial<UserPreferences> | ((p: UserPreferences) => UserPreferences)) => void;
  saved: string[];
  read: string[];
  onToggleSave: (id: string) => void;
  onMarkRead: (id: string) => void;
  onMuteSource: (source: string) => void;
  lang: Language;
  setLang: (l: Language) => void;
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

function formatLastUpdated(iso: string | null, lang: Language): string {
  if (!iso) return t(lang).demoData;
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard({ prefs, setPrefs, saved, read, onToggleSave, onMarkRead, onMuteSource, lang, setLang }: Props) {
  const [activeFilter, setActiveFilter] = useState<TopicCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<NewsItem | null>(null);
  const { articles: liveArticles, narratives: liveNarratives, thaiTitles, thaiSummaries, isLoading, lastUpdated, isLive, refresh } = useNews(prefs);
  const navigate = useNavigate();
  const tr = t(lang);
  const showThai = lang === 'th';

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

  // Separate X signal articles from regular articles (always from full list, then filter by active category)
  const xArticles = useMemo(() => {
    const all = liveArticles.filter(a => a.source.toLowerCase().startsWith('x @'));
    if (activeFilter === 'all') return all;
    return all.filter(a => a.category === activeFilter);
  }, [liveArticles, activeFilter]);
  const regularArticles = useMemo(() => articles.filter(a => !a.source.toLowerCase().startsWith('x @') && a.source.toLowerCase() !== 'x'), [articles]);

  const signalArticles = useMemo(() => [...regularArticles].sort((a, b) => (b.signalScore ?? 50) - (a.signalScore ?? 50)), [regularArticles]);
  const topSignals = signalArticles.filter(a => a.isTopSignal).slice(0, 6);
  const highSignal = signalArticles.filter(a => (a.signalScore ?? 50) >= 65 && !a.isTopSignal);
  const lowSignal = signalArticles.filter(a => (a.signalScore ?? 50) < 65 && !a.isTopSignal);

  const unreadCount = articles.filter(a => !read.includes(a.id)).length;
  const highImpactCount = articles.filter(a => a.impactLevel === 'high').length;
  const categoryNarratives = activeFilter === 'all' ? liveNarratives : liveNarratives.filter(n => n.category === activeFilter);
  const hottestNarrative = categoryNarratives.find(n => n.momentum === 'Hot')?.title ?? categoryNarratives[0]?.title ?? '';
  const categoryCounts = articles.reduce<Record<string, number>>((acc, a) => { acc[a.category] = (acc[a.category] || 0) + 1; return acc; }, {});
  const strongestCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

  const today = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const categoryLabels: Record<string, string> = { ai: '🤖 AI', crypto: '₿ Crypto', investment: '📈 Investment', macro: '🌍 Macro', 'tech-stocks': '💻 Tech Stocks', commodities: '🪙 Commodities' };
  const categoryOrder: TopicCategory[] = ['ai', 'crypto', 'investment', 'macro', 'tech-stocks', 'commodities'];

  const handleOpenDetail = (item: NewsItem) => {
    onMarkRead(item.id);
    setDetailItem(item);
  };

  const cardProps = { saved, read, onToggleSave, onMarkRead, onMuteSource, thaiTitles, thaiSummaries, showThai, onOpenDetail: handleOpenDetail };

  return (
    <div className="min-h-screen bg-background flex">
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
                <div className="flex items-center rounded-full bg-secondary p-0.5 mr-1">
                  <button onClick={() => setLang('en')} className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-all ${lang === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>EN</button>
                  <button onClick={() => setLang('th')} className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-all ${lang === 'th' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>TH</button>
                </div>
                <button onClick={refresh} disabled={isLoading} className="rounded-full p-2 hover:bg-secondary transition-colors"><RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} /></button>
                <button onClick={() => setShowSearch(!showSearch)} className="rounded-full p-2 hover:bg-secondary transition-colors">{showSearch ? <X className="h-4 w-4 text-foreground" /> : <Search className="h-4 w-4 text-muted-foreground" />}</button>
                <button onClick={() => navigate('/saved')} className="rounded-full p-2 hover:bg-secondary transition-colors"><Bookmark className="h-4 w-4 text-muted-foreground" /></button>
                <button onClick={() => setSettingsOpen(true)} className="rounded-full p-2 hover:bg-secondary transition-colors"><Settings className="h-4 w-4 text-muted-foreground" /></button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">{today} · {unreadCount} {tr.unread} · {tr.updated} {formatLastUpdated(lastUpdated, lang)}</p>
            {showSearch && (
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder={tr.searchPlaceholder}
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            )}
          </div>
          <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-none">
            {FILTER_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveFilter(tab.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${activeFilter === tab.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
                {tab.id === 'all' ? tr.allFilter : tab.label}
              </button>
            ))}
          </div>
        </header>

        <main className="px-4 py-4 max-w-2xl mx-auto space-y-5">
          {isLoading && (
            <div className="text-center py-4">
              <RefreshCw className="h-5 w-5 text-primary animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{tr.fetchingIntelligence}</p>
            </div>
          )}

          <DashboardHeader articles={articles} narratives={liveNarratives} newCount={unreadCount} highImpactCount={highImpactCount}
            hottestNarrative={hottestNarrative} strongestCategory={categoryLabels[strongestCategory] || strongestCategory} lastUpdated={lastUpdated} isLive={isLive} lang={lang} />

          {/* Quick Scan — first */}
          {activeFilter === 'all' && <QuickScan articles={articles} narratives={liveNarratives} lang={lang} />}

          {/* X Signals — always visible, filtered by active category */}
          <XSignalPlaceholder lang={lang} xArticles={xArticles} />

          {activeFilter === 'all' ? (
            <>
              {/* Narratives — category-aware */}
              <NarrativeCard narratives={liveNarratives} lang={lang} categoryFilter="all" />

              {/* Live Alpha Feed */}
              {topSignals.length > 0 && (
                <FeedSection title={tr.liveAlphaFeed} items={topSignals} {...cardProps} />
              )}

              {highSignal.length > 0 && (
                <FeedSection title={tr.highSignal} items={highSignal} {...cardProps} />
              )}

              {categoryOrder.map(cat => {
                const catItems = highSignal.concat(lowSignal).filter(a => a.category === cat);
                if (catItems.length === 0) return null;
                return <FeedSection key={cat} title={categoryLabels[cat]} items={catItems.slice(0, 5)} {...cardProps} />;
              })}

              {lowSignal.length > 0 && (
                <section>
                  <h2 className="font-display text-lg mb-2 text-muted-foreground">{tr.lowerSignal}</h2>
                  <div className="space-y-2">
                    {lowSignal.map((item, i) => (
                      <NewsCard key={item.id} item={item} saved={saved.includes(item.id)} isRead={read.includes(item.id)} onToggleSave={onToggleSave} onMarkRead={onMarkRead} onMuteSource={onMuteSource} onOpenDetail={handleOpenDetail} index={i} compact showThai={showThai} thaiTitle={thaiTitles[item.id]} thaiSummary={thaiSummaries[item.id]} />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <>
              {/* Category-filtered narratives — hides if none match */}
              <NarrativeCard narratives={liveNarratives} lang={lang} categoryFilter={activeFilter} />
              <div className="space-y-2">
                {signalArticles.map((item, i) => (
                  <NewsCard key={item.id} item={item} saved={saved.includes(item.id)} isRead={read.includes(item.id)} onToggleSave={onToggleSave} onMarkRead={onMarkRead} onMuteSource={onMuteSource} onOpenDetail={handleOpenDetail} index={i} showThai={showThai} thaiTitle={thaiTitles[item.id]} thaiSummary={thaiSummaries[item.id]} />
                ))}
              </div>
            </>
          )}

          {articles.length === 0 && !isLoading && (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg font-display">{tr.noResults}</p>
              <p className="text-sm mt-1">{search ? tr.tryDifferentSearch : tr.adjustFilters}</p>
            </div>
          )}
        </main>
      </div>

      <SettingsPanel prefs={prefs} setPrefs={setPrefs} open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <ArticleDetailModal
        item={detailItem}
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        lang={lang}
        thaiTitle={detailItem ? thaiTitles[detailItem.id] : undefined}
        thaiSummary={detailItem ? thaiSummaries[detailItem.id] : undefined}
      />
    </div>
  );
}

function FeedSection({ title, items, saved, read, onToggleSave, onMarkRead, onMuteSource, thaiTitles, thaiSummaries, showThai, onOpenDetail }: {
  title: string; items: NewsItem[]; saved: string[]; read: string[];
  onToggleSave: (id: string) => void; onMarkRead: (id: string) => void; onMuteSource: (source: string) => void;
  onOpenDetail: (item: NewsItem) => void;
  thaiTitles?: Record<string, string>; thaiSummaries?: Record<string, string>; showThai?: boolean;
}) {
  return (
    <section>
      <h2 className="font-display text-xl mb-2">{title}</h2>
      <div className="space-y-2">
        {items.map((item, i) => (
          <NewsCard key={item.id} item={item} saved={saved.includes(item.id)} isRead={read.includes(item.id)} onToggleSave={onToggleSave} onMarkRead={onMarkRead} onMuteSource={onMuteSource} onOpenDetail={onOpenDetail} index={i} showThai={showThai} thaiTitle={thaiTitles?.[item.id]} thaiSummary={thaiSummaries?.[item.id]} />
        ))}
      </div>
    </section>
  );
}
