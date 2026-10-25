// Sri Ganapathy Sachchidananda Swamiji: a cinematic biography.
// Every fact below comes from dattapeetham.org (page/view/sri-swamiji,
// sri-bala-swamiji, sri-jayalakshmi-maata, datta-kashi, awards-honors,
// sri-swamijis-avatara-timeline, bhajans-and-healing-music,
// sanatana-dharma-parirakshana, social-activities, contribution-towards-nature,
// literary-contributions, social-media-pages) or from src/data.mjs.

import { pageHero, sectionHead, split, frame, cards, stats, ctaBand, gallery, video, timeline, processSteps, scrollLit, marquee, btn, icon, img, eyebrow } from '../components.mjs';
import { lampChainAttrs, padmaOrnament } from '../features/devotion-motion.mjs';
import { site, links, OFFICIAL, PAGE_IMG } from '../site.mjs';
import { photos, timeline as avataraTimeline } from '../data.mjs';

const page = (slug) => `${OFFICIAL}/page/view/${slug}`;

// Official photographs from the Peetham's own pages (S3 bucket).
const pic = {
  mekedatu: 'https://dattapeetham.s3.amazonaws.com/images/site_assets/peetham-ashrams/shodasha-datta-kshetras/17-datta-kashi-mekedatu.jpg',
  maata: `${PAGE_IMG}524/524_61f724d553c7b9ff.jpg`,
  maataAradhana: `${PAGE_IMG}524/524_e81cb9e39404b7ea.jpg`,
  sriChakra: `${PAGE_IMG}522/522_941ed41cd955b8c8.jpg`,
  preaching: `${PAGE_IMG}522/522_e6aadc94cb31b022.jpg`,
  musicHealing: `${PAGE_IMG}522/522_76f24eb8666dc213.jpg`,
  caveConcert: `${PAGE_IMG}513/513_0f3f84798f6304a5.jpg`,
  treatise: `${PAGE_IMG}513/513_89d98c9589d0e47e.png`,
  yaaga: `${PAGE_IMG}514/514_a731e21742a19093.jpg`,
  nadiShuddhi: `${PAGE_IMG}517/517_6bdd743580dc469e.png`,
  annadana: `${PAGE_IMG}516/516_2d522eb6783cea2d.jpg`,
  prakrutiPuja: `${PAGE_IMG}518/518_3afb42ae5333fe82.jpg`,
  threeRecords: `${PAGE_IMG}517/517_0f1b0c465f134173.jpg`,
  tenali: `${PAGE_IMG}517/517_9731381c10bc96c2.jpg`,
  shukaVanaRecord: `${PAGE_IMG}518/518_dc50e08d3e9b68eb.png`,
  stamp2024: `${PAGE_IMG}517/517_42c18ff9b9fe6da1.jpg`,
  carnaticBand: `${PAGE_IMG}517/517_0eaa9fdc9b71b96c.jpg`,
  bala: `${PAGE_IMG}523/523_e0e53980acae1f62.jpg`,
  withBala: `${PAGE_IMG}523/523_718dd21197aeb983.jpg`,
  padayatra: `${PAGE_IMG}523/523_d72e3bd45e536b33.jpg`,
};

// Doctorates and awards (awards-honors page and the Avatara Timeline).
const honours = [
  ['2013', 'Honorary Doctorate in Music', 'Vijayanagara Sri Krishna Devaraya University, Bellary — conferred at the Mysuru Ashram on 22 June 2013.'],
  ['2016', 'Honorary Doctorate', 'World Classical Tamil University, London — 23 May 2016. The certificate reads Doctor of Letters (honoris causa).'],
  ['2022', 'Piteelu Chowdaiah Lifetime Award', 'Sri Nadabrahma Sangeetha Sabha and Sangeetha Ratna Mysuru T. Chowdaiah Samsmarana Vedike, Mysuru — 19 January 2022.'],
  ['2022', 'Yoga Ratna Award', 'Shwaasa Guru Sri Vachanananda Swamiji’s Shwaasa Yoga Peetha, presented by the Governor of Karnataka in Bengaluru — 11 June 2022.'],
  ['2023', 'Honorary Doctorate', 'Karnataka State Dr. Gangubai Hanagal Music and Performing Arts University, at Raj Bhavan, Bengaluru — 31 October 2023.'],
  ['2026', 'Nada Yoga Sarvabhauma', 'With an Honorary Doctorate (Acharya) in Nada Yoga, from Vedic Wellness University, Florida — at Nada Mantapa, 15 February 2026.'],
];

