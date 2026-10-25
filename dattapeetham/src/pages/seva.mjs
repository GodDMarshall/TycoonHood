// Pillars of Service — Seva at Avadhoota Datta Peetham.
// Modelled on the reference's "Our Pillars of Service" band, expanded into a
// full page: Goshala, Veda Pathashala, SGS Hospital, Nitya Annadana, Nature
// (Shuka Vana & Bonsai), SDHS volunteers and donations.
//
// Sources (harvested 22 Oct 2026): dattapeetham.org/page/view/sgs-hospital,
// /sgs-veda-pathashala, /social-activities, /contribution-towards-nature,
// /sdhs-volunteers, /shuka-vana, /bonsai-garden, /about-us, /donations (recipient ids
// 4, 6, 11, 13, 15, 19, 20 each checked with Nimble on 22 Oct 2026),
// /calendar (SDHS camp), the homepage Kamadhenu / Pathashala / Hospital block
// (src/legacy-homepage.html) and data.timeline (1978, 1985, 1986, 2005, 2012).

import { pageHero, pillarsPanel, sectionHead, split, frame, stats, card, btn, img, icon, scrollLit, thread } from '../components.mjs';
import { site, links, OFFICIAL, PAGE_IMG } from '../site.mjs';
import { photos, pillars, latestSevas } from '../data.mjs';
import { lampChain, pushpanjali, DV_HOST } from '../features/devotion-motion.mjs';

const P = {
  prakrutiPuja: `${PAGE_IMG}518/518_3afb42ae5333fe82.jpg`,
  pathashalaClass: `${PAGE_IMG}529/529_c0e2947cb6606657.jpg`,
  vedaSabha: `${PAGE_IMG}514/514_6a747f84068c1524.jpg`,
  hospitalBuilding: `${PAGE_IMG}507/507_2e1ee951ada4cb2e.jpg`,
  polyclinic: `${PAGE_IMG}507/507_3b84f66cd87e6c59.jpg`,
  annadana: `${PAGE_IMG}516/516_2d522eb6783cea2d.jpg`,
  foodGrains: `${PAGE_IMG}516/516_90f2ada10257f568.jpg`,
  shukaRecord: `${PAGE_IMG}518/518_dc50e08d3e9b68eb.png`,
  bonsaiGarden: `${PAGE_IMG}504/504_0ec527dbfb1dd0a2.jpg`,
  sdhsParade: `${PAGE_IMG}512/512_2ba4f2446543d71a.jpg`,
  sdhsCamp: `${PAGE_IMG}512/512_b7f437033ed03d4a.jpg`,
};

const EXT = {
  social: `${OFFICIAL}/page/view/social-activities`,
  hospital: `${OFFICIAL}/page/view/sgs-hospital`,
  pathashala: `${OFFICIAL}/page/view/sgs-veda-pathashala`,
  nature: `${OFFICIAL}/page/view/contribution-towards-nature`,
  sdhs: `${OFFICIAL}/page/view/sdhs-volunteers`,
  sdhsFacebook: 'https://www.facebook.com/SriDattaHumaneServices/',
  bhaktimala: 'mailto:bhaktimala@sgstech.cc',
  bhaktimalaOffice: 'contact.html#reach-us',
};

// Each donation recipient has its own ashram_id on dattapeetham.org/donations;
// the id preselects that recipient ("Ashrama selected: …").
const donate = (id) => `${OFFICIAL}/donations?ashram_id=${id}`;
const DONATE = {
  main: links.donations, // ashram_id=4, Avadhoota Datta Peetham, Mysore (Main)
  templeSdv: donate(6),
  gandluru: donate(11),
  dkyic: donate(13),
  guruKanika: donate(15),
  hospital: donate(19),
  annadana: donate(20), // SJMNAT: INR only
};

const X = ' data-external';
const gauPooja = latestSevas.find((s) => s.title === 'Gau Pooja');

