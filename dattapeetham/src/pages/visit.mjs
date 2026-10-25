// Plan Your Visit (visit.html) — the reference's "Visit the Ashram" inner page:
// a full-bleed photo hero with four overlapping tiles (How to Reach, Ashram
// Timings & Guidelines, Accommodation, Nearby Attractions), then live timings
// on a 24-hour dial, the way to Datta Nagar, the interactive Ashram map,
// visitor guidelines, devotee etiquette, hotels, a Mysuru guide and contact.
//
// Sources (harvest folder, fetched 2026-10-22, verbatim text):
//   dattapeetham.org/page/view/guidelines-for-visitors  — permissions, ID,
//     overseas travel, route, 11 PM gates, 9 PM road advice, hotels, transport,
//     bus numbers, nearby places and day trips, contact details
//   dattapeetham.org/page/view/devotee-etiquette        — etiquette
//   dattapeetham.org/page/view/ashram-life              — daily rhythm, tour
//   dattapeetham.org/contact                            — map position, contact use
//   dattapeetham.org/ashrams/avadhoota-datta-peetham-mysore-main — 40-acre site
// plus shared facts in site.mjs (hours, links, phone, address) and data.mjs
// (timings, photos).
//
// Known contradictions handled on the page (see the notices):
//   · Shuka Vana: the homepage (and hours.shukaVana) say 9–12 and 3:30–6,
//     closed Wednesday; the Shuka Vana page says 10–12:30 and 3:30–5:30,
//     Wednesday holiday, and "temporarily closed for public due to Maintenance
//     Works". Both are shown, labelled; no live open/closed badge is shown for
//     Shuka Vana, because a green "Open now" would contradict the closure note.
//   · Karya Siddhi Hanuman: homepage ritual times (Abhisheka 7 AM, Aarti 6 PM)
//     here; the temple page's longer hours live on darshan.html#hanuman.
//   · Road advice: the guidelines page says after 9 PM; an older Ashram-office
//     page says after 7 PM. The current guidelines page is used.
//   · Map detail cards: see placeFixes below (SDVT, Rajarajeshwari, Hari
//     Sannidhi, Shuka Vana, Bonsai Garden, SGS Hospital).

import { pageHero, sectionHead, split, frame, processSteps, scrollLit, accordion, tabs, infoList, hoursCard, ctaBand, btn, img, icon, esc } from '../components.mjs';
import { site, links, hours, OFFICIAL, PAGE_IMG } from '../site.mjs';
import { photos, timings } from '../data.mjs';
import { ashramMap, ashramPlaces } from '../features/ashram-map.mjs';
import { kolam, ghanta } from '../features/devotion-motion.mjs';

/* ---------------------------------------------------------------------------
   Sources and photographs (Peetham S3 bucket)
--------------------------------------------------------------------------- */
const SRC = {
  guidelines: `${OFFICIAL}/page/view/guidelines-for-visitors`,
  etiquette: `${OFFICIAL}/page/view/devotee-etiquette`,
  ashramLife: `${OFFICIAL}/page/view/ashram-life`,
};

const P = {
  hero: photos.sdvt,                                         // gopurams of the Sri Datta Venkateshwara temple complex
  hanuman: `${PAGE_IMG}528/528_322ad0b196f6e909.jpg`,        // Karya Siddhi Hanuman temple exterior
  entrance: `${PAGE_IMG}522/522_0d2ff86d5c11536d.png`,       // the Ashram's entrance gate
  arati: `${PAGE_IMG}526/526_d126a05ad90b71ef.jpg`,          // Sri Swamiji's arati to Sri Rajarajeshwari Devi
};

// Ashram position from the map script on dattapeetham.org/contact.
const GEO = { lat: 12.285443, lng: 76.657886 };

