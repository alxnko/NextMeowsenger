import { describe, it } from 'node:test';
import assert from 'node:assert';
import { cn } from './utils.ts';

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
