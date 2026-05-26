import { z } from 'zod';

export const reviewWriteSchema = z.object({
  rating: z
    .number({ error: 'reviews.errors.invalidRating' })
    .int()
    .min(1, 'reviews.errors.invalidRating')
    .max(5, 'reviews.errors.invalidRating'),
  comment: z.string().trim().max(1000).optional(),
});
export type ReviewWriteInput = z.infer<typeof reviewWriteSchema>;

export type ReviewDto = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    avatarSeed: string;
  };
  service: {
    name: string;
  };
};
