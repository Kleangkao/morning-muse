import { useState, useRef, useCallback, useEffect } from 'react';
import { Language, t } from '@/hooks/useLanguage';
import { Send, X, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface Props {
  lang: Language;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const EXAMPLE_QUESTIONS = {
  en: [
    "Summarize crypto news from the last 16 hours",
    "BTC price now",
    "What happened in AI today?",
    "Why is BTC going up?",
    "What is a prediction market?",
    "What are the biggest market narratives?",
  ],
  th: [
    "สรุปข่าวคริปโต 16 ชั่วโมงที่ผ่านมา",
    "ราคา BTC ตอนนี้เท่าไหร่",
    "ข่าว AI วันนี้มีอะไรบ้าง",
    "ทำไม BTC ถึงขึ้น?",
    "Prediction market คืออะไร?",
    "อะไรคือ narrative ตลาดตอนนี้",
  ],
};

let msgCounter = 0;
function genId() { return `msg-${Date.now()}-${++msgCounter}`; }

export default function AskAlice({ lang }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleAsk = useCallback(async (q?: string) => {
    const question = (q || input).trim();
    if (!question || isStreaming) return;

    setInput('');

    const userMsg: Message = { id: genId(), role: 'user', content: question };
    const assistantMsg: Message = { id: genId(), role: 'assistant', content: '' };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const history = messages.map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-alice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ question, lang, history }),
          signal: controller.signal,
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: err.error || 'Something went wrong.' } : m));
        setIsStreaming(false);
        return;
      }

      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await resp.json();
        setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: data.answer || data.error || 'No response' } : m));
        setIsStreaming(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) { setIsStreaming(false); return; }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              const final = accumulated;
              setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: final } : m));
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: 'Error connecting to Alice.' } : m));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, lang, isStreaming, messages]);

  const handleClose = () => {
    abortRef.current?.abort();
    setOpen(false);
    setIsStreaming(false);
  };

  const handleClear = () => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
    setInput('');
  };

  const label = lang === 'th' ? 'ถาม Alice' : 'Ask Alice';

  return (
    <>
      {/* Floating button with Alice character */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-center">
        <motion.img
          src="/images/alice-character.png"
          alt="Alice"
          className="w-16 h-16 object-contain mb-1 pointer-events-none drop-shadow-lg"
          initial={{ y: 0 }}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          whileHover={{ y: -12 }}
        />
        <motion.button
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
          className="flex items-center gap-2.5 rounded-xl bg-foreground px-5 py-3 text-background font-medium shadow-lg hover:shadow-xl transition-all group"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-[13px] tracking-tight">{label}</span>
        </motion.button>
      </div>

      {/* Panel overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/15 backdrop-blur-sm p-3 sm:p-6"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
          >
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-border/60 bg-card shadow-[0_25px_50px_-12px_rgb(0_0_0/0.12)] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                <div className="flex flex-col gap-0.5">
                  <span className="font-display text-lg font-semibold text-foreground tracking-tight">Ask Alice</span>
                  <span className="text-[11px] text-muted-foreground font-light tracking-wide">
                    {lang === 'th' ? 'ผู้ช่วยวิเคราะห์ข่าว AI' : 'AI News Assistant'}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  {messages.length > 0 && (
                    <button
                      onClick={handleClear}
                      className="rounded-lg p-2 hover:bg-secondary transition-colors"
                      title={lang === 'th' ? 'ล้างสนทนา' : 'Clear chat'}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                  <button onClick={handleClose} className="rounded-lg p-2 hover:bg-secondary transition-colors">
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                {messages.length === 0 && !isStreaming && (
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <p className="text-[13px] text-muted-foreground leading-[1.65] font-light">
                        {lang === 'th'
                          ? 'สวัสดีตอนเช้า — ถามเกี่ยวกับข่าว ราคาตลาด หรือเทรนด์การลงทุน'
                          : 'Good morning — ask about news, market prices, or investment trends'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLE_QUESTIONS[lang].map((eq) => (
                        <button
                          key={eq}
                          onClick={() => handleAsk(eq)}
                          className="text-[12px] bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/40 rounded-lg px-3 py-2 transition-all text-left leading-snug font-light"
                        >
                          {eq}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  msg.role === 'user' ? (
                    <div key={msg.id} className="flex justify-end">
                      <div className="bg-foreground text-background rounded-2xl rounded-br-md px-4 py-2.5 text-[13px] max-w-[85%] leading-[1.65]">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex gap-3 items-start">
                      <div className="shrink-0 w-7 h-7 rounded-lg bg-secondary flex items-center justify-center mt-0.5">
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {msg.content ? (
                          <div className="alice-prose text-[13px] text-foreground leading-[1.7]">
                            <ReactMarkdown
                              components={{
                                h1: ({ children }) => <h3 className="font-display text-[15px] font-semibold text-foreground mt-1 mb-2">{children}</h3>,
                                h2: ({ children }) => <h4 className="font-display text-[14px] font-semibold text-foreground mt-3 mb-1.5">{children}</h4>,
                                h3: ({ children }) => <h4 className="font-display text-[14px] font-semibold text-foreground mt-3 mb-1.5">{children}</h4>,
                                p: ({ children }) => <p className="mb-3 text-foreground/90 leading-[1.7]">{children}</p>,
                                ul: ({ children }) => <ul className="mb-3 space-y-2 list-none pl-0">{children}</ul>,
                                ol: ({ children }) => <ol className="mb-3 space-y-2 list-decimal pl-4">{children}</ol>,
                                li: ({ children }) => (
                                  <li className="text-foreground/85 leading-[1.7] flex gap-2.5 items-baseline">
                                    <span className="shrink-0 w-1 h-1 rounded-full bg-muted-foreground/40 mt-[0.6em]" />
                                    <span>{children}</span>
                                  </li>
                                ),
                                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 decoration-primary/30 hover:decoration-primary/60 transition-colors">{children}</a>,
                                hr: () => <hr className="my-4 border-border/40" />,
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground py-1">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span className="text-[12px] font-light">
                              {lang === 'th' ? 'Alice กำลังวิเคราะห์...' : 'Alice is analyzing...'}
                            </span>
                          </div>
                        )}
                        {isStreaming && msg === messages[messages.length - 1] && msg.content && (
                          <span className="inline-block w-0.5 h-4 bg-foreground/25 animate-pulse rounded-sm ml-0.5" />
                        )}
                      </div>
                    </div>
                  )
                ))}
              </div>

              {/* Input */}
              <div className="border-t border-border/50 px-6 py-4 bg-card">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleAsk(); }}
                  className="flex items-center gap-2.5"
                >
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={lang === 'th' ? 'ถาม Alice เกี่ยวกับข่าวหรือราคาตลาด...' : 'Ask Alice about news or market prices...'}
                    disabled={isStreaming}
                    className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-[13px] outline-none focus:ring-1 focus:ring-ring/30 focus:border-ring/30 disabled:opacity-50 placeholder:text-muted-foreground/50 transition-all font-light"
                  />
                  <button
                    type="submit"
                    disabled={isStreaming || !input.trim()}
                    className="rounded-xl bg-foreground text-background p-3 disabled:opacity-30 hover:bg-foreground/90 transition-colors shrink-0"
                  >
                    {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
