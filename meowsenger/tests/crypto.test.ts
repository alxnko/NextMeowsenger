import { describe, it, expect, beforeAll } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  encryptChatMessage,
  decryptChatMessage,
  generateIdentityKeyPair,
  exportKey,
  importPrivateKey,
  importPublicKey
} from '../utils/crypto.ts';

// Mock browser APIs for Node/JSDOM environments
beforeAll(() => {
  const win = typeof window !== 'undefined' ? window : (global as any);

  if (!win.crypto) {
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'crypto', { value: webcrypto, writable: true });
    } else {
      (global as any).crypto = webcrypto;
    }
  }

  if (typeof win.window === 'undefined') {
    (global as any).window = win;
  }

  if (!win.atob) {
    win.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
  }
  if (!win.btoa) {
    win.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
  }

  if (!win.TextEncoder) win.TextEncoder = TextEncoder;
  if (!win.TextDecoder) win.TextDecoder = TextDecoder;

  if (!win.FileReader) {
    win.FileReader = class {
      onload: any;
      onerror: any;
      readAsDataURL(blob: Blob) {
        blob.arrayBuffer().then(buf => {
          const base64 = Buffer.from(buf).toString('base64');
          this.onload({ target: { result: `data:application/octet-stream;base64,${base64}` } });
        }).catch(this.onerror);
      }
    } as any;
  }

  if (!win.Blob) {
    win.Blob = class extends Blob {
      constructor(parts: any[], options?: any) {
        super(parts, options);
      }
    } as any;
  }
});

describe('crypto-utils', () => {
  describe('encryptChatMessage', () => {
    it('should encrypt and allow decryption for multiple recipients', async () => {
      const content = "Hello, everyone!";
      const numRecipients = 3;

      const recipientPromises = Array.from({ length: numRecipients }, async (_, i) => {
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

      const recipients = await Promise.all(recipientPromises);

      const recipientPublicKeys = recipients.map(r => ({ userId: r.userId, key: r.publicKey }));

      const packet = await encryptChatMessage(content, recipientPublicKeys);

      expect(Object.keys(packet.keys).length).toBe(numRecipients);
      expect(packet.ciphertext).toBeTruthy();
      expect(packet.iv).toBeTruthy();

      // Verify each recipient can decrypt
      for (const recipient of recipients) {
        const decrypted = await decryptChatMessage(packet, recipient.privateKey, recipient.userId);
        expect(decrypted).toBe(content);
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

      await expect(
        decryptChatMessage(packet, keyPair.privateKey, "unauthorized-user")
      ).rejects.toThrow(/Ciphertext not intended for this user identity/);
    });
  });

  describe('key imports', () => {
    it('should import private key correctly', async () => {
      const keyPair = await generateIdentityKeyPair();
      const exportedB64 = await exportKey(keyPair.privateKey);

      const importedKey = await importPrivateKey(exportedB64);

      expect(importedKey.type).toBe('private');
      expect(importedKey.extractable).toBe(true);
      expect(importedKey.usages).toContain('decrypt');

      const content = "Test message";
      const packet = await encryptChatMessage(content, [{ userId: "me", key: keyPair.publicKey }]);
      const decrypted = await decryptChatMessage(packet, importedKey, "me");

      expect(decrypted).toBe(content);
    });

    it('should import public key correctly', async () => {
      const keyPair = await generateIdentityKeyPair();
      const exportedB64 = await exportKey(keyPair.publicKey);

      const importedKey = await importPublicKey(exportedB64);

      expect(importedKey.type).toBe('public');
      expect(importedKey.extractable).toBe(true);
      expect(importedKey.usages).toContain('encrypt');

      const content = "Test message 2";
      const packet = await encryptChatMessage(content, [{ userId: "me", key: importedKey }]);
      const decrypted = await decryptChatMessage(packet, keyPair.privateKey, "me");

      expect(decrypted).toBe(content);
    });

    it('should throw error for invalid base64 during private key import', async () => {
      await expect(importPrivateKey("not-base64!!!")).rejects.toThrow();
    });

    it('should throw error for malformed key data during private key import', async () => {
      const malformedKeyB64 = Buffer.from("this is not a pkcs8 key").toString('base64');
      await expect(importPrivateKey(malformedKeyB64)).rejects.toThrow();
    });
  });
});
