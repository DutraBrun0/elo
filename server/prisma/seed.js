/**
 * Popula o banco de desenvolvimento com usuários e conversas de demonstração.
 * Todos usam a senha "elo12345". Uso: npm run db:seed
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { buildDirectKey } from '../src/services/conversation.service.js';

if (process.env.NODE_ENV === 'production') {
  console.error('O seed apaga todos os dados e não roda em produção.');
  process.exit(1);
}

const prisma = new PrismaClient();
const PASSWORD = 'elo12345';
// Um único "agora" para todo o seed: marcas de leitura e mensagens precisam bater ao milissegundo.
const NOW = Date.now();
const minutesAgo = (minutes) => new Date(NOW - minutes * 60_000);

const people = [
  { name: 'Ana Souza', username: 'ana' },
  { name: 'Bruno Lima', username: 'bruno' },
  { name: 'Carla Mendes', username: 'carla' },
  { name: 'Diego Rocha', username: 'diego' },
  { name: 'Elisa Nunes', username: 'elisa' },
];

// [remetente, texto, minutos atrás]
const threads = {
  'ana:bruno': [
    ['bruno', 'Ana, conseguiu olhar o PR do chat?', 60 * 26],
    ['ana', 'Vi sim! Só deixei um comentário sobre a paginação', 60 * 26 - 4],
    ['bruno', 'Cursor em vez de offset, né? Faz sentido', 60 * 26 - 6],
    ['ana', 'Isso, com offset as mensagens novas bagunçam o scroll', 60 * 26 - 7],
    ['bruno', 'Ajustei agora de manhã 🙌', 42],
    ['ana', 'Perfeito, vou revisar depois do almoço', 40],
    ['bruno', 'Fechado! Me avisa se precisar de algo', 12],
  ],
  'ana:carla': [
    ['carla', 'Bom dia! A daily de hoje foi pra 10h', 60 * 50],
    ['ana', 'Valeu por avisar!', 60 * 50 - 3],
    ['carla', 'Vamos testar o deploy hoje à tarde?', 25],
    ['carla', 'Subi o docker-compose atualizado', 24],
  ],
  'ana:diego': [
    ['ana', 'Diego, o indicador de digitando ficou ótimo', 60 * 24 * 4],
    ['diego', 'Valeu! Ele expira sozinho se o evento de parar se perder', 60 * 24 * 4 - 2],
  ],
};

async function main() {
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const users = {};
  for (const person of people) {
    users[person.username] = await prisma.user.create({
      data: {
        ...person,
        email: `${person.username}@elo.dev`,
        passwordHash,
        lastSeenAt: minutesAgo(30),
      },
    });
  }

  for (const [pair, messages] of Object.entries(threads)) {
    const [a, b] = pair.split(':').map((username) => users[username]);
    const last = minutesAgo(messages.at(-1)[2]);
    const conversation = await prisma.conversation.create({
      data: {
        directKey: buildDirectKey(a.id, b.id),
        lastMessageAt: last,
        createdAt: minutesAgo(messages[0][2] + 1),
      },
    });

    await prisma.message.createMany({
      data: messages.map(([sender, content, ago]) => ({
        conversationId: conversation.id,
        senderId: users[sender].id,
        content,
        createdAt: minutesAgo(ago),
      })),
    });

    // A outra pessoa leu tudo, exceto as 2 últimas mensagens de Carla (ficam como não lidas para Ana).
    const unreadForAna = pair === 'ana:carla' ? minutesAgo(26) : last;
    await prisma.conversationParticipant.createMany({
      data: [
        {
          conversationId: conversation.id,
          userId: a.id,
          lastDeliveredAt: last,
          lastReadAt: unreadForAna,
        },
        { conversationId: conversation.id, userId: b.id, lastDeliveredAt: last, lastReadAt: last },
      ],
    });
  }

  console.info(
    `Seed concluído: ${people.length} usuários (senha "${PASSWORD}"), ${Object.keys(threads).length} conversas.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
