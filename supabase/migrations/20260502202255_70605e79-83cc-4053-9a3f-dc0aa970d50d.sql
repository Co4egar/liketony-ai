ALTER TABLE public.custom_personas
  ADD COLUMN IF NOT EXISTS tone text,
  ADD COLUMN IF NOT EXISTS rhythm text,
  ADD COLUMN IF NOT EXISTS vocabulary text,
  ADD COLUMN IF NOT EXISTS signature_moves text,
  ADD COLUMN IF NOT EXISTS taboos text,
  ADD COLUMN IF NOT EXISTS accent text,
  ADD COLUMN IF NOT EXISTS verbal_tics text,
  ADD COLUMN IF NOT EXISTS examples jsonb NOT NULL DEFAULT '[]'::jsonb;