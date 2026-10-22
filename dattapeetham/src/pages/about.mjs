// About the Peetham: who Avadhoota Datta Peetham is and what it stands for.
// Every fact below comes from dattapeetham.org — page/view/about-us,
// ashrams/avadhoota-datta-peetham-mysore-main, page/view/ashram-shrines,
// page/view/ashram-life, page/view/sdhs-volunteers, page/view/sri-swamiji,
// page/view/kaalaagni-shamana-dattatreya, page/view/sanatana-dharma-parirakshana,
// page/view/datta-peetha-guru-parampara, page/view/nada-mantapa,
// page/view/shuka-vana, page/view/bonsai-garden, page/view/guidelines-for-visitors,
// page/view/sgs-veda-pathashala — or from src/data.mjs and src/site.mjs.

import { pageHero, sectionHead, frame, processSteps, scrollLit, ctaBand, infoList, btn, icon, img, eyebrow, ornament, thread } from '../components.mjs';
import { links, site, PAGE_IMG, KSHETRA_IMG } from '../site.mjs';
import { photos, timings } from '../data.mjs';

// Official photographs from the Peetham's own pages (S3 bucket).
const pic = {
  campusAerial: `${PAGE_IMG}527/527_3e9d83aa1fdb79cf.png`,
  entrance: `${PAGE_IMG}522/522_0d2ff86d5c11536d.png`,
  kaalaagni: `${KSHETRA_IMG}01-kalagni-shamana-dattatreya-mysore-karnataka-india.jpg`,
  nadaStage: `${PAGE_IMG}506/506_9de9699b3a272279.jpg`,
  annadana: `${PAGE_IMG}516/516_2d522eb6783cea2d.jpg`,
  annadanaDevotees: `${PAGE_IMG}526/526_18a79af1bd690c69.JPG`,
  aadiGuruChennai: `${KSHETRA_IMG}08-aadi-guru-dattatreya-chennai-tamil-nadu-india.jpg`,
  vedaSabha: `${PAGE_IMG}514/514_6a747f84068c1524.jpg`,
  kriyaYoga: `${PAGE_IMG}515/515_47c13ada69bd6850.jpg`,
  sdhsParade: `${PAGE_IMG}512/512_2ba4f2446543d71a.jpg`,
  prakrutiPuja: `${PAGE_IMG}518/518_3afb42ae5333fe82.jpg`,
};

// The Ashram's own milestones (Avatara Timeline, temple and attraction pages).
const chronicle = [
  { year: '1966', title: 'A straw hut in a field', text: 'Sri Swamiji moves to the present site on Ooty Road — then only a straw hut in a field, on barren land. The Ashram is established and Sri Sachchidanandeshwara is installed.' },
  { year: '1978', title: 'The Datta Temple', text: 'On 9 June 1978, during a week-long ceremony, Lord Datta is installed as Sri Kaalaagni Shamana Dattatreya. After the Datta Temple was built, the Ashrama began to be called Avadhoota Datta Peetham. The SGS Hospital opens for free medical services.', img: pic.kaalaagni, alt: 'Sri Swamiji before Kaalaagni Shamana Dattatreya, the main deity of the Peetham', pos: '50% 30%' },
  { year: '1984', title: 'Prayer Hall and Pathashala', text: 'The Universal Prayer Hall is unveiled; in 1985 the SGS Veda Pathashala is founded to teach the Vedas in the traditional Gurukula system.' },
  { year: '1998', title: 'Nada Mantapa', text: 'Sri Swamiji inaugurates Nada Mantapa, the Hall of Musical Tones, on 31 May 1998. Sri Datta Venkateshwara Kshetram follows in 1999 and the Pillar of Dharma in 2000.', img: pic.nadaStage, alt: 'The stage of Nada Mantapa lit for a concert', pos: '50% 60%' },
  { year: '2002', title: 'The Datta idol re-consecrated', text: 'On Rama Navami, 21 April 2002, the idol of Lord Datta is relocated to the centre of the Prayer Hall and re-consecrated.' },
  { year: '2005', title: 'Gardens and a museum', text: 'The Kishkindha Moolika Bonsai Garden opens in 2005, followed in 2006 by the Vishwam Museum and Saptarshi Sarovara.' },
  { year: '2012', title: 'Shuka Vana and Karya Siddhi Hanuman', text: 'In Sri Swamiji’s 70th year, Shuka Vana, the rehabilitation centre for birds, is founded and the 70-foot Karya Siddhi Hanuman statue is consecrated.', img: photos.hanumanStatue, alt: 'Karya Siddhi Hanuman idol adorned with flowers', pos: '50% 22%' },
  { year: '2016', title: 'Ashta Bhairava', text: 'On 14 December 2016 eight Bhairava idols are consecrated as per Shaiva Agama rites, where a tunnel once led towards Chamundi Hill when the Ashrama started in 1966.' },
  { year: '2023', title: 'Rajarajeshwari and Hari Sannidhi', text: 'On 28 December 2023 Sri Swamiji consecrates the temple of Mother Goddess Rajarajeshwari and unveils Hari Sannidhi, home to 2,108 rare Salagramas.', img: photos.rajarajeshwariSannidhi, alt: 'Sri Swamiji at the Rajarajeshwari Sannidhi', pos: '60% 40%' },
  { year: 'Today', title: 'An international institution', text: 'More than 80 branches across India — including 16 Ashrams for the 16 incarnations of Lord Dattatreya — and 15 centres abroad, in the UK, USA, Malaysia, Europe, Trinidad, Canada and Australia.' },
];

