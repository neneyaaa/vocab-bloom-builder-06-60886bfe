import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowLeft, Trash2, Calendar, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHistory, clearHistory, TestResult } from "@/lib/testService";
import { useState } from "react";

const HistoryPage = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<TestResult[]>(getHistory());

  const handleClear = () => {
    if (window.confirm("确定要清空所有历史记录吗？")) {
      clearHistory();
      setHistory([]);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto w-full">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回
        </Button>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-display font-bold text-foreground">历史记录</span>
        </div>
        {history.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        {history.length === 0 && <div className="w-10" />}
      </nav>

      <main className="flex-1 px-6 py-4 max-w-3xl mx-auto w-full">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Trophy className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">暂无测评记录</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/test")}>
              开始第一次测评
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="bg-card rounded-xl border border-border/50 p-4 flex items-center justify-between hover:border-primary/30 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-bold text-foreground">{item.level}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {item.accuracy}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {item.correctCount}/{item.totalQuestions}
                    </span>
                    <span>词汇量 ~{item.estimatedVocabulary.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
