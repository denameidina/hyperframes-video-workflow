import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ReplizCalendar, monthRange } from './studio/calendar.mjs';
import { normalizePublishTime } from './lib/publish-time.mjs';

const env = { REPLIZ_API_BASE_URL: 'https://api.example.test', REPLIZ_ACCESS_KEY: 'test-key', REPLIZ_SECRET_KEY: 'test-secret', REPLIZ_INSTAGRAM_ACCOUNT_ID: 'ig-1' };
const response = (docs, rest = {}) => ({ ok: true, json: async () => ({ docs, hasNextPage: false, ...rest }) });
function rootOf(t, receipt) {
  const root = mkdtempSync(join(tmpdir(), 'studio-calendar-'));
  mkdirSync(join(root, 'videos', 'video-a'), { recursive: true });
  if (receipt) writeFileSync(join(root, 'videos', 'video-a', 'repliz-publish.json'), JSON.stringify(receipt));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test('monthRange uses WIB boundaries, leap months and rejects invalid queries', () => {
  assert.deepEqual(monthRange('2028-02'), { from: '2028-01-31T17:00:00.000Z', to: '2028-02-29T16:59:59.999Z' });
  for (const v of [null, '', '2026-00', '2026-13', '26-01', '2026-1', '2101-01', '1999-12', '../2026-10']) assert.throws(() => monthRange(v), { status: 400 });
});

test('explicit publish time requires a real future zoned date', () => {
  const now = new Date('2026-10-01T00:00:00Z');
  assert.equal(normalizePublishTime('now', now), 'now');
  assert.equal(normalizePublishTime('2026-10-02T09:00:00+07:00', now), '2026-10-02T02:00:00.000Z');
  assert.equal(normalizePublishTime('2026-10-01T00:01:00Z', now), '2026-10-01T00:01:00.000Z');
  for (const v of ['', null, true, '2026-10-02T09:00', '2026-02-30T09:00:00Z', '2027-02-29T09:00:00Z', '2026-10-01T00:00:59Z', 'yesterday', '2026-10-02T24:00:00Z']) assert.throws(() => normalizePublishTime(v, now));
});

test('calendar opens offline, does not infer dates, filters by WIB month', async (t) => {
  const root = rootOf(t, { post: { title: 'Konten' }, schedules: [
    { platform: 'instagram', scheduleId: 'start', scheduleAt: '2026-09-30T17:00:00Z', status: 'pending' },
    { platform: 'instagram', scheduleId: 'previous', scheduleAt: '2026-09-30T16:59:59Z' },
    { platform: 'instagram', scheduleId: 'end', scheduleAt: '2026-10-31T16:59:59Z' },
    { platform: 'instagram', scheduleId: 'next', scheduleAt: '2026-10-31T17:00:00Z' },
    { platform: 'instagram', scheduleId: 'legacy' },
  ] });
  let calls = 0;
  const cal = new ReplizCalendar({ root, env, fetchImpl: async () => { calls++; throw Error('unexpected'); } });
  const result = await cal.read('2026-10');
  assert.equal(calls, 0);
  assert.deepEqual(result.events.map((e) => e.id), ['start', 'end']);
  assert.equal(result.undated, 1);
  assert.equal(result.events[0].source, 'receipt');
  assert.equal(result.timeZone, 'Asia/Jakarta');
  const missing = await new ReplizCalendar({ root, env: {} }).read('2026-10', { sync: true });
  assert.equal(missing.configured, false);
  assert.match(missing.warning, /belum dikonfigurasi/);
});

test('sync paginates, scopes accounts, deduplicates and links legacy receipts', async (t) => {
  const root = rootOf(t, { post: { title: 'Lokal' }, schedules: [{ scheduleId: 's1', platform: 'instagram', accountId: 'ig-1' }] });
  const calls = [];
  const cal = new ReplizCalendar({ root, env, now: () => new Date('2026-10-01T00:00:00Z'), fetchImpl: async (url, opts) => {
    calls.push({ url: new URL(url), opts });
    const doc = { id: calls.length === 1 ? 's1' : 's2', title: 'Dari Repliz', status: 'success', scheduleAt: '2026-10-02T02:00:00Z', accountId: 'ig-1', account: { name: 'Dena' } };
    return response([doc, { ...doc, id: 'other-account', accountId: 'not-ours' }], { hasNextPage: calls.length === 1 });
  } });
  const result = await cal.read('2026-10', { sync: true });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].url.searchParams.getAll('accountIds'), ['ig-1']);
  assert.equal(calls[0].url.searchParams.get('limit'), '100');
  assert.equal(calls[1].url.searchParams.get('page'), '2');
  assert.equal(calls[0].url.searchParams.get('fromDate'), '2026-09-30T17:00:00.000Z');
  assert.equal(calls[0].opts.redirect, 'error');
  assert.ok(calls[0].opts.signal);
  assert.match(calls[0].opts.headers.Authorization, /^Basic /);
  assert.equal(result.events.length, 2);
  assert.equal(result.events[0].slug, 'video-a');
  assert.equal(result.events[0].source, 'repliz');
  assert.equal(result.events[0].status, 'success');
  assert.equal(result.undated, 0);
  assert.equal(result.syncedAt, '2026-10-01T00:00:00.000Z');
  await cal.read('2026-10');
  assert.equal(calls.length, 2, 'reading snapshot must not access the network');
  assert.doesNotMatch(JSON.stringify(result), /test-key|test-secret|Authorization/);
});