// The six seva sections on this page, in order (hero tiles + section numbers).
const sevas = [
  { id: 'goshala', icon: 'cow', title: 'Goshala', note: 'Gau Seva' },
  { id: 'pathashala', icon: 'book', title: 'Pathashala', note: 'Vedic education' },
  { id: 'hospital', icon: 'medical', title: 'SGS Hospital', note: 'Free healthcare' },
  { id: 'annadana', icon: 'heart-hand', title: 'Annadana', note: 'Free meals daily' },
  { id: 'nature', icon: 'bird', title: 'Nature', note: 'Shuka Vana & Bonsai' },
  { id: 'volunteer', icon: 'namaste', title: 'Volunteer', note: 'Join the SDHS' },
];
const num = (id) => String(sevas.findIndex((s) => s.id === id) + 1).padStart(2, '0');

// Numbered small-caps eyebrow that opens each seva section.
const index = (id, label, light = false) => `<span class="seva-index${light ? ' is-light' : ''}"><i>${num(id)}</i><span>${label}</span></span>`;


const gauSevas = [
  { title: 'Care for Cow', note: 'Medical care for cows', icon: 'medical', href: links.donations },
  { title: 'Daily Gau Seva', note: 'Goshala maintenance', icon: 'cow', href: links.donations },
  { title: 'Gau Pooja', note: 'Worship of Gau Mata', icon: 'flame', href: gauPooja ? gauPooja.href : links.poojas },
];

const studies = [
  { title: 'Vedic Studies', icon: 'book', img: photos.smallStudents, alt: 'Two young students of the Pathashala chanting', text: 'All four Vedas, five branches, the Smartas of two Vedas and the Tarka Vedanta Shastras. The Shuklayajurveda Kanva branch was added in 2018.' },
  { title: 'Spiritual Practice', icon: 'diya', img: photos.dhyana, alt: 'Three Pathashala students chanting before the shrine', text: 'Daily rituals, meditation and chanting to connect with the divine. Veda Parayanas are held regularly, and a Priest Training Centre serves the wider community.' },
  { title: 'Modern Education', icon: 'school', img: photos.students, alt: 'Senior students of the Veda Pathashala seated together', text: 'A balanced curriculum that includes modern subjects. Sri Swamiji asks students to savour the wisdom of the Vedas while pursuing the branches of modern study.' },
];

const learning = [
  ['National Veda examinations', 'Held every year before Sri Swamiji’s birthday celebrations in May, in all four Vedas. Students from across India take part, and those who excel are honoured by the Peetham.'],
  ['1,800+ students supported', 'Pre-school and high-school students, since the Peetham took over and improved two dilapidated schools in 1989 — plus furniture, infrastructure and toilets for impoverished schools.'],
  ['SGS Vagdevi Integrated School', 'Run by SGS Ashram, Girinagar, Bengaluru for communication-impaired children: diagnosis and intervention from infant stimulation to vocational training.'],
  ['Free summer camp', 'For Mysuru’s children: shlokas, social-responsibility awareness, lectures and Datta Kriya Yoga, with Bala Datta classes for the youngest.'],
];

const milestones = [
  ['Mid-1970s', 'A small dispensary opens in the Ashram, where a visiting physician treats minor ailments.'],
  ['Late 1970s', 'The “Humanity Service Center” is established in a new building, now known as Manipadma Kuteera. Sri Swamiji’s timeline dates the inauguration of SGS Hospital, to provide free medical services, to 1978.'],
  ['Early 1990s', 'Medical services expand to the Swami Narahari Teertha Complex, renamed SGS Hospital, Holistic Health Centre.'],
  ['2012', 'In Sri Swamiji’s 70th birth year, the free SGS Hospital Polyclinic Day Care Centre (Allopathy) opens in a new building.'],
];

const units = [
  ['SGS Ayurvedic Hospital', 'Free daily outpatient consultation and counselling. Inpatients receive Panchakarma and other treatments for chronic ailments, with six special rooms, general wards and a ‘Pathya’ diet.'],
  ['SGS Allopathy Polyclinic', 'Internal Medicine, Pediatrics, Gynaecology, Cardiology, Orthopedics, Dental Care, ENT and Eye Care, emergency care and minor surgery — with free consultation, counselling and medicines.'],
  ['Jayalakshmi Anusandhana Chikitsalaya', 'Rehabilitation for children with Erb’s palsy, cerebral palsy, autism or delayed development, from as early as six weeks, combining Ayurveda and Physiotherapy.'],
  ['Physiotherapy', 'Electrotherapy, exercise therapy, massage and manipulative therapy, with rehabilitation after fractures, joint replacement and laminectomy.'],
];

