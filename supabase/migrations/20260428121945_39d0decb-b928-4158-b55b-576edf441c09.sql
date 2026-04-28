-- Promo banners table
CREATE TABLE public.promo_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'home_features',
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view enabled banners"
ON public.promo_banners FOR SELECT
USING (enabled = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins insert banners"
ON public.promo_banners FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins update banners"
ON public.promo_banners FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete banners"
ON public.promo_banners FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_promo_banners_updated_at
BEFORE UPDATE ON public.promo_banners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('promo-banners', 'promo-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Banner images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'promo-banners');

CREATE POLICY "Admins upload banner images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'promo-banners' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins update banner images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'promo-banners' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins delete banner images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'promo-banners' AND public.is_admin(auth.uid()));