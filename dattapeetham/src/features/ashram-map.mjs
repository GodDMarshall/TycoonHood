// Shared feature: the Interactive Ashram Map.
//
//   ashramMap({ compact = false, id = 'map' })  → HTML string
//   ashramPlaces                                → the places shown on it
//
// An illustrative, hand-drawn plan of the Mysuru Ashram (not a survey): the
// art is static SVG, the pins are real <button>s, and one tiny store in
// assets/js/features/ashram-map.js keeps the pins, the list of places, the
// layer switches and the detail card in sync. Pages opt in with
// features: ['ashram-map'].
//
// Every description below is condensed from dattapeetham.org (ashram-shrines,
// shuka-vana, bonsai-garden, vishwam-museum, nada-mantapa, sgs-hospital,
// sgs-veda-pathashala, fetched October 2026), src/data.mjs or src/site.mjs.
// Positions on the plan are approximate; the map says so.

import { icon, esc } from '../components.mjs';
import { photos } from '../data.mjs';
import { OFFICIAL, PAGE_IMG } from '../site.mjs';

const SHRINES_PAGE = `${OFFICIAL}/page/view/ashram-shrines`;
const TEMPLE_HOURS = { rows: [['Morning', '6:00 AM – 12:00 PM'], ['Evening', '4:00 PM – 8:00 PM']], badge: 'temple' };

export const categories = {
  shrine: { label: 'Shrines', one: 'Shrine', cta: 'Temples & darshan' },
  attraction: { label: 'Attractions', one: 'Attraction', cta: 'Ashram attractions' },
  seva: { label: 'Seva & service', one: 'Seva', cta: 'Our seva' },
};

