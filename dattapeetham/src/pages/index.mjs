// Homepage — the reference's main column brought to life.
//
// Every fact on this page comes from dattapeetham.org (page/view/sri-swamiji,
// sri-bala-swamiji, about-us, ashram-shrines, rajarajeshwari-temple,
// karya-siddhi-hanuman-temple, shuka-vana, bonsai-garden, nada-mantapa,
// sanatana-dharma-parirakshana, bhajans-and-healing-music, /sri-swamiji-says
// and the 2026 /calendar, all fetched October 2026), from the previous
// single-file homepage, or from src/data.mjs and src/site.mjs. Photographs are
// the Peetham's own, from its S3 bucket. Upcoming events show only dates the
// official calendar states; past ones hide themselves (assets/js/index.js).

import { quickTiles, hoursCard, photoTile, scrollLit, marquee, shareRow, horizon, ornament, thread, stats, btn, icon, img, esc } from '../components.mjs';
import { links, PAGE_IMG, KSHETRA_IMG } from '../site.mjs';
import { photos, timings, latestSevas, albums, apps, kshetras, countries, dattaCharitram, varamVideo } from '../data.mjs';

// Official photographs, by the dattapeetham.org page they appear on.
const pic = {
  hero: `${PAGE_IMG}502/502_43ac49e40550ce21.png`, // ashram-shrines: Sri Datta Venkateshwara Temple Complex
  kaalaagni: `${KSHETRA_IMG}01-kalagni-shamana-dattatreya-mysore-karnataka-india.jpg`,
  deviArati: `${PAGE_IMG}526/526_d126a05ad90b71ef.jpg`,
  venkateshwara: `${PAGE_IMG}527/527_e54f0e9f5481af23.jpeg`,
  hanumanExterior: `${PAGE_IMG}528/528_322ad0b196f6e909.jpg`,
  bonsaiGarden: `${PAGE_IMG}504/504_0ec527dbfb1dd0a2.jpg`,
  nadaStage: `${PAGE_IMG}506/506_9de9699b3a272279.jpg`,
  nadaConcert: `${PAGE_IMG}506/506_575a490450b5a1d7.jpg`,
  balaPortrait: `${PAGE_IMG}523/523_e0e53980acae1f62.jpg`,
  gauShala: `${PAGE_IMG}514/514_bb5a23cc41a0f878.jpg`,
  gitaChicago: `${PAGE_IMG}514/514_b7a1c01aeacc37c6.jpg`,
  kriyaPose: `${PAGE_IMG}515/515_47c13ada69bd6850.jpg`,
};

const yt = (id) => `https://www.youtube.com/watch?v=${id}`;
const VIDEO = {
  intro: { id: dattaCharitram[0][0], title: dattaCharitram[0][1] },
  swamiji: { id: 'DW0ebzb8vs4', title: 'Sri Swamiji unveiled' },
  // harvest/ashram--shuka-vana.md: Varam “chants the first line of the Hanuman Chalisa”
  varam: { id: varamVideo[0], title: 'Varam the parrot chants the first line of the Hanuman Chalisa' },
  nada: { id: 'bXM2CqyWqYI', title: 'Glimpses of Nada Mantapa’s construction' },
};

// A YouTube link that index.js opens in the page's video dialog (plain link without JS).
const videoLink = (v, inner, cls = '') => `<a class="${cls}" href="${yt(v.id)}" data-ix-video="${v.id}" data-ix-title="${esc(v.title)}">${inner}</a>`;

/* ---------------------------------------------------------------------------
   1 · Hero
--------------------------------------------------------------------------- */

const heroWords = ['Spirituality', 'Service', 'Music', 'Education', 'Universal Love'];

const hero = `<section class="hero ix-hero" id="welcome" aria-labelledby="ix-title" data-hero>
  <div class="hero-media ix-hero-media">${img(pic.hero, 'The sculpted golden gopurams of the Sri Datta Venkateshwara temple complex at the Mysuru Ashram, rising above tiled roofs and trees', { eager: true, cls: 'ix-hero-img' })}</div>
  <div class="ix-hero-shade" aria-hidden="true"></div>
  <canvas class="fx-canvas ix-embers" data-embers aria-hidden="true"></canvas>
  <div class="wrap ix-hero-inner">
    <div class="hero-copy ix-hero-copy">
      <p class="ix-hero-eyebrow" data-stagger>${heroWords.map((w, i) => `${i ? '<i aria-hidden="true">•</i>' : ''}<span>${w}</span>`).join('')}</p>
      <h1 id="ix-title" data-split>Guiding humanity towards<br class="ix-br"> a more <span class="em-light">conscious,</span><br class="ix-br"> <span class="em-light">compassionate</span> world</h1>
      <p class="lead" data-reveal="up">The divine mission of His Holiness Sri Ganapathy Sachchidananda Swamiji and Sri Datta Vijayananda Teertha Swamiji, from Avadhoota Datta Peetham at the foot of Chamundi Hill, Mysuru.</p>
      <div class="hero-actions" data-reveal="up">
        ${btn('Take a Virtual Tour', '#tour', 'gold', 'arrow', ' data-magnetic')}
        ${videoLink(VIDEO.intro, `${icon('play-circle', 16)}<span>Watch Video</span>`, 'btn btn-ghost')}
      </div>
      <div class="ix-readout glass" role="group" aria-label="Live from the Ashram" data-reveal="up">
        <p><i class="live-dot" data-dot="temple" aria-hidden="true"></i><span class="visually-hidden">Temple: </span><span class="ix-ro-k" aria-hidden="true">Temple</span><span data-status-long="temple">6 AM – 12 PM · 4 – 8 PM</span></p>
        <p>${icon('diya', 16)}<span class="visually-hidden">Next ritual: </span><span data-next-ritual>Hanuman Abhisheka · 7 AM</span></p>
        <p>${icon('clock', 16)}<span class="visually-hidden">Time in Mysuru: </span><span data-clock>IST</span><span class="ix-ro-k" aria-hidden="true">Mysuru</span></p>
      </div>
    </div>
    <figure class="ix-hero-quote" data-reveal="fade">
      <blockquote><p>May all beings be happy.<br>May all beings be healthy.<br>May all beings experience peace.</p></blockquote>
      <div class="ix-om" aria-hidden="true"><i></i><span class="om">ॐ</span><i></i></div>
    </figure>
  </div>
  <a class="ix-scroll-cue" href="#compassion"><span>Scroll</span><i aria-hidden="true"></i></a>
  ${thread('ix-hero-thread')}
</section>`;

