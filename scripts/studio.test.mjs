import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedHosts, guardRequest, hasToken, parseRange, tokenCookie, tokenMatches } from './studio/http.mjs';

const HOSTS = allowedHosts({ addresses: ['127.0.0.1', '100.64.0.1'], port: 4777, names: ['mac.tail.ts.net'] });
const statusOf = (fn) => { try { fn(); return 0; } catch (e) { return e.status; } };

test('guardRequest accepts listen hosts and same-origin mutations', () => {
  assert.equal(statusOf(() => guardRequest({ method: 'GET', headers: { host: '127.0.0.1:4777' } }, HOSTS)), 0);
  assert.equal(statusOf(() => guardRequest({ method: 'GET', headers: { host: 'localhost:4777' } }, HOSTS)), 0);
  assert.equal(statusOf(() => guardRequest({ method: 'GET', headers: { host: 'mac.tail.ts.net:4777' } }, HOSTS)), 0);
  assert.equal(statusOf(() => guardRequest({ method: 'POST', headers: { host: '100.64.0.1:4777', origin: 'http://100.64.0.1:4777' } }, HOSTS)), 0);
});

test('guardRequest rejects foreign hosts and cross-origin mutations', () => {
  assert.equal(statusOf(() => guardRequest({ method: 'GET', headers: { host: 'evil.example:4777' } }, HOSTS)), 403);
  assert.equal(statusOf(() => guardRequest({ method: 'POST', headers: { host: '127.0.0.1:4777' } }, HOSTS)), 403);
  assert.equal(statusOf(() => guardRequest({ method: 'DELETE', headers: { host: '127.0.0.1:4777', origin: 'http://evil.example' } }, HOSTS)), 403);
});

test('token cookie gate', () => {
  assert.equal(hasToken({}, ''), true);
  assert.equal(hasToken({}, 's3cret'), false);
  assert.equal(hasToken({ cookie: `a=1; studio=${tokenCookie('s3cret')}` }, 's3cret'), true);
  assert.equal(hasToken({ cookie: 'studio=nope' }, 's3cret'), false);
  assert.equal(tokenMatches('s3cret', 's3cret'), true);
  assert.equal(tokenMatches('x', 's3cret'), false);
  assert.equal(tokenMatches('x', ''), false);
});

test('parseRange', () => {
  assert.equal(parseRange(undefined, 100), null);
  assert.deepEqual(parseRange('bytes=0-9', 100), { start: 0, end: 9 });
  assert.deepEqual(parseRange('bytes=90-', 100), { start: 90, end: 99 });
  assert.deepEqual(parseRange('bytes=-10', 100), { start: 90, end: 99 });
  assert.equal(parseRange('bytes=200-', 100), 'invalid');
});