// x, y: the pin's tip on the 1000 × 720 plan. `since` comes from the page or
// the Avatara timeline in data.mjs.
export const ashramPlaces = [
  {
    id: 'hanumadwaram', cat: 'shrine', x: 345, y: 660, icon: 'temple',
    name: 'Hanumadwaram', note: 'The welcome arch',
    short: 'The grand welcome arch with Hanuman idols.',
    text: 'Visitors enter through the grand Hanumadwaram, a magnificently sculpted welcome arch with Hanuman idols. Just beyond it, an intricate carving of the infant form of Lord Dattatreya greets them.',
    href: 'darshan.html#mandir', source: SHRINES_PAGE,
  },
  {
    id: 'birth-date-pillars', cat: 'shrine', x: 345, y: 560, icon: 'calendar',
    name: 'Birth Date Pillars', note: '366 pillars along the pathway',
    short: '366 pillars, one for each birth date.',
    text: '366 pillars stand on either side of a pathway in the Ashrama. Called the “Date of Birth Pillars”, each carries the deity and demigod for that particular day.',
    href: 'darshan.html#birth-pillars', source: SHRINES_PAGE,
  },
  {
    id: 'prayer-hall', cat: 'shrine', x: 345, y: 405,
    name: 'Universal Prayer Hall', note: 'Kaalaagni Shamana Dattatreya', since: 'Unveiled 1984',
    img: photos.prayerHall, alt: 'Devotees gathered for prayers in the Universal Prayer Hall',
    short: 'Daily congregational prayers before the main deity.',
    text: 'Daily congregational prayers are held here in the divine presence of Sri Swamiji. The hall houses the main deity of the Peetham, Kaalaagni Shamana Dattatreya, with the Sri Chakram Meru beside Him, and the Panchayatana Devasthana and the Sachchidanandeshwara Shivalaya on either side.',
    timing: TEMPLE_HOURS, href: 'darshan.html#prayer-hall', source: SHRINES_PAGE,
  },
  {
    id: 'rajarajeshwari', cat: 'shrine', x: 172, y: 336,
    name: 'Rajarajeshwari Temple', note: 'Mother Goddess Rajarajeshwari', since: 'Consecrated 28 Dec 2023',
    img: photos.rajarajeshwariSannidhi, alt: 'Worship at the Rajarajeshwari Sannidhi',
    short: 'The Nava Durgas and the deities of the 18 Shakti Peethams.',
    text: 'Consecrated by Sri Swamiji on 28 December 2023, beside the Universal Prayer Hall. Around the Goddess are the Nava Durgas, miniature forms of the deities of the 18 Shakti Peethams, and a big Sri Chakra where devotees offer Kumkum Archana.',
    timing: TEMPLE_HOURS, href: 'darshan.html#rajarajeshwari', source: SHRINES_PAGE,
  },
  {
    id: 'hari-sannidhi', cat: 'shrine', x: 262, y: 308,
    name: 'Hari Sannidhi', note: '2,108 rare Salagramas',
    img: photos.hariSannidhi, alt: 'Salagramas in the form of Ananthanaga Shayana at Hari Sannidhi',
    short: '2,108 rare Salagramas as Ananthanaga Shayana.',
    text: 'To the immediate right of the Rajarajeshwari temple, it houses 2,108 rare Salagramas in the form of Ananthanaga Shayana, with the Trivikrama and Manoratha Kurma Salagramas weighing 300 kg. A Sudarshana Yantra conceived by Sri Swamiji crowns the Sannidhi.',
    timing: TEMPLE_HOURS, href: 'darshan.html#hari-sannidhi', source: SHRINES_PAGE,
  },
  {
    id: 'venkateshwara', cat: 'shrine', x: 700, y: 495,
    name: 'Sri Datta Venkateshwara Temple', note: 'Temple complex', since: 'Installed 1999',
    img: photos.sdvt, alt: 'The towers of the Sri Datta Venkateshwara Temple complex',
    short: 'Lord Venkateshwara with Padmavati, Dhanvantari and more.',
    text: 'Devotees offer Pooja here to Sri Datta Venkateshwara Swamy, Goddess Padmavati, Dhanvantari, Sarva Doshahara Shiva, Sri Marakata Subrahmanya Swamy, Lord Karyasiddhi Hanuman and the Navagraha Devatas. Thousands come for Vaikuntha Ekadashi every year.',
    timing: TEMPLE_HOURS, href: 'darshan.html#venkateshwara', source: SHRINES_PAGE,
  },
  {
    id: 'hanuman', cat: 'shrine', x: 830, y: 398,
    name: 'Karya Siddhi Hanuman', note: '70-ft monolithic statue', since: 'Consecrated 2012',
    img: photos.hanuman, alt: 'Worship at the Karya Siddhi Hanuman temple',
    short: 'The 70-ft monolith, tallest stone Hanuman in India.',
    text: 'Consecrated by Sri Swamiji in 2012, the 70-ft monolithic statue is the tallest stone statue of Hanuman in India. On weekends, 3D projection mapping is synchronised with the Hanuman Chalisa.',
    timing: { rows: [['Abhisheka', '7:00 AM daily'], ['Aarti', '6:00 PM daily']] },
    href: 'darshan.html#hanuman', source: SHRINES_PAGE,
  },
  {
    id: 'kalabhairava', cat: 'shrine', x: 895, y: 606, icon: 'flame',
    name: 'Kalabhairava Temple', note: 'Ashta Bhairava · underground', since: 'Consecrated 14 Dec 2016',
    short: 'Eight Bhairavas in a subterranean shrine.',
    text: 'Eight Bhairava idols, consecrated as per Shaiva Agama rites in the south-east corner of the Ashrama. The subterranean temple has a main shrine for the Pradhana Bhairava, with the other seven in niches around it.',
    href: 'darshan.html#kalabhairava', source: SHRINES_PAGE,
  },
  {
    id: 'nada-mantapa', cat: 'attraction', x: 552, y: 300,
    name: 'Nada Mantapa', note: 'The Hall of Musical Tones', since: 'Inaugurated 31 May 1998',
    img: photos.nadaMantapaInterior, alt: 'Inside the Nada Mantapa auditorium',
    short: 'A divine music auditorium, inaugurated by Sri Swamiji in 1998.',
    text: 'A purpose-built music auditorium shaped like a palm-leaf fan, its entrance facing east toward the Chamundi hills. It holds 22 sculpted Tamburas for the 22 Shrutis, 72 pillars for the 72 Melakarta ragas and the world’s first Sapta Swara Devata Mantapam.',
    href: 'attractions.html#nada-mantapa', source: `${OFFICIAL}/page/view/nada-mantapa`,
  },
  {
    id: 'shuka-vana', cat: 'attraction', x: 852, y: 168,
    name: 'Shuka Vana', note: 'Rehabilitation centre for birds', since: 'Founded 2012',
    img: photos.shukaVanaAviary, alt: 'The Shuka Vana aviary from above',
    short: 'A free-flight aviary of 2,000+ birds from 486 species.',
    text: 'Founded by Sri Swamiji in 2012, with its own bird hospital. The free-flight walk-in aviary is home to more than 2,000 birds of 486 species, and holds a Guinness World Record for the most parrot species in a single aviary.',
    timing: { rows: [['Morning', '9:00 AM – 12:00 PM'], ['Evening', '3:30 PM – 6:00 PM']], badge: 'shukaVana', note: 'Closed on Wednesdays. The official Shuka Vana page says it is temporarily closed to the public for maintenance.' },
    href: 'attractions.html#shuka-vana', source: `${OFFICIAL}/page/view/shuka-vana`,
  },
  {
    id: 'bonsai-garden', cat: 'attraction', x: 575, y: 104,
    name: 'Kishkindha Moolika Bonsai Garden', note: '450+ miniature trees', since: 'Inaugurated 2005',
    img: photos.bonsai, alt: 'A pavilion and pools in the Kishkindha Moolika Bonsai Garden',
    short: 'More than 450 miniature trees in an oriental garden.',
    text: 'More than 450 carefully shaped miniature trees in an oriental garden setting, nurtured by Sri Swamiji Himself. Moolikeswara, presiding deity of herbal healing, stands here among the Navagraha, Sapta Rishi, Nakshatra and Rashi gardens.',
    timing: { rows: [['Morning', '10:00 AM – 12:30 PM'], ['Evening', '3:30 PM – 5:30 PM']], note: 'Closed on Wednesdays.' },
    href: 'attractions.html#bonsai', source: `${OFFICIAL}/page/view/bonsai-garden`,
  },
  {
    id: 'vishwam-museum', cat: 'attraction', x: 722, y: 236,
    name: 'Vishwam Museum', note: 'Treasures from around the world', since: 'Established 2006',
    img: `${PAGE_IMG}505/505_2b98516bd374f9c6.jpg`, alt: 'The entrance to the Vishwam Museum',
    short: 'Rare gifts to Sri Swamiji from devotees worldwide.',
    text: '“Vishwam” means “Universe”. The museum displays rare gifts Sri Swamiji received from devotees worldwide, from crystals and minerals to antiques, with His stamp collection (specimens from as far back as 1835) and musical instruments from over forty countries.',
    href: 'attractions.html#vishwam', source: `${OFFICIAL}/page/view/vishwam-museum`,
  },
  {
    id: 'saptarshi-sarovara', cat: 'attraction', x: 376, y: 212, icon: 'lotus',
    name: 'Saptarshi Sarovara', note: 'The Ashram’s sarovara', since: 'Inaugurated 2006',
    short: 'Inaugurated in 2006, with the Vishwam Museum.',
    text: 'A sarovara (pond) in the Ashram grounds, inaugurated in 2006, the same year as the Vishwam Museum.',
    href: 'sri-swamiji.html#timeline', cta: 'See the timeline',
  },
  {
    id: 'sgs-hospital', cat: 'seva', x: 150, y: 586,
    name: 'SGS Hospital', note: 'Holistic Health Centre', since: 'Inaugurated 1978',
    img: photos.hospital, alt: 'The SGS Hospital building',
    short: 'Free consultation and medicines at the polyclinic.',
    text: 'Outpatient services in Ayurveda, Allopathy, Homeopathy, Naturopathy and other systems of medicine, with free consultation, counselling and medicines at the Allopathy polyclinic. It attends to 5,000–10,000 people every month.',
    href: 'seva.html#hospital', source: `${OFFICIAL}/page/view/sgs-hospital`,
  },
  {
    id: 'veda-pathashala', cat: 'seva', x: 520, y: 572,
    name: 'SGS Veda Pathashala', note: 'All four Vedas and Sanskrit', since: 'Founded 1985',
    img: `${PAGE_IMG}514/514_b3b6aa10017eba1e.jpg`, alt: 'The SGS Veda Pathashala building',
    short: 'All four Vedas and Sanskrit, in the Gurukula way.',
    text: 'Classes in all four Vedas and in Sanskrit, in the traditional Gurukula system. Around 120 students are pursuing Vedic education here.',
    href: 'seva.html#pathashala', source: `${OFFICIAL}/page/view/sgs-veda-pathashala`,
  },
  {
    id: 'goshala', cat: 'seva', x: 150, y: 152,
    name: 'Goshala', note: 'SGS Datta Kamadhenu',
    img: photos.cows, alt: 'Cows at the Ashram Goshala',
    short: 'Care for more than 50 cows, and Gau Pooja.',
    text: 'Sri Swamiji has established a large Goshala at the Mysuru Ashram that shelters and cares for more than 50 cows. Devotees may offer Gau Pooja, worship of Gau Mata, here.',
    href: 'seva.html#goshala',
  },
].map((p, i) => ({ ...p, n: i + 1 }));

