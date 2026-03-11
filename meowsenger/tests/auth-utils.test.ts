import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
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
      assert.strictEqual(typeof token, 'string');
      assert.ok(token.includes('.'));

      const [dataB64] = token.split('.');
      const sessionData = JSON.parse(Buffer.from(dataB64, 'base64').toString());
      assert.strictEqual(sessionData.userId, userId);
      assert.ok(new Date(sessionData.expires) > new Date());
    });

    it('should use provided expiration date', () => {
      const userId = 'user-123';
      const expires = new Date(Date.now() + 10000);
      const token = signToken(userId, expires);
      const [dataB64] = token.split('.');
      const sessionData = JSON.parse(Buffer.from(dataB64, 'base64').toString());
      assert.strictEqual(sessionData.expires, expires.toISOString());
    });

    it('should throw error if JWT_SECRET is not defined', () => {
      delete process.env.JWT_SECRET;
      assert.throws(() => signToken('user-123'), /JWT_SECRET environment variable is not defined/);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const userId = 'user-123';
      const token = signToken(userId);
      const result = verifyToken(token);
      assert.ok(result);
      assert.strictEqual(result!.userId, userId);
    });

    it('should return null for expired tokens', () => {
      const userId = 'user-123';
      const expires = new Date(Date.now() - 10000);
      const token = signToken(userId, expires);
      const result = verifyToken(token);
      assert.strictEqual(result, null);
    });

    it('should return null for invalid signature', () => {
      const userId = 'user-123';
      const token = signToken(userId);
      const [data, signature] = token.split('.');
      // Tamper with signature
      const invalidToken = `${data}.${signature.substring(0, signature.length - 1)}${signature.endsWith('0') ? '1' : '0'}`;
      const result = verifyToken(invalidToken);
      assert.strictEqual(result, null);
    });

    it('should return null for malformed tokens', () => {
      assert.strictEqual(verifyToken('not-a-token'), null);
      assert.strictEqual(verifyToken(''), null);
    });

    it('should return null if JWT_SECRET is not defined', () => {
      const userId = 'user-123';
      const token = signToken(userId);
      delete process.env.JWT_SECRET;
      const result = verifyToken(token);
      assert.strictEqual(result, null);
    });

    it('should return null if JWT_SECRET changes', () => {
      const userId = 'user-123';
      const token = signToken(userId);
      process.env.JWT_SECRET = 'different-secret';
      const result = verifyToken(token);
      assert.strictEqual(result, null);
    });
  });
});
