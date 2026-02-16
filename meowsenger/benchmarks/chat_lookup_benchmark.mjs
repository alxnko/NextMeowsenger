
const N = 2000;
const messages = Array.from({ length: N }, (_, i) => ({
  id: `msg-${i}`,
  senderId: `user-${i % 10}`,
  content: `Message ${i}`,
  replyToId: i > 0 && i % 5 === 0 ? `msg-${i - 5}` : null, // simulate replies
}));

const participants = Array.from({ length: 10 }, (_, i) => ({
  userId: `user-${i}`,
  username: `User ${i}`,
}));

// Baseline: O(N^2) lookups
const runBaseline = () => {
  const start = performance.now();
  let lookupCount = 0;

  for (const msg of messages) {
    // simulate multiple lookups per message render
    if (msg.replyToId) {
      const replyMsg = messages.find((m) => m.id === msg.replyToId);
      if (replyMsg) {
        const replySender = participants.find((p) => p.userId === replyMsg.senderId);
        lookupCount++;
      }
    }
    const sender = participants.find((p) => p.userId === msg.senderId);
    lookupCount++;
  }

  const end = performance.now();
  return { time: end - start, lookupCount };
};

// Optimized: O(N) map creation + O(1) lookups
const runOptimized = () => {
  const start = performance.now();

  // Create Maps
  const messageMap = new Map(messages.map((m) => [m.id, m]));
  const participantMap = new Map(participants.map((p) => [p.userId, p]));

  let lookupCount = 0;

  for (const msg of messages) {
    if (msg.replyToId) {
      const replyMsg = messageMap.get(msg.replyToId);
      if (replyMsg) {
        const replySender = participantMap.get(replyMsg.senderId);
        lookupCount++;
      }
    }
    const sender = participantMap.get(msg.senderId);
    lookupCount++;
  }

  const end = performance.now();
  return { time: end - start, lookupCount };
};

console.log(`Running benchmark with ${N} messages...`);
const baseline = runBaseline();
console.log(`Baseline (Array.find): ${baseline.time.toFixed(4)}ms`);

const optimized = runOptimized();
console.log(`Optimized (Map.get): ${optimized.time.toFixed(4)}ms`);

const improvement = ((baseline.time - optimized.time) / baseline.time) * 100;
console.log(`Improvement: ${improvement.toFixed(2)}%`);