// The "golden thread": a suggested darshan walk from Hanumadwaram through the
// shrines (our wayfinding suggestion, drawn over the paved paths).
const ROUTE = 'M345 670 L345 492 C345 482 338 476 326 476 L246 476 C232 476 222 466 222 452 L222 300 C222 284 232 272 252 272 L400 272 C430 272 452 284 462 306 C474 334 478 392 500 416 C516 432 540 436 580 436 L760 434 C800 433 826 438 846 452 C872 472 884 520 890 552 C893 568 895 578 895 588';

// Footprints that light up with their place (also the mouse hit areas).
const FOOT = {
  hanumadwaram: 'M311 656h68v24h-68z',
  'birth-date-pillars': 'M326 484h38v170h-38z',
  'prayer-hall': 'M265 365h160v90h-160z',
  rajarajeshwari: 'M140 308h64v64h-64z',
  'hari-sannidhi': 'M240 290h44v44h-44z',
  venkateshwara: 'M630 455h140v90h-140z',
  hanuman: 'M796 398a34 34 0 1 0 68 0a34 34 0 1 0 -68 0z',
  kalabhairava: 'M871 616a24 24 0 1 0 48 0a24 24 0 1 0 -48 0z',
  'nada-mantapa': 'M500 300L540.4 189.1A118 118 0 0 1 540.4 410.9Z',
  'shuka-vana': 'M780 110h140v115h-140z',
  'bonsai-garden': 'M480 62h200v86h-200z',
  'vishwam-museum': 'M650 215h120v50h-120z',
  'saptarshi-sarovara': 'M302 208C298 178 336 158 376 160C420 162 450 182 446 214C442 242 410 254 372 250C330 246 305 236 302 208Z',
  'sgs-hospital': 'M95 555h110v70h-110z',
  'veda-pathashala': 'M465 540h110v70h-110z',
  goshala: 'M82 112h128v70h-128z',
};

// ---------- the hand-drawn plan ----------

function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const r1 = (v) => Math.round(v * 10) / 10;

// building rectangles trees must avoid
const AVOID = [
  [255, 355, 180, 125], [130, 298, 84, 84], [232, 282, 60, 60], [620, 445, 160, 112], [790, 380, 80, 70],
  [862, 582, 66, 66], [470, 180, 160, 240], [772, 102, 156, 132], [642, 205, 136, 68], [455, 530, 130, 90],
  [85, 545, 130, 92], [75, 108, 140, 82], [292, 152, 166, 108], [318, 470, 54, 210], [300, 640, 90, 50],
];
const blocked = (x, y, r) => AVOID.some(([ax, ay, aw, ah]) => x + r > ax && x - r < ax + aw && y + r > ay && y - r < ay + ah);

