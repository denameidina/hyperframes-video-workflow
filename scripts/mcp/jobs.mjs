import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const tail = (text, bytes) => {
  const data = Buffer.from(text);
  let start = Math.max(0, data.length - bytes);
  while (start < data.length && (data[start] & 0xc0) === 0x80) start++;
  return data.subarray(start).toString('utf8');
};

export class Jobs {
  constructor({ spawnImpl = spawn, redact = (s) => s, logLimit = 65536, maxRunning = 4, timeoutMs = 3600000 } = {}) {
    this.spawn = spawnImpl; this.redact = redact; this.logLimit = logLimit;
    this.maxRunning = maxRunning; this.timeoutMs = timeoutMs; this.jobs = new Map(); this.closed = false;
  }
  active(j) { return ['running', 'cancelling', 'timing_out'].includes(j.status); }
  busy(key) { return [...this.jobs.values()].some((j) => j.keys.includes(key) && this.active(j)); }
  start({ key, keys = [key], steps, cwd, env, persistent = false, onSuccess }) {
    if (this.closed) throw new Error('job runner is closed');
    keys = [...new Set([key, ...keys])];
    for (const owned of keys) if (this.busy(owned)) throw new Error(`${owned} job is already running`);
    if ([...this.jobs.values()].filter((j) => this.active(j)).length >= this.maxRunning) throw new Error('at most 4 jobs may run concurrently');
    if (!steps?.length) throw new Error('job needs command steps');
    const j = { id: randomUUID(), key, keys, status: 'running', startedAt: new Date().toISOString(), endedAt: null, code: null, log: '', dropped: false, child: null, timer: null };
    this.jobs.set(j.id, j);
    for (const [id, old] of this.jobs) if (this.jobs.size > 100 && !this.active(old)) this.jobs.delete(id);
    const append = (s) => { j.log += String(s); if (Buffer.byteLength(j.log) > this.logLimit * 2) { j.log = tail(j.log, this.logLimit * 2); j.dropped = true; } };
    const finish = (status, code) => { j.status = status; j.code = code; j.endedAt = new Date().toISOString(); clearTimeout(j.timer); j.child = null; };
    const run = (i) => {
      if (j.status !== 'running') return;
      if (i === steps.length) {
        try { onSuccess?.(); finish('succeeded', 0); }
        catch (e) { append(`${e.message}\n`); finish('failed', 1); }
        return;
      }
      const step = steps[i]; let c;
      try {
        c = this.spawn(step.command, step.args, { cwd: step.cwd ?? cwd, env: step.env ?? env, shell: false, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (e) { append(`${e.message}\n`); finish('failed', 1); return; }
      j.child = c;
      let errored = false;
      c.stdout.on('data', append); c.stderr.on('data', append);
      c.once('error', (e) => { errored = true; append(`${e.message}\n`); finish('failed', 1); });
      c.once('close', (code, signal) => {
        if (j.status !== 'running') return;
        if (errored || code !== 0) { if (signal) append(`terminated: ${signal}\n`); finish('failed', code ?? 1); }
        else run(i + 1);
      });
    };
    if (!persistent) j.timer = setTimeout(() => { append('job timeout\n'); this.stop(j, 'timed_out'); }, this.timeoutMs);
    run(0);
    return this.get(j.id);
  }
  get(id) {
    const j = this.jobs.get(id);
    if (!j) throw new Error('unknown job ID (jobs belong to this MCP session)');
    const log = this.redact(j.log);
    return { id: j.id, key: j.key, keys: j.keys, status: j.status, startedAt: j.startedAt, endedAt: j.endedAt, code: j.code, log: tail(log, this.logLimit), logTruncated: j.dropped || Buffer.byteLength(log) > this.logLimit };
  }
  list() { return [...this.jobs.values()].map((j) => { const result = this.get(j.id); delete result.log; return result; }); }
  stop(j, status = 'cancelled') {
    if (j.status !== 'running') return;
    j.status = status === 'timed_out' ? 'timing_out' : 'cancelling'; clearTimeout(j.timer);
    const c = j.child;
    const kill = (signal) => {
      try { if (c?.pid && process.platform !== 'win32') process.kill(-c.pid, signal); else c?.kill(signal); }
      catch (e) { if (e.code !== 'ESRCH') j.log += `termination error: ${e.message}\n`; }
    };
    const finished = () => { j.status = status; j.endedAt = new Date().toISOString(); j.child = null; };
    kill('SIGTERM');
    // Retain ownership/capacity throughout escalation, even if the direct child
    // exits while a descendant ignores TERM and can still write project files.
    if (c?.pid) setTimeout(() => { kill('SIGKILL'); finished(); }, 2000);
    else finished();
  }
  cancel(id) { const j = this.jobs.get(id); if (!j) throw new Error('unknown job ID'); this.stop(j); return this.get(id); }
  close() { this.closed = true; for (const j of this.jobs.values()) this.stop(j); }
}
