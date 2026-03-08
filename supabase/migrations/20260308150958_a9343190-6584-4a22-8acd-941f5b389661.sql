-- Clean up articles that slipped through before improved filters
DELETE FROM articles WHERE id = 'rss-4hmlk4';

-- Also remove the CoinDesk oil duplicate that came back  
DELETE FROM articles WHERE id = 'rss-etsa89';

-- Remove Iraq oil duplicate from Investing.com Commodities
DELETE FROM articles WHERE id = 'rss-ii48yb';

-- Remove Beijing Iran war duplicate
DELETE FROM articles WHERE id = 'rss-arzf27';

-- Remove UK economy duplicate
DELETE FROM articles WHERE id = 'rss-swp2n7';