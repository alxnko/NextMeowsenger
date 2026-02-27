import { describe, it } from 'node:test';
import assert from 'node:assert';
import { cn, generateSecureRandomString } from './utils.ts';

describe('cn utility', () => {
  it('combines multiple class names', () => {
    assert.strictEqual(cn('foo', 'bar'), 'foo bar');
  });

  it('handles conditional class names', () => {
    assert.strictEqual(cn('foo', true && 'bar', false && 'baz'), 'foo bar');
  });

  it('filters out falsy values', () => {
    assert.strictEqual(cn('foo', null, undefined, 0, false, ''), 'foo');
  });

  it('handles mixed inputs', () => {
    assert.strictEqual(cn('foo', 'bar', null, 'baz'), 'foo bar baz');
  });

  it('returns empty string for empty input', () => {
    assert.strictEqual(cn(), '');
  });
});

describe('generateSecureRandomString', () => {
  it('generates string of correct length', () => {
    const length = 10;
    const result = generateSecureRandomString(length);
    assert.strictEqual(result.length, length);
  });

  it('generates different strings on subsequent calls', () => {
    const result1 = generateSecureRandomString(10);
    const result2 = generateSecureRandomString(10);
    assert.notStrictEqual(result1, result2);
  });

  it('contains only alphanumeric characters', () => {
    const result = generateSecureRandomString(100);
    assert.match(result, /^[a-zA-Z0-9]+$/);
  });
});
