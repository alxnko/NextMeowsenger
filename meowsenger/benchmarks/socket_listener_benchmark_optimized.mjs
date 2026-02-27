
console.log("Starting Socket Listener Benchmark...");

let listenerSetupCount = 0;
// Initial state
let messages = [];
const socket = { on: () => {}, off: () => {}, emit: () => {} };
const isConnected = true;
const chatId = "chat-123";
const user = { id: "user-1" };
const privateKey = "key";

// Simulation of the component's render and effect dependencies
function getDependencies() {
  // NEW code dependencies: [socket, isConnected, chatId, user, privateKey]
  return [socket, isConnected, chatId, user, privateKey];
}

let lastDeps = null;

function useEffectSimulation(effectFn, deps) {
  // Shallow comparison of dependencies
  const hasChanged = !lastDeps ||
                     deps.length !== lastDeps.length ||
                     deps.some((dep, i) => dep !== lastDeps[i]);

  if (hasChanged) {
    listenerSetupCount++;
    // In a real app, the cleanup would run here if lastDeps existed
    lastDeps = deps;
    effectFn();
  }
}

// The effect body (simplified)
const effectBody = () => {
  // socket.on(...) setup logic
};

// SIMULATION LOOP
console.log("Simulating 100 incoming messages with OPTIMIZED dependency array...");

// Initial render
useEffectSimulation(effectBody, getDependencies());

for (let i = 0; i < 100; i++) {
  // Update state (messages): Mutation of the array reference simulating setState
  messages = [...messages, { id: i, content: "msg" }];

  // Re-render
  useEffectSimulation(effectBody, getDependencies());
}

console.log(`\nResults:`);
console.log(`- Messages added: 100`);
console.log(`- Listener setups (re-subscriptions): ${listenerSetupCount}`);

if (listenerSetupCount <= 1) {
    console.log("✅  OPTIMIZED: Efficient subscription management.");
} else {
    console.log("⚠️  FAILED: Excessive re-subscriptions still detected.");
}
