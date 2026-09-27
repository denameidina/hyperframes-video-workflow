// Natural Earth GeoJSON → equirectangular SVG paths for the asset library maps
// (spec: docs/superpowers/specs/2026-09-27-asset-library-design.md, "map"). Ported from the
// paper-pack make_map.py: x = (lon - lon0) * k, y = (lat0 - lat) * k, Douglas–Peucker in degrees,
// small islands dropped, rings far outside the box skipped.
export function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const [x1, y1] = pts[0], [x2, y2] = pts[pts.length - 1];
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-12;
  let dmax = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], d = Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / L;
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax <= tol) return [pts[0], pts[pts.length - 1]];
  return [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)];
}

export const ringArea = (r) => Math.abs(r.reduce((s, p, i) => { const q = r[(i || r.length) - 1]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;

// box = {lon0, lon1, lat0, lat1, k, tol, minArea}; returns an SVG path string (integer px)
export function geomPath(geom, box) {
  const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
  const m = 2, out = [];
  for (const poly of polys) {
    const ring = poly[0];
    if (ringArea(ring) < box.minArea) continue;
    if (ring.every(([x, y]) => x < box.lon0 - m || x > box.lon1 + m || y > box.lat0 + m || y < box.lat1 - m)) continue;
    let far = 0, fd = -1;
    ring.forEach(([x, y], i) => { const d = Math.hypot(x - ring[0][0], y - ring[0][1]); if (d > fd) { fd = d; far = i; } });
    const s = [...dp(ring.slice(0, far + 1), box.tol).slice(0, -1), ...dp(ring.slice(far), box.tol)];
    if (s.length < 4) continue;
    out.push('M' + s.map(([x, y]) => `${Math.round((x - box.lon0) * box.k)} ${Math.round((box.lat0 - y) * box.k)}`).join('L') + 'Z');
  }
  return out.join('');
}

// layers = [{id, fill, features: [geojson feature]}]; returns the whole SVG document
export function mapSvg(box, layers, note) {
  const W = Math.round((box.lon1 - box.lon0) * box.k), H = Math.round((box.lat0 - box.lat1) * box.k);
  const body = layers.map((l) => {
    const paths = l.features.map((f) => ({ id: f.id, d: geomPath(f.geometry, box) })).filter((p) => p.d);
    if (l.each) return `<g id="${l.id}" fill="${l.fill}" stroke="${l.stroke ?? 'none'}" stroke-width="${l.strokeWidth ?? 0}">` + paths.map((p) => `<path id="${p.id}" d="${p.d}"/>`).join('') + '</g>';
    return `<path id="${l.id}" fill="${l.fill}" d="${paths.map((p) => p.d).join('')}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><!-- ${note} -->${body}</svg>\n`;
}
