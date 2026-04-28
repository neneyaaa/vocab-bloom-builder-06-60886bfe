import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { BookOpen, RotateCcw, Home, Trophy, Target, XCircle, HelpCircle, Clock, Lightbulb, ListChecks, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TestResult } from "@/lib/testService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const levelColors: Record<string, string> = {
  "卓越": "text-gold",
  "优秀": "text-primary",
  "良好": "text-success",
  "基础": "text-accent",
  "入门": "text-muted-foreground",
};

const Result = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams<{ id: string }>();
  const state = location.state as { result?: TestResult; cloudId?: string } | null;
  const result = state?.result;
  const cloudId = state?.cloudId ?? routeId;
  const [checking, setChecking] = useState(false);

  if (!result) {
    navigate("/");
    return null;
  }

  const handleCheckin = async () => {
    if (!cloudId) {
      toast.error("缺少测评 ID，无法打卡");
      return;
    }
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("checkin-api", {
        body: { action: "checkin", test_run_id: cloudId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const bonus = data.completion_bonus > 0 ? `，🎉 完成 100 天大奖 +${data.completion_bonus} 币！` : "";
      toast.success(`打卡成功！第 ${data.days_completed}/${data.required_days} 天，奖励 +${data.reward_today} 币${bonus}`);
      navigate("/checkin");
    } catch (e: any) {
      toast.error(e.message ?? "打卡失败");
    } finally {
      setChecking(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}分${sec}秒`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-display font-bold text-foreground">词界</span>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center px-6 py-8 max-w-2xl mx-auto w-full">
        {/* Level Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <Trophy className={`h-10 w-10 ${levelColors[result.level] || "text-primary"}`} />
          </div>
          <h1 className={`text-4xl font-display font-black mb-2 ${levelColors[result.level] || "text-foreground"}`}>
            {result.level}
          </h1>
          <p className="text-muted-foreground text-sm">{result.levelDescription}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full mb-8">
          <StatCard icon={<Target className="h-4 w-4 text-primary" />} label="正确率" value={`${result.accuracy}%`} />
          <StatCard icon={<Trophy className="h-4 w-4 text-success" />} label="正确" value={`${result.correctCount}`} />
          <StatCard icon={<XCircle className="h-4 w-4 text-destructive" />} label="错误" value={`${result.wrongCount}`} />
          <StatCard icon={<HelpCircle className="h-4 w-4 text-muted-foreground" />} label="不认识" value={`${result.unknownCount}`} />
        </div>

        {/* Extra Info */}
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground mb-8">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            用时 {formatTime(result.duration)}
          </span>
          <span>预估词汇量：<strong className="text-foreground">{result.estimatedVocabulary.toLocaleString()}</strong></span>
        </div>

        {/* Suggestion */}
        <div className="bg-card rounded-2xl border border-border/50 p-6 w-full mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-accent" />
            <span className="font-display font-semibold text-foreground text-sm">学习建议</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{result.suggestion}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {result.accuracy >= 60 && (
            <Button onClick={handleCheckin} disabled={checking} className="flex-1 py-5 rounded-xl bg-gold text-foreground hover:bg-gold/90">
              <Coins className="h-4 w-4 mr-2" />
              {checking ? "打卡中..." : "今日打卡"}
            </Button>
          )}
          <Button onClick={() => navigate("/test")} variant="outline" className="flex-1 py-5 rounded-xl">
            <RotateCcw className="h-4 w-4 mr-2" />
            再测一次
          </Button>
          {cloudId && (
            <Button
              variant="outline"
              onClick={() => navigate(`/review/test/${cloudId}`)}
              className="flex-1 py-5 rounded-xl"
            >
              <ListChecks className="h-4 w-4 mr-2" />
              查看每题对错
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/")} className="flex-1 py-5 rounded-xl">
            <Home className="h-4 w-4 mr-2" />
            返回首页
          </Button>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
    <div className="flex justify-center mb-2">{icon}</div>
    <div className="text-2xl font-display font-bold text-foreground">{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{label}</div>
  </div>
);

export default Result;