function trees(seed, clusters) {
  const rnd = rng(seed);
  const out = [];
  for (const [cx, cy, rx, ry, n, rmin, rmax] of clusters) {
    let made = 0, tries = 0;
    while (made < n && tries++ < n * 30) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
      const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d, r = rmin + rnd() * (rmax - rmin);
      if (blocked(x, y, r * 0.7)) continue;
      out.push([r1(x), r1(y), r1(r)]);
      made++;
    }
  }
  out.sort((a, b) => a[1] - b[1]);
  return `<g class="a-tree-sh">${out.map(([x, y, r]) => `<circle cx="${r1(x + r * 0.35)}" cy="${r1(y + r * 0.4)}" r="${r}"/>`).join('')}</g>
<g class="a-tree">${out.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
<g class="a-tree-hi">${out.map(([x, y, r]) => `<circle cx="${r1(x - r * 0.3)}" cy="${r1(y - r * 0.32)}" r="${r1(r * 0.42)}"/>`).join('')}</g>`;
}

function palms(list) {
  return `<g class="a-palm">${list.map(([x, y, s = 1]) => {
    const fr = [0, 60, 120, 180, 240, 300].map((deg) => {
      const a = (deg + 15) * Math.PI / 180, ex = x + Math.cos(a) * 9 * s, ey = y + Math.sin(a) * 9 * s;
      const qx = x + Math.cos(a + 0.5) * 6 * s, qy = y + Math.sin(a + 0.5) * 6 * s;
      return `M${x} ${y}Q${r1(qx)} ${r1(qy)} ${r1(ex)} ${r1(ey)}`;
    }).join('');
    return `<path d="${fr}"/>`;
  }).join('')}</g>`;
}

