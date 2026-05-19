import { z } from 'zod';

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const signUpSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'auth.errors.passwordTooShort').max(128),
  firstName: z.string().trim().min(1, 'auth.errors.firstNameRequired').max(64),
  lastName: z.string().trim().min(1, 'auth.errors.lastNameRequired').max(64),
  acceptTerms: z.boolean().refine((v) => v === true, {
    message: 'auth.errors.acceptTermsRequired',
  }),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
