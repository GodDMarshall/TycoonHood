/* Events & Festivals page (events.html).
   1. Dated entries: "Concluded" / "ఇప్పుడు జరుగుతోంది" / "N రోజుల్లో", from today's
      date in Mysuru (IST). The markup already lists every entry; this only labels.
   2. Month by month: marks this month and the next entry; per-month counts
      follow the filter chips (filtering itself is site.js). On phones the
      months already past fold behind a "గత నెలలను చూపించండి" button.
   3. Festival year: lunar-month radiogroup (arrow keys, Home/End) driving the
      wheel and the month panels; "today" on the Gregorian ring. Without JS all
      twelve panels are listed and the wheel is drawn in its finished state.
   4. TV: a "ఇప్పుడు మైసూరులో" marker on the day ribbon.
   5. Concerts: marks the next Raga Sagara on the list. */
(function () {
  'use strict';
  // Whole sentences with numbered slots (%1, %2) so translations can reorder them.
  var fmt = function (s) { var a = arguments; return s.replace(/%(\d)/g, function (m, i) { return a[+i]; }); };
  var doc = document, DP = window.DP || {};
  var reduced = DP.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ---------------- today in Mysuru ---------------- */
  var parts = {};
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
  } catch (e) { var d = new Date(); parts = { year: String(d.getFullYear()), month: ('0' + (d.getMonth() + 1)).slice(-2), day: ('0' + d.getDate()).slice(-2) }; }
  var today = parts.year + '-' + parts.month + '-' + parts.day;
  function dayDiff(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5); }

  /* ---------------- 1. statuses ---------------- */
  $$('[data-start][data-end]').forEach(function (el) {
    var s = el.getAttribute('data-start'), e = el.getAttribute('data-end'), st = $('[data-ev-status]', el), txt;
    if (e < today) { el.classList.add('is-past'); txt = 'Concluded'; }
    else if (s <= today) { el.classList.add('is-now'); txt = 'ఇప్పుడు జరుగుతోంది'; }
    else { el.classList.add('is-ahead'); var n = dayDiff(today, s); txt = n === 1 ? 'Tomorrow' : fmt('In %1 days', n); }
    if (st) { st.textContent = txt; st.hidden = false; st.classList.toggle('is-now', el.classList.contains('is-now')); }
  });
  var feature = $$('.ev-fcard');
  if (feature.length && feature.every(function (c) { return c.classList.contains('is-past'); })) {
    var allPast = $('[data-ev-allpast]'); if (allPast) allPast.hidden = false;
  }
  function markNext(rows) {
    rows.forEach(function (r) { r.classList.remove('is-next'); });
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].classList.contains('is-filtered') || rows[i].classList.contains('is-past')) continue;
      if (!rows[i].classList.contains('is-now')) rows[i].classList.add('is-next');
      return;
    }
  }

  /* ---------------- 2. month by month ---------------- */
  var list = $('[data-ev-months]');
  if (list) {
    var months = $$('.ev-month', list), current = today.slice(0, 7), allRows = $$('.ev-row', list);
    var earlier = $('[data-ev-earlier]'), earlierLabel = earlier && $('span', earlier);
    months.forEach(function (m) {
      var k = m.getAttribute('data-month');
      if (k < current) m.classList.add('is-past');
      if (k === current) m.classList.add('is-current');
    });
    markNext(allRows);

    // phones: months already gone fold behind one button (CSS hides them only
    // on narrow screens, and only while this class is set)
    var pastWithMatches = function () {
      return months.filter(function (m) { return m.classList.contains('is-past') && $('.ev-row:not(.is-filtered)', m); });
    };
    var aheadWithMatches = function () {
      return months.filter(function (m) { return !m.classList.contains('is-past') && $('.ev-row:not(.is-filtered)', m); });
    };
    var setFold = function (folded) {
      list.classList.toggle('fold-past', folded);
      earlier.setAttribute('aria-expanded', String(!folded));
      var n = pastWithMatches().length;
      earlierLabel.textContent = folded ? (n === 1 ? 'Show 1 earlier month' : fmt('Show %1 earlier months', n)) : 'గత నెలలను దాచండి';
      earlier.hidden = n === 0;
    };
    var opened = false;
    if (earlier && earlierLabel && pastWithMatches().length && aheadWithMatches().length) {
      setFold(true);
      earlier.addEventListener('click', function () { opened = !opened; setFold(!opened); });
    }

    // keep counts, the "next" badge and the fold in step with the filter chips
    var scope = list.closest('[data-filter-scope]');
    if (scope) scope.addEventListener('click', function (e) {
      if (!e.target.closest('[data-filter]')) return;
      setTimeout(function () {
        months.forEach(function (m) {
          var c = $('[data-ev-count]', m);
          if (c) c.textContent = $$('.ev-row:not(.is-filtered)', m).length;
        });
        markNext(allRows);
        if (!earlier || !earlierLabel) return;
        if (!aheadWithMatches().length) { list.classList.remove('fold-past'); earlier.hidden = true; }
        else if (!pastWithMatches().length) earlier.hidden = true;
        else setFold(!opened);
      }, 0);
    });
  }

  /* ---------------- 3. festival year ---------------- */
  var svg = $('.fy-wheel'), ribbon = $('[data-fy-ribbon]'), box = $('[data-fy-panels]');
  var frac = 0;
  if (svg) {
    var y = +parts.year, leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    frac = dayDiff(parts.year + '-01-01', today) / (leap ? 366 : 365);
    var tg = $('[data-fy-today]', svg);
    if (tg) tg.setAttribute('transform', 'rotate(' + (frac * 360).toFixed(2) + ')');
    svg.style.setProperty('--sofar', frac.toFixed(4));
    svg.classList.add('has-today');
    var key = $('[data-fy-today-key]'); if (key) key.hidden = false;
  }
  if (svg && ribbon && box) {
    var radios = $$('[role="radio"]', ribbon), panels = $$('.fy-panel', box);
    var cname = $('[data-fy-cname]', svg), csub = $('[data-fy-csub]', svg), wheelBits = $$('[data-month]', svg);
    box.classList.add('is-tabbed');

    var centre = function (r) {
      if (ribbon.scrollWidth <= ribbon.clientWidth + 2) return;
      var to = r.offsetLeft - (ribbon.clientWidth - r.offsetWidth) / 2;
      if (ribbon.scrollTo) ribbon.scrollTo({ left: to, behavior: reduced ? 'auto' : 'smooth' }); else ribbon.scrollLeft = to;
    };
    var select = function (id, focus) {
      var chosen = null;
      radios.forEach(function (r) {
        var on = r.getAttribute('data-month') === id;
        r.setAttribute('aria-checked', String(on));
        r.tabIndex = on ? 0 : -1;
        if (on) chosen = r;
      });
      panels.forEach(function (p) {
        var on = p.getAttribute('data-month') === id;
        p.hidden = !on;
        if (on && DP.reveal) DP.reveal(p);
      });
      wheelBits.forEach(function (el) { el.classList.toggle('is-sel', el.getAttribute('data-month') === id); });
      if (chosen) {
        if (focus) chosen.focus();
        centre(chosen);
        cname.textContent = $('b', chosen).textContent;
        // the month span (Mar – Apr) becomes ABOUT MAR TO APR: one sentence with two slots
        var span = $('small', chosen).textContent.split(/\s*[–-]\s*/);
        csub.textContent = span.length > 1 ? fmt('About %1 to %2', span[0], span.slice(1).join(' – ')) : span[0];
      }
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };

    radios.forEach(function (r, i) {
      r.addEventListener('click', function () { select(r.getAttribute('data-month')); });
      r.addEventListener('keydown', function (e) {
        var n = radios.length, j = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + n) % n;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = n - 1;
        if (j !== null) { e.preventDefault(); select(radios[j].getAttribute('data-month'), true); }
      });
    });
    $$('.fy-seg, .fy-mark', svg).forEach(function (s) {
      s.addEventListener('click', function () { select(s.getAttribute('data-month')); });
    });

    // links into a month panel (e.g. "దత్త జయంతి గురించి") open that month first
    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#fy-p-"]');
      if (a) select(a.getAttribute('href').slice(6));
    }, true);

    // open on the month of the next dated festival; otherwise the month around today
    var best = null;
    $$('[data-fest-end]', box).forEach(function (el) {
      if (el.getAttribute('data-fest-end') >= today && (!best || el.getAttribute('data-fest-start') < best.getAttribute('data-fest-start'))) best = el;
    });
    var initial = best ? best.closest('.fy-panel').getAttribute('data-month') : null;
    if (!initial) {
      var idx = Math.floor((((frac * 360 - 79) % 360) + 360) % 360 / 30);
      initial = radios[idx] ? radios[idx].getAttribute('data-month') : radios[0].getAttribute('data-month');
    }
    var hashMonth = /^#fy-p-([a-z]+)$/.exec(location.hash);
    select(hashMonth && $('#fy-p-' + hashMonth[1]) ? hashMonth[1] : initial);
  }

  /* ---------------- 4. TV: now in Mysuru ---------------- */
  var now = $('[data-tv-now]'), nowLabel = $('[data-tv-now-label]');
  if (now && nowLabel && DP.istNow) {
    var tick = function () {
      var t = DP.istNow(), x = t.mins / 1440;
      now.style.setProperty('--x', (x * 100).toFixed(2) + '%');
      nowLabel.textContent = fmt('Now in Mysuru · %1 IST', t.label);
      // keep the label inside the ribbon at either end of the day
      var cw = now.parentNode.clientWidth, half = nowLabel.offsetWidth / 2, at = x * cw;
      now.classList.toggle('to-left', at + half > cw);
      now.classList.toggle('to-right', at - half < 0);
    };
    now.hidden = false; tick(); setInterval(tick, 30000); addEventListener('resize', tick);
  }

  /* ---------------- 5. concerts ---------------- */
  var crow = $$('.ec-row').filter(function (r) { return !r.classList.contains('is-past'); })[0];
  if (crow) crow.classList.add('is-next');
  var card = $('.ec-next'), label = $('[data-ec-label]');
  if (card && label) {
    if (card.classList.contains('is-now')) label.textContent = 'Today';
    else if (card.classList.contains('is-past')) label.textContent = 'క్యాలెండర్‌లో తాజా సమాచారం';
  }
})();