const camps = ['Cancer screening &amp; Mammography', 'Dental', 'Asthma &amp; Allergic Disorders', 'Cardiac Screening', 'Cataract Screening', 'Orthopedic'];

const sdhsServices = [
  ['medical', 'Medical camps &amp; health', 'Free check-ups, Pulse-Polio drives, blood donation camps, and stretchers and support equipment for the differently abled.'],
  ['school', 'Educational support', 'Scholarships, school supplies and infrastructure for students from economically weaker sections.'],
  ['heart-hand', 'Disaster relief', 'Relief materials and rehabilitation during natural calamities such as floods, earthquakes and pandemics.'],
  ['tree', 'Environmental initiatives', 'Tree-plantation drives, cleanliness campaigns and awareness programmes on conservation.'],
  ['bird', 'Animal welfare', 'Care for abandoned and injured animals through shelters and veterinary services.'],
  ['temple', 'Community events', 'Service to pilgrims during major socio-religious community events.'],
];

// Recipients listed on dattapeetham.org/donations (ashram picker), Oct 2026.
const funds = [
  ['temple', 'Avadhoota Datta Peetham, Mysore (Main)', 'Sri Ganapathy Sachchidananda Ashrama, Datta Nagar, Mysuru', DONATE.main],
  ['heart-hand', 'Sri Jayalakshmi Matha Nitya Annadana Trust', 'SJMNAT · PAN AAATS5046G · INR only', DONATE.annadana],
  ['medical', 'SGS Hospitals, Mysore', 'Tel +91 (0821) 2488888 · sevas@dattapeetham.org', DONATE.hospital],
  ['lotus', 'Guru Kanika', 'Avadhoota Datta Peetham, Datta Nagar, Mysuru', DONATE.guruKanika],
  ['diya', 'Sri Datta Venkateswara Temple, Mysore', 'Datta Nagar, Mysuru · Tel +91 821 248 3200', DONATE.templeSdv],
  ['yoga', 'Datta Kriya Yoga International Centre', 'Avadhoota Datta Peetham, Datta Nagar, Mysuru', DONATE.dkyic],
  ['sun', 'Jayalakshmi Puram (Gandluru Trust)', 'SGS Ashramam, Jayalakshmipuram (Bommeparti), Anantapur Dt., Andhra Pradesh', DONATE.gandluru],
];

const ways = [
  { icon: 'heart-hand', title: 'Donate', note: 'Choose a fund', href: links.donations },
  { icon: 'flame', title: 'Book a puja', note: 'Participate online', href: links.poojas },
  { icon: 'namaste', title: 'Volunteer', note: 'Join the SDHS', href: '#volunteer' },
  { icon: 'book', title: 'Subscribe', note: 'Bhaktimala magazine', href: 'teachings.html#bhaktimala' },
];

const isExt = (href) => /^https?:|^mailto:/.test(href);

function render() {
  return `
${pageHero({
  eyebrow: 'Seva · Service to all beings',
  title: 'Pillars of <span class="em-light">Service</span>',
  lead: 'From the Goshala and the Veda Pathashala to SGS Hospital, daily Annadana and the birds of Shuka Vana, the Peetham serves humanity without the barricades of caste, creed, race or religion.',
  image: P.prakrutiPuja,
  pos: '72% 50%',
  crumb: 'Seva',
  actions: btn('Donate', links.donations, 'gold', 'arrow-up-right', X) + btn('Volunteer with SDHS', '#volunteer', 'ghost', 'arrow'),
  tiles: sevas.map((s) => ({ icon: s.icon, title: s.title, note: s.note, href: `#${s.id}` })),
  // quickTiles() labels every row "Quick links", which the utility bar also uses.
}).replace('class="quick-tiles overlap" aria-label="Quick links"', 'class="quick-tiles overlap" aria-label="On this page"')}

