import { Word, loadAllWords } from "@/data/wordBank";

/**
 * Deterministically pick N words for a match using a seeded shuffle so both
 * players get the exact same questions in the exact same order.
 * Both players must call this with the same seed AND have synced word lists,
 * so we sort by id first to ensure deterministic ordering across clients.
 */
export async function getMatchQuestions(seed: string, count = 10): Promise<Word[]> {
  const all = await loadAllWords();
  // Sort by id for deterministic base order (both clients see the same array)
  const base = [...all].sort((a, b) => a.id.localeCompare(b.id));

  // Mulberry32 PRNG seeded by hashing the match seed
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  let state = h >>> 0;
  const rand = () => {
    state |= 0; state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base.slice(0, count);
}
