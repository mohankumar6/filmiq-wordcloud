const $=id=>document.getElementById(id), canvas=$('canvas'), ctx=canvas.getContext('2d');
let state={shape:'rectangle',style:'gold',seed:0,items:[],placed:[]};
const controls=['repeat','minLen','shapeScale','padding','preset','bg','width','height','font','orientation','minSize','maxSize','weight','letter','rotation','density','gap','attempts','seed','opacity','shadow'];
const styleColors={
	gold:['#f2d08a','#c89a3d','#8f6828'],
	mono:['#f2f2ee','#b8bec7','#747b84'],
	fire:['#ffd27a','#ef8d3d','#b8432c'],
	cyan:['#d9ffff','#63d9df','#257e91'],
	ocean:['#1B365D','#4A90E2','#00B4D8','#6C757D'],
	vivid:['#00F5D4','#7B2CBF','#9D4EDD','#E0E1DD'],
	warm:['#D90429','#2B9348','#FFB703','#8D99AE'],
	earth:['#2C5E3B','#A3B18A','#E07A5F','#F4F1DE']
};
// expose for renderer
window.styleColors = styleColors;

// seeded RNG accessor: returns a function r() -> [0,1)
function rnd(){
	if(window._rndFn) return window._rndFn;
	const seedVal = +($('seed')?.value || state.seed || 0);
	const seed = seedVal === 0 ? Math.floor(Math.random()*2147483647) : seedVal;
	state.seed = seed;
	// use seededRng if provided by random.js, otherwise simple LCG
	if(typeof seededRng === 'function'){
		window._rndFn = seededRng(seed);
	} else {
		let t = seed >>> 0;
		window._rndFn = function(){ t=(t*1664525+1013904223)>>>0; return t/4294967296 };
	}
	return window._rndFn;
}

// parse input text into items [{word, weight}]
function parse(){
	const txt = ($('inputText')?.value || '').trim();
	if(!txt) return [];
	const doSplit = $('split') ? $('split').checked : true;
	let tokens = [];
	if(doSplit){
		tokens = txt.split(/\s+/).map(s=>s.trim()).filter(Boolean);
	} else {
		tokens = [txt];
	}
	const minLen = +($('minLen')?.value||1);
	const freq = Object.create(null);
	for(let t of tokens){
		// basic cleanup: trim punctuation
		let w = t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,'');
		if(!w) continue;
		if(w.length < minLen) continue;
		freq[w] = (freq[w]||0)+1;
	}
	const items = Object.keys(freq).map(w=>({word:w, weight: freq[w]}));
	// sort by weight desc
	items.sort((a,b)=>b.weight-a.weight);
	return items;
}

// debounce + cancellable render
let __renderTimer = null;
let __renderSeq = 0; // increments on each schedule
let __activeSeq = 0; // sequence currently running
const RENDER_DEBOUNCE_MS = 300;
// Spinner timing to avoid flicker
const SPINNER_SHOW_AFTER_MS = 120;
const SPINNER_MIN_VISIBLE_MS = 300;
let __spinnerShowTimer = null;
let __spinnerShownAt = 0;
let __firstRender = true;

function cancelSpinnerSchedule(){ if(__spinnerShowTimer){ clearTimeout(__spinnerShowTimer); __spinnerShowTimer = null; } }
function scheduleSpinner(immediate){ cancelSpinnerSchedule(); const busy=document.getElementById('busyOverlay'); if(immediate){ if(busy){ busy.setAttribute('aria-hidden','false'); busy.style.display='flex'; __spinnerShownAt = Date.now(); } return; }
	__spinnerShowTimer = setTimeout(()=>{ if(busy){ busy.setAttribute('aria-hidden','false'); busy.style.display='flex'; __spinnerShownAt = Date.now(); } __spinnerShowTimer = null; }, SPINNER_SHOW_AFTER_MS);
}
function hideSpinnerDelayed(){ const busy=document.getElementById('busyOverlay'); if(!busy) return; // if spinner hasn't shown yet, cancel schedule
	if(__spinnerShowTimer){ cancelSpinnerSchedule(); busy.setAttribute('aria-hidden','true'); busy.style.display='none'; __spinnerShownAt = 0; return; }
	if(!__spinnerShownAt){ busy.setAttribute('aria-hidden','true'); busy.style.display='none'; return; }
	const elapsed = Date.now() - __spinnerShownAt; if(elapsed >= SPINNER_MIN_VISIBLE_MS){ busy.setAttribute('aria-hidden','true'); busy.style.display='none'; __spinnerShownAt = 0; } else { setTimeout(()=>{ busy.setAttribute('aria-hidden','true'); busy.style.display='none'; __spinnerShownAt = 0; }, SPINNER_MIN_VISIBLE_MS - elapsed); }
}

