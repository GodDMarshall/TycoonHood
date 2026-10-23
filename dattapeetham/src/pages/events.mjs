// Events & Festivals — the Peetham's year of festivals, programmes and concerts.
// Sources (harvested 22 Oct 2026):
//   /calendar (Nimble vx8, wait 4000): 49 dated 2026 entries — every date below
//     is taken from that table (overlapping travel rows are merged or left out),
//     except the 29 July Dallas Guru Purnima row, which is from the /events listing;
//   /events (vx8): category list, the 2026 Guru Purnima event in Dallas, years 1996–2026;
//   /page/view/ashram-life: daily programmes, Maha Shivaratri, birthday, Navaratri, Datta Jayanti;
//   /page/view/sri-bala-swamiji and /datta-peetha-guru-parampara: Guru Purnima, Chaturmasya;
//   /page/view/sri-datta-venkateshwara-temple: Vaikuntha Ekadashi;
//   /page/view/dattapeetham-telecast-timing-of-sri-swamijis-programs: TV timings;
//   /subscribe: "Datta Peetham Email & SMS notifications"; /page/view/sdhs-volunteers;
//   legacy homepage: 2024 free medical camps (1,512 cases, 35 eye check-ups, 31 dental).
// Lunar-month names and their approximate Gregorian months, and the tithi of
// each festival, are general knowledge; the wheel is labelled illustrative.

import { pageHero, sectionHead, chips, processSteps, ctaBand, btn, img, icon } from '../components.mjs';
import { site, links, OFFICIAL, PAGE_IMG } from '../site.mjs';
import { photos, concerts, latestSevas, apps } from '../data.mjs';

const P = {
  hero: `${PAGE_IMG}506/506_575a490450b5a1d7.jpg`,
  volunteersCamp: `${PAGE_IMG}512/512_b7f437033ed03d4a.jpg`,
  deviArati: `${PAGE_IMG}526/526_d126a05ad90b71ef.jpg`,
  shiva: `${PAGE_IMG}527/527_4e2708a40a3ee0ce.jpg`,
  venkateshwara: `${PAGE_IMG}527/527_e54f0e9f5481af23.jpeg`,
  ganapathy: `${PAGE_IMG}527/527_398025271699adef.jpg`,
};

const EXT = {
  tv: `${OFFICIAL}/page/view/dattapeetham-telecast-timing-of-sri-swamijis-programs`,
  japan: 'https://www.japanragasagara.com/en',
};
const panchangam = apps.find((a) => a.name === 'SGS Panchangam');
const narasimhaKalyana = latestSevas[0];
const ext = ' data-external rel="noopener"';

