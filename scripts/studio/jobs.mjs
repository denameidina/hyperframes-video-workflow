// Studio background jobs (Repliz publish, generate voice): one child process per key, its log kept so a viewer who
// joins late sees everything (ADR-0020, ADR-0026).
import { spawn } from 'node:child_process';
import { HttpError } from './http.mjs';

export class JobRunner {
  constructor({ spawnImpl = spawn, label = 'job' } = {}) {
    this.spawn = spawnImpl;
    this.label = label;
    this.jobs = new Map();
  }

  has(key) {
    return this.jobs.has(key);
  }

  running(key) {
    const job = this.jobs.get(key);
    return Boolean(job && job.code === null);
  }

  start(key, cmd, args, opts) {
    if (this.running(key)) throw new HttpError(409, `${this.label} for ${key} is already running`);
    const job = { log: [], code: null, listeners: new Set() };
    this.jobs.set(key, job);
    const emit = (event, data) => {
      if (event === 'log') job.log.push(data);
      for (const f of job.listeners) f(event, data);
    };
    const child = this.spawn(cmd, args, opts);
    child.stdout.on('data', (d) => emit('log', String(d)));
    child.stderr.on('data', (d) => emit('log', String(d)));
    child.on('error', (e) => emit('log', `${e.message}\n`));
    child.on('close', (code) => {
      job.code = code ?? 1;
      emit('done', { code: job.code });
      job.listeners.clear();
    });
    return job;
  }

  follow(key, listener) {
    const job = this.jobs.get(key);
    if (!job) throw new HttpError(404, `no ${this.label} job`);
    for (const line of job.log) listener('log', line);
    if (job.code !== null) {
      listener('done', { code: job.code });
      return () => {};
    }
    job.listeners.add(listener);
    return () => job.listeners.delete(listener);
  }
}