/* ---------------------------------------------------------------------------
   Small helpers
--------------------------------------------------------------------------- */
const inr = (n) => '₹' + n.toLocaleString('en-IN');
const fmt = (t) => { const [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${ap}`; };
const templeHours = hours.temple.sessions.map(([a, b]) => `${fmt(a)} – ${fmt(b)}`).join(' · ');
// Time ranges that never break in the middle; the line may wrap between them.
const nw = (...list) => list.map((t) => `<span class="vs-nw">${t}</span>`).join(' · ');
const srcLink = (href, label) => `<p class="vs-source">${icon('info', 14)}<span>Source: <a href="${href}">${label}</a>, dattapeetham.org</span></p>`;

// Auto rickshaw line icon in the sprite's style (not in the shared sprite).
const autoIcon = (size = 26) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5.2 16.5H3.5V10a4 4 0 0 1 4-4h6.2a3 3 0 0 1 2.6 1.5l3.2 5.5v3.5h-1"/><path d="M9.8 16.5h5.4M11.5 6v6.5H3.5M11.5 9.5h5.8"/><circle cx="7.5" cy="16.8" r="2"/><circle cx="17.4" cy="16.8" r="2"/></g></svg>`;
const ic = (name, size) => (name === 'auto' ? autoIcon(size) : icon(name, size));

/* ===========================================================================
   Content (from the source pages)
=========================================================================== */

// How to reach — the recommended route (guidelines-for-visitors).
const route = [
  ['Fly to Bengaluru', 'For a first visit, the Peetham recommends flying to Bengaluru in Karnataka, directly or on a connecting flight from Mumbai, Delhi or Chennai.'],
  ['Taxi or road to Mysuru', 'Hire a taxi straight to Mysuru at the taxi desks in the airport arrival hall. Road travel from Bengaluru to Mysuru after 9 PM is not advised.'],
  ['City bus 119 / 119A, auto or cab', 'From the railway station or the City Bus Stand, take bus 119 or 119A, an auto rickshaw or a cab: about 15 to 30 minutes.'],
  ['Arrive at Datta Nagar, Ooty Road', 'Sri Ganapathy Sachchidananda Ashram. The gates close at 11 PM, so if you arrive late at night, please stay in a hotel.'],
];

const transport = [
  { icon: 'auto', name: 'Auto rickshaws', cost: '₹100 – ₹150', time: '15–20 min', text: 'Readily available outside the railway station. The fare depends on the time of day and traffic conditions.' },
  { icon: 'car', name: 'Taxis &amp; cabs', cost: '₹150 – ₹300', time: '15–20 min', text: 'Through app-based services like Ola or Uber, or local taxi stands outside the railway station and bus stand.' },
  { icon: 'bus', name: 'City buses', cost: '₹10 – ₹20', time: '20–30 min', text: 'KSRTC buses run from the Mysuru City Bus Stand, near the railway station. Look for buses towards Ooty Road / Nanjangud Road, or Ashram routes.' },
];

const buses = [
  { no: '119', from: 'Mysuru City Bus Stand', to: 'Ganapathy Ashram', tag: 'Direct', text: 'Direct route to the Ashram, making it the most convenient option for devotees.' },
  { no: '119A', from: 'Mysuru City Bus Stand', to: 'Ganapathy Ashram', via: 'via JSS Medical College', tag: 'Direct · more stops', text: 'Also goes directly to the Ashram, but makes a few more stops along the way.' },
  { no: '118', from: 'Mysuru City Bus Stand', to: 'Kuvempunagar', tag: 'Passes nearby', text: 'Passes near the Ashram. You may need to walk a short distance or take an auto rickshaw from the closest stop.' },
];

// Daily rhythm (ashram-life).
const rhythm = [
  { when: 'Around 8 AM', title: 'Sri Chakra Puja', text: 'When in town, Sri Swamiji or Sri Balaswamiji performs the morning Sri Chakra Puja. Teertha (holy water) is offered afterwards.' },
  { when: 'After the puja', title: 'Datta Kriya Yoga', text: 'Devotees gathered at the Universal Prayer Hall practise Datta Kriya Yoga, involving a Pranayama or a Mudra.' },
  { when: 'Every morning', title: 'Puja, Homa &amp; Tailabhishekam', text: 'Participate in, and sponsor, rituals such as Sri Chakra Puja, Homa and Tailabhishekam.' },
  { when: 'Daily', title: 'Yoga Vasistham', text: 'Sri Balaswamiji gives daily lectures on the Yoga Vasistham in Kannada and Telugu.' },
  { when: 'Every evening', title: 'Divya Naama Sankeertana', text: 'Bhajans for at least one and a half hours, led by Sri Swamiji and by elder members of the Ashram.' },
  { when: 'Sunday mornings', title: 'Darshan of Sri Swamiji', text: 'When in town, Sri Swamiji gives darshana to devotees. On Sundays large numbers come from great distances to sing with Him.' },
];

// Guidelines for visitors — accordion (guidelines-for-visitors).
const guidelines = [
  ['All faiths are welcome', `<p>Persons of all faiths are welcome at Avadhoota Datta Peetham. However, facilities are limited and are primarily maintained to accommodate devotees of His Holiness Sri Sri Sri Ganapathy Sachchidananda Swamiji.</p><p>Visitors are therefore requested to obtain hotel accommodation in the city of Mysuru and visit the Ashram daily to attend its programmes and activities. <a href="#stay">See hotels near the Ashram</a>.</p>`],
  ['Staying on the Ashram premises', `<p>Those seeking a brief stay on the Ashram premises should attend Ashram programmes consistently for at least a week or more before inquiring about staying. The Ashram Administrator handles such inquiries.</p><ul><li>No visitors are permitted to stay while Sri Swamiji or Sri Balaswamiji are out of station.</li><li>During major functions, all newcomers are required to find accommodation elsewhere.</li></ul>`],
  ['Ask permission well in advance', `<p>Even those known to the Ashram staff and to Sri Swamiji should ask permission in advance before making arrangements to visit and stay in the Ashram. Permission may be sought by letter, phone, fax or email to <b>H. V. Prasad, personal secretary to Sri Swamiji</b>, well ahead of your travel plans.</p><p>Once your plans are finalised, notify the Ashram of your arrival date, the number in your party and your expected duration of stay. <a href="#contact">Contact details</a>.</p>`],
  ['Identity documents on arrival', `<p>Please carry photocopies of a Government-approved identity proof or passport, and passport photos, for every member of your family or group. Submit them to the Ashrama office on arrival: it is a government regulation.</p>`],
  ['From overseas: passport and visa', `<p>First-time overseas travellers may find this helpful. It is best to begin travel preparations weeks or even months before your journey.</p><ul><li>Procure a current, valid passport from the government of your country.</li><li>Apply to the Indian Consulate (Embassy) in your country for a visa that allows you to enter and stay in India for a designated period. Indian Consulates are usually located in major cities.</li><li>A three- or six-month tourist visa may suffice. Those wishing to stay longer should apply for a different type of visa.</li><li>Please do not list Datta Peetham as the responsible party for your visit to India.</li></ul>`],
  ['Travel agencies', `<p>Your travel agent can provide the information you need for the journey, such as how to apply for a passport, the addresses and phone numbers of Indian Consulates, baggage allowances and weight limits. Their primary job is to provide your flight tickets; prices can vary dramatically depending on the airline you choose.</p>`],
  ['The recommended route', `<p>Wherever you depart from, fly to Bengaluru, in Karnataka, for your first visit. Your travel agent may arrange a connecting flight from Mumbai, Delhi or Chennai. Several airlines now fly directly to Bengaluru, including Lufthansa, Singapore Airlines, Malaysian Airlines, British Airways, Emirates and Gulf Air; arriving directly removes the hassle of staying in Mumbai or Delhi at night.</p><p>Allow ample time for connecting flights so that you can clear customs and change airlines. You may need to change from an international to a domestic airport, depending on your first city of entry.</p>`],
  ['Arriving late at night', `<p>In the arrival hall at Bengaluru airport there are several taxi stand desks where you can hire a taxi directly to Mysuru.</p><ul><li><b>The Ashram’s gates close at 11 PM.</b> If you arrive late at night, please stay in a hotel.</li><li><b>Travelling by road from Bengaluru to Mysuru after 9 PM is not advised.</b></li></ul>`],
];

const glance = [
  ['clock', 'Gates close at 11 PM', 'If you arrive late at night, please stay in a hotel.'],
  ['car', 'No road travel after 9 PM', 'Bengaluru to Mysuru by road after 9 PM is not advised.'],
  ['user', 'Bring ID for everyone', 'Photocopies of ID or passports, and passport photos.'],
  ['mail', 'Ask before you stay', 'Seek permission well in advance of your travel.'],
];

// Devotee etiquette (devotee-etiquette).
const etiquette = [
  { icon: 'namaste', title: 'Reverence towards the Gurus', text: 'Show respect and reverence towards the Gurus, Sri Swamiji and Sri Balaswamiji, the Peethadhipati and the Uttaradhikaari of Avadhoota Datta Peetham, following their guidance and teachings with humility and sincerity.' },
  { icon: 'temple', title: 'Respect for sacred spaces', text: 'Maintain reverence and decorum on entering the Ashram premises and sacred areas such as temples and meditation halls: observe silence, remove footwear and refrain from any behaviour that may disturb the peaceful atmosphere.' },
  { icon: 'diya', title: 'Daily worship', text: 'Take part in the daily rituals and activities, such as Sri Chakra Puja, Homa and Divya Naama Sankeertana (bhajan) sessions. Devotees may also sponsor these rituals as a form of devotion.' },
  { icon: 'sparkle', title: 'Festivals', text: 'During Maha Shivaratri, Sri Swamiji’s Birthday celebrations, Navaratri and Datta Jayanti, join the processions, poojas, cultural performances and devotional singing with reverence and enthusiasm.' },
  { icon: 'book', title: 'Ashram rules &amp; guidelines', text: 'Adhere to the rules set by the Ashram administration, including codes of conduct, dress and behavioural norms that uphold the sanctity of the Ashram.' },
  { icon: 'heart-hand', title: 'Service and seva', text: 'Devotees may offer selfless service within the Ashram community: temple maintenance, cooking, cleaning, or helping with social welfare programmes. Service is a form of devotion and an opportunity for spiritual growth.' },
  { icon: 'lotus', title: 'Spiritual virtues', text: 'Cultivate humility, compassion, patience and gratitude in daily life, reflecting the teachings and values of the Ashram’s spiritual tradition.' },
  { icon: 'heart', title: 'Respect for all beings', text: 'Respect all beings and treat everyone with kindness and compassion, regardless of differences in background, culture or beliefs.' },
];

const satvic = ['Remove footwear', 'Observe silence', 'Decent, non-provocative attire', 'A Satvic, vegetarian lifestyle', 'No cigarettes, drugs or alcohol', 'Respect Ashramites, local people and all visitors'];

// Hotels (guidelines-for-visitors). price: [min, max] per night; km from the Ashram (approx.).
const budgetHotels = [
  { name: 'Hotel Roopa', address: '2724/C, Bangalore-Nilgiri Road, Mysuru', text: 'A budget-friendly hotel offering clean and comfortable rooms, a restaurant and basic amenities.', price: [1500, 2500], km: 5.5 },
  { name: 'Hotel Aditya', address: '1459, Narayana Shastri Road, Mysuru', text: 'An economical hotel with well-maintained rooms, a restaurant, and close proximity to major attractions.', price: [1000, 2000], km: 4.8 },
  { name: 'The Dawn Hotel', address: 'No. 15, Kuvempu Nagar, 3rd Stage, Mysuru', text: 'A budget hotel offering basic accommodation, a restaurant, and easy access to the Ashram and other sites.', price: [1200, 2200], km: 2.5 },
  { name: 'Aishwarya Residency', address: '2932/A, Off Bangalore-Nilgiri Road, Lashkar Mohalla, Mysuru', text: 'Budget accommodation with essential facilities and services.', price: [1000, 1800], km: 5.8 },
  { name: 'Hotel KVC International', address: '1294/B, Jhansi Lakshmibai Road, Chamarajapuram, Mysuru', text: 'An affordable hotel with comfortable rooms, a restaurant and basic amenities.', price: [1500, 2500], km: 4.7 },
  { name: 'Hotel Royale Heritage', address: '1976, Chittaranjan Palace, Near Hardinge Circle, Mysuru', text: 'A budget hotel providing simple accommodation, a restaurant and basic services.', price: [1000, 2000], km: 5.3 },
];
const premiumHotels = [
  { name: 'Radisson Blu Plaza Hotel Mysore', address: '1 MG Road, Nazarbad Mohalla, Mysuru', text: 'Upscale rooms, an outdoor pool and multiple dining options; known for comfortable accommodation and excellent service.', price: [6000, 10000], km: 7.5 },
  { name: 'The Quorum Hotel', address: '2257/1, Vinoba Road, Near Kala Mandir, Mysuru', text: 'Modern rooms, a rooftop pool, a fitness centre and dining options; popular for leisure and business stays.', price: [3000, 6000], km: 6 },
  { name: 'Fortune JP Palace', address: '#3, Abba Road, Nazarbad, Mysuru', text: 'Elegant rooms, a spa, a fitness centre and several dining options, blending modern amenities with traditional hospitality.', price: [4000, 7000], km: 6.5 },
  { name: 'Hotel Sandesh The Prince', address: '3 Nazarbad Main Road, Mysuru', text: 'A well-known hotel offering comfortable rooms, a swimming pool, a health club and various dining choices.', price: [3500, 6500], km: 7 },
  { name: 'Hotel Pai Vista', address: '35/A, Bangalore-Nilgiri Road, Mysuru', text: 'Near major attractions, with cosy rooms, a swimming pool, a gym and multiple dining facilities.', price: [3000, 5500], km: 6.5 },
  { name: 'Southern Star Mysore', address: '13-14, Vinobha Road, Mysuru', text: 'A well-established hotel offering spacious rooms, a pool, a fitness centre and on-site restaurants.', price: [4000, 7000], km: 6 },
  { name: 'Roopa Elite', address: '686, KRS Road, Metagalli, Mysuru', text: 'Comfortable accommodation with modern amenities and a restaurant serving various cuisines.', price: [2500, 4500], km: 3 },
];

// Nearby places and day trips (guidelines-for-visitors). km from the Ashram (approx.).
const nearby = [
  ['Chamundi Hill and Chamundeshwari Temple', 'A famous hill with a temple dedicated to Goddess Chamundeshwari, one of the Ashtadasha Shaktipeethas, with panoramic views of Mysuru city.', 12],
  ['Mysuru Palace', 'The historical palace and royal residence of the Wadiyar dynasty, known for its architectural grandeur and rich history.', 7],
  ['Mysore Zoo (Sri Chamarajendra Zoological Gardens)', 'One of the oldest and most well-maintained zoos in India, housing a wide variety of animal species.', 8],
  ['St. Philomena’s Church', 'A majestic cathedral built in neo-gothic style, known for its beautiful architecture and stained glass windows.', 7],
  ['Karanji Lake', 'A scenic lake with a park, butterfly park and aviary, ideal for leisurely walks and bird watching.', 7.5],
  ['Railway Museum', 'The history of Indian Railways, with exhibits of vintage locomotives and carriages.', 7],
  ['Jaganmohan Palace and Art Gallery', 'A former royal palace that now houses an art gallery with a vast collection of artefacts, paintings and sculptures.', 6.5],
  ['Melody World Wax Museum', 'Life-size wax statues depicting musicians and various musical instruments.', 6],
  ['Brindavan Gardens', 'A beautifully landscaped garden adjoining the Krishnarajasagara Dam, known for its musical fountain show.', 21],
  ['Srirangapatna', 'A historical town near Mysuru, including the Ranganathaswamy Temple and Tipu Sultan’s Summer Palace.', 20],
  ['Kukkarahalli Lake', 'A serene lake popular for morning walks, jogging and bird watching, surrounded by lush greenery.', 8],
  ['Ranganathittu Bird Sanctuary', 'A bird sanctuary on the banks of the Kaveri, known for its diverse bird species and boat rides.', 16],
  ['KRS Dam (Krishnarajasagara Dam)', 'An impressive dam across the river Kaveri, with scenic views and the Brindavan Gardens nearby.', 21],
].map(([name, text, km], i) => ({ id: `nb-${i + 1}`, name, text, km })).sort((a, b) => a.km - b.km);

const dayTrips = [
  ['Nanjangud', 'Known as “Dakshina Kashi”, famous for the Nanjundeshwara Temple dedicated to Lord Shiva.', 25],
  ['Talakadu', 'A historical site on the banks of the Kaveri, known for its sand dunes and ancient temples.', 45],
  ['Bandipur National Park', 'A wildlife reserve known for its tiger population, safaris and rich biodiversity.', 75],
  ['Shivanasamudra Falls', 'Stunning twin waterfalls on the Kaveri: Gaganachukki and Bharachukki.', 75],
  ['B.R. Hills (Biligiriranga Hills)', 'A hill range known for its scenic beauty, wildlife sanctuary and the Ranganathaswamy Temple.', 85],
];

/* ===========================================================================
   Building blocks
=========================================================================== */

// 24-hour day dial: noon at the top, sunrise on the left, sunset on the right.
// Arcs and markers come from site.mjs hours and the timings in data.mjs.
const DIAL = { c: 220, r: 158, rIn: 134 };
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const ang = (mins) => ((mins / 1440) * 360 + 180) % 360;
const pt = (deg, r) => { const a = (deg * Math.PI) / 180; return [DIAL.c + r * Math.sin(a), DIAL.c - r * Math.cos(a)].map((v) => +v.toFixed(2)); };
const arcPath = (m1, m2, r) => {
  const a1 = ang(m1), a2 = ang(m2), sweep = (a2 - a1 + 360) % 360;
  const [x1, y1] = pt(a1, r), [x2, y2] = pt(a2, r);
  return `M${x1} ${y1}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};

function dayDial() {
  const { c, r, rIn } = DIAL;
  const ticks = Array.from({ length: 24 }, (_, h) => {
    const major = h % 6 === 0;
    const [x1, y1] = pt(ang(h * 60), r + 14), [x2, y2] = pt(ang(h * 60), r + (major ? 26 : 20));
    return `<line class="vs-tick${major ? ' is-major' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }).join('');
  const hourLabels = [[0, '12 AM'], [6, '6 AM'], [12, '12 PM'], [18, '6 PM']].map(([h, label]) => {
    const [x, y] = pt(ang(h * 60), r + 44);
    return `<text class="vs-hour${h === 6 ? ' vs-hour-l' : h === 18 ? ' vs-hour-r' : ''}" x="${x}" y="${y}" dy=".35em">${label}</text>`;
  }).join('');
  const temple = hours.temple.sessions.map(([a, b]) => `<path class="vs-arc vs-arc-temple" pathLength="100" d="${arcPath(toMin(a), toMin(b), r)}"/>`).join('');
  const shuka = hours.shukaVana.sessions.map(([a, b]) => `<path class="vs-arc-shuka" d="${arcPath(toMin(a), toMin(b), rIn)}"/>`).join('');
  const dot = (mins, cls, rad = r) => { const [x, y] = pt(ang(mins), rad); return `<circle class="${cls}" cx="${x}" cy="${y}" r="6"/>`; };
  const [gx1, gy1] = pt(ang(23 * 60), r - 12), [gx2, gy2] = pt(ang(23 * 60), r + 12);
  const [sx, sy] = pt(0, r - 58);
  const [mx, my] = pt(180, r - 58);
  return `<svg class="vs-dial-svg" viewBox="0 0 440 440" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="vs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2c88e" stop-opacity=".2"/><stop offset=".5" stop-color="#e2c88e" stop-opacity=".05"/><stop offset=".5" stop-color="#0a1310" stop-opacity=".0"/><stop offset="1" stop-color="#0a1310" stop-opacity=".55"/></linearGradient>
    <radialGradient id="vs-bead"><stop offset="0" stop-color="#fff3d6"/><stop offset=".45" stop-color="#e2c88e"/><stop offset="1" stop-color="#e2c88e" stop-opacity="0"/></radialGradient>
  </defs>
  <circle class="vs-face" cx="${c}" cy="${c}" r="${r + 30}" fill="url(#vs-sky)"/>
  <circle class="vs-ring" cx="${c}" cy="${c}" r="${r}"/>
  <circle class="vs-ring vs-ring-in" cx="${c}" cy="${c}" r="${rIn}"/>
  <line class="vs-horizon" x1="${c - r - 30}" y1="${c}" x2="${c + r + 30}" y2="${c}"/>
  ${ticks}
  ${hourLabels}
  <g class="vs-glyph" transform="translate(${sx} ${sy})"><circle r="7"/><path d="M0-13v3M0 10v3M-13 0h3M10 0h3M-9.2-9.2l2.1 2.1M7.1 7.1l2.1 2.1M-9.2 9.2l2.1-2.1M7.1-7.1l2.1-2.1"/></g>
  <g class="vs-glyph" transform="translate(${mx} ${my})"><path d="M4.5-8.5A9 9 0 1 0 8.5 4 7 7 0 0 1 4.5-8.5Z"/></g>
  ${shuka}
  ${temple}
  <line class="vs-gate" x1="${gx1}" y1="${gy1}" x2="${gx2}" y2="${gy2}"/>
  ${dot(toMin('08:00'), 'vs-mark vs-mark-puja')}
  ${dot(toMin('07:00'), 'vs-mark vs-mark-hanuman')}
  ${dot(toMin('18:00'), 'vs-mark vs-mark-hanuman')}
  <g class="vs-hand" data-dial-hand>
    <line x1="${c}" y1="${c - rIn - 2}" x2="${c}" y2="${c - r + 8}"/>
    <circle class="vs-hand-glow" cx="${c}" cy="${c - r}" r="16" fill="url(#vs-bead)"/>
    <circle class="vs-hand-bead" cx="${c}" cy="${c - r}" r="5"/>
  </g>
</svg>`;
}

const dialLegend = `<ul class="vs-legend">
  <li><i class="lg-temple" aria-hidden="true"></i><span><b>Temple darshan</b>${templeHours}</span></li>
  <li><i class="lg-hanuman" aria-hidden="true"></i><span><b>Hanuman Abhisheka &amp; Aarti</b>7 AM · 6 PM daily</span></li>
  <li><i class="lg-puja" aria-hidden="true"></i><span><b>Sri Chakra Puja</b>around 8 AM, when Sri Swamiji or Sri Balaswamiji is in town</span></li>
  <li><i class="lg-shuka" aria-hidden="true"></i><span><b>Shuka Vana</b>homepage hours; sources differ</span></li>
  <li><i class="lg-gate" aria-hidden="true"></i><span><b>Ashram gates close</b>11 PM</span></li>
</ul>`;

function hotelTable(list, id, caption) {
  const maxKm = 8;
  const rows = list.map((h, i) => `<tr data-km="${h.km}" data-price="${h.price[0]}" data-order="${i}">
      <th scope="row" data-label="Hotel"><b>${h.name}</b><small>${h.text}</small></th>
      <td data-label="Address">${h.address}</td>
      <td data-label="Per night" class="vs-price">${inr(h.price[0])} – ${inr(h.price[1])}</td>
      <td data-label="From Ashram" class="vs-dist"><span class="vs-km">~${h.km} km</span><span class="vs-km-bar" aria-hidden="true"><i style="--x:${Math.min(1, h.km / maxKm).toFixed(3)}"></i></span></td>
    </tr>`).join('');
  return `<div class="vs-sort" role="group" aria-label="Sort ${esc(caption)}">
    <span class="vs-sort-label">Sort</span>
    <button type="button" class="chip" data-sort="order" aria-pressed="true">As listed</button>
    <button type="button" class="chip" data-sort="km" aria-pressed="false">Nearest first</button>
    <button type="button" class="chip" data-sort="price" aria-pressed="false">Lowest price</button>
  </div>
  <div class="vs-table-wrap">
    <table class="vs-table" id="${id}">
      <caption class="visually-hidden">${caption}, with address, price range per night and approximate distance from the Ashram</caption>
      <thead><tr><th scope="col">Hotel</th><th scope="col">Address</th><th scope="col">Per night</th><th scope="col">From Ashram</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// Stack beads that share a distance so none hides another.
const stackIdx = {};
const beads = nearby.map((p) => {
  const k = String(p.km);
  stackIdx[k] = (stackIdx[k] || 0) + 1;
  return `<span class="vs-bead" data-bead="${p.id}" style="--x:${(p.km / 22 * 100).toFixed(2)}%;--d:${(p.km / 22).toFixed(3)};--s:${stackIdx[k] - 1}" title="${esc(p.name)} · ~${p.km} km"></span>`;
}).join('');

/* ===========================================================================
   Sections
=========================================================================== */

const hero = pageHero({
  eyebrow: 'Plan Your Visit',
  title: 'Visit the <span class="em-light">Ashram</span>',
  lead: 'A serene spiritual destination in the tranquil city of Mysuru. How to reach the Ashram, when to come, where to stay and what to see nearby.',
  image: P.hero,
  pos: 'center 38%',
  crumb: 'Visit',
  actions: `${btn('Get directions', links.directions, 'gold', 'pin', ' data-magnetic')}${btn('Explore the Ashram map', '#map', 'ghost', 'map')}`,
  tilesLabel: 'Visit essentials',
  tiles: [
    { icon: 'pin', title: 'How to Reach', note: 'Maps &amp; Directions', href: '#how-to-reach' },
    { icon: 'clock', title: 'Ashram Timings', note: '&amp; Guidelines', href: '#timings' },
    { icon: 'bed', title: 'Accommodation', note: 'Stay Options', href: '#stay' },
    { icon: 'compass', title: 'Nearby Attractions', note: 'Mysuru Guide', href: '#nearby' },
  ],
});

const welcome = `<section id="welcome" class="section vs-welcome" aria-labelledby="welcome-h">
  <div class="wrap">
    ${kolam({ cols: 9, rows: 2, width: 440, range: '0.92,0.66', cls: 'vs-dv-kolam' })}
    <div class="vs-lit">${scrollLit('Persons of *all faiths* are welcome at Avadhoota Datta Peetham.')}</div>
    ${split({
      media: frame(P.hanuman, 'The Karya Siddhi Hanuman temple at the Ashram, with the 70-ft monolithic statue of Hanuman rising above it', { ratio: '4/3', pos: '41% 50%', caption: '<b>Karya Siddhi Hanuman</b>One of the shrines you can visit within the Ashram', badge: 'Mysuru' }),
      body: `<span class="eyebrow">Welcome</span>
        <h2 id="welcome-h" data-split>A serene and pure <span class="em-light">atmosphere</span></h2>
        <p class="lead">Avadhoota Datta Peetham, popularly called Sri Ganapathy Sachchidananda Ashram, stands on a sprawling 40-acre site at the foot of Chamundi Hill, in the royal city of Mysuru.</p>
        <p>Upon arrival, visitors are enveloped in a serene and pure atmosphere, resonating with the soothing chants of Vedic hymns. Visitors are encouraged to join a guided tour through the Ashram to fully immerse themselves in its serene ambiance.</p>
        <dl class="vs-facts">
          <div><dt>${icon('temple', 20)}Temple darshan</dt><dd>${templeHours}, daily</dd></div>
          <div><dt>${icon('clock', 20)}Ashram gates close</dt><dd>11 PM</dd></div>
          <div><dt>${icon('bus', 20)}City bus</dt><dd>119 · 119A from the City Bus Stand</dd></div>
          <div><dt>${icon('phone', 20)}Ashram office</dt><dd><a href="${site.phoneHref}">${site.phone}</a></dd></div>
        </dl>`,
    })}
  </div>
</section>`;

const svT = timings.find((t) => t.key === 'shukaVana');
const tmT = timings.find((t) => t.key === 'temple');
const hnT = timings.find((t) => !t.key);

const timingsSection = `<section id="timings" class="section section-dark vs-timings grain" aria-labelledby="timings-h">
  <div class="wrap">
    <header class="section-head is-light">
      <svg class="ornament" viewBox="0 0 160 20" aria-hidden="true" data-draw><path d="M0 10h58M102 10h58"/><path d="M80 2c3.6 3.2 5.4 5.8 5.4 8S83.6 15.6 80 18c-3.6-2.4-5.4-5.8-5.4-8S76.4 5.2 80 2Z"/><path d="M80 18c-4.6-.6-9.4-3.6-12-8.6 4.6 0 8.8 2 12 6.2M80 18c4.6-.6 9.4-3.6 12-8.6-4.6 0-8.8 2-12 6.2"/><circle cx="62" cy="10" r="1.6"/><circle cx="98" cy="10" r="1.6"/></svg>
      <span class="eyebrow">Ashram Timings</span>
      <h2 id="timings-h" data-split>The rhythm of the <span class="em-light">day</span></h2>
      <p class="lead" data-reveal="up">Temple darshan is open every day, morning and evening. All times are Indian Standard Time and can change on festival days, so check the <a href="${links.calendar}">official calendar</a> before you travel.</p>
    </header>

    <div class="vs-time-grid">
      <figure class="vs-dial" data-reveal="fade" data-dial>
        <div class="vs-dial-stage">
          ${dayDial()}
          <div class="vs-dial-center">
            <span class="vs-dial-k">Now in Mysuru</span>
            <b class="vs-dial-time" data-clock>IST · UTC+5:30</b>
            <span class="vs-dial-status"><i class="dot" data-dot="temple" aria-hidden="true"></i><span>Temple · <span data-status-long="temple">open daily</span></span></span>
          </div>
        </div>
        <figcaption>
          <p class="vs-next">${icon('flame', 16)}<span>Next ritual at the Karya Siddhi Hanuman temple: <b data-next-ritual>Abhisheka 7 AM · Aarti 6 PM</b></span></p>
          ${dialLegend}
        </figcaption>
      </figure>

      <div class="vs-hours">
        ${hoursCard(tmT.key, 'Temple Darshan', tmT.rows, { img: tmT.img, note: 'Open every day. Timings can change on festival days.' })}
        ${hoursCard(hnT.key, 'Karya Siddhi Hanuman', hnT.rows, { img: hnT.img, note: `Temple hours and the weekend laser show are on <a href="darshan.html#hanuman">Temples &amp; Darshan</a>.` })}
        ${hoursCard(null, svT.title, [['Homepage', nw('9 AM – 12 PM', '3:30 – 6 PM')], ['Shuka Vana page', nw('10 AM – 12:30 PM', '3:30 – 5:30 PM')], ['Holiday', 'Every Wednesday']], { img: svT.img, note: `<span class="vs-check">${icon('info', 14)}Timings vary by source</span>The Peetham’s Shuka Vana page also says it is temporarily closed to the public for maintenance works. Please check with the Ashram before visiting.` })}
      </div>
    </div>

    <div class="vs-rhythm">
      <h3 class="vs-sub-h">${icon('sun', 18)}A day at the Ashram</h3>
      <ol class="vs-rhythm-list" data-stagger>
        ${rhythm.map((r) => `<li><span class="vs-when">${r.when}</span><h4>${r.title}</h4><p>${r.text}</p></li>`).join('')}
      </ol>
      ${srcLink(SRC.ashramLife, 'Ashram Life')}
    </div>
  </div>
</section>`;

const reach = `<section id="how-to-reach" class="section section-paper vs-reach" aria-labelledby="how-to-reach-h">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'How to Reach', title: 'The way to <span class="em-light">Datta Nagar</span>', lead: 'The Peetham recommends flying to Bengaluru for a first visit and travelling on to Mysuru by road. In Mysuru, the Ashram is a short ride from the railway station and the City Bus Stand.' }).replace('<h2 data-split>', '<h2 id="how-to-reach-h" data-split>')}
    <div class="vs-route">${processSteps(route)}</div>

    <div class="vs-local">
      <header class="vs-local-head">
        <h3 class="vs-sub-h">${icon('train', 18)}From the railway station &amp; bus stand</h3>
        <p>Approximate fares and times, as listed by the Peetham.</p>
      </header>
      <div class="vs-modes" data-stagger>
        ${transport.map((t) => `<article class="vs-mode">
          <span class="vs-mode-icon">${ic(t.icon, 26)}</span>
          <h4>${t.name}</h4>
          <dl class="vs-mode-data"><div><dt>Fare</dt><dd>${t.cost}</dd></div><div><dt>Time</dt><dd>${t.time}</dd></div></dl>
          <p>${t.text}</p>
        </article>`).join('')}
      </div>

      <div class="vs-buses panel-dark">
        <div class="vs-buses-head">
          <h3 class="vs-sub-h">${icon('bus', 18)}City bus numbers</h3>
          <p>From the Mysuru City Bus Stand · <span class="vs-nowrap">about ₹10 – ₹20</span></p>
        </div>
        <ul class="vs-bus-list" data-stagger>
          ${buses.map((b) => `<li class="vs-bus">
            <span class="vs-bus-no" aria-hidden="true"><small>Route</small>${b.no}</span>
            <div class="vs-bus-body">
              <h4><span class="visually-hidden">Bus ${b.no}: </span>${b.from} <span class="vs-arrow" aria-hidden="true">${icon('arrow', 14)}</span><span class="visually-hidden"> to </span>${b.to}${b.via ? ` <small>${b.via}</small>` : ''}</h4>
              <p>${b.text}</p>
            </div>
            <span class="vs-bus-tag">${b.tag}</span>
          </li>`).join('')}
        </ul>
      </div>

      <ul class="vs-tips">
        <li>${icon('check', 16)}<span><b>Prepaid taxi and auto booths</b> at the railway station make for a hassle-free start.</span></li>
        <li>${icon('mobile', 16)}<span><b>Online cab booking</b> through the Ola or Uber apps for a convenient, comfortable ride.</span></li>
      </ul>
    </div>

    <div class="vs-findus">
      <div class="vs-mapframe" data-reveal="clip">
        <div class="vs-map-fallback" aria-hidden="true">
          <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="currentColor">${[34, 62, 92, 124, 158, 194, 232].map((r, i) => `<ellipse cx="200" cy="150" rx="${r * 1.35}" ry="${r}" opacity="${(0.5 - i * 0.06).toFixed(2)}" transform="rotate(${-8 + i * 3} 200 150)"/>`).join('')}</g></svg>
          <span class="vs-map-pin">${icon('pin', 26)}</span>
          <b>Datta Nagar, Mysuru</b>
          <small>${GEO.lat.toFixed(4)}° N · ${GEO.lng.toFixed(4)}° E</small>
        </div>
        <iframe src="${links.mapEmbed}" title="Google map showing Avadhoota Datta Peetham, Sri Ganapathy Sachchidananda Ashram, Mysuru" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
      </div>
      <div class="vs-findus-card" data-reveal="up">
        <span class="eyebrow">Find us</span>
        <h3>Sri Ganapathy Sachchidananda Ashram</h3>
        ${infoList([
          ['pin', 'Address', `<span>Datta Nagar, Ooty Road (Nanjangud Road)<br>Mysuru, Karnataka 570 025, India</span>`],
          ['phone', 'Phone', `<a href="${site.phoneHref}">${site.phone}</a>`],
          ['clock', 'Gates close', '<span>11 PM</span>'],
        ])}
        <div class="btn-row">${btn('Get directions', links.directions, 'gold', 'arrow-up-right')}${btn('Ashram map', '#map', 'line', 'map')}</div>
      </div>
    </div>
    ${srcLink(SRC.guidelines, 'Guidelines for Visitors')}
  </div>
