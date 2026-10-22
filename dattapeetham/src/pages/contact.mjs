// Contact the Ashram (contact.html): how to reach the Ashram office by phone,
// email and post, a message form that composes an email in the visitor's own
// email app (there is no backend, so nothing is sent from this site), the map
// with directions, live temple status, the Peetham's social pages, a short FAQ
// from sourced facts, and a closing call to action.
//
// Sources (harvest folder and live pages, fetched 2026-10-22):
//   dattapeetham.org/contact — "Please use Contact page for personal requests
//     and messages to the Ashrama. For all website application / program
//     issues kindly use the Feedback / Support option." Form fields, the
//     purpose options (Personal Request, Abuse, Complaint, Other — four
//     separate <option>s in the live markup), the validation limits and the
//     published validation messages, the +91 default and the country list.
//   dattapeetham.org/page/view/guidelines-for-visitors — contact block
//     (Tel (0821)-2486486, mail@dattapeetham.com, Dattanagar, Nanjangud Road,
//     Mysore 570 025), stay rules, permission via H. V. Prasad, ID documents,
//     route, 11 PM gates, 9 PM road advice, buses 119 / 119A, autos.
//   dattapeetham.org (homepage) — temple timings, Hanuman Abhisheka / Aarti,
//     and the Bhaktimala announcement (bhaktimala@sgstech.cc for existing
//     English and Kannada subscribers; new subscriptions via the Bhaktimala
//     office at Datta Peetham Mysore).
//   dattapeetham.org/page/view/karya-siddhi-hanuman-temple and
//     /sri-datta-venkateshwara-temple — each lists its own weekday and weekend
//     hours, so the homepage's Temple Timings are not presented as every
//     shrine's hours.
//   dattapeetham.org/youtube — a list of the Peetham's YouTube channels (not a
//     live stream), hence "YouTube channels" in the closing CTA.
//   dattapeetham.org/page/view/social-media-pages — social accounts.
//   dattapeetham.org/ashrams/avadhoota-datta-peetham-mysore-main — Email / SMS
//     subscribe.
// plus shared facts in site.mjs (site, links, hours).

import { pageHero, ornament, accordion, ctaBand, btn, icon, esc } from '../components.mjs';
import { site, links, hours, OFFICIAL, PAGE_IMG } from '../site.mjs';

/* ---------------------------------------------------------------------------
   Photographs (Peetham S3 bucket) and source links
--------------------------------------------------------------------------- */
const P = {
  hero: `${PAGE_IMG}522/522_e6aadc94cb31b022.jpg`,     // Sri Swamiji speaking, hand raised in blessing (sri-swamiji page: "Sri Swamiji preaches")
  cta: `${PAGE_IMG}528/528_c68ebdc62bc6a30b.jpeg`,     // Sri Swamiji before the decorated Karya Siddhi Hanuman
};

const SRC = {
  contact: `${OFFICIAL}/contact`,
  guidelines: `${OFFICIAL}/page/view/guidelines-for-visitors`,
  social: `${OFFICIAL}/page/view/social-media-pages`,
};

const BHAKTIMALA = 'bhaktimala@sgstech.cc';
const PHONE_INTL = '+91 821 2486 486';

