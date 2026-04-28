import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Medal, Crown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";

interface RankRow {
  user_id: string;
  username: string;
  avatar_url: string | null;
  wins: number;
  total: number;
  score_sum: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [rows, setRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const since = new Date();
      if (period === "week") since.setDate(since.getDate() - 7);
      else since.setMonth(since.getMonth() - 1);

      const { data: matches, error } = await supabase
        .from("match_results")
        .select("user_id, score, result")
        .gte("created_at", since.toISOString())
        .limit(1000);

      if (error || !matches) { setRows([]); setLoading(false); return; }

      // Aggregate
      const map = new Map<string, { wins: number; total: number; score_sum: number }>();
      for (const m of matches) {
        const cur = map.get(m.user_id) ?? { wins: 0, total: 0, score_sum: 0 };
        cur.total += 1;
        cur.score_sum += m.score;
        if (m.result === "win") cur.wins += 1;
        map.set(m.user_id, cur);
      }

      const userIds = Array.from(map.keys());
      if (userIds.length === 0) { setRows([]); setLoading(false); return; }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      const merged: RankRow[] = userIds.map((id) => {
        const p = profiles?.find((pr) => pr.id === id);
        const stats = map.get(id)!;
        return {
          user_id: id,
          username: p?.username ?? "未知用户",
          avatar_url: p?.avatar_url ?? null,
          ...stats,
        };
      }).sort((a, b) => b.wins - a.wins || b.score_sum - a.score_sum);

      if (!cancelled) { setRows(merged); setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [period]);

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto w-full">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-1" />返回
        </Button>
        <div className="flex items-center gap-1.5">
          <Trophy className="h-5 w-5 text-accent" />
          <span className="font-display font-bold">排行榜</span>
        </div>
        <div className="w-12" />
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 pb-12">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as "week" | "month")}>
          <TabsList className="grid grid-cols-2 w-full max-w-xs mx-auto mb-6">
            <TabsTrigger value="week">周榜</TabsTrigger>
            <TabsTrigger value="month">月榜</TabsTrigger>
          </TabsList>

          <TabsContent value={period}>
            {loading ? (
              <div className="text-center text-muted-foreground py-20">加载中...</div>
            ) : rows.length === 0 ? (
              <div className="text-center py-20">
                <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">暂无{period === "week" ? "本周" : "本月"}对战记录</p>
                <Button className="mt-4" onClick={() => navigate("/pk")}>立即参与 PK</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map((r, idx) => (
                  <RankRowCard
                    key={r.user_id}
                    rank={idx + 1}
                    row={r}
                    isMe={r.user_id === user?.id}
                    onClick={r.user_id === user?.id ? () => navigate("/my-stats") : undefined}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const RankRowCard = ({ rank, row, isMe, onClick }: { rank: number; row: RankRow; isMe: boolean; onClick?: () => void }) => {
  const winRate = row.total > 0 ? Math.round((row.wins / row.total) * 100) : 0;
  const inner = (
    <div className={`flex items-center gap-4 p-4 rounded-xl border w-full text-left transition-colors ${
      isMe ? "border-primary bg-primary/5 hover:bg-primary/10" : "border-border/60 bg-card"
    }`}>
      <div className="w-8 flex justify-center shrink-0">
        {rank === 1 ? <Crown className="h-6 w-6 text-accent" /> :
         rank === 2 ? <Medal className="h-6 w-6 text-muted-foreground" /> :
         rank === 3 ? <Medal className="h-6 w-6 text-amber-700" /> :
         <span className="font-mono text-sm text-muted-foreground">#{rank}</span>}
      </div>
      <UserAvatar username={row.username} avatarUrl={row.avatar_url} size="md" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">
          {row.username}
          {isMe && <span className="text-xs text-primary ml-2">(你)</span>}
        </div>
        <div className="text-xs text-muted-foreground">{row.total} 场 · 胜率 {winRate}%</div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-display font-black text-lg">{row.wins}</div>
        <div className="text-xs text-muted-foreground">胜场</div>
      </div>
      {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
    </div>
  );
  return onClick ? <button onClick={onClick} className="w-full">{inner}</button> : inner;
};

export default Leaderboard;
