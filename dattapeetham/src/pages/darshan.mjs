// Temples & Darshan — the "Spirituality" inner-page concept.
//
// Every fact on this page comes from dattapeetham.org (page/view/ashram-shrines,
// kaalaagni-shamana-dattatreya, rajarajeshwari-temple,
// sri-datta-venkateshwara-temple, karya-siddhi-hanuman-temple, ashram-life,
// devotee-etiquette, dattapeetham-telecast-timing-of-sri-swamijis-programs,
// /poojas and the 2026 /calendar, all fetched October 2026), or from
// src/data.mjs (timings, latestSevas, timeline) and src/site.mjs (hours, links).
// Photographs are the Peetham's own, from its S3 bucket.

import { pageHero, sectionHead, split, frame, card, ctaBand, processSteps, scrollLit, shareRow, btn, icon, img, esc } from '../components.mjs';
import { links, hours, site, OFFICIAL, PAGE_IMG, KSHETRA_IMG } from '../site.mjs';
import { photos, latestSevas } from '../data.mjs';
import { ghanta, aarti, deepaDivider } from '../features/devotion-motion.mjs';

const view = (slug) => `${OFFICIAL}/page/view/${slug}`;

// Official photographs, by the page they appear on.
const pic = {
  kaalaagni: `${KSHETRA_IMG}01-kalagni-shamana-dattatreya-mysore-karnataka-india.jpg`,
  kumbhabhisheka: `${PAGE_IMG}526/526_e88b9dc2cc6ecfa2.jpg`,
  annadana: `${PAGE_IMG}526/526_18a79af1bd690c69.JPG`,
  annakoota: `${PAGE_IMG}526/526_c5009ca5f3f06179.jpg`,
  deviArati: `${PAGE_IMG}526/526_d126a05ad90b71ef.jpg`,
  sdvtAerial: `${PAGE_IMG}527/527_3e9d83aa1fdb79cf.png`,
  ganapathy: `${PAGE_IMG}527/527_398025271699adef.jpg`,
  padmavathi: `${PAGE_IMG}527/527_dc26632e472dd434.jpg`,
  venkateshwara: `${PAGE_IMG}527/527_e54f0e9f5481af23.jpeg`,
  dhanvantari: `${PAGE_IMG}527/527_9ba09945ab57abed.jpg`,
  subrahmanya: `${PAGE_IMG}527/527_1ad4471b592a4c0b.jpg`,
  shaniDeepa: `${PAGE_IMG}527/527_987096a59cc525fa.jpg`,
  doshaHaraShiva: `${PAGE_IMG}527/527_4e2708a40a3ee0ce.jpg`,
  hanumanSannidhi: `${PAGE_IMG}527/527_f632b558c1c58c74.jpg`,
  hanumanExterior: `${PAGE_IMG}528/528_322ad0b196f6e909.jpg`,
  swamijiAtHanuman: `${PAGE_IMG}528/528_c68ebdc62bc6a30b.jpeg`,
};

// --- small pieces ---------------------------------------------------------