// Guinness World Records titles, in the order and wording of the awards page.
const records = [
  ['31 Jan 2015', 'Most people chanting at a single venue', '1,28,918 participants led by Sri Swamiji in the Hanuman Chalisa for world peace — Tenali, Andhra Pradesh.'],
  ['6 Apr 2015', 'Largest music therapy lesson', '1,814 people at the Sydney Opera House, Australia.'],
  ['31 Jul 2015', 'Longest chanting marathon (team)', '24 hours, 10 minutes, 8 seconds at Karya Siddhi Hanuman Temple, Frisco, Texas, USA.'],
  ['10 Jul 2016', 'Largest breathing lesson', 'India Community Center, Milpitas, California, USA.'],
  ['31 Jul 2016', 'Largest online video album of people chanting', '40,976 videos of the Hanuman Chalisa, announced at Carapichaima, Trinidad and Tobago.'],
  ['21 Dec 2016', 'Largest display of bonsai trees', '2,649 trees at the World Bonsai Convention, Mysuru Ashram.'],
  ['6 May 2017', 'Most bird species in an aviary', '468 species, as the certificate states — Shuka Vana, SGS Ashram, Mysuru. Some Peetham pages give 486.'],
  ['26 May 2017', 'Largest Hindu Smriti', 'The Bhagavad Gita in 18 languages: 2.24 m × 1.56 m, 742 pages, 800 kg.'],
  ['26 May 2018', 'World’s largest special stamp', '2.87 m², depicting the Vishwam Museum.'],
  ['10 Jun 2022', 'Largest online video album of birthday wishes/greetings', '7,651 wishes from devotees in many countries, for Sri Swamiji’s 80th birthday.'],
  ['10 Jun 2022', 'Largest online video album of people walking', '6,389 — a virtual walkathon alongside the Vishwashanti Paada Yatra.'],
  ['13 Aug 2022', 'Largest simultaneous Hindu text recital', '1,329 participants reciting the Bhagavad Gita — Allen Event Center, Texas, USA.'],
  ['13 Dec 2024', 'The largest special stamp', '13.104 m², depicting Nada Mantapa — Avadhoota Datta Peetham, Mysuru.'],
  ['12–13 Dec 2024', 'Longest chanting marathon (team)', 'Hanuman Chalisa for 33 hours, 33 minutes and 33 seconds at Nada Mantapa.'],
  ['14 Jun 2025', 'The largest display of bonsai trees', '10,836 trees across 257 species, during the Vruksha Shanti Pooja.'],
  ['9 Jul 2025', 'Largest Carnatic band', '955 artists in “Sri Venkateshwara Vaibhavam” — CUTX Event Center, Allen, Texas, USA.'],
];

// Official social media (page/view/social-media-pages).
const xIcon = '<svg class="ico" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z"/></svg>';
const social = [
  { name: 'YouTube', ic: icon('yt', 20), items: [
    ['Sri Ganapathy Sachchidananda Swamiji', 'https://www.youtube.com/@sgsswamiji'],
    ['Avadhoota Datta Peetham', 'https://www.youtube.com/@DattaPeetham'],
    ['Gurubhavana ADPT', 'https://www.youtube.com/@gurubhavanaadpt'],
    ['SGS Raga Sagara', 'https://www.youtube.com/@SGSRagaSagara'],
    ['SGS Kirtan', 'https://www.youtube.com/@SGSKirtan'],
  ] },
  { name: 'Facebook', ic: icon('fb', 20), items: [
    ['Sri Ganapathy Sachchidananda Swamiji', 'https://www.facebook.com/SriSwamiji'],
    ['Avadhoota Datta Peetham', 'https://www.facebook.com/sgspage'],
    ['Guru Bhavana ADPT', 'https://www.facebook.com/gurubhavana.adpt'],
    ['Raga Sagara', 'https://www.facebook.com/RagaSagara'],
    ['Bhaktimala Datta Peetham', 'https://www.facebook.com/bhaktimala'],
  ] },
  { name: 'Instagram', ic: icon('ig', 20), items: [
    ['sgsswamiji', 'https://www.instagram.com/sgsswamiji/'],
    ['dattapeetham', 'https://www.instagram.com/dattapeetham/'],
    ['sgsragasagara', 'https://www.instagram.com/sgsragasagara/'],
    ['Shuka Vana · sgsbirds', 'https://www.instagram.com/sgsbirds/'],
    ['bonsaisgs', 'https://www.instagram.com/bonsaisgs/'],
  ] },
  { name: 'X', ic: xIcon, items: [
    ['Sri Ganapathy Sachchidananda Swamiji', 'https://x.com/SgsSwamiji'],
    ['Avadhoota Datta Peetham', 'https://x.com/dattapeetham'],
    ['SGS Birds', 'https://x.com/SGSBirds'],
  ] },
];