function render(immediate = false){
	// schedule debounced render; increment sequence so previous runs become stale
	__renderSeq++;
	const mySeq = __renderSeq;
	if(__renderTimer) clearTimeout(__renderTimer);
	// decide whether to show spinner immediately: explicit immediate flag, first render, or heavy renders
	const itemsCount = (state.items && state.items.length) || 0;
	const attemptsVal = +($('attempts')?.value||0);
	const densityVal = +($('density')?.value||0);
	const heavy = itemsCount > 30 || attemptsVal > 2000 || densityVal > 85;
	scheduleSpinner(immediate || __firstRender || heavy);
	__renderTimer = setTimeout(()=>{ __activeSeq = mySeq; renderNow(mySeq); __firstRender = false; }, RENDER_DEBOUNCE_MS);
}

function renderNow(seq){
	try{
		state.items = parse(); state.placed = [];
		let r = rnd(), W = canvas.width, H = canvas.height, bg = $('bg').value; state.rng = r; ctx.clearRect(0,0,W,H);
		if(bg==='dark'){ctx.fillStyle='#090b0f';ctx.fillRect(0,0,W,H);let g=ctx.createRadialGradient(W*.5,H*.45,20,W*.5,H*.5,W*.7);g.addColorStop(0,'#252019');g.addColorStop(1,'#08090b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}else if(bg==='gradient'){let g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#171b2a');g.addColorStop(1,'#050608');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}

		// create allowed positions inside shape mask (seeded)
		state.allowedPositions = createShapeMask(W,H, +$('shapeScale').value, r, Math.max(5000, state.items.length * 40));

		let min=+$('minSize').value, max=+$('maxSize').value, attempts=+$('attempts').value; let limit=Math.floor(state.items.length*(+$('density').value/78));
		let allFonts = Array.from(document.querySelectorAll('.font-option')).map(el=>el.dataset.value);
		if(allFonts.length===0) allFonts = ["Inter, system-ui, sans-serif"];

		const allowRepeats = !($('dedupe') && $('dedupe').checked);

		// First pass: place each provided word once
		for(let idx=0; idx<state.items.length; idx++){
			if(seq !== __activeSeq) return; // cancelled
			const item = state.items[idx];
			let size = Math.round(min + r()*(max - min)); if(state.shape==='heart'){ size = Math.min(max, Math.round(size * 1.12)); }
			const placedObj = tryPlaceItem(item, size, state.allowedPositions, Math.max(200, Math.floor(attempts/8)), r);
			if(placedObj){ let palettes = Array.from(document.querySelectorAll('.color-option:checked')).map(el=>el.dataset.value); if(palettes.length===0) palettes = activePalettes; let palette = palettes[Math.floor(r()*palettes.length)]; placedObj.palette = palette; state.placed.push(placedObj); }
		}

		if(seq !== __activeSeq) return;
		// build candidates
		const repeatControl = Math.max(1, +$('repeat').value);
		let candidates = [];
		state.items.forEach(it=>{let reps = Math.max(1, Math.round(repeatControl * (it.weight||1))); for(let i=0;i<reps;i++) candidates.push(it)});
		candidates.sort((a,b)=> (b.weight||1)-(a.weight||1));

		// secondary pass
		for(let ci=0; ci<Math.max(1,limit) && ci < candidates.length; ci++){
			if(seq !== __activeSeq) return;
			const item = candidates[ci];
			let rank = Math.max(0, state.items.indexOf(item)); let rankFactor = 1 - (rank / Math.max(1, state.items.length)); let randBias = 1 - Math.pow(r(), 2);
			let size = Math.round(min + (max - min) * Math.min(1, 0.5 + 0.5 * rankFactor * randBias)); if(state.shape==='heart'){ size = Math.min(max, Math.round(size * 1.1)); }
			const placedObj = tryPlaceItem(item, size, state.allowedPositions, attempts, r);
			if(placedObj){ let palettes = Array.from(document.querySelectorAll('.color-option:checked')).map(el=>el.dataset.value); if(palettes.length===0) palettes = activePalettes; let palette = palettes[Math.floor(r()*palettes.length)]; placedObj.palette = palette; state.placed.push(placedObj); }
		}

		if(seq !== __activeSeq) return;
		// filler pass
		let totalWords = state.items.length;
		let indices = state.items.map((_,i)=>i);
		for(let i=indices.length-1;i>0;i--){let j=Math.floor(r()*(i+1));[indices[i],indices[j]]=[indices[j],indices[i]]}
		let smallCount = Math.ceil(totalWords * 0.75), midCount = Math.max(1, totalWords - smallCount);
		let smallPool = indices.slice(0, smallCount).map(i=>state.items[i]);
		let midPool = indices.slice(smallCount, smallCount+midCount).map(i=>state.items[i]);
		let fillersToTry = Math.max(2000, totalWords * 60);
		for(let f=0; f<fillersToTry; f++){
			if(seq !== __activeSeq) return;
			if(!allowRepeats) break;
			if(state.placed.length > Math.max(500, totalWords*10)) break;
			let poolChoice = r() < 0.75 ? smallPool : midPool; if(poolChoice.length===0) poolChoice = state.items;
			let item = poolChoice[Math.floor(r()*poolChoice.length)];
			let size = (poolChoice===smallPool) ? Math.max(5, Math.round(5 + r()*(Math.max(5, min)-5))) : (min + 10);
			const placedObj = tryPlaceItem(item, size, state.allowedPositions, Math.max(20, Math.floor(attempts/6)), r);
			if(placedObj){ let palettes = Array.from(document.querySelectorAll('.color-option:checked')).map(el=>el.dataset.value); if(palettes.length===0) palettes = activePalettes; let palette = palettes[Math.floor(r()*palettes.length)]; placedObj.palette = palette; state.placed.push(placedObj); }
		}

		if(seq !== __activeSeq) return;
		// ensure min and promote
		let placedMin = state.placed.some(p=>p.size===min);
		let placedMaxCount = state.placed.filter(p=>p.size===max).length;
		if(!placedMin){
			for(let tries=0; tries<500 && !placedMin; tries++){
				if(seq !== __activeSeq) return;
				let item = state.items[Math.floor(r()*state.items.length)];
				const placedObj = tryPlaceItem(item, min, state.allowedPositions, 60, r);
				if(placedObj){ let palettes = Array.from(document.querySelectorAll('.color-option:checked')).map(el=>el.dataset.value); if(palettes.length===0) palettes = activePalettes; placedObj.palette = palettes[Math.floor(r()*palettes.length)]; state.placed.push(placedObj); placedMin=true; break }
			}
		}

		if(seq !== __activeSeq) return;
		let promoteTries=0; let promoted=new Set();
		while(placedMaxCount<2 && promoteTries<2000){
			if(seq !== __activeSeq) return;
			promoteTries++;
			let item = state.items[Math.floor(r()*state.items.length)];
			if(promoted.has(item.word)) continue; promoted.add(item.word);
			let fonts = Array.from(document.querySelectorAll('.font-option:checked')).map(el=>el.dataset.value);
			if(fonts.length===0) fonts = allFonts; let fontFamily = fonts[Math.floor(r()*fonts.length)];
			let size = max + 25; let selectedOris = Array.from(document.querySelectorAll('.ori-option:checked')).map(el=>el.dataset.value); if(selectedOris.length===0) selectedOris=['horizontal']; let chosenOri = selectedOris[Math.floor(r()*selectedOris.length)]; let rot=0; if(chosenOri==='vertical') rot=Math.PI/2; else if(chosenOri==='tilt') rot=(r()*2-1)*(+$('rotation').value)*Math.PI/180; else if(chosenOri==='random') rot=(r()*2-1)*Math.PI/2;
			let pos = {x:W/2,y:H/2};
			if(state.allowedPositions && state.allowedPositions.length){ const cx=W/2, cy=H/2; const maskScale=(+$('shapeScale').value)/100; const maxR = Math.min(W,H) * maskScale * 0.45; const central = state.allowedPositions.filter(p=>Math.hypot(p.x-cx,p.y-cy) <= maxR); const pool = central.length ? central : state.allowedPositions; pos = pool[Math.floor(r()*pool.length)]; }
			let x = pos.x + (r()*2-1)*6, y = pos.y + (r()*2-1)*6;
			ctx.font = `${$('weight').value} ${size}px ${fontFamily}`; let m = ctx.measureText(item.word), ww = m.width + 20, hh = size * 1.25; let box = rotateBox(ww,hh,rot);
			if(inside(x,y,box.w,box.h) && !collide({x,y,rawW:ww,rawH:hh,a:rot})){ let palettes = Array.from(document.querySelectorAll('.color-option:checked')).map(el=>el.dataset.value); if(palettes.length===0) palettes = activePalettes; let palette = palettes[Math.floor(r()*palettes.length)]; state.placed.push({x,y,w:box.w,h:box.h,a:rot,rawW:ww,rawH:hh,size,word:item.word,font:fontFamily,palette}); placedMaxCount++; }
		}

		// final draw
		for(let pi=0; pi<state.placed.length; pi++){
			if(seq !== __activeSeq) return;
			const p = state.placed[pi]; drawWord({word:p.word}, p.size, p.x, p.y, p.a, p.font, p.palette || state.style);
		}
		$('seedLabel').textContent = state.seed;
	}finally{
		// hide spinner with minimum-visible enforcement
		hideSpinnerDelayed();
	}
}

