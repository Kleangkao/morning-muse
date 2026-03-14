import { useMemo, useState } from 'react';
import { UserPreferences, TopicCategory, NewsItem } from '@/lib/types';
import { useNews } from '@/hooks/useNews';
import { Language, t } from '@/hooks/useLanguage';

import NewsCard from '@/components/NewsCard';
import DashboardHeader from '@/components/DashboardHeader';
import SettingsPanel from '@/components/SettingsPanel';
import QuickScan from '@/components/QuickScan';
import ArticleDetailModal from '@/components/ArticleDetailModal';
import XSignalPlaceholder from '@/components/XSignalPlaceholder';
import AskAlice from '@/components/AskAlice';
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
  
  const categoryCounts = articles.reduce<Record<string, number>>((acc, a) => { acc[a.category] = (acc[a.category] || 0) + 1; return acc; }, {});
  const strongestCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

  const today = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const categoryLabels: Record<string, string> = { ai: '🤖 AI', crypto: '₿ Crypto', investment: '📈 Investment', macro: '🌍 Macro', 'tech-stocks': '💻 Tech Stocks', commodities: '🪙 Commodities' };
  const categoryOrder: TopicCategory[] = ['ai', 'crypto', 'investment', 'macro', 'tech-stocks', 'commodities'];

  const handleOpenDetail = (item: NewsItem) => {
    onMarkRead(item.id);
    setDetailItem(item);
  };

  const cardProps = { saved, read, onToggleSave, onMarkRead, onMuteSource, thaiTitles, thaiSummaries, lang, onOpenDetail: handleOpenDetail };

  return (
    <div className="min-h-screen relative flex">
      <div className="fixed inset-0 z-0 bg-background" />
      <div className="relative z-10 flex-1 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/60">
          <div className="px-5 pt-4 pb-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2.5">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground tracking-tight">Alice Daily</span>
                {isLive ? <Wifi className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3 text-muted-foreground" />}
              </div>
              <div className="flex items-center gap-0.5">
                <div className="flex items-center rounded-lg bg-secondary p-0.5 mr-1.5">
                  <button onClick={() => setLang('en')} className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${lang === 'en' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>EN</button>
                  <button onClick={() => setLang('th')} className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${lang === 'th' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>TH</button>
                </div>
                <button onClick={refresh} disabled={isLoading} className="rounded-lg p-2 hover:bg-secondary transition-colors"><RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} /></button>
                <button onClick={() => setShowSearch(!showSearch)} className="rounded-lg p-2 hover:bg-secondary transition-colors">{showSearch ? <X className="h-4 w-4 text-foreground" /> : <Search className="h-4 w-4 text-muted-foreground" />}</button>
                <button onClick={() => navigate('/saved')} className="rounded-lg p-2 hover:bg-secondary transition-colors"><Bookmark className="h-4 w-4 text-muted-foreground" /></button>
                <button onClick={() => setSettingsOpen(true)} className="rounded-lg p-2 hover:bg-secondary transition-colors"><Settings className="h-4 w-4 text-muted-foreground" /></button>
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground font-light">{today} · {unreadCount} {tr.unread} · {tr.updated} {formatLastUpdated(lastUpdated, lang)}</p>
            {showSearch && (
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder={tr.searchPlaceholder}
                className="mt-3 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30 transition-all" />
            )}
          </div>
          <div className="flex gap-2 px-5 pb-3 overflow-x-auto scrollbar-none">
            {FILTER_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveFilter(tab.id)}
                className={`shrink-0 rounded-lg px-3.5 py-1.5 text-[12px] font-medium transition-all ${activeFilter === tab.id ? 'bg-foreground text-background' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
                {tab.id === 'all' ? tr.allFilter : tab.label}
              </button>
            ))}
          </div>
        </header>

        <main className="px-5 py-5 max-w-2xl mx-auto space-y-6">
          {isLoading && (
            <div className="text-center py-6">
              <RefreshCw className="h-5 w-5 text-primary animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-light">{tr.fetchingIntelligence}</p>
            </div>
          )}

          <DashboardHeader articles={articles} newCount={unreadCount} highImpactCount={highImpactCount}
            strongestCategory={categoryLabels[strongestCategory] || strongestCategory} lastUpdated={lastUpdated} isLive={isLive} lang={lang} />

          {activeFilter === 'all' && <QuickScan articles={articles} narratives={liveNarratives} lang={lang} />}

          {activeFilter === 'all' ? (
            <>
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
                  <h2 className="font-display text-lg font-semibold mb-3 text-muted-foreground tracking-[-0.01em]">{tr.lowerSignal}</h2>
                  <div className="space-y-3">
                    {lowSignal.map((item, i) => (
                      <NewsCard key={item.id} item={item} saved={saved.includes(item.id)} isRead={read.includes(item.id)} onToggleSave={onToggleSave} onMarkRead={onMarkRead} onMuteSource={onMuteSource} onOpenDetail={handleOpenDetail} index={i} compact lang={lang} thaiTitle={thaiTitles[item.id]} thaiSummary={thaiSummaries[item.id]} />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {signalArticles.map((item, i) => (
                <NewsCard key={item.id} item={item} saved={saved.includes(item.id)} isRead={read.includes(item.id)} onToggleSave={onToggleSave} onMarkRead={onMarkRead} onMuteSource={onMuteSource} onOpenDetail={handleOpenDetail} index={i} lang={lang} thaiTitle={thaiTitles[item.id]} thaiSummary={thaiSummaries[item.id]} />
              ))}
            </div>
          )}

          {articles.length === 0 && !isLoading && (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg font-display font-semibold">{tr.noResults}</p>
              <p className="text-sm mt-2 font-light">{search ? tr.tryDifferentSearch : tr.adjustFilters}</p>
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

function FeedSection({ title, items, saved, read, onToggleSave, onMarkRead, onMuteSource, thaiTitles, thaiSummaries, lang, onOpenDetail }: {
  title: string; items: NewsItem[]; saved: string[]; read: string[];
  onToggleSave: (id: string) => void; onMarkRead: (id: string) => void; onMuteSource: (source: string) => void;
  onOpenDetail: (item: NewsItem) => void;
  thaiTitles?: Record<string, string>; thaiSummaries?: Record<string, string>; lang?: Language;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold mb-3 tracking-[-0.02em]">{title}</h2>
      <div className="space-y-3">
        {items.map((item, i) => (
          <NewsCard key={item.id} item={item} saved={saved.includes(item.id)} isRead={read.includes(item.id)} onToggleSave={onToggleSave} onMarkRead={onMarkRead} onMuteSource={onMuteSource} onOpenDetail={onOpenDetail} index={i} lang={lang || 'en'} thaiTitle={thaiTitles?.[item.id]} thaiSummary={thaiSummaries?.[item.id]} />
        ))}
      </div>
    </section>
  );
}
