/* =========================================================
   HOLA OLA · site script
   1. helpers            4. flavor explorer
   2. animatic fallback  5. reveals, counters, postcards
   3. scroll films       6. bioluminescent water, signup
   ========================================================= */
(() => {
  'use strict';
  document.documentElement.classList.add('js');

  /* ---------- 1. helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const bell = (v, a, b, c) => smooth(a, b, v) * (1 - smooth(b, c, v));

  // Motion is a site setting. On Mac and Windows everything animates at full by default, whatever the
  // operating system's "reduce motion" switch says; on other devices that switch decides.
  // A visitor's own choice (the hidden button at the top right of the nav) wins and is remembered.
  const MOTION_KEY = 'holaola.motion';
  const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  const isMacOrWindows = /Win/i.test(platform) || (/Mac/i.test(platform) && !(navigator.maxTouchPoints > 1));   // iPads report "Mac"
  let savedMotion = null;
  try { savedMotion = localStorage.getItem(MOTION_KEY); } catch (e) { /* private mode: no memory, still works */ }
  let RM = savedMotion ? savedMotion === 'reduce' : (isMacOrWindows ? false : matchMedia('(prefers-reduced-motion: reduce)').matches);
  document.documentElement.classList.toggle('reduce-motion', RM);
  const onMotionChange = [];
  function setMotion(reduce) {
    RM = reduce;
    document.documentElement.classList.toggle('reduce-motion', RM);
    try { localStorage.setItem(MOTION_KEY, RM ? 'reduce' : 'full'); } catch (e) { /* ignore */ }
    onMotionChange.forEach(fn => fn(RM));
  }

  const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgb = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const prep = stops => stops.map(s => [s[0], ...s.slice(1).map(hex)]);
  function ramp(stops, p) {
    let i = 0;
    while (i < stops.length - 2 && p > stops[i + 1][0]) i++;
    const a = stops[i], b = stops[i + 1], t = clamp((p - a[0]) / (b[0] - a[0]));
    return a.slice(1).map((c, k) => c.map((v, j) => lerp(v, b[k + 1][j], t)));
  }
  function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const probe = src => new Promise(res => { const im = new Image(); im.onload = () => res(src); im.onerror = () => res(null); im.src = src; });

  /* ---------- 2. animatic fallback: the shot drawn in code, used only when a film's frames are missing ---------- */
  const SKY = prep([[0, '#BBA6EC', '#FFC7A6'], [.13, '#8EC8F4', '#FFE3C2'], [.30, '#3DB2F0', '#BFF2EE'], [.46, '#2FA4EA', '#A9EEE6'], [.62, '#FF9360', '#FFD884'], [.76, '#B4508F', '#FF8466'], [.86, '#3A2A7A', '#B0508A'], [1, '#070B26', '#1A2466']]);
  const SEA = prep([[0, '#8FB7D9', '#C3DAE4'], [.13, '#5CC3D6', '#A9E6E4'], [.30, '#19C2B8', '#8DE8DE'], [.46, '#12B5C4', '#8DE8DE'], [.62, '#E8925A', '#FFCB7C'], [.76, '#8A4C8A', '#DA727C'], [.86, '#2A2A6E', '#5B3F8A'], [1, '#0A1238', '#14235C']]);
  const SAND = prep([[0, '#E6CDB8', '#CFB09E'], [.30, '#F8E6BC', '#EBCF9A'], [.46, '#FBE8BF', '#EFD49C'], [.62, '#F2B76C', '#D98F52'], [.80, '#7A587C', '#523E66'], [1, '#171C42', '#0B0F2E']]);
  const rnd = mulberry(7);
  const STARS = Array.from({ length: 120 }, () => ({ x: rnd(), y: rnd() * .5, s: rnd() * 1.5 + .5, f: rnd() * 6.28 }));
  const SPARKS = Array.from({ length: 34 }, () => ({ x: rnd(), o: rnd() * .05, f: rnd() * 6.28, s: rnd() * 2 + 1.2 }));
  const FRUIT = [
    { a: -2.55, d: 1.05, c: '#FFD447', k: 'tri' }, { a: -2.05, d: 1.4, c: '#FF9A2E', k: 'sq' }, { a: -1.3, d: 1.25, c: '#6B2D73', k: 'dot' },
    { a: -.62, d: 1.12, c: '#FFF8EC', k: 'arc' }, { a: -.2, d: 1.45, c: '#4B2E23', k: 'bean' }, { a: -2.95, d: 1.5, c: '#FF9A2E', k: 'sq' },
    { a: -1.62, d: 1.62, c: '#FFD447', k: 'tri' }, { a: -.92, d: 1.58, c: '#4B2E23', k: 'bean' }, { a: -3.35, d: 1.18, c: '#6B2D73', k: 'dot' },
    { a: .16, d: 1.2, c: '#FFD447', k: 'tri' }, { a: -2.3, d: 1.75, c: '#4B2E23', k: 'bean' }, { a: -.4, d: 1.8, c: '#FF9A2E', k: 'sq' }
  ];

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function drawCan(ctx, cx, base, w, h, p, night) {
    const x = cx - w / 2, y = base - h;
    ctx.fillStyle = 'rgba(10,30,50,.24)';
    ctx.beginPath(); ctx.ellipse(cx, base, w * .72, h * .03, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#C9D0D6'; rr(ctx, x + w * .1, y - h * .028, w * .8, h * .06, w * .05); ctx.fill();
    ctx.fillStyle = '#AEB6BD'; rr(ctx, x + w * .08, base - h * .03, w * .84, h * .045, w * .05); ctx.fill();

    ctx.save(); rr(ctx, x, y, w, h, w * .12); ctx.clip();
    ctx.fillStyle = '#FF9A2E'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#FFF3DC'; ctx.beginPath(); ctx.arc(x + w * .7, y + h * .665, w * .105, 0, 7); ctx.fill();
    const wave = (yy, c) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, yy);
      for (let i = 0; i <= 24; i++) ctx.lineTo(x + w * i / 24, yy + Math.sin(i / 24 * Math.PI * 2.5) * h * .018);
      ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
    };
    wave(y + h * .705, '#FF6B4A'); wave(y + h * .785, '#FF4F81'); wave(y + h * .865, '#FFF3DC');
    ctx.fillStyle = '#FFF3DC'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = `${h * .135}px Shrikhand, Georgia, serif`;
    ctx.fillText('Hola', cx, y + h * .3); ctx.fillText('Ola', cx, y + h * .435);
    ctx.font = `800 ${h * .03}px "Bricolage Grotesque", sans-serif`;
    ctx.fillText('G O L D E N   S E T', cx, y + h * .51);

    const sh = ctx.createLinearGradient(x, 0, x + w, 0);
    sh.addColorStop(0, 'rgba(0,0,0,.32)'); sh.addColorStop(.2, 'rgba(0,0,0,.03)'); sh.addColorStop(.34, 'rgba(255,255,255,.3)');
    sh.addColorStop(.5, 'rgba(255,255,255,0)'); sh.addColorStop(.84, 'rgba(0,0,0,.06)'); sh.addColorStop(1, 'rgba(0,0,0,.38)');
    ctx.fillStyle = sh; ctx.fillRect(x, y, w, h);

    const gold = bell(p, .52, .67, .84);
    if (gold > 0) { ctx.fillStyle = `rgba(255,130,30,${.24 * gold})`; ctx.fillRect(x, y, w, h); }
    if (night > 0) {
      ctx.fillStyle = `rgba(8,12,50,${.5 * night})`; ctx.fillRect(x, y, w, h);
      let g = ctx.createLinearGradient(x, 0, x + w * .32, 0);
      g.addColorStop(0, `rgba(255,150,70,${.6 * night})`); g.addColorStop(1, 'rgba(255,150,70,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, w * .32, h);
      g = ctx.createLinearGradient(x + w, 0, x + w * .7, 0);
      g.addColorStop(0, `rgba(61,224,255,${.65 * night})`); g.addColorStop(1, 'rgba(61,224,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x + w * .7, y, w * .3, h);
    }
    ctx.restore();
  }

  function drawFruit(ctx, f, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = f.c;
    if (f.k === 'tri') { ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * .9, s * .7); ctx.lineTo(-s * .9, s * .7); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#C98A1E'; ctx.fillRect(-s * .9, s * .55, s * 1.8, s * .2); }
    else if (f.k === 'sq') { rr(ctx, -s * .6, -s * .6, s * 1.2, s * 1.2, s * .22); ctx.fill(); }
    else if (f.k === 'dot') { ctx.beginPath(); ctx.arc(0, 0, s * .75, 0, 7); ctx.fill(); ctx.fillStyle = '#FFC93C'; ctx.beginPath(); ctx.arc(0, 0, s * .45, 0, 7); ctx.fill(); }
    else if (f.k === 'arc') { ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#6B4A35'; ctx.lineWidth = s * .16; ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI); ctx.stroke(); }
    else { ctx.beginPath(); ctx.ellipse(0, 0, s * .55, s * .36, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#2B1810'; ctx.lineWidth = s * .08; ctx.beginPath(); ctx.moveTo(-s * .4, 0); ctx.lineTo(s * .4, 0); ctx.stroke(); }
    ctx.restore();
  }

  // g = { ctx, W, H, DPR }, p = time of day 0..1, withBurst = draw the midday splash
  function drawAnimatic(g, p, t, withBurst) {
    const { ctx, W, H, DPR } = g;
    const hz = H * .56, sandTop = H * .68;
    const night = smooth(.80, .94, p);
    const [sTop, sBot] = ramp(SKY, p);

    let gr = ctx.createLinearGradient(0, 0, 0, hz);
    gr.addColorStop(0, rgb(sTop)); gr.addColorStop(1, rgb(sBot));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, hz + 2);

    if (night > 0) {
      ctx.fillStyle = '#fff';
      for (const s of STARS) { ctx.globalAlpha = night * (.4 + .6 * Math.sin(t * 1.2 + s.f) ** 2); ctx.fillRect(s.x * W, s.y * H, s.s * DPR, s.s * DPR); }
      ctx.globalAlpha = night; ctx.fillStyle = '#FFF3DC';
      ctx.beginPath(); ctx.arc(W * .8, H * .17, H * .028, 0, 7); ctx.fill();
      ctx.fillStyle = rgb(sTop); ctx.beginPath(); ctx.arc(W * .8 + H * .013, H * .162, H * .025, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }

    const d = clamp(p / .84), low = Math.abs(Math.cos(d * Math.PI));
    const sunX = W * .5, sunY = hz + H * .03 - Math.sin(d * Math.PI) * H * .66, sunR = H * (.05 + .035 * low);
    if (p < .9) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hz + 1); ctx.clip();
      gr = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 6);
      gr.addColorStop(0, `rgba(255,${210 + 30 * (1 - low) | 0},${130 + 100 * (1 - low) | 0},.8)`); gr.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, hz + 2);
      ctx.fillStyle = low > .5 ? '#FFE9B0' : '#FFFBEA';
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, 7); ctx.fill();
      ctx.restore();
    }

    const [seaFar, seaNear] = ramp(SEA, p);
    gr = ctx.createLinearGradient(0, hz, 0, sandTop + H * .04);
    gr.addColorStop(0, rgb(seaFar)); gr.addColorStop(1, rgb(seaNear));
    ctx.fillStyle = gr; ctx.fillRect(0, hz, W, sandTop - hz + H * .06);
    if (p < .86) {
      for (let k = 0; k < 9; k++) {
        const y = hz + (k + .5) / 9 * (sandTop - hz), w = sunR * (1.1 + k * .42) * (.75 + .25 * Math.sin(t * 2 + k * 1.7));
        ctx.fillStyle = `rgba(255,246,214,${(.18 + .3 * low) * (1 - night)})`;
        ctx.fillRect(sunX - w / 2, y, w, Math.max(1, H * .0035));
      }
    }

    const [sandA, sandB] = ramp(SAND, p);
    const tide = Math.sin(t * .7) * H * .012, pts = [];
    for (let i = 0; i <= 48; i++) { const x = W * i / 48; pts.push([x, sandTop + tide + Math.sin(i / 48 * 9 + t * .9) * H * .006 + Math.sin(i / 48 * 23 - t * .6) * H * .003]); }
    gr = ctx.createLinearGradient(0, sandTop, 0, H);
    gr.addColorStop(0, rgb(sandA)); gr.addColorStop(1, rgb(sandB));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, H);
    for (const q of pts) ctx.lineTo(q[0], q[1]);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    gr = ctx.createLinearGradient(0, sandTop, 0, sandTop + H * .13);
    gr.addColorStop(0, rgba(sBot, .5)); gr.addColorStop(1, rgba(sBot, 0));
    ctx.fillStyle = gr; ctx.fillRect(0, sandTop + H * .012, W, H * .13);
    ctx.lineWidth = H * .009; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = night > .3 ? `rgba(120,236,255,${.6 + .4 * night})` : 'rgba(255,255,255,.92)';
    if (night > .3) { ctx.shadowColor = '#3DE0FF'; ctx.shadowBlur = H * .035 * night; }
    ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
    ctx.shadowBlur = 0;
    if (night > .2) {
      ctx.fillStyle = '#9FF1FF';
      for (const s of SPARKS) { ctx.globalAlpha = night * Math.max(0, Math.sin(t * 2.4 + s.f)); ctx.beginPath(); ctx.arc(s.x * W, sandTop + tide - s.o * H, s.s * DPR, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      gr = ctx.createRadialGradient(0, H * .82, 0, 0, H * .82, W * .42);
      gr.addColorStop(0, `rgba(255,140,60,${.3 * night * (.85 + .15 * Math.sin(t * 9))})`); gr.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W * .5, H);
    }

    const e = p * p * (3 - 2 * p);
    const ch = H * lerp(.2, .64, e), cw = ch * .47, cx = W / 2, base = H * lerp(.7, .93, e);
    const burst = withBurst ? bell(p, .28, .42, .6) : 0;
    if (burst > .01) {
      const be = 1 - (1 - burst) ** 3, mid = base - ch * .5;
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      for (let i = 0; i < 18; i++) {
        const a = -Math.PI * (i + .5) / 18, r = cw * (.75 + (i % 3) * .28) * be;
        ctx.globalAlpha = burst; ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * r * 1.5, base + Math.sin(a) * r * 1.2, ch * .012, ch * (.018 + (i % 4) * .006), a + Math.PI / 2, 0, 7); ctx.fill();
      }
      for (let i = 0; i < FRUIT.length; i++) {
        const f = FRUIT[i], R = ch * .62 * f.d * be;
        ctx.globalAlpha = Math.min(1, burst * 1.6);
        drawFruit(ctx, f, cx + Math.cos(f.a) * R * 1.25, mid + Math.sin(f.a) * R * .8 + Math.sin(t * 1.1 + i) * ch * .012, ch * .07, p * 14 + i * 1.3);
      }
      ctx.globalAlpha = 1;
    }
    drawCan(ctx, cx, base, cw, ch, p, night);
  }

  /* ---------- 3. scroll films: each pinned section scrubs its own frame sequence ---------- */
  const films = [];
  let manifest = null;
  const getManifest = () => manifest || (manifest = fetch('assets/frames/frames.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).catch(() => ({})));

  function makeFilm(section, opts = {}) {
    const key = section.dataset.film;
    const sticky = $('.film__sticky', section), canvas = $('canvas', section);
    const ctx = canvas.getContext('2d');   // transparent until the first frame is drawn, so the CSS poster shows through
    const chapters = $$('.chapter', sticky).map(el => ({ el, a: +el.dataset.in, b: +el.dataset.out }));
    const g = { ctx, W: 0, H: 0, DPR: 1 };
    const seq = { on: false, count: 0, imgs: [], ok: null, dir: '', ext: 'webp', pad: 4, dirty: false, started: false };
    const st = { cur: 0, lastUI: -1, lastDrawn: -1, visible: false, near: false };

    function resize() {
      const r = sticky.getBoundingClientRect();
      g.DPR = Math.min(window.devicePixelRatio || 1, seq.on ? 1.5 : 2);
      const w = Math.round(r.width * g.DPR), h = Math.round(r.height * g.DPR);
      if (w === g.W && h === g.H) return;
      g.W = canvas.width = w; g.H = canvas.height = h; st.lastDrawn = -1;
    }
    function progress() {
      const r = section.getBoundingClientRect(), span = r.height - window.innerHeight;
      return span > 0 ? clamp(-r.top / span) : 0;   // span is 0 while the tab is hidden or not laid out yet
    }

    const loadFrame = i => new Promise((res, rej) => {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { seq.imgs[i] = im; seq.ok[i] = 1; seq.dirty = true; res(im); };
      im.onerror = rej;
      im.src = `${seq.dir}/f_${String(i + 1).padStart(seq.pad, '0')}.${seq.ext}`;
    });
    // load the rest coarse-to-fine so scrubbing works almost immediately
    function loadRest() {
      if (seq.started || !seq.on) return;
      seq.started = true;
      const order = [], seen = new Set([0]);
      for (const step of [16, 8, 4, 2, 1]) for (let i = 0; i < seq.count; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
      let k = 0;
      const next = () => { if (k < order.length) loadFrame(order[k++]).catch(() => {}).then(next); };
      for (let c = 0; c < 6; c++) next();
    }
    function drawSeq(p) {
      const want = Math.round(p * (seq.count - 1));
      let i = -1;
      for (let d = 0; d < seq.count; d++) {
        if (seq.ok[want - d]) { i = want - d; break; }
        if (seq.ok[want + d]) { i = want + d; break; }
      }
      if (i < 0) return;
      const im = seq.imgs[i], s = Math.max(g.W / im.naturalWidth, g.H / im.naturalHeight);
      const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
      ctx.drawImage(im, (g.W - dw) / 2, (g.H - dh) / 2, dw, dh);
      st.lastDrawn = p; seq.dirty = false;
    }
    function ui(p) {
      sticky.style.setProperty('--p', p.toFixed(4));
      for (const c of chapters) c.el.classList.toggle('is-on', p > c.a && p <= c.b);
      if (opts.onUI) opts.onUI(p, section);
      st.lastUI = p;
    }
    function update(now) {
      if (section.hidden) return;
      if (!g.W || !g.H) resize();
      const target = progress();
      st.cur = RM ? target : st.cur + (target - st.cur) * .14;
      if (!Number.isFinite(st.cur) || Math.abs(target - st.cur) < .0004) st.cur = target;
      if (!st.visible || !g.W || !g.H) return;
      if (seq.on) { if (st.cur !== st.lastDrawn || seq.dirty) drawSeq(st.cur); }
      else if (opts.fallback) opts.fallback(g, st.cur, RM ? 0 : now / 1000);
      if (st.cur !== st.lastUI) ui(st.cur);
    }
    async function init() {
      const entry = (await getManifest())[key];
      const portrait = matchMedia('(max-width: 860px) and (orientation: portrait)').matches;
      const set = entry && ((portrait && entry.mobile) || entry.desktop);
      const none = () => { if (opts.fallback) { const n = $('.film__note', section); if (n) n.hidden = false; } else section.hidden = true; };
      if (!set || !set.count) return none();
      Object.assign(seq, { count: set.count, dir: set.dir, ext: set.ext || 'webp', pad: set.pad || 4, imgs: new Array(set.count), ok: new Uint8Array(set.count) });
      try { await loadFrame(0); } catch (e) { return none(); }
      seq.on = true; g.W = g.H = 0; resize();
      if (st.near) loadRest();
    }

    new IntersectionObserver(([en]) => { st.visible = en.isIntersecting; }, { threshold: 0 }).observe(section);
    new IntersectionObserver(([en]) => { if (en.isIntersecting) { st.near = true; loadRest(); } }, { rootMargin: '150% 0px' }).observe(section);
    window.addEventListener('resize', resize);
    resize(); ui(0); init();

    const film = { section, update, get cur() { return st.cur; } };
    films.push(film);
    return film;
  }

  // the day film: scroll position is the time of day on the beach
  const nav = $('#nav'), clockTime = $('#clockTime'), clockPhase = $('#clockPhase'), clockDot = $('#clockDot');
  const dayline = $$('#dayline li'), findSec = $('#find');
  const TIME = [[0, 5.5], [.15, 6.8], [.33, 9.5], [.45, 12.5], [.60, 17.3], [.70, 18.3], [1, 21]];
  function beachTime(p) {
    let i = 0;
    while (i < TIME.length - 2 && p > TIME[i + 1][0]) i++;
    const h = lerp(TIME[i][1], TIME[i + 1][1], clamp((p - TIME[i][0]) / (TIME[i + 1][0] - TIME[i][0])));
    const mins = Math.round(h * 60 / 5) * 5, hh = Math.floor(mins / 60), mm = mins % 60;
    return `${(hh + 11) % 12 + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
  }
  const phase = p => p < .12 ? 'Dawn' : p < .33 ? 'Morning' : p < .50 ? 'Midday' : p < .68 ? 'Golden hour' : p < .76 ? 'Dusk' : 'Night';

  const dayFilm = makeFilm($('#film'), {
    fallback: (g, p, t) => drawAnimatic(g, p, t, false),
    onUI: (p, sec) => {
      const lit = Math.ceil(clamp((p - .5) / .14) * dayline.length);
      dayline.forEach((li, i) => li.classList.toggle('is-lit', i < lit));
      sec.classList.toggle('is-late', p > .72);
      sec.classList.toggle('is-night', p > .76);
    }
  });
  makeFilm($('#burst'), { fallback: (g, p, t) => drawAnimatic(g, lerp(.31, .44, p), t, true) });
  makeFilm($('#crack'));   // no fallback: the section stays hidden until its frames exist

  let lastClock = '';
  function updateNav() {
    const pastFilm = dayFilm.section.getBoundingClientRect().bottom < 70;
    const overNight = findSec.getBoundingClientRect().top < 60;
    nav.classList.toggle('is-solid', pastFilm);
    nav.classList.toggle('on-dark', pastFilm ? overNight : dayFilm.cur > .72);
    let t, ph, moon;
    if (pastFilm) {
      const d = new Date();
      t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      ph = 'your time'; moon = d.getHours() >= 19 || d.getHours() < 5;
    } else { t = beachTime(dayFilm.cur); ph = phase(dayFilm.cur); moon = dayFilm.cur > .76; }
    if (t + ph !== lastClock) {
      clockTime.textContent = t; clockPhase.textContent = ph; lastClock = t + ph;
      clockDot.classList.toggle('is-moon', moon);
    }
  }

  function tick(now) {
    requestAnimationFrame(tick);
    for (const f of films) f.update(now);
    updateNav();
    updateCoast();
  }

  /* ---------- 4. flavor explorer ---------- */
  const FLAVORS = [
    { id: 'dawn-patrol', name: 'Dawn Patrol', sub: 'Cold brew + cacao', clock: '6:00 AM', from: 5, to: 9,
      base: '#4B2E23', text: '#FFF3DC', accent: '#FF6B4A', ink: '#FFF3DC', w1: '#FF6B4A', w2: '#FFB59A', sun: '#FFB627',
      desc: 'Sparkling Tarrazú cold brew with a little cacao. For the paddle out before anyone else is awake.',
      notes: ['Roasty', 'Dark chocolate', 'Bright finish'], facts: [['Calories', '40'], ['Sugar', '5 g'], ['Caffeine', '60 mg']] },
    { id: 'low-tide-lime', name: 'Low Tide Lime', sub: 'Mandarin lime + sea salt', clock: '9:00 AM', from: 9, to: 12,
      base: '#B8E356', text: '#0A3A44', accent: '#19C2B8', ink: '#0A3A44', w1: '#19C2B8', w2: '#0A3A44', sun: '#FFF3DC',
      desc: 'Limón mandarina, the sour orange lime that grows in every backyard on the coast, with a pinch of Pacific salt.',
      notes: ['Tart', 'Salty rim', 'Very cold'], facts: [['Calories', '30'], ['Sugar', '4 g'], ['Caffeine', 'None']] },
    { id: 'pina-colada', name: 'Piña Colada', sub: 'Pineapple + coconut', clock: '12:00 PM', from: 12, to: 15,
      base: '#FFD447', text: '#0A3A44', accent: '#FFF3DC', ink: '#0A3A44', w1: '#19C2B8', w2: '#FFFFFF', sun: '#FF6B4A',
      desc: 'Golden pineapple and coconut water, no rum and no syrup. Noon in a can, with the umbrella implied.',
      notes: ['Creamy', 'Sun-ripe', 'No booze'], facts: [['Calories', '45'], ['Sugar', '6 g'], ['Caffeine', 'None']] },
    { id: 'golden-set', name: 'Golden Set', sub: 'Mango + passion fruit', clock: '4:00 PM', from: 15, to: 17.5,
      base: '#FF9A2E', text: '#FFF3DC', accent: '#FF6B4A', ink: '#FFF3DC', w1: '#FF6B4A', w2: '#FF4F81', sun: '#FFF3DC',
      desc: 'Mango and maracuyá for the last good set of the afternoon, when the light goes orange and nobody wants to leave.',
      notes: ['Juicy', 'Tangy', 'The flagship'], facts: [['Calories', '35'], ['Sugar', '5 g'], ['Caffeine', 'None']] },
    { id: 'sunset-sandia', name: 'Sunset Sandía', sub: 'Watermelon + hibiscus', clock: '6:00 PM', from: 17.5, to: 20,
      base: '#FF4F81', text: '#FFF3DC', accent: '#FFB627', ink: '#FFF3DC', w1: '#C2185B', w2: '#FFB627', sun: '#FFF3DC',
      desc: 'Watermelon with a tart hibiscus edge. It is exactly the color the sky turns right before it gives up.',
      notes: ['Fresh', 'Floral', 'Pink as the sky'], facts: [['Calories', '30'], ['Sugar', '5 g'], ['Caffeine', 'None']] },
    { id: 'midnight-mora', name: 'Midnight Mora', sub: 'Blackberry + ginger', clock: '9:00 PM', from: 20, to: 5,
      base: '#232A6B', text: '#FFF3DC', accent: '#3DE0FF', ink: '#FFF3DC', w1: '#3DE0FF', w2: '#7C5CFF', sun: '#FFF3DC',
      desc: 'Wild blackberry with a slow ginger burn. For bonfires, bare shoulders and water that glows when you kick it.',
      notes: ['Dark berry', 'Warm ginger', 'Glows a little'], facts: [['Calories', '35'], ['Sugar', '5 g'], ['Caffeine', 'None']] }
  ];

  // drawn stand-in, used only if a can render is missing
  function canSVG(f) {
    const u = f.id;
    return `<svg viewBox="0 0 200 410" role="img" aria-label="Hola Ola ${f.name} can">
      <defs>
        <linearGradient id="sh-${u}" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#000" stop-opacity=".32"/><stop offset=".2" stop-color="#000" stop-opacity=".03"/>
          <stop offset=".34" stop-color="#fff" stop-opacity=".32"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/>
          <stop offset=".84" stop-color="#000" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".38"/>
        </linearGradient>
        <linearGradient id="al-${u}" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#8E979E"/><stop offset=".3" stop-color="#F2F5F7"/><stop offset=".6" stop-color="#C3CBD1"/><stop offset="1" stop-color="#7C858C"/>
        </linearGradient>
        <clipPath id="cp-${u}"><path d="M22 54Q22 40 36 36H164Q178 40 178 54V372Q178 386 164 390H36Q22 386 22 372Z"/></clipPath>
      </defs>
      <path d="M38 38L48 15Q50 9 58 9H142Q150 9 152 15L162 38Z" fill="url(#al-${u})"/>
      <rect x="46" y="4" width="108" height="9" rx="4.5" fill="#DDE2E6"/>
      <path d="M36 388H164L157 402Q155 407 149 407H51Q45 407 43 402Z" fill="url(#al-${u})"/>
      <g clip-path="url(#cp-${u})">
        <rect x="22" y="36" width="156" height="356" fill="${f.base}"/>
        <circle cx="138" cy="268" r="17" fill="${f.sun}"/>
        <path d="M22 286C48 264 74 308 100 286S152 264 178 286V400H22Z" fill="${f.w1}"/>
        <path d="M22 316C48 294 74 338 100 316S152 294 178 316V400H22Z" fill="${f.w2}"/>
        <path d="M22 346C48 324 74 368 100 346S152 324 178 346V400H22Z" fill="#FFF3DC"/>
        <text x="100" y="124" text-anchor="middle" font-family="Shrikhand, Georgia, serif" font-size="52" fill="${f.ink}">Hola</text>
        <text x="100" y="174" text-anchor="middle" font-family="Shrikhand, Georgia, serif" font-size="52" fill="${f.ink}">Ola</text>
        <text x="100" y="204" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="11" letter-spacing="2.6" fill="${f.ink}">${f.name.toUpperCase()}</text>
        <text x="100" y="220" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="700" font-size="7" letter-spacing="1.6" fill="${f.ink}" opacity=".85">${f.sub.toUpperCase()}</text>
        <text x="100" y="381" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="5.6" letter-spacing="1.8" fill="#0A3A44">SPARKLING BEACH SODA</text>
        <rect x="22" y="36" width="156" height="356" fill="url(#sh-${u})"/>
      </g>
    </svg>`;
  }

  const fl = { root: $('#flavors'), stage: $('#stage'), can: $('#fCan'), fruit: $('#fFruit'), info: $('.stage__info'),
    time: $('#fTime'), name: $('#fName'), sub: $('#fSub'), desc: $('#fDesc'), notes: $('#fNotes'), facts: $('#fFacts'), dial: $('#dial'), now: $('#flavorNow') };
  const canArt = {}, fruitArt = {}, loopArt = {};
  const loopEl = $('#fLoop');
  let fIndex = -1, dialBtns = [];

  // the flavor's looping video inside the sun disc (falls back to the still fruit cutout)
  function showLoop(f) {
    const src = !RM && loopArt[f.id];
    loopEl.classList.remove('is-on');
    if (!src) { loopEl.removeAttribute('src'); loopEl.load(); return false; }
    loopEl.src = src;
    loopEl.onplaying = () => loopEl.classList.add('is-on');
    const p = loopEl.play(); if (p) p.catch(() => {});
    return true;
  }

  function applyFlavor(f) {
    fl.time.textContent = `Best at ${f.clock}`;
    fl.name.textContent = f.name;
    fl.sub.textContent = f.sub;
    fl.desc.textContent = f.desc;
    fl.notes.innerHTML = f.notes.map(n => `<li>${n}</li>`).join('');
    fl.facts.innerHTML = f.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    fl.can.innerHTML = canArt[f.id] ? `<img src="${canArt[f.id]}" alt="Hola Ola ${f.name} can">` : canSVG(f);
    const looping = showLoop(f);
    if (fruitArt[f.id] && !looping) { fl.fruit.src = fruitArt[f.id]; fl.fruit.hidden = false; } else fl.fruit.hidden = true;
  }

  function setFlavor(i, instant) {
    i = (i + FLAVORS.length) % FLAVORS.length;
    if (i === fIndex) return;
    const dir = i > fIndex ? 1 : -1, f = FLAVORS[i];
    fIndex = i;
    fl.root.style.setProperty('--f-bg', f.base);
    fl.root.style.setProperty('--f-ink', f.text);
    fl.root.style.setProperty('--f-accent', f.accent);
    dialBtns.forEach((b, k) => { b.setAttribute('aria-selected', k === i); b.tabIndex = k === i ? 0 : -1; });
    if (instant || RM || !fl.can.animate) return applyFlavor(f);
    fl.stage.classList.add('is-swapping');
    const out = fl.can.animate([{ transform: 'none', opacity: 1 }, { transform: `translateY(-40px) rotate(${dir * -12}deg)`, opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' });
    out.onfinish = () => {
      applyFlavor(f); out.cancel();
      const ease = 'cubic-bezier(.2,.8,.2,1)';
      fl.can.animate([{ transform: `translateY(46px) rotate(${dir * 12}deg)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: ease });
      fl.fruit.animate([{ transform: 'translateY(30px) scale(.86)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, delay: 80, easing: ease, fill: 'backwards' });
      fl.info.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: ease });
      fl.facts.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 60, easing: ease, fill: 'backwards' });
      fl.stage.classList.remove('is-swapping');
    };
  }

  function initFlavors() {
    fl.dial.innerHTML = FLAVORS.map((f, i) =>
      `<button role="tab" aria-selected="false" tabindex="-1" style="--c:${f.base};--lift:${Math.round(Math.sin(Math.PI * (i + .5) / FLAVORS.length) * 44)}" aria-label="${f.name}, ${f.clock}"><i></i><small>${f.clock.replace(':00', '')}</small><span>${f.name}</span></button>`).join('');
    dialBtns = $$('button', fl.dial);
    dialBtns.forEach((b, i) => b.addEventListener('click', () => setFlavor(i)));
    fl.dial.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault(); setFlavor(fIndex + (e.key === 'ArrowRight' ? 1 : -1)); dialBtns[fIndex].focus();
    });
    $('#fPrev').addEventListener('click', () => setFlavor(fIndex - 1));
    $('#fNext').addEventListener('click', () => setFlavor(fIndex + 1));
    let sx = null;
    fl.stage.addEventListener('pointerdown', e => { sx = e.clientX; });
    fl.stage.addEventListener('pointerup', e => { if (sx !== null && Math.abs(e.clientX - sx) > 50) setFlavor(fIndex + (e.clientX < sx ? 1 : -1)); sx = null; });

    // open on the flavor that matches the visitor's own clock
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    const i = Math.max(0, FLAVORS.findIndex(f => f.from < f.to ? h >= f.from && h < f.to : h >= f.from || h < f.to));
    setFlavor(i, true);
    fl.now.textContent = `It is ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} where you are. That makes it ${FLAVORS[i].name} o'clock.`;

    FLAVORS.forEach(f => {
      probe(`assets/cans/${f.id}.webp`).then(src => { if (src) { canArt[f.id] = src; if (FLAVORS[fIndex] === f) applyFlavor(f); } });
      probe(`assets/elements/${f.id}.webp`).then(src => { if (src) { fruitArt[f.id] = src; if (FLAVORS[fIndex] === f) applyFlavor(f); } });
      const loop = `assets/loops/${f.id}.mp4`;
      fetch(loop, { method: 'HEAD' }).then(r => { if (r.ok) { loopArt[f.id] = loop; if (FLAVORS[fIndex] === f) applyFlavor(f); } }).catch(() => {});
    });
  }

  /* ---------- 5. reveals, counters, postcards ---------- */
  function initReveals() {
    const io = new IntersectionObserver(entries => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }, { threshold: .18, rootMargin: '0px 0px -6% 0px' });
    $$('[data-reveal]').forEach(el => io.observe(el));
    $$('.rules__list li').forEach((li, i) => { li.style.transitionDelay = `0s, 0s, ${i * 70}ms, ${i * 70}ms`; });

    const cio = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        cio.unobserve(en.target);
        const el = en.target, end = +el.dataset.count, t0 = performance.now();
        if (RM) { el.textContent = end; continue; }
        const step = now => { const k = clamp((now - t0) / 1100); el.textContent = Math.round(end * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      }
    }, { threshold: .6 });
    $$('[data-count]').forEach(el => cio.observe(el));

    $$('img[data-opt]').forEach(img => {
      if (img.complete && !img.naturalWidth) img.remove(); else img.addEventListener('error', () => img.remove());
    });
    $$('[data-img]').forEach(el => probe(el.dataset.img).then(src => { if (src) el.style.backgroundImage = `url("${src}")`; }));
  }

  const coast = $('#coast'), track = $('#coastTrack');
  function updateCoast() {
    if (window.innerWidth <= 860) return;
    const r = coast.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    const span = r.height - window.innerHeight, p = span > 0 ? clamp(-r.top / span) : 0;
    track.style.transform = `translate3d(${-p * Math.max(0, track.scrollWidth - window.innerWidth)}px,0,0)`;
  }

  /* ---------- 6. bioluminescent water + signup ---------- */
  function initGlow() {
    const gc = $('#glowCanvas'), g = gc.getContext('2d');
    const gd = Math.min(window.devicePixelRatio || 1, 1.5);
    let gw = 0, gh = 0, parts = [], running = false;
    const sprite = col => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(.25, `rgba(${col},.55)`); gr.addColorStop(1, `rgba(${col},0)`); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return c; };
    const CY = sprite('61,224,255'), VI = sprite('124,92,255');
    const size = () => { const r = findSec.getBoundingClientRect(); gw = gc.width = Math.round(r.width * gd); gh = gc.height = Math.round(r.height * gd); };
    const dot = (s, x, y, r, a) => { g.globalAlpha = a; g.drawImage(s, x - r, y - r, r * 2, r * 2); };

    function frame(now) {
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, gw, gh);
      g.globalCompositeOperation = 'lighter';
      for (let l = 0; l < 4; l++) {
        const by = gh * (.66 + l * .085);
        for (let i = 0; i <= 70; i++) {
          const x = i / 70 * gw, y = by + Math.sin(i * .33 + now * .0007 * (1 + l * .25) + l * 2) * gh * .02;
          dot(l % 2 ? VI : CY, x, y, (5 + l * 3) * gd, .06 + .26 * Math.max(0, Math.sin(i * .8 + now * .0016 + l * 1.7)));
        }
      }
      for (const p of parts) { p.x += p.vx * gd; p.y += p.vy * gd; p.vy -= .004; p.life -= .011; if (p.life > 0) dot(p.s, p.x, p.y, p.r * (1.4 - p.life * .4), p.life * .9); }
      parts = parts.filter(p => p.life > 0);
      raf = running && !RM ? requestAnimationFrame(frame) : 0;   // with motion reduced: one still frame, no loop
    }
    let raf = 0;
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const spawn = (x, y, n) => {
      for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - .5) * 26 * gd, y: y + (Math.random() - .5) * 26 * gd, vx: (Math.random() - .5) * 1.2, vy: -Math.random() * .7, life: 1, r: (Math.random() * 16 + 8) * gd, s: Math.random() < .22 ? VI : CY });
      if (parts.length > 460) parts.splice(0, parts.length - 460);
    };
    findSec.addEventListener('pointermove', e => { if (RM) return; const r = findSec.getBoundingClientRect(); spawn((e.clientX - r.left) * gd, (e.clientY - r.top) * gd, 3); });
    // the night-beach background video loads when the section gets close and only plays while visible
    const bg = $('#findBg'), bgSrc = 'assets/loops/glow.mp4';
    let bgOk = false;
    const syncBg = () => {
      if (!bgOk) return;
      if (running && !RM) { if (!bg.src) bg.src = bgSrc; const p = bg.play(); if (p) p.catch(() => {}); } else bg.pause();
    };
    fetch(bgSrc, { method: 'HEAD' }).then(r => { bgOk = r.ok; syncBg(); }).catch(() => {});
    new IntersectionObserver(([en]) => {
      const was = running; running = en.isIntersecting;
      if (running && !was) { size(); kick(); }
      syncBg();
    }, { threshold: 0 }).observe(findSec);
    window.addEventListener('resize', () => { if (running) size(); });
    onMotionChange.push(() => { if (running) kick(); syncBg(); });
  }

  function initSignup() {
    const form = $('#signup'), msg = $('#signupMsg'), input = $('#email');
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!input.value.trim() || !input.checkValidity()) { msg.textContent = 'That email looks a little sandy. Try again?'; input.focus(); return; }
      msg.textContent = 'Gracias! This preview form is not connected to a mailing list yet.';
      form.reset();
    });
  }

  // the ad: the section appears only when the film file exists
  function initReel() {
    const sec = $('#reel'), video = $('#reelVideo'), btn = $('#reelPlay'), box = $('.reel__player', sec);
    const src = 'assets/ad/hola-ola-ad.mp4';
    fetch(src, { method: 'HEAD' }).then(r => { if (r.ok) sec.hidden = false; }).catch(() => {});
    btn.addEventListener('click', () => { if (!video.src) video.src = src; video.controls = true; video.play(); });
    video.addEventListener('play', () => box.classList.add('is-playing'));
    video.addEventListener('ended', () => { box.classList.remove('is-playing'); video.controls = false; video.load(); });
  }

  // the hidden reduce-motion button at the top right of the nav
  function initMotionToggle() {
    const btn = $('#motionToggle');
    const paint = () => {
      const label = RM ? 'Turn animations back on' : 'Reduce motion';
      btn.setAttribute('aria-pressed', RM); btn.setAttribute('aria-label', label); btn.title = label;
    };
    btn.addEventListener('click', () => setMotion(!RM));
    onMotionChange.push(paint);
    // the flavor picker's looping video starts or stops with the setting
    onMotionChange.push(() => { if (fIndex >= 0) applyFlavor(FLAVORS[fIndex]); });
    paint();
  }

  /* ---------- boot ---------- */
  initMotionToggle();
  initReel();
  initFlavors();
  initReveals();
  initGlow();
  initSignup();
  requestAnimationFrame(tick);
})();
