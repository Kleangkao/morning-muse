
CREATE TABLE public.articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  subtopic TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_time INTEGER NOT NULL DEFAULT 2,
  is_top_signal BOOLEAN NOT NULL DEFAULT false,
  impact_level TEXT NOT NULL DEFAULT 'low',
  market_direction TEXT NOT NULL DEFAULT 'neutral',
  badges TEXT[] NOT NULL DEFAULT '{}',
  signal_score INTEGER NOT NULL DEFAULT 50,
  title_hash TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  related_sources TEXT[] NOT NULL DEFAULT '{}',
  related_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_articles_published_at ON public.articles (published_at DESC);
CREATE INDEX idx_articles_category ON public.articles (category);
CREATE INDEX idx_articles_signal_score ON public.articles (signal_score DESC);
CREATE INDEX idx_articles_title_hash ON public.articles (title_hash);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Articles are publicly readable"
  ON public.articles FOR SELECT
  USING (true);
