-- 1. Закрываем публичное чтение rewrites
DROP POLICY IF EXISTS "Anyone can read rewrites by public_id" ON public.rewrites;

CREATE POLICY "No direct read of rewrites"
  ON public.rewrites FOR SELECT
  USING (false);

-- 2. RPC для чтения одного рерайта по public_id
CREATE OR REPLACE FUNCTION public.get_rewrite_by_public_id(p_public_id text)
RETURNS TABLE (
  public_id text,
  persona_name text,
  persona_id text,
  source_url text,
  html_original text,
  html_rewritten text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public_id, persona_name, persona_id, source_url,
         html_original, html_rewritten, created_at
  FROM public.rewrites
  WHERE public_id = p_public_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_rewrite_by_public_id(text) TO anon, authenticated;

-- 3. Таблица rate-limit
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limits_ip_action_created_idx
  ON public.rate_limits (ip, action, created_at DESC);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Никаких клиентских политик — только service role / SECURITY DEFINER функции
CREATE POLICY "No client access to rate limits"
  ON public.rate_limits FOR SELECT USING (false);

-- 4. Функция проверки и инкремента лимита
CREATE OR REPLACE FUNCTION public.check_and_record_rate_limit(
  p_ip text,
  p_action text,
  p_limit int,
  p_window_minutes int,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count int;
BEGIN
  -- Залогиненные пользователи не лимитируются (защита через подписку отдельно)
  IF p_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', true, 'remaining', -1);
  END IF;

  SELECT count(*) INTO recent_count
  FROM public.rate_limits
  WHERE ip = p_ip
    AND action = p_action
    AND created_at > now() - (p_window_minutes || ' minutes')::interval;

  IF recent_count >= p_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'limit', p_limit,
      'window_minutes', p_window_minutes
    );
  END IF;

  INSERT INTO public.rate_limits (ip, action) VALUES (p_ip, p_action);

  -- Чистим старые записи (>24h)
  DELETE FROM public.rate_limits WHERE created_at < now() - interval '24 hours';

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', p_limit - recent_count - 1,
    'limit', p_limit
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_record_rate_limit(text, text, int, int, uuid) TO service_role;