// Guru Parampara — the lineage of the masters of Avadhoota Datta Peetham.
// Text is taken from dattapeetham.org: /page/view/datta-peetha-guru-parampara,
// /page/view/adi-guru-dattatreya, /page/view/sri-jayalakshmi-maata and
// /page/view/sri-bala-swamiji (fetched October 2026). Wording stays close to
// the source; only obvious spelling slips are corrected.

import { pageHero, sectionHead, split, frame, btn, icon, img, eyebrow, ornament, scrollLit, processSteps, ctaBand, video, esc } from '../components.mjs';
import { links, PAGE_IMG } from '../site.mjs';
import { photos, dattaCharitram } from '../data.mjs';

// Photographs from the Peetham's own pages (S3 bucket) not yet in data.photos.
const P = {
  dattatreya: `${PAGE_IMG}525/525_8898ed676f2abba2.jpg`, // Adi Guru Dattatreya page
  jayalakshmi: `${PAGE_IMG}524/524_61f724d553c7b9ff.jpg`, // Sri Jayalakshmi Maata page
  jayalakshmiAradhana: `${PAGE_IMG}524/524_e81cb9e39404b7ea.jpg`,
  naraharitAradhana: `${PAGE_IMG}524/524_60f82f9dcd1649ad.jpg`,
  swamijiWithDatta: `${PAGE_IMG}525/525_d7f028c3d9b430b0.JPG`, // "Sri Swamiji & Lord Dattatreya"
};

const episodes = [...dattaCharitram];

const pad = (n) => String(n).padStart(2, '0');

/* ---------------------------------------------------------------------------
   Fine-line icons for the 24 Gurus of nature (32 × 32, gold stroke).
   ------------------------------------------------------------------------- */
const hex = (cx, cy, r = 4.6) => {
  const w = r * 0.866;
  return `M${cx} ${cy - r}L${(cx + w).toFixed(2)} ${cy - r / 2}V${cy + r / 2}L${cx} ${cy + r}L${(cx - w).toFixed(2)} ${cy + r / 2}V${cy - r / 2}Z`;
};
const web = () => {
  const pts = (r) => Array.from({ length: 8 }, (_, k) => {
    const a = (Math.PI / 4) * k + Math.PI / 8;
    return [16 + r * Math.cos(a), 16 + r * Math.sin(a)].map((v) => v.toFixed(2));
  });
  const ring = (r) => `M${pts(r).map((p) => p.join(' ')).join('L')}Z`;
  return `${pts(12.5).map(([x, y]) => `M16 16L${x} ${y}`).join('')}${ring(4.6)}${ring(8.6)}${ring(12.5)}`;
};