const sayings = [
  'Patience is the greatest penance. Lead a simple life.',
  'Show courage when faced with difficulties. Show kindness towards all beings.',
  'Do not ask God for anything.',
  'Never compromise on your morals.',
];

const chapter = ({ n, year, title, body, facts = [], media, reverse }) => `<article class="sgs-chapter${reverse ? ' is-reverse' : ''}" aria-labelledby="ch-${n}">
  ${split({ media, reverse, body: `
    <span class="sgs-numeral" aria-hidden="true">${n}</span>
    <span class="sgs-ch-kicker">Chapter ${n}${year ? ` <i aria-hidden="true"></i> ${year}` : ''}</span>
    <h3 id="ch-${n}">${title}</h3>
    ${body}
    ${facts.length ? `<dl class="sgs-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}` })}
</article>`;

export default {
  slug: 'sri-swamiji',
  file: 'sri-swamiji.html',
  title: 'Sri Ganapathy Sachchidananda Swamiji',
  crumb: 'Sri Swamiji',
  nav: 'Sri Swamiji',
  description: 'The life and mission of Sri Ganapathy Sachchidananda Swamiji, born at Mekedatu in 1942: his Avatara Timeline, world records, honours and Sri Bala Swamiji.',
  image: photos.swamijiGarland,
  preload: photos.swamijiGarland,
  css: true,
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Sri Ganapathy Sachchidananda Swamiji',
      alternateName: ['Sri Swamiji', 'Satyanarayana'],
      birthDate: '1942-05-26',
      birthPlace: { '@type': 'Place', name: 'Mekedatu, Karnataka, India' },
      jobTitle: 'Founder-Pontiff, Avadhoota Datta Peetham',
      worksFor: { '@type': 'Organization', name: 'Avadhoota Datta Peetham', url: `${site.origin}/` },
      image: photos.swamijiGarland,
      url: `${site.origin}/sri-swamiji.html`,
      award: honours.map(([, t, d]) => `${t} — ${d.split(' — ')[0]}`),
      sameAs: ['https://www.facebook.com/SriSwamiji', 'https://www.youtube.com/@sgsswamiji', 'https://www.instagram.com/sgsswamiji/', 'https://x.com/SgsSwamiji'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Sri Datta Vijayananda Teertha Swamiji',
      alternateName: ['Sri Bala Swamiji', 'Sri Harsha Sharma'],
      birthDate: '1977-01-14',
      birthPlace: { '@type': 'Place', name: 'Mysuru, Karnataka, India' },
      jobTitle: 'Junior Pontiff, Avadhoota Datta Peetham',
      image: pic.bala,
    },
  ],
  render: () => `
${pageHero({
  eyebrow: 'Sadguru · Founder-Pontiff of Avadhoota Datta Peetham',
  title: 'Sri Ganapathy Sachchidananda <span class="em-light">Swamiji</span>',
  lead: 'Founder of Avadhoota Datta Peetham, Mysuru — renowned for His profound spiritual teachings, music therapy and dedication to humanitarian service.',
  image: photos.swamijiGarland,
  pos: '50% 28%',
  // the portrait fills a temple arch, not the window (sri-swamiji.css): up to
  // 460 x 716 px from 981 px up, 232 x 290 below; a 3:2 photo cropped to it is
  // drawn at most ~1030 / ~440 px wide
  sizes: '(min-width: 981px) 1030px, 440px',
  crumb: 'Sri Swamiji',
  actions: `${btn('Read His Life', '#life', 'gold', 'arrow', ' data-magnetic')}${btn('Avatara Timeline', '#timeline', 'ghost', 'calendar')}`,
  tiles: [
    { icon: 'lotus', title: 'His Life', note: 'Mekedatu, 1942', href: '#life' },
    { icon: 'heart-hand', title: 'The Mission', note: 'Music, dharma, seva', href: '#mission' },
    { icon: 'calendar', title: 'Avatara Timeline', note: 'Milestones since 1942', href: '#timeline' },
    { icon: 'sparkle', title: 'Honours', note: 'Doctorates, world records', href: '#honours' },
    { icon: 'namaste', title: 'Sri Bala Swamiji', note: 'The junior pontiff', href: '#bala-swamiji' },
  ],
})}

