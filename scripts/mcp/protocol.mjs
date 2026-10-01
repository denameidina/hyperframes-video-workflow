export const VERSIONS = ['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25'];
const MAX_LINE = 6 << 20;
class RpcError extends Error { constructor(code, message) { super(message); this.code = code; } }
const page = (items, params, field) => {
  if (params.cursor !== undefined && (typeof params.cursor !== 'string' || !/^\d+$/.test(params.cursor))) throw new RpcError(-32602, 'invalid pagination cursor');
  const offset = Number(params.cursor ?? 0);
  if (offset > items.length) throw new RpcError(-32602, 'invalid pagination cursor');
  return { [field]: items.slice(offset, offset + 100), ...(offset + 100 < items.length ? { nextCursor: String(offset + 100) } : {}) };
};
export function serve(service, { input = process.stdin, output = process.stdout } = {}) {
  let initialized = false, ready = false, closed = false;
  let revision = VERSIONS.at(-1);
  const cancelled = new Set();
  const pending = new Set();
  const send = (value) => { if (!closed) output.write(JSON.stringify(service.sanitize(value)) + '\n'); };
  async function dispatch(method, params) {
    if (method === 'ping') return {};
    if (method === 'initialize') {
      if (initialized) throw new RpcError(-32600, 'already initialized');
      if (typeof params.protocolVersion !== 'string' || !params.capabilities || typeof params.capabilities !== 'object' || !params.clientInfo || typeof params.clientInfo.name !== 'string' || typeof params.clientInfo.version !== 'string') throw new RpcError(-32602, 'invalid initialize parameters');
      initialized = true;
      revision = VERSIONS.includes(params.protocolVersion) ? params.protocolVersion : VERSIONS.at(-1);
      return { protocolVersion: revision, capabilities: { tools: {}, resources: {}, prompts: {} }, serverInfo: { name: 'dena-video-workspace', version: '1.0.0' }, instructions: 'Local project MCP. Start with workspace_info; poll jobs until completed. Read phase docs and preserve human approval gates.' };
    }
    if (!ready) throw new RpcError(-32002, 'initialize and notifications/initialized are required first');
    switch (method) {
      case 'tools/list': return page(service.tools(), params, 'tools');
      case 'tools/call': {
        if (typeof params.name !== 'string' || !service.hasTool(params.name)) throw new RpcError(-32602, 'unknown or disabled tool');
        try {
          const value = await service.call(params.name, params.arguments ?? {});
          if (value?.content) {
            if (revision < '2025-06-18') return { ...value, content: value.content.map((c) => c.type === 'resource_link' ? { type: 'text', text: JSON.stringify({ path: c.name, uri: c.uri, mimeType: c.mimeType, bytes: c.size }) } : c) };
            return value;
          }
          const structuredContent = value && typeof value === 'object' && !Array.isArray(value) ? value : { result: value };
          // Sanitize both human-readable content and machine-readable data.
          const sanitized = service.sanitize(structuredContent);
          return { content: [{ type: 'text', text: JSON.stringify(sanitized, null, 2) }], structuredContent: sanitized };
        } catch (e) { return { isError: true, content: [{ type: 'text', text: service.redact(e.message) }] }; }
      }
      case 'resources/list': return page(service.resources(), params, 'resources');
      case 'resources/templates/list': return { resourceTemplates: service.resourceTemplates() };
      case 'resources/read':
        if (typeof params.uri !== 'string') throw new RpcError(-32602, 'uri is required');
        try { return await service.resource(params.uri); } catch (e) { throw new RpcError(-32602, e.message); }
      case 'prompts/list': return { prompts: service.prompts() };
      case 'prompts/get':
        if (typeof params.name !== 'string') throw new RpcError(-32602, 'name is required');
        try { return service.prompt(params.name, params.arguments ?? {}); } catch (e) { throw new RpcError(-32602, e.message); }
      default: throw new RpcError(-32601, 'method not found');
    }
  }
  async function message(line) {
    let msg;
    try { msg = JSON.parse(line); } catch { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'invalid JSON' } }); return; }
    if (!msg || Array.isArray(msg) || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string' || (msg.id !== undefined && typeof msg.id !== 'string' && typeof msg.id !== 'number') || (msg.params !== undefined && (!msg.params || typeof msg.params !== 'object' || Array.isArray(msg.params)))) {
      send({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'invalid JSON-RPC message' } }); return;
    }
    const params = msg.params ?? {};
    if (msg.id === undefined) {
      if (msg.method === 'notifications/initialized' && initialized) ready = true;
      if (msg.method === 'notifications/cancelled' && pending.has(params.requestId)) cancelled.add(params.requestId);
      return;
    }
    if (pending.has(msg.id)) { send({ jsonrpc: '2.0', id: msg.id, error: { code: -32600, message: 'duplicate request ID' } }); return; }
    pending.add(msg.id);
    try {
      const result = await dispatch(msg.method, params);
      if (!cancelled.has(msg.id)) send({ jsonrpc: '2.0', id: msg.id, result });
    } catch (e) {
      if (!cancelled.has(msg.id)) send({ jsonrpc: '2.0', id: msg.id, error: { code: e instanceof RpcError ? e.code : -32603, message: service.redact(e.message) } });
    } finally { pending.delete(msg.id); cancelled.delete(msg.id); }
  }
  // Limit a line before JSON parsing, including a sender that never terminates it.
  let buffer = '';
  const onData = (chunk) => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
      if (!line.trim()) continue;
      if (Buffer.byteLength(line) > MAX_LINE) { send({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'message exceeds 6 MiB' } }); continue; }
      void message(line);
    }
    if (Buffer.byteLength(buffer) > MAX_LINE) { send({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'message exceeds 6 MiB' } }); stop(); input.destroy(); }
  };
  input.setEncoding('utf8'); input.on('data', onData);
  const stop = () => { if (closed) return; closed = true; input.removeListener('data', onData); service.jobs.close(); };
  input.once('end', stop); input.once('error', stop); output.once('error', stop);
  return { stop };
}
