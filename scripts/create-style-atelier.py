#!/usr/bin/env python3
"""Original layered SVG designs for the seven-style Atelier collection.

Offline and reproducible; no borrowed artwork, generated text, or network calls.
Run from any directory: python3 scripts/create-style-atelier.py
Then npm run asset-lib -- build && npm run asset-lib -- sheets.
"""
from pathlib import Path
import json
import math

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'vendor/asset-lib/artwork/atelier'
INK, PAPER, BLUE, RED, ACID, PINK = '#171918', '#f1eee5', '#244bff', '#fa593d', '#d9fc59', '#b6a3ef'
entries = []

def f(v):
    return f'{v:.2f}'.rstrip('0').rstrip('.') if isinstance(v, float) else str(v)

def path(d, fill='none', stroke=None, sw=5, **attrs):
    a = ''.join(f' {k.replace("_", "-")}="{v}"' for k, v in attrs.items())
    return f'<path d="{d}" fill="{fill}"' + (f' stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"' if stroke else '') + a + '/>'

def rect(x,y,w,h,fill,rx=0,stroke=None,sw=3):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"' + (f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '') + '/>'

def circle(x,y,r,fill,stroke=None,sw=4):
    return f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="{fill}"' + (f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '') + '/>'

def poly(points,fill,stroke=None,sw=3):
    return f'<polygon points="{" ".join(f"{f(x)},{f(y)}" for x,y in points)}" fill="{fill}"' + (f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"' if stroke else '') + '/>'

def g(name,body,**attrs):
    a = ''.join(f' {k.replace("_", "-")}="{v}"' for k,v in attrs.items())
    return f'<g data-part="{name}"{a}>{body}</g>'

def points(cx,cy,r,n,phase=-math.pi/2,inner=None):
    return [(cx+(r if inner is None or i%2==0 else inner)*math.cos(phase+i*2*math.pi/n),cy+(r if inner is None or i%2==0 else inner)*math.sin(phase+i*2*math.pi/n)) for i in range(n)]

def torn(x,y,w,h,n=0):
    # Fine irregular cut edges, authored deterministically rather than random displacement.
    p=[]
    for side in range(4):
        for j in range(19):
            u=j/18; v=4.5*math.sin(j*2.7+n+side*.9)+2*math.sin(j*6.1+.3)
            p.append([(x+w*u,y+v),(x+w+v,y+h*u),(x+w-w*u,y+h+v),(x+v,y+h-h*u)][side])
    return 'M'+'L'.join(f'{f(a)} {f(b)}' for a,b in p)+'Z'

def paper_shape(d,color=PAPER):
    return path(d,color)+path(d,'url(#fibres)',opacity='.36')

def lines(x,y,widths,color='#96998d',gap=25,sw=8):
    return ''.join(path(f'M{x} {y+i*gap}h{w}',stroke=color,sw=sw) for i,w in enumerate(widths))

def ring(cx,cy,r,sw,color,start=0,end=360):
    a,b=math.radians(start), math.radians(end-.01)
    d=f'M{f(cx+r*math.cos(a))} {f(cy+r*math.sin(a))}A{r} {r} 0 {1 if end-start>180 else 0} 1 {f(cx+r*math.cos(b))} {f(cy+r*math.sin(b))}'
    return path(d,stroke=color,sw=sw)

def save(family,name,parts,tags,styles=None,note=''):
    uid=f'atelier-{family}-{name}'
    fibres=''.join(path(f'M{(i*23)%64} {(i*17)%64}l{2+i%4} {.4*(i%3-1)}',stroke='#92795b',sw='.45',opacity='.5') for i in range(65))
    defs=f'''<defs>
      <pattern id="fibres" width="64" height="64" patternUnits="userSpaceOnUse">{fibres}</pattern>
      <linearGradient id="metal" x1=".1" y1="0" x2=".85" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#ffffff"/><stop offset=".17" stop-color="#b1b6c0"/><stop offset=".28" stop-color="#f5f8fc"/><stop offset=".35" stop-color="#20232d"/><stop offset=".48" stop-color="#8798a3"/><stop offset=".57" stop-color="#f3fbff"/><stop offset=".66" stop-color="#55596d"/><stop offset=".84" stop-color="#d8ddf1"/><stop offset="1" stop-color="#2b2d3b"/></linearGradient>
      <linearGradient id="iridescent" x2="1" y2="1"><stop stop-color="#dbfc76"/><stop offset=".24" stop-color="#51d6c9"/><stop offset=".5" stop-color="#8b79ee"/><stop offset=".75" stop-color="#f3a2b7"/><stop offset="1" stop-color="#fcce71"/></linearGradient>
      <linearGradient id="glass" x2="1" y2="1"><stop stop-color="#fbfffa" stop-opacity=".8"/><stop offset=".4" stop-color="#b6a3ef" stop-opacity=".35"/><stop offset="1" stop-color="#244bff" stop-opacity=".7"/></linearGradient>
      <radialGradient id="orb" cx=".3" cy=".2" r=".85"><stop stop-color="#ffffff"/><stop offset=".26" stop-color="#dae8ea"/><stop offset=".36" stop-color="#30354b"/><stop offset=".49" stop-color="#b1bac4"/><stop offset=".66" stop-color="#eefaf3"/><stop offset=".79" stop-color="#535779"/><stop offset="1" stop-color="#171b27"/></radialGradient>
      <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#1e253f"/><stop offset=".52" stop-color="#b9799a"/><stop offset="1" stop-color="#f4c2a2"/></linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="7" dy="9" stdDeviation="1" flood-color="#171918" flood-opacity=".3"/></filter>
    </defs>'''
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" role="img"><title>{family}: {name.replace("-"," ")}</title>{defs}{parts}</svg>\n'
    # Unique ids make different artwork safe to combine inline.
    for token in ['fibres','metal','iridescent','glass','orb','sky','shadow']:
        svg=svg.replace(f'id="{token}"',f'id="{uid}-{token}"').replace(f'url(#{token})',f'url(#{uid}-{token})')
    dest=OUT/family/f'{name}.svg'; dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(svg)
    primary={'text':'broll-text','mg':'motion-graphic','wb':'whiteboard','stop':'stop-motion','vox':'vox','mm':'mix-media','px':'parallax','showreel':'broll-text'}[family]
    entries.append({'id':f'art.{uid}','kind':'artwork','file':str(dest.relative_to(ROOT)), 'use':str(dest.relative_to(ROOT)), 'styles':styles or [primary], 'tags':tags, 'source':'project (original Atelier vector design, 2026-09-30)', 'license':'MIT','changes':'800×600 editable SVG; named data-part groups; '+note})

# Typography framing and print devices: words remain live HTML in compositions.
text=[]
text.append(('offset-plate',g('offset',rect(95,185,610,255,RED))+g('plate',rect(78,165,610,255,BLUE))+g('window',rect(120,207,526,170,PAPER))+g('rule',path('M120 390h526',stroke=INK,sw=8))))
text.append(('fold-banner',g('left-fold',poly([(70,225),(170,225),(170,385),(70,385),(110,300)],RED))+g('right-fold',poly([(630,225),(730,225),(690,300),(730,385),(630,385)],RED))+g('face',rect(145,190,510,180,ACID))+g('crease',path('M145 370l45 45v-45M655 370l-45 45v-45',BLUE))))
text.append(('vertical-rail',g('rail',rect(85,65,138,470,INK))+g('slots',''.join(rect(109,95+i*75,90,44,[PAPER,ACID,PINK][i%3]) for i in range(5)))+g('guide',path('M255 65v470M255 110h430M255 485h430',stroke=INK,sw=3))))
text.append(('editorial-rule',g('rule',path('M90 210h620M90 224h620',stroke=RED,sw=3))+g('columns',path('M90 250v190M505 250v190',stroke=INK,sw=2))+g('note',lines(540,275,[145,120,138,91,134],INK,28,5))+g('block',rect(90,390,360,48,INK))))
text.append(('brush-swash',g('swash',path('M75 365Q220 190 710 195L699 269Q345 292 123 425Z',BLUE))+g('dry-brush',''.join(path(f'M{98+i*4} {375+i*3}Q400 {224+i*7} {690+i*2} {226+i*6}',stroke=PAPER,sw=2) for i in range(8)))))
text.append(('riso-field',g('plate',poly([(75,165),(680,135),(710,425),(115,475)],RED))+g('misregister',path('M92 184L696 151L720 422L115 491',stroke=BLUE,sw=7))+g('dots',''.join(circle(x,y,2+(x//23+y//23)%4,INK) for x in range(130,675,23) for y in range(205,430,23)),opacity='.45')))
text.append(('letter-grid',g('grid',path('M100 100h600v400H100ZM100 233h600M100 366h600M300 100v400M500 100v400',stroke=INK,sw=3))+g('selected',rect(301,234,198,130,ACID))+g('diagonal',path('M100 100l600 400M700 100L100 500',stroke=BLUE,sw=2),opacity='.3')))
text.append(('radial-guide',g('outer',circle(400,300,222,'none',INK,3))+g('ticks',''.join(path(f'M{f(x)} {f(y)}L{f(400+(x-400)*1.08)} {f(300+(y-300)*1.08)}',stroke=INK,sw=3) for x,y in points(400,300,222,32)))+g('arc',ring(400,300,177,14,BLUE,-130,30))+g('core',rect(260,267,280,66,ACID,33))))
text.append(('bracket-frame',g('left',path('M220 130H120v340h100',stroke=BLUE,sw=25))+g('right',path('M580 130h100v340H580',stroke=BLUE,sw=25))+g('baseline',path('M255 425h290',stroke=INK,sw=4))))
text.append(('quotation',g('quote-left',path('M110 330v-70q0-100 115-115v50q-58 12-58 53h58v125H110Z',BLUE))+g('quote-right',path('M270 330v-70q0-100 115-115v50q-58 12-58 53h58v125H270Z',BLUE))+g('rule',path('M420 367h260M420 403h180',stroke=INK,sw=8))))
text.append(('registration',g('targets',''.join(g('target-'+str(i),circle(x,y,24,'none',INK,2)+path(f'M{x-40} {y}h80M{x} {y-40}v80',stroke=INK,sw=2)) for i,(x,y) in enumerate([(125,135),(675,135),(125,465),(675,465)])))+g('print-bars',''.join(rect(248+i*49,463,38,30,[INK,BLUE,RED,ACID,PINK,PAPER][i]) for i in range(6)))+g('frame',rect(165,175,470,245,'none',0,INK,2))))
text.append(('stamp-panel',g('border',path('M100 170h600v250H100Z',stroke=RED,sw=13))+g('inner',path('M120 190h560v210H120Z',stroke=RED,sw=3))+g('edge',lines(147,435,[72,105],RED,19,3))))
text.append(('word-window',g('top',rect(95,140,610,94,INK))+g('bottom',rect(95,366,610,94,INK))+g('sides',rect(95,234,15,132,BLUE)+rect(690,234,15,132,BLUE))+g('baseline',path('M115 344h570',stroke=RED,sw=4))))
text.append(('fold-arrow',g('tail',poly([(90,230),(440,230),(440,170),(710,300),(440,430),(440,365),(90,365)],ACID))+g('fold',poly([(440,230),(510,266),(440,300)],BLUE))+g('crease',path('M440 300v65',stroke=INK,sw=4))))
for name,body in text:save('text',name,body,['media','ide'],['broll-text','mix-media'])

# Flat relationship graphics. Relative marks, no axes or invented values.
mg=[]
mg.append(('orbit-nodes',g('orbit',circle(400,300,180,'none',BLUE,4))+g('spokes',''.join(path(f'M400 300L{f(x)} {f(y)}',stroke=BLUE,sw=3) for x,y in points(400,300,180,6)))+g('nodes',''.join(g('node-'+str(i),circle(x,y,35,[BLUE,RED,ACID][i%3])) for i,(x,y) in enumerate(points(400,300,180,6))))+g('core',circle(400,300,65,INK))))
mg.append(('segmented-ring',''.join(g('segment-'+str(i),ring(400,300,180,64,[BLUE,RED,ACID][i],i*120-90,i*120+20)) for i in range(3))+g('inner',circle(400,300,104,'none',INK,2))))
mg.append(('stepped-funnel',''.join(g('stage-'+str(i),poly([(135+i*62,105+i*110),(665-i*62,105+i*110),(621-i*62,194+i*110),(179+i*62,194+i*110)],[BLUE,RED,INK][i])) for i in range(3))+g('result',rect(313,472,174,24,ACID,12))))
mg.append(('branch-flow',g('inlet',rect(70,250,160,100,BLUE,20))+g('split',path('M230 300C345 300 335 160 450 160M230 300C345 300 335 440 450 440',stroke=INK,sw=12))+g('out-a',rect(450,110,245,100,ACID,20))+g('out-b',rect(450,390,245,100,RED,20))))
mg.append(('radar-bloom',g('grid',''.join(poly(points(400,300,r,6),'none',INK,2) for r in [60,120,180,225]))+g('spokes',''.join(path(f'M400 300L{f(x)} {f(y)}',stroke=INK,sw=2) for x,y in points(400,300,225,6)))+g('profile',poly([(400,100),(536,221),(530,375),(400,450),(262,380),(270,225)],BLUE))+g('nodes',''.join(circle(x,y,8,ACID) for x,y in [(400,100),(536,221),(530,375),(400,450),(262,380),(270,225)]))))
mg.append(('stacked-bars',g('baseline',path('M100 480h600',stroke=INK,sw=5))+''.join(g('bar-'+str(i),rect(145+i*145,480-h,85,h,BLUE)+rect(145+i*145,480-h-60,85,60,ACID)) for i,h in enumerate([100,210,290,180]))))
mg.append(('modular-grid',''.join(g('module-'+str(i),rect(205+(i%3)*132,109+(i//3)*132,120,120,[BLUE,INK,ACID,RED][i%4],18 if i in [1,4,7] else 0)) for i in range(9))))
mg.append(('linked-cells',g('links',path('M215 200h370M215 400h370M215 200v200M585 200v200M400 200v200',stroke=INK,sw=8))+''.join(g('cell-'+str(i),rect(x-55,y-55,110,110,[BLUE,ACID,RED,INK,BLUE,ACID][i],22)) for i,(x,y) in enumerate([(215,200),(400,200),(585,200),(215,400),(400,400),(585,400)]))))
mg.append(('balance',g('stand',poly([(380,220),(420,220),(420,480),(500,480),(500,500),(300,500),(300,480),(380,480)],INK))+g('beam',path('M175 190h450',stroke=BLUE,sw=15))+g('pans',path('M180 195l-75 165h150ZM620 195l-75 165h150Z',stroke=BLUE,sw=5))+g('weights',circle(180,310,29,RED)+rect(590,260,60,70,ACID))))
mg.append(('route-nodes',g('route',path('M105 390C200 390 180 170 310 170S510 440 625 350L705 255',stroke=BLUE,sw=12))+''.join(g('stop-'+str(i),circle(x,y,25,PAPER,INK,5)) for i,(x,y) in enumerate([(105,390),(310,170),(625,350),(705,255)]))))
mg.append(('sparkline',g('grid',path('M95 150h610M95 300h610M95 450h610',stroke='#b7bbb0',sw=2))+g('line',path('M95 414L185 380L275 390L365 275L455 310L545 185L635 210L705 115',stroke=BLUE,sw=12))+g('point',circle(705,115,20,RED))))
mg.append(('wave-mesh',''.join(g('wave-'+str(i),path('M80 '+str(155+i*37)+f'C200 {50+i*40} 285 {430-i*12} 410 {270+i*12}S625 {55+i*35} 720 {185+i*40}',stroke=[BLUE,INK,RED][i%3],sw=5)) for i in range(7))))
mg.append(('data-capsule',g('capsule',rect(100,165,600,270,PAPER,42,INK,5))+g('dial',ring(248,300,76,25,BLUE,-90,170))+g('marks',lines(388,245,[230,190,215,140],INK,40,12))+g('status',circle(640,204,12,RED))))
mg.append(('molecule',g('bonds',path('M400 300L225 180M400 300L575 180M400 300L250 445M400 300L550 445',stroke=INK,sw=18))+''.join(g('atom-'+str(i),circle(x,y,r,c)) for i,(x,y,r,c) in enumerate([(400,300,75,BLUE),(225,180,45,ACID),(575,180,45,RED),(250,445,45,RED),(550,445,45,ACID)]))))
for name,body in mg:save('mg',name,body,['data','ide'],note='relative illustration; set real labels/values before factual use')

# Whiteboard: meaningful authored pen strokes. Each path is independently drawable.
wb={
'logic-flow':['M75 230Q165 221 260 230L258 367Q170 373 73 365Z','M283 300Q340 293 385 300M363 280L386 300L365 320','M410 224Q545 214 706 228L703 372Q565 385 408 369Z'],
'feedback-loop':['M200 260Q260 86 472 135Q611 168 619 295','M598 275L620 298L638 269','M617 335Q560 510 330 465Q196 440 184 317','M165 343L184 315L207 339'],
'decision-tree':['M349 100Q400 86 453 100L452 195L349 190Z','M398 197Q403 231 398 265L209 265L208 310','M400 266L599 265L599 310','M139 313Q207 304 281 315L279 421L137 419Z','M519 310Q599 301 676 315L677 421L519 419Z'],
'hand-graph':['M131 117Q125 320 135 473L695 471','M155 424Q237 455 299 358T439 279T595 197L684 138','M641 137L684 137L682 183'],
'thought-cloud':['M210 387C100 371 115 255 205 233C164 121 297 82 359 141C417 54 578 100 571 185C689 145 750 301 637 346C697 450 546 479 493 422C400 487 281 466 278 399Q239 410 210 387Z','M188 425Q158 451 188 467Q216 468 215 443Z','M146 481Q126 506 154 512'],
'notebook-tabs':['M206 114Q389 104 584 115L580 495L202 494Z','M201 159L155 159L153 205L204 203M583 224L642 224L642 277L582 275','M250 168Q250 183 251 199M250 242v27M250 320v25M250 396v23','M295 190Q395 184 523 194M293 270Q387 263 520 274M294 347Q402 338 520 349M293 421Q404 414 519 425'],
'dashed-orbit':['M188 242Q210 156 314 129M358 119Q484 103 566 170M600 206Q680 288 623 381M596 415Q494 513 362 472M320 464Q212 429 186 345','M595 149L572 171L602 182','M369 264Q399 246 431 265L433 330L368 328Z'],
'bulb-sketch':['M310 369C205 264 289 111 403 118C534 104 595 264 484 375L480 426L319 429Z','M341 437Q400 445 459 437M347 453Q400 459 452 453M361 472Q400 490 438 473','M370 417L350 284L401 324L450 280L427 418','M398 69v-25M226 153l-31-18M177 285h-35M574 144l26-21M625 277h35'],
'magnet':['M228 218L231 364Q239 488 399 488Q555 489 565 368L570 212L465 213L459 364Q457 390 401 390Q342 392 337 364L333 216Z','M230 280L335 281M466 280L567 277','M330 185Q404 91 475 183M356 168L330 187L321 159M474 183L478 159'],
'speed-gauge':['M157 407C99 147 658 75 645 414','M400 369L552 204','M208 335l30 5M272 209l19 23M399 165v29M527 199l-18 24M589 320l-28 7','M376 362Q400 345 422 369Q427 393 401 401Q374 399 376 362Z'],
'bridge':['M109 438Q403 430 696 438','M165 434L165 203M634 434L634 198','M165 202Q399 471 634 201','M243 273v161M320 323v109M401 343v88M480 327v107M560 277v156'],
'check-cluster':['M150 173Q331 164 514 176M150 298Q336 289 514 301M150 422Q334 411 514 425','M576 163L604 193L658 132','M576 288L604 318L658 258','M576 414L604 444L658 385'],
'brain-circuit':['M399 146C330 74 207 153 247 235C157 269 199 398 282 390C278 482 395 484 400 410C459 488 576 445 554 369C639 340 622 206 544 201C542 112 444 98 399 146Z','M399 146Q380 241 405 307Q421 358 400 410','M300 193Q344 189 348 250L347 340M468 190Q438 243 484 262M278 306Q315 275 348 301M473 335Q506 365 526 324'],
'calendar-sketch':['M211 164Q400 156 590 166L586 467Q399 478 208 466Z','M209 237Q400 230 589 240','M302 125L302 195M497 125L497 195','M268 294h27M389 294h27M509 294h27M268 369h27M389 369h27M509 369h27','M365 355L389 386L440 327']}
for name,strokes in wb.items():
    body=''.join(g('stroke-'+str(i),path(d,stroke=RED if i==len(strokes)-1 else INK,sw=7 if i<len(strokes)-1 else 9)) for i,d in enumerate(strokes))
    save('wb',name,body,['ide','kerja'],['whiteboard','mix-media'],note='authored pen order; draw paths sequentially')

# Tactile paper construction, folded facets and transparent cut-outs.
stop=[]
stop.append(('serrated-sun',g('rays',poly(points(400,300,220,48,inner=184),RED))+g('disc',circle(400,300,135,ACID))+g('crease',path('M400 165v270M265 300h270',stroke='#bcc24c',sw=2))))
stop.append(('accordion', ''.join(g('fold-'+str(i),poly([(120+i*92,170+i%2*25),(212+i*92,170+(i+1)%2*25),(212+i*92,425+(i+1)%2*25),(120+i*92,425+i%2*25)],[PAPER,ACID][i%2])+path(f'M{120+i*92} {170+i%2*25}v255',stroke='#c8c5b7',sw=2)) for i in range(6))))
stop.append(('torn-card',g('paper',paper_shape(torn(130,135,540,330,2)))+g('tab',paper_shape(torn(200,85,160,90,4),PINK))+g('line',lines(193,354,[400,280],BLUE,35,4))))
stop.append(('tape-chevron',g('tape-left',paper_shape(torn(155,225,320,90,3),PINK),transform='rotate(24 315 270)')+g('tape-right',paper_shape(torn(345,225,320,90,5),ACID),transform='rotate(-24 505 270)')))
stop.append(('paper-fan',''.join(g('leaf-'+str(i),poly([(400,450),(400+270*math.cos(math.radians(190+i*17)),450+270*math.sin(math.radians(190+i*17))),(400+270*math.cos(math.radians(210+i*17)),450+270*math.sin(math.radians(210+i*17)))],[BLUE,RED,ACID,PINK][i%4])) for i in range(9))+g('pin',circle(400,450,17,INK))))
stop.append(('cutout-plant',g('stem',path('M397 470Q406 334 389 155',stroke=INK,sw=9))+''.join(g('leaf-'+str(i),path(f'M400 {245+i*50}Q{225 if i%2 else 570} {130+i*52} {245 if i%2 else 556} {218+i*47}Q{305 if i%2 else 482} {330+i*30} 400 {245+i*50}Z',[ACID,BLUE][i%2])) for i in range(5))+g('pot',poly([(330,419),(470,419),(450,520),(350,520)],RED))))
stop.append(('ticket-window',g('ticket',paper_shape('M135 164H665V242Q625 243 625 300Q626 352 665 354V435H135V354Q176 350 176 300Q176 242 135 243Z',ACID))+g('perforation',path('M555 180v240',stroke=INK,sw=3,stroke_dasharray='7 10'))+g('window',rect(213,220,292,154,PAPER,0,INK,2))))
stop.append(('index-stack',''.join(g('card-'+str(i),paper_shape(torn(145+i*14,153-i*13,470,295,i),[BLUE,PINK,ACID,PAPER][i]),transform=f'rotate({[-7,5,-3,1][i]} 400 300)') for i in range(4))))
stop.append(('paper-spiral',g('spiral',path('M409 301C382 225 510 230 510 315C508 407 298 412 288 289C276 116 596 91 635 294C675 518 144 573 136 266',stroke=RED,sw=46))+g('edge',path('M409 294C390 240 500 239 500 315C497 395 311 398 300 288C285 136 580 113 623 295C656 496 167 551 149 269',stroke=PAPER,sw=2))))
stop.append(('zigzag-fold',g('folds',poly([(95,165),(280,165),(280,225),(455,225),(455,165),(700,165),(700,280),(535,280),(535,435),(345,435),(345,360),(190,360),(190,435),(95,435)],PINK))+g('creases',path('M280 165v115M455 225v55M345 280v155M190 280v155',stroke=RED,sw=3))))
stop.append(('open-envelope',g('back',rect(150,213,500,257,BLUE))+g('card',paper_shape(torn(225,167,350,247,3),PAPER))+g('flap',poly([(150,213),(400,90),(650,213)],BLUE))+g('front',poly([(150,213),(400,380),(650,213),(650,470),(150,470)],ACID))+g('fold',path('M150 470L400 304L650 470',stroke='#acbf4b',sw=3))))
stop.append(('diecut-frame',g('frame',path(torn(135,100,530,400,4)+'M224 177v246h352V177Z',PINK,fill_rule='evenodd'))+g('inner-edge',path('M224 177v246h352V177Z',stroke=INK,sw=2))+g('tab',rect(576,280,96,45,RED))))
stop.append(('folded-plane',g('wing',poly([(91,265),(708,105),(425,490),(354,327)],PAPER))+g('crease-a',poly([(91,265),(708,105),(354,327)],ACID))+g('crease-b',poly([(354,327),(708,105),(401,345),(425,490)],BLUE))+g('line',path('M91 265L354 327L708 105',stroke=INK,sw=2))))
stop.append(('cardboard-arrow',g('body',paper_shape('M93 220H466V138L712 300L466 464V384H93Z','#c99562'))+g('corrugation',''.join(path(f'M{112+i*13} 235v130',stroke='#8c633e',sw=2) for i in range(26)))+g('edge',path('M94 385h372v77L712 300',stroke='#815533',sw=6))))
for name,body in stop:save('stop',name,g('object',body,filter='url(#shadow)'),['kertas','benda'],['stop-motion','mix-media'])

# Editorial tools: neutral document lines and annotation devices, never fake proof.
vox=[]
vox.append(('evidence-card',g('sheet',paper_shape(torn(150,75,500,450,1)))+g('rail',rect(180,108,14,376,RED))+g('header',rect(225,125,350,22,INK))+g('lines',lines(225,193,[315,350,280,320,302,210],INK,43,8))+g('highlight',rect(213,292,357,35,'#ffe14d'))))
vox.append(('data-bracket',g('bracket',path('M175 110H120v380h55M625 110h55v380h-55',stroke=RED,sw=8))+g('leader',path('M680 300H735',stroke=RED,sw=5))+g('center',rect(230,260,340,80,'#ffe14d'))))
vox.append(('document-tab',g('sheet',paper_shape(torn(140,130,520,350,7)))+g('tab',path('M140 130V86h228l42 44Z',BLUE))+g('rules',lines(193,210,[410,335,390,275,320],INK,47,8))))
vox.append(('highlight-band',g('marker',path('M72 239L710 230L726 344L85 360Z','#ffe14d',opacity='.88'))+g('dry-edge',path('M95 361L723 345M76 227L697 216',stroke='#ffe14d',sw=3))+g('ink',lines(125,275,[542,470],INK,40,10))))
vox.append(('citation-rail',g('rail',rect(100,140,28,320,RED))+g('lines',lines(170,172,[508,435,490,325],INK,54,12))+g('source-box',rect(170,426,250,32,PAPER,0,INK,2))))
vox.append(('magnifier',g('lens',circle(350,265,162,PAPER,INK,13))+g('handle',path('M467 386L640 529',stroke=RED,sw=54))+g('detail',lines(235,211,[220,250,201],INK,42,9))+g('highlight',rect(225,273,245,34,'#ffe14d'))+g('glint',path('M242 186Q276 142 326 136',stroke=BLUE,sw=7))))
vox.append(('locator',g('rings',circle(400,270,138,'none',RED,5)+circle(400,270,91,'none',RED,3))+g('crosshair',path('M400 75v90M400 377v99M205 270h90M504 270h91',stroke=RED,sw=5))+g('dot',circle(400,270,17,RED))+g('note',rect(478,438,205,50,PAPER,0,INK,2))))
vox.append(('compare-card',g('left',paper_shape(torn(88,135,285,330,3)))+g('right',paper_shape(torn(427,135,285,330,6)))+g('divider',path('M400 100v400',stroke=RED,sw=3))+g('lines',lines(125,206,[205,180,205,137],INK,50,8)+lines(465,206,[204,165,200,122],INK,50,8))))
vox.append(('editorial-timeline',g('axis',path('M85 360h630',stroke=INK,sw=6))+''.join(g('event-'+str(i),circle(145+i*170,360,18,RED)+rect(93+i*170,150+(i%2)*90,105,110,PAPER,0,INK,3)+path(f'M{145+i*170} {260+(i%2)*90}v{100-(i%2)*90}',stroke=RED,sw=3)) for i in range(4))))
vox.append(('chart-focus',g('paper',paper_shape(torn(100,105,600,395,2)))+g('chart',path('M154 425L154 194M155 425h480M190 390L265 345L342 365L420 268L493 305L605 210',stroke=INK,sw=6))+g('circle',path('M453 260C541 170 650 207 631 310C601 366 496 364 457 316C437 286 451 261 477 247',stroke=RED,sw=8))))
vox.append(('picture-frame',g('frame',path('M105 115h590v370H105ZM151 164v263h498V164Z',PAPER,fill_rule='evenodd'))+g('edge',path('M151 164v263h498V164Z',stroke=INK,sw=3))+g('corner',poly([(620,99),(716,114),(697,174),(609,151)],'#d6bd88',sw=0))))
vox.append(('source-badge',g('shape',rect(135,211,530,180,PAPER,8,INK,4))+g('tag',rect(164,239,118,117,RED))+g('lines',lines(322,260,[300,265,160],INK,39,9))))
vox.append(('link-card',g('card',paper_shape(torn(135,160,530,280,1)))+g('chain',path('M266 245C235 207 167 226 169 272C171 306 211 320 239 307L303 268C344 244 376 279 355 310L302 354',stroke=BLUE,sw=18))+g('lines',lines(419,240,[185,145,170,102],INK,38,8))))
vox.append(('note-page',g('page',paper_shape('M150 88H579L650 159V510H150Z'))+g('fold',poly([(579,88),(579,159),(650,159)],'#ccc9bd'))+g('red-margin',path('M202 112v370',stroke=RED,sw=3))+g('notes',lines(236,177,[343,288,335,280,320,210],INK,52,7))))
for name,body in vox:save('vox',name,body,['kertas','data'],['vox','mix-media'],note='illustrative apparatus; retain Ilustrasi tag, use genuine sources for proof')

# Collage pieces: torn silhouettes, registration, xerox marks and speaker-safe frames.
mm=[]
mm.append(('ripped-stack',''.join(g('scrap-'+str(i),paper_shape(torn(145+i*21,95+i*22,455,355,i+2),[BLUE,RED,PAPER][i]),transform=f'rotate({[-9,7,-2][i]} 400 300)') for i in range(3))))
mm.append(('film-perforations',g('film',path('M72 140h656v320H72ZM128 190v220h544V190Z',INK,fill_rule='evenodd'))+g('holes',''.join(rect(87+i*43,y,25,27,PAPER,4) for i in range(15) for y in [153,421]))))
mm.append(('mesh-circle',g('disc',circle(400,300,210,PINK))+g('mesh',''.join(path(f'M{220+i*20} {180-30*math.cos(i)}L{340+i*15} {485-30*math.cos(i)}',stroke=INK,sw=3) for i in range(17)))+g('edge',circle(400,300,210,'none',INK,5))))
mm.append(('halftone-shadow',g('spots',''.join(circle(x,y,max(1,12*(1-abs(x-400)/320)*(1-abs(y-300)/240)),INK) for x in range(100,720,25) for y in range(90,530,25)))+g('cut',poly([(157,417),(670,140),(697,163),(180,440)],RED))))
mm.append(('ink-blot',g('blot',path('M270 180C192 93 163 231 217 248C69 273 222 383 270 332C210 478 392 497 413 407C524 558 602 402 540 356C716 353 679 198 568 215C617 81 459 75 425 180C384 85 306 98 270 180Z',INK))+g('spatter',''.join(circle(x,y,r,INK) for x,y,r in [(173,133,9),(618,435,12),(705,258,7),(256,475,5),(454,65,7),(111,323,8)]))))
mm.append(('taped-frame',g('frame',path(torn(133,105,532,390,3)+'M218 180v240h360V180Z',PAPER,fill_rule='evenodd'))+g('tape-a',paper_shape(torn(95,125,180,60,2),'#d4b793'),transform='rotate(-20 185 155)')+g('tape-b',paper_shape(torn(565,403,180,60,5),PINK),transform='rotate(-20 655 433)')))
mm.append(('tag-string',g('string',path('M400 94C588 74 540 262 650 291',stroke=RED,sw=6))+g('tag',paper_shape('M275 153H477L533 237V484H219V237Z',ACID))+g('hole',circle(377,199,13,PAPER,INK,3))+g('rule',path('M267 417h218',stroke=INK,sw=6))))
mm.append(('zigzag-sticker',g('border',poly(points(400,300,220,24,inner=177),PAPER))+g('sticker',poly(points(400,300,202,24,inner=162),RED))+g('slash',path('M286 378L504 214',stroke=INK,sw=35))))
mm.append(('collage-ring',g('ring',path('M400 90A210 210 0 1 1 399.9 90ZM400 160A140 140 0 1 0 400.1 160Z',BLUE,fill_rule='evenodd'))+g('rip',poly([(244,99),(266,177),(192,258),(149,193)],RED))+g('patch',paper_shape(torn(487,358,177,84,4),ACID),transform='rotate(-28 576 400)')))
mm.append(('poster-fold',g('paper',paper_shape('M135 86H665V436L590 514H135Z',PINK))+g('fold',poly([(590,514),(590,436),(665,436)],PAPER))+g('diagonal',path('M170 362L624 156',stroke=BLUE,sw=85))+g('registration',path('M159 115h45M180 94v43M597 467h45M618 446v42',stroke=INK,sw=2))))
mm.append(('grid-cut',g('paper',paper_shape(torn(109,131,582,337,5)))+g('grid',path('M140 191h521M140 251h521M140 311h521M140 371h521M140 431h521M201 164v275M261 164v275M321 164v275M381 164v275M441 164v275M501 164v275M561 164v275M621 164v275',stroke=BLUE,sw=2))+g('swipe',path('M125 448L685 165',stroke=RED,sw=24))))
mm.append(('arch-window',g('arch',path('M150 520V278C150 27 650 27 650 278V520ZM231 445H569V278C569 117 231 117 231 278Z',PAPER,fill_rule='evenodd'))+g('misprint',path('M162 523V280C162 42 662 42 662 280',stroke=BLUE,sw=6))))
mm.append(('news-strip',g('strip',paper_shape(torn(82,227,638,150,6)))+g('columns',lines(112,255,[141,132,145,112],INK,23,3)+lines(294,255,[139,123,148,99],INK,23,3)+lines(483,255,[202,182,201,161],INK,23,3))+g('red-pencil',path('M86 370Q338 324 712 361',stroke=RED,sw=8))))
mm.append(('scissor-path',g('cut-line',path('M99 394C279 234 388 443 697 174',stroke=INK,sw=4,stroke_dasharray='12 12'))+g('blades',path('M398 331L554 196L494 343L447 323L448 461L392 371Z',PAPER,INK,3))+g('handles',circle(402,431,36,'none',RED,15)+circle(336,363,36,'none',RED,15))+g('pivot',circle(409,345,11,INK))))
for name,body in mm:save('mm',name,g('collage',body,filter='url(#shadow)'),['kertas','media'],['mix-media','stop-motion'])

# Separate landscape/world planes; scene demo supplies complementary full-frame sky.
px=[]
px.append(('mountain-back',g('ridge',poly([(0,600),(0,390),(155,288),(282,344),(416,159),(560,319),(663,267),(800,411),(800,600)],'#786c9b'))+g('snow',poly([(365,229),(416,159),(474,230),(426,210),(410,244),(393,218)],'#f0dadc'))))
px.append(('ridge-mid',g('terrain',path('M0 440Q116 373 229 411L392 312L571 401L691 336L800 430V600H0Z','#3c436a'))+g('contours',''.join(path(f'M0 {450+i*24}Q270 {380+i*29} 800 {480+i*14}',stroke='#686084',sw=2) for i in range(6)))))
px.append(('pine-foreground',g('ground',path('M0 538Q403 510 800 558V600H0Z','#182f36'))+''.join(g('tree-'+str(i),poly([(x,600),(x,160+h),(x-58,290+h),(x-30,281+h),(x-77,390+h),(x-46,374+h),(x-94,511+h),(x-12,490+h),(x-12,600)],'#182f36')) for i,(x,h) in enumerate([(30,10),(140,100),(745,35),(790,-10)]))))
px.append(('cloud-veil',g('cloud-a',path('M20 273C97 188 177 313 240 240C295 148 392 282 463 227C548 164 611 289 770 223L800 380H0Z',PAPER,opacity='.18'))+g('cloud-b',path('M0 344Q160 278 355 338T800 301V433H0Z',PAPER,opacity='.1'))))
px.append(('light-beam',g('light',poly([(425,0),(453,0),(720,600),(150,600)],'url(#glass)'),opacity='.35')+g('edge',path('M438 0L240 600',stroke='#fff5d6',sw=3,opacity='.25'))))
px.append(('terrain-lines',''.join(g('contour-'+str(i),path(f'M15 {140+i*23}C{125+i*8} {70+i*21} {340-i*6} {430-i*4} 455 {270+i*5}S{651-i*4} {114+i*22} 785 {185+i*20}',stroke=['#8f8bbe','#f5bfa2','#697ca0'][i%3],sw=3,opacity='.7')) for i in range(12))))
buildings=[(5,225,72,375),(86,326,90,274),(192,180,95,420),(303,278,95,322),(420,155,89,445),(535,309,85,291),(635,230,91,370),(742,365,60,235)]
px.append(('city-back',g('buildings',''.join(rect(x,y,w,h,'#3c4263') for x,y,w,h in buildings))+g('windows',''.join(rect(x+12+j*22,y+18+k*35,7,12,'#b58ba3') for x,y,w,h in buildings for j in range(max(1,w//22-1)) for k in range(h//35-1)))))
px.append(('tower-mid',g('tower',path('M320 600V147L400 80L482 147V600Z','#1c3046'))+g('roof',poly([(320,147),(400,80),(482,147)],'#304b64'))+g('glass',''.join(rect(340+i*29,170+j*42,17,30,['#dfbd88','#5c7892'][j%3==0]) for i in range(5) for j in range(10)))+g('antenna',path('M400 80V21',stroke='#1c3046',sw=9))))
px.append(('railing-front',g('rail',rect(0,410,800,35,'#14242b')+rect(0,551,800,49,'#14242b'))+g('bars',''.join(rect(22+i*96,423,12,177,'#14242b') for i in range(9)))))
px.append(('sun-haze',g('sun',circle(400,285,132,'#f2b998'))+g('halo',circle(400,285,163,'none','#f2b998',2))+g('haze',path('M100 307h600M130 338h540M180 365h440',stroke='#f3c6b1',sw=13,opacity='.5'))))
px.append(('floating-portal',g('outer',rect(210,95,380,410,'none',190,'url(#metal)',42))+g('inside',rect(237,122,326,356,'none',163,'url(#iridescent)',3))+g('base',path('M170 536Q400 566 630 536',stroke='#444860',sw=11))))
px.append(('depth-grid',g('grid',path('M400 160L0 600M400 160L160 600M400 160L320 600M400 160L480 600M400 160L640 600M400 160L800 600M350 215h100M300 275h200M235 345h330M158 430h484M67 529h666',stroke='#7489a2',sw=3))))
px.append(('palm-frame',g('trunk',path('M27 600Q91 329 61 97M786 600Q732 337 761 132',stroke='#173735',sw=26))+''.join(g('frond-'+str(i),path(f'M{61 if i<5 else 761} {97 if i<5 else 132}Q{180 if i<5 else 620} {40+i%5*40} {90+i%5*47 if i<5 else 710-i%5*47} {220+i%5*35}',stroke='#173735',sw=18)) for i in range(10))))
px.append(('glass-shard',g('glass',poly([(281,92),(638,240),(452,501),(169,369)],'url(#glass)'))+g('edge',path('M281 92L638 240L452 501L169 369Z',stroke='#e6eefb',sw=3))+g('facet',poly([(281,92),(354,329),(638,240)],'#f1eee5'),opacity='.15')))
for name,body in px:save('px',name,body,['tempat','ide'],['parallax'],note='original illustrative plane, not a photograph or geographic proof')

# FORM / FREQUENCY extensions: original optical and sculptural vector materials.
sr=[]
sr.append(('chrome-orb',g('sphere',circle(400,300,207,'url(#orb)'))+g('reflection',path('M234 228Q270 138 372 125',stroke='#fafcff',sw=6))+g('rim',circle(400,300,207,'none','#d3dced',2))))
sr.append(('chrome-ribbon',g('ribbon',path('M160 390C0 91 521 4 607 194C696 407 178 475 271 258C308 165 683 155 671 344C658 523 429 548 353 456',stroke='url(#metal)',sw=77))+g('highlight',path('M164 378C51 155 485 53 579 186',stroke='#effbff',sw=4))))
sr.append(('prism-facet',g('left',poly([(400,71),(135,390),(400,532)],'url(#iridescent)'))+g('right',poly([(400,71),(665,390),(400,532)],'url(#metal)'))+g('bottom',poly([(135,390),(400,296),(665,390),(400,532)],'url(#glass)'))+g('edge',path('M400 71v225L135 390M400 296L665 390M400 296v236',stroke='#e7effb',sw=3))))
sr.append(('iridescent-mesh',''.join(g('rib-'+str(i),path(f'M{140+i*9} {160+i*12}C{600-i*7} {25+i*12} {210+i*11} {650-i*13} {672-i*5} {367-i*9}',stroke='url(#iridescent)',sw=8)) for i in range(22))))
sr.append(('glass-card',g('shadow',rect(180,118,440,360,INK,44))+g('glass',rect(145,90,510,420,'url(#glass)',45,'#eef8ff',3))+g('rim',path('M198 102H580Q642 102 642 167V429',stroke='#f5fff5',sw=5,opacity='.65'))+g('inset',rect(189,140,422,317,'none',22,'#f5fff5',1))))
sr.append(('extruded-star',g('extrusion',poly(points(423,329,212,10,inner=104),'#3f4263'))+g('face',poly(points(400,290,212,10,inner=104),'url(#metal)'))+g('bevel',poly(points(400,290,181,10,inner=87),'url(#iridescent)'))))
sr.append(('rubber-loop',g('outer',path('M400 83C668 74 740 420 482 495C221 579 62 305 234 165C296 109 342 90 400 83Z',ACID))+g('hole',path('M399 193C536 173 588 367 451 398C291 446 214 293 307 229C344 204 371 194 399 193Z',INK))+g('edge',path('M241 177C302 122 376 102 435 108',stroke='#f2ffa6',sw=6))))
sr.append(('metal-coil',''.join(g('coil-'+str(i),f'<ellipse cx="{185+i*40}" cy="{300+35*math.sin(i*.6)}" rx="78" ry="158" fill="none" stroke="url(#metal)" stroke-width="19"/>') for i in range(11))))
sr.append(('optical-grid',''.join(g('line-'+str(i),path(f'M{100+i*25} 90Q{400+(i-12)*8} 300 {100+i*25} 510',stroke=INK if i%2 else BLUE,sw=5)) for i in range(25))+''.join(g('row-'+str(i),path(f'M100 {100+i*24}Q400 {350-i*4} 700 {100+i*24}',stroke=INK,sw=3)) for i in range(18))))
sr.append(('orbital-trail',''.join(g('orbit-'+str(i),f'<ellipse cx="400" cy="300" rx="{240-i*11}" ry="{85+i*9}" fill="none" stroke="{[BLUE,PINK,ACID][i%3]}" stroke-width="3" transform="rotate({i*12} 400 300)"/>') for i in range(13))+g('core',circle(400,300,43,'url(#orb)'))))
sr.append(('signal-field',''.join(g('bar-'+str(i),rect(95+i*19,300-abs(math.sin(i*.32))*175,10,20+abs(math.sin(i*.32))*350,'url(#iridescent)',5)) for i in range(33))))
sr.append(('gradient-contours',''.join(g('contour-'+str(i),path(f'M130 {155+i*16}C{190+i*6} {15+i*13} {590-i*4} {80+i*12} 647 {220+i*9}S{635-i*6} {590-i*7} 190 {440-i*7}',stroke='url(#iridescent)',sw=7)) for i in range(18))))
sr.append(('sculpted-petal',''.join(g('petal-'+str(i),path('M400 300C117 210 314 38 400 85C475 127 489 244 400 300Z','url(#metal)'),transform=f'rotate({i*60} 400 300)') for i in range(6))+g('core',circle(400,300,34,INK))))
sr.append(('split-cube',g('top',poly([(400,70),(622,202),(400,334),(178,202)],'url(#iridescent)'))+g('left',poly([(158,227),(380,359),(380,523),(158,391)],'url(#metal)'))+g('right',poly([(420,359),(642,227),(642,391),(420,523)],'url(#glass)'))+g('edges',path('M400 70L622 202L400 334L178 202ZM158 227L380 359V523M420 359L642 227V391',stroke='#f2faff',sw=3))))
for name,body in sr:save('showreel',name,body,['media','ide'],['broll-text','parallax','mix-media'],note='sculptural/optical design study; no physical product depicted')

assert len(entries)==112, len(entries)
items_path=ROOT/'vendor/asset-lib/src/items.json'
old=json.loads(items_path.read_text())
old=[e for e in old if not e['id'].startswith('art.atelier-')]
# Preserve the compact one-entry-per-line source convention.
items_path.write_text('[\n'+',\n'.join('  '+json.dumps(e,ensure_ascii=False,separators=(',',':')) for e in old+entries)+'\n]\n')
manifest=ROOT/'videos/style-atelier/assets/asset-manifest.json';manifest.parent.mkdir(parents=True,exist_ok=True)
manifest.write_text(json.dumps({'collection':'style-atelier','provenance':'designed','license':'MIT','artwork':entries},ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {len(entries)} original layered SVGs across eight families.')