</section>`;

// Page-scoped corrections to the shared map's detail cards (the shared feature
// is read-only for this page). Applied only while this page renders its map,
// then restored, so other pages that use ashramPlaces are unaffected.
//   · Sri Datta Venkateshwara Temple: the temple's own page gives weekday and
//     weekend hours (not the homepage's generic darshan hours), so no live
//     badge built on hours.temple is shown.
//   · Rajarajeshwari Temple, Hari Sannidhi: no official source gives their
//     hours, so none are shown.
//   · Shuka Vana, Bonsai Garden: the homepage and their own pages disagree;
//     both are labelled with the PAGE-GUIDE notice, and no live badge.
//   · SGS Hospital: the Avatara timeline dates its inauguration to 1978, while
//     the hospital page dates the "Holistic Health Centre" to the 1990s; only
//     what both support is stated.
// One session per line, so a time range never breaks in the middle.
const sess = (...list) => list.map((t) => `<span class="vs-sess">${t}</span>`).join(' ');
const VARY = 'Timings vary across official sources; please check with the Ashram before visiting.';
const placeFixes = {
  venkateshwara: {
    timing: {
      rows: [['Weekdays', sess('6:00 AM – 12:00 PM', '5:00 PM – 8:00 PM')], ['Weekends', sess('6:00 AM – 12:00 PM', '4:30 PM – 8:30 PM')]],
      note: `As listed on the <a href="${OFFICIAL}/page/view/sri-datta-venkateshwara-temple">Sri Datta Venkateshwara Temple page</a>.`,
    },
  },
  rajarajeshwari: { timing: undefined },
  'hari-sannidhi': { timing: undefined },
  'shuka-vana': {
    timing: {
      rows: [['Homepage', sess('9 AM – 12 PM', '3:30 – 6 PM')], ['Shuka Vana page', sess('10 AM – 12:30 PM', '3:30 – 5:30 PM')]],
      note: 'Closed on Wednesdays. Timings vary across official sources, and the Shuka Vana page says it is temporarily closed for maintenance; please check with the Ashram before visiting.',
    },
  },
  'bonsai-garden': {
    timing: {
      rows: [['Morning', '10:00 AM – 12:30 PM'], ['Evening', '3:30 PM – 5:30 PM']],
      note: `Closed on Wednesdays. Hours from the Bonsai Garden page. ${VARY}`,
    },
  },
  'sgs-hospital': { since: 'Medical service since the 1970s' },
};

function withPlaceFixes(fixes, fn) {
  const saved = [];
  for (const p of ashramPlaces) {
    const fix = fixes[p.id];
    if (!fix) continue;
    for (const k of Object.keys(fix)) {
      saved.push([p, k, Object.prototype.hasOwnProperty.call(p, k), p[k]]);
      if (fix[k] === undefined) delete p[k]; else p[k] = fix[k];
    }
  }
  try { return fn(); } finally {
    for (const [p, k, had, v] of saved.reverse()) { if (had) p[k] = v; else delete p[k]; }
  }
}

const mapSection = withPlaceFixes(placeFixes, () => ashramMap({
  id: 'map',
  eyebrow: 'Interactive Ashram Map',
  title: 'Once you <span class="em-light">arrive</span>',
}));

const guidelinesSection = `<section id="guidelines" class="section vs-guidelines" aria-labelledby="guidelines-h">
  ${ghanta({ side: 'right', drop: 64 })}
  <div class="wrap vs-guide-grid">
    <div class="vs-guide-side">
      <header class="section-head is-left">
        <span class="eyebrow">Guidelines for Visitors</span>
        <h2 id="guidelines-h" data-split>Before you <span class="em-light">travel</span></h2>
        <p class="lead" data-reveal="up">Facilities at the Ashram are limited and primarily maintained for the devotees of Sri Swamiji. These guidelines, from the Peetham, help every visit go smoothly.</p>
      </header>
      <h3 class="vs-sub-h">${icon('info', 18)}At a glance</h3>
      <ul class="vs-glance" data-stagger>
        ${glance.map(([i, t, x]) => `<li><span class="vs-glance-icon">${icon(i, 20)}</span><span><b>${t}</b>${x}</span></li>`).join('')}
      </ul>
      ${srcLink(SRC.guidelines, 'Guidelines for Visitors')}
    </div>
    <div class="vs-guide-acc" data-reveal="up">${accordion(guidelines)}</div>
  </div>
