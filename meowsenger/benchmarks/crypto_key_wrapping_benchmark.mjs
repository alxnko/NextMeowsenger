import { webcrypto } from 'node:crypto';

// Polyfill global window and crypto for the purpose of the benchmark if needed,
// but we can just use webcrypto.subtle directly and mock the FileReader bit.

async function arrayBufferToBase64(buffer) {
    // Simplified version for node environment without FileReader/Blob
    return Buffer.from(buffer).toString('base64');
}

async function runSequential(recipientPublicKeys, exportedAesKey) {
  const keys = {};
  const start = performance.now();
  for (const recipient of recipientPublicKeys) {
    const encryptedKey = await webcrypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      recipient.key,
      exportedAesKey,
    );
    keys[recipient.userId] = await arrayBufferToBase64(encryptedKey);
  }
  const end = performance.now();
  return { time: end - start, keys };
}

async function runParallel(recipientPublicKeys, exportedAesKey) {
  const start = performance.now();
  const encryptionPromises = recipientPublicKeys.map(async (recipient) => {
    const encryptedKey = await webcrypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      recipient.key,
      exportedAesKey,
    );
    return {
      userId: recipient.userId,
      encryptedKeyBase64: await arrayBufferToBase64(encryptedKey)
    };
  });

  const results = await Promise.all(encryptionPromises);
  const keys = {};
  for (const res of results) {
    keys[res.userId] = res.encryptedKeyBase64;
  }
  const end = performance.now();
  return { time: end - start, keys };
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

  const aesKey = await webcrypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const exportedAesKey = await webcrypto.subtle.exportKey("raw", aesKey);

  return { recipientPublicKeys, exportedAesKey };
}

async function run() {
  const numRecipients = 50; // A large enough number to see the difference
  console.log(`Setting up benchmark with ${numRecipients} recipients...`);
  const { recipientPublicKeys, exportedAesKey } = await setupBenchmark(numRecipients);

  // Warmup
  await runSequential(recipientPublicKeys.slice(0, 5), exportedAesKey);
  await runParallel(recipientPublicKeys.slice(0, 5), exportedAesKey);

  console.log("Running Sequential...");
  const seq = await runSequential(recipientPublicKeys, exportedAesKey);
  console.log(`Sequential time: ${seq.time.toFixed(4)}ms`);

  console.log("Running Parallel...");
  const par = await runParallel(recipientPublicKeys, exportedAesKey);
  console.log(`Parallel time: ${par.time.toFixed(4)}ms`);

  const improvement = ((seq.time - par.time) / seq.time) * 100;
  console.log(`Improvement: ${improvement.toFixed(2)}%`);

  // Verify results are same
  const seqKeys = Object.keys(seq.keys).length;
  const parKeys = Object.keys(par.keys).length;
  if (seqKeys !== parKeys) {
      console.error("ERROR: Key count mismatch!");
  } else {
      console.log("Verification: Key counts match.");
  }
}

run();
