// Datta Kriya Yoga — the science of breath and meditation taught by Sri Swamiji.
// Sources (October 2026): dattapeetham.org/page/view/datta-kriya-yoga,
// dattapeetham.org/page/view/datta-kriya-yoga-international-center, the
// legacy homepage "Datta Kriya Yoga" block, dattakriyayoga.org, and the
// shared timeline in data.mjs (1981 facilities, 2016 record, 2022 award).

import { pageHero, sectionHead, frame, scrollLit, processSteps, accordion, infoList, ctaBand, btn, img, icon } from '../components.mjs';
import { links, site, PAGE_IMG } from '../site.mjs';
import { photos, apps } from '../data.mjs';

const IMG = {
  teach: `${PAGE_IMG}515/515_47c13ada69bd6850.jpg`,
  record: `${PAGE_IMG}517/517_83aaf9bd0e92e042.jpg`,
  yogaDay: `${PAGE_IMG}508/508_445bbfeadfdd6504.jpg`,
};

const DKY = {
  email: 'dkycenter@gmail.com',
  facebook: 'https://www.facebook.com/DattaKriyaYogaPage',
  youtube: 'https://www.youtube.com/@dattakriyayoga108',
  whatsapp: 'https://wa.me/917090689789?text=Jaya%20Guru%20Datta',
  certificate: 'YCB/20/YC/000019',
  address: ['Datta Kriya Yoga International Centre', '2nd Floor, SGS Ayurvedic Hospital', 'Sri Ganapathy Sachchidananda Ashram, Datta Nagar', 'Ooty Road, Mysuru 570 025'],
};

const app = apps.find((a) => a.name === 'Datta Kriya Yoga');

/* ---------------------------------------------------------------------------
   Scripture: the three verses the Peetham's page quotes on meditation.
--------------------------------------------------------------------------- */
const verses = [
  ['Kathopanishad', 'Adhyaatma yogaadhigamena devam / Matvaamdheero harshashokau jahaati', 'The intelligent man, having known the Effulgent One by means of Adhyatma Yoga (meditation on the inner self), abandons both joy and sorrow.'],
  ['Shvetaashvatara Upanishad', 'Te dhyaana yogaanugataa apashyan / Devaatmashaktim svagunaairnigoodham', 'The Rishis (seers) absorbed in Dhyana Yoga (the yoga of meditation) realized the Soul Power of the Supreme concealed by the gunas (qualities).'],
  ['Concluding Dhyana Shloka, Srimad Bhagavad Gita', 'Dhyaanaavasthita tadgatena manasaa pashyanti yam yoginah', 'Whom the Yogis behold with their minds engrossed in THAT, through meditation.'],
];

/* ---------------------------------------------------------------------------
   Practice: what Datta Kriya Yoga "deals with", in the source's own order and
   wording (the source names no mental/pranic/physical grouping), and the five
   components. Icons are decorative.
--------------------------------------------------------------------------- */
const facets = [
  ['sun', 'Restraint of breath'],
  ['sparkle', 'Various techniques of breathing'],
  ['moon', 'Relaxation'],
  ['lotus', 'Withdrawal of the sense organs'],
  ['compass', 'Fixing one’s attention on a particular deity or object, for concentration and contemplation'],
];

const components = [
  ['Naadi Shuddhi Vyayama', 'Purifying the subtle nerves', 'Techniques unique to Datta Kriya Yoga that purify the subtle nerves. Suitable for all age groups.'],
  ['Asanas', 'Postures', 'Yoga postures that enhance flexibility and build strength. Postures like the Tree Pose aid concentration.'],
  ['Pranayama', 'Breath control', 'Specific breath-control techniques, followed by purification actions (kriyas) specific only to Datta Kriya Yoga.'],
  ['Mudras', 'Gestures', 'Gestures that accompany the pranayamas, directing vital energy to specific areas of the body.'],
  ['Dhyana', 'Meditation', 'Meditation, for concentration and contemplation. Datta Kriya Yoga is, at heart, a science of meditation.'],
];

/* ---------------------------------------------------------------------------
   Benefits, as listed on the Peetham's page and dattakriyayoga.org.
--------------------------------------------------------------------------- */
const benefits = [
  ['lotus', 'Balance body, mind &amp; spirit', 'Promotes holistic well-being by harmonising the physical, mental and spiritual aspects of our lives.'],
  ['sparkle', 'Eliminate toxins &amp; boost immunity', 'Asanas, kriyas and pranayama help detoxify the body through sweat and respiration, enhancing the immune system.'],
  ['sun', 'Respiration, energy &amp; vitality', 'Asanas, pranayama and mudras strengthen the respiratory system and invigorate vital energy.'],
  ['yoga', 'Strength &amp; flexibility', 'The yoga asanas and Nadi Shuddhi exercises enhance flexibility and build strength.'],
  ['compass', 'Concentration &amp; focus', 'Postures like the Tree Pose, along with pranayama and meditation, boost concentration and focus.'],
  ['flame', 'Core strength', 'Specific asanas and pranayama practices develop and strengthen the core muscles.'],
];
const alsoNoted = ['Physical strength', 'Flexibility', 'Blood-pressure regulation', 'Diabetes management', 'Blood purification', 'Stress relief', 'Concentration', 'Work efficiency'];