<section id="pillars" class="section seva-pillars" aria-labelledby="pillars-h">
  <div class="wrap">
    ${pillarsPanel(pillars, { lead: 'Avadhoota Datta Peetham provides medical, educational, vocational and spiritual services to the needy. Compassion here reaches cows, children, patients and birds alike.', cta: btn('All social activities', EXT.social, 'line', 'arrow-up-right', X) })}
  </div>
  <div class="seva-creed">
    ${thread('seva-thread')}
    <div class="wrap">
      ${scrollLit('Service to *mankind* is service to *God.*')}
      <p class="creed-note" data-reveal="up"><b>Sri Swamiji</b>Sri Swamiji emphasises that spiritual life includes service to those in need. This practice, called Karma Yoga, means working selflessly and surrendering the fruits of one’s actions to God.</p>
      ${lampChain({ count: 5, cls: 'seva-dv-chain' })}
    </div>
  </div>
</section>

<section id="goshala" class="section section-paper seva-sec">
  <div class="wrap">
    ${split({
      media: `<div class="gau-mosaic">
        <figure class="gm-main">${img(photos.cows, 'Sri Swamiji with garlanded cows at the Ashram Goshala')}</figure>
        <figure>${img(photos.goshala3, 'Sri Swamiji among the cows in the Goshala stalls')}</figure>
        <figure>${img(photos.kamadhenu, 'The long Goshala shed at the Mysuru Ashram')}</figure>
        <span class="gm-badge"><b>50+</b>cows in the Mysuru Goshala</span>
      </div>`,
      body: `${index('goshala', 'SGS Datta Kamadhenu')}
        <h2 data-split>Gomaata — <span class="em-light">Mother Cow</span></h2>
        <p class="lead">Kamadhenu, Kalpavriksha, Amruta and Mother Lakshmi emerged together in creation as the most splendorous embodiments of divinity. The scriptures declare that all Devatas reside in the cow, so Sanatana Dharma reveres her as <em>Gomaata</em>.</p>
        <p>Sri Swamiji has established a large Goshala at the Mysuru Ashram that shelters and cares for more than 50 cows, with Goshalas maintained at other branches too.</p>
        <h3 class="seva-sub">Offer Gau Seva</h3>
        <ul class="gau-cards">
          ${gauSevas.map((g) => `<li><a href="${g.href}"${X}><span class="gc-icon">${icon(g.icon, 22)}</span><span><b>${g.title}</b><small>${g.note}</small><em>Participate ${icon('arrow-up-right', 14)}</em></span></a></li>`).join('')}
        </ul>`,
    })}
  </div>
</section>

<section id="pathashala" class="section section-sand seva-sec">
  <div class="wrap">
    ${split({
      reverse: true,
      media: frame(P.pathashalaClass, 'Teachers and students of SGS Veda Pathashala, Mysuru, gathered outside the Pathashala', { ratio: '4/3', caption: '<b>SGS Veda Pathashala</b>Teachers and students, Mysuru' }),
      body: `${index('pathashala', 'SGS Veda Pathashala · since 1985')}
        <h2 data-split>Preserving the <span class="em-light">Vedas</span></h2>
        <p class="lead">Sri Ganapathy Sachchidananda Veda Pathashala, founded in 1985, teaches all four Vedas and Sanskrit in the traditional Gurukula system — nurturing young students in the living Vedic tradition while preparing them for the modern world.</p>
        <p>Around 120 students are pursuing Vedic education at the Mysuru Ashram, and the Peetham also runs Veda Pathashalas in Pithapuram and Jayalakshmipuram (Bommeparti), Andhra Pradesh. Sri Swamiji calls Sanskrit not a language but a “Bhava”, a feeling. The Junior Pontiff, Sri Bala Swamiji, is Himself an alumnus.</p>
        ${stats([['120', 'students in Vedic study at Mysuru (approx.)'], ['4', 'Vedas taught, with Sanskrit'], ['3', 'Pathashalas: Mysuru, Pithapuram, Jayalakshmipuram']])}`,
    })}
    <div class="grid grid-3 study-cards" data-stagger>
      ${studies.map((s) => card({ img: s.img, alt: s.alt, title: s.title, text: s.text, icon: s.icon })).join('')}
    </div>
    <div class="learning">
      <h3 class="seva-sub" data-reveal="up">Beyond the Pathashala</h3>
      <ul class="learning-list" data-stagger>
        ${learning.map(([t, x]) => `<li><b>${t}</b><p>${x}</p></li>`).join('')}
      </ul>
      <p class="learning-note" data-reveal="up">The SGS Vedanidhi Academy &amp; Master’s Institute (SVAMI), the Peetham’s unit for Vedic research and publication, is recognised by Karnataka Sanskrit University as a Centre of Excellence.</p>
      <div class="btn-row" data-reveal="up">${btn('About the Pathashala', EXT.pathashala, 'line', 'arrow-up-right', X)}</div>
    </div>
  </div>
