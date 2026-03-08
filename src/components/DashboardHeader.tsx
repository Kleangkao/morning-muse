import { NewsItem, Narrative } from '@/lib/types';
import { Zap, TrendingUp, BarChart3, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { Language, t } from '@/hooks/useLanguage';

interface Props {
  articles: NewsItem[];
  narratives: Narrative[];
  newCount: number;
  highImpactCount: number;
  hottestNarrative: string;
  strongestCategory: string;
  lastUpdated: string | null;
  isLive: boolean;
  lang: Language;
}

export default function DashboardHeader({
  newCount, highImpactCount, hottestNarrative, strongestCategory, lang,
}: Props) {
  const tr = t(lang);
  const stats = [
    { icon: Zap, label: tr.new, value: newCount, color: 'text-primary' },
    { icon: TrendingUp, label: tr.highImpact, value: highImpactCount, color: 'text-amber-600' },
    { icon: Flame, label: tr.hotNarrative, value: hottestNarrative, color: 'text-red-600' },
    { icon: BarChart3, label: tr.strongest, value: strongestCategory, color: 'text-emerald-600' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-card rounded-lg p-3"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</span>
          </div>
          <p className="text-sm font-bold text-foreground truncate">
            {typeof s.value === 'number' ? s.value : s.value || '—'}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