// drawWord: accepts per-word palette and color
function drawWord(item,size,x,y,ang,fontFamily,palette){
	let appearance = document.getElementById('appearance')?.value || 'solid';
	const fontStyle = document.getElementById('fontStyleOpt')?.value;
	if(fontStyle) appearance = fontStyle;
	let p = {x,y,size,word:item.word,font:fontFamily,a:ang,weight:+$('weight').value,palette,appearance};
	if(typeof makePaletteFor === 'function') p = makePaletteFor(ctx, p);
	ctx.save(); ctx.globalAlpha = +$('opacity').value/100; if($('shadow') && $('shadow').checked){ ctx.shadowColor='rgba(0,0,0,.75)'; ctx.shadowBlur = Math.max(2,size*.08); ctx.shadowOffsetY = Math.max(1,size*.035) }
	if(typeof renderAppearance === 'function'){ renderAppearance(ctx, p); } else { ctx.translate(x,y); ctx.rotate(ang); ctx.font = `${$('weight').value} ${size}px ${fontFamily}`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle = p.fill || '#fff'; ctx.fillText(item.word,0,0); }
	ctx.restore();
}

function drawShapeOutline(W,H,scale){
	const cx=W/2, cy=H/2, sw=W*scale/100, sh=H*scale/100; ctx.save(); ctx.beginPath(); ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=2;
	const shape=state.shape;
	if(shape==='rectangle'){ctx.rect((W-sw)/2,(H-sh)/2,sw,sh);} else if(shape==='circle'){ctx.ellipse(cx,cy,sw/2,sh/2,0,0,Math.PI*2);} else if(shape==='diamond'){ctx.moveTo(cx,cy-sh/2);ctx.lineTo(cx+sw/2,cy);ctx.lineTo(cx,cy+sh/2);ctx.lineTo(cx-sw/2,cy);} else if(shape==='star'){const spikes=5; const outer= Math.min(sw,sh)/2; const inner=outer*0.45; let rot=Math.PI/2*3; let step=Math.PI/spikes; ctx.moveTo(cx,cy-outer); for(let i=0;i<spikes;i++){ctx.lineTo(cx+Math.cos(rot)*outer,cy+Math.sin(rot)*outer);rot+=step;ctx.lineTo(cx+Math.cos(rot)*inner,cy+Math.sin(rot)*inner);rot+=step}} else if(shape==='heart'){let size=Math.min(sw,sh)/2; ctx.moveTo(cx,cy+size/3); ctx.bezierCurveTo(cx+size*1.2,cy-size*0.6,cx+size*0.6,cy-size*1.4,cx,cy-size*0.2); ctx.bezierCurveTo(cx-size*0.6,cy-size*1.4,cx-size*1.2,cy-size*0.6,cx,cy+size/3);} else {ctx.rect((W-sw)/2,(H-sh)/2,sw,sh);} ctx.closePath(); ctx.stroke(); ctx.restore();}

