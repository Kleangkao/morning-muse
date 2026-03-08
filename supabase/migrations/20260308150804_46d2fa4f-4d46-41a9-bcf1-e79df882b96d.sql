-- Remove duplicate oil/Middle East articles (keep highest signal_score version)
-- Iraq oil plunges duplicate (Investing.com vs Investing.com Commodities - exact same title)
DELETE FROM articles WHERE id = 'rss-ii48yb';

-- Beijing urges end to Iran war duplicate
DELETE FROM articles WHERE id = 'rss-arzf27';

-- CoinDesk oil $100 duplicate (keep one)
DELETE FROM articles WHERE id = 'rss-etsa89';

-- UK economy inflation wave duplicate (Bloomberg vs BBC - same title)
DELETE FROM articles WHERE id = 'rss-swp2n7';

-- OpenClaw superfan meetup - irrelevant lifestyle content
DELETE FROM articles WHERE id = 'rss-4hmlk4';

-- Palmer Luckey retro gaming venture (retro gaming clone console - not relevant unless business angle caught by override)
-- Actually this one has "$1 billion valuation" so it passes relevance override - KEEP IT