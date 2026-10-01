// Repliz calendar: receipts offline, explicit read-only sync. ADR-0031, RD-05-38..40.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { basicAuthHeader, buildTargetAccounts } from '../repliz-publish.mjs';
import { projectSlugs } from './files.mjs';
import { HttpError } from './http.mjs';

export function monthRange(month) {
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || Number(month.slice(0, 4)) < 2000 || Number(month.slice(0, 4)) > 2100) {
    throw new HttpError(400, 'Pilih bulan yang valid (YYYY-MM, 2000–2100).');
  }
  const [year, m] = month.split('-').map(Number);
  return { from: new Date(Date.UTC(year, m - 1, 1, -7)).toISOString(), to: new Date(Date.UTC(year, m, 1, -7) - 1).toISOString() };
}

function iso(value) {
  if (typeof value !== 'string' || !/T/.test(value)) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function localEntries(root) {
  const events = [];
  let undated = 0;
  for (const slug of projectSlugs(root)) {
    let receipt;
    try { receipt = JSON.parse(readFileSync(join(root, 'videos', slug, 'repliz-publish.json'), 'utf8')); } catch { continue; }
    for (const s of Array.isArray(receipt?.schedules) ? receipt.schedules : []) {
      if (!s || typeof s !== 'object') continue;
      const scheduleAt = iso(s.scheduleAt) || iso(receipt.post?.scheduleAt);
      if (!scheduleAt) { undated++; continue; }
      events.push({ id: s.scheduleId || `${slug}:${s.platform}:${s.accountId}`, slug,
        title: String(receipt.post?.title || slug), platform: String(s.platform || 'unknown'),
        accountId: String(s.accountId || ''), account: '', status: String(s.status || 'unknown'), scheduleAt, source: 'receipt' });
    }
  }
  return { events, undated };
}

export class ReplizCalendar {
  constructor({ root, env = {}, fetchImpl = fetch, now = () => new Date() }) {
    this.root = root; this.env = env; this.fetch = fetchImpl; this.now = now;
    this.snapshots = new Map();
  }

  async read(month, { sync = false } = {}) {
    const range = monthRange(month);
    const targets = buildTargetAccounts(this.env);
    const configured = Boolean(targets.length && this.env.REPLIZ_API_BASE_URL && this.env.REPLIZ_ACCESS_KEY && this.env.REPLIZ_SECRET_KEY);
    let snapshot = this.snapshots.get(month);
    let warning = configured ? '' : 'Repliz belum dikonfigurasi. Kalender menampilkan receipt lokal.';
    if (sync && configured) {
      try {
        const events = [];
        let partial = false;
        const signal = AbortSignal.timeout(30_000);
        for (let page = 1; page <= 10; page++) {
          const url = new URL('/public/schedule', this.env.REPLIZ_API_BASE_URL);
          url.searchParams.set('page', page); url.searchParams.set('limit', '100');
          url.searchParams.set('fromDate', range.from); url.searchParams.set('toDate', range.to);
          for (const t of targets) url.searchParams.append('accountIds', t.accountId);
          const response = await this.fetch(url.toString(), { headers: { Authorization: basicAuthHeader({ replizAccessKey: this.env.REPLIZ_ACCESS_KEY, replizSecretKey: this.env.REPLIZ_SECRET_KEY }) }, signal, redirect: 'error' });
          if (!response.ok) throw new Error(`Repliz mengembalikan HTTP ${response.status}.`);
          const data = await response.json();
          if (!Array.isArray(data?.docs)) throw new Error('Format respons jadwal Repliz tidak dikenali.');
          if (data.docs.length > 100) partial = true;
          for (const s of data.docs.slice(0, 100)) {
            if (!s || !targets.some((t) => t.accountId === s.accountId)) continue;
            const scheduleAt = iso(s.scheduleAt);
            const id = s.id || s._id;
            if (!scheduleAt || !id) continue;
            const t = targets.find((t) => t.accountId === s.accountId);
            events.push({ id: String(id), slug: null, title: String(s.title || s.description || 'Konten tanpa judul').slice(0, 300),
              platform: t.platform, accountId: t.accountId, account: String(s.account?.name || s.account?.username || ''),
              status: String(s.status || 'unknown'), scheduleAt, source: 'repliz' });
          }
          const hasNext = data.hasNextPage === true || (data.hasNextPage === undefined && (data.totalPages ? page < data.totalPages : data.docs.length === 100));
          if (!hasNext) break;
          if (page === 10) partial = true;
        }
        snapshot = { events, syncedAt: this.now().toISOString(), partial, stale: false };
        this.snapshots.delete(month);
        this.snapshots.set(month, snapshot);
        if (this.snapshots.size > 12) this.snapshots.delete(this.snapshots.keys().next().value);
      } catch (e) {
        // Never forward raw transport/URL errors: they can include configuration.
        warning = /^Repliz mengembalikan HTTP \d+\.$/.test(e.message) || e.message === 'Format respons jadwal Repliz tidak dikenali.'
          ? `${e.message} Coba sinkronkan lagi.` : 'Sinkronisasi Repliz gagal atau melewati 30 detik. Coba lagi.';
        if (snapshot) snapshot.stale = true;
      }
    }
    const local = localEntries(this.root);
    const merged = new Map(local.events.map((e) => [e.id, e]));
    // Preserve linkage to a Studio project while remote data supplies current time/status.
    for (const e of snapshot?.events || []) merged.set(e.id, { ...e, slug: merged.get(e.id)?.slug || null });
    // Older receipts may lack a date, but can still be linked after synchronization.
    const known = new Set((snapshot?.events || []).map((e) => e.id));
    let resolvedUndated = 0;
    for (const slug of projectSlugs(this.root)) {
      try {
        const r = JSON.parse(readFileSync(join(this.root, 'videos', slug, 'repliz-publish.json'), 'utf8'));
        for (const s of Array.isArray(r?.schedules) ? r.schedules : []) {
          if (!s || !known.has(s.scheduleId)) continue;
          const e = merged.get(s.scheduleId); e.slug = slug;
          if (!iso(s.scheduleAt) && !iso(r.post?.scheduleAt)) resolvedUndated++;
        }
      } catch { /* missing/invalid receipt */ }
    }
    const events = [...merged.values()].filter((e) => e.scheduleAt >= range.from && e.scheduleAt <= range.to).sort((a, b) => a.scheduleAt.localeCompare(b.scheduleAt));
    return { month, timeZone: 'Asia/Jakarta', configured, events, undated: Math.max(0, local.undated - resolvedUndated),
      syncedAt: snapshot?.syncedAt || null, stale: snapshot?.stale || false, partial: snapshot?.partial || false, warning };
  }
}
