// Nada Chikitsa — Healing through Music.
// Sources: dattapeetham.org/page/view/bhajans-and-healing-music, /page/view/nada-mantapa,
// /page/view/awards-honors, the homepage "Nada Chikitsa" block, /page/view/sri-swamiji,
// plus data.concerts, data.albums and data.timeline. Harvested 22 Oct 2026.

import { sectionHead, quickTiles, split, frame, stats, gallery, video, ctaBand, btn, img, icon, thread, esc } from '../components.mjs';
import { links, OFFICIAL, PAGE_IMG } from '../site.mjs';
import { photos, concerts, albums, apps } from '../data.mjs';

const P = {
  veena: `${PAGE_IMG}513/513_104a06683924cef7.png`,
  therapyRecord: `${PAGE_IMG}513/513_a9cd007c07ab1712.jpg`,
  treatise: `${PAGE_IMG}513/513_89d98c9589d0e47e.png`,
  cave: `${PAGE_IMG}513/513_0f3f84798f6304a5.jpg`,
  mantapaStage: `${PAGE_IMG}506/506_9de9699b3a272279.jpg`,
  mantapaConcert: `${PAGE_IMG}506/506_575a490450b5a1d7.jpg`,
  ragaSaama: `${PAGE_IMG}522/522_76f24eb8666dc213.jpg`,
  sydneyRecord: `${PAGE_IMG}517/517_c6c36ae47d0b6f3f.jpg`,
  sydneyConcert: `${PAGE_IMG}517/517_3c24d6f6884e527e.jpg`,
  carnaticBand: `${PAGE_IMG}517/517_a428def1e565d4c4.jpg`,
  drSkdu: `${PAGE_IMG}517/517_b44ff25ab7d80e86.jpg`,
  drTamil: `${PAGE_IMG}517/517_0493971d50e245b1.png`,
  drGangubai: `${PAGE_IMG}517/517_99cf47641ac970a1.jpg`,
  chowdaiah: `${PAGE_IMG}517/517_f9c8d58a028375da.png`,
  sarvabhauma: `${PAGE_IMG}517/517_28d9d127ff58baf4.jpg`,
  bandRecord: `${PAGE_IMG}517/517_0eaa9fdc9b71b96c.jpg`,
  stampRecord: `${PAGE_IMG}517/517_42c18ff9b9fe6da1.jpg`,
};

const EXT = {
  page: `${OFFICIAL}/page/view/bhajans-and-healing-music`,
  mantapa: `${OFFICIAL}/page/view/nada-mantapa`,
  awards: `${OFFICIAL}/page/view/awards-honors`,
  spotify: 'https://open.spotify.com/artist/3VCEvO2NgnGTyWqG4zgEBU',
  apple: 'https://music.apple.com/in/artist/sri-ganapathy-sachchidananda-swamiji/418448608',
  bhajanmala: 'https://www.bhajanmala.com/',
  store: 'https://ragaraginistore.com/',
};

const bhajanApp = apps.find((a) => a.name === 'Bhajan Mala');

// Healing music, in the Peetham's own explanation (Naada Chikitsa section of the source).
const principles = [
  ['01', 'The Naadi system', 'The subtle body comprises 72,000 Naadis; 14 are considered most significant for carrying praana from the subtle to the physical body. A disruption in the Naadis can lead to physical or mental ailments.'],
  ['02', 'Sound and praana', 'The flow of sound vibration — naada — parallels the flow of praana. Specific raagas are associated with healing specific organs of the body, aligned with the flow of praana through the Naadis.'],
  ['03', 'Mind and thought', 'Thoughts manifest as sound in the mind. Healing music introduces higher vibrations that calm, and eventually control, the daily influx of thoughts, preparing the mind for meditation.'],
];

