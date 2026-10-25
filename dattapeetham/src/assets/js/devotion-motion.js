/* Datta Peetham — devotion motion (no dependencies).
   Motifs drawn from acts of worship, each started by its data-devotion
   attribute (markup: src/features/devotion-motion.mjs, styles:
   assets/css/devotion-motion.css):

     deepa-row       lamps lit one after another when the row comes into view
     lamp-chain      a lamp lit from a lamp: light travels with scroll
                     (standalone, or attached to an existing list via data-nodes)
     pushpanjali     marigold petals and jasmine drifting down (canvas)
     dhoopa          incense smoke rising and curling (canvas)
     aarti           a flame circling a focal element clockwise (CSS; sized here)
     padma           a lotus that blooms in view
     kolam           a dot kolam drawn by scrolling, then a bead of light runs it
     nada            rings of light; they pulse with the flute when it plays
     jyoti-progress  a flame at the tip of the reading-progress line
     ghanta          a hanging bell that swings on entry, on 'dp:bell', on touch

   Performance: canvases are frame-budgeted (DPR capped, resolution lowered if
   a frame costs more than its budget), paused off-screen and in hidden tabs;
   CSS motifs get .is-idle off-screen, which pauses their animations. Under
   reduced motion nothing animates: canvases paint one composed still and
   every motif is shown finished.
   API: DP.devotion = { init(scope), light(el), ring(el), stats(), reset() }. */
