import { describe, it, expect } from 'vitest';
import { validateUsername, VALIDATION_RULES } from '../lib/validation.ts';

describe('validateUsername', () => {
  it('should return null for valid usernames', () => {
    expect(validateUsername('jules')).toBeNull();
    expect(validateUsername('user_123')).toBeNull();
    expect(validateUsername('ABC_123')).toBeNull();
  });

  it('should return null for minimum length username', () => {
    const minUsername = 'a'.repeat(VALIDATION_RULES.username.min);
    expect(validateUsername(minUsername)).toBeNull();
  });

  it('should return null for maximum length username', () => {
    const maxUsername = 'a'.repeat(VALIDATION_RULES.username.max);
    expect(validateUsername(maxUsername)).toBeNull();
  });

  it('should return error if username is not a string', () => {
    expect(validateUsername(null as any)).toBe('Username must be a string.');
    expect(validateUsername(undefined as any)).toBe('Username must be a string.');
    expect(validateUsername(123 as any)).toBe('Username must be a string.');
    expect(validateUsername({} as any)).toBe('Username must be a string.');
  });

  it('should return error if username is too short', () => {
    const shortUsername = 'a'.repeat(VALIDATION_RULES.username.min - 1);
    expect(validateUsername(shortUsername)).toBe(VALIDATION_RULES.username.message);
  });

  it('should return error if username is too long', () => {
    const longUsername = 'a'.repeat(VALIDATION_RULES.username.max + 1);
    expect(validateUsername(longUsername)).toBe(VALIDATION_RULES.username.message);
  });

  it('should return error if username contains invalid characters', () => {
    expect(validateUsername('user!')).toBe(VALIDATION_RULES.username.message);
    expect(validateUsername('user name')).toBe(VALIDATION_RULES.username.message);
    expect(validateUsername('user-name')).toBe(VALIDATION_RULES.username.message);
    expect(validateUsername('user@domain')).toBe(VALIDATION_RULES.username.message);
  });
});
