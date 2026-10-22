// Ashram Attractions — a cinematic tour of four landmarks within Sri Ganapathy
// Sachchidananda Ashram, Mysuru: Shuka Vana, the Kishkindha Moolika Bonsai
// Garden, Vishwam Museum and Nada Mantapa.
//
// Sources (fetched 2026-10-22, harvest folder): dattapeetham.org/page/view/
// shuka-vana, bonsai-garden, vishwam-museum, nada-mantapa,
// datta-kriya-yoga-international-center, contribution-towards-nature,
// awards-honors (Guinness World Records), karya-siddhi-hanuman-temple and
// ashram-shrines; plus shared facts in data.mjs (timeline, timings, photos,
// varamVideo) and site.mjs (hours, links, phone).
//
// Timing note: the Shuka Vana page lists 10:00 AM – 12:30 PM and 3:30 – 5:30 PM
// (Wednesday holiday) and says it is "temporarily closed for public due to
// Maintenance Works". The shared live badge follows hours.shukaVana in
// site.mjs (9:00 – 12:00, 15:30 – 18:00). The page shows both, labelled, plus a
// visible "please check before visiting" notice.

import { pageHero, sectionHead, frame, gallery, video, cards, ctaBand, scrollLit, hoursCard, btn, img, icon } from '../components.mjs';
import { site, links, PAGE_IMG, OFFICIAL } from '../site.mjs';
import { photos, timings, varamVideo } from '../data.mjs';

/* ---------------------------------------------------------------------------
   Photographs (Peetham S3 bucket). Captions follow the source pages.
--------------------------------------------------------------------------- */
const P = {
  hero: `${PAGE_IMG}504/504_0ec527dbfb1dd0a2.jpg`,
  svBanner: `${PAGE_IMG}503/503_45eeebc041e1b039.jpg`,
  svRecord: `${PAGE_IMG}518/518_dc50e08d3e9b68eb.png`,
  bonsaiPuja: `${PAGE_IMG}518/518_3afb42ae5333fe82.jpg`,
  bonsaiConvention: `${PAGE_IMG}504/504_a0ea7bcb7689b96a.jpg`,
  bonsaiCreation: `${PAGE_IMG}517/517_f883351cdab78b0a.jpg`,
  bonsaiRecord2016: `${PAGE_IMG}518/518_9b28c72e49a393cb.jpg`,
  bonsaiRecord2025: `${PAGE_IMG}517/517_253e8bbd49117dcc.jpg`,
  vishwamFacade: `${PAGE_IMG}505/505_2b98516bd374f9c6.jpg`,
  vishwamStamp: `${PAGE_IMG}505/505_f73389d00159c742.jpg`,
  nadaStage: `${PAGE_IMG}506/506_9de9699b3a272279.jpg`,
  nadaConcert: `${PAGE_IMG}506/506_575a490450b5a1d7.jpg`,
  nadaStamp: `${PAGE_IMG}517/517_42c18ff9b9fe6da1.jpg`,
  yogaDay: `${PAGE_IMG}508/508_445bbfeadfdd6504.jpg`,
};

const telLink = `<a href="${site.phoneHref}">${icon('phone', 16)}<span>${site.phone}</span></a>`;
const svStandard = timings.find((t) => t.key === 'shukaVana');
const temple = timings.find((t) => t.key === 'temple');

/* ---------------------------------------------------------------------------
   Small building blocks
--------------------------------------------------------------------------- */

// Stat strip that also takes non-counting values (years) and a suffix.
function statRow(items, light = true) {
  return `<dl class="stats at-stats${light ? ' is-light' : ''}" data-stagger>${items.map(([value, label, { count, suf = '' } = {}]) =>
    `<div class="stat"><dt><span${count ? ` data-count="${count}"` : ''}>${value}</span>${suf}</dt><dd>${label}</dd></div>`).join('')}</dl>`;
}

// Chapter opener: full-bleed photograph drifting behind the title.
function plate({ n, id, kicker, title, lead, image, alt, pos = 'center', caption, stats }) {
  return `<div class="ch-plate grain">
  <div class="ch-plate-media">${img(image, alt, { parallax: '0.1', pos })}</div>
  <div class="wrap ch-plate-inner">
    <p class="ch-kicker"><span class="ch-num" aria-hidden="true">${n}</span><span class="eyebrow eyebrow-light"><span class="visually-hidden">Chapter ${Number(n)}: </span>${kicker}</span></p>
    <h2 class="ch-title" id="${id}-title" data-split>${title}</h2>
    <p class="lead ch-lead" data-reveal="up">${lead}</p>
    <div class="ch-plate-foot glass" data-reveal="up">${stats}</div>
    ${caption ? `<p class="ch-photo-cap">${icon('camera', 14)}<span>${caption}</span></p>` : ''}
  </div>
</div>`;
}

const subhead = ({ eyebrow: eb, title, lead, center = false, light = false }) => `<header class="ch-sub${center ? ' is-center' : ''}${light ? ' is-light' : ''}">
  ${eb ? `<span class="eyebrow${light ? ' eyebrow-light' : ''}">${eb}</span>` : ''}
  <h3 data-split>${title}</h3>
  ${lead ? `<p class="lead" data-reveal="up">${lead}</p>` : ''}
</header>`;

const chips = (list, cls = '') => `<ul class="at-chips ${cls}">${list.map((x) => `<li>${x}</li>`).join('')}</ul>`;

const socialRow = (items, label) => `<ul class="at-social" aria-label="${label}">${items.map(([ic, name, href]) =>
  `<li><a href="${href}">${icon(ic, 18)}<span>${name}</span></a></li>`).join('')}</ul>`;

const record = ({ date, title, text, image, alt }) => `<article class="at-record">
  ${image ? `<span class="at-record-img">${img(image, alt)}</span>` : `<span class="at-record-seal" aria-hidden="true">${icon('sparkle', 26)}</span>`}
  <div>
    <span class="tag">Guinness World Records · ${date}</span>
    <h4>${title}</h4>
    <p>${text}</p>
  </div>
</article>`;

/* ===========================================================================
   Chapter 01 · Shuka Vana
=========================================================================== */
const SV = {
  page: `${OFFICIAL}/page/view/shuka-vana`,
  social: [
    ['yt', 'YouTube', 'https://www.youtube.com/@sgsbirds'],
    ['fb', 'Facebook', 'https://www.facebook.com/sgsbirds'],
    ['ig', 'Instagram', 'https://www.instagram.com/sgsbirds'],
    ['external', 'Twitter', 'https://www.twitter.com/sgsbirds'],
  ],
};

