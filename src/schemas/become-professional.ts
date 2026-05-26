import { z } from 'zod';

export const CATEGORIES = ['DOCTOR', 'GYM', 'HAIR_SALON', 'BEAUTY_CARE'] as const;
export const PLANS = ['free', 'premium'] as const;

const HHmm = /^([01]\d|2[0-3]):[0-5]\d$/;

// Allow empty string for optional text fields. The API normalises '' → undefined
// before persisting (see nullIfEmpty below). We avoid `.default()` here because
// it makes the schema's input type optional, which then doesn't match the form
// values' output type (`string`) and breaks RHF Resolver inference.
const optionalText = (max: number) => z.string().trim().max(max);

// Base object schema — used directly by the client form. We avoid `.transform()`
// and `.default()` on non-string fields so Zod's input and output types coincide,
// which keeps react-hook-form's `Resolver<...>` and shadcn `FormField` generics
// inferring cleanly.
export const becomeProfessionalSchema = z.object({
  // Step 1 — business profile
  displayName: z.string().trim().min(1, 'becomeProfessional.errors.displayNameRequired').max(120),
  category: z.enum(CATEGORIES),
  specialty: optionalText(120),
  description: optionalText(500),
  city: z.string().trim().min(1, 'becomeProfessional.errors.cityRequired').max(64),
  address: z.string().trim().min(1, 'becomeProfessional.errors.addressRequired').max(200),
  companyName: optionalText(120),

  // Step 2 — first service
  serviceName: z.string().trim().min(1, 'becomeProfessional.errors.serviceNameRequired').max(100),
  serviceDurationMinutes: z
    .number({ error: 'becomeProfessional.errors.invalidDuration' })
    .int()
    .min(5, 'becomeProfessional.errors.invalidDuration')
    .max(480, 'becomeProfessional.errors.invalidDuration'),
  servicePriceCents: z
    .number({ error: 'becomeProfessional.errors.invalidPrice' })
    .int()
    .min(0, 'becomeProfessional.errors.invalidPrice')
    .max(1_000_000, 'becomeProfessional.errors.invalidPrice'),
  serviceDescription: optionalText(300),

  // Step 3 — working hours (one block applied to selected days)
  workingDays: z
    .array(z.number().int().min(0).max(6))
    .min(1, 'becomeProfessional.errors.pickAtLeastOneDay'),
  startTime: z.string().regex(HHmm, 'becomeProfessional.errors.invalidTime'),
  endTime: z.string().regex(HHmm, 'becomeProfessional.errors.invalidTime'),

  // Step 4 — plan
  plan: z.enum(PLANS),
});

// Server-side parser adds the cross-field constraint that endTime > startTime.
export const becomeProfessionalServerSchema = becomeProfessionalSchema.refine(
  (v) => v.startTime < v.endTime,
  { message: 'becomeProfessional.errors.endBeforeStart', path: ['endTime'] },
);

export type BecomeProfessionalInput = z.infer<typeof becomeProfessionalSchema>;

/** Convert empty-string optional text fields to undefined so Prisma stores NULL. */
export function nullIfEmpty(v: string): string | undefined {
  return v === '' ? undefined : v;
}

export type BecomeProfessionalResponse = {
  professionalId: string;
};