// The mission, in the Peetham's own words.
const principles = [
  { icon: 'lotus', title: 'Spiritual, moral and social upliftment', text: '“Avadhoota Datta Peetham is a world renowned institution for the social, moral and spiritual welfare of mankind.” Sri Swamiji reminds people of their social responsibility towards their fellow beings.', href: 'sri-swamiji.html', cta: 'Sri Swamiji’s mission' },
  { icon: 'book', title: 'Preserving the Vedic tradition', text: '“The Vedas are our priceless inheritance from the remote past and they need to be preserved and propagated.” The Pathashala teaches all four Vedas, and Veda examinations are held every year on a national scale.', href: 'teachings.html', cta: 'Teachings' },
  { icon: 'heart-hand', title: 'Service to mankind is service to God', text: 'Sri Swamiji reminds us time and again that service to mankind is service to God — through hospitals and medical camps, schools, and Annadanam, by which all Ashram visitors are fed free.', href: 'seva.html', cta: 'Seva' },
  { icon: 'namaste', title: 'Open to all', text: 'Sri Swamiji welcomes everyone, including agnostics, atheists and people of any faith. The motto is to serve humanity without the barricades of caste, creed, race or religion.', href: 'visit.html', cta: 'Visit the Ashram' },
  { icon: 'veena', title: 'Music and devotion', text: 'Bhajan singing is one of the main methods Sri Swamiji propagates, so Divya Naama Sankeertana is a daily part of Ashram life — and music, practised with deep concentration, becomes a therapy.', href: 'music.html', cta: 'Nada Chikitsa' },
  { icon: 'tree', title: 'Reverence for nature', text: '“Bonsai trees and birds are my two eyes. Naada is my voice. My breath is the Veda.” — Sri Swamiji. Sri Swamiji promotes with zeal the preservation of flora and fauna: the Ashram houses Shuka Vana, the Bonsai garden, a Gau Shala and gardens of trees linked to the Rashis and Nakshatras.', href: 'attractions.html', cta: 'Attractions' },
];

