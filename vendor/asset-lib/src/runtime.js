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
// ---- strokes: doodles, marks, stamp borders ----------------------------------------------------
/* One <path class="sk-dpath"> per pen stroke in drawing order, so SK.draw / SK.drawSeq can draw it
   on. Not .sk-stroke: `.sk-wb .sk-stroke` would force stroke-width 7 in viewBox units.
   o.size is the width in px; o.sw the on-screen stroke width in px. */
const strokeSvg = (id,o,cls)=>{
  const s=pick(SK.LIB.strokes,'stroke asset',id);
  const w=o.size??240, h=w*s.vb[1]/s.vb[0], k=s.vb[0]/w;
  return `<svg class="${cls}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" viewBox="0 0 ${s.vb[0]} ${s.vb[1]}" fill="none" stroke="${o.color??'currentColor'}" stroke-width="${((o.sw??7)*k).toFixed(3)}" stroke-linecap="round" stroke-linejoin="round">${s.d.map(d=>`<path class="sk-dpath" d="${d}"/>`).join('')}</svg>`;
};
SK.doodle = (id,o={})=>strokeSvg(full(id,'doodle'),o,'sk-doodle');
// red-pen marks (circle, underline, arrow, …) default to the palette's second accent
SK.mark = (id,o={})=>strokeSvg(full(id,'mark'),{color:'var(--sk-accent-2, #d7263d)',sw:9,...o},'sk-mark');

// ---- frames ------------------------------------------------------------------------------------
/* stamp / badge: an SVG border plus centred text. Stamps with fixed words (ILUSTRASI, CONTOH, …)
   use them; badges need o.text from the transcript. */
SK.stamp = (id,o={})=>{
  const key=full(id,'frame'), s=pick(SK.LIB.strokes,'stamp',key), text=o.text??s.text;
  if(!text) throw new Error(`asset-lib: ${key} needs o.text (a word from the transcript)`);
  const w=o.size??320, h=w*s.vb[1]/s.vb[0];
  // default text size fits both the height and the width (≈ 0.62 em per uppercase letter + tracking)
  const fs=o.fontSize??Math.min(h*0.3, w*0.62/(String(text).length*0.72));
  return `<div class="sk-stamp" style="width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;color:${o.color??'var(--sk-accent-2, #d7263d)'}">${strokeSvg(key,{size:w,sw:o.sw??5,color:'currentColor'},'sk-stamp-border')}<span class="sk-stamp-text" style="font-size:${fs.toFixed(1)}px">${esc(text)}</span></div>`;
};
// torn-paper clip-path from a named SK.torn preset, sized to the piece
SK.tornFrame = (id,w,h)=>{
  const p=pick(SK.LIB.torn,'torn frame',full(id,'frame'));
  return SK.torn(w,h,p.seed,{edges:p.edges,amp:p.amp,step:p.step});
};
/* CSS frames. o.content is HTML placed in the photo/screen area (an <img>, a .sk-obj, text);
   film-strip-3 takes o.content as an array of three. */
const FRAMES = {
  'polaroid': o=>`<div class="sk-frame sk-frame-polaroid" style="width:${o.w}px"><div class="sk-frame-photo" style="height:${o.h}px">${o.content??''}</div><div class="sk-frame-caption sk-hand">${esc(o.caption??'')}</div></div>`,
  'polaroid-tilt': o=>FRAMES['polaroid'](o).replace('sk-frame-polaroid"','sk-frame-polaroid sk-frame-tilt"'),
  'film-strip-3': o=>`<div class="sk-frame sk-frame-film" style="width:${o.w}px">${[0,1,2].map(i=>`<div class="sk-frame-cell" style="height:${o.h}px">${(o.content??[])[i]??''}</div>`).join('')}</div>`,
  'browser-generic': o=>`<div class="sk-frame sk-frame-browser" style="width:${o.w}px"><div class="sk-frame-bar"><i></i><i></i><i></i><span class="sk-frame-url"></span></div><div class="sk-frame-screen" style="height:${o.h}px">${o.content??''}</div></div>`,
  'phone-generic': o=>`<div class="sk-frame sk-frame-phone" style="width:${o.w}px"><div class="sk-frame-screen" style="height:${o.h}px">${o.content??''}</div></div>`,
  'notebook-page': o=>`<div class="sk-frame sk-frame-notebook" style="width:${o.w}px;height:${o.h}px">${o.content??''}</div>`,
  'index-card': o=>`<div class="sk-frame sk-frame-card" style="width:${o.w}px;height:${o.h}px">${o.content??''}</div>`,
};
SK.frame = (id,o={})=>pick(FRAMES,'frame',bare(id,'frame'))({w:o.w??600,h:o.h??600,...o});

// ---- VOX documents -----------------------------------------------------------------------------
/* SK.doc(kind, fields, {w}) → an illustrative document (never a copy of a real outlet or app).
   Text comes from the transcript; a missing text field becomes grey placeholder lines. Every
   document carries the ILUSTRASI tag and it cannot be turned off (RD-03-43). */
