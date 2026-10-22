// Discourses & Teachings — the wisdom side of the Peetham: Datta Vaakya and
// Vijaya Vyakhya discourses, Sri Swamiji's sayings, literary contributions,
// the Bhaktimala magazine, Sanatana Dharma Parirakshana, Ask Dattaji and the
// Datta Peetham glossary. (Videos and photographs live on media.html.)
//
// Sources, harvested or fetched 22 Oct 2026 from dattapeetham.org:
//   /speeches (2023 listing), /speeches?category=449 (Datta Vaakya: 18 in 2023),
//   /speeches?category=450 (Vijaya Vyakhya: 3 in 2023), /sri-swamiji-says
//   (2014 page 1) and /sri-swamiji-says/2013, /articles and /articles/2023,
//   /page/view/literary-contributions, /page/view/sanatana-dharma-parirakshana,
//   /page/view/datta-peetham-glossary, /page/view/ask-dattaji,
//   /page/view/sri-swamiji, /page/view/sri-bala-swamiji, /page/view/about-us,
//   /page/view/sri-swamijis-avatara-timeline, and the homepage announcements
//   (Ask Dattaji, Bhaktimala in the app). Quotes, book titles and glossary
//   definitions are verbatim; the books only lose their "(Telugu Book)"-style
//   language suffix because the language is shown alongside.

import { pageHero, sectionHead, stats, ctaBand, btn, img, icon, scrollLit, chips, photoTile, esc } from '../components.mjs';
import { links, OFFICIAL, PAGE_IMG } from '../site.mjs';
import { photos } from '../data.mjs';

const P = {
  preaching: `${PAGE_IMG}522/522_e6aadc94cb31b022.jpg`, // "Sri Swamiji preaches" (sri-swamiji page)
  gauShala: `${PAGE_IMG}514/514_bb5a23cc41a0f878.jpg`,
  pathashala: `${PAGE_IMG}514/514_b3b6aa10017eba1e.jpg`,
  yaaga: `${PAGE_IMG}514/514_a731e21742a19093.jpg`,
  gitaChicago: `${PAGE_IMG}514/514_b7a1c01aeacc37c6.jpg`,
  kriyaTeach: `${PAGE_IMG}515/515_47c13ada69bd6850.jpg`, // "Sri Swamiji teaches Datta Kriya Yoga"
};

const EXT = {
  literary: `${OFFICIAL}/page/view/literary-contributions`,
  ragaRagini: 'https://ragaraginistore.com/',
  dharma: `${OFFICIAL}/page/view/sanatana-dharma-parirakshana`,
  glossary: `${OFFICIAL}/page/view/datta-peetham-glossary`,
  askDattaji: `${OFFICIAL}/page/view/ask-dattaji`,
  askSurvey: 'https://survey.tataji.app/',
  bhaktimalaMail: 'mailto:bhaktimala@sgstech.cc',
  bhaktimalaFb: 'https://www.facebook.com/bhaktimala',
  gitaIndia: 'https://www.sgsgitaindia.org/',
  gitaUsa: 'https://www.sgsgitafoundation.org',
  vedanidhi: 'https://www.vedanidhi.in/',
  latestArticle: `${OFFICIAL}/articles/2026/8/4/america-panchaashat-nadee-jala-samarpana-to-sri-ganapathy-sachchidananda-swamiji-guru-purnima-2026`,
};

const SP = `${OFFICIAL}/speeches/2023/`;
const ext = ' target="_blank" rel="noopener" data-external';

// ---------------------------------------------------------------- discourses
// The most recent speeches on dattapeetham.org (all 2023). Titles are short
// labels for the official titles; excerpts are verbatim opening lines.
const recent = [
  { d: '16', m: 'Oct 2023', who: 'Sri Swamiji', title: 'Navaratri 2023 · Day 2', place: 'Namasankeertana & discourse',
    q: 'Mother Goddess fulfils all wishes. Yesterday, we spoke about the rules of doing Devi Bhāgavtam parāyana. Today, we will talk about how Devi Bhāgavatam took birth.',
    href: `${SP}10/16/navaratri-2023-day-2-namasankeertana-discourse-by-hh-sri-ganapathy-sachchidananda-swamiji` },
  { d: '14', m: 'Oct 2023', who: 'Sri Swamiji', title: 'Navaratri 2023', place: 'Benedictory message',
    q: 'During this Navaratri time you can write or do Japa of Lalitā Sahsranāma.',
    href: `${SP}10/14/navaratri-2023-benedictory-message-by-sri-ganapathy-sachchidananda-swamiji` },
  { d: '02', m: 'Oct 2023', who: 'Sri Bala Swamiji', title: 'Vishwaroopa Vijaya Yatra', place: 'Solapur, Maharashtra',
    q: 'On this auspicious occasion we have gathered here at Shanti Sagar auditorium to perform Anaghashtami Vratam.',
    href: `${SP}10/2/benedictory-message-of-sri-datta-vijayananda-teertha-swamiji-during-vishwaroopa-vijaya-yatra-at-solapur-maharashtra` },
  { d: '30', m: 'Sep 2023', who: 'Sri Bala Swamiji', title: 'Benedictory message', place: 'Ganagapura',
    q: 'After this 20th Chaturmasya, we have come to Vishva Roopa Datta Swami as a part of our Vishvaroopa Sandarshana Yatra.',
    href: `${SP}9/30/parama-pujya-sri-datta-vijayananda-teertha-swamijis-benedictory-message-in-ganagapura` },
  { d: '13', m: 'Aug 2023', who: 'Sri Swamiji', title: 'After Sri Chakra Puja', place: 'Germany',
    q: '…Sri Chakra has three parts - Iccha/desire, Kriya/action and Jnana/supreme wisdom. Sri Chakra is in our body.',
    href: `${SP}8/13/parama-pujya-swamijis-anugraha-bhashana-after-sri-chakra-puja-in-germany` },
  { d: '18', m: 'Jul 2023', who: 'Sri Swamiji', title: 'After Sri Chakra Puja', place: 'Chicago, USA',
    q: 'Bhajans heal the mind and bhajan (food) heals body.',
    href: `${SP}7/18/benedictory-message-by-parama-pujya-sri-swamiji-after-sri-chakra-puja-in-chicago-usa` },
  { d: '07', m: 'Jul 2023', who: 'Sri Swamiji', title: 'Welcome at Jayalakshmi Datta Yoga Center', place: 'Maryland, USA',
    q: 'Anagha Vrata bestows everything when performed with devotion.',
    href: `${SP}7/7/parama-pujya-sri-swamijis-message-during-welcome-function-at-jayalakshmi-datta-yoga-center-maryland-usa` },
  { d: '31', m: 'Mar 2023', who: 'Sri Swamiji', title: 'Maharudra Yaga', place: 'Trinidad',
    q: 'Keep chanting śivāya rudrāya namaḥ during the Rudra Homa.',
    href: `${SP}3/31/parama-pujya-sri-swamijis-message-at-the-commencement-of-the-maharudra-yaga-in-trinidad-march-31-2023` },
  { d: '20', m: 'Jan 2023', who: 'Sri Swamiji', title: 'Srisaila Kanda · Part 1 of 3', place: 'Atirudra Yaga, Srisailam',
    q: 'I am happy you are all here for Atirudra Yaga out of love for Lord Shiva, and without consideration for comforts.',
    href: `${SP}1/20/atirudra-yaga-day-4-jan-20-2023-parama-pujya-swamijis-discourse-on-srisaila-kanda-part-13` },
  { d: '17', m: 'Jan 2023', who: 'Sri Bala Swamiji', title: 'Anugraha Bhashana', place: 'Atirudra Yaga, Srisailam',
    q: 'We are gathered here in the very sacred Srisailam Kshetra due to the grace of our Sadguru…',
    href: `${SP}1/17/atirudra-yaga-day-1-jan-17-2023-anugraha-bhashana-morning-by-pujya-sri-bala-swamiji` },
];

