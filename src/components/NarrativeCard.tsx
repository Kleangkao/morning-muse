import { Narrative } from '@/lib/types';
import { motion } from 'framer-motion';
import { TrendingUp, Flame, Eye } from 'lucide-react';
import { Language, t } from '@/hooks/useLanguage';

interface Props {
  narratives: Narrative[];
  lang: Language;
}

const momentumConfig = {
  'Hot': { icon: Flame, color: 'text-red-600 bg-red-500/10', label: 'Hot' },
  'Rising': { icon: TrendingUp, color: 'text-emerald-600 bg-emerald-500/10', label: 'Rising' },
  'Watchlist': { icon: Eye, color: 'text-amber-600 bg-amber-500/10', label: 'Watch' },
};

const categoryColors: Record<string, string> = {
  ai: 'border-l-blue-500',
  crypto: 'border-l-amber-500',
  investment: 'border-l-emerald-500',
  macro: 'border-l-violet-500',
  'tech-stocks': 'border-l-cyan-500',
  commodities: 'border-l-orange-500',
};

export default function NarrativeCard({ narratives, lang }: Props) {
  if (!narratives.length) return null;
  const tr = t(lang);

  return (
    <section>
      <h2 className="font-display text-xl mb-3">{tr.emergingNarratives}</h2>
      <div className="space-y-2">
        {narratives.map((n, i) => {
          const m = momentumConfig[n.momentum];
          const Icon = m.icon;
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card rounded-lg border-l-[3px] ${categoryColors[n.category] || ''} p-3`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display text-[15px] font-medium text-foreground truncate">{n.title}</h3>
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${m.color}`}>
                      <Icon className="h-3 w-3" />
                      {m.label}
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">{n.whyItMatters}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {n.articleCount} {tr.articles}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {n.category}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
