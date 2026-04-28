import { Word } from "@/data/wordBank";
import { supabase } from "@/integrations/supabase/client";

export interface AnswerRecord {
  wordId: string;
  word: string;
  correctAnswer: string;
  userAnswer: string | null; // null = "不认识"
  isCorrect: boolean;
  difficulty: string;
}

export interface TestResult {
  id: string;
  date: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unknownCount: number;
  accuracy: number;
  level: string;
  levelDescription: string;
  suggestion: string;
  estimatedVocabulary: number;
  answers: AnswerRecord[];
  duration: number; // seconds
}

export function evaluateAnswer(word: Word, userAnswer: string | null): AnswerRecord {
  return {
    wordId: word.id,
    word: word.word,
    correctAnswer: word.meaning,
    userAnswer,
    isCorrect: userAnswer === word.meaning,
    difficulty: word.difficulty,
  };
}

export function calculateResult(answers: AnswerRecord[], duration: number): TestResult {
  const total = answers.length;
  const correct = answers.filter(a => a.isCorrect).length;
  const unknown = answers.filter(a => a.userAnswer === null).length;
  const wrong = total - correct - unknown;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const { level, levelDescription, suggestion, estimatedVocabulary } = assessLevel(accuracy, correct, total);

  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date: new Date().toISOString(),
    totalQuestions: total,
    correctCount: correct,
    wrongCount: wrong,
    unknownCount: unknown,
    accuracy,
    level,
    levelDescription,
    suggestion,
    estimatedVocabulary,
    answers,
    duration,
  };
}

function assessLevel(accuracy: number, correct: number, total: number) {
  if (accuracy >= 90) {
    return {
      level: "卓越",
      levelDescription: "你的词汇量非常出色，已达到高级英语水平。",
      suggestion: "建议阅读英文原版书籍和学术论文，接触更多专业领域词汇，保持语言敏锐度。可以尝试GRE/GMAT词汇挑战。",
      estimatedVocabulary: 8000 + Math.floor(correct * 200),
    };
  } else if (accuracy >= 75) {
    return {
      level: "优秀",
      levelDescription: "你具备扎实的词汇基础，能够应对大多数英语场景。",
      suggestion: "建议通过精读英文文章巩固已有词汇，同时有计划地学习六级及考研核心词汇，逐步提升高级表达能力。",
      estimatedVocabulary: 5000 + Math.floor(correct * 150),
    };
  } else if (accuracy >= 55) {
    return {
      level: "良好",
      levelDescription: "你已掌握基础词汇，但在中高级词汇上仍有提升空间。",
      suggestion: "建议系统复习四级核心词汇，结合语境记忆法加深理解。每天坚持背诵20-30个新词，并通过阅读英语新闻加以巩固。",
      estimatedVocabulary: 3000 + Math.floor(correct * 120),
    };
  } else if (accuracy >= 35) {
    return {
      level: "基础",
      levelDescription: "你的词汇量处于初级阶段，需要加强基础词汇学习。",
      suggestion: "建议从高中核心词汇开始重新梳理，使用词汇App辅助记忆，每日坚持学习。重点掌握高频词汇的拼写和释义。",
      estimatedVocabulary: 1500 + Math.floor(correct * 100),
    };
  } else {
    return {
      level: "入门",
      levelDescription: "你的词汇积累刚刚起步，需要大量基础词汇输入。",
      suggestion: "建议从初中英语词汇表入手，配合图片记忆法和联想记忆法。先建立1000核心词汇的基础，再逐步扩展。不要急于求成，每天10-15个新词即可。",
      estimatedVocabulary: 500 + Math.floor(correct * 80),
    };
  }
}

const HISTORY_KEY = "wordscope_history";

export function saveResult(result: TestResult): void {
  const history = getHistory();
  history.unshift(result);
  if (history.length > 50) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getHistory(): TestResult[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
