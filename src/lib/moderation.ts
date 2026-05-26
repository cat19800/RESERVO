/**
 * Tiny profanity filter for review comments (UC4 alt-flow E3).
 *
 * Scope: a small Greek + English bad-words list. Matched case-insensitively
 * with diacritic folding for Greek. Not exhaustive — moderation is genuinely
 * hard; this catches common slurs and the obvious cases. Real systems would
 * call a dedicated moderation API.
 */

// Lowercase entries; diacritics already stripped (see foldGreek()).
const BAD_WORDS: readonly string[] = [
  // English
  'fuck',
  'shit',
  'asshole',
  'bitch',
  'bastard',
  'cunt',
  'dick',
  // Greek (lowercased + diacritics stripped via foldGreek)
  'μαλακας',
  'γαμωτο',
  'γαμω',
  'σκατα',
  'πουστης',
  'καριολα',
  'βλακας',
];

const GREEK_DIACRITIC_MAP: Record<string, string> = {
  ά: 'α',
  έ: 'ε',
  ή: 'η',
  ί: 'ι',
  ό: 'ο',
  ύ: 'υ',
  ώ: 'ω',
  ϊ: 'ι',
  ϋ: 'υ',
  ΐ: 'ι',
  ΰ: 'υ',
  Ά: 'α',
  Έ: 'ε',
  Ή: 'η',
  Ί: 'ι',
  Ό: 'ο',
  Ύ: 'υ',
  Ώ: 'ω',
};

function foldGreek(s: string): string {
  return s.replace(/[άέήίόύώϊϋΐΰΆΈΉΊΌΎΏ]/g, (ch) => GREEK_DIACRITIC_MAP[ch] ?? ch);
}

export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const normalized = foldGreek(text.toLowerCase());
  return BAD_WORDS.some((bad) => normalized.includes(bad));
}