// ---------------------------------------------------------------------------
// dates

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const parse = (iso) => { const [y, m, d] = iso.split('-').map(Number); return { y, m: m - 1, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; };
function rangeText(s, e, year = true) {
  const a = parse(s), b = parse(e), y = year ? ` ${b.y}` : '';
  if (s === e) return `${a.d} ${MON[a.m]}${y}`;
  if (a.m === b.m) return `${a.d}–${b.d} ${MON[a.m]}${y}`;
  return `${a.d} ${MON[a.m]} – ${b.d} ${MON[b.m]}${y}`;
}

const KINDS = {
  festivals: ['Festival', 'diya'],
  music: ['Music', 'music'],
  discourses: ['Discourse &amp; Parayana', 'book'],
  'seva-camps': ['Seva Camp', 'heart-hand'],
  vratas: ['Vrata', 'flame'],
  tours: ['Tour', 'globe'],
};
const kindLabel = (k) => k.map((x) => KINDS[x][0]).join(' · ');

// ---------------------------------------------------------------------------
// 2026 official calendar (Swamiji, Bala Swamiji and Datta Peetham calendars),
// plus the 29 July Dallas event from the official /events listing.
// [start, end, title, place, kinds]

const CAL = [
  ['2026-01-01', '2026-01-01', 'New Year Darshana', 'SGS Ashrama, Vijayawada', ['festivals']],
  ['2026-01-02', '2026-01-08', 'Bhagavata Saptaha in Telugu', 'SGS Ashrama, Patamata, Vijayawada', ['discourses']],
  ['2026-01-11', '2026-01-17', 'Programmes in the new SGS Ashrama', 'Tenali', ['tours']],
  ['2026-01-15', '2026-01-15', 'Sri Sankranti Raga Sagara', 'Tenali', ['music']],
  ['2026-01-23', '2026-01-26', 'Programmes at SGS Ashrama', 'Kurnool', ['tours']],
  ['2026-01-24', '2026-01-24', 'Surya Prabha Ragasagara', 'Kurnool', ['music']],
  ['2026-01-25', '2026-01-25', 'Ratha Saptami', 'SGS Ashrama, Kurnool', ['festivals']],
  ['2026-01-29', '2026-01-31', 'Jayalakshmi Charana Sannidhi Kriya Yoga', 'Jayalakshmipuram', ['tours']],
  ['2026-02-01', '2026-02-01', 'Jayalakshmi Mata Aradhana Festival', '', ['festivals']],
  ['2026-02-14', '2026-02-14', 'Hanuman Chalisa Parayana', 'Maharaja College Grounds, Mysuru · from 9 AM', ['discourses']],
  ['2026-02-15', '2026-02-15', 'Maha Shivaratri Festival', 'Datta Peetham, SGS Ashrama, Mysuru', ['festivals']],
  ['2026-03-13', '2026-03-15', 'Programmes at Panchamukha Hanuman Kshetra', 'BHEL, Hyderabad', ['tours']],
  ['2026-03-16', '2026-03-20', 'Yugadi programmes · Yugadi on 19 March', 'SGS Ashrama, Dundigal, Hyderabad', ['festivals']],
  ['2026-03-21', '2026-03-21', 'Bhagyalakshmi Ragasagara', 'Gachibowli Stadium, Hyderabad · 9 AM', ['music']],
  ['2026-03-22', '2026-03-22', 'Sampoorna Bhagavad Gita Parayana', 'Gachibowli Stadium, Hyderabad · 9 AM', ['discourses']],
  ['2026-03-27', '2026-03-27', 'Sri Ramanavami Festival', 'Dundigal Ashrama, Hyderabad', ['festivals']],
  ['2026-03-28', '2026-04-05', 'Karyasiddhi Hanuman Temple inauguration · Kumbhabhisheka on 3 April', 'Burlington, New Jersey, USA', ['tours']],
  ['2026-04-19', '2026-04-19', 'Indraprastha Ragasagara', 'Bharat Mantapam, New Delhi', ['music']],
  ['2026-04-25', '2026-04-25', 'Sri Swamiji’s music concert', 'Athens, Greece', ['music']],
  ['2026-05-24', '2026-05-31', 'Sri Swamiji’s 84th Birthday celebrations · Pratyaksha Padapuja on 27 May', '', ['festivals']],
  ['2026-06-15', '2026-06-16', 'Programmes in Dublin', 'Ireland', ['tours']],
  ['2026-06-17', '2026-06-23', 'Pujya Swamiji at SGS Hanuman Mandir', 'Hounslow, London', ['tours']],
  ['2026-06-23', '2026-07-02', 'Sri Swamiji in Trinidad', '', ['tours']],
  ['2026-07-02', '2026-07-06', 'Sri Swamiji in Baton Rouge', '', ['tours']],
  ['2026-07-07', '2026-07-08', 'Sri Swamiji at SGS Ashrama, Austin', '', ['tours']],
  ['2026-07-09', '2026-07-13', 'Pujya Swamiji at Hanuman Datta Yoga Center', 'Wallis, Texas (SGS Ashrama, Houston)', ['tours']],
  ['2026-07-19', '2026-08-02', 'Pujya Swamiji at KSHT, Frisco', 'Dallas, USA', ['tours']],
  ['2026-07-29', '2026-07-29', 'America Panchaashat Nadee Jala Samarpana · Guru Purnima', 'Dallas, TX, USA', ['festivals']],
  ['2026-08-05', '2026-08-07', 'Visit to the newly installed Marakata Hanuman shrine', 'Omaha, Nebraska', ['tours']],
  ['2026-08-07', '2026-08-09', 'Pujya Swamiji at SGS Ashrama', 'Fremont, California', ['tours']],
  ['2026-08-10', '2026-08-13', 'Pujya Swamiji at Krishna Datta Hanuman Temple', 'Chicago', ['tours']],
  ['2026-08-14', '2026-08-14', 'Niagara Darshana by Sri Swamiji · 5 PM', 'Hyatt Regency, Niagara Falls, Canada', ['tours']],
  ['2026-08-15', '2026-08-15', 'Niagara Raga Sagara', 'Oakes Garden Theatre, Niagara (Canada side)', ['music']],
  ['2026-08-19', '2026-08-23', 'Programmes at the Hanuman Temple · Varamahalakshmi Vrata on 21 August', 'Datta Yoga Center, Erin, Canada', ['tours', 'vratas']],
  ['2026-08-28', '2026-08-30', '50 Years of Sri Swamiji in Europe · Datta Venu Raga Sagara on 29 August', 'Stadtcasino Basel, Switzerland', ['tours', 'music']],
  ['2026-09-04', '2026-09-04', 'Krishna Janmashtami Festival', 'Mysuru Ashrama', ['festivals']],
  ['2026-09-13', '2026-09-14', 'Ganapathy Festival · Swarna Gowri and Varasiddhi Vinayaka Vratams', 'SGS Ashrama, Vijayawada', ['festivals', 'vratas']],
  ['2026-09-29', '2026-09-30', 'Marakata Dandayudhapani Muruga temple', 'SGS Ashrama, Nadupalani, Tamil Nadu', ['tours']],
  ['2026-10-01', '2026-10-02', 'Darshana and Satsanga', 'SGS Ashrama, Bhadrakali Peetha, Haridwar', ['tours']],
  ['2026-10-03', '2026-10-04', 'Pujya Sri Swamiji at the Rishikesh Ashrama', 'SGS Ashrama, Haridwar Road, Rishikesh', ['tours']],
  ['2026-10-11', '2026-10-20', 'Devi Navaratri Festival', 'Datta Peetham, Mysuru', ['festivals']],
  ['2026-11-25', '2026-12-02', 'Pujya Swamiji in Nara, Japan · Japan Ragasagara on 29 November', 'Nara, Japan', ['tours', 'music']],
  ['2026-12-15', '2026-12-17', 'SDHS Volunteer camp', 'Vishwaroopa Datta Kshetra, Ganagapura', ['seva-camps']],
  ['2026-12-20', '2026-12-20', 'Vaikuntha Ekadashi & Gita Jayanti', 'Sri Datta Venkateswara Temple & Nada Mantapa, Mysuru', ['festivals']],
  ['2026-12-21', '2026-12-23', 'Dattatreya Jayanti', 'Datta Peetham, Mysuru', ['festivals']],
];

// Still ahead when the calendar was read (22 Oct 2026). Page JS re-labels
// each card as the dates arrive and pass.
const COMING = [
  {
    s: '2026-11-25', e: '2026-12-02', kinds: ['tours', 'music'],
    title: 'Pujya Swamiji in Nara, Japan', where: 'Nara, Japan', plate: 'Nara',
    sched: [
      ['Sat 28 Nov · 10 AM', 'Yoga Conference “Sound, then Truth”, JW Marriott Hotel, Nara'],
      ['Sun 29 Nov · 5 PM onwards', 'Japan Ragasagara, Nara Kasugano International Forum'],
    ],
    more: [EXT.japan, 'japanragasagara.com'],
  },
  {
    s: '2026-12-15', e: '2026-12-17', kinds: ['seva-camps'],
    title: 'SDHS Volunteer camp', where: 'Vishwaroopa Datta Kshetra, Ganagapura',
    img: P.volunteersCamp, alt: 'Rows of volunteers in matching shirts seated in a large hall at an earlier volunteers’ camp at SGS Ashram, Mysuru',
    note: 'Photo: an earlier volunteers’ camp at Mysuru',
    sched: [['', 'A camp for the volunteers of Sri Datta Humane Services, the Peetham’s service wing.']],
    more: ['seva.html#volunteer', 'Volunteer with SDHS'],
  },
  {
    s: '2026-12-20', e: '2026-12-20', kinds: ['festivals'],
    title: 'Vaikuntha Ekadashi & Gita Jayanti', where: 'Datta Peetham, Mysuru',
    img: P.venkateshwara, alt: 'Sri Swamiji offers arati to Sri Venkateshwara, flanked by His consorts and decked in garlands',
    sched: [['Vaikuntha Ekadashi', 'at the Sri Datta Venkateswara Temple'], ['Gita Jayanti', 'at Nada Mantapa']],
    more: ['darshan.html', 'Temples &amp; darshan'],
  },
  {
    s: '2026-12-21', e: '2026-12-23', kinds: ['festivals'],
    title: 'Dattatreya Jayanti', where: 'Datta Peetham, Mysuru',
    img: photos.dattatreya, alt: 'Sri Swamiji offers arati to Lord Dattatreya, garlanded in yellow and white flowers',
    sched: [['21 Dec', 'Ksheerabhisheka &amp; Punya Smarana'], ['22 Dec', 'Panchamrita Abhisheka'], ['23 Dec', 'Sahasra Kalasha Thailabhisheka to Dattatreya Swami on Datta Jayanti Purnima']],
    more: ['#fy-p-margashirsha', 'About Datta Jayanti'],
  },
];

// Each coming-up card has an anchor; the JSON-LD events below link to it.
const eventId = (c) => `ev-${c.s}`;

function featureCard(c) {
  const a = parse(c.s), b = parse(c.e);
  const to = c.s === c.e ? WD[a.wd] : `to ${b.m === a.m ? b.d : `${b.d} ${MON[b.m]}`}`;
  const media = c.img
    ? `<div class="ev-fmedia">${img(c.img, c.alt)}${c.note ? `<small class="ev-fnote">${c.note}</small>` : ''}</div>`
    : `<div class="ev-fmedia ev-plate" aria-hidden="true">${icon('mandala', 220)}<span>${c.plate}</span></div>`;
  const more = c.more ? `<a class="ev-more" href="${c.more[0]}"${/^https?:/.test(c.more[0]) ? ext : ''}>${c.more[1]} ${icon(/^https?:/.test(c.more[0]) ? 'arrow-up-right' : 'arrow', 14)}</a>` : '';
  return `<article class="ev-fcard" id="${eventId(c)}" data-filter-item="${c.kinds.join(' ')}" data-start="${c.s}" data-end="${c.e}">
  ${media}
  <div class="ev-fdate"><time datetime="${c.s}"><b>${a.d}</b><span>${MON[a.m]}</span></time><small>${to}</small></div>
  <div class="ev-fbody">
    <span class="ev-kinds">${kindLabel(c.kinds)}</span>
    <h4>${c.title}</h4>
    <p class="ev-where">${icon('pin', 15)}<span>${c.where} · ${rangeText(c.s, c.e)}</span></p>
    <ul class="ev-sched">${c.sched.map(([w, t]) => `<li>${w ? `<b>${w}</b>` : ''}<span>${t}</span></li>`).join('')}</ul>
    <div class="ev-ffoot">${more}<span class="ev-status" data-ev-status hidden></span></div>
  </div>
</article>`;
}

function monthCard(m) {
  const rows = CAL.filter(([s]) => parse(s).m === m);
  return `<li class="ev-month" data-month="2026-${String(m + 1).padStart(2, '0')}" data-num="${String(m + 1).padStart(2, '0')}" data-label="This month">
  <header class="ev-mhead"><h4>${MONTH[m]}</h4><span class="ev-mcount" data-ev-count>${rows.length}</span></header>
  <ul class="ev-rows">${rows.map(([s, e, t, p, k]) => {
    const a = parse(s), b = parse(e);
    const sub = s === e ? WD[a.wd] : `to ${b.m === a.m ? b.d : `${b.d} ${MON[b.m]}`}`;
    return `<li class="ev-row" data-filter-item="${k.join(' ')}" data-start="${s}" data-end="${e}">
      <time datetime="${s}"><b>${a.d}</b><small>${sub}</small></time>
      <span class="ev-rbody"><b data-label="Next" data-label-now="Now">${t}</b>${p ? `<small>${p}</small>` : ''}</span>
      <span class="ev-rkind" title="${kindLabel(k).replace(/&amp;/g, '&')}">${icon(KINDS[k[0]][1], 16)}<span class="visually-hidden">${kindLabel(k)}</span></span>
    </li>`;
  }).join('')}</ul>
  <p class="ev-none">Nothing of this kind this month.</p>
</li>`;
}

const calendarSection = `<section id="calendar" class="section section-paper ev-cal">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'Events &amp; Programmes · 2026',
      title: 'What’s <span class="em-light">coming up</span>',
      lead: 'Festivals, concerts, discourses and Sri Swamiji’s programmes around the world — every date as published on the Peetham’s official calendar and events listing.',
    })}
    <div class="ev-scope" data-filter-scope>
      <div class="ev-toolbar" data-reveal="up">
        ${chips('Show events of one kind', [['all', 'All'], ['festivals', 'Festivals'], ['music', 'Music'], ['discourses', 'Discourses &amp; Parayana'], ['seva-camps', 'Seva Camps'], ['vratas', 'Vratas'], ['tours', 'Tours']])}
        <p class="ev-asof">${icon('info', 16)}<span>From the official calendar and events listing, read on 22 October 2026. Programmes can change — please confirm before you travel.</span></p>
      </div>

      <div class="ev-subhead"><h3>Coming up</h3><span class="ev-line" aria-hidden="true"></span></div>
      <div class="ev-feature" data-stagger>${COMING.map(featureCard).join('')}</div>
      <p class="ev-none ev-none-feature">Nothing of this kind is coming up — look month by month below.</p>
      <p class="ev-allpast" data-ev-allpast hidden>${icon('calendar', 16)}<span>The 2026 programme has concluded. The next year’s dates appear on the <a href="${links.calendar}"${ext}>official calendar</a>.</span></p>

      <div class="ev-subhead ev-subhead-rail">
        <h3>Month by month</h3><span class="ev-line" aria-hidden="true"></span>
      </div>
      <button class="ev-earlier" type="button" data-ev-earlier aria-controls="ev-months" aria-expanded="true" hidden>${icon('plus', 16)}<span>Show earlier months</span></button>
      <ol class="ev-months" id="ev-months" data-ev-months aria-label="The 2026 calendar, month by month">
        ${MONTH.map((_, m) => monthCard(m)).join('')}
      </ol>
      <p class="notice ev-empty" data-filter-empty hidden>${icon('info', 18)}<span>No entries of this kind on the 2026 calendar.</span></p>

      <div class="ev-calfoot" data-reveal="up">
        <p>Overlapping travel days are combined here. The official calendar can also be filtered by Sri Swamiji’s, Sri Bala Swamiji’s and the Datta Peetham calendars.</p>
        <div class="btn-row">
          ${btn('Official calendar', links.calendar, 'gold', 'arrow-up-right', ext)}
          ${btn('Email &amp; SMS alerts', links.subscribe, 'line', 'mail', ext)}
        </div>
      </div>
    </div>
  </div>
</section>`;

// ---------------------------------------------------------------------------
// the festival year (lunar months)

const LUNAR = [
  ['chaitra', 'Chaitra', 'Mar – Apr'], ['vaishakha', 'Vaishakha', 'Apr – May'], ['jyeshtha', 'Jyeshtha', 'May – Jun'],
  ['ashadha', 'Ashadha', 'Jun – Jul'], ['shravana', 'Shravana', 'Jul – Aug'], ['bhadrapada', 'Bhadrapada', 'Aug – Sep'],
  ['ashwayuja', 'Ashwayuja', 'Sep – Oct'], ['kartika', 'Kartika', 'Oct – Nov'], ['margashirsha', 'Margashirsha', 'Nov – Dec'],
  ['pausha', 'Pausha', 'Dec – Jan'], ['magha', 'Magha', 'Jan – Feb'], ['phalguna', 'Phalguna', 'Feb – Mar'],
];

// tithi: 1–15 Shuddha (bright fortnight), 16–30 Bahula (dark) — marker position only.
const FEST = {
  chaitra: [
    { name: 'Yugadi', icon: 'sun', tithi: 1, when: 'Chaitra Shuddha Pratipada — the lunar new year', y: 'Yugadi programmes at SGS Ashrama, Dundigal, Hyderabad, 16–20 March; Yugadi fell on 19 March.', s: '2026-03-19', e: '2026-03-19' },
    { name: 'Sri Rama Navami', icon: 'sparkle', tithi: 9, when: 'Chaitra Shuddha Navami', y: 'Sri Ramanavami Festival at the Dundigal Ashrama, Hyderabad, 27 March.', s: '2026-03-27', e: '2026-03-27' },
  ],
  vaishakha: [
    { name: 'Sri Jayalakshmi Maata Aradhana', icon: 'diya', tithi: 5, when: 'Vaishaakha Panchami',
      text: 'Every year Sri Swamiji conducts special rituals and worship on the Aradhana day of His mother, Sri Jayalakshmi Maata.',
      y: 'The 2026 calendar also lists a Jayalakshmi Mata Aradhana Festival on 1 February.', link: ['guru-parampara.html#jayalakshmi-maata', 'Sri Jayalakshmi Maata'] },
  ],
  jyeshtha: [
    { name: 'Sri Swamiji’s Birthday', icon: 'lotus', tithi: 11, img: photos.swamijiGarland, alt: 'Sri Ganapathy Sachchidananda Swamiji, garlanded',
      when: 'Born 26 May 1942, Jyeshtha Shuddha Ekadashi', s: '2026-05-24', e: '2026-05-31',
      text: 'Thousands of devotees gather every year. Sri Bala Swamiji performs Pratyaksha Paada Pooja to Sri Swamiji; wheelchairs, crutches, walkers and other support equipment are given to the physically challenged, and Annadaana is offered on a large scale.',
      y: '84th Birthday celebrations, 24–31 May, with the Pratyaksha Padapuja on 27 May (Adhika Jyeshtha Ekadashi).' },
  ],
  ashadha: [
    { name: 'Guru Purnima', icon: 'moon', tithi: 15, img: photos.guruParamparaPooja, alt: 'Garlanded portraits of the Guru Parampara arranged for worship',
      when: 'Ashadha Purnima, also called Vyasa Purnima', s: '2026-07-29', e: '2026-07-29',
      text: 'The Guru Parampara is specially worshipped. After the Guru Parampara Pooja and Vyasa Pooja, Sri Bala Swamiji begins His Chaturmasya Vrata Deeksha.',
      y: 'America Panchaashat Nadee Jala Samarpana for Sri Swamiji, Dallas, 29 July.', link: ['guru-parampara.html#guru-purnima', 'The Guru Parampara Pooja'] },
    { name: 'Chaturmasya Vrata Deeksha', icon: 'flame', when: 'From Guru Purnima, for four fortnights or four months',
      text: 'During the Chaturmasya Sri Bala Swamiji leads Yagnas and Homas, discourses on the Puranas and holy texts, extensive Annadana and free medical camps.',
      stat: ['1512', 'cases at the 2024 free medical camps'],
      y: 'In 2025 — the 22nd Chaturmasya — at Sripada Vallabha Anagha Datta Kshetram, Pithapuram, 10 July to 7 September.', yLabel: '2025' },
  ],
  shravana: [
    { name: 'Krishna Janmashtami', icon: 'sparkle', tithi: 23, when: 'Shravana Bahula Ashtami', y: 'Krishna Janmashtami Festival at the Mysuru Ashrama, 4 September.', s: '2026-09-04', e: '2026-09-04' },
    { name: 'Sri Narahari Teertha Swami Aradhana', icon: 'flame', when: 'In the lunar month of Shravana',
      text: 'Every year Sri Swamiji conducts the Aradhana of His father, Sri Narahari Teertha Swami (Narasimha Sastry).',
      y: 'Narahari Teertha Aradhana on 20 August at the Hanuman Temple, Datta Yoga Center, Erin, Canada.', s: '2026-08-20', e: '2026-08-20' },
    { name: 'Varamahalakshmi Vrata', icon: 'diya', when: 'A Friday in Shravana', y: 'Observed on 21 August at the Hanuman Temple, Datta Yoga Center, Erin, Canada, during Sri Swamiji’s visit.', s: '2026-08-21', e: '2026-08-21' },
  ],
  bhadrapada: [
    { name: 'Vinayaka Chaturthi', icon: 'temple', tithi: 4, img: P.ganapathy, alt: 'Sri Swamiji offers arati to an ornamented image of Lord Ganapathy',
      when: 'Bhadrapada Shuddha Chaturthi, after Swarna Gowri Vratam', s: '2026-09-13', e: '2026-09-14',
      y: 'Ganapathy Festival at SGS Ashrama, Vijayawada: Swarna Gowri Vratam on 13 September at 6 PM; on 14 September, Ksheerabhisheka to Kshipra Ganapathy Swami, Sahasra Modaka Ganapathy Homa and Varasiddhi Vinayaka Vratam.' },
    { name: 'Chaturmasya concludes', icon: 'book', tithi: 15, when: 'Bhadrapada Purnima',
      text: 'A Vijaya Yatra with all the disciples and devotees who kept the vrata. Before crossing a water body, everyone gathers to chant the 11th chapter of the Bhagavad Gita, Vishwarupa Sandarshana Yoga, and Gita books are given away.' },
  ],
  ashwayuja: [
    { name: 'Devi Navaratri', icon: 'lotus', tithi: 1, img: P.deviArati, alt: 'Sri Swamiji offers arati to Sri Rajarajeshwari Devi',
      when: 'Nine days from Ashwayuja Shuddha Pratipada — September or October', s: '2026-10-11', e: '2026-10-20',
      text: 'Sri Swamiji honours Mother Raja Rajeshwari with the Nava Avarana Puja. Each day begins around 8 AM with a procession from the Datta Temple to Nada Mantapa, then Kumari Puja, Sri Chakra Puja, Devi Homa and concerts, ending around 8:30 PM with Devi bhajans sung by Sri Swamiji.',
      y: 'Devi Navaratri Festival at Datta Peetham, Mysuru, 11–20 October.' },
  ],
  kartika: [
    { name: 'The Chaturmasya’s traditional close', icon: 'flame', when: 'Ashadha to Kartika',
      text: 'Taken as four months, the Chaturmasya vow runs from Ashadha (around July) to Kartika (around November). The Vedas also allow each month to be represented by a fortnight.' },
  ],
  margashirsha: [
    { name: 'Vaikuntha Ekadashi', icon: 'temple', tithi: 11, img: P.venkateshwara, alt: 'Sri Swamiji offers arati to Sri Venkateshwara and His consorts',
      when: 'Shuddha Ekadashi in Dhanurmasa — December or January', s: '2026-12-20', e: '2026-12-20',
      text: 'Several thousands of local people throng the Sri Datta Venkateshwara temple to take a glimpse of Lord Venkata Ramana Swamy on this most auspicious day.',
      y: '20 December at the Sri Datta Venkateswara Temple, Mysuru — with Gita Jayanti at Nada Mantapa.', link: ['darshan.html', 'Temples &amp; darshan'] },
    { name: 'Datta Jayanti', icon: 'diya', tithi: 15, img: photos.dattatreya, alt: 'Sri Swamiji offers arati to Lord Dattatreya',
      when: 'Margashirsha Purnima · three days in December', s: '2026-12-21', e: '2026-12-23',
      text: 'The incarnation day of Adi Guru Dattatreya: Abhisheka to the Dattatreya idol in the Universal Prayer Hall, memorial services, bhajans and a Shastra Sadas for scholars — and the one day in the year devotees may offer oil ablutions to the Moola virat.',
      y: '21–23 December at Datta Peetham, Mysuru, ending with Sahasra Kalasha Thailabhisheka on Datta Jayanti Purnima.' },
  ],
  pausha: [
    { name: 'New Year Darshana', icon: 'sun', when: '1 January — a fixed date', y: 'New Year Darshana at SGS Ashrama, Vijayawada.', s: '2026-01-01', e: '2026-01-01' },
  ],
  magha: [
    { name: 'Ratha Saptami', icon: 'sun', tithi: 7, when: 'Magha Shuddha Saptami', y: 'Ratha Saptami at SGS Ashrama, Kurnool, 25 January.', s: '2026-01-25', e: '2026-01-25' },
    { name: 'Maha Shivaratri', icon: 'moon', tithi: 29, img: P.shiva, alt: 'Sri Swamiji offers a lamp to the lingas of the Sarva Dosha Hara Shiva shrine', note: 'Photo: Sarva Dosha Hara Shiva, from the Sri Datta Venkateshwara Temple page — not the Shivaratri worship',
      when: 'Magha Bahula Chaturdashi · a night of vigil', s: '2026-02-15', e: '2026-02-15',
      text: 'On the eve, the Venkatamakhin Memorial and Tyagaraja Aradhana with mass singing of the Pancharatna kritis. On the night itself, Rudra Abhishekam to Sri Sachchidanandeshwara by Sri Swamiji, Sahasra Kalasha Abhishekam by devotees and Sangeeta Seva until late; at 3 AM Sri Swamiji’s discourse on Shiva, and Maha Mangala Arati around 6 AM.',
      y: 'Maha Shivaratri Festival at SGS Ashrama, Mysuru, 15 February.' },
  ],
  phalguna: [],
};

const FIXED = [
  [0, 'New Year', '1 Jan'],
  [13, 'Sri Bala Swamiji’s birthday', '14 Jan'],
  [145, 'Sri Swamiji’s birthday', '26 May'],
];

// --- wheel geometry: 0° = top (1 January), clockwise; one Gregorian year = 360°.
const L0 = 79; // Chaitra begins around 21 March (illustrative alignment)
const R = { ticks: 306, greg: 292, glabel: 270, band: 224, bandW: 44, mark: 184, arc: 166, arcLabel: 153, core: 140 };
const f2 = (n) => +n.toFixed(2);
const pt = (r, deg) => { const a = ((deg - 90) * Math.PI) / 180; return [f2(r * Math.cos(a)), f2(r * Math.sin(a))]; };
function arc(r, a0, a1, rev = false) {
  const [x0, y0] = pt(r, rev ? a1 : a0), [x1, y1] = pt(r, rev ? a0 : a1);
  return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} ${rev ? 0 : 1} ${x1} ${y1}`;
}
const GSTART = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const doyDeg = (d) => (d / 365) * 360;

function wheel() {
  const ticks = Array.from({ length: 108 }, (_, i) => {
    const a = (i * 360) / 108, [x0, y0] = pt(R.ticks - (i % 9 ? 0 : 5), a), [x1, y1] = pt(R.ticks + 4, a);
    return `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"/>`;
  }).join('');
  const gm = GSTART.map((d, m) => {
    const a = doyDeg(d), [x0, y0] = pt(R.greg - 7, a), [x1, y1] = pt(R.greg + 7, a);
    const [lx, ly] = pt(R.glabel, doyDeg(d + (m === 1 ? 14 : 15)));
    return `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"/><text x="${lx}" y="${ly}">${MON[m]}</text>`;
  }).join('');
  const fixed = FIXED.map(([d, n]) => {
    const [x, y] = pt(R.greg, doyDeg(d));
    return `<rect x="${f2(x - 5)}" y="${f2(y - 5)}" width="10" height="10" transform="rotate(45 ${x} ${y})"><title>${n}</title></rect>`;
  }).join('');
  const defs = [], segs = [], labels = [], marks = [];
  LUNAR.forEach(([id, name], i) => {
    const s = L0 + i * 30, c = (s + 15) % 360, bottom = c > 90 && c < 270;
    const has = FEST[id].length > 0;
    segs.push(`<path class="fy-seg${has ? ' has-fest' : ''}" data-month="${id}" style="--i:${i}" pathLength="1" d="${arc(R.band, s + 0.7, s + 29.3)}"/>`);
    defs.push(`<path id="fy-lp-${i}" d="${arc(R.band, s + 1, s + 29, bottom)}"/>`);
    labels.push(`<text class="fy-label" data-month="${id}" dy="${bottom ? 5 : 5}"><textPath href="#fy-lp-${i}" startOffset="50%">${name}</textPath></text>`);
    FEST[id].filter((f) => f.tithi).forEach((f) => {
      const [x, y] = pt(R.mark, s + f.tithi - 0.5);
      marks.push(`<circle class="fy-mark" data-month="${id}" cx="${x}" cy="${y}" r="5.5" style="--i:${marks.length}"><title>${f.name}</title></circle>`);
    });
  });
  // Chaturmasya: Guru Purnima (Ashadha 15) → Bhadrapada Purnima; Navaratri: Ashwayuja 1–9.
  const cs = L0 + 3 * 30 + 14.5, ce = L0 + 5 * 30 + 14.5, ns = L0 + 6 * 30 + 0.5, ne = L0 + 6 * 30 + 9.5;
  defs.push(`<path id="fy-lp-cm" d="${arc(R.arcLabel, cs, ce, true)}"/>`);
  return `<svg class="fy-wheel" viewBox="-320 -320 640 640" role="img" aria-labelledby="fy-wheel-t fy-wheel-d">
  <title id="fy-wheel-t">The festival year: the twelve lunar months set against the Gregorian year</title>
  <desc id="fy-wheel-d">Illustrative wheel. The outer ring is the Gregorian year from January at the top, with fixed dates: New Year on 1 January, Sri Bala Swamiji’s birthday on 14 January and Sri Swamiji’s birthday on 26 May. The inner ring shows Chaitra to Phalguna at an approximate alignment, with dots for the festivals of each month and an arc for the Chaturmasya, from Guru Purnima to Bhadrapada Purnima.</desc>
  <defs>${defs.join('')}<radialGradient id="fy-core-g"><stop offset="0" stop-color="#1b3129"/><stop offset="1" stop-color="#0a1310"/></radialGradient></defs>
  <g class="fy-ticks">${ticks}</g>
  <circle class="fy-greg" r="${R.greg}" pathLength="1" transform="rotate(-90)"/>
  <path class="fy-sofar" pathLength="1" d="${arc(R.greg, 0, 359.9)}"/>
  <g class="fy-gmonths">${gm}</g>
  <g class="fy-fixed">${fixed}</g>
  <g class="fy-segs">${segs.join('')}</g>
  <g class="fy-labels">${labels.join('')}</g>
  <path class="fy-arc fy-arc-cm" pathLength="1" d="${arc(R.arc, cs, ce)}"/>
  <path class="fy-arc fy-arc-nv" pathLength="1" d="${arc(R.arc, ns, ne)}"/>
  <text class="fy-arclabel"><textPath href="#fy-lp-cm" startOffset="50%">Chaturmasya</textPath></text>
  <g class="fy-marks">${marks.join('')}</g>
  <g class="fy-bead"><circle r="${R.band}" fill="none"/><circle cx="${pt(R.band, L0)[0]}" cy="${pt(R.band, L0)[1]}" r="3.2"/></g>
  <g class="fy-today" data-fy-today><line x1="0" y1="${-R.greg - 16}" x2="0" y2="${-R.greg + 9}"/><circle cx="0" cy="${-R.greg}" r="6"/></g>
  <circle class="fy-core" r="${R.core}" fill="url(#fy-core-g)"/>
  <circle class="fy-core-ring" r="${R.core - 10}"/>
  <text class="fy-cname" y="2" data-fy-cname>The festival year</text>
  <text class="fy-csub" y="34" data-fy-csub>Chaitra to Phalguna</text>
</svg>`;
}

