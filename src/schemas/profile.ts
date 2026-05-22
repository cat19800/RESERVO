import { z } from 'zod';

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

export const profileUpdateSchema = z
  .object({
    firstName: z.string().trim().min(1, 'auth.errors.firstNameRequired').max(64),
    lastName: z.string().trim().min(1, 'auth.errors.lastNameRequired').max(64),
    phone: optionalTrimmed(32),
    city: optionalTrimmed(64),
    address: optionalTrimmed(200),
    bio: optionalTrimmed(500),
  })
  .partial({
    phone: true,
    city: true,
    address: true,
    bio: true,
  });

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const profileResponseSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  address: z.string().nullable(),
  bio: z.string().nullable(),
  avatarSeed: z.string(),
});

export type ProfileResponse = z.infer<typeof profileResponseSchema>;