const svUnits = [
  { icon: 'heart-hand', name: 'Niri Vana', role: 'Rehabilitation centre', text: 'Shelter for injured and handicapped birds and birds with mental illness, including physically challenged birds that were not receiving proper care with their owners.' },
  { icon: 'medical', name: 'Pari Vana', role: 'Avian care unit', text: 'Diagnostics and treatment for the birds, supported by laboratories and a radiology unit.', equip: [
    ['Molecular biology lab', 'PCR (Polymerase Chain Reaction) for gender determination and to detect viral and bacterial diseases, with an airfuge, water bath, vortex mixer, electrophoresis unit and gel documentation unit.'],
    ['Radiology unit', 'X-ray machine, ultrasound scan machine, inhalant anaesthesia machine and oxygen concentrator.'],
    ['Biochemistry lab', 'A biochemistry analyser.'],
    ['Microbiology and culture lab', 'Bio-safety cabinet, incubator, autoclave and binocular microscope.'],
  ] },
  { icon: 'heart', name: 'Sanjeevini Vana', role: 'Bird health care unit', text: 'When a bird is diagnosed with an illness or disease, it is isolated and shifted here, where it is given treatment.' },
  { icon: 'tree', name: 'Phala Shala', role: 'Food unit', text: 'Fruits and vegetables are cleaned and cut and grains are sprouted, then weighed and dispatched for the birds.' },
];

const svDiet = [
  ['Fruits', ['Apple', 'Papaya', 'Musk melon', 'Kiwi', 'Mango', 'Banana', 'Pomegranate', 'Oranges']],
  ['Vegetables', ['Carrot', 'Beetroot', 'Drumstick', 'Pumpkin', 'Lady’s finger', 'Capsicum']],
  ['Sprouts', ['Green gram', 'Chana', 'Green peas', 'Horse gram']],
  ['Nuts, seeds &amp; millets', ['Almonds', 'Walnut', 'Hazelnut', 'Pine nuts', 'Seeds', 'Millets']],
];

const svTeam = ['Two resident veterinarians', 'Biochemistry and genetic technologists', 'Trained avian medical care givers', 'Caretakers', 'Volunteers', 'Cleaners'];
const svSpecies = ['Blue-throated macaw', 'Bolivian military macaw', 'Lesser sulphur-crested cockatoo', 'Superb parrot', 'Sun conure'];

const svGallery = [
  [photos.shukaVanaAviary, 'Aerial view of the Shuka Vana aviary, a tall meshed enclosure among trees, with the Shuka Vana logo', 'The Shuka Vana aviary at Sri Ganapathy Sachchidananda Ashram'],
  [P.svRecord, 'Sri Swamiji holding the Guinness World Records certificate, with a green parrot on his shoulder', 'Sri Swamiji with the Guinness World Record for Shuka Vana'],
  [P.svBanner, 'Shuka Vana banner reading “Paradise for birds, Mysore, India” over an aerial view of the aviary', 'Shuka Vana, Mysuru'],
];

