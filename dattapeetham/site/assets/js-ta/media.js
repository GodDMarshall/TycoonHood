/* Media & Teachings page (media.html).
   1. Reel: the film strip and the Datta Charitram episodes swap the featured
      player. Links point at YouTube, so everything works without JS; with JS
      they become toggle buttons. If a film is already playing, the new one
      starts at once; otherwise only the poster and the notes change.
   2. Rail: previous / next buttons over a native scroll-snap list.
   3. Chant player: custom controls over a native <audio> (shown without JS),
      with a waveform that fills as the chant plays and doubles as a seek bar.
   4. TV band: a "now" pin at the current time in Mysuru (IST). */
(function () {
  'use strict';
  // Whole sentences with numbered slots (%1, %2) so translations can reorder them.
  var fmt = function (s) { var a = arguments; return s.replace(/%(\d)/g, function (m, i) { return a[+i]; }); };
  var doc = document;
  var DP = window.DP || {};
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  /* ---------------- 1. reel ---------------- */
  var reel = $('[data-reel]');
  if (reel) {
    var stage = $('.reel-stage', reel);
    var vid = $('.reel-screen [data-yt]', reel);
    var poster = vid && $('img', vid);
    var vTitle = vid && $('.video-title', vid);
    var vPlay = vid && $('.video-play', vid);
    var infoBox = $('.reel-info', reel);
    var out = {
      tag: $('[data-reel-tag]', reel), title: $('[data-reel-title]', reel), text: $('[data-reel-text]', reel),
      link: $('[data-reel-link]', reel), extra: $('[data-reel-extra]', reel), index: $('[data-reel-index]', reel),
    };
    var items = $$('[data-reel-item]');
    var current = vid ? vid.dataset.yt : null;
    var swapTimer;

    var setPressed = function (id) {
      items.forEach(function (el) {
        el.removeAttribute('aria-current');
        el.setAttribute('aria-pressed', String(el.dataset.id === id));
      });
    };

    var inView = function (el) {
      var r = el.getBoundingClientRect();
      return r.top >= 60 && r.bottom <= innerHeight;
    };

    var select = function (el) {
      if (!vid) return;
      var d = el.dataset;
      if (d.id === current) {
        // same film: just make sure it is showing (and play it if asked twice)
        if (!inView(stage) && DP.scrollTo) DP.scrollTo(stage);
        return;
      }
      current = d.id;
      var wasPlaying = !!$('iframe', vid);
      var frame = $('iframe', vid);
      if (frame) frame.parentNode.removeChild(frame);
      delete vid.dataset.loaded;
      vid.dataset.yt = d.id;
      vid.dataset.title = d.title;
      setPressed(d.id);

      var apply = function () {
        poster.style.objectPosition = d.pos || '';
        var done = function () { vid.classList.remove('is-swapping'); infoBox.classList.remove('is-swapping'); };
        poster.onload = done; poster.onerror = done;
        poster.removeAttribute('loading');
        poster.src = d.poster;
        if (poster.complete) done();
        vTitle.textContent = d.title;
        vPlay.setAttribute('aria-label', 'வீடியோவை இயக்கு: ' + d.title);
        out.tag.textContent = d.tag || '';
        out.title.textContent = d.title;
        out.text.textContent = d.text || '';
        out.link.href = 'https://www.youtube.com/watch?v=' + d.id;
        if (d.extraHref) {
          out.extra.hidden = false;
          out.extra.href = d.extraHref;
          out.extra.innerHTML = d.extra + ' <svg class="ico" width="15" height="15" aria-hidden="true" focusable="false"><use href="#i-arrow-up-right"/></svg>';
        } else {
          out.extra.hidden = true;
        }
        out.index.textContent = d.index || '—';
        if (wasPlaying) vPlay.click();
      };

      clearTimeout(swapTimer);
      if (reduced) { apply(); }
      else {
        vid.classList.add('is-swapping');
        infoBox.classList.add('is-swapping');
        swapTimer = setTimeout(apply, 260);
      }
      if (!inView(stage) && DP.scrollTo) DP.scrollTo(stage);
    };

    items.forEach(function (el) {
      el.setAttribute('role', 'button');
      el.setAttribute('aria-pressed', String(el.dataset.id === current));
      el.setAttribute('aria-controls', 'reel-stage');
      el.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return; // let "புதிய தாவலில் திற" through
        e.preventDefault();
        select(el);
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); select(el); }
      });
    });

    /* ---------------- 2. rail buttons ---------------- */
    var rail = $('[data-reel-rail]', reel), prev = $('[data-reel-prev]', reel), next = $('[data-reel-next]', reel);
    if (rail && prev && next) {
      var update = function () {
        var max = rail.scrollWidth - rail.clientWidth - 2;
        prev.disabled = rail.scrollLeft <= 2;
        next.disabled = rail.scrollLeft >= max;
      };
      var step = function (dir) {
        rail.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
      };
      prev.addEventListener('click', function () { step(-1); });
      next.addEventListener('click', function () { step(1); });
      rail.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
      addEventListener('resize', update);
      update();
    }
  }

  /* ---------------- 3. chant player ---------------- */
  $$('[data-chant]').forEach(function (box) {
    var audio = $('audio', box), ui = $('[data-chant-ui]', box);
    if (!audio || !ui) return;
    var btn = $('[data-chant-play]', box), seek = $('[data-chant-seek]', box);
    var wave = $('.chant-wave', box), cur = $('[data-chant-cur]', box), dur = $('[data-chant-dur]', box);
    var seeking = false;
    var t = function (s) {
      if (!isFinite(s)) return '0:00';
      s = Math.max(0, Math.floor(s));
      var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      return (h ? h + ':' + pad(m) : m) + ':' + pad(sec);
    };
    box.classList.add('is-enhanced');
    ui.hidden = false;
    audio.removeAttribute('controls');

    var paint = function () {
      var d = audio.duration, p = d ? audio.currentTime / d : 0;
      wave.style.setProperty('--p', p.toFixed(4));
      if (!seeking) seek.value = Math.round(p * 1000);
      cur.textContent = t(audio.currentTime);
      seek.setAttribute('aria-valuetext', d ? fmt('Played %1 of %2', t(audio.currentTime), t(d)) : t(audio.currentTime));
    };
    var setState = function () {
      var playing = !audio.paused && !audio.ended;
      box.classList.toggle('is-playing', playing);
      btn.setAttribute('aria-label', playing ? 'ஜபத்தை இடைநிறுத்து' : 'ஜபத்தை இயக்கு');
    };

    btn.addEventListener('click', function () {
      if (audio.paused) {
        var pr = audio.play();
        if (pr && pr.catch) pr.catch(function () { setState(); });
      } else audio.pause();
    });
    audio.addEventListener('play', setState);
    audio.addEventListener('pause', setState);
    audio.addEventListener('ended', function () { setState(); audio.currentTime = 0; paint(); });
    audio.addEventListener('timeupdate', paint);
    audio.addEventListener('loadedmetadata', function () { dur.textContent = t(audio.duration); paint(); });
    audio.addEventListener('error', function () { dur.textContent = 'பதிவிறக்க இணைப்பைப் பயன்படுத்துங்கள்'; });

    seek.addEventListener('input', function () {
      seeking = true;
      var d = audio.duration;
      var p = seek.value / 1000;
      wave.style.setProperty('--p', p.toFixed(4));
      if (d) cur.textContent = t(p * d);
    });
    seek.addEventListener('change', function () {
      seeking = false;
      var p = seek.value / 1000;
      var go = function () { if (audio.duration) audio.currentTime = p * audio.duration; paint(); };
      if (audio.readyState >= 1) go();
      else { audio.addEventListener('loadedmetadata', go, { once: true }); audio.preload = 'metadata'; audio.load(); }
    });
  });

  /* ---------------- 4. TV band: now pin (IST) ---------------- */
  var pin = $('[data-tv-now]');
  if (pin && DP.istNow) {
    var place = function () {
      var x = DP.istNow().mins / 1440;
      pin.style.setProperty('--x', x.toFixed(4));
      pin.classList.toggle('is-late', x > 0.72);
      pin.hidden = false;
    };
    place();
    setInterval(place, 30000);
  }
})();