function festItem(f) {
  return `<article class="fy-fest${f.img ? ' has-img' : ''}">
  ${f.img ? `<div class="fy-fimg">${img(f.img, f.alt)}</div>` : `<span class="fy-ficon">${icon(f.icon, 24)}</span>`}
  <div class="fy-fbody">
    <h4>${f.name}</h4>
    <p class="fy-when">${f.when}</p>
    ${f.text ? `<p>${f.text}</p>` : ''}
    ${f.stat ? `<p class="fy-stat"><b data-count="${f.stat[0]}">${Number(f.stat[0]).toLocaleString('en-IN')}</b><span>${f.stat[1]}</span></p>` : ''}
    ${f.y ? `<p class="fy-year"${f.s ? ` data-fest-start="${f.s}" data-fest-end="${f.e}"` : ''}><span class="fy-ylabel">${f.yLabel || '2026'}</span><span>${f.y}</span></p>` : ''}
    ${f.link ? `<a class="ev-more" href="${f.link[0]}">${f.link[1]} ${icon('arrow', 14)}</a>` : ''}
    ${f.note ? `<p class="fy-pnote">${icon('camera', 14)}<span>${f.note}</span></p>` : ''}
  </div>
</article>`;
}

function panel([id, name, greg]) {
  const list = FEST[id];
  return `<article class="fy-panel" id="fy-p-${id}" data-month="${id}" aria-labelledby="fy-h-${id}">
  <header class="fy-phead"><h3 id="fy-h-${id}">${name}</h3><span>about ${greg.replace(' – ', ' to ')}</span></header>
  ${list.length ? list.map(festItem).join('') : `<p class="fy-quiet">${icon('moon', 18)}<span>No festival in ${name} is described on the dattapeetham.org pages this guide is drawn from. Daily worship, bhajans and discourses continue — see the <a href="${links.calendar}"${ext}>official calendar</a> for the year’s programmes.</span></p>`}
</article>`;
}

