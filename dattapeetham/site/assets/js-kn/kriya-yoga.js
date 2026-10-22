/* Datta Kriya Yoga page: breath circle controls and the world map.
   The breath circle and map pulses are pure CSS; this script only pauses them
   while off-screen, offers a pause button, and links country chips to map pins.
   Under reduced motion nothing here starts and the CSS shows a still state. */
(function () {
  'use strict';
  var DP = window.DP || {};
  var reduced = typeof DP.reduced === 'boolean' ? DP.reduced : matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  function watchVisibility(el) {
    if (!hasIO) return;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { el.classList.toggle('is-offscreen', !en.isIntersecting); });
    }, { rootMargin: '80px 0px' }).observe(el);
  }

  /* ---------- breath circle ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-breath]'), function (box) {
    if (reduced) return;
    watchVisibility(box);
    var btn = box.querySelector('[data-breath-toggle]');
    if (!btn) return;
    var label = btn.querySelector('span');
    btn.hidden = false;
    btn.addEventListener('click', function () {
      var paused = box.classList.toggle('is-paused');
      label.textContent = paused ? 'Resume the circle' : 'ವೃತ್ತದ ಚಲನೆಯನ್ನು ನಿಲ್ಲಿಸಿ';
    });
  });

  /* ---------- world map ---------- */
  var map = document.querySelector('[data-ky-map]');
  if (!map) return;
  if (!reduced) watchVisibility(map);

  var list = document.querySelector('[data-ky-countries]');
  if (!list) return;
  var pins = map.querySelectorAll('.ky-pin[data-c]');
  var labels = map.querySelectorAll('.ky-map-label[data-for]');
  var current = null;

  function highlight(id) {
    if (id === current) return;
    current = id;
    Array.prototype.forEach.call(pins, function (p) { p.classList.toggle('is-hot', !!id && p.getAttribute('data-c') === id); });
    Array.prototype.forEach.call(labels, function (l) { l.classList.toggle('is-hot', !!id && (' ' + l.getAttribute('data-for') + ' ').indexOf(' ' + id + ' ') > -1); });
  }

  list.addEventListener('pointerover', function (e) {
    var li = e.target.closest && e.target.closest('li[data-c]');
    highlight(li ? li.getAttribute('data-c') : null);
  });
  list.addEventListener('pointerleave', function () { highlight(null); });
})();