function collections() {
  const one = ({ n, name, sub, text, facts, image, alt, pos, href, cta }) => `<article class="dv-card" data-reveal="up">
    <div class="dv-media">${img(image, alt, { pos })}</div>
    <span class="dv-num" aria-hidden="true">${n}</span>
    <div class="dv-body">
      <span class="tag tag-light">Discourse collection</span>
      <h3><a class="dv-link" href="${href}"${ext}>${name}</a></h3>
      <p class="dv-sub">${sub}</p>
      <p class="dv-text">${text}</p>
      <ul class="dv-facts">${facts.map((f) => `<li>${f}</li>`).join('')}</ul>
      <span class="dv-cta" aria-hidden="true">${cta} ${icon('arrow-up-right', 16)}</span>
    </div>
  </article>`;
  return `<div class="dv-pair">
  ${one({
    n: 'I', name: 'Datta Vaakya', sub: 'Discourses of His Holiness Sri Ganapathy Sachchidananda Swamiji',
    text: 'Anugraha bhashanas and benedictory messages given across India and abroad: through Navaratri, on the Srisaila Kanda during the Atirudra Yaga, and after Sri Chakra Puja in Chicago and in Germany.',
    facts: ['<b>18</b> discourses in 2023', 'Latest in this collection: <b>15 Oct</b> 2023'],
    image: photos.swamijiGarland, alt: 'Sri Ganapathy Sachchidananda Swamiji, garlanded, seated on a silver throne', pos: '42% 30%',
    href: links.dattaVaakya, cta: 'Open Datta Vaakya',
  })}
  ${one({
    n: 'II', name: 'Vijaya Vyakhya', sub: 'Discourses of Pujya Sri Datta Vijayananda Teertha Swamiji',
    text: 'Sri Bala Swamiji gives regular discourses on the Vedas, Shastras, Upanishads and Puranas, explaining their deep spiritual essence in simple words. Here: messages from Solapur and Ganagapura, and from the Atirudra Yaga at Srisailam.',
    facts: ['<b>3</b> discourses in 2023', 'Latest in this collection: <b>2 Oct</b> 2023'],
    image: photos.balaSwamijiSpeech, alt: 'Sri Datta Vijayananda Teertha Swamiji smiling as he speaks into a microphone', pos: '30% 30%',
    href: links.vijayaVyakhya, cta: 'Open Vijaya Vyakhya',
  })}
</div>`;
}

function recentRail() {
  return `<div class="tc-recent">
  <div class="tc-recent-head" data-reveal="up">
    <div>
      <h3>Recent discourses</h3>
      <p>The latest speeches in dattapeetham.org’s full speeches archive, all from 2023, including discourses not filed under either collection. Each opens in full on the official archive.</p>
    </div>
    <div class="rail-btns" data-rail-btns hidden>
      <button type="button" class="rail-btn" data-rail-prev aria-controls="tc-rail" aria-label="Scroll to earlier cards">${icon('arrow-left', 18)}</button>
      <button type="button" class="rail-btn" data-rail-next aria-controls="tc-rail" aria-label="Scroll to later cards">${icon('arrow', 18)}</button>
    </div>
  </div>
  <ul class="tc-rail" id="tc-rail" tabindex="0" aria-label="Recent discourses, newest first" data-rail data-lenis-prevent>
    ${recent.map((r) => `<li class="tc-item">
      <a class="tc-card" href="${r.href}"${ext}>
        <span class="tc-date"><b>${r.d}</b><small>${r.m}</small></span>
        <span class="tc-who">${r.who}</span>
        <span class="tc-title">${r.title}</span>
        <span class="tc-place">${icon('pin', 14)} ${r.place}</span>
        <span class="tc-quote">“${r.q}”</span>
        <span class="tc-more">Read the discourse ${icon('arrow-up-right', 14)}</span>
      </a>
    </li>`).join('')}
  </ul>
</div>`;
}

function archiveRow() {
  const rows = [
    ['mic', 'Speeches archive', 'Every published speech from 2011 to 2023, by year and month.', links.speeches],
    ['article', 'Articles', 'Latest: America Panchaashat Nadee Jala Samarpana to Sri Swamiji, Guru Purnima 2026 (4 Aug 2026).', EXT.latestArticle],
    ['calendar', 'Daily posts', 'The Peetham’s daily posts, among them Sri Swamiji Says.', links.dailyPosts],
  ];
  return `<ul class="tc-archive" data-stagger>
  ${rows.map(([ic, t, x, h]) => `<li><a href="${h}"${ext}>
    <span class="tca-icon">${icon(ic, 22)}</span>
    <span class="tca-text"><b>${t}</b><small>${x}</small></span>
    ${icon('arrow-up-right', 16)}
  </a></li>`).join('')}
</ul>`;
}