</section>`;

const etiquetteSection = `<section id="etiquette" class="section section-sand vs-etiquette" aria-labelledby="etiquette-h">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Devotee Etiquette', title: 'Reverence, devotion, <span class="em-light">seva</span>', lead: 'At Sri Ganapathy Sachchidananda Ashram, devotee etiquette is an integral part of the spiritual journey and community life: a holistic approach to spiritual living, emphasising reverence, devotion, service and community.' }).replace('<h2 data-split>', '<h2 id="etiquette-h" data-split>')}
    <ul class="vs-satvic" aria-label="In the Ashram" data-stagger>
      ${satvic.map((s) => `<li>${icon('check', 14)}${s}</li>`).join('')}
    </ul>
    <ol class="vs-etq" data-stagger>
      ${etiquette.map((e, i) => `<li class="vs-etq-card">
        <span class="vs-etq-num" aria-hidden="true" data-n="${String(i + 1).padStart(2, '0')}"></span>
        <span class="vs-etq-icon">${icon(e.icon, 26)}</span>
        <h3>${e.title}</h3>
        <p>${e.text}</p>
      </li>`).join('')}
    </ol>
    <p class="vs-etq-note" data-reveal="up">The focus of interest for anyone should be the darshan and presence of Sri Swamiji and His teachings.</p>
    ${srcLink(SRC.etiquette, 'Devotee Etiquette')}
  </div>