const chShuka = `<section id="shuka-vana" class="chapter ch-shuka" aria-labelledby="shuka-vana-title">
  <div class="sv-opener section-dark grain">
    <canvas class="sv-birds" data-sv-birds aria-hidden="true"></canvas>
    <div class="wrap sv-opener-grid">
      <div class="sv-opener-copy">
        <p class="ch-kicker"><span class="ch-num" aria-hidden="true">01</span><span class="eyebrow eyebrow-light"><span class="visually-hidden">Chapter 1: </span>Rehabilitation Centre for Birds</span></p>
        <h2 class="ch-title" id="shuka-vana-title" data-split>Shuka <span class="em-light">Vana</span></h2>
        <p class="lead ch-lead" data-reveal="up">A free-flight, walk-in aviary with its own bird hospital, founded by Sri Swamiji in 2012 and named in honour of Sage Shuka for his contributions in imparting righteous values to humanity.</p>
        ${statRow([
          ['2,000', 'vibrant birds', { count: 2000, suf: '+' }],
          ['486', 'species from around the globe', { count: 486 }],
          ['2012', 'founded by Sri Swamiji'],
        ])}
        <a class="sv-flag" href="#sv-visit" data-reveal="up">${icon('info', 18)}<span><b>Temporarily closed for maintenance</b> The Peetham’s Shuka Vana page notes a closure for maintenance works. Please check before visiting.</span></a>
        <div class="btn-row" data-reveal="up">${btn('Watch Varam chant', '#sv-varam', 'gold', 'play-circle')}${btn('Timings &amp; notice', '#sv-visit', 'ghost', 'clock')}</div>
      </div>
      <div class="sv-opener-media" data-reveal="clip">
        ${frame(photos.shukaVana1, 'Sri Swamiji seated with black and white cockatoos perched on his arms and shoulders', { ratio: '4/3', pos: 'center 35%', caption: '<b>Sri Swamiji at Shuka Vana</b>He personally feeds, cajoles and nurtures the birds', badge: 'Founded 2012' })}
      </div>
    </div>
  </div>

  <div class="ch-body section">
    <div class="wrap sv-about">
      <div class="prose" data-reveal="up">
        <span class="eyebrow">A sanctuary for birds</span>
        <h3>Shelter for birds that were abused, injured or abandoned</h3>
        <p class="dropcap">Shuka Vana houses hundreds of colourful, exotic species of parrots, including many critically endangered and endangered species. His Holiness Sri Sri Sri Ganapathy Sachchidananda Swamiji has taken a serious resolve to rehabilitate injured birds, and Shuka Vana compassionately gives shelter to neglected and abandoned birds.</p>
        <p>It provides a restored natural habitat in which endangered and critically endangered species can thrive and reproduce. The aviary’s healthy, safe and clean environment is instrumental in their protection and conservation, and the enclosure spans an entire acre within the Ashram grounds.</p>
        <p>Visitors can watch rare parrot species flying freely. The Peetham describes the aviary as a place to be in the presence of the deity that presides over one’s own zodiac sign, and of a parrot that represents one’s planet and birth date.</p>
        <p>Sri Swamiji believes that birds play a crucial role in the survival of other species. With bird populations declining in recent years, Shuka Vana aims to educate and sensitise the public, and to foster respect and kindness towards birds.</p>
      </div>
      <div class="sv-honours" data-stagger>
        ${record({ date: '6 May 2017', title: 'Most bird species in an aviary', text: '486 species at SGS Ashram, Avadhoota Datta Peetham, Mysuru: the record for housing the most parrot species in a single aviary.', image: photos.shukaVanaRecord, alt: 'Sri Swamiji holding the Guinness World Records certificate, a parrot perched on his shoulder' })}
        <article class="at-record">
          <span class="at-record-seal" aria-hidden="true">${icon('globe', 26)}</span>
          <div>
            <span class="tag">Year of the Bird · 2018</span>
            <h4>Part of a worldwide campaign</h4>
            <p>Shuka Vana was invited to take part in the “Year of the Bird 2018” project, led by Audubon, BirdLife International, the Cornell Lab of Ornithology and National Geographic with 190 other organisations, to protect birds and their habitats.</p>
          </div>
        </article>
      </div>
    </div>
  </div>

  <div class="ch-body section section-sand" id="sv-care">
    <div class="wrap">
      ${subhead({ eyebrow: 'How the birds are cared for', title: 'Four units, one <span class="em-light">promise</span> of care', lead: 'The parrots are arranged according to their nativity and behaviour inside a well-protected, two-layered meshed aviary, planted with selected plants and trees, with food stations, water pots and nest boxes.', center: true })}
      <div class="sv-units at-snap" data-snap="Shuka Vana care units" data-stagger>
        ${svUnits.map((u) => `<article class="sv-unit">
          <span class="sv-unit-icon">${icon(u.icon, 26)}</span>
          <span class="tag">${u.role}</span>
          <h4>${u.name}</h4>
          <p>${u.text}</p>
          ${u.equip ? `<details class="sv-equip"><summary><span>Inside the labs</span>${icon('plus', 16)}</summary><dl>${u.equip.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></details>` : ''}
        </article>`).join('')}
      </div>
      <p class="snap-hint" aria-hidden="true">Swipe for more ${icon('arrow', 14)}</p>
      <div class="sv-care-grid">
        <article class="panel sv-diet" data-reveal="up">
          <span class="eyebrow">Phala Shala · the diet</span>
          <h4>Four meals a day</h4>
          <p>A nutritious, hygienic and balanced diet, along with a special hand-feeding formula. Food and water quality checks are done routinely in the lab.</p>
          <dl>${svDiet.map(([g, list]) => `<dt>${g}</dt><dd>${chips(list)}</dd>`).join('')}</dl>
        </article>
        <article class="panel sv-team" data-reveal="up">
          <span class="eyebrow">The care team</span>
          <h4>The people behind the care</h4>
          ${statRow([
            ['70', 'caretakers (approx.)', { count: 70 }],
            ['2', 'resident vets', { count: 2 }],
            ['45', 'days between individual check-ups', { count: 45 }],
          ], false)}
          <p>Parrots do not show symptoms of illness, so each bird is individually examined once every 45 days. The medicines used are avian-specific.</p>
          ${chips(svTeam, 'is-roles')}
        </article>
      </div>
    </div>
  </div>

  <div class="ch-body section section-paper sv-conserve">
    <div class="wrap sv-conserve-grid">
      <div data-reveal="up">
        ${subhead({ eyebrow: 'Conservation', title: 'Protecting parrots that are endangered in the wild', lead: 'Conservation of various species, especially endangered and critically endangered birds, is undertaken at Shuka Vana.' })}
        <ul class="sv-species">${svSpecies.map((s) => `<li>${icon('bird', 18)}<span>${s}</span></li>`).join('')}</ul>
        <div class="sv-scale">
          <div class="sv-scale-card"><span class="sv-scale-icon is-big" aria-hidden="true">${icon('bird', 56)}</span><span class="tag">The largest parrot in the world</span><b>Hyacinth macaw</b></div>
          <div class="sv-scale-card"><span class="sv-scale-icon is-small" aria-hidden="true">${icon('bird', 22)}</span><span class="tag">The smallest parrot in the world</span><b>Goldie’s lorikeet</b></div>
        </div>
        <p class="sv-scale-note">Both are part of Shuka Vana’s family, as the Peetham describes them.</p>
      </div>
      <div class="panel panel-dark sv-top10" data-reveal="up">
        <span class="sv-top10-num" aria-hidden="true">10</span>
        <span class="eyebrow eyebrow-light">Every year</span>
        <h3 id="sv-top10-title">The Top 10 Birds</h3>
        <p>To build awareness of these feathered friends, ten parrot species at Shuka Vana that are in the endangered zone in the wild are selected every year. The results of the Top 10 Birds list are based on voting by thousands of Shuka Vana members from across the globe.</p>
        <p class="sv-top10-follow">Follow Shuka Vana</p>
        ${socialRow(SV.social, 'Shuka Vana on social media')}
      </div>
    </div>
  </div>

  <div class="ch-body section section-dark sv-varam" id="sv-varam">
    <div class="wrap sv-varam-grid">
      <div class="prose" data-reveal="up">
        <span class="eyebrow eyebrow-light">Sri Swamiji and the birds</span>
        <h3>Birds that chant the names of God</h3>
        <p>Apart from the care and compassion showered on them, Sri Swamiji personally feeds the birds, cajoles them and nurtures them with love and affection, and the birds in turn show immense love and longing for him. Some of the birds chant the divine names of God.</p>
        <p>Meet <b>Varam</b>, the Double Yellow-headed Amazon from Shuka Vana, who chants the first line of the Hanuman Chalisa with devotion and engages in charming conversation.</p>
        <p class="sv-handle">${icon('bird', 18)}<span>Shuka Vana is <b>@sgsbirds</b> on social media</span></p>
        ${socialRow(SV.social, 'Shuka Vana on social media')}
      </div>
      <div class="sv-varam-video" data-reveal="scale">
        ${video({ id: varamVideo[0], title: varamVideo[1], thumb: photos.shukaVana2 })}
        <p class="sv-video-note">Video plays from YouTube when you press play.</p>
      </div>
    </div>
  </div>

  <div class="ch-body section">
    <div class="wrap ch-close">
      <div class="ch-gallery">
        <h3 class="ch-mini">${icon('photo', 18)}From the aviary</h3>
        ${gallery(svGallery, 'at-gallery g3 sv-gal')}
      </div>
      <div class="ch-visit" id="sv-visit">
        <h3 class="ch-mini" id="sv-visit-title">${icon('clock', 18)}Visiting Shuka Vana</h3>
        <div class="notice sv-notice" role="note">
          ${icon('info', 22)}
          <div>
            <b>Temporarily closed for maintenance</b>
            <p>The Peetham’s Shuka Vana page states: “Shuka Vana is temporarily closed for public due to Maintenance Works.” The hours listed on that page also differ from the standard Shuka Vana hours shown elsewhere on this site. <strong>Please check before visiting.</strong></p>
            <p class="sv-notice-actions">${telLink}<a href="${SV.page}">${icon('external', 16)}<span>Shuka Vana page</span></a></p>
          </div>
        </div>
        <article class="hours-card sv-hours" data-reveal="up">
          <span class="hc-img"><img src="${photos.birdsIcon}" alt="" loading="lazy" decoding="async"></span>
          <div>
            <h4>Timings for public visit</h4>
            <p class="sv-src">As listed on the Shuka Vana page</p>
            <dl><dt>Morning</dt><dd>10:00 AM – 12:30 PM</dd><dt>Evening</dt><dd>3:30 PM – 5:30 PM</dd><dt>Holiday</dt><dd>Every Wednesday</dd></dl>
            <div class="sv-live">
              <span class="sv-live-label">Live status · this site’s standard hours</span>
              <span class="badge" data-badge="shukaVana">Checking…</span>
              <small>Standard hours used across this site: ${svStandard.rows.map(([a, b]) => `${a} ${b}`).join(', ')}. ${svStandard.note}. The live status does not reflect the maintenance closure.</small>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</section>`;

