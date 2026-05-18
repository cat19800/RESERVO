import { PrismaClient } from '@generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '@/lib/env';

function makeClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

type Client = ReturnType<typeof makeClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: Client | undefined;
};

export const prisma: Client = globalForPrisma.prisma ?? makeClient();

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
