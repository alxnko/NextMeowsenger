import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signSession, verifySession } from '../lib/session.ts';

const originalSecret = process.env.SESSION_SECRET;

describe('session-utils', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-session-secret';
  });

  afterEach(() => {
    process.env.SESSION_SECRET = originalSecret;
    vi.useRealTimers();
  });

  describe('signSession', () => {
    it('should sign a session for a user ID', async () => {
      const userId = 'user-123';
      const token = await signSession(userId);
      expect(typeof token).toBe('string');
      const parts = token.split('.');
      expect(parts.length).toBe(3);

      const [tokenUserId, expiresAtStr, signature] = parts;
      expect(tokenUserId).toBe(userId);
      expect(Number(expiresAtStr)).toBeGreaterThan(Date.now());
      expect(signature).toBeTruthy();
    });
  });

  describe('verifySession', () => {
    it('should verify a valid session', async () => {
      const userId = 'user-123';
      const token = await signSession(userId);
      const result = await verifySession(token);
      expect(result).toBe(userId);
    });

    it('should return null for expired sessions', async () => {
      vi.useFakeTimers();
      const userId = 'user-123';
      const now = Date.now();
      vi.setSystemTime(now);

      const token = await signSession(userId);

      // Advance time by 8 days (7 days is default expiry)
      vi.setSystemTime(now + 8 * 24 * 60 * 60 * 1000);

      const result = await verifySession(token);
      expect(result).toBeNull();
    });

    it('should return null for tampered signature', async () => {
      const userId = 'user-123';
      const token = await signSession(userId);
      const parts = token.split('.');
      // Tamper with the signature (last part)
      // Change one character in the signature
      const lastChar = parts[2].slice(-1);
      const newLastChar = lastChar === 'a' ? 'b' : 'a';
      parts[2] = parts[2].slice(0, -1) + newLastChar;
      const tamperedToken = parts.join('.');

      const result = await verifySession(tamperedToken);
      expect(result).toBeNull();
    });

    it('should return null for tampered payload', async () => {
      const userId = 'user-123';
      const token = await signSession(userId);
      const parts = token.split('.');
      // Tamper with userId
      parts[0] = 'other-user';
      const tamperedToken = parts.join('.');

      const result = await verifySession(tamperedToken);
      expect(result).toBeNull();
    });

    it('should return null for malformed tokens', async () => {
      expect(await verifySession('invalid-token')).toBeNull();
      expect(await verifySession('one.two')).toBeNull();
      expect(await verifySession('one.two.three.four')).toBeNull();
      expect(await verifySession('')).toBeNull();
      expect(await verifySession(null as any)).toBeNull();
    });

    it('should handle missing signature or parts', async () => {
        expect(await verifySession('user.123.')).toBeNull();
        expect(await verifySession('.123.sig')).toBeNull();
        expect(await verifySession('user..sig')).toBeNull();
    });

    it('should return null if expiry is not a number', async () => {
        const token = 'user.notanumber.signature';
        expect(await verifySession(token)).toBeNull();
    });
  });
});