/* ===========================================================================
   Chapter 02 · Kishkindha Moolika Bonsai Garden
=========================================================================== */
const BONSAI = {
  social: [
    ['fb', 'Facebook', 'https://www.facebook.com/sgs.bonsai.museum'],
    ['ig', 'Instagram', 'https://www.instagram.com/bonsaisgs'],
  ],
};

const gardens = [
  ['sun', 'Navagraha Garden', 'The nine planets'],
  ['namaste', 'Sapta Rishi Garden', 'The seven sages'],
  ['sparkle', 'Nakshatra Garden', 'The stars'],
  ['moon', 'Rashi Garden', 'The zodiac signs'],
];

const treeStories = [
  ['Madhuvana, in the Ramayana', 'Kishkindha Moolika Vana, then called Madhuvana, was safeguarded by Dadhimukha, uncle of the monkey king Sugreeva. When news came that Sita had been found, the jubilant Vanaras destroyed his garden of short fruit trees, snuggled between two hills. The Peetham holds that India has had the bonsai tradition since the Treta Yuga.'],
  ['The leaf that saved a child', 'As a child, Sri Swamiji swallowed nine pellets of rat poison smeared with honey. His father Narasimha Sastry, a physician, sent for a leaf from a forest tree, and its juice saved the boy’s life. Years later his father told him of kubja (midget) trees grown in small pots for medicine; at about thirty, Sri Swamiji’s interest in bonsai was rekindled.'],
  ['Sri Jayalakshmi Mata’s tree', 'The year Sri Swamiji was born, his mother planted a tree in the precincts of the Sangameswara Siva temple at Mekedatu. Entwined by snakes, the Naga devatas, it grew twisted. Devotees found it during the temple’s renovation and brought it to the Bonsai Garden, where it can be seen today.'],
];

const bonsaiGallery = [
  [P.bonsaiConvention, 'Sri Swamiji and Sri Bala Swamiji with honoured guests holding plaques at the International Bonsai Convention and Exhibition 2016', 'Sri Swamiji and Sri Bala Swamiji during the Bonsai Convention at SGS Ashram, Mysuru'],
  [photos.bonsai1, 'A paved path through the Bonsai Garden lined with potted bonsai trees', 'A path through Kishkindha Moolika Bonsai Garden'],
  [photos.bonsai2, 'Sri Swamiji seated among bonsai trees in the garden, one hand raised in blessing', 'Sri Swamiji in the Bonsai Garden'],
  [P.bonsaiRecord2016, 'Collage announcing the Guinness World Record for the largest display of bonsai trees: 2,649 trees, 21 December 2016', 'Largest display of bonsai trees, 21 December 2016'],
  [P.bonsaiRecord2025, 'Sri Swamiji receiving the Guinness World Records certificate from an adjudicator', 'Guinness World Records title for the largest display of bonsai trees, 14 June 2025'],
];

