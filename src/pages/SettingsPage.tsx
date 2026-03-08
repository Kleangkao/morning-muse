import { UserPreferences, TopicCategory, TOPIC_CONFIG, ALL_SOURCES } from '@/lib/types';
import BottomNav from '@/components/BottomNav';
import { Settings as SettingsIcon, Plus, X, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';

interface Props {
  prefs: UserPreferences;
  setPrefs: (u: Partial<UserPreferences> | ((p: UserPreferences) => UserPreferences)) => void;
}

export default function SettingsPage({ prefs, setPrefs }: Props) {
  const [keyword, setKeyword] = useState('');

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

  const resetOnboarding = () => {
    localStorage.removeItem('morning-feed-prefs');
    localStorage.removeItem('morning-feed-saved');
    localStorage.removeItem('morning-feed-read');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50 px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold text-primary">Morning Feed</span>
        </div>
        <h1 className="text-2xl font-display">Settings</h1>
      </header>

      <main className="px-5 py-6 space-y-8 max-w-lg mx-auto">
        {/* Topics */}
        <section>
          <h2 className="text-lg font-display mb-3">Topics</h2>
          <div className="flex flex-wrap gap-2">
            {TOPIC_CONFIG.map(({ id, label, emoji }) => {
              const selected = prefs.interests.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleInterest(id)}
                  className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-medium transition-all ${
                    selected ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {emoji} {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Keywords */}
        <section>
          <h2 className="text-lg font-display mb-3">Custom keywords</h2>
          <div className="flex gap-2 mb-3">
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addKeyword()}
              placeholder="Add keyword…"
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={addKeyword} className="rounded-lg bg-primary p-2 text-primary-foreground">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {prefs.customKeywords.map(k => (
              <span key={k} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
                {k}
                <button onClick={() => setPrefs(p => ({ ...p, customKeywords: p.customKeywords.filter(x => x !== k) }))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </section>

        {/* Summary length */}
        <section>
          <h2 className="text-lg font-display mb-3">Summary length</h2>
          <div className="flex gap-2">
            {(['short', 'medium', 'long'] as const).map(len => (
              <button
                key={len}
                onClick={() => setPrefs({ summaryLength: len })}
                className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium capitalize transition-all ${
                  prefs.summaryLength === len ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'
                }`}
              >
                {len}
              </button>
            ))}
          </div>
        </section>

        {/* Morning time */}
        <section>
          <h2 className="text-lg font-display mb-3">Preferred update time</h2>
          <input
            type="time"
            value={prefs.morningTime}
            onChange={e => setPrefs({ morningTime: e.target.value })}
            className="rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </section>

        {/* Sources */}
        <section>
          <h2 className="text-lg font-display mb-3">Preferred sources</h2>
          <div className="flex flex-wrap gap-2">
            {ALL_SOURCES.map(s => {
              const selected = prefs.sources.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleSource(s)}
                  className={`rounded-full border-2 px-3 py-1.5 text-sm font-medium transition-all ${
                    selected ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </section>

        {/* Muted sources */}
        <section>
          <h2 className="text-lg font-display mb-3">Muted sources</h2>
          <p className="text-sm text-muted-foreground mb-3">Articles from muted sources won't appear in your feed.</p>
          <div className="space-y-2">
            {ALL_SOURCES.map(s => {
              const muted = prefs.mutedSources.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleMutedSource(s)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                    muted ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-border text-foreground'
                  }`}
                >
                  <span>{s}</span>
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-muted-foreground" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Reset */}
        <section className="pb-4">
          <button
            onClick={resetOnboarding}
            className="flex items-center gap-2 text-sm font-medium text-destructive"
          >
            <RotateCcw className="h-4 w-4" /> Reset & redo onboarding
          </button>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
