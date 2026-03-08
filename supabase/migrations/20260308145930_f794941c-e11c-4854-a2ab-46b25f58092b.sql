DELETE FROM articles WHERE 
  lower(title) LIKE '%steam machine%' 
  OR lower(title) LIKE '%uncomfortable truth about hybrid%';