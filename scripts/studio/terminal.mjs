// Studio terminal: one PTY per viewer, from script(1) running `tmux attach` (ADR-0020).
// Node child pipes are sockets on macOS and script(1) rejects them, so `cat |` hands it a real pipe.
// Never end the attach's stdin: script(1) would forward ^D into the agent. Kill the process group instead.
import { spawn } from 'node:child_process';
import { HttpError } from './http.mjs';
import { sessionName, tmuxEnv } from './sessions.mjs';

export const VIEWER_RE = /^[A-Za-z0-9-]{8,64}$/;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.floor(Number(n)) || lo));

export function attachCommand(slug, cols, rows) {
  const c = clamp(cols, 20, 400);
  const r = clamp(rows, 5, 200);
  return ['sh', ['-c', `cat | script -q /dev/null sh -c 'stty rows ${r} cols ${c}; exec tmux -u attach -t =${sessionName(slug)}' 2>&1 | cat`]];
}

export class Terminals {
  constructor({ spawnImpl = spawn, killImpl = (pid, sig) => process.kill(-pid, sig) } = {}) {
    this.spawn = spawnImpl;
    this.kill = killImpl;
    this.viewers = new Map();
  }

  open(viewer, slug, cols, rows, { onData, onExit }) {
    if (!VIEWER_RE.test(String(viewer))) throw new HttpError(400, 'invalid viewer id');
    const [cmd, args] = attachCommand(slug, cols, rows);
    const previous = this.viewers.get(viewer);
    if (previous) this.close(previous);
    const child = this.spawn(cmd, args, { detached: true, env: { ...tmuxEnv(), TERM: 'xterm-256color' } });
    const handle = { viewer, child, closed: false };
    this.viewers.set(viewer, handle);
    child.stdout.on('data', onData);
    child.on('exit', () => {
      if (this.viewers.get(viewer) === handle) this.viewers.delete(viewer);
      if (!handle.closed) onExit();
    });
    return handle;
  }

  write(viewer, data) {
    const handle = this.viewers.get(viewer);
    if (!handle) throw new HttpError(404, 'terminal not open');
    handle.child.stdin.write(data);
  }

  close(handle) {
    if (handle.closed) return;
    handle.closed = true;
    if (this.viewers.get(handle.viewer) === handle) this.viewers.delete(handle.viewer);
    try {
      this.kill(handle.child.pid, 'SIGTERM');
    } catch {
      // already gone
    }
  }

  closeAll() {
    for (const handle of [...this.viewers.values()]) this.close(handle);
  }
}
