import { describe, expect, it } from 'vitest';
import { containsProfanity } from '../../src/lib/moderation';

describe('containsProfanity', () => {
  it('returns false for empty / clean text', () => {
    expect(containsProfanity('')).toBe(false);
    expect(containsProfanity('Great service, very professional.')).toBe(false);
    expect(containsProfanity('Πολύ καλή εξυπηρέτηση!')).toBe(false);
  });

  it('catches common English bad words case-insensitively', () => {
    expect(containsProfanity('What the fuck')).toBe(true);
    expect(containsProfanity('FUCK this')).toBe(true);
    expect(containsProfanity('You bitch')).toBe(true);
  });

  it('catches Greek bad words including with diacritics', () => {
    expect(containsProfanity('είσαι μαλάκας')).toBe(true);
    expect(containsProfanity('ΜΑΛΑΚΑΣ')).toBe(true);
    expect(containsProfanity('γαμώτο, καθυστέρησε')).toBe(true);
    expect(containsProfanity('σκατά υπηρεσία')).toBe(true);
  });

  it('does not flag normal Greek text that happens to share letters', () => {
    expect(containsProfanity('Καλημέρα, Δευτέρα')).toBe(false);
    expect(containsProfanity('αμα δεν έχει κάτι, ψάξε αλλού')).toBe(false);
  });
});
