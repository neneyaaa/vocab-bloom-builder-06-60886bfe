
-- 扩展 partner_inquiries
ALTER TABLE public.partner_inquiries
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS next_followup_at timestamptz,
  ADD COLUMN IF NOT EXISTS deal_value numeric,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_partner_inquiries_status ON public.partner_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_partner_inquiries_assigned ON public.partner_inquiries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_partner_inquiries_created ON public.partner_inquiries(created_at DESC);

DROP TRIGGER IF EXISTS trg_partner_inquiries_updated ON public.partner_inquiries;
CREATE TRIGGER trg_partner_inquiries_updated
  BEFORE UPDATE ON public.partner_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 跟进记录
CREATE TABLE IF NOT EXISTS public.inquiry_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.partner_inquiries(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  channel text NOT NULL DEFAULT 'note',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_followups_inquiry ON public.inquiry_followups(inquiry_id, created_at DESC);
ALTER TABLE public.inquiry_followups ENABLE ROW LEVEL SECURITY;

-- 已读标记
CREATE TABLE IF NOT EXISTS public.inquiry_reads (
  user_id uuid NOT NULL,
  inquiry_id uuid NOT NULL REFERENCES public.partner_inquiries(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, inquiry_id)
);
ALTER TABLE public.inquiry_reads ENABLE ROW LEVEL SECURITY;

-- 商务/管理员判断
CREATE OR REPLACE FUNCTION public.is_business_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
      OR public.has_role(_user_id, 'business_dev'::public.app_role)
$$;

-- partner_inquiries 策略
DROP POLICY IF EXISTS "Admins view inquiries" ON public.partner_inquiries;
DROP POLICY IF EXISTS "Admins update inquiries" ON public.partner_inquiries;

CREATE POLICY "Business staff view inquiries"
  ON public.partner_inquiries FOR SELECT
  TO authenticated
  USING (public.is_business_staff(auth.uid()));

CREATE POLICY "Business staff update inquiries"
  ON public.partner_inquiries FOR UPDATE
  TO authenticated
  USING (public.is_business_staff(auth.uid()))
  WITH CHECK (public.is_business_staff(auth.uid()));

-- inquiry_followups
CREATE POLICY "Business staff view followups"
  ON public.inquiry_followups FOR SELECT
  TO authenticated
  USING (public.is_business_staff(auth.uid()));

CREATE POLICY "Business staff insert followups"
  ON public.inquiry_followups FOR INSERT
  TO authenticated
  WITH CHECK (public.is_business_staff(auth.uid()) AND author_id = auth.uid());

CREATE POLICY "Authors delete own followups"
  ON public.inquiry_followups FOR DELETE
  TO authenticated
  USING (author_id = auth.uid() OR public.is_admin(auth.uid()));

-- inquiry_reads
CREATE POLICY "Users manage own reads"
  ON public.inquiry_reads FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
