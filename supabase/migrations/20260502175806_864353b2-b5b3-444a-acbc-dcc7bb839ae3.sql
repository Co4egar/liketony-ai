ALTER TABLE public.custom_personas
  ADD COLUMN IF NOT EXISTS canonical_name text,
  ADD COLUMN IF NOT EXISTS wiki_title text;