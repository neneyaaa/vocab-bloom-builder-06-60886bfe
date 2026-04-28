
-- 测评总结
CREATE TABLE IF NOT EXISTS public.test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  total_questions integer NOT NULL,
  correct_count integer NOT NULL,
  wrong_count integer NOT NULL,
  unknown_count integer NOT NULL,
  accuracy integer NOT NULL,
  level text NOT NULL,
  level_description text,
  suggestion text,
  estimated_vocabulary integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_test_runs_user_created ON public.test_runs(user_id, created_at DESC);

ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own test runs" ON public.test_runs FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users insert own test runs" ON public.test_runs FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own test runs" ON public.test_runs FOR DELETE
  TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- 测评每题明细
CREATE TABLE IF NOT EXISTS public.test_run_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id uuid NOT NULL REFERENCES public.test_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  question_index integer NOT NULL,
  word_id uuid,
  word text NOT NULL,
  correct_answer text NOT NULL,
  user_answer text,
  is_correct boolean NOT NULL,
  difficulty text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tra_run ON public.test_run_answers(test_run_id, question_index);
CREATE INDEX IF NOT EXISTS idx_tra_user_word ON public.test_run_answers(user_id, word);

ALTER TABLE public.test_run_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own test answers" ON public.test_run_answers FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users insert own test answers" ON public.test_run_answers FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- PK 每题明细
CREATE TABLE IF NOT EXISTS public.pk_match_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL,
  user_id uuid NOT NULL,
  question_index integer NOT NULL,
  word_id uuid,
  word text NOT NULL,
  correct_answer text NOT NULL,
  user_answer text,
  is_correct boolean NOT NULL,
  difficulty text NOT NULL,
  time_taken_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pka_user_match ON public.pk_match_answers(user_id, match_id, question_index);
CREATE INDEX IF NOT EXISTS idx_pka_match ON public.pk_match_answers(match_id);

ALTER TABLE public.pk_match_answers ENABLE ROW LEVEL SECURITY;

-- 用户能看自己的；也能看自己参与过的比赛中对手的（用于赛后透明回顾）
CREATE POLICY "Users view own or opponent pk answers" ON public.pk_match_answers FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.match_results mr
      WHERE mr.match_id = pk_match_answers.match_id
        AND mr.user_id = auth.uid()
    )
  );
CREATE POLICY "Users insert own pk answers" ON public.pk_match_answers FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
