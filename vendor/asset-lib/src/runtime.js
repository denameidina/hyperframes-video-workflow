/* asset-lib: the shared asset library for style b-roll clips — icons, pictograms, doodles, marks,
   stamps, frames, VOX documents, maps, hands. Built into vendor/asset-lib/asset-lib.js by
   `npm run asset-lib -- build` (the LIB marker below becomes the SK.LIB data); edit
   vendor/asset-lib/src/runtime.js, never the built file.
   Spec: docs/superpowers/specs/2026-09-27-asset-library-design.md. Needs window.SK (style-kit.js).
   Helpers return HTML strings (insert them once, outside update(t)); nothing here reads a clock or
   Math.random, so every frame stays a pure function of clip time. */
(function () {
if (!window.SK) throw new Error('asset-lib: load vendor/style-kit/style-kit.js before asset-lib.js');
const SK = window.SK;
/*@LIB@*/

// ---- lookup ------------------------------------------------------------------------------------
const has = (o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const pick = (table,kind,id)=>{
  if(has(table,id)) return table[id];
  const stem=String(id).replace(/^[a-z]+\./,'').split('-')[0];
  const near=Object.keys(table).filter(k=>k.includes(stem)).slice(0,5);
  throw new Error(`asset-lib: unknown ${kind} "${id}"${near.length?` (did you mean ${near.join(', ')}?)`:''}`);
};
// a catalog id or the short name: 'icon.coins' and 'coins' both work
const bare = (id,prefix)=>String(id).startsWith(prefix+'.')?String(id).slice(prefix.length+1):String(id);
const full = (id,prefix)=>String(id).includes('.')?String(id):prefix+'.'+id;
const esc = s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mix = (seed,n)=>(Math.imul(seed|0,0x9E3779B1)^Math.imul((n|0)+1,0x85EBCA77))>>>0;

// catalog entry {kind, file | inline, anchor?} for any id in vendor/asset-lib/CATALOG.md
SK.asset = id=>pick(SK.LIB.assets,'asset',id);

// ---- icons and pictograms ----------------------------------------------------------------------
// Lucide line icon; sw is the on-screen stroke width in px at any size (like M.icon)
SK.icon = (id,o={})=>{
  const size=o.size??96, sw=o.sw??2.2, ds=pick(SK.LIB.icons,'icon',bare(id,'icon'));
  return `<svg class="sk-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${o.color??'currentColor'}" stroke-width="${(sw*24/size).toFixed(3)}" stroke-linecap="round" stroke-linejoin="round">${ds.map(d=>`<path d="${d}"/>`).join('')}</svg>`;
};
// Phosphor filled pictogram (Isotype: repeat it to show more, never scale one up)
SK.pict = (id,o={})=>{
  const size=o.size??96, d=pick(SK.LIB.picts,'pictogram',bare(id,'pict'));
  return `<svg class="sk-pict" width="${size}" height="${size}" viewBox="0 0 256 256" fill="${o.color??'currentColor'}"><path d="${d}"/></svg>`;
};

// ---- rough: any stroke drawing as a marker line --------------------------------------------------
/* rough: redraw every <path> inside svg as a marker stroke — sample every o.step viewBox units,
   push the points along the normal by two slow seeded sine waves (±o.amp units), overshoot the end
   a little, and join the points with a Catmull-Rom curve. Same seed → same path. Runs once per
   path (the result is cached on the element), so call it right after inserting the svg. */
SK.rough = (svg,o={})=>{
  const seed=o.seed??1, amp=o.amp??0.3, step=o.step??1;
  svg.querySelectorAll('path').forEach((p,i)=>{
    if(p._skRough) return;
    const L=p.getTotalLength(), n=Math.max(3,Math.ceil(L/step)), r=SK.rng(mix(seed,i+31));
    const f1=0.12+r()*0.1, f2=0.45+r()*0.25, ph1=r()*6.283, ph2=r()*6.283, over=(r()*0.6+0.2)*step;
    const pts=[];
    for(let k=0;k<=n;k++){
      const s=L*k/n, a=p.getPointAtLength(Math.max(0,s-0.01)), b=p.getPointAtLength(Math.min(L,s+0.01)), c=p.getPointAtLength(s);
      const dx=b.x-a.x, dy=b.y-a.y, l=Math.hypot(dx,dy)||1, off=amp*(0.65*Math.sin(s*f1+ph1)+0.35*Math.sin(s*f2+ph2));
      pts.push([c.x-dy/l*off, c.y+dx/l*off]);
    }
    const [x1,y1]=pts[pts.length-2], [x2,y2]=pts[pts.length-1], ll=Math.hypot(x2-x1,y2-y1)||1;
    pts.push([x2+(x2-x1)/ll*over, y2+(y2-y1)/ll*over]);
    const f=v=>v.toFixed(2);
    let d=`M${f(pts[0][0])} ${f(pts[0][1])}`;
    for(let k=0;k<pts.length-1;k++){
      const p0=pts[Math.max(0,k-1)], p1=pts[k], p2=pts[k+1], p3=pts[Math.min(pts.length-1,k+2)];
      d+=`C${f(p1[0]+(p2[0]-p0[0])/6)} ${f(p1[1]+(p2[1]-p0[1])/6)} ${f(p2[0]-(p3[0]-p1[0])/6)} ${f(p2[1]-(p3[1]-p1[1])/6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    p.setAttribute('d',d); p._skRough=true; p._skLen=null;
  });
  return svg;
};
})();