const glyphs = {
  earth: '<path d="M4 25h24M7.5 25c1.8-3.4 5-5.2 8.5-5.2s6.7 1.8 8.5 5.2M16 19.8v-8"/><path d="M16 14.6c-3.6 0-5.7-2-6.3-5.4 3.6 0 5.7 2 6.3 5.4ZM16 11.8c.6-3.2 2.7-5.2 6.3-5.2-.6 3.2-2.7 5.2-6.3 5.2Z"/><path d="M9 28.5h2.5M15 28.5h2.5M21 28.5h2.5"/>',
  air: '<path d="M4 12.5h14.5a3.6 3.6 0 1 0-3.6-3.6M4 18h19a3.6 3.6 0 1 1-3.6 3.6M4 23.5h9M20 12.5h4"/>',
  sky: '<path d="M9 23h14.5a4.2 4.2 0 0 0 .2-8.4 6.4 6.4 0 0 0-12.2-1.4A4.9 4.9 0 0 0 9 23Z"/><path d="M7 4.5v5M4.5 7h5M25.5 3.5v4M23.5 5.5h4M27 11.5v2M26 12.5h2"/>',
  water: '<path d="M16 4c4.2 5.2 6.6 8.9 6.6 11.9a6.6 6.6 0 0 1-13.2 0C9.4 12.9 11.8 9.2 16 4Z"/><path d="M12.9 16.6a3.2 3.2 0 0 0 2.7 3"/><path d="M4 27.5c1.9-1.3 3.8-1.3 5.6 0s3.8 1.3 5.6 0 3.8-1.3 5.6 0 3.8 1.3 5.6 0"/>',
  fire: '<path d="M16 3c4.6 4.7 7.8 8.8 7.8 13.6a7.8 7.8 0 0 1-15.6 0c0-2.7 1.1-4.8 2.8-6.6.3 2.6 1.5 4.1 3.3 4.8-.6-4 0-8.1 1.7-11.8Z"/><path d="M16 24.4a3 3 0 0 1-3-3c0-1.7 1.3-3.2 3-5 1.7 1.8 3 3.3 3 5a3 3 0 0 1-3 3Z"/><path d="M10 28.5h12"/>',
  moon: '<path d="M19.5 5a11 11 0 1 0 8 15.8A9 9 0 0 1 19.5 5Z"/><path d="M7.5 4.5v3.5M5.8 6.2h3.5M25 5v2.5M23.8 6.2h2.5"/>',
  sun: '<circle cx="16" cy="16" r="5.6"/><path d="M16 3.5v4M16 24.5v4M3.5 16h4M24.5 16h4M7.2 7.2l2.8 2.8M22 22l2.8 2.8M7.2 24.8l2.8-2.8M22 10l2.8-2.8"/>',
  pigeon: '<path d="M27.5 10.6 24.6 11c-.5-2-2.1-3.2-4-3.2-2.4 0-4.3 2-4.3 4.4v1.5C12.6 13 8.6 11 6 8c-.7 6.6 2.6 11.1 7.6 12.3L10.4 26h7c5.8 0 9.4-4 9.4-9.5v-3.4Z"/><circle cx="20.6" cy="10.8" r=".7" fill="currentColor"/><path d="M14 26v2.5M18 26v2.5"/>',
  python: '<path d="M14 16a2 2 0 1 1 4 0 4 4 0 0 1-8 0 6 6 0 0 1 12 0 8 8 0 0 1-16 0c0-4.2 2.6-7.8 6.4-9.2"/><path d="M12.4 6.8c1.4-.9 3.4-.6 3.9.8.5 1.5-.7 2.6-2.2 2.6"/><circle cx="14.6" cy="7.4" r=".55" fill="currentColor"/>',
  ocean: '<path d="M3 11c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0 4.3-2 6.5 0 4.3 2 6.5 0M3 17c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0 4.3-2 6.5 0 4.3 2 6.5 0M3 23c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0 4.3-2 6.5 0 4.3 2 6.5 0"/>',
  moth: '<ellipse cx="16" cy="16.5" rx="1.4" ry="7"/><path d="M14.7 12.2C11.6 6.6 5.2 6.3 4.6 10.2c-.5 3.3 4.1 5.6 10 4.6M17.3 12.2c3.1-5.6 9.5-5.9 10.1-2 .5 3.3-4.1 5.6-10 4.6M14.7 17.5c-3.6.2-7.6 2-7.2 4.7.4 2.9 4.6 2.2 7.3-1.6M17.3 17.5c3.6.2 7.6 2 7.2 4.7-.4 2.9-4.6 2.2-7.3-1.6M15.3 9.7c-.8-2-2.2-3.2-3.9-3.7M16.7 9.7c.8-2 2.2-3.2 3.9-3.7"/>',
  bee: '<ellipse cx="16" cy="19.2" rx="5" ry="6.4"/><circle cx="16" cy="10.4" r="2.4"/><path d="M11.4 17.2h9.2M11.4 21.2h9.2M16 25.6v2.4M15 8.3 13.4 5M17 8.3 18.6 5"/><path d="M11.8 14.4c-3.9-.6-6.6-3.3-5.9-5.6.8-2.6 4.8-.4 7 3.6M20.2 14.4c3.9-.6 6.6-3.3 5.9-5.6-.8-2.6-4.8-.4-7 3.6"/>',
  elephant: '<path d="M11.2 11.8c0-4 2.1-6.5 4.8-6.5s4.8 2.5 4.8 6.5v3.4c0 1.8-.9 2.8-1.9 3.6v4.3c0 1.6.9 2.6 2.4 2.6M11.2 11.8v3.4c0 1.8.9 2.8 1.9 3.6v4.6c0 2.2 1.6 3.6 3.6 3.6h1.6"/><path d="M11.2 9.6C7 7.4 3 8.6 3 12.3c0 3.6 3.5 5.9 8.2 5.5M20.8 9.6C25 7.4 29 8.6 29 12.3c0 3.6-3.5 5.9-8.2 5.5"/><circle cx="13.7" cy="12" r=".7" fill="currentColor"/><circle cx="18.3" cy="12" r=".7" fill="currentColor"/>',
  honey: `<path d="${hex(11.7, 10.8)}${hex(20.3, 10.8)}${hex(16, 18.3)}"/><path d="M19.4 23.9c0 1.6 1.2 2.5 1.2 3.6a1.2 1.2 0 0 1-2.4 0c0-1.1 1.2-2 1.2-3.6Z"/>`,
  deer: '<path d="M13.4 14.2h5.2l-.9 8.2-1.7 3.1-1.7-3.1Z"/><path d="M13.4 14.2 9 12.6l2.4 3.4M18.6 14.2l4.4-1.6-2.4 3.4"/><path d="M14.4 13.6C13.5 10.2 11.6 8 8 7M10.9 8.1 10 4.3M12.7 10.2l1.4-3.6M17.6 13.6c.9-3.4 2.8-5.6 6.4-6.6M21.1 8.1l.9-3.8M19.3 10.2l-1.4-3.6"/><circle cx="14.6" cy="17" r=".55" fill="currentColor"/><circle cx="17.4" cy="17" r=".55" fill="currentColor"/>',
  fish: '<path d="M4 16c4.5-6 12.5-7.5 18-3l5-4v14l-5-4c-5.5 4.5-13.5 3-18-3Z"/><circle cx="9.2" cy="15" r=".8" fill="currentColor"/><path d="M12.6 12.3c1.3 2.4 1.3 5 0 7.4"/>',
  pingala: '<path d="M4.5 16c3.2 4.4 7.2 6.6 11.5 6.6s8.3-2.2 11.5-6.6M8.6 20l-1.6 2.6M16 22.6v3.2M23.4 20l1.6 2.6"/><path d="M17.8 4.6a4.6 4.6 0 1 0 5 6.3 3.8 3.8 0 0 1-5-6.3Z"/>',
  osprey: '<path d="M3 11.5c3.6 0 6.6 1.5 9.2 4.4L16 18l3.8-2.1c2.6-2.9 5.6-4.4 9.2-4.4"/><path d="M14.4 18.6 16 21.6l1.6-3"/><circle cx="16" cy="27" r="1.3"/><path d="M16 23.4v1.4"/>',
  child: '<circle cx="12.5" cy="7.6" r="3.2"/><path d="M12.5 11v8M12.5 13.8l-4.2 3.2M12.5 13.8l4.4 2.4M12.5 19l-3.2 6.6M12.5 19l3.2 6.6"/><circle cx="22.5" cy="23.2" r="3.4"/><path d="M19.4 22.3c2 .9 4.2.9 6.2 0"/>',
  maiden: '<rect x="17.6" y="3" width="3.6" height="15.5" rx="1.8"/><path d="M8 21h17.5l-2.2 6.5H10.2Z"/><circle cx="10.4" cy="11" r="4.6"/><circle cx="10.4" cy="11" r="3.1"/>',
  arrow: '<path d="M6.5 25.5 24 8"/><path d="M27 5l-7.6 2.4 5.2 5.2Z"/><path d="M6.5 25.5 3.4 25M6.5 25.5l.5 3.1M9.4 22.6l-3.1-.5M9.4 22.6l.5 3.1"/>',
  snake: '<path d="M4 27.5h24M17.6 27.5c.4-3.7 2.3-6.6 4.7-6.6s4.3 2.9 4.7 6.6"/><path d="M21.8 21.2c-2.6-1.6-7.6-1.4-10-3.6-2.6-2.4.4-5 3.6-5.6 3.2-.6 4.5-2.9 2.2-4.8-1.9-1.5-5-1.3-6.6.2"/><path d="M11 7.3c-1.3.2-2.1 1.1-2 2.1.1 1 1.2 1.6 2.4 1.3"/><path d="M9 9.1 6.6 8.6M9 9.1l-2 1.4"/>',
  spider: `<path d="${web()}"/><circle cx="16" cy="16" r="1.8" fill="currentColor"/>`,
  insect: '<circle cx="16" cy="6.6" r="1.8"/><ellipse cx="16" cy="11.2" rx="1.6" ry="2.6"/><path d="M16 13.8v14M14.9 18h2.2M14.9 21.6h2.2M14.9 25.2h2.2"/><path d="M14.6 10.4C11.6 8.3 6.4 7.8 4.6 9.3c-1.8 1.5 2.6 3.7 10 2.6M17.4 10.4c3-2.1 8.2-2.6 10-1.1 1.8 1.5-2.6 3.7-10 2.6M14.6 12.6c-2.6 0-7.2 1.5-8.1 3.5-.8 1.9 3.7 1.5 8.1-2M17.4 12.6c2.6 0 7.2 1.5 8.1 3.5.8 1.9-3.7 1.5-8.1-2"/>',
  // Emblems for the Trinity in Lord Dattatreya's form.
  trident: '<path d="M16 9v20M16 3.5l-2.4 4h4.8Z"/><path d="M8.5 6.5c0 5 2.8 7.6 7.5 7.6s7.5-2.6 7.5-7.6M8.5 6.5 7 9.4M23.5 6.5 25 9.4M12.6 24h6.8"/>',
  chakra: '<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="3"/><path d="M16 5v8M16 19v8M5 16h8M19 16h8M8.2 8.2l5.7 5.7M18.1 18.1l5.7 5.7M8.2 23.8l5.7-5.7M18.1 13.9l5.7-5.7"/>',
  mala: `${Array.from({ length: 14 }, (_, k) => { const a = (Math.PI * 2 * k) / 14 - Math.PI / 2; return `<circle cx="${(16 + 9.5 * Math.cos(a)).toFixed(2)}" cy="${(14 + 9.5 * Math.sin(a)).toFixed(2)}" r="1.5"/>`; }).join('')}<path d="M16 25.2v2.3M14.2 29.5l1.8-2 1.8 2"/>`,
};

