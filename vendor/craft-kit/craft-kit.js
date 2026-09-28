/* craft-kit: choreography recipes (travel -> overshoot -> settle, squash, anticipation, contact
   shadow, word mask, sheen, clip reveal, flip) for HyperFrames compositions.
   Spec: docs/superpowers/specs/2026-09-28-craft-kit-design.md. Inspired by the motion in
   blixvip/NullMotion; written from scratch, no code copied (that repo has no licence).
   A recipe is data: opts -> { set, tracks:{prop:[[t, value, ease?], ...]}, enter, stagger }.
   The same tracks drive a GSAP timeline (CK.add) or a pure function of time (CK.at), so both
   modes render identical curves. Needs gsap only; reads no clock and draws no random numbers. */
(function () {
const g = window.gsap;
if (!g) throw new Error('craft-kit: load gsap before craft-kit.js');
const CK = window.CK = {};
CK.recipes = {};

// ---- engine --------------------------------------------------------------------------------
const eases = {};
const easeOf = (name)=>eases[name] || (eases[name] = g.parseEase(name));
const lerp = (a,b,u)=>typeof a==='number' && typeof b==='number' ? a+(b-a)*u : g.utils.interpolate(a,b,u);
// value of one track at local time t: before the first key = first value, after the last = last
const valueAt = (keys,t)=>{
  for(let i=1;i<keys.length;i++){
    const [t0,v0]=keys[i-1], [t1,v1,e]=keys[i];
    if(t<t1) return t<=t0 ? v0 : lerp(v0,v1,easeOf(e)((t-t0)/(t1-t0)));
  }
  return keys[keys.length-1][1];
};
const list = (targets)=>Array.isArray(targets) ? targets : g.utils.toArray(targets);

/* tracks: resolve a recipe. Times are divided by opts.speed (default 1); a missing ease is
   'none' (GSAP's own default would be power1.out, which breaks parity). */
CK.tracks = (name,opts={})=>{
  const fn=CK.recipes[name];
  if(typeof fn!=='function') throw new Error(`craft-kit: unknown recipe "${name}"`);
  const r=fn(opts), k=1/(opts.speed||1), tracks={};
  let duration=0;
  for(const [prop,keys] of Object.entries(r.tracks)){
    tracks[prop]=keys.map(([t,v,e])=>[t*k,v,e||'none']);
    duration=Math.max(duration,tracks[prop][tracks[prop].length-1][0]);
  }
  return { set:r.set||{}, tracks, duration, enter:!!r.enter, stagger:(opts.stagger??r.stagger??0)*k };
};
// values of every track at local time t (pure; for tests and custom drivers)
CK.sample = (name,t,opts={})=>{
  const {tracks}=CK.tracks(name,opts), out={};
  for(const p in tracks) out[p]=valueAt(tracks[p],t);
  return out;
};
// recipe length in seconds; opts.count targets add their stagger
CK.duration = (name,opts={})=>{
  const r=CK.tracks(name,opts);
  return r.duration+Math.max(0,(opts.count||1)-1)*r.stagger;
};
/* add: write a recipe into a GSAP timeline at `at` seconds. Target i starts at at + i*stagger.
   Entrance recipes also set their first frame at time 0 so the target is hidden before it enters.
   A set at time 0 renders immediately: seeking a fresh paused timeline to 0 renders nothing, so
   without it frame 0 would show the target in its CSS state. */
CK.add = (tl,targets,name,at,opts={})=>{
  const r=CK.tracks(name,opts);
  list(targets).forEach((el,i)=>{
    const t0=at+i*r.stagger, first={...r.set};
    for(const p in r.tracks) first[p]=r.tracks[p][0][1];
    if(r.enter || t0===0) tl.set(el,{...first,immediateRender:true},0);
    if(t0>0) tl.set(el,first,t0);
    for(const p in r.tracks){
      const keys=r.tracks[p];
      for(let k=1;k<keys.length;k++){
        const [a,va]=keys[k-1], [b,vb,e]=keys[k];
        if(b===a) tl.set(el,{[p]:vb},t0+b);
        else tl.fromTo(el,{[p]:va},{[p]:vb,duration:b-a,ease:e,immediateRender:false},t0+a);
      }
    }
  });
  return tl;
};
/* at: apply a recipe at local time t (for update(t) clips). Target i uses t - i*stagger.
   Before its start an entrance recipe holds its first frame; any other recipe leaves the
   target alone, so arrive -> bob -> exit can be called in order every frame. */
CK.at = (targets,name,t,opts={})=>{
  const r=CK.tracks(name,opts);
  list(targets).forEach((el,i)=>{
    const lt=t-i*r.stagger;
    if(lt<0 && !r.enter) return;
    const v={...r.set};
    for(const p in r.tracks) v[p]=valueAt(r.tracks[p],lt);
    g.set(el,v);
  });
};
// split text into .ck-mask > .ck-word once (idempotent); returns the .ck-word spans
CK.split = (el)=>{
  if(el._ckWords) return el._ckWords;
  const words=el.textContent.trim().split(/\s+/).filter(Boolean);
  el.textContent='';
  el._ckWords=words.map((w,i)=>{
    const mask=document.createElement('span'); mask.className='ck-mask';
    const word=document.createElement('span'); word.className='ck-word'; word.textContent=w;
    mask.appendChild(word); el.appendChild(mask);
    if(i<words.length-1) el.appendChild(document.createTextNode(' '));
    return word;
  });
  return el._ckWords;
};

// ---- recipes -------------------------------------------------------------------------------
// dir is the direction of travel: arrive 'up' comes from below, exit 'up' leaves off the top
const DIRS = {up:[0,-1], down:[0,1], left:[-1,0], right:[1,0]};
const dirOf = (d='up')=>{
  if(!DIRS[d]) throw new Error(`craft-kit: unknown dir "${d}"`);
  return DIRS[d];
};
// the stretch axis follows the travel axis
const stretch = (vertical,along,across)=>vertical ? {scaleY:along, scaleX:across} : {scaleX:along, scaleY:across};

/* arrive: fade in 0.08 s; travel power4.out past the rest point (24 px overshoot, stretched
   along the travel, tilted back), settle power2.out in 0.34 s. opts: dir, dist, tilt. */
CK.recipes.arrive = (o)=>{
  const [dx,dy]=dirOf(o.dir), v=dy!==0, dist=o.dist??1120, tilt=o.tilt??12, s=v?-dy:dx;
  const T1=0.9, T2=1.24, E1='power4.out', E2='power2.out';
  const along=[[0,0.72],[T1,1.045,E1],[T2,1,E2]], across=[[0,0.9],[T1,0.98,E1],[T2,1,E2]];
  const tracks={ opacity:[[0,0],[0.08,1,'power2.out']], ...stretch(v,along,across) };
  const pos=[[0,-(v?dy:dx)*dist],[T1,(v?dy:dx)*24,E1],[T2,0,E2]];
  tracks[v?'y':'x']=pos;
  tracks[v?'rotationX':'rotationY']=[[0,s*tilt],[T1,-s*2.5,E1],[T2,0,E2]];
  return { set:{transformOrigin:'50% 82%', transformPerspective:1500}, tracks, enter:true };
};
/* exit: anticipation 0.12 s (10 px against the travel, squashed), fly-off power2.in 0.6 s over
   dist; opacity holds until 0.62 s so the target leaves the frame instead of dissolving. */
CK.recipes.exit = (o)=>{
  const [dx,dy]=dirOf(o.dir), v=dy!==0, d=v?dy:dx, dist=o.dist??1550;
  const tracks={ opacity:[[0,1],[0.62,1],[0.78,0,'power1.in']],
    ...stretch(v,[[0,1],[0.12,0.97,'power2.out'],[0.72,1.06,'power2.in']],[[0,1],[0.12,1.03,'power2.out'],[0.72,0.92,'power2.in']]) };
  tracks[v?'y':'x']=[[0,0],[0.12,-d*10,'power2.out'],[0.72,d*dist,'power2.in']];
  if(v) tracks.rotationX=[[0,0],[0.12,0],[0.72,6*dy,'power2.in']];
  return { set:{transformOrigin:'50% 82%', transformPerspective:1500}, tracks };
};
// bob: idle life during a hold; y 0 -> -amp -> 0, sine.inOut, `cycles` times
CK.recipes.bob = (o)=>{
  const amp=o.amp??8, period=o.period??1.2, cycles=o.cycles??2, y=[[0,0]];
  for(let c=0;c<cycles;c++) y.push([c*period+period/2,-amp,'sine.inOut'],[(c+1)*period,0,'sine.inOut']);
  return { tracks:{y} };
};
// rubber: a bar or rule grows past full size, then relaxes. opts: axis 'x'|'y', origin
CK.recipes.rubber = (o)=>{
  const y=o.axis==='y';
  return { set:{transformOrigin:o.origin??(y?'50% 100%':'50% 50%')}, enter:true,
    tracks:{ [y?'scaleY':'scaleX']:[[0,0],[0.7,1.08,'expo.out'],[1,1,'power3.inOut']] } };
};
// squash: a pill lands wide and short, rebounds narrow and tall, then settles with back.out
CK.recipes.squash = ()=>({ enter:true, tracks:{
  opacity:[[0,0],[0.1,1,'power2.out']],
  scaleX:[[0,0.93],[0.43,1.08,'power3.out'],[0.77,1,'back.out(1.55)']],
  scaleY:[[0,1.06],[0.43,0.95,'power3.out'],[0.77,1,'back.out(1.55)']],
  y:[[0,12],[0.43,-4,'power3.out'],[0.77,0,'back.out(1.55)']],
  filter:[[0,'blur(6px)'],[0.43,'blur(0px)','power3.out']],
} });
// recoil: the group takes the impact of a landed headline, then springs back. opts: push
CK.recipes.recoil = (o)=>{
  const push=o.push??6;
  return { set:{transformOrigin:'18% 50%'}, tracks:{
    x:[[0,0],[0.2,push,'power3.out'],[0.6,0,'back.out(1.45)']],
    scale:[[0,1],[0.2,1.022,'power3.out'],[0.6,1,'back.out(1.45)']],
  } };
};
// wordMask: each .ck-word rises inside its .ck-mask, unskewing and sharpening; stagger 0.105
CK.recipes.wordMask = ()=>({ enter:true, stagger:0.105, tracks:{
  opacity:[[0,0],[0.3,1,'power2.out']],
  yPercent:[[0,118],[0.9,0,'power4.out']],
  skewY:[[0,7],[0.9,0,'power4.out']],
  scale:[[0,1.075],[0.9,1,'power4.out']],
  filter:[[0,'blur(15px)'],[0.9,'blur(0px)','power4.out']],
} });
// sharpen: a held, blurred element comes into focus
CK.recipes.sharpen = ()=>({ enter:true, tracks:{
  filter:[[0,'blur(20px)'],[0.9,'blur(0px)','power2.out']],
  opacity:[[0,0.35],[0.9,1,'power2.out']],
} });
// sheen: a .ck-sheen strip crosses its parent once; hidden before and after
CK.recipes.sheen = ()=>({ enter:true, tracks:{
  '--ck-sheen':[[0,'-40%'],[0.9,'140%','power2.inOut']],
  opacity:[[0,0],[0.12,1,'sine.out'],[0.72,1],[0.9,0,'sine.in']],
} });
// clip: reveal through clip-path. opts: shape 'inset' (from the centre, radius) | 'circle' | 'wipe'
const CLIPS = {
  inset:(r)=>[`inset(49% 49% 49% 49% round ${r}px)`,`inset(0% 0% 0% 0% round ${r}px)`],
  circle:()=>['circle(0% at 50% 50%)','circle(75% at 50% 50%)'],
  wipe:()=>['inset(0% 100% 0% 0%)','inset(0% 0% 0% 0%)'],
};
CK.recipes.clip = (o)=>{
  const shape=o.shape??'inset';
  if(!CLIPS[shape]) throw new Error(`craft-kit: unknown clip shape "${shape}"`);
  const [a,b]=CLIPS[shape](o.radius??0);
  return { enter:true, tracks:{ opacity:[[0,0],[0.08,1,'power2.out']], clipPath:[[0,a],[0.9,b,'expo.out']] } };
};
/* flip: turn to 88 deg, swap faces (--ck-face 0 -> 1) and jump to -88, turn back to 0.
   Stopping short of 90 keeps a thin card from collapsing to a one-pixel line. */
CK.recipes.flip = ()=>({ set:{transformPerspective:1500}, tracks:{
  rotationY:[[0,0],[0.34,88,'power3.in'],[0.34,-88],[0.7,0,'power3.out']],
  '--ck-face':[[0,0],[0.34,0],[0.34,1]],
} });
// shadow: a .ck-shadow that follows arrive (phase 'arrive') or exit (phase 'exit') timing
CK.recipes.shadow = (o)=>{
  if((o.phase??'arrive')==='exit') return { tracks:{
    opacity:[[0,0.36],[0.06,0.36],[0.4,0,'power2.in']],
    scaleX:[[0,0.92],[0.06,0.92],[0.4,0.3,'power2.in']],
    scaleY:[[0,1],[0.06,1],[0.4,0.4,'power2.in']],
  } };
  return { enter:true, tracks:{
    opacity:[[0,0],[0.9,0.3,'power4.out'],[1.24,0.36,'power2.out']],
    scaleX:[[0,0.45],[0.9,1,'power4.out'],[1.24,0.92,'power2.out']],
    scaleY:[[0,0.7],[0.9,1,'power4.out']],
  } };
};
})();
