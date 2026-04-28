-- 钱包：每个用户的虚拟币余额
CREATE TABLE public.wallets (
  user_id UUID NOT NULL PRIMARY KEY,
  coins INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- 虚拟币流水
CREATE TABLE public.coin_transactions (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL, -- 正:收入 负:支出
  reason TEXT NOT NULL,    -- 'enroll_charge' / 'checkin_reward' / 'completion_bonus' / 'refund'
  ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own coin tx" ON public.coin_transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- 打卡计划报名（一个用户可有多个历史计划，但同一时间最多 1 个 active）
CREATE TABLE public.checkin_plans (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  enroll_cost INTEGER NOT NULL DEFAULT 99,         -- 报名扣 99 币
  reward_total INTEGER NOT NULL DEFAULT 200,       -- 完成全部返 200 币
  daily_reward INTEGER NOT NULL DEFAULT 1,         -- 每日完成奖 1 币
  required_days INTEGER NOT NULL DEFAULT 100,
  required_accuracy INTEGER NOT NULL DEFAULT 60,   -- 当日测评正确率门槛
  days_completed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',           -- active / completed / failed / cancelled
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_checkin_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checkin_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own plans" ON public.checkin_plans FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- 每日打卡记录
CREATE TABLE public.checkin_records (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL,
  user_id UUID NOT NULL,
  checkin_date DATE NOT NULL,
  test_run_id UUID,
  accuracy INTEGER NOT NULL,
  reward_coins INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, checkin_date)
);
ALTER TABLE public.checkin_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own checkins" ON public.checkin_records FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- 自动建钱包：用户首次注册或首次访问时由 edge function 兜底；这里加触发器同步 profiles
CREATE OR REPLACE FUNCTION public.handle_new_wallet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallets (user_id, coins) VALUES (NEW.id, 0) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_profile_created_wallet ON public.profiles;
CREATE TRIGGER on_profile_created_wallet
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_wallet();

-- 给已存在用户补钱包
INSERT INTO public.wallets (user_id, coins)
SELECT id, 0 FROM public.profiles
ON CONFLICT DO NOTHING;

-- 索引
CREATE INDEX idx_checkin_records_user ON public.checkin_records(user_id, checkin_date DESC);
CREATE INDEX idx_checkin_plans_user_status ON public.checkin_plans(user_id, status);
CREATE INDEX idx_coin_tx_user ON public.coin_transactions(user_id, created_at DESC);