import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.ENVIRONMENT === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});
 
export default prisma; 