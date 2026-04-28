import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Swords, Loader2, Users, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

const LOBBY_CHANNEL = "pk-lobby-v1";
const AI_FALLBACK_MS = 8000; // After 8s without a human, offer AI bot

const PKLobby = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [searching, setSearching] = useState(false);
  const [waitTime, setWaitTime] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [aiOffered, setAiOffered] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const matchedRef = useRef(false);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  // Online presence indicator
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
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    setSearching(false);
    setWaitTime(0);
    setAiOffered(false);
  };

  useEffect(() => () => cleanup(), []);

  const startMatching = async () => {
    if (!user || !profile) return;
    setSearching(true);
    setWaitTime(0);
    setAiOffered(false);
    matchedRef.current = false;

    // Wait timer
    tickRef.current = window.setInterval(() => {
      setWaitTime((w) => {
        const nw = w + 1;
        if (nw * 1000 >= AI_FALLBACK_MS) setAiOffered(true);
        return nw;
      });
    }, 1000);

    const channel = supabase.channel(LOBBY_CHANNEL, {
      config: { presence: { key: user.id }, broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: "match_offer" }, (payload) => {
      const { matchId, from, to } = payload.payload as { matchId: string; from: string; to: string };
      if (to === user.id && !matchedRef.current) {
        matchedRef.current = true;
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
      setTimeout(() => tryMatch(channel), 2000);
      return;
    }

    const opponent = candidates[0];
    if (user.id < opponent.user_id) {
      const matchId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      matchedRef.current = true;
      channel.send({
        type: "broadcast",
        event: "match_offer",
        payload: { matchId, from: user.id, to: opponent.user_id },
      });
    } else {
      setTimeout(() => tryMatch(channel), 2500);
    }
  };

  const startWithBot = (difficulty: "easy" | "medium" | "hard") => {
    if (!user) return;
    cleanup();
    const matchId = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    navigate(`/pk/${matchId}?bot=${difficulty}`);
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
        <div className="text-center max-w-md mx-auto w-full">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 mb-6">
            <Swords className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-display font-black mb-3">实时 1v1 PK</h1>
          <p className="text-muted-foreground mb-10">
            与全球玩家实时对战，10 道题决出胜负，胜利可登上排行榜！
          </p>

          {!searching ? (
            <div className="space-y-4">
              <Button
                size="lg"
                onClick={startMatching}
                className="text-base px-10 py-6 rounded-xl shadow-lg w-full"
              >
                <Swords className="h-5 w-5 mr-2" />匹配真人对手
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/60" /></div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-3 text-xs text-muted-foreground">或挑战 AI</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <BotChoice difficulty="easy" label="新手" emoji="🤖" onClick={() => startWithBot("easy")} />
                <BotChoice difficulty="medium" label="中级" emoji="🦾" onClick={() => startWithBot("medium")} highlight />
                <BotChoice difficulty="hard" label="高手" emoji="👾" onClick={() => startWithBot("hard")} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-border/60">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="font-medium">正在搜索对手...</span>
                <span className="text-xs text-muted-foreground">已等待 {waitTime}s</span>
              </div>

              {aiOffered && (
                <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 text-left animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="h-4 w-4 text-accent" />
                    <span className="font-medium text-sm">没有真人对手？试试 AI 陪练</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    AI 机器人会按你选择的难度模拟答题，正式战绩会计入你的记录。
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" onClick={() => startWithBot("easy")}>🤖 新手</Button>
                    <Button size="sm" onClick={() => startWithBot("medium")}>🦾 中级</Button>
                    <Button size="sm" variant="outline" onClick={() => startWithBot("hard")}>👾 高手</Button>
                  </div>
                </div>
              )}

              <Button variant="outline" size="lg" onClick={cancel} className="w-full">
                取消匹配
              </Button>
              <p className="text-xs text-muted-foreground">
                💡 测试时可在另一个浏览器窗口登录另一账号同时点匹配
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const BotChoice = ({ difficulty, label, emoji, onClick, highlight }: { difficulty: string; label: string; emoji: string; onClick: () => void; highlight?: boolean }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all hover:border-primary hover:bg-primary/5 ${
      highlight ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card"
    }`}
  >
    <span className="text-2xl">{emoji}</span>
    <span className="text-xs font-medium">{label}</span>
  </button>
);

export default PKLobby;