/* ---------------------------------------------------------------------------
   Worldwide: countries where Datta Kriya Yoga camps were conducted (the
   Peetham's list, which ends "etc."). Coordinates are approximate country
   positions on an equirectangular grid: x = (lon + 180) / 2.5, y = (78 - lat) / 2.5.
--------------------------------------------------------------------------- */
const grid = (lat, lon) => [+((lon + 180) / 2.5).toFixed(2), +((78 - lat) / 2.5).toFixed(2)];
const ORIGIN = grid(12.3, 76.64); // Mysuru
const camps = [
  ['in', 'India', 12.3, 76.64],
  ['au', 'Australia', -25.3, 134.0],
  ['be', 'Belgium', 50.6, 4.6],
  ['fr', 'France', 46.6, 2.4],
  ['de', 'Germany', 51.1, 10.4],
  ['nl', 'Holland', 52.2, 5.5],
  ['my', 'Malaysia', 3.1, 101.7],
  ['sg', 'Singapore', 1.35, 103.8],
  ['ch', 'Switzerland', 46.8, 8.2],
  ['tt', 'Trinidad (West Indies)', 10.45, -61.3],
  ['gb', 'UK', 52.5, -1.5],
  ['us', 'USA', 39.8, -98.6],
].map(([id, name, lat, lon]) => ({ id, name, xy: grid(lat, lon) }));
const MILPITAS = grid(37.43, -121.9);

// Map labels shown on wide screens (a dense European cluster shares one label).
const mapLabels = [
  ['Mysuru', ORIGIN, 'is-origin', 'in'],
  ['USA', grid(39.8, -98.6), '', 'us'],
  ['Milpitas · 2016', MILPITAS, 'is-record is-below', ''],
  ['Trinidad', grid(10.45, -61.3), '', 'tt'],
  ['Europe', grid(57.5, 4.5), '', 'be fr de nl ch gb'],
  ['Malaysia · Singapore', grid(-1.5, 103), 'is-below', 'my sg'],
  ['Australia', grid(-25.3, 134.0), '', 'au'],
];

// Land as a dot matrix: Natural Earth 1:110m land (public domain) sampled on a
// 2.5° grid with alternate rows offset half a step; one dot per land cell.
const LAND = 'M27.25 0h0m6 0h0m5 0h0m1 0h0m1 0h0m3 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m15 0h0m1 0h0m2 0h0M25.75 1h0m1 0h0m1 0h0m1 0h0m3 0h0m1 0h0m1 0h0m2 0h0m1 0h0m1 0h0m1 0h0m1 0h0m9 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m32 0h0m1 0h0m12 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m11 0h0m1 0h0m1 0h0M22.25 2h0m1 0h0m1 0h0m2 0h0m3 0h0m3 0h0m2 0h0m2 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m9 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m31 0h0m1 0h0m10 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0m1 0h0M7.75 3h0m1 0h0m1 0h0m1 0h0m16 0h0m1 0h0m1 0h0m1 0h0m1 0h0m3 0h0m1 0h0m2 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m7 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m21 0h0m1 0h0m1 0h0m15 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0M1.25 4h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m11 0h0m1 0h0m2 0h0M3.75 5h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m5 0h0m1 0h0m5 0h0m1 0h0M6.25 6h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m9 0h0m8 0h0m1 0h0m1 0h0m21 0h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0M6.75 7h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m8 0h0m1 0h0m1 0h0m31 0h0m1 0h0m1 0h0m1 0h0m1 0h0m3 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m4 0h0m1 0h0m1 0h0M9.25 8h0m10 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m7 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m24 0h0m7 0h0m1 0h0m4 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m8 0h0m1 0h0M19.75 9h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m4 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m23 0h0m5 0h0m1 0h0m4 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m9 0h0m1 0h0M21.25 10h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m3 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m20 0h0m1 0h0m1 0h0m3 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m6 0h0M20.75 11h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m25 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0M22.25 12h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0m4 0h0m1 0h0m20 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0M22.75 13h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m24 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0m2 0h0m1 0h0m1 0h0m1 0h0m3 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0M22.25 14h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m26 0h0m1 0h0m1 0h0m1 0h0m4 0h0m1 0h0m2 0h0m1 0h0m1 0h0m1 0h0m7 0h0m1 0h0m3 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m3 0h0m1 0h0M22.75 15h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m27 0h0m1 0h0m1 0h0m1 0h0m4 0h0m3 0h0m1 0h0m1 0h0m2 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0m1 0h0M23.25 16h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m28 0h0m1 0h0m1 0h0m6 0h0m4 0h0m2 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m3 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m3 0h0m1 0h0m5 0h0M23.75 17h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m29 0h0m2 0h0m1 0h0m1 0h0m1 0h0m1 0h0m11 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m3 0h0m1 0h0m2 0h0m1 0h0m1 0h0M25.25 18h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m30 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m10 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m4 0h0m1 0h0M25.75 19h0m2 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m30 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0M28.25 20h0m1 0h0m1 0h0m1 0h0m1 0h0m7 0h0m28 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0M28.75 21h0m1 0h0m1 0h0m1 0h0m1 0h0m7 0h0m27 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0m1 0h0m1 0h0m1 0h0m1 0h0m4 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0M30.25 22h0m1 0h0m1 0h0m7 0h0m27 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m5 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0M30.75 23h0m1 0h0m1 0h0m4 0h0m5 0h0m24 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m7 0h0m1 0h0m1 0h0m1 0h0m1 0h0m4 0h0m1 0h0m1 0h0m1 0h0m1 0h0M31.25 24h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m5 0h0m4 0h0m21 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m7 0h0m1 0h0m1 0h0m1 0h0m1 0h0m5 0h0m1 0h0m1 0h0m1 0h0m1 0h0m6 0h0M34.75 25h0m1 0h0m1 0h0m1 0h0m28 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0m1 0h0m1 0h0m1 0h0m9 0h0m1 0h0m1 0h0m8 0h0m1 0h0m1 0h0m1 0h0M37.25 26h0m1 0h0m28 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m14 0h0m1 0h0m10 0h0m1 0h0m1 0h0M37.75 27h0m5 0h0m1 0h0m1 0h0m2 0h0m20 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0m1 0h0m11 0h0m1 0h0m10 0h0m1 0h0m5 0h0M41.25 28h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m19 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m13 0h0m17 0h0m1 0h0M41.75 29h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m19 0h0m1 0h0m1 0h0m1 0h0m3 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m22 0h0m6 0h0M41.25 30h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m25 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m21 0h0m2 0h0m4 0h0m1 0h0M40.75 31h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m24 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m23 0h0m1 0h0m3 0h0m1 0h0m1 0h0m1 0h0m2 0h0m1 0h0M40.25 32h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m23 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m25 0h0m3 0h0m1 0h0m1 0h0m2 0h0m5 0h0m2 0h0M39.75 33h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m20 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m26 0h0m7 0h0m6 0h0m1 0h0m1 0h0m1 0h0m3 0h0M40.25 34h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m20 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m28 0h0m1 0h0m12 0h0m1 0h0m1 0h0M40.75 35h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m20 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m32 0h0m2 0h0M41.25 36h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m22 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m38 0h0m4 0h0M41.75 37h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m22 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m4 0h0m31 0h0m2 0h0m1 0h0m3 0h0m1 0h0M43.25 38h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m21 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m3 0h0m1 0h0m30 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0m1 0h0M44.75 39h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m22 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m5 0h0m30 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0M44.25 40h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m23 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m5 0h0m28 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0M44.75 41h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m26 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m4 0h0m1 0h0m27 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0M44.25 42h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m26 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m34 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0M43.75 43h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m27 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m35 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0M44.25 44h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m30 0h0m1 0h0m1 0h0m1 0h0m36 0h0m1 0h0m1 0h0m1 0h0m3 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0M43.75 45h0m1 0h0m1 0h0m1 0h0m1 0h0m2 0h0m30 0h0m39 0h0m9 0h0m1 0h0m1 0h0m1 0h0m1 0h0M43.25 46h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m1 0h0m79 0h0m1 0h0m1 0h0m1 0h0m11 0h0M42.75 47h0m1 0h0m1 0h0m1 0h0m1 0h0m95 0h0m1 0h0M43.25 48h0m1 0h0m1 0h0m85 0h0m1 0h0m10 0h0M42.75 49h0m1 0h0m1 0h0m1 0h0m94 0h0M43.25 50h0m1 0h0m1 0h0M42.75 51h0m1 0h0m1 0h0m55 0h0M42.25 52h0m1 0h0m1 0h0m4 0h0M43.75 53h0m1 0h0';

