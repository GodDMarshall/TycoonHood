/* Global Reach (centers.html) — page behaviour.
   1. Centres directory: a town/name search that works together with the
      shared country chips (site.js toggles .is-filtered on the groups); keeps
      the live count, empty state and region headings in step, and opens the
      Indian state panels that hold a match.
   2. Navanatha: links each Kshetra card to its syllable of Sri Swamiji's name
      (hover/focus lights both) and flashes the card a syllable jumps to.
   Without JS everything is listed, the search box stays hidden and the
   state panels open natively. */
(function () {
  'use strict';
  // Whole sentences with numbered slots (%1, %2) so translations can reorder them.
  var fmt = function (s) { var a = arguments; return s.replace(/%(\d)/g, function (m, i) { return a[+i]; }); };
  var doc = document;
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); };
  var fold = function (s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); };

  /* ---------------- 1. directory search ---------------- */
  var dir = doc.querySelector('[data-ce-dir]');
  if (dir) {
    var box = dir.querySelector('[data-ce-search]');
    var input = box && box.querySelector('input');
    var status = dir.querySelector('[data-ce-status]');
    var empty = dir.querySelector('[data-ce-empty]');
    var cards = $$('.ce-c', dir);
    var groups = $$('[data-ce-group]', dir);
    var regions = $$('[data-ce-region]', dir);
    var total = cards.length;
    var opened = [];   // state panels the search opened, closed again when it clears
    var timer;

    var chipOn = function (el) {
      var item = el.closest('[data-filter-item]');
      return !item || !item.classList.contains('is-filtered');
    };

    var refresh = function () {
      var q = input ? fold(input.value) : '';
      var terms = q ? q.split(/\s+/) : [];
      var shown = 0;

      cards.forEach(function (c) {
        // fold both sides so translated names match whatever Unicode form the visitor types
        var hay = c._q || (c._q = fold(c.getAttribute('data-q')));
        var hit = terms.every(function (t) { return hay.indexOf(t) !== -1; });
        c.classList.toggle('is-unmatched', !hit);
      });

      groups.forEach(function (g) {
        var n = $$('.ce-c:not(.is-unmatched)', g).length;
        g.classList.toggle('is-unmatched', n === 0);
        if (g.tagName === 'DETAILS') {
          if (q && n && !g.open) { g.open = true; opened.push(g); }
        }
        if (n && chipOn(g)) shown += n;
      });

      if (!q && opened.length) { opened.forEach(function (g) { g.open = false; }); opened = []; }

      regions.forEach(function (r) {
        var live = $$('[data-ce-group]', r).some(function (g) { return !g.classList.contains('is-unmatched') && chipOn(g); });
        r.classList.toggle('is-void', !live);
      });

      if (empty) empty.hidden = shown > 0;
      if (status) {
        status.textContent = shown === total
          ? fmt('ಇಲ್ಲಿ ಪಟ್ಟಿ ಮಾಡಲಾದ ಎಲ್ಲ %1 ಕೇಂದ್ರಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ', total)
          : q ? fmt('ಒಟ್ಟು %2 ಕೇಂದ್ರಗಳಲ್ಲಿ “%3” ಎಂಬುದಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುವ %1 ಕೇಂದ್ರಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ', shown, total, input.value.trim())
          : fmt('ಒಟ್ಟು %2 ಕೇಂದ್ರಗಳಲ್ಲಿ %1 ಕೇಂದ್ರಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ', shown, total);
      }
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    };

    if (box && input) {
      box.hidden = false;
      input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(refresh, 120); });
      input.addEventListener('keydown', function (e) { if (e.key === 'Escape' && input.value) { input.value = ''; refresh(); } });
    }
    // countries abroad start open (no JS: everything visible); on a phone they
    // fold into compact rows like the Indian states
    var folds = $$('[data-ce-fold]', dir);
    if (window.matchMedia && matchMedia('(max-width: 760px)').matches) folds.forEach(function (d) { d.open = false; });

    // the shared chip handler runs first (on the button); this runs as the click bubbles
    var chipRow = dir.querySelector('.chips');
    if (chipRow) chipRow.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-filter]');
      if (!chip) return;
      var one = dir.querySelector('[data-ce-fold][data-cc="' + chip.getAttribute('data-filter') + '"]');
      if (one) one.open = true;
      refresh();
    });
    refresh();
  }

  /* ---------------- 2. Navanatha: syllable <-> Kshetra ---------------- */
  var nv = doc.querySelector('.ce-nv');
  if (nv) {
    var syl = $$('.ce-syl-a', nv);
    var nvCards = $$('.ce-nv-card', nv);
    var pair = function (i) {
      return { s: nv.querySelector('.ce-syl-a[data-i="' + i + '"]'), c: nv.querySelector('.ce-nv-card[data-i="' + i + '"]') };
    };
    var light = function (i, on) {
      var p = pair(i);
      if (p.s) p.s.classList.toggle('is-lit', on);
      if (p.c) p.c.classList.toggle('is-lit', on);
    };
    nvCards.forEach(function (card) {
      var i = card.getAttribute('data-i');
      card.addEventListener('pointerenter', function () { light(i, true); });
      card.addEventListener('pointerleave', function () { light(i, false); });
      card.addEventListener('focusin', function () { light(i, true); });
      card.addEventListener('focusout', function () { light(i, false); });
    });
    syl.forEach(function (a) {
      var i = a.getAttribute('data-i');
      a.addEventListener('pointerenter', function () { light(i, true); });
      a.addEventListener('pointerleave', function () { light(i, false); });
      a.addEventListener('focus', function () { light(i, true); });
      a.addEventListener('blur', function () { light(i, false); });
      a.addEventListener('click', function () {
        var c = pair(i).c;
        if (!c) return;
        c.classList.remove('is-flash');
        void c.offsetWidth;
        c.classList.add('is-flash');
        setTimeout(function () { c.classList.remove('is-flash'); }, 1700);
      });
    });
  }
})();