const ragaString = [
  ['1989', 'Raga Ragini revived', 'Revival of Raga Ragini and the Dhyana Chikitsa Kacheri; research and development on Nada Chikitsa begins.'],
  ['1993', 'Nada Prasara', 'An eight-month Nada Prasara tour.'],
  ['1994', 'Nada Nidhi', 'The Nada Nidhi title is introduced, alongside the Vedic examinations and Veda Nidhi.'],
  ['1996', 'Raga Ragini Trust', 'The Trust is formed. It publishes Sri Swamiji’s books, discourses and music.'],
  ['1998', 'Nada Mantapa', 'The Hall of Musical Tones is inaugurated at the Mysuru Ashram on 31 May.'],
];

const venues = [
  ['Royal Albert Hall', 'London'], ['The Lincoln Center', 'New York'], ['Carnegie Hall', 'New York'],
  ['Chicago Symphony Orchestra Hall', 'Chicago'], ['Kennedy Center', 'Washington, DC'], ['Sydney Opera House', 'Sydney'],
  ['The Esplanade', 'Singapore'], ['Dubai Opera House', 'Dubai'], ['Dalian International Center', 'China'],
  ['Westminster Hall', 'London'], ['Tonhalle', 'Zurich'], ['KKL Luzern', 'Lucerne'],
  ['The Lyric Theatre', 'Johannesburg'], ['Music Academy', 'Chennai'], ['Siri Fort Auditorium', 'New Delhi'],
  ['Shanmugananda Auditorium', 'Mumbai'], ['Chowdaiah Memorial Hall', 'Bangalore'], ['Gayana Samaja', 'Bangalore'],
];

const swaras = [['Sa', 'Agni'], ['Ri', 'Brahma'], ['Ga', 'Saraswati'], ['Ma', 'Parameshwara'], ['Pa', 'Maha Vishnu'], ['Da', 'Maha Ganapati'], ['Ni', 'Surya Narayana']];

const honours = [
  ['2013', 'Honorary Doctorate in Music', 'Vijayanagara Sri Krishna Devaraya University, Bellary — presented at the Mysuru Ashram on 22 June 2013.', P.drSkdu, 'Sri Swamiji receiving the honorary doctorate from Sri Krishna Devaraya University'],
  ['2016', 'Honorary Doctorate in Music', 'World Classical Tamil University, London — conferred on 23 May 2016.', P.drTamil, 'Sri Swamiji receiving the honorary doctorate from the World Classical Tamil University'],
  ['2022', 'Piteelu Chowdaiah Lifetime Award', 'Sri Nadabrahma Sangeetha Sabha and Sangeetha Ratna Mysuru T. Chowdaiah Samsmarana Vedike, Mysuru — 19 January 2022.', P.chowdaiah, 'Sri Swamiji receiving the Piteelu Chowdaiah Award in Mysuru'],
  ['2023', 'Honorary Doctorate', 'Karnataka State Dr. Gangubai Hanagal Music and Performing Arts University, at its 6th convocation, Raj Bhavan, Bengaluru — 31 October 2023.', P.drGangubai, 'Sri Swamiji receiving the honorary doctorate at Raj Bhavan, Bengaluru'],
  ['2024', 'Guinness World Record — largest special stamp', 'A 13.104 m² stamp depicting Nada Mantapa, recognised at the Mysuru Ashram on 13 December 2024.', P.stampRecord, 'Sri Swamiji with the Guinness World Records certificate before the giant Nada Mantapa stamp'],
  ['2025', 'Guinness World Record — largest Carnatic band', '955 artists, vocalists and instrumentalists in the Nama Sankeertana “Sri Venkateshwara Vaibhavam”, CUTX Event Center, Allen, Texas — 9 July 2025.', P.bandRecord, 'Sri Swamiji holding the Guinness World Records certificate for the largest Carnatic band'],
  ['2026', 'Nada Yoga Sarvabhauma', 'Title and Honorary Doctorate (Acharya) in Nada Yoga from Vedic Wellness University, Florida, conferred in Nada Mantapa — 15 February 2026.', P.sarvabhauma, 'Sri Swamiji seated with the Nada Yoga Sarvabhauma citation, surrounded by dignitaries'],
];

