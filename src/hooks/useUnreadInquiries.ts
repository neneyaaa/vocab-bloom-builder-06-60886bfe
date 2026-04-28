import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsBusinessStaff } from "./useIsBusinessStaff";

/**
 * Counts the number of inquiries the current user has not yet "read"
 * (i.e. has no row in inquiry_reads for that inquiry whose read_at >= updated_at).
 *
 * Implementation: fetch inquiries (id, updated_at) and the user's reads,
 * then compare client-side. This is fine for the expected scale (< few hundred
 * open inquiries per staff). Subscribes to realtime changes on partner_inquiries.
 */
export function useUnreadInquiries() {
  const { user } = useAuth();
  const { isStaff } = useIsBusinessStaff();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = async () => {
    if (!user || !isStaff) {
      setUnreadCount(0);
      return;
    }
    const [{ data: inquiries }, { data: reads }] = await Promise.all([
      supabase.from("partner_inquiries").select("id, updated_at"),
      supabase.from("inquiry_reads").select("inquiry_id, read_at").eq("user_id", user.id),
    ]);
    const readMap = new Map((reads ?? []).map((r: any) => [r.inquiry_id, r.read_at]));
    let count = 0;
    for (const inq of inquiries ?? []) {
      const r = readMap.get((inq as any).id);
      if (!r || new Date(r) < new Date((inq as any).updated_at)) count++;
    }
    setUnreadCount(count);
  };

  useEffect(() => {
    refresh();
    if (!user || !isStaff) return;
    const channel = supabase
      .channel("partner_inquiries_unread")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "partner_inquiries" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inquiry_reads", filter: `user_id=eq.${user.id}` },
        () => refresh(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isStaff]);

  return { unreadCount, refresh };
}