<section id="life" class="section sgs-life">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'His Life',
      title: 'A Life of Divine <span class="em-light">Compassion</span>',
      lead: 'Sri Sri Sri Ganapathy Sachchidananda Swamiji, also known as Sri Swamiji, is a revered spiritual leader and the head of the Avadhoota Datta Peetham in Mysuru, India.',
    })}

    ${chapter({
      n: 'I', year: '1942', title: 'Born on a rock in the Kaveri',
      media: `<div class="sgs-frame-full">${frame(pic.mekedatu, 'Sri Swamiji offering worship at the flower-garlanded Datta shrine of Datta Kashi, Mekedatu', { ratio: '3/4', pos: 'center top', parallax: '', caption: '<b>Datta Kashi, Mekedatu</b>Near Brahma Kundam, where Sri Swamiji was born.' })}</div>`,
      body: `
    <p class="dropcap">Sri Swamiji was born at the sacred confluence of three rivers — Arkavati, Kaveri and Guptagaamini — at Mekedatu, Karnataka, to the pious Brahmin couple Narasimha Shastry, later known as Sri Narahari Teertha Swami, and Jayalakshmi Maata, on 26 May 1942.</p>
    <p>His actual birth occurred on a rock in the Kaveri river. His mother was in deep meditation, and the child was born covered with holy ash. He was named <b>Satyanarayana</b>. A Muslim saint had predicted to His parents that their child would have supreme wisdom and knowledge, and was destined to uplift mankind.</p>`,
      facts: [['Born', '26 May 1942'], ['Hindu calendar', 'Jyeshta Shuddha Ekadashi, Chitrabhanu year'], ['Named', 'Satyanarayana']],
    })}

    <div class="divider-light" aria-hidden="true"></div>

    ${chapter({
      n: 'II', year: '1953', title: 'His mother, His first Guru', reverse: true,
      media: `<div class="sgs-stack">
        ${frame(pic.maataAradhana, 'Sri Swamiji offering worship before the image of Sri Jayalakshmi Maata, framed in flowers', { ratio: '5/4', pos: 'center 40%', caption: '<b>Sri Jayalakshmi Maata Aradhana</b>Sri Swamiji worships His mother every single day.' })}
        <figure class="sgs-medallion">${img(pic.maata, 'Portrait of Sri Jayalakshmi Maata', { w: 255, h: 321 })}<figcaption>Sri Jayalakshmi Maata</figcaption></figure>
      </div>`,
      body: `
    <p>Sri Swamiji’s mother, Sri Jayalakshmi Maata, was His first Guru and initiated Him into spiritual life. She bestowed Sri Vidya and Raja Yoga, and explained the esoteric meanings of the Vedas, Puranas, Mahabharata and Ramayana.</p>
    <p>At the tender age of eleven, in the Anjaneya Temple at Bommeparti, she transmitted spiritual energy — <i>Shaktipaatam</i> — to the child. She attained Maha Samadhi the same year, 1953.</p>
    <p>Satyanarayana completed His schooling like other children, but found that school had nothing to offer Him. He sang bhajans and kirtans for His friends, and gave Yoga classes in small village huts or on river banks while wandering the countryside as a monk.</p>
    <p><a class="link-arrow" href="guru-parampara.html">The Guru Parampara ${icon('arrow', 16)}</a></p>`,
    })}

    <div class="divider-light" aria-hidden="true"></div>

    ${chapter({
      n: 'III', year: '1966', title: 'Mysuru, and a new name',
      media: frame(photos.prayerHall, 'Devotees gathered in the Universal Prayer Hall at the Mysuru Ashram', { ratio: '4/5', pos: '50% center', badge: 'Mysuru', caption: '<b>The Universal Prayer Hall</b>“The crown of the Ashram,” in Sri Swamiji’s words.' }),
      body: `
    <p>In 1966 Sri Swamiji moved to the present site of the Mysuru Ashram on Ooty Road — in those early days only a straw hut in a field. The land was barren and infested with cobras and scorpions. He slept under the trees on the bare ground with these creatures crawling all around Him, and was never harmed.</p>
    <p>It was there, at Mysuru, that He came to be known as <b>Sri Ganapathy Sachchidananda Swamiji</b>. The same year He was initiated into Sanyasa at Srisailam and installed Sri Sachchidanandeshwara at the Mysuru Ashram.</p>
    <p>People come to Him for help with their worldly affairs, to be healed of physical afflictions, or for guidance in their spiritual practice.</p>`,
      facts: [['Ashram', 'Datta Nagar, Ooty Road, Mysuru'], ['Sanyasa', 'Srisailam, 1966']],
    })}

    <div class="divider-light" aria-hidden="true"></div>

    ${chapter({
      n: 'IV', title: 'One God, every faith', reverse: true,
      media: frame(pic.sriChakra, 'Sri Swamiji performing Sri Chakra Archana at an altar of flowers and lamps', { ratio: '4/5', pos: '30% center', caption: '<b>Sri Chakra Archana</b>Performed by Sri Swamiji every day.' }),
      body: `
    <p>Sri Swamiji prays with equal fervour with Hindus, Christians, Muslims, Jains, Jews, Sikhs, Buddhists and those of other faiths. He urges a Christian to become a more ardent Christian, and a Muslim a more devout Muslim.</p>
    <blockquote class="sgs-verse">
      <p>Allah is your name. Buddha is your name.<br>Jesus is your name. Jina is your name.<br>When people call God you always answer.<br>I seek refuge in Sachchidananda.</p>
      <footer>From <cite>Siveti Shaureeti</cite>, Sri Swamiji’s Sanskrit prayer — chanted every day in all the branches of His Ashrams.</footer>
    </blockquote>
    <p>He is a musician, a composer, a linguist and a poet; a doctor, a teacher and a psychiatrist; mother, father, friend and child to His devotees.</p>`,
    })}

    <div class="sgs-reach">
      <div class="sgs-reach-media" data-reveal="up">
        ${video({ id: 'DW0ebzb8vs4', title: 'Sri Swamiji unveiled', thumb: pic.preaching })}
      </div>
      <div class="sgs-reach-body" data-reveal="up">
        ${eyebrow('Across the world')}
        <h3>A spiritual message carried to almost every country</h3>
        <p>As of 2024, Sri Swamiji has made more than one hundred and eighty-three Vishwa Dharma Vijaya Yatras for the establishment of Dharma. His first foreign tour took place in 1976, and He has visited almost all the countries of the world, spreading the message of peace, the oneness of God and universal brotherhood.</p>
        ${stats([['183', 'Vishwa Dharma Vijaya Yatras, as of 2024', '+'], ['3000', 'Bhajans composed in eight languages', '+'], ['1000', 'Sounds personally chosen for His synthesizer', '+'], ['7', 'Languages of the Bhaktimala magazine']])}
      </div>
    </div>
  </div>
