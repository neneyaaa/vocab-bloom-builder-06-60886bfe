
-- 1) match_results: restrict SELECT
DROP POLICY IF EXISTS "Match results viewable by authenticated" ON public.match_results;
CREATE POLICY "Users view own match results"
  ON public.match_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = opponent_id OR public.is_admin(auth.uid()));

-- 2) Leaderboard aggregate function (no per-row exposure)
CREATE OR REPLACE FUNCTION public.get_leaderboard(period text)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  wins bigint,
  total bigint,
  score_sum bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.user_id,
    p.username,
    p.avatar_url,
    COUNT(*) FILTER (WHERE m.result = 'win')::bigint AS wins,
    COUNT(*)::bigint AS total,
    COALESCE(SUM(m.score), 0)::bigint AS score_sum
  FROM public.match_results m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.created_at >= (
    CASE WHEN period = 'week' THEN now() - interval '7 days'
         ELSE now() - interval '1 month' END
  )
  GROUP BY m.user_id, p.username, p.avatar_url
  ORDER BY wins DESC, score_sum DESC
  LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.get_leaderboard(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text) TO authenticated;

-- 3) partner_inquiries: stricter INSERT check
DROP POLICY IF EXISTS "Anyone can submit inquiry" ON public.partner_inquiries;
CREATE POLICY "Anyone can submit inquiry"
  ON public.partner_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(trim(contact_name)) BETWEEN 1 AND 100
    AND char_length(trim(email)) BETWEEN 3 AND 255
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(trim(message)) BETWEEN 1 AND 5000
    AND char_length(trim(company_name)) BETWEEN 1 AND 200
  );

-- 4) Storage: drop broad public-read policies (buckets are public so CDN URLs still work)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Banner images public read" ON storage.objects;

-- 5) Lock down SECURITY DEFINER functions
-- Trigger functions: no client should call directly
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_wallet() FROM PUBLIC, anon, authenticated;

-- Role helpers: keep authenticated EXECUTE (used in RLS policies), revoke anon
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.is_business_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_business_staff(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.is_user_banned(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_user_banned(uuid) TO authenticated;