test('failed sync keeps cached/local dates, sanitizes errors and labels stale data', async (t) => {
  const root = rootOf(t);
  let fail = false;
  const cal = new ReplizCalendar({ root, env, fetchImpl: async () => {
    if (fail) throw Error('https://test-key:test-secret@api.example.test');
    return response([{ _id: 's1', accountId: 'ig-1', title: 'Keep', scheduleAt: '2026-10-02T02:00:00Z', status: 'pending' }]);
  } });
  await cal.read('2026-10', { sync: true }); fail = true;
  const result = await cal.read('2026-10', { sync: true });
  assert.equal(result.events[0].title, 'Keep'); assert.equal(result.stale, true);
  assert.doesNotMatch(JSON.stringify(result), /test-key|test-secret/);
  assert.match(result.warning, /Coba lagi/);
  assert.equal((await cal.read('2026-10')).stale, true);
  await assert.rejects(cal.read('bad', { sync: true }), { status: 400 });
});

test('remote paging has a hard limit and never calls mutating endpoints', async (t) => {
  const root = rootOf(t);
  let calls = 0;
  const cal = new ReplizCalendar({ root, env, fetchImpl: async (url, opts) => {
    calls++; assert.equal(opts.body, undefined); assert.equal(opts.method, undefined);
    return response([{ id: `s${calls}`, accountId: 'ig-1', scheduleAt: '2026-10-02T02:00:00Z' }], { hasNextPage: true });
  } });
  const result = await cal.read('2026-10', { sync: true });
  assert.equal(calls, 10); assert.equal(result.partial, true); assert.equal(result.events.length, 10);
});

test('unknown response shape/HTTP errors retain receipts with explicit warnings', async (t) => {
  const root = rootOf(t, { post: { scheduleAt: '2026-10-02T02:00:00Z' }, schedules: [{ scheduleId: 's', platform: 'instagram' }] });
  for (const fake of [async () => ({ ok: false, status: 401 }), async () => ({ ok: true, json: async () => ({ items: [] }) })]) {
    const result = await new ReplizCalendar({ root, env, fetchImpl: fake }).read('2026-10', { sync: true });
    assert.equal(result.events.length, 1); assert.ok(result.warning); assert.equal(result.syncedAt, null);
  }
});
