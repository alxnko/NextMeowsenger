import { describe, it } from 'node:test';
import assert from 'node:assert';
import { webcrypto } from 'node:crypto';
import { encryptChatMessage, decryptChatMessage } from '../utils/crypto.ts';

// Mock window.crypto and other browser APIs for Node environment
if (typeof window === 'undefined') {
  global.window = {
    crypto: webcrypto,
    atob: (str) => Buffer.from(str, 'base64').toString('binary'),
    btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
  } as any;
  global.FileReader = class {
    onload: any;
    onerror: any;
    readAsDataURL(blob: Blob) {
      blob.arrayBuffer().then(buf => {
        const base64 = Buffer.from(buf).toString('base64');
        this.onload({ target: { result: `data:application/octet-stream;base64,${base64}` } });
      }).catch(this.onerror);
    }
  } as any;
  global.Blob = class extends Blob {
    constructor(parts: any[], options?: any) {
      super(parts, options);
    }
  } as any;
}

describe('encryptChatMessage', () => {
  it('should encrypt and allow decryption for multiple recipients', async () => {
    const content = "Hello, everyone!";
    const recipients = [];
    const numRecipients = 3;

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

    const recipientPublicKeys = recipients.map(r => ({ userId: r.userId, key: r.publicKey }));

    const packet = await encryptChatMessage(content, recipientPublicKeys);

    assert.strictEqual(Object.keys(packet.keys).length, numRecipients);
    assert.ok(packet.ciphertext);
    assert.ok(packet.iv);

    // Verify each recipient can decrypt
    for (const recipient of recipients) {
      const decrypted = await decryptChatMessage(packet, recipient.privateKey, recipient.userId);
      assert.strictEqual(decrypted, content);
    }
  });

  it('should throw error for unauthorized user during decryption', async () => {
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
    const packet = await encryptChatMessage("secret", [{ userId: "user-1", key: keyPair.publicKey }]);

    await assert.rejects(
      decryptChatMessage(packet, keyPair.privateKey, "unauthorized-user"),
      /Ciphertext not intended for this user identity/
    );
  });
});
