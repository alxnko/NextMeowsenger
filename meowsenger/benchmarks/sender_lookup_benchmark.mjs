
const N_CHATS = 5000;
const PARTICIPANTS_PER_CHAT = 50;

// Mock data generation
const chats = Array.from({ length: N_CHATS }, (_, i) => {
  const participants = Array.from({ length: PARTICIPANTS_PER_CHAT }, (_, j) => ({
    user: { id: `user-${i}-${j}` }
  }));

  // 50% chance the sender is one of the participants, 50% chance it's someone else
  const isMissing = Math.random() > 0.5;
  const senderId = isMissing ? `user-${i}-999` : `user-${i}-${Math.floor(Math.random() * PARTICIPANTS_PER_CHAT)}`;

  return {
    id: `chat-${i}`,
    participants,
    messages: [{ senderId, createdAt: new Date() }]
  };
});

const participants = chats.map(chat => ({
  chat,
  lastReadAt: new Date()
}));

const runBaseline = () => {
  const start = performance.now();
  const missingSenderIds = new Set();

  // First loop
  const processedChats = participants.map((p) => {
    const chat = p.chat;
    const lastMessage = chat.messages[0] || null;
    if (lastMessage) {
      const senderId = lastMessage.senderId;
      const senderInParticipants = chat.participants.some(
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
    };
  });

  // Second loop simulation
  for (const chat of processedChats) {
    if (
      chat.lastMessage &&
      !chat.participants.some(
        (cp) => cp.user.id === chat.lastMessage.senderId,
      )
    ) {
      // Simulate adding missing sender
    }
  }

  const end = performance.now();
  return { time: end - start, missingCount: missingSenderIds.size };
};

const runOptimized = () => {
  const start = performance.now();
  const missingSenderIds = new Set();

  // First loop
  const processedChats = participants.map((p) => {
    const chat = p.chat;

    const lastMessage = chat.messages[0] || null;
    let senderInParticipants = true;
    if (lastMessage) {
      const senderId = lastMessage.senderId;
      // Keep it O(N) but avoids multiple passes if we just check once
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
      _senderInParticipants: senderInParticipants
    };
  });

  // Second loop
  for (const chat of processedChats) {
    if (
      chat.lastMessage &&
      !chat._senderInParticipants
    ) {
      // Simulate adding missing sender
    }
  }

  const end = performance.now();
  return { time: end - start, missingCount: missingSenderIds.size };
};

console.log(`Running benchmark with ${N_CHATS} chats and ${PARTICIPANTS_PER_CHAT} participants/chat...`);
const baseline = runBaseline();
console.log(`Baseline (nested .some()): ${baseline.time.toFixed(4)}ms`);

const optimized = runOptimized();
console.log(`Optimized (Cached .some()): ${optimized.time.toFixed(4)}ms`);

const improvement = ((baseline.time - optimized.time) / baseline.time) * 100;
console.log(`Improvement: ${improvement.toFixed(2)}%`);
