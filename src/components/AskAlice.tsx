import { useState, useRef, useCallback, useEffect } from 'react';
import { Language, t } from '@/hooks/useLanguage';
import { Bot, Send, X, Sparkles, Loader2, Trash2 } from 'lucide-react';
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
    "What are the biggest market narratives?",
    "ETH price",
  ],
  th: [
    "สรุปข่าวคริปโต 16 ชั่วโมงที่ผ่านมา",
    "ราคา BTC ตอนนี้เท่าไหร่",
    "ข่าว AI วันนี้มีอะไรบ้าง",
    "อะไรคือ narrative ตลาดตอนนี้",
    "ราคา ETH",
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

  // Auto-scroll to bottom when messages change
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

    // Build history from previous messages (not including the current ones)
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

      // Stream SSE
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
      {/* Floating button */}
      <motion.button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-shadow"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Sparkles className="h-5 w-5" />
        {label}
      </motion.button>

      {/* Panel overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <span className="font-display text-lg font-semibold text-foreground">Ask Alice</span>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                    {lang === 'th' ? 'ผู้ช่วยวิเคราะห์' : 'Intelligence'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <button onClick={handleClear} className="rounded-full p-1.5 hover:bg-secondary transition-colors" title={lang === 'th' ? 'ล้างสนทนา' : 'Clear chat'}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                  <button onClick={handleClose} className="rounded-full p-1.5 hover:bg-secondary transition-colors">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 && !isStreaming && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {lang === 'th'
                        ? 'ถามเกี่ยวกับข่าว ราคาตลาด หรือเทรนด์การลงทุน'
                        : 'Ask about news, market prices, or investment trends'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLE_QUESTIONS[lang].map((eq) => (
                        <button
                          key={eq}
                          onClick={() => handleAsk(eq)}
                          className="text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full px-3 py-1.5 transition-colors text-left"
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
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3 py-2 text-sm max-w-[85%]">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex gap-2 items-start">
                      <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1 bg-secondary/40 rounded-2xl rounded-tl-sm px-4 py-3">
                        {msg.content ? (
                          <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-headings:font-display prose-a:text-primary prose-strong:text-foreground prose-li:text-foreground">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {lang === 'th' ? 'Alice กำลังวิเคราะห์...' : 'Alice is analyzing...'}
                          </div>
                        )}
                        {isStreaming && msg === messages[messages.length - 1] && msg.content && (
                          <span className="inline-block w-1.5 h-4 bg-primary animate-pulse rounded-sm mt-1" />
                        )}
                      </div>
                    </div>
                  )
                ))}
              </div>

              {/* Input */}
              <div className="border-t border-border px-4 py-3">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleAsk(); }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={lang === 'th' ? 'ถาม Alice เกี่ยวกับข่าวหรือราคาตลาด...' : 'Ask Alice about news or market prices...'}
                    disabled={isStreaming}
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isStreaming || !input.trim()}
                    className="rounded-xl bg-primary text-primary-foreground p-2.5 disabled:opacity-40 hover:bg-primary/90 transition-colors"
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
