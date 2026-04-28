import { Word } from "@/data/wordBank";

/**
 * AI Bot opponent for PK matches when no human is available.
 * The bot has a difficulty level that determines how often it answers correctly
 * and how quickly it answers each question.
 */

export type BotDifficulty = "easy" | "medium" | "hard";

const DIFFICULTY_PROFILES: Record<BotDifficulty, {
  // Base correctness probability per word difficulty
  accuracy: { easy: number; medium: number; hard: number };
  // Answer delay range in ms
  delayMin: number;
  delayMax: number;
  name: string;
  emoji: string;
}> = {
  easy:   { accuracy: { easy: 0.85, medium: 0.55, hard: 0.30 }, delayMin: 3500, delayMax: 8000, name: "新手机器人", emoji: "🤖" },
  medium: { accuracy: { easy: 0.95, medium: 0.75, hard: 0.50 }, delayMin: 2500, delayMax: 6000, name: "智能机器人", emoji: "🦾" },
  hard:   { accuracy: { easy: 0.98, medium: 0.90, hard: 0.75 }, delayMin: 1500, delayMax: 4500, name: "高手机器人", emoji: "👾" },
};

export const BOT_USERNAMES = ["Algo", "Lexi", "Verba", "Etymo", "Glossa", "Neo", "Synta", "Lingua"];

export interface BotProfile {
  id: string;
  username: string;
  avatar_url: null;
  difficulty: BotDifficulty;
  isBot: true;
}

export function createBot(difficulty: BotDifficulty = "medium"): BotProfile {
  const profile = DIFFICULTY_PROFILES[difficulty];
  const name = BOT_USERNAMES[Math.floor(Math.random() * BOT_USERNAMES.length)];
  return {
    id: `bot_${difficulty}_${Math.random().toString(36).slice(2, 8)}`,
    username: `${profile.emoji} ${name}`,
    avatar_url: null,
    difficulty,
    isBot: true,
  };
}

/**
 * Decide whether the bot answers the given question correctly,
 * and how long it takes to "type" the answer.
 */
export function botPlanAnswer(bot: BotProfile, word: Word): { correct: boolean; delayMs: number } {
  const profile = DIFFICULTY_PROFILES[bot.difficulty];
  const accuracy = profile.accuracy[word.difficulty];
  const correct = Math.random() < accuracy;
  const delayMs = profile.delayMin + Math.random() * (profile.delayMax - profile.delayMin);
  return { correct, delayMs };
}

/** Random PK chat lines the bot can send during a match */
export const BOT_CHAT_LINES = [
  "💪 来一局认真的！",
  "👀 哎呀，这题有点难...",
  "🔥 速度有点慢哦",
  "😎 这次我赢定了",
  "🤔 让我想想...",
  "🎯 必须答对！",
];

export function botRandomChat(): string {
  return BOT_CHAT_LINES[Math.floor(Math.random() * BOT_CHAT_LINES.length)];
}