// ---------------------------------------------------------------- Sri Swamiji Says
// Verbatim from dattapeetham.org/sri-swamiji-says (2014, page 1) and
// /sri-swamiji-says/2013. `src` is the post title, `date` the post date.
const sayings = [
  { q: ['A devotee, truly speaking, is an incarnation of devotion. Just as fire cannot be separated from wood, similarly, a true devotee is not separate from the object of his devotion – the Lord.'],
    src: 'Sadguru Sookti Sangraha', note: 'Devotion – The Most Difficult Path', date: '22 May 2014' },
  { q: ['O Lord, You are the Truth.', 'You are eternal and immanent.', 'How could anyone feel incomplete after seeing Your form?', 'You are an Ocean of compassion.', 'O Bestower of happiness!', 'May I be blessed with Your vision!'],
    src: '108 Meditations on Sri Datta Darshanam', note: '', date: '19 May 2014', verse: true },
  { q: ['It is very difficult to come close to a Sadguru. It is only the punya karmas (good deeds) of so many previous lives that can bring one to be with a Sadguru.'],
    src: 'Eye Of Wisdom', note: 'Significance Of Guru Purnima', date: '21 May 2014' },
  { q: ['First you make friendship with your Guru. Then very slowly a Guru-‘sisya’ relationship can develop. It is like any other relationship, it intensifies only after some time and if you take proper care of it.'],
    src: 'Silent Teacher', note: 'Relation to Guru', date: '16 May 2014' },
  { q: ['You are not bowing to Swamiji, you are bowing to the Akhanda Chaitanya (Supreme Energy) which exists in all of us. Your prostrations to Swamiji, reflect your prostrations to your own Self.'],
    src: 'Sachchidananda Unveiled', note: 'Lord Dattatreya', date: '7 Feb 2014' },
  { q: ['Each devotee sees Swamiji in a different form. Each has a different relationship. Experiences occur in dreams also. He appears as mother, father, Guru, Hanuman, and so on. He is only one Swamiji. He tunes Himself differently to suit different devotees.'],
    src: 'Delhi, 15 November 2013', note: '', date: '23 Dec 2013' },
  { q: ['If we get anything then we should help others also to get the same. If we have to beg for something we have to beg from the God Himself who selflessly fulfills everyone’s needs.'],
    src: 'Datta Speaks Vol I', note: 'A Crow Is Better Than A Beggar', date: '6 Feb 2014' },
  { q: ['If we develop healthy habits of listening to good music or reading good books, our children will imbibe them.'],
    src: 'Hyderabad, 10 April 2013', note: '', date: '24 Dec 2013' },
  { q: ['Sadguru is like a mirror. …', 'Sadguru, as a mirror, reflects your inner personality – your hidden nature and it gets revealed to you in the course of your contact with the Sadguru.'],
    src: 'Sadguru Sookti Sangraha', note: 'Sadguru – The Mirror', date: '14 May 2014' },
];

function sayingsCarousel() {
  const n = sayings.length;
  return `<div class="says" data-says>
  <div class="says-frame">
    <div class="says-portrait" data-reveal="clip">${img(photos.swamiji, 'Sri Ganapathy Sachchidananda Swamiji, smiling, his hands folded')}</div>
    <svg class="says-ring" viewBox="0 0 104 104" aria-hidden="true"><use href="#i-mandala"/></svg>
  </div>
  <div class="says-body">
    <span class="eyebrow">Sri Swamiji Says</span>
    <h2 data-split>Sayings for the <span class="em-light">seeker</span></h2>
    <p class="says-lead" data-reveal="up">Cultural, religious and spiritual daily messages from His Holiness, as published on dattapeetham.org.</p>
    <div class="says-stage" role="region" aria-roledescription="carousel" aria-label="Sayings of Sri Swamiji" data-reveal="up">
      <div class="says-slides" data-says-live aria-live="off">
        ${sayings.map((s, i) => `<figure class="says-slide${i === 0 ? ' is-on' : ''}" role="group" aria-roledescription="saying" aria-label="${i + 1} of ${n}" data-says-slide>
          <blockquote class="${s.verse ? 'is-verse' : ''}">${s.verse ? `<p>${s.q.join('<br>')}</p>` : s.q.map((p) => `<p>${p}</p>`).join('')}</blockquote>
          <figcaption><b>${s.src}</b>${s.note ? `<span>${s.note}</span>` : ''}<time>Posted ${s.date}</time></figcaption>
        </figure>`).join('')}
      </div>
      <div class="says-controls" data-says-controls hidden>
        <button type="button" class="says-btn" data-says-prev aria-label="Previous saying">${icon('arrow-left', 18)}</button>
        <button type="button" class="says-btn says-toggle" data-says-toggle aria-pressed="false" aria-label="Pause the sayings"><span class="i-pause" aria-hidden="true"></span><span class="i-play" aria-hidden="true">${icon('play', 16)}</span></button>
        <button type="button" class="says-btn" data-says-next aria-label="Next saying">${icon('arrow', 18)}</button>
        <span class="says-count" aria-hidden="true"><b data-says-index>01</b> / ${String(n).padStart(2, '0')}</span>
        <span class="says-progress" aria-hidden="true">${sayings.map((s) => `<i style="--d:${Math.min(16, 7 + Math.round(s.q.join(' ').length / 40))}s"><s></s></i>`).join('')}</span>
      </div>
    </div>
    <div class="btn-row says-actions" data-reveal="up">
      ${btn('Read Sri Swamiji Says', links.swamijiSays, 'gold', 'arrow-up-right', ext)}
      ${btn('Daily posts', links.dailyPosts, 'ghost', 'arrow-up-right', ext)}
    </div>
  </div>
</div>`;
}

