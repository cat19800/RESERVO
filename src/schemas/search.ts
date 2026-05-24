import { z } from 'zod';

export const CATEGORIES = ['DOCTOR', 'GYM', 'HAIR_SALON', 'BEAUTY_CARE'] as const;
export const SORT_OPTIONS = ['rating', 'recent'] as const;

const numericString = (max: number) =>
  z
    .string()
    .transform((v) => (v === '' ? undefined : Number(v)))
    .pipe(z.number().int().min(0).max(max).optional());

const ratingString = z
  .string()
  .transform((v) => (v === '' ? undefined : Number(v)))
  .pipe(z.number().min(0).max(5).optional());

export const searchQuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  city: z.string().trim().max(64).optional(),
  q: z.string().trim().max(120).optional(),
  minRating: ratingString.optional(),
  sort: z.enum(SORT_OPTIONS).default('rating'),
  page: numericString(10_000).optional(),
  pageSize: numericString(50).optional(),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

export type ProCardDto = {
  id: string;
  displayName: string;
  category: (typeof CATEGORIES)[number];
  specialty: string | null;
  city: string;
  ratingAvg: number;
  ratingCount: number;
  avatarSeed: string;
  isPremium: boolean;
};

export type ProSearchResponse = {
  items: ProCardDto[];
  page: number;
  pageSize: number;
  total: number;
};

export type ProProfileDto = ProCardDto & {
  description: string | null;
  address: string;
  services: {
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    priceCents: number;
  }[];
  workingHours: { dayOfWeek: number; startTime: string; endTime: string }[];
};
