import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
}

interface Props {
  placement: "home_features" | "home_hero" | "result";
  className?: string;
}

const PromoBanners = ({ placement, className = "" }: Props) => {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    supabase
      .from("promo_banners")
      .select("id,title,subtitle,image_url")
      .eq("placement", placement)
      .eq("enabled", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setBanners(data ?? []));
  }, [placement]);

  if (banners.length === 0) return null;

  return (
    <section className={`w-full max-w-5xl mx-auto px-6 ${className}`}>
      <div className="text-center mb-6">
        <span className="inline-block text-xs tracking-[0.2em] text-muted-foreground uppercase mb-2">
          Featured
        </span>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
          明星推荐
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {banners.map((b) => (
          <div
            key={b.id}
            className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <div className="aspect-[4/5] overflow-hidden bg-muted">
              <img
                src={b.image_url}
                alt={b.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
              <h3 className="font-display font-bold text-white text-lg leading-tight">
                {b.title}
              </h3>
              {b.subtitle && (
                <p className="text-white/80 text-sm mt-1 line-clamp-2">{b.subtitle}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PromoBanners;