</section>

<section id="hospital" class="section section-dark seva-hospital grain">
  <div class="hosp-glow" aria-hidden="true"></div>
  <div class="wrap">
    ${split({
      media: `<div class="hosp-media">
        ${frame(P.hospitalBuilding, 'The SGS Hospital building at the Mysuru Ashram', { ratio: '4/3', caption: '<b>SGS Hospital</b>Holistic Health Centre, Mysuru' })}
        <figure class="hosp-inset">${img(photos.hospitalSeva, 'A group gathered at a cancer detection unit van, with a saffron-robed Swamiji on its steps')}</figure>
      </div>`,
      body: `${index('hospital', 'SGS Hospital · Holistic Health Centre', true)}
        <h2 data-split>Serving with <span class="em-light">compassion</span></h2>
        <p class="lead">Sri Ganapathy Sachchidananda Hospital operates a comprehensive healthcare system within the Holistic Health Centre, providing preventive and curative care: outpatient services in Ayurveda, Allopathy, Homeopathy, Naturopathy and other systems, and Ayurvedic inpatient care.</p>
        <blockquote class="hosp-quote"><p>Sri Swamiji always emphasises primary health care, rather than spending lakhs of rupees on tertiary health care.</p></blockquote>
        <p>Every month, SGS Hospital attends to 5,000–10,000 people. A Mobile Dispensary Van regularly visits the villages around Mysuru, and the hospital takes part in national programmes such as Immunization and Pulse-Polio. The Holistic Health Centre was inaugurated by former President of India Sri R. Venkataraman and then Chief Minister of Karnataka Sri S.M. Krishna.</p>`,
    })}

    <div class="camp-panel glass" data-reveal="up">
      <div class="camp-copy">
        <span class="eyebrow">Free medical camps</span>
        <h3>Camps for the needy</h3>
        <p>SGS Hospital regularly conducts free medical camps for the detection and treatment of various diseases.</p>
        <p class="camp-label" id="camp-regular">Regular free camps at SGS Hospital</p>
        <ul class="camp-chips" aria-labelledby="camp-regular">${camps.map((c) => `<li>${c}</li>`).join('')}</ul>
        <p class="camp-season">In addition, annual free medical camps are organised for the needy during the Chaturmasya Vrata of Sri Bala Swamiji, including cancer screening for women over 40.</p>
      </div>
      <div class="camp-stats">
        <p class="camp-label">Chaturmasya Vrata camps, 2024</p>
        ${stats([['1,512', 'cases, new and follow-up'], ['35', 'eye check-ups'], ['31', 'dental procedures']], true)}
        <p class="camp-label">Blood-donation drive</p>
        ${stats([['200', 'units collected with local organisations for emergency services', '+']], true)}
      </div>
    </div>

    <div class="hosp-story">
      <h3 class="seva-sub" data-reveal="up">From a dispensary to a Holistic Health Centre</h3>
      <ol class="milestones" data-progress="0.85,0.5">
        ${milestones.map(([y, t], i) => `<li style="--i:${i}"><span class="ms-dot" aria-hidden="true"></span><b>${y}</b><p>${t}</p></li>`).join('')}
      </ol>
    </div>

    <div class="units">
      <h3 class="seva-sub" data-reveal="up">Hospital services</h3>
      <div class="grid grid-4 unit-grid" data-stagger>
        ${units.map(([t, x]) => `<article class="unit"><h4>${t}</h4><p>${x}</p></article>`).join('')}
      </div>
      <p class="allied" data-reveal="up"><span>Allied services</span> Music Therapy · Yoga Therapy · People’s Diagnostic Centre</p>
    </div>

    <div class="btn-row hosp-actions" data-reveal="up">
      ${btn('Donate to SGS Hospitals', DONATE.hospital, 'gold', 'arrow-up-right', X)}
      ${btn('About SGS Hospital', EXT.hospital, 'ghost', 'arrow-up-right', X)}
    </div>
  </div>
