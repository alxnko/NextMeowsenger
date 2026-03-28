const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const messageCount = await prisma.message.count();
  console.log('Total messages in DB:', messageCount);

  const messages = await prisma.message.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      chat: true
    }
  });

  console.log('Recent messages:', JSON.stringify(messages, null, 2));

  const chats = await prisma.chat.findMany({
    include: {
      _count: {
        select: { messages: true }
      }
    }
  });
  console.log('Chats and message counts:', JSON.stringify(chats, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