const fmtSession = ([a, b]) => {
  const f = (t) => { const [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; const hh = h % 12 || 12; return `${hh}${m ? ':' + String(m).padStart(2, '0') : ''} ${ap}`; };
  return `${f(a)} – ${f(b)}`;
};
const templeHours = hours.temple.sessions.map(fmtSession).join(' · ');

const deities = (label, list) => `<div class="dn-deities">
  <h3 class="dn-mini">${label}</h3>
  <ul>${list.map((d) => `<li>${d}</li>`).join('')}</ul>
</div>`;

const facts = (rows) => `<dl class="dn-facts">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;

const timingNote = (html, badge) => `<div class="dn-time">
  <span class="dn-time-ic">${icon('clock', 18)}</span>
  <div>${html}${badge ? `<span class="badge" data-badge="${badge}">Checking…</span>` : ''}</div>
</div>`;

// For shrines whose own pages publish no hours: the Peetham's general timings,
// labelled as such.
const generalNote = () => timingNote(`<p><b>General temple timings</b> (Peetham homepage)<br>${hours.temple.sessions.map((x) => `<span class="dn-nw">${fmtSession(x)}</span>`).join(' · ')}</p><p class="dn-time-more"><a href="#timings">All darshan timings</a></p>`);

const source = (href, label) => `<a class="link-arrow dn-source" href="${href}">${label} ${icon('external', 14)}</a>`;

const shrineHead = (n, kicker, title, id) => `<span class="dn-num" aria-hidden="true">${n}</span>
<span class="dn-kicker">${kicker}</span>
<h2 id="${id}-h" data-split>${title}</h2>`;

// Shrines in the order of the Ashram Shrines page (plus the Birth Date Pillars).
const navItems = [
  ['prayer-hall', 'Prayer Hall'],
  ['rajarajeshwari', 'Rajarajeshwari'],
  ['hari-sannidhi', 'Hari Sannidhi'],
  ['venkateshwara', 'Venkateshwara'],
  ['hanuman', 'Hanuman'],
  ['kalabhairava', 'Kalabhairava'],
  ['birth-pillars', 'Birth Pillars'],
];

// --- hero -----------------------------------------------------------------

const hero = pageHero({
  eyebrow: 'Spirituality · Darshan &amp; Puja',
  title: 'Temples &amp; <span class="em-light">Darshan</span>',
  lead: 'Six shrines of the Mysuru Ashram, at the foot of Chamundi hill — from Lord Dattatreya in the Universal Prayer Hall to the 70-ft Karya Siddhi Hanuman.',
  image: photos.prayerHall,
  pos: '74% 50%',
  crumb: 'Temples & Darshan',
  actions: `${btn('Book a Puja', links.poojas, 'gold', 'arrow-up-right')}${btn('Darshan timings', '#timings', 'ghost', 'clock')}`,
  tiles: [
    { icon: 'temple', title: 'Daily Darshan', note: 'Temple Timings', href: '#timings' },
    { icon: 'diya', title: 'Pujas &amp; Sevas', note: 'Book Online', href: '#sevas' },
    { icon: 'calendar', title: 'Festivals', note: 'Calendar', href: '#festivals' },
    { icon: 'book', title: 'Learn', note: 'Significance', href: '#mandir' },
  ],
});

// --- 1. daily darshan: timings, watching online, the day at the Ashram ----
//
// Temple hours differ between official pages, so each set is labelled with
// its source: the general "Temple Timings" of the Peetham homepage
// (hours.temple in site.mjs) and the hours published on the Sri Datta
// Venkateshwara and Karya Siddhi Hanuman temple pages.

const tv = [
  ['5:40 AM', 'Sakshi TV', 'Telugu'],
  ['6:10 AM', 'ETV', 'Telugu'],
  ['6:45 AM', 'Suvarna News', 'Kannada'],
  ['8:00 PM', 'SVBC', 'Kannada'],
  ['9:40 PM', 'Aastha', 'Hindi'],
];

const onlineCard = `<article class="dn-live" id="online" aria-labelledby="online-h" data-reveal="up">
  <div class="dn-live-bg">${img(photos.dattatreya, '')}</div>
  <div class="dn-live-top">
    <span class="dn-live-pill">${icon('play-circle', 15)}Online &amp; on TV</span>
    <h3 id="online-h">Watch &amp; <span class="em-light">follow online</span></h3>
    <p>Watch Sri Swamiji’s programmes on the Peetham’s YouTube channel and on TV.</p>
    <div class="btn-row">
      ${btn('Watch on YouTube', links.youtube, 'gold', 'yt')}
      ${btn('Social media pages', view('social-media-pages'), 'ghost', 'arrow-up-right')}
    </div>
  </div>
  <div class="dn-live-grid">
    <div class="readout glass" aria-live="polite">
      <h4><span class="live-dot" data-dot="temple" aria-hidden="true"></span>Now in Mysuru</h4>
      <dl>
        <dt>Local time</dt><dd data-clock>IST</dd>
        <dt>General temple timings</dt><dd data-status-long="temple">${templeHours}</dd>
        <dt>Karya Siddhi Hanuman</dt><dd data-dn-status="hanuman">6:30 AM – 12:30 PM · 5 PM – 8 PM</dd>
        <dt>Laser show</dt><dd data-dn-laser>Sat &amp; Sun · 7:10 PM</dd>
      </dl>
    </div>
    <div class="dn-tv">
      <h4>Sri Swamiji’s programmes on TV</h4>
      <ul>${tv.map(([t, ch, lang]) => `<li><b>${t}</b><span>${ch} <small>${lang}</small></span></li>`).join('')}</ul>
      <a class="dn-tv-src" href="${view('dattapeetham-telecast-timing-of-sri-swamijis-programs')}">Telecast timings ${icon('external', 12)}</a>
    </div>
  </div>
</article>`;

// Hours cards. The general timings use the shared live badge (hours.temple);
// the two temples with their own published hours get a page-scoped badge
// computed in darshan.js from the same figures.
const hoursBlock = ({ badge, dnBadge, title, rows, note, src, photo, ic }) => `<article class="hours-card dn-hcard">
  ${src ? `<span class="hc-img${photo ? ' is-photo' : ''}">${img(src, '')}</span>` : `<span class="hc-img hc-icon">${icon(ic || 'clock', 26)}</span>`}
  <div>
    <h3>${title}</h3>
    <dl>${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>
    ${badge ? `<span class="badge" data-badge="${badge}">Checking…</span>` : ''}${dnBadge ? `<span class="badge" data-dn-badge="${dnBadge}">Checking…</span>` : ''}
    ${note ? `<small>${note}</small>` : ''}
  </div>
</article>`;

const hoursCards = [
  {
    badge: 'temple', src: photos.logo, title: 'Temple Darshan',
    rows: [['Morning', '6:00 AM – 12:00 PM'], ['Evening', '4:00 PM – 8:00 PM']],
    note: 'General temple timings, daily, as given on the Peetham homepage. The Datta temple opens daily at 6 AM.',
  },
  {
    dnBadge: 'sdvt', src: pic.sdvtAerial, photo: true, title: 'Sri Datta Venkateshwara',
    rows: [['Weekdays', '6:00 AM – 12:00 PM<br>5:00 PM – 8:00 PM'], ['Weekends', '6:00 AM – 12:00 PM<br>4:30 PM – 8:30 PM']],
    note: `As published on the <a href="${view('sri-datta-venkateshwara-temple')}">temple’s own page</a>.`,
  },
  {
    dnBadge: 'hanuman', src: photos.hanumanIcon, title: 'Karya Siddhi Hanuman',
    rows: [['Weekdays', '6:30 AM – 12:30 PM<br>5:00 PM – 8:00 PM'], ['Weekends', '6:30 AM – 12:30 PM<br>5:00 PM – 8:30 PM'], ['Laser show', 'Sat &amp; Sun<br>7:10, 7:40 &amp; 8:10&nbsp;PM']],
    note: `As published on the <a href="${view('karya-siddhi-hanuman-temple')}">temple’s own page</a>.`,
  },
].map(hoursBlock).join('');

// The day, 5 AM to 9 PM. The gold bands are the general temple timings
// (hours.temple); other moments come from the Kaalaagni, Ashram Life and
// Hanuman temple pages.
const DAY_START = 300, DAY_END = 1260;
const dayEvents = [
  [360, '6:00 AM', 'Datta temple opens', 'Kaalaagni Shamana Dattatreya, in the Universal Prayer Hall'],
  [480, '~8:00 AM', 'Sri Chakra Puja', 'When Sri Swamiji or Sri Bala Swamiji is in town; Teertha follows'],
  [720, '12:00 PM', 'Midday close', 'General temple timings'],
  [960, '4:00 PM', 'Evening darshan', 'General temple timings'],
  [1150, '7:10 PM', 'Laser show', 'Saturdays &amp; Sundays — also 7:40 and 8:10 PM'],
  [1200, '8:00 PM', 'Evening darshan ends', 'General temple timings'],
];
const pct = (m) => (((m - DAY_START) / (DAY_END - DAY_START)) * 100).toFixed(3);

const dayTrack = `<div class="dn-day panel" data-reveal="up">
  <header class="dn-day-head">
    <div>
      <span class="eyebrow">A day at the Ashram</span>
      <h3>From the first Abhishekam to the evening lamps</h3>
    </div>
    <p class="dn-day-legend"><span><i aria-hidden="true"></i><span>General temple timings · <span class="dn-nw">${templeHours}</span></span></span><span data-dn-now-wrap hidden><i class="dn-now-key" aria-hidden="true"></i><span data-dn-now-text></span></span></p>
  </header>
  <div class="dn-day-track" data-dn-day data-start="${DAY_START}" data-end="${DAY_END}">
    <div class="dn-day-rail" aria-hidden="true">
      ${hours.temple.sessions.map(([a, b]) => {
        const toM = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        return `<span class="dn-day-band" style="left:${pct(toM(a))}%;width:${(pct(toM(b)) - pct(toM(a))).toFixed(3)}%"></span>`;
      }).join('')}
      <span class="dn-day-now" data-dn-now hidden><b data-dn-now-label></b></span>
    </div>
    <ol class="dn-day-events">
      ${dayEvents.map(([m, t, title, note], i) => `<li class="${i % 2 ? 'is-low' : 'is-high'}" style="--x:${pct(m)}%" data-m="${m}"${m === 1150 ? ' data-weekend' : ''}>
        <time>${t}</time><b data-label="Next">${title}</b><small>${note}</small>
      </li>`).join('')}
    </ol>
  </div>
  <p class="dn-day-own">${icon('info', 16)}<span>The <a href="#venkateshwara">Sri Datta Venkateshwara</a> and <a href="#hanuman">Karya Siddhi Hanuman</a> temples keep their own hours, shown above.</span></p>
  <ul class="dn-week">
    <li data-days="0"><span class="dn-week-day" data-label="Today">Sundays</span><p>Tailabhisheka — oil anointing — to Kaalaagni Shamana Datta, and Sri Swamiji’s darshana in the morning when He is in town.</p></li>
    <li data-days="5"><span class="dn-week-day" data-label="Today">Fridays</span><p>Worship at the Sri Datta Venkateshwara Temple, each Friday when Sri Swamiji is present.</p></li>
    <li data-days="0 1 2 3 4 5 6"><span class="dn-week-day">Every evening</span><p>Divya Naama Sankeertana and Kakada Arati — sixteen lamps lit before Lord Datta — in the Universal Prayer Hall.</p></li>
  </ul>
</div>`;

const timingsSection = `<section id="timings" class="section section-paper dn-timings-sec">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Daily Darshan', title: 'Temple <span class="em-light">timings</span>', lead: 'Darshan is offered every morning and evening. The Peetham publishes general temple timings, and the Sri Datta Venkateshwara and Karya Siddhi Hanuman temples list their own hours. All timings are in Indian Standard Time.' }).replace(/^<header[^>]*>/, (h) => `${h}\n  ${ghanta({ beside: 'h2', drop: 44 })}`)}
    <div class="dn-timings">
      <div class="dn-hours">
        <div class="dn-hours-grid" data-stagger>${hoursCards}</div>
        <p class="notice dn-notice" data-reveal="up">${icon('info', 18)}<span>Timings vary across official sources; please check with the Ashram before visiting. For festival programmes see the <a href="${links.calendar}">official calendar</a>, and <a href="visit.html">plan your visit</a>. Looking for Shuka Vana? See <a href="attractions.html#sv-visit">its hours and notice</a>.</span></p>
      </div>
      ${onlineCard}
    </div>
    ${dayTrack}
  </div>
</section>`;

// --- 2. Datta Peetham Mandir Nagari ---------------------------------------

const mandirIntro = `<section id="mandir" class="section dn-mandir-intro">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Learn · Significance', title: 'Datta Peetham <span class="em-light">Mandir Nagari</span>', lead: 'At the heart of the Peetham is Lord Dattatreya, the presiding deity who embodies the Sadguru — the Master Teacher principle. The Mysuru Ashram is home to six shrines and a pathway of 366 Birth Date Pillars.' })}
    <div class="dn-lit">${scrollLit('Lord Dattatreya guides seekers from the shadows of the material world to the *illumination* of the inner *soul.*')}</div>
    <div class="dn-arrive">
      <h3 class="dn-arrive-h"><span class="eyebrow">As you enter</span></h3>
      ${processSteps([
        ['Hanumadwaram', 'A magnificently sculpted welcome arch with Hanuman idols.'],
        ['Infant Dattatreya', 'An intricate carving of the infant form of Lord Dattatreya.'],
        ['Vedic chants', 'Young boys chant the Vedas under the attentive guidance of their teacher.'],
        ['The shrines', 'Congregational prayer, the Mother Goddess, Lord Venkateshwara and Hanuman.'],
      ])}
    </div>
  </div>
</section>`;

const shrineNav = `<nav class="dn-nav" aria-label="Shrines on this page" data-dn-nav>
  <div class="wrap">
    <div class="dn-nav-inner">
      <span class="dn-nav-label">${icon('temple', 18)}<span>Mandir Nagari</span></span>
      <div class="dn-nav-scroll" data-dn-nav-scroll>
        <ol class="dn-nav-list">
          ${navItems.map(([id, label], i) => `<li><a class="dn-chip" href="#${id}" data-dn-chip="${id}"><span class="dn-chip-n">${String(i + 1).padStart(2, '0')}</span>${label}</a></li>`).join('')}
        </ol>
        <span class="dn-nav-lamp" aria-hidden="true" data-dn-lamp></span>
      </div>
    </div>
  </div>
</nav>`;

// 01 — Universal Prayer Hall
const prayerHall = `<section id="prayer-hall" class="dn-shrine" aria-labelledby="prayer-hall-h" data-dn-shrine>
  <div class="wrap">
    ${split({
      media: `<div class="dn-media">
        ${frame(photos.prayerHall, 'Devotees seated before Sri Swamiji in the Universal Prayer Hall', { ratio: '5/4', pos: '78% 55%', badge: 'Unveiled 1984' })}
        <figure class="dn-inset">
          ${img(pic.kaalaagni, 'Sri Swamiji offers arati to Kaalaagni Shamana Dattatreya, the main deity of the Peetham')}
          <figcaption>Kaalaagni Shamana Dattatreya</figcaption>
          ${aarti({ gap: 18, size: 30 })}
        </figure>
      </div>`,
      body: `${shrineHead('01', 'Datta Temple · Sachchidanandeshwara · Panchayatana Devasthana', 'Universal Prayer Hall', 'prayer-hall')}
        <p>As its name implies, the Universal Prayer Hall is an auditorium where daily congregational prayers take place, drawing a large number of devotees who gather in the divine presence of Sri Swamiji. It houses the main deity of the Peetham — <strong>Kaalaagni Shamana Dattatreya Swami</strong>.</p>
        <p>The most revered worship, the Sri Chakra Puja, is performed at the Sri Chakram Meru, enshrined in a special Mantap to the right side. To truly appreciate the sanctity of this Puja, one must witness it in person.</p>
        ${deities('Deities of the hall', ['Kaalaagni Shamana Dattatreya', 'Sri Chakram Meru', 'Ganapathy', 'Narasimha Swami', 'Shiva', 'Surya Narayana', 'Vishalakshi Devi', 'Sachchidanandeshwara'])}
        <p class="dn-small">On the right of the hall, the Panchayatana Devasthana houses five small temples; on the left, a Shivalaya is dedicated to Lord Shiva as Sachchidanandeshwara.</p>
        ${facts([
          ['Divine descent', '9 June 1978 — Lord Datta as Sri Kaalaagni Shamana Dattatreya'],
          ['Re-consecrated', 'Rama Navami, 21 April 2002, at the centre of the hall'],
          ['Kshetra', 'The first of the sixteen Shodasha Datta Kshetras'],
        ])}
        <blockquote class="dn-greeting"><span>Jaya Guru Datta</span><p>Datta worship, the Datta Stava and the greeting <em>Jaya Guru Deva Datta</em> were introduced in that week of June 1978; by the mid-eighties the greeting had become <em>Jaya Guru Datta</em>.</p></blockquote>
        ${timingNote(`<p><b>The Datta temple opens daily at 6 AM.</b> Tailabhisheka every Sunday; every evening, Divya Naama Sankeertana and Kakada Arati.</p><p class="dn-time-more"><a href="#timings">All darshan timings</a></p>`)}
        ${source(view('kaalaagni-shamana-dattatreya'), 'Kaalaagni Shamana Dattatreya')}`,
    })}
  </div>
</section>`;

// 02 — Rajarajeshwari Temple
const moments = [
  [pic.kumbhabhisheka, 'Sri Swamiji performs Kumbhabhisheka atop the Rajarajeshwari temple', 'Kumbhabhisheka by Sri Swamiji'],
  [pic.annakoota, 'Annakoota of many food items arranged before Sri Rajarajeshwari Devi', 'Annakoota Archana'],
  [pic.annadana, 'Annadana served to devotees at the Ashram', 'Annadana to the devotees'],
];
const rajarajeshwari = `<section id="rajarajeshwari" class="dn-shrine is-paper" aria-labelledby="rajarajeshwari-h" data-dn-shrine>
  <div class="wrap">
    ${split({
      reverse: true,
      media: `<div class="dn-media">${frame(photos.rajarajeshwariSannidhi, 'Sri Swamiji worships Goddess Rajarajeshwari at her Sannidhi', { ratio: '4/5', pos: '58% 50%', badge: 'Consecrated 2023' })}</div>`,
      body: `${shrineHead('02', 'Mother Goddess · 28 December 2023', 'Rajarajeshwari Temple', 'rajarajeshwari')}
        <p>On the left side of the Universal Prayer Hall is the most beautifully and intricately designed temple for Mother Goddess Rajarajeshwari, consecrated by Sri Swamiji on 28 December 2023 during Meena Lagna, at 12 noon.</p>
        <p>As devotees circumambulate the deity they see the intricately designed forms of the Nava Durgas, the miniature forms of the deities of the 18 Shakti Peethams, and several Devi Yantras and Mandalams. Sri Swamiji has also installed a big <strong>Sri Chakra</strong>, to which devotees can personally offer prayers with Kumkum Archana.</p>
        ${deities('The Nava Durgas', ['Shailaputri', 'Brahmacharini', 'Chandraghanta', 'Kushmanda', 'Skandamata', 'Katyayani', 'Kalaratri', 'Mahagauri', 'Siddhidatri'])}
        ${facts([
          ['Mandala Pooja', 'On the 40th day, Sri Swamiji offered Annakoota — over 75 food items — the first of its kind in Datta Peetham’s history'],
          ['Before the consecration', 'Devotees all over the world wrote millions of Lalita Sahasranama books'],
        ])}
        <div class="dn-moments" data-gallery>
          ${moments.map(([src, alt, cap]) => `<button type="button" class="dn-moment" data-full="${src}" data-caption="${esc(cap)}" aria-label="Open photo: ${esc(cap)}">${img(src, alt)}<span>${cap}</span></button>`).join('')}
        </div>
        ${generalNote()}
        ${source(view('rajarajeshwari-temple'), 'The consecration, on dattapeetham.org')}`,
    })}
  </div>
</section>`;

// 03 — Hari Sannidhi
const hariSannidhi = `<section id="hari-sannidhi" class="dn-shrine" aria-labelledby="hari-sannidhi-h" data-dn-shrine>
  <div class="wrap">
    ${split({
      media: `<div class="dn-media">${frame(photos.hariSannidhi, 'Salagramas arranged as Ananthanaga Shayana beneath a great serpent hood at Hari Sannidhi', { ratio: '5/4', pos: '50% 60%', badge: 'Unveiled 2023' })}</div>`,
      body: `${shrineHead('03', 'Lord Hari · 28 December 2023', 'Hari Sannidhi', 'hari-sannidhi')}
        <div class="dn-salagrama"><span data-count="2108">2,108</span><small>rare Salagramas, in the form of Ananthanaga Shayana</small></div>
        <p>The most spectacular Hari Sannidhi stands to the immediate right of the Rajarajeshwari temple, unveiled by Sri Swamiji on 28 December 2023.</p>
        <p>The Trivikrama Salagrama and the Manoratha Kurma Salagrama, weighing 300 kg, have also been installed inside the Sannidhi. A specially made <strong>Sudarshana Yantra</strong> on top of the Sannidhi was designed and conceptualised by Sri Swamiji.</p>
        ${deities('At the Sannidhi', ['Ananthanaga Shayana', 'Trivikrama Salagrama', 'Manoratha Kurma Salagrama', 'Sudarshana Yantra'])}
        ${generalNote()}
        ${source(view('ashram-shrines'), 'Ashram Shrines, on dattapeetham.org')}`,
    })}
  </div>
</section>`;

// 04 — Sri Datta Venkateshwara Temple complex
const sannidhis = [
  [pic.venkateshwara, 'Sri Swamiji offers worship to Sri Datta Venkateshwara Swamy', 'Sri Datta Venkateshwara Swamy'],
  [pic.padmavathi, 'Goddess Padmavathi Devi, adorned with garlands', 'Goddess Padmavathi Devi'],
  [pic.ganapathy, 'Sri Swamiji before Sachchidananda Ganapathy', 'Sachchidananda Ganapathy'],
  [pic.dhanvantari, 'Sri Swamiji worships Lord Dhanvantari', 'Lord Dhanvantari'],
  [pic.subrahmanya, 'Marakata Subrahmanya Swami, adorned with flowers', 'Marakata Subrahmanya Swami'],
  [pic.doshaHaraShiva, 'Sri Swamiji worships Sarva Dosha Hara Shiva', 'Sarva Dosha Hara Shiva'],
  [pic.shaniDeepa, 'Sri Swamiji offers the Shani Deepa at the Navagraha temple', 'Shani Deepa at the Navagraha Temple'],
  [pic.hanumanSannidhi, 'Sri Swamiji at the Karya Siddhi Hanuman Sannidhi', 'Karya Siddhi Hanuman Sannidhi'],
];
const venkateshwara = `<section id="venkateshwara" class="dn-shrine is-paper" aria-labelledby="venkateshwara-h" data-dn-shrine>
  <div class="wrap">
    ${split({
      reverse: true,
      media: `<div class="dn-media">${frame(pic.sdvtAerial, 'Aerial view of the Sri Datta Venkateshwara Temple complex, its gopuram rising above devotees in the courtyard', { ratio: '1/1', pos: '47% 50%', badge: 'Consecrated 1999' })}</div>`,
      body: `${shrineHead('04', 'Sri Datta Venkateswara Kshetram · 1999', 'Sri Datta Venkateshwara Temple', 'venkateshwara')}
        <p>For those seeking spirituality and peace, a visit to Sri Datta Venkateswara Kshetram is a must. Pilgrims say that this temple for Lord Venkateswara pulsates with Divine Energy. Its architecture is much like the one in holy Tirumala, and it is the firm belief of Datta devotees that the Lord of the seven hills has Himself come to Datta Peetham.</p>
        <p>Before the temple stands a huge <strong>Dhwaja Stambha</strong> — the sacred flag post — made from a 150-year-old teak tree, brought from the deep forests of Kerala. Several thousands throng the temple on Vaikuntha Ekadashi every year, and Annadanam is conducted for the needy on every Purnima.</p>
        ${deities('Sannidhis of the complex', ['Sri Datta Venkateshwara Swamy', 'Goddess Padmavati', 'Sachchidananda Ganapati', 'Dhanvantari', 'Sarva Doshahara Shiva', 'Sri Marakata Subrahmanya Swamy', 'Navagrahas', 'Karya Siddhi Hanuman'])}
        <div class="dn-time dn-time-table">
          <span class="dn-time-ic">${icon('clock', 18)}</span>
          <div>
            <dl>
              <dt>Weekdays</dt><dd><span class="dn-nw">6:00 AM – 12:00 PM</span> · <span class="dn-nw">5:00 PM – 8:00 PM</span></dd>
              <dt>Weekends</dt><dd><span class="dn-nw">6:00 AM – 12:00 PM</span> · <span class="dn-nw">4:30 PM – 8:30 PM</span></dd>
            </dl>
            <p class="dn-contact"><a href="tel:+918212483200">${icon('phone', 14)}(+91) 0821 2483200</a><a href="mailto:sdvt@dattapeetham.com">${icon('mail', 14)}sdvt@dattapeetham.com</a><a href="https://www.sdvtemple.in">${icon('globe', 14)}sdvtemple.in</a></p>
          </div>
        </div>
        ${source(view('sri-datta-venkateshwara-temple'), 'Sri Datta Venkateshwara Temple, on dattapeetham.org')}`,
    })}
    <div class="dn-strip-wrap" data-reveal="up">
      <h3 class="dn-mini">Sannidhis of the temple complex</h3>
      <div class="dn-strip" data-gallery>
        ${sannidhis.map(([src, alt, cap]) => `<button type="button" class="dn-strip-item" data-full="${src}" data-caption="${esc(cap)}" aria-label="Open photo: ${esc(cap)}">${img(src, alt)}<span>${cap}</span></button>`).join('')}
      </div>
    </div>
  </div>
</section>`;

// 05 — Karya Siddhi Hanuman (dark highlight)
const laserTimes = ['7:10 PM', '7:40 PM', '8:10 PM'];
const hanuman = `<section id="hanuman" class="section section-dark dn-hanuman" aria-labelledby="hanuman-h" data-dn-shrine>
  <canvas class="embers dn-embers" data-embers aria-hidden="true"></canvas>
  <div class="wrap">
    ${split({
      media: `<div class="dn-media">${frame(pic.hanumanExterior, 'The Karya Siddhi Hanuman temple, with the 70-ft monolithic statue of Hanuman rising above it', { ratio: '4/5', pos: '41% 50%', badge: 'Consecrated 2012' })}</div>`,
      body: `${shrineHead('05', 'The tallest stone statue of Hanuman in India', 'Karya Siddhi Hanuman Temple', 'hanuman')}
        <p>Sri Swamiji consecrated the magnificent 70-ft Karya Siddhi Hanuman statue in 2012, in the precincts of the Sri Datta Venkateshwara Temple Complex. This huge monolithic statue is the tallest stone statue of Lord Hanuman in India.</p>
        <dl class="stats is-light dn-stats" data-stagger>
          <div class="stat"><dt><span data-count="70">70</span> <small class="dn-unit">ft</small></dt><dd>Monolithic statue of stone</dd></div>
          <div class="stat"><dt><span data-count="3">3</span></dt><dd>Forms of Hanuman, as per the Ramayana</dd></div>
          <div class="stat"><dt>2012</dt><dd>Consecrated by Sri Swamiji</dd></div>
        </dl>
        <p>After the monumental Rajasthan Jaisalmer stone renovation, with intricate carvings on the outside and murals of the Hanuman Chalisa carved on the inner walls, it is one of the most enchanting Hanuman temples in this part of the country.</p>
        ${deities('Sevas for Lord Hanuman', ['Poorna Phala Deeksha', 'Archana', 'Abhisheka', 'Vada Male Seva', 'Alankara'])}
        <div class="dn-time dn-time-table">
          <span class="dn-time-ic">${icon('clock', 18)}</span>
          <div><dl>
            <dt>Weekdays</dt><dd><span class="dn-nw">6:30 AM – 12:30 PM</span> · <span class="dn-nw">5:00 PM – 8:00 PM</span></dd>
            <dt>Weekends</dt><dd><span class="dn-nw">6:30 AM – 12:30 PM</span> · <span class="dn-nw">5:00 PM – 8:30 PM</span></dd>
          </dl></div>
        </div>`,
    })}

    <div class="dn-forms" data-stagger>
      <article><span class="dn-form-n">i</span><h3>The monolith</h3><p>The tall monolithic statue — 70 feet of stone.</p></article>
      <article><span class="dn-form-n">ii</span><h3>For worship</h3><p>A second idol, for general worship and prayers.</p></article>
      <article><span class="dn-form-n">iii</span><h3>Pancha Mukha Hanuman</h3><p>The third idol, five-faced, located in the underground.</p></article>
    </div>

    <div class="dn-deeksha">
      <header class="section-head is-light">
        <span class="eyebrow">Poorna Phala Deeksha</span>
        <h3 class="dn-h3-lg" data-split>Tie a coconut, <span class="em-light">pray for fulfilment</span></h3>
        <p class="lead">Devotees worship Hanuman by tying a whole dry coconut for wish fulfilment — a sixteen-day vrata.</p>
      </header>
      ${processSteps([
        ['Collect the Poornaphala', 'Visit the Pooja counter to collect the Poornaphala, then proceed to the Hanuman temple.'],
        ['Sankalpa', 'The priests lead the Sankalpa before the coconut is tied; then circumambulate the temple sixteen times.'],
        ['Pradakshinas', 'On any four days of the sixteen, perform 16 Pradakshinas each time.'],
        ['Mantra & discipline', 'Chant the Karyasiddhi Anjaneya mantra 108 times daily; refrain from non-vegetarian food, alcohol and smoking.'],
        ['Prasadam', 'On the 16th day, untie the coconut and make a sweet dish of it, taken as Prasadam.'],
      ])}
    </div>

    <div class="dn-hanuman-foot">
      <article class="dn-laser glass" data-reveal="up">
        <span class="eyebrow">Weekends · free admission</span>
        <h3>3D projection mapping on the monolith</h3>
        <p>Every Saturday and Sunday, a laser show using 3D Digital Projection Mapping Technology plays on the massive statue, synchronised with the Hanuman Chalisa, for less than ten minutes.</p>
        <ul class="dn-laser-times">${laserTimes.map((t) => `<li><time>${t}</time></li>`).join('')}</ul>
        <p class="dn-laser-next">${icon('sparkle', 16)}<span data-dn-laser>Saturdays &amp; Sundays · 7:10 PM</span></p>
      </article>
      <figure class="dn-mantra" data-reveal="up">
        <span class="eyebrow">Karya Siddhi Hanuman Mantra · Sundarakanda</span>
        <blockquote lang="sa-Latn">
          <p>tvamasmin kāryaniryoge pramāṇaṁ harisattama |<br>hanuman! yatnamāsthāya duḥkhakṣaya karobhava ||</p>
        </blockquote>
        <figcaption>Sri Swamiji has blessed devotees to chant this, from the Sundarakanda of Srimad Valmiki Ramayana, for the fulfilment of their tasks and to tide over hardships.</figcaption>
        <div class="btn-row">
          ${btn('Hanuman Chalisa Parayana by Sri Swamiji', 'https://www.youtube.com/watch?v=jI2j6_HzXb0', 'ghost', 'play-circle')}
          <a class="link-arrow" href="${OFFICIAL}/hanuman-chalisa-form">Submit your Parayana count ${icon('arrow-up-right', 15)}</a>
        </div>
      </figure>
    </div>
    <p class="dn-abroad" data-reveal="up">Sri Swamiji has established Karya Siddhi Hanuman temples at Ashrams across India and abroad — including an 85-foot Hanuman statue in Trinidad, West Indies, the tallest statue of an Indian deity in the Western Hemisphere. ${source(view('karya-siddhi-hanuman-temple'), 'Karya Siddhi Hanuman Temple')}</p>
  </div>
</section>`;

// 06 — Kalabhairava (no photograph published: an honest illustration instead)
const niches = Array.from({ length: 7 }, (_, i) => {
  const a = (-90 + (360 / 7) * i) * Math.PI / 180, r = 132, cx = 200 + r * Math.cos(a), cy = 200 + r * Math.sin(a);
  const rot = (360 / 7) * i;
  return `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${rot.toFixed(1)})"><path d="M-16 19V-2a16 16 0 0 1 32 0v21Z"/><path class="kb-flame" d="M0-7c3.4 4.6 5.2 7.6 5.2 10.6a5.2 5.2 0 0 1-10.4 0C-5.2.6-3.4-2.4 0-7Z"/><path d="M-21 25h42"/></g>`;
}).join('');
const bhairavaArt = `<figure class="dn-bhairava-art" data-reveal="scale">
  <svg viewBox="0 0 400 400" role="img" aria-labelledby="kb-art-t" data-draw>
    <title id="kb-art-t">Illustration: one main shrine for the Pradhana Bhairava with seven niches around it</title>
    <circle cx="200" cy="200" r="182" class="kb-ring"/>
    <circle cx="200" cy="200" r="160" class="kb-ring kb-faint"/>
    <circle cx="200" cy="200" r="92" class="kb-ring kb-faint"/>
    ${Array.from({ length: 7 }, (_, i) => { const a = (-90 + (360 / 7) * i) * Math.PI / 180; return `<path class="kb-faint" d="M${(200 + 92 * Math.cos(a)).toFixed(1)} ${(200 + 92 * Math.sin(a)).toFixed(1)}L${(200 + 104 * Math.cos(a)).toFixed(1)} ${(200 + 104 * Math.sin(a)).toFixed(1)}"/>`; }).join('')}
    ${niches}
    <g class="kb-main">
      <path d="M168 238V178a32 32 0 0 1 64 0v60Z"/>
      <path d="M200 150c6 9 10 15 10 22a10 10 0 0 1-20 0c0-7 4-13 10-22Z"/>
      <path d="M156 246h88M150 254h100"/>
    </g>
  </svg>
  <figcaption>Illustration, not to scale: the Pradhana Bhairava shrine and seven niches.</figcaption>
</figure>`;
const kalabhairava = `<section id="kalabhairava" class="dn-shrine is-sand" aria-labelledby="kalabhairava-h" data-dn-shrine>
  <div class="wrap">
    ${split({
      reverse: true,
      media: bhairavaArt,
      body: `${shrineHead('06', 'Ashta Bhairava · 14 December 2016', 'Kalabhairava Temple', 'kalabhairava')}
        <p>The Ashta Bhairava temple was consecrated by His Holiness Sri Ganapathy Sachchidananda Swamiji on 14 December 2016. Eight Bhairava idols were consecrated as per Shaiva Agama rites, in the south-east corner of the Ashrama.</p>
        <p>When the Ashrama started in 1966, an underground tunnel existed at this place, leading to the Chamundi hill; it was closed in the mid-80s. Today this <strong>subterranean temple</strong> has one main shrine for the Pradhana Bhairava Murthy, with seven small niches around it holding the other seven Bhairava Murtis.</p>
        ${deities('In the shrine', ['Pradhana Bhairava', 'Seven Bhairava Murtis', 'Shaiva Agama rites'])}
        ${source(view('ashram-shrines'), 'Ashram Shrines, on dattapeetham.org')}`,
    })}
  </div>
</section>`;

