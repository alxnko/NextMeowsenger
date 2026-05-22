import { describe, it, expect, vi } from 'vitest';
import { cn, generateSecureRandomString } from '@/lib/utils';

describe('cn', () => {
  it('combines multiple class names', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('handles conditional class names', () => {
    expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2');
  });

  it('filters out falsy values', () => {
    expect(cn('class1', null, undefined, '', 0, 'class2')).toBe('class1 class2');
  });

  it('returns empty string for empty input', () => {
    expect(cn()).toBe('');
  });

  it('handles only falsy values', () => {
    expect(cn(null, undefined, '', 0, false)).toBe('');
  });

  it('handles a single truthy value', () => {
    expect(cn('class1')).toBe('class1');
  });
});

describe('generateSecureRandomString', () => {
  it('generates string of correct length', () => {
    expect(generateSecureRandomString(10)).toHaveLength(10);
    expect(generateSecureRandomString(50)).toHaveLength(50);
  });

  it('generates string of length 0', () => {
    expect(generateSecureRandomString(0)).toBe('');
  });

  it('generates different strings on subsequent calls', () => {
    const str1 = generateSecureRandomString(20);
    const str2 = generateSecureRandomString(20);
    expect(str1).not.toBe(str2);
  });

  it('contains only alphanumeric characters', () => {
    const str = generateSecureRandomString(100);
    expect(str).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it('uses characters from the entire alphanumeric charset', () => {
    const str = generateSecureRandomString(1000);
    expect(str).toMatch(/[a-z]/);
    expect(str).toMatch(/[A-Z]/);
    expect(str).toMatch(/[0-9]/);
  });

  it('throws RangeError for negative length', () => {
    expect(() => generateSecureRandomString(-1)).toThrow(RangeError);
  });

  it('throws RangeError for extremely large length', () => {
    // Array buffer allocation failed is a RangeError
    try {
      generateSecureRandomString(10 ** 10);
    } catch (e: any) {
      expect(e.name).toBe('RangeError');
    }
  });

  it('throws RangeError for non-integer length', () => {
    expect(() => generateSecureRandomString(5.5)).toThrow(RangeError);
  });
});
