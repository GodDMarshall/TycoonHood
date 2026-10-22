/* Feature: world-map — wakes the Global Reach map when it scrolls into view,
   holds its looping light still while off-screen or in a hidden tab, and links
   the legend (and the map's own nodes) to the golden threads.
   Markup: src/features/world-map.mjs · styles: assets/css/features/world-map.css
   No JS → the map is already drawn and still. Reduced motion → same. */
(function () {
  'use strict';
  var doc = document;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var slice = function (l) { return Array.prototype.slice.call(l); };

  slice(doc.querySelectorAll('[data-world-map]')).forEach(function (root) {
    var stage = root.querySelector('.wm-stage');
    var keys = slice(root.querySelectorAll('.wm-key[data-code], .wm-chip[data-code]'));
    var marks = slice(root.querySelectorAll('.wm-route[data-code], .wm-node[data-code], .wm-cdots[data-code]'));
    var nodes = slice(root.querySelectorAll('.wm-node[data-code]'));
    var readout = root.querySelector('.wm-readout');
    var roEyebrow = root.querySelector('[data-wm-eyebrow]');
    var roName = root.querySelector('[data-wm-name]');
    var roNote = root.querySelector('[data-wm-note]');
    var defaults = roName ? { eyebrow: roEyebrow.textContent, name: roName.textContent, note: roNote.textContent } : null;
    var pinned = null, hover = null, shown;

    /* ---- wake on view, pause off-screen ---- */
    if (reduced || !('IntersectionObserver' in window) || !stage) {
      root.classList.add('is-in');
    } else {
      var onScreen = false;
      var sync = function () { root.classList.toggle('is-paused', !onScreen || doc.hidden); };
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { onScreen = e.isIntersecting; });
        if (onScreen) root.classList.add('is-in');
        sync();
      }, { threshold: 0.15 }).observe(stage);
      doc.addEventListener('visibilitychange', sync);
    }

    /* ---- trace a country ---- */
    function keyFor(code) {
      for (var i = 0; i < keys.length; i++) if (keys[i].getAttribute('data-code') === code) return keys[i];
      return null;
    }
    function render() {
      var code = hover || pinned;
      root.classList.toggle('has-active', !!code);
      marks.forEach(function (m) { m.classList.toggle('is-active', m.getAttribute('data-code') === code); });
      keys.forEach(function (k) {
        var c = k.getAttribute('data-code');
        k.classList.toggle('is-active', c === code);
        k.setAttribute('aria-pressed', String(c === pinned));
      });
      if (roName && shown !== code) {
        shown = code;
        var k = code && keyFor(code);
        // a country with no legend entry (compact teaser) falls back to its node label
        var name = k ? k.getAttribute('data-name') : null;
        if (!name && code) { var n = root.querySelector('.wm-node[data-code="' + code + '"] .wm-label'); name = n ? n.textContent : code; }
        roEyebrow.textContent = code ? 'ಮೈಸೂರಿನಿಂದ' : defaults.eyebrow;
        roName.textContent = code ? name : defaults.name;
        roNote.textContent = code ? (k ? k.getAttribute('data-note') : '') : defaults.note;
        if (!reduced) { readout.classList.remove('is-swap'); void readout.offsetWidth; readout.classList.add('is-swap'); }
      }
    }
    function setHover(code) { if (hover !== code) { hover = code; render(); } }
    function toggle(code) { pinned = pinned === code ? null : code; hover = null; render(); }

    keys.forEach(function (k) {
      var code = k.getAttribute('data-code');
      k.addEventListener('click', function () { toggle(code); });
      k.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') setHover(code); });
      k.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') setHover(null); });
      // keyboard focus traces too; a tap's focus does not (the click pins instead)
      k.addEventListener('focus', function () { var fv = false; try { fv = k.matches(':focus-visible'); } catch (e) {} if (fv) setHover(code); });
      k.addEventListener('blur', function () { if (hover === code) setHover(null); });
    });
    nodes.forEach(function (n) {
      var code = n.getAttribute('data-code');
      n.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') setHover(code); });
      n.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') setHover(null); });
      n.addEventListener('click', function () { toggle(code); });
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && (pinned || hover)) { pinned = hover = null; render(); }
    });
  });
})();
