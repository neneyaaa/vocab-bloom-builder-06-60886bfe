import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Trophy, Swords, Clock, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getMatchQuestions } from "@/lib/pkWords";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";

const TOTAL_QUESTIONS = 10;
const TIME_PER_Q = 12; // seconds

interface OpponentInfo {
  id: string;
  username: string;
  avatar_url: string | null;
}

const PKRoom = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [params] = useSearchParams();
  const opponentHint = params.get("opponent");
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  const [opponent, setOpponent] = useState<OpponentInfo | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [oppAnswered, setOppAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [finished, setFinished] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const questions = matchId ? getMatchQuestions(matchId, TOTAL_QUESTIONS) : [];
  const currentQ = questions[currentIdx];

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  // Set up realtime channel for the match
  useEffect(() => {
    if (!user || !profile || !matchId) return;

    const ch = supabase.channel(`pk-room-${matchId}`, {
      config: { broadcast: { self: false }, presence: { key: user.id } },
    });
    channelRef.current = ch;

    ch.on("broadcast", { event: "answer" }, (payload) => {
      const { idx, correct } = payload.payload as { idx: number; correct: boolean };
      if (idx === currentIdx) setOppAnswered(true);
      if (correct) setOppScore((s) => s + 1);
    });

    ch.on("broadcast", { event: "hello" }, (payload) => {
      const info = payload.payload as OpponentInfo;
      setOpponent(info);
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ user_id: user.id, username: profile.username });
        ch.send({
          type: "broadcast",
          event: "hello",
          payload: { id: user.id, username: profile.username, avatar_url: profile.avatar_url },
        });
      }
    });

    // Fetch opponent profile if hint provided
    if (opponentHint) {
      supabase.from("profiles").select("id, username, avatar_url").eq("id", opponentHint).maybeSingle()
        .then(({ data }) => { if (data) setOpponent(data); });
    }

    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, matchId]);

  // Timer per question
  useEffect(() => {
    if (finished || revealed) return;
    setTimeLeft(TIME_PER_Q);
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          if (!revealed) handleAnswer(-1, true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, finished]);

  const handleAnswer = (optionIdx: number, timeout = false) => {
    if (revealed || !currentQ) return;
    setSelected(optionIdx);
    setRevealed(true);
    const correct = !timeout && currentQ.options[optionIdx] === currentQ.meaning;
    if (correct) setMyScore((s) => s + 1);

    channelRef.current?.send({
      type: "broadcast",
      event: "answer",
      payload: { idx: currentIdx, correct },
    });

    setTimeout(() => {
      const next = currentIdx + 1;
      if (next >= TOTAL_QUESTIONS) {
        setFinished(true);
      } else {
        setCurrentIdx(next);
        setSelected(null);
        setRevealed(false);
        setOppAnswered(false);
      }
    }, 1800);
  };

  // Save match result once finished
  useEffect(() => {
    if (!finished || resultSaved || !user || !matchId) return;
    let result: "win" | "lose" | "draw" = "draw";
    if (myScore > oppScore) result = "win";
    else if (myScore < oppScore) result = "lose";

    supabase.from("match_results").insert({
      match_id: matchId,
      user_id: user.id,
      opponent_id: opponent?.id ?? null,
      score: myScore,
      opponent_score: oppScore,
      result,
    }).then(({ error }) => {
      if (error) console.error(error);
      setResultSaved(true);
    });
  }, [finished, resultSaved, user, matchId, myScore, oppScore, opponent]);

  if (loading || !user || !currentQ) return null;

  if (finished) {
    const verdict = myScore > oppScore ? "win" : myScore < oppScore ? "lose" : "draw";
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className={`inline-flex w-24 h-24 rounded-full items-center justify-center mb-6 ${
            verdict === "win" ? "bg-accent/20" : verdict === "lose" ? "bg-muted" : "bg-primary/10"
          }`}>
            <Trophy className={`h-12 w-12 ${verdict === "win" ? "text-accent" : "text-muted-foreground"}`} />
          </div>
          <h1 className="text-4xl font-display font-black mb-2">
            {verdict === "win" ? "🎉 胜利！" : verdict === "lose" ? "再接再厉" : "势均力敌"}
          </h1>
          <p className="text-muted-foreground mb-8">
            最终比分 <span className="font-bold text-foreground">{myScore} : {oppScore}</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => navigate("/")}>返回首页</Button>
            <Button onClick={() => navigate("/leaderboard")}>查看排行榜</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-2xl mx-auto w-full">
      {/* Score header */}
      <div className="flex items-center justify-between mb-6">
        <PlayerCard name={profile?.username ?? "我"} score={myScore} highlight />
        <div className="flex flex-col items-center mx-3">
          <Swords className="h-6 w-6 text-primary mb-1" />
          <span className="text-xs text-muted-foreground">
            {currentIdx + 1} / {TOTAL_QUESTIONS}
          </span>
        </div>
        <PlayerCard
          name={opponent?.username ?? "对手"}
          score={oppScore}
          highlight={false}
          answered={oppAnswered}
        />
      </div>

      {/* Timer */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />剩余时间
          </span>
          <span className="font-mono font-bold">{timeLeft}s</span>
        </div>
        <Progress value={(timeLeft / TIME_PER_Q) * 100} className="h-1.5" />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="bg-card border border-border/60 rounded-2xl p-8 mb-6 text-center shadow-sm">
          <p className="text-xs text-muted-foreground mb-2">选择正确的中文释义</p>
          <h2 className="text-4xl md:text-5xl font-display font-black text-foreground">
            {currentQ.word}
          </h2>
        </div>

        <div className="grid gap-3">
          {currentQ.options.map((opt, i) => {
            const isCorrect = opt === currentQ.meaning;
            const isSelected = selected === i;
            let cls = "border-border/60 hover:border-primary hover:bg-primary/5";
            if (revealed) {
              if (isCorrect) cls = "border-accent bg-accent/10 text-accent-foreground";
              else if (isSelected) cls = "border-destructive bg-destructive/10";
              else cls = "border-border/40 opacity-60";
            }
            return (
              <button
                key={i}
                disabled={revealed}
                onClick={() => handleAnswer(i)}
                className={`flex items-center justify-between text-left p-4 rounded-xl border-2 transition-all ${cls}`}
              >
                <span className="font-medium">{opt}</span>
                {revealed && isCorrect && <Check className="h-5 w-5 text-accent" />}
                {revealed && isSelected && !isCorrect && <X className="h-5 w-5 text-destructive" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const PlayerCard = ({ name, score, highlight, answered }: { name: string; score: number; highlight: boolean; answered?: boolean }) => (
  <div className={`flex-1 rounded-xl p-3 border-2 ${highlight ? "border-primary bg-primary/5" : "border-border/60 bg-card"}`}>
    <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
      {name}
      {answered && <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
    </div>
    <div className="text-2xl font-display font-black">{score}</div>
  </div>
);

export default PKRoom;
