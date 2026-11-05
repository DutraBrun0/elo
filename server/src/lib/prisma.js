import { PrismaClient } from '@prisma/client';

/** Instância única do Prisma Client compartilhada por todos os repositories. */
export const prisma = new PrismaClient();
