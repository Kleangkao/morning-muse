-- Remove duplicate OpenClaw (keep The Verge AI version)
DELETE FROM articles WHERE lower(title) LIKE '%openclaw%' AND source = 'The Verge';

-- Remove irrelevant Web2 gaming / consumer / lifestyle articles
DELETE FROM articles WHERE 
  lower(title) LIKE '%furby%'
  OR lower(title) LIKE '%uncomfortable truth about hybrid%'
  OR lower(title) LIKE '%linux hacked onto%'
  OR lower(title) LIKE '%enshittification%'
  OR lower(title) LIKE '%robovac%'
  OR lower(title) LIKE '%mid layer%hiking%'
  OR lower(title) LIKE '%steam machine%release date%'
  OR (lower(title) LIKE '%retro gaming venture%' AND lower(title) LIKE '%cartridge%');