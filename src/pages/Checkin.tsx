import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Coins, Flame, Trophy, ArrowLeft, Calendar, History, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Wallet { user_id: string; coins: number }
interface Plan {
  id: string;
  enroll_cost: number;
  reward_total: number;
  daily_reward: number;
  required_days: number;
  required_accuracy: number;
  days_completed: number;
  status: string;
  started_at: string;
  last_checkin_date: string | null;
}
interface Tx { id: string; amount: number; reason: string; created_at: string }
interface CheckinRecord { id: string; checkin_date: string; accuracy: number; reward_coins: number }

const reasonLabel: Record<string, string> = {
  enroll_charge: "报名扣费",
  checkin_reward: "每日打卡",
  completion_bonus: "完成奖励",
  admin_grant: "运营赠送",
  refund: "退款",
};

export default function Checkin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [todayChecked, setTodayChecked] = useState(false);
  const [history, setHistory] = useState<{ records: CheckinRecord[]; transactions: Tx[] } | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadAll();
  }, [user]);

  const callApi = async (action: string, body: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("checkin-api", {
      body: { action, ...body },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const state = await callApi("get_state");
      setWallet(state.wallet);
      setPlan(state.plan);
      setTodayChecked(state.todayChecked);
      const h = await callApi("get_history");
      setHistory({ records: h.records ?? [], transactions: h.transactions ?? [] });
    } catch (e: any) {
      toast.error(e.message ?? "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!confirm("确定花费 99 虚拟币报名？坚持 100 天每日打卡，将额外返还 200 币。")) return;
    setEnrolling(true);
    try {
      await callApi("enroll");
      toast.success("报名成功！开始每日打卡之旅 🎯");
      await loadAll();
    } catch (e: any) {
      toast.error(e.message ?? "报名失败");
    } finally {
      setEnrolling(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("放弃当前计划？已扣的 99 币不会返还。")) return;
    try {
      await callApi("cancel");
      toast.success("计划已取消");
      await loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">加载中...</div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto w-full">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回
        </Button>
        <h1 className="font-display font-bold text-lg">打卡返币</h1>
        <div className="w-16" />
      </nav>

      <main className="max-w-4xl mx-auto px-6 pb-16 space-y-6">
        {/* Wallet */}
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">我的虚拟币</div>
              <div className="flex items-baseline gap-2 mt-1">
                <Coins className="h-7 w-7 text-gold" />
                <span className="text-4xl font-display font-black">{wallet?.coins ?? 0}</span>
                <span className="text-sm text-muted-foreground">币</span>
              </div>
            </div>
            <Sparkles className="h-10 w-10 text-accent/60" />
          </div>
        </Card>

        {/* Active Plan or Enroll */}
        {plan ? (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-accent" />
                <span className="font-display font-bold text-lg">进行中的打卡</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCancel} className="text-destructive hover:text-destructive">
                放弃计划
              </Button>
            </div>

            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-display font-bold text-primary">{plan.days_completed}</span>
              <span className="text-muted-foreground">/ {plan.required_days} 天</span>
            </div>
            <Progress value={(plan.days_completed / plan.required_days) * 100} className="mb-4" />

            <div className="grid grid-cols-2 gap-3 text-sm mb-5">
              <Stat label="正确率门槛" value={`≥ ${plan.required_accuracy}%`} />
              <Stat label="每日奖励" value={`+${plan.daily_reward} 币`} />
              <Stat label="完成大奖" value={`+${plan.reward_total} 币`} />
              <Stat label="报名扣费" value={`-${plan.enroll_cost} 币`} />
            </div>

            {todayChecked ? (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-success/10 text-success text-sm">
                <Trophy className="h-4 w-4" />
                今日已打卡，明天继续加油！
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>今日尚未打卡。完成一次正确率 ≥{plan.required_accuracy}% 的测评即可。</span>
                </div>
                <Button onClick={() => navigate("/test")} className="w-full" size="lg">
                  去完成今日测评
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="font-display font-bold text-lg">100 天打卡挑战</span>
            </div>
            <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
              花费 <strong className="text-foreground">99 虚拟币</strong> 报名，坚持 <strong className="text-foreground">100 天每日打卡</strong>（每日完成一次正确率 ≥60% 的测评），完成全部即返还 <strong className="text-gold">200 虚拟币</strong>，每日另奖 1 币。
            </p>
            <div className="grid grid-cols-3 gap-3 mb-5 text-center">
              <BigStat label="报名" value="99 币" tone="muted" />
              <BigStat label="完成奖" value="+200 币" tone="gold" />
              <BigStat label="净赚" value="+101 币" tone="primary" />
            </div>
            <Button onClick={handleEnroll} disabled={enrolling || (wallet?.coins ?? 0) < 99} className="w-full" size="lg">
              {enrolling ? "报名中..." : (wallet?.coins ?? 0) < 99 ? "余额不足 99 币" : "立即报名"}
            </Button>
            {(wallet?.coins ?? 0) < 99 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                完成测评、PK 等活动可赚取虚拟币（功能开发中）
              </p>
            )}
          </Card>
        )}

        {/* History */}
        {history && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-display font-semibold">打卡记录</span>
              </div>
              {history.records.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无记录</p>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-auto text-sm">
                  {history.records.map((r) => (
                    <li key={r.id} className="flex justify-between py-1 border-b border-border/30 last:border-0">
                      <span>{r.checkin_date}</span>
                      <span className="text-muted-foreground">{r.accuracy}%</span>
                      <span className="text-gold">+{r.reward_coins}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-primary" />
                <span className="font-display font-semibold">币种流水</span>
              </div>
              {history.transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无流水</p>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-auto text-sm">
                  {history.transactions.map((t) => (
                    <li key={t.id} className="flex justify-between py-1 border-b border-border/30 last:border-0">
                      <span>{reasonLabel[t.reason] ?? t.reason}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString()}
                      </span>
                      <span className={t.amount > 0 ? "text-success" : "text-destructive"}>
                        {t.amount > 0 ? "+" : ""}{t.amount}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between bg-muted/30 rounded-lg px-3 py-2">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

const BigStat = ({ label, value, tone }: { label: string; value: string; tone: "primary" | "gold" | "muted" }) => {
  const color = tone === "gold" ? "text-gold" : tone === "primary" ? "text-primary" : "text-muted-foreground";
  return (
    <div className="rounded-lg border border-border/50 py-3">
      <div className={`font-display font-bold text-lg ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
};