function resize(){let p=$('preset').value;if(p!=='custom'){let [w,h]=p.split('x').map(Number);$('width').value=w;$('height').value=h}canvas.width=+$('width').value;canvas.height=+$('height').value;$('canvasInfo').textContent=`${canvas.width} × ${canvas.height}`;render(true)}
// attach inputs: most controls use input->debounced render; certain numeric fields use blur with timeout
controls.forEach(id=>{
	const el = $(id);
	if(!el) return;
	if(id==='preset' || id==='width' || id==='height'){
		el.addEventListener('input', resize);
		return;
	}
	if(id==='minSize' || id==='maxSize'){
		// trigger on blur or after 5s of inactivity
		let timer = null;
		el.addEventListener('input', ()=>{ if(timer) clearTimeout(timer); timer = setTimeout(()=>{ render(true); timer = null; }, 5000); });
		el.addEventListener('blur', ()=>{ if(timer) { clearTimeout(timer); timer = null; } render(true); });
		return;
	}
		el.addEventListener('input', ()=>{ render(true); });
});
// dropdown toggle behavior for multi-selects
document.querySelectorAll('.multi-select').forEach(ms=>{
	const toggle = ms.querySelector('.multi-toggle');
	const list = ms.querySelector('.multi-list');
	toggle.addEventListener('click',()=>{ms.classList.toggle('open');list.setAttribute('aria-hidden', ms.classList.contains('open') ? 'false' : 'true')});
});
// re-render when any font/orientation checkbox changes
// re-render on various control changes
document.querySelectorAll('.font-option, .ori-option').forEach(ch=>ch.addEventListener('change',()=>render(true)));
// palette and theme handlers
document.querySelectorAll('.color-option').forEach(ch=>ch.addEventListener('change',()=>render(true)));
['dedupe','repeat','minLen','minSize','maxSize','shapeScale','padding','weight','letter','rotation','density','gap','attempts','opacity','bg','preset','width','height'].forEach(id=>{const el=$(id); if(el) el.addEventListener('change',()=>render(true))})

