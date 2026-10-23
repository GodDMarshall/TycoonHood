/* Nada Chikitsa page (music.html).
   1. Hero canvas: concentric sound rings radiating from the portrait and a
      gold waveform that breathes, with a bead of light travelling along it.
      Paused off-screen and in hidden tabs; one still frame under reduced motion.
   2. Concert rail: previous / next buttons over a native scroll-snap list.
   3. Record sleeves: a tap slides the disc out on touch screens. */
(function () {
  'use strict';
  var doc = document;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(hover: none)').matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ---------------- 1. sound rings + breathing waveform ---------------- */
  var cv = $('[data-nada]');
  if (cv && cv.getContext) {
    var ctx = cv.getContext('2d'), hero = cv.parentElement, disc = $('.np-disc', hero);
    var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    var W = 0, H = 0, g = null, visible = false, raf = 0, last = 0, clock = 0, energy = 0, px = null, py = null;

    var measure = function () {
      var hr = hero.getBoundingClientRect();
      W = hr.width; H = hr.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var cx = W * 0.72, cy = H * 0.5, r0 = Math.min(W, H) * 0.18;
      if (disc) {
        // offsetLeft/Top chain ignores the reveal transform, so the centre is stable
        var x = 0, y = 0, el = disc;
        while (el && el !== hero) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
        if (el === hero) { cx = x + disc.offsetWidth / 2; cy = y + disc.offsetHeight / 2; r0 = disc.offsetWidth / 2; }
      }
      var far = Math.sqrt(Math.pow(Math.max(cx, W - cx), 2) + Math.pow(Math.max(cy, H - cy), 2));
      g = { cx: cx, cy: cy, r0: r0, far: far + 30, small: W < 760 };
      if (reduced || !raf) draw(0);
    };

    // a soft sum of sines; env keeps the swell around the portrait
    var wave = function (x, T, layer) {
      var d = (x - g.cx) / (W * (g.small ? 0.55 : 0.34));
      var env = 0.12 + 0.88 * Math.exp(-d * d);
      return env * (Math.sin(x * 0.017 + T * 1.05 + layer * 1.3) * 0.6 + Math.sin(x * 0.043 - T * 1.6 + layer * 2.1) * 0.28 + Math.sin(x * 0.0065 + T * 0.45) * 0.42);
    };

    var draw = function (dt) {
      if (!g) return;
      var T = clock + 3.4;                                   // offset gives a composed still frame
      var breath = 0.58 + 0.42 * Math.sin(T * 0.6);          // about ten seconds per breath
      var i, k, a, r, ph, alpha;
      ctx.clearRect(0, 0, W, H);

      // resonance guides: still, dotted circles around the portrait
      ctx.lineWidth = 1;
      ctx.setLineDash([1, 7]);
      for (k = 1; k <= 3; k++) {
        ctx.strokeStyle = 'rgba(226,200,142,' + (0.2 - k * 0.045) + ')';
        ctx.beginPath(); ctx.arc(g.cx, g.cy, g.r0 * (1 + k * 0.42), 0, 6.2832); ctx.stroke();
      }
      ctx.setLineDash([]);

      // rings of sound, each one trembling with its own harmonic
      var N = g.small ? 6 : 9, period = 10;
      for (i = 0; i < N; i++) {
        ph = ((T / period) + i / N) % 1;
        r = g.r0 * 1.04 + ph * (g.far - g.r0);
        alpha = Math.pow(1 - ph, 1.7) * (0.36 + 0.22 * breath);
        var amp = (1.6 + 5 * energy) * (1 - ph * 0.6), harm = 5 + (i % 4) * 2, segs = 140;
        ctx.strokeStyle = 'rgba(232,196,120,' + alpha.toFixed(3) + ')';
        ctx.lineWidth = 0.6 + (1 - ph) * 0.9;
        ctx.beginPath();
        for (k = 0; k <= segs; k++) {
          a = (k / segs) * 6.2832;
          var rr = r + amp * Math.sin(harm * a + T * 1.2 + i * 1.7);
          var X = g.cx + rr * Math.cos(a), Y = g.cy + rr * Math.sin(a);
          if (k) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
        }
        ctx.stroke();
      }

      // the breathing waveform, three strands like the golden thread
      var base = (g.small ? 16 : 30) * (0.55 + 0.45 * breath) * (1 + energy * 1.4);
      var grad = ctx.createLinearGradient(0, 0, W, 0);
      var c = Math.max(0.05, Math.min(0.95, g.cx / W));
      grad.addColorStop(0, 'rgba(226,200,142,0)');
      grad.addColorStop(Math.max(0, c - 0.42), 'rgba(226,200,142,.08)');
      grad.addColorStop(c, 'rgba(246,214,150,1)');
      grad.addColorStop(Math.min(1, c + 0.3), 'rgba(226,200,142,.5)');
      grad.addColorStop(1, 'rgba(226,200,142,0)');
      ctx.strokeStyle = grad;
      var strands = [[1, 1.5, 0.85], [0.62, 1, 0.45], [0.36, 0.8, 0.3]];
      for (k = 0; k < strands.length; k++) {
        ctx.globalAlpha = strands[k][2];
        ctx.lineWidth = strands[k][1];
        ctx.beginPath();
        for (var x = 0; x <= W + 4; x += 4) {
          var y = g.cy + base * strands[k][0] * wave(x, T, k);
          if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // a bead of light running along the main strand
      var bx = ((T * 0.075) % 1) * (W + 240) - 120, by = g.cy + base * wave(bx, T, 0);
      var bd = Math.abs(bx - g.cx) / W, ba = Math.max(0, 1 - bd * 2.2);
      if (ba > 0.02) {
        var bg = ctx.createRadialGradient(bx, by, 0, bx, by, 16);
        bg.addColorStop(0, 'rgba(255,243,214,' + (0.95 * ba).toFixed(3) + ')');
        bg.addColorStop(1, 'rgba(240,200,120,0)');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx, by, 16, 0, 6.2832); ctx.fill();
      }

      energy *= Math.pow(0.3, dt || 0);
      // while the site's flute music plays (devotion-sound.js), the rings swell with it
      var S = window.DP && DP.sound; if (S && S.state && S.state().playing) energy = Math.max(energy, S.level() * 0.8);
    };

    var frame = function (t) {
      raf = 0;
      var dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      clock += dt;
      draw(dt);
      if (visible && !doc.hidden) raf = requestAnimationFrame(frame);
    };
    var start = function () { if (!reduced && !raf && visible && !doc.hidden) { last = 0; raf = requestAnimationFrame(frame); } };

    measure();
    if (!reduced) {
      if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; start(); }).observe(cv);
      else { visible = true; start(); }
      doc.addEventListener('visibilitychange', start);
      // stroke the strings: moving across the hero gives the rings a little energy
      if (!touch) hero.addEventListener('pointermove', function (e) {
        if (px !== null) energy = Math.min(1, energy + Math.min(40, Math.abs(e.clientX - px) + Math.abs(e.clientY - py)) * 0.004);
        px = e.clientX; py = e.clientY;
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { px = py = null; });
    }
    var rt;
    var remeasure = function () { clearTimeout(rt); rt = setTimeout(measure, 120); };
    if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(hero);
    else addEventListener('resize', remeasure);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(remeasure);
  }

  /* ---------------- 2. concert rail ---------------- */
  var rail = $('[data-rail]'), nav = $('[data-rail-nav]');
  if (rail && nav) {
    var prev = $('[data-rail-prev]', nav), next = $('[data-rail-next]', nav);
    var stepSize = function () {
      var item = rail.firstElementChild;
      var gap = parseFloat(getComputedStyle(rail).columnGap) || 24;
      return item ? item.getBoundingClientRect().width + gap : rail.clientWidth * 0.8;
    };
    var update = function () {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      nav.hidden = max <= 0;
      prev.disabled = rail.scrollLeft <= 2;
      next.disabled = rail.scrollLeft >= max;
    };
    var go = function (dir) { rail.scrollBy({ left: dir * stepSize(), behavior: reduced ? 'auto' : 'smooth' }); };
    prev.addEventListener('click', function () { go(-1); });
    next.addEventListener('click', function () { go(1); });
    rail.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ---------------- 3. record sleeves on touch screens ---------------- */
  $$('.record-art').forEach(function (art) {
    art.addEventListener('click', function () {
      var rec = art.closest('.record');
      var on = !rec.classList.contains('is-playing');
      $$('.record.is-playing').forEach(function (r) { r.classList.remove('is-playing'); });
      if (on) rec.classList.add('is-playing');
    });
  });
})();
