const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repro() {
  console.log('--- Repro script started ---');

  // 1. Create a test user
  const user = await prisma.user.upsert({
    where: { username: 'repro_user' },
    update: {},
    create: {
      username: 'repro_user',
      passwordHash: 'dummy',
      publicKey: 'dummy',
      encryptedPrivateKey: 'dummy'
    }
  });
  console.log('User created/found:', user.id);

  // 2. Create a test chat
  const chat = await prisma.chat.create({
    data: {
      type: 'DIRECT',
      visibility: 'PRIVATE',
      participants: {
        create: {
          userId: user.id,
          role: 'OWNER',
          encryptedKey: 'dummy'
        }
      }
    }
  });
  console.log('Chat created:', chat.id);

  // 3. Create a test message (simulating what socket.ts does)
  const message = await prisma.message.create({
    data: {
      chatId: chat.id,
      senderId: user.id,
      encryptedContent: JSON.stringify({ ciphertext: 'repro', iv: 'dummy', keys: {} }),
      createdAt: new Date()
    }
  });
  console.log('Message created:', message.id);

  // 4. Verify fetch (simulating what GET /api/chats/[id] does)
  const fetchedChat = await prisma.chat.findUnique({
    where: { id: chat.id },
    include: {
      messages: true,
      participants: true
    }
  });

  console.log('Fetched chat messages count:', fetchedChat.messages.length);
  if (fetchedChat.messages.length > 0) {
    console.log('SUCCESS: Message was saved and retrieved via Prisma.');
  } else {
    console.log('FAILURE: Message was NOT retrieved.');
  }

  // Cleanup (optional, but keep for now to see in DB)
  // await prisma.message.delete({ where: { id: message.id } });
  // await prisma.chatParticipant.deleteMany({ where: { chatId: chat.id } });
  // await prisma.chat.delete({ where: { id: chat.id } });
}

repro()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
