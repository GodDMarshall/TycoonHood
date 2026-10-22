/* Datta Peetham — motion layer (GSAP + ScrollTrigger + Lenis from the CDN).
   Ported from the Nature-Care and Ojasphera builds: one expo-out ease, long
   calm durations, light travelling along lines. Everything degrades: no GSAP
   → site.js reveals still run; reduced motion → nothing here starts. */
(function () {
  'use strict';
  var DP = window.DP || {}, doc = document;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(hover: none)').matches;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ---------------- canvas FX (no GSAP needed) ---------------- */
  // Frame-budgeted canvas loop: DPR capped, paused off-screen and in hidden tabs.
  function canvasLoop(canvas, setup, draw) {
    var ctx = canvas.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 1.75), w = 0, h = 0, visible = false, raf = 0, last = 0, state;
    function resize() {
      var r = canvas.getBoundingClientRect(); w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state = setup(w, h, state);
    }
    function frame(t) {
      raf = 0;
      var dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      draw(ctx, w, h, dt, t / 1000, state);
      if (visible && !doc.hidden && !reduced) raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf && visible && !doc.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
    resize();
    if (reduced) { draw(ctx, w, h, 0, 0, state); return; }
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; start(); }).observe(canvas);
    doc.addEventListener('visibilitychange', start);
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
    return { canvas: canvas };
  }

  // Deterministic PRNG so the scene looks the same on every load.
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // Golden embers rising like sparks from a diya.
  $$('[data-embers]').forEach(function (cv) {
    canvasLoop(cv, function (w, h) {
      var rnd = mulberry32(108), n = Math.round(Math.min(70, Math.max(24, (w * h) / 22000))), ps = [];
      for (var i = 0; i < n; i++) ps.push({ x: rnd() * w, y: rnd() * h, r: 0.6 + rnd() * 1.9, vy: 8 + rnd() * 22, sway: rnd() * 6.28, sp: 0.4 + rnd() * 0.9, a: 0.25 + rnd() * 0.6 });
      return { ps: ps };
    }, function (ctx, w, h, dt, t, s) {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      s.ps.forEach(function (p) {
        p.y -= p.vy * dt; p.x += Math.sin(t * p.sp + p.sway) * 0.25;
        if (p.y < -10) { p.y = h + 10; }
        var fade = Math.min(1, p.y / (h * 0.35)) * p.a * (0.6 + 0.4 * Math.sin(t * 2 + p.sway));
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        g.addColorStop(0, 'rgba(255,214,140,' + fade + ')'); g.addColorStop(1, 'rgba(232,160,70,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, 6.283); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
    });
  });

  // Constellation (nakshatra) field: drifting gold stars, links and travelling pulses.
  $$('[data-constellation]').forEach(function (cv) {
    var mx = -9999, my = -9999, host = cv.parentElement;
    if (!touch) host.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; }, { passive: true });
    host.addEventListener('pointerleave', function () { mx = my = -9999; });
    canvasLoop(cv, function (w, h) {
      var rnd = mulberry32(20060612), small = w < 760, n = Math.round(Math.min(small ? 40 : 90, Math.max(28, (w * h) / 16000))), nodes = [];
      var cols = [[226, 200, 142], [255, 236, 200], [201, 164, 92]];
      for (var i = 0; i < n; i++) nodes.push({ x: rnd() * w, y: rnd() * h, vx: 0, vy: 0, r: 0.8 + rnd() * 1.9, ph: rnd() * 6.28, c: cols[i % 3] });
      return { nodes: nodes, link: small ? 110 : 140, pulses: [], next: 0.8, rnd: rnd };
    }, function (ctx, w, h, dt, t, s) {
      ctx.clearRect(0, 0, w, h);
      var N = s.nodes, L = s.link, i, j;
      for (i = 0; i < N.length; i++) {
        var a = N[i];
        a.vx += Math.cos(t * 0.3 + a.ph) * 2 * dt; a.vy += Math.sin(t * 0.25 + a.ph) * 2 * dt;
        var dx = a.x - mx, dy = a.y - my, d2 = dx * dx + dy * dy;
        if (d2 < 19600 && d2 > 0.01) { var d = Math.sqrt(d2), f = (1 - d / 140) * 42 * dt; a.vx += dx / d * f; a.vy += dy / d * f; }
        a.vx *= 0.995; a.vy *= 0.995;
        var sp = a.vx * a.vx + a.vy * a.vy; if (sp > 400) { var k = 20 / Math.sqrt(sp); a.vx *= k; a.vy *= k; }
        a.x = (a.x + a.vx * dt + w) % w; a.y = (a.y + a.vy * dt + h) % h;
      }
      var links = [];
      ctx.lineWidth = 0.6;
      for (i = 0; i < N.length; i++) for (j = i + 1; j < N.length; j++) {
        var ex = N[i].x - N[j].x, ey = N[i].y - N[j].y, dd = ex * ex + ey * ey;
        if (dd < L * L) { var al = (1 - Math.sqrt(dd) / L) * 0.28; ctx.strokeStyle = 'rgba(226,200,142,' + al + ')'; ctx.beginPath(); ctx.moveTo(N[i].x, N[i].y); ctx.lineTo(N[j].x, N[j].y); ctx.stroke(); links.push([i, j]); }
      }
      for (i = 0; i < N.length; i++) {
        var n = N[i], tw = 0.55 + 0.45 * Math.sin(t * 1.6 + n.ph);
        ctx.fillStyle = 'rgba(' + n.c[0] + ',' + n.c[1] + ',' + n.c[2] + ',' + tw + ')';
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.283); ctx.fill();
        if (n.r > 2.1) { var g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 7); g.addColorStop(0, 'rgba(240,210,150,' + 0.25 * tw + ')'); g.addColorStop(1, 'rgba(240,210,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 7, 0, 6.283); ctx.fill(); }
      }
      s.next -= dt;
      if (s.next <= 0 && links.length && s.pulses.length < 5) { s.pulses.push({ l: links[Math.floor(s.rnd() * links.length)], p: 0, v: 1.4 + s.rnd() * 1.2 }); s.next = 0.7 + s.rnd() * 1.6; }
      s.pulses = s.pulses.filter(function (pu) {
        pu.p += pu.v * dt; if (pu.p >= 1) return false;
        var A = N[pu.l[0]], B = N[pu.l[1]], x = A.x + (B.x - A.x) * pu.p, y = A.y + (B.y - A.y) * pu.p;
        var g = ctx.createRadialGradient(x, y, 0, x, y, 12); g.addColorStop(0, 'rgba(255,236,190,.9)'); g.addColorStop(1, 'rgba(255,236,190,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 12, 0, 6.283); ctx.fill();
        return true;
      });
    });
  });

  /* ---------------- GSAP-powered layer ---------------- */
  function boot() {
    if (reduced || !window.gsap || !window.ScrollTrigger) return false;
    var gsap = window.gsap, ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);
    doc.documentElement.classList.add('has-gsap');

    // Lenis inertial smooth scroll on GSAP's ticker (desktop pointers only).
    if (window.Lenis && !touch) {
      var lenis = new window.Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
      DP.lenis = window.__lenis = lenis;
      doc.documentElement.classList.add('lenis');
      lenis.on('scroll', ST.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    // Hero photo depth: slow scroll zoom + pointer drift.
    $$('[data-hero], .hero').forEach(function (hero) {
      var media = hero.querySelector('.page-hero-media, .hero-media');
      if (!media) return;
      gsap.fromTo(media, { yPercent: 0, scale: 1 }, { yPercent: 12, scale: 1.08, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 } });
      var copy = hero.querySelector('.page-hero-inner, .hero-copy');
      if (copy) gsap.to(copy, { yPercent: -14, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 } });
      if (!touch) hero.addEventListener('pointermove', function (e) {
        gsap.to(media, { x: (e.clientX / innerWidth - 0.5) * -14, y: (e.clientY / innerHeight - 0.5) * -8, duration: 1.2, ease: 'power3.out', overwrite: 'auto' });
      }, { passive: true });
    });

    // Image parallax inside rounded frames.
    $$('[data-parallax]').forEach(function (img) {
      var amt = parseFloat(img.dataset.parallax) || 0.08;
      gsap.fromTo(img, { yPercent: -amt * 90 }, { yPercent: amt * 90, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.5 } });
    });

    // Magnetic buttons with an elastic return (calmer factors for a temple site).
    if (!touch) $$('[data-magnetic], .btn-gold').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.14, y: (e.clientY - r.top - r.height / 2) * 0.2, duration: 0.45, ease: 'power3.out' });
      });
      el.addEventListener('mouseleave', function () { gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.55)' }); });
    });

    // Gentle 3D tilt on cards.
    if (!touch) $$('[data-tilt]').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, { rotationY: px * 5, rotationX: -py * 5, transformPerspective: 900, duration: 0.6, ease: 'power2.out' });
      });
      card.addEventListener('mouseleave', function () { gsap.to(card, { rotationY: 0, rotationX: 0, duration: 0.9, ease: 'power3.out' }); });
    });

    // Sticky scroll-story stage: plates crossfade, glass captions scrub in/out.
    $$('[data-story]').forEach(function (story) {
      var plates = $$('.story-plate', story), ticks = $$('.story-progress i', story), scenes = $$('.story-scene', story);
      scenes.forEach(function (sc, i) {
        ST.create({ trigger: sc, start: 'top 55%', end: 'bottom 55%', onToggle: function (self) {
          if (!self.isActive) return;
          plates.forEach(function (p, k) { p.classList.toggle('is-on', k === i); });
          ticks.forEach(function (p, k) { p.classList.toggle('is-on', k === i); });
        } });
        var card = sc.querySelector('.story-card');
        if (!card) return;
        gsap.fromTo(card, { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'none', scrollTrigger: { trigger: sc, start: 'top 70%', end: 'top 30%', scrub: 0.4 } });
        if (i < scenes.length - 1) gsap.to(card, { opacity: 0, y: -40, ease: 'none', immediateRender: false, scrollTrigger: { trigger: sc, start: 'bottom 60%', end: 'bottom 20%', scrub: 0.4 } });
      });
    });

    // Rotating mandalas drift with scroll.
    $$('[data-spin]').forEach(function (el) {
      gsap.to(el, { rotation: parseFloat(el.dataset.spin) || 90, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1 } });
    });

    addEventListener('load', function () { ST.refresh(); });
    return true;
  }

  function tryBoot(n) {
    if (boot() || n > 40 || reduced) return;
    setTimeout(function () { tryBoot(n + 1); }, 75);
  }
  tryBoot(0);
  DP.motion = { canvasLoop: canvasLoop, mulberry32: mulberry32 };
})();