/* ---------------------------------------------------------------------------
   Small helpers
--------------------------------------------------------------------------- */
const fmt = (t) => { const [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${ap}`; };
const pct = (t) => { const [h, m] = t.split(':').map(Number); return +(((h * 60 + m) / 1440) * 100).toFixed(3); };
const sessions = hours.temple.sessions;
const strip = (html) => html.replace(/<\/p>\s*<p[^>]*>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const copyIcon = (size = 14) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6.7a2.2 2.2 0 0 0-2.2-2.2H6.7a2.2 2.2 0 0 0-2.2 2.2v6.6a2.2 2.2 0 0 0 2.2 2.2h1.8"/></g></svg>`;
const copyBtn = (value, what) => `<button type="button" class="ct-copy" data-copy="${esc(value)}" data-copy-label="${esc(what)}" hidden>${copyIcon()}<span data-copy-text>Copy</span><span class="visually-hidden"> ${esc(what)}</span></button>`;

// X (Twitter) mark in the sprite's line style; the shared sprite has no X icon.
const xIcon = (size = 18) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.5 4h4.2l10.8 16h-4.2zM19 4l-6.1 7M5 20l6.1-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const sIcon = (name, size) => (name === 'x' ? xIcon(size) : icon(name, size));

/* ===========================================================================
   Content
=========================================================================== */

// Contact cards: each value is quoted from the sources above.
const reach = [
  {
    key: 'phone', icon: 'phone', label: 'Telephone',
    value: `<a href="${site.phoneHref}">${site.phone}</a>`,
    sub: 'Ashram office, Mysuru',
    note: `From outside India, dial <span class="ct-nowrap">${PHONE_INTL}</span>.<span class="ct-js-only"> It is now <b data-clock>--:--</b> in Mysuru.</span>`,
    actions: `${btn('Call the Ashram', site.phoneHref, 'gold', 'phone')}${copyBtn(PHONE_INTL, 'phone number')}`,
  },
  {
    key: 'email', icon: 'mail', label: 'Email',
    value: `<a href="mailto:${site.email}">${site.email}</a>`,
    sub: 'Personal requests &amp; messages',
    note: 'Write directly, or use the form below: it opens your email app with your message ready to send.',
    actions: `${btn('Use the form', '#write', 'line', 'arrow')}${copyBtn(site.email, 'email address')}`,
  },
  {
    key: 'post', icon: 'pin', label: 'Postal address',
    value: `<address>${site.name}<br>${site.ashram}<br>Datta Nagar, Ooty Road (Nanjangud Road)<br>Mysuru 570 025, Karnataka, India</address>`,
    sub: '',
    note: '',
    actions: `${btn('Get directions', links.directions, 'line', 'arrow-up-right')}${copyBtn(`${site.name}, ${site.ashram}, Datta Nagar, Ooty Road (Nanjangud Road), Mysuru 570 025, Karnataka, India`, 'postal address')}`,
  },
  {
    key: 'stay', icon: 'user', label: 'Permission to visit &amp; stay',
    value: 'H. V. Prasad',
    sub: 'Personal secretary to Sri Swamiji',
    note: 'Seek permission well in advance, by letter, phone, fax or email. Once your plans are final, tell the Ashram your arrival date, the number in your party and how long you will stay.',
    actions: `${btn('Visitor guidelines', 'visit.html#guidelines', 'line', 'arrow')}`,
  },
  {
    key: 'bhaktimala', icon: 'book', label: 'Bhaktimala app',
    value: `<a href="mailto:${BHAKTIMALA}">${BHAKTIMALA}</a>`,
    sub: 'For existing English &amp; Kannada subscribers',
    note: 'Write to enable access to the Bhaktimala app, which holds the monthly issues from October 2022 onwards. For new subscriptions, please contact the Bhaktimala office at Datta Peetham, Mysuru.',
    actions: `${btn('Email Bhaktimala', `mailto:${BHAKTIMALA}`, 'line', 'mail')}${copyBtn(BHAKTIMALA, 'Bhaktimala email address')}`,
  },
  {
    key: 'support', icon: 'info', label: 'Website &amp; apps',
    value: `<a href="${links.techSupport}">Feedback / Support</a>`,
    sub: 'Website application &amp; programme issues',
    note: 'Kindly use Feedback / Support for these. The Contact page is for personal requests and messages to the Ashrama.',
    actions: `${btn('Open Feedback / Support', links.techSupport, 'line', 'arrow-up-right')}`,
  },
];

// Short list of dialling codes (codes as the contact page's own dropdown gives
// them): its four pinned entries (India, United States, Canada, United
// Kingdom), then the other countries the homepage names where Datta Kriya
// Yoga camps were held (Australia, Belgium, France, Germany, Holland,
// Malaysia, Singapore, Switzerland, Trinidad), alphabetically. Anyone else
// picks "Other" and types their own code.
const countries = [
  ['IN', 'India', '+91'], ['US', 'United States', '+1'], ['CA', 'Canada', '+1'], ['GB', 'United Kingdom', '+44'],
  ['AU', 'Australia', '+61'], ['BE', 'Belgium', '+32'], ['FR', 'France', '+33'], ['DE', 'Germany', '+49'],
  ['MY', 'Malaysia', '+60'], ['NL', 'Netherlands', '+31'], ['SG', 'Singapore', '+65'],
  ['CH', 'Switzerland', '+41'], ['TT', 'Trinidad and Tobago', '+1-868'],
];

// Purposes exactly as the live form lists them.
const purposes = ['Personal Request', 'Abuse', 'Complaint', 'Other'];

// Social accounts (social-media-pages).
const socials = [
  { who: 'Avadhoota Datta Peetham', items: [
    ['fb', 'Facebook', 'https://www.facebook.com/sgspage'],
    ['yt', 'YouTube', 'https://www.youtube.com/@DattaPeetham'],
    ['ig', 'Instagram', 'https://www.instagram.com/dattapeetham/'],
    ['x', 'X', 'https://x.com/dattapeetham'],
  ] },
  { who: 'Sri Ganapathy Sachchidananda Swamiji', items: [
    ['fb', 'Facebook', 'https://www.facebook.com/SriSwamiji'],
    ['yt', 'YouTube', 'https://www.youtube.com/@sgsswamiji'],
    ['ig', 'Instagram', 'https://www.instagram.com/sgsswamiji/'],
    ['x', 'X', 'https://x.com/SgsSwamiji'],
  ] },
];

// FAQ: only facts the Peetham publishes.
// Temple hours: the homepage's single "Temple Timings" block (site.mjs
// hours.temple) and its Hanuman Temple line. The Karya Siddhi Hanuman and Sri
// Datta Venkateshwara temple pages list their own weekday and weekend hours,
// so the answer keeps the homepage's scope and points to the darshan page.
const [morning, evening] = sessions.map(([a, b]) => `${fmt(a)} – ${fmt(b)}`);
const faq = [
  ['What are the temple darshan timings?',
    `<p>The Peetham’s homepage gives the Temple Timings as ${morning} in the morning and ${evening} in the evening, and lists Abhisheka at 7 AM and Aarti at 6 PM daily at the Hanuman temple.</p><p>Some shrines keep their own hours: the Karya Siddhi Hanuman and Sri Datta Venkateshwara temple pages list different weekday and weekend timings. Please check the temple you plan to visit.</p><p><a class="link-arrow" href="darshan.html#timings">All temple timings ${icon('arrow', 15)}</a></p>`],
  ['Can I stay at the Ashram?',
    `<p>Persons of all faiths are welcome, but facilities are limited and are primarily maintained for devotees of Sri Swamiji. Visitors are requested to stay in hotels in Mysuru and visit the Ashram daily for its programmes.</p><p>Those seeking a brief stay should first attend Ashram programmes consistently for at least a week; the Ashram Administrator handles such inquiries. No visitors may stay while Sri Swamiji or Sri Bala Swamiji are out of station, and during major functions all newcomers must find accommodation elsewhere.</p><p><a class="link-arrow" href="visit.html#stay">Hotels near the Ashram ${icon('arrow', 15)}</a></p>`],
  ['Whom do I ask for permission to visit and stay?',
    `<p>Even those known to the Ashram staff and to Sri Swamiji should ask in advance, by letter, phone, fax or email, to H. V. Prasad, personal secretary to Sri Swamiji. Once your plans are final, notify the Ashram of your arrival date, the number in your party and your expected duration of stay.</p><p>Carry photocopies of a Government-approved identity proof or passport, and passport photos, for every member of your family or group; they are submitted to the Ashrama office on arrival, as a government regulation.</p>`],
  ['How do I reach the Ashram?',
    `<p>The Ashram is at Datta Nagar on Ooty Road (Nanjangud Road), Mysuru. For a first visit from overseas the Peetham recommends flying to Bengaluru and hiring a taxi to Mysuru from the desks in the airport arrival hall.</p><p>In Mysuru, city bus 119 runs from the City Bus Stand directly to the Ashram, and 119A goes via JSS Medical College. Auto rickshaws and cabs from the railway station take about 15–20 minutes.</p><p><a class="link-arrow" href="visit.html#how-to-reach">How to reach, step by step ${icon('arrow', 15)}</a></p>`],
  ['What if I arrive late at night?',
    `<p>The Ashram’s gates close at 11 PM, so if you arrive late at night, please stay in a hotel. Travelling by road from Bengaluru to Mysuru after 9 PM is not advised.</p>`],
  ['Where do I report a problem with the website or the apps?',
    `<p>For all website application and programme issues, please use <a href="${links.techSupport}">Feedback / Support</a>. This page, and the Ashram office, are for personal requests and messages.</p>`],
  ['Can I book a puja or make a donation here?',
    `<p>No. Puja bookings and donations are made on the Peetham’s existing online system, not through this form: <a href="${links.poojas}">book a puja</a> or <a href="${links.donations}">make a donation</a> there.</p>`],
];

/* ===========================================================================
   Sections
=========================================================================== */

const hero = pageHero({
  eyebrow: 'Contact',
  title: 'Contact the <span class="em-light">Ashram</span>',
  lead: 'Personal requests and messages to the Ashrama, the way to Datta Nagar, and the right desk for every question.',
  image: P.hero,
  pos: '30% 32%',
  crumb: 'Contact',
  tiles: [
    { icon: 'phone', title: 'Call the Ashram', note: site.phone, href: site.phoneHref },
    { icon: 'mail', title: 'Write to Us', note: 'Opens your email app', href: '#write' },
    { icon: 'map', title: 'Find Us', note: 'Map &amp; Directions', href: '#visit-info' },
    { icon: 'info', title: 'Website Support', note: 'Feedback / Support', href: links.techSupport },
  ],
});

const reachSection = `<section id="reach-us" class="section ct-reach" aria-labelledby="reach-h">
  <div class="wrap">
    <header class="section-head">
      ${ornament()}
      <span class="eyebrow">Reach us</span>
      <h2 id="reach-h" data-split>The right desk for <span class="em-light">every question</span></h2>
      <p class="lead" data-reveal="up">Please use these contacts for personal requests and messages to the Ashrama. For all website application and programme issues, kindly use <a href="${links.techSupport}">Feedback / Support</a>.</p>
    </header>
    <div class="ct-cards" data-stagger>
      ${reach.map((c) => `<article class="ct-card ct-card-${c.key}">
        <span class="ct-card-thread" aria-hidden="true"></span>
        <div class="ct-card-top">
          <span class="ct-card-icon">${icon(c.icon, 24)}</span>
          <h3 class="ct-card-label">${c.label}</h3>
        </div>
        <div class="ct-value">${c.value}</div>
        ${c.sub ? `<p class="ct-sub">${c.sub}</p>` : ''}
        ${c.note ? `<p class="ct-note">${c.note}</p>` : ''}
        <div class="ct-actions">${c.actions}</div>
      </article>`).join('')}
    </div>
    <p class="visually-hidden" aria-live="polite" data-copy-live></p>
  </div>
</section>`;

const field = ({ id, name, label, type = 'text', attrs = '', hint = '' }) => `<div class="field ct-field" data-field="${name}">
  <label for="ct-${id}">${label}</label>
  <span class="ct-control">
    <input id="ct-${id}" name="${name}" type="${type}" ${attrs} aria-describedby="${hint ? `ct-${id}-hint ` : ''}ct-${id}-err">
    <span class="ct-ok" aria-hidden="true">${icon('check', 14)}</span>
  </span>
  ${hint ? `<p class="ct-hint" id="ct-${id}-hint">${hint}</p>` : ''}
  <p class="ct-err" id="ct-${id}-err" data-err></p>
</div>`;

const req = '<span class="ct-star" aria-hidden="true">*</span>';

const form = `<form class="ct-form panel" id="contact-form" action="mailto:${site.email}" method="post" enctype="text/plain" data-contact-form aria-labelledby="ct-form-h" data-reveal="up">
  <div class="ct-form-head">
    <h3 id="ct-form-h">Your message</h3>
    <p class="ct-req">${req} required</p>
  </div>

  <div class="ct-errors" data-errors role="alert" tabindex="-1" hidden>
    ${icon('info', 18)}
    <div><p class="ct-errors-title" data-errors-title>Please check the form</p><ul data-errors-list></ul></div>
  </div>

  <div class="field-row">
    ${field({ id: 'name', name: 'name', label: `Name ${req}`, attrs: 'autocomplete="name" required minlength="3" maxlength="100" placeholder="Your full name"' })}
    ${field({ id: 'email', name: 'email', label: `Email ID ${req}`, type: 'email', attrs: 'autocomplete="email" required maxlength="200" placeholder="name@example.com" spellcheck="false"' })}
  </div>

  <fieldset class="field ct-field ct-phone" data-field="phone">
    <legend>Phone <span class="ct-opt">optional</span></legend>
    <div class="ct-phone-row">
      <span class="ct-cc">
        <label class="visually-hidden" for="ct-cc">Country code</label>
        <select id="ct-cc" name="country_code" autocomplete="tel-country-code">
          ${countries.map(([code, name, isd], i) => `<option value="${isd}" data-iso="${code}"${i === 0 ? ' selected' : ''}>${name} ${isd}</option>`).join('')}
          <option value="">Other (add the code to the number)</option>
        </select>
        <span class="ct-cc-face" aria-hidden="true" data-cc-face>+91</span>
        ${icon('chev', 12)}
      </span>
      <span class="ct-control">
        <label class="visually-hidden" for="ct-phone">Phone number</label>
        <input id="ct-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="Phone number" pattern="[0-9 \\-]{8,24}" maxlength="24" aria-describedby="ct-phone-hint ct-phone-err">
        <span class="ct-ok" aria-hidden="true">${icon('check', 14)}</span>
      </span>
    </div>
    <p class="ct-hint" id="ct-phone-hint">So the Ashram can call you back if needed. Digits only, 8 to 15.</p>
    <p class="ct-err" id="ct-phone-err" data-err></p>
  </fieldset>

  <div class="field ct-field" data-field="purpose">
    <label for="ct-purpose">Purpose ${req}</label>
    <span class="ct-control ct-select">
      <select id="ct-purpose" name="purpose" required aria-describedby="ct-purpose-err">
        <option value="">Choose a purpose</option>
        ${purposes.map((p) => `<option>${p}</option>`).join('')}
      </select>
      ${icon('chev', 12)}
    </span>
    <p class="ct-err" id="ct-purpose-err" data-err></p>
  </div>

  <div class="field ct-field" data-field="message">
    <label for="ct-message">Message ${req}</label>
    <span class="ct-control">
      <textarea id="ct-message" name="message" rows="6" required minlength="10" maxlength="500" placeholder="Write your request or message to the Ashrama" aria-describedby="ct-message-hint ct-message-err"></textarea>
    </span>
    <p class="ct-hint ct-hint-row" id="ct-message-hint"><span>10 to 500 characters.</span><span class="ct-counter" data-counter><b data-msg-count>0</b> / 500</span></p>
    <p class="ct-err" id="ct-message-err" data-err></p>
  </div>

  <div class="ct-submit">
    <button class="btn btn-gold" type="submit" data-magnetic>${icon('mail', 16)}<span>Open in my email app</span>${icon('arrow', 16)}</button>
    <button class="btn btn-line ct-reset" type="reset">Clear</button>
  </div>
  <p class="ct-honest" id="ct-honest">${icon('info', 16)}<span><b>This opens your email app; for website issues use <a href="${links.techSupport}">Feedback / Support</a>.</b> Nothing is sent from this website: your words become a new email to ${site.email}, and it goes only when you press Send there.</span></p>

  <div class="ct-result" data-result hidden>
    <span class="ct-result-icon" aria-hidden="true">${icon('mail', 22)}</span>
    <div class="ct-result-body">
      <h4 tabindex="-1" data-result-title>Your email app should now be open</h4>
      <p>Your message has been composed as a new email to <b>${site.email}</b>. Review it and press <b>Send</b> in your email app. It has not been sent yet.</p>
      <p class="ct-result-fallback">Nothing opened? <a href="mailto:${site.email}" data-mailto>Try opening it again</a>, or copy the message and paste it into a new email to ${site.email}.</p>
      <div class="ct-result-actions">
        <button type="button" class="btn btn-line btn-sm" data-copy-message>${copyIcon(15)}<span>Copy message</span></button>
        <button type="button" class="btn btn-ink btn-sm" data-edit>${icon('arrow-left', 14)}<span>Edit message</span></button>
      </div>
      <details class="ct-preview">
        <summary>See the composed email</summary>
        <dl><dt>To</dt><dd>${site.email}</dd><dt>Subject</dt><dd data-preview-subject></dd></dl>
        <pre data-preview-body></pre>
      </details>
    </div>
  </div>
  <p class="visually-hidden" role="status" aria-live="polite" data-form-live></p>
</form>`;

const writeSection = `<section id="write" class="section section-sand ct-write" aria-labelledby="write-h">
  <div class="wrap ct-write-grid">
    <div class="ct-guide panel panel-dark grain" data-reveal="left">
      <svg class="ct-guide-mandala" viewBox="0 0 104 104" aria-hidden="true"><use href="#i-mandala"/></svg>
      <span class="eyebrow">Write to the Ashram</span>
      <h2 id="write-h" data-split>Send a <span class="em-light">message</span></h2>
      <p>Please use this form for personal requests and messages to the Ashrama. There is no inbox behind this page: the form simply prepares an email in your own email app, addressed to the Ashram office.</p>
      <div class="ct-steps" data-progress="0.85,0.45">
        <span class="ct-steps-line" aria-hidden="true"><i></i></span>
        <ol>
        <li><span class="ct-step-dot" aria-hidden="true">1</span><div><b>Fill in the form</b><span>Name, email, purpose and your message.</span></div></li>
        <li><span class="ct-step-dot" aria-hidden="true">2</span><div><b>Your email app opens</b><span>A new email to ${site.email}, already written.</span></div></li>
        <li><span class="ct-step-dot" aria-hidden="true">3</span><div><b>Review and press Send</b><span>It is sent from your own email account.</span></div></li>
        </ol>
      </div>
      <div class="ct-guide-alt">
        <p><b>Website or app issue?</b> For all website application and programme issues, kindly use <a href="${links.techSupport}">Feedback / Support</a>.</p>
        <p><b>Prefer to write directly?</b> <a href="mailto:${site.email}">${site.email}</a></p>
      </div>
    </div>
    ${form}
  </div>
</section>`;

const dayBar = `<div class="ct-day" aria-hidden="true">
  <div class="ct-day-track">
    ${sessions.map(([a, b]) => `<span class="ct-day-seg" style="--a:${pct(a)}%;--b:${pct(b)}%"></span>`).join('')}
    <span class="ct-day-now" data-day-now hidden><i></i></span>
  </div>
  <div class="ct-day-ticks">
    ${[...new Set(sessions.flat())].map((t) => `<span style="--x:${pct(t)}%">${fmt(t).replace(':00', '')}</span>`).join('')}
  </div>
</div>`;

const visitSection = `<section id="visit-info" class="section section-dark ct-visit" aria-labelledby="visit-h">
  <div class="ct-visit-glow" aria-hidden="true"></div>
  <div class="wrap">
    <header class="section-head is-light">
      ${ornament()}
      <span class="eyebrow">Visit</span>
      <h2 id="visit-h" data-split>Find your way to <span class="em-light">Datta Nagar</span></h2>
      <p class="lead" data-reveal="up">The Ashram sits on Ooty Road (Nanjangud Road), at the foot of Chamundi Hill in Mysuru. Persons of all faiths are welcome.</p>
    </header>

    <div class="ct-visit-grid">
      <figure class="ct-map" data-reveal="clip">
        <div class="ct-map-frame">
          <div class="ct-map-ph" aria-hidden="true">
            <svg class="ct-map-rings" viewBox="0 0 400 400"><circle cx="200" cy="200" r="60"/><circle cx="200" cy="200" r="110"/><circle cx="200" cy="200" r="160"/><circle cx="200" cy="200" r="210"/><path d="M200 0v400M0 200h400"/></svg>
            <span class="ct-map-ph-pin">${icon('pin', 26)}</span>
            <span class="ct-map-ph-text"><b>Datta Nagar, Mysuru</b>12.2854° N · 76.6579° E<small>Google Map. If it does not load, use Directions.</small></span>
          </div>
          <iframe src="${links.mapEmbed}" title="Map: Avadhoota Datta Peetham, Sri Ganapathy Sachchidananda Ashram, Mysuru" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
        </div>
        <figcaption class="ct-map-card glass">
          <span class="ct-map-pin" aria-hidden="true">${icon('pin', 20)}</span>
          <span><b>${site.name}</b>${site.ashram}, Datta Nagar, Ooty Road, Mysuru 570 025</span>
          ${btn('Directions', links.directions, 'gold', 'arrow-up-right', ' data-magnetic')}
        </figcaption>
      </figure>

      <div class="ct-visit-side">
        <article class="ct-live glass" data-reveal="up" aria-labelledby="live-h">
          <header class="ct-live-head">
            <h3 id="live-h">Right now in Mysuru</h3>
            <span class="ct-clock ct-js-only">${icon('clock', 15)}<b data-clock>--:--</b></span>
          </header>
          <p class="ct-live-status ct-js-only"><i class="dot" data-dot="temple"></i><span>Temple darshan <b data-status-long="temple">·</b></span></p>
          ${dayBar}
          <dl class="ct-hours">
            ${sessions.map(([a, b], i) => `<div><dt>${i === 0 ? 'Morning' : 'Evening'}</dt><dd>${fmt(a)} – ${fmt(b)}</dd></div>`).join('')}
            <div class="ct-hours-ritual"><dt>Hanuman Temple</dt><dd>Abhisheka 7 AM · Aarti 6 PM<span class="ct-js-only ct-next">Next: <b data-next-ritual></b></span></dd></div>
          </dl>
          <p class="ct-live-note">Temple darshan hours as listed on the Peetham’s homepage; individual shrines may keep their own hours. The Ashram gates close at 11 PM.</p>
          <a class="link-arrow" href="darshan.html#timings">All temple timings ${icon('arrow', 15)}</a>
        </article>

        <div class="ct-way" data-reveal="up">
          <h3>Getting here</h3>
          <ul class="ct-way-list">
            <li>${icon('plane', 20)}<span><b>By air</b>Fly to Bengaluru, then take a taxi to Mysuru from the airport arrival hall.</span></li>
            <li>${icon('bus', 20)}<span><b>By city bus</b>Bus 119 from the Mysuru City Bus Stand runs directly to the Ashram; 119A goes via JSS Medical College.</span></li>
            <li>${icon('car', 20)}<span><b>From the railway station</b>Auto rickshaws and cabs take about 15–20 minutes.</span></li>
          </ul>
          <div class="btn-row">
            ${btn('Get directions', links.directions, 'gold', 'pin', ' data-magnetic')}
            ${btn('How to reach', 'visit.html#how-to-reach', 'ghost', 'arrow')}
          </div>
        </div>
      </div>
    </div>

    <div class="ct-social" data-reveal="up">
      <div class="ct-social-intro">
        <h3>Stay connected</h3>
        <p>The Peetham’s official pages on social media. <a class="link-arrow" href="media.html#social">All social pages ${icon('arrow', 15)}</a></p>
      </div>
      <div class="ct-social-groups">
        ${socials.map((g) => `<div class="ct-social-group">
          <span class="ct-social-who">${g.who}</span>
          <ul>${g.items.map(([ic, label, href]) => `<li><a href="${href}" aria-label="${esc(g.who)} on ${label}">${sIcon(ic, 18)}<span>${label}</span></a></li>`).join('')}</ul>
        </div>`).join('')}
      </div>
    </div>
  </div>
</section>`;

const faqSection = `<section id="faq" class="section ct-faq" aria-labelledby="faq-h">
  <div class="wrap ct-faq-grid">
    <header class="ct-faq-head" data-reveal="up">
      <span class="eyebrow">Before you write</span>
      <h2 id="faq-h" data-split>Questions visitors <span class="em-light">often ask</span></h2>
      <p class="lead">Many answers are already in the Peetham’s guidelines for visitors. If yours is not here, call or write to the Ashram office.</p>
      <div class="btn-row">
        ${btn('Write to the Ashram', '#write', 'gold', 'mail')}
        ${btn('Call', site.phoneHref, 'line', 'phone')}
      </div>
      <p class="ct-source">${icon('info', 14)}<span>Answers are drawn from the Peetham’s <a href="${SRC.guidelines}">Guidelines for Visitors</a>, its <a href="${SRC.contact}">Contact page</a> and its homepage.</span></p>
    </header>
    <div class="ct-faq-list" data-reveal="up">${accordion(faq)}</div>
  </div>
</section>`;

const cta = ctaBand({
  title: 'Stay close to the <span class="em-light">Ashram</span>',
  text: 'Subscribe for the Peetham’s updates, watch its YouTube channels, or plan your visit to Mysuru.',
  image: P.cta,
  actions: `${btn('Subscribe for updates', links.subscribe, 'gold', 'arrow-up-right', ' data-magnetic')}${btn('YouTube channels', links.youtube, 'ghost', 'yt')}${btn('Plan your visit', 'visit.html', 'ghost', 'arrow')}`,
});

/* ===========================================================================
   Page
=========================================================================== */
export default {
  slug: 'contact',
  file: 'contact.html',
  title: 'Contact the Ashram',
  crumb: 'Contact',
  description: 'Contact Avadhoota Datta Peetham, Mysuru: Ashram phone, email and address, directions and live temple status, plus a form that opens your own email app.',
  image: P.hero,
  preload: P.hero,
  css: true,
  scripts: ['contact'],
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact the Ashram',
      url: `${site.origin}/contact.html`,
      mainEntity: {
        '@type': 'Organization',
        name: site.name,
        url: site.origin + '/',
        email: site.email,
        telephone: '+91-821-2486486',
        address: { '@type': 'PostalAddress', streetAddress: site.address.street, addressLocality: site.address.city, addressRegion: site.address.region, postalCode: site.address.postal, addressCountry: site.address.country },
        contactPoint: [{ '@type': 'ContactPoint', contactType: 'Ashram office', telephone: '+91-821-2486486', email: site.email }],
        sameAs: socials.flatMap((g) => g.items.map((s) => s[2])),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: strip(a.replace(/<p><a class="link-arrow"[\s\S]*?<\/p>/g, '')) } })),
    },
  ],
  render: () => `${hero}
${reachSection}
${writeSection}
${visitSection}
${faqSection}
${cta}`,
};