</section>`;

const staySection = `<section id="stay" class="section section-paper vs-stay" aria-labelledby="stay-h">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Accommodation', title: 'Where to <span class="em-light">stay</span>', lead: 'Facilities at the Ashram are limited, so visitors are requested to stay in a hotel in Mysuru and visit the Ashram daily to attend its programmes. The Peetham lists these hotels near the Ashram.' }).replace('<h2 data-split>', '<h2 id="stay-h" data-split>')}
    <p class="notice vs-stay-note" data-reveal="up">${icon('info', 18)}<span>Hoping to stay on the Ashram premises? Attend the programmes for at least a week first, and ask permission well in advance. <a href="#guidelines">Read the guidelines</a>.</span></p>
    <div data-reveal="up">
      ${tabs('Hotels near the Ashram', [
        { id: 'stay-budget', label: `Budget hotels <span class="vs-count">${budgetHotels.length}</span>`, icon: 'bed', html: hotelTable(budgetHotels, 'stay-budget-table', 'Budget hotels near the Ashram') },
        { id: 'stay-premium', label: `Premium hotels <span class="vs-count">${premiumHotels.length}</span>`, icon: 'sparkle', html: hotelTable(premiumHotels, 'stay-premium-table', 'Luxury hotels near the Ashram') },
      ])}
    </div>
    <p class="vs-fine" data-reveal="up">Prices, distances and descriptions are as listed by the Peetham; distances are approximate and vary with the route taken. Book in advance and confirm the distance and amenities with the hotel.</p>
    <p class="vs-live" aria-live="polite" data-sort-status></p>
  </div>