// 07 — Birth Date Pillars: 366, one for each date of the year.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const pillarsGrid = `<div class="dn-bp-grid" role="img" aria-label="Illustration: 366 pillars, one for each date of the year" data-dn-bp>
  ${MONTHS.map((m, i) => `<div class="dn-bp-row"><span>${m.slice(0, 3)}</span><div class="dn-bp-days">${Array.from({ length: DAYS_IN[i] }, (_, d) => `<i data-md="${i + 1}-${d + 1}"></i>`).join('')}</div></div>`).join('')}
</div>`;
const birthPillars = `<section id="birth-pillars" class="dn-shrine is-paper dn-bp" aria-labelledby="birth-pillars-h" data-dn-shrine>
  <div class="wrap">
    <div class="dn-bp-layout">
      <div class="dn-bp-copy" data-reveal="up">
        ${shrineHead('07', 'Along the pathway', 'Birth Date Pillars', 'birth-pillars')}
        <div class="dn-salagrama"><span data-count="366">366</span><small>pillars, on either side of the pathway</small></div>
        <p>366 pillars are installed on either side of the pathway in the Ashrama. They are called the “Date of Birth Pillars” — each pillar has a specific deity and demigod for that particular day.</p>
        <form class="dn-bp-find" data-dn-bp-form>
          <span class="dn-mini">Find your day</span>
          <div class="dn-bp-fields">
            <label><span class="visually-hidden">Day</span><select name="day" aria-label="Day">${Array.from({ length: 31 }, (_, d) => `<option value="${d + 1}">${d + 1}</option>`).join('')}</select></label>
            <label><span class="visually-hidden">Month</span><select name="month" aria-label="Month">${MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}</select></label>
          </div>
          <output class="dn-bp-out" aria-live="polite" data-dn-bp-out></output>
        </form>
      </div>
      <figure class="dn-bp-figure" data-reveal="up">
        ${pillarsGrid}
        <figcaption><span><i class="dn-bp-key is-today" aria-hidden="true"></i>Today</span><span><i class="dn-bp-key is-picked" aria-hidden="true"></i>Your day</span><span>Illustration, not to scale</span></figcaption>
      </figure>
    </div>
  </div>
