import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Trophy, Swords, Clock, X, Check, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getMatchQuestions } from "@/lib/pkWords";
import type { Word } from "@/data/wordBank";
import { createBot, botPlanAnswer, botRandomChat, BotProfile, BotDifficulty } from "@/lib/aiBot";
import { UserAvatar } from "@/components/UserAvatar";
import type { RealtimeChannel } from "@supabase/supabase-js";

const TOTAL_QUESTIONS = 10;
const TIME_PER_Q = 12;

interface OpponentInfo {
  id: string;
  username: string;
  avatar_url: string | null;
  isBot?: boolean;
}

const QUICK_CHATS = ["👋 加油！", "💪 来吧！", "😎 看我的", "🔥 必胜", "🤔 好难", "😂 哈哈"];
const EMOJIS = ["👍", "👏", "🎉", "💯", "🤯", "😅", "🥺", "😤", "🙏", "❤️"];

interface ChatBubble {
  id: number;
  side: "me" | "opp";
  text: string;
  isEmoji: boolean;
}

const PKRoom = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [params] = useSearchParams();
  const opponentHint = params.get("opponent");
  const botParam = params.get("bot") as BotDifficulty | null;
  const isBotMatch = !!botParam;

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
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const botRef = useRef<BotProfile | null>(null);
  const botTimerRef = useRef<number | null>(null);
  const botChatTimerRef = useRef<number | null>(null);
  const bubbleIdRef = useRef(0);

  const [questions, setQuestions] = useState<Word[]>([]);
  useEffect(() => {
    if (matchId) getMatchQuestions(matchId, TOTAL_QUESTIONS).then(setQuestions);
  }, [matchId]);
  const currentQ = questions[currentIdx];

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  // Initialize bot or set up realtime channel
  useEffect(() => {
    if (!user || !profile || !matchId) return;

    if (isBotMatch) {
      // Create bot opponent
      const bot = createBot(botParam ?? "medium");
      botRef.current = bot;
      setOpponent({ id: bot.id, username: bot.username, avatar_url: null, isBot: true });
      // Initial greeting
      setTimeout(() => addBubble("opp", "👋 准备好了吗？", false), 800);
      return;
    }

    // Real-player channel
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
      setOpponent(payload.payload as OpponentInfo);
    });

    ch.on("broadcast", { event: "chat" }, (payload) => {
      const { text, isEmoji } = payload.payload as { text: string; isEmoji: boolean };
      addBubble("opp", text, isEmoji);
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

  // Per-question timer + bot answer scheduling
  useEffect(() => {
    if (finished || revealed || !currentQ) return;
    setTimeLeft(TIME_PER_Q);

    // Schedule bot's answer for this question
    if (isBotMatch && botRef.current) {
      const plan = botPlanAnswer(botRef.current, currentQ);
      botTimerRef.current = window.setTimeout(() => {
        if (!revealed && !finished) {
          setOppAnswered(true);
          if (plan.correct) setOppScore((s) => s + 1);
        }
      }, plan.delayMs);

      // Random chance bot sends a chat
      if (Math.random() < 0.35) {
        botChatTimerRef.current = window.setTimeout(() => {
          addBubble("opp", botRandomChat(), false);
        }, 1500 + Math.random() * 3000);
      }
    }

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

    return () => {
      clearInterval(interval);
      if (botTimerRef.current) { clearTimeout(botTimerRef.current); botTimerRef.current = null; }
      if (botChatTimerRef.current) { clearTimeout(botChatTimerRef.current); botChatTimerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, finished]);

  const addBubble = (side: "me" | "opp", text: string, isEmoji: boolean) => {
    const id = ++bubbleIdRef.current;
    setBubbles((prev) => [...prev, { id, side, text, isEmoji }]);
    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== id));
    }, 3500);
  };

  const sendChat = (text: string, isEmoji: boolean) => {
    addBubble("me", text, isEmoji);
    if (isBotMatch) return;
    channelRef.current?.send({
      type: "broadcast",
      event: "chat",
      payload: { text, isEmoji },
    });
  };

  const handleAnswer = (optionIdx: number, timeout = false) => {
    if (revealed || !currentQ) return;
    setSelected(optionIdx);
    setRevealed(true);
    const correct = !timeout && currentQ.options[optionIdx] === currentQ.meaning;
    if (correct) setMyScore((s) => s + 1);

    if (!isBotMatch) {
      channelRef.current?.send({
        type: "broadcast",
        event: "answer",
        payload: { idx: currentIdx, correct },
      });
    }

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

  // Save match result
  useEffect(() => {
    if (!finished || resultSaved || !user || !matchId) return;
    let result: "win" | "lose" | "draw" = "draw";
    if (myScore > oppScore) result = "win";
    else if (myScore < oppScore) result = "lose";

    supabase.from("match_results").insert({
      match_id: matchId,
      user_id: user.id,
      // Bot opponents are stored as null opponent_id (so they don't appear on real leaderboards as victims)
      opponent_id: isBotMatch || !opponent?.id || opponent.id.startsWith("bot_") ? null : opponent.id,
      score: myScore,
      opponent_score: oppScore,
      result,
    }).then(({ error }) => {
      if (error) console.error(error);
      setResultSaved(true);
    });
  }, [finished, resultSaved, user, matchId, myScore, oppScore, opponent, isBotMatch]);

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
          <p className="text-muted-foreground mb-2">
            最终比分 <span className="font-bold text-foreground">{myScore} : {oppScore}</span>
          </p>
          {isBotMatch && (
            <p className="text-xs text-muted-foreground mb-6">
              对手：{opponent?.username}（AI 陪练）
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Button variant="outline" onClick={() => navigate("/pk")}>再来一局</Button>
            <Button onClick={() => navigate("/leaderboard")}>查看排行榜</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-2xl mx-auto w-full">
      {/* Score header with avatars and chat bubbles */}
      <div className="flex items-start justify-between mb-6 gap-2 relative">
        <PlayerCard
          name={profile?.username ?? "我"}
          avatarUrl={profile?.avatar_url}
          score={myScore}
          highlight
          bubble={bubbles.filter((b) => b.side === "me").slice(-1)[0]}
          bubblePosition="left"
        />
        <div className="flex flex-col items-center mx-2 pt-2">
          <Swords className="h-6 w-6 text-primary mb-1" />
          <span className="text-xs text-muted-foreground">{currentIdx + 1} / {TOTAL_QUESTIONS}</span>
        </div>
        <PlayerCard
          name={opponent?.username ?? (isBotMatch ? "AI 加载中..." : "对手")}
          avatarUrl={opponent?.avatar_url}
          score={oppScore}
          answered={oppAnswered}
          bubble={bubbles.filter((b) => b.side === "opp").slice(-1)[0]}
          bubblePosition="right"
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
              if (isCorrect) cls = "border-accent bg-accent/10";
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

        {/* Quick chat bar */}
        <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0 h-8 px-2.5">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="grid grid-cols-5 gap-1">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => sendChat(e, true)}
                    className="text-2xl w-10 h-10 rounded-md hover:bg-muted transition-colors"
                  >{e}</button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {QUICK_CHATS.map((text) => (
            <button
              key={text}
              onClick={() => sendChat(text, false)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/70 transition-colors whitespace-nowrap"
            >
              {text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const PlayerCard = ({ name, avatarUrl, score, highlight, answered, bubble, bubblePosition }: {
  name: string;
  avatarUrl?: string | null;
  score: number;
  highlight?: boolean;
  answered?: boolean;
  bubble?: ChatBubble;
  bubblePosition: "left" | "right";
}) => (
  <div className="flex-1 relative">
    {bubble && (
      <div
        className={`absolute -top-12 z-10 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
          bubblePosition === "left" ? "left-0" : "right-0"
        }`}
      >
        <div className={`px-3 py-1.5 rounded-2xl shadow-lg max-w-[180px] truncate ${
          bubble.isEmoji ? "text-2xl bg-transparent" : "bg-foreground text-background text-sm"
        }`}>
          {bubble.text}
        </div>
      </div>
    )}
    <div className={`flex items-center gap-2 rounded-xl p-2.5 border-2 ${
      highlight ? "border-primary bg-primary/5" : "border-border/60 bg-card"
    }`}>
      <UserAvatar username={name} avatarUrl={avatarUrl} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
          {name}
          {answered && <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
        </div>
        <div className="text-xl font-display font-black leading-tight">{score}</div>
      </div>
    </div>
  </div>
);

export default PKRoom;