// Campus highlights: what stands on the 40 acres, grouped by where to read more.
const highlights = [
  { cls: 'is-temples', icon: 'temple', tag: 'Darshan & Puja', title: 'Temples & Darshan', href: 'darshan.html', cta: 'Shrines and timings', img: photos.sdvt, alt: 'Gopurams of the Sri Datta Venkateshwara Temple Complex', pos: '50% 40%', items: [
    ['Universal Prayer Hall', 'Kaalaagni Shamana Dattatreya, the main deity'],
    ['Sri Datta Venkateshwara Temple', 'In the model of Tirumala'],
    ['Karya Siddhi Hanuman', 'A 70-foot monolithic statue'],
    ['Rajarajeshwari & Hari Sannidhi', 'Consecrated and unveiled 28 December 2023'],
  ] },
  { cls: 'is-attractions', icon: 'sparkle', tag: 'Visit', title: 'Ashram Attractions', href: 'attractions.html', cta: 'Explore the attractions', img: pic.nadaStage, alt: 'The stage of Nada Mantapa during a concert', pos: '50% 55%', items: [
    ['Nada Mantapa', 'An auditorium dedicated to Nada'],
    ['Shuka Vana', '486 bird species in one aviary'],
    ['Kishkindha Moolika Bonsai Garden', 'More than 450 shaped trees'],
    ['Vishwam Museum', 'Gifts from around the world'],
  ] },
  { cls: 'is-seva', icon: 'heart-hand', tag: 'Service', title: 'Seva & Learning', href: 'seva.html', cta: 'Pillars of service', img: pic.annadana, alt: 'Annadana by Sri Swamiji: devotees seated in rows for a meal', pos: '50% 50%', items: [
    ['SGS Hospital', 'Ayurvedic and Allopathic care'],
    ['SGS Veda Pathashala', 'Founded 1985, all four Vedas'],
    ['Annadanam', 'Every Ashram visitor is fed free'],
    ['Gau Shala', 'Home to more than 50 cows'],
  ] },
  { cls: 'is-beyond', icon: 'globe', tag: 'Global reach', title: 'Beyond Mysuru', href: 'centers.html', cta: 'Centres & Kshetras', img: pic.aadiGuruChennai, alt: 'Aadi Guru Dattatreya, the Datta Kshetra at Chennai', pos: '50% 35%', items: [
    ['Shodasha Datta Kshetras', '16 shrines for 16 forms of Datta'],
    ['More than 80 branches', 'Across India'],
    ['15 centres abroad', 'From Trinidad to Australia'],
  ] },
];

// Guru Parampara teaser: the lineage named in the Peetham's prayer.
const lineage = [
  { name: 'Lord Dattatreya', role: 'Adi Guru', img: photos.lordDattatreya, pos: '50% 18%', href: 'guru-parampara.html#dattatreya', alt: 'Lord Dattatreya' },
  { name: 'Sripada Vallabha', role: 'First manifestation of Lord Datta', img: photos.sripadaVallabha, pos: '50% 78%', href: 'guru-parampara.html#lineage', alt: 'Sripada Vallabha Swami' },
  { name: 'Narasimha Saraswati', role: 'Second incarnation of Dattatreya', img: photos.narasimhaSaraswati, pos: '50% 30%', href: 'guru-parampara.html#lineage', alt: 'Narasimha Saraswati Swami' },
  { name: 'Sri Ganapathy Sachchidananda Swamiji', role: 'Our present Guru', img: photos.swamijiPortrait, pos: '50% 12%', href: 'guru-parampara.html#lineage', alt: 'Sri Ganapathy Sachchidananda Swamiji' },
];

// The four great festivals (page/view/ashram-life). Dates follow the Hindu
// calendar, so they are described by season, never by a fixed date.
const festivals = [
  { icon: 'moon', name: 'Maha Shivaratri', when: 'Set by the Hindu calendar', text: 'Rudra Abhishekam to Sri Sachchidanandeshwara, music until late night as devotees keep vigil, and at 3 AM Sri Swamiji’s discourse on Shiva.' },
  { icon: 'flame', name: 'Sri Swamiji’s Birthday', when: '26 May', text: 'Pratyaksha Paada Pooja by Sri Balaswamiji, wheelchairs and walkers for the physically challenged, and Annadana on a large scale.' },
  { icon: 'lotus', name: 'Navaratri', when: 'Sep or Oct · nine days', text: 'Nava Avarana Puja to Mother Raja Rajeshwari, Kumari Puja, Devi Homa and concerts in Nada Mantapa.' },
  { icon: 'diya', name: 'Datta Jayanti', when: 'December · three days', text: 'The incarnation day of Adi Guru Dattatreya — the one day of the year devotees may offer oil ablutions to the Moola virat.' },
];

// Approximate road distances from the Ashram (page/view/guidelines-for-visitors).
const nearby = [
  ['Jaganmohan Palace & Art Gallery', 6.5],
  ['Mysuru Palace', 7],
  ['St. Philomena’s Church', 7],
  ['Mysore Zoo', 8],
  ['Chamundi Hill & Chamundeshwari Temple', 12],
  ['Ranganathittu Bird Sanctuary', 16],
  ['Srirangapatna', 20],
  ['Brindavan Gardens & KRS Dam', 21],
  ['Nanjangud', 25],
];
const maxKm = 25;

