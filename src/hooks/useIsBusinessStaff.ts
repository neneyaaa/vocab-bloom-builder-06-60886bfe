import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns whether the current user is staff for business inquiries
 * (i.e. has the `admin` or `business_dev` role).
 */
export function useIsBusinessStaff() {
  const { user, loading: authLoading } = useAuth();
  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsStaff(false);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "business_dev"]);
      if (cancelled) return;
      const roles = (data ?? []).map((r: any) => r.role);
      setIsStaff(roles.length > 0);
      setIsAdmin(roles.includes("admin"));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return { isStaff, isAdmin, loading };
}