function arc([x1, y1], [x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1, dist = Math.hypot(dx, dy);
  const lift = Math.min(dist * 0.32, 16);
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 - lift;
  return `M${x1} ${y1}Q${cx.toFixed(2)} ${cy.toFixed(2)} ${x2} ${y2}`;
}

function worldMap() {
  const pct = ([x, y]) => `left:${((x / 144) * 100).toFixed(2)}%;top:${((y / 54) * 100).toFixed(2)}%`;
  const others = camps.filter((c) => c.id !== 'in');
  return `<figure class="ky-map" data-reveal="fade" data-ky-map>
  <div class="ky-map-canvas">
    <svg class="ky-map-svg" viewBox="0 0 144 54" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="ky-map-title">
      <title id="ky-map-title">Illustrative world map with gold markers on the countries where Datta Kriya Yoga camps have been held, linked by arcs to Mysuru</title>
      <defs>
        <radialGradient id="ky-glow"><stop offset="0" stop-color="#f6d38a" stop-opacity=".9"/><stop offset="1" stop-color="#f6d38a" stop-opacity="0"/></radialGradient>
      </defs>
      <path class="ky-land" d="${LAND}"/>
      <g class="ky-arcs">${others.map((c, i) => `<path class="ky-arc" pathLength="1" style="--i:${i}" d="${arc(ORIGIN, c.xy)}"/>`).join('')}</g>
      <g class="ky-pulses" aria-hidden="true">${others.map((c, i) => `<path class="ky-pulse" pathLength="100" style="--i:${i}" d="${arc(ORIGIN, c.xy)}"/>`).join('')}</g>
      <g class="ky-record"><circle class="ky-record-ring" cx="${MILPITAS[0]}" cy="${MILPITAS[1]}" r="1.4"/><circle cx="${MILPITAS[0]}" cy="${MILPITAS[1]}" r=".42"/></g>
      ${camps.map((c) => `<g class="ky-pin${c.id === 'in' ? ' is-origin' : ''}" data-c="${c.id}"><circle class="ky-pin-glow" cx="${c.xy[0]}" cy="${c.xy[1]}" r="2.2" fill="url(#ky-glow)"/><circle class="ky-pin-dot" cx="${c.xy[0]}" cy="${c.xy[1]}" r="${c.id === 'in' ? '.8' : '.55'}"/></g>`).join('')}
    </svg>
    ${mapLabels.map(([t, xy, cls, ids]) => `<span class="ky-map-label ${cls}" style="${pct(xy)}"${ids ? ` data-for="${ids}"` : ''} aria-hidden="true">${t}</span>`).join('')}
  </div>
  <figcaption>${icon('info', 14)} Illustrative map, not to scale. Markers show countries, not exact venues; the ring marks Milpitas, California.</figcaption>
</figure>`;
}

/* ---------------------------------------------------------------------------
   The breath visual: a gold circle that slowly expands and contracts.
   Purely illustrative; it prescribes no count. CSS drives it, page JS pauses
   it off-screen and offers a pause button, reduced motion shows it still.
--------------------------------------------------------------------------- */
function breathVisual() {
  return `<div class="ky-breath" data-breath>
  <div class="ky-breath-stage" role="img" aria-label="Illustration: a gold circle slowly expands and contracts, marked Inhale and Exhale, as an aid to breath awareness">
    <svg class="ky-breath-rings" viewBox="0 0 400 400" aria-hidden="true">
      <circle class="r1" cx="200" cy="200" r="196"/>
      <circle class="r2" cx="200" cy="200" r="168"/>
      <circle class="r3" cx="200" cy="200" r="120"/>
      <circle class="ky-breath-trace" cx="200" cy="200" r="182" pathLength="100" transform="rotate(-90 200 200)"/>
    </svg>
    <svg class="ky-breath-petals" viewBox="0 0 104 104" aria-hidden="true"><use href="#i-mandala"/></svg>
    <span class="ky-breath-glow" aria-hidden="true"></span>
    <span class="ky-breath-orb" aria-hidden="true"></span>
    <span class="ky-breath-words" aria-hidden="true"><span class="w-in">Inhale</span><span class="w-out">Exhale</span></span>
  </div>
  <button class="ky-breath-toggle" type="button" aria-pressed="false" data-breath-toggle hidden>${icon('moon', 16)}<span>Pause the circle</span></button>
</div>`;
}

/* ---------------------------------------------------------------------------
   Datta Kriya Yoga prayers, from the Peetham's page. Transliteration as
   published; only diacritic encoding slips are corrected (ü, ä, ş for ū, ā,
   ṣ) and the spacing before "|" evened. Spellings such as "svādhishthāne",
   "dhratavidhitanum" and "vikti" are kept as published. The meanings have
   obvious typos ("efu", "and and") removed. A visible note says so.
--------------------------------------------------------------------------- */
const prayers = [
  ['Guru Paduka Dhyana Shlokam', `<p class="ky-sloka">śrī bhūyuta śrī hari cihnitābhyām agastya rekhādibhirancitābhyām |<br>nigūdha bījākṣara mudritābhyām namo namah(s) sadguru pādukābhyām ||</p>
<p><b>Meaning.</b> I salute those sacred Sadguru padukas on which are depicted symbolically Lord Vishnu along with Sree Devi (Goddess of Wealth) and Bhoodevi (Goddess of Earth), Agastya (Saint) and other lines, and also several seed letters of occult nature.</p>`],
  ['Devi Prarthana', `<p class="ky-sloka">mūlādhāraṁ tathā svādhiṣṭhānaṁ ca manipūrakam<br>anāhatam viśuddhākhyam ājñācakram vidurbudhāh<br>tavādhāra svarūpāṇī konacakrani pārvāti<br>trikona rupini śaktih bindurūpaḥ(s) śivassmrtah<br>avinābhāva sambandhah tasmāt bindu trikonayoh ||</p>
<p><b>Meaning.</b> The learned Seers say that the transcendental spiritual energy called ‘Kundalini’ resides in Moolaadhaara and pervades the Swadhishtana, Manipooraka, Anahata, Vishuddha and Ajna Chakras (pranic energy distribution centres in the body). The Goddess Parvati, based in these chakras in the form of triangles, energises the chakras. The energy in the form of a triangle has at its centre the Bindu (dot), the form of Siva. Therefore an inseparable relationship exists between Shiva and Shakti.</p>`],
  ['Guru Prarthana', `<p class="ky-sloka">mūlādhāre ganapati vapurdhārinam deśikendram |<br>svādhishthāne dhratavidhitanum sādhakoddāra dakṣam |<br>jvālāvarṇam rucira manipūrāntare rudramūrtim |<br>nādātmānam vitata mahitānāhatākāśa purnām |<br>bhāmārdhāngam paramapuruṣākāra gamyam viśuddhe |<br>jyotīrūpam vikti rahitam tattvamajñātārāle |<br>svātmārāmam dvayavirahitam tam sahasrāra padme |<br>dhyāyāmi tvām ganapati gurum saccidānanda rūpam |</p>
<p><b>Meaning.</b> To that Supreme Master who resides in the Moolaadhaara Chakra in the form of Lord Ganapathy; who resides in the Swadhishtana Chakra in the form of Lord Brahma, elevating the sadhaka (spiritual practitioner); who abides in the Manipooraka Chakra radiating the redness of fire in the form of Lord Rudra (Shiva); who dwells in the Anahata Chakra and fills all space (akash) with sound; who is resplendent like Lord Ardhanarishwara (Shiva) as the ultimate Purusha (Supreme Soul) in the Vishuddha Chakra; who, located in the Ajna Chakra, illumines without change as the principles of light and wisdom; who, beyond duality, as one without a second, exists in the absolute state of Atman (Self) and Universal Consciousness in the thousand-petal lotus — to Him, the Ganapati Guru, the embodiment of sat-chit-ananda (truth-knowledge-bliss), I offer my prayers again and again.</p>`],
];

/* ---------------------------------------------------------------------------
   DKYIC programmes and books, from the centre's page.
--------------------------------------------------------------------------- */
const programmes = ['Datta Kriya Yoga Sadhana', 'Special health camps', 'In-person special Datta Kriya Yoga programme', 'Nitya Sadhana online programme', 'Teachers Training Course', 'Yoga retreat for executives', 'Yoga Wellness Instructor Training &amp; Examination', 'Yoga Protocol Instructor Training &amp; Examination'];
const books = [['Datta Kriya Yoga', ''], ['Kumara Kriya Yoga', 'for kids'], ['Naadi Shuddhi Exercises', ''], ['Hatha Yoga Asanas', ''], ['Patanjali Yoga Sutras', '']];

const milestones = [
  ['1966', 'Sri Swamiji begins propagating Datta Kriya Yoga to seekers in the East and the West.'],
  ['1981', 'Datta Kriya Yoga facilities introduced at the Mysuru Ashram.'],
  ['2016', 'Guinness World Record for the largest breathing lesson, Milpitas, California.'],
  ['2022', 'The Yoga Ratna Award, in the year of Sri Swamiji’s 80th birthday.'],
  ['21 June', 'Every year, International Yoga Day is hosted by DKYIC at the Ashram.'],
];

export default {
  slug: 'kriya-yoga',
  file: 'kriya-yoga.html',
  title: 'Datta Kriya Yoga',
  crumb: 'Datta Kriya Yoga',
  description: 'Datta Kriya Yoga, the science of breath and meditation taught by Sri Ganapathy Sachchidananda Swamiji since 1966: the practice, its benefits and DKYIC, Mysuru.',
  nav: 'Teachings',
  image: photos.kriyaYoga,
  preload: photos.kriyaYoga,
  css: true,
  scripts: ['kriya-yoga'],
  jsonLd: [{
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'Datta Kriya Yoga International Centre',
    alternateName: 'DKYIC',
    url: links.dattaKriyaYoga,
    email: DKY.email,
    description: 'Accredited as a "Yoga Training Centre" by the Yoga Certification Board, Ministry of AYUSH, Government of India.',
    parentOrganization: { '@type': 'Organization', name: site.name, url: site.origin + '/' },
    address: { '@type': 'PostalAddress', streetAddress: '2nd Floor, SGS Ayurvedic Hospital, Sri Ganapathy Sachchidananda Ashram, Datta Nagar, Ooty Road', addressLocality: 'Mysuru', addressRegion: 'Karnataka', postalCode: '570025', addressCountry: 'IN' },
    sameAs: [DKY.facebook, DKY.youtube],
  }],
  render: () => `
${pageHero({
  eyebrow: 'Science of breath &amp; meditation',
  title: 'Datta <span class="em-light">Kriya Yoga</span>',
  lead: 'A science of meditation and a skilful way of living: the Kriya Yoga of Adi Guru Dattatreya, taught by Sri Swamiji to seekers in the East and the West since 1966.',
  image: photos.kriyaYoga,
  pos: 'center 48%',
  crumb: 'Datta Kriya Yoga',
  actions: btn('Visit dattakriyayoga.org', links.dattaKriyaYoga, 'gold', 'arrow-up-right', ' data-magnetic') + btn('Discover the practice', '#what', 'ghost', 'arrow'),
  tiles: [
    { icon: 'lotus', title: 'What it is', note: 'Union through action', href: '#what' },
    { icon: 'yoga', title: 'The practice', note: 'Breath, body, mind', href: '#practice' },
    { icon: 'heart', title: 'Benefits', note: 'Body, mind &amp; spirit', href: '#benefits' },
    { icon: 'school', title: 'DKY Centre', note: 'Courses in Mysuru', href: '#dkyic' },
  ],
})}

<section class="section ky-what" id="what" aria-labelledby="what-title">
  <div class="wrap">
    <div class="split ky-what-split">
      <div class="split-media" data-reveal="clip">
        <figure class="frame ky-teach" style="--ratio:3/2">
          <div class="frame-img">${img(IMG.teach, 'Sri Swamiji, seated in orange robes and a white shawl, stretches both arms out wide while teaching Datta Kriya Yoga')}</div>
          <figcaption><b>Sri Swamiji teaches Datta Kriya Yoga</b>In the lineage of Adi Guru Dattatreya</figcaption>
        </figure>
      </div>
      <div class="split-body prose" data-reveal="up">
        <span class="eyebrow">What is Datta Kriya Yoga</span>
        <h2 id="what-title" data-split>Union, through <span class="em-light">action</span></h2>
        <p class="ky-first">Derived from the Sanskrit <i>yuj</i>, yoga signifies union: the individual soul (<i>jeevatma</i>) merging with the Universal Soul (<i>Paramatma</i>), Sachchidananda Swaroopa. <i>Kriya</i> denotes action. Kriya Yoga channels the life-force energy (<i>praana</i>) through mental processes to achieve this union, starting with <i>pranayama</i>, the control of breath.</p>
        <p>According to the Markandeya Purana, the eternal Guru Dattatreya taught this mystic Kriya Yoga to Subramanya Swamy. Because it was bestowed by Lord Dattatreya, it is known as Datta Kriya Yoga. Vaamadeva, Jadabharata, Sukadeva, Parasurama, Prahlada, Alarka and Kartaviryarjuna all became great Yogis through it.</p>
        <p>Sri Swamiji teaches Datta Kriya Yoga in the lineage of Adi Guru Dattatreya, drawing inspiration from his mother and Guru, Sri Jayalakshmi Mata, a Master of Raja Yoga and Sree Vidya.</p>
        <a class="link-arrow" href="guru-parampara.html">The Guru Parampara ${icon('arrow', 16)}</a>
      </div>
    </div>

    <div class="ky-statement">${scrollLit('Datta Kriya Yoga is both a *science* of meditation and a skilful way of *living.*')}</div>

    <div class="ky-verses" data-stagger>
      ${verses.map(([src, sk, en]) => `<blockquote class="ky-verse">
        <span class="ky-verse-mark" aria-hidden="true">ॐ</span>
        <p class="ky-verse-sk" lang="sa-Latn">${sk.replace(' / ', '<br>')}</p>
        <p class="ky-verse-en">“${en}”</p>
        <footer>${src}</footer>
      </blockquote>`).join('')}
    </div>
    <p class="ky-note-center">Every chapter of the Bhagavad Gita is termed “yoga”, and the entire Gita is designated as Yoga Shastra.</p>
  </div>
</section>

<section class="section section-dark ky-breath-section grain" id="breath" aria-labelledby="breath-title">
  <div class="wrap ky-breath-grid">
    <div class="ky-breath-head">
      <span class="eyebrow">Breath awareness</span>
      <h2 id="breath-title" data-split>Focused breath, a <span class="em-light">quiet</span> mind</h2>
      <p class="lead" data-reveal="up">Focused yogic breathing quietens the mind and directs the flow of vital energy (prana) through the entire body. Prana is the vital life force that sustains and awakens our subtle energy system.</p>
    </div>
    ${breathVisual()}
    <div class="ky-breath-rest">
      <p data-reveal="up">Ancient yogis viewed lifespan in terms of breaths, with rapid breathing linked to shorter lifespans. Datta Kriya Yoga offers accessible practices to improve health by regulating breath, regardless of physical condition or lifestyle.</p>
      <p class="ky-illustrative" data-reveal="up">${icon('info', 16)}<span>The circle is illustrative, a quiet aid to breath awareness. It is not a timed exercise; learn the techniques from a Datta Kriya Yoga teacher.</span></p>
    </div>
  </div>
</section>

<section class="section section-paper ky-practice" id="practice" aria-labelledby="practice-title">
  <div class="wrap">
    <header class="section-head">
      <svg class="ornament" viewBox="0 0 160 20" aria-hidden="true" data-draw><path d="M0 10h58M102 10h58"/><path d="M80 2c3.6 3.2 5.4 5.8 5.4 8S83.6 15.6 80 18c-3.6-2.4-5.4-5.8-5.4-8S76.4 5.2 80 2Z"/><path d="M80 18c-4.6-.6-9.4-3.6-12-8.6 4.6 0 8.8 2 12 6.2M80 18c4.6-.6 9.4-3.6 12-8.6-4.6 0-8.8 2-12 6.2"/><circle cx="62" cy="10" r="1.6"/><circle cx="98" cy="10" r="1.6"/></svg>
      <span class="eyebrow">The practice</span>
      <h2 id="practice-title" data-split>A blend of <span class="em-light">Hatha</span> and <span class="em-light">Raja</span> Yoga</h2>
      <p class="lead" data-reveal="up">Sri Swamiji has renewed the Kriya Yoga principle: the encapsulation of Hatha Yoga, the exercise-based yoga practice of today, and Raja Yoga, which involves mind control through breath control.</p>
    </header>

    <div class="ky-blend-row">
      <figure class="ky-blend" data-reveal="scale">
        <div class="ky-blend-art">
          <svg viewBox="0 0 520 340" aria-hidden="true" data-draw>
            <defs><radialGradient id="ky-lens" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#e2c88e" stop-opacity=".55"/><stop offset="1" stop-color="#e2c88e" stop-opacity=".12"/></radialGradient></defs>
            <path class="ky-lens" d="M260 54.6a140 140 0 0 1 0 230.8a140 140 0 0 1 0-230.8Z" fill="url(#ky-lens)"/>
            <path class="ky-ring" d="M50 170a140 140 0 1 0 280 0a140 140 0 1 0-280 0"/>
            <path class="ky-ring" d="M190 170a140 140 0 1 0 280 0a140 140 0 1 0-280 0"/>
            <path class="ky-ring thin" d="M62 170a128 128 0 1 0 256 0a128 128 0 1 0-256 0"/>
            <path class="ky-ring thin" d="M202 170a128 128 0 1 0 256 0a128 128 0 1 0-256 0"/>
          </svg>
          <span class="ky-blend-label is-a"><b>Hatha Yoga</b><small>The exercise-based practice</small></span>
          <span class="ky-blend-label is-b"><b>Raja Yoga</b><small>Mind control through breath control</small></span>
          <span class="ky-blend-label is-c"><svg class="ky-blend-mark" viewBox="0 0 104 104" aria-hidden="true"><use href="#i-mandala"/></svg><b>Datta Kriya Yoga</b></span>
        </div>
        <figcaption>Datta Kriya Yoga, prescribed by Sri Swamiji, encompasses Raja Yoga, Hatha Yoga and Sri Vidya, facilitating concentration through thought cessation.</figcaption>
      </figure>

      <div class="ky-facets">
        <h3 data-reveal="up">Mental, pranic and physical</h3>
        <p data-reveal="up">Sri Swamiji selects specific mental, pranic and physical techniques to address the imbalances of modern lifestyles and to promote unity in diversity. The purpose: to minimise afflictions of body and mind and improve single-pointed concentration.</p>
        <p class="ky-facets-lead" data-reveal="up">For the ordinary householder, the way to know and learn Yoga is Datta Kriya Yoga. It deals with:</p>
        <ul class="ky-facet-list" data-stagger>
          ${facets.map(([ic, t]) => `<li><span class="ky-facet-icon" aria-hidden="true">${icon(ic, 22)}</span><span>${t}</span></li>`).join('')}
        </ul>
      </div>
    </div>

    <h3 class="ky-sub" data-reveal="up"><span class="eyebrow">Five components</span>The elements of a practice</h3>
    <ol class="ky-components" data-stagger>
      ${components.map(([t, gloss, x], i) => `<li class="ky-component">
        <span class="ky-num">${String(i + 1).padStart(2, '0')}</span>
        <h4>${t}</h4>
        <span class="ky-gloss">${gloss}</span>
        <p>${x}</p>
      </li>`).join('')}
    </ol>
  </div>
</section>

<section class="section section-sand ky-benefits" id="benefits" aria-labelledby="benefits-title">
  <div class="wrap">
    <header class="section-head">
      <svg class="ornament" viewBox="0 0 160 20" aria-hidden="true" data-draw><path d="M0 10h58M102 10h58"/><path d="M80 2c3.6 3.2 5.4 5.8 5.4 8S83.6 15.6 80 18c-3.6-2.4-5.4-5.8-5.4-8S76.4 5.2 80 2Z"/><path d="M80 18c-4.6-.6-9.4-3.6-12-8.6 4.6 0 8.8 2 12 6.2M80 18c4.6-.6 9.4-3.6 12-8.6-4.6 0-8.8 2-12 6.2"/><circle cx="62" cy="10" r="1.6"/><circle cx="98" cy="10" r="1.6"/></svg>
      <span class="eyebrow">Benefits</span>
      <h2 id="benefits-title" data-split>Balance for body, mind &amp; <span class="em-light">spirit</span></h2>
      <p class="lead" data-reveal="up">Regular practice leads to a joyful and blissful life. Datta Kriya Yoga is suitable for all age groups, and you don’t need any specific religious beliefs to benefit from it.</p>
    </header>
    <ul class="ky-benefit-grid" data-stagger>
      ${benefits.map(([ic, t, x]) => `<li class="ky-benefit"><span class="ky-benefit-icon">${icon(ic, 26)}</span><h3>${t}</h3><p>${x}</p></li>`).join('')}
    </ul>
    <div class="ky-also" data-reveal="up">
      <span class="ky-also-title">The Peetham also lists</span>
      <ul class="ky-pills">${alsoNoted.map((b) => `<li>${b}</li>`).join('')}</ul>
    </div>
    <figure class="ky-beyond" data-reveal="up">
      <svg class="ky-beyond-mark" viewBox="0 0 104 104" aria-hidden="true"><use href="#i-mandala"/></svg>
      <blockquote class="serif-quote">Datta Kriya Yoga transcends religious boundaries, serving as a spiritual science that complements all beliefs. It enhances mind-body coordination, deepens self-awareness, and fosters connection with inner selves and the world, benefiting humanity as a whole.</blockquote>
      <figcaption>Avadhoota Datta Peetham</figcaption>
    </figure>
  </div>
</section>

<section class="section section-dark ky-world" id="worldwide" aria-labelledby="worldwide-title">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Worldwide', title: 'Taught across the <span class="em-light">world</span>', lead: 'Sri Swamiji has taught Datta Kriya Yoga globally for decades, to health, educational and business communities. Camps have been conducted for groups of interested students in several countries.', light: true }).replace('<h2 data-split>', '<h2 id="worldwide-title" data-split>')}
    ${worldMap()}
    <div class="ky-countries-wrap" data-reveal="up">
      <h3 class="visually-hidden">Countries where Datta Kriya Yoga camps have been held</h3>
      <ul class="ky-countries" data-ky-countries>
        ${camps.map((c) => `<li data-c="${c.id}"><i aria-hidden="true"></i>${c.name}</li>`).join('')}
        <li class="is-more">and more</li>
      </ul>
    </div>

    <article class="ky-record-card glass" data-reveal="up" aria-labelledby="record-title">
      <div class="ky-record-media">${img(IMG.record, 'Sri Swamiji receives the framed Guinness World Records certificate for the largest breathing lesson from a Guinness World Records official, Milpitas, 2016', { pos: 'center 30%' })}</div>
      <div class="ky-record-body">
        <span class="tag tag-light">Guinness World Record · 10 July 2016</span>
        <h3 id="record-title">The largest breathing lesson</h3>
        <p>At India Community Center, Milpitas, California, USA, in an event organised by Dashavatara Yoga Center (USA), Sri Swamiji led the largest pranayama (breathing exercise) lesson in a single location.</p>
        <p>He explained the role of breathing in reducing stress and improving health: the relation between nerves, nerve centres and breathing patterns, the importance of long breath with sustained focus, and how systematic breathing helps with ailments and lifestyle diseases.</p>
        <p class="ky-record-foot">Sri Swamiji has experimented with mudras, kriyas and Nadi Shuddhi exercises for several decades; his scientific approach to pranayama has benefited millions of people the world over.</p>
      </div>
    </article>
  </div>
</section>

<section class="section ky-dkyic" id="dkyic" aria-labelledby="dkyic-title">
  <div class="wrap">
    <div class="split is-reverse">
      <div class="split-media" data-reveal="clip">
        ${frame(IMG.yogaDay, 'Datta Kriya Yoga students in blue lie on green mats on the Nada Mantapa stage, legs raised in an asana, during International Yoga Day', { caption: '<b>International Yoga Day, 21 June</b>Datta Kriya Yoga students demonstrate asanas', ratio: '4/3', pos: 'center 60%' })}
      </div>
      <div class="split-body prose" data-reveal="up">
        <span class="eyebrow">DKY International Centre</span>
        <h2 id="dkyic-title" data-split>Datta Kriya Yoga <span class="em-light">International Centre</span></h2>
        <p class="ky-accredit">${icon('check', 18)}<span>Accredited as a “Yoga Training Centre” by the Yoga Certification Board, Ministry of AYUSH, Government of India. <small>Certificate No. ${DKY.certificate}</small></span></p>
        <p>DKYIC has taken up the work of sharing Sri Swamiji’s teachings around the globe. To present the theory and practice of Datta Kriya Yoga systematically, short and long-term courses are conducted at the DKYIC in Mysuru and at a few selected places in India and abroad. Earnest students from all over India and abroad attend.</p>
        <p>Its courses are formulated to suit fast-thinking, active youth under the stress of modern lifestyles, and the principal factors of yogic practice are synchronised with modern scientific detail such as physiology. Classes are held in person and online.</p>
      </div>
    </div>

    <ol class="ky-milestones" data-reveal="up" aria-label="Milestones">
      <span class="ky-milestones-line" aria-hidden="true"></span>
      ${milestones.map(([y, t]) => `<li><span class="ky-ms-year">${y}</span><span class="ky-ms-dot" aria-hidden="true"></span><p>${t}</p></li>`).join('')}
    </ol>

    <div class="ky-dkyic-grid">
      <article class="panel ky-panel" data-reveal="up">
        <span class="ky-panel-icon">${icon('school', 24)}</span>
        <h3>Programmes</h3>
        <ul class="ky-checks">${programmes.map((p) => `<li>${icon('check', 15)}<span>${p}</span></li>`).join('')}</ul>
      </article>
      <article class="panel ky-panel" data-reveal="up" style="--i:1">
        <span class="ky-panel-icon">${icon('book', 24)}</span>
        <h3>Books by Sri Swamiji</h3>
        <p class="ky-panel-note">Published by DKYIC in English, Hindi, Kannada and Telugu. Among them:</p>
        <ul class="ky-books">${books.map(([b, n]) => `<li><i aria-hidden="true"></i><span>${b}${n ? ` <small>(${n})</small>` : ''}</span></li>`).join('')}</ul>
        <p class="ky-panel-note">On International Yoga Day, 21 June, DKYIC hosts the annual gathering at the Ashram, where students from local schools learn and practise Datta Kriya Yoga.</p>
      </article>
      <article class="panel ky-panel" data-reveal="up" style="--i:2">
        <span class="ky-panel-icon">${icon('compass', 24)}</span>
        <h3>Visit the Centre</h3>
        ${infoList([
          ['pin', 'Address', DKY.address.join('<br>')],
          ['mail', 'Email', `<a href="mailto:${DKY.email}">${DKY.email}</a>`],
          ['globe', 'Website', `<a href="${links.dattaKriyaYoga}" data-external>dattakriyayoga.org</a>`],
        ])}
        <a class="link-arrow" href="visit.html">Plan your visit to the Ashram ${icon('arrow', 16)}</a>
      </article>
    </div>
  </div>
</section>

<section class="section section-paper ky-prayers" id="prayers" aria-labelledby="prayers-title">
  <div class="wrap wrap-narrow">
    <header class="section-head">
      <span class="om ky-om" aria-hidden="true">ॐ</span>
      <span class="eyebrow">Datta Kriya Yoga prayers</span>
      <h2 id="prayers-title" data-split>Prayers to the <span class="em-light">Guru</span></h2>
      <p class="lead" data-reveal="up">Three prayers from the Datta Kriya Yoga tradition, with their meanings.</p>
    </header>
    <div data-reveal="up">${accordion(prayers)}</div>
    <p class="ky-prayer-note" data-reveal="up">${icon('info', 14)}<span>Text as published on the Peetham’s Datta Kriya Yoga page. Diacritic encoding slips (ü, ä, ş for ū, ā, ṣ) and obvious typos in the meanings have been corrected; spellings are otherwise unchanged.</span></p>
  </div>
</section>

<section class="section ky-learn" id="learn" aria-labelledby="learn-title">
  <div class="wrap">
    <header class="section-head">
      <svg class="ornament" viewBox="0 0 160 20" aria-hidden="true" data-draw><path d="M0 10h58M102 10h58"/><path d="M80 2c3.6 3.2 5.4 5.8 5.4 8S83.6 15.6 80 18c-3.6-2.4-5.4-5.8-5.4-8S76.4 5.2 80 2Z"/><path d="M80 18c-4.6-.6-9.4-3.6-12-8.6 4.6 0 8.8 2 12 6.2M80 18c4.6-.6 9.4-3.6 12-8.6-4.6 0-8.8 2-12 6.2"/><circle cx="62" cy="10" r="1.6"/><circle cx="98" cy="10" r="1.6"/></svg>
      <span class="eyebrow">Learn Datta Kriya Yoga</span>
      <h2 id="learn-title" data-split>Begin your <span class="em-light">practice</span></h2>
      <p class="lead" data-reveal="up">The Datta Kriya Yoga International Centre offers live online and offline classes, accessible globally and scheduled in Indian Standard Time. Here is how the centre describes joining a session.</p>
    </header>

    ${processSteps([
      ['Get notifications', `WhatsApp “Jaya Guru Datta” to <a href="${DKY.whatsapp}">7090 689 789</a> for updates on live online and offline classes.`],
      ['Prepare for the session', 'Slip into something comfortable, grab your mat and create some space, placing your phone or laptop a few feet away.'],
      ['Yoga time', `Join the classes streamed by experienced faculty on the <a href="${DKY.facebook}">Datta Kriya Yoga Facebook page</a>.`],
    ])}

    <div class="ky-ways" data-stagger>
      <article class="ky-way ky-way-site">
        <span class="ky-way-icon">${icon('globe', 26)}</span>
        <h3><a href="${links.dattaKriyaYoga}" data-external>dattakriyayoga.org</a></h3>
        <p>The centre’s own website: register for online sessions, yoga for students, and contact details.</p>
        <span class="ky-way-cta" aria-hidden="true">Visit the website ${icon('arrow-up-right', 15)}</span>
      </article>
      <article class="ky-way ky-way-app">
        <span class="ky-app-icon">${img(app.icon, 'Datta Kriya Yoga app icon', { w: 64, h: 64 })}</span>
        <h3><a href="${app.href}" data-external>Datta Kriya Yoga app</a></h3>
        <p>The Peetham’s Datta Kriya Yoga app, on the App Store. It is one of the Peetham’s ${apps.length} devotional apps.</p>
        <span class="ky-way-cta" aria-hidden="true">${icon('apple', 15)} App Store ${icon('arrow-up-right', 15)}</span>
      </article>
      <article class="ky-way ky-way-follow">
        <span class="ky-way-icon">${icon('video', 26)}</span>
        <h3>Watch &amp; follow</h3>
        <p>Streamed classes and talks from the centre.</p>
        <ul class="ky-follow">
          <li><a href="${DKY.facebook}">${icon('fb', 16)}<span>Facebook page</span></a></li>
          <li><a href="${DKY.youtube}">${icon('yt', 16)}<span>YouTube @dattakriyayoga108</span></a></li>
          <li><a href="mailto:${DKY.email}">${icon('mail', 16)}<span>${DKY.email}</span></a></li>
        </ul>
      </article>
    </div>
    <p class="ky-more-apps" data-reveal="up"><a class="link-arrow" href="media.html#apps">See all the Peetham’s apps ${icon('arrow', 16)}</a></p>
  </div>
</section>

${ctaBand({
  title: 'Yoga for <span class="em-light">everyone</span>',
  text: '“Datta Kriya Yogo Vivardhatam!” Suitable for all age groups, with no specific religious beliefs required. Join a class online, or at the International Centre in Mysuru.',
  actions: btn('Visit dattakriyayoga.org', links.dattaKriyaYoga, 'gold', 'arrow-up-right', ' data-magnetic') + btn('Plan your visit', 'visit.html', 'ghost', 'arrow'),
  image: IMG.yogaDay,
})}
`,
};