// A stat whose number counts up (count) or stays put (years).
const stat = (n, unit, label, { count = true } = {}) => `<div class="ab-stat">
  <dt><span${count ? ` data-count="${n}"` : ''}>${count ? Number(n).toLocaleString('en-IN') : n}</span>${unit ? `<small>${unit}</small>` : ''}</dt>
  <dd>${label}</dd>
</div>`;

const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

// Sat · Chit · Ananda: three interlocking circles that draw themselves.
const T = { c: [160, 160], r: 78, d: 53 };
const at = (deg) => [T.c[0] + T.d * Math.cos((deg * Math.PI) / 180), T.c[1] + T.d * Math.sin((deg * Math.PI) / 180)].map((v) => +v.toFixed(1));
const rings = [at(-90), at(150), at(30)];
const triad = `<figure class="ab-triad" data-reveal="fade">
  <svg viewBox="0 0 320 320" role="img" aria-labelledby="ab-triad-t">
    <title id="ab-triad-t">Sat, Chit and Ananda: the Triple Principle manifest in Lord Dattatreya</title>
    <g class="ab-triad-fill">${rings.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${T.r}"/>`).join('')}</g>
    <g class="ab-triad-rings" data-draw>
      ${rings.map(([x, y]) => `<path d="${circle(x, y, T.r)}"/>`).join('')}
      <path class="ab-triad-outer" d="${circle(T.c[0], T.c[1], 142)}"/>
    </g>
    <circle class="ab-triad-halo" cx="160" cy="160" r="13"/>
    <circle class="ab-triad-seed" cx="160" cy="160" r="4.5"/>
    <text class="ab-triad-word" x="160" y="74">Sat</text>
    <text class="ab-triad-sub" x="160" y="93">Existence</text>
    <text class="ab-triad-word" x="86" y="212">Chit</text>
    <text class="ab-triad-sub" x="86" y="231">Knowledge</text>
    <text class="ab-triad-word" x="234" y="212">Ananda</text>
    <text class="ab-triad-sub" x="234" y="231">Bliss</text>
  </svg>
  <figcaption>Sat · Chit · Ananda — the Triple Principle of which Dattatreya is the manifestation</figcaption>
</figure>`;

export default {
  slug: 'about',
  file: 'about.html',
  title: 'About the Peetham',
  crumb: 'About',
  nav: 'About',
  description: 'From a straw hut in 1966 to an international institution: the mission, 40-acre campus at the foot of Chamundi Hill and Ashram life of Avadhoota Datta Peetham.',
  image: pic.campusAerial,
  preload: pic.campusAerial,
  css: true,
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About the Peetham',
      url: `${site.origin}/about.html`,
      about: {
        '@type': 'Organization',
        name: site.name,
        alternateName: site.ashram,
        url: site.origin + '/',
        foundingDate: '1966',
        founder: { '@type': 'Person', name: 'Sri Ganapathy Sachchidananda Swamiji' },
        foundingLocation: { '@type': 'Place', name: 'Mysuru, Karnataka, India' },
        description: 'An international spiritual, cultural and social welfare organization dedicated to the social, moral and spiritual upliftment of humanity.',
      },
    },
  ],
  render: () => `
${pageHero({
  eyebrow: 'Sri Ganapathy Sachchidananda Ashram · Mysuru',
  title: 'About the <span class="em-light">Peetham</span>',
  crumb: 'About',
  lead: 'An internationally acclaimed institution dedicated to the social, moral and spiritual upliftment of humanity — on a 40-acre site at the foot of Chamundi Hill.',
  image: pic.campusAerial,
  pos: 'center 42%',
  actions: `${btn('Read our story', '#story', 'gold', 'arrow', ' data-magnetic')}${btn('Plan your visit', 'visit.html', 'ghost', 'compass')}`,
  tiles: [
    { icon: 'book', title: 'Our Story', note: 'From a straw hut, 1966', href: '#story' },
    { icon: 'lotus', title: 'What We Stand For', note: 'Mission in our words', href: '#principles' },
    { icon: 'map', title: 'The Campus', note: '40 acres in Mysuru', href: '#campus' },
    { icon: 'diya', title: 'Ashram Life', note: 'Worship, bhajans, festivals', href: '#ashram-life' },
  ],
})}