function art(uid) {
  // pillars along the pathway from the gate (a few dozen stand in for the 366)
  let pillars = '';
  for (let y = 492; y <= 650; y += 9) pillars += `<rect x="327.5" y="${y}" width="3.4" height="3.4"/><rect x="359" y="${y}" width="3.4" height="3.4"/>`;
  // Nada Mantapa: 22 Tamburas around the fan, seating arcs, radial aisles
  const fan = (r) => `M${r1(500 + r * Math.cos(-70 * Math.PI / 180))} ${r1(300 + r * Math.sin(-70 * Math.PI / 180))}A${r} ${r} 0 0 1 ${r1(500 + r * Math.cos(70 * Math.PI / 180))} ${r1(300 + r * Math.sin(70 * Math.PI / 180))}`;
  let tamburas = '';
  for (let i = 0; i < 22; i++) { const a = (-66 + i * (132 / 21)) * Math.PI / 180; tamburas += `<circle cx="${r1(500 + 109 * Math.cos(a))}" cy="${r1(300 + 109 * Math.sin(a))}" r="1.9"/>`; }
  // Kalabhairava: eight Bhairavas around a main shrine (octagon)
  const oct = Array.from({ length: 8 }, (_, i) => { const a = (i * 45 + 22.5) * Math.PI / 180; return `${r1(895 + 22 * Math.cos(a))} ${r1(616 + 22 * Math.sin(a))}`; }).join('L');
  let bhairavas = '';
  for (let i = 0; i < 8; i++) { const a = (i * 45) * Math.PI / 180; bhairavas += `<circle cx="${r1(895 + 14 * Math.cos(a))}" cy="${r1(616 + 14 * Math.sin(a))}" r="2.2"/>`; }
  // bonsai: rows of potted trees
  let bonsai = '';
  for (let row = 0; row < 3; row++) for (let c = 0; c < 9; c++) bonsai += `<circle cx="${494 + c * 10 + (row % 2) * 5}" cy="${74 + row * 11}" r="2.6"/>`;
  for (let c = 0; c < 6; c++) bonsai += `<circle cx="${612 + c * 10}" cy="${130}" r="2.6"/>`;
  // Shuka Vana mesh
  let mesh = '';
  for (let x = 792; x < 920; x += 11) mesh += `M${x} 112V223`;
  for (let y = 122; y < 225; y += 11) mesh += `M782 ${y}H918`;

  return `<svg class="amap-art" viewBox="0 0 1000 720" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
<defs>
  <filter id="${uid}-rough" x="-3%" y="-3%" width="106%" height="106%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="${uid}-paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 0.42  0 0 0 0 0.33  0 0 0 0 0.2  0 0 0 0.09 0"/></filter>
  <radialGradient id="${uid}-ground" cx="50%" cy="46%" r="68%"><stop offset="0" stop-color="var(--paper)"/><stop offset=".72" stop-color="var(--ivory)"/><stop offset="1" stop-color="var(--ivory-2)"/></radialGradient>
  <radialGradient id="${uid}-water" cx="42%" cy="38%" r="72%"><stop offset="0" stop-color="var(--ok)" stop-opacity=".22"/><stop offset=".7" stop-color="var(--forest-3)" stop-opacity=".34"/><stop offset="1" stop-color="var(--forest-3)" stop-opacity=".5"/></radialGradient>
</defs>
<rect class="a-out" width="1000" height="720"/>
<g class="a-fields">
  <path d="M0 22C120 30 300 18 520 26S860 14 1000 24M948 120C962 220 958 400 966 560M8 140C20 300 16 480 22 640"/>
</g>
<g class="a-hills"><path d="M1000 286C988 300 976 318 966 340C958 356 952 372 950 392C952 410 962 428 976 440C986 448 994 452 1000 454Z"/><path class="a-hills-ridge" d="M992 300C976 326 962 360 960 392C960 418 972 436 992 448"/></g>
<text class="a-label a-label-v" transform="translate(982 372) rotate(90)" text-anchor="middle">Chamundi Hills</text>
<g filter="url(#${uid}-rough)">
  <path class="a-road" d="M0 684H1000V710H0Z"/>
  <path class="a-road-line" d="M10 697H1000"/>
  <path class="a-ground" fill="url(#${uid}-ground)" d="M58 44C300 38 700 36 934 46C942 250 940 470 934 668C700 674 300 674 50 668C42 460 46 240 58 44Z"/>
  <path class="a-wall" d="M58 44C300 38 700 36 934 46C942 250 940 470 934 668C700 674 300 674 50 668C42 460 46 240 58 44Z"/>
  <g class="a-lawn">
    <path d="M66 58C130 50 250 56 280 92C296 120 282 160 274 200C268 236 230 262 180 262C120 262 70 250 64 200C60 150 58 96 66 58Z"/>
    <path d="M470 56C540 50 640 52 690 62C700 100 696 140 684 156C620 162 540 162 478 154C466 120 464 80 470 56Z"/>
    <path d="M760 58C830 52 900 56 924 64C930 120 930 200 926 262C880 270 800 268 766 252C752 200 752 110 760 58Z"/>
    <path d="M468 196C520 168 590 170 640 200C676 240 678 360 640 404C600 440 520 446 476 416C444 380 440 240 468 196Z"/>
    <path d="M870 268C900 262 926 270 928 300C930 380 930 470 924 540C900 548 878 540 872 520C866 440 864 330 870 268Z"/>
    <path d="M790 552C840 546 912 548 926 560C930 600 928 640 922 660C870 664 810 662 788 652C778 620 780 580 790 552Z"/>
    <path d="M64 400C100 392 180 396 226 410C232 450 226 520 214 540C170 546 100 544 70 536C60 500 60 440 64 400Z"/>
    <path d="M380 492C420 488 450 496 456 520C460 560 460 620 452 656C420 660 390 658 378 650C372 600 372 530 380 492Z"/>
    <path d="M232 492C270 488 304 492 314 504C318 560 316 610 310 654C280 658 250 656 236 648C226 600 226 540 232 492Z"/>
    <path d="M440 616C500 612 600 614 640 620C650 640 648 656 640 664C580 668 480 668 444 662C436 650 436 630 440 616Z"/>
    <path d="M600 560C660 556 760 556 790 566C792 600 790 640 780 662C720 664 650 664 610 656C598 630 596 590 600 560Z"/>
  </g>
  <g class="a-path-edge">
    <path d="${ROUTE}"/>
    <path d="M334 636C290 630 240 612 207 600M118 555C98 500 92 420 96 350C100 300 100 270 100 252M356 610C400 606 440 596 465 586M632 300C664 300 680 284 690 266M540 189C548 170 560 160 568 150M770 238C790 236 800 232 808 226M826 380C812 330 780 292 752 266M302 200C270 196 236 186 206 160M690 545C640 560 600 575 575 578M345 668V690"/>
  </g>
  <g class="a-path">
    <path d="${ROUTE}"/>
    <path d="M334 636C290 630 240 612 207 600M118 555C98 500 92 420 96 350C100 300 100 270 100 252M356 610C400 606 440 596 465 586M632 300C664 300 680 284 690 266M540 189C548 170 560 160 568 150M770 238C790 236 800 232 808 226M826 380C812 330 780 292 752 266M302 200C270 196 236 186 206 160M690 545C640 560 600 575 575 578M345 668V690"/>
  </g>
  <path class="a-avenue" d="M334 486H356V666H334Z"/>
  <g class="a-pillar">${pillars}</g>
  <g class="a-fence"><path d="M70 192H262V252H70Z"/></g>
  <path class="a-water" fill="url(#${uid}-water)" d="M302 208C298 178 336 158 376 160C420 162 450 182 446 214C442 242 410 254 372 250C330 246 305 236 302 208Z"/>
  <g class="a-ripple"><path d="M326 206C328 186 352 176 378 178C406 180 426 192 424 212"/><path d="M346 222C350 208 364 202 380 204C396 206 406 214 404 226"/></g>
  <g class="a-lotus"><circle cx="420" cy="226" r="3"/><circle cx="410" cy="236" r="2.2"/><circle cx="330" cy="226" r="2.6"/></g>
  <path class="a-ghat" d="M352 250h46M356 255h38M360 260h30"/>
  ${trees(1966, [
    [170, 82, 100, 26, 16, 7, 12], [62, 330, 14, 120, 9, 7, 11], [580, 160, 110, 8, 9, 5, 8],
    [850, 85, 80, 22, 12, 8, 13], [905, 160, 18, 60, 6, 8, 12], [850, 246, 70, 14, 9, 7, 11],
    [900, 420, 22, 120, 13, 7, 12], [850, 610, 70, 46, 12, 7, 12], [150, 470, 70, 50, 11, 7, 12],
    [415, 570, 34, 80, 10, 6, 10], [272, 570, 34, 76, 10, 6, 10], [700, 600, 80, 40, 12, 7, 12],
    [560, 640, 110, 14, 8, 6, 9], [480, 470, 20, 20, 3, 6, 9], [610, 210, 30, 12, 3, 6, 8],
    [455, 140, 18, 30, 4, 7, 10], [740, 330, 60, 44, 8, 7, 11], [300, 320, 30, 18, 3, 6, 9],
  ])}
  <g class="a-tree-in"><circle cx="812" cy="140" r="11"/><circle cx="838" cy="170" r="13"/><circle cx="880" cy="138" r="10"/><circle cx="900" cy="196" r="12"/><circle cx="856" cy="206" r="9"/><circle cx="804" cy="200" r="10"/></g>
  ${palms([[318, 676, 0.9], [372, 676, 0.9], [300, 520, 1], [390, 520, 1], [300, 600, 1], [390, 600, 1], [430, 470, 0.9], [240, 466, 0.9], [612, 300, 0.8], [620, 448, 0.9], [784, 448, 0.9]])}
  <g class="a-bld-sh">
    <path d="M269 370h160v90h-160zM144 313h64v64h-64zM244 295h44v44h-44zM634 460h140v90h-140zM655 220h120v50h-120zM99 560h110v70h-110zM469 545h110v70h-110zM86 117h128v32h-128zM86 153h128v32h-128zM504 305L544.4 194.1A118 118 0 0 1 544.4 415.9Z"/>
  </g>
  <g class="a-bld">
    <path d="M265 365h160v90h-160z"/><path d="M318 455h54v13h-54z"/>
    <path d="M140 308h64v64h-64z"/>
    <path d="M240 290h44v44h-44z"/>
    <path d="M630 455h140v90h-140z"/><path d="M688 540h24v12h-24z"/>
    <path d="M650 215h120v50h-120z"/><circle cx="652" cy="240" r="19"/>
    <path d="M95 555h70v30h40v40h-110z"/>
    <path d="M465 540h110v70h-110zM490 560v30h60v-30z" fill-rule="evenodd"/>
    <path d="M82 112h128v32h-128zM82 150h128v32h-128z"/>
    <path d="M500 300L540.4 189.1A118 118 0 0 1 540.4 410.9Z"/><path d="M612 286h20v28h-20z"/>
    <path d="M826 405h44v38h-44z"/>
    <path d="M${oct}Z"/>
  </g>
  <g class="a-detail">
    <path d="M273 373h144v74h-144z"/><path d="M332 372h26v20h-26z"/><path d="M408 380h8v8h-8zM408 394h8v8h-8zM408 408h8v8h-8zM408 422h8v8h-8zM408 436h8v8h-8zM274 380h12v12h-12z"/>
    <path d="M150 318h44v44h-44z"/><path d="M172 316l20 24-20 24-20-24z"/><circle cx="172" cy="340" r="4"/>
    <circle cx="262" cy="312" r="12"/><path d="M262 300v24M250 312h24M253.5 303.5l17 17M270.5 303.5l-17 17"/>
    <path d="M675 470h50v50h-50zM685 480h30v30h-30z"/><path d="M640 464h14v14h-14zM746 464h14v14h-14zM640 522h14v14h-14zM746 522h14v14h-14zM640 493h14v14h-14zM746 493h14v14h-14z"/>
    <path d="${fan(40)}${fan(62)}${fan(84)}M500 300L${r1(500 + 118 * Math.cos(-0.61))} ${r1(300 + 118 * Math.sin(-0.61))}M500 300L${r1(500 + 118)} 300M500 300L${r1(500 + 118 * Math.cos(0.61))} ${r1(300 + 118 * Math.sin(0.61))}"/>
    <path d="M500 300m-16 0a16 16 0 0 1 16 -16v32a16 16 0 0 1 -16 -16z"/>
    <path d="M672 222h90v36h-90z"/><circle cx="652" cy="240" r="10"/>
    <path d="M100 560h60v20h-60z"/>
    <path d="M86 128h120M86 166h120"/>
  </g>
  <g class="a-tamb">${tamburas}</g>
  <g class="a-bhairava">${bhairavas}<path d="M890 611h10v10h-10z"/></g>
  <circle class="a-statue" cx="830" cy="398" r="15"/><circle class="a-statue-in" cx="830" cy="398" r="6.5"/>
  <path class="a-mesh-box" d="M780 110h140v115h-140z"/>
  <path class="a-mesh" d="${mesh}"/>
  <path class="a-bld" d="M788 232h34v22h-34z"/>
  <g class="a-bonsai">${bonsai}</g>
  <path class="a-channel" d="M486 112C520 104 540 120 560 116S600 100 640 110"/>
  <path class="a-bld" d="M560 88l8.5 3.5 3.5 8.5-3.5 8.5-8.5 3.5-8.5-3.5-3.5-8.5 3.5-8.5z"/>
  <circle class="a-statue" cx="636" cy="88" r="6"/>
  <g class="a-gate"><path d="M311 660h68v18h-68z"/><path d="M315 663h12v12h-12zM363 663h12v12h-12z"/><path class="a-gate-arch" d="M331 676C331 664 359 664 359 676"/></g>
</g>
<g class="a-compass" transform="translate(968 66)">
  <circle r="20"/><path class="a-compass-n" d="M0 -17L5 0L0 4L-5 0Z"/><path d="M0 17L5 0L0 -4L-5 0Z"/>
  <text y="-25" text-anchor="middle">N</text>
</g>
<rect width="1000" height="720" filter="url(#${uid}-paper)" class="a-grain"/>
</svg>`;
}