// Scroll-lit statement (same mechanics as components.scrollLit) with one
// sentence per line. *word* gets the gold sheen.
function litLines(lines, tag = 'blockquote') {
  let i = 0;
  const n = lines.join(' ').split(/\s+/).length;
  const word = (w) => {
    const em = /^\*.*\*[.,;:!?]?$/.test(w);
    return `<span class="w${em ? ' em-light' : ''}" style="--i:${i++}">${w.replace(/\*/g, '')}</span>`;
  };
  return `<${tag} class="scroll-lit lit-lines" data-progress="0.9,0.5" style="--n:${n}">${lines.map((l) => `<span class="lit-line">${l.split(/\s+/).map(word).join(' ')}</span>`).join(' ')}</${tag}>`;
}

// Illustrative seating fan: rows open within 140° of the performer.
function fanDiagram() {
  const cx = 500, cy = 452, a1 = 160, a2 = 20, rad = (d) => (d * Math.PI) / 180;
  const pt = (r, a) => [+(cx + r * Math.cos(rad(a))).toFixed(1), +(cy - r * Math.sin(rad(a))).toFixed(1)];
  const arc = (r) => { const [x1, y1] = pt(r, a1), [x2, y2] = pt(r, a2); return `M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`; };
  const rows = [150, 192, 234, 276, 318, 360, 402].map((r, i) => `<path class="fd-row" style="--d:${i}" d="${arc(r)}"/>`).join('');
  const ribs = [];
  for (let a = a2; a <= a1 + 0.01; a += 140 / 10) { const [x1, y1] = pt(118, a), [x2, y2] = pt(414, a); ribs.push(`<path class="fd-rib" d="M${x1} ${y1} L${x2} ${y2}"/>`); }
  const [ex1, ey1] = pt(72, a1), [ex2, ey2] = pt(72, a2);
  return `<figure class="fan" data-reveal="fade">
  <svg viewBox="80 22 840 478" role="img" aria-labelledby="fan-cap" data-draw>
    <path class="fd-edge" d="M${pt(430, a1).join(' ')} L${cx} ${cy} L${pt(430, a2).join(' ')}"/>
    ${ribs.join('')}
    ${rows}
    <path class="fd-angle" d="M${ex1} ${ey1} A72 72 0 0 1 ${ex2} ${ey2}"/>
    <circle class="fd-stage" cx="${cx}" cy="${cy}" r="34"/>
    <text class="fd-label" x="${cx}" y="${cy - 92}" text-anchor="middle">140°</text>
    <text class="fd-small" x="${cx}" y="${cy + 6}" text-anchor="middle">Stage</text>
  </svg>
  <figcaption id="fan-cap"><b>Illustrative diagram, not to scale.</b> Seats fan out radially within 140° of the performer, in the shape of a palm-leaf hand fan.</figcaption>
</figure>`;
}

function albumSleeve(a, i) {
  const label = esc(a.name);
  return `<li class="record" style="--i:${i}">
  <div class="record-art">
    <span class="record-disc" aria-hidden="true"><span class="record-label">${img(a.img, '')}</span></span>
    <span class="record-sleeve">${img(a.img, `Album cover: ${a.name}`)}</span>
  </div>
  <div class="record-body">
    <h3>${a.name}</h3>
    <p>${a.venue}</p>
    <div class="record-links">
      <a class="stream-btn" href="${a.spotify}" aria-label="Listen to ${label} on Spotify">${icon('spotify', 16)}<span>Spotify</span></a>
      <a class="stream-btn" href="${a.apple}" aria-label="Listen to ${label} on Apple Music">${icon('apple', 16)}<span>Apple Music</span></a>
    </div>
  </div>
</li>`;
}