<section id="story" class="section ab-story">
  <div class="wrap">
    <div class="ab-story-grid">
      <div class="ab-story-media">
        <div class="ab-story-frame" data-stagger>${frame(photos.prayerHall, 'Devotees gathered in the Universal Prayer Hall before Sri Swamiji', { caption: '<b>Universal Prayer Hall</b>Sri Swamiji calls it the crown of the Ashram', ratio: '4/5', pos: '50% 50%' })}</div>
        <div class="ab-postcard-wrap" data-stagger><figure class="ab-postcard">
          ${img(pic.entrance, 'The arched entrance gate of Avadhoota Datta Peetham, Mysuru, framed by palms')}
          <figcaption>Entrance of Avadhoota Datta Peetham, Mysuru</figcaption>
        </figure></div>
      </div>
      <div class="ab-story-body prose" data-reveal="up">
        ${eyebrow('Our story · since 1966')}
        <h2 data-split>From a <span class="em-light">straw hut</span> to an international institution</h2>
        <p class="dropcap">In 1966, Sri Swamiji moved to the present site of the Mysuru Ashram on Ooty Road, which in the early days was only a straw hut in a field. The land was barren and infested with cobras and scorpions; Sri Swamiji slept under the trees on the bare ground with these creatures crawling all around Him. He was never harmed.</p>
        <p>It was there, at Mysuru, that Sri Swamiji came to be known as Sri Ganapathy Sachchidananda Swamiji. People came to His Holiness for help with their worldly affairs, to be healed of physical afflictions, or for guidance in their spiritual practice.</p>
        <p>Where the Datta Temple stands today, a large stage once occupied the place. It was called Saraswati Peetha, and sometimes Narayana Peetha. <strong>After the Datta Temple was built, the Ashrama began to be called Avadhoota Datta Peetham.</strong></p>
        <p>Popularly called Sri Ganapathy Sachchidananda Ashram, the Peetham is the headquarters of Sri Swamiji’s mission. It has grown over the years to an impressive stature and encompasses many aspects of the spiritual life: here one can study Yoga, the Vedas and Sanskrit, bhajans, music and much more.</p>
      </div>
    </div>

    <div class="ab-chron">
      <div class="ab-chron-aside" data-reveal="up">
        ${eyebrow('The Ashram through the years')}
        <h3 class="ab-chron-title">1966 <span aria-hidden="true">—</span> <em>today</em></h3>
        <p>Milestones from the Peetham’s own records, from the first installation to the newest shrines.</p>
        <svg class="ab-chron-mandala" viewBox="0 0 104 104" aria-hidden="true" data-spin="140"><use href="#i-mandala"/></svg>
        <a class="link-arrow" href="sri-swamiji.html#timeline">Sri Swamiji’s Avatara Timeline ${icon('arrow', 16)}</a>
      </div>
      <div class="ab-chron-track" data-progress="0.75,0.4">
        <span class="ab-chron-line" aria-hidden="true"><i></i></span>
        <ol class="ab-chron-list">
        ${chronicle.map((c) => `<li class="ab-chron-item${c.img ? ' has-img' : ''}" data-reveal="up">
          <span class="ab-chron-dot" aria-hidden="true"></span>
          <span class="ab-chron-year">${c.year}</span>
          <div class="ab-chron-text"><h4>${c.title}</h4><p>${c.text}</p></div>
          ${c.img ? `<span class="ab-chron-img">${img(c.img, c.alt, { pos: c.pos })}</span>` : ''}
        </li>`).join('')}
        </ol>
      </div>
    </div>
  </div>
</section>

<section class="section section-dark ab-statement grain" aria-label="The principles of the Peetham">
  <svg class="ab-statement-mandala" viewBox="0 0 104 104" aria-hidden="true" data-spin="60"><use href="#i-mandala"/></svg>
  <div class="wrap">
    <span class="om ab-om" aria-hidden="true">ॐ</span>
    ${scrollLit('Humanity is His *Religion,* Music is His *Language* and Devotion is His *methodology.*')}
    <p class="ab-statement-note" data-reveal="up">As Sri Swamiji has made clear many times, these are the principles on which Avadhoota Datta Peetham of Mysuru and its social activity wing, Sri Datta Humane Services, stand.</p>
  </div>
