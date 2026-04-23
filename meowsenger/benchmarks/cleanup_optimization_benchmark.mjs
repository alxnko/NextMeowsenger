
const N_CHATS = 2000;
const PARTICIPANTS_PER_CHAT = 20;

function generateData(missingProbability) {
  const participants = Array.from({ length: N_CHATS }, (_, i) => {
    const chatParticipants = Array.from({ length: PARTICIPANTS_PER_CHAT }, (_, j) => ({
      user: { id: `user-${i}-${j}` }
    }));

    const isMissing = Math.random() < missingProbability;
    const senderId = isMissing ? `user-${i}-999` : `user-${i}-0`;

    return {
      lastReadAt: new Date(),
      chat: {
        id: `chat-${i}`,
        participants: chatParticipants,
        messages: [{ senderId, createdAt: new Date() }]
      }
    };
  });
  return participants;
}

function runBaseline(participants) {
  const start = performance.now();

  // 1. Map loop
  const missingSenderIds = new Set();
  const chats = participants.map((p) => {
    const chat = p.chat;
    const lastMessage = chat.messages[0] || null;

    let senderInParticipants = true;

    if (lastMessage) {
      const senderId = lastMessage.senderId;
      senderInParticipants = chat.participants.some(
        (cp) => cp.user.id === senderId,
      );
      if (!senderInParticipants) {
        missingSenderIds.add(senderId);
      }
    }

    return {
      ...chat,
      lastMessage,
      lastReadAt: p.lastReadAt,
      _senderInParticipants: senderInParticipants,
    };
  });

  // 2. Second loop (conditional)
  if (missingSenderIds.size > 0) {
    // Simulate fetching users
    const userMap = new Map();
    for (const id of missingSenderIds) {
      userMap.set(id, { id, username: 'test' });
    }

    for (const chat of chats) {
      if (chat.lastMessage && !chat._senderInParticipants) {
        const user = userMap.get(chat.lastMessage.senderId);
        if (user) {
          chat.participants.push({ user });
        }
      }
    }
  }

  // 3. Cleanup loop (Always runs)
  for (const chat of chats) {
    delete chat._senderInParticipants;
  }

  const end = performance.now();
  return end - start;
}

function runOptimized(participants) {
  const start = performance.now();

  // 1. Map loop
  const missingSenderIds = new Set();
  const chatsToFix = [];
  const chats = participants.map((p) => {
    const chat = p.chat;
    const lastMessage = chat.messages[0] || null;

    const chatObj = {
      ...chat,
      lastMessage,
      lastReadAt: p.lastReadAt,
    };

    if (lastMessage) {
      const senderId = lastMessage.senderId;
      const senderInParticipants = chat.participants.some(
        (cp) => cp.user.id === senderId,
      );
      if (!senderInParticipants) {
        missingSenderIds.add(senderId);
        chatsToFix.push(chatObj);
      }
    }

    return chatObj;
  });

  // 2. Second loop (ONLY over chats that need fixing)
  if (missingSenderIds.size > 0) {
    // Simulate fetching users
    const userMap = new Map();
    for (const id of missingSenderIds) {
      userMap.set(id, { id, username: 'test' });
    }

    for (const chat of chatsToFix) {
      const user = userMap.get(chat.lastMessage.senderId);
      if (user) {
        chat.participants.push({ user });
      }
    }
  }

  // 3. NO Cleanup loop!

  const end = performance.now();
  return end - start;
}

console.log(`Running benchmark with ${N_CHATS} chats...`);

const data0 = generateData(0);
console.log("\n--- Case: 0% missing senders ---");
let totalBaseline0 = 0;
let totalOptimized0 = 0;
for(let i=0; i<100; i++) {
    totalBaseline0 += runBaseline(data0);
    totalOptimized0 += runOptimized(data0);
}
console.log(`Baseline avg: ${(totalBaseline0/100).toFixed(4)}ms`);
console.log(`Optimized avg: ${(totalOptimized0/100).toFixed(4)}ms`);
console.log(`Improvement: ${((totalBaseline0 - totalOptimized0) / totalBaseline0 * 100).toFixed(2)}%`);

const data50 = generateData(0.5);
console.log("\n--- Case: 50% missing senders ---");
let totalBaseline50 = 0;
let totalOptimized50 = 0;
for(let i=0; i<100; i++) {
    totalBaseline50 += runBaseline(data50);
    totalOptimized50 += runOptimized(data50);
}
console.log(`Baseline avg: ${(totalBaseline50/100).toFixed(4)}ms`);
console.log(`Optimized avg: ${(totalOptimized50/100).toFixed(4)}ms`);
console.log(`Improvement: ${((totalBaseline50 - totalOptimized50) / totalBaseline50 * 100).toFixed(2)}%`);

const data100 = generateData(1);
console.log("\n--- Case: 100% missing senders ---");
let totalBaseline100 = 0;
let totalOptimized100 = 0;
for(let i=0; i<100; i++) {
    totalBaseline100 += runBaseline(data100);
    totalOptimized100 += runOptimized(data100);
}
console.log(`Baseline avg: ${(totalBaseline100/100).toFixed(4)}ms`);
console.log(`Optimized avg: ${(totalOptimized100/100).toFixed(4)}ms`);
console.log(`Improvement: ${((totalBaseline100 - totalOptimized100) / totalBaseline100 * 100).toFixed(2)}%`);