const chBonsai = `<section id="bonsai" class="chapter ch-bonsai" aria-labelledby="bonsai-title">
  ${plate({
    n: '02', id: 'bonsai', kicker: 'A garden of miniature trees · since 2005',
    title: 'Kishkindha Moolika <span class="em-light">Bonsai</span> Garden',
    lead: 'An exquisite collection of more than 450 carefully shaped miniaturised trees, displayed in an oriental garden setting and passionately developed and nurtured by Sri Swamiji himself.',
    image: P.bonsaiPuja, alt: 'Sri Swamiji seated among bonsai trees in the Kishkindha Moolika Bonsai Garden, with a rock waterfall and a moon gate behind him', pos: 'center 40%',
    caption: 'Sri Swamiji performs Prakruti Puja (Puja to Mother Nature) in the Bonsai Garden',
    stats: statRow([
      ['450', 'miniaturised trees in the garden', { count: 450, suf: '+' }],
      ['2005', 'year the garden was inaugurated'],
      ['10,836', 'trees in the 2025 Guinness World Records display', { count: 10836 }],
      ['257', 'species in that display', { count: 257 }],
    ]),
  })}

  <div class="ch-body section">
    <div class="wrap bonsai-intro">
      <div class="prose" data-reveal="up">
        <span class="eyebrow">A spiritual garden</span>
        <h3>Wonders of Mother Nature, in miniature</h3>
        <p class="dropcap">The trees are displayed in the tranquil surroundings of Sri Ganapathy Sachchidananda Ashram. A keen nature lover, Sri Swamiji has a special interest in developing spiritual gardens that enlighten people about the divinity of Mother Nature, and the Ashram owes its lush look to his enduring attention to detail and the dedicated volunteer garden staff.</p>
        <p>The towering sculpture of <b>Moolikeswara</b>, the presiding deity of herbal healing, who frees addicts from their addictions, adorns the garden.</p>
        <p>Every tree in the Bonsai Garden has a history behind it. Sri Swamiji goes to each tree and listens to its raga, or the sounds it makes, and has brought many trees from different countries; from Calcutta came a bonsai Neem tree.</p>
      </div>
      <div class="bonsai-gardens" data-reveal="up">
        <span class="eyebrow">Gardens within the garden</span>
        <ul data-stagger>${gardens.map(([ic, name, note]) => `<li><span class="bg-icon">${icon(ic, 26)}</span><b>${name}</b><small>${note}</small></li>`).join('')}</ul>
        <p>These gardens stand testimony to Sri Swamiji’s zeal for evolving new ways of adoring and worshipping nature.</p>
      </div>
    </div>
  </div>

  <div class="ch-body section section-sand">
    <div class="wrap">
      ${subhead({ eyebrow: 'Every tree has a history', title: 'Three stories the garden <span class="em-light">keeps</span>', center: true })}
      <div class="bonsai-stories at-snap" data-snap="Three stories of the Bonsai Garden" data-stagger>
        ${treeStories.map(([t, x], i) => `<article><span class="bs-num" aria-hidden="true">${['i', 'ii', 'iii'][i]}</span><h4>${t}</h4><p>${x}</p></article>`).join('')}
      </div>
      <p class="snap-hint" aria-hidden="true">Swipe for more ${icon('arrow', 14)}</p>
    </div>
  </div>

  <div class="ch-body section">
    <div class="wrap">
      <div class="split bonsai-convention">
        <div class="split-media" data-reveal="clip">${frame(P.bonsaiCreation, 'Sri Swamiji and two bonsai artists in aprons shaping a bonsai on stage at the 2016 Bonsai Convention and Exhibition', { ratio: '4/3', caption: '<b>International Bonsai Convention</b>Sri Swamiji looks at a bonsai creation' })}</div>
        <div class="split-body prose" data-reveal="up">
          <span class="eyebrow">Conventions &amp; records</span>
          <h3>Gathering the world’s bonsai lovers</h3>
          <p>Sri Swamiji organises Bonsai Conventions that bring together enthusiasts, professional tree experts and hobbyists from different countries to share their expertise, their love for the art and their commitment to preserving nature. Techniques for different aesthetic styles, and methods for preserving tree species, are explained and explored.</p>
          <p>He urges every child and adult to adopt not one tree but several, and, where space is limited, to learn bonsai techniques to safeguard tree species at least in miniature form. Sri Swamiji has also written a book on growing bonsai at home.</p>
          <div class="at-records">
            ${record({ date: '21 Dec 2016', title: 'Largest display of bonsai trees', text: '2,649 trees at the World Bonsai Convention in the Mysuru Ashram.' })}
            ${record({ date: '14 Jun 2025', title: 'The largest display of bonsai trees', text: '10,836 trees across 257 species, as part of the Vruksha Shanti Pooja at Avadhoota Datta Peetham, Mysuru.' })}
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="ch-body section section-paper">
    <div class="wrap ch-close">
      <div class="ch-gallery">
        <h3 class="ch-mini">${icon('photo', 18)}From the garden</h3>
        ${gallery(bonsaiGallery, 'at-gallery g5')}
      </div>
      <div class="ch-visit">
        <h3 class="ch-mini" id="bonsai-visit-title">${icon('clock', 18)}Visiting the garden</h3>
        ${hoursCard(null, 'Timings for public visit', [['Morning', '10:00 AM – 12:30 PM'], ['Evening', '3:30 PM – 5:30 PM'], ['Holiday', 'Every Wednesday']], { note: 'As listed on the Peetham’s Bonsai Garden page.' })}
        <div class="ch-visit-more">
          <p>Follow the garden</p>
          ${socialRow(BONSAI.social, 'Bonsai Garden on social media')}
        </div>
      </div>
    </div>
  </div>
</section>`;

/* ===========================================================================
   Chapter 03 · Vishwam Museum
=========================================================================== */
const worlds = [
  ['sparkle', 'Ganapathy World', 'Representations and artefacts of Lord Ganapathy, showing the deity’s significance across traditions.'],
  ['compass', 'World of Antiques', 'A treasure trove of rare and valuable historical artefacts.'],
  ['sun', 'World of Crystals and Minerals', 'Natural crystals and minerals: the geological wonders of the globe.'],
  ['globe', 'World of Cultures of Historical Significance', 'Exhibits from many cultures and the rich tapestry of human civilisation.'],
  ['diya', 'World of Spirituality', 'Items of deep religious and philosophical significance from humanity’s spiritual heritage.'],
  ['namaste', 'World of Sri Swamiji’s Paraphernalia', 'Personal items and memorabilia, offering insights into Sri Swamiji’s life and teachings.'],
  ['lotus', 'World of Wonders', 'Extraordinary and unique items that defy conventional categories.'],
  ['mail', 'Stamps and Coins', 'Sri Swamiji’s stamp collection and coins tracing India’s monetary history.'],
  ['veena', 'Music Instruments Section', 'Instruments from over forty countries: string, plucking, wind, percussion and more.'],
];

const treasures = [
  'A silver drachm bearing the name of Alexander the Great (336–323 BC)',
  'An ancient ship sculpted from Chinese jade stone',
  'An amethyst geode from North Canada',
  'A Ganapathi idol carved from stone sourced from Uzbekistan and crafted in Lahore, Pakistan',
  'The Kalinga Mardana, a bronze cast in a single pour, gifted by former President of India Dr. R. Venkataraman',
  'Rare Brahma stamps from the French colonial era in India',
  'The Surya Varna, carved on petrified wood',
  'The Vishwaroopa, carved from a single tree trunk',
  'Fossilised dinosaur eggs',
];

const instrumentCountries = ['India', 'China', 'Tibet', 'Japan', 'Australia', 'Indonesia', 'Persia', 'Turkey', 'Uganda', 'Bhutan', 'Ethiopia', 'Mexico', 'Peru', 'Germany', 'Norway', 'Switzerland'];

const vishwamGallery = [
  [photos.vishwamRecord, 'Sri Swamiji and a Guinness World Records adjudicator holding a certificate before a giant stamp of the Vishwam Museum', 'World’s largest special stamp, depicting Vishwam Museum'],
  [photos.vishwamVadya, 'Glass display cases of musical instruments in the Vishwam Museum', 'The Music Instruments Section'],
  [photos.vishwamOuter, 'The Vishwam Museum entrance pavilion and building, framed by trees', 'Vishwam Museum'],
];

const vishwamPress = [
  ['World’s largest postal stamp: Seer gets 9th Guinness World Record', 'Star of Mysore', 'https://starofmysore.com/worlds-largest-postal-stamp-seer-gets-9th-guinness-world-record/'],
  ['Music Instruments Section opened at Vishwam Museum', 'Star of Mysore', 'https://starofmysore.com/music-instruments-section-opened-at-vishwam-museum-in-ganapathy-ashrama/amp/'],
  ['Vishwam Museum', 'Museums of India', 'https://www.museumsofindia.org/museum/12425/vishwam-museum'],
];

