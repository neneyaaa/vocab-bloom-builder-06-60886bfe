import { useMemo, useState } from "react";
import { Check, X, HelpCircle } from "lucide-react";
import { AnswerRecord } from "@/lib/testService";
import { Button } from "@/components/ui/button";

const DIFF_LABEL: Record<string, string> = {
  easy: "基础",
  medium: "进阶",
  hard: "高级",
};

type FilterKey = "all" | "wrong" | "unknown" | "correct";

interface Props {
  answers: AnswerRecord[];
  /**
   * Optional column for opponent's choice (used in PK review).
   * Map: question_index -> opponent answer string ("" if not played, undefined if not provided).
   */
  opponentByIdx?: Record<number, { answer: string | null; correct: boolean }>;
}

const AnswerReview = ({ answers, opponentByIdx }: Props) => {
  const [filter, setFilter] = useState<FilterKey>("all");

  const counts = useMemo(() => {
    const wrong = answers.filter((a) => !a.isCorrect && a.userAnswer !== null).length;
    const unknown = answers.filter((a) => a.userAnswer === null).length;
    const correct = answers.filter((a) => a.isCorrect).length;
    return { all: answers.length, wrong, unknown, correct };
  }, [answers]);

  const filtered = useMemo(() => {
    return answers
      .map((a, i) => ({ ...a, _idx: i }))
      .filter((a) => {
        if (filter === "all") return true;
        if (filter === "correct") return a.isCorrect;
        if (filter === "wrong") return !a.isCorrect && a.userAnswer !== null;
        if (filter === "unknown") return a.userAnswer === null;
        return true;
      });
  }, [answers, filter]);

  const FILTERS: Array<{ key: FilterKey; label: string; cls: string }> = [
    { key: "all", label: `全部 (${counts.all})`, cls: "" },
    { key: "wrong", label: `错误 (${counts.wrong})`, cls: "text-destructive" },
    { key: "unknown", label: `不认识 (${counts.unknown})`, cls: "text-muted-foreground" },
    { key: "correct", label: `正确 (${counts.correct})`, cls: "text-success" },
  ];

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
            className={filter === f.key ? "" : f.cls}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-xl">
          没有这一类的题目
        </div>
      ) : (
        <ol className="space-y-2">
          {filtered.map((a) => {
            const isUnknown = a.userAnswer === null;
            const opp = opponentByIdx?.[a._idx];
            return (
              <li
                key={a._idx}
                className={`rounded-xl border p-4 ${
                  a.isCorrect
                    ? "border-success/30 bg-success/5"
                    : isUnknown
                      ? "border-border bg-muted/30"
                      : "border-destructive/30 bg-destructive/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">#{a._idx + 1}</span>
                      <span className="font-display font-bold text-lg">{a.word}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                        {DIFF_LABEL[a.difficulty] ?? a.difficulty}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">正确释义</div>
                    <div className="text-sm font-medium text-success">{a.correctAnswer}</div>

                    {!a.isCorrect && (
                      <>
                        <div className="text-xs text-muted-foreground mt-2">你的答案</div>
                        <div className={`text-sm ${isUnknown ? "text-muted-foreground italic" : "text-destructive line-through"}`}>
                          {isUnknown ? "（未作答 / 不认识）" : a.userAnswer}
                        </div>
                      </>
                    )}

                    {opp && (
                      <>
                        <div className="text-xs text-muted-foreground mt-2">对手答案</div>
                        <div className={`text-sm ${opp.correct ? "text-success" : opp.answer === null ? "text-muted-foreground italic" : "text-destructive"}`}>
                          {opp.answer === null ? "（未作答）" : opp.answer}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="shrink-0">
                    {a.isCorrect ? (
                      <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-success" />
                      </div>
                    ) : isUnknown ? (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                        <X className="w-4 h-4 text-destructive" />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default AnswerReview;
