import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, TrendingUp, Swords, Target, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";

interface MatchRow {
  id: string;
  match_id: string;
  opponent_id: string | null;
  score: number;
  opponent_score: number;
  result: "win" | "lose" | "draw";
  created_at: string;
}

interface OpponentMap {
  [id: string]: { username: string; avatar_url: string | null };
}

const MyStats = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [opponents, setOpponents] = useState<OpponentMap>({});
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("match_results")
        .select("id, match_id, opponent_id, score, opponent_score, result, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      const list = (data ?? []) as MatchRow[];
      setMatches(list);

      const oppIds = Array.from(new Set(list.map((m) => m.opponent_id).filter(Boolean))) as string[];
      if (oppIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", oppIds);
        const map: OpponentMap = {};
        profs?.forEach((p) => { map[p.id] = { username: p.username, avatar_url: p.avatar_url }; });
        setOpponents(map);
      }
      setPageLoading(false);
    })();
  }, [user]);

  const wins = matches.filter((m) => m.result === "win").length;
  const losses = matches.filter((m) => m.result === "lose").length;
  const draws = matches.filter((m) => m.result === "draw").length;
  const winRate = matches.length ? Math.round((wins / matches.length) * 100) : 0;
  const avgScore = matches.length
    ? (matches.reduce((s, m) => s + m.score, 0) / matches.length).toFixed(1)
    : "0";

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto w-full">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />返回
        </Button>
        <span className="font-display font-bold">我的战绩</span>
        <div className="w-12" />
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 pb-12">
        {/* Profile header */}
        <div className="flex items-center gap-4 mb-8 p-5 bg-card rounded-2xl border border-border/60">
          <UserAvatar username={profile?.username} avatarUrl={profile?.avatar_url} size="lg" />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-display font-bold truncate">{profile?.username ?? "..."}</h2>
            <p className="text-sm text-muted-foreground">共 {matches.length} 场对战</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard icon={<Trophy className="h-4 w-4 text-accent" />} label="胜场" value={wins} />
          <StatCard icon={<Swords className="h-4 w-4 text-destructive" />} label="负场" value={losses} />
          <StatCard icon={<TrendingUp className="h-4 w-4 text-primary" />} label="胜率" value={`${winRate}%`} />
          <StatCard icon={<Target className="h-4 w-4 text-success" />} label="平均得分" value={avgScore} />
        </div>

        {/* History */}
        <h3 className="font-display font-bold mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" />对战记录
        </h3>
        {pageLoading ? (
          <div className="text-center py-12 text-muted-foreground">加载中...</div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border/60">
            <Swords className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">还没有任何 PK 战绩</p>
            <Button onClick={() => navigate("/pk")}>立即开始 PK</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((m) => {
              const opp = m.opponent_id ? opponents[m.opponent_id] : null;
              const isBot = !m.opponent_id;
              const verdictColor =
                m.result === "win" ? "text-accent" :
                m.result === "lose" ? "text-destructive" : "text-muted-foreground";
              const verdictLabel =
                m.result === "win" ? "胜" : m.result === "lose" ? "负" : "平";
              const date = new Date(m.created_at);
              return (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/60">
                  <div className={`w-10 h-10 rounded-full font-display font-black flex items-center justify-center ${
                    m.result === "win" ? "bg-accent/15 text-accent" :
                    m.result === "lose" ? "bg-destructive/10 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {verdictLabel}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      vs {opp?.username ?? (isBot ? "🤖 AI 机器人" : "未知对手")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {date.toLocaleDateString("zh-CN")} {date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div className={`font-mono font-bold ${verdictColor}`}>
                    {m.score} : {m.opponent_score}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) => (
  <div className="bg-card border border-border/60 rounded-xl p-4">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
      {icon}{label}
    </div>
    <div className="text-2xl font-display font-black">{value}</div>
  </div>
);

export default MyStats;