</section>

<section id="annadana" class="section section-paper seva-sec">
  <div class="wrap">
    ${split({
      media: frame(P.annadana, 'Sri Swamiji serving a meal to rows of devotees seated before banana leaves', { ratio: '5/4', caption: '<b>Annadana</b>Sri Swamiji serves the meal' }),
      body: `${index('annadana', 'Sri Jayalakshmi Matha Nitya Annadana Trust')}
        <h2 data-split>Nitya <span class="em-light">Annadana</span></h2>
        <p class="lead">It is a tradition that every visitor to the Ashram receives free food three times a day. More than one million people are fed every year at the Mysuru Ashram and its branches.</p>
        <p>The Sri Jayalakshmi Matha Nitya Annadana Trust was established in 1986. On every full moon (Purnima), the Peetham also organises Annadana for those in need, and during Sri Swamiji’s birthday celebrations each May, volunteer groups serve meals in Mysuru, Bengaluru, Hyderabad, Vijayawada and other places.</p>
        ${stats([['3', 'free meals a day for every visitor'], ['10,00,000', 'people fed each year, Mysuru and branches', '+']])}
        <div class="btn-row">${btn('Support Nitya Annadana', DONATE.annadana, 'gold', 'arrow-up-right', X)}</div>`,
    })}
    <div class="need panel" data-reveal="up">
      <figure class="need-media">${img(P.foodGrains, 'Sri Swamiji hands over sacks of food grains to the Mysuru District Administration')}<figcaption>Sri Swamiji hands over Rs. 18 lakh worth of food grains to the Mysuru District Administration</figcaption></figure>
      <div class="need-copy">
        <span class="eyebrow">In times of need</span>
        <h3>During the lockdown, April &amp; May 2020</h3>
        <p>Sri Swamiji directed the Peetham and its Ashrams in India and abroad to provide food and other help to the poor and marginalised.</p>
        ${stats([['5,000', 'grocery bags of 23 items each', '+'], ['30,000', 'kg of rice, with 3,000 kg of dal and 3,000 litres of oil, for the Mysuru authorities'], ['10,000', 'food packets a day from SGS Ashram, Dundigal, by SDHS volunteers', '+']])}
      </div>
    </div>
  </div>
</section>