</section>

${marquee(['Musician', 'Composer', 'Linguist', 'Poet', 'Doctor', 'Teacher', 'World traveller', 'Cultural ambassador', 'Spiritual master'])}

<div class="sgs-quote section-dark grain">
  <svg class="sgs-quote-mark" viewBox="0 0 104 104" aria-hidden="true"><use href="#i-mandala"/></svg>
  <div class="wrap">
    <figure class="sgs-quote-fig">
      ${scrollLit('Music is my *religion*. Music is my *language*. Music is my *soul*. Music is my *expression*.', 'blockquote').replace(/\.<\/span> (?=<span)/g, '.</span><br>')}
      <figcaption>— Sri Swamiji</figcaption>
    </figure>
    <div class="sgs-sayings" data-stagger>
      ${sayings.map((s) => `<blockquote class="sgs-saying glass"><span class="om" aria-hidden="true">ॐ</span><p>${s}</p></blockquote>`).join('')}
    </div>
    <p class="sgs-sayings-note">From Sri Swamiji’s sayings. <a class="link-arrow" href="${links.swamijiSays}">Sri Swamiji Says ${icon('arrow-up-right', 14)}</a></p>
  </div>
</div>

<section id="mission" class="section section-paper sgs-mission">
  <div class="wrap">
    ${padmaOrnament(sectionHead({
      eyebrow: 'His Mission',
      title: 'Six streams of one <span class="em-light">mission</span>',
      lead: 'Avadhoota Datta Peetham was established by Sri Swamiji in 1966 as an international spiritual, cultural and social welfare organisation. Its projects revolve around the intrinsic worth of every single human life.',
    }))}
    ${cards([
      { img: pic.caveConcert, alt: 'Sri Swamiji’s Music for Healing & Meditation performed inside The Caverns, Pelham, Tennessee', icon: 'music', tag: 'Nada', title: 'Bhajans & Healing Music', text: 'More than 3,000 bhajans in eight languages, and Music for Meditation & Healing drawn from the ancient Raga Ragini Vidya — played on the synthesizer He calls the Datta Veena.', href: 'music.html', cta: 'Nada Chikitsa' },
      { img: pic.yaaga, alt: 'Sri Swamiji offering prayers before the sacred fire during the Sri Sukta Maha Yaaga', pos: 'center 22%', icon: 'flame', tag: 'Dharma', title: 'Sanatana Dharma Parirakshana', text: 'Temples and Ashrams, the SGS Veda Pathashala, homas and yaagas, care of Gomata and the Gita Mahayajna — keeping the eternal dharma alive.', href: page('sanatana-dharma-parirakshana'), cta: 'On dattapeetham.org' },
      { img: pic.nadiShuddhi, alt: 'Sri Swamiji leading Nadi Shuddhi breathing exercises for a hall of participants', icon: 'yoga', tag: 'Yoga', title: 'Datta Kriya Yoga', text: 'A system of Yoga that blends breath control, mind control, body control and universal spiritual wisdom, taught in all the branches of the Ashram.', href: 'kriya-yoga.html', cta: 'Datta Kriya Yoga' },
      { img: pic.annadana, alt: 'Sri Swamiji serving Annadana to rows of seated guests on banana leaves', icon: 'heart-hand', tag: 'Seva', title: 'Social Activities', text: 'Annadana, SGS Hospital, free medical camps, schools for the needy and the Amma Vodi home for destitute women — service to mankind is service to God.', href: 'seva.html', cta: 'Pillars of service' },
      { img: pic.prakrutiPuja, alt: 'Sri Swamiji performing Prakruti Puja among the trees of the Bonsai Garden, Mysuru', icon: 'tree', tag: 'Nature', title: 'Contribution towards Nature', text: 'Shuka Vana, home to birds of 486 species, and the Kishkindha Moolika Bonsai Garden. “Bonsai trees and birds are Swamiji’s two eyes.”', href: page('contribution-towards-nature'), cta: 'On dattapeetham.org' },
      { img: pic.treatise, alt: 'Cover of Raga Ragini Nada Yoga, the musical treatise by Sri Swamiji', pos: 'center 20%', icon: 'book', tag: 'Wisdom', title: 'Literary Contributions', text: 'Keertanas and bhajans in many languages, and books on spirituality — prominently in Telugu and Kannada — published by the Peetham.', href: 'teachings.html#literature', cta: 'Discourses & books' },
    ], 3, 'sgs-pillars')}
  </div>
