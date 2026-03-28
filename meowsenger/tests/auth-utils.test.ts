import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signToken, verifyToken } from '../lib/auth-utils.ts';

const originalSecret = process.env.JWT_SECRET;

describe('auth-utils', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  describe('signToken', () => {
    it('should sign a token for a user ID', () => {
      const userId = 'user-123';
      const token = signToken(userId);
      expect(typeof token).toBe('string');
      expect(token.includes('.')).toBe(true);

      const [dataB64] = token.split('.');
      const sessionData = JSON.parse(Buffer.from(dataB64, 'base64').toString());
      expect(sessionData.userId).toBe(userId);
      expect(new Date(sessionData.expires).getTime()).toBeGreaterThan(Date.now());
    });

    it('should use provided expiration date', () => {
      const userId = 'user-123';
      const expires = new Date(Date.now() + 10000);
      const token = signToken(userId, expires);
      const [dataB64] = token.split('.');
      const sessionData = JSON.parse(Buffer.from(dataB64, 'base64').toString());
      expect(sessionData.expires).toBe(expires.toISOString());
    });

    it('should throw error if JWT_SECRET is not defined', () => {
      delete process.env.JWT_SECRET;
      expect(() => signToken('user-123')).toThrow(/JWT_SECRET environment variable is not defined/);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const userId = 'user-123';
      const token = signToken(userId);
      const result = verifyToken(token);
      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
    });

    it('should return null for expired tokens', () => {
      const userId = 'user-123';
      const expires = new Date(Date.now() - 10000);
      const token = signToken(userId, expires);
      const result = verifyToken(token);
      expect(result).toBeNull();
    });

    it('should return null for invalid signature', () => {
      const userId = 'user-123';
      const token = signToken(userId);
      const [data, signature] = token.split('.');
      // Tamper with signature
      const invalidToken = `${data}.${signature.substring(0, signature.length - 1)}${signature.endsWith('0') ? '1' : '0'}`;
      const result = verifyToken(invalidToken);
      expect(result).toBeNull();
    });

    it('should return null for malformed tokens', () => {
      expect(verifyToken('not-a-token')).toBeNull();
      expect(verifyToken('')).toBeNull();
    });

    it('should return null if JWT_SECRET is not defined', () => {
      const userId = 'user-123';
      const token = signToken(userId);
      delete process.env.JWT_SECRET;
      const result = verifyToken(token);
      expect(result).toBeNull();
    });

    it('should return null if JWT_SECRET changes', () => {
      const userId = 'user-123';
      const token = signToken(userId);
      process.env.JWT_SECRET = 'different-secret';
      const result = verifyToken(token);
      expect(result).toBeNull();
    });
  });
});
