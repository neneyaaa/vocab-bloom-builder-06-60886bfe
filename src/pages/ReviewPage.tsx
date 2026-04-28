import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AnswerReview from "@/components/AnswerReview";
import { getCloudRunDetail, type CloudTestDetail, type AnswerRecord } from "@/lib/testService";

/**
 * /review/test/:runId  -> 测评回溯
 * /review/pk/:matchId  -> PK 比赛回溯（?vs=opponentId 用于显示对手答案对比）
 */
const ReviewPage = () => {
  const { kind, id } = useParams<{ kind: "test" | "pk"; id: string }>();
  const [params] = useSearchParams();
  const opponentId = params.get("vs");
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [testDetail, setTestDetail] = useState<CloudTestDetail | null>(null);
  const [pkMy, setPkMy] = useState<AnswerRecord[]>([]);
  const [pkOpp, setPkOpp] = useState<Record<number, { answer: string | null; correct: boolean }>>({});
  const [title, setTitle] = useState("答题回溯");

  useEffect(() => {
    (async () => {
      if (!id) return;
      if (kind === "test") {
        const d = await getCloudRunDetail(id);
        setTestDetail(d);
        if (d) setTitle(`测评回溯 · ${d.level} · ${d.accuracy}%`);
      } else if (kind === "pk" && user) {
        // Fetch my answers + (optionally) opponent's, in parallel
        const queries: Promise<any>[] = [
          supabase
            .from("pk_match_answers")
            .select("*")
            .eq("match_id", id)
            .eq("user_id", user.id)
            .order("question_index"),
        ];
        if (opponentId) {
          queries.push(
            supabase
              .from("pk_match_answers")
              .select("*")
              .eq("match_id", id)
              .eq("user_id", opponentId)
              .order("question_index"),
          );
        }
        const results = await Promise.all(queries);
        const my = (results[0]?.data ?? []) as any[];
        const opp = (results[1]?.data ?? []) as any[];
        setPkMy(
          my.map((a) => ({
            wordId: a.word_id ?? "",
            word: a.word,
            correctAnswer: a.correct_answer,
            userAnswer: a.user_answer,
            isCorrect: a.is_correct,
            difficulty: a.difficulty,
          })),
        );
        const oppMap: Record<number, { answer: string | null; correct: boolean }> = {};
        opp.forEach((a) => {
          oppMap[a.question_index] = { answer: a.user_answer, correct: a.is_correct };
        });
        setPkOpp(oppMap);
        setTitle(`PK 回溯 · ${my.filter((a) => a.is_correct).length} / ${my.length}`);
      }
      setLoading(false);
    })();
  }, [kind, id, opponentId, user?.id]);

  const answers: AnswerRecord[] =
    kind === "test" ? testDetail?.answers ?? [] : pkMy;

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto w-full">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回
        </Button>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-display font-bold">{title}</span>
        </div>
        <div className="w-10" />
      </nav>

      <main className="flex-1 px-6 py-4 max-w-3xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载中...
          </div>
        ) : answers.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            没有找到答题记录。可能是较早的对局未保存详细数据。
          </div>
        ) : (
          <AnswerReview
            answers={answers}
            opponentByIdx={kind === "pk" && opponentId ? pkOpp : undefined}
          />
        )}
      </main>
    </div>
  );
};

export default ReviewPage;