</section>

<section id="timeline" class="section section-dark sgs-timeline grain">
  <svg class="mark-watermark" viewBox="0 0 104 104" aria-hidden="true"><use href="#i-mandala"/></svg>
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'Sri Swamiji’s Avatara Timeline',
      title: 'Milestones since <span class="em-light">1942</span>',
      lead: 'From a rock in the Kaveri to a concert in a cave: the milestones in the life of Sri Swamiji, as the Peetham records them.',
      light: true,
    })}
    ${timeline(avataraTimeline).replace('<ol class="timeline" data-timeline>', `<ol class="timeline" data-timeline${lampChainAttrs({ nodes: '.tl-dot', line: 0.6, size: 30 })}>`)}
    <p class="sgs-tl-more" data-reveal="up">${btn('The full timeline on dattapeetham.org', page('sri-swamijis-avatara-timeline'), 'ghost', 'arrow-up-right')}</p>
  </div>
</section>

<section id="honours" class="section section-paper sgs-honours">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'Honours & Guinness World Records',
      title: 'Honoured across the <span class="em-light">world</span>',
      lead: 'For His extraordinary work and activities, Sri Swamiji has been recognised by Guinness World Records several times, and honoured with several other awards.',
    })}
    <div class="sgs-hon-grid">
      <div class="sgs-hon-media" data-reveal="clip">
        ${frame(pic.threeRecords, 'Sri Swamiji with three Guinness World Records certificates before the giant Bhagavad Gita book', { ratio: '4/3', pos: 'center 40%', caption: '<b>Three Guinness World Records</b>The largest Hindu Smriti, the most bird species in an aviary and the largest display of bonsai trees.' })}
      </div>
      <div class="sgs-hon-list" data-reveal="up">
        <h3>Doctorates & awards</h3>
        <ul class="sgs-awards">
          ${honours.map(([y, t, d]) => `<li><span class="sgs-aw-year">${y}</span><div><b>${t}</b><span>${d}</span></div></li>`).join('')}
        </ul>
        <p class="sgs-visa">${icon('globe', 18)}<span>Recognising His international stature, the US government granted Sri Swamiji special O-visa status to travel and perform throughout the USA.</span></p>
      </div>
    </div>

    <h3 class="sgs-rec-title" data-reveal="up"><span>Guinness World Records</span> titles</h3>
    <ul class="sgs-records" data-stagger>
      ${records.map(([d, t, x]) => `<li><time>${d}</time><b>${t}</b><span>${x}</span></li>`).join('')}
    </ul>

    ${gallery([
      [pic.tenali, 'Sri Swamiji receiving the Guinness World Records certificate for most people chanting at a single venue', 'Most people chanting at a single venue — Tenali, 2015'],
      [pic.shukaVanaRecord, 'Sri Swamiji holding the Guinness World Records certificate for Shuka Vana, with a parrot on His shoulder', 'Most bird species in an aviary — Shuka Vana, 2017'],
      [pic.stamp2024, 'Sri Swamiji receiving the certificate in front of the giant Nada Mantapa special stamp', 'The largest special stamp — Nada Mantapa, 2024'],
      [pic.carnaticBand, 'Sri Swamiji receiving the Guinness World Records certificate for the largest Carnatic band', 'Largest Carnatic band — Allen, Texas, 2025'],
    ], 'sgs-rec-gallery')}
    <p class="sgs-hon-more" data-reveal="up"><a class="link-arrow" href="${page('awards-honors')}">All honours on dattapeetham.org ${icon('arrow-up-right', 16)}</a></p>
  </div>
