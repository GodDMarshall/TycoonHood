/* Plan Your Visit — page behaviour (no dependencies).
   1. 24-hour dial: the "now" bead sweeps from midnight to the current time in
      Mysuru (IST) when the dial is first seen, then keeps time.
   2. "इस पृष्ठ पर" bar: scrollspy sets aria-current on the visible section.
   3. Hotels: sort each table by distance or price (FLIP-animated rows).
   4. Mysuru guide: a place's row and its bead on the golden thread light
      together on hover.
   Without JS the page shows every fact; under reduced motion nothing sweeps. */
(function () {
  'use strict';
  var doc = document;
  var DP = window.DP || {};
  var reduced = DP.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var EASE = 'cubic-bezier(.22, 1, .36, 1)';

  function istMins() {
    if (DP.istNow) return DP.istNow().mins;
    var d = new Date();
    return ((d.getUTCHours() * 60 + d.getUTCMinutes() + 330) % 1440);
  }

  /* ---------------- 1. day dial ---------------- */
  var dial = $('[data-dial]');
  if (dial) {
    var hand = $('[data-dial-hand]', dial);
    var day = 0, last = -1, started = false;
    // Midnight sits at the bottom (180deg); the angle only ever grows, so the
    // bead always travels forward, even across midnight.
    var place = function () {
      var m = istMins();
      if (last !== -1 && m < last) day += 1;
      last = m;
      hand.style.setProperty('--a', (180 + m / 4 + day * 360).toFixed(2) + 'deg');
    };
    var start = function () {
      if (started) return;
      started = true;
      dial.classList.add('is-live');
      if (reduced) { hand.style.transition = 'none'; place(); }
      else setTimeout(place, 260);
      setInterval(place, 30000);
    };
    if (reduced || !('IntersectionObserver' in window)) start();
    else {
      var dio = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { dio.disconnect(); start(); } }, { threshold: 0.3 });
      dio.observe(dial);
    }
  }

  /* ---------------- 2. scrollspy for the "इस पृष्ठ पर" bar ---------------- */
  var nav = $('[data-vs-nav]');
  if (nav && 'IntersectionObserver' in window) {
    var links = $$('[data-spy]', nav);
    var list = $('ul', nav);
    var current = null;
    var setActive = function (id) {
      if (id === current) return;
      current = id;
      links.forEach(function (a) {
        if (a.getAttribute('data-spy') === id) {
          a.setAttribute('aria-current', 'location');
          // keep the active link in view inside the bar only (never scroll the page)
          var left = a.offsetLeft - (list.clientWidth - a.offsetWidth) / 2;
          if (list.scrollWidth > list.clientWidth) list.scrollTo({ left: Math.max(0, left), behavior: reduced ? 'auto' : 'smooth' });
        } else a.removeAttribute('aria-current');
      });
    };
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        setActive(en.target.id === 'welcome' ? null : en.target.id);
      });
    }, { rootMargin: '-140px 0px -58% 0px' });
    links.forEach(function (a) { var s = doc.getElementById(a.getAttribute('data-spy')); if (s) spy.observe(s); });
    var welcome = doc.getElementById('welcome');
    if (welcome) spy.observe(welcome);
  }

  /* ---------------- 3. hotel sorting ---------------- */
  var status = $('[data-sort-status]');
  $$('#stay .tab-panel').forEach(function (panel) {
    var tbody = $('tbody', panel);
    var buttons = $$('[data-sort]', panel);
    if (!tbody || !buttons.length) return;
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-sort');
        var rows = $$('tr', tbody);
        var before = rows.map(function (r) { return r.getBoundingClientRect().top; });
        var sorted = rows.slice().sort(function (x, y) {
          return (parseFloat(x.dataset[key]) - parseFloat(y.dataset[key])) || (x.dataset.order - y.dataset.order);
        });
        sorted.forEach(function (r) { tbody.appendChild(r); });
        if (!reduced && rows[0].animate) {
          rows.forEach(function (r, i) {
            var dy = before[i] - r.getBoundingClientRect().top;
            if (Math.abs(dy) > 1) r.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 650, easing: EASE });
          });
        }
        buttons.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        if (status) status.textContent = 'होटल क्रमबद्ध: ' + b.textContent.trim().toLowerCase() + '.';
      });
    });
  });

  /* ---------------- 4. Mysuru guide: rows ↔ beads ---------------- */
  $$('[data-place-row]').forEach(function (row) {
    var bead = $('[data-bead="' + row.getAttribute('data-place-row') + '"]');
    if (!bead) return;
    var on = function () { bead.classList.add('is-hot'); row.classList.add('is-hot'); };
    var off = function () { bead.classList.remove('is-hot'); row.classList.remove('is-hot'); };
    row.addEventListener('mouseenter', on); row.addEventListener('mouseleave', off);
    bead.addEventListener('mouseenter', on); bead.addEventListener('mouseleave', off);
  });
})();
