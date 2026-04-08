import { webcrypto } from 'node:crypto';

async function runSequential(numRecipients) {
  const recipients = [];
  const start = performance.now();
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
    recipients.push({
      userId: `user-${i}`,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    });
  }
  const end = performance.now();
  return { time: end - start, recipients };
}

async function runParallel(numRecipients) {
  const start = performance.now();
  const generationPromises = Array.from({ length: numRecipients }, async (_, i) => {
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
    return {
      userId: `user-${i}`,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  });

  const recipients = await Promise.all(generationPromises);
  const end = performance.now();
  return { time: end - start, recipients };
}

async function run() {
  const numRecipients = 10;
  console.log(`Running benchmark with ${numRecipients} recipients...`);

  // Warmup
  await runSequential(2);
  await runParallel(2);

  console.log("Running Sequential...");
  const seq = await runSequential(numRecipients);
  console.log(`Sequential time: ${seq.time.toFixed(4)}ms`);

  console.log("Running Parallel...");
  const par = await runParallel(numRecipients);
  console.log(`Parallel time: ${par.time.toFixed(4)}ms`);

  const improvement = ((seq.time - par.time) / seq.time) * 100;
  console.log(`Improvement: ${improvement.toFixed(2)}%`);

  // Verify results
  if (seq.recipients.length !== par.recipients.length) {
      console.error("ERROR: Recipient count mismatch!");
  } else {
      console.log("Verification: Recipient counts match.");
  }
}

run();