</section>

<section id="bala-swamiji" class="section section-sand sgs-bala">
  <div class="wrap">
    ${split({
      media: `<div class="sgs-stack is-bala">
        ${frame(pic.bala, 'Portrait of Sri Datta Vijayananda Teertha Swamiji, Sri Bala Swamiji, smiling in saffron robes', { ratio: '4/5', pos: 'center 25%', badge: 'Junior Pontiff' })}
        <figure class="sgs-inset">${img(pic.withBala, 'Sri Swamiji seated with Sri Bala Swamiji', { w: 960, h: 640 })}<figcaption>Sri Swamiji with Sri Bala Swamiji</figcaption></figure>
      </div>`,
      body: `
      ${eyebrow('Sri Bala Swamiji')}
      <h2 data-split>Sri Datta Vijayananda <span class="em-light">Teertha</span> Swamiji</h2>
      <p class="lead">Often referred to as Sri Bala Swamiji, He is the junior pontiff of Avadhoota Datta Peetham, Mysuru — the spiritual successor to Sri Ganapathy Sachchidananda Swamiji, revered for His wisdom, humility and dedication to spreading the teachings of the Datta tradition.</p>
      <p>He was born in a traditional family to Smt. Saraswati and Sri Subramanyam on 14 January 1977 in Mysuru, and named Sri Harsha Sharma. Harsha had His Vedic education in the Sri Ganapathy Sachchidananda Veda Pathashala, Mysuru. Sri Swamiji identified His good qualities and kept Him under His spiritual tutelage; He has received meticulous training in the Ashram since He was seven years old.</p>
      <p>On 29 May 2004 Sri Swamiji anointed Sri Harsha Sharma as Junior Pontiff in the presence of erudite scholars, giving Him the Sannyasa Deeksha name <b>“Sri Datta Vijayananda Teertha”</b>.</p>`,
    })}

    <div class="sgs-bala-steps">
      ${processSteps([
        ['14 Jan 1977', 'Born in Mysuru and named Sri Harsha Sharma.'],
        ['SGS Veda Pathashala', 'Vedic education at the Ashram’s school for the Vedas, Mysuru.'],
        ['29 May 2004', 'Anointed Junior Pontiff; Sannyasa name Sri Datta Vijayananda Teertha.'],
        ['Guru Purnima', 'Begins the Chaturmasya Vrata Deeksha every year.'],
      ])}
    </div>

    ${split({
      reverse: true,
      cls: 'sgs-bala-two',
      media: video({ id: 'M6fbylP97_s', title: 'Mekedatu Padayatra', thumb: pic.padayatra }),
      body: `
      <h3>Discourse, Chaturmasya and the Padayatra</h3>
      <p>Sri Bala Swamiji gives regular discourses on the Vedas, Shastras, Upanishads and Puranas, explaining their deep essence in simple words. Since 2014, on Sri Swamiji’s instruction, He has given a daily commentary on the Yoga Vasishtham. He is also a singer-lyricist, with compositions in Sanskrit, Telugu, Kannada, Tamil and English.</p>
      <p>Every year He commences the Chaturmasya Vrata Deeksha from Guru Purnima, after the Guru Parampara Pooja and Vyaasa Pooja, and spearheads yagnas, homas, discourses, Annadana and free medical camps during the vrata.</p>
      <p>As a prelude to Sri Swamiji’s 80th birthday celebrations, He led a six-day Vishwashanti Padayatra for world peace from Mekedatu, Sri Swamiji’s birthplace, to the Mysuru Ashram — bringing Kaveri water to wash Sri Swamiji’s feet, and supporting five causes:</p>
      <ul class="sgs-causes">
        <li>Protection of cows and ambulances for them</li>
        <li>Free medical camps and treatment for women and children with cancer and other diseases</li>
        <li>Help for financially weak Vedic schools</li>
        <li>Help for poor farmers</li>
        <li>Protecting Nature by planting trees</li>
      </ul>
      <div class="btn-row">
        ${btn('Gurubhavana ADPT on YouTube', 'https://www.youtube.com/@gurubhavanaadpt', 'line', 'yt')}
        ${btn('Ganga Stotram', 'https://www.youtube.com/watch?v=V--Wpwq21Ao', 'line', 'play-circle')}
      </div>`,
    })}
  </div>
