/* Contact the Ashram (contact.html) — page behaviour.
   · Copy buttons for the phone number, email addresses and postal address.
   · The message form: accessible validation (error summary + inline errors,
     the messages published on dattapeetham.org/contact), a character
     counter, and on submit a mailto: link that opens the visitor's own email
     app with the fields composed into subject and body. There is no backend:
     nothing is sent from this page, and the page says so.
   · The "today" marker on the temple-hours bar, from Mysuru time (IST).
   Everything works without GSAP; without JS the form falls back to a plain
   mailto: form with native validation. */
(function () {
  'use strict';
  var doc = document;
  var DP = window.DP || {};
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var TO = 'mail@dattapeetham.com';

  /* ---------------- clipboard ---------------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = doc.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0';
      doc.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
      doc.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }
  var copyLive = $('[data-copy-live]');
  function announce(el, msg) { if (!el) return; el.textContent = ''; setTimeout(function () { el.textContent = msg; }, 40); }

  var canCopy = !!(navigator.clipboard || doc.queryCommandSupported && doc.queryCommandSupported('copy'));
  $$('[data-copy]').forEach(function (b) {
    if (!canCopy) return;
    b.hidden = false;
    var label = $('[data-copy-text]', b), timer;
    b.addEventListener('click', function () {
      copyText(b.getAttribute('data-copy')).then(function () {
        b.classList.add('is-done'); if (label) label.textContent = 'Copied';
        announce(copyLive, 'Copied the ' + b.getAttribute('data-copy-label') + '.');
      }, function () {
        if (label) label.textContent = 'Copy failed';
        announce(copyLive, 'Sorry, copying did not work. Please select the text instead.');
      });
      clearTimeout(timer);
      timer = setTimeout(function () { b.classList.remove('is-done'); if (label) label.textContent = 'Copy'; }, 2400);
    });
  });

  /* ---------------- temple hours bar: "now" marker ---------------- */
  var nowMark = $('[data-day-now]');
  function istMins() {
    if (DP.istNow) return DP.istNow().mins;
    var o = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
    return +o.hour * 60 + +o.minute;
  }
  function placeNow() {
    if (!nowMark) return;
    nowMark.style.setProperty('--now', (istMins() / 1440 * 100).toFixed(2) + '%');
    nowMark.hidden = false;
  }
  placeNow(); setInterval(placeNow, 30000);

  /* ---------------- the message form ---------------- */
  var form = $('[data-contact-form]');
  if (!form) return;
  form.setAttribute('novalidate', '');

  var F = {
    name: $('#ct-name', form), email: $('#ct-email', form), cc: $('#ct-cc', form), phone: $('#ct-phone', form),
    purpose: $('#ct-purpose', form), message: $('#ct-message', form),
  };
  var summary = $('[data-errors]', form), summaryTitle = $('[data-errors-title]', form), summaryList = $('[data-errors-list]', form);
  var result = $('[data-result]', form), resultTitle = $('[data-result-title]', form), formLive = $('[data-form-live]', form);
  var counter = $('[data-counter]', form), count = $('[data-msg-count]', form), ccFace = $('[data-cc-face]', form);
  var submitted = false, touched = {}, lastMail = null;

  // Field labels for the error summary.
  var LABEL = { name: 'Name', email: 'Email ID', phone: 'Phone', purpose: 'Purpose', message: 'Message' };

  // Validation messages: the first of each set is published on the official
  // contact page; the others cover the same limits in the same voice.
  function check(key) {
    var v;
    switch (key) {
      case 'name':
        v = F.name.value.trim();
        if (!v) return 'Please enter your Name';
        if (v.length < 3) return 'Please enter at least 3 characters';
        return '';
      case 'email':
        v = F.email.value.trim();
        if (!v) return 'Please enter your Email ID';
        if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v)) return 'Please enter a valid Email ID, like name@example.com';
        return '';
      case 'phone':
        v = F.phone.value.trim();
        if (!v) return '';
        var digits = v.replace(/[\s-]/g, '');
        if (/\D/.test(digits)) return 'Please use digits only';
        if (digits.length < 8) return 'Please enter at least 8 digits';
        if (digits.length > 15) return 'Please enter no more than 15 digits';
        return '';
      case 'purpose':
        return F.purpose.value ? '' : 'Please select Purpose';
      case 'message':
        v = F.message.value.trim();
        if (!v) return 'Please enter Message';
        if (v.length < 10) return 'Please enter at least 10 characters';
        return '';
    }
    return '';
  }

  function show(key, msg) {
    var input = F[key], wrap = input.closest('[data-field]'), err = $('[data-err]', wrap);
    wrap.classList.toggle('is-invalid', !!msg);
    var hasValue = key === 'purpose' ? !!input.value : !!input.value.trim();
    wrap.classList.toggle('is-valid', !msg && hasValue);
    err.textContent = msg || '';
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }

  var KEYS = ['name', 'email', 'phone', 'purpose', 'message'];
  // Errors appear on submit, then update live as the visitor fixes them
  // (the GOV.UK pattern). Showing errors on blur would shift the layout under
  // the pointer and can swallow the click on the submit button.
  KEYS.forEach(function (key) {
    var input = F[key];
    input.addEventListener('blur', function () {
      if (submitted) { show(key, check(key)); return; }
      var wrap = input.closest('[data-field]');
      var hasValue = key === 'purpose' ? !!input.value : !!input.value.trim();
      wrap.classList.toggle('is-valid', touched[key] && hasValue && !check(key));
    });
    input.addEventListener(key === 'purpose' ? 'change' : 'input', function () {
      touched[key] = true;
      var wrap = input.closest('[data-field]');
      if (submitted || wrap.classList.contains('is-invalid')) show(key, check(key));
      else if (wrap.classList.contains('is-valid') && check(key)) wrap.classList.remove('is-valid');
      if (submitted && !summary.hidden) refreshSummary(false);
    });
  });

  // Country-code face: shows the chosen code over the (transparent) native select.
  function syncCC() {
    if (!ccFace) return;
    var opt = F.cc.options[F.cc.selectedIndex];
    var iso = opt.getAttribute('data-iso');
    ccFace.innerHTML = iso ? '<small>' + iso + '</small>' + opt.value : 'ಇತರ';
  }
  F.cc.addEventListener('change', syncCC); syncCC();

  // Message counter.
  function syncCount() {
    var n = F.message.value.length;
    count.textContent = n;
    counter.classList.toggle('is-near', n >= 450);
  }
  F.message.addEventListener('input', syncCount); syncCount();

  function refreshSummary(focus) {
    var bad = KEYS.map(function (k) { return [k, check(k)]; }).filter(function (x) { return x[1]; });
    if (!bad.length) { summary.hidden = true; return bad; }
    summaryTitle.textContent = bad.length === 1 ? 'Please check 1 field before continuing' : 'Please check ' + bad.length + ' fields before continuing';
    summaryList.innerHTML = '';
    bad.forEach(function (x) {
      var li = doc.createElement('li'), a = doc.createElement('a');
      a.href = '#' + F[x[0]].id; a.textContent = LABEL[x[0]] + ': ' + x[1];
      a.addEventListener('click', function (e) { e.preventDefault(); F[x[0]].focus(); });
      li.appendChild(a); summaryList.appendChild(li);
    });
    summary.hidden = false;
    if (focus) summary.focus();
    return bad;
  }

  function compose() {
    var name = F.name.value.trim(), email = F.email.value.trim(), purpose = F.purpose.value;
    var digits = F.phone.value.trim().replace(/[\s-]/g, '');
    var phone = digits ? ((F.cc.value ? '+' + F.cc.value.replace(/^\+/, '') + ' ' : '') + digits) : 'Not given';
    var subject = purpose + ': message from ' + name;
    var body = [
      F.message.value.trim(),
      '',
      '----',
      'Name: ' + name,
      'Email ID: ' + email,
      'Phone: ' + phone,
      'Purpose: ' + purpose,
      '',
      'Written on the Contact page of the Avadhoota Datta Peetham website.',
    ].join('\n');
    return {
      subject: subject, body: body,
      href: 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body.replace(/\n/g, '\r\n')),
    };
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submitted = true;
    KEYS.forEach(function (k) { show(k, check(k)); });
    var bad = refreshSummary(true);
    if (bad.length) { result.hidden = true; return; }

    lastMail = compose();
    $('[data-preview-subject]', form).textContent = lastMail.subject;
    $('[data-preview-body]', form).textContent = lastMail.body;
    $('[data-mailto]', form).href = lastMail.href;
    result.hidden = false;
    announce(formLive, 'Opening your email app with your message to ' + TO + '. It is not sent until you press Send there.');
    // Open the visitor's email app. Nothing leaves this page by itself.
    window.location.href = lastMail.href;
    setTimeout(function () {
      var hh = (doc.querySelector('[data-header]') || {}).offsetHeight || 84;
      if (DP.scrollTo) DP.scrollTo(result, { offset: -(hh + 36) }); else result.scrollIntoView({ block: 'center' });
      resultTitle.focus({ preventScroll: true });
    }, 120);
  });

  $('[data-copy-message]', form).addEventListener('click', function () {
    if (!lastMail) return;
    var b = this, label = b.querySelector('span');
    copyText('To: ' + TO + '\nSubject: ' + lastMail.subject + '\n\n' + lastMail.body).then(function () {
      label.textContent = 'Copied';
      announce(formLive, 'Message copied. Paste it into a new email to ' + TO + '.');
      setTimeout(function () { label.textContent = 'ಸಂದೇಶವನ್ನು ನಕಲಿಸಿ'; }, 2400);
    }, function () {
      announce(formLive, 'Copying did not work. Open “See the composed email” and select the text instead.');
    });
  });

  $('[data-edit]', form).addEventListener('click', function () {
    result.hidden = true;
    F.message.focus();
  });

  form.addEventListener('reset', function () {
    setTimeout(function () {
      submitted = false; touched = {}; lastMail = null;
      KEYS.forEach(function (k) {
        var wrap = F[k].closest('[data-field]');
        wrap.classList.remove('is-invalid', 'is-valid');
        $('[data-err]', wrap).textContent = '';
        F[k].removeAttribute('aria-invalid');
      });
      summary.hidden = true; result.hidden = true;
      syncCC(); syncCount();
      announce(formLive, 'The form has been cleared.');
    }, 0);
  });
})();