// Overlay: footprint highlights (also hit areas) and the golden walking route.
function overlay(uid, ids) {
  return `<svg class="amap-over" viewBox="0 0 1000 720" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
<defs><filter id="${uid}-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<g class="amap-hls">${ids.filter((id) => FOOT[id]).map((id) => `<path class="amap-hl" data-place="${id}" d="${FOOT[id]}"/>`).join('')}</g>
<g class="amap-route">
  <path class="amap-route-base" d="${ROUTE}"/>
  <path class="amap-route-draw" pathLength="1000" d="${ROUTE}"/>
  <path class="amap-route-pulse" pathLength="1000" filter="url(#${uid}-glow)" d="${ROUTE}"/>
  <path class="amap-route-bead" pathLength="1000" filter="url(#${uid}-glow)" d="${ROUTE}"/>
</g>
</svg>`;
}

// ---------- markup ----------

const pct = (v, total) => `${Math.round((v / total) * 10000) / 100}%`;

function pin(p, uid, i) {
  return `<button type="button" class="amap-pin" data-place="${p.id}" data-cat="${p.cat}" style="--x:${pct(p.x, 1000)};--y:${pct(p.y, 720)};--i:${i}" aria-pressed="false" aria-controls="${uid}-card" aria-label="${p.n}. ${esc(p.name)} (${categories[p.cat].one})">
  <span class="amap-pin-pulse" aria-hidden="true"></span>
  <span class="amap-pin-mark" aria-hidden="true"><span class="amap-pin-body"><svg viewBox="0 0 30 38" width="30" height="38"><path d="M15 37C15 37 2 23.6 2 14.6A13 13 0 0 1 28 14.6C28 23.6 15 37 15 37Z"/></svg><b>${p.n}</b></span></span>
  <span class="amap-pin-label" aria-hidden="true">${p.name}</span>
</button>`;
}