/* ---------------------------------------------------------------------------
   2 · Quick-access tiles (overlap the hero)
--------------------------------------------------------------------------- */

const tiles = quickTiles([
  { icon: 'temple', title: 'Darshan &amp; Puja', note: 'Timings &amp; book online', href: 'darshan.html' },
  { icon: 'calendar', title: 'Events', note: 'Festivals &amp; programmes', href: 'events.html' },
  { icon: 'book', title: 'Teachings', note: 'Discourses &amp; wisdom', href: 'teachings.html' },
  { icon: 'heart-hand', title: 'Seva', note: 'Healthcare, education', href: 'seva.html' },
  { icon: 'pin', title: 'Visit', note: 'Plan your trip', href: 'visit.html' },
  { icon: 'heart', title: 'Donate', note: 'Support the mission', href: links.donations },
], 'overlap ix-tiles');

/* ---------------------------------------------------------------------------
   3 · A Life of Divine Compassion
--------------------------------------------------------------------------- */

const compassion = `<section id="compassion" class="section ix-compassion" aria-labelledby="compassion-h">
  <div class="wrap ix-comp">
    <figure class="ix-comp-main" data-reveal="clip">
      <div class="ix-comp-img">${img(photos.swamiji, 'His Holiness Sri Ganapathy Sachchidananda Swamiji, smiling, seated with His hands clasped', { parallax: '0.07', pos: '46% 30%' })}</div>
      ${videoLink(VIDEO.swamiji, `<span class="ix-play-btn">${icon('play', 24)}</span><span class="ix-play-label"><small>Watch</small>${VIDEO.swamiji.title}</span>`, 'ix-play')}
    </figure>
    <div class="ix-comp-copy">
      <span class="eyebrow">Peethadhipathi · Avadhoota Datta Peetham</span>
      <h2 id="compassion-h" data-split>A Life of <span class="em-light">Divine</span> <span class="em-light">Compassion</span></h2>
      <p class="ix-comp-lead" data-reveal="up">His Holiness Sri Ganapathy Sachchidananda Swamiji is a revered spiritual leader and the head of Avadhoota Datta Peetham in Mysuru, renowned for His profound spiritual teachings, music therapy and dedication to humanitarian service.</p>
      <p data-reveal="up">His mission is carried forward by Sri Datta Vijayananda Teertha Swamiji, fondly called Sri Bala Swamiji, anointed Junior Pontiff by Sri Swamiji on 29 May 2004, who explains the deep spiritual essence of the Vedas, Shastras, Upanishads and Puranas in simple words.</p>
      <div class="btn-row" data-reveal="up">
        ${btn('Learn More', 'sri-swamiji.html', 'line', 'arrow')}
        <a class="link-arrow ix-comp-link" href="sri-swamiji.html#bala-swamiji">About Sri Bala Swamiji ${icon('arrow', 15)}</a>
      </div>
    </div>
    <figure class="ix-comp-bala" data-reveal="up">
      <div class="ix-bala-img">${img(pic.balaPortrait, 'Sri Datta Vijayananda Teertha Swamiji (Sri Bala Swamiji), smiling, with sacred marks on His forehead and a rudraksha mala', { pos: '50% 22%' })}</div>
      <figcaption><b>Sri Datta Vijayananda Teertha Swamiji</b>Junior Pontiff since 29 May 2004</figcaption>
    </figure>
  </div>
</section>`;

/* ---------------------------------------------------------------------------
   4 · Live timings
--------------------------------------------------------------------------- */

// Shuka Vana: the homepage hours above differ from its own page (10 AM – 12:30 PM,
// 3:30 – 5:30 PM), which also says it is temporarily closed for maintenance.
const notes = {
  shukaVana: `Closed on Wednesdays. Timings vary across official sources, and <a href="attractions.html#shuka-vana">Shuka Vana’s own page</a> says it is temporarily closed for maintenance; please check with the Ashram before visiting.`,
};