const chVishwam = `<section id="vishwam" class="chapter ch-vishwam" aria-labelledby="vishwam-title">
  ${plate({
    n: '03', id: 'vishwam', kicker: 'A museum of the universe · since 2006',
    title: '<span class="em-light">Vishwam</span> Museum',
    lead: '“Vishwam” translates to “Universe”: exhibits from around the world, many of them rare gifts received by Sri Swamiji from devotees and admirers, gathered to convey a message of universal love.',
    image: P.vishwamFacade, alt: 'The Vishwam Museum building and its ornate maroon-and-gold entrance pavilion, surrounded by gardens', pos: 'center 55%',
    caption: 'Vishwam Museum, Avadhoota Datta Peetham',
    stats: statRow([
      ['2006', 'year the museum was established'],
      ['1835', 'earliest stamps in Sri Swamiji’s collection'],
      ['162', 'countries in the stamp collection', { count: 162 }],
      ['40', 'countries the musical instruments come from', { count: 40, suf: '+' }],
    ]),
  })}

  <div class="ch-body section">
    <div class="wrap">
      ${subhead({ eyebrow: 'Nine worlds under one roof', title: 'A journey through different <span class="em-light">realms</span>', lead: 'Upon entering Vishwam, visitors are guided through several worlds, each with its own theme and significance.', center: true })}
      <ul class="vw-worlds" data-stagger>
        ${worlds.map(([ic, name, text]) => `<li><span class="vw-icon">${icon(ic, 26)}</span><h4>${name}</h4><p>${text}</p></li>`).join('')}
      </ul>
    </div>
  </div>

  <div class="ch-body section section-dark vw-treasures">
    <div class="wrap">
      ${subhead({ eyebrow: 'Treasures to look for', title: 'From Alexander’s silver to <span class="em-light">dinosaur</span> eggs', lead: 'Minerals, gemstones, crystals, carpets, paintings and etchings fill the corridors. A few of the highlights the Peetham names:', light: true, center: true })}
      <ol class="vw-list" data-stagger>${treasures.map((t) => `<li><span>${t}</span></li>`).join('')}</ol>
    </div>
  </div>

  <div class="ch-body section">
    <div class="wrap">
      <div class="split is-reverse vw-stamps">
        <div class="split-media" data-reveal="clip">${frame(P.vishwamStamp, 'Sri Swamiji and a Guinness World Records adjudicator holding the certificate in front of the giant Vishwam Museum stamp', { ratio: '16/10', caption: '<b>World’s largest special stamp</b>Depicting the Vishwam Museum, 26 May 2018' })}</div>
        <div class="split-body prose" data-reveal="up">
          <span class="eyebrow">Stamps and coins</span>
          <h3>A collection that began at a post office</h3>
          <p>Sri Swamiji’s stamp collection carries a personal link to his Poorvashrama days, when, known as Satyanarayana, he worked at a post office in Metagalli, Mysuru, in the 1960s. Curated under philately, it offers thematic insights into animals, flowers, musical instruments, the art of India and temple architecture, with stamps from 162 countries and golden replicas of iconic stamps from the USA and India.</p>
          <p>The coin collection traces India’s monetary history: regular coins of the Republic of India, relics from British India, post-Independence coinage and Indian commemorative coins.</p>
          ${record({ date: '26 May 2018', title: 'World’s largest special stamp', text: '2.87 m² (30.9 sq ft), depicting the Vishwam Museum, released on the occasion of Sri Swamiji’s 76th birthday celebrations.' })}
        </div>
      </div>
      <div class="panel vw-instruments" data-reveal="up">
        <div>
          <span class="eyebrow">The Music Instruments Section</span>
          <h3>Instruments from over forty countries</h3>
          <p>Many of them were gifted to Sri Swamiji during his travels across India and abroad, arranged as string, plucking, wind and percussion instruments, and more. Among the countries represented:</p>
        </div>
        ${chips([...instrumentCountries, 'and many more'], 'is-countries')}
      </div>
    </div>
  </div>

  <div class="ch-body section section-paper">
    <div class="wrap ch-close">
      <div class="ch-gallery">
        <h3 class="ch-mini">${icon('photo', 18)}From the museum</h3>
        ${gallery(vishwamGallery, 'at-gallery g3')}
      </div>
      <div class="ch-visit">
        <h3 class="ch-mini" id="vishwam-visit-title">${icon('clock', 18)}Visiting the museum</h3>
        <div class="panel ch-visit-panel">
          <p>The Peetham’s Vishwam Museum page does not list visiting hours. Please confirm with the Ashram before you go.</p>
          <p class="ch-visit-actions">${telLink}</p>
          <h4>In the press</h4>
          <ul class="at-press">${vishwamPress.map(([t, src, href]) => `<li><a href="${href}"><span><b>${t}</b><small>${src}</small></span>${icon('arrow-up-right', 16)}</a></li>`).join('')}</ul>
        </div>
      </div>
    </div>
  </div>
</section>`;

/* ===========================================================================
   Chapter 04 · Nada Mantapa
=========================================================================== */
const swaras = [['Sa', 'Agni'], ['Ri', 'Brahma'], ['Ga', 'Saraswati'], ['Ma', 'Parameshwara'], ['Pa', 'Maha Vishnu'], ['Da', 'Maha Ganapati'], ['Ni', 'Surya Narayana']];
const entranceDeities = ['Chaitanya Maha Prabhu', 'Narada Muni', 'Garuda', 'Vishwaksena', 'Anjaneya', 'Tumburu', 'Hayagreeva', 'Nandi', 'Bhringi', 'Ganapati'];

const nadaGallery = [
  [photos.nadaMantapaInterior, 'Inside Nada Mantapa: a large audience faces a row of figures in saffron robes seated facing them', 'Inside Nada Mantapa'],
  [photos.nadaMantapaChandra, 'Nada Mantapa filled with devotees seated in rows, seen from above', 'A full house in Nada Mantapa'],
  [photos.nadaMantapa, 'The lit stage of Nada Mantapa beneath its curved ceiling', 'Nada Mantapa’s stage'],
];

