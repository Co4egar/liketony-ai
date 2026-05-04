
-- Harden search_path on email queue functions
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;

-- Revoke EXECUTE from anon/authenticated on functions that should only run via service role
REVOKE EXECUTE ON FUNCTION public.increment_persona_usage(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_record_rate_limit(text, text, integer, integer, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_data() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;

-- get_rewrite_by_public_id is intentionally public — used by the SharedRewrite page (anon)
-- Keep its EXECUTE grant in place.
