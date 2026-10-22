// Site-wide facts, links and navigation. Facts were taken from the live
// dattapeetham.org (October 2026). Change a fact here and every page follows.

export const OFFICIAL = 'https://www.dattapeetham.org';
export const S3 = 'https://dattapeetham.s3.amazonaws.com/';
export const IMG = `${S3}homepage_assets/site_1/front_page_images/`;
export const PAGE_IMG = `${S3}content/page_images/`;
export const KSHETRA_IMG = `${S3}images/site_assets/peetham-ashrams/shodasha-datta-kshetras/`;

export const site = {
  name: 'Avadhoota Datta Peetham',
  shortName: 'Datta Peetham',
  trust: 'Sri Ganapathy Sachchidananda Avadhoota Datta Peetha Trust',
  ashram: 'Sri Ganapathy Sachchidananda Ashram',
  origin: 'https://www.dattapeetham.org',
  tagline: 'Guiding humanity towards a more conscious, compassionate world',
  address: {
    lines: ['Sri Ganapathy Sachchidananda Ashram', 'Datta Nagar, Ooty Road', 'Mysuru, Karnataka 570 025, India'],
    street: 'Datta Nagar, Ooty Road',
    city: 'Mysuru',
    region: 'Karnataka',
    postal: '570025',
    country: 'IN',
  },
  phone: '+91 (0821) 2486 486',
  phoneHref: 'tel:+918212486486',
  email: 'mail@dattapeetham.com',
  mapQuery: 'Avadhoota Datta Peetham, Sri Ganapathy Sachchidananda Ashram, Mysuru',
};

// Transactional systems (payments, accounts, orders) stay on the existing
// platform; the rebuilt site links into them.
export const links = {
  poojas: `${OFFICIAL}/poojas?ashram_id=4`,
  donations: `${OFFICIAL}/donations?ashram_id=4`,
  store: `${OFFICIAL}/store`,
  subscriptions: `${OFFICIAL}/subscriptions`,
  login: `${OFFICIAL}/login`,
  calendar: `${OFFICIAL}/calendar`,
  eventsArchive: `${OFFICIAL}/events`,
  liveUpdates: `${OFFICIAL}/liveupdates`,
  speeches: `${OFFICIAL}/speeches`,
  dattaVaakya: `${OFFICIAL}/speeches?category=449`,
  vijayaVyakhya: `${OFFICIAL}/speeches?category=450`,
  swamijiSays: `${OFFICIAL}/sri-swamiji-says`,
  photos: `${OFFICIAL}/photos`,
  videos: `${OFFICIAL}/videos`,
  downloads: `${OFFICIAL}/downloads`,
  articles: `${OFFICIAL}/articles`,
  dailyPosts: `${OFFICIAL}/dailyposts`,
  mobileApps: `${OFFICIAL}/mobileapps`,
  ashramCenters: `${OFFICIAL}/ashramcenters`,
  navanatha: `${OFFICIAL}/navanatha-datta-kshetras`,
  concerts: `${OFFICIAL}/myragasagaraconcerts`,
  techSupport: `${OFFICIAL}/techsupport`,
  subscribe: `${OFFICIAL}/subscribe`,
  dattaKriyaYoga: 'https://www.dattakriyayoga.org/',
  appStore: 'https://apps.apple.com/in/app/datta-peetham/id1627048826',
  playStore: 'https://play.google.com/store/apps/details?id=org.dattapeetham.mobile',
  facebook: `${OFFICIAL}/facebook`,
  youtube: `${OFFICIAL}/youtube`,
  websites: `${OFFICIAL}/websites`,
  privacy: `${OFFICIAL}/page/view/privacy-policy`,
  terms: `${OFFICIAL}/page/view/terms-and-conditions`,
  disclaimer: `${OFFICIAL}/page/view/disclaimer`,
  directions: 'https://www.google.com/maps/dir/?api=1&destination=Avadhoota+Datta+Peetham+Mysuru',
  mapEmbed: 'https://www.google.com/maps?q=Avadhoota+Datta+Peetham,+Sri+Ganapathy+Sachchidananda+Ashram,+Mysuru&output=embed',
};

// Opening hours in Indian Standard Time; `closed` lists weekdays shut
// (0 = Sunday). Serialised into the page for the live open/closed badges.
export const hours = {
  temple: { label: 'Temple', sessions: [['06:00', '12:00'], ['16:00', '20:00']], closed: [] },
  // Official sources disagree on Shuka Vana's hours and its own page says it
  // is temporarily closed for maintenance, so the live badge speaks of the
  // listed hours rather than promising it is open.
  shukaVana: { label: 'Shuka Vana', sessions: [['09:00', '12:00'], ['15:30', '18:00']], closed: [3], caution: true },
};

export const nav = [
  { label: 'About', href: 'about.html', children: [
    { label: 'About the Peetham', href: 'about.html', note: 'History, mission, Mysuru Ashram' },
    { label: 'Guru Parampara', href: 'guru-parampara.html', note: 'The lineage of the masters' },
    { label: 'Global Reach', href: 'centers.html', note: 'Centres & 16 Datta Kshetras' },
  ] },
  { label: 'Sri Swamiji', href: 'sri-swamiji.html', children: [
    { label: 'Sri Ganapathy Sachchidananda Swamiji', href: 'sri-swamiji.html', note: 'His life and mission' },
    { label: 'Avatara Timeline', href: 'sri-swamiji.html#timeline', note: 'Milestones since 1942' },
    { label: 'Sri Datta Vijayananda Teertha Swamiji', href: 'sri-swamiji.html#bala-swamiji', note: 'The junior pontiff' },
  ] },
  { label: 'Darshan & Puja', href: 'darshan.html', children: [
    { label: 'Temples & Darshan', href: 'darshan.html', note: 'Shrines, timings, worship' },
    { label: 'Events & Festivals', href: 'events.html', note: 'Programmes through the year' },
    { label: 'Book a Puja', href: links.poojas, external: true, note: 'Participate online' },
  ] },
  { label: 'Teachings', href: 'teachings.html', children: [
    { label: 'Discourses & Wisdom', href: 'teachings.html', note: 'Datta Vaakya, Vijaya Vyakhya' },
    { label: 'Nada Chikitsa', href: 'music.html', note: 'Healing through music' },
    { label: 'Datta Kriya Yoga', href: 'kriya-yoga.html', note: 'Breath, body, mind' },
  ] },
  { label: 'Seva', href: 'seva.html', children: [
    { label: 'Pillars of Service', href: 'seva.html', note: 'Healthcare, education, cow care' },
    { label: 'Volunteer', href: 'seva.html#volunteer', note: 'Join the SDHS volunteers' },
    { label: 'Donate', href: links.donations, external: true, note: 'Support the mission' },
  ] },
  { label: 'Visit', href: 'visit.html', children: [
    { label: 'Plan Your Visit', href: 'visit.html', note: 'Reach, stay, guidelines' },
    { label: 'Interactive Ashram Map', href: 'visit.html#map', note: 'Explore the campus' },
    { label: 'Ashram Attractions', href: 'attractions.html', note: 'Shuka Vana, Bonsai, Museum' },
  ] },
  { label: 'Media', href: 'media.html', children: [
    { label: 'Videos & Photos', href: 'media.html', note: 'Watch and explore' },
    { label: 'Music & Audio', href: 'media.html#audio', note: 'Albums and bhajans' },
    { label: 'Apps & Bhaktimala', href: 'media.html#apps', note: '18 devotional apps' },
  ] },
];
