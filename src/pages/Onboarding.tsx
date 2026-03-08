import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPreferences, Interest, DEFAULT_INTERESTS, DEFAULT_SOURCES } from '@/lib/types';
import { ChevronRight, ChevronLeft, Plus, X } from 'lucide-react';

interface Props {
  prefs: UserPreferences;
  setPrefs: (u: Partial<UserPreferences> | ((p: UserPreferences) => UserPreferences)) => void;
}

export default function OnboardingPage({ prefs, setPrefs }: Props) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');

  const steps = ['Interests', 'Keywords', 'Sources', 'Schedule'];

  const toggleInterest = (id: Interest) => {
    setPrefs(p => ({
      ...p,
      interests: p.interests.includes(id) ? p.interests.filter(i => i !== id) : [...p.interests, id],
    }));
  };

  const addKeyword = () => {
    const k = keyword.trim();
    if (k && !prefs.customKeywords.includes(k)) {
      setPrefs(p => ({ ...p, customKeywords: [...p.customKeywords, k] }));
    }
    setKeyword('');
  };

  const toggleSource = (s: string) => {
    setPrefs(p => ({
      ...p,
      sources: p.sources.includes(s) ? p.sources.filter(x => x !== s) : [...p.sources, s],
    }));
  };

  const finish = () => {
    setPrefs({ onboardingComplete: true });
    navigate('/');
  };

  const canNext = step === 0 ? prefs.interests.length > 0 : true;

  return (
    <div className="flex min-h-screen flex-col bg-background px-5 py-8">
      {/* Progress */}
      <div className="flex gap-1.5 mb-8">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
          className="flex-1"
        >
          {step === 0 && (
            <div>
              <h1 className="text-3xl font-display mb-2">What are you into?</h1>
              <p className="text-muted-foreground mb-6">Pick topics for your morning feed.</p>
              <div className="grid grid-cols-2 gap-3">
                {DEFAULT_INTERESTS.map(({ id, label, emoji }) => {
                  const selected = prefs.interests.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => toggleInterest(id)}
                      className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                        selected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <span className="text-2xl">{emoji}</span>
                      <span className="font-medium">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="text-3xl font-display mb-2">Custom keywords</h1>
              <p className="text-muted-foreground mb-6">Add specific topics you care about.</p>
              <div className="flex gap-2 mb-4">
                <input
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addKeyword()}
                  placeholder="e.g. Figma, Solana, Rust…"
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button onClick={addKeyword} className="rounded-lg bg-primary p-2.5 text-primary-foreground">
                  <Plus className="h-5 w-5" />
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
              {prefs.customKeywords.length === 0 && (
                <p className="text-sm text-muted-foreground mt-4">This is optional — skip if you like.</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-3xl font-display mb-2">Preferred sources</h1>
              <p className="text-muted-foreground mb-6">We'll prioritize these in your feed.</p>
              <div className="space-y-2">
                {DEFAULT_SOURCES.map(s => {
                  const selected = prefs.sources.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSource(s)}
                      className={`w-full rounded-lg border-2 p-3 text-left text-sm font-medium transition-all ${
                        selected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="text-3xl font-display mb-2">Morning time</h1>
              <p className="text-muted-foreground mb-6">When should your feed be ready?</p>
              <input
                type="time"
                value={prefs.morningTime}
                onChange={e => setPrefs({ morningTime: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-sm text-muted-foreground mt-3">We'll have your personalized feed ready by this time.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6">
        {step > 0 ? (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        ) : <div />}

        {step < 3 ? (
          <button
            onClick={() => canNext && setStep(s => s + 1)}
            disabled={!canNext}
            className="flex items-center gap-1 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={finish}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Start Reading ☀️
          </button>
        )}
      </div>
    </div>
  );
}
