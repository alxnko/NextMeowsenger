import { webcrypto } from 'node:crypto';

// Polyfill global window and crypto for the purpose of the benchmark if needed,
// but we can just use webcrypto.subtle directly and mock the FileReader bit.

async function arrayBufferToBase64(buffer) {
    // Simplified version for node environment without FileReader/Blob
    return Buffer.from(buffer).toString('base64');
}

async function encryptChatMessage(
  content,
  recipientPublicKeys,
) {
  // 1. Generate random AES key for this single message
  const aesKey = await webcrypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  // 2. Encrypt content with AES
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const ciphertext = await webcrypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encoder.encode(content),
  );

  // 3. Encrypt AES key with each recipient's RSA public key (Key Wrapping)
  const exportedAesKey = await webcrypto.subtle.exportKey("raw", aesKey);

  const encryptionPromises = recipientPublicKeys.map(async (recipient) => {
    const encryptedKey = await webcrypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      recipient.key,
      exportedAesKey,
    );
    return {
      userId: recipient.userId,
      encryptedKeyBase64: await arrayBufferToBase64(encryptedKey),
    };
  });

  const results = await Promise.all(encryptionPromises);
  const keys = {};
  for (const res of results) {
    keys[res.userId] = res.encryptedKeyBase64;
  }

  return {
    ciphertext: await arrayBufferToBase64(ciphertext),
    iv: await arrayBufferToBase64(iv),
    keys,
  };
}

async function runSequential(messages, recipientKeys) {
  const start = performance.now();
  const results = [];
  for (const msg of messages) {
    const packet = await encryptChatMessage(msg.content, recipientKeys);
    results.push(JSON.stringify(packet));
  }
  const end = performance.now();
  return { time: end - start, results };
}

async function runParallel(messages, recipientKeys) {
  const start = performance.now();
  const promises = messages.map(msg => encryptChatMessage(msg.content, recipientKeys));
  const packets = await Promise.all(promises);
  const results = packets.map(p => JSON.stringify(p));
  const end = performance.now();
  return { time: end - start, results };
}

async function setupBenchmark(numRecipients) {
  const recipientPublicKeys = [];
  for (let i = 0; i < numRecipients; i++) {
    const keyPair = await webcrypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
    );
    recipientPublicKeys.push({ userId: `user-${i}`, key: keyPair.publicKey });
  }

  return recipientPublicKeys;
}

async function run() {
  const numRecipients = 5;
  const numMessages = 20;
  console.log(`Setting up benchmark with ${numRecipients} recipients and ${numMessages} messages...`);
  const recipientKeys = await setupBenchmark(numRecipients);
  const messages = Array.from({ length: numMessages }, (_, i) => ({ id: `${i}`, content: `Message content ${i}` }));

  // Warmup
  await runSequential(messages.slice(0, 2), recipientKeys);
  await runParallel(messages.slice(0, 2), recipientKeys);

  console.log("Running Sequential...");
  const seq = await runSequential(messages, recipientKeys);
  console.log(`Sequential time: ${seq.time.toFixed(4)}ms`);

  console.log("Running Parallel...");
  const par = await runParallel(messages, recipientKeys);
  console.log(`Parallel time: ${par.time.toFixed(4)}ms`);

  const improvement = ((seq.time - par.time) / seq.time) * 100;
  console.log(`Improvement: ${improvement.toFixed(2)}%`);
}

run();
