/* Datta Peetham — core site behaviour (no dependencies).
   motion.js layers GSAP/Lenis on top when they load; everything here works
   without them, and every effect has a finished state under reduced motion. */
(function () {
  'use strict';
  // Whole sentences with numbered slots (%1, %2) so translations can reorder them.
  var fmt = function (s) { var a = arguments; return s.replace(/%(\d)/g, function (m, i) { return a[+i]; }); };
  var doc = document, root = doc.documentElement, body = doc.body;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DP = window.DP = window.DP || {};
  DP.reduced = reduced;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ---------------- time in Mysuru & live status ---------------- */
  var DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function istNow() {
    var o = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
    return { day: DAYS[o.weekday], mins: +o.hour * 60 + +o.minute, label: o.hour + ':' + o.minute };
  }
  function toMins(t) { var a = t.split(':'); return +a[0] * 60 + +a[1]; }
  function fmt12(t) {
    var m = typeof t === 'number' ? t : toMins(t), h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + (mm ? ':' + String(mm).padStart(2, '0') : '') + ' ' + ap;
  }
  function status(h, now) {
    var c = h.caution;
    if (h.closed.indexOf(now.day) !== -1) return { open: false, text: c ? 'ఈరోజు వారపు సెలవు' : 'ఈరోజు మూసి ఉంది' };
    for (var i = 0; i < h.sessions.length; i++) {
      var s = toMins(h.sessions[i][0]), e = toMins(h.sessions[i][1]);
      if (now.mins >= s && now.mins < e) return { open: true, text: fmt(c ? 'Within listed hours · until %1' : 'Open now · until %1', fmt12(h.sessions[i][1])) };
      if (now.mins < s) return { open: false, text: fmt(c ? 'Listed hours from %1' : 'Closed · opens %1', fmt12(h.sessions[i][0])) };
    }
    return { open: false, text: c ? 'ప్రకటిత వేళలకు వెలుపల' : 'మూసి ఉంది · రేపు తెరుస్తారు' };
  }
  // Daily rituals at the Karya Siddhi Hanuman temple (from dattapeetham.org).
  var RITUALS = [[420, 'హనుమాన్ అభిషేకం'], [1080, 'హనుమాన్ హారతి']];
  function nextRitual(now) {
    for (var i = 0; i < RITUALS.length; i++) if (now.mins < RITUALS[i][0]) return RITUALS[i][1] + ' · ' + fmt12(RITUALS[i][0]);
    return fmt('%1 · %2 tomorrow', RITUALS[0][1], fmt12(RITUALS[0][0]));
  }
  function tick() {
    var now = istNow(), hours = window.DP_HOURS || {};
    $$('[data-clock]').forEach(function (el) { el.textContent = now.label + ' IST'; });
    $$('[data-next-ritual]').forEach(function (el) { el.textContent = nextRitual(now); });
    Object.keys(hours).forEach(function (k) {
      var st = status(hours[k], now);
      $$('[data-badge="' + k + '"]').forEach(function (el) { el.textContent = st.text; el.className = 'badge ' + (st.open ? 'open' : 'closed'); });
      $$('[data-status="' + k + '"]').forEach(function (el) { el.textContent = st.open ? 'Open now' : 'Closed now'; });
      $$('[data-status-long="' + k + '"]').forEach(function (el) { el.textContent = st.text; });
      $$('[data-dot="' + k + '"]').forEach(function (el) { el.className = (el.classList.contains('live-dot') ? 'live-dot' : 'dot') + ' ' + (st.open ? 'open' : 'closed'); });
    });
  }
  tick(); setInterval(tick, 30000);
  DP.istNow = istNow;

  /* ---------------- header: shadow, hide on scroll down ---------------- */
  var header = $('[data-header]'), lastY = 0, progress = $('.scroll-progress span'), toTop = $('[data-to-top]');
  function onScroll() {
    var y = window.scrollY, max = root.scrollHeight - innerHeight;
    if (header) {
      header.classList.toggle('is-scrolled', y > 8);
      header.classList.toggle('is-hidden', y > 420 && y > lastY + 4 && !body.classList.contains('nav-open'));
      if (y < lastY - 4) header.classList.remove('is-hidden');
    }
    if (progress) progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    if (toTop) toTop.classList.toggle('is-on', y > 900);
    lastY = y;
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (toTop) toTop.addEventListener('click', function () { DP.scrollTo(0); });

  /* ---------------- smooth anchors & cross-page hash landing ---------------- */
  DP.scrollTo = function (target, opts) {
    var el = typeof target === 'string' ? doc.getElementById(target.replace('#', '')) : target;
    var offset = -((header ? header.offsetHeight : 80) + 12);
    if (DP.lenis) { DP.lenis.scrollTo(el === 0 || target === 0 ? 0 : el, Object.assign({ offset: offset }, opts || {})); return; }
    var top = target === 0 ? 0 : el.getBoundingClientRect().top + scrollY + offset;
    scrollTo({ top: top, behavior: reduced || (opts && opts.immediate) ? 'auto' : 'smooth' });
  };
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a[href*="#"]');
    if (!a || e.metaKey || e.ctrlKey) return;
    var url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    var el = doc.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!el) return;
    e.preventDefault();
    closeMenu();
    if (el.id === 'main') { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
    DP.scrollTo(el);
    history.pushState(null, '', url.hash);
  });
  if (location.hash.length > 1) {
    addEventListener('load', function () {
      var el = doc.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) setTimeout(function () { DP.scrollTo(el, { immediate: true }); }, 80);
    });
  }

  /* ---------------- navigation ---------------- */
  var burger = $('.burger'), navEl = $('#primary-nav'), main = $('#main');
  function closeMenu() {
    if (!body.classList.contains('nav-open')) return;
    body.classList.remove('nav-open');
    if (burger) { burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'మెనూ తెరవండి'); }
    if (main) main.removeAttribute('inert');
    if (DP.lenis) DP.lenis.start();
  }
  DP.closeMenu = closeMenu;
  if (burger) burger.addEventListener('click', function () {
    if (body.classList.contains('nav-open')) { closeMenu(); return; }
    var hb = header.getBoundingClientRect().bottom;
    navEl.style.setProperty('--nav-top', Math.max(hb, 0) + 'px');
    body.classList.add('nav-open');
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'మెనూ మూసివేయండి');
    if (main) main.setAttribute('inert', '');
    if (DP.lenis) DP.lenis.stop();
    var first = $('a, button', navEl); if (first) setTimeout(function () { first.focus(); }, 60);
  });
  $$('.sub-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var li = btn.closest('.has-sub'), open = !li.classList.contains('is-open');
      $$('.has-sub.is-open').forEach(function (o) { if (o !== li) { o.classList.remove('is-open'); $('.sub-toggle', o).setAttribute('aria-expanded', 'false'); } });
      li.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open));
    });
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (body.classList.contains('nav-open')) { closeMenu(); burger.focus(); }
      $$('.has-sub.is-open').forEach(function (o) { o.classList.remove('is-open'); });
    }
    // focus trap inside the open mobile menu
    if (e.key === 'Tab' && body.classList.contains('nav-open')) {
      var items = $$('a, button', navEl).concat([burger]).filter(function (el) { return el.offsetParent !== null; });
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  $$('a', navEl).forEach(function (a) { a.addEventListener('click', function () { if (!a.hash || a.pathname !== location.pathname) closeMenu(); }); });

  /* ---------------- language switcher ---------------- */
  $$('[data-lang-switch]').forEach(function (box) {
    var btn = $('.lang-btn', box);
    function set(open) { box.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open)); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); set(!box.classList.contains('is-open')); if (box.classList.contains('is-open')) { var cur = $('[aria-current]', box) || $('a', box); cur.focus(); } });
    doc.addEventListener('click', function (e) { if (!box.contains(e.target)) set(false); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { set(false); btn.focus(); }
      var links = $$('a', box), i = links.indexOf(doc.activeElement);
      if (e.key === 'ArrowDown' && i > -1) { e.preventDefault(); links[(i + 1) % links.length].focus(); }
      if (e.key === 'ArrowUp' && i > -1) { e.preventDefault(); links[(i - 1 + links.length) % links.length].focus(); }
    });
    $$('a[data-lang]', box).forEach(function (a) {
      a.addEventListener('click', function () { try { localStorage.setItem('dp-lang', a.dataset.lang); } catch (err) { /* private mode */ } });
    });
  });

  /* ---------------- external links ---------------- */
  $$('a[href^="http"]').forEach(function (a) {
    if (a.hostname !== location.hostname) { a.target = '_blank'; a.rel = 'noopener'; }
  });

  /* ---------------- kinetic headings: split into words ---------------- */
  function splitWords(el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/), frag = doc.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(doc.createTextNode(' ')); return; }
            var s = doc.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = p; frag.appendChild(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          if (n.classList.contains('em-light')) { n.classList.add('w'); n.style.setProperty('--i', i++); }
          else walk(n);
        }
      });
    })(el);
  }
  $$('[data-split]').forEach(splitWords);

  /* ---------------- stagger indices & stroke lengths ---------------- */
  $$('[data-stagger]').forEach(function (g) { Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--i', i % 12); }); });
  $$('[data-draw]').forEach(function (svg) {
    $$('path, line, circle', svg).forEach(function (p) {
      try { var len = Math.ceil(p.getTotalLength()); p.style.setProperty('--len', len); p.style.strokeDasharray = len; } catch (e) { /* not renderable */ }
    });
  });

  /* ---------------- reveal on scroll ---------------- */
  var revealSel = '[data-reveal], [data-stagger], [data-split], [data-draw], .divider-light, .tl-item, [data-count]';
  var revealEls = $$(revealSel);
  function showAll() { revealEls.forEach(function (el) { el.classList.add('is-in', 'is-done'); }); }
  if (reduced || !('IntersectionObserver' in window)) showAll();
  else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in'); io.unobserve(en.target);
        // once a clip reveal has finished, drop the clip so outlines and shadows show
        if (en.target.getAttribute('data-reveal') === 'clip') setTimeout(function () { en.target.classList.add('is-done'); }, 1500);
        if (en.target.hasAttribute('data-count')) runCounter(en.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
    // safety net: anything still hidden after a long wait is shown
    setTimeout(function () { revealEls.forEach(function (el) { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-in'); }); }, 2500);
  }
  DP.reveal = function (scope) { $$(revealSel, scope).forEach(function (el) { el.classList.add('is-in'); }); };

  /* ---------------- counters (en-IN lakh grouping) ---------------- */
  function runCounter(el) {
    var to = parseFloat(el.dataset.count), dec = parseInt(el.dataset.decimals || '0', 10);
    var f = function (v) { return v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    if (reduced || isNaN(to)) { el.textContent = f(to); return; }
    var t0 = performance.now(), dur = 1800;
    (function step(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = f(to * e);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------------- scroll progress → --p (scroll-lit, process, timeline) ---------------- */
  $$('[data-progress], [data-timeline]').forEach(function (el) {
    var cfg = (el.dataset.progress || '0.85,0.45').split(',').map(Number), start = cfg[0], end = cfg[1];
    var near = false, raf = 0, isTl = el.hasAttribute('data-timeline');
    function update() {
      raf = 0;
      var r = el.getBoundingClientRect(), vh = innerHeight;
      var p = Math.min(1, Math.max(0, (vh * start - r.top) / (r.height + vh * (start - end))));
      el.style.setProperty(isTl ? '--tl' : '--p', reduced ? 1 : p.toFixed(4));
    }
    function schedule() { if (near && !raf) raf = requestAnimationFrame(update); }
    if (reduced) { el.style.setProperty(isTl ? '--tl' : '--p', 1); return; }
    new IntersectionObserver(function (en) { near = en[0].isIntersecting; if (near) schedule(); }, { rootMargin: '200px 0px' }).observe(el);
    addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule);
  });

  /* ---------------- tabs ---------------- */
  $$('[data-tabs]').forEach(function (box) {
    var tabs = $$('[role="tab"]', box);
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
        var panel = doc.getElementById(t.getAttribute('aria-controls'));
        panel.hidden = !on;
        if (on) DP.reveal(panel);
      });
      if (focus) tab.focus();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
        if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
        if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
  });

  /* ---------------- filter chips: [data-filter] buttons → [data-filter-item="a b"] ---------------- */
  $$('.chips').forEach(function (group) {
    var scope = group.closest('[data-filter-scope]') || group.parentElement.parentElement;
    var chips = $$('[data-filter]', group);
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var v = c.dataset.filter;
        chips.forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
        var items = $$('[data-filter-item]', scope), shown = 0;
        items.forEach(function (it) {
          var hit = v === 'all' || it.dataset.filterItem.split(/\s+/).indexOf(v) !== -1;
          it.classList.toggle('is-filtered', !hit);
          if (hit) { shown++; it.classList.add('is-in'); }
        });
        var empty = $('[data-filter-empty]', scope); if (empty) empty.hidden = shown > 0;
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      });
    });
  });

  /* ---------------- lightbox (<dialog>) ---------------- */
  var lb, lbImg, lbCap, lbItems = [], lbIndex = 0, opener;
  function ensureLightbox() {
    if (lb) return;
    lb = doc.createElement('dialog');
    lb.className = 'lightbox-dialog';
    lb.setAttribute('aria-label', 'చిత్ర వీక్షణి');
    lb.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button type="button" class="lb-btn lb-close" aria-label="Close"><svg class="ico" width="20" height="20"><use href="#i-close"/></svg></button>' +
      '<button type="button" class="lb-btn lb-prev" aria-label="Previous image"><svg class="ico" width="20" height="20"><use href="#i-arrow-left"/></svg></button>' +
      '<button type="button" class="lb-btn lb-next" aria-label="Next image"><svg class="ico" width="20" height="20"><use href="#i-arrow"/></svg></button>';
    body.appendChild(lb);
    lbImg = $('img', lb); lbCap = $('figcaption', lb);
    $('.lb-close', lb).addEventListener('click', function () { lb.close(); });
    $('.lb-prev', lb).addEventListener('click', function () { show(lbIndex - 1); });
    $('.lb-next', lb).addEventListener('click', function () { show(lbIndex + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') show(lbIndex + 1); if (e.key === 'ArrowLeft') show(lbIndex - 1); });
    lb.addEventListener('close', function () { lbImg.src = ''; if (DP.lenis) DP.lenis.start(); if (opener) opener.focus(); });
  }
  function show(i) {
    lbIndex = (i + lbItems.length) % lbItems.length;
    var b = lbItems[lbIndex], thumb = $('img', b);
    lbImg.classList.remove('is-loaded');
    lbImg.onload = function () { lbImg.classList.add('is-loaded'); };
    lbImg.src = b.dataset.full; lbImg.alt = thumb ? thumb.alt : '';
    lbCap.textContent = b.dataset.caption || '';
    var multi = lbItems.length > 1;
    $('.lb-prev', lb).hidden = !multi; $('.lb-next', lb).hidden = !multi;
  }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest('[data-full]');
    if (!b) return;
    ensureLightbox();
    var g = b.closest('[data-gallery]');
    lbItems = g ? $$('[data-full]', g) : [b];
    opener = b;
    show(lbItems.indexOf(b));
    if (DP.lenis) DP.lenis.stop();
    lb.showModal();
  });

  /* ---------------- click-to-load YouTube ---------------- */
  doc.addEventListener('click', function (e) {
    var v = e.target.closest('[data-yt]');
    if (!v || v.dataset.loaded) return;
    v.dataset.loaded = '1';
    var f = doc.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + v.dataset.yt + '?autoplay=1&rel=0';
    f.title = v.dataset.title || 'Video';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    f.allowFullscreen = true;
    v.appendChild(f);
  });

  /* ---------------- search (build-generated index) ---------------- */
  var dlg = $('[data-search]'), input = $('[data-search-input]'), results = $('[data-search-results]'), hints = $('[data-search-hints]');
  var index = null, sel = -1, lastFocus;
  function loadIndex() {
    if (index) return Promise.resolve(index);
    return fetch('../assets/search-index.te.json').then(function (r) { return r.json(); }).then(function (d) { index = d; return d; })
      .catch(function () { index = []; return index; });
  }
  function openSearch() {
    if (!dlg) return;
    lastFocus = doc.activeElement;
    dlg.hidden = false; body.style.overflow = 'hidden';
    if (DP.lenis) DP.lenis.stop();
    loadIndex(); setTimeout(function () { input.focus(); }, 30);
  }
  function closeSearch() {
    if (!dlg || dlg.hidden) return;
    dlg.hidden = true; body.style.overflow = '';
    if (DP.lenis) DP.lenis.start();
    if (lastFocus) lastFocus.focus();
  }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function escHtml(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function runSearch(q) {
    q = q.trim();
    hints.hidden = !!q;
    if (!q) { results.innerHTML = ''; return; }
    loadIndex().then(function (idx) {
      var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      var scored = idx.map(function (e) {
        var hay = (e.t + ' ' + e.s + ' ' + e.x).toLowerCase(), score = 0;
        for (var i = 0; i < terms.length; i++) {
          var t = terms[i];
          if (hay.indexOf(t) === -1) return null;
          if ((e.s || '').toLowerCase().indexOf(t) !== -1) score += 6;
          if (e.t.toLowerCase().indexOf(t) !== -1) score += 4;
          score += Math.min(3, hay.split(t).length - 1);
        }
        return { e: e, score: score };
      }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).slice(0, 8);
      var re = new RegExp('(' + terms.map(escRe).join('|') + ')', 'gi');
      if (!scored.length) { results.innerHTML = '<li class="search-empty">No results for “' + escHtml(q) + '”. Try “darshan”, “seva” or “Shuka Vana”.</li>'; return; }
      results.innerHTML = scored.map(function (r, i) {
        var x = r.e.x, pos = x.toLowerCase().indexOf(terms[0]);
        var snip = (pos > 60 ? '…' : '') + x.slice(Math.max(0, pos - 60), pos + 140) + '…';
        return '<li><a href="' + r.e.u + '" role="option" id="sr-' + i + '"><small>' + escHtml(r.e.t) + '</small><b>' + escHtml(r.e.s || r.e.t) + '</b><span>' + escHtml(snip).replace(re, '<mark>$1</mark>') + '</span></a></li>';
      }).join('');
      sel = -1;
    });
  }
  if (dlg) {
    $$('[data-search-open]').forEach(function (b) { b.addEventListener('click', openSearch); });
    $('[data-search-close]').addEventListener('click', closeSearch);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeSearch(); });
    input.addEventListener('input', function () { runSearch(input.value); });
    $$('[data-q]', hints).forEach(function (b) { b.addEventListener('click', function () { input.value = b.dataset.q; runSearch(input.value); input.focus(); }); });
    dlg.addEventListener('keydown', function (e) {
      var links = $$('a', results);
      if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
      if (e.key === 'ArrowDown' && links.length) { e.preventDefault(); sel = Math.min(links.length - 1, sel + 1); }
      else if (e.key === 'ArrowUp' && links.length) { e.preventDefault(); sel = Math.max(0, sel - 1); }
      else if (e.key === 'Enter' && sel >= 0 && links[sel]) { e.preventDefault(); location.href = links[sel].href; return; }
      else return;
      links.forEach(function (l, i) { l.setAttribute('aria-selected', String(i === sel)); });
      if (links[sel]) links[sel].scrollIntoView({ block: 'nearest' });
    });
    doc.addEventListener('keydown', function (e) {
      var typing = /input|textarea|select/i.test(doc.activeElement.tagName);
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); openSearch(); }
    });
  }

  /* ---------------- misc ---------------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  DP.$ = $; DP.$$ = $$;
})();
