import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redact } from '@/lib/log';

test('redact hides secret-looking keys and masks emails in text', () => {
  const out = redact({
    email: 'a@b.co',
    apiKey: 'k',
    authorization: 'Bearer x',
    message: 'failed for someone@example.com today',
    nested: { token: 't', ok: 1 },
    error: new Error('insert failed for x@y.io'),
  });
  assert.equal(out.email, '[redacted]');
  assert.equal(out.apiKey, '[redacted]');
  assert.equal(out.authorization, '[redacted]');
  assert.equal(out.message, 'failed for [email] today');
  assert.deepEqual(out.nested, { token: '[redacted]', ok: 1 });
  assert.deepEqual(out.error, { name: 'Error', message: 'insert failed for [email]' });
});
