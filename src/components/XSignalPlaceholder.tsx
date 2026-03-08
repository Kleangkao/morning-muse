import { Language } from '@/hooks/useLanguage';
import { motion } from 'framer-motion';

interface Props {
  lang: Language;
}

export default function XSignalPlaceholder({ lang }: Props) {
  const showThai = lang === 'th';

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
