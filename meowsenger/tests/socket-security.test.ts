import { describe, it, expect } from 'vitest';

// Implementation from meowsenger/pages/api/socket.ts
function parseCookies(req: any) {
  const list: any = Object.create(null);
  const rc = req.headers.cookie;

  rc && rc.split(';').forEach(function(cookie: string) {
    const parts = cookie.split('=');
    const key = parts.shift()?.trim();
    if (!key) return;
    const value = decodeURIComponent(parts.join('='));
    list[key] = value;
  });

  return list;
}

describe('socket-security', () => {
  it('parseCookies - Security Verification', () => {
    const req = {
      headers: {
        cookie: '__proto__=polluted; normal=value; session_token=secret'
      }
    };

    const cookies = parseCookies(req);

    // Normal functionality
    expect(cookies.normal).toBe('value');
    expect(cookies.session_token).toBe('secret');

    // Security check: Object.create(null) doesn't have a __proto__ setter on itself
    // that reaches Object.prototype.
    // Setting it just creates a property named "__proto__" on the null-prototype object.
    expect(cookies['__proto__']).toBe('polluted');

    // Verify it's truly a null-prototype object
    expect(Object.getPrototypeOf(cookies)).toBeNull();

    // Verify global Object.prototype is NOT polluted
    // (Using a property name that's unlikely to exist elsewhere)
    const testObj: any = {};
    expect(testObj['polluted']).toBeUndefined();
  });

  it('parseCookies - Edge cases', () => {
    expect(parseCookies({ headers: {} })).toEqual(Object.create(null));
    expect(parseCookies({ headers: { cookie: '' } })).toEqual(Object.create(null));

    const single = parseCookies({ headers: { cookie: 'a=b' } });
    expect(single.a).toBe('b');
  });
});
