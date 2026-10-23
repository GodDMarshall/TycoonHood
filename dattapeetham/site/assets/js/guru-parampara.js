/* Guru Parampara — page behaviour.
   1. The golden thread: each Guru lights up as the drawn line reaches them.
   2. The 24 Gurus of nature: a stage that shows the chosen Guru's lesson.
   3. Datta Charitram: pick an episode, the main player switches to it.
   Everything here only enhances: without this script every Guru is lit,
   every lesson is printed under its tile and every episode is a link. */
(function () {
  'use strict';
  var doc = document, DP = window.DP || {};
  var reduced = DP.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  // whole sentences with numbered slots (%1), so translations can reorder them
  var fmt = function (s) { var a = arguments; return s.replace(/%(\d)/g, function (m, i) { return a[+i]; }); };

  /* ---------------- 1. golden thread ---------------- */
  var thread = doc.querySelector('[data-thread]');
  if (thread && !reduced && 'IntersectionObserver' in window) {
    var nodes = $$('.gn', thread);
    var marks = nodes.map(function (n) { return n.querySelector('.gn-medal, .gn-bead') || n; });
    // Same mapping site.js uses for data-progress, so the light and the nodes agree.
    var cfg = (thread.getAttribute('data-progress') || '0.62,0.62').split(',').map(Number);
    var raf = 0, near = false;
    var update = function () {
      raf = 0;
      var r = thread.getBoundingClientRect(), vh = innerHeight;
      var p = Math.min(1, Math.max(0, (vh * cfg[0] - r.top) / (r.height + vh * (cfg[0] - cfg[1]))));
      var tip = p * r.height;
      nodes.forEach(function (n, i) {
        var m = marks[i].getBoundingClientRect();
        n.classList.toggle('is-lit', m.top + m.height * 0.5 - r.top <= tip + 1);
      });
    };
    var schedule = function () { if (near && !raf) raf = requestAnimationFrame(update); };
    thread.classList.add('is-armed');
    new IntersectionObserver(function (en) { near = en[0].isIntersecting; if (near) schedule(); }, { rootMargin: '300px 0px' }).observe(thread);
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    near = true; update();
  }

  /* ---------------- 2. the 24 Gurus of nature ---------------- */
  var box = doc.querySelector('[data-gurus]');
  if (box) {
    var stage = box.querySelector('.gt-stage'), col = box.querySelector('.gt-stage-col'), grid = box.querySelector('.gt-grid');
    var btns = $$('.gt-btn', box);
    var lessons = btns.map(function (b) { return b.parentNode.querySelector('.gt-lesson'); });
    var use = stage.querySelector('.gt-stage-ico use'), num = stage.querySelector('.gt-stage-num b');
    var nameEl = stage.querySelector('.gt-stage-name'), lessonEl = stage.querySelector('.gt-stage-lesson'), bar = stage.querySelector('.gt-stage-bar i');
    var narrow = matchMedia('(max-width: 980px)'), cur = 0, slot = null;

    box.classList.add('is-enhanced');
    lessons.forEach(function (l) { l.hidden = true; });
    stage.hidden = false;

    // Wide screens: the stage sits in its sticky column. Narrow screens: it
    // opens as a full-width row directly under the chosen tile's row.
    var place = function () {
      if (narrow.matches) {
        if (!slot) { slot = doc.createElement('li'); slot.className = 'gt-slot'; }
        var cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 3;
        var last = btns[Math.min(btns.length - 1, Math.floor(cur / cols) * cols + cols - 1)].parentNode;
        if (last.nextElementSibling !== slot) last.parentNode.insertBefore(slot, last.nextElementSibling);
        if (stage.parentNode !== slot) slot.appendChild(stage);
      } else {
        if (stage.parentNode !== col) col.appendChild(stage);
        if (slot && slot.parentNode) slot.parentNode.removeChild(slot);
      }
    };

    var show = function (i, animate) {
      cur = (i + btns.length) % btns.length;
      var b = btns[cur];
      btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      use.setAttribute('href', '#g-' + b.getAttribute('data-glyph'));
      num.textContent = pad(cur + 1);
      nameEl.innerHTML = b.querySelector('.gt-name').innerHTML;
      lessonEl.textContent = lessons[cur].textContent;
      bar.style.transform = 'scaleX(' + ((cur + 1) / btns.length) + ')';
      if (animate && !reduced) { stage.classList.remove('is-swap'); void stage.offsetWidth; stage.classList.add('is-swap'); }
      place();
    };

    btns.forEach(function (b, i) {
      b.addEventListener('click', function () {
        show(i, true);
        if (narrow.matches && slot && slot.getBoundingClientRect().bottom > innerHeight) {
          var top = slot.getBoundingClientRect().top + scrollY - innerHeight * 0.3;
          if (DP.lenis) DP.lenis.scrollTo(top); else scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
        }
      });
    });
    stage.querySelector('.gt-prev').addEventListener('click', function () { show(cur - 1, true); });
    stage.querySelector('.gt-next').addEventListener('click', function () { show(cur + 1, true); });
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(place, 120); });
    show(0, false);
  }

  /* ---------------- 3. Datta Charitram episodes ---------------- */
  var eps = doc.querySelector('[data-episodes]');
  if (eps) {
    var player = eps.querySelector('[data-yt]');
    eps.addEventListener('click', function (e) {
      var a = e.target.closest('[data-ep]');
      if (!a || !player || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
      e.preventDefault();
      var id = a.getAttribute('data-ep'), title = a.getAttribute('data-ep-title');
      $$('[data-ep]', eps).forEach(function (x) { x.removeAttribute('aria-current'); });
      a.setAttribute('aria-current', 'true');
      var old = player.querySelector('iframe');
      if (old) old.parentNode.removeChild(old);
      delete player.dataset.loaded;
      player.setAttribute('data-yt', id);
      player.setAttribute('data-title', title);
      player.querySelector('.video-title').textContent = title;
      var play = player.querySelector('.video-play');
      play.setAttribute('aria-label', fmt('Play video: %1', title));
      var r = player.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) { if (DP.scrollTo) DP.scrollTo(player); }
      play.click(); // site.js swaps in the youtube-nocookie player
      setTimeout(function () { var f = player.querySelector('iframe'); if (f) f.focus(); }, 60);
    });
  }
})();