const chNada = `<section id="nada-mantapa" class="chapter ch-nada" aria-labelledby="nada-mantapa-title">
  ${plate({
    n: '04', id: 'nada-mantapa', kicker: 'Hall of musical tones · since 1998',
    title: 'Nada <span class="em-light">Mantapa</span>',
    lead: 'A purpose-built auditorium, also known as the Raga Ragini Samudaya Bhavan, inaugurated by Sri Swamiji on 31 May 1998. Thousands of concerts have been held here since.',
    image: P.nadaStage, alt: 'The stage of Nada Mantapa lit for a concert beneath the hall’s vast tiered ceiling, with the audience in silhouette', pos: 'center 55%',
    caption: 'Nada Mantapa’s stage',
    stats: statRow([
      ['1998', 'inaugurated on 31 May'],
      ['35,000', 'square feet', { count: 35000 }],
      ['5,000', 'seats, in a staggered layout', { count: 5000, suf: '+' }],
      ['2,150', 'square feet of stage', { count: 2150 }],
    ]),
  })}

  <div class="ch-body section">
    <div class="wrap">
      <div class="split nada-intro">
        <div class="split-media" data-reveal="clip">${frame(P.nadaConcert, 'A concert in Nada Mantapa: musicians on stage before a large seated audience, with portraits of composers along the walls', { ratio: '4/3', caption: '<b>Portraits of the composers</b>A unique lighting system highlights the composer being performed' })}</div>
        <div class="split-body prose" data-reveal="up">
          <span class="eyebrow">A sanctuary of music</span>
          <h3>Where music is offered for healing and meditation</h3>
          <p class="dropcap">Nada Mantapa is equipped with state-of-the-art sound, lighting and theatrical systems. It stands as a testament to Sri Swamiji’s dedication to the healing and meditative powers of music: a venue for world-class performances, and a sanctuary where the transformative power of music can be experienced in its purest form.</p>
          <p>Sri Swamiji frequently performs “Music for Meditation and Healing” here. During the 10th anniversary celebrations of Nada Mantapa on 29 May 2008, his handling of Raga Veenavadini captivated the audience.</p>
          <p>Large portraits of renowned composers adorn the walls. When Saint Tyagaraja’s “Samaja Varagamana” is played or sung, the lights in front of Tyagaraja’s portrait illuminate automatically.</p>
        </div>
      </div>
    </div>
  </div>

  <div class="ch-body section section-dark nada-swara">
    <div class="wrap">
      ${subhead({ eyebrow: 'Sapta Swara Devata Mantapam', title: 'Seven notes, seven <span class="em-light">deities</span>', lead: 'Nada Mantapa houses the world’s first and only Sapta Swara Devata Mantapam, with deities symbolising the seven musical notes.', light: true, center: true })}
      <figure class="nm-fan" data-progress="0.85,0.5" style="--n:${swaras.length}">
        <svg class="nm-fan-arc" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true" data-draw><path d="M8 100a92 92 0 0 1 184 0"/><path d="M40 100a60 60 0 0 1 120 0"/></svg>
        <ol class="nm-swaras">
          ${swaras.map(([note, deity], i) => `<li style="--i:${i}"><span class="nm-rib" aria-hidden="true"></span><span class="nm-note"><b>${note}</b><span>${deity}</span></span></li>`).join('')}
        </ol>
        <span class="nm-pivot" aria-hidden="true">${icon('veena', 24)}</span>
        <figcaption>Illustration, not to scale, drawn after the hall’s fan shape. Its seats radiate within 140° of the performer.</figcaption>
      </figure>
      <div class="nada-arch">
        ${statRow([
          ['22', 'colossal tamburas, for the 22 shrutis (microtones) of the Sangeeta Shastra', { count: 22 }],
          ['72', 'pillars, for the 72 melakarta ragas', { count: 72 }],
          ['140', 'degrees: the seats radiate from the performer, with clear visibility from every seat', { count: 140, suf: '°' }],
        ])}
      </div>
    </div>
  </div>

  <div class="ch-body section">
    <div class="wrap nada-origin">
      <div class="prose" data-reveal="up">
        <span class="eyebrow">Origin of Nada Mantapa</span>
        <h3>Shaped like a palm-leaf fan</h3>
        <p>The fan-shaped design was inspired by a Ramayana episode narrated by Sri Swamiji. Lord Rama, seeking Seetha in the forest, was fanned by Hanuman with a palm leaf, demonstrating both strength and artistic sense. The auditorium is centrally located within the Ashram, with its entrance facing east toward the sacred Chamundi hills.</p>
        <p>At the entrance, visitors are greeted by sculpted deities associated with music, and the porch is adorned with vibrant decorations in the Tamil Nadu style.</p>
        ${chips(entranceDeities, 'is-deities')}
        <p class="nada-video-link"><a class="link-arrow" href="https://www.youtube.com/watch?v=bXM2CqyWqYI">${icon('play-circle', 18)}<span>Watch: glimpses of Nada Mantapa’s construction</span></a></p>
      </div>
      <div class="at-records nada-records" data-stagger>
        ${record({ date: '13 Dec 2024', title: 'The largest special stamp', text: '13.104 m² (140.92 ft²), depicting Nada Mantapa, a partially covered performance centre within the Ashram premises.', image: P.nadaStamp, alt: 'Sri Swamiji and a Guinness World Records adjudicator before a giant “My Stamp” postage stamp showing Nada Mantapa' })}
        ${record({ date: '12–13 Dec 2024', title: 'Longest chanting marathon (team)', text: 'An Ahoraatra Akhanda (day-and-night) Hanuman Chalisa Parayana lasting 33 hours, 33 minutes and 33 seconds, held at Nada Mantapa in the presence of Sri Swamiji.' })}
      </div>
    </div>
  </div>

  <div class="ch-body section section-paper">
    <div class="wrap ch-close">
      <div class="ch-gallery">
        <h3 class="ch-mini">${icon('photo', 18)}From the hall</h3>
        ${gallery(nadaGallery, 'at-gallery g3')}
      </div>
      <div class="ch-visit">
        <h3 class="ch-mini" id="nada-visit-title">${icon('calendar', 18)}Attending a programme</h3>
        <div class="panel ch-visit-panel">
          <p>Concerts, festival celebrations and Sri Swamiji’s Music for Meditation and Healing sessions are held in Nada Mantapa through the year. The Nada Mantapa page lists no separate visiting hours; see the Peetham’s calendar for upcoming programmes.</p>
          <div class="btn-row">${btn('Events &amp; festivals', 'events.html', 'gold', 'calendar')}${btn('Official calendar', links.calendar, 'line', 'external')}</div>
          <p class="ch-visit-actions"><a class="link-arrow" href="music.html">${icon('music', 16)}<span>Nada Chikitsa: healing through music</span></a></p>
        </div>
      </div>
    </div>
  </div>
</section>`;

/* ===========================================================================
   Page
=========================================================================== */
const chapters = [
  { id: 'shuka-vana', n: '01', name: 'Shuka Vana', short: 'Shuka Vana', icon: 'bird' },
  { id: 'bonsai', n: '02', name: 'Bonsai Garden', short: 'Bonsai', icon: 'tree' },
  { id: 'vishwam', n: '03', name: 'Vishwam Museum', short: 'Vishwam', icon: 'globe' },
  { id: 'nada-mantapa', n: '04', name: 'Nada Mantapa', short: 'Nada Mantapa', icon: 'veena' },
];

