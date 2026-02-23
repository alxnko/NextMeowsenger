
const NUM_MESSAGES = 2000;
const messages = [];
for (let i = 0; i < NUM_MESSAGES; i++) {
  messages.push({
    id: `msg-${i}`,
    senderId: `user-${i % 10}`,
    content: `Message ${i}`,
    replyToId: i > 0 && i % 5 === 0 ? `msg-${i - 1}` : null,
    createdAt: new Date(),
  });
}

const participants = [];
for (let i = 0; i < 10; i++) {
  participants.push({
    userId: `user-${i}`,
    username: `User ${i}`,
  });
}

// Scenario 1: Unoptimized (current implementation)
// O(N*M) lookups inside render loop
console.time('Unoptimized Render Simulation');
let renderCount = 0;
for (const msg of messages) {
  // Simulate finding sender
  const sender = participants.find(p => p.userId === msg.senderId);

  // Simulate finding reply message
  let replyToMsg = null;
  if (msg.replyToId) {
    replyToMsg = messages.find(m => m.id === msg.replyToId);
  }

  // Simulate rendering
  renderCount++;
}
console.timeEnd('Unoptimized Render Simulation');

// Scenario 2: Optimized with Map
console.time('Optimized Render Simulation (with Map creation)');

// Create Maps (O(N) + O(P))
const participantMap = new Map();
participants.forEach(p => participantMap.set(p.userId, p));

const messageMap = new Map();
messages.forEach(m => messageMap.set(m.id, m));

for (const msg of messages) {
  // O(1) lookup
  const sender = participantMap.get(msg.senderId);

  let replyToMsg = null;
  if (msg.replyToId) {
    replyToMsg = messageMap.get(msg.replyToId);
  }

  renderCount++;
}
console.timeEnd('Optimized Render Simulation (with Map creation)');
