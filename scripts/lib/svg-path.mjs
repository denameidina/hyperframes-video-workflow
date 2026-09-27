// SVG path helpers for the asset library build (spec: docs/superpowers/specs/2026-09-27-asset-library-design.md).
// absolutize(d) rewrites every command as absolute (M L C Q A Z; H/V become L, S/T become C/Q),
// splitSubpaths(d) returns one absolute path string per subpath so each can be drawn or roughened alone.
const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

export function tokenize(d) {
  const out = [];
  for (const m of d.matchAll(/([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g)) {
    const cmd = m[1], up = cmd.toUpperCase(), n = ARGS[up];
    // arc flags may be written without separators ("a2 2 0 011 1"): read them one digit at a time
    let nums;
    if (up === 'A') {
      nums = [];
      const s = m[2];
      let i = 0;
      const re = /[\s,]*(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/iy;
      while (i < s.length) {
        const k = nums.length % 7;
        if (k === 3 || k === 4) {
          const f = /[\s,]*([01])/y; f.lastIndex = i; const fm = f.exec(s);
          if (!fm) break; nums.push(Number(fm[1])); i = f.lastIndex; continue;
        }
        re.lastIndex = i; const nm = re.exec(s);
        if (!nm) break; nums.push(Number(nm[1])); i = re.lastIndex;
      }
    } else nums = (m[2].match(NUM) || []).map(Number);
    if (n === 0) { out.push([cmd]); continue; }
    if (nums.length % n !== 0) throw new Error(`svg-path: ${cmd} needs a multiple of ${n} numbers, got ${nums.length} in "${m[0]}"`);
    for (let i = 0; i < nums.length; i += n) {
      // extra pairs after M/m are implicit L/l
      const c = i > 0 && up === 'M' ? (cmd === 'M' ? 'L' : 'l') : cmd;
      out.push([c, ...nums.slice(i, i + n)]);
    }
  }
  return out;
}

const r = (n) => Number(n.toFixed(3));

export function absolutize(d) {
  let x = 0, y = 0, sx = 0, sy = 0, cx = null, cy = null, qx = null, qy = null;
  const out = [];
  for (const [cmd, ...a] of tokenize(d)) {
    const rel = cmd !== cmd.toUpperCase(), up = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    let nc = null, nq = null;
    if (up === 'M') { x = a[0] + ox; y = a[1] + oy; sx = x; sy = y; out.push(['M', x, y]); }
    else if (up === 'L') { x = a[0] + ox; y = a[1] + oy; out.push(['L', x, y]); }
    else if (up === 'H') { x = a[0] + ox; out.push(['L', x, y]); }
    else if (up === 'V') { y = a[0] + (rel ? y : 0); out.push(['L', x, y]); }
    else if (up === 'C') { const p = [a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy, a[4] + ox, a[5] + oy]; out.push(['C', ...p]); nc = [p[2], p[3]]; x = p[4]; y = p[5]; }
    else if (up === 'S') { const c1 = cx == null ? [x, y] : [2 * x - cx, 2 * y - cy]; const p = [a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy]; out.push(['C', ...c1, ...p]); nc = [p[0], p[1]]; x = p[2]; y = p[3]; }
    else if (up === 'Q') { const p = [a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy]; out.push(['Q', ...p]); nq = [p[0], p[1]]; x = p[2]; y = p[3]; }
    else if (up === 'T') { const c1 = qx == null ? [x, y] : [2 * x - qx, 2 * y - qy]; const p = [a[0] + ox, a[1] + oy]; out.push(['Q', ...c1, ...p]); nq = c1; x = p[0]; y = p[1]; }
    else if (up === 'A') { x = a[5] + ox; y = a[6] + oy; out.push(['A', a[0], a[1], a[2], a[3], a[4], x, y]); }
    else if (up === 'Z') { x = sx; y = sy; out.push(['Z']); }
    [cx, cy] = nc ?? [null, null];
    [qx, qy] = nq ?? [null, null];
  }
  return out;
}

export const stringify = (cmds) => cmds.map(([c, ...a]) => c + a.map(r).join(' ')).join('');

export function splitSubpaths(d) {
  const parts = [];
  for (const c of absolutize(d)) {
    if (c[0] === 'M') parts.push([c]);
    else parts[parts.length - 1].push(c);
  }
  return parts.filter((p) => p.length > 1).map(stringify);
}

// Lucide icon nodes are [tag, attrs]; turn every shape into path data so one drawing code path
// (SK.draw, SK.rough) handles all of them. Rounded rects keep their corners as arcs.
export function shapeToPath(tag, a) {
  const n = (k, dflt = 0) => (a[k] == null ? dflt : Number(a[k]));
  if (tag === 'path') return a.d;
  if (tag === 'line') return `M${n('x1')} ${n('y1')}L${n('x2')} ${n('y2')}`;
  if (tag === 'polyline' || tag === 'polygon') {
    const p = (a.points.match(NUM) || []).map(Number), pts = [];
    for (let i = 0; i < p.length; i += 2) pts.push(`${p[i]} ${p[i + 1]}`);
    return 'M' + pts.join('L') + (tag === 'polygon' ? 'Z' : '');
  }
  if (tag === 'circle' || tag === 'ellipse') {
    const cx = n('cx'), cy = n('cy'), rx = tag === 'circle' ? n('r') : n('rx'), ry = tag === 'circle' ? n('r') : n('ry');
    return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
  }
  if (tag === 'rect') {
    const x = n('x'), y = n('y'), w = n('width'), h = n('height');
    let rx = a.rx != null ? n('rx') : n('ry'), ry = a.ry != null ? n('ry') : rx;
    rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
    if (!rx || !ry) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
  }
  throw new Error(`svg-path: unsupported shape <${tag}>`);
}