export default {
  slug: 'music',
  file: 'music.html',
  title: 'Nada Chikitsa — Healing through Music',
  crumb: 'Nada Chikitsa',
  nav: 'Teachings',
  description: 'Nada Chikitsa: the healing music of Sri Ganapathy Sachchidananda Swamiji — Raga Sagara concerts, albums to stream, 3,000+ bhajans and the Nada Mantapa.',
  image: P.ragaSaama,
  preload: P.veena,
  css: true,
  scripts: ['music'],
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'MusicGroup',
      name: 'Sri Ganapathy Sachchidananda Swamiji',
      description: 'Composer, singer and musician; Music for Meditation & Healing (Raga Sagara) concerts.',
      sameAs: [EXT.spotify, EXT.apple],
      album: albums.map((a) => ({ '@type': 'MusicAlbum', name: a.name, image: a.img, url: a.spotify })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'PerformingArtsTheater',
      name: 'Nada Mantapa',
      alternateName: 'Raga Ragini Samudaya Bhavan',
      description: 'A 35,000 sq ft music auditorium at Sri Ganapathy Sachchidananda Ashram, Mysuru, inaugurated on 31 May 1998.',
      image: photos.nadaMantapaInterior,
      url: EXT.mantapa,
      address: { '@type': 'PostalAddress', streetAddress: 'Datta Nagar, Ooty Road', addressLocality: 'Mysuru', addressRegion: 'Karnataka', postalCode: '570025', addressCountry: 'IN' },
    },
  ],
  render: () => `
<section class="nada-hero" aria-labelledby="nada-title">
  <canvas class="nada-canvas" data-nada aria-hidden="true"></canvas>
  <div class="nada-hero-glow" aria-hidden="true"></div>
  <div class="wrap nada-hero-inner">
    <div class="nada-hero-copy">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">/</span><a href="teachings.html">Teachings</a><span aria-hidden="true">/</span><span aria-current="page">Nada Chikitsa</span></nav>
      <span class="eyebrow eyebrow-light">Raga Ragini Vidya · Music for Meditation &amp; Healing</span>
      <h1 id="nada-title" data-split>Nada Chikitsa <span class="nada-h1-sub">healing through <span class="em-light">music</span></span></h1>
      <p class="lead" data-reveal="up">Sri Ganapathy Sachchidananda Swamiji is widely recognised for His transformative Divya Naama Sankeertana — singing the divine names — and for Healing &amp; Meditation Music that has touched countless lives around the world.</p>
      <div class="hero-actions" data-reveal="up">
        ${btn('Listen to the albums', '#albums', 'gold', 'arrow', ' data-magnetic')}
        ${btn('Raga Sagara concerts', '#concerts', 'ghost', 'play-circle')}
      </div>
    </div>
    <figure class="nada-portrait" data-reveal="scale">
      <span class="np-ring" aria-hidden="true"></span>
      <span class="np-disc">${img(P.veena, 'Sri Swamiji seated in a forest, playing the veena (black-and-white photograph)', { eager: true, pos: '56% 38%' })}</span>
      <figcaption>Sri Swamiji with the veena</figcaption>
    </figure>
  </div>
  ${thread('nada-thread')}
</section>
${quickTiles([
    { icon: 'veena', title: 'Raga Sagara', note: 'The ocean of ragas', href: '#raga-ragini' },
    { icon: 'calendar', title: 'Concerts', note: 'Meditation &amp; healing', href: '#concerts' },
    { icon: 'headphones', title: 'Albums', note: 'Spotify &amp; Apple Music', href: '#albums' },
    { icon: 'temple', title: 'Nada Mantapa', note: 'Hall of Musical Tones', href: '#nada-mantapa' },
  ], 'overlap').replace('aria-label="Quick links"', 'aria-label="On this page"')}

<section class="section" id="nada-chikitsa">
  <div class="wrap">
    ${split({
    media: `<figure class="nc-figure">
      <div class="nc-img">${img(P.ragaSaama, 'A healing music concert in progress: musicians on a darkened stage, and above them a large screen showing Raga Saama with its zodiac sign, element, chakra and the part of the body it is said to affect')}</div>
      <figcaption><b>Raga Saama</b>, as presented on screen during a Music for Meditation &amp; Healing concert: the raga with its zodiac sign, element and chakra.</figcaption>
    </figure>`,
    body: `<span class="eyebrow">Nada Chikitsa</span>
      <h2 data-split>Where melody becomes <span class="em-light">medicine</span></h2>
      <p class="dropcap">Rooted in ancient Vedic teaching as <i>nāda cikitsā</i>, healing through sound is what the world now calls music therapy. Several decades of deep, intuitive research into the effects of musical notes and rhythms on the human body have given Sri Swamiji a profound knowledge of effective music therapy.</p>
      <p>Coupling this with the ancient Indian science of Raga Ragini Vidya, He plays Healing Music for audiences across the world. In concert He alternates between melodies that relax and melodies that energise, accompanied by musicians on classical Indian instruments.</p>
      <blockquote class="nada-pull"><p>“Only a Nadayogi adept in the aspects of traditional as well as the modern sciences is able to blend the art of music with healing music therapeutic medicine and perform Nada Chikitsa.”</p><cite>Avadhoota Datta Peetham</cite></blockquote>`,
  })}

    <div class="principles" data-stagger>
      ${principles.map(([n, t, x]) => `<article class="principle">
        <span class="principle-num">${n}</span>
        <svg class="principle-wave" viewBox="0 0 120 24" aria-hidden="true" data-draw><path d="M0 12 C 10 2, 20 2, 30 12 S 50 22, 60 12 S 80 2, 90 12 S 110 22, 120 12"/></svg>
        <h3>${t}</h3>
        <p>${x}</p>
      </article>`).join('')}
    </div>

    <div class="effects" data-reveal="up">
      <div class="effects-head">
        <span class="eyebrow">Body, mind and soul</span>
        <h3>The effects the Peetham describes</h3>
        <p>When Nada, the pure sound of melody, is approached reverentially and absorbed with total concentration, its vibrations “clear the dust off the mirror-like mind”, and the inherent divinity in man is reflected.</p>
      </div>
      <dl class="effects-list">
        <div><dt>${icon('heart', 18)}At the physical level</dt><dd>Lowered blood pressure, a stabilised heart rate, improved motor skills and relief from pain.</dd></div>
        <div><dt>${icon('sparkle', 18)}At the mental level</dt><dd>Reduced depression and anxiety, strengthened memory and enhanced intellectual activity.</dd></div>
      </dl>
    </div>
  </div>
</section>

<div class="nada-quote section-tight section-paper">
  <svg class="nada-quote-wave" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 60 C 100 20, 200 20, 300 60 S 500 100, 600 60 S 800 20, 900 60 S 1100 100, 1200 60"/><path d="M0 60 C 100 35, 200 35, 300 60 S 500 85, 600 60 S 800 35, 900 60 S 1100 85, 1200 60"/></svg>
  <figure class="wrap">
    ${litLines(['Music is my *religion*.', 'Music is my *language*.', 'Music is my *soul*.', 'Music is my *expression*.'])}
    <figcaption>— Sri Swamiji</figcaption>
  </figure>
</div>

<section class="section section-dark grain raga" id="raga-ragini">
  <svg class="raga-watermark" viewBox="0 0 104 104" aria-hidden="true" data-spin="40"><use href="#i-mandala"/></svg>
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Raga Ragini Vidya', title: 'An <span class="em-light">ocean</span> of ragas', lead: 'Sri Swamiji understands the ancient music system of Raga-Ragini, has unparalleled access to melodies, and has created many new ragas using the ancient system within present musicology. Because His compositions are so prolific, the title <i>Sagara</i> — ocean — was given to express this form of Raga-Ragini.', light: true })}

    <div class="raga-grid">
      <div class="raga-panel glass" data-reveal="up">
        <h3>Ragas composed by Sri Swamiji</h3>
        <p>Sri Swamiji has created numerous new ragas within the framework of the ancient system. Among them:</p>
        <ul class="raga-names" data-stagger>
          <li>Eeshanana</li><li>Anagha</li><li>Puttu Gam Sri</li>
        </ul>
        <h3>The Datta Veena</h3>
        <p>Sri Swamiji performs on a synthesizer programmed with over 1,000 personally selected sounds, which He fondly calls the Datta Veena, accompanied by master musicians.</p>
        ${stats([['1000', 'Sounds selected for the Datta Veena', '+']], true)}
      </div>
      <figure class="treatise" data-reveal="up">
        <div class="treatise-book" data-tilt>${img(P.treatise, 'Cover of the treatise Raga Ragini Nadayoga, showing Sri Swamiji at the keyboard before chakra symbols')}</div>
        <figcaption>
          <span class="tag tag-light">The treatise</span>
          <h3>Raaga Raagini Naada Yoga</h3>
          <p>An epic compendium of Sri Swamiji’s musical works, with special emphasis on the healing aspects of music and on the components He employs in Healing Music Concerts, illustrated with photographs taken over several decades.</p>
        </figcaption>
      </figure>
    </div>

    <div class="raga-string" data-progress="0.85,0.45" style="--n:${ragaString.length}">
      <span class="rs-track" aria-hidden="true"><i></i></span>
      <ol class="rs-list">
        ${ragaString.map(([y, t, x], i) => `<li class="rs-node" style="--i:${i}"><span class="rs-fret" aria-hidden="true"></span><span class="rs-year">${y}</span><h3>${t}</h3><p>${x}</p></li>`).join('')}
      </ol>
    </div>
  </div>
</section>

<section class="section concerts" id="concerts">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Raga Sagara concerts', title: 'Music for Meditation &amp; <span class="em-light">Healing</span>', lead: 'Sri Swamiji has been giving Healing Music Concerts — Music for Meditation — for several decades, accompanied by world-renowned musicians. Each concert carries its own Raga Sagara name.' })}

    <div class="relief" data-reveal="up">
      <span class="relief-icon">${icon('heart-hand', 30)}</span>
      <div class="relief-copy">
        <h3>Every ticket also serves the world</h3>
        <p>Sri Swamiji, in His boundless compassion, has resolved to donate the proceeds from all upcoming concert ticket sales towards relief efforts for natural calamities. Attending a Music for Meditation &amp; Healing session brings a dual benefit: personal healing, and support for natural disaster relief.</p>
      </div>
      ${btn('Concert details &amp; tickets', links.concerts, 'gold', 'arrow-up-right')}
    </div>

    <div class="rail-head">
      <h3>Featured concerts</h3>
      <div class="rail-nav" data-rail-nav hidden>
        <button class="rail-btn" type="button" data-rail-prev aria-label="Previous concerts">${icon('arrow-left', 18)}</button>
        <button class="rail-btn" type="button" data-rail-next aria-label="Next concerts">${icon('arrow', 18)}</button>
      </div>
    </div>
    <ul class="rail" data-rail tabindex="0" aria-label="Concerts, scrollable list">
      ${concerts.map((c) => `<li class="concert">
        <a class="concert-link" href="${c.href}">
          <span class="concert-media">${img(c.img, `Concert poster: ${c.name}`)}</span>
          <span class="concert-body"><span class="tag">Meditation &amp; Healing</span><b>${c.name}</b><span class="concert-cta">Details on dattapeetham.org ${icon('arrow-up-right', 14)}</span></span>
        </a>
      </li>`).join('')}
    </ul>

    <div class="world">
      <div class="world-cave">
        ${frame(P.cave, 'An audience seated inside a vast, softly lit cave for Sri Swamiji’s Music for Healing & Meditation at The Caverns, Pelham, Tennessee', { ratio: '16/10', badge: '3 August 2024', caption: '<b>A first: music in a cave</b>Sri Swamiji’s first-ever Music for Healing &amp; Meditation in a cave — The Caverns, Pelham, Tennessee, USA' })}
      </div>
      <div class="world-venues" data-reveal="up">
        <span class="eyebrow">Around the world</span>
        <h3>A few of the halls that have heard Raga Sagara</h3>
        <ul class="venues">
          ${venues.map(([v, c]) => `<li><b>${v}</b><span>${c}</span></li>`).join('')}
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="section section-dark albums" id="albums">
  <div class="albums-glow" aria-hidden="true"></div>
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Listen at home', title: 'Albums of <span class="em-light">healing</span> music', lead: 'Live Raga Sagara recordings from Auckland, Carnegie Hall, Davos and Hyderabad, and an instrumental album — streaming on Spotify and Apple Music.', light: true })}
    <ol class="records" data-stagger>
      ${albums.map(albumSleeve).join('')}
    </ol>
    <div class="albums-more" data-reveal="up">
      <p>All of Sri Swamiji’s music</p>
      <div class="btn-row">
        ${btn('Spotify', EXT.spotify, 'ghost', 'spotify')}
        ${btn('Apple Music', EXT.apple, 'ghost', 'apple')}
        ${btn('Raga Ragini Store', EXT.store, 'ghost', 'arrow-up-right')}
      </div>
    </div>
  </div>
</section>

<section class="section section-paper bhajans" id="bhajans">
  <div class="wrap">
    ${split({
    reverse: true,
    media: frame(P.carnaticBand, 'Rows of musicians with veenas seated on the floor of an arena before a large audience', { ratio: '4/3', pos: '50% 60%', caption: '<b>Sri Venkateshwara Vaibhavam</b>A grand Nama Sankeertana of 955 artists — Allen, Texas, 2025' }),
    body: `<span class="eyebrow">Divya Naama Sankeertana</span>
      <h2 data-split>Bhajans: singing the <span class="em-light">divine names</span></h2>
      <p>Sri Swamiji is a gifted composer and singer — a versatile <i>Vaggeyakaara</i>, lyricist and composer in many languages, adept at crafting melodies and setting rhythms. He has composed more than 3,000 bhajans in praise of various deities.</p>
      <p>He passionately advocates Divya Naama Sankeertana as a means to transcend fear and find inner peace, and has inspired tens of thousands of devotees on the path of devotional singing. His sessions enthral a musical layman and a Carnatic scholar alike.</p>
      ${stats([['3000', 'Bhajans composed', '+'], ['8', 'Languages']])}
      <ul class="lang-list" aria-label="Languages of Sri Swamiji’s bhajans">${['Sanskrit', 'Kannada', 'Telugu', 'Tamil', 'Marathi', 'Gujarati', 'Hindi', 'English'].map((l) => `<li>${l}</li>`).join('')}</ul>
      <p class="bhajan-note">Sri Bala Swamiji, too, is a highly inspired singer-lyricist, with compositions in praise of His Guru, Sri Swamiji, and various deities in Sanskrit, Telugu, Kannada, Tamil and English.</p>
      <div class="bhajan-links">
        <a class="bhajan-link" href="${EXT.bhajanmala}">${icon('book', 22)}<span><b>Bhajan lyrics</b><small>bhajanmala.com</small></span>${icon('arrow-up-right', 16)}</a>
        ${bhajanApp ? `<a class="bhajan-link" href="${bhajanApp.href}"><img src="${bhajanApp.icon}" alt="" width="40" height="40" loading="lazy" decoding="async"><span><b>Bhajan Mala app</b><small>App Store</small></span>${icon('arrow-up-right', 16)}</a>` : ''}
      </div>`,
  })}
  </div>
</section>

<section class="section section-dark mantapa" id="nada-mantapa">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'The Hall of Musical Tones · Raga Ragini Samudaya Bhavan', title: 'Nada <span class="em-light">Mantapa</span>', lead: 'Inaugurated by Sri Swamiji on 31 May 1998, this purpose-built auditorium at the Mysuru Ashram has hosted thousands of concerts. It is equipped with state-of-the-art sound, lighting and theatrical systems.', light: true })}
    ${stats([['35,000', 'Square feet'], ['5,000', 'Seats', '+'], ['72', 'Pillars — the 72 melakarta ragas'], ['22', 'Tamburas — the 22 shrutis'], ['2,150', 'Sq ft stage']], true)}

    <div class="mantapa-grid">
      ${fanDiagram()}
      <div class="mantapa-copy prose" data-reveal="up">
        <h3>Born of a Ramayana story</h3>
        <p>The fan-shaped design was inspired by an episode Sri Swamiji narrates: Lord Rama, seeking Seetha in the forest, was fanned by Hanuman with a palm leaf. The auditorium takes the shape of that palm-leaf fan, with its entrance facing east towards the sacred Chamundi hills.</p>
        <h3>A hall that listens</h3>
        <p>Large portraits of the great composers line the walls. When a composer’s work is performed, the lights before that portrait illuminate — when Saint Tyagaraja’s “Samaja Varagamana” is sung, Tyagaraja’s portrait glows.</p>
        <p>At the entrance stand sculpted deities associated with music: Chaitanya Maha Prabhu, Narada Muni, Garuda, Vishwaksena, Anjaneya, Tumburu, Hayagreeva, Nandi, Bhringi and Ganapati.</p>
      </div>
    </div>

    <div class="swaras" data-reveal="up">
      <div class="swaras-head">
        <h3>Sapta Swara Devata Mantapam</h3>
        <p>The world’s first and only shrine to the seven musical notes, each embodied by a deity.</p>
      </div>
      <ol class="swara-row" data-stagger>
        ${swaras.map(([s, d], i) => `<li class="swara" style="--k:${i}"><span class="swara-note">${s}</span><span class="swara-deity">${d}</span></li>`).join('')}
      </ol>
    </div>

    ${gallery([
    [P.mantapaConcert, 'A concert in Nada Mantapa: musicians on stage before a full hall, with portraits of composers lining the walls', 'Composers’ portraits line the walls of Nada Mantapa'],
    [P.mantapaStage, 'The ornate stage of Nada Mantapa beneath its sweeping ceiling, with screens on either side', 'Nada Mantapa’s stage'],
    [photos.nadaMantapaInterior, 'Seen from the stage of Nada Mantapa: a full hall of devotees facing the performers', 'A full hall, seen from the stage'],
    [photos.nadaMantapaChandra, 'A packed Nada Mantapa seen from above, devotees seated in rows', 'Devotees gathered in Nada Mantapa'],
    [P.stampRecord, 'Sri Swamiji with a Guinness World Records adjudicator before the giant stamp depicting Nada Mantapa', 'The largest special stamp, depicting Nada Mantapa (2024)'],
  ], 'mantapa-gallery')}

    <div class="btn-row mantapa-actions" data-reveal="up">
      ${btn('Plan your visit', 'visit.html', 'gold')}
      ${btn('Nada Mantapa on dattapeetham.org', EXT.mantapa, 'ghost', 'arrow-up-right')}
    </div>
  </div>
</section>

<section class="section section-sand honours" id="honours">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Recognition', title: 'Honours in <span class="em-light">music</span>', lead: 'Universities, music sabhas and Guinness World Records have recognised Sri Swamiji’s music.' })}
    <div class="honour-feature">
      ${video({ id: 'vtIGDzCp0-M', title: 'Largest music therapy lesson — Sydney Opera House', thumb: P.sydneyConcert })}
      <div class="honour-feature-copy" data-reveal="up">
        <span class="tag">2015 · Guinness World Record</span>
        <h3>The largest music therapy lesson</h3>
        <p>On 6 April 2015 Sri Swamiji led 1,814 people at the Sydney Opera House in a music therapy lesson lasting two and a half hours — for the well-being of the participants and of those suffering around the world.</p>
        ${stats([['1814', 'Participants'], ['2.5', 'Hours']])}
      </div>
    </div>
    <ol class="honour-roll" data-stagger>
      ${honours.map(([y, t, x, src, alt]) => `<li class="honour">
        <span class="honour-img">${img(src, alt)}</span>
        <span class="honour-year">${y}</span>
        <div><h3>${t}</h3><p>${x}</p></div>
      </li>`).join('')}
    </ol>
    <p class="honours-more" data-reveal="up"><a class="link-arrow" href="${EXT.awards}">All awards &amp; honours on dattapeetham.org ${icon('arrow-up-right', 16)}</a></p>
  </div>
</section>

${ctaBand({
    title: 'Sit with the music',
    text: 'Attend a Music for Meditation &amp; Healing session, or begin at home with an album. Proceeds from upcoming concert tickets go towards natural calamity relief.',
    image: photos.nadaMantapa,
    actions: `${btn('Concerts &amp; tickets', links.concerts, 'gold', 'arrow-up-right')}${btn('Listen on Spotify', EXT.spotify, 'ghost', 'spotify')}`,
  })}
`,
};
