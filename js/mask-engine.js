// mask-engine.js
// Provides shape mask sampling and outline drawing utilities (globals used by app.js)

function inside(x,y,w,h){
  const shape=state.shape, sc=+('shapeScale' in document ? document.getElementById('shapeScale').value : 88)/100;
  let cx=canvas.width/2,cy=canvas.height/2,W=canvas.width*sc,H=canvas.height*sc;
  if(shape==='rectangle') return x-w/2>0 && x+w/2<canvas.width && y-h/2>0 && y+h/2<canvas.height;
  if(shape==='circle'){ let rx=W/2-w/2, ry=H/2-h/2; return ((x-cx)/rx)**2+((y-cy)/ry)**2<=1 }
  if(shape==='diamond'){ let dx=Math.abs(x-cx)/(W/2-w/2), dy=Math.abs(y-cy)/(H/2-h/2); return dx+dy<=1 }
  if(shape==='star'){ let r=Math.min(W,H)/2, rr=r*.43, dx=x-cx, dy=y-cy, a=Math.atan2(dy,dx)+Math.PI/2; let rad=(Math.cos(5*a)**2>.18)?r:rr; return Math.hypot(dx,dy)+Math.max(w,h)/2<rad }
  if(shape==='heart'){ let nx=(x-cx)/(W*.5), ny=(y-cy)/(H*.5); let q=nx*nx+ny*ny-1; return q*q*q-nx*nx*ny*ny*ny<=0 }
  return true;
}

function drawShapeOutline(W,H,scale){
  const cx=W/2, cy=H/2, sw=W*scale/100, sh=H*scale/100; ctx.save(); ctx.beginPath(); ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=2;
  const shape=state.shape;
  if(shape==='rectangle'){ctx.rect((W-sw)/2,(H-sh)/2,sw,sh);} else if(shape==='circle'){ctx.ellipse(cx,cy,sw/2,sh/2,0,0,Math.PI*2);} else if(shape==='diamond'){ctx.moveTo(cx,cy-sh/2);ctx.lineTo(cx+sw/2,cy);ctx.lineTo(cx,cy+sh/2);ctx.lineTo(cx-sw/2,cy);} else if(shape==='star'){const spikes=5; const outer= Math.min(sw,sh)/2; const inner=outer*0.45; let rot=Math.PI/2*3; let step=Math.PI/spikes; ctx.moveTo(cx,cy-outer); for(let i=0;i<spikes;i++){ctx.lineTo(cx+Math.cos(rot)*outer,cy+Math.sin(rot)*outer);rot+=step;ctx.lineTo(cx+Math.cos(rot)*inner,cy+Math.sin(rot)*inner);rot+=step}} else if(shape==='heart'){let size=Math.min(sw,sh)/2; ctx.moveTo(cx,cy+size/3); ctx.bezierCurveTo(cx+size*1.2,cy-size*0.6,cx+size*0.6,cy-size*1.4,cx,cy-size*0.2); ctx.bezierCurveTo(cx-size*0.6,cy-size*1.4,cx-size*1.2,cy-size*0.6,cx,cy+size/3);} else {ctx.rect((W-sw)/2,(H-sh)/2,sw,sh);} ctx.closePath(); ctx.stroke(); ctx.restore();
}

