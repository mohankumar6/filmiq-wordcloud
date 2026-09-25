// layout-engine.js
// Provides collision detection, rotated box math, and candidate placement helpers
function rotateBox(w,h,ang){ang=Math.abs(ang);let sin=Math.sin(ang),cos=Math.cos(ang);let W=Math.abs(w*cos)+Math.abs(h*sin);let H=Math.abs(w*sin)+Math.abs(h*cos);return {w:W,h:H}}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]}
function rectsOverlap(r1,r2,gap){let dx = r2.x - r1.x, dy = r2.y - r1.y;let half1x = (r1.rawW||r1.w)/2, half1y = (r1.rawH||r1.h)/2;let half2x = (r2.rawW||r2.w)/2, half2y = (r2.rawH||r2.h)/2;let a1 = r1.a||0, a2 = r2.a||0;let ux1 = Math.cos(a1), uy1 = Math.sin(a1);let vx1 = -uy1, vy1 = ux1;let ux2 = Math.cos(a2), uy2 = Math.sin(a2);let vx2 = -uy2, vy2 = ux2;let axes = [[ux1,uy1],[vx1,vy1],[ux2,uy2],[vx2,vy2]];for(let i=0;i<axes.length;i++){let axis = axes[i];let centerDist = Math.abs(dot([dx,dy], axis));let proj1 = half1x*Math.abs(dot(axis,[ux1,uy1])) + half1y*Math.abs(dot(axis,[vx1,vy1]));let proj2 = half2x*Math.abs(dot(axis,[ux2,uy2])) + half2y*Math.abs(dot(axis,[vx2,vy2]));if(centerDist > proj1 + proj2 + gap) return false;}return true}
function collide(r){let gap=+$('gap').value;return state.placed.some(p=>rectsOverlap(r,p,gap))}

// helper: attempt to place one item in allowed positions, returns placed object or null
function tryPlaceItem(item, size, allowedPositions, attempts, r){
  const allFonts = Array.from(document.querySelectorAll('.font-option')).map(el=>el.dataset.value);
  const fonts = Array.from(document.querySelectorAll('.font-option:checked')).map(el=>el.dataset.value); if(fonts.length===0) fonts = allFonts; let fontFamily = fonts[Math.floor(r()*fonts.length)];
  const selectedOris = Array.from(document.querySelectorAll('.ori-option:checked')).map(el=>el.dataset.value); if(selectedOris.length===0) selectedOris=['horizontal'];
  for(let a=0;a<attempts;a++){
    let pos = allowedPositions.length ? allowedPositions[Math.floor(r()*allowedPositions.length)] : {x:canvas.width/2,y:canvas.height/2};
    let jitter = Math.max(0, Math.min(8, Math.floor(size/6)));
    let x = pos.x + (r()*2-1)*jitter; let y = pos.y + (r()*2-1)*jitter;
    let chosenOri = selectedOris[Math.floor(r()*selectedOris.length)]; let rot=0; if(chosenOri==='vertical') rot=Math.PI/2; else if(chosenOri==='tilt') rot=(r()*2-1)*(+$('rotation').value)*Math.PI/180; else if(chosenOri==='random') rot=(r()*2-1)*Math.PI/2; else if(chosenOri==='both') rot=(r()>0.5)?0:Math.PI/2;
    ctx.font = `${$('weight').value} ${size}px ${fontFamily}`; let m = ctx.measureText(item.word), ww = m.width + 10, hh = size * 1.15; let box = rotateBox(ww,hh,rot);
    if(inside(x,y,box.w,box.h) && !collide({x,y,rawW:ww,rawH:hh,a:rot})){ return {x,y,w:box.w,h:box.h,a:rot,rawW:ww,rawH:hh,size,word:item.word,font:fontFamily}; }
  }
  return null;
}