// Wire font style appearance select
const fontStyleOpt = document.getElementById('fontStyleOpt');
if(fontStyleOpt){ fontStyleOpt.addEventListener('change', ()=>{ render(true); }); }
$('theme')?.addEventListener('change',()=>{ if($('theme').value==='light') document.body.classList.add('light'); else document.body.classList.remove('light'); });
// close dropdowns when clicking outside
document.addEventListener('click', (e)=>{
	document.querySelectorAll('.multi-select.open').forEach(ms=>{
		if(!ms.contains(e.target)) { ms.classList.remove('open'); ms.querySelector('.multi-list').setAttribute('aria-hidden','true') }
	})
});
$('preset')?.addEventListener('change',resize);
document.querySelectorAll('.shape').forEach(b=>b.onclick=()=>{document.querySelectorAll('.shape').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.shape=b.dataset.shape;render(true)});
document.querySelectorAll('.swatch').forEach(b=>b.onclick=()=>{document.querySelectorAll('.swatch').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.style=b.dataset.style;render(true)});
$('randomBtn')?.addEventListener('click', ()=>{state.seed=Math.floor(Math.random()*2147483647);$('seed').value=state.seed;render(true)});
$('resetBtn')?.addEventListener('click', ()=>location.reload());
$('exportBtn')?.addEventListener('click', ()=>{let a=document.createElement('a');a.download=`tamil-word-cloud-${state.seed}.png`;a.href=canvas.toDataURL('image/png');a.click()});

// Shape select control (replaces radio grid)
const shapeSelect = document.getElementById('shapeSelect');
if(shapeSelect){
	shapeSelect.addEventListener('change', ()=>{ const s = shapeSelect.value; state.shape = s; const customLabel = document.getElementById('customShapeLabel'); if(customLabel) customLabel.style.display = (s==='custom') ? 'block' : 'none'; render(true); });
	(function(){ const s = shapeSelect.value || 'rectangle'; state.shape = s; const customLabel = document.getElementById('customShapeLabel'); if(customLabel) customLabel.style.display = (s==='custom') ? 'block' : 'none'; })();
}
['shapeScale','padding','weight','letter','rotation','density','gap','attempts','opacity'].forEach(id=>$(id)?.addEventListener('input',()=>{$(id+'Out').textContent=$(id).value+(id==='shapeScale'||id==='density'||id==='opacity'?'%':id==='rotation'?'±'+$(id).value+'°':'');}));
// ensure busy overlay hidden initially
const __busy = document.getElementById('busyOverlay'); if(__busy) __busy.setAttribute('aria-hidden','true');
state.seed=Math.floor(Math.random()*2147483647);$('seed').value=state.seed;resize();