const chapterNav = `<nav class="ch-nav" aria-label="Attraction chapters" data-ch-nav>
  <div class="wrap ch-nav-inner">
    <span class="ch-nav-label">The tour</span>
    <ol>
      ${chapters.map((c) => `<li><a href="#${c.id}" data-ch="${c.id}">${icon(c.icon, 20)}<span class="n">${c.n}</span><span class="t"><span class="t-full">${c.name}</span><span class="t-short">${c.short}</span></span><i class="bar" aria-hidden="true"><b></b></i></a></li>`).join('')}
    </ol>
    <a class="ch-nav-cta link-arrow" href="visit.html"><span>Plan your visit</span>${icon('arrow', 16)}</a>
  </div>
</nav>`;

const attractionLd = [
  ['shuka-vana', 'Shuka Vana', 'Rehabilitation centre for birds and free-flight, walk-in aviary founded in 2012, home to more than 2,000 birds of 486 species.', photos.shukaVanaAviary],
  ['bonsai', 'Kishkindha Moolika Bonsai Garden', 'A collection of more than 450 miniaturised trees in an oriental garden setting, developed by Sri Swamiji.', P.bonsaiPuja],
  ['vishwam', 'Vishwam Museum', 'Museum established in 2006 with exhibits from around the world, including stamps, coins, crystals, antiques and musical instruments.', P.vishwamFacade],
  ['nada-mantapa', 'Nada Mantapa', 'Music auditorium of 35,000 square feet inaugurated on 31 May 1998, also known as the Raga Ragini Samudaya Bhavan.', P.nadaStage],
];

export default {
  slug: 'attractions',
  file: 'attractions.html',
  title: 'Ashram Attractions',
  crumb: 'Ashram Attractions',
  description: 'Tour the Mysuru Ashram’s landmarks: the Shuka Vana bird sanctuary, Kishkindha Moolika Bonsai Garden, Vishwam Museum and Nada Mantapa, with visiting notes.',
  nav: 'Visit',
  image: P.hero,
  preload: P.hero,
  css: true,
  scripts: ['attractions'],
  jsonLd: [{
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Ashram Attractions · Avadhoota Datta Peetham, Mysuru',
    itemListElement: attractionLd.map(([id, name, description, image], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'TouristAttraction',
        name,
        description,
        image,
        url: `${site.origin}/attractions.html#${id}`,
        containedInPlace: {
          '@type': 'Place',
          name: site.ashram,
          address: { '@type': 'PostalAddress', streetAddress: site.address.street, addressLocality: site.address.city, addressRegion: site.address.region, postalCode: site.address.postal, addressCountry: site.address.country },
        },
      },
    })),
  }],
  render: () => `
${pageHero({
  eyebrow: 'Visit · Mysuru Ashram',
  title: 'Ashram <span class="em-light">Attractions</span>',
  lead: 'A sanctuary for rescued birds, a garden of miniature trees, a museum of the world’s treasures and a hall built for healing music: four landmarks within Sri Ganapathy Sachchidananda Ashram.',
  image: P.hero,
  pos: 'center 38%',
  crumb: 'Ashram Attractions',
  tiles: [
    { icon: 'bird', title: 'Shuka Vana', note: 'Birds · since 2012', href: '#shuka-vana' },
    { icon: 'tree', title: 'Bonsai Garden', note: 'Miniature trees · since 2005', href: '#bonsai' },
    { icon: 'globe', title: 'Vishwam Museum', note: 'World treasures · since 2006', href: '#vishwam' },
    { icon: 'veena', title: 'Nada Mantapa', note: 'Hall of music · since 1998', href: '#nada-mantapa' },
  ],
})}

<section id="overview" class="section at-intro">
  <div class="wrap wrap-narrow">
    ${sectionHead({ eyebrow: 'Within the Ashram', title: 'A tour in four <span class="em-light">chapters</span>', lead: 'Each landmark carries a part of Sri Swamiji’s mission: compassion for birds, reverence for trees, the world’s cultures gathered in one place, and music as a means of healing and meditation.' })}
    <figure class="at-quote">
      <blockquote>${scrollLit('“*Bonsai* trees and *birds* are my two eyes. *Naada* is my voice. My breath is the *Veda*.”')}</blockquote>
      <figcaption>Sri Swamiji</figcaption>
    </figure>
  </div>
</section>

<div class="tour" id="tour">
${chapterNav}
${chShuka}
${chBonsai}
${chVishwam}
${chNada}
</div>

<section id="more" class="section section-sand at-more">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Also within the Ashram', title: 'More to <span class="em-light">discover</span>', lead: 'Temples, a 70-foot monolithic Hanuman and a centre for the science of breath and meditation are a short walk away.' })}
    ${cards([
      { img: photos.dattatreya, alt: 'Nirajanam (aarti) offered to a garlanded idol of Lord Dattatreya', tag: 'Darshan daily', title: 'Temples &amp; shrines', text: `Shrines to Lord Dattatreya, Sri Raja Rajeshwari, Sri Datta Venkateshwara and more. Darshan ${temple.rows.map(([, b]) => b).join(' and ')}.`, href: 'darshan.html', cta: 'Temples &amp; darshan' },
      { img: photos.hanumanStatue, alt: 'A garlanded idol of Lord Hanuman at the Karya Siddhi Hanuman Temple', pos: 'center 30%', tag: 'Since 2012', title: 'Karya Siddhi Hanuman', text: 'The 70-foot monolithic statue consecrated by Sri Swamiji in 2012. On Saturdays and Sundays a short laser show is projected onto it at 7:10, 7:40 and 8:10 PM.', href: 'darshan.html', cta: 'Plan darshan' },
      { img: P.yogaDay, alt: 'Datta Kriya Yoga students demonstrating asanas on stage during International Yoga Day', tag: 'Ministry of AYUSH accredited', title: 'Datta Kriya Yoga International Center', text: 'Accredited as a “Yoga Training Center” by the Yoga Certification Board, Ministry of AYUSH, Government of India. Find it on the 2nd floor of the SGS Ayurvedic Hospital.', href: 'kriya-yoga.html', cta: 'Explore Datta Kriya Yoga' },
    ], 3)}
  </div>
</section>

${ctaBand({
  title: 'Plan your visit to the <span class="em-light">Ashram</span>',
  text: 'How to reach Mysuru, darshan timings, guidelines for visitors and places to stay, all in one place.',
  actions: `${btn('Plan your visit', 'visit.html', 'gold')}${btn('Get directions', links.directions, 'ghost', 'pin')}`,
  image: photos.prayerHall,
})}
`,
};