<section id="nature" class="section seva-sec seva-nature">
  <div class="wrap">
    <header class="nature-head">
      ${index('nature', 'Contribution towards Nature')}
      <h2 data-split>Two eyes: <span class="em-light">birds</span> and trees</h2>
      <blockquote class="nature-quote" data-reveal="up">
        <p>“Bonsai trees and birds are Swamiji’s two eyes. Nada is his voice. His breath is the Veda.”</p>
        <footer>— Sri Swamiji</footer>
      </blockquote>
      <p class="lead" data-reveal="up">Born at Mekedatu, in the heart of a jungle, Sri Swamiji has always had a natural affinity for birds and animals. He urges every child and adult to adopt not one tree, but several.</p>
    </header>
    <div class="nature-panes">
      <article class="nature-pane" data-reveal="up">
        <div class="np-media">${img(P.shukaRecord, 'Sri Swamiji holding the Guinness World Records certificate for Shuka Vana, a parrot on His shoulder', { pos: '50% 30%' })}</div>
        <div class="np-body">
          <span class="tag tag-light">Founded 2012</span>
          <h3>Shuka Vana</h3>
          <p>A rehabilitation centre for birds, with its own bird hospital: a free-flight walk-in aviary that shelters abused, injured and abandoned birds. About 70 people care for them, including two resident vets. In 2018 Shuka Vana was invited to join the global “Year of the Bird” project.</p>
          ${stats([['2,000', 'birds', '+'], ['486', 'species, per the Shuka Vana page']], true)}
          <p class="np-record">${icon('sparkle', 16)} <span>Guinness World Record, 6 May 2017: most bird species in an aviary. The certificate pictured records 468 species.</span></p>
        </div>
      </article>
      <article class="nature-pane" data-reveal="up">
        <div class="np-media">${img(P.bonsaiGarden, 'The Kishkindha Moolika Bonsai Garden, with its pavilion and water garden', { pos: '50% 60%' })}</div>
        <div class="np-body">
          <span class="tag tag-light">Inaugurated 2005</span>
          <h3>Kishkindha Moolika Bonsai Garden</h3>
          <p>More than 450 miniaturised trees in an oriental garden setting, nurtured by Sri Swamiji Himself. At the World Bonsai Convention in the Mysuru Ashram on 21 December 2016, Sri Swamiji was awarded the Guinness World Record for the largest display of bonsai trees.</p>
          ${stats([['450', 'trees in the garden', '+'], ['2,649', 'trees in the record display']], true)}
          <p class="np-record">${icon('sparkle', 16)} <span>Guinness World Record, 2016: largest display of bonsai trees</span></p>
        </div>
      </article>
    </div>
    <div class="btn-row nature-actions" data-reveal="up">
      ${btn('Visit Shuka Vana &amp; the Bonsai Garden', 'attractions.html#sv-visit', 'gold', 'arrow')}
      ${btn('Contribution towards Nature', EXT.nature, 'line', 'arrow-up-right', X)}
    </div>
  </div>
</section>

<section id="volunteer" class="section section-dark seva-volunteer grain">
  <div class="wrap">
    <blockquote class="vol-quote">
      <span class="eyebrow">Sri Swamiji says</span>
      <p class="vol-quote-lead" data-reveal="up">“At the end of our life, what good we did to the world is what matters, not how much we amassed for ourselves!</p>
      ${scrollLit('Lasting *happiness* lies in serving others in their times of *need!”*')}
    </blockquote>
    ${split({
      media: frame(P.sdhsParade, 'Sri Swamiji walks past SDHS volunteers standing in formation', { ratio: '4/3', caption: '<b>SDHS Volunteers Parade</b>with Sri Swamiji' }),
      body: `${index('volunteer', 'Sri Datta Humane Services', true)}
        <h2 data-split>Volunteer with <span class="em-light">SDHS</span></h2>
        <p class="lead">Sri Datta Humane Services is the volunteer corps of Avadhoota Datta Peetham, dedicated to the service of Sri Swamiji, His Ashrams and related social programmes in India and abroad.</p>
        <p>As Sri Swamiji has made clear many times, Humanity is His Religion, Music is His Language and Devotion is His methodology. SDHS and the Datta Senas volunteer groups have received state and national awards.</p>
        <p class="virtues-label">The four pillars of strength</p>
        <ul class="virtues">${['Discipline', 'Dedication', 'Devotion', 'Discretion'].map((v) => `<li>${v}</li>`).join('')}</ul>`,
    })}
    <h3 class="seva-sub" data-reveal="up">Services offered by the SDHS team</h3>
    <ul class="sdhs-grid" data-stagger>
      ${sdhsServices.map(([ic, t, x]) => `<li><span class="sdhs-icon">${icon(ic, 22)}</span><b>${t}</b><p>${x}</p></li>`).join('')}
    </ul>
    <div class="join" data-reveal="up">
      <div class="join-bg">${img(P.sdhsCamp, '')}</div>
      <div class="join-copy">
        <span class="eyebrow">How to join</span>
        <h3>Offer your time</h3>
        <ol class="join-steps">
          <li><b>Connect with the team</b><p>Follow Sri Datta Humane Services on <a href="${EXT.sdhsFacebook}">Facebook</a> for news of seva activities and camps.</p></li>
          <li><b>Reach the Ashram</b><p>Call <a href="${site.phoneHref}">${site.phone}</a> or write to <a href="mailto:${site.email}">${site.email}</a> to offer your seva.</p></li>
          <li><b>Come to a volunteer camp</b><p>SDHS camps appear on the Peetham calendar — the next listed is at Vishwaroopa Datta Kshetra, Ganagapura, 15–17 December 2026.</p></li>
        </ol>
        <div class="btn-row">
          ${btn('Peetham calendar', links.calendar, 'gold', 'arrow-up-right', X)}
          ${btn('About SDHS', EXT.sdhs, 'ghost', 'arrow-up-right', X)}
        </div>
      </div>
    </div>
  </div>
