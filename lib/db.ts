import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.ENVIRONMENT === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Add connection pool configuration for production
  ...(process.env.ENVIRONMENT === 'production' && {
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  }),
});

if (process.env.ENVIRONMENT !== 'production') globalForPrisma.prisma = prisma;

export { prisma };
export default prisma; 