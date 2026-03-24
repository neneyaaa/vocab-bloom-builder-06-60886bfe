import { useNavigate } from "react-router-dom";
import { BookOpen, History, Sparkles, Brain, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHistory } from "@/lib/testService";

const Home = () => {
  const navigate = useNavigate();
  const history = getHistory();
  const lastTest = history[0];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="font-display text-xl font-bold text-foreground">词界</span>
          <span className="text-xs text-muted-foreground font-body ml-1">WordScope</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/history")}
          className="text-muted-foreground hover:text-foreground"
        >
          <History className="h-4 w-4 mr-1" />
          历史记录
        </Button>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            智能词汇量测评
          </div>

          <h1 className="text-5xl md:text-6xl font-display font-black text-foreground leading-tight mb-6">
            探索你的
            <span className="text-primary block mt-1">词汇边界</span>
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg mx-auto">
            通过科学测评了解你的英语词汇水平，获得个性化学习建议，开启高效词汇提升之旅。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button
              size="lg"
              onClick={() => navigate("/test")}
              className="text-base px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90"
            >
              <Target className="h-5 w-5 mr-2" />
              开始测评
            </Button>
            {lastTest && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/history")}
                className="text-base px-8 py-6 rounded-xl"
              >
                上次得分：{lastTest.accuracy}%
              </Button>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-xl mx-auto">
            <FeatureCard
              icon={<Brain className="h-5 w-5 text-primary" />}
              title="智能抽题"
              desc="多难度混合出题"
            />
            <FeatureCard
              icon={<Target className="h-5 w-5 text-accent" />}
              title="精准评估"
              desc="五级词汇水平判定"
            />
            <FeatureCard
              icon={<TrendingUp className="h-5 w-5 text-success" />}
              title="学习建议"
              desc="个性化提升方案"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-muted-foreground">
        词界 WordScope · 词汇量测评工具
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