const sprite = () => `<svg class="gp-sprite" width="0" height="0" aria-hidden="true" focusable="false"><defs>${Object.entries(glyphs).map(([k, d]) => `<symbol id="g-${k}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${d}</symbol>`).join('')}</defs></svg>`;
const glyph = (k, cls = '') => `<svg class="gp-glyph-ico ${cls}" aria-hidden="true" focusable="false"><use href="#g-${k}"/></svg>`;

/* ---------------------------------------------------------------------------
   The 24 Gurus of nature (Adi Guru Dattatreya page, verbatim lessons).
   ------------------------------------------------------------------------- */
const gurus = [
  ['earth', 'Prithvi', 'Earth', 'Patience and doing good to others in one’s entire life can be learnt from Mother Earth.'],
  ['air', 'Vaayu', 'Air', 'Air is symbolic of the qualities of non attachment and stainlessness.'],
  ['sky', 'Akasha', 'Sky', 'Sky represents the all pervading nature and about the Self that remains uncontaminated by the qualities that arise in the elements forming the body.'],
  ['water', 'Jala', 'Water', 'Water represents purity, smoothness and sweetness, so one should have a pure heart, speak sweet words and be full of love for all beings.'],
  ['fire', 'Agni', 'Fire', 'Even though fire consumes all things indiscriminately, it does not become unholy, so too, one should have knowledge, should be a tapasvin, be undesirable and remain unaffected by what others offer him.'],
  ['moon', 'Chandra', 'Moon', 'Waxing and waning are only for Moon’s lustre, likewise, the delinquencies of the six senses are of the body only and not of the Atman.'],
  ['sun', 'Surya', 'Sun', 'Sun absorbs water from Earth with its rays and returns the water to Earth at an appropriate time. Similarly, one should accept the objects of the senses without any enthusiasm for them.'],
  ['pigeon', 'Kapota', 'Pigeon', 'A pigeon develops too much attachment or friendship and ends up in affliction. So, attachments lead to one’s downfall and waste of precious lifespan.'],
  ['python', 'Ajagara', 'Python', 'Like a python, one should forego even sleep and food, and remain firmly devoted to the Self.'],
  ['ocean', 'Samudra', 'Ocean', 'An ocean does not let even a small leaf to land on its surface, so too one should not allow even the smallest desire or agitation to enter into the mind. Moreover, many rivers flow into an ocean, yet it does not overflow. Likewise, one should not be over joyous when desires are fulfilled or be depressed when they do not materialize.'],
  ['moth', 'Moth', '', 'Deluded by the flames of fire and expecting to enjoy comforts, the moth rushes towards the flames and gets burnt. So, man must be careful not to fall a victim to the attractions of a woman or to the delusion caused by the sense organs.'],
  ['bee', 'Bhramara', 'Bee', 'A bee gathers nectar from almost every flower, so too one should study all scriptures, skilfully grasp the essence and adapt it in the search for the Self.'],
  ['elephant', 'Gaja', 'Elephant', 'Although elephant is very strong and intelligent, it gets trapped due to its lustfulness. So too, one should know that lust is dangerous.'],
  ['honey', 'Honey-thief', '', 'The honey-thief contrives and steals the honey that is hoarded by honey bees. Therefore, if a person is stingy and hides his wealth without enjoying it himself or allowing others to share it, he risks being robbed by someone.'],
  ['deer', 'Deer', '', 'The hunter’s music makes the innocent deer to stand still and listen with closed eyes. Sage Rushyashrunga became a victim of a dancing girl attracted to her music and dance. So too, one should not be beguiled by music or dancing.'],
  ['fish', 'Fish', '', 'The uncontrolled tongue of a fish makes it the prey of the fisherman’s hook. Therefore, a fish teaches that controlling and conquering the tongue is very important.'],
  ['pingala', 'Pingala', '', 'Pingala, a harlot, attained marvellous tranquility, peace of mind and a sound sleep by giving up the desire for wealth and lustful pleasures. So, desire is sorrow and absence of wants is the highest happiness.'],
  ['osprey', 'Osprey', '', 'A little bird holding a bit of meat gets attacked by a bigger and stronger bird. When the bird drops the meat, the other bird follows to get the meat piece. So too, if one keeps a thing coveted by others, one will be subjected to severe anguish and therefore it is wise to give up such things voluntarily.'],
  ['child', 'Child', '', 'A little child is worry-free and is always happy playing by himself. One should also remain happy like a child.'],
  ['maiden', 'Maiden', '', 'When a maiden pounds the paddy, her bangles make jingling sound. To avoid any sound, she retains only one bangle on each wrist. Likewise, quarrels ensue when too many persons gather in one place.'],
  ['arrow', 'Arrow-maker', '', 'An arrow-maker has utmost concentration in making arrows. Likewise, one should sit with total focus and practice Yoga.'],
  ['snake', 'Snake', '', 'A serpent is always vigilant and is never absent-minded. Unlike a man, a snake does not waste its time building a shelter and happily lives in an ant-hill deserted by ants.'],
  ['spider', 'Spider', '', 'A spider stirs the threads in its stomach and with that material weaves its web, plays with it and finally swallows it. The process of creation also is akin to a spider’s web.'],
  ['insect', 'Insect', '', 'Like how the form of an insect that stares hard at a dragon-fly undergoes a change, so too, one attains the form of those on whom one concentrates the mind completely. If a small insect can transform its body, even a man possessing intellect and the faculty of meditation and concentration can be certainly liberated.'],
];