</section>

<section id="principles" class="section section-paper ab-principles">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'Our mission, in our own words',
      title: 'What the Peetham <span class="em-light">stands for</span>',
      lead: 'Avadhoota Datta Peetham is an international spiritual, cultural and social welfare organization established by His Holiness Sri Ganapathy Sachchidananda Swamiji in 1966. Its many projects revolve upon the recognition of the intrinsic worth of every single human life.',
    })}

    <div class="ab-heart">
      ${triad}
      <div class="ab-heart-body" data-reveal="up">
        ${eyebrow('At the heart of the Peetham')}
        <h3>Lord Dattatreya, the eternal teacher</h3>
        <p>At the heart of the Peetham is Lord Dattatreya, the presiding deity who embodies the Sadguru, or Master Teacher, principle. Dattatreya the eternal teacher is the manifestation of the Triple Principle of <b>Sat</b> (Existence), <b>Chit</b> (Knowledge) and <b>Ananda</b> (Bliss).</p>
        <p>He guides seekers on their journey from the shadows of the material world to the illumination of the inner soul. As Sri Swamiji propagates the teachings of Dattatreya Avadhoota, a Datta Temple has been built in the Ashram — the first of the several Datta temples established in India and abroad.</p>
        <ul class="ab-maxims">
          <li>“Do all such deeds to others, which you expect from others.”</li>
          <li>“Try to identify divinity in every being.”</li>
        </ul>
        <p class="ab-maxims-src">Lord Dattatreya’s message of Universal Brotherhood</p>
      </div>
    </div>

    <div class="ab-principle-grid" data-stagger>
      ${principles.map((p) => `<article class="ab-principle">
        <span class="ab-principle-icon">${icon(p.icon, 26)}</span>
        <h3>${p.title}</h3>
        <p>${p.text}</p>
        <a class="link-arrow" href="${p.href}">${p.cta} ${icon('arrow', 15)}</a>
      </article>`).join('')}
    </div>
  </div>
</section>

<section id="campus" class="section section-sand ab-campus">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'Mysuru Ashram · headquarters',
      title: 'The campus <span class="em-light">at a glance</span>',
      lead: 'The Ashram is situated on a sprawling 40-acre site at the foot of Chamundi Hill, in the Royal City of Mysuru. Its temples, auditorium, gardens, schools and hospital sit side by side.',
    })}

    <dl class="ab-stats" data-stagger>
      ${stat(40, 'acres', 'At the foot of Chamundi Hill')}
      ${stat('1966', '', 'The year the Ashram was established', { count: false })}
      ${stat(6, '', 'Shrines in the Mysuru Ashram')}
      ${stat(16, '', 'Datta Kshetras — the first is here')}
      ${stat(70, 'ft', 'Monolithic Karya Siddhi Hanuman')}
      ${stat(366, '', 'Birth Date Pillars along the pathway')}
      ${stat(486, '', 'Bird species in Shuka Vana')}
      ${stat(8000, '', 'Seats in Nada Mantapa')}
    </dl>

    <div class="ab-bento" data-stagger>
      ${highlights.map((h) => `<article class="ab-panel ${h.cls}">
        <div class="ab-panel-media">${img(h.img, h.alt, { pos: h.pos })}</div>
        <div class="ab-panel-body">
          <span class="ab-panel-top"><span class="ab-panel-icon">${icon(h.icon, 22)}</span><span class="tag tag-light">${h.tag}</span></span>
          <h3><a class="ab-panel-link" href="${h.href}">${h.title}</a></h3>
          <ul class="ab-panel-list">${h.items.map(([t, n]) => `<li><b>${t}</b><span>${n}</span></li>`).join('')}</ul>
          <span class="ab-panel-cta" aria-hidden="true">${h.cta} ${icon('arrow', 15)}</span>
        </div>
      </article>`).join('')}
    </div>
    <p class="ab-campus-more" data-reveal="up">${icon('map', 18)}<span>Walk the grounds on the <a href="visit.html#map">interactive Ashram map</a>.</span></p>
  </div>