const festivalsSection = `<section id="festivals" class="section section-dark grain ev-year">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'The festival year',
      title: 'Twelve months, one <span class="em-light">sacred cycle</span>',
      lead: 'The Ashram’s festivals follow the Hindu lunar calendar — the Panchanga — so they move against the Gregorian calendar from year to year. Choose a month to see what is celebrated.',
      light: true,
    })}
    <div class="fy-ribbon" role="radiogroup" aria-label="Lunar month" data-fy-ribbon>
      ${LUNAR.map(([id, name, greg]) => `<button type="button" role="radio" aria-checked="false" tabindex="-1" data-month="${id}" aria-controls="fy-p-${id}">
        <b>${name}</b><small>${greg}</small>${FEST[id].length ? '<i class="fy-dot" aria-hidden="true"></i>' : ''}
      </button>`).join('')}
    </div>
    <div class="fy-grid">
      <figure class="fy-fig" data-reveal="fade" data-progress="0.95,0.15">
        ${wheel()}
        <figcaption>
          <ul class="fy-legend">
            <li><i class="lg-fest"></i>Festival</li>
            <li><i class="lg-fixed"></i>Fixed date</li>
            <li><i class="lg-cm"></i>Chaturmasya</li>
            <li data-fy-today-key hidden><i class="lg-today"></i>Today</li>
          </ul>
          <p><b>Illustrative, not a calendar.</b> Lunar months are shown against an approximate Gregorian span; the real alignment shifts every year. Dates follow the Panchanga — <a href="${links.calendar}"${ext}>see the official calendar</a>.</p>
        </figcaption>
      </figure>
      <div class="fy-panels" data-fy-panels aria-live="polite">
        ${LUNAR.map(panel).join('')}
      </div>
    </div>
    <div class="fy-foot" data-reveal="up">
      <div>
        <h3>Also in the Peetham’s event archive</h3>
        <p>Datta Venkateshwara Brahmotsavam · Anaghashtami Vratam · Sri Datta Vijayananda Teertha Swamiji’s Chaturmasya Deeksha · Sri Swamiji’s tours in India, Europe, the USA and beyond. Their dates follow the Panchanga and the calendar.</p>
      </div>
      <div class="btn-row">
        ${btn('Events archive', links.eventsArchive, 'ghost', 'arrow-up-right', ext)}
        ${panchangam ? btn('SGS Panchangam app', panchangam.href, 'ghost', 'mobile', ext) : ''}
      </div>
    </div>
  </div>
</section>`;

