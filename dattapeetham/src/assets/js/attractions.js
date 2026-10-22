/* Ashram Attractions — page behaviour (no dependencies).
   1. Sticky chapter navigator: marks the chapter in view (aria-current) and
      fills a thin gold bar with reading progress through each chapter.
   2. Shuka Vana sky: a few gold parrot silhouettes and drifting feathers, each
      bird trailing a faint thread of light. Uses DP.motion.canvasLoop when
      present (DPR-capped, paused off-screen and in hidden tabs); under reduced
      motion it draws one still frame. Content never depends on this script. */
(function () {
  'use strict';
  var doc = document, DP = window.DP || {};
  var reduced = DP.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- chapter navigator ---------------- */
  var nav = doc.querySelector('[data-ch-nav]');
  if (nav) {
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[data-ch]'));
    var chapters = links.map(function (a) { return doc.getElementById(a.getAttribute('data-ch')); });
    var raf = 0, current = -2;
    var update = function () {
      raf = 0;
      var line = nav.getBoundingClientRect().bottom + 1, vh = innerHeight, active = -1;
      var reading = line + Math.min(160, (vh - line) * 0.3); // a chapter is "current" once it crosses this line
      for (var i = 0; i < chapters.length; i++) {
        var ch = chapters[i];
        if (!ch) continue;
        var r = ch.getBoundingClientRect();
        var span = Math.max(1, r.height - (vh - line));
        var p = Math.min(1, Math.max(0, (line - r.top) / span));
        links[i].style.setProperty('--cp', p.toFixed(3));
        if (r.top <= reading && r.bottom > reading) active = i;
      }
      if (active !== current) {
        current = active;
        links.forEach(function (a, k) {
          if (k === active) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      }
    };
    var schedule = function () { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    addEventListener('load', schedule);
    update();
  }

  /* ---------------- in-page links into the tour ----------------
     The shared smooth-scroll offsets by the header only; here the sticky
     chapter navigator sits below it, so land each target just under the
     navigator (and under the header too when travelling upwards, because the
     header slides back in on the way up). Focus follows for keyboard users. */
  var tour = doc.querySelector('.tour');
  var header = doc.querySelector('[data-header]');
  if (tour) {
    Array.prototype.slice.call(doc.querySelectorAll('main a[href^="#"]')).forEach(function (a) {
      var id = decodeURIComponent(a.getAttribute('href').slice(1)), el = id && doc.getElementById(id);
      if (!el || !tour.contains(el)) return;
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
        e.preventDefault(); e.stopPropagation();
        var y = el.getBoundingClientRect().top + scrollY, up = y < scrollY;
        var off = (nav ? nav.offsetHeight : 0) + (up && header ? header.offsetHeight : 0) + (el.classList.contains('chapter') ? -1 : 16);
        var target = Math.max(0, Math.round(y - off));
        if (DP.lenis) DP.lenis.scrollTo(target, { immediate: reduced });
        else scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
        if (history.pushState) history.pushState(null, '', '#' + id);
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
      });
    });
  }

  /* ---------------- swipeable card rows (phones) ----------------
     When a row actually scrolls sideways it becomes a labelled, focusable
     region so keyboard users can scroll it too; otherwise it stays a grid. */
  var snaps = Array.prototype.slice.call(doc.querySelectorAll('[data-snap]'));
  var snapCheck = function () {
    snaps.forEach(function (el) {
      if (el.scrollWidth > el.clientWidth + 2) {
        el.setAttribute('tabindex', '0'); el.setAttribute('role', 'region'); el.setAttribute('aria-label', el.getAttribute('data-snap'));
      } else {
        el.removeAttribute('tabindex'); el.removeAttribute('role'); el.removeAttribute('aria-label');
      }
    });
  };
  if (snaps.length) { snapCheck(); addEventListener('resize', snapCheck); addEventListener('load', snapCheck); }

  /* ---------------- Shuka Vana: gold birds & feathers ---------------- */
  var cv = doc.querySelector('[data-sv-birds]');
  if (!cv || !cv.getContext) return;

  function prng(a) {
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  // Birds keep to two bands of sky: above the copy and photo, and low near the foot.
  function makeBird(rnd, w, h, small, anywhere, band) {
    var low = band === undefined ? rnd() < 0.35 : band === 1;
    return {
      x: anywhere ? rnd() * w : -90 - rnd() * w * 0.3,
      base: h * (low ? 0.8 + rnd() * 0.12 : 0.05 + rnd() * 0.3),
      amp: 10 + rnd() * 22,
      k: 0.0026 + rnd() * 0.0034,
      ph: rnd() * 6.283,
      v: 18 + rnd() * 18,
      s: (small ? 0.95 : 1.15) + rnd() * 0.6,
      flap: 1.3 + rnd() * 1,
      fp: rnd() * 6.283,
      a: 0.42 + rnd() * 0.32,
    };
  }
  function pathY(b, x) { return b.base + Math.sin(x * b.k + b.ph) * b.amp; }

  // A parrot in profile, flying right: long tail, hooked beak, two wings.
  function drawBird(ctx, x, y, ang, s, wing, a) {
    var up = -17 * wing;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(226,200,142,' + a + ')';
    ctx.globalAlpha = 0.5; // far wing
    ctx.beginPath(); ctx.moveTo(2, -1); ctx.quadraticCurveTo(-3, up * 0.55 - 1, -9, up * 0.8); ctx.quadraticCurveTo(-5, up * 0.3, -3, 0); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(-6, -0.5); ctx.quadraticCurveTo(-17, 0.5, -30, 4.8); ctx.quadraticCurveTo(-17, 3.8, -6, 2.4); ctx.closePath(); ctx.fill(); // tail
    ctx.beginPath(); ctx.ellipse(0, 0.6, 9, 3.3, 0, 0, 6.283); ctx.fill(); // body
    ctx.beginPath(); ctx.arc(8.6, -1, 3.1, 0, 6.283); ctx.fill(); // head
    ctx.beginPath(); ctx.moveTo(11.2, -2.3); ctx.quadraticCurveTo(14.8, -1.4, 12.6, 1.5); ctx.lineTo(11, 0.2); ctx.closePath(); ctx.fill(); // beak
    ctx.beginPath(); ctx.moveTo(4, -1.4); ctx.quadraticCurveTo(-1, up * 0.6 - 2, -12, up); ctx.quadraticCurveTo(-6, up * 0.35 + 0.5, -3.5, 0.8); ctx.closePath(); ctx.fill(); // near wing
    ctx.restore();
  }

  function drawFeather(ctx, f, t) {
    ctx.save();
    ctx.translate(f.x, f.y); ctx.rotate(0.5 + Math.sin(t * 0.7 + f.ph) * 0.65); ctx.scale(f.s, f.s);
    ctx.fillStyle = 'rgba(226,200,142,' + (f.a * 0.5) + ')';
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.bezierCurveTo(7, -9, 6, 6, 0, 13); ctx.bezierCurveTo(-5, 6, -6, -9, 0, -15); ctx.fill();
    ctx.strokeStyle = 'rgba(255,236,200,' + f.a + ')'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.quadraticCurveTo(1, 0, 0, 19); ctx.stroke();
    ctx.restore();
  }

  function setup(w, h) {
    var rnd = prng(2012), small = w < 760, birds = [], feathers = [], i;
    for (i = 0; i < (small ? 4 : 6); i++) birds.push(makeBird(rnd, w, h, small, true, i % 3 === 2 ? 1 : 0));
    for (i = 0; i < (small ? 2 : 4); i++) feathers.push({ x: rnd() * w, y: rnd() * h, s: 0.7 + rnd() * 0.6, ph: rnd() * 6.283, vy: 8 + rnd() * 9, a: 0.22 + rnd() * 0.22 });
    return { birds: birds, feathers: feathers, rnd: rnd, small: small };
  }

  function draw(ctx, w, h, dt, t, s) {
    ctx.clearRect(0, 0, w, h);
    s.feathers.forEach(function (f) {
      f.y += f.vy * dt; f.x += Math.sin(t * 0.9 + f.ph) * 12 * dt;
      if (f.y > h + 30) { f.y = -30; f.x = s.rnd() * w; }
      drawFeather(ctx, f, t);
    });
    s.birds.forEach(function (b) {
      b.x += b.v * dt;
      if (b.x > w + 90) { var nb = makeBird(s.rnd, w, h, s.small, false); for (var key in nb) b[key] = nb[key]; }
      var y = pathY(b, b.x), ang = Math.atan(Math.cos(b.x * b.k + b.ph) * b.amp * b.k) * 0.8;
      // thread of light trailing the bird along its own path
      var x0 = b.x - 12 * b.s, x1 = x0 - 90 * b.s;
      var g = ctx.createLinearGradient(x0, pathY(b, x0), x1, pathY(b, x1));
      g.addColorStop(0, 'rgba(240,210,150,' + (b.a * 0.34) + ')'); g.addColorStop(1, 'rgba(240,210,150,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, pathY(b, x0));
      for (var q = 1; q <= 9; q++) { var px = x0 - q * 10 * b.s; ctx.lineTo(px, pathY(b, px)); }
      ctx.stroke();
      // soft halo
      var hr = 24 * b.s, hg = ctx.createRadialGradient(b.x, y, 0, b.x, y, hr);
      hg.addColorStop(0, 'rgba(240,200,120,' + (b.a * 0.2) + ')'); hg.addColorStop(1, 'rgba(240,200,120,0)');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(b.x, y, hr, 0, 6.283); ctx.fill();
      // wingbeat with slow glides
      var glide = 0.5 + 0.5 * Math.sin(t * 0.33 + b.fp);
      var wing = 0.12 + Math.sin(t * b.flap * 6.283 + b.fp) * (0.35 + 0.55 * glide);
      drawBird(ctx, b.x, y, ang, b.s, wing, b.a);
    });
  }

  if (DP.motion && DP.motion.canvasLoop) {
    DP.motion.canvasLoop(cv, setup, draw);
  } else {
    // No motion layer: draw one still frame (the finished state).
    var still = function () {
      var r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.75), ctx = cv.getContext('2d');
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, r.width, r.height, 0, 0, setup(r.width, r.height));
    };
    still();
    addEventListener('resize', still);
  }
})();
