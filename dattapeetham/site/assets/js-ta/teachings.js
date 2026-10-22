/* Discourses & Teachings page: the recent-discourses rail, the crossfading
   Sri Swamiji Says carousel, the book-catalogue count and the searchable
   glossary. Everything works without this script (all sayings listed, rail
   and panes scroll natively, letters are plain anchors); under reduced motion
   the sayings never advance on their own. */
(function () {
  'use strict';
  var DP = window.DP || {}, doc = document;
  var reduced = typeof DP.reduced === 'boolean' ? DP.reduced : matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var behavior = reduced ? 'auto' : 'smooth';

  /* ---------------- recent discourses rail ---------------- */
  $$('[data-rail]').forEach(function (rail) {
    var box = rail.parentElement, btns = $('[data-rail-btns]', box);
    if (!btns) return;
    var prev = $('[data-rail-prev]', btns), next = $('[data-rail-next]', btns);
    btns.hidden = false;
    function step() {
      var li = rail.querySelector('li'), gap = parseFloat(getComputedStyle(rail).columnGap) || 18;
      var w = li ? li.getBoundingClientRect().width + gap : 300;
      return Math.max(w, Math.floor(rail.clientWidth / w) * w - gap);
    }
    function update() {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      prev.disabled = rail.scrollLeft <= 2;
      next.disabled = rail.scrollLeft >= max;
    }
    prev.addEventListener('click', function () { rail.scrollBy({ left: -step(), behavior: behavior }); });
    next.addEventListener('click', function () { rail.scrollBy({ left: step(), behavior: behavior }); });
    var raf = 0;
    rail.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; update(); }); }, { passive: true });
    addEventListener('resize', update);
    update();
  });

  /* ---------------- Sri Swamiji Says: slow crossfade ---------------- */
  var says = $('[data-says]');
  if (says) (function () {
    var slides = $$('[data-says-slide]', says), bars = $$('.says-progress i', says), n = slides.length;
    var stage = $('.says-stage', says), live = $('[data-says-live]', says), controls = $('[data-says-controls]', says);
    var toggle = $('[data-says-toggle]', says), indexEl = $('[data-says-index]', says);
    var i = 0, userPaused = reduced, hover = false, focus = false, visible = false;
    if (!n || !controls) return;
    controls.hidden = false;
    if (reduced) { says.classList.add('is-manual'); toggle.hidden = true; }

    function sync() { says.classList.toggle('is-paused', userPaused || hover || focus || !visible || doc.hidden); }
    function show(k, announce) {
      i = (k + n) % n;
      slides.forEach(function (s, j) { var on = j === i; s.classList.toggle('is-on', on); s.setAttribute('aria-hidden', on ? 'false' : 'true'); });
      bars.forEach(function (b, j) { b.classList.remove('is-active'); b.classList.toggle('is-done', j < i); });
      void bars[i].offsetWidth; // restart the fill animation
      bars[i].classList.add('is-active');
      indexEl.textContent = (i + 1 < 10 ? '0' : '') + (i + 1);
      live.setAttribute('aria-live', announce ? 'polite' : 'off');
    }
    bars.forEach(function (b) {
      b.addEventListener('animationend', function (e) {
        if (e.animationName === 'says-fill' && b.classList.contains('is-active')) show(i + 1, false);
      });
    });
    $('[data-says-prev]', says).addEventListener('click', function () { show(i - 1, true); });
    $('[data-says-next]', says).addEventListener('click', function () { show(i + 1, true); });
    toggle.addEventListener('click', function () {
      userPaused = !userPaused;
      toggle.setAttribute('aria-pressed', String(userPaused));
      toggle.setAttribute('aria-label', userPaused ? 'அருள்மொழிகளை இயக்கு' : 'அருள்மொழிகளை இடைநிறுத்து');
      sync();
    });
    stage.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hover = true; sync(); } });
    stage.addEventListener('pointerleave', function () { hover = false; sync(); });
    stage.addEventListener('focusin', function () { focus = true; sync(); });
    stage.addEventListener('focusout', function (e) { if (!stage.contains(e.relatedTarget)) { focus = false; sync(); } });
    doc.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; sync(); }, { threshold: 0.35 }).observe(stage);
    } else visible = true;
    show(0, false);
    sync();
  })();

  /* ---------------- literature: count follows the language chips ---------------- */
  var cat = $('.lit-catalogue');
  if (cat) (function () {
    var count = $('[data-lit-count]', cat), pane = $('.lit-pane', cat), base = count.textContent;
    $$('[data-filter]', cat).forEach(function (chip) {
      chip.addEventListener('click', function () {
        var v = chip.getAttribute('data-filter');
        var shown = $$('[data-filter-item]', cat).filter(function (li) { return !li.classList.contains('is-filtered'); }).length;
        var lang = chip.firstChild ? chip.firstChild.textContent.trim() : '';
        count.textContent = v === 'all' ? base : shown + (shown === 1 ? ' நூல் · மொழி: ' : ' நூல்கள் · மொழி: ') + lang;
        pane.scrollTop = 0;
      });
    });
  })();

  /* ---------------- glossary: search, letters, cross-references ---------------- */
  var gl = $('[data-glossary]');
  if (gl) (function () {
    var pane = $('[data-gl-pane]', gl), input = $('[data-gl-input]', gl), clear = $('[data-gl-clear]', gl);
    var status = $('[data-gl-status]', gl), empty = $('[data-gl-empty]', gl);
    var groups = $$('[data-gl-group]', gl), items = $$('[data-gl-item]', gl), letters = $$('[data-gl-letter]', gl);
    var total = items.length;
    $('[data-gl-search]', gl).hidden = false;

    items.forEach(function (it) {
      it._dt = $('dt', it); it._dd = $('dd', it);
      it._dtHtml = it._dt.innerHTML; it._ddHtml = it._dd.innerHTML;
      it._text = (it._dt.textContent + ' ' + it._dd.textContent).toLowerCase();
    });

    function highlight(el, html, q) {
      el.innerHTML = html;
      if (!q) return;
      var walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], node;
      while ((node = walker.nextNode())) nodes.push(node);
      nodes.forEach(function (tn) {
        var text = tn.nodeValue, lower = text.toLowerCase(), at = lower.indexOf(q);
        if (at === -1) return;
        var frag = doc.createDocumentFragment(), from = 0;
        while (at !== -1) {
          frag.appendChild(doc.createTextNode(text.slice(from, at)));
          var m = doc.createElement('mark'); m.textContent = text.slice(at, at + q.length); frag.appendChild(m);
          from = at + q.length; at = lower.indexOf(q, from);
        }
        frag.appendChild(doc.createTextNode(text.slice(from)));
        tn.parentNode.replaceChild(frag, tn);
      });
    }

    function run() {
      var raw = input.value.trim(), q = raw.toLowerCase(), shown = 0;
      items.forEach(function (it) {
        var hit = !q || it._text.indexOf(q) !== -1;
        it.hidden = !hit;
        if (hit) shown++;
        highlight(it._dt, it._dtHtml, q);
        highlight(it._dd, it._ddHtml, q);
      });
      groups.forEach(function (g) { g.hidden = !$$('[data-gl-item]', g).some(function (x) { return !x.hidden; }); });
      letters.forEach(function (a) {
        var g = doc.getElementById('gl-' + a.getAttribute('data-gl-letter').toLowerCase()), off = !g || g.hidden;
        a.classList.toggle('is-dim', off);
        if (off) { a.setAttribute('aria-disabled', 'true'); a.tabIndex = -1; } else { a.removeAttribute('aria-disabled'); a.removeAttribute('tabindex'); }
      });
      empty.hidden = shown > 0;
      clear.hidden = !q;
      status.textContent = q ? (shown === 1 ? '1 சொல் பொருந்துகிறது:' : shown + ' சொற்கள் பொருந்துகின்றன:') + ' “' + raw + '”' : total + ' terms';
      pane.scrollTop = 0;
      spy();
    }
    var t = 0;
    input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 110); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape' && input.value) { e.preventDefault(); input.value = ''; run(); } });
    clear.addEventListener('click', function () { input.value = ''; run(); input.focus(); });

    // Scroll the pane (not the page) to an element inside it, and bring the pane into view if needed.
    function goTo(el, offset) {
      var top = el.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop - (offset || 0);
      pane.scrollTo({ top: Math.max(0, top), behavior: behavior });
      var r = pane.getBoundingClientRect();
      if ((r.top < 0 || r.top > innerHeight * 0.55) && DP.scrollTo) DP.scrollTo(pane);
    }
    function flash(el) { el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash'); }

    letters.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var g = doc.getElementById(a.getAttribute('href').slice(1));
        if (!g || g.hidden) return;
        goTo(g, 0);
        var h = $('.gl-letter', g);
        if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
      });
    });
    pane.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a.gl-ref');
      if (!a) return;
      e.preventDefault(); e.stopPropagation();
      var target = doc.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      if (target.hidden) { input.value = ''; run(); }
      goTo(target, 64);
      flash(target);
    });

    // Letter scrollspy inside the pane.
    function spy() {
      var top = pane.getBoundingClientRect().top + 8, current = null;
      groups.forEach(function (g) { if (!g.hidden && g.getBoundingClientRect().top <= top) current = g; });
      if (!current) current = groups.filter(function (g) { return !g.hidden; })[0];
      letters.forEach(function (a) {
        var on = current && a.getAttribute('href') === '#' + current.id;
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }
    var sraf = 0;
    pane.addEventListener('scroll', function () { if (!sraf) sraf = requestAnimationFrame(function () { sraf = 0; spy(); }); }, { passive: true });
    spy();

    // Landing on teachings.html#g-yuga (or #gl-y): scroll the pane after site.js has scrolled the page.
    var hash = decodeURIComponent(location.hash.slice(1));
    if (/^gl?-/.test(hash)) {
      var el = doc.getElementById(hash);
      if (el && pane.contains(el)) addEventListener('load', function () {
        setTimeout(function () {
          if (DP.scrollTo) DP.scrollTo(pane, { immediate: true });
          goTo(el, el.classList.contains('gl-item') ? 64 : 0);
          if (el.classList.contains('gl-item')) flash(el);
        }, 160);
      });
    }
  })();
})();
