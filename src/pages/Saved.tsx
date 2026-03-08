import { useState } from 'react';
import { useNews } from '@/hooks/useNews';
import { usePreferences } from '@/hooks/usePreferences';
import { NewsItem } from '@/lib/types';
import NewsCard from '@/components/NewsCard';
import ArticleDetailModal from '@/components/ArticleDetailModal';
import { Bookmark, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Language, t } from '@/hooks/useLanguage';

interface Props {
  saved: string[];
  read: string[];
  onToggleSave: (id: string) => void;
  onMarkRead: (id: string) => void;
  lang: Language;
}

export default function SavedPage({ saved, read, onToggleSave, onMarkRead, lang }: Props) {
  const { prefs } = usePreferences();
  const { articles, thaiTitles, thaiSummaries } = useNews(prefs);
  const navigate = useNavigate();
  const [detailItem, setDetailItem] = useState<NewsItem | null>(null);
  const items = articles.filter(n => saved.includes(n.id));
  const tr = t(lang);
  const showThai = lang === 'th';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="rounded-full p-1.5 hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-primary" />
              <h1 className="text-xl font-display">{tr.saved}</h1>
            </div>
            <p className="text-[11px] text-muted-foreground">{items.length} {tr.articles}</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-2 max-w-2xl mx-auto">
        {items.map((item, i) => (
          <NewsCard key={item.id} item={item} saved={true} isRead={read.includes(item.id)} onToggleSave={onToggleSave} onMarkRead={onMarkRead} onOpenDetail={setDetailItem} index={i} lang={lang} thaiTitle={thaiTitles[item.id]} thaiSummary={thaiSummaries[item.id]} />
        ))}
        {items.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-display">{tr.nothingSaved}</p>
            <p className="text-sm mt-1">{tr.bookmarkFromFeed}</p>
          </div>
        )}
      </main>

      <ArticleDetailModal item={detailItem} open={!!detailItem} onClose={() => setDetailItem(null)} lang={lang}
        thaiTitle={detailItem ? thaiTitles[detailItem.id] : undefined} thaiSummary={detailItem ? thaiSummaries[detailItem.id] : undefined} />
    </div>
  );
}
