/* style-kit: primitives for style b-roll clips (broll-text, motion-graphic, whiteboard)
   as HyperFrames sub-compositions. Spec: docs/superpowers/specs/2026-09-27-style-kit-design.md.
   Needs gsap and window.M (vendor/motion-kit/motion-kit.js) loaded first; reuses M.clamp,
   M.eo, M.S and M.track instead of copying them. Every frame is a pure function of
   clip-local time t (seconds): no timers, clocks, or Math.random. */
(function () {
if (!window.M) throw new Error('style-kit: load vendor/motion-kit/motion-kit.js before style-kit.js');
const M = window.M, clamp = M.clamp;
const SK = window.SK = {};

// ---- clip wiring ---------------------------------------------------------------------------
// the clip's stage: the .sk-stage inside the element carrying the clip's data-composition-id
SK.stageOf = (id)=>{
  const stage=document.querySelector(`[data-composition-id="${id}"] .sk-stage`);
  if(!stage) throw new Error(`style-kit: no .sk-stage inside [data-composition-id="${id}"]`);
  return stage;
};
// id lookup scoped to one clip, so ids may repeat across clips
SK.finder = (id)=>{const stage=SK.stageOf(id); return elId=>stage.querySelector('#'+elId);};
/* clip: cfg = { T, update(t), W=1080, H=1920, bg } ; bg: '#hex' sets it, null = transparent
   (panel treatment), undefined = the theme's --sk-bg. Registers a paused GSAP timeline whose
   proxy tween calls update(t) in onUpdate (HyperFrames seeks it per frame). */
SK.clip = (id,cfg)=>{
  if(!cfg||!(cfg.T>0)) throw new Error(`style-kit: clip "${id}" needs cfg.T > 0`);
  if(typeof cfg.update!=='function') throw new Error(`style-kit: clip "${id}" needs cfg.update(t)`);
  const stage=SK.stageOf(id);
  stage.style.width=(cfg.W||1080)+'px'; stage.style.height=(cfg.H||1920)+'px';
  if(cfg.bg!==undefined) stage.style.background=cfg.bg||'transparent';
  const seek=t=>cfg.update(clamp(t,0,cfg.T));
  const proxy={t:0};
  const tl=gsap.timeline({paused:true});
  tl.to(proxy,{t:cfg.T,duration:cfg.T,ease:'none',onUpdate:()=>seek(proxy.t)},0);
  seek(0);
  window.__timelines=window.__timelines||{};
  window.__timelines[id]=tl;
  return seek;
};

// ---- determinism -------------------------------------------------------------------------
// mulberry32: same seed -> same sequence in [0,1)
SK.rng = (seed)=>{
  let a=(seed>>>0)||0x9e3779b9;
  return ()=>{a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296;};
};
const mix = (seed,n)=>(Math.imul(seed|0,0x9E3779B1)^Math.imul((n|0)+1,0x85EBCA77))>>>0;
// quantise time to a frame grid (12 = animating "on twos" at 24 fps)
SK.stepTime = (t,fps)=>Math.floor(t*fps+1e-9)/fps;
// hand-drawn "boil": an offset that jumps to a new seeded value fps times per second
SK.boil = (seed,t,amp,fps=8)=>{
  const r=SK.rng(mix(seed,Math.floor(t*fps+1e-9)));
  return {x:(r()*2-1)*amp, y:(r()*2-1)*amp, r:(r()*2-1)*amp*0.35};
};
SK.jiggle = (el,seed,t,amp=1.5,fps=8)=>{
  const b=SK.boil(seed,t,amp,fps);
  el.style.transform=`translate(${b.x.toFixed(2)}px,${b.y.toFixed(2)}px) rotate(${b.r.toFixed(3)}deg)`;
};

// ---- easing and timing -----------------------------------------------------------------
SK.smooth = u=>{u=clamp(u); return u*u*(3-2*u);};
// seconds since each item's start: t0, t0+gap, t0+2*gap ...
SK.stagger = (t,t0,gap,n)=>Array.from({length:n},(_,i)=>t-(t0+i*gap));

// ---- strokes -------------------------------------------------------------------------------
SK.len = el=>{ if(el._skLen==null) el._skLen=el.getTotalLength(); return el._skLen; };
/* draw-on: u=0 hidden, u=1 fully drawn (the dash is 1px longer than the path to avoid a seam).
   Hiding uses opacity, never visibility: a child set to visibility:visible would stay on screen
   after HyperFrames hides the clip's mount. */
SK.draw = (el,u)=>{
  u=clamp(u); const L=SK.len(el)+1;
  el.style.strokeDasharray=`${L} ${L}`;
  el.style.strokeDashoffset=(L*(1-u)).toFixed(2);
  el.style.opacity=u>0?'1':'0';
  return u;
};
// the pen point at progress u: {x, y, angle(deg)} in the path's user units
SK.tip = (el,u)=>{
  const L=SK.len(el), d=clamp(u)*L;
  const p=el.getPointAtLength(d), a=el.getPointAtLength(Math.max(0,d-1)), b=el.getPointAtLength(Math.min(L,d+1));
  return {x:p.x, y:p.y, angle:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI};
};
/* strokes drawn in order: items = [{el, at, dur}]; without dur a stroke runs at a constant pen
   speed (o.speed px/s, default 750), so long lines take longer, like a real hand.
   o.boil = amp jiggles finished strokes only (a stroke being drawn stays still).
   Returns the tip of the stroke being drawn, or null. */
SK.drawSeq = (t,items,o={})=>{
  let tip=null;
  items.forEach((it,i)=>{
    const dur=it.dur??SK.len(it.el)/(o.speed||750);
    const u=SK.smooth((t-it.at)/dur);
    SK.draw(it.el,u);
    if(u>0&&u<1) tip=SK.tip(it.el,u);
    if(o.boil){ if(u>=1) SK.jiggle(it.el,i+1,t,o.boil); else it.el.style.transform='none'; }
  });
  return tip;
};
// handwriting reveal left to right (clip-path), u in 0..1; the right edge ends 10% past the box
// so slanted last letters are not cut
SK.write = (el,u)=>{
  u=clamp(u);
  el.style.clipPath=`inset(-30% ${((1-u)*110-10).toFixed(2)}% -30% -10%)`;
};
// pen point while writing a word left to right at baseline y (small up-down wiggle per letter)
SK.writeTip = (x0,x1,y,u)=>({x:x0+(x1-x0)*clamp(u), y:y+Math.sin(clamp(u)*Math.PI*14)*9, angle:0});
// marker tip that follows a stroke; a fixed hand angle reads more natural than the stroke angle
SK.MARKER_SVG = '<svg class="sk-marker" viewBox="-6 -150 60 156" width="60" height="156"><path d="M0 0 L10 -26 L30 -26 L40 0 Z" fill="#111"/><rect x="4" y="-150" width="32" height="126" rx="6" fill="#e5e7eb" stroke="#111" stroke-width="3"/><rect x="4" y="-60" width="32" height="10" fill="var(--sk-accent,#dc2626)"/></svg>';
SK.placeMarker = (el,tip)=>{
  if(!tip){el.style.display='none'; return;}
  el.style.display='';
  el.style.transform=`translate(${(tip.x+6).toFixed(2)}px,${(tip.y-6).toFixed(2)}px) rotate(28deg)`;
};

// ---- hand-drawn path builders (pure strings; seed keeps them stable) ----------------------
const f2 = n=>n.toFixed(1);
// a slightly bowed line with a little overshoot at the end
SK.line = (x1,y1,x2,y2,seed=1,amp=6)=>{
  const r=SK.rng(mix(seed,7)), dx=x2-x1, dy=y2-y1, L=Math.hypot(dx,dy)||1, nx=-dy/L, ny=dx/L;
  const bow=(r()*2-1)*amp, over=0.02+r()*0.03;
  const mx=x1+dx*0.5+nx*bow, my=y1+dy*0.5+ny*bow;
  return `M${f2(x1+(r()-0.5)*amp*0.4)} ${f2(y1+(r()-0.5)*amp*0.4)} Q${f2(mx)} ${f2(my)} ${f2(x2+dx*over)} ${f2(y2+dy*over)}`;
};
// four bowed sides as one path; corners overlap like a real marker box
SK.rect = (x,y,w,h,seed=1,amp=7)=>{
  const o=amp*1.2;
  return [SK.line(x-o,y,x+w,y,seed,amp),SK.line(x+w,y-o,x+w,y+h,seed+1,amp),
          SK.line(x+w+o,y+h,x,y+h,seed+2,amp),SK.line(x,y+h+o,x,y-o*0.5,seed+3,amp)].join(' ');
};
// a hand circle: noisy radius, starts at the top-left and overshoots past its start
SK.ellipse = (cx,cy,rx,ry,seed=1,amp=0.05)=>{
  const r=SK.rng(mix(seed,11)), n=14, a0=-2.3, sweep=Math.PI*2*1.08, pts=[];
  for(let i=0;i<=n;i++){const a=a0+sweep*i/n, k=1+(r()*2-1)*amp; pts.push([cx+Math.cos(a)*rx*k, cy+Math.sin(a)*ry*k]);}
  let d=`M${f2(pts[0][0])} ${f2(pts[0][1])}`;
  for(let i=1;i<pts.length;i++){const [px,py]=pts[i-1],[x,y]=pts[i]; d+=` Q${f2(px)} ${f2(py)} ${f2((px+x)/2)} ${f2((py+y)/2)}`;}
  return d;
};
// arrow: {shaft, head} path strings; the head is two short strokes at the end
SK.arrow = (x1,y1,x2,y2,seed=1,amp=6,head=34)=>{
  const a=Math.atan2(y2-y1,x2-x1), s=0.5;
  const hx=(k)=>f2(x2-Math.cos(a+k*s)*head), hy=(k)=>f2(y2-Math.sin(a+k*s)*head);
  return {shaft:SK.line(x1,y1,x2,y2,seed,amp), head:`M${hx(1)} ${hy(1)} L${f2(x2)} ${f2(y2)} L${hx(-1)} ${hy(-1)}`};
};

// ---- words ---------------------------------------------------------------------------------
// split an element's text into <span class="sk-w"> once; existing .sk-w children are kept as-is
SK.words = (el)=>{
  if(el._skWords) return el._skWords;
  const pre=el.querySelectorAll('.sk-w');
  if(pre.length){el._skWords=Array.from(pre); return el._skWords;}
  const ws=el.textContent.trim().split(/\s+/).filter(Boolean);
  el.textContent='';
  el._skWords=ws.map((w,i)=>{
    const s=document.createElement('span'); s.className='sk-w'; s.textContent=w; el.appendChild(s);
    if(i<ws.length-1) el.appendChild(document.createTextNode(' '));
    return s;
  });
  return el._skWords;
};
/* enter: one element's entrance, dt = seconds since its word. Styles:
   fade, rise, pop (small overshoot), slam (from 2.2x down to 1x), mask (rises inside a .sk-mask
   wrapper), drop (falls from above). Before dt=0 the element is hidden. */
SK.enter = (el,dt,style='pop',o={})=>{
  if(dt<0){el.style.opacity='0'; el.style.transform='none'; return 0;}
  let op=1, x=0, y=0, sc=1, unit='px';
  if(style==='fade'){op=M.eo(dt/0.2);}
  else if(style==='rise'){op=M.eo(dt/0.18); y=(1-M.S(dt,18,0.9))*(o.dy??46);}
  else if(style==='pop'){op=clamp(dt/0.06); sc=0.55+0.45*M.S(dt,22,0.55);}
  else if(style==='slam'){op=clamp(dt/0.04); sc=1+1.2*(1-M.S(dt,26,0.62));}
  else if(style==='mask'){y=(1-M.S(dt,17,0.92))*105; unit='%';}
  else if(style==='drop'){op=clamp(dt/0.05); y=-(1-M.S(dt,20,0.6))*(o.dy??120);}
  else throw new Error(`style-kit: unknown enter style "${style}"`);
  el.style.opacity=op.toFixed(4);
  el.style.transform=`translate(${x}${unit},${y.toFixed(2)}${unit}) scale(${sc.toFixed(4)})`;
  return op;
};
// every span enters at its own time (seconds, clip-local); null = already visible
SK.reveal = (spans,times,t,style='pop',o={})=>spans.forEach((s,i)=>SK.enter(s,times[i]==null?Infinity:t-times[i],style,o));

// ---- numbers -------------------------------------------------------------------------------
// Indonesian format: 1.250.000 and 2,5
SK.fmt = (n,dec=0)=>{
  const s=Math.abs(n).toFixed(dec), [i,f]=s.split('.');
  return (n<0&&Number(s)!==0?'-':'')+i.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+(f?','+f:'');
};
// count-up from t0 to t1 (ease-out), clamped; numbers must come from the transcript (Gate 2 R1)
SK.count = (t,t0,t1,from,to,dec=0)=>{
  const u=t1>t0?M.eo((t-t0)/(t1-t0)):(t>=t0?1:0);
  return SK.fmt(from+(to-from)*u,dec);
};

// ---- camera --------------------------------------------------------------------------------
// point (fx,fy) of a .sk-cam layer sits at the frame centre, scaled by s
SK.cam = (el,s,fx=540,fy=960,W=1080,H=1920)=>{
  el.style.transformOrigin='0 0';
  el.style.transform=`translate(${(W/2-s*fx).toFixed(2)}px,${(H/2-s*fy).toFixed(2)}px) scale(${s.toFixed(5)})`;
};
})();