function media(p) {
  if (p.img) return `<div class="amap-card-media"><img src="${p.img}" alt="${esc(p.alt || p.name)}" loading="lazy" decoding="async"></div>`;
  return `<div class="amap-card-media is-art" aria-hidden="true"><svg class="amap-card-mandala" viewBox="0 0 104 104"><use href="#i-mandala"/></svg>${icon(p.icon || 'temple', 34)}</div>`;
}

function cardItem(p, uid, show, compact) {
  const cat = categories[p.cat];
  const ext = /^https?:/.test(p.href);
  const rows = p.timing ? `<dl class="amap-time">${p.timing.rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>` : '';
  const badge = p.timing && p.timing.badge ? `<span class="badge" data-badge="${p.timing.badge}">Checking…</span>` : '';
  const tnote = p.timing && p.timing.note ? `<p class="amap-time-note">${p.timing.note}</p>` : '';
  if (compact) {
    return `<article class="amap-card-item" data-place="${p.id}" data-cat="${p.cat}"${show ? '' : ' hidden'}>
  ${media(p)}
  <div class="amap-card-body">
    <span class="amap-card-tag"><i></i>${cat.one}</span>
    <h4 class="amap-card-title">${p.name}</h4>
    <p>${p.short}</p>
  </div>
  <a class="amap-card-go" href="${p.href}" aria-label="${esc(p.name)}: ${esc(p.cta || categories[p.cat].cta)}">${icon('arrow', 18)}</a>
</article>`;
  }
  const moreId = `${uid}-more-${p.id}`;
  return `<article class="amap-card-item" data-place="${p.id}" data-cat="${p.cat}"${show ? '' : ' hidden'} aria-labelledby="${uid}-t-${p.id}">
  ${media(p)}
  <div class="amap-card-body">
    <span class="amap-card-tag"><i></i>${cat.one}</span>
    <h3 class="amap-card-title" id="${uid}-t-${p.id}">${p.name}</h3>
    ${p.since ? `<span class="amap-since">${p.since}</span>` : ''}
    <p class="amap-short">${p.short}</p>
    <div class="amap-more" id="${moreId}">
      <p>${p.text}</p>
      ${p.source ? `<a class="amap-source" href="${p.source}">Source: dattapeetham.org ${icon('arrow-up-right', 12)}</a>` : ''}
    </div>
    ${rows || badge ? `<div class="amap-card-time">${icon('clock', 16)}<div>${rows}${badge}${tnote}</div></div>` : ''}
    <div class="amap-card-links">
      <button type="button" class="amap-more-btn" aria-expanded="false" aria-controls="${moreId}"><span>Read more</span>${icon('chev', 12)}</button>
      <a class="link-arrow" href="${p.href}"${ext ? ' data-external' : ''}>${p.cta || cat.cta} ${icon('arrow', 15)}</a>
    </div>
  </div>
</article>`;
}

function listGroup(cat, places, uid) {
  return `<div class="amap-group" data-cat="${cat}">
  <h3 class="amap-group-head"><i aria-hidden="true"></i>${categories[cat].label} <span>${places.length}</span></h3>
  <ul>${places.map((p) => `<li><button type="button" class="amap-item" data-place="${p.id}" data-cat="${cat}" aria-pressed="false" aria-controls="${uid}-card"><span class="amap-num" aria-hidden="true">${p.n}</span><span class="amap-item-text"><b>${p.name}</b><small>${p.note}</small></span></button></li>`).join('')}</ul>
</div>`;
}

