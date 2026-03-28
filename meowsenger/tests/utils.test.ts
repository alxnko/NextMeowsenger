import { describe, it, expect } from 'vitest';
import { cn, generateSecureRandomString } from '../lib/utils.ts';

describe('cn utility', () => {
  it('combines multiple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional class names', () => {
    expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar');
  });

  it('filters out falsy values', () => {
    expect(cn('foo', null, undefined, 0, false, '')).toBe('foo');
  });

  it('handles mixed inputs', () => {
    expect(cn('foo', 'bar', null, 'baz')).toBe('foo bar baz');
  });

  it('returns empty string for empty input', () => {
    expect(cn()).toBe('');
  });

  it('handles only falsy values', () => {
    expect(cn(false, null, undefined, '')).toBe('');
  });

  it('handles a single truthy value', () => {
    expect(cn('single')).toBe('single');
  });
});

describe('generateSecureRandomString', () => {
  it('generates string of correct length', () => {
    const length = 10;
    const result = generateSecureRandomString(length);
    expect(result.length).toBe(length);
  });

  it('generates string of length 0', () => {
    const result = generateSecureRandomString(0);
    expect(result.length).toBe(0);
    expect(result).toBe('');
  });

  it('generates different strings on subsequent calls', () => {
    const result1 = generateSecureRandomString(10);
    const result2 = generateSecureRandomString(10);
    expect(result1).not.toBe(result2);
  });

  it('contains only alphanumeric characters', () => {
    const result = generateSecureRandomString(100);
    expect(result).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it('uses characters from the entire alphanumeric charset', () => {
    // This is a statistical test, 1000 characters should cover most of the charset
    const result = generateSecureRandomString(1000);
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (const char of result) {
      expect(charset.includes(char)).toBe(true);
    }
  });
});