const timingsSection = `<section id="timings" class="section-tight ix-timings" aria-labelledby="timings-h">
  <div class="wrap">
    <div class="ix-timings-head">
      <div>
        <span class="eyebrow">Darshan today</span>
        <h2 id="timings-h" data-split>Timings, <span class="em-light">live</span></h2>
      </div>
      <p class="ix-clock">${icon('clock', 18)}<span>It is <b data-clock>IST</b> in Mysuru</span></p>
    </div>
    <div class="hours-grid">
      ${timings.map((t) => hoursCard(t.key, t.title, t.rows, { img: t.img, note: t.key ? (notes[t.key] || t.note) : `Next ritual: <b data-next-ritual>Abhisheka · 7 AM</b>` })).join('')}
    </div>
    <p class="ix-note">${icon('info', 16)}<span>All timings are in Indian Standard Time and may change on festival days; please check the <a href="${links.calendar}">official calendar</a> or call the Ashram before you travel. <a class="link-arrow" href="darshan.html#timings">Full darshan guide ${icon('arrow', 14)}</a></span></p>
  </div>
</section>`;

/* ---------------------------------------------------------------------------
   5 · Our Pillars of Service
--------------------------------------------------------------------------- */

const pillars = [
  { icon: 'lotus', title: 'Spirituality', text: 'Datta worship, Vedic rituals and meditation', img: pic.kaalaagni, alt: 'Sri Swamiji offers arati to Kaalaagni Shamana Dattatreya, the presiding deity of the Peetham', pos: '50% 30%', href: 'darshan.html' },
  { icon: 'veena', title: 'Music &amp; Nada Chikitsa', text: 'The healing power of divine music', img: pic.nadaConcert, alt: 'Musicians perform before a packed audience in Nada Mantapa', pos: '50% 60%', href: 'music.html' },
  { icon: 'book', title: 'Education', text: 'The Veda Pathashala, founded in 1985', img: photos.students, alt: 'Three Veda Pathashala students seated at a microphone, chanting', pos: '50% 45%', href: 'seva.html#pathashala' },
  { icon: 'medical', title: 'Healthcare', text: 'SGS Hospital and free medical camps', img: photos.medicalCamp, alt: 'A doctor examines a young boy’s ear at a free medical camp', pos: '50% 40%', href: 'seva.html#hospital' },
  { icon: 'cow', title: 'Cow Care', text: 'A Gau Shala for more than 50 cows', img: pic.gauShala, alt: 'Sri Swamiji feeds the cows at the Gau Shala, Mysuru Ashram', pos: '40% 40%', href: 'seva.html#goshala' },
  { icon: 'globe', title: 'Global Initiatives', text: 'Centres and programmes worldwide', img: pic.gitaChicago, alt: 'An arena filled with devotees for Bhagavad Gita chanting at NOW Arena, Chicago, July 2024', pos: '50% 50%', href: 'centers.html' },
];

const pillarsSection = `<section id="pillars" class="section ix-pillars-sec" aria-labelledby="pillars-h">
  <div class="wrap">
    <div class="ix-pillars-panel">
      <header class="section-head">
        ${ornament()}
        <span class="eyebrow">Seva in action</span>
        <h2 id="pillars-h" data-split>Our Pillars of <span class="em-light">Service</span></h2>
        <p class="lead" data-reveal="up">An internationally acclaimed institution dedicated to the social, moral and spiritual upliftment of humanity.</p>
      </header>
      <ul class="ix-pillars" data-stagger>
        ${pillars.map((p) => `<li class="ix-pillar">
          <div class="ix-pillar-media">${img(p.img, p.alt, { pos: p.pos })}</div>
          <div class="ix-pillar-body">
            <span class="ix-pillar-icon" aria-hidden="true">${icon(p.icon, 30)}</span>
            <div><h3><a href="${p.href}">${p.title}</a></h3><p>${p.text}</p></div>
          </div>
        </li>`).join('')}
      </ul>
      <div class="ix-center">${btn('Explore All Initiatives', 'seva.html', 'line', 'arrow')}</div>
    </div>
  </div>
</section>`;

/* ---------------------------------------------------------------------------
   6 · Latest sevas
--------------------------------------------------------------------------- */

const sevasSection = `<section id="sevas" class="section section-sand ix-sevas" aria-labelledby="sevas-h">
  <div class="wrap">
    <header class="section-head">
      ${ornament()}
      <span class="eyebrow">Participate from anywhere</span>
      <h2 id="sevas-h" data-split>Latest <span class="em-light">sevas</span></h2>
      <p class="lead" data-reveal="up">Offer your prayers at the Ashram, in person or remotely. Every seva is performed by the Ashram priests on your behalf.</p>
    </header>
    <div class="ix-seva-grid" data-stagger>
      ${latestSevas.map((s) => `<article class="card ix-seva" data-tilt>
        <div class="card-media">${img(s.img, s.title, { pos: '50% 40%' })}</div>
        <div class="card-body">
          <span class="tag">${s.when}</span>
          <h3>${s.title}</h3>
          <p>${s.text}</p>
          <div class="ix-seva-foot">
            <a class="btn btn-gold btn-sm" href="${s.href}"><span>Participate</span>${icon('arrow', 16)}</a>
            ${shareRow(`${s.title} at Avadhoota Datta Peetham`, s.href).replace('<div class="share">', `<div class="share" role="group" aria-label="Share ${esc(s.title)}">`)}
          </div>
        </div>
      </article>`).join('')}
    </div>
    <div class="ix-center">${btn('See all poojas &amp; sevas', links.poojas, 'line', 'arrow-up-right')}</div>
  </div>
</section>`;

