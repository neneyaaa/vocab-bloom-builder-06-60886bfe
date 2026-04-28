import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Word, getRandomQuestions } from "@/data/wordBank";
import { AnswerRecord, evaluateAnswer, calculateResult, saveResult, saveResultToCloud } from "@/lib/testService";
import { useAuth } from "@/contexts/AuthContext";

const TOTAL_QUESTIONS = 20;

const Test = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const startTime = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    getRandomQuestions(TOTAL_QUESTIONS).then(setQuestions);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentWord = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0;

  const handleSelect = (option: string) => {
    if (showFeedback) return;
    setSelectedOption(option);
    setShowFeedback(true);

    const record = evaluateAnswer(currentWord, option);
    const newAnswers = [...answers, record];
    setAnswers(newAnswers);

    setTimeout(() => {
      advance(newAnswers);
    }, 800);
  };

  const handleUnknown = () => {
    if (showFeedback) return;
    setSelectedOption(null);
    setShowFeedback(true);

    const record = evaluateAnswer(currentWord, null);
    const newAnswers = [...answers, record];
    setAnswers(newAnswers);

    setTimeout(() => {
      advance(newAnswers);
    }, 600);
  };

  const advance = async (newAnswers: AnswerRecord[]) => {
    if (currentIndex + 1 >= questions.length) {
      const duration = Math.floor((Date.now() - startTime.current) / 1000);
      const result = calculateResult(newAnswers, duration);
      saveResult(result);
      let cloudId: string | null = null;
      if (user) {
        cloudId = await saveResultToCloud(user.id, result);
      }
      // Prefer cloud id in the URL so the result is shareable / refresh-safe
      navigate(`/result/${cloudId ?? result.id}`, { state: { result, cloudId } });
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowFeedback(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!currentWord) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">加载题目中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto w-full">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />
          退出
        </Button>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-display font-bold text-foreground">词界</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {formatTime(elapsed)}
        </div>
      </nav>

      {/* Progress */}
      <div className="px-6 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>第 {currentIndex + 1} / {questions.length} 题</span>
          <span className="capitalize px-2 py-0.5 rounded-full text-xs bg-secondary">
            {currentWord.difficulty === 'easy' ? '基础' : currentWord.difficulty === 'medium' ? '进阶' : '高级'}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-lg">
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-8 mb-6">
            <p className="text-sm text-muted-foreground mb-2">请选择以下单词的正确释义：</p>
            <h2 className="text-4xl font-display font-black text-foreground tracking-wide mb-2">
              {currentWord.word}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentWord.options.map((option, i) => {
              let optionClass = "w-full text-left p-4 rounded-xl border transition-all duration-200 font-body text-sm ";
              if (showFeedback) {
                if (option === currentWord.meaning) {
                  optionClass += "bg-success/10 border-success text-success font-semibold";
                } else if (option === selectedOption && option !== currentWord.meaning) {
                  optionClass += "bg-destructive/10 border-destructive text-destructive";
                } else {
                  optionClass += "bg-card border-border/50 text-muted-foreground opacity-50";
                }
              } else {
                optionClass += "bg-card border-border/50 hover:border-primary hover:bg-primary/5 cursor-pointer text-foreground";
              }

              return (
                <button
                  key={i}
                  className={optionClass}
                  onClick={() => handleSelect(option)}
                  disabled={showFeedback}
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-xs font-semibold mr-3 text-secondary-foreground">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            className="w-full mt-4 text-muted-foreground hover:text-foreground"
            onClick={handleUnknown}
            disabled={showFeedback}
          >
            不认识这个词
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Test;
