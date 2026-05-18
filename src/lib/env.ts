// No dotenv import — Next.js auto-loads .env. Standalone Node scripts (e.g. seed)
// can `import 'dotenv/config'` themselves before importing this module.
import { z } from 'zod';

const stubModeSchema = z.enum(['always-succeed', 'always-fail', 'random']);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  BANK_STUB_MODE: stubModeSchema.default('always-succeed'),
  SMS_STUB_MODE: stubModeSchema.default('always-succeed'),
  DEV_TOOLS: z
    .enum(['0', '1'])
    .default('1')
    .transform((v) => v === '1'),
  REMINDER_CRON_EXPR: z.string().default('*/1 * * * *'),
  APP_TZ: z.string().default('Europe/Athens'),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(['el', 'en']).default('el'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', z.treeifyError(parsed.error));
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
export type Env = typeof env;