/* ---------------------------------------------------------------------------
   7 · Mandir Nagari
--------------------------------------------------------------------------- */

const temples = [
  { img: pic.kaalaagni, tag: 'Presiding deity', title: 'Universal Prayer Hall', text: 'Home of Kaalaagni Shamana Dattatreya Swami, the main deity of the Peetham.', href: 'darshan.html#prayer-hall', pos: '50% 35%' },
  { img: photos.rajarajeshwariSannidhi, tag: 'Consecrated 28 Dec 2023', title: 'Rajarajeshwari Temple', text: 'Mother Goddess Rajarajeshwari, amid the forms of the Nava Durgas.', href: 'darshan.html#rajarajeshwari', pos: '58% 40%' },
  { img: pic.venkateshwara, tag: 'Since 1999', title: 'Sri Datta Venkateshwara', text: 'Its architecture is much like the temple at holy Tirumala.', href: 'darshan.html#venkateshwara', pos: '62% 40%' },
  { img: photos.hanumanStatue, tag: '70-ft monolith · 2012', title: 'Karya Siddhi Hanuman', text: 'The tallest stone statue of Hanuman in India.', href: 'darshan.html#hanuman', pos: '50% 25%' },
];

const mandirSection = `<section id="mandir" class="section ix-mandir" aria-labelledby="mandir-h">
  <div class="wrap">
    <header class="section-head">
      ${ornament()}
      <span class="eyebrow">A city of temples</span>
      <h2 id="mandir-h" data-split>Datta Peetham <span class="em-light">Mandir</span> <span class="em-light">Nagari</span></h2>
      <p class="lead" data-reveal="up">From the presiding Kaalaagni Shamana Dattatreya to the 70-foot Karya Siddhi Hanuman, every shrine in the Ashram is a doorway to the divine.</p>
    </header>
    <div class="ix-mandir-grid" data-stagger>
      ${temples.map((t) => photoTile(t)).join('')}
    </div>
    <div class="ix-center">${btn('Temples &amp; darshan guide', 'darshan.html', 'line', 'arrow')}</div>
  </div>
</section>`;

/* ---------------------------------------------------------------------------
   8 · Virtual tour — sticky scroll story
--------------------------------------------------------------------------- */

const stops = [
  { place: 'Darshan', title: 'Universal Prayer Hall', img: photos.prayerHall, alt: 'Devotees fill the Universal Prayer Hall for a gathering in the presence of Sri Swamiji', pos: '50% 50%',
    text: 'Sri Swamiji calls it the crown of the Ashram. Daily congregational prayers gather here before Kaalaagni Shamana Dattatreya Swami, the main deity of the Peetham.',
    href: 'darshan.html#prayer-hall', cta: 'The Prayer Hall' },
  { place: 'Darshan', title: 'Rajarajeshwari Temple', img: pic.deviArati, alt: 'Sri Swamiji offers arati to Sri Rajarajeshwari Devi, adorned with flowers', pos: '60% 40%',
    text: 'Consecrated by Sri Swamiji on 28 December 2023. Devotees circumambulate the Mother Goddess past the Nava Durgas and the miniature forms of the 18 Shakti Peethams.',
    href: 'darshan.html#rajarajeshwari', cta: 'The temple' },
  { place: 'Darshan', title: 'Karya Siddhi Hanuman', img: pic.hanumanExterior, alt: 'The 70-foot monolithic Karya Siddhi Hanuman statue rising above the carved stone temple', pos: '42% 40%',
    text: 'The 70-foot monolithic statue consecrated in 2012 is the tallest stone statue of Hanuman in India. On weekends, 3D projection mapping is synchronised with the Hanuman Chalisa.',
    href: 'darshan.html#hanuman', cta: 'The temple' },
  { place: 'Attraction', title: 'Shuka Vana', img: photos.shukaVana2, alt: 'Sri Swamiji, smiling and waving, surrounded by green parrots at Shuka Vana', print: true,
    text: 'Founded by Sri Swamiji in 2012: a free-flight, walk-in aviary and bird hospital, home to more than 2,000 birds of 486 species and a Guinness World Record holder. (Its official page currently notes that it is temporarily closed to the public for maintenance.)',
    href: 'attractions.html#shuka-vana', cta: 'Shuka Vana', video: VIDEO.varam, videoLabel: 'Varam the parrot' },
  { place: 'Attraction', title: 'Bonsai Garden', img: pic.bonsaiGarden, alt: 'A pagoda pavilion among bonsai trees, rocks and a stream in the Kishkindha Moolika Bonsai Garden', pos: '50% 55%',
    text: 'More than 450 carefully shaped miniaturised trees in an oriental garden setting: the Kishkindha Moolika Bonsai Garden, passionately developed and nurtured by Sri Swamiji Himself.',
    href: 'attractions.html#bonsai', cta: 'The garden' },
  { place: 'Music', title: 'Nada Mantapa', img: pic.nadaStage, alt: 'The stage of Nada Mantapa lit for a concert beneath the hall’s vast tiered ceiling', pos: '50% 55%',
    text: 'The Hall of Musical Tones, inaugurated on 31 May 1998: a 35,000 square foot auditorium with state-of-the-art sound, lighting and theatre systems.',
    href: 'attractions.html#nada-mantapa', cta: 'Nada Mantapa', video: VIDEO.nada, videoLabel: 'Its construction' },
];
const pad = (n) => String(n).padStart(2, '0');