</section>`;

const mandir = `<div class="dn-mandir">
  ${mandirIntro}
  ${shrineNav}
  ${prayerHall}
  ${rajarajeshwari}
  ${hariSannidhi}
  ${venkateshwara}
  ${hanuman}
  ${kalabhairava}
  ${birthPillars}
</div>`;

// --- 3. sevas & pujas -----------------------------------------------------

const sevaCards = latestSevas.map((s) => card({
  img: s.img,
  alt: s.title,
  tag: s.when,
  title: s.title,
  text: s.text,
  href: s.href,
  cta: 'Book this seva',
  meta: `<span class="dn-share-label">Share</span>${shareRow(`${s.title} — Avadhoota Datta Peetham, Mysuru`, s.href)}`,
})).join('');

const ways = [
  ['sun', 'Sri Chakra Puja', 'Every morning — performed at around 8 AM by Sri Swamiji or Sri Bala Swamiji when in town. Teertha is offered after.'],
  ['flame', 'Homa &amp; Tailabhishekam', 'Morning rituals that devotees can join and sponsor for divine blessings.'],
  ['lotus', 'Kumkum Archana', 'Offered personally at the big Sri Chakra in the Rajarajeshwari temple.'],
  ['heart-hand', 'Poorna Phala Deeksha', 'Tie a whole dry coconut at the Karya Siddhi Hanuman temple, for wish fulfilment.'],
  ['diya', 'Hanuman sevas', 'Archana, Abhisheka, Vada Male Seva and Alankara for Lord Hanuman.'],
  ['music', 'Divya Naama Sankeertana', 'Bhajans every evening, for at least an hour and a half.'],
];

const sevasSection = `<section id="sevas" class="section dn-sevas">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Pujas &amp; Sevas', title: 'Offer worship, <span class="em-light">wherever you are</span>', lead: 'Sponsor a seva at the Mysuru Ashram through the Peetham’s booking system. You can pay for friends and family too — simply add the same Pooja to your cart more than once.' })}
    <div class="grid grid-3 dn-seva-cards" data-stagger>${sevaCards}</div>
    <div class="dn-sevas-lower">
      <div class="dn-ways">
        <h3 class="dn-h3-lg" data-split>Daily worship you can join</h3>
        <ul data-stagger>${ways.map(([ic, t, x]) => `<li><span class="dn-way-ic">${icon(ic, 22)}</span><div><b>${t}</b><p>${x}</p></div></li>`).join('')}</ul>
      </div>
      <aside class="dn-book panel" data-reveal="up" aria-labelledby="book-h">
        <span class="eyebrow">Book online</span>
        <h3 id="book-h">How booking works</h3>
        <ol class="dn-book-steps">
          <li><b>Choose a counter</b><span>Avadhoota Datta Peetham, Mysore (Main) · Sri Datta Venkateswara Temple, Mysore · Sakala Devatha Vedokta Shanti Sevas</span></li>
          <li><b>Choose a currency</b><span>INR (₹) for devotees in India, with an Indian residential address; USD ($) for devotees outside India, with a foreign address.</span></li>
          <li><b>Add to cart</b><span>Book for family and friends by adding the same Pooja again.</span></li>
        </ol>
        <div class="btn-row">${btn('Book a Puja', links.poojas, 'gold', 'arrow-up-right')}</div>
        <p class="dn-book-note">${icon('info', 14)} Booking and payment take place on the Peetham’s secure system at dattapeetham.org.</p>
      </aside>
    </div>
  </div>
