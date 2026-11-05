import { prisma } from '../src/lib/prisma.js';

/** Apaga todos os dados entre testes, respeitando a ordem das chaves estrangeiras. */
export async function resetDatabase() {
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.user.deleteMany();
}