const plate = (s, i) => s.print
  ? `<figure class="story-plate ix-plate-print${i ? '' : ' is-on'}">${img(s.img, '', { cls: 'ix-print-bg' })}${img(s.img, s.alt, { cls: 'ix-print' })}</figure>`
  : `<figure class="story-plate${i ? '' : ' is-on'}">${img(s.img, s.alt, { pos: s.pos })}</figure>`;

const tourSection = `<section id="tour" class="section-dark ix-tour" aria-labelledby="tour-h">
  <div class="wrap ix-tour-head">
    <header class="section-head is-light">
      ${ornament()}
      <span class="eyebrow">Virtual tour</span>
      <h2 id="tour-h" data-split>Immersive Visual <span class="em-light">Experience</span></h2>
      <p class="lead" data-reveal="up">Walk through the Mysuru Ashram in six stops, from the Universal Prayer Hall to Nada Mantapa. Keep scrolling to move from one to the next.</p>
    </header>
  </div>
  <div class="story ix-story" data-story>
    <div class="story-stage">
      ${stops.map(plate).join('')}
      <div class="story-progress" aria-hidden="true">${stops.map((_, i) => `<i${i ? '' : ' class="is-on"'}></i>`).join('')}</div>
    </div>
    ${stops.map((s, i) => `<div class="story-scene">
      <div class="wrap">
        <article class="story-card glass" aria-labelledby="stop-${i + 1}">
          <span class="num">${pad(i + 1)} / ${pad(stops.length)} · ${s.place}</span>
          <h3 id="stop-${i + 1}">${s.title}</h3>
          <p>${s.text}</p>
          <div class="ix-stop-links">
            <a class="link-arrow" href="${s.href}">${s.cta} ${icon('arrow', 15)}</a>
            ${s.video ? videoLink(s.video, `${icon('play-circle', 18)}<span>Watch: ${s.videoLabel}</span>`, 'link-arrow ix-stop-video') : ''}
          </div>
        </article>
      </div>
    </div>`).join('')}
  </div>
</section>`;

/* ---------------------------------------------------------------------------
   9 · Scroll-lit teaching (verbatim, /sri-swamiji-says, 22 May 2014)
--------------------------------------------------------------------------- */

const statement = `<section id="teaching" class="section ix-statement" aria-labelledby="teaching-h">
  <svg class="ix-statement-mandala" viewBox="0 0 104 104" aria-hidden="true" data-spin="60"><use href="#i-mandala"/></svg>
  <div class="wrap">
    <h2 id="teaching-h" class="eyebrow">Sri Swamiji says</h2>
    <figure class="ix-teaching">
      <blockquote>${scrollLit('Just as *fire* cannot be separated from wood, similarly, a true devotee is not separate from the object of his *devotion* – the *Lord.*')}</blockquote>
      <figcaption><span>Pujya Sri Swamiji, <cite>Sadguru Sookti Sangraha</cite> (Devotion – The Most Difficult Path)</span><a class="link-arrow" href="${links.swamijiSays}">More sayings ${icon('arrow', 14)}</a></figcaption>
    </figure>
  </div>
</section>`;

/* ---------------------------------------------------------------------------
   10–11 · Interactive Ashram Map and Global Reach (shared features)
--------------------------------------------------------------------------- */

async function feature(path, name, args) {
  try {
    // carry this module's cache-busting query so `build.mjs --serve` picks up edits
    const bust = import.meta.url.includes('?') ? import.meta.url.slice(import.meta.url.indexOf('?')) : '';
    const mod = await import(new URL(path, import.meta.url).href + bust);
    const html = mod[name](args);
    if (typeof html !== 'string' || html.length < 200) throw new Error('empty markup');
    return html;
  } catch (e) {
    console.warn(`index: ${name} unavailable, using fallback (${e.message})`);
    return '';
  }
}

const mapFallback = `<a class="ix-feature-fallback" href="visit.html">
  ${img(photos.prayerHall, 'Devotees gathered in the Universal Prayer Hall at the Mysuru Ashram')}
  <span>${icon('map', 22)}<b>Explore the Ashram</b>Shrines, attractions and seva on the visitor guide</span>
</a>`;

const reachFallback = `<ul class="ix-reach-list">${countries.map((c) => `<li>${icon('pin', 14)}${c.name}</li>`).join('')}</ul>
  <p class="ix-center"><a class="btn btn-ghost" href="${links.ashramCenters}"><span>Find a centre</span>${icon('arrow-up-right', 16)}</a></p>`;