</section>`;

const nearbySection = `<section id="nearby" class="section section-dark vs-nearby" aria-labelledby="nearby-h">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Nearby Attractions', title: 'A Mysuru <span class="em-light">guide</span>', lead: 'Notable places to visit near Sri Ganapathy Sachchidananda Ashram, suggested by the Peetham, with approximate distances from the Ashram.', light: true }).replace('<h2 data-split>', '<h2 id="nearby-h" data-split>')}

    <div class="vs-thread" aria-hidden="true" data-reveal="fade">
      <span class="vs-thread-origin">${icon('lotus', 22)}<b>Ashram</b></span>
      <div class="vs-thread-track">
        <span class="vs-thread-line"><i></i></span>
        ${beads}
        ${[0, 5, 10, 15, 20].map((k) => `<span class="vs-thread-tick" style="--x:${(k / 22 * 100).toFixed(2)}%">${k} km</span>`).join('')}
      </div>
    </div>

    <h3 class="vs-sub-h is-light">${icon('pin', 18)}In and around Mysuru</h3>
    <ol class="vs-places" data-stagger>
      ${nearby.map((p) => `<li class="vs-place" data-place-row="${p.id}">
        <span class="vs-place-km"><b>${p.km}</b><small>km</small></span>
        <div><h4>${p.name}</h4><p>${p.text}</p></div>
      </li>`).join('')}
    </ol>

    <h3 class="vs-sub-h is-light">${icon('compass', 18)}Day trips from Mysuru</h3>
    <ol class="vs-trips" data-stagger>
      ${dayTrips.map(([name, text, km]) => `<li class="vs-trip"><span class="vs-trip-km">~${km}<small> km</small></span><h4>${name}</h4><p>${text}</p></li>`).join('')}
    </ol>

    <div class="vs-inside" data-reveal="up">
      <span class="vs-inside-icon">${icon('bird', 24)}</span>
      <p><b>Inside the Ashram</b>Explore Shuka Vana, the Kishkindha Moolika Bonsai Garden, Vishwam Museum and Nada Mantapa, within the Ashram grounds.</p>
      ${btn('Ashram attractions', 'attractions.html', 'ghost', 'arrow')}
    </div>
    <p class="vs-fine is-light">Distances are approximate and can vary with the exact route taken.</p>
  </div>
