// renderer.js
// Responsible for final drawing effects (glow, emboss, styles) — placeholder
// p: placement and appearance parameters
function renderAppearance(ctx, p){
  // p: {x,y,size,word,font,angle,palette,appearance}
  ctx.save();
  ctx.translate(p.x,p.y); ctx.rotate(p.a||0);
  ctx.font = `${p.weight||700} ${p.size}px ${p.font}`; ctx.textAlign='center'; ctx.textBaseline='middle';
  // Default fill: linear gradient from palette
  let g = ctx.createLinearGradient(-p.size,-p.size,p.size,p.size);
  if(p.appearance==='gold' || p.appearance==='metallic'){
    g.addColorStop(0,'#fff6e6'); g.addColorStop(.5,'#f2d08a'); g.addColorStop(1,'#c89a3d');
    ctx.fillStyle = g; ctx.fillText(p.word,0,0);
    ctx.strokeStyle='rgba(0,0,0,0.12)'; ctx.lineWidth = Math.max(1,p.size*0.03); ctx.strokeText(p.word,0,0);
  } else if(p.appearance==='neon'){
    ctx.fillStyle = '#fff'; ctx.fillText(p.word,0,0);
    ctx.shadowColor = p.paletteColor||'rgba(0,200,255,0.9)'; ctx.shadowBlur = Math.max(6,p.size*0.12); ctx.fillStyle = p.paletteColor||'#0ff'; ctx.fillText(p.word,0,0);
    ctx.shadowBlur = 0;
  } else if(p.appearance==='emboss'){
    ctx.fillStyle = p.fill||'#fff'; ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur= p.size*0.04; ctx.fillText(p.word,2,2);
    ctx.shadowColor='rgba(255,255,255,0.6)'; ctx.shadowBlur= p.size*0.02; ctx.fillStyle=p.fill||'#ddd'; ctx.fillText(p.word,-2,-2);
  } else if(p.appearance==='outline'){
    ctx.fillStyle = p.fill||'#fff'; ctx.strokeStyle = p.stroke||'#000'; ctx.lineWidth = Math.max(1,p.size*0.06); ctx.strokeText(p.word,0,0); ctx.fillText(p.word,0,0);
  } else if(p.appearance==='poster'){
    // stronger stroke + two-tone fill
    g.addColorStop(0,'#fff'); g.addColorStop(1,p.paletteColor||'#e0e1dd'); ctx.fillStyle=g; ctx.fillText(p.word,0,0);
    ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(2,p.size*0.05); ctx.strokeText(p.word,0,0);
  } else {
    // solid/gradient default — only use gradient when appearance explicitly requests it
    if(p.appearance === 'gradient' && p.gradient){ ctx.fillStyle = p.gradient; } else { ctx.fillStyle = p.fill || '#fff'; }
    ctx.fillText(p.word,0,0);
  }
  ctx.restore();
}

// helper to create a palette gradient and primary color
function makePaletteFor(ctx, p){
  // p.palette is a key like 'gold' or 'random'
  if(p.palette==='random'){
    const sr = (typeof window.state?.rng === 'function') ? window.state.rng : Math.random;
    let h1 = Math.floor(sr()*360), s1 = 45 + Math.floor(sr()*45), l1 = 40 + Math.floor(sr()*20);
    let h2 = (h1 + 30 + Math.floor(sr()*60))%360, s2 = Math.max(40, s1 - 10), l2 = Math.min(80, l1 + 10);
    const c0 = `hsl(${h1} ${s1}% ${l1}%)`, c1 = `hsl(${h2} ${s2}% ${l2}%)`;
    p.paletteColor = c0; p.fill = c0; p.stroke = c1;
    if(p.appearance === 'gradient'){
      p.gradient = ctx.createLinearGradient(-p.size,-p.size,p.size,p.size);
      p.gradient.addColorStop(0,c0); p.gradient.addColorStop(.6,c1); p.gradient.addColorStop(1,c0);
    }
  } else if(window.styleColors && window.styleColors[p.palette]){
    const colors = window.styleColors[p.palette]; p.gradient = ctx.createLinearGradient(-p.size,-p.size,p.size,p.size); p.gradient.addColorStop(0,colors[0]); p.gradient.addColorStop(.6,colors[1]||colors[0]); p.gradient.addColorStop(1,colors[2]||colors[0]); p.paletteColor = colors[0]; p.fill = colors[1]||colors[0]; p.stroke = colors[2]||colors[0];
  } else {
    p.fill = '#fff'; p.paletteColor = '#fff';
  }
  return p;
}
