/* Datta Peetham — devotional sound (no dependencies).
   The flute music (an original bansuri composition in Raga Pahadi, tuned to
   A = 432 Hz, made for this website) and the temple sounds while scrolling.

   - Preference in localStorage 'dp-sound' = {music, sfx, v: 1, vol}; absent
     means a first visit, when the intro curtain offers the choice (a modal
     dialog that takes focus) for about 4 s. Unanswered (or on a scroll, Escape
     or a tap on the curtain) the curtain lifts and the same choice carries on as
     a small non-modal card above the sound button; the card is also how it is
     offered when this script arrives after the curtain has lifted (a slow
     connection).
   - Nothing is downloaded and no AudioContext exists until sound is on.
   - Music: <audio preload="none"> → MediaElementSource → per-element gain →
     music bus (fades) → analyser (level) → master (volume) → speakers. Two
     elements crossfade at the loop point: Chromium's <audio loop> leaves a
     12–23 ms gap at an MP3 loop seam, the crossfade leaves none. The build
     writes the loop plan on [data-sound] (src/features/devotion-sound.mjs):
     the file is the loop followed by its own first 4.6 s, so when element A
     reaches loop + d, element B started at d plays the same music. B starts
     early at gain 0, is put in step with A (by currentTime, then to the
     sample by what the two actually play: see prepare()), and fades in over
     0.6 s inside the tanpura's quiet stretch: no pluck doubled or dropped,
     nothing skipped, no doubled drone.
   - Position carries across pages through sessionStorage 'dp-sound-pos'.
   - Temple sounds: decoded buffers → panner → SFX bus (−8 dB) → master.
     A chime every ~800 px of reading (≥ 0.9 s apart), a bell as each section
     arrives (≥ 1.5 s apart, never within 0.7 s of a chime: it waits). Never
     during a fling, read from the wheel or finger as well as the scroll; a
     sound that falls due waits 0.25 s in case a fling is just starting. The
     conch (shankha) at the end of a page plays only if the build lists it in
     data-sfx, which it does not until the client has approved it.
   - Audio URLs carry ?v=<content hash> from data-audio-v, so a re-rendered
     file reaches visitors at once despite the 30-day cache.
   - API: DP.sound = {musicOn, sfxOn, setMusic, setSfx, setVolume, volume,
     level, state, onChange}; 'dp:sound' CustomEvent on document.
   - With devotion-motion.js: a section bell dispatches 'dp:bell' {section}
     (the hanging bell there swings); a hanging bell that swings on its own
     dispatches 'dp:ghanta' {el, cause: 'enter'|'touch'|'bell'}, and is sounded
     here for 'enter' (in place of its section's bell) and 'touch'. */