</section>

<section id="lineage-link" class="section section-dark ab-lineage">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'The lineage of the masters',
      title: 'Guru <span class="em-light">Parampara</span>',
      lead: 'Guru Parampara is the continuous succession, or lineage, of Gurus. The Peetham’s Guru Parampara prayer begins with salutations to Lord Ganapathy and Mother Saraswathy, then to the lineage of Gurus from Sri Pada Vallabha and Narasimha Saraswathi, the incarnations of Lord Dattatreya, up to our present Guru, Sri Swamiji.',
      light: true,
    })}
    <div class="ab-lineage-chain">
    ${thread('ab-lineage-thread')}
    <ol class="ab-lineage-row" data-stagger>
      ${lineage.map((g, i) => `<li class="ab-guru">
        <a href="${g.href}">
          <span class="ab-guru-ring"><span class="ab-guru-img">${img(g.img, g.alt, { pos: g.pos })}</span></span>
          <span class="ab-guru-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <b>${g.name}</b>
          <small>${g.role}</small>
        </a>
      </li>`).join('')}
    </ol>
    </div>
    <div class="btn-row ab-center" data-stagger>${btn('Follow the Guru Parampara', 'guru-parampara.html', 'gold', 'arrow', ' data-magnetic')}</div>
  </div>
</section>

<section id="ashram-life" class="section ab-life">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'Ashram life',
      title: 'A day at the <span class="em-light">Peetham</span>',
      lead: 'Upon arrival, visitors are enveloped in a serene and pure atmosphere, resonating with the soothing chants of Vedic hymns. Visitors are encouraged to join a guided tour through the Ashram to fully immerse themselves in its serene ambiance.',
    })}

    ${processSteps([
      ['Temple opens · 6 AM', 'Daily Abhishekam, Archana and Ashtottara Seva are performed to Lord Dattatreya.'],
      ['Sri Chakra Puja · about 8 AM', 'When in town, Sri Swamiji or Sri Balaswamiji performs it. Teertha is offered, and devotees practise Datta Kriya Yoga.'],
      ['Rituals & lectures', 'Devotees can join and sponsor rituals such as Homa and Tailabhishekam. Sri Balaswamiji gives daily lectures on the Yoga Vasistham in Kannada and Telugu.'],
      ['Evening bhajans', 'Divya Naama Sankeertana for at least one and a half hours, and Kakada Arati with sixteen lamps before Lord Datta.'],
    ])}

    <p class="notice ab-sunday" data-reveal="up">${icon('sun', 20)}<span><b>On Sundays</b> large numbers of devotees come from great distances to sing with Sri Swamiji. When He is in town, Sri Swamiji gives darshana on Sunday mornings, and Tailabhisheka (oil anointing) is performed to Kaalaagni Shamana Datta every Sunday.</span></p>

    <div class="ab-life-photos" data-stagger>
      <figure>${img(pic.vedaSabha, 'Vedic scholars and students seated in rows at the Annual Veda Sabha', { pos: '50% 45%' })}<figcaption>Annual Veda Sabha, Mysuru Ashram</figcaption></figure>
      <figure>${img(pic.kriyaYoga, 'Sri Swamiji seated on a stage, arms outstretched, teaching Datta Kriya Yoga', { pos: '50% 40%' })}<figcaption>Sri Swamiji teaches Datta Kriya Yoga</figcaption></figure>
      <figure>${img(pic.annadanaDevotees, 'Devotees seated at long tables for Annadana while Sri Swamiji walks past', { pos: '50% 50%' })}<figcaption>Annadana to the devotees</figcaption></figure>
    </div>

    <div class="ab-fest-head" data-reveal="up">
      ${ornament()}
      <h3>The festival year</h3>
      <p>Maha Shivaratri, Sri Swamiji’s Birthday, Navaratri and Datta Jayanti are the most auspicious events of the year — each a blend of Vedic rituals, classical music, dance and traditional drama that becomes one holistic act of worship.</p>
    </div>
    <div class="ab-fest" data-stagger>
      ${festivals.map((f) => `<article class="ab-fest-card">
        <span class="ab-fest-icon">${icon(f.icon, 24)}</span>
        <span class="ab-fest-when">${f.when}</span>
        <h4>${f.name}</h4>
        <p>${f.text}</p>
      </article>`).join('')}
    </div>
    <div class="btn-row ab-center" data-stagger>
      ${btn('Events & festivals', 'events.html', 'line')}
      ${btn('Official calendar', links.calendar, 'line', 'calendar')}
    </div>

    <div class="ab-sdhs">
      <div class="ab-sdhs-media" data-reveal="clip">${img(pic.sdhsParade, 'Sri Swamiji walks past rows of SDHS volunteers at a parade', { pos: '50% 40%' })}</div>
      <div class="ab-sdhs-body" data-reveal="up">
        ${eyebrow('Sri Datta Humane Services')}
        <h3>The volunteers of SDHS</h3>
        <p>SDHS is a volunteer corps dedicated to the service of Sri Swamiji, His Ashrams and related social programmes in India and abroad. Its volunteers serve pilgrims during major socio-religious events and the needy during natural calamities.</p>
        <ul class="ab-pillars" aria-label="The four pillars of SDHS">
          <li>Discipline</li><li>Dedication</li><li>Devotion</li><li>Discretion</li>
        </ul>
        <blockquote class="ab-quote">
          <p>“At the end of our life, what good we did to the world is what matters, not how much we amassed for ourselves! Lasting happiness lies in serving others in their times of need!”</p>
          <cite>Sri Swamiji</cite>
        </blockquote>
        ${btn('Volunteer with SDHS', 'seva.html#volunteer', 'ghost')}
      </div>
    </div>
  </div>