const mapSection = (map) => `<section id="ashram-map" class="section ix-map-sec" aria-labelledby="ashram-map-h">
  <div class="wrap ix-map-grid">
    <div class="ix-map-copy">
      <span class="eyebrow">Interactive Ashram Map</span>
      <h2 id="ashram-map-h" data-split>Walk the Ashram <span class="em-light">before</span> you arrive</h2>
      <p class="lead" data-reveal="up">Avadhoota Datta Peetham is situated on a sprawling 40-acre site at the foot of Chamundi Hill, in the Royal City of Mysuru.</p>
      <ul class="ix-map-facts" data-stagger>
        <li>${icon('temple', 20)}<span><b>Six shrines</b>From the Universal Prayer Hall to Kalabhairava</span></li>
        <li>${icon('music', 20)}<span><b>Nada Mantapa</b>The Hall of Musical Tones</span></li>
        <li>${icon('bird', 20)}<span><b>Shuka Vana &amp; Bonsai Garden</b>Birds and trees, Sri Swamiji’s “two eyes”</span></li>
      </ul>
      <div class="btn-row" data-reveal="up">
        ${btn('Plan your visit', 'visit.html', 'gold', 'arrow')}
        ${btn('Ashram attractions', 'attractions.html', 'line', 'arrow')}
      </div>
    </div>
    <div class="ix-map-card" data-reveal="up">${map || mapFallback}</div>
  </div>
</section>`;

const reachSection = (map) => `<section id="global-reach" class="section section-dark ix-reach" aria-labelledby="reach-h">
  <div class="wrap">
    <header class="section-head is-light">
      ${ornament()}
      <span class="eyebrow">Global Reach</span>
      <h2 id="reach-h" data-split>From Mysuru <span class="em-light">to the world</span></h2>
      <p class="lead" data-reveal="up">Sri Swamiji’s mission reaches devotees through Ashrams and centres in ${countries.length} countries, the ${kshetras.length} Shodasha Datta Kshetras across India, and concerts of healing music around the world.</p>
    </header>
    ${stats([[String(kshetras.length), 'Shodasha Datta Kshetras across India'], [String(countries.length), 'Countries with Ashram centres'], ['50', 'Years of Sri Swamiji in Europe, celebrated in Basel in 2026'], [String(apps.length), 'Devotional apps for devotees everywhere']], true)}
    ${map || reachFallback}
  </div>
</section>`;

/* ---------------------------------------------------------------------------
   12 · Nada Chikitsa and Datta Kriya Yoga
--------------------------------------------------------------------------- */

// Deterministic waveform: the same 56 bars on every build.
const wave = Array.from({ length: 56 }, (_, i) => {
  const env = 0.55 + 0.45 * Math.sin(i * 0.16 + 0.4);
  const h = 0.16 + 0.84 * env * Math.abs(Math.sin(i * 0.83 + Math.sin(i * 0.31) * 1.7));
  return `<i style="--h:${h.toFixed(2)};--d:-${((i * 0.37) % 2.6).toFixed(2)}s"></i>`;
}).join('');

const musicSection = `<section id="music" class="section ix-music" aria-labelledby="music-h">
  <div class="wrap ix-music-grid">
    <div class="ix-music-copy">
      <span class="eyebrow">Nada Chikitsa</span>
      <h2 id="music-h" data-split>Healing through <span class="em-light">music</span></h2>
      <p data-reveal="up">Dr. Sri Ganapathy Sachchidananda Swamiji is a renowned composer, singer and musician. He understands the ancient music system of Raga-Ragini and has created many new ragas using it. Because His compositions are so prolific, the title <em>Sagara</em>, “ocean”, was given to express this form of Raga-Ragini, and His concerts of music for meditation and healing are known as <em>Raga Sagara</em>.</p>
      <div class="ix-wave" aria-hidden="true">${wave}</div>
      <div class="btn-row" data-reveal="up">
        ${btn('Explore Nada Chikitsa', 'music.html', 'gold', 'arrow')}
        ${btn('Concerts', 'music.html#concerts', 'line', 'arrow')}
      </div>
    </div>
    <div class="ix-albums" data-rail>
      <div class="ix-albums-head">
        <h3>Listen to the albums</h3>
        <div class="ix-rail-btns">
          <button type="button" class="ix-rail-btn" data-rail-prev aria-label="Previous albums">${icon('arrow-left', 18)}</button>
          <button type="button" class="ix-rail-btn" data-rail-next aria-label="More albums">${icon('arrow', 18)}</button>
        </div>
      </div>
      <ul class="ix-rail" tabindex="0" aria-label="Albums by Sri Swamiji">
        ${albums.map((a) => `<li class="ix-album">
          ${img(a.img, `${a.name} album cover`)}
          <h4>${a.name}</h4>
          <small>${a.venue}</small>
          <div class="ix-stream">
            <a href="${a.spotify}" aria-label="${esc(a.name)} on Spotify">${icon('spotify', 16)}<span>Spotify</span></a>
            <a href="${a.apple}" aria-label="${esc(a.name)} on Apple Music">${icon('apple', 16)}<span>Apple</span></a>
          </div>
        </li>`).join('')}
      </ul>
      <a class="link-arrow" href="music.html#albums">All albums &amp; bhajans ${icon('arrow', 15)}</a>
    </div>
  </div>
  <div class="wrap">
    <div class="ix-kriya section-dark" id="kriya">
      <div class="ix-kriya-media">
        ${img(pic.kriyaPose, 'Sri Swamiji seated cross-legged on a stage, His arms stretched wide', { pos: '50% 40%' })}
        <div class="ix-breath glass" data-breath aria-hidden="true">
          <span class="ix-breath-orb"><i></i></span>
          <span><b data-breath-label>Breathe in</b><small>Illustrative only</small></span>
        </div>
      </div>
      <div class="ix-kriya-copy">
        <span class="eyebrow">A spiritual science for every belief</span>
        <h3 class="ix-kriya-title">Datta Kriya Yoga</h3>
        <p>A blend of ancient wisdom and modern technique for physical, mental and spiritual well-being. Sri Swamiji selects specific mental, pranic and physical practices to address the imbalances of modern life.</p>
        <p>Taught worldwide for decades to health, educational and business communities, Datta Kriya Yoga transcends religious boundaries.</p>
        <div class="btn-row">
          ${btn('Discover Datta Kriya Yoga', 'kriya-yoga.html', 'gold', 'arrow')}
          ${btn('dattakriyayoga.org', links.dattaKriyaYoga, 'ghost', 'arrow-up-right')}
        </div>
      </div>
    </div>
  </div>
</section>`;