</section>`;

// --- 4. festivals ---------------------------------------------------------

// Dated entries are from the official 2026 calendar; page JS hides them once past.
const upcoming = [
  ['2026-12-20', '20 Dec 2026', 'Vaikuntha Ekadashi', 'At the Sri Datta Venkateswara Temple, Mysuru — with Gita Jayanti at Nada Mantapa.'],
  ['2026-12-23', '21–23 Dec 2026', 'Dattatreya Jayanti', 'Ksheerabhisheka &amp; Punya Smarana, Panchamrita Abhisheka, and Sahasra Kalasha Thailabhisheka to Dattatreya Swami on Datta Jayanti Purnima.'],
];
const festivals = [
  { img: photos.dattatreya, alt: 'Sri Swamiji offers arati to Lord Dattatreya', when: 'December · three days', title: 'Datta Jayanti', text: 'The incarnation day of Adi Guru Dattatreya: Abhisheka in the Universal Prayer Hall, bhajans and a Shastra Sadas — and the one day in the year devotees may offer oil ablutions to the Moola virat.' },
  { img: pic.deviArati, alt: 'Sri Swamiji offers arati to Sri Rajarajeshwari Devi', when: 'Sep or Oct · nine days', title: 'Navaratri', text: 'Sri Swamiji honours Mother Goddess Raja Rajeshwari through the Nava Avarana Puja, with Kumari Puja, Sri Chakra Puja, Devi Homa and concerts at Nada Mantapa.' },
  { img: pic.doshaHaraShiva, alt: 'Sri Swamiji worships Sarva Dosha Hara Shiva', when: 'A night of vigil', title: 'Maha Shivaratri', text: 'Sri Swamiji performs Rudra Abhishekam to the Sachchidanandeshwara Shiva Lingam, followed by Sahasra Kalasha Abhishekam by devotees; musicians offer Sangeeta Seva until late night as devotees keep vigil, and at 3 AM Sri Swamiji gives His discourse on Shiva.' },
  { img: photos.swamijiGarland, alt: 'Sri Ganapathy Sachchidananda Swamiji, garlanded', when: 'Late May', title: 'Sri Swamiji’s Birthday', text: 'Celebrated around 26 May, with exact dates set by the Hindu calendar. Sri Bala Swamiji performs Pratyaksha Paada Pooja to Sri Swamiji; mobility aids are given to the physically challenged and Annadaana is offered on a large scale.' },
];
const festivalsSection = `<section id="festivals" class="section section-sand dn-festivals">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Festivals', title: 'Festivals through <span class="em-light">the year</span>', lead: 'Maha Shivaratri, Sri Swamiji’s Birthday, Navaratri and Datta Jayanti are the most auspicious events at the Ashram — a blend of Vedic rituals, classical music, dance and drama. Their dates follow the Hindu calendar.' })}
    <div class="dn-upcoming" data-dn-upcoming data-reveal="up">
      <span class="dn-upcoming-label">${icon('calendar', 18)} Coming up at Mysuru</span>
      <ul>${upcoming.map(([until, date, t, x]) => `<li data-until="${until}"><time>${date}</time><div><b>${t}</b><span>${x}</span></div></li>`).join('')}</ul>
      <a class="link-arrow" href="${links.calendar}">Official calendar ${icon('arrow', 15)}</a>
    </div>
    <div class="grid grid-4 dn-fest-grid" data-stagger>
      ${festivals.map((f) => `<article class="dn-fest">
        <div class="dn-fest-media">${img(f.img, f.alt)}</div>
        <div class="dn-fest-body"><span class="tag">${f.when}</span><h3>${f.title}</h3><p>${f.text}</p></div>
      </article>`).join('')}
    </div>
    <div class="btn-row dn-center">
      ${btn('Events &amp; Festivals', 'events.html', 'gold', 'arrow')}
      ${btn('Official calendar', links.calendar, 'line', 'calendar')}
    </div>
  </div>
