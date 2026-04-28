import { useNavigate } from "react-router-dom";
import { BookOpen, History, Sparkles, Brain, Target, TrendingUp, Swords, Trophy, LogIn, LogOut, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHistory } from "@/lib/testService";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { toast } from "sonner";

const Home = () => {
  const navigate = useNavigate();
  const history = getHistory();
  const lastTest = history[0];
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success("已退出登录");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="font-display text-xl font-bold text-foreground">词界</span>
          <span className="text-xs text-muted-foreground font-body ml-1">WordScope</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")} className="text-muted-foreground hover:text-foreground">
            <Trophy className="h-4 w-4 mr-1" />排行榜
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/history")} className="text-muted-foreground hover:text-foreground hidden sm:inline-flex">
            <History className="h-4 w-4 mr-1" />历史
          </Button>
          {user && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/checkin")} className="text-muted-foreground hover:text-foreground">
              <Coins className="h-4 w-4 mr-1 text-gold" />打卡
            </Button>
          )}
          {user ? (
            <>
              <button
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted transition-colors"
              >
                <UserAvatar username={profile?.username} avatarUrl={profile?.avatar_url} size="sm" />
                <span className="hidden sm:inline text-sm font-medium">{profile?.username ?? "..."}</span>
              </button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} title="退出登录">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button variant="default" size="sm" onClick={() => navigate("/auth")}>
              <LogIn className="h-4 w-4 mr-1" />登录
            </Button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            智能词汇量测评 · 实时 PK 对战
          </div>

          <h1 className="text-5xl md:text-6xl font-display font-black text-foreground leading-tight mb-6">
            探索你的
            <span className="text-primary block mt-1">词汇边界</span>
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg mx-auto">
            通过科学测评了解你的英语词汇水平，与全球玩家实时对战，登顶每周排行榜！
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Button
              size="lg"
              onClick={() => navigate("/test")}
              className="text-base px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 w-full sm:w-auto"
            >
              <Target className="h-5 w-5 mr-2" />
              开始测评
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate(user ? "/pk" : "/auth")}
              className="text-base px-8 py-6 rounded-xl w-full sm:w-auto border-accent/40 hover:bg-accent/5"
            >
              <Swords className="h-5 w-5 mr-2 text-accent" />
              1v1 PK 对战
            </Button>
          </div>

          {lastTest && (
            <p className="text-sm text-muted-foreground mb-8">
              上次得分：<span className="font-medium text-foreground">{lastTest.accuracy}%</span>
            </p>
          )}

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-xl mx-auto">
            <FeatureCard icon={<Brain className="h-5 w-5 text-primary" />} title="智能抽题" desc="多难度混合出题" />
            <FeatureCard icon={<Swords className="h-5 w-5 text-accent" />} title="实时 PK" desc="与全球玩家对战" />
            <FeatureCard icon={<TrendingUp className="h-5 w-5 text-success" />} title="排行竞速" desc="周/月榜单争锋" />
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-sm text-muted-foreground">
        词界 WordScope · 词汇量测评工具
        {" · "}
        <a href="/partners" className="opacity-60 hover:opacity-100 hover:text-primary transition-opacity">商务合作</a>
        {" · "}
        <a href="/business" className="opacity-40 hover:opacity-100 hover:text-primary transition-opacity">商务后台</a>
        {" · "}
        <a href="/admin/login" className="opacity-40 hover:opacity-100 hover:text-primary transition-opacity">管理员</a>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50">
    {icon}
    <span className="font-display font-semibold text-sm text-foreground">{title}</span>
    <span className="text-xs text-muted-foreground">{desc}</span>
  </div>
);

export default Home;