</section>

<section id="mysuru" class="section section-sand ab-mysuru">
  <div class="wrap">
    <div class="ab-mysuru-grid">
      <div class="ab-mysuru-body">
        ${eyebrow('Where we are')}
        <h2 data-split>In the Royal City of <span class="em-light">Mysuru</span></h2>
        <p class="lead" data-reveal="up">The Ashram stands at the footsteps of Chamundi Hill in the historical city of Mysuru, also hailed as the cultural capital of Karnataka.</p>
        <p data-reveal="up">Persons of all faiths are welcome. Facilities are limited, so visitors are requested to stay in hotels in the city and come to the Ashram each day for its programmes.</p>
        ${infoList([
          ['pin', 'Address', `<span>${site.address.lines.join(', ')}</span>`],
          ['clock', 'Temple darshan', `<span>${timings[0].rows.map(([a, b]) => `${a} ${b}`).join(' · ')}</span>`],
          ['bus', 'By city bus', '<span>Bus 119 runs from the Mysuru City Bus Stand directly to the Ashram.</span>'],
          ['plane', 'From abroad', '<span>Fly to Bengaluru, then take a taxi to Mysuru. Road travel from Bengaluru after 9 PM is not advised.</span>'],
        ])}
        <div class="btn-row" data-stagger>
          ${btn('Plan your visit', 'visit.html', 'gold')}
          ${btn('Get directions', links.directions, 'line', 'pin')}
        </div>
      </div>
      <div class="ab-dist panel">
        <h3>Mysuru around the Ashram</h3>
        <p class="ab-dist-note">Approximate distances from the Ashram, as listed in the Peetham’s visitor guidelines.</p>
        <ol class="ab-dist-list" data-stagger>
          ${nearby.map(([name, km]) => `<li style="--w:${((km / maxKm) * 100).toFixed(1)}%">
            <span class="ab-dist-name">${name}</span>
            <span class="ab-dist-km">${km} km</span>
            <span class="ab-dist-bar" aria-hidden="true"><i></i></span>
          </li>`).join('')}
        </ol>
        <a class="link-arrow" href="attractions.html">Ashram attractions ${icon('arrow', 15)}</a>
      </div>
    </div>
  </div>
</section>

${ctaBand({
  title: 'Come, experience the Peetham',
  text: 'A visit to the Ashram and participation in its diverse programmes promise to instil new hope, enhance confidence and bring a refreshing sense of peace.',
  actions: `${btn('Plan your visit', 'visit.html', 'gold', 'arrow', ' data-magnetic')}${btn('Book a Puja', links.poojas, 'ghost', 'external')}${btn('Support the mission', links.donations, 'ghost', 'heart')}`,
  image: pic.prakrutiPuja,
})}
`,
};