// ---------------------------------------------------------------------------
// regular programmes

const programmesSection = `<section id="programmes" class="section ev-prog">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'Regular programmes',
      title: 'The rhythm of <span class="em-light">Ashram life</span>',
      lead: 'Between the great festivals the Mysuru Ashram keeps a steady rhythm of worship, music and teaching — through the day, the week and the year.',
    })}
    <div class="pg-day" data-reveal="up">
      <div class="pg-dayhead"><span class="eyebrow">Every day</span><h3>From the Sri Chakra Puja to evening bhajans</h3></div>
      ${processSteps([
        ['Sri Chakra Puja', 'Around 8 AM, performed by Sri Swamiji or Sri Bala Swamiji when in town. Devotees may also sponsor rituals such as Homa and Tailabhishekam.'],
        ['Teertha', 'Traditional holy water is offered after the Sri Chakra Puja.'],
        ['Datta Kriya Yoga', 'Devotees gathered in the Universal Prayer Hall practise Pranayama or a Mudra.'],
        ['Evening bhajans', 'Divya Naama Sankeertana every evening for at least one and a half hours, led by Sri Swamiji and elder members of the Ashram.'],
      ])}
    </div>
    <div class="pg-cards" data-stagger>
      <article class="pg-card"><span class="pg-icon">${icon('book', 26)}</span><span class="tag">Daily discourse</span><h3>Yoga Vasistham</h3><p>Sri Bala Swamiji gives daily lectures on the Yoga Vasistham, in Kannada and Telugu.</p></article>
      <article class="pg-card"><span class="pg-icon">${icon('namaste', 26)}</span><span class="tag">Sundays</span><h3>Darshana &amp; bhajans</h3><p>Sri Swamiji gives darshana on Sunday mornings when in town, and large numbers of devotees come from great distances to sing with Him.</p></article>
      <article class="pg-card"><span class="pg-icon">${icon('diya', 26)}</span><span class="tag">Every month</span><h3>Narasimha Kalyana</h3><p>${narasimhaKalyana.text}</p><a class="ev-more" href="${narasimhaKalyana.href}"${ext}>Participate ${icon('arrow-up-right', 14)}</a></article>
      <article class="pg-card"><span class="pg-icon">${icon('yoga', 26)}</span><span class="tag">Through the year</span><h3>Camps &amp; seminars</h3><p>Yoga camps, music concerts for meditation and healing, debates, seminars and sports events for all age groups.</p></article>
    </div>
    <div class="pg-camp" data-reveal="up">
      <div class="pg-camp-media">${img(photos.balaSwamijiSpeech, 'Sri Bala Swamiji, smiling, speaks at a microphone')}</div>
      <div class="pg-camp-body">
        <span class="eyebrow">Seva camps · Chaturmasya</span>
        <h3>Discourses, Annadana and free medical camps</h3>
        <p>Every year from Guru Purnima, Sri Bala Swamiji observes the Chaturmasya Vrata Deeksha, offering its fruits for universal peace and welfare. Through the period He gives discourses and leads Annadana and free medical camps — including cancer screening for women over 40.</p>
        <dl class="pg-stats" data-stagger>
          <div><dt data-count="1512">1,512</dt><dd>cases at the 2024 free medical camps</dd></div>
          <div><dt data-count="35">35</dt><dd>eye check-ups</dd></div>
          <div><dt data-count="31">31</dt><dd>dental procedures</dd></div>
        </dl>
        <div class="btn-row">
          ${btn('SGS Hospital &amp; camps', 'seva.html#hospital', 'line', 'arrow')}
          ${btn('Speeches archive', links.speeches, 'line', 'arrow-up-right', ext)}
        </div>
        <p class="pg-note">Speeches of Sri Swamiji and Sri Bala Swamiji are archived as <a href="${links.dattaVaakya}"${ext}>Datta Vaakya</a> and <a href="${links.vijayaVyakhya}"${ext}>Vijaya Vyakhya</a>.</p>
      </div>
    </div>
  </div>
</section>`;

