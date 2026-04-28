-- 招商咨询表
CREATE TABLE public.partner_inquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  inquiry_type text NOT NULL,
  message text NOT NULL,
  budget_range text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_inquiries ENABLE ROW LEVEL SECURITY;

-- 任何人可提交咨询
CREATE POLICY "Anyone can submit inquiry"
ON public.partner_inquiries FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 仅管理员可查看
CREATE POLICY "Admins view inquiries"
ON public.partner_inquiries FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins update inquiries"
ON public.partner_inquiries FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

CREATE INDEX idx_partner_inquiries_created ON public.partner_inquiries(created_at DESC);
