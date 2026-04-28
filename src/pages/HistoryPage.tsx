import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowLeft, Trash2, Calendar, Target, Trophy, ListChecks, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  getHistory, clearHistory, TestResult,
  getCloudHistory, deleteCloudRun, type CloudTestSummary,
} from "@/lib/testService";

const HistoryPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [cloud, setCloud] = useState<CloudTestSummary[]>([]);
  const [local, setLocal] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    if (user) {
      setCloud(await getCloudHistory(user.id));
    }
    setLocal(getHistory());
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) load(); }, [user?.id, authLoading]);

  const handleClearLocal = () => {
    if (window.confirm("确定要清空本地历史记录吗？（云端记录不受影响）")) {
      clearHistory();
      setLocal([]);
    }
  };

  const handleDeleteCloud = async (id: string) => {
    if (!window.confirm("确定要删除这条云端记录吗？")) return;
    if (await deleteCloudRun(id)) setCloud((c) => c.filter((x) => x.id !== id));
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const showEmpty = !loading && cloud.length === 0 && local.length === 0;

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto w-full">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回
        </Button>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-display font-bold text-foreground">历史记录</span>
        </div>
        {local.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={handleClearLocal} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : <div className="w-10" />}
      </nav>

      <main className="flex-1 px-6 py-4 max-w-3xl mx-auto w-full space-y-3">
        {loading ? (
          <div className="py-20 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : showEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Trophy className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">暂无测评记录</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/test")}>
              开始第一次测评
            </Button>
          </div>
        ) : (
          <>
            {cloud.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/review/test/${item.id}`)}
                className="w-full text-left bg-card rounded-xl border border-border/50 p-4 flex items-center justify-between hover:border-primary/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-bold text-foreground">{item.level}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {item.accuracy}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(item.created_at)}</span>
                    <span className="flex items-center gap-1"><Target className="h-3 w-3" />{item.correct_count}/{item.total_questions}</span>
                    <span>词汇量 ~{item.estimated_vocabulary.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-3">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <span className="text-xs text-primary hidden sm:inline">回溯</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteCloud(item.id); }}
                    className="ml-2 text-muted-foreground hover:text-destructive p-1"
                    aria-label="删除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </button>
            ))}
            {!user && local.length > 0 && (
              <div className="text-xs text-muted-foreground pt-4">以下为本地记录（未登录无法回溯每题明细，登录后可同步到云端）</div>
            )}
            {!user && local.map((item) => (
              <div key={item.id} className="bg-card rounded-xl border border-border/50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display font-bold text-foreground">{item.level}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{item.accuracy}%</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(item.date)}</span>
                  <span className="flex items-center gap-1"><Target className="h-3 w-3" />{item.correctCount}/{item.totalQuestions}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
