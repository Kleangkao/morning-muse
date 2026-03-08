import { NewsItem } from '@/lib/types';
import { Zap, TrendingUp, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Language, t } from '@/hooks/useLanguage';

interface Props {
  articles: NewsItem[];
  newCount: number;
  highImpactCount: number;
  strongestCategory: string;
  lastUpdated: string | null;
  isLive: boolean;
  lang: Language;
}

export default function DashboardHeader({
  newCount, highImpactCount, strongestCategory, lang,
}: Props) {
  const tr = t(lang);
  const stats = [
    { icon: Zap, label: tr.new, value: newCount, color: 'text-primary' },
    { icon: TrendingUp, label: tr.highImpact, value: highImpactCount, color: 'text-amber-500' },
    { icon: BarChart3, label: tr.strongest, value: strongestCategory, color: 'text-emerald-500' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="glass-card rounded-xl p-4"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
            <span className="text-[11px] font-medium text-muted-foreground tracking-wide">{s.label}</span>
          </div>
          <p className="text-base font-semibold text-foreground truncate">
            {typeof s.value === 'number' ? s.value : s.value || '—'}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