const guruName = ([, name, en]) => `${name}${en ? ` <small>${en}</small>` : ''}`;

const gurusGrid = () => `<div class="gt-layout" data-gurus>
  <div class="gt-stage-col">
    <div class="gt-stage" id="gt-stage" aria-live="polite" hidden>
      <span class="gt-stage-halo" aria-hidden="true"></span>
      ${glyph(gurus[0][0], 'gt-stage-ico')}
      <span class="gt-stage-num">Guru <b>01</b> of 24</span>
      <h3 class="gt-stage-name">${guruName(gurus[0])}</h3>
      <p class="gt-stage-lesson">${gurus[0][3]}</p>
      <div class="gt-stage-nav">
        <button type="button" class="icon-btn gt-prev" aria-label="Previous Guru">${icon('arrow-left', 18)}</button>
        <span class="gt-stage-bar" aria-hidden="true"><i></i></span>
        <button type="button" class="icon-btn gt-next" aria-label="Next Guru">${icon('arrow', 18)}</button>
      </div>
    </div>
  </div>
  <ol class="gt-grid" data-stagger>
    ${gurus.map((g, i) => `<li class="gt" style="--k:${i}">
      <button type="button" class="gt-btn" data-guru="${i}" data-glyph="${g[0]}" aria-pressed="${i === 0}" aria-controls="gt-stage">
        ${glyph(g[0], 'gt-ico')}
        <span class="gt-num">${pad(i + 1)}</span>
        <span class="gt-name">${guruName(g)}</span>
      </button>
      <p class="gt-lesson">${g[3]}</p>
    </li>`).join('')}
  </ol>
</div>`;

/* ---------------------------------------------------------------------------
   The lineage — a golden thread of light with each Guru as a node.
   ------------------------------------------------------------------------- */
const lineage = [
  {
    img: photos.lordDattatreya, alt: 'Lord Dattatreya, adorned with garlands', pos: '50% 12%',
    place: 'Krita Yuga', placeNote: 'Through the penance of Sage Atri and Anasuya',
    role: 'Adi Guru · Guru of Gurus', name: 'Lord Dattatreya',
    text: '<p>Dattatreya Swami is the Supreme God who is an incarnation of the Trinity — Brahma, Vishnu and Shiva. He is known as the Guru of Gurus since he was the foremost Guru who promoted and propagated the divine knowledge.</p><p>Lord Dattatreya (or Datta) takes on several incarnations time and again to uplift his devotees.</p>',
    link: ['Adi Guru Dattatreya', '#dattatreya'],
  },
  {
    verse: true, place: 'As Kali Yuga began',
    text: 'He goes himself to his devotees if they cannot reach him and for those who cannot climb to his heights, he comes down to their level.',
  },
  {
    img: photos.sripadaVallabha, alt: 'Sripada Vallabha Swami', pos: '47% 52%', zoom: 1.35,
    place: 'Sri Kshetra Pithapuram', placeNote: 'On the east coast of Godavari, Andhra Pradesh',
    role: 'First manifestation of Lord Datta', name: 'Sripada Vallabha',
    text: '<p>The child had impressions of Shanka and Chakra in his feet, hence he was called “Sripada”. He was born to a pious Brahmin couple, Appala Raja and Sumati, in Sri Kshetra Pithapuram.</p><p>He went to Kashi, Badrinath and Kedarnath, imparting Gnaana to the saints, and finally retired to Kuruvapur, an island in the river Krishna. His teachings emphasize the importance of devotion, selflessness, and self-realization.</p>',
  },
  {
    img: photos.narasimhaSaraswati, alt: 'Narasimha Saraswati Swami', pos: '50% 18%', zoom: 1.1,
    place: 'Karanja', placeNote: 'Maharashtra',
    role: 'Second incarnation of Lord Dattatreya', name: 'Narasimha Saraswati',
    text: '<p>Narasimha Saraswati is believed to have been born to the saintly couple Madhava Sharma and Amba-Bhavani Kale in Karanja village in Maharashtra, India.</p><p>Initially named Narahari, he later came to be known as Narasimha Saraswati, a name symbolizing his role as the dispeller of human sins and miseries.</p>',
  },
  {
    img: P.jayalakshmi, alt: 'Sri Jayalakshmi Maata', pos: '50% 28%',
    place: 'Sogala, 1923', placeNote: 'Ramanagara district, Karnataka',
    role: 'Mother and first Guru of Sri Swamiji', name: 'Sri Jayalakshmi Maata',
    text: '<p>Sri Jayalakshmi Maata was the Mother and spiritual Guru of Sri Swamiji. She imparted spiritual training to Sri Swamiji in his childhood, bestowed Sri Vidya and Raja Yoga and explained the esoteric meanings of scriptures like the Vedas, Puranas, Mahabharata, and Ramayana.</p>',
    link: ['Her life &amp; teachings', '#jayalakshmi-maata'],
  },
  {
    img: photos.swamiji, alt: 'Sri Ganapathy Sachchidananda Swamiji', pos: '56% 30%', zoom: 1.3,
    place: 'Mekedatu, 26 May 1942', placeNote: 'Karnataka, India',
    role: 'Sri Guru · Avadhoota Datta Peethadhipati', name: 'Sri Ganapathy Sachchidananda Swamiji',
    text: '<p>As part of the Guru Parampara prayer, “Sri Guru”, our present Guru and Avadhoota Datta Peethadhipati Jagadguru Sri Sri Sri Ganapathy Sachchidananda Swamiji, should be contemplated upon.</p><p>In 1966, Sri Swamiji moved to the present site of the Mysuru Ashram on Ooty Road, which in the early days was only a straw hut in a field.</p>',
    link: ['His life and mission', 'sri-swamiji.html'],
  },
  {
    img: photos.balaSwamiji, alt: 'Sri Datta Vijayananda Teertha Swamiji (Sri Bala Swamiji)', pos: '50% 26%', zoom: 1.08,
    place: 'Mysuru, 14 January 1977', placeNote: 'Junior Pontiff since 29 May 2004',
    role: 'Junior Pontiff · Sri Bala Swamiji', name: 'Sri Datta Vijayananda Teertha Swamiji',
    text: '<p>Fondly referred to as Bala Swamiji by the devotees, he was named Sri Harsha Sharma and had his Vedic education in the SGS Veda Pathashala, Mysuru.</p><p>On 29th May, 2004, Sri Harsha Sharma was anointed as the Junior Pontiff of Avadhoota Datta Peetham and given the Sannyasa Deeksha name “Sri Datta Vijayananda Teertha”.</p>',
    link: ['About Sri Bala Swamiji', 'sri-swamiji.html#bala-swamiji'],
  },
];