(function () {
  'use strict';
  var W = window, doc = document, root = doc.documentElement;
  var DP = W.DP = W.DP || {};
  if (DP.sound) return; // idempotent: a second copy of this script does nothing
  // Whole sentences with numbered slots (%1, %2) so translations can reorder them.
  var fmt = function (s) { var a = arguments; return s.replace(/%(\d)/g, function (m, i) { return a[+i]; }); };
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var noop = function () {};
  var AC = W.AudioContext || W.webkitAudioContext;
  var box = $('[data-sound]');
  var subs = [];
  var S = { music: false, sfx: false, vol: 0.8 }; // the flute is mastered at −23 LUFS: 80 % (gain 0.64) is a calm default

  if (!AC || !W.Audio || !W.Promise) { // no Web Audio: stay silent, keep the API
    DP.sound = { musicOn: function () { return false; }, sfxOn: function () { return false; }, setMusic: noop, setSfx: noop, setVolume: noop, volume: function () { return 0; }, level: function () { return 0; }, state: function () { return { music: false, sfx: false, playing: false, volume: 0, status: 'off' }; }, onChange: function () { return noop; } };
    return;
  }

  /* ---------------- configuration ---------------- */
  var cfg = box ? box.dataset : {};
  var me = doc.currentScript || $('script[src*="devotion-sound"]');
  var base;
  try { base = new URL('../audio/', me.src).href; } catch (e) { base = (doc.body.getAttribute('data-base') || root.getAttribute('data-root') || '') + 'assets' + '/audio/'; }
  // data-audio-v: "file=hash" pairs written by the build; ?v= keeps caches honest
  var VER = {};
  (cfg.audioV || '').split(/\s+/).forEach(function (t) { var i = t.lastIndexOf('='); if (i > 0) VER[t.slice(0, i)] = t.slice(i + 1); });
  var url = function (f) { return base + f + (VER[f] ? '?v=' + VER[f] : ''); };
  var SRC = url(cfg.music || 'flute-pahadi.mp3');
  var SWARA = ['chime-s', 'chime-r', 'chime-g', 'chime-p', 'chime-d', 'chime-s2'];
  // data-sfx (written by the build from the files that exist) lists the temple sounds to load;
  // the shankha is never assumed: it is optional and off until the client approves it
  var FX = cfg.sfx != null ? cfg.sfx.split(/\s+/).filter(Boolean) : ['ghanta'].concat(SWARA);
  // the loop plan: A at XFROM fades into B at XTO over XF seconds; the music's period is XFROM − XTO
  // PRE: B starts this long before the fade point, silent, to be put in step
  var XFROM = +cfg.xfFrom || 0, XTO = +cfg.xfTo || 0, XF = +cfg.xfade || 0.6, PRE = 2.8;
  var FX_GAIN = Math.pow(10, (cfg.sfxDb ? +cfg.sfxDb : -8) / 20);
  var FADE_IN = 1.8, FADE_OUT = 0.6, FLING = 3500; // seconds, seconds, px/s

  /* ---------------- storage (private mode safe) ---------------- */
  function load(store, k) { try { return JSON.parse(W[store].getItem(k)); } catch (e) { return null; } }
  function save(store, k, v) { try { W[store].setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  var KEY = 'dp-sound', POS = 'dp-sound-pos';
  function readPref() {
    var p = load('localStorage', KEY);
    if (!p || p.v !== 1) return null;
    S.music = !!p.music; S.sfx = !!p.sfx;
    if (typeof p.vol === 'number') S.vol = Math.max(0, Math.min(1, p.vol));
    return p;
  }
  var pref = readPref();
  if (!pref && cfg.volume) S.vol = Math.max(0, Math.min(1, cfg.volume / 100));
  function savePref() { pref = { music: S.music, sfx: S.sfx, v: 1, vol: S.vol }; save('localStorage', KEY, pref); }

  /* ---------------- audio graph (created on first need) ---------------- */
  var ctx, master, bus, an, fx, unlocked = false, gesture = false;
  function inGesture() { return gesture || !!(navigator.userActivation && navigator.userActivation.isActive); }
  function ensure() {
    if (ctx) return ctx;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = S.vol * S.vol; master.connect(ctx.destination);
    bus = ctx.createGain(); bus.gain.value = 0;
    an = ctx.createAnalyser(); an.fftSize = 2048; bus.connect(an); an.connect(master);
    fx = ctx.createGain(); fx.gain.value = FX_GAIN; fx.connect(master);
    ctx.onstatechange = function () { if (ctx.state === 'running' && !unlocked) { unlocked = true; disarm(); reconcile(); } };
    if (ctx.state === 'running') unlocked = true;
    doc.addEventListener('visibilitychange', onVis);
    W.addEventListener('pagehide', onHide);
    W.addEventListener('pageshow', onShow);
    W.addEventListener('focus', onFocus);
    ['playing', 'pause', 'ended', 'emptied', 'error'].forEach(function (t) { doc.addEventListener(t, onMedia, true); });
    $$('audio, video').forEach(function (el) { if (!el.paused && !el.muted) media.push(el); });
    if (navigator.mediaSession) { // lock-screen and media-key controls
      try {
        navigator.mediaSession.setActionHandler('play', function () { setMusic(true); });
        navigator.mediaSession.setActionHandler('pause', function () { setMusic(false); });
      } catch (e) { /* unsupported action */ }
    }
    return ctx;
  }
  function fadeTo(g, v, dur) {
    var t = ctx.currentTime, p = g.gain;
    p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(v, t + dur);
  }
  var idleT;
  function idle() { // let the audio thread sleep when nothing is sounding
    clearTimeout(idleT);
    idleT = setTimeout(function () { if (ctx && !on && ctx.state === 'running') ctx.suspend(); }, 4000);
  }

  /* ---------------- autoplay: wait for the first gesture ---------------- */
  var GESTURES = ['pointerdown', 'keydown', 'touchend', 'click'], armed = false;
  function arm() { if (armed) return; armed = true; GESTURES.forEach(function (t) { doc.addEventListener(t, onGesture, true); }); }
  function disarm() { if (!armed) return; armed = false; GESTURES.forEach(function (t) { doc.removeEventListener(t, onGesture, true); }); }
  function onGesture(e) {
    if (e.key === 'Escape' || !ctx) return;
    act(function () { ctx.resume().then(function () { if (ctx.state === 'running') { unlocked = true; disarm(); reconcile(); } }, noop); reconcile(); });
  }
  function act(fn) { gesture = true; try { fn(); } finally { gesture = false; } }

  /* ---------------- music: two elements crossfading inside the loop's tail ---------------- */
  var P = [], cur = 0, on = false, live = false, err = false, xfading = false, started = false, stopT, leaveT, prep = null;
  // Fade curves, for two signals whose correlation is r. Two elements in step to the sample play
  // one signal (r = 1), so their gains must add to one (equal gain; equal power would swell it
  // by 3 dB at the middle of the fade). Two copies even 1 ms apart are, for this drone, as good
  // as unrelated, and unrelated signals (r = 0) need equal power. In between, the gains keep the
  // power of the sum steady:
  //   in = s·n, out = (1 − s)·n, s = sin²(πx/2), n = 1 / √((1 − s)² + s² + 2r·s(1 − s)),
  // which is sin², cos² for r = 1 and a constant-power pair for r = 0. Two copies a few ms apart
  // can be unlike (r down to −0.33 for this drone): then the gains rise a little above 1 in the
  // second half of the fade (r is held to −0.35 … 1).
  // RHO_UNKNOWN: when the engine cannot tell (no taps), B is in step only by currentTime, a few
  // ms either way. Measured on the file through the fade, the music's correlation with itself
  // 1 to 12 ms apart averages −0.07 (from −0.33 at 3.5 ms to 0.45 at 6.75 ms), so equal power
  // is the best guess there: the middle of the fade then lies within −1.7 … +1.6 dB (a
  // compromise curve for r = 0.25 measured −2.0 dB in a recording, and −2.7 … +0.6 on paper).
  var RHO_UNKNOWN = 0, CURVES = {};
  function curves(r) {
    r = Math.round(Math.max(-0.35, Math.min(1, r)) * 50) / 50;
    if (CURVES[r]) return CURVES[r];
    var up = new Float32Array(48), down = new Float32Array(48), x, s, n;
    for (var k = 0; k < 48; k++) {
      x = Math.sin(k / 47 * Math.PI / 2); s = x * x;
      n = 1 / Math.sqrt((1 - s) * (1 - s) + s * s + 2 * r * s * (1 - s));
      up[k] = s * n; down[k] = (1 - s) * n;
    }
    return (CURVES[r] = [up, down]);
  }
  // B is first aimed this far ahead of A by ear, so that the measured lead is positive and a
  // delay on B's path can take it up exactly (a DelayNode can hold back, not bring forward)
  var MARGIN = 0.008, MAX_DELAY = 0.1, SETTLE = 300, TAP = 8192;
  function period() { return XFROM - XTO; }
  // any position in the file → the same moment of the music before the fade point
  function inLoop(t) { var p = period(); if (p > 1) while (t >= XFROM) t -= p; return Math.max(0, t); }
  // Measured in Chromium (headless 141, recording the output against the file): an MP3 element
  // positioned by a seek (#t=, or currentTime before or during play) into the first half of the
  // file sounds one MP3 frame (1152 samples, 26.1 ms) later than its currentTime says; seeked
  // into the second half, or playing on from 0, it sounds where currentTime says. The split is
  // at half the duration (110.8 s → late, 111.5 s → on time). late() is that frame for an
  // element whose last seek (p.at) was into the first half; leads below make up for it.
  var FRAME = 1152 / 44100;
  function late(p, at) { at = at === undefined ? p.at : at; var d = p.a.duration || 2 * XFROM; return at != null && at < d / 2 ? FRAME : 0; }
  function seekTo(p, t) { p.at = t; p.a.currentTime = t; }
  function startAt() {
    var p = load('sessionStorage', POS);
    if (!p || typeof p.t !== 'number') return 0;
    var gap = Date.now() - p.at, t = p.t + (gap > 0 && gap < 8000 ? gap / 1000 : 0); // the walk to the next page
    return inLoop(t);
  }
  function player(i) {
    if (P[i]) return P[i];
    var a = new Audio(); a.preload = 'none'; // no loop attribute: the crossfade carries the music round
    var g = ctx.createGain(); g.gain.value = i === cur ? 1 : 0;
    // element → delay (holds B back to the sample) → tap (what this element plays) → gain → bus
    var node = ctx.createMediaElementSource(a), dl = null, tap = null;
    try { dl = ctx.createDelay(MAX_DELAY); node.connect(dl); node = dl; } catch (e) { dl = null; }
    try { tap = ctx.createAnalyser(); tap.fftSize = TAP; node.connect(tap); node = tap; } catch (e) { tap = null; }
    node.connect(g); g.connect(bus);
    a.addEventListener('playing', function () { if (a === P[cur].a) { live = true; err = false; if (on) fadeTo(bus, 1, FADE_IN); render(); } });
    a.addEventListener('waiting', function () { if (a === P[cur].a) { live = false; render(); } });
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('error', function () { if (a === P[cur].a) { err = true; on = live = false; render(); } });
    // last safety net, if neither the crossfade nor the in-place seek happened: go round in place
    a.addEventListener('ended', function () { var p = P[cur]; if (a === p.a && on && !xfading) { var t = inLoop(a.currentTime); seekTo(p, t + late(p, t) - late(p)); a.play().then(null, noop); } });
    return (P[i] = { a: a, g: g, dl: dl, tap: tap && tap.getFloatTimeDomainData ? tap : null, at: null });
  }
  function go() {
    clearTimeout(stopT);
    if (prep && !xfading) finishX(); // turned back on before a stop finished: drop a half-prepared B
    var p = player(cur), a = p.a;
    on = true; started = true;
    if (!a.src) { var t = startAt(); p.at = t > 0.5 ? +t.toFixed(2) : null; a.src = SRC + (p.at ? '#t=' + p.at : ''); }
    else if (a.error) a.load(); // the file failed before: try it again
    if (a.paused) {
      var pr = a.play();
      if (pr && pr.then) pr.then(null, function (e) { if (e && e.name === 'AbortError') return; on = live = false; arm(); render(); });
    } else fadeTo(bus, 1, FADE_IN); // turned back on during a fade-out
    if (bc) bc.postMessage(TAB);
    W.addEventListener('beforeunload', onLeave);
  }
  function stop() {
    on = false;
    W.removeEventListener('beforeunload', onLeave);
    if (!ctx) return;
    fadeTo(bus, 0, FADE_OUT);
    clearTimeout(stopT);
    stopT = setTimeout(function () { finishX(); P.forEach(function (p) { p.a.pause(); }); live = false; render(); idle(); }, FADE_OUT * 1000 + 60);
  }
  function onTime() {
    var A = P[cur]; if (!A || this !== A.a || !on || xfading || prep) return;
    var d = A.a.duration; if (!d || !isFinite(d)) return;
    // no plan in the markup (an old page): fade the end of the file into its start, as before
    if (!(XFROM > XTO && XFROM < d)) { XF = Math.min(3, d / 4); XFROM = d - XF - 0.35; XTO = 0; }
    var t = A.a.currentTime;
    if (t > XFROM - 12) warm();
    if (t >= XFROM - PRE) prepare();
  }
  function warm() { var B = player(1 - cur); if (!B.a.src) { B.a.src = SRC; B.a.preload = 'auto'; B.a.load(); } } // from the cache
  // B starts at gain 0 a little before the fade point, at A's moment of the music, and is
  // put in step while it is silent; at XFROM the two fade over inside the tanpura’s quiet
  // stretch. In step means by ear, in two stages:
  //  1. By currentTime: B is seeked until it leads A by MARGIN. B (always seeked near the
  //     start) aims ahead by however much later it will sound than A (see late()), and by
  //     whatever delay A's own path holds.
  //  2. By what the two actually play: each element's path is tapped (an AnalyserNode before
  //     its gain), B's lead over A is measured to the sample by cross-correlating the two taps,
  //     and the DelayNode on B's path takes it up. A seek alone lands a few ms off at best,
  //     and for this drone that is two unrelated copies (a comb filter through the fade).
  //     B's lead is searched from -6 to +20 ms (the aim is MARGIN, 8 ms): a span shorter than
  //     the 27 ms period of the drone, so the search cannot lock onto a period instead. A
  //     measurement counts only when the next one repeats it (two taps read a render quantum
  //     apart would differ by 128 samples). Measuring stops 0.4 s before the fade.
  // The fade curve: once the residual is within 2 samples, equal gain (the two are one
  // signal). If that is never reached (a busy machine), the curve follows how alike the two
  // taps are as heard together in the last 0.4 s (corr0); with no taps at all, equal power
  // (see curves()).
  function prepare() {
    var A = P[cur], B = player(1 - cur), tries = 0, want = 0, lag = 0;
    warm();
    B.g.gain.cancelScheduledValues(0); B.g.gain.value = 0;
    if (B.dl) B.dl.delayTime.value = 0;
    var dA = A.dl ? A.dl.delayTime.value : 0, fine = !!(A.tap && B.tap && B.dl), margin = fine ? MARGIN : 0;
    prep = { skew: null, tries: 0, lead: 0, fine: false, delay: 0, since: 0, next: 0, last: null, measures: 0, rho: null, rhos: [] };
    var seek = function () {
      var t = Math.max(0, A.a.currentTime - period() + lag + want);
      want = late(B, t) - late(A) - dA + margin; prep.lead = want; // the currentTime lead that puts B MARGIN ahead by ear
      try { seekTo(B, A.a.currentTime - period() + lag + want); } catch (e) { /* not seekable yet */ }
      prep.since = 0; prep.last = null;
    };
    // stage 2, once per tick while B is ready: measure, and take up what repeats
    var measure = function () {
      var now = performance.now();
      if (!prep.since) { prep.since = now; return; }
      // the taps must hold only audio from after the last change; at most one measurement every
      // 100 ms and 14 in all (each costs a few ms of main-thread time, on a phone tens of ms)
      if (now - prep.since < SETTLE || now < prep.next || prep.measures >= 14) return;
      prep.next = now + 100;
      var m = leadOf(A.tap, B.tap);
      prep.measures++;
      if (m === null) return;
      if (prep.last === null || Math.abs(m - prep.last) > 3) { prep.last = m; return; }
      var v = Math.round((m + prep.last) / 2), sr = ctx.sampleRate, d = B.dl.delayTime.value + v / sr;
      prep.last = null;
      if (Math.abs(v) <= 2) { prep.fine = true; return; }
      if (d >= 0 && d <= MAX_DELAY * 0.9) { B.dl.delayTime.value = d; prep.delay = d; prep.since = now; return; }
      if (tries < 6) { tries++; prep.tries = tries; lag += margin - d; B.dl.delayTime.value = 0; prep.delay = 0; seek(); } // out of reach: seek again
    };
    // in the last 0.4 s before the fade (B's path no longer changing): how alike the two are,
    // as heard together, for the fade curve; a value counts when the next repeats it (±0.15)
    var rhoRead = function () {
      var now = performance.now();
      if (!prep.since) { prep.since = now; return; }
      if (now - prep.since < SETTLE) return;
      var r = corr0(A.tap, B.tap);
      if (r === null) return;
      var q = prep.rhos; q.push(r); if (q.length > 2) q.shift();
      if (q.length === 2 && Math.abs(q[0] - q[1]) <= 0.15) prep.rho = (q[0] + q[1]) / 2;
    };
    lag = 0.004; seek();
    var pr = B.a.play(); if (pr && pr.then) pr.then(null, noop);
    (function tick() {
      if (!prep || !on || P[cur] !== A || xfading) return;
      var ta = A.a.currentTime, ready = !B.a.paused && !B.a.seeking && B.a.readyState > 2;
      if (ready) {
        var skew = B.a.currentTime + period() - ta; // > 0: B ahead by currentTime
        prep.skew = skew;
        if (!prep.delay && Math.abs(skew - want) > 0.006 && tries < 4 && ta < XFROM - 0.3) { tries++; prep.tries = tries; lag -= skew - want; seek(); }
        else if (fine && !prep.fine && ta < XFROM - 0.4) measure();
        else if (A.tap && B.tap && ta >= XFROM - 0.4) rhoRead();
      } else prep.since = 0;
      if (ready && ta >= XFROM) { crossfade(); return; }
      if (ta >= XFROM + 0.5) { // B never got going (a slow network): carry A round by itself
        finishX();
        var t = inLoop(ta);
        try { seekTo(A, t + late(A, t) - late(A)); } catch (e) { /* ignore */ }
        return;
      }
      prep.t = setTimeout(tick, 40);
    })();
  }
  // B's lead over A in samples, by what their taps hold now (b[i] ≈ a[i + lead]), or null
  // when the two do not clearly play the same music (a correlation under 0.9)
  var TA = null, TB = null;
  function leadOf(ta, tb) {
    var n = ta.fftSize, sr = ctx.sampleRate, lo = -Math.round(0.006 * sr), hi = Math.round(0.02 * sr), best = -2, bl = 0, fb = -2, fl = 0, l, c;
    if (!TA || TA.length !== n) { TA = new Float32Array(n); TB = new Float32Array(n); }
    ta.getFloatTimeDomainData(TA); tb.getFloatTimeDomainData(TB);
    // coarse: every 4th lag over every 4th sample (the drone keeps 0.92 of its correlation 2
    // samples off the peak, above the 0.75 of its nearest false peak); then every lag near it
    for (l = lo; l <= hi; l += 4) { c = xcorr(TA, TB, l, 4); if (c > best) { best = c; bl = l; } }
    for (l = bl - 3; l <= bl + 3; l++) { c = xcorr(TA, TB, l, 1); if (c > fb) { fb = c; fl = l; } }
    return fb >= 0.9 ? fl : null;
  }
  // the correlation of what A and B play at the same moment (lag 0 after B's delay), from both
  // taps read within one render quantum (A read again: unchanged), or null
  var TC = null;
  function corr0(ta, tb) {
    var n = ta.fftSize;
    if (!TA || TA.length !== n) { TA = new Float32Array(n); TB = new Float32Array(n); }
    if (!TC || TC.length !== n) TC = new Float32Array(n);
    for (var k = 0; k < 3; k++) {
      ta.getFloatTimeDomainData(TA); tb.getFloatTimeDomainData(TB); ta.getFloatTimeDomainData(TC);
      if (TC[n - 1] === TA[n - 1] && TC[n - 129] === TA[n - 129] && TC[0] === TA[0]) return xcorr(TA, TB, 0, 1);
    }
    return null;
  }
  function xcorr(a, b, l, step) {
    var x = 0, ea = 0, eb = 0, i0 = Math.max(0, -l), i1 = Math.min(a.length, a.length - l), u, v;
    for (var i = i0; i < i1; i += step) { u = a[i + l]; v = b[i]; x += u * v; ea += u * u; eb += v * v; }
    return x / Math.sqrt(ea * eb + 1e-20);
  }
  function crossfade() {
    var A = P[cur], B = P[1 - cur], t = ctx.currentTime, eq = !!(prep && prep.fine);
    // in step to the sample: equal gain; otherwise the measured likeness, or equal power
    var rho = prep && prep.rho != null ? Math.max(-1, Math.min(1, prep.rho)) : null, r = eq ? 1 : rho != null ? rho : RHO_UNKNOWN, cv = curves(r);
    clearTimeout(prep && prep.t);
    xfading = true;
    [[B.g, cv[0]], [A.g, cv[1]]].forEach(function (x) { x[0].gain.cancelScheduledValues(0); x[0].gain.setValueCurveAtTime(x[1], t, XF); });
    lastX = { at: Date.now(), from: A.a.currentTime, to: B.a.currentTime, skew: prep ? prep.skew : null, lead: prep ? prep.lead : 0, tries: prep ? prep.tries : 0,
      fine: eq, delay: B.dl ? +B.dl.delayTime.value.toFixed(6) : 0, measures: prep ? prep.measures : 0,
      rho: rho == null ? null : +rho.toFixed(4), r: +Math.max(-0.35, Math.min(1, r)).toFixed(2), curve: r >= 0.98 ? 'gain' : Math.abs(r) <= 0.02 ? 'power' : 'mixed' };
    cur = 1 - cur;
    setTimeout(finishX, XF * 1000 + 60);
  }
  var lastX = null; // the last crossfade, for testing: DP.sound.loop()
  function finishX() {
    if (prep) { clearTimeout(prep.t); prep = null; }
    var A = P[1 - cur], B = P[cur];
    if (!xfading) { // a B prepared but never faded in: silence it again
      if (A && A !== B) { A.g.gain.cancelScheduledValues(0); A.g.gain.value = 0; A.a.pause(); }
      return;
    }
    xfading = false;
    A.g.gain.cancelScheduledValues(0); A.g.gain.value = 0; A.a.pause();
    B.g.gain.cancelScheduledValues(0); B.g.gain.value = 1;
  }
  function onLeave() { // soft exit while the next page loads; back up if the page stays
    if (!live) return;
    fadeTo(bus, 0, 0.25);
    clearTimeout(leaveT); leaveT = setTimeout(function () { if (on && live) fadeTo(bus, 1, 0.5); }, 1500);
  }
  function onHide() {
    if (started && P[cur]) save('sessionStorage', POS, { t: inLoop(P[cur].a.currentTime), at: Date.now(), d: period() });
    closeChannel();
  }
  function onShow(e) { // back/forward cache: the other page may have changed things
    if (!e.persisted) return;
    readPref();
    if (P[cur] && P[cur].a.paused) { on = live = false; finishX(); }
    if (S.music && P[cur] && P[cur].a.duration) { var t = startAt(); if (t) seekTo(P[cur], t); }
    reconcile();
  }
  function onVis() { if (!doc.hidden) tabHeld = false; reconcile(); }

  /* ---------------- being a good guest ---------------- */
  var media = [], frames = [], tabHeld = false, mo, bc, TAB = Math.random().toString(36).slice(2);
  function mine(el) { return P.some(function (p) { return p.a === el; }); }
  // Any other <audio>/<video> on the page (the chant player…). Held on 'playing' (sound has
  // really started), so a player whose source fails never leaves the flute paused.
  function onMedia(e) {
    var el = e.target;
    if (el && el.tagName === 'SOURCE') el = el.parentNode; // a failed <source> reports here
    if (!el || mine(el) || !/^(AUDIO|VIDEO)$/.test(el.tagName)) return;
    var i = media.indexOf(el);
    if (e.type === 'playing') { if (i < 0 && !el.muted) media.push(el); }
    else if (i > -1) media.splice(i, 1);
    reconcile();
  }
  function watchFrames(onOff) { // click-to-load YouTube players
    if (!onOff) { if (mo) mo.disconnect(); mo = null; return; }
    if (mo || !W.MutationObserver) return;
    mo = new MutationObserver(function (list) {
      var n = frames.length;
      list.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes, function (el) {
          if (el.nodeType !== 1) return;
          (el.tagName === 'IFRAME' ? [el] : $$('iframe', el)).forEach(function (f) { if (/youtube/.test(f.src) && frames.indexOf(f) < 0) frames.push(f); });
        });
      });
      frames = frames.filter(function (f) { return doc.contains(f); });
      if (frames.length !== n) reconcile();
    });
    mo.observe(doc.body, { childList: true, subtree: true });
  }
  function openChannel() {
    if (bc || !W.BroadcastChannel) return;
    bc = new BroadcastChannel('dp-sound');
    bc.onmessage = function (e) { if (e.data !== TAB && on) { tabHeld = true; reconcile(); } };
  }
  function closeChannel() { if (bc) { bc.close(); bc = null; } }
  function onFocus() { if (tabHeld) { tabHeld = false; reconcile(); } }
  function held() { return media.length > 0 || frames.length > 0 || tabHeld; }

  /* ---------------- temple sounds while scrolling ---------------- */
  var buf = {}, fxLoaded = false, fxT = 0, listening = false, io, lastY = 0, lastT = 0, vel = 0, travel = 0, back = 0, dir = 0;
  var step = 800, swara = -1, lastBell = 0, lastChime = 0, flungAt = -1e4, shankhaDone = false, panelOpen = false, sample = false, movedAt = 0;
  // spacing, ms: chime after chime, chime after bell, bell after chime (a bell waits rather than clash)
  var CHIME_GAP = 900, AFTER_BELL = 900, BELL_AFTER_CHIME = 700, BELL_GAP = 1500;
  // The first scroll steps of a fast fling can look calm: the speed of a scroll event is its
  // distance over the time since the last one, which after a pause is long (measured: chimes
  // 63-757 ms into a fling). So a fling is also read from the input itself, which arrives
  // before the scroll it causes: wheel steps, or a finger moving, faster than FLING px/s over
  // the last ~200 ms (a single wheel step of over 700 px, or 100 px notches more than 35 a
  // second, is a fling; the 100-160 px steps of a reader are not). And a chime or a section
  // bell that falls due waits HOLD ms, and sounds only if no fling began meanwhile.
  var HOLD = 250, TAU = 200, chimeDue = 0, bellDue = 0, wheelQ = [], fingerQ = [], fingerY = null;
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  function emit(name, detail) {
    var ev; try { ev = new CustomEvent(name, { detail: detail }); } catch (e) { ev = doc.createEvent('CustomEvent'); ev.initCustomEvent(name, false, false, detail); }
    doc.dispatchEvent(ev);
  }
  function panOf(el) { var r = el.getBoundingClientRect(); return Math.max(-0.6, Math.min(0.6, ((r.left + r.width / 2) / innerWidth - 0.5) * 1.2)); }
  // a bell: after HOLD, never within BELL_AFTER_CHIME of a chime (it waits), never during a
  // fling; force (a hanging bell touched) rings at once
  function bell(el, sec, force) {
    var now = performance.now(), at = force ? now : Math.max(now + HOLD, Math.max(lastChime, chimeDue) + BELL_AFTER_CHIME);
    if (!force) bellDue = Math.max(bellDue, at);
    var ring = function () {
      var t = performance.now();
      if (!force) {
        var w = Math.max(lastChime, chimeDue) + BELL_AFTER_CHIME - t; // a chime came first: let it ring out
        if (w > 1) { bellDue = Math.max(bellDue, t + w); setTimeout(ring, w); return; }
        if (bellDue <= t + 1) bellDue = 0;
        if (t - flungAt < 600 || t - lastBell < BELL_GAP) return;
      }
      if (hit('ghanta', rnd(0.85, 1), panOf(el), rnd(0.96, 1.04))) {
        lastBell = t;
        // the bell hanging in that section (devotion-motion's ghanta) swings with it
        if (sec) emit('dp:bell', { section: sec });
      }
    };
    if (at > now) setTimeout(ring, at - now); else ring();
  }
  // a chime that fell due: it sounds HOLD ms later unless a fling began meanwhile; if a bell
  // rang meanwhile it waits for the next scroll step
  function chime(sw) {
    chimeDue = performance.now() + HOLD;
    setTimeout(function () {
      var t = performance.now();
      chimeDue = 0;
      if (t - flungAt < 600 || panelOpen) return;
      if (bellDue || t - lastBell < AFTER_BELL) { travel = Math.max(travel, step); return; }
      if (hit(SWARA[sw], rnd(0.65, 0.8), rnd(-0.3, 0.3), rnd(0.996, 1.004))) { lastChime = t; swara = sw; }
    }, HOLD);
  }
  // The speed of the input in px/s over the last TAU ms: the steps since the oldest one in that
  // window over the time they took (a train of 420 px steps 120 ms apart is 3500 px/s); a step
  // on its own counts as spread over TAU.
  function rate(q, t, px) {
    q.push([t, px]);
    while (t - q[0][0] > TAU) q.shift();
    if (q.length < 2) return px * 1000 / TAU;
    for (var i = 1, sum = 0; i < q.length; i++) sum += q[i][1];
    return sum * 1000 / Math.max(16, t - q[0][0]);
  }
  function onWheel(e) { // wheel steps, lines and pages in px
    var t = performance.now(), k = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? innerHeight : 1;
    if (rate(wheelQ, t, Math.abs(e.deltaY * k)) > FLING) flungAt = t;
  }
  function onFinger(e) { // one finger moving the page
    var t = performance.now(), y = e.touches && e.touches.length === 1 ? e.touches[0].clientY : null;
    if (e.type !== 'touchmove' || y === null || fingerY === null) { fingerY = y; fingerQ = y === null ? [] : [[t, 0]]; return; }
    if (rate(fingerQ, t, Math.abs(y - fingerY)) > FLING) flungAt = t;
    fingerY = y;
  }
  function loadFx() {
    if (fxLoaded) return; fxLoaded = true;
    FX.forEach(function (n) {
      if (!n) return;
      fetch(url('sfx/' + n + '.mp3')).then(function (r) { if (!r.ok) throw r.status; return r.arrayBuffer(); })
        .then(function (ab) { ctx.decodeAudioData(ab, function (b) { buf[n] = b; if (sample && n === 'chime-s') playSample(); }, noop); }).then(null, noop);
    });
  }
  function hit(n, gain, pan, rate, force) {
    var b = buf[n];
    if (!b || !S.sfx || !unlocked || doc.hidden || (panelOpen && !force)) return false;
    if (ctx.state !== 'running') ctx.resume();
    var s = ctx.createBufferSource(), g = ctx.createGain(), out = g;
    s.buffer = b; s.playbackRate.value = rate || 1; g.gain.value = gain;
    s.connect(g);
    if (ctx.createStereoPanner) { out = ctx.createStereoPanner(); out.pan.value = pan || 0; g.connect(out); }
    out.connect(fx);
    s.start();
    if (!on) idle();
    return true;
  }
  function onScroll() {
    var y = W.scrollY || W.pageYOffset, t = performance.now(), dy = y - lastY, dt = Math.max(8, t - lastT);
    lastY = y; lastT = t;
    vel = vel * 0.5 + Math.abs(dy) / dt * 500; // smoothed px/s
    if (vel > FLING) flungAt = t;
    var calm = t - flungAt > 600; // a fling and its momentum tail stay silent
    if (!shankhaDone && dy > 0 && calm && y + innerHeight >= root.scrollHeight - 8) shankhaDone = hit('shankha', 0.9, 0, 1);
    if (!dy) return;
    movedAt = t;
    var d = dy > 0 ? 1 : -1;
    if (!calm || panelOpen) { travel = back = 0; return; } // flings and an open panel don't chime
    if (d !== dir) { // a real reversal only after 48 px the other way (ignores jitter)
      back += Math.abs(dy);
      if (back < 48) return;
      dir = d; travel = back; back = 0;
    } else { back = 0; travel += Math.abs(dy); }
    if (travel < step || chimeDue || bellDue || t - lastChime < CHIME_GAP || t - lastBell < AFTER_BELL) return; // keep the travel until it may sound
    travel = 0; step = rnd(700, 900);
    chime(swara < 0 ? (d > 0 ? 0 : 5) : (swara + d + 6) % 6); // arohana going down the page, avarohana going up
  }
  function listen(onOff) {
    if (onOff === listening) return;
    listening = onOff;
    var IN = ['wheel', 'touchstart', 'touchmove', 'touchend', 'touchcancel'];
    if (!onOff) {
      W.removeEventListener('scroll', onScroll); doc.removeEventListener('dp:ghanta', onGhanta);
      W.removeEventListener(IN[0], onWheel, true); IN.slice(1).forEach(function (n) { W.removeEventListener(n, onFinger, true); });
      if (io) io.disconnect(); io = null; return;
    }
    lastY = W.scrollY || W.pageYOffset; lastT = performance.now(); vel = 0; travel = 0;
    W.addEventListener('scroll', onScroll, { passive: true });
    W.addEventListener(IN[0], onWheel, { capture: true, passive: true });
    IN.slice(1).forEach(function (n) { W.addEventListener(n, onFinger, { capture: true, passive: true }); });
    doc.addEventListener('dp:ghanta', onGhanta);
    if (!W.IntersectionObserver) return;
    var secs = $$('main > section[id]'); if (!secs.length) secs = $$('section[id]', $('main') || doc);
    var first = true;
    io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var el = en.target;
        if (!en.isIntersecting || el.sndSeen) return;
        el.sndSeen = 1; // once per section per page view; never for what is on screen at the start
        var t = performance.now();
        if (first || vel > FLING || t - flungAt < 600 || t - lastBell < BELL_GAP) return;
        bell($('h2', el) || el, el);
      });
      first = false;
    }, { rootMargin: '0px 0px -30% 0px' });
    secs.forEach(function (s) { io.observe(s); });
  }
  // The hanging bells of devotion-motion.js (dp:ghanta events): the bell you see is the
  // bell you hear. Cause enter: it swung as the reader’s scrolling brought it into view,
  // and it stands in for its section’s bell; touch: a pointer rang it; bell: we rang it.
  // (No quotes in these comments: the translation extractor reads quoted text.)
  function onGhanta(e) {
    var d = e.detail || {}, b = d.el;
    if (!b || !b.getBoundingClientRect || d.cause === 'bell') return;
    if (d.cause === 'enter') {
      for (var s = b; s; s = s.parentElement) if (s.tagName === 'SECTION') s.sndSeen = 1;
      if (listening && performance.now() - movedAt < 1200 && vel <= FLING) bell(b, null); // never on load
    } else if (listening) bell(b, null, true);
  }

  /* ---------------- the one place that decides what should sound ---------------- */
  function reconcile() {
    if (!S.music && !S.sfx) { if (on) stop(); listen(false); watchFrames(false); disarm(); closeChannel(); render(); return; }
    if (!ensure()) return;
    var want = S.music && !doc.hidden && !held() && !err;
    if (S.music) openChannel(); else closeChannel();
    if (want && !on) {
      // allowed: running already, unlocked earlier in this page (resume works), or inside a gesture
      if (ctx.state === 'running' || unlocked || inGesture()) { if (ctx.state !== 'running') ctx.resume(); go(); }
      else arm();
    } else if (!want && on) stop();
    watchFrames(S.music);
    if (S.sfx && unlocked) {
      if (!fxLoaded && !fxT) fxT = setTimeout(loadFx, on && !live ? 1500 : 0); // let the flute start first
      listen(true);
    } else { listen(false); if (S.sfx) arm(); }
    if (!on) idle();
    render();
  }

  /* ---------------- level of the music (for other features' visuals) ---------------- */
  var lv = 0, lvT = 0, td;
  function level() {
    if (!on || !live || !an) { lv = 0; return 0; }
    var now = performance.now(), dt = Math.min(0.5, (now - lvT) / 1000), s = 0, i;
    lvT = now;
    if (!td) td = an.getFloatTimeDomainData ? new Float32Array(an.fftSize) : new Uint8Array(an.fftSize);
    if (td instanceof Float32Array) { an.getFloatTimeDomainData(td); for (i = 0; i < td.length; i++) s += td[i] * td[i]; }
    else { an.getByteTimeDomainData(td); for (i = 0; i < td.length; i++) { var x = (td[i] - 128) / 128; s += x * x; } }
    var x2 = Math.min(1, Math.sqrt(s / td.length) / (+cfg.levelRef || 0.08)); // 0.08 ≈ the 95th-percentile frame RMS of the flute track (measured: 0.078)
    lv += (x2 - lv) * (1 - Math.exp(-dt / (x2 > lv ? 0.06 : 0.25)));
    return lv;
  }

  /* ---------------- control panel ---------------- */
  var btn = box && $('[data-sound-toggle]', box), panel = box && $('[data-sound-panel]', box);
  var switches = box ? $$('[data-sound-switch]', box) : [], volEl = box && $('[data-sound-volume]', box), statusEl = box && $('[data-sound-status]', box);
  function status() {
    if (!S.music) return ['off', fmt('ಸಂಗೀತ ಆಫ್ ಆಗಿದೆ.')];
    if (err) return ['wait', fmt('ಸಂಗೀತವನ್ನು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.')];
    if (tabHeld) return ['wait', fmt('ಇನ್ನೊಂದು ಟ್ಯಾಬ್‌ನಲ್ಲಿ ಸಂಗೀತ ಪ್ಲೇ ಆಗುತ್ತಿದೆ.')];
    if (media.length || frames.length) return ['wait', fmt('ಬೇರೊಂದು ಧ್ವನಿಮುದ್ರಣ ಅಥವಾ ವಿಡಿಯೊ ಚಾಲನೆಯಲ್ಲಿರುವಾಗ ಸಂಗೀತವನ್ನು ತಡೆಹಿಡಿಯಲಾಗಿದೆ.')];
    if (!on && armed) return ['wait', fmt('ಪರದೆಯನ್ನು ಸ್ಪರ್ಶಿಸಿದಾಗ ಅಥವಾ ಯಾವುದೇ ಕೀಲಿ ಒತ್ತಿದಾಗ ಸಂಗೀತ ಆರಂಭವಾಗುತ್ತದೆ.')];
    if (on && !live) return ['wait', fmt('ಸಂಗೀತ ಲೋಡ್ ಆಗುತ್ತಿದೆ.')];
    return [on ? 'on' : 'wait', fmt('ಕೊಳಲಿನ ಸಂಗೀತ ಕೇಳಿಬರುತ್ತಿದೆ.')];
  }
  var lastKey = '';
  function render() {
    var st = status();
    if (box) {
      box.setAttribute('data-state', st[0]);
      switches.forEach(function (b) { b.setAttribute('aria-checked', String(!!S[b.getAttribute('data-sound-switch')])); });
      if (statusEl && statusEl.textContent !== st[1]) statusEl.textContent = st[1];
      if (volEl) { volEl.value = Math.round(S.vol * 100); volEl.style.setProperty('--v', Math.round(S.vol * 100) + '%'); }
      tuck();
    }
    var s = state(st[0]), key = [s.music, s.sfx, s.playing, s.volume, s.status].join();
    if (key === lastKey) return;
    lastKey = key;
    subs.forEach(function (fn) { try { fn(s); } catch (e) { /* a listener's problem stays its own */ } });
    var ev; try { ev = new CustomEvent('dp:sound', { detail: s }); } catch (e) { ev = doc.createEvent('CustomEvent'); ev.initCustomEvent('dp:sound', false, false, s); }
    doc.dispatchEvent(ev);
  }
  function state(code) { return { music: S.music, sfx: S.sfx, playing: on && live, volume: S.vol, status: code || status()[0] }; }
  function setMusic(v) { v = !!v; err = false; if (v) tabHeld = false; S.music = v; savePref(); reconcile(); }
  function setSfx(v) {
    v = !!v; var was = S.sfx; S.sfx = v; savePref(); reconcile();
    if (v && !was) { sample = true; if (buf['chime-s']) setTimeout(playSample, 150); } // a soft sample of what is to come
  }
  function playSample() { sample = false; hit('chime-s', 0.7, 0, 1, true); }
  function setVolume(v) {
    S.vol = Math.max(0, Math.min(1, +v || 0));
    if (master) master.gain.setTargetAtTime(S.vol * S.vol, ctx.currentTime, 0.05);
    render();
  }
  function openPanel(o) {
    if (!panel) return;
    panelOpen = o; panel.hidden = !o; btn.setAttribute('aria-expanded', String(o));
    var m = o ? 'addEventListener' : 'removeEventListener';
    doc[m]('click', onOutside, true); doc[m]('keydown', onEsc);
    if (o) render(); else tuck();
  }
  // On phones and tablets the page's own links reach the bottom-left corner of the first
  // screen (hero buttons, cards). While nothing is sounding, the button keeps out of the
  // way at the top of the page, as back-to-top does, and comes back once the reader
  // scrolls on (or tabs to it). Whenever music is on or waiting, it always shows.
  // Being at the top is watched by an IntersectionObserver on a sentinel spanning the top of the
  // page (no scroll listener, no per-frame work); the CSS applies it only below 1100px.
  var tucked = null, atTop = false, cardOpen = false;
  function tuck() {
    if (!box) return;
    var t = atTop && root.scrollHeight > innerHeight + 240 && status()[0] === 'off' && !panelOpen && !cardOpen;
    if (t !== tucked) { tucked = t; box.classList.toggle('is-tucked', t); }
  }
  function watchTop() {
    if (!W.IntersectionObserver) return;
    var s = doc.createElement('div');
    s.setAttribute('aria-hidden', 'true');
    s.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:max(160px,35vh);visibility:hidden;pointer-events:none';
    doc.body.appendChild(s);
    new IntersectionObserver(function (es) { atTop = es[es.length - 1].isIntersecting; tuck(); }).observe(s);
  }
  function onOutside(e) { if (!box.contains(e.target)) openPanel(false); }
  function onEsc(e) { if (e.key === 'Escape') { openPanel(false); btn.focus(); } }
  if (box) {
    btn.addEventListener('click', function () { openPanel(panel.hidden); });
    box.addEventListener('focusout', function (e) { if (e.relatedTarget && !box.contains(e.relatedTarget)) openPanel(false); });
    switches.forEach(function (b) {
      b.addEventListener('click', function () {
        var which = b.getAttribute('data-sound-switch');
        act(function () { if (which === 'music') setMusic(!S.music); else setSfx(!S.sfx); });
      });
    });
    if (volEl) {
      volEl.addEventListener('input', function () { setVolume(volEl.value / 100); });
      volEl.addEventListener('change', savePref);
    }
    if (!FX.length) switches.forEach(function (b) { if (b.getAttribute('data-sound-switch') === 'sfx') b.hidden = true; });
    box.hidden = false;
    root.classList.add('has-sound');
    watchTop();
  }

  /* ---------------- first visit: the choice inside the intro curtain ---------------- */
  // The curtain holds the question only briefly: ASK ms after it appears (or at once if the
  // visitor scrolls, presses Escape or taps the curtain) the curtain lifts unanswered and the
  // same question carries on as the small card above the sound button (offer()), so reading
  // is never held up and the choice stays open. While the pointer rests on the choices, or the
  // visitor moves between them with Tab, the curtain waits (a lift under a pointer about to
  // click would land the click on the page beneath); leaving them, it lifts AGAIN ms later.
  var ASK = 4000, AGAIN = 2000;
  // Focus back to the start of the page, as on arrival: the next Tab reaches the skip link and
  // then the sound control. (A plain blur() leaves Chromium's sequential focus starting point
  // inside the hidden curtain, so Tab would skip both and land on the header.) Focusing the body
  // through a tabindex taken off again shows no focus ring.
  function toPage() {
    var B = doc.body, had = B.hasAttribute('tabindex'), ti = B.getAttribute('tabindex');
    try { if (!had) B.setAttribute('tabindex', '-1'); B.focus({ preventScroll: true }); } catch (e) { if (doc.activeElement && doc.activeElement.blur) doc.activeElement.blur(); }
    if (!had) B.removeAttribute('tabindex'); else B.setAttribute('tabindex', ti);
  }
  function invite() {
    var intro = $('.intro'), inv = $('[data-sound-invite]');
    if (pref || !intro || !inv || root.classList.contains('intro-seen') || getComputedStyle(intro).display === 'none') return;
    var lift = (intro.getAnimations ? intro.getAnimations() : []).filter(function (a) { return a.animationName === 'intro-lift'; })[0];
    // The curtain's own clock: when its animations started. They start with the first frame
    // that shows them, which on a busy device comes well after this script runs (measured:
    // up to 0.5 s), so the times below are kept to it rather than to this moment.
    var mark = $('.intro-mark', intro), ma = mark && mark.getAnimations ? mark.getAnimations()[0] : null;
    // (Its times are on the clock of performance.now(); the timeline's own currentTime is the
    // time of the frame being drawn, which on a busy device lags by up to 0.4 s.)
    var started = function () { return !!(ma && ma.startTime != null); };
    var elapsed = started() ? performance.now() - ma.startTime : lift ? +lift.currentTime || 0 : performance.now();
    // the curtain is already lifting (a slow connection: the script arrived late): ask in a
    // small card beside the sound button instead, so a first visit is always offered the choice
    if (elapsed > 1450) { offer(inv); return; }
    // the question appears once the curtain's own animation has played (mandala, name, bar: 1.5 s)
    var showIn = Math.max(0, 1500 - elapsed), timer, done = false, label = $('.intro-label', intro), auto = false, engaged = false;
    var due = performance.now() + showIn + ASK, focusT;
    var choices = $$('[data-sound-enter]', inv);
    root.style.setProperty('--snd-in', showIn + 'ms');
    root.style.setProperty('--snd-hold', (showIn + ASK + 3000) + 'ms'); // CSS lifts the curtain even if this script stops
    inv.hidden = false;
    root.classList.add('snd-inviting');
    // while the choice is offered the curtain is a small modal dialog
    if (label && !label.id) label.id = 'snd-invite-label';
    intro.removeAttribute('aria-hidden');
    intro.setAttribute('role', 'dialog'); intro.setAttribute('aria-modal', 'true');
    if (label) intro.setAttribute('aria-labelledby', label.id);
    intro.setAttribute('aria-describedby', 'snd-invite-note');
    $$('.intro-mark, .intro-word, .intro-bar', intro).forEach(function (el) { el.setAttribute('aria-hidden', 'true'); });
    function wait(ms) { clearTimeout(timer); timer = setTimeout(function () { close(); }, ms); }
    // no sooner than the question's own time is up, and AGAIN after the visitor leaves the choices
    function release() { if (!done) { engaged = false; wait(Math.max(AGAIN, due - performance.now())); } }
    // withMusic: the answer (true/false), or undefined when the curtain lifts unanswered; lifted:
    // the CSS fallback has lifted it already
    function close(withMusic, lifted) {
      if (done) return; done = true;
      clearTimeout(timer);
      doc.removeEventListener('keydown', onKey, true);
      W.removeEventListener('wheel', onIntent, true); W.removeEventListener('touchmove', onIntent, true);
      if (withMusic !== undefined) act(function () { S.music = S.sfx = withMusic; savePref(); reconcile(); });
      // focus on a choice, or nowhere (a click on the curtain leaves Tab's starting point there)
      var a = doc.activeElement;
      if (!a || a === doc.body || intro.contains(a)) toPage();
      intro.setAttribute('aria-hidden', 'true');
      ['role', 'aria-modal', 'aria-labelledby', 'aria-describedby'].forEach(function (a) { intro.removeAttribute(a); });
      // unanswered: once the curtain is up, the question moves to the card in the corner
      var gone = function () { intro.style.display = 'none'; inv.hidden = true; if (withMusic === undefined) offer(inv, 250); };
      if (lifted) { root.classList.remove('snd-inviting'); gone(); return; } // already lifted by the CSS: no second wipe
      root.classList.remove('snd-inviting'); root.classList.add('snd-entering');
      setTimeout(gone, 1000);
    }
    function onIntent() { close(); } // scrolling means the visitor wants to read: the question waits in the corner
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') { // keep focus on the two choices while they are offered
        e.preventDefault();
        var i = choices.indexOf(doc.activeElement), n = choices.length;
        choices[i < 0 ? 0 : (i + (e.shiftKey ? n - 1 : 1)) % n].focus();
        return;
      }
      if (/^(PageDown|PageUp|ArrowDown|ArrowUp|End|Home)$/.test(e.key) || (e.key === ' ' && choices.indexOf(doc.activeElement) < 0)) close();
    }
    choices.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); close(b.getAttribute('data-sound-enter') === 'music'); }); });
    intro.addEventListener('click', function () { close(); }); // a tap on the curtain: in, and the question waits in the corner
    // if the CSS fallback lifts the curtain first (a pointer resting on the choices), follow it:
    // never leave the Tab trap and key handlers behind an invisible curtain
    intro.addEventListener('animationend', function (e) { if (e.target === intro && e.animationName === 'snd-lift') close(undefined, true); });
    // engaged (a pointer on the choices, or Tab between them): the CSS safety lift waits too
    var hold = function () { engaged = true; clearTimeout(timer); root.style.setProperty('--snd-hold', (showIn + 12000) + 'ms'); };
    inv.addEventListener('pointerenter', hold);
    inv.addEventListener('pointerleave', release);
    inv.addEventListener('focusin', function () { if (!auto) hold(); });
    inv.addEventListener('focusout', function () { if (!auto) release(); });
    doc.addEventListener('keydown', onKey, true);
    W.addEventListener('wheel', onIntent, { capture: true, passive: true });
    W.addEventListener('touchmove', onIntent, { capture: true, passive: true });
    // a modal dialog takes focus when it appears (a screen reader then announces it);
    // this programmatic focus does not count as the visitor engaging with it
    var takeFocus = function () {
      if (done || (doc.activeElement && doc.activeElement !== doc.body && !inv.contains(doc.activeElement))) return;
      auto = true;
      try { choices[0].focus({ preventScroll: true }); } catch (e) { choices[0].focus(); }
      auto = false;
    };
    wait(showIn + ASK); // no answer yet: lift the curtain and ask in the corner instead
    focusT = setTimeout(takeFocus, showIn + 60);
    // once the curtain's clock runs: the question rises at 1.5 s of it and the curtain lifts ASK later
    if (ma && ma.ready) ma.ready.then(function () {
      if (done || !started()) return;
      var c0 = ma.startTime, now = performance.now();
      inv.getAnimations().forEach(function (a) { if (a.animationName === 'snd-rise') a.startTime = c0 + 1500 - showIn; });
      due = c0 + 1500 + ASK;
      if (!engaged) wait(Math.max(0, due - now));
      clearTimeout(focusT); focusT = setTimeout(takeFocus, Math.max(0, c0 + 1560 - now));
    }, noop);
  }

  // The same choice when the curtain does not hold it: a small non-modal card above the
  // sound button, shown `delay` ms from now. It comes when the curtain lifts unanswered, and
  // when this script arrived after the curtain had lifted (a slow connection). It covers
  // nothing important, never takes focus (Tab reaches it right after the skip link), and
  // leaves on its own after a while (or once the reader is well into the page): ask again
  // next session.
  function offer(inv, delay) {
    if (!box || !btn) return;
    var done = false, timer, y0 = W.scrollY || 0;
    var choices = $$('[data-sound-enter]', inv), music = choices.filter(function (b) { return b.getAttribute('data-sound-enter') === 'music'; })[0];
    var silence = choices.filter(function (b) { return b !== music; })[0];
    var q = doc.createElement('p');
    q.className = 'snd-invite-q'; q.id = 'snd-invite-q';
    q.setAttribute('aria-live', 'polite');
    inv.insertBefore(q, inv.firstChild);
    var span = music && $('span', music);
    if (span) span.textContent = fmt('ಕೊಳಲು ಪ್ಲೇ ಮಾಡಿ');
    if (silence) silence.textContent = fmt('ಈಗ ಬೇಡ');
    inv.classList.add('snd-invite--card');
    inv.setAttribute('role', 'group'); inv.setAttribute('aria-labelledby', 'snd-invite-q');
    box.insertBefore(inv, btn);
    function close(withMusic) {
      if (done) return; done = true;
      clearTimeout(timer);
      W.removeEventListener('scroll', onScrollAway);
      doc.removeEventListener('keydown', onKey);
      if (withMusic !== undefined) act(function () { S.music = S.sfx = withMusic; savePref(); reconcile(); });
      var hadFocus = inv.contains(doc.activeElement);
      inv.hidden = true;
      cardOpen = false; tuck();
      if (hadFocus) btn.focus();
    }
    // On phones the card sits over the hero's buttons, so it leaves sooner there.
    var narrow = W.innerWidth < 640;
    function onScrollAway() { if (Math.abs((W.scrollY || 0) - y0) > innerHeight * (narrow ? 0.6 : 2.5)) close(); }
    function onKey(e) { if (e.key === 'Escape' && inv.contains(doc.activeElement)) { e.preventDefault(); close(); } }
    choices.forEach(function (b) { b.addEventListener('click', function () { close(b === music); }); });
    btn.addEventListener('click', function () { close(); }); // opening the panel answers it there
    setTimeout(function () {
      if (done || pref) return;
      inv.hidden = false;
      cardOpen = true; tuck();
      setTimeout(function () { q.textContent = fmt('ಓದುವಾಗ ಕೊಳಲಿನ ಸಂಗೀತ ಆಲಿಸಲು ಬಯಸುವಿರಾ?'); }, 80); // announced
      W.addEventListener('scroll', onScrollAway, { passive: true });
      doc.addEventListener('keydown', onKey);
      timer = setTimeout(function () { close(); }, narrow ? 8000 : 16000);
      inv.addEventListener('pointerenter', function () { clearTimeout(timer); });
      inv.addEventListener('pointerleave', function () { if (!done) { clearTimeout(timer); timer = setTimeout(function () { close(); }, 6000); } });
    }, delay === undefined ? 900 : delay);
  }

  /* ---------------- start ---------------- */
  DP.sound = {
    musicOn: function () { return S.music; },
    sfxOn: function () { return S.sfx; },
    setMusic: setMusic,
    setSfx: setSfx,
    setVolume: function (v) { setVolume(v); savePref(); },
    volume: function () { return S.vol; },
    level: level,
    state: function () { return state(); },
    onChange: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; },
    // diagnostics: the loop plan and the last crossfade (its skew between the two elements, s)
    loop: function () { return { from: XFROM, to: XTO, fade: XF, period: period(), last: lastX }; },
  };
  if (S.music || S.sfx) reconcile(); else render();
  invite();
})();
