import test from 'node:test';
import assert from 'node:assert';
import { generateIdentityKeyPair, ALGORITHM_NAME, HASH_NAME } from '../utils/crypto.ts';

// Mock window for Node.js environment
(globalThis as any).window = globalThis;

test('crypto utils', async (t) => {
  await t.test('generateIdentityKeyPair should generate a valid RSA-OAEP key pair', async () => {
    const keyPair = await generateIdentityKeyPair();

    assert.ok(keyPair.publicKey);
    assert.ok(keyPair.privateKey);
    assert.strictEqual(keyPair.publicKey.type, 'public');
    assert.strictEqual(keyPair.privateKey.type, 'private');

    // Check algorithm properties
    // In Node.js environment, the internal structure might vary slightly but should match RSA-OAEP
    assert.strictEqual((keyPair.publicKey.algorithm as any).name, ALGORITHM_NAME);
    assert.strictEqual((keyPair.publicKey.algorithm as any).modulusLength, 2048);
    assert.strictEqual((keyPair.publicKey.algorithm as any).hash.name, HASH_NAME);

    assert.strictEqual((keyPair.privateKey.algorithm as any).name, ALGORITHM_NAME);
    assert.strictEqual((keyPair.privateKey.algorithm as any).modulusLength, 2048);
    assert.strictEqual((keyPair.privateKey.algorithm as any).hash.name, HASH_NAME);

    assert.ok(keyPair.publicKey.extractable);
    // generateIdentityKeyPair sets extractable to true
    assert.ok(keyPair.privateKey.extractable);

    assert.deepStrictEqual(keyPair.publicKey.usages, ['encrypt']);
    assert.deepStrictEqual(keyPair.privateKey.usages, ['decrypt']);
  });
});