const CAPTION = 'Illustrative map — not to scale; positions are approximate.';

export function ashramMap({
  compact = false,
  id = 'map',
  eyebrow = 'Interactive Ashram Map',
  title = 'Walk the <span class="em-light">Ashram</span>',
  lead = 'Explore key locations, temples, facilities and attractions on an illustrative plan of the Mysuru Ashram. Choose a place on the map or from the list; the golden thread traces a darshan walk from Hanumadwaram through the shrines.',
  initial,
} = {}) {
  const uid = `${id}-amap`;
  if (compact) {
    const pick = ['prayer-hall', 'venkateshwara', 'hanuman', 'nada-mantapa', 'shuka-vana', 'bonsai-garden', 'vishwam-museum'];
    const shown = ashramPlaces.filter((p) => pick.includes(p.id));
    const start = initial || 'nada-mantapa';
    return `<div class="amap amap-compact" id="${id}" data-amap data-compact data-default="${start}">
  <div class="amap-c-head">
    <span class="amap-c-icon" aria-hidden="true">${icon('map', 22)}</span>
    <div><h3>Interactive Ashram Map</h3><p>Explore key locations, temples, facilities and attractions with an interactive map.</p></div>
  </div>
  <figure class="amap-figure">
    <div class="amap-map">
      <div class="amap-scroll"><div class="amap-canvas" data-reveal="fade">
        ${art(uid)}
        ${overlay(uid, shown.map((p) => p.id))}
        <div class="amap-pins" role="group" aria-label="Places on the map">${shown.map((p, i) => pin(p, uid, i)).join('')}</div>
      </div></div>
      <div class="amap-card" id="${uid}-card"><div class="amap-card-live" aria-live="polite">${shown.map((p) => cardItem(p, uid, p.id === start, true)).join('')}</div></div>
    </div>
    <figcaption class="amap-caption">${icon('info', 14)}<span>${CAPTION}</span></figcaption>
  </figure>
  <a class="link-arrow amap-c-link" href="visit.html#map">Explore the map ${icon('arrow', 15)}</a>
</div>`;
  }

  const start = initial || 'prayer-hall';
  const groups = Object.keys(categories).map((c) => listGroup(c, ashramPlaces.filter((p) => p.cat === c), uid)).join('');
  const sw = (key, label) => `<button type="button" class="amap-switch" role="switch" aria-checked="true" data-layer="${key}"><span class="amap-switch-track" aria-hidden="true"><i></i></span><span class="amap-swatch" data-cat="${key}" aria-hidden="true"></span>${label}</button>`;
  return `<section class="section section-dark amap-section" id="${id}">
  <div class="wrap">
    <header class="section-head is-light">
      <svg class="ornament" viewBox="0 0 160 20" aria-hidden="true" data-draw><path d="M0 10h58M102 10h58"/><path d="M80 2c3.6 3.2 5.4 5.8 5.4 8S83.6 15.6 80 18c-3.6-2.4-5.4-5.8-5.4-8S76.4 5.2 80 2Z"/><path d="M80 18c-4.6-.6-9.4-3.6-12-8.6 4.6 0 8.8 2 12 6.2M80 18c4.6-.6 9.4-3.6 12-8.6-4.6 0-8.8 2-12 6.2"/><circle cx="62" cy="10" r="1.6"/><circle cx="98" cy="10" r="1.6"/></svg>
      <span class="eyebrow">${eyebrow}</span>
      <h2 data-split>${title}</h2>
      ${lead ? `<p class="lead" data-reveal="up">${lead}</p>` : ''}
    </header>
    <div class="amap amap-full" data-amap data-default="${start}">
      <div class="amap-bar">
        <span class="amap-bar-label">Show</span>
        <div class="amap-layers" role="group" aria-label="Map layers">
          ${sw('shrine', 'Shrines')}${sw('attraction', 'Attractions')}${sw('seva', 'Seva')}${sw('route', 'Darshan walk')}
        </div>
      </div>
      <nav class="amap-list" aria-label="Places on the Ashram map" data-lenis-prevent>${groups}</nav>
      <figure class="amap-figure">
        <div class="amap-map">
          <div class="amap-scroll" data-lenis-prevent><div class="amap-canvas" data-reveal="fade">
            ${art(uid)}
            ${overlay(uid, ashramPlaces.map((p) => p.id))}
            <div class="amap-pins" role="group" aria-label="Map pins">${ashramPlaces.map((p, i) => pin(p, uid, i)).join('')}</div>
          </div></div>
          <span class="amap-swipe" aria-hidden="true">${icon('arrow-left', 14)}Swipe to explore${icon('arrow', 14)}</span>
          <div class="amap-card" id="${uid}-card">
            <button type="button" class="amap-card-close" aria-label="Close details">${icon('close', 18)}</button>
            <div class="amap-card-live" aria-live="polite">${ashramPlaces.map((p) => cardItem(p, uid, p.id === start, false)).join('')}</div>
          </div>
        </div>
        <figcaption class="amap-caption">${icon('info', 14)}<span>${CAPTION} North is up; the golden thread is a suggested darshan walk.</span></figcaption>
      </figure>
    </div>
  </div>
</section>`;
}