/* ---------------------------------------------------------------------------
   13 · Upcoming events (dates verbatim from the official 2026 calendar)
--------------------------------------------------------------------------- */

const events = [
  { cat: 'music', label: 'Concert', start: '2026-11-25', end: '2026-12-02', day: '25', mon: 'Nov 2026', range: 'to 2 December', title: 'Sri Swamiji in Nara, Japan', place: 'Nara, Japan',
    text: 'Japan Ragasagara, Sri Swamiji’s music for meditation and healing, on Sunday 29 November, after the yoga conference “Sound, then Truth” on Saturday 28 November.' },
  { cat: 'seva', label: 'Seva camp', start: '2026-12-15', end: '2026-12-17', day: '15', mon: 'Dec 2026', range: 'to 17 December', title: 'SDHS Volunteer camp', place: 'Vishwaroopa Datta Kshetra, Ganagapura',
    text: 'A camp for the volunteers of Sri Datta Humane Services (SDHS), the charitable organisation founded by Sri Swamiji.' },
  { cat: 'festival', label: 'Festival', start: '2026-12-20', end: '2026-12-20', day: '20', mon: 'Dec 2026', range: 'Sunday', title: 'Vaikuntha Ekadashi &amp; Gita Jayanti', place: 'Mysuru Ashram',
    text: 'Vaikuntha Ekadashi at the Sri Datta Venkateswara Temple, and Gita Jayanti at Nada Mantapa.' },
  { cat: 'festival', label: 'Festival', start: '2026-12-21', end: '2026-12-23', day: '21', mon: 'Dec 2026', range: 'to 23 December', title: 'Dattatreya Jayanti', place: 'Mysuru Ashram',
    text: 'Ksheerabhisheka and Punya Smarana, Panchamrita Abhisheka, then Sahasra Kalasha Thailabhisheka to Dattatreya Swami on Datta Jayanti Purnima.' },
];

const eventsSection = `<section id="upcoming" class="section ix-events" aria-labelledby="upcoming-h">
  <div class="wrap" data-filter-scope>
    <div class="ix-events-top">
      <div>
        <span class="eyebrow">Events &amp; programmes</span>
        <h2 id="upcoming-h" data-split>Coming <span class="em-light">up</span></h2>
        <p class="ix-events-src">${icon('calendar', 16)}<span>From the official Datta Peetham calendar for 2026</span></p>
      </div>
      <div class="chips" role="group" aria-label="Filter events">
        ${[['all', 'All'], ['festival', 'Festivals'], ['music', 'Music'], ['seva', 'Seva camps']].map(([v, l], i) => `<button type="button" class="chip" data-filter="${v}" aria-pressed="${i === 0}">${l}</button>`).join('')}
      </div>
    </div>
    <ol class="ix-events-list" data-stagger>
      ${events.map((e) => `<li class="ix-event" data-filter-item="${e.cat}" data-start="${e.start}" data-end="${e.end}">
        <time class="ix-date" datetime="${e.start}"><b>${e.day}</b><span>${e.mon}</span><small>${e.range}</small></time>
        <div class="ix-event-body">
          <span class="tag">${e.label}<span class="ix-now" hidden> · On now</span></span>
          <h3>${e.title}</h3>
          <p>${e.text}</p>
          <span class="ix-event-place">${icon('pin', 14)}${e.place}</span>
        </div>
      </li>`).join('')}
    </ol>
    <p class="ix-events-empty" data-filter-empty hidden>Nothing coming up in this category just now. The official calendar lists everything planned for the year.</p>
    <p class="ix-events-empty" data-events-none hidden>The events listed for 2026 have passed. Please see the official calendar for what is planned next.</p>
    <div class="ix-center btn-row">
      ${btn('Events &amp; festivals', 'events.html', 'gold', 'arrow')}
      ${btn('Official calendar', links.calendar, 'line', 'calendar')}
    </div>
  </div>
</section>`;

