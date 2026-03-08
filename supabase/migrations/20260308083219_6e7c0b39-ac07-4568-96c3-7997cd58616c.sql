
CREATE POLICY "Service role can insert articles"
  ON public.articles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update articles"
  ON public.articles FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete articles"
  ON public.articles FOR DELETE
  USING (true);