(function () {
  'use strict';
  var W = window, doc = document, root = doc.documentElement;
  var DP = W.DP = W.DP || {};
  if (DP.devotion) return; // a second copy of this script does nothing
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(hover: none)').matches;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var now = function () { return performance.now(); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  root.classList.add('dv-ready');

  /* ---------------- frame cost, per motif ---------------- */
  var cost = {};
  function track(name, ms) {
    var s = cost[name] || (cost[name] = { frames: 0, total: 0, max: 0 });
    s.frames++; s.total += ms; if (ms > s.max) s.max = ms;
  }
  function timed(name, fn) { return function () { var t0 = now(); var r = fn.apply(this, arguments); track(name, now() - t0); return r; }; }

  /* ---------------- visibility ---------------- */
  var hasIO = 'IntersectionObserver' in W;
  // near: within 160px of the viewport (start/stop work); enter: properly in view (one-shot moments)
  var nearIO = hasIO && new IntersectionObserver(function (es) {
    es.forEach(function (e) { (e.target.__dvNear || []).forEach(function (cb) { cb(e.isIntersecting); }); });
  }, { rootMargin: '160px 0px' });
  var enterIO = hasIO && new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var cbs = e.target.__dvEnter; e.target.__dvEnter = null; enterIO.unobserve(e.target);
      (cbs || []).forEach(function (cb) { cb(); });
    });
  }, { rootMargin: '0px 0px -14% 0px', threshold: 0.35 });
  function near(el, cb) { (el.__dvNear = el.__dvNear || []).push(cb); if (nearIO) nearIO.observe(el); else cb(true); }
  function enter(el, cb) { (el.__dvEnter = el.__dvEnter || []).push(cb); if (enterIO) enterIO.observe(el); else cb(); }
  // CSS-animated motifs hold still while off-screen
  function idle(el) { el.classList.add('is-idle'); near(el, function (v) { el.classList.toggle('is-idle', !v); }); }

  /* ---------------- scroll: one listener, one rAF ---------------- */
  var sy = W.scrollY || 0, st = now(), vel = 0, onScrollFns = [], rafS = 0;
  function scrollVel() { var age = now() - st; return age > 140 ? vel * Math.exp(-(age - 140) / 160) : vel; }
  // every motif measures first, then all of them write: one layout per frame, never a forced one per motif
  function runScroll() {
    rafS = 0;
    var t0 = now(), live = [], i;
    for (i = 0; i < onScrollFns.length; i++) if (onScrollFns[i].on) live.push(onScrollFns[i]);
    var vals = live.map(function (r) { return r.read(); });
    for (i = 0; i < live.length; i++) live[i].write(vals[i]);
    track('scroll-driven', now() - t0);
  }
  function scheduleScroll() { if (!rafS) rafS = requestAnimationFrame(runScroll); }
  // on document, so it runs before the window listeners that write styles: reading scrollY here costs no layout
  doc.addEventListener('scroll', function () {
    var t = now(), y = W.scrollY || 0, dt = Math.max(8, t - st);
    vel = vel * 0.55 + ((y - sy) / dt) * 1000 * 0.45; sy = y; st = t;
    scheduleScroll();
  }, { passive: true });

  /* ---------------- positions, measured only when the page changes size ---------------- */
  var measures = [], rafM = 0;
  // document offset of an element, ignoring transforms (reveals move things for a moment)
  function docTop(el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; }
  function measured(fn) { measures.push(fn); fn(); return fn; }
  function remeasure() {
    if (rafM) return;
    rafM = requestAnimationFrame(function () { rafM = 0; sy = W.scrollY || 0; measures.forEach(function (f) { f(); }); runScroll(); });
  }
  W.addEventListener('resize', remeasure);
  W.addEventListener('load', remeasure);
  if (W.ResizeObserver) new ResizeObserver(remeasure).observe(doc.body); // images arriving lengthen the page
  // while el is near the viewport, on each scrolled frame: read() measures, write(value) changes the page
  function onScroll(el, read, write) {
    var rec = { read: read, write: write, on: false, done: false };
    onScrollFns.push(rec);
    near(el, function (v) { rec.on = v && !rec.done; if (rec.on) scheduleScroll(); });
    rec.finish = function () { rec.done = true; rec.on = false; };
    return rec;
  }
  // progress through the viewport from a cached box {top, h}: 0 when its top is at start×vh, 1 when its bottom reaches end×vh
  function progress(box, start, end) {
    var vh = W.innerHeight;
    return clamp((vh * start - (box.top - sy)) / (box.h + vh * (start - end)), 0, 1);
  }
  function boxOf(el) { var b = { top: 0, h: 0 }; measured(function () { b.top = docTop(el); b.h = el.offsetHeight; }); return b; }
  function range(el, d0, d1) {
    var a = (el.getAttribute('data-range') || '').split(',').map(Number);
    return [isFinite(a[0]) && a.length > 1 ? a[0] : d0, isFinite(a[1]) ? a[1] : d1];
  }

  /* ---------------- canvas loop: budgeted, paused off-screen ---------------- */
  function canvasMotif(cv, name, o) {
    var ctx = cv.getContext && cv.getContext('2d');
    if (!ctx) return;
    var cap = o.dpr || 1.5, q = 1, w = 0, h = 0, visible = false, raf = 0, last = 0, n = 0, avg = 0, state;
    var every = o.every || 1, budget = o.budget || 1.6;
    function size() {
      var r = cv.getBoundingClientRect();
      if (r.width === w && r.height === h && state) return;
      w = r.width; h = r.height;
      var dpr = Math.min(W.devicePixelRatio || 1, cap) * q;
      cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state = o.setup(w, h, state);
      if (!raf && w && h) paint(0, o.still || 0);
    }
    function paint(dt, t) {
      var t0 = now();
      o.draw(ctx, w, h, dt, t, state);
      var ms = now() - t0;
      track(name, ms);
      avg = avg ? avg * 0.94 + ms * 0.06 : ms;
      // over budget: draw fewer pixels (down to 60 %), never more work
      if (avg > budget && q > 0.62 && n > 30) { q = Math.max(0.6, q * 0.8); avg = budget * 0.7; w = h = 0; size(); }
    }
    function frame(t) {
      raf = 0;
      if (!visible || doc.hidden) return;
      if (w && h && (n++ % every) === 0) {
        var dt = last ? Math.min(0.05 * every, (t - last) / 1000) : 0;
        last = t;
        paint(dt, t / 1000);
      }
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf && visible && !doc.hidden && !reduced) { last = 0; raf = requestAnimationFrame(frame); } }
    // nothing is set up until the canvas first comes near the viewport (then it is resized as it changes)
    var ready = false;
    function ensure() {
      if (ready) return; ready = true;
      var t0 = now();
      size();
      track('setup:' + name, now() - t0);
      if (W.ResizeObserver) new ResizeObserver(function () { size(); }).observe(cv);
      else W.addEventListener('resize', size);
    }
    near(cv, function (v) { visible = v; if (v) { ensure(); size(); start(); } });
    if (reduced) return;
    doc.addEventListener('visibilitychange', start);
    if (o.enter) enter(cv, function () { ensure(); o.enter(state); });
  }

  // Deterministic PRNG so a scene composes the same on every load.
  function prng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ================= motifs ================= */
  var motifs = {};

  function lightLamp(l) { if (l && !l.classList.contains('is-lit')) l.classList.add('is-lit'); }

  /* 1 · deepa row: the lamps are lit one after another, centre first */
  motifs['deepa-row'] = function (el) {
    var lamps = $$('.dv-lamp', el), n = lamps.length || 1;
    idle(el);
    if (reduced) { lamps.forEach(lightLamp); el.classList.add('is-done'); return; }
    var ltr = el.getAttribute('data-order') === 'ltr', gap = ltr ? 210 : 300;
    enter(el, function () {
      var lit = 0;
      lamps.forEach(function (l) {
        var step = +l.getAttribute('data-step') || 0;
        setTimeout(function () {
          lightLamp(l); lit++;
          el.style.setProperty('--dv-lit', (lit / n).toFixed(3));
          if (lit === n) el.classList.add('is-done');
        }, 180 + step * gap);
      });
    });
  };

  /* 2 · lamp chain: a lamp lit from a lamp */
  motifs['lamp-chain'] = function (el) {
    if (el.hasAttribute('data-nodes')) return chainNodes(el);
    var lamps = $$(':scope > .dv-lamp', el), n = lamps.length, r = range(el, 0.85, 0.4), best = 0;
    idle(el);
    if (reduced || n < 2) { lamps.forEach(lightLamp); el.classList.add('is-done'); return; }
    el.classList.add('is-done'); // the CSS "before" state hands over to --p from here
    el.style.setProperty('--p', 0);
    var line = el.querySelector('.dv-chain-line'), vert = el.classList.contains('dv-chain--y'), len = 0;
    var measure = function () { len = line ? (vert ? line.offsetHeight : line.offsetWidth) : 0; el.style.setProperty('--dv-px', (best * len).toFixed(1) + 'px'); };
    measure();
    if (W.ResizeObserver && line) new ResizeObserver(measure).observe(line);
    var box = boxOf(el);
    var rec = onScroll(el, function () { return progress(box, r[0], r[1]); }, function (p) {
      if (p <= best) { el.classList.remove('is-moving'); return; }
      best = p;
      el.style.setProperty('--p', p.toFixed(4));
      el.style.setProperty('--dv-px', (p * len).toFixed(1) + 'px');
      var at = p * (n - 1);
      for (var i = 0; i < n; i++) if (at >= i - 0.002) lightLamp(lamps[i]);
      // the taper shows while it travels between lamps
      el.classList.toggle('is-moving', p < 0.999 && at - Math.floor(at) > 0.04);
      if (p >= 0.999) rec.finish();
    });
    enter(el, function () { lightLamp(lamps[0]); });
  };
  // attached to an existing list: a lamp on each node, lit as the reading line passes
  function chainNodes(el) {
    var nodes = $$(el.getAttribute('data-nodes'), el);
    if (!nodes.length) return;
    var line = parseFloat(el.getAttribute('data-line')) || 0.62, at = el.getAttribute('data-at') || 'center', diya = el.hasAttribute('data-diya');
    var size = parseFloat(el.getAttribute('data-size')) || 0, gap = parseFloat(el.getAttribute('data-gap')) || 0;
    var lamps = nodes.map(function (node, i) {
      var s = doc.createElement('span');
      s.className = 'dv dv-node-lamp' + (diya ? ' has-diya' : '');
      s.setAttribute('aria-hidden', 'true');
      s.setAttribute('data-at', at);
      if (size) s.style.setProperty('--dv-s', size + 'px');
      var fd = (2.6 + ((i * 0.618) % 1) * 1.4).toFixed(2), fo = (-((i * 0.371) % 1) * 4).toFixed(2);
      s.innerHTML = '<span class="dv-flame" style="--fd:' + fd + 's;--fo:' + fo + 's;--cd:' + (1.7 + ((i * 0.43) % 1) * 0.9).toFixed(2) + 's"><i></i></span>' + (diya ? '<span class="dv-diya"></span>' : '');
      if (at === 'below') {
        // set before the node, as a lamp before a portrait: a sibling, so a node that clips (overflow: hidden) cannot hide it
        node.parentNode.insertBefore(s, node.nextSibling);
        var place = function () { s.style.left = (node.offsetLeft + node.offsetWidth / 2) + 'px'; s.style.top = (node.offsetTop + node.offsetHeight + gap) + 'px'; };
        place();
        if (W.ResizeObserver) new ResizeObserver(place).observe(node); else W.addEventListener('resize', place);
      } else node.appendChild(s);
      idle(s);
      return s;
    });
    if (reduced) { lamps.forEach(lightLamp); return; }
    // a row (all nodes at one height): lit one from the next, in order, when it comes into view
    if (el.getAttribute('data-order') === 'sequence') {
      enter(el, function () { lamps.forEach(function (l, i) { setTimeout(function () { lightLamp(l); }, 200 + i * 420); }); });
      return;
    }
    var lit = nodes.map(function () { return false; }), left = lamps.length, mid = [];
    measured(function () { nodes.forEach(function (n, i) { mid[i] = docTop(n) + n.offsetHeight / 2; }); });
    var rec = onScroll(el, function () {
      var y = sy + W.innerHeight * line, reach = [];
      for (var i = 0; i < nodes.length; i++) if (!lit[i] && mid[i] <= y) reach.push(i);
      return reach;
    }, function (reach) {
      reach.forEach(function (i) { lit[i] = true; lightLamp(lamps[i]); left--; });
      if (!left) rec.finish();
    });
  }

  /* 3 · pushpanjali: an offering of flowers */
  function sprite(wd, ht, paint, blur) {
    var c = doc.createElement('canvas'), pad = blur ? 4 : 1, k = 2;
    c.width = (wd + pad * 2) * k; c.height = (ht + pad * 2) * k;
    var x = c.getContext('2d');
    x.scale(k, k); x.translate(pad, pad);
    if (blur && 'filter' in x) x.filter = 'blur(' + blur + 'px)';
    paint(x);
    c.dw = wd + pad * 2; c.dh = ht + pad * 2;
    return c;
  }
  // a marigold petal: narrow where it left the flower head, a ruffled edge where it opened
  function marigold(base, mid, edge) {
    return function (x) {
      var g = x.createRadialGradient(1, 11, 0, 1, 11, 30);
      g.addColorStop(0, base); g.addColorStop(0.42, mid); g.addColorStop(1, edge);
      x.fillStyle = g;
      x.beginPath(); x.moveTo(1, 11);
      x.bezierCurveTo(4, 4, 12, 0.5, 20, 1);
      x.quadraticCurveTo(25.5, 1.2, 25, 4.6); x.quadraticCurveTo(29.5, 6, 27, 9.2); x.quadraticCurveTo(30, 11.4, 27.2, 13.6);
      x.quadraticCurveTo(29.6, 16.6, 25, 17.6); x.quadraticCurveTo(25.4, 21, 20, 21);
      x.bezierCurveTo(12, 21.5, 4, 18, 1, 11);
      x.fill();
      x.strokeStyle = 'rgba(140,60,8,.2)'; x.lineWidth = 0.55; x.lineCap = 'round';
      x.beginPath();
      [[24, 3.4], [26.5, 7.6], [27.6, 11.4], [26.4, 15.4], [23.6, 19]].forEach(function (e) { x.moveTo(3, 11); x.quadraticCurveTo(14, 11 + (e[1] - 11) * 0.45, e[0] - 2, e[1]); });
      x.stroke();
      var hl = x.createLinearGradient(0, 0, 0, 22);
      hl.addColorStop(0, 'rgba(255,244,205,.38)'); hl.addColorStop(0.45, 'rgba(255,244,205,0)');
      x.fillStyle = hl; x.globalCompositeOperation = 'source-atop'; x.fillRect(0, 0, 30, 22); x.globalCompositeOperation = 'source-over';
    };
  }
  // jasmine (mallige): five pointed petals turning like a pinwheel
  function jasmineFlower(x) {
    x.translate(11, 11);
    for (var i = 0; i < 5; i++) {
      x.save(); x.rotate(i * Math.PI * 2 / 5);
      var g = x.createLinearGradient(0, 0, 0, -10.5);
      g.addColorStop(0, '#efe3c6'); g.addColorStop(0.35, '#fffdf7'); g.addColorStop(1, '#fffefb');
      x.fillStyle = g; x.strokeStyle = 'rgba(170,145,100,.35)'; x.lineWidth = 0.5;
      x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(-4.2, -3.2, -3.6, -9.4, 1.2, -10.6); x.bezierCurveTo(3.8, -8, 3.4, -3, 0, 0);
      x.fill(); x.stroke(); x.restore();
    }
    x.fillStyle = '#d9c27a'; x.beginPath(); x.arc(0, 0, 1.4, 0, 6.283); x.fill();
  }
  function jasmineBud(x) {
    var g = x.createLinearGradient(0, 0, 9, 0);
    g.addColorStop(0, '#eadcbc'); g.addColorStop(0.45, '#fffdf6'); g.addColorStop(1, '#e4d6b4');
    x.fillStyle = g; x.strokeStyle = 'rgba(170,145,100,.35)'; x.lineWidth = 0.5;
    x.beginPath(); x.moveTo(4.5, 0.6);
    x.bezierCurveTo(8.8, 4.6, 8.8, 11.6, 6.2, 15.6); x.lineTo(2.8, 15.6); x.bezierCurveTo(0.2, 11.6, 0.2, 4.6, 4.5, 0.6);
    x.fill(); x.stroke();
    x.fillStyle = '#9aa362';
    x.beginPath(); x.moveTo(2.4, 15.2); x.quadraticCurveTo(4.5, 20.5, 6.6, 15.2); x.closePath(); x.fill();
  }
  var FLOWERS;
  function flowers() {
    if (FLOWERS) return FLOWERS;
    // [w, h, painter, display scale, how many in a handful]
    var kinds = [
      [30, 22, marigold('#c4560e', '#e8841e', '#fbc25a'), 1.0, 5],  // marigold, saffron
      [30, 22, marigold('#cf7410', '#f0a42a', '#fde07c'), 0.95, 4], // marigold, yellow
      [22, 22, jasmineFlower, 0.72, 3],                              // jasmine flower
      [9, 21, jasmineBud, 0.6, 2],                                   // jasmine bud
    ];
    FLOWERS = [];
    kinds.forEach(function (k) {
      var f = { s: k[3], len: Math.max(k[0], k[1]), sharp: sprite(k[0], k[1], k[2]), soft: sprite(k[0], k[1], k[2], 1.2), bokeh: sprite(k[0], k[1], k[2], 2.4) };
      for (var i = 0; i < k[4]; i++) FLOWERS.push(f);
    });
    return FLOWERS;
  }
  // the flower sprites take a few ms to draw: prepare them while the browser is idle
  function warm() { (W.requestIdleCallback || function (f) { return setTimeout(f, 200); })(function () { flowers(); }, { timeout: 2500 }); }
  // Each petal is its own small element, drawn once and then only moved (transform, opacity):
  // compositor work, no large canvas to repaint each frame.
  motifs.pushpanjali = function (layer) {
    if (!FLOWERS) { if (doc.readyState === 'complete') warm(); else W.addEventListener('load', warm); }
    var density = parseFloat(layer.getAttribute('data-density')) || 1, showerOn = layer.getAttribute('data-shower') !== 'off';
    var rnd = prng(2010), w = 0, h = 0, ps = [], pool = [], live = [], shower = 0, built = false, visible = false, raf = 0, last = 0;
    function petal(top, z) {
      var F = flowers(), f = F[Math.floor(rnd() * F.length)];
      z = z == null ? rnd() : z;
      var p = {
        f: f, z: z, x: rnd() * w, y: top ? -30 - rnd() * 40 : rnd() * h,
        sz: (15 + 17 * z) * f.s, vy: 9 + 24 * z + rnd() * 6, sw: (8 + 22 * z) * (0.6 + rnd() * 0.6), sf: 0.25 + rnd() * 0.5,
        ph: rnd() * 6.283, rot: rnd() * 6.283, vr: (rnd() - 0.5) * 1.1, fl: rnd() * 6.283, vf: 0.6 + rnd() * 1.3, a: 0.5 + 0.45 * z, op: -1,
      };
      // its own small canvas, drawn once: soft when far, a bokeh blur when very near
      var sp = z < 0.28 ? f.soft : z > 0.93 ? f.bokeh : f.sharp, k = p.sz / f.len, dw = sp.dw * k, dh = sp.dh * k;
      var c = doc.createElement('canvas');
      c.width = sp.width; c.height = sp.height; c.getContext('2d').drawImage(sp, 0, 0);
      c.className = 'dv-petal-el';
      c.style.width = dw.toFixed(1) + 'px'; c.style.height = dh.toFixed(1) + 'px';
      c.style.marginLeft = (-dw / 2).toFixed(1) + 'px'; c.style.marginTop = (-dh / 2).toFixed(1) + 'px';
      p.el = c;
      return p;
    }
    function place(p, x, y, rot, fx, op) {
      p.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + rot.toFixed(3) + 'rad) scale(' + fx.toFixed(3) + ',1)';
      if (Math.abs(op - p.op) > 0.02) { p.op = op; p.el.style.opacity = op.toFixed(2); }
    }
    function step(p, dt, v, stir) {
      p.y += (p.vy * (1 + stir * 0.6) + (v > 0 ? -1 : 1) * stir * 14 * p.z) * dt;
      p.ph += p.sf * dt; p.rot += p.vr * dt * (1 + stir * 2); p.fl += p.vf * dt * (1 + stir);
      var cf = Math.cos(p.fl), fx = cf * 0.62 + (cf >= 0 ? 0.38 : -0.38); // tumbling: never edge-on
      place(p, p.x + Math.sin(p.ph * 6.283) * p.sw, p.y, p.rot, fx, p.a * clamp((p.y + 30) / 60, 0, 1) * clamp((h + 30 - p.y) / 90, 0, 1));
    }
    function build() {
      if (built || !w || !h) return; built = true;
      var n = Math.round(clamp((w * h) / 72000, 6, 16) * density), frag = doc.createDocumentFragment(), i;
      for (i = 0; i < n; i++) ps.push(petal(false, i / n * 0.999));
      ps.sort(function (a, b) { return a.z - b.z; });
      ps.forEach(function (p) { frag.appendChild(p.el); step(p, 0, 0, 0); });
      layer.appendChild(frag);
    }
    function size() {
      var nw = layer.clientWidth, nh = layer.clientHeight;
      if (w && nw) ps.concat(live).forEach(function (p) { p.x *= nw / w; });
      w = nw; h = nh;
      build();
    }
    function frame(t) {
      raf = 0;
      if (!visible || doc.hidden) return;
      var t0 = now(), dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
      var v = scrollVel(), stir = Math.min(1, Math.abs(v) / 2400), i, p;
      // the welcoming shower, and a few more when scrolling stirs the air
      if (shower > 0 || stir > 0.25) {
        if (rnd() < (shower * 0.9 + stir * 0.6) * dt * Math.max(4, w / 160) && live.length < 14) {
          p = pool.pop() || petal(true);
          p.y = -20 - rnd() * 40; p.x = rnd() * w; p.op = -1;
          p.el.style.display = '';
          if (!p.el.parentNode) layer.appendChild(p.el);
          live.push(p);
        }
        shower = Math.max(0, shower - dt / 5);
      }
      for (i = 0; i < ps.length; i++) { p = ps[i]; step(p, dt, v, stir); if (p.y > h + 30) { p.y = -30; p.x = rnd() * w; } }
      for (i = live.length - 1; i >= 0; i--) {
        p = live[i]; step(p, dt, v, stir);
        if (p.y > h + 30) { p.el.style.display = 'none'; pool.push(p); live.splice(i, 1); }
      }
      track('pushpanjali', now() - t0);
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf && visible && !doc.hidden && !reduced) { last = 0; raf = requestAnimationFrame(frame); } }
    var ready = false;
    near(layer, function (v) {
      visible = v;
      if (v && !ready) { ready = true; size(); if (W.ResizeObserver) new ResizeObserver(size).observe(layer); }
      start();
    });
    if (reduced) return; // a still scatter of flowers, placed once
    doc.addEventListener('visibilitychange', start);
    enter(layer, function () { if (showerOn) shower = 1; });
  };

  /* 4 · dhoopa: incense smoke */
  motifs.dhoopa = function (cv) {
    var from = cv.getAttribute('data-from') || 'left', nW = clamp(parseInt(cv.getAttribute('data-wisps'), 10) || 3, 1, 5), stickOn = cv.getAttribute('data-stick') !== 'off';
    var light = !cv.closest('.section-dark, .dv-on-dark, .site-footer, .cta-box, .page-hero, .hero, .panel-dark');
    var rgb = light ? '92,78,58' : '236,226,206', SEG = 64, LO = 3;
    // a smooth line through the midpoints of P[a..b], so chunks join without a corner
    function chunk(ctx, P, a, b) {
      ctx.beginPath();
      if (a === 0) { ctx.moveTo(P[0], P[1]); ctx.lineTo((P[0] + P[2]) / 2, (P[1] + P[3]) / 2); a = 1; }
      else ctx.moveTo((P[a * 2 - 2] + P[a * 2]) / 2, (P[a * 2 - 1] + P[a * 2 + 1]) / 2);
      for (var k = a; k < b; k++) ctx.quadraticCurveTo(P[k * 2], P[k * 2 + 1], (P[k * 2] + P[k * 2 + 2]) / 2, (P[k * 2 + 1] + P[k * 2 + 3]) / 2);
      ctx.stroke();
    }
    // The room between the canvas edge and the host's text column (its .wrap content box), or
    // null when the host has no .wrap.
    function margin() {
      var host = cv.parentElement, wrap = host && host.querySelector(':scope > .wrap, :scope > .container');
      if (!wrap) return null;
      var cr = cv.getBoundingClientRect(), wr = wrap.getBoundingClientRect(), ws = getComputedStyle(wrap);
      return from === 'right' ? cr.right - (wr.right - (parseFloat(ws.paddingRight) || 0)) : (wr.left + (parseFloat(ws.paddingLeft) || 0)) - cr.left;
    }
    // Where the stick stands. It stands in the margin beside the text column, so the smoke rises
    // clear of the words: at 30 % of the canvas, as first built, it stood under the first letters
    // of Kriya Yoga's paragraphs at 1440 px and its smoke drifted behind them. Where the margin
    // is narrow (phones, small laptops) it stands at the very edge and the smoke sways less, so
    // it keeps to the margin.
    function pose(s, w, h) {
      var small = W.innerWidth < 640, room = from === 'center' ? null : margin();
      var edge = room == null ? Math.max(56, Math.min(w * 0.3, 160)) : room >= 80 ? Math.round(room / 2) : 18;
      var x0 = from === 'right' ? w - edge : from === 'center' ? w / 2 : edge;
      var L = Math.min(small ? 52 : 92, h * 0.16), tilt = (from === 'right' ? -1 : 1) * (small ? 0.1 : 0.2);
      s.vw = W.innerWidth;
      s.sway = room == null ? 1 : clamp(room / 140, 0.4, 1);
      s.base = { x: x0, y: h - 6 }; s.tip = { x: x0 + Math.sin(tilt) * L, y: h - 6 - Math.cos(tilt) * L };
      s.H = Math.min(h * 0.9, small ? 420 : 640);
      return s;
    }
    canvasMotif(cv, 'dhoopa', {
      dpr: 1, every: 2, budget: 1.6, still: 9.5,
      setup: function (w, h) {
        var rnd = prng(108), wisps = [];
        for (var i = 0; i < nW; i++) wisps.push({
          f1: 0.5 + rnd() * 0.3, f2: 1.1 + rnd() * 0.5, v1: 0.028 + rnd() * 0.016, v2: 0.05 + rnd() * 0.03,
          p1: rnd() * 6.283, p2: rnd() * 6.283, amp: 0.75 + rnd() * 0.5, curl: 0.5 + rnd() * 0.6, lean: (rnd() - 0.5) * 0.14, a: i ? 0.6 : 1,
        });
        var lo = doc.createElement('canvas');
        lo.width = Math.max(1, Math.ceil(w / LO)); lo.height = Math.max(1, Math.ceil(h / LO));
        return pose({ wisps: wisps, pts: new Float32Array((SEG + 1) * 2), lo: lo, lx: lo.getContext('2d') }, w, h);
      },
      draw: function (ctx, w, h, dt, t, s) {
        if (s.vw !== W.innerWidth) pose(s, w, h); // a resize that left the column's size alone
        var tip = s.tip, H = s.H, k, wind = Math.sin(t * 0.045) * 0.08, lx = s.lx, n, q, P = s.pts;
        ctx.clearRect(0, 0, w, h);
        lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, s.lo.width, s.lo.height); lx.setTransform(1 / LO, 0, 0, 1 / LO, 0, 0);
        lx.lineCap = ctx.lineCap = 'butt'; lx.lineJoin = ctx.lineJoin = 'round';
        for (n = 0; n < s.wisps.length; n++) {
          q = s.wisps[n];
          for (k = 0; k <= SEG; k++) {
            var u = k / SEG, Y = u * H, grow = Math.pow(u, 1.5);
            var ph1 = 6.283 * (q.f1 * Y / 160 - q.v1 * t * 10) + q.p1, ph2 = 6.283 * (q.f2 * Y / 110 - q.v2 * t * 10) + q.p2;
            var dx = (Math.sin(ph1) * 0.78 + Math.sin(ph2) * 0.22) * (2 + 70 * grow) * q.amp * s.sway;
            var dy = Math.cos(ph1) * 14 * u * u * q.curl; // higher up, the wisp folds back on itself
            P[k * 2] = tip.x + dx + (q.lean + wind) * Y * u * s.sway;
            P[k * 2 + 1] = tip.y - Y + dy;
          }
          // the veil: broad and faint, drawn small and enlarged so it is soft
          for (k = 0; k < SEG; k += 4) {
            var u1 = (k + 2) / SEG, fade = Math.min(1, u1 / 0.12) * Math.pow(1 - u1, 1.5);
            var va = 0.075 * fade * q.a * (light ? 0.7 : 1);
            if (va < 0.003) continue;
            lx.strokeStyle = 'rgba(' + rgb + ',' + va.toFixed(3) + ')';
            lx.lineWidth = 3 + 26 * Math.pow(u1, 1.1);
            chunk(lx, P, k, Math.min(SEG, k + 4));
          }
          // the thread
          for (k = 0; k < SEG; k += 4) {
            var u2 = (k + 2) / SEG, f2 = Math.min(1, u2 / 0.05) * Math.pow(1 - u2, 1.9);
            var ta = 0.26 * f2 * q.a * (light ? 0.7 : 1);
            if (ta < 0.004) continue;
            ctx.strokeStyle = 'rgba(' + rgb + ',' + ta.toFixed(3) + ')';
            ctx.lineWidth = 0.7 + 2.6 * Math.pow(u2, 1.3);
            chunk(ctx, P, k, Math.min(SEG, k + 4));
          }
        }
        ctx.drawImage(s.lo, 0, 0, s.lo.width * LO, s.lo.height * LO);
        if (!stickOn) return;
        // the stick, and its ember breathing
        ctx.lineCap = 'round';
        ctx.strokeStyle = light ? 'rgba(90,62,24,.55)' : 'rgba(201,164,92,.5)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(s.base.x, s.base.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
        var glow = 0.75 + 0.25 * Math.sin(t * 2.1) * Math.sin(t * 0.7 + 1);
        var g = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 9);
        g.addColorStop(0, 'rgba(255,214,150,' + (0.95 * glow).toFixed(3) + ')'); g.addColorStop(0.25, 'rgba(240,120,40,' + (0.6 * glow).toFixed(3) + ')'); g.addColorStop(1, 'rgba(240,120,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tip.x, tip.y, 9, 0, 6.283); ctx.fill();
        ctx.fillStyle = light ? 'rgba(138,102,40,.7)' : 'rgba(201,164,92,.55)';
        ctx.beginPath(); ctx.ellipse(s.base.x, s.base.y + 2, 7, 2.2, 0, 0, 6.283); ctx.fill();
      },
    });
  };

  /* 5 · aarti: CSS draws the circle; here it is sized to its focal element and paused off-screen */
  motifs.aarti = function (el) {
    idle(el);
    var host = el.parentElement;
    if (!host) return;
    var gap0 = parseFloat(getComputedStyle(el).getPropertyValue('--dv-gap')) || 14;
    var fl = el.querySelector('.dv-flame'), fw = (parseFloat(fl && getComputedStyle(fl).getPropertyValue('--dv-s')) || 24) * 0.3;
    // an ellipse --dv-gap clear of each edge: a circle as tall as the box, scaled across.
    // Near the screen edge (a photograph inset on a phone) the path closes in, so the
    // flame never reaches past the edge of the screen.
    var fit = function () {
      var w = host.offsetWidth, h = host.offsetHeight;
      if (!w || !h) return;
      var r = host.getBoundingClientRect(), room = Math.min(r.left, root.clientWidth - r.right);
      var gap = Math.round(clamp(room - fw * 0.75 - 2, 4, gap0));
      // An ellipse --dv-gap clear of the middle of each edge passes inside the corners, so the
      // flame crossed the corners of what it circles (on Darshan, the first and last letters of
      // the inset's caption, once a circle). Where the screen leaves room, widen it evenly
      // until it clears the corners too; near the screen edge (phones) it keeps the snug fit.
      var A = w / 2 + gap, B = h / 2 + gap, c = Math.max(4, gap / 2);
      var k = Math.sqrt(Math.pow((w / 2 + c) / A, 2) + Math.pow((h / 2 + c) / B, 2));
      if (k > 1 && A * k - w / 2 <= room - fw * 0.75 - 2) { A *= k; B *= k; }
      el.style.setProperty('--dv-gap', gap + 'px');
      el.style.setProperty('--dv-ad', Math.round(B * 2) + 'px');
      el.style.setProperty('--dv-sx', (A / B).toFixed(4));
      el.classList.add('is-fit');
    };
    fit();
    if (W.ResizeObserver) new ResizeObserver(fit).observe(host);
    W.addEventListener('resize', fit);
  };

  /* 6 · padma: the lotus opens as it comes into view */
  motifs.padma = function (el) {
    if (reduced) { el.classList.add('is-open'); return; }
    enter(el, function () { el.classList.add('is-open'); });
  };

  /* 7 · kolam: the dots first, then the line drawn by scrolling, then a bead of light */
  motifs.kolam = function (el) {
    if (reduced) { el.classList.add('is-in', 'is-done'); return; }
    var r = range(el, 0.92, 0.42), best = 0, closed = false;
    el.classList.add('is-done');
    el.style.setProperty('--p', 0);
    enter(el, function () { el.classList.add('is-in'); });
    var box = boxOf(el);
    var rec = onScroll(el, function () { return progress(box, r[0], r[1]); }, function (p) {
      if (p <= best) return;
      best = p;
      el.style.setProperty('--p', p.toFixed(4));
      if (p >= 0.999 && !closed) { closed = true; el.classList.add('is-closed'); rec.finish(); }
    });
  };

  /* 8 · nada: breathes on its own; pulses with the flute when it plays */
  var nadas = [], nadaRaf = 0, nadaLast = 0;
  function soundPlaying() { var S = DP.sound; try { return !!(S && S.state && S.state().playing); } catch (e) { return false; } }
  function nadaTick(t) {
    nadaRaf = 0;
    var live = nadas.filter(function (n) { return n.vis; });
    if (!live.length || doc.hidden || !soundPlaying()) { nadas.forEach(function (n) { n.el.style.setProperty('--lv', 0); n.el.classList.remove('is-sounding'); }); return; }
    if (t - nadaLast > 32) { // ~30 updates a second is plenty for a pulse
      nadaLast = t;
      var t0 = now(), lv = 0;
      try { lv = clamp(+DP.sound.level() || 0, 0, 1); } catch (e) { lv = 0; }
      live.forEach(function (n) { n.lv += (lv - n.lv) * 0.5; n.el.style.setProperty('--lv', n.lv.toFixed(3)); n.el.classList.add('is-sounding'); if (n.draw) n.lv2 = lv; });
      track('nada', now() - t0);
    }
    nadaRaf = requestAnimationFrame(nadaTick);
  }
  function nadaWake() { if (!nadaRaf && !reduced) nadaRaf = requestAnimationFrame(nadaTick); }
  doc.addEventListener('dp:sound', nadaWake);
  motifs.nada = function (el) {
    var rec = { el: el, vis: false, lv: 0 };
    nadas.push(rec);
    if (el.getAttribute('data-variant') === 'string') return nadaString(el, rec);
    idle(el);
    near(el, function (v) { rec.vis = v; if (v) nadaWake(); });
  };
  // three tanpura strings of light, shimmering; louder music, wider shimmer
  function nadaString(cv, rec) {
    near(cv, function (v) { rec.vis = v; if (v) nadaWake(); });
    canvasMotif(cv, 'nada', {
      dpr: 1.5, budget: 1, still: 2.2,
      setup: function (w, h) { return { w: w, h: h, lv: 0 }; },
      draw: function (ctx, w, h, dt, t, s) {
        var lv = rec.lv || 0;
        ctx.clearRect(0, 0, w, h);
        var dark = !!cv.closest('.section-dark, .dv-on-dark, .site-footer, .cta-box');
        var col = dark ? '239,214,160' : '160,122,53';
        for (var j = 0; j < 3; j++) {
          var y0 = h / 2 + (j - 1) * Math.min(18, h / 6), A = (1.2 + 9 * lv) * (1 - j * 0.15) * (0.75 + 0.25 * Math.sin(t * 0.7 + j));
          for (var pass = 0; pass < 2; pass++) {
            ctx.strokeStyle = 'rgba(' + col + ',' + (pass ? 0.75 : 0.16) + ')';
            ctx.lineWidth = pass ? 1 : 5;
            ctx.beginPath();
            for (var k = 0; k <= 64; k++) {
              var u = k / 64, x = u * w;
              var y = y0 + A * Math.sin(Math.PI * u) * (Math.sin(t * 9 + j * 2.1) * 0.7 + Math.sin(Math.PI * 3 * u + t * 13) * 0.3);
              if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
            }
            ctx.stroke();
          }
        }
        // a bead of light travels the middle string, as the pluck moves along it
        var bx = ((t * 0.08) % 1) * w, g = ctx.createRadialGradient(bx, h / 2, 0, bx, h / 2, 14);
        g.addColorStop(0, 'rgba(255,240,200,.9)'); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, h / 2, 14, 0, 6.283); ctx.fill();
      },
    });
  }

  /* 9 · jyoti progress: the reading line carries a lamp */
  motifs['jyoti-progress'] = function (bar) {
    // <i>/<b>, not <span>: site.css styles every span inside .scroll-progress as the bar itself
    var j = doc.createElement('i');
    j.className = 'dv dv-jyoti';
    j.setAttribute('aria-hidden', 'true');
    j.innerHTML = '<b class="dv-jyoti-flame"><b class="dv-flame" style="--fd:2.4s;--fo:-.7s;--cd:1.6s"><i></i></b></b><b class="dv-jyoti-bead"></b>';
    bar.appendChild(j);
    var fl = j.firstChild, lastX = -1, dir = 1, rest = 0, raf = 0, shown = false, max = 1, bw = 0;
    // measured on resize only: reading scrollHeight while scrolling would force a layout every frame
    function measure() { max = root.scrollHeight - W.innerHeight; bw = bar.clientWidth; schedule(); }
    function update() {
      raf = 0;
      var t0 = now(), p = max > 0 ? clamp(sy / max, 0, 1) : 0;
      var x = Math.round(Math.min(p * bw, bw - 3) * 10) / 10;
      if (x !== lastX) {
        if (lastX >= 0 && Math.abs(x - lastX) > 0.5) dir = x > lastX ? 1 : -1;
        lastX = x;
        j.style.transform = 'translate3d(' + x + 'px,0,0)';
      }
      var on = p > 0.003;
      if (on !== shown) { shown = on; j.classList.toggle('is-on', on); j.classList.toggle('is-idle', !on); }
      if (!reduced) {
        // carried forward, the flame streams back; faster reading, a longer flame
        var v = Math.min(1, Math.abs(scrollVel()) / 2600);
        fl.style.transform = 'rotate(' + (dir > 0 ? -90 : 90) + 'deg) scale(' + (0.78 + v * 0.3).toFixed(3) + ',' + (0.8 + v * 0.9).toFixed(3) + ')';
        clearTimeout(rest);
        rest = setTimeout(function () { fl.style.transform = 'rotate(' + (dir > 0 ? -90 : 90) + 'deg) scale(.78,.8)'; }, 180);
      }
      track('jyoti-progress', now() - t0);
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(update); }
    doc.addEventListener('scroll', schedule, { passive: true });
    measured(measure); // again whenever the page changes length (images arriving)
    j.classList.add('is-idle'); // still until the reader sets out
    schedule();
  };

  /* 10 · ghanta: the bell at the threshold */
  var bells = [];
  // cause: 'enter' (came into view), 'touch' (a pointer), 'bell' (the sound engine rang it).
  // 'dp:ghanta' tells the sound engine, which sounds the bell for 'enter' and 'touch' when
  // temple sounds are on, so the bell you see is the bell you hear.
  function ring(b, cause) {
    if (!b || reduced || b.classList.contains('is-ringing')) return;
    b.classList.add('is-ringing');
    clearTimeout(b.__dvT);
    b.__dvT = setTimeout(function () { b.classList.remove('is-ringing'); }, 3100);
    var ev; try { ev = new CustomEvent('dp:ghanta', { detail: { el: b, cause: cause || 'touch' } }); doc.dispatchEvent(ev); } catch (e) { /* old browsers */ }
  }
  motifs.ghanta = function (el) {
    bells.push(el);
    idle(el);
    if (reduced) return;
    enter(el, function () { setTimeout(function () { ring(el, 'enter'); }, 250); });
    el.addEventListener('pointerenter', function () { ring(el, 'touch'); });
    el.addEventListener('click', function () { ring(el, 'touch'); });
  };
  // the sound engine rings a bell as a section arrives: the bell in that section swings with it
  doc.addEventListener('dp:bell', function (e) {
    var sec = e && e.detail && e.detail.section, vh = W.innerHeight;
    bells.forEach(function (b) {
      if (sec ? sec.contains(b) : (function (r) { return r.bottom > 0 && r.top < vh; })(b.getBoundingClientRect())) ring(b, 'bell');
    });
  });

  /* ---------------- start ---------------- */
  function init(scope) {
    $$('[data-devotion]', scope || doc).forEach(function (el) {
      if (el.__dv) return;
      var fn = motifs[el.getAttribute('data-devotion')];
      if (!fn) return;
      el.__dv = 1;
      try { timed('init', fn)(el); } catch (err) { if (W.console) console.warn('devotion-motion:', el.getAttribute('data-devotion'), err); }
    });
  }
  DP.devotion = {
    init: init,
    light: function (el) { $$('.dv-lamp, .dv-node-lamp', el).forEach(lightLamp); },
    ring: function (el) { (el ? [el] : bells).forEach(ring); },
    // frame cost per motif: { name: { frames, avgMs, maxMs } }
    stats: function () {
      var o = {};
      Object.keys(cost).forEach(function (k) { var s = cost[k]; o[k] = { frames: s.frames, avgMs: +(s.total / Math.max(1, s.frames)).toFixed(3), maxMs: +s.max.toFixed(3) }; });
      return o;
    },
    reset: function () { cost = {}; },
    reduced: reduced,
  };
  init(doc);
})();
