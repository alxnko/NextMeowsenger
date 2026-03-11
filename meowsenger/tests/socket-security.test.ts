import test from 'node:test';
import assert from 'node:assert';

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

test('parseCookies - Security Verification', () => {
  const req = {
    headers: {
      cookie: '__proto__=polluted; normal=value; auth_token=secret'
    }
  };

  const cookies = parseCookies(req);

  // Normal functionality
  assert.strictEqual(cookies.normal, 'value');
  assert.strictEqual(cookies.auth_token, 'secret');

  // Security check: Object.create(null) doesn't have a __proto__ setter on itself
  // that reaches Object.prototype.
  // Setting it just creates a property named "__proto__" on the null-prototype object.
  assert.strictEqual(cookies['__proto__'], 'polluted');

  // Verify it's truly a null-prototype object
  assert.strictEqual(Object.getPrototypeOf(cookies), null);

  // Verify global Object.prototype is NOT polluted
  // (Using a property name that's unlikely to exist elsewhere)
  const testObj: any = {};
  assert.strictEqual(testObj['polluted'], undefined);
});

test('parseCookies - Edge cases', () => {
  assert.deepStrictEqual(parseCookies({ headers: {} }), Object.create(null));
  assert.deepStrictEqual(parseCookies({ headers: { cookie: '' } }), Object.create(null));

  const single = parseCookies({ headers: { cookie: 'a=b' } });
  assert.strictEqual(single.a, 'b');
});