const lines = (n,w)=>Array.from({length:n},(_,i)=>`<div class="sk-doc-line" style="width:${i===n-1?w*0.6:w}px"></div>`).join('');
const para = (v,n,w)=>v==null?lines(n,w):[].concat(v).map(t=>`<p>${esc(t)}</p>`).join('');
const DOCS = {
  'article': (f,w)=>`<div class="sk-doc-kicker">${esc(f.kicker??'')}</div><h1 class="sk-serif">${esc(f.headline??'')}</h1><div class="sk-doc-dek sk-serif">${esc(f.dek??'')}</div>${para(f.body,6,w-96)}`,
  'report-page': (f,w)=>`<div class="sk-doc-kicker">${esc(f.section??'')}</div><h2>${esc(f.title??'')}</h2><table class="sk-doc-table">${(f.rows??[]).map(r=>`<tr><td>${esc(r.label)}</td><td class="sk-doc-num">${esc(r.value)}</td></tr>`).join('')}</table>${para(f.body,3,w-96)}`,
  'spreadsheet': (f)=>`<table class="sk-doc-grid"><tr><th></th>${(f.columns??[]).map((c,i)=>`<th>${esc(c)}</th>`).join('')}</tr>${(f.rows??[]).map((r,i)=>`<tr class="${i===f.highlightRow?'sk-doc-hl':''}"><th>${i+1}</th>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`,
  'chat-thread': (f)=>`<div class="sk-doc-chat">${(f.messages??[]).map(m=>`<div class="sk-doc-msg ${m.side==='r'?'sk-doc-r':'sk-doc-l'}"><b>${esc(m.from??'')}</b>${esc(m.text)}</div>`).join('')}</div>`,
  'email': (f,w)=>`<div class="sk-doc-mailhead"><div><b>Dari</b> ${esc(f.from??'')}</div><div><b>Subjek</b> ${esc(f.subject??'')}</div></div>${para(f.body,5,w-96)}`,
  'social-post': (f,w)=>`<div class="sk-doc-author"><i class="sk-doc-avatar"></i><b>${esc(f.name??'Akun')}</b></div><div class="sk-doc-post">${esc(f.text??'')}</div>${f.text==null?lines(3,w-96):''}<div class="sk-doc-meta">${esc(f.meta??'')}</div>`,
  'receipt': (f)=>`<div class="sk-doc-center"><b>${esc(f.title??'STRUK')}</b></div>${(f.items??[]).map(i=>`<div class="sk-doc-row"><span>${esc(i.name)}</span><span>${esc(i.price)}</span></div>`).join('')}<div class="sk-doc-row sk-doc-total"><span>TOTAL</span><span>${esc(f.total??'')}</span></div>`,
  'invoice': (f)=>`<div class="sk-doc-row"><h2>INVOICE</h2><span>${esc(f.number??'')}</span></div><div class="sk-doc-kicker">Kepada: ${esc(f.to??'')}</div><table class="sk-doc-table">${(f.items??[]).map(i=>`<tr><td>${esc(i.name)}</td><td class="sk-doc-num">${esc(i.qty??'')}</td><td class="sk-doc-num">${esc(i.price)}</td></tr>`).join('')}</table><div class="sk-doc-row sk-doc-total"><span>Total</span><span>${esc(f.total??'')}</span></div>`,
  'search-results': (f,w)=>`<div class="sk-doc-search">${esc(f.query??'')}</div>${(f.results??[]).map(r=>`<div class="sk-doc-result"><div class="sk-doc-rtitle">${esc(r.title)}</div><div>${esc(r.snippet??'')}</div></div>`).join('')}${f.results==null?lines(6,w-96):''}`,
  'terminal': (f)=>`<div class="sk-doc-term">${(f.lines??[]).map(l=>`<div>${l.prompt?'<span class="sk-doc-prompt">$ </span>':''}${esc(l.text)}</div>`).join('')}</div>`,
};
SK.doc = (kind,f={},o={})=>{
  const w=o.w??800, body=pick(DOCS,'document',kind)(f,w);
  return `<div class="sk-doc sk-docx sk-doc-${kind}" style="width:${w}px">${body}<div class="sk-tag sk-doc-tag">Ilustrasi</div></div>`;
};
SK.DOC_KINDS = Object.keys(DOCS);
// ---- maps and places ---------------------------------------------------------------------------
/* SK.MAPS: every library map ({src, w, h, lon0, lat0, k}, equirectangular). SK.geo(lat, lon, map)
   keeps its old two-argument form for the Indonesia map. New cities are added to SK.CITIES without
   touching the eight old ones. */
SK.MAPS = SK.LIB.maps;
SK.geo = (lat,lon,map='indonesia')=>{
  const m=pick(SK.MAPS,'map',bare(map,'map'));
  return {x:(lon-m.lon0)*m.k, y:(m.lat0-lat)*m.k};
};
for(const [k,v] of Object.entries(SK.LIB.cities)) if(!has(SK.CITIES,k)) SK.CITIES[k]=v;
})();