/* ---------------------------------------------------------------------------
   14 · Mobile experience
--------------------------------------------------------------------------- */

const appsSection = `<section id="apps" class="section section-dark ix-apps" aria-labelledby="apps-h">
  <div class="wrap">
    <div class="ix-apps-grid">
      <div class="ix-apps-copy">
        <span class="eyebrow">Mobile experience</span>
        <h2 id="apps-h" data-split>Datta Peetham <span class="em-light">in your pocket</span></h2>
        <p class="lead" data-reveal="up">Stay connected with the Ashram wherever you are with the Datta Peetham app, and a family of SGS apps for chanting, scripture, music and meditation.</p>
        <div class="ix-badges" data-reveal="up">
          <a href="${links.appStore}">${img(photos.appStoreBadge, 'Download on the App Store')}</a>
          <a href="${links.playStore}">${img(photos.playStoreBadge, 'Android app on Google Play')}</a>
        </div>
      </div>
      <figure class="ix-phone" data-reveal="up">${img(photos.appMockup, 'The Datta Peetham app on two phones: a sign-in screen and a page about Sri Swamiji')}</figure>
    </div>
    <div class="ix-apps-more">
      <h3>${apps.length} devotional apps</h3>
      <a class="link-arrow" href="media.html#apps">All apps ${icon('arrow', 15)}</a>
    </div>
    <ul class="ix-app-grid" data-stagger>
      ${apps.map((a) => `<li><a class="ix-app" href="${a.href}">${img(a.icon, '', { w: 60, h: 60 })}<span>${a.name}</span></a></li>`).join('')}
    </ul>
  </div>
</section>`;

/* ---------------------------------------------------------------------------
   15 · Closing call to action
--------------------------------------------------------------------------- */

const closing = `<section id="support" class="ix-closing" aria-labelledby="support-h">
  ${horizon()}
  <svg class="ix-closing-mandala" viewBox="0 0 104 104" aria-hidden="true"><use href="#i-mandala"/></svg>
  <div class="wrap ix-closing-inner">
    ${ornament()}
    <span class="eyebrow">Be part of the mission</span>
    <h2 id="support-h" data-split>Support the Peetham’s <span class="em-light">seva</span></h2>
    <p class="lead" data-reveal="up">Your offering sustains Annadana, Gau Seva, the Veda Pathashala, free medical care and the birds of Shuka Vana.</p>
    <div class="btn-row ix-closing-actions" data-reveal="up">
      ${btn('Donate', links.donations, 'gold', 'heart', ' data-magnetic')}
      ${btn('Book a Puja', links.poojas, 'ghost', 'diya')}
    </div>
    <p class="ix-closing-note" data-reveal="up">${icon('info', 14)}<span>Donations and puja bookings are completed on dattapeetham.org. <a href="${links.subscribe}">Get notifications</a></span></p>
  </div>
</section>`;

/* ---------------------------------------------------------------------------
   Page
--------------------------------------------------------------------------- */

const ashram = { '@type': 'Place', name: 'Avadhoota Datta Peetham, Sri Ganapathy Sachchidananda Ashram', address: { '@type': 'PostalAddress', streetAddress: 'Datta Nagar, Ooty Road', addressLocality: 'Mysuru', addressRegion: 'Karnataka', postalCode: '570025', addressCountry: 'IN' } };

export default {
  slug: 'index',
  file: 'index.html',
  title: 'Avadhoota Datta Peetham',
  description: 'Avadhoota Datta Peetham, the Mysuru Ashram of Sri Ganapathy Sachchidananda Swamiji: live darshan timings, temples, sevas, healing music and a virtual tour.',
  image: pic.hero,
  preload: pic.hero,
  css: true,
  scripts: ['index'],
  features: ['ashram-map', 'world-map'],
  jsonLd: events.filter((e) => e.place === 'Mysuru Ashram').map((e) => ({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title.replace('&amp;', '&'),
    startDate: e.start,
    endDate: e.end,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: ashram,
    organizer: { '@type': 'Organization', name: 'Avadhoota Datta Peetham', url: 'https://www.dattapeetham.org/' },
    description: e.text,
  })),
  render: async () => {
    const [map, reach] = await Promise.all([
      feature('../features/ashram-map.mjs', 'ashramMap', { compact: true, id: 'campus-map' }),
      feature('../features/world-map.mjs', 'worldMap', { compact: true, id: 'reach-map' }),
    ]);
    return `${hero}
${tiles}
${compassion}
${timingsSection}
${pillarsSection}
${sevasSection}
${mandirSection}
${marquee(['A modern digital home for a timeless mission', 'Spirituality', 'Service', 'Harmony', 'A better humanity', 'Jaya Guru Datta'])}
${tourSection}
${statement}
${mapSection(map)}
${reachSection(reach)}
${musicSection}
${eventsSection}
${appsSection}
${closing}`;
  },
};
