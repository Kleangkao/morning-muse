import { Language } from '@/hooks/useLanguage';
import { NewsItem } from '@/lib/types';
import { motion } from 'framer-motion';
import { ExternalLink, Clock } from 'lucide-react';

interface Props {
  lang: Language;
  xArticles?: NewsItem[];
}

export default function XSignalPlaceholder({ lang, xArticles = [] }: Props) {
  const showThai = lang === 'th';

  // If we have actual X articles, render them
  if (xArticles.length > 0) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">𝕏</span>
          <h2 className="font-display text-lg">{showThai ? 'สัญญาณ X' : 'X Signals'}</h2>
        </div>
        <div className="space-y-2">
          {xArticles.map((item, i) => {
            const handle = extractHandle(item.source);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-lg border border-blue-400/20 bg-blue-500/[0.03] p-3 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/10 text-blue-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                    𝕏 Signal
                  </span>
                  <span className="text-[11px] font-semibold text-foreground">{handle}</span>
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {getTimeAgo(item.publishedAt)}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-foreground/90">{item.title}</p>
                {item.summary && item.summary !== item.title && (
                  <p className="text-[12px] text-muted-foreground line-clamp-2">{item.summary}</p>
                )}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-medium"
                >
                  <ExternalLink className="h-3 w-3" />
                  {showThai ? 'ดูโพสต์ต้นฉบับ' : 'View original post'}
                </a>
              </motion.div>
            );
          })}
        </div>
      </section>
    );
  }

  // Placeholder when no X signals exist
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-dashed border-blue-400/30 bg-blue-500/[0.03] p-4"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg">𝕏</span>
        <h3 className="font-display text-[15px] font-medium text-foreground">
          {showThai ? 'สัญญาณ X' : 'X Signals'}
        </h3>
        <span className="rounded-full bg-blue-500/10 text-blue-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
          {showThai ? 'เร็วๆ นี้' : 'Coming Soon'}
        </span>
      </div>
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        {showThai
          ? 'สัญญาณจาก X/Twitter จากนักวิเคราะห์และผู้มีอิทธิพลในตลาดจะปรากฏที่นี่เมื่อเปิดใช้งานระบบดึงข้อมูล X'
          : 'Real-time signals from key analysts and market influencers on X will appear here once X ingestion is activated.'}
      </p>
    </motion.section>
  );
}

function extractHandle(source: string): string {
  // Source format is "X @handle" or just the handle
  if (source.startsWith('X @')) return source.replace('X ', '');
  if (source.startsWith('@')) return source;
  return `@${source}`;
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