</section>`;

const contactSection = `<section id="contact" class="section vs-contact" aria-labelledby="contact-h">
  <div class="wrap vs-contact-grid">
    <div class="vs-contact-body" data-reveal="up">
      <span class="eyebrow">Contact</span>
      <h2 id="contact-h" data-split>Write to the <span class="em-light">Ashram</span></h2>
      <p class="lead">Seek permission for a stay well in advance, and once your plans are final, let the Ashram know your arrival date, the number in your party and how long you will stay.</p>
      ${infoList([
        ['pin', 'Address', `<span>Avadhoota Datta Peetham<br>${site.ashram}<br>Datta Nagar, Ooty Road (Nanjangud Road)<br>Mysuru 570 025, Karnataka, India</span>`],
        ['phone', 'Phone', `<a href="${site.phoneHref}">${site.phone}</a>`],
        ['mail', 'Email', `<a href="mailto:${site.email}">${site.email}</a>`],
        ['user', 'Permission to stay', '<span>H. V. Prasad, personal secretary to Sri Swamiji, by letter, phone, fax or email</span>'],
      ])}
      <div class="btn-row">
        ${btn('Contact page', 'contact.html', 'gold', 'mail')}
        ${btn('Website feedback &amp; support', links.techSupport, 'line', 'arrow-up-right')}
      </div>
      <p class="vs-fine">Please use the Contact page for personal requests and messages to the Ashrama, and Feedback / Support for website or app issues.</p>
    </div>
    <div class="vs-contact-media" data-reveal="clip">
      ${frame(P.entrance, 'The arched entrance gate of Avadhoota Datta Peetham, Mysuru, framed by palms', { ratio: '5/4', parallax: '0.05', caption: '<b>Datta Nagar, Mysuru</b>The Ashram’s gates close at 11 PM' })}
    </div>
  </div>