</section>

<section id="follow" class="section sgs-follow">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'Official channels',
      title: 'Follow Sri <span class="em-light">Swamiji</span>',
      lead: 'The official social media pages of Sri Swamiji and Avadhoota Datta Peetham, as listed by the Peetham.',
    })}
    <div class="sgs-social" data-stagger>
      ${social.map((s) => `<article class="sgs-social-card">
        <h3><span class="sgs-social-ic">${s.ic}</span>${s.name}</h3>
        <ul>${s.items.map(([label, href]) => `<li><a href="${href}">${label}${icon('arrow-up-right', 13)}</a></li>`).join('')}</ul>
      </article>`).join('')}
    </div>
    <div class="sgs-listen" data-reveal="up">
      <span class="sgs-listen-label">${icon('headphones', 20)} Listen to Sri Swamiji’s music</span>
      <div class="btn-row">
        ${btn('Spotify', 'https://open.spotify.com/artist/3VCEvO2NgnGTyWqG4zgEBU', 'line', 'spotify')}
        ${btn('Apple Music', 'https://music.apple.com/in/artist/sri-ganapathy-sachchidananda-swamiji/418448608', 'line', 'apple')}
        ${btn('Bhajan lyrics', 'https://www.bhajanmala.com/', 'line', 'book')}
      </div>
      <a class="link-arrow" href="${page('social-media-pages')}">All official pages ${icon('arrow-up-right', 15)}</a>
    </div>
  </div>
</section>

${ctaBand({
  title: 'Come for <span class="em-light">darshan</span> in Mysuru',
  text: 'Sri Ganapathy Sachchidananda Ashram welcomes people from all religious backgrounds. Plan your visit, offer a puja, or support the Peetham’s seva.',
  image: photos.swamijiHoma,
  actions: `${btn('Plan your visit', 'visit.html', 'gold', 'arrow', ' data-magnetic')}${btn('Book a puja', links.poojas, 'ghost', 'arrow-up-right')}${btn('Donate', links.donations, 'ghost', 'heart')}`,
})}
`,
};