// ---------------------------------------------------------------------------
// Raga Sagara concerts on the 2026 calendar

const CONCERTS = [
  ['2026-01-15', 'Sri Sankranti Raga Sagara', 'Tenali'],
  ['2026-01-24', 'Surya Prabha Ragasagara', 'Kurnool'],
  ['2026-03-21', 'Bhagyalakshmi Ragasagara', 'Gachibowli Stadium, Hyderabad · 9 AM'],
  ['2026-04-19', 'Indraprastha Ragasagara', 'Bharat Mantapam, New Delhi'],
  ['2026-04-25', 'Sri Swamiji’s music concert', 'Athens, Greece'],
  ['2026-08-15', 'Niagara Raga Sagara', 'Oakes Garden Theatre, Niagara (Canada side)'],
  ['2026-08-29', 'Datta Venu Raga Sagara', 'Stadtcasino Basel, Switzerland · 7 PM'],
  ['2026-11-29', 'Japan Ragasagara', 'Nara Kasugano International Forum, Nara · 5 PM onwards'],
];
const STILL_ALT = [
  'Concert image for Adi Guru Raga Sagara, Music for Meditation, SGS Ashrama, Chennai, 15 April 2025, showing Sri Swamiji at the keyboard',
  'Sri Swamiji at the keyboard before garlanded deities — Vishwavasu Raga Sagara',
  'Sri Swamiji on a stage set with snow-capped peaks, raising a staff — Antar Mukha Raga Sagara',
  'Sri Swamiji at the keyboard before a waterfall backdrop — Krishnamrutha Raga Sagara',
];
const bars = Array.from({ length: 56 }, (_, i) => f2(0.18 + 0.82 * Math.abs(Math.sin(i * 0.41) * Math.cos(i * 0.13 + 0.6))));

