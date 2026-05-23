import { z } from 'zod';

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(1, 'pro.services.errors.nameRequired').max(100),
  description: z.string().trim().max(300).optional(),
  durationMinutes: z
    .number({ error: 'pro.services.errors.invalidDuration' })
    .int()
    .min(5, 'pro.services.errors.invalidDuration')
    .max(480, 'pro.services.errors.invalidDuration'),
  priceCents: z
    .number({ error: 'pro.services.errors.invalidPrice' })
    .int()
    .min(0, 'pro.services.errors.invalidPrice')
    .max(1_000_000, 'pro.services.errors.invalidPrice'),
});

export const serviceUpdateSchema = serviceCreateSchema.partial();

export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>;
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>;

export type ServiceResponse = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
};