</section>

<section id="donate" class="section section-paper seva-donate ${DV_HOST}">
  ${pushpanjali({ density: 0.6 })}
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Donate', title: 'Support the Peetham’s <span class="em-light">seva</span>', lead: 'Your offering sustains Annadana, Gau Seva, the Veda Pathashala, free medical care and the birds of Shuka Vana. Donations are made on the Peetham’s own system at dattapeetham.org, where you choose the fund to support.' })}
    <ul class="funds" data-stagger>
      ${funds.map(([ic, name, line, href]) => `<li class="fund"><a href="${href}"${X}>
        <span class="fund-icon">${icon(ic, 24)}</span>
        <span class="fund-text"><b>${name}</b><small>${line}</small></span>
        <span class="fund-go" aria-hidden="true">${icon('arrow-up-right', 16)}</span>
      </a></li>`).join('')}
      <li class="fund fund-note"><div>
        <span class="fund-icon">${icon('calendar', 24)}</span>
        <span class="fund-text"><b>Seasonal funds</b><small>Event funds, such as the Chaturmasya Vrata Deeksha, also appear on the donation page.</small></span>
      </div></li>
    </ul>
    <p class="notice donate-notice" data-reveal="up">${icon('info', 20)}<span>On the donation page, choose <b>INR (₹)</b> if you have an Indian residential address, or <b>USD ($)</b> if you live outside India. The Sri Jayalakshmi Matha Nitya Annadana Trust accepts INR only. You can also give on behalf of friends and family by adding the same donation to your cart more than once.</span></p>
    <div class="btn-row donate-cta" data-reveal="up">${btn('Go to donations', links.donations, 'gold', 'arrow-up-right', X + ' data-magnetic')}</div>

    <div class="ways">
      <h3 class="seva-sub" data-reveal="up">Ways to give</h3>
      <nav class="quick-tiles ways-tiles" aria-label="Ways to give" data-stagger>
        ${ways.map((w) => `<a class="quick-tile" href="${w.href}"${isExt(w.href) ? X : ''}>
          <span class="qt-icon">${icon(w.icon, 28)}</span>
          <span class="qt-text"><b>${w.title}</b><small>${w.note}</small></span>
        </a>`).join('')}
      </nav>
      <p class="ways-note" data-reveal="up">Bhaktimala, the Peetham’s monthly magazine since 1976, is published in seven languages. All Kannada and English issues since October 2022 are in the Bhaktimala app. Existing English and Kannada subscribers can write to <a href="${EXT.bhaktimala}">bhaktimala@sgstech.cc</a> to enable app access; for new subscriptions, contact the Bhaktimala office at Datta Peetham, Mysuru (see <a href="${EXT.bhaktimalaOffice}">Contact</a>). Other subscriptions are on the <a href="${links.subscriptions}"${X}>Peetham’s subscriptions page</a>.</p>
    </div>
  </div>
</section>`;
}

export default {
  slug: 'seva',
  file: 'seva.html',
  title: 'Pillars of Service',
  crumb: 'Seva',
  description: 'Gau Seva, the Veda Pathashala, free care at SGS Hospital, Nitya Annadana, Shuka Vana and the SDHS volunteers: how Datta Peetham serves, and how to give.',
  nav: 'Seva',
  image: P.annadana,
  preload: P.prakrutiPuja,
  css: true,
  render,
};
