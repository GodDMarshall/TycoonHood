/* Temples & Darshan — page behaviour (no dependencies).
   1. Sticky shrine navigator: follows the header, lights the current shrine.
   2. "ಆಶ್ರಮದಲ್ಲಿ ಒಂದು ದಿನ": a sun marks the time in Mysuru; next ritual flagged.
   3. Next weekend laser show at the Karya Siddhi Hanuman temple, and an
      open/closed status for the two temples that publish their own hours.
   4. Birth Date Pillars: today'ರ ಸ್ತಂಭ, ಮತ್ತು ಸಂದರ್ಶಕರಿಗಾಗಿ ದಿನಾಂಕ ಆಯ್ಕೆ ಸಾಧನ's day.
   5. Dated festival entries disappear once they have passed.
   Everything is readable without this script; it only adds live state. */
(function () {
  'use strict';
  // Whole sentences with numbered slots (%1, %2) so translations can reorder them.
  var fmt = function (s) { var a = arguments; return s.replace(/%(\d)/g, function (m, i) { return a[+i]; }); };
  var doc = document;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MONTHS = ['ಜನವರಿ', 'ಫೆಬ್ರವರಿ', 'ಮಾರ್ಚ್', 'ಏಪ್ರಿಲ್', 'ಮೇ', 'ಜೂನ್', 'ಜುಲೈ', 'ಆಗಸ್ಟ್', 'ಸೆಪ್ಟೆಂಬರ್', 'ಅಕ್ಟೋಬರ್', 'ನವೆಂಬರ್', 'ಡಿಸೆಂಬರ್'];
  var DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var WEEK = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  // Date and time in Mysuru (IST), whatever the visitor's own time zone.
  function ist() {
    var o = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, day: WEEK[o.weekday], mins: +o.hour * 60 + +o.minute, label: o.hour + ':' + o.minute, iso: o.year + '-' + o.month + '-' + o.day };
  }
  // Times written by this script: 'ರಾತ್ರಿ 7:10' / 'ಬೆಳಿಗ್ಗೆ 6' on English pages. Other
  // languages get the part of the day in words around the 12-hour clock
  // ('ಸಂಜೆ %1' → 'ಸಂಜೆ 7:10'), so each can word and order it its own way.
  var EN = (doc.documentElement.getAttribute('lang') || 'en').slice(0, 2) === 'en';
  function dayPart(h) {
    if (h === 4) return 'ಬೆಳಿಗ್ಗೆ %1';
    if (h >= 5 && h < 12) return 'ಬೆಳಿಗ್ಗೆ %1';
    if (h === 12) return 'ಮಧ್ಯಾಹ್ನ %1';
    if (h >= 13 && h < 16) return 'ಮಧ್ಯಾಹ್ನ %1';
    if (h >= 16 && h < 19) return 'ಸಂಜೆ %1';
    return 'ರಾತ್ರಿ %1';
  }
  // short: drop ':00' on the hour ('ಬೆಳಿಗ್ಗೆ 6' rather than '6:00 AM')
  function clock12(m, short) {
    var h = Math.floor(m / 60), mm = m % 60;
    var t = (h % 12 || 12) + (short && !mm ? '' : ':' + String(mm).padStart(2, '0'));
    return EN ? t + ' ' + (h >= 12 ? 'PM' : 'AM') : fmt(dayPart(h), t);
  }
  function fmt12(m) { return clock12(m, false); }

  /* ---------------- 1. sticky shrine navigator ---------------- */
  var nav = $('[data-dn-nav]');
  if (nav) {
    var header = $('[data-header]');
    var scroller = $('[data-dn-nav-scroll]', nav), lamp = $('[data-dn-lamp]', nav);
    var chips = $$('[data-dn-chip]', nav);
    var sections = chips.map(function (c) { return doc.getElementById(c.getAttribute('data-dn-chip')); });
    var current = null, raf = 0;

    var syncHeader = function () { nav.classList.toggle('is-raised', !!header && header.classList.contains('is-hidden')); };
    if (header && 'MutationObserver' in window) new MutationObserver(syncHeader).observe(header, { attributes: true, attributeFilter: ['class'] });
    syncHeader();

    var placeLamp = function (chip) {
      if (!chip) { lamp.style.opacity = '0'; return; }
      lamp.style.opacity = '1';
      lamp.style.width = chip.offsetWidth + 'px';
      lamp.style.transform = 'translateX(' + chip.offsetLeft + 'px)';
    };
    var setActive = function (id, force) {
      if (id === current && !force) return;
      current = id;
      var active = null;
      chips.forEach(function (c) {
        var on = c.getAttribute('data-dn-chip') === id;
        if (on) { c.setAttribute('aria-current', 'true'); active = c; } else c.removeAttribute('aria-current');
      });
      placeLamp(active);
      // keep the lit chip in view when the row scrolls sideways (phones)
      if (active && scroller.scrollWidth > scroller.clientWidth + 2) {
        var left = active.offsetLeft - (scroller.clientWidth - active.offsetWidth) / 2;
        scroller.scrollTo({ left: Math.max(0, left), behavior: reduced ? 'auto' : 'smooth' });
      }
    };
    var update = function () {
      raf = 0;
      var line = innerHeight * 0.42, id = null;
      for (var i = 0; i < sections.length; i++) {
        var s = sections[i];
        if (!s) continue;
        var r = s.getBoundingClientRect();
        if (r.top <= line) id = s.id;
        if (i === sections.length - 1 && r.bottom < line * 0.5) id = null; // past the Mandir Nagari
      }
      setActive(id);
    };
    var schedule = function () { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', function () { setActive(current, true); schedule(); });
    update();
  }

  /* ---------------- 2. a day at the Ashram ---------------- */
  var track = $('[data-dn-day]');
  var LASER = [1150, 1180, 1210]; // 7:10, 7:40, 8:10 PM, Saturdays and Sundays
  function updateDay(now) {
    if (!track) return;
    var start = +track.getAttribute('data-start'), end = +track.getAttribute('data-end');
    var sun = $('[data-dn-now]', track), wrap = $('[data-dn-now-wrap]'), text = $('[data-dn-now-text]');
    if (sun) {
      var inDay = now.mins >= start && now.mins <= end;
      sun.hidden = !inDay;
      if (inDay) sun.style.left = ((now.mins - start) / (end - start) * 100).toFixed(3) + '%';
      var lbl = $('[data-dn-now-label]', sun); if (lbl) lbl.textContent = fmt('ಈಗ %1 IST', now.label);
    }
    if (wrap && text) { wrap.hidden = false; text.textContent = fmt('ಮೈಸೂರಿನಲ್ಲಿ ಈಗ · %1 IST', now.label); }
    var weekend = now.day === 0 || now.day === 6, nextSet = false;
    $$('.dn-day-events li', track).forEach(function (li) {
      var m = +li.getAttribute('data-m'), skip = li.hasAttribute('data-weekend') && !weekend;
      li.classList.toggle('is-past', m <= now.mins);
      var isNext = !nextSet && !skip && m > now.mins;
      li.classList.toggle('is-next', isNext);
      if (isNext) nextSet = true;
    });
    $$('.dn-week li').forEach(function (li) {
      var days = (li.getAttribute('data-days') || '').split(' ').map(Number);
      li.classList.toggle('is-today', days.length < 7 && days.indexOf(now.day) !== -1);
    });
  }

  /* ---------------- 3. next laser show ---------------- */
  function laserText(now) {
    if (now.day === 0 || now.day === 6) {
      for (var i = 0; i < LASER.length; i++) if (LASER[i] > now.mins) return fmt('ಇಂದು · %1', fmt12(LASER[i]));
      return now.day === 6 ? fmt('ನಾಳೆ · %1', fmt12(LASER[0])) : fmt('ಶನಿವಾರ · %1', fmt12(LASER[0]));
    }
    return fmt('ಶನಿವಾರ · %1', fmt12(LASER[0]));
  }

  // Hours as published on each temple's own page (minutes after midnight IST).
  var TEMPLES = {
    sdvt: { wk: [[360, 720], [1020, 1200]], we: [[360, 720], [990, 1230]] },
    hanuman: { wk: [[390, 750], [1020, 1200]], we: [[390, 750], [1020, 1230]] }
  };
  function short12(m) { return clock12(m, true); }
  function templeStatus(t, now) {
    var s = now.day === 0 || now.day === 6 ? t.we : t.wk;
    for (var i = 0; i < s.length; i++) {
      if (now.mins >= s[i][0] && now.mins < s[i][1]) return { open: true, text: fmt('ಈಗ ತೆರೆದಿದೆ · ಮುಚ್ಚುವ ಸಮಯ: %1', short12(s[i][1])) };
      if (now.mins < s[i][0]) return { open: false, text: fmt('ಮುಚ್ಚಿದೆ · ತೆರೆಯುವ ಸಮಯ: %1', short12(s[i][0])) };
    }
    var tomorrow = (now.day + 1) % 7, first = (tomorrow === 0 || tomorrow === 6 ? t.we : t.wk)[0][0];
    return { open: false, text: fmt('ಮುಚ್ಚಿದೆ · ನಾಳೆ ತೆರೆಯುವ ಸಮಯ: %1', short12(first)) };
  }
  function updateTemples(now) {
    Object.keys(TEMPLES).forEach(function (k) {
      var st = templeStatus(TEMPLES[k], now);
      $$('[data-dn-badge="' + k + '"]').forEach(function (el) { el.textContent = st.text; el.className = 'badge ' + (st.open ? 'open' : 'closed'); });
      $$('[data-dn-status="' + k + '"]').forEach(function (el) { el.textContent = st.text; });
    });
  }

  /* ---------------- 5. dated festival entries ---------------- */
  function pruneUpcoming(now) {
    var box = $('[data-dn-upcoming]');
    if (!box) return;
    var shown = 0;
    $$('[data-until]', box).forEach(function (li) {
      var past = li.getAttribute('data-until') < now.iso;
      li.hidden = past;
      if (!past) shown++;
    });
    box.hidden = shown === 0;
  }

  function tick() {
    var now = ist();
    updateDay(now);
    $$('[data-dn-laser]').forEach(function (el) { el.textContent = laserText(now); });
    updateTemples(now);
    pruneUpcoming(now);
    return now;
  }
  var now = tick();
  setInterval(tick, 30000);

  /* ---------------- 4. Birth Date Pillars ---------------- */
  var grid = $('[data-dn-bp]'), form = $('[data-dn-bp-form]');
  if (grid) {
    var today = $('[data-md="' + now.m + '-' + now.d + '"]', grid);
    if (today) today.classList.add('is-today');
  }
  if (grid && form) {
    var month = form.elements.month, day = form.elements.day, out = $('[data-dn-bp-out]', form), touched = false;
    month.value = String(now.m); day.value = String(now.d);
    var fitDays = function () {
      var max = DAYS_IN[+month.value - 1];
      Array.prototype.forEach.call(day.options, function (o) { o.disabled = o.hidden = +o.value > max; });
      if (+day.value > max) day.value = String(max);
    };
    var pick = function () {
      fitDays();
      if (!touched) { out.textContent = 'ಸ್ತಂಭವನ್ನು ಕಂಡುಕೊಳ್ಳಲು ಜನ್ಮದಿನಾಂಕವನ್ನು ಆಯ್ಕೆಮಾಡಿ.'; return; }
      $$('.is-picked', grid).forEach(function (i) { i.classList.remove('is-picked'); });
      var key = month.value + '-' + day.value, el = $('[data-md="' + key + '"]', grid);
      if (el) el.classList.add('is-picked');
      out.textContent = fmt('ಹಾದಿಯುದ್ದಕ್ಕೂ %1 %2 ದಿನಾಂಕದ ಸ್ತಂಭವನ್ನು ಹುಡುಕಿ — ಅದು ಆ ದಿನದ ದೇವತೆ ಮತ್ತು ಉಪದೇವತೆಯನ್ನು ಹೊಂದಿದೆ.', day.value, MONTHS[+month.value - 1]);
    };
    form.addEventListener('change', function () { touched = true; pick(); });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    pick();
  }
})();
