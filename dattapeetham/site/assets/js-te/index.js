/* Homepage behaviour (index.html). Plain IIFE, no frameworks.
   - video dialog for the hero, Sri Swamiji and tour videos (plain YouTube links without JS)
   - virtual-tour plates when GSAP is absent or motion is reduced
   - upcoming events hide themselves once past (dates are IST)
   - album rail buttons, waveform and breathing orb pause off-screen */
(function () {
  'use strict';
  var doc = document, DP = window.DP || {};
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ---------------- video dialog ---------------- */
  var dlg, stage, heading, opener;
  function buildDialog() {
    dlg = doc.createElement('dialog');
    dlg.className = 'ix-video-dialog';
    dlg.setAttribute('aria-labelledby', 'ix-video-title');
    dlg.innerHTML = '<div class="ix-vd-panel">' +
      '<div class="ix-vd-head"><p id="ix-video-title" class="ix-vd-title"></p>' +
      '<button type="button" class="ix-vd-close" aria-label="Close video"><svg class="ico" width="20" height="20" aria-hidden="true"><use href="#i-close"/></svg></button></div>' +
      '<div class="ix-vd-stage"></div>' +
      '<a class="ix-vd-yt" href="#">Watch on YouTube<svg class="ico" width="14" height="14" aria-hidden="true"><use href="#i-arrow-up-right"/></svg></a></div>';
    doc.body.appendChild(dlg);
    stage = $('.ix-vd-stage', dlg); heading = $('.ix-vd-title', dlg);
    $('.ix-vd-close', dlg).addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () {
      stage.innerHTML = '';
      doc.documentElement.classList.remove('ix-dialog-open');
      if (DP.lenis) DP.lenis.start();
      if (opener) opener.focus();
    });
  }
  function openVideo(id, title, from) {
    if (!dlg) buildDialog();
    opener = from;
    heading.textContent = title || 'Video';
    $('.ix-vd-yt', dlg).href = 'https://www.youtube.com/watch?v=' + id;
    var f = doc.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
    f.title = title || 'Video';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    f.allowFullscreen = true;
    stage.innerHTML = '';
    stage.appendChild(f);
    doc.documentElement.classList.add('ix-dialog-open');
    if (DP.lenis) DP.lenis.stop();
    dlg.showModal();
    $('.ix-vd-close', dlg).focus();
  }
  if (typeof HTMLDialogElement === 'function') {
    $$('[data-ix-video]').forEach(function (a) { a.setAttribute('aria-haspopup', 'dialog'); });
    doc.addEventListener('click', function (e) {
      var a = e.target.closest('[data-ix-video]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
      e.preventDefault();
      openVideo(a.dataset.ixVideo, a.dataset.ixTitle, a);
    });
  }

  /* ---------------- virtual tour without GSAP / with reduced motion ----------------
     motion.js drives the story when GSAP boots; this observer uses the same
     55% line, so the two never disagree. */
  $$('[data-story]').forEach(function (story) {
    var plates = $$('.story-plate', story), ticks = $$('.story-progress i', story), scenes = $$('.story-scene', story);
    if (!('IntersectionObserver' in window) || !plates.length) return;
    function show(i) {
      plates.forEach(function (p, k) { p.classList.toggle('is-on', k === i); });
      ticks.forEach(function (t, k) { t.classList.toggle('is-on', k === i); });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) show(scenes.indexOf(en.target)); });
    }, { rootMargin: '-55% 0px -45% 0px' });
    scenes.forEach(function (s) { io.observe(s); });
  });

  /* ---------------- upcoming events: hide what has passed (IST) ---------------- */
  var list = $('.ix-events-list');
  if (list) {
    var today;
    try { today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch (e) { today = ''; }
    if (/^\d{4}-\d{2}-\d{2}$/.test(today)) {
      var items = $$('[data-end]', list), left = 0;
      items.forEach(function (li) {
        var past = li.dataset.end < today;
        li.hidden = past;
        if (!past) left++;
        // an event under way gets an On now note after its tag (the label is its own string to translate)
        var tag = $('.tag', li), now = tag && $('.ix-now', tag), on = li.dataset.start <= today && today <= li.dataset.end;
        if (on && tag && !now) {
          var onNow = 'On now';
          now = doc.createElement('span');
          now.className = 'ix-now';
          now.textContent = ' · ' + onNow;
          tag.appendChild(now);
        }
        if (now) now.hidden = !on;
      });
      var none = $('[data-events-none]');
      if (none) none.hidden = left > 0;
      if (!left) { var chips = $('.ix-events .chips'); if (chips) chips.hidden = true; }
    }
  }

  /* ---------------- album rail ---------------- */
  $$('[data-rail]').forEach(function (box) {
    var rail = $('.ix-rail', box), prev = $('[data-rail-prev]', box), next = $('[data-rail-next]', box);
    if (!rail) return;
    function step(dir) {
      var card = rail.firstElementChild, w = card ? card.getBoundingClientRect().width + 16 : rail.clientWidth * 0.8;
      rail.scrollBy({ left: dir * Math.max(w, Math.floor(rail.clientWidth / w) * w), behavior: reduced ? 'auto' : 'smooth' });
    }
    function sync() {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      if (prev) prev.disabled = rail.scrollLeft <= 2;
      if (next) next.disabled = rail.scrollLeft >= max;
      rail.classList.toggle('at-end', rail.scrollLeft >= max);
    }
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
    rail.addEventListener('scroll', function () { requestAnimationFrame(sync); }, { passive: true });
    addEventListener('resize', sync);
    sync();
  });

  /* ---------------- breathing orb label + pause animations off-screen ---------------- */
  var breath = $('[data-breath]');
  if (breath && !reduced) {
    var orb = $('.ix-breath-orb i', breath), label = $('[data-breath-label]', breath), inhale = true;
    if (orb && label) orb.addEventListener('animationiteration', function () {
      inhale = !inhale;
      label.textContent = inhale ? 'శ్వాస పీల్చండి' : 'శ్వాస వదలండి';
    });
  }
  if ('IntersectionObserver' in window) {
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-paused', !en.isIntersecting); });
    });
    $$('.ix-wave, [data-breath]').forEach(function (el) { watch.observe(el); });
  }
})();
