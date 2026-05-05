ALTER TABLE public.rewrites ADD COLUMN IF NOT EXISTS selling_score jsonb;

DROP FUNCTION IF EXISTS public.get_rewrite_by_public_id(text);

CREATE OR REPLACE FUNCTION public.get_rewrite_by_public_id(p_public_id text)
 RETURNS TABLE(public_id text, persona_name text, persona_id text, source_url text, html_original text, html_rewritten text, selling_score jsonb, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public_id, persona_name, persona_id, source_url,
         html_original, html_rewritten, selling_score, created_at
  FROM public.rewrites
  WHERE public_id = p_public_id
  LIMIT 1;
$function$;