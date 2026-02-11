import test from 'node:test';
import assert from 'node:assert';
import { validateUsername, VALIDATION_RULES } from '../lib/validation.ts';

test('validateUsername', async (t) => {
  await t.test('should return null for valid usernames', () => {
    assert.strictEqual(validateUsername('jules'), null);
    assert.strictEqual(validateUsername('user_123'), null);
    assert.strictEqual(validateUsername('ABC_123'), null);
  });

  await t.test('should return null for minimum length username', () => {
    const minUsername = 'a'.repeat(VALIDATION_RULES.username.min);
    assert.strictEqual(validateUsername(minUsername), null);
  });

  await t.test('should return null for maximum length username', () => {
    const maxUsername = 'a'.repeat(VALIDATION_RULES.username.max);
    assert.strictEqual(validateUsername(maxUsername), null);
  });

  await t.test('should return error if username is not a string', () => {
    assert.strictEqual(validateUsername(null), 'Username must be a string.');
    assert.strictEqual(validateUsername(undefined), 'Username must be a string.');
    assert.strictEqual(validateUsername(123), 'Username must be a string.');
    assert.strictEqual(validateUsername({}), 'Username must be a string.');
  });

  await t.test('should return error if username is too short', () => {
    const shortUsername = 'a'.repeat(VALIDATION_RULES.username.min - 1);
    assert.strictEqual(validateUsername(shortUsername), VALIDATION_RULES.username.message);
  });

  await t.test('should return error if username is too long', () => {
    const longUsername = 'a'.repeat(VALIDATION_RULES.username.max + 1);
    assert.strictEqual(validateUsername(longUsername), VALIDATION_RULES.username.message);
  });

  await t.test('should return error if username contains invalid characters', () => {
    assert.strictEqual(validateUsername('user!'), VALIDATION_RULES.username.message);
    assert.strictEqual(validateUsername('user name'), VALIDATION_RULES.username.message);
    assert.strictEqual(validateUsername('user-name'), VALIDATION_RULES.username.message);
    assert.strictEqual(validateUsername('user@domain'), VALIDATION_RULES.username.message);
  });
});