function createShapeMask(W,H,scale,rng,desiredCount){
  const mask = document.createElement('canvas'); mask.width=W; mask.height=H; const mctx=mask.getContext('2d');
  mctx.clearRect(0,0,W,H); mctx.fillStyle='#fff';
  const cx=W/2, cy=H/2, sw=W*scale/100, sh=H*scale/100;
  const shape=state.shape;
  mctx.beginPath();
  if(shape==='rectangle'){
    mctx.rect((W-sw)/2,(H-sh)/2,sw,sh);
  } else if(shape==='circle'){
    mctx.ellipse(cx,cy,sw/2,sh/2,0,0,Math.PI*2);
  } else if(shape==='diamond'){
    mctx.moveTo(cx,cy-sh/2); mctx.lineTo(cx+sw/2,cy); mctx.lineTo(cx,cy+sh/2); mctx.lineTo(cx-sw/2,cy);
  } else if(shape==='star'){
    const spikes=5; const outer= Math.min(sw,sh)/2; const inner=outer*0.45; let rot=Math.PI/2*3; let x=cx, y=cy; let step=Math.PI/spikes;
    mctx.moveTo(cx,cy-outer);
    for(let i=0;i<spikes;i++){mctx.lineTo(cx+Math.cos(rot)*outer,cy+Math.sin(rot)*outer);rot+=step;mctx.lineTo(cx+Math.cos(rot)*inner,cy+Math.sin(rot)*inner);rot+=step}
  } else if(shape==='heart'){
    let size=Math.min(sw,sh)/2; mctx.moveTo(cx,cy+size/3); mctx.bezierCurveTo(cx+size*1.2,cy-size*0.6,cx+size*0.6,cy-size*1.4,cx,cy-size*0.2); mctx.bezierCurveTo(cx-size*0.6,cy-size*1.4,cx-size*1.2,cy-size*0.6,cx,cy+size/3);
  } else if(shape==='cinema'){
    const bw = sw, bh = sh; const bx=(W-bw)/2, by=(H-bh)/2; mctx.rect(bx,by,bw,bh); mctx.moveTo(bx,by); mctx.lineTo(bx + bw*0.35, by - bh*0.12); mctx.lineTo(bx + bw*0.7, by - bh*0.12);
  } else if(shape==='reel'){
    mctx.ellipse(cx,cy,sw/2,sh/2,0,0,Math.PI*2);
    mctx.fill();
    const holeR = Math.min(sw,sh)/8;
    const offsets = [[-sw*0.2,-sh*0.15],[sw*0.15,-sh*0.15],[-sw*0.0,sh*0.15],[sw*0.33,sh*0.05]];
    mctx.save(); mctx.globalCompositeOperation='destination-out'; offsets.forEach(o=>{mctx.beginPath(); mctx.arc(cx+o[0], cy+o[1], holeR, 0, Math.PI*2); mctx.fill();}); mctx.restore();
  } else if(shape==='music'){
    mctx.moveTo(cx+sw*0.18, cy+sh*0.18); mctx.ellipse(cx+sw*0.18,cy+sh*0.18,sw*0.13,sh*0.13,0,0,Math.PI*2); mctx.ellipse(cx+sw*0.28,cy+sh*0.05,sw*0.12,sh*0.12,0,0,Math.PI*2); mctx.rect(cx+sw*0.28,cy - sh*0.05, sw*0.06, sh*0.45);
  } else if(shape==='silhouette'){
    mctx.ellipse(cx,cy - sh*0.12, sw*0.18, sh*0.18,0,0,Math.PI*2); mctx.moveTo(cx-sw*0.32,cy+sh*0.15); mctx.bezierCurveTo(cx-sw*0.32,cy+sh*0.45,cx+sw*0.32,cy+sh*0.45,cx+sw*0.32,cy+sh*0.15); mctx.closePath();
  } else if(shape==='explosion'){
    let spikes=12, outer=Math.min(sw,sh)/2, inner=outer*0.45; let rot=0; mctx.moveTo(cx,cy-outer);
    for(let i=0;i<spikes;i++){ mctx.lineTo(cx+Math.cos(rot)*outer,cy+Math.sin(rot)*outer); rot+=Math.PI/spikes; mctx.lineTo(cx+Math.cos(rot)*inner,cy+Math.sin(rot)*inner); rot+=Math.PI/spikes }
  } else if(shape==='crown'){
    mctx.moveTo(cx - sw/2, cy + sh/6); mctx.lineTo(cx - sw/4, cy - sh/6); mctx.lineTo(cx, cy + sh/8); mctx.lineTo(cx + sw/4, cy - sh/6); mctx.lineTo(cx + sw/2, cy + sh/6); mctx.lineTo(cx + sw/2, cy + sh/2); mctx.lineTo(cx - sw/2, cy + sh/2);
  } else if(shape==='triangle'){
    mctx.moveTo(cx,cy - sh/2);
    mctx.lineTo(cx + sw/2, cy + sh/2);
    mctx.lineTo(cx - sw/2, cy + sh/2);
  } else if(shape==='rounded'){
    let x0=(W-sw)/2, y0=(H-sh)/2, r=Math.min(24, Math.min(sw,sh)/8);
    mctx.moveTo(x0+r,y0);
    mctx.arcTo(x0+sw,y0,x0+sw,y0+sh,r);
    mctx.arcTo(x0+sw,y0+sh,x0,y0+sh,r);
    mctx.arcTo(x0,y0+sh,x0,y0,r);
    mctx.arcTo(x0,y0,x0+sw,y0,r);
  } else { mctx.rect((W-sw)/2,(H-sh)/2,sw,sh); }
  mctx.closePath(); mctx.fill();

  // If custom polygon provided, parse it and use as mask override
  if(state.shape==='custom'){
    const txt = document.getElementById('customShape')?.value||'';
    const pts = txt.split(/\n|,/).map(l=>l.trim()).filter(Boolean).map(line=>{ const [a,b]=line.split(/[ ,]+/).map(Number); return (Number.isFinite(a)&&Number.isFinite(b)) ? [a,b] : null }).filter(Boolean);
    if(pts.length>=3){ mctx.clearRect(0,0,W,H); mctx.beginPath(); pts.forEach((p,i)=>{ const x = (p[0]/100)*W, y=(p[1]/100)*H; if(i===0) mctx.moveTo(x,y); else mctx.lineTo(x,y); }); mctx.closePath(); mctx.fill(); }
  }

  // sample positions inside mask on a grid
  const step = Math.max(4, Math.floor(Math.min(W,H)/150));
  const positions=[];
  const id = mctx.getImageData(0,0,W,H).data;
  for(let yy=0; yy<H; yy+=step){ for(let xx=0; xx<W; xx+=step){ const idx = (yy*W + xx)*4 + 3; if(id[idx]>10) positions.push({x:xx,y:yy}); }}
  desiredCount = desiredCount || Math.max(2000, Math.floor((W*H)/(step*step)/2));
  let safety = 0;
  while(positions.length < desiredCount && safety < desiredCount*3){ safety++; let xx = Math.floor(rng()*W), yy = Math.floor(rng()*H); const idx = (yy*W + xx)*4 + 3; if(id[idx]>10) positions.push({x:xx,y:yy}); }
  // shuffle using seeded rng
  for(let i=positions.length-1;i>0;i--){let j=Math.floor(rng()*(i+1));[positions[i],positions[j]]=[positions[j],positions[i]]}
  return positions;
}