const threadNode = (n, i) => {
  if (n.verse) {
    return `<li class="gn gn-verse${i % 2 ? ' is-flip' : ''}">
      <span class="gn-bead" aria-hidden="true"></span>
      <div class="gn-aside"><span class="gn-place">${n.place}</span></div>
      <blockquote class="gn-card"><p>${n.text}</p><footer class="gn-place-inline">${n.place}</footer></blockquote>
    </li>`;
  }
  const style = `--pos:${n.pos || '50% 30%'};--z:${n.zoom || 1}`;
  return `<li class="gn${i % 2 ? ' is-flip' : ''}">
    <div class="gn-medal" style="${style}">${img(n.img, n.alt)}</div>
    <div class="gn-aside"><span class="gn-place">${n.place}</span>${n.placeNote ? `<small>${n.placeNote}</small>` : ''}</div>
    <div class="gn-card">
      <span class="gn-place gn-place-inline">${n.place}</span>
      <span class="gn-role">${n.role}</span>
      <h3>${n.name}</h3>
      ${n.text}
      ${n.link ? `<a class="link-arrow" href="${n.link[1]}">${n.link[0]} ${icon('arrow', 16)}</a>` : ''}
    </div>
  </li>`;
};

const dwadasha = [
  'See Me in all women',
  'Be compassionate to the poor and socio-economically backward people',
  'In all situations think and act according to the Shastras',
  'Protect the pious and the virtuous even at the cost of your life',
  'Consider all forms of life as equal. Do not discriminate',
  'Do not miss your daily disciplines at any cost — it should not inconvenience others. It should always benefit others',
  'See Me in all forms of life',
  'Do not ever stray from the Truth',
  'Develop the skill of simplifying your knowledge, and spread it among the masses',
  'Do not reveal your future incarnations',
  'Undertake the task of spreading Dharma in a lucid manner',
  'Lead your life without hurting others even if it means hurting yourself',
];

const trinity = [
  ['trident', 'Datta as Shiva', 'Shula & Damaruga', 'One hand wields the Shula (trident), which is meant for killing the ego. One more hand holds the Damaruga (drum) to awaken the people who are always in the state of slumber called ajnana (ignorance).'],
  ['chakra', 'Datta as Vishnu', 'Shankha & Chakra', 'The Shankha (conch) represents the primordial sound Omkara — when it is blown, avidya (ignorance) vanishes. The Chakra is symbolic of karma, like a round circle with neither a beginning nor an end.'],
  ['mala', 'Datta as Brahma', 'Japa mala & Kamandalu', 'The rosary’s many rounded beads represent the universes in multitude under the Lord’s control. The Kamandalu (water-pot) does not contain ordinary water; it has the nectar of wisdom.'],
];

