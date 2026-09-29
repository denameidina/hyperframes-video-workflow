// Studio HTTP helpers: request guard, token cookie, JSON, SSE, ranged files (ADR-0020).
import { createHash, timingSafeEqual } from 'node:crypto';
import { createReadStream, statSync } from 'node:fs';
import { extname } from 'node:path';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function allowedHosts({ addresses, port, names = [] }) {
  return new Set([...addresses, 'localhost', ...names].map((h) => `${h}:${port}`));
}

// Rejects a foreign Host (DNS rebinding) and a cross-origin mutation (CSRF).
export function guardRequest({ method, headers }, hosts) {
  const host = headers.host || '';
  if (!hosts.has(host)) throw new HttpError(403, 'host not allowed');
  if (method !== 'GET' && method !== 'HEAD' && headers.origin !== `http://${host}`) throw new HttpError(403, 'origin not allowed');
}

export const tokenCookie = (token) => createHash('sha256').update(`studio:${token}`).digest('hex');

const same = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export const tokenMatches = (given, token) => Boolean(token) && same(tokenCookie(String(given ?? '')), tokenCookie(token));

function cookieValue(header = '', name) {
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return '';
}

export function hasToken(headers, token) {
  if (!token) return true;
  return same(cookieValue(headers.cookie, 'studio'), tokenCookie(token));
}

export function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

export async function readJson(req, limit = 65536) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new HttpError(413, 'body too large');
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new HttpError(400, 'invalid JSON');
  }
}

export function openSse(res) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
  res.write(': open\n\n');
  const ping = setInterval(() => res.write(': ping\n\n'), 15000);
  const closers = [];
  let closed = false;
  res.on('close', () => {
    closed = true;
    clearInterval(ping);
    for (const f of closers) f();
  });
  return {
    send(event, data) {
      if (!closed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    end() {
      if (!closed) res.end();
    },
    onClose(f) {
      closers.push(f);
    },
  };
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
};

export function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!m || (m[1] === '' && m[2] === '')) return null;
  const start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]);
  const end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (start > end || start >= size) return 'invalid';
  return { start, end };
}

export function sendFile(req, res, file) {
  let st;
  try {
    st = statSync(file);
  } catch {
    throw new HttpError(404, 'not found');
  }
  const headers = { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'accept-ranges': 'bytes', 'cache-control': 'no-store' };
  const range = parseRange(req.headers.range, st.size);
  if (range === 'invalid') {
    res.writeHead(416, { 'content-range': `bytes */${st.size}` });
    res.end();
  } else if (range) {
    res.writeHead(206, { ...headers, 'content-range': `bytes ${range.start}-${range.end}/${st.size}`, 'content-length': range.end - range.start + 1 });
    createReadStream(file, range).pipe(res);
  } else {
    res.writeHead(200, { ...headers, 'content-length': st.size });
    createReadStream(file).pipe(res);
  }
}
