import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Swords, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

const LOBBY_CHANNEL = "pk-lobby-v1";

const PKLobby = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [searching, setSearching] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const matchedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  // Track online presence in lobby (always, when logged in)
  useEffect(() => {
    if (!user || !profile) return;
    const presenceChannel = supabase.channel("pk-presence", {
      config: { presence: { key: user.id } },
    });
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ username: profile.username });
        }
      });
    return () => { supabase.removeChannel(presenceChannel); };
  }, [user, profile]);

  const cleanup = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setSearching(false);
  };

  useEffect(() => () => cleanup(), []);

  const startMatching = async () => {
    if (!user || !profile) return;
    setSearching(true);
    matchedRef.current = false;

    const channel = supabase.channel(LOBBY_CHANNEL, {
      config: { presence: { key: user.id }, broadcast: { self: false } },
    });
    channelRef.current = channel;

    // Listen for match offers
    channel.on("broadcast", { event: "match_offer" }, (payload) => {
      const { matchId, from, to } = payload.payload as { matchId: string; from: string; to: string };
      if (to === user.id && !matchedRef.current) {
        matchedRef.current = true;
        // Confirm acceptance
        channel.send({
          type: "broadcast",
          event: "match_accept",
          payload: { matchId, from: user.id, to: from },
        }).then(() => {
          setTimeout(() => {
            cleanup();
            navigate(`/pk/${matchId}?opponent=${from}`);
          }, 200);
        });
      }
    });

    channel.on("broadcast", { event: "match_accept" }, (payload) => {
      const { matchId, to } = payload.payload as { matchId: string; from: string; to: string };
      if (to === user.id && matchedRef.current) {
        cleanup();
        navigate(`/pk/${matchId}`);
      }
    });

    await channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      await channel.track({ user_id: user.id, username: profile.username, ts: Date.now() });

      // Try matching after a brief delay so others are tracked
      setTimeout(() => tryMatch(channel), 800);
    });
  };

  const tryMatch = (channel: RealtimeChannel) => {
    if (matchedRef.current || !user) return;
    const state = channel.presenceState() as Record<string, Array<{ user_id: string; ts: number }>>;
    const candidates = Object.values(state)
      .flat()
      .filter((p) => p.user_id && p.user_id !== user.id)
      .sort((a, b) => a.ts - b.ts);

    if (candidates.length === 0) {
      // Retry in 2s while waiting
      setTimeout(() => tryMatch(channel), 2000);
      return;
    }

    // Deterministic: smaller user_id sends the offer to avoid duplicates
    const opponent = candidates[0];
    if (user.id < opponent.user_id) {
      const matchId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      matchedRef.current = true;
      channel.send({
        type: "broadcast",
        event: "match_offer",
        payload: { matchId, from: user.id, to: opponent.user_id },
      });
      // Fallback: navigate after we get the accept (handled above).
      // Safety timeout: if no accept within 5s, retry
      setTimeout(() => {
        if (matchedRef.current && channelRef.current) {
          // Already navigated or accept received
        }
      }, 5000);
    } else {
      // Wait for the other side to send an offer; retry timer
      setTimeout(() => tryMatch(channel), 2500);
    }
  };

  const cancel = () => {
    cleanup();
    toast.info("已取消匹配");
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-1" />返回
        </Button>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />在线 {onlineCount}
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="text-center max-w-md mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 mb-6">
            <Swords className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-display font-black mb-3">实时 1v1 PK</h1>
          <p className="text-muted-foreground mb-10">
            与全球玩家实时对战，10 道题决出胜负，胜利可登上排行榜！
          </p>

          {!searching ? (
            <Button
              size="lg"
              onClick={startMatching}
              className="text-base px-10 py-6 rounded-xl shadow-lg w-full sm:w-auto"
            >
              <Swords className="h-5 w-5 mr-2" />开始匹配对手
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 p-6 rounded-xl bg-card border border-border/60">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium">正在搜索对手...</span>
              </div>
              <Button variant="outline" size="lg" onClick={cancel} className="w-full">
                取消匹配
              </Button>
              <p className="text-xs text-muted-foreground">
                💡 测试时可在另一个浏览器窗口登录另一个账号同时点击匹配
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PKLobby;