export default {
  slug: 'guru-parampara',
  file: 'guru-parampara.html',
  title: 'Guru Parampara',
  crumb: 'Guru Parampara',
  description: 'The lineage of Gurus of Avadhoota Datta Peetham: Adi Guru Dattatreya and his 24 Gurus of nature, Sripada Vallabha, Narasimha Saraswati and Sri Swamiji.',
  nav: 'About',
  image: photos.guruParamparaPooja,
  preload: photos.guruParamparaPooja,
  css: true,
  scripts: ['guru-parampara'],
  render: () => `
${pageHero({
  eyebrow: 'Datta Peetha Guru Parampara',
  title: 'Guru <span class="em-light">Parampara</span>',
  crumb: 'Guru Parampara',
  lead: 'The continuous succession of Gurus — from Adi Guru Dattatreya, through Sripada Vallabha and Narasimha Saraswati, to Sri Swamiji, our present Guru.',
  image: photos.guruParamparaPooja,
  pos: 'center 34%',
  actions: `${btn('Follow the lineage', '#lineage', 'gold', 'arrow', ' data-magnetic')}${btn('Datta Charitram', '#datta-charitram', 'ghost', 'play-circle')}`,
  tiles: [
    { icon: 'book', title: 'The Meaning', note: 'Gu, Ru & Parampara', href: '#meaning' },
    { icon: 'lotus', title: 'Adi Guru', note: 'Lord Dattatreya', href: '#dattatreya' },
    { icon: 'sparkle', title: 'The Lineage', note: 'A golden thread of Gurus', href: '#lineage' },
    { icon: 'moon', title: 'Guru Purnima', note: 'Guru Parampara Pooja', href: '#guru-purnima' },
  ],
})}

<section id="meaning" class="section gp-meaning">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'The meaning',
      title: 'What is <span class="em-light">Guru Parampara?</span>',
      lead: '“Guru Parampara” is the combination of two words, Guru and Parampara. As per the sacred text Guru Geeta, the dialog between Lord Shiva and Goddess Parvati, the word “Guru” comprises of two words, “Gu” and “Ru”.',
    })}

    <div class="gp-guru" data-reveal="up">
      <div class="gp-syl is-gu">
        <span class="gp-syl-glyph" lang="sa-Latn">Gu</span>
        <p><b>“Gu”</b> represents <em>darkness</em> (ignorance)</p>
      </div>
      <span class="gp-dawn" aria-hidden="true"><i></i></span>
      <div class="gp-syl is-ru">
        <span class="gp-syl-glyph" lang="sa-Latn">Ru</span>
        <p><b>“Ru”</b> represents <em>illumination</em></p>
      </div>
    </div>
    <p class="gp-parampara" data-reveal="up"><b>“Parampara”</b> means “uninterrupted succession”. So, <span>Guru Parampara is the continuous succession or lineage of Gurus.</span></p>

    <div class="gp-lit">${scrollLit('Guru is like the *Sun* who swallows up the darkness called ignorance and blesses with *illumination*.')}</div>

    ${split({
      media: frame(photos.lineageChart, 'Painting of the Guru Parampara: the Trinity above Lord Dattatreya, with the lineage of Gurus below', { caption: '<b>Guru Parampara</b>The lineage of Gurus', ratio: '3/4', pos: '50% 40%' }),
      body: `${eyebrow('Why the Guru')}
        <h3 class="gp-h3">No one can be at par with the Guru</h3>
        <p class="dropcap">All scriptures declare emphatically that Guru is the very embodiment of divine and spiritual knowledge (Gnaana). Every seeker needs the guidance of a Guru to progress on the path of the spiritual ladder.</p>
        <p>It is not only a customary practice to offer prayers to the lineage of Gurus but also a fundamental duty of a seeker, for no one can be at par with the Guru or is as supreme as Him. Prayer and Pooja to the Guru is performed to offer gratitude to the lineage of Gurus who have bestowed divine wisdom. By doing so, one is blessed with knowledge of the Supreme.</p>
        <p>To get rid of the afflictions of one’s mind and to ascend the spiritual ladder, it is a must to seek a Guru in a physical form, serve him with reverence and devotion, and thereby cleanse oneself of sins and impurities.</p>
        <p class="gp-pullline">One must pray to Guru, before and after completion of any work. Without Guru, one cannot reach one’s goal.</p>`,
    })}
  </div>
</section>

<section id="guru-geeta" class="section section-sand gp-geeta">
  <div class="wrap wrap-narrow">
    <figure class="gp-verse">
      ${ornament()}
      ${eyebrow('A verse extolled in')}
      <h2 data-split>The Guru Geeta</h2>
      <blockquote class="gp-sloka" lang="sa-Latn" data-reveal="up">
        <p><span class="gp-l"><span class="gp-key">Gu</span>kaarassyaad gunaateeto</span> <span class="gp-l">roopaateeto <span class="gp-key">ru</span>kaarakah</span></p>
      </blockquote>
      <figcaption class="gp-meanings" data-stagger>
        <p><span class="gp-mk" lang="sa-Latn">Gu</span><span>In this context, “Gu” implies He is above all attributes (<i>gunas</i>).</span></p>
        <p><span class="gp-mk" lang="sa-Latn">Ru</span><span>“Ru” implies He is beyond form (<i>roopa</i>).</span></p>
        <p class="gp-mean-close">As He is the absolute Supreme Lord who is beyond traits and form, He has been addressed as Guru.</p>
      </figcaption>
    </figure>
  </div>
</section>

<section id="dattatreya" class="section section-paper gp-datta">
  <div class="wrap">
    ${split({
      media: frame(P.dattatreya, 'Lord Dattatreya with three heads, adorned with garlands', { caption: '<b>Lord Dattatreya</b>Adi Guru — the Guru of Gurus', ratio: '4/5', pos: '50% 30%' }),
      body: `${eyebrow('Adi Guru')}
        <h2 data-split>Lord <span class="em-light">Dattatreya</span></h2>
        <p class="lead">According to the determination of Brahma and as a consequence of the great penance of Sage Atri and Anasuya in the Kriya Yuga (the Krita Yuga of the Peetham’s glossary, the first of the Yugas / eons), Dattatreya, combining all the aspects of the Trinity — Brahma, Vishnu and Shiva — incarnated for the sake of his devotees.</p>
        <p>The word “Datta” means the one who has given himself, and since he was born to Sage Atri, he came to be known as Lord Dattatreya. Dattatreya Swami is known as the Guru of Gurus since he was the foremost Guru who promoted and propagated the divine knowledge. Hence He is extolled as “Adi Guru”.</p>
        <p>Datta’s incarnation has a unique feature: while other incarnations return to their original abode as soon as their respective tasks are completed, Dattatreya’s incarnation remains permanently on Earth as Guru Murti, exerting an eternal influence.</p>
        <p class="gp-motto"><span lang="sa-Latn">Jaya Guru Datta</span> — the motto of Avadhoota Datta Peetham, and the greeting devotees share with each other.</p>`,
    })}

    <div class="gp-form">
      <header class="gp-form-head" data-reveal="up">
        <h3>The form of the Trinity</h3>
        <p>Lord Datta has three heads and six hands, with four dogs around Him and Kaamadhenu (cow) and a Kalpavruksha (Audumbara tree) behind Him. The four dogs represent the four Vedas — Rig, Yajur, Saama and Atharvana — while the Kaamadhenu and Kalpavruksha represent wish fulfilment of the devotees.</p>
      </header>
      <ul class="gp-trinity" data-stagger>
        ${trinity.map(([g, tag, h, t]) => `<li class="gp-tri">
          <span class="gp-tri-ico">${glyph(g)}</span>
          <span class="tag">${tag}</span>
          <h4>${h}</h4>
          <p>${t}</p>
        </li>`).join('')}
      </ul>
    </div>
  </div>
</section>

<section id="twenty-four-gurus" class="section section-sand gp-gurus">
  ${sprite()}
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'Learning from nature',
      title: 'The <span class="em-light">24 Gurus</span> of Lord Dattatreya',
      lead: 'One prominent story associated with Lord Dattatreya is his preaching to his disciple King Yadu about his twenty-four Gurus of nature, from whom he learned profound lessons about spirituality and life.',
    })}
    ${gurusGrid()}
    <div class="gp-brother">
      <div class="gp-brother-head" data-reveal="up">
        <h3>The essence of Universal Brotherhood</h3>
        <p>Lord Dattatreya’s teachings promote detachment from material desires and ego. He has preached the essence of Universal Brotherhood in these simple sentences:</p>
      </div>
      <ul class="gp-sayings" data-stagger>
        <li><p>“Do all such deeds to others, which you expect from others.”</p></li>
        <li><p>“Try to identify divinity in every being.”</p></li>
        <li><p>“Observe any object or creature, try to emulate the good in them or shun the evil aspects evident; you can always add value to your life.”</p></li>
      </ul>
    </div>
  </div>
</section>

<section id="lineage" class="section section-dark gp-lineage grain">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'Lineage of Gurus · Datta Parampara',
      title: 'A golden thread of <span class="em-light">Gurus</span>',
      lead: 'Lord Datta assumed many forms in the course of time according to the period, place and circumstances, and lifted his devotees to his own heights. No one knows the number of manifestations Datta assumed; some of his incarnations, like Sripada Vallabha and Narasimha Saraswati, are quite prominent.',
      light: true,
    })}

    <div class="gp-prayer">
      <figure class="gp-stack" data-reveal="fade">
        <svg class="gp-stack-mandala" viewBox="0 0 104 104" aria-hidden="true" data-spin="70"><use href="#i-mandala"/></svg>
        <span class="gp-stack-aura" aria-hidden="true"></span>
        ${img(photos.lineage, 'The Datta Guru Parampara, from Lord Dattatreya at the top to Sri Swamiji', { cls: 'gp-stack-img' })}
      </figure>
      <div class="gp-prayer-body" data-reveal="up">
        ${eyebrow('The Guru Parampara prayer')}
        <p class="gp-mantra" lang="sa-Latn"><span>Sri Ganeshaya Namaha <i aria-hidden="true">|</i></span> <span>Sri Saraswatyai Namaha <i aria-hidden="true">|</i></span> <span>Sri Pada Vallabha Narasimha Saraswathi Sri Guru Dattatreyaya Namaha <i aria-hidden="true">|</i></span></p>
        <p>The Datta Peetham’s Guru Parampara prayer begins with salutations to Lord Ganapathy, the remover of all obstacles, then to Mother Saraswathy, the Goddess of knowledge, followed by the lineage of Gurus starting from Sri Pada Vallabha and Narasimha Saraswathi, the incarnations of Lord Dattatreya, up to the present Guru — who is none other than Sri Swamiji.</p>
      </div>
    </div>

    <ol class="gp-thread" data-thread data-progress="0.62,0.62" aria-label="The lineage of Gurus">
      <span class="gp-track" aria-hidden="true"><span class="gp-fill"><i class="gp-bead"></i><i class="gp-bead b2"></i><b class="gp-tip"></b></span></span>
      ${lineage.map(threadNode).join('')}
    </ol>
  </div>
</section>

<section id="jayalakshmi-maata" class="section section-paper gp-maata">
  <div class="wrap">
    <div class="gp-maata-top">
      <div class="gp-maata-media" data-reveal="up">
        ${frame(P.jayalakshmiAradhana, 'Sri Swamiji offering flowers before the image of Sri Jayalakshmi Maata at her Aradhana', { caption: '<b>Sri Jayalakshmi Maata Aradhana</b>Observed every year on Vaishaakha Panchami', ratio: '5/4', pos: '50% 50%' })}
        <figure class="gp-cameo">${img(P.jayalakshmi, 'Portrait of Sri Jayalakshmi Maata')}</figure>
      </div>
      <div class="gp-maata-body prose" data-reveal="up">
        ${eyebrow('Parama Guru')}
        <h2 data-split>Sri <span class="em-light">Jayalakshmi</span> Maata</h2>
        <p class="lead">Sri Swamiji’s revered mother and Guru for Sri Vidya and Raja Yoga.</p>
        <p>Jayalakshmi Maata was born to a pious Brahmin couple, Linganna and Savitramma, as their fourth child in 1923 at Sogala village, Ramanagara district of Karnataka — in the month of Visakha, on the fifth day of the brilliant fortnight, the day on which Adi Shankaracharya was born. She was a special child with a spiritual fervor.</p>
        <p>She worshipped Ganapathy and lived with her family at Mekedatu, in the sacred woods near Sangama, at the confluence of the rivers Kaveri, Arkavati and Gupta Gamini. One day she experienced a communion with Lord Datta in a cave among the holy hills near Mekedatu. Lord Datta told her that He would be born as her son to propagate Truth in the world.</p>
        <dl class="gp-facts">
          <div><dt>Her Gurus</dt><dd>Fakir Taata, a Muslim saint, and Kara Paatra Swami</dd></div>
          <div><dt>Her husband</dt><dd>Gandluru Narasimha Sastry, later Sri Narahari Teertha Swami (the Guru Parampara page calls him Sri Narahareeshwara Swami)</dd></div>
          <div><dt>Mahasamadhi</dt><dd>On Shankara Jayanti in 1953</dd></div>
          <div><dt>Aradhana</dt><dd>Vaishaakha Panchami, every year</dd></div>
        </dl>
      </div>
    </div>

    <blockquote class="gp-quote" data-reveal="up">
      <p>When I came to accept this auspicious and ancient institution (marriage), I found that each work I did in my house was a spiritual exercise. Cooking or cleaning the utensils and drains in and around the house was also upasana (spiritual practice) to me.</p>
      <footer>— Sri Jayalakshmi Maata</footer>
    </blockquote>

    <div class="gp-sutras">
      <header class="gp-sutras-head" data-reveal="up">
        ${ornament()}
        ${eyebrow('Dwadasha Sutras')}
        <h3>The twelve commandments</h3>
        <p>In the Nandana year, child Satyanarayana (Sri Swamiji) was initiated by His Guru, Jayalakshmi Maata, into Sri Vidya and various other disciplines. She set the tone for the mission of Dharma which He had to establish, and gave Him the most significant Dwadasha Sutras for spiritual practice.</p>
      </header>
      <ol class="gp-sutra-list" data-stagger>
        ${dwadasha.map((s, i) => `<li><span class="gp-sutra-n">${pad(i + 1)}</span><p>${s}.</p></li>`).join('')}
      </ol>
    </div>

    ${split({
      reverse: true,
      cls: 'gp-aradhana',
      media: frame(P.naraharitAradhana, 'Sri Swamiji at the Aradhana of Sri Narahari Teertha Swami, before the shrine', { caption: '<b>Sri Narahari Teertha Swami Aradhana</b>In the lunar month of Sravana', ratio: '1/1', pos: '50% 50%' }),
      body: `${eyebrow('Reverence to parents')}
        <h3 class="gp-h3">Sri Jayalakshmi Maata Aradhana</h3>
        <p>At the tender age of eleven, Jayalakshmi Maata transmitted spiritual energy to child Satyanarayana in the Anjaneya Temple at Bommeparti, where he experienced a vision of her as the Divine Mother, Rajarajeshwari. She attained Mahasamadhi on Shankara Jayanti in 1953, shortly after initiating Sri Swamiji into spiritual practices.</p>
        <p>Sri Swamiji fervently worships Jayalakshmi Maata every single day, and conducts special rituals every year on her Aradhana day, Vaishaakha Panchami. He also conducts the Narahari Teertha Swami (Narasimha Sastry) Aradhana every year in the lunar month of Sravana — a clear message that parents should always be taken care of and worshipped.</p>
        <div class="btn-row">${btn('Watch: Sri Jayalakshmi Maata', 'https://vimeo.com/128976817', 'line', 'play-circle', ' data-external')}</div>`,
    })}
  </div>
</section>

<section id="guru-purnima" class="section section-dark gp-purnima">
  <div class="wrap">
    <div class="gp-moon" aria-hidden="true" data-progress="1,0.4"><i></i></div>
    ${sectionHead({
      ornament: false,
      eyebrow: 'Ashaadha Purnima · Vyasa Purnima',
      title: 'Guru Purnima &amp; the <span class="em-light">Guru Parampara Pooja</span>',
      lead: 'On the very auspicious day of Guru Purnima, which occurs on Ashaadha Purnima (also called Vyasa Purnima) as per the lunar calendar, the Guru Parampara is specially worshipped. As part of this sacred worship, there is also a tradition of worshipping all the Gurus in the lineage of one’s own Guru.',
      light: true,
    })}
    <div class="gp-four">
      <p class="gp-four-intro" data-reveal="up">The Guru Parampara Pooja on Guru Purnima day involves worshipping the ancient lineage of Gurus along with the present Guru Parampara:</p>
      ${processSteps([
        ['Sadguru', 'Sri Swamiji'],
        ['Parama Guru', 'Sri Jayalakshmi Maata'],
        ['Parameshti Guru', 'Sri Narahareeshwara Swami'],
        ['Paraatpara Guru', 'Karapaatra Yateeshwara Swami'],
      ])}
    </div>
    <div class="gp-chaturmasya glass" data-reveal="up">
      <span class="gp-ch-ico">${icon('diya', 30)}</span>
      <div>
        <h3>The Chaturmasya Vrata Deeksha begins</h3>
        <p>As a mark of reverence and gratitude to the Datta Guru Parampara, Sri Bala Swamiji commences the Chaturmasya Vrata Deeksha every year from Guru Purnima, after performing the sacred Guru Parampara Pooja and Vyaasa Pooja. Chaturmasya is an observance of ahimsa (non-violence); his discourses during this period disseminate knowledge and kindle spiritual passion in the listeners.</p>
      </div>
      <div class="gp-ch-actions">
        ${btn('Festival calendar', links.calendar, 'gold', 'calendar', ' data-external rel="noopener"')}
        ${btn('Events & festivals', 'events.html', 'ghost', 'arrow')}
      </div>
    </div>
  </div>
</section>

<section id="datta-charitram" class="section gp-charitram">
  <div class="wrap">
    ${sectionHead({
      eyebrow: 'Discourses by Sri Swamiji',
      title: 'Datta <span class="em-light">Charitram</span>',
      lead: `Discourses by Sri Swamiji on “Datta Charitram”, in the Telugu language — ${episodes.length}&nbsp;episodes.`,
    })}
    <div class="gp-episodes" data-episodes>
      <div class="gp-ep-player" data-reveal="scale">
        ${video({ id: episodes[0][0], title: episodes[0][1], thumb: P.swamijiWithDatta })}
      </div>
      <div class="gp-ep-side"><div class="gp-ep-side-in">
        <p class="gp-ep-label"><span>Episodes</span> <small>${episodes.length} discourses · Telugu</small></p>
        <ol class="gp-ep-list">
          ${episodes.map(([id, title], i) => `<li><a class="gp-ep" href="https://www.youtube.com/watch?v=${id}" data-ep="${id}" data-ep-title="${esc(title)}"${i === 0 ? ' aria-current="true"' : ''} data-external rel="noopener">
            <span class="gp-ep-num" aria-hidden="true">${pad(i + 1)}</span>
            <span class="gp-ep-text"><b>Episode ${i + 1}</b><small><span class="gp-ep-sub">Datta Charitram</span></small></span>
            <span class="gp-ep-play" aria-hidden="true">${icon('play', 14)}</span>
          </a></li>`).join('')}
        </ol>
        <a class="link-arrow gp-ep-more" href="${links.youtube}" data-external rel="noopener">More on the Peetham’s YouTube ${icon('arrow-up-right', 16)}</a>
      </div></div>
    </div>
  </div>
</section>

${ctaBand({
  title: 'Jaya Guru <span class="em-light">Datta</span>',
  text: 'Offer gratitude to the lineage of Gurus who have bestowed divine wisdom — with a puja at the Ashram, or by following Sri Swamiji’s life and teachings.',
  image: photos.guruParamparaPooja,
  actions: `${btn('Book a Puja', links.poojas, 'gold', 'arrow-up-right', ' data-external rel="noopener"')}${btn('Sri Swamiji', 'sri-swamiji.html', 'ghost', 'arrow')}`,
})}
`,
};