const concertsSection = `<section id="concerts" class="section section-dark ev-concerts">
  <div class="wrap">
    <div class="ec-grid">
      <div class="ec-intro">
        ${sectionHead({
          eyebrow: 'Music for Meditation &amp; Healing',
          title: 'Raga Sagara <span class="em-light">concerts</span>',
          lead: 'In 2026 Sri Swamiji’s Raga Sagara — music for meditation and healing — travels from Tenali and New Delhi to Niagara, Basel and Nara, with a music concert in Athens. Every date here is from the official calendar.',
          align: 'left', light: true,
        })}
        <article class="ec-next glass" data-reveal="up" data-start="2026-11-29" data-end="2026-11-29">
          <span class="ec-nlabel" data-ec-label>Next concert</span>
          <h3>Japan Ragasagara</h3>
          <p class="ec-nwhen"><time datetime="2026-11-29T17:00+09:00">Sun 29 Nov 2026 · 5 PM onwards</time></p>
          <p>Nara Kasugano International Forum, Nara — during Pujya Swamiji’s programmes in Nara, 25 November to 2 December.</p>
          <div class="ec-wave" aria-hidden="true">${bars.map((h, i) => `<i style="--h:${h};--i:${i}"></i>`).join('')}</div>
          <a class="ev-more" href="${EXT.japan}"${ext}>japanragasagara.com ${icon('arrow-up-right', 14)}</a>
        </article>
      </div>
      <div class="ec-listwrap">
        <h3 class="ec-sub">On the 2026 calendar</h3>
        <ol class="ec-list" data-progress="0.85,0.4">
          <span class="ec-track" aria-hidden="true"><i></i></span>
          ${CONCERTS.map(([d, t, p], i) => {
            const a = parse(d);
            return `<li class="ec-row" style="--i:${i}" data-start="${d}" data-end="${d}">
            <span class="ec-node" aria-hidden="true"></span>
            <time datetime="${d}"><b>${a.d}</b><span>${MON[a.m]}</span></time>
            <div><h4 data-label="Next">${t}</h4><p>${p}</p></div>
          </li>`;
          }).join('')}
        </ol>
      </div>
    </div>
    <div class="ec-stills-head">
      <h3 class="ec-sub">From earlier concerts</h3>
      <div class="btn-row">
        ${btn('Healing music', 'music.html#concerts', 'ghost', 'arrow')}
        ${btn('My concert bookings (sign in)', links.concerts, 'ghost', 'arrow-up-right', ext)}
      </div>
    </div>
    <ul class="ec-stills" data-stagger>
      ${concerts.map((c, i) => `<li><a class="ec-still" href="${c.href}"${ext}>
        ${img(c.img, STILL_ALT[i] || c.name)}
        <span><b>${c.name}</b><small>On dattapeetham.org · sign-in may be needed</small></span>
      </a></li>`).join('')}
    </ul>
  </div>
</section>`;

// ---------------------------------------------------------------------------
// TV telecast timings (as listed on the Peetham's page; no days are given)

