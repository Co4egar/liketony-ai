
-- TTL cleanup function for old rewrites and unused custom personas
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete rewrites older than 30 days
  DELETE FROM public.rewrites WHERE created_at < now() - interval '30 days';
  -- Delete custom personas older than 30 days that are NOT used in any persona_usage row with count > 1
  DELETE FROM public.custom_personas cp
  WHERE cp.created_at < now() - interval '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.persona_usage pu
      WHERE pu.persona_id = cp.slug AND pu.count > 1
    );
  -- Delete rate_limit rows older than 24h (already done in check_and_record_rate_limit, but in case)
  DELETE FROM public.rate_limits WHERE created_at < now() - interval '24 hours';
END;
$$;
