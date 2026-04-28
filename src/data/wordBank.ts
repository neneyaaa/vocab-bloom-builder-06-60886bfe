import { supabase } from "@/integrations/supabase/client";

export interface Word {
  id: string;
  word: string;
  meaning: string;
  options: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

let cache: Word[] | null = null;
let inflight: Promise<Word[]> | null = null;

/** Fetch all enabled words from the database (cached after first call). */
export async function loadAllWords(force = false): Promise<Word[]> {
  if (!force && cache) return cache;
  if (!force && inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from("words")
      .select("id, word, meaning, options, difficulty")
      .eq("enabled", true)
      .limit(2000);
    if (error) {
      console.error("loadAllWords error:", error);
      inflight = null;
      return cache ?? [];
    }
    const words: Word[] = (data ?? []).map((w: any) => ({
      id: String(w.id),
      word: w.word,
      meaning: w.meaning,
      options: Array.isArray(w.options) ? w.options : [],
      difficulty: (w.difficulty ?? "medium") as Word["difficulty"],
    }));
    cache = words;
    inflight = null;
    return words;
  })();
  return inflight;
}

export function clearWordsCache() {
  cache = null;
  inflight = null;
}

/** Get N random questions (loads from DB if not yet loaded). */
export async function getRandomQuestions(count: number = 20): Promise<Word[]> {
  const all = await loadAllWords();
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