const TV = [
  ['Sakshi TV', 'Telugu', 340],
  ['ETV', 'Telugu', 370],
  ['Suvarna News', 'Kannada', 405],
  ['SVBC', 'Kannada', 1200],
  ['Aastha', 'Hindi', 1300],
];
const clock = (m) => { const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`; };

const tvSection = `<section id="tv" class="section section-paper ev-tv">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'On television',
      title: 'Sri Swamiji’s programmes <span class="em-light">on TV</span>',
      lead: 'Telecast timings of Sri Swamiji’s programmes on five channels, in Telugu, Kannada and Hindi.',
    })}
    <div class="tv-day" data-reveal="up" aria-hidden="true">
      <div class="tv-sky"></div>
      ${[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => `<span class="tv-hour" style="--x:${(h / 24) * 100}%">${h === 24 ? '' : clock(h * 60).replace(':00', '')}</span>`).join('')}
      ${TV.map(([n, , m], i) => `<span class="tv-mark ${m < 720 ? 'am' : 'pm'}" style="--x:${f2((m / 1440) * 100)}%;--lvl:${m < 720 ? 2 - i : i - 3};--i:${i}"><i></i><b>${clock(m)}</b><span class="tv-mname"> ${n}</span></span>`).join('')}
      <span class="tv-now" data-tv-now hidden><i></i><b data-tv-now-label>Now</b></span>
    </div>
    <ul class="tv-list" data-stagger>
      ${TV.map(([n, l, m]) => `<li class="tv-card">
        <span class="tv-time"><time>${clock(m)}</time></span>
        <span class="tv-chan"><b>${n}</b><small>${l}</small></span>
        ${icon('video', 22)}
      </li>`).join('')}
    </ul>
    <p class="notice tv-notice">${icon('info', 18)}<span>Timings as listed on the Peetham’s <a href="${EXT.tv}"${ext}>Telecast timing of Sri Swamiji’s Programs</a> page, which does not give days. Please confirm with your channel’s schedule. Videos are also on the <a href="${links.youtube}"${ext}>Peetham’s YouTube</a>.</span></p>
  </div>
</section>`;

// ---------------------------------------------------------------------------
// stay connected

const stayCard = (ic, eb, title, text, href, cta, media = '') => `<a class="st-card" href="${href}"${ext}>
  ${media || `<span class="st-icon">${icon(ic, 28)}</span>`}
  <span class="tag">${eb}</span>
  <b>${title}</b>
  <span class="st-text">${text}</span>
  <span class="st-cta">${cta} ${icon('arrow-up-right', 15)}</span>
</a>`;

const staySection = `<section id="updates" class="section section-sand ev-stay">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'Stay connected',
      title: 'Never miss a <span class="em-light">celebration</span>',
      lead: 'Photographs of past festivals and tours, alerts for what is next, and the Panchanga in your pocket — all on the Peetham’s own platforms.',
    })}
    <div class="st-grid" data-stagger>
      ${stayCard('photo', 'Events archive', 'Festival &amp; tour photographs', 'Event photos, Sri Swamiji’s tour photos, festival photos and more — year by year, from 1996 to 2026.', links.eventsArchive, 'Browse the archive')}
      ${stayCard('mail', 'Notifications', 'Email &amp; SMS alerts', 'Subscribe to Datta Peetham email and SMS notifications on the official site, and unsubscribe whenever you wish.', links.subscribe, 'Subscribe')}
      ${panchangam ? stayCard('mobile', 'Mobile app', 'SGS Panchangam', 'Festival dates follow the Panchanga. The Peetham publishes its own SGS Panchangam app on the App Store.', panchangam.href, 'On the App Store', `<span class="st-app">${img(panchangam.icon, 'SGS Panchangam app icon')}</span>`) : ''}
    </div>
  </div>
</section>`;

// ---------------------------------------------------------------------------

// Event structured data, for the events still ahead on the day of the build
// (Mysuru time): rebuild after the calendar changes or an event passes, and
// past events drop out. Each venue's address is as the sources give it: the
// Ashram's own (src/site.mjs), "Nara, Japan" from the calendar, and
// "Ganagapura, Karnataka, India" from the centre directory.
const ASHRAM_ADDRESS = { '@type': 'PostalAddress', streetAddress: site.address.street, addressLocality: site.address.city, addressRegion: site.address.region, postalCode: site.address.postal, addressCountry: site.address.country };
const VENUE_ADDRESS = {
  'Nara, Japan': { '@type': 'PostalAddress', addressLocality: 'Nara', addressCountry: 'JP' },
  'Vishwaroopa Datta Kshetra, Ganagapura': { '@type': 'PostalAddress', addressLocality: 'Ganagapura', addressRegion: 'Karnataka', addressCountry: 'IN' },
};
const venueAddress = (where) => VENUE_ADDRESS[where] || (/,\s*Mysuru$/.test(where) ? ASHRAM_ADDRESS : undefined);
const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

const eventLd = COMING.filter((c) => c.where && c.e >= TODAY).map((c) => ({
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: c.title.replace(/&amp;/g, '&'),
  startDate: c.s,
  endDate: c.e,
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  location: { '@type': 'Place', name: c.where.replace(/&amp;/g, '&'), ...(venueAddress(c.where) ? { address: venueAddress(c.where) } : {}) },
  organizer: { '@type': 'Organization', name: 'Avadhoota Datta Peetham', url: `${site.origin}/` },
  url: `${site.origin}/events.html#${eventId(c)}`,
}));

export default {
  slug: 'events',
  file: 'events.html',
  title: 'Events & Festivals',
  crumb: 'Events & Festivals',
  nav: 'Darshan & Puja',
  description: 'Festivals, Raga Sagara concerts, discourses and seva camps at Avadhoota Datta Peetham: the 2026 calendar, the festival year by lunar month and TV timings.',
  image: P.hero,
  preload: P.hero,
  css: true,
  scripts: ['events'],
  jsonLd: eventLd,
  render: () => `
${pageHero({
  eyebrow: 'Events &amp; Programmes',
  title: 'Events &amp; <span class="em-light">Festivals</span>',
  lead: 'Join us for divine discourses, music concerts, Vedic programmes and special celebrations — at the Mysuru Ashram and wherever Sri Swamiji travels.',
  image: P.hero,
  pos: 'center 38%',
  crumb: 'Events &amp; Festivals',
  actions: `${btn('What’s coming up', '#calendar', 'gold', 'calendar')}${btn('Official calendar', links.calendar, 'ghost', 'arrow-up-right', ext)}`,
  tiles: [
    { icon: 'calendar', title: 'Calendar 2026', note: 'Dates &amp; places', href: '#calendar' },
    { icon: 'diya', title: 'Festival Year', note: 'Month by month', href: '#festivals' },
    { icon: 'book', title: 'Programmes', note: 'Daily &amp; weekly', href: '#programmes' },
    { icon: 'music', title: 'Concerts', note: 'Raga Sagara', href: '#concerts' },
    { icon: 'video', title: 'On TV', note: 'Telecast timings', href: '#tv' },
  ],
})}
${calendarSection}
${festivalsSection}
${programmesSection}
${concertsSection}
${tvSection}
${staySection}
${ctaBand({
  title: 'Celebrate with the <span class="em-light">Ashram</span>',
  text: 'Plan a visit for a festival, or take part from wherever you are by booking a puja on the Peetham’s own system.',
  image: photos.swamijiHoma,
  actions: `${btn('Book a Puja', links.poojas, 'gold', 'arrow-up-right', ext)}${btn('Plan your visit', 'visit.html', 'ghost', 'arrow')}`,
})}
`,
};
