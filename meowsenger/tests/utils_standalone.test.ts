import assert from 'node:assert';
import { cn, generateSecureRandomString } from '../lib/utils.ts';

// Mocking some vitest-like structure
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('Running tests for utils.ts...');

test('cn combines multiple class names', () => {
  assert.strictEqual(cn('foo', 'bar'), 'foo bar');
});

test('cn handles conditional class names', () => {
  assert.strictEqual(cn('foo', true && 'bar', false && 'baz'), 'foo bar');
});

test('generateSecureRandomString generates string of correct length', () => {
  const length = 10;
  const result = generateSecureRandomString(length);
  assert.strictEqual(result.length, length);
});

test('generateSecureRandomString generates string of length 0', () => {
  const result = generateSecureRandomString(0);
  assert.strictEqual(result.length, 0);
  assert.strictEqual(result, '');
});

test('generateSecureRandomString generates different strings on subsequent calls', () => {
  const result1 = generateSecureRandomString(10);
  const result2 = generateSecureRandomString(10);
  assert.notStrictEqual(result1, result2);
});

test('generateSecureRandomString contains only alphanumeric characters', () => {
  const result = generateSecureRandomString(100);
  assert.match(result, /^[a-zA-Z0-9]+$/);
});

console.log('All tests passed!');
