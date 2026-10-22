/* Feature: Interactive Ashram Map (src/features/ashram-map.mjs).
   Ported from the Ojasphera interactive-SVG-map pattern: one tiny store
   drives the pins, the list of places, the layer switches (role=switch) and
   the detail card (aria-live). Hover and focus sync both ways, everything is
   keyboard operable, Esc closes the card. No dependencies. */
(function () {
  'use strict';
  var doc = document;
  var DP = window.DP = window.DP || {};
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sheetMQ = matchMedia('(max-width: 760px)');

  function createStore(initial) {
    var state = initial, subs = [];
    return {
      get: function () { return state; },
      set: function (next) {
        var prev = state;
        state = Object.assign({}, state, next);
        subs.forEach(function (f) { f(state, prev); });
      },
      subscribe: function (f) { subs.push(f); return function () { subs = subs.filter(function (g) { return g !== f; }); }; },
    };
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function init(root) {
    var all = function (s) { return Array.prototype.slice.call(root.querySelectorAll(s)); };
    var one = function (s) { return root.querySelector(s); };
    var compact = root.hasAttribute('data-compact');
    var pins = all('.amap-pin'), items = all('.amap-item'), switches = all('[data-layer]'), hls = all('.amap-hl'), cards = all('.amap-card-item');
    var card = one('.amap-card'), live = one('.amap-card-live'), mapEl = one('.amap-map'), canvas = one('.amap-canvas'), scroller = one('.amap-scroll');
    var list = one('.amap-list'), route = one('.amap-route'), closeBtn = one('.amap-card-close');
    var catOf = {}, pinOf = {}, itemOf = {};
    pins.forEach(function (p) { catOf[p.dataset.place] = p.dataset.cat; pinOf[p.dataset.place] = p; });
    items.forEach(function (b) { itemOf[b.dataset.place] = b; });
    var order = pins.map(function (p) { return p.dataset.place; });
    var initial = root.dataset.default || order[0];
    var isSheet = function () { return !compact && sheetMQ.matches; };
    var lastTrigger = null;

    // The full map opens its first card only after the pins have landed.
    var store = createStore({
      active: compact ? initial : null,
      hover: null,
      layers: { shrine: true, attraction: true, seva: true, route: true },
    });
    var layerOn = function (s, id) { return s.layers[catOf[id]] !== false; };

    /* ---------------- render ---------------- */
    function pinXY(p) {
      return { x: parseFloat(p.style.getPropertyValue('--x')) / 100 * canvas.clientWidth, y: parseFloat(p.style.getPropertyValue('--y')) / 100 * canvas.clientHeight };
    }
    // Popover by the active pin. Of the candidate spots (beside it, above or
    // below, shifted along) take the one that hides the fewest other pins.
    function placeCard(s) {
      if (compact || !card) return;
      if (isSheet() || !s.active || !pinOf[s.active]) return;
      var W = canvas.clientWidth, H = canvas.clientHeight, gap = 26, pad = 12;
      card.style.setProperty('--card-max', Math.max(200, H - 2 * pad) + 'px');
      var cw = card.offsetWidth, ch = card.offsetHeight;
      var a = pinXY(pinOf[s.active]), ay = a.y - 24; // middle of the marker
      var others = pins.filter(function (p) { return p.dataset.place !== s.active && !p.classList.contains('is-off'); }).map(pinXY);
      var cand = [];
      [0.5, 0.18, 0.82].forEach(function (k, ki) {
        cand.push({ side: 'right', x: a.x + gap, y: ay - ch * k, pref: ki });
        cand.push({ side: 'left', x: a.x - gap - cw, y: ay - ch * k, pref: 1 + ki });
        cand.push({ side: 'below', x: a.x - cw * k, y: a.y + 16, pref: 2 + ki });
        cand.push({ side: 'above', x: a.x - cw * k, y: a.y - 48 - gap - ch, pref: 3 + ki });
      });
      var best = null;
      cand.forEach(function (c) {
        var x = clamp(c.x, pad, W - cw - pad), y = clamp(c.y, pad, Math.max(pad, H - ch - pad));
        var hit = function (o) { return o.x + 16 > x && o.x - 16 < x + cw && o.y + 2 > y && o.y - 44 < y + ch; };
        var score = others.filter(hit).length * 10 + (hit(a) ? 200 : 0) + (Math.abs(x - c.x) + Math.abs(y - c.y)) / 40 + c.pref;
        if (!best || score < best.score) best = { score: score, x: x, y: y, side: c.side };
      });
      card.dataset.side = best.side;
      card.style.setProperty('--tx', Math.round(best.x) + 'px');
      card.style.setProperty('--ty', Math.round(best.y) + 'px');
      card.style.setProperty('--ny', Math.round(clamp(ay - best.y, 24, ch - 24)) + 'px');
      card.style.setProperty('--nx', Math.round(clamp(a.x - best.x, 24, cw - 24)) + 'px');
      // the notch only makes sense when the card really sits next to the pin
      var off = { right: best.x < a.x + 8, left: best.x + cw > a.x - 8, below: best.y < a.y, above: best.y + ch > a.y - 44 }[best.side];
      var along = best.side === 'right' || best.side === 'left' ? ay - best.y < 20 || ay - best.y > ch - 20 : a.x - best.x < 20 || a.x - best.x > cw - 20;
      card.classList.toggle('no-notch', off || along);
    }

    function expand(c, on) {
      var btn = c.querySelector('.amap-more-btn');
      c.classList.toggle('is-expanded', on);
      if (btn) { btn.setAttribute('aria-expanded', String(on)); btn.firstElementChild.textContent = on ? 'తక్కువ చూపించండి' : 'మరింత చదవండి'; }
    }
    function showCard(id) {
      if (!id) return;
      cards.forEach(function (c) {
        var on = c.dataset.place === id;
        if (on && c.hidden) { c.hidden = false; c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; }
        else if (!on) c.hidden = true;
      });
      if (live) live.scrollTop = 0;
    }

    function render(s, prev) {
      pins.forEach(function (p) {
        var id = p.dataset.place;
        p.setAttribute('aria-pressed', String(s.active === id));
        p.classList.toggle('is-hover', s.hover === id);
        p.classList.toggle('is-off', !layerOn(s, id));
      });
      items.forEach(function (b) {
        var id = b.dataset.place;
        b.setAttribute('aria-pressed', String(s.active === id));
        b.classList.toggle('is-hover', s.hover === id);
        b.classList.toggle('is-off', !layerOn(s, id));
      });
      hls.forEach(function (h) {
        var id = h.dataset.place;
        h.classList.toggle('is-hot', layerOn(s, id) && (s.hover === id || s.active === id));
        h.classList.toggle('is-off', !layerOn(s, id));
      });
      switches.forEach(function (b) { b.setAttribute('aria-checked', String(s.layers[b.dataset.layer] !== false)); });
      if (route) route.classList.toggle('is-off', s.layers.route === false);
      root.classList.toggle('has-card', !!s.active);
      if (!prev || s.active !== prev.active) {
        // a card always (re)opens short; "మరింత చదవండి" is a choice per visit
        cards.forEach(function (c) { if (c.classList.contains('is-expanded')) expand(c, false); });
        showCard(s.active);
        if (s.active) requestAnimationFrame(function () { placeCard(store.get()); });
        if (s.active && prev) revealInList(s.active);
      }
    }
    store.subscribe(render);

    /* ---------------- actions ---------------- */
    function select(id, trigger) {
      var s = store.get();
      if (trigger) lastTrigger = trigger;
      if (!compact && s.active === id && trigger && trigger.classList.contains('amap-pin')) { close(); return; }
      var next = { active: id };
      if (!layerOn(s, id)) { next.layers = Object.assign({}, s.layers); next.layers[catOf[id]] = true; }
      store.set(next);
      revealOnMap(id);
      if (isSheet()) setTimeout(function () { keepAboveSheet(id); }, reduced ? 0 : 380);
    }
    // phones: if the sheet now hides the chosen pin, lift the page a little
    function keepAboveSheet(id) {
      var pin = pinOf[id];
      if (!pin || !store.get().active) return;
      var pr = pin.getBoundingClientRect(), sheetTop = innerHeight - card.offsetHeight;
      var delta = pr.bottom - (sheetTop - 24);
      if (delta <= 0) return;
      if (DP.lenis) DP.lenis.scrollTo(scrollY + delta);
      else scrollBy({ top: delta, behavior: reduced ? 'auto' : 'smooth' });
    }
    function close(returnFocus) {
      var was = store.get().active;
      if (compact || !was) return;
      var focusInCard = card && card.contains(doc.activeElement);
      store.set({ active: null });
      var back = lastTrigger && lastTrigger.offsetParent !== null ? lastTrigger : pinOf[was];
      if ((returnFocus || focusInCard) && back) back.focus({ preventScroll: true });
    }
    // phones: slide the map so the chosen pin is in view, and the chip too
    function revealOnMap(id) {
      var pin = pinOf[id];
      if (!pin || !scroller || scroller.scrollWidth <= scroller.clientWidth + 2) return;
      var x = parseFloat(pin.style.getPropertyValue('--x')) / 100 * canvas.clientWidth;
      scroller.scrollTo({ left: x - scroller.clientWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
    }
    function revealInList(id) {
      var it = itemOf[id];
      if (!it || !list) return;
      var li = it.parentElement;
      if (list.scrollWidth > list.clientWidth + 2) {
        list.scrollTo({ left: li.offsetLeft - list.clientWidth / 2 + li.offsetWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
      } else if (list.scrollHeight > list.clientHeight + 2) {
        var top = li.offsetTop, bottom = top + li.offsetHeight;
        if (top < list.scrollTop + 8 || bottom > list.scrollTop + list.clientHeight - 40) list.scrollTo({ top: top - list.clientHeight / 3, behavior: reduced ? 'auto' : 'smooth' });
      }
    }
    function hover(id) { if (store.get().hover !== id) store.set({ hover: id }); }

    /* ---------------- events ---------------- */
    pins.concat(items).forEach(function (el) {
      var id = el.dataset.place;
      el.addEventListener('click', function () { select(id, el); });
      el.addEventListener('mouseenter', function () { hover(id); });
      el.addEventListener('mouseleave', function () { hover(null); });
      el.addEventListener('focus', function () { hover(id); });
      el.addEventListener('blur', function () { hover(null); });
    });
    hls.forEach(function (h) {
      var id = h.dataset.place;
      h.addEventListener('mouseenter', function () { hover(id); });
      h.addEventListener('mouseleave', function () { hover(null); });
      h.addEventListener('click', function () { if (pinOf[id]) select(id, pinOf[id]); });
    });
    switches.forEach(function (b) {
      b.addEventListener('click', function () {
        var s = store.get(), layers = Object.assign({}, s.layers), key = b.dataset.layer;
        layers[key] = s.layers[key] === false;
        var next = { layers: layers };
        if (s.active && catOf[s.active] === key && !layers[key]) next.active = null;
        store.set(next);
      });
    });
    if (closeBtn) closeBtn.addEventListener('click', function () { close(true); });
    cards.forEach(function (c) {
      var btn = c.querySelector('.amap-more-btn');
      if (btn) btn.addEventListener('click', function () { expand(c, !c.classList.contains('is-expanded')); placeCard(store.get()); });
    });

    // arrow keys move between pins (in number order) and down the list
    function visible(els) { return els.filter(function (e) { return !e.classList.contains('is-off') || e.classList.contains('amap-item'); }); }
    function arrows(els, e, keys) {
      var dir = keys.next.indexOf(e.key) !== -1 ? 1 : keys.prev.indexOf(e.key) !== -1 ? -1 : 0;
      var vis = visible(els), i = vis.indexOf(e.currentTarget);
      if (e.key === 'Home') { e.preventDefault(); vis[0].focus(); return; }
      if (e.key === 'End') { e.preventDefault(); vis[vis.length - 1].focus(); return; }
      if (!dir || i === -1) return;
      e.preventDefault();
      vis[(i + dir + vis.length) % vis.length].focus();
    }
    pins.forEach(function (p) { p.addEventListener('keydown', function (e) { arrows(pins, e, { next: ['ArrowRight', 'ArrowDown'], prev: ['ArrowLeft', 'ArrowUp'] }); }); });
    items.forEach(function (b) { b.addEventListener('keydown', function (e) { arrows(items, e, { next: ['ArrowDown', 'ArrowRight'], prev: ['ArrowUp', 'ArrowLeft'] }); }); });

    // Esc closes the card when focus is in the map, or nowhere in particular
    // (Safari does not focus buttons on click) while the map is on screen
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || compact || !store.get().active) return;
      var ae = doc.activeElement, r = mapEl.getBoundingClientRect();
      var free = !ae || ae === doc.body || root.contains(ae);
      if (free && r.bottom > 0 && r.top < innerHeight) close(true);
    });

    /* ---------------- layout ---------------- */
    var rt;
    function relayout() { clearTimeout(rt); rt = setTimeout(function () { placeCard(store.get()); }, 60); }
    if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(canvas);
    else addEventListener('resize', relayout);
    var onMQ = function () { if (isSheet() && store.get().active && !root.dataset.userOpened) store.set({ active: null }); relayout(); };
    if (sheetMQ.addEventListener) sheetMQ.addEventListener('change', onMQ);
    // images inside the card change its height once they load
    cards.forEach(function (c) { var im = c.querySelector('img'); if (im) im.addEventListener('load', relayout); });

    // centre phones on the heart of the Ashram to begin with
    if (scroller && isSheet()) {
      var startPin = pinOf[initial];
      if (startPin) scroller.scrollLeft = parseFloat(startPin.style.getPropertyValue('--x')) / 100 * 640 - scroller.clientWidth / 2;
    }
    // the swipe hint fades once the visitor has moved the map themselves
    if (scroller) setTimeout(function () {
      scroller.addEventListener('scroll', function () { root.classList.add('has-swiped'); }, { passive: true, once: true });
    }, 400);

    /* ---------------- arrive: pins drop, thread draws, card opens ---------------- */
    root.classList.add('is-armed');
    render(store.get(), null);
    function goLive() {
      if (root.classList.contains('is-live')) return;
      root.classList.add('is-live');
      if (!compact && !isSheet() && !store.get().active) {
        // the first card opens by itself, so keep it out of the live region
        setTimeout(function () {
          if (store.get().active || isSheet()) return;
          if (live) live.setAttribute('aria-live', 'off');
          store.set({ active: initial });
          setTimeout(function () { if (live) live.setAttribute('aria-live', 'polite'); }, 200);
        }, reduced ? 0 : 1000);
      }
    }
    // arrival: the canvas carries the shared data-reveal, so site.js (and
    // DP.reveal) decide when the map has been seen; the pins and the thread
    // key off its .is-in in CSS, and here the first card follows.
    var arrived = function () { return canvas.classList.contains('is-in') || !canvas.hasAttribute('data-reveal'); };
    if (reduced || arrived()) goLive();
    else {
      var mo = new MutationObserver(function () { if (arrived()) { mo.disconnect(); goLive(); } });
      mo.observe(canvas, { attributes: true, attributeFilter: ['class'] });
    }
    // phones: the sheet belongs to the map, so it closes once the map has gone
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting && isSheet() && store.get().active) store.set({ active: null });
    }, { threshold: 0 }).observe(mapEl);
    root.addEventListener('click', function (e) { if (e.target.closest('.amap-pin, .amap-item, .amap-hl')) root.dataset.userOpened = '1'; });

    root.amap = { store: store, select: select, close: close };
  }

  Array.prototype.forEach.call(doc.querySelectorAll('[data-amap]'), init);
  DP.ashramMap = { init: init };
})();