</section>`;

const closing = ctaBand({
  title: 'Come for <span class="em-light">darshan</span>',
  text: `Temple darshan is open every day, ${templeHours}. Check the calendar for festival programmes before you travel, or book a puja online.`,
  image: P.arati,
  actions: `${btn('Get directions', links.directions, 'gold', 'pin', ' data-magnetic')}${btn('Festival calendar', links.calendar, 'ghost', 'calendar')}${btn('Book a puja', links.poojas, 'ghost', 'arrow-up-right')}`,
});

const subnav = `<nav class="vs-nav" aria-label="On this page" data-vs-nav>
  <div class="wrap vs-nav-inner">
    <span class="vs-nav-label" aria-hidden="true">Plan</span>
    <ul>
      ${[['timings', 'Timings'], ['how-to-reach', 'How to reach'], ['map', 'Ashram map'], ['guidelines', 'Guidelines'], ['etiquette', 'Etiquette'], ['stay', 'Stay'], ['nearby', 'Nearby'], ['contact', 'Contact']]
        .map(([id, label]) => `<li><a href="#${id}" data-spy="${id}">${label}</a></li>`).join('')}
    </ul>
  </div>
</nav>`;

/* ===========================================================================
   Page
=========================================================================== */
export default {
  slug: 'visit',
  file: 'visit.html',
  title: 'Plan Your Visit',
  crumb: 'Visit',
  description: 'Plan your visit to Avadhoota Datta Peetham, Mysuru: live temple timings, how to reach by air, road and city bus 119, visitor guidelines, etiquette and hotels.',
  nav: 'Visit',
  image: P.hero,
  preload: P.hero,
  css: true,
  scripts: ['visit'],
  features: ['ashram-map'],
  jsonLd: [{
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: `${site.name} · ${site.ashram}`,
    address: { '@type': 'PostalAddress', streetAddress: site.address.street, addressLocality: site.address.city, addressRegion: site.address.region, postalCode: site.address.postal, addressCountry: site.address.country },
    geo: { '@type': 'GeoCoordinates', latitude: GEO.lat, longitude: GEO.lng },
    hasMap: links.directions,
    telephone: '+91-821-2486486',
    publicAccess: true,
  }],
  render: () => `${hero}
${welcome}
<div class="vs-body">
${subnav}
${timingsSection}
${reach}
${mapSection}
${guidelinesSection}
${etiquetteSection}
${staySection}
${nearbySection}
${contactSection}
</div>
${closing}`,
};
