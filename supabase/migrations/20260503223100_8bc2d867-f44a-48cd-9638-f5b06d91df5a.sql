ALTER TABLE public.custom_personas
ADD COLUMN IF NOT EXISTS knowledge_base jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_custom_personas_knowledge_base
ON public.custom_personas USING gin (knowledge_base);