</section>`;

// --- page -----------------------------------------------------------------

const address = { '@type': 'PostalAddress', streetAddress: site.address.street, addressLocality: site.address.city, addressRegion: site.address.region, postalCode: site.address.postal, addressCountry: site.address.country };
const ohs = (days, sessions) => sessions.map(([opens, closes]) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: days, opens, closes }));
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const WEEKEND = ['Saturday', 'Sunday'];

export default {
  slug: 'darshan',
  file: 'darshan.html',
  title: 'Temples & Darshan',
  crumb: 'Temples & Darshan',
  nav: 'Darshan & Puja',
  description: 'Temple timings and the six shrines of the Mysuru Ashram, from Lord Dattatreya to the 70-ft Karya Siddhi Hanuman, with festivals and sevas to book online.',
  image: photos.prayerHall,
  preload: photos.prayerHall,
  css: true,
  scripts: ['darshan'],
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'HinduTemple',
      name: 'Sri Datta Venkateshwara Temple',
      alternateName: 'Sri Datta Venkateswara Kshetram',
      url: 'https://www.sdvtemple.in',
      telephone: '+91-821-2483200',
      email: 'sdvt@dattapeetham.com',
      image: pic.sdvtAerial,
      address,
      containedInPlace: { '@type': 'Place', name: site.ashram },
      openingHoursSpecification: [...ohs(WEEKDAYS, [['06:00', '12:00'], ['17:00', '20:00']]), ...ohs(WEEKEND, [['06:00', '12:00'], ['16:30', '20:30']])],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HinduTemple',
      name: 'Karya Siddhi Hanuman Temple',
      description: 'A 70-ft monolithic Hanuman statue consecrated by Sri Ganapathy Sachchidananda Swamiji in 2012 — the tallest stone statue of Hanuman in India.',
      image: pic.hanumanExterior,
      address,
      containedInPlace: { '@type': 'Place', name: site.ashram },
      openingHoursSpecification: [...ohs(WEEKDAYS, [['06:30', '12:30'], ['17:00', '20:00']]), ...ohs(WEEKEND, [['06:30', '12:30'], ['17:00', '20:30']])],
    },
  ],
  render: () => `${hero}
${timingsSection}
${mandir}
${sevasSection}
${festivalsSection}
${deepaDivider({ count: 5 })}
${ctaBand({
  title: 'Come for <span class="em-light">darshan</span>',
  text: `Sri Ganapathy Sachchidananda Ashram, Datta Nagar, Ooty Road, Mysuru. General temple timings, daily: ${templeHours}.`,
  actions: `${btn('Plan your visit', 'visit.html', 'gold', 'arrow')}${btn('Get directions', links.directions, 'ghost', 'pin')}`,
  image: pic.sdvtAerial,
})}`,
};
