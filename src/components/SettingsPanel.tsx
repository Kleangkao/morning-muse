import { UserPreferences, TOPIC_CONFIG, ALL_SOURCES, TopicCategory } from '@/lib/types';
import { X, Plus, Volume2, VolumeX, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  prefs: UserPreferences;
  setPrefs: (u: Partial<UserPreferences> | ((p: UserPreferences) => UserPreferences)) => void;
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ prefs, setPrefs, open, onClose }: Props) {
  const [keyword, setKeyword] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>('topics');

  const toggleInterest = (id: TopicCategory) => {
    setPrefs(p => ({
      ...p,
      interests: p.interests.includes(id) ? p.interests.filter(i => i !== id) : [...p.interests, id],
    }));
  };

  const toggleSource = (s: string) => {
    setPrefs(p => ({
      ...p,
      sources: p.sources.includes(s) ? p.sources.filter(x => x !== s) : [...p.sources, s],
    }));
  };

  const toggleMutedSource = (s: string) => {
    setPrefs(p => ({
      ...p,
      mutedSources: p.mutedSources.includes(s) ? p.mutedSources.filter(x => x !== s) : [...p.mutedSources, s],
    }));
  };

  const addKeyword = () => {
    const k = keyword.trim();
    if (k && !prefs.customKeywords.includes(k)) {
      setPrefs(p => ({ ...p, customKeywords: [...p.customKeywords, k] }));
    }
    setKeyword('');
  };

  const toggle = (section: string) => setExpandedSection(prev => prev === section ? null : section);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop (mobile) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm lg:hidden"
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-card border-l border-border shadow-2xl overflow-y-auto lg:static lg:z-auto lg:border-l lg:shadow-none lg:max-w-xs"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-4 py-3">
              <h2 className="font-display text-lg">Settings</h2>
              <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary transition-colors lg:hidden">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-1">
              {/* Topics */}
              <AccordionSection title="Topics" id="topics" expanded={expandedSection} onToggle={toggle}>
                <div className="flex flex-wrap gap-1.5">
                  {TOPIC_CONFIG.map(({ id, label, emoji }) => {
                    const selected = prefs.interests.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => toggleInterest(id)}
                        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                          selected ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        {emoji} {label}
                      </button>
                    );
                  })}
                </div>
              </AccordionSection>

              {/* Keywords */}
              <AccordionSection title="Custom Keywords" id="keywords" expanded={expandedSection} onToggle={toggle}>
                <div className="flex gap-1.5 mb-2">
                  <input
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addKeyword()}
                    placeholder="Add keyword…"
                    className="flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button onClick={addKeyword} className="rounded-lg bg-primary p-1.5 text-primary-foreground">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {prefs.customKeywords.map(k => (
                    <span key={k} className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {k}
                      <button onClick={() => setPrefs(p => ({ ...p, customKeywords: p.customKeywords.filter(x => x !== k) }))}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                  {prefs.customKeywords.length === 0 && <span className="text-xs text-muted-foreground">No keywords added</span>}
                </div>
              </AccordionSection>

              {/* Summary Length */}
              <AccordionSection title="Summary Length" id="summary" expanded={expandedSection} onToggle={toggle}>
                <div className="flex gap-1.5">
                  {(['short', 'medium', 'long'] as const).map(len => (
                    <button
                      key={len}
                      onClick={() => setPrefs({ summaryLength: len })}
                      className={`flex-1 rounded-lg border py-1.5 text-xs font-medium capitalize transition-all ${
                        prefs.summaryLength === len ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'
                      }`}
                    >
                      {len}
                    </button>
                  ))}
                </div>
              </AccordionSection>

              {/* Refresh Time */}
              <AccordionSection title="Preferred Update Time" id="time" expanded={expandedSection} onToggle={toggle}>
                <input
                  type="time"
                  value={prefs.morningTime}
                  onChange={e => setPrefs({ morningTime: e.target.value })}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </AccordionSection>

              {/* Sources */}
              <AccordionSection title="Preferred Sources" id="sources" expanded={expandedSection} onToggle={toggle}>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_SOURCES.map(s => {
                    const selected = prefs.sources.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleSource(s)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                          selected ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </AccordionSection>

              {/* Muted Sources */}
              <AccordionSection title="Muted Sources" id="muted" expanded={expandedSection} onToggle={toggle}>
                <div className="space-y-1">
                  {ALL_SOURCES.map(s => {
                    const muted = prefs.mutedSources.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleMutedSource(s)}
                        className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                          muted ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-border text-foreground'
                        }`}
                      >
                        <span>{s}</span>
                        {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    );
                  })}
                </div>
              </AccordionSection>
            </div>

            <div className="px-4 pb-6 pt-2 flex items-center gap-4 text-xs text-muted-foreground border-t border-border/50 mt-2">
              <a href="/terms" className="hover:text-foreground underline">Terms of Use</a>
              <a href="/privacy" className="hover:text-foreground underline">Privacy Policy</a>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
        </>
      )}
    </AnimatePresence>
  );
}

function AccordionSection({ title, id, expanded, onToggle, children }: {
  title: string; id: string; expanded: string | null; onToggle: (id: string) => void; children: React.ReactNode;
}) {
  const isOpen = expanded === id;
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between py-3 text-sm font-semibold text-foreground"
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