// ---------------------------------------------------------------- literature
// The source's list, in its order, one block per language.
const BOOKS_RAW = `
Anjaneya Charitre (Kannada Book)
Datta Kriya Yoga (Kannada Book)
Jnaanadedege (Kannada Book)
Kavacha Manjari (Kannada Book)
Nadi Shuddhi Exercises (Kannada Book)
Nitya Stotramalika (Kannada Book)
Sri Anaghastami Puja (Kannada Book)
Sri Datta Darshana (Kannada Book)
Sri Ganapati Sachidananda (Swamiji's Life History Kannada Book)
Sri Ganesha Sahasranama Bhashyaartha (Kannada Book)
Sri JayalakshmiMatru DwadashaSooktulu (Kannada Book)
Sri Karya Siddhi Anjaneya Laghu Sundaram (Kannada Book)
Sri Krishna Jaya (Kannada Book)
Sri LalitaSahasranamaStotra (Kannada Book)
Sri Subramanya Swami Charitre (Kannada Book)
Sri Vishnu Sahasranama Stotra (Kannada Book)
Srimad Bhagavad-Gita Chanting Book (Kannada)
Srimad Bhagavata Dashama Skanda (Kannada Book)
Sri Lalita Sahasranama Lekhana Mahayajna (Kanada-Book)

Skanda Charitra (Telugu Book)
Sri Datta Darshanam(Telugu Book)
Sri Ganapati Sachidananda (Swamiji's Life History Telugu Book)
Sri Guru Gita with Meaning (Telugu Book)
Sri Guru Samhita (Telugu Book)
Acharya Shankarulu (Telugu Book)
Aditya Hrudayam Pravachanam (Telugu Book)
Amruta Binduvulu (Telugu Book)
Amrutavarshini (Telugu Book)
Anjaneya Charitra Part 1&2 (Telugu Book)
Ashtadasha Shakti Peethamulu (Telugu Book)
Datta Kagada Haratulu with meaning (Telugu Book)
Datta Kriya Yoga (Telugu Book)
Datta Kriya Yoga Telugu Books Set
Harivamshamu (Telugu Book)
Hrudayabodha (Telugu Book)
Katha Saagaramu-1 (Telugu Book)
Katha Saagaramu-2
Kavacha Manjari (Telugu Book)
Manassu Sadhakudu (Telugu Book)
Naa Chilukalu (Telugu Book)
Nadi Shuddhi Vyayamamulu (Telugu Book)
Nava Yuganiki Navya Kavitha (Telugu Book)
Navaratri Pooja
Nitya Stotramalika (Telugu Book)
Raga Ragini Nada Yogamu (Telugu Book)
Raga Ragini Nada Yogamu (Abridged version - Telugu Book)
Sankshipta Sri Anaghastami Puja (Telugu Book)
Shatashloki Ramayanamu Slokas (Telugu Book)
Shiva Kathamrutham (Telugu Book)
Sooktimanjari-2 (Telugu Book)
Sooktimanjari-3 (Telugu Book)
Sooktimanjari-4 (Telugu Book)
Sri Anaghastami Puja (Telugu Book)
Sri Datta Venkateswara Stotra Malika (Telugu Book)
Sri Devi Bhagavatamu (Telugu Book)
Sri Devi Navakam with meaning (Telugu Book)
Sri Ganapathi Atharva Shirshopanishith (Telugu-Book)
Sri Ganesha Puranamu (Telugu Book)
Sri Ganesha Vaibhavam (Telugu Book)
Sri Guru Gita Chanting Book (Telugu)
Sri Jayalakshmi Matru Pooja Vidhanam (Telugu Book)
Sri Jayalakshmi Matru Dwadasha Sooktulu (Telugu Book)
Sri Karya Siddhi Anjaneya Laghu Sundaram (Telugu Book)
Sri Kashi Khandamu (Telugu Book)
Sri Krishna Gadhamrutamu (Telugu Book)
Sri Krishna Jayagiti (Telugu Book)
Sri Lalita Sahasranama Lekhana Mahayajna (Telugu-Book)
Sri LalitaSahasranama Stotram (Telugu Book)
Sri Lalitha Trishathi (Telugu Book)
Sri Rudrabhashyam (Telugu Book)
Sri Sachchidananda Kriti Mani Mala (Telugu Book)
Sri Vishnu Sahasranama Stotram (Telugu Book)
Srimad Bhagavad-Gita Chanting Book (Telugu)
Srimad Bhagavata Dashama Skandam (Telugu Book)
Srimad Bhagavatamu (Telugu Book)
Sundarakanda Slokas Book (Telugu)
Tripura Rahasyam Part-1 (Telugu Book)
Tripura Rahasyam Part-2 (Telugu Book)
Tripura Vaibhavam (Telugu Book)
Vedanta Patamulu (Telugu Book)
Vibhuti Yogamu (Telugu Book)
Yoga Darpanam (Telugu Book)
Yoga Vashishta Hrudayam-1 (Telugu Book)
Yoga Vashishta Hrudayam-2 (Telugu Book)
Yoga Vashishta Hrudayam-3 (Telugu Book)
Yoga Vashishta Hrudayam-4 (Telugu Book)
Yoga Vashishta Hrudayam-5 (Telugu Book)
Yoga Vashishta Hrudayam-6 (Telugu Book)
Yoga Vashishta Hrudayam Set of 6 Volumes (Telugu Books)
Yoga Vashishtamu Vairaagya Prakaranamu (Prashna & Samadhanamu) (Telugu Book)
Sadguru Divya Leelaamrutam-3 (Telugu-Book)
Srimadbhagvadgita (Sarala Sangraha Tatparya Sahitamu)- Telugu Book
Pillalu! Veeru Meeku Telusa?-2 (Telugu Book)
Bhagavata Sookti Tarangani-1 (Telugu Book)
Soundaryalahari (Telugu-Book)
Salagrama Vaibhavamu (Telugu-Book)
Srimadbhagvadgita (Laghu Vyakhya Sahitamu)- Telugu Book
Nadi Shuddhi Vyayamamulu (Telugu & English Book)
Srimad Bhagavadgita Swara Prasthara Vyakhya Telugu Book (3 Volumes)
Sri Saraswathi Rahasyopanishath (Telugu-Book)
Shivanandalahari (Telugu-Book)

Anubhava Yogasanamulu (English Book)
Bhagavad GIta Chanting Book (English)
Bhagavad Gita Meaning Book (English)
Bhakta Mala 1&2 (English Book)
Datta Kriya Yoga (English Book)
Datta Speaks (English Book)
Datta Kriya Yoga English Books Set
Dwadasha Sutras (12 Commandments) of Jayalakshmi Mata (English Book)
Fifty Golden Years With My Guru (English Book)
God Word-1 (English Book)
God Word-2 (English Book)
God Word-3 (English Book)
Gomata (English Book)
Kumara Kriya Yoga (English Book)
Musings on Yoga Vaasishta Part-1 (English Book)
Musings on Yoga Vaasishta Part-2 (English Book)
Musings on Yoga Vaasishta Part-3 (English Book)
Musings on Yoga Vaasishta Part-4 (English Book)
Musings on Yoga Vaasishta Part-5 (English Book)
Musings on Yoga Vaasishta Part-6 (English Book)
Musings on Yoga Vaasishta set of 6 Volumes (English Book)
My Bonsai (English Book)
Nadi Shuddhi Exercises (English Book)
Raga Ragini Nada Yogam (English Book)
Reflections of the absolute (Sri Swamiji's life history English Book)
Sayings of Sri Swamiji (English Book)
Script for Success (English Book)
Shata Shloki Ramayana (English Book)
Shilakhand (English Book)
Shiva Kathamrita (English Book)
Sri Anaghastami Puja (English Book)
Sri Datta Darshanam (English Book)
Sri Datta Venkateswara Stotra Malika (English Book)
Sri Guru Gita (English Book)
Sri Guru Gita Chanting Book (English)
Sri Krishna Jaya (English Book)
Sri Lalita Sahasranama Lekhana Mahayajna (English-Book)
Sri Rudrabhashyam (English Book)
Srimad Bhagvadgita (With Concise Explanation) English Book
Story Through Pictures (English Book)
The Childhood of a Divine Child Book (English)
The Life and Mission of HANUMAN (English Book)
The Mystery of Sri Chakra (English Book)
Yoga Darpana (English Book)
Yoga Manual (English Book)

Katha Sagara (Hindi Book)
Kavacha Manjari (Hindi Book)
Kumara Kriya Yoga (Hindi Book)
Sachchidananda Nitimala (Hindi Book)
Sadguru Sapthashati (Hindi Book)
SGS Swamiji Life History (Hindi Book)
Shatashloki Ramayana (Hindi Book)
Shiva Kathamrutha (Hindi Book)

Bhagavad Gita Meaning Book (Marathi)
Guru Datta Vani (Marathi Book)
SGS Swamiji Life History (Marathi Book)
Skanda Charita (Marathi Book)
Sri Anaghashtami Vrata Kalpa (Marathi Book)
Sri Ganesha Sahasranama Bhashyartha (Marathi Book)
Sri Guru Gita (Marathi Book)

Shiva Kathamrutha (Tamil Book)
Sri Anaghashtami Vrata Kalpa (Tamil Book)
Sri Jayalakshmi Matru Dwadasha Sooktulu (Tamil Book)
Sri Lalita Sahasranama Lekhana Mahayajna (Tamil Book)

Datta Darshana (Gujarathi Book)
Sri Guru Gita (Gujarati Book)

Srimad Bhagavad-Gita Chanting Book (Sanskrit)
`;
const LANGS = [
  ['kn', 'Kannada'], ['te', 'Telugu'], ['en', 'English'], ['hi', 'Hindi'],
  ['mr', 'Marathi'], ['ta', 'Tamil'], ['gu', 'Gujarati'], ['sa', 'Sanskrit'],
];
const cleanTitle = (t) => t
  .replace(/\s*\(Swamiji's Life History (Kannada|Telugu) Book\)$/, ' (Swamiji’s Life History)')
  .replace(/\s*\(Sri Swamiji's life history English Book\)$/, ' (Sri Swamiji’s life history)')
  .replace(/\s*\(Abridged version - Telugu Book\)$/, ' (Abridged version)')
  .replace(/\s*\(Telugu & English Book\)$/, ' (Telugu & English)')
  .replace(/ Telugu Book \(3 Volumes\)$/, ' (3 Volumes)')
  .replace(/ Telugu Books Set$/, ' Books Set').replace(/ English Books Set$/, ' Books Set')
  .replace(/\s*-\s*Telugu Book$/, '')
  .replace(/ English Book$/, '')
  .replace(/\s*\((Kannada|Kanada|Telugu|English|Hindi|Marathi|Tamil|Gujarathi|Gujarati|Sanskrit)([ -]Books?)?\)$/, '')
  .replace(/ Book \((English|Kannada|Telugu|Marathi|Sanskrit)\)$/, ' Book')
  .replace(/'/g, '’');
const books = BOOKS_RAW.trim().split(/\n\s*\n/).flatMap((block, i) => block.trim().split('\n').map((t) => ({ t: cleanTitle(t.trim()), lang: LANGS[i] })));
const byLang = Object.fromEntries(LANGS.map(([k]) => [k, books.filter((b) => b.lang[0] === k).length]));

function literature() {
  const order = ['te', 'en', 'kn', 'hi', 'mr', 'ta', 'gu', 'sa'];
  const name = Object.fromEntries(LANGS);
  return `<div class="lit">
  <div class="lit-intro" data-reveal="up">
    <p class="lit-lede">To quench the thirst for divine wisdom in seekers, Sri Swamiji has penned several books on spirituality, prominently in Telugu and Kannada, besides composing Keertanas and Bhajans in many languages including English, Sanskrit, Telugu and Kannada.</p>
    <p>Scholars associated with Datta Peetham have translated his texts into other languages, and some have authored books on spirituality under the aegis of the Peetham.</p>
    ${stats([[String(books.length), 'Titles published by the Peetham'], [String(byLang.te), 'In Telugu'], [String(byLang.en), 'In English'], [String(byLang.kn), 'In Kannada']])}
    <div class="lit-store">
      <span class="lit-store-icon">${icon('book', 24)}</span>
      <p>Books published by Avadhoota Datta Peetham are available at the <b>Raga Ragini Book Store</b> in the Mysuru Ashram and in some branches of the Peetham, and online.</p>
    </div>
    <div class="btn-row">
      ${btn('Raga Ragini online store', EXT.ragaRagini, 'gold', 'arrow-up-right', ext)}
      ${btn('The official list', EXT.literary, 'line', 'arrow-up-right', ext)}
    </div>
  </div>
  <div class="lit-catalogue" data-filter-scope data-reveal="up">
    <div class="lit-cat-head">
      <h3>The catalogue</h3>
      <p class="lit-count" data-lit-count aria-live="polite">${books.length} titles in ${LANGS.length} languages</p>
    </div>
    ${chips('Show books in', [['all', `All <small>${books.length}</small>`], ...order.map((k) => [k, `${name[k]} <small>${byLang[k]}</small>`])])}
    <div class="lit-pane" tabindex="0" role="region" aria-label="Books published by Avadhoota Datta Peetham" data-lenis-prevent>
      <ul class="lit-list">
        ${books.map((b) => `<li data-filter-item="${b.lang[0]}"><span class="lit-t">${esc(b.t)}</span><span class="lit-l">${b.lang[1]}</span></li>`).join('')}
      </ul>
    </div>
  </div>
</div>`;
}

// ---------------------------------------------------------------- Bhaktimala
function bhaktimala() {
  const beads = Array.from({ length: 23 }, (_, i) => {
    const t = i / 22, x = 20 + t * 360, y = 34 + Math.sin(t * Math.PI) * 96;
    const flower = i % 4 === 2;
    return flower
      ? `<g class="bm-flower" style="--i:${i}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="7.5"/><circle r="2.6" class="bm-heart"/></g>`
      : `<circle class="bm-bead" style="--i:${i}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i % 2 ? 3.4 : 4.6}"/>`;
  }).join('');
  return `<div class="bm">
  <div class="bm-mast" data-reveal="scale">
    <svg class="bm-garland" viewBox="0 0 400 160" aria-hidden="true">
      <path class="bm-string" d="M20 34 C 120 168, 280 168, 380 34" pathLength="1"/>
      ${beads}
    </svg>
    <span class="bm-since">Since <b>1976</b></span>
    <span class="bm-title">Bhakti Mala</span>
    <span class="bm-meaning">A Garland of Devotion</span>
    <span class="bm-rule" aria-hidden="true"></span>
    <span class="bm-meta">Monthly magazine · seven languages</span>
    <svg class="bm-mandala" viewBox="0 0 104 104" aria-hidden="true"><use href="#i-mandala"/></svg>
  </div>
  <div class="bm-copy">
    ${sectionHead({ eyebrow: 'Bhaktimala magazine', title: 'Devotion, <span class="em-light">every month</span>', align: 'left' })}
    <p class="lead" data-reveal="up">Bhaktimala, “a Garland of Devotion”, is the Peetham’s monthly magazine. It began in 1976 to spread spiritual awareness and moral values, especially among students.</p>
    <ul class="bm-facts" data-stagger>
      <li><span class="bm-ic">${icon('globe', 20)}</span><span><b>Seven languages</b>Including Telugu, Kannada, Tamil, Hindi, English and German.</span></li>
      <li><span class="bm-ic">${icon('mobile', 20)}</span><span><b>Now in the app</b>All Kannada and English monthly issues since October 2022 are in the Bhaktimala app.</span></li>
      <li><span class="bm-ic">${icon('mail', 20)}</span><span><b>Access &amp; subscriptions</b>Existing subscribers can request access; for new subscriptions, contact the Bhaktimala office at Datta Peetham, Mysuru: <a href="${EXT.bhaktimalaMail}">bhaktimala@sgstech.cc</a></span></li>
    </ul>
    <div class="btn-row" data-reveal="up">
      ${btn('Write to the office', EXT.bhaktimalaMail, 'gold', 'mail')}
      ${btn('Free back issues', 'media.html#books', 'line', 'download')}
      ${btn('Facebook', EXT.bhaktimalaFb, 'line', 'fb', ext)}
    </div>
  </div>
</div>`;
}

// ---------------------------------------------------------------- Sanatana Dharma
const pillars = [
  { img: P.gitaChicago, alt: 'Thousands seated in rows at NOW Arena, Chicago, for the Bhagavad Gita chanting', icon: 'book', title: 'Propagation of the Bhagavad Gita',
    text: 'Through Gita Mahayajna, envisioned by Sri Swamiji in 2015, students memorise all 700 verses. On 20 July 2024, 8,000 people recited the entire Gita at NOW Arena, Chicago.',
    links: [['SGS Gita (India)', EXT.gitaIndia], ['SGS Gita Foundation (USA)', EXT.gitaUsa]], wide: true },
  { img: P.pathashala, alt: 'The SGS Veda Pathashala building at the Mysuru Ashram', icon: 'school', title: 'SGS Veda Pathashala',
    text: 'Classes in all four Vedas and in Sanskrit, in the traditional Gurukula system, for around 120 students at the Mysuru Ashram.',
    links: [['Veda Nidhi', EXT.vedanidhi]], wide: true },
  { img: P.yaaga, alt: 'Sri Swamiji offers prayers during the Sri Sukta Maha Yaaga, flames rising before him', icon: 'flame', title: 'Homas & Yaagas', pos: '50% 22%',
    text: 'Ganapathy Homa wherever Sri Swamiji is; Pavamana Homa at the Mysuru Ashram on every full moon day; the Ati Rudra Yaaga at Srisailam in 2023.' },
  { img: P.gauShala, alt: 'Sri Swamiji feeds the cows at the Gau Shala, Mysuru Ashram', icon: 'cow', title: 'Gau Samrakshana',
    text: 'The scriptures declare that all Devatas reside in a cow, reverentially called Gomata. The Gau Shala at the Mysuru Ashram houses more than 50 cows.' },
  { img: photos.dattatreya, alt: 'Nirajanam offered to Lord Dattatreya at the temple', icon: 'temple', title: 'Establishment of temples', pos: '50% 35%',
    text: 'Over 80 branches across India, among them 16 Ashrams for the 16 incarnations of Lord Dattatreya, Datta Kasi, Datta Rameshwaram and 9 Navanatha Kshetras.' },
];

function dharma() {
  return `<div class="sd">
  <figure class="sd-def" data-reveal="up">
    <blockquote><p>Sanatana Dharma roughly translates to <em>“a righteous way of human living that has been in practice since time immemorial”</em>.</p></blockquote>
    <figcaption>It upholds the peaceful coexistence of all beings under the single roof called Earth.</figcaption>
  </figure>
  <div class="sd-grid" data-stagger>
    ${pillars.map((p) => `<article class="sd-card${p.wide ? ' is-wide' : ''}">
      <div class="sd-media">${img(p.img, p.alt, { pos: p.pos })}</div>
      <div class="sd-body">
        <span class="sd-icon">${icon(p.icon, 22)}</span>
        <h3>${p.title}</h3>
        <p>${p.text}</p>
        ${p.links ? `<p class="sd-links">${p.links.map(([t, h]) => `<a class="link-arrow" href="${h}"${ext}>${t} ${icon('arrow-up-right', 14)}</a>`).join('')}</p>` : ''}
      </div>
    </article>`).join('')}
  </div>
  <p class="sd-more" data-reveal="up">${btn('Sanatana Dharma Parirakshana on dattapeetham.org', EXT.dharma, 'line', 'arrow-up-right', ext)}</p>
</div>`;
}

// ---------------------------------------------------------------- Ask Dattaji
const questions = [
  'Why do we light lamps during puja?',
  'Who created the moon and the stars?',
  'Why did Rama conceal himself behind a tree to slay Vali?',
  'Why did Draupadi have five husbands?',
  'What makes Sanatana Dharma so special?',
];

function askDattaji() {
  return `<div class="ask">
  <div class="ask-copy">
    <span class="eyebrow">Ask Dattaji · a special gift from Pujya Dattaji</span>
    <h2 data-split>Ask Dattaji <span class="em-light">100,000</span> questions</h2>
    <p class="lead" data-reveal="up">An incredible opportunity for everyone, children and elders alike, to get answers to their questions from Pujya Datta Swamiji.</p>
    <p data-reveal="up">Pujya Dattaji knows that we have curiosity, questions and doubts about our culture and tradition. And when these questions are clarified, our conviction in Dharma becomes strong. So to deepen our understanding and conviction, Pujya Dattaji decided to give answers to 100,000 questions sent by us.</p>
    <p class="ask-nolimit" data-reveal="up">${icon('sparkle', 18)} Ask as many questions as you want. There is no limit.</p>
    <div class="btn-row" data-reveal="up">
      ${btn('Ask your questions', EXT.askSurvey, 'gold', 'arrow-up-right', `${ext} data-magnetic`)}
      ${btn('About Ask Dattaji', EXT.askDattaji, 'ghost', 'arrow-up-right', ext)}
    </div>
    <p class="ask-note" data-reveal="up">Questions are collected on survey.tataji.app, the link given on the Peetham’s Ask Dattaji page.</p>
  </div>
  <div class="ask-qs">
    <p class="ask-qs-head" data-reveal="up">Have you ever wondered…</p>
    <ul data-stagger>
      ${questions.map((q, i) => `<li style="--r:${[-1.6, 1.2, -0.6, 1.8, -1.1][i]}deg"><span class="ask-mark" aria-hidden="true">?</span>${q}</li>`).join('')}
    </ul>
  </div>
</div>`;
}

// ---------------------------------------------------------------- glossary
const GLOSSARY_RAW = `
Abhiseka | ablution of a Deity
Agni | fire, name of the Firegod
Akasha tattva | principle of ether
Alamkara | decoration
Amsha | part
Ananda | bliss
Arati | camphor light which is turned clockwise in front of a Deity
Artha | materialistic attainments
Asana | lit.: seat, posture; in general use set of a holy person or seat used for meditiation
Avatara | incarnation of a Deity
Ayurveda | science of life
Bhagavat Gita | the song of the divine, one of the source books of Hindu philosophy, the sacred dialog between Krishna and Arjuna
Bhagavati | name of Mother Goddess
Bhajan | spiritual song
Bhakti | devotion
Bhakti Yoga | the achievement of union with the universal spirit through devotion
Bharat | India
Brahman / Brahma | the Supreme Being, the all pervading spirit
Chakra | lit: wheel or circle; in general use: energy centers of the subtle body, junctions of the Naadis. The seven main chakras are: Mooladhara, Svadhisthana, Manipuraka, Anaahata, Vishuddha, Ajna and Sahasrara
Chandra | moon
Darsana | becoming visible, appearance of a holy being
Dattastava | prayer on Lord Dattatreya in eight verses, recited daily at the Ashram
Deva | God
Devi | Goddess
Dharma | the authourity for the code of conduct by which man can make his life sublime. Whenever man deviates from the path of dharma, formless God assumes a form and brings the strayed back to the path of dharma. This process is an eternal one.
Diksha | vow
Ekagrata | concentration, one-pointedness
Gopika | lit: a cowherd lady; in general use: a cowherd lady who adrores Lord Krishna
Graha | planet
Grahana | eclipse
Hatha Yoga | the way towards realization through rigorous disciplines, commonly understood as the yogic exercises, the asanas
Homa | fire ritual for the worship of Agni, the Lord of fire
Homa kunda | pit in which the fire worship is performed
Japa | muttered prayer or mantra, usually by counting beads of a rosary
Jeevatma | individual, personal soul
Jnana / Gnana | knowledge
Kaama | desire, lust
Kalasha | lit: pot; in general use: a copper pot containing water, placed in a plate of uncooked rice and topped with leaves and decorated with coconut, all together representing a Deity
Kali Yuga | ref. Yuga
Karma | lit.: action; in general use: the total of our past actions, good and bad, of which we bear the fruits in this life
Karma Yoga | the way which leads to realization performing selfless acts
Kriya Yoga | The way which leads to realization by refining the senses and getting control over them through mental exercises and Pranayamas
Leela | lit.: play; in general use: the world of manifestation is considered as the play of God
Lingam / Linga | lit.: symbol; in general use: a bare idol in the form of an egg or a rounded cylinder symbolizing Shiva who has no beginning or end
Mahabhagavata | a book describing the stories of Gods
Mantra | sacred words imbued with power
Mata | Mother
Maya | illusion
Moksha | liberation, final emancipation of the soul from the cycle of births and deaths
Mouna | silence
Mrdanga | Indian percussive-instrument
Mukti | liberation
Naada | sound
Naada Nidhi | a treasure of sounds
Naada Yoga | the way towards realization by listening and concentration on sounds
Naadi | tubular organ of the subtle body through which spiritual energy flows
Namaskaara | lit.: bending forward; in general use: prostration
Navagraha | the nine planets: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Raahu (Dragon's head) and Ketu (Dragon's tail)
Nirguna | without quality
Omkara | primordial sound
Padmaasana | Lotus posture, sitting with crossed legs
Paduka | lit.: footwear; in general use: sandals of a saint
Pancabhoota | the five elements: earth, water, fire, air, ether
Paramatma | the supreme, all pervading soul
Pooja | ref. puja
Pradaksina | circumbulation of an idol or a temple clockwise, turning around clockwise in front of an idol as part of prostration
Prakrti | nature with its quality of creation and destruction
Prana | life force
Prasada | lit.: blessing, grace; in general use: offering which we get back after it has been blessed or gift given by a holy being or after the worship is over
Pranayama | breathing exercices with the benefit of extending the prana
Prayatna | endeavour, effort
Puja | a vedic ritual for the worship of God
Puja mandapa | temple for the Deity, the idol which is being worshipped
Purana | literature of old stories about great souls
Purnatattva | principle of completeness
Purusa | Supreme Being, existing from the beginning and forever
Raaga | sequence of musical notes, 72 main ragas form the basis of the Indian music system
Raja Yoga | the achievement of the union with the universal soul by becoming the ruler of one's mind
Raksasa | demon
Sadhaka | aspirant
Sadhana | practice, quest
Saguna | with quality
Sahasrara chakra | ref. chakra
Shakti | spiritual energy, the dynamic element of consciousness
Shakti paata | transferring one's own spiritual energy to another person
Samhaara | destruction
Samkalpa | determination
Samsaara | succession of births and deaths
Samskrit | language of the holy scripture, the Veda
Sari | the traditional dress of Indian women
Satvic | ref. to Sattva, one of the three qualities (gunas) constituting nature: Sattva - purity, goodness: Rajas - passion, agitation: Tamas - darkness, ignorance
Seva | service
Shiva Linga | ref. linga
Siddhi | lit.: accomplishment: in the context of Yoga: super human power. There are eight such powers (ashta siddhis): Anima (ability to become small), Mahima (to become big) Garima (to become heavy) Laghima (to become light), Prapti (to attain whatever desired), Prakaamya (to be present at any place at any time), Ishitva (to transcend all human limits), Vashitva (to control the sense organs)
Siddha purusha | a supreme being who is master of the eight super human powers
Sishya | student, disciple
Shloka | verse
Soham | "That am I, the unconscious repetitive prayer that goes on with every inhalation and exhalation
Shraddha | faith, interest
Sri Chakra | commonly considered as the symbol for Mother Goddess
Sri Chakrarcana | the outer worship (bahiraga) of Sri Chakra
Sri Vidya Upasana | the mental worship (antaryaaga) of the knowledge of Mother Goddess
Sri Yantra | a geometrical drawing symbolizing Mother Goddess
Surya | Sun
Sushupti | one of the tree states of existence: Sushupti - state of dreamless sleep; Svapna - dreaming state; Jagrat - wakeful state
Svadharma | one's personal righteous conduct according to age, sex, position
Tapas | penance, austerity
Teertha | liquid (like water, milk) which is distributed after having been poured over the deity during the worship
Treta Yuga | ref. Yuga
Vairaagya | dispassion, absence of worldly desires
Vastra | dress, cloth
Vidyaarthi | student
Veda | the sacred scriptures revealed by the Supreme Being, adopted by the Hindus. There are four parts: Rigveda, Yajurveda Saamaveda, Atharvaveda
Vedanta | the final part of the Veda in which the true principle of God is described,
Veda Nidhi | a treasure of Vedas
Yantra | a geometrical drawing symbolizing a deity
Yajna | sacrifice, worship
Yajurveda | ref. Veda
Yogakendra | center of Yoga
Yogaprastha | who is best in Yoga
Yuga | epoch: According to the vedic tradition there are four epochs: Krita Yuga -first; Treta Yuga - second; Dvapara Yuga -third; Kali Yuga -fourth (which is running now)
`;
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
const terms = GLOSSARY_RAW.trim().split('\n').map((l) => {
  const [term, ...rest] = l.split(' | ');
  return { term: term.trim(), def: rest.join(' | ').trim(), id: `g-${slug(term.split(' / ')[0])}` };
});
// "ref. Yuga" → link to the Yuga entry (names compared without case; "Lingam / Linga" answers "linga").
function findTerm(name) {
  const n = name.trim().toLowerCase();
  return terms.find((t) => t.term.toLowerCase() === n || t.term.toLowerCase().split(' / ').includes(n));
}
function defHtml(t) {
  const m = /^ref\. (?!to )(.+)$/.exec(t.def);
  const target = m && findTerm(m[1]);
  if (target) return `ref. <a class="gl-ref" href="#${target.id}">${esc(m[1])}</a>`;
  return esc(t.def);
}
const letters = [...new Set(terms.map((t) => t.term[0].toUpperCase()))];

function glossary() {
  const groups = letters.map((L) => `<section class="gl-group" id="gl-${L.toLowerCase()}" aria-labelledby="gl-h-${L.toLowerCase()}" data-gl-group>
      <h3 class="gl-letter" id="gl-h-${L.toLowerCase()}">${L}</h3>
      <dl>
        ${terms.filter((t) => t.term[0].toUpperCase() === L).map((t) => `<div class="gl-item" id="${t.id}" data-gl-item>
          <dt>${esc(t.term)}</dt>
          <dd>${defHtml(t)}</dd>
        </div>`).join('')}
      </dl>
    </section>`).join('');
  return `<div class="gl" data-glossary>
  <div class="gl-side" data-reveal="up">
    <div class="gl-search" data-gl-search hidden>
      <label for="gl-q">Search ${terms.length} terms</label>
      <div class="gl-field">${icon('search', 18)}<input id="gl-q" type="search" placeholder="Try “yoga” or “Prasada”" autocomplete="off" spellcheck="false" data-gl-input><button type="button" class="gl-clear" data-gl-clear aria-label="Clear the search" hidden>${icon('close', 16)}</button></div>
      <p class="gl-status" data-gl-status aria-live="polite">${terms.length} terms</p>
    </div>
    <nav class="gl-letters" aria-label="Glossary letters">
      ${letters.map((L) => `<a href="#gl-${L.toLowerCase()}" data-gl-letter="${L}">${L}</a>`).join('')}
    </nav>
    <p class="gl-source">Definitions as published in the <a href="${EXT.glossary}"${ext}>Datta Peetham Glossary</a>.</p>
  </div>
  <div class="gl-pane" tabindex="0" role="region" aria-label="Glossary of terms" data-gl-pane data-lenis-prevent data-reveal="up">
    ${groups}
    <p class="gl-empty" data-gl-empty hidden>No term matches that search. Try a shorter word.</p>
  </div>
</div>`;
}

// ---------------------------------------------------------------- page
export default {
  slug: 'teachings',
  file: 'teachings.html',
  title: 'Discourses & Teachings',
  crumb: 'Teachings',
  nav: 'Teachings',
  description: 'Read the discourses of Sri Swamiji and Sri Bala Swamiji, Sri Swamiji’s sayings, 168 books, the Bhaktimala magazine, Ask Dattaji and a glossary of 121 terms.',
  image: P.preaching,
  preload: P.preaching,
  css: true,
  scripts: ['teachings'],
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'DefinedTermSet',
      name: 'Datta Peetham Glossary',
      url: 'https://www.dattapeetham.org/teachings.html#glossary',
      hasDefinedTerm: terms.map((t) => ({ '@type': 'DefinedTerm', name: t.term, description: t.def })),
    },
  ],
  render: () => `
${pageHero({
  eyebrow: 'Discourses · Sayings · Literature',
  title: 'Discourses &amp; <span class="em-light">Teachings</span>',
  lead: 'The discourses of Sri Ganapathy Sachchidananda Swamiji and Sri Datta Vijayananda Teertha Swamiji, Sri Swamiji’s sayings and books, the Bhaktimala magazine and the words you will hear at the Ashram.',
  image: P.preaching,
  pos: '50% 35%',
  crumb: 'Teachings',
  tiles: [
    { icon: 'mic', title: 'Discourses', note: 'Two collections', href: '#discourses' },
    { icon: 'sparkle', title: 'Sri Swamiji Says', note: 'Sayings archive', href: '#swamiji-says' },
    { icon: 'book', title: 'Literature', note: `${books.length} titles`, href: '#literature' },
    { icon: 'article', title: 'Bhaktimala', note: 'Monthly since 1976', href: '#bhaktimala' },
    { icon: 'namaste', title: 'Ask Dattaji', note: '100,000 questions', href: '#ask-dattaji' },
    { icon: 'search', title: 'Glossary', note: `${terms.length} terms`, href: '#glossary' },
  ],
})}

<section class="section tc-discourses" id="discourses">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Datta Vaakya · Vijaya Vyakhya', title: 'Words that <span class="em-light">awaken</span>', lead: 'Speeches of His Holiness Sri Ganapathy Sachchidananda Swamiji and Pujya Sri Datta Vijayananda Teertha Swamiji, kept in two collections on dattapeetham.org.' })}
    ${collections()}
    ${recentRail()}
    ${archiveRow()}
    <figure class="tc-lit">
      ${scrollLit('A speech is an *inspiration!* It is a medicine in despair! It triggers the *enlightenment* from within!')}
      <figcaption data-reveal="up">From the Peetham’s speeches archive</figcaption>
    </figure>
  </div>
</section>

<section class="section section-dark tc-says grain" id="swamiji-says" aria-labelledby="says-title">
  <div class="wrap">
    ${sayingsCarousel().replace('<h2 data-split>', '<h2 id="says-title" data-split>')}
  </div>
</section>

<section class="section section-paper tc-literature" id="literature">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Literary contributions', title: 'A library of <span class="em-light">wisdom</span>', lead: `${books.length} titles published by Avadhoota Datta Peetham, in Kannada, Telugu, English, Hindi, Marathi, Tamil, Gujarati and Sanskrit.` })}
    ${literature()}
  </div>
</section>

<section class="section section-sand tc-bhaktimala" id="bhaktimala">
  <div class="wrap">
    ${bhaktimala()}
  </div>
</section>

<section class="section tc-dharma" id="dharma">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Sanatana Dharma Parirakshana', title: 'Protecting the <span class="em-light">eternal</span> way', lead: 'Inspired by Lord Dattatreya’s teachings, Sri Swamiji has toured India extensively to promote Sanatana Dharma, and welcomes everyone, of any faith or none.' })}
    ${dharma()}
  </div>
</section>

<section class="section section-dark tc-ask" id="ask-dattaji" aria-labelledby="ask-title">
  <canvas class="fx-canvas" data-constellation aria-hidden="true"></canvas>
  <div class="wrap">
    ${askDattaji().replace('<h2 data-split>', '<h2 id="ask-title" data-split>')}
  </div>
</section>

<section class="section section-paper tc-glossary" id="glossary">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Datta Peetham glossary', title: 'Words you will <span class="em-light">hear</span>', lead: `From Abhiseka to Yuga: ${terms.length} terms used at the Ashram, in the Peetham’s own definitions.` })}
    ${glossary()}
  </div>
</section>

<section class="section tc-paths" id="practice">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Wisdom in practice', title: 'Teachings you can <span class="em-light">live</span>', lead: 'Two of Sri Swamiji’s paths to put the teachings into daily practice: healing through music, and breath, body and mind.' })}
    <div class="tc-paths-grid" data-stagger>
      ${photoTile({ img: photos.nadaMantapaInterior, tag: 'Nada Chikitsa', title: 'Healing through music', text: '1989 saw the study of Raga Ragini and Dhyana Chikitsa Kacheri restored, and an R&amp;D branch on Nada Chikitsa set up.', href: 'music.html' })}
      ${photoTile({ img: P.kriyaTeach, tag: 'Datta Kriya Yoga', title: 'Breath, body, mind', text: 'Datta Kriya Yoga facilities were introduced at the Mysuru Ashram in 1981.', href: 'kriya-yoga.html' })}
    </div>
  </div>
</section>

${ctaBand({
  title: 'Carry the teachings home',
  text: 'Subscribe to the Peetham’s notifications, or watch and listen to Sri Swamiji’s discourses, music and films.',
  actions: `${btn('Subscribe for notifications', links.subscribe, 'gold', 'arrow-up-right', ext)}${btn('Watch &amp; listen', 'media.html', 'ghost', 'play-circle')}`,
})}
`,
};
