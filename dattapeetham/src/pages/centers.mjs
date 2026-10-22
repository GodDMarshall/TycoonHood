// Global Reach — the Peetham's Datta Kshetras and Ashram centres, radiating
// from the Mysuru Ashram: a night world map, the sixteen Shodasha Datta
// Kshetras (plus Datta Kashi and Datta Rameshwaram), the nine Navanatha
// Kshetras, a directory of centres by country and the Mysuru headquarters.
//
// Sources (harvest folder, fetched 2026-10-22 from dattapeetham.org):
//   ashramcenters (86 of the 92 listed centres, Nimble vx8 across filtered
//   views; the 6 missing records need the site's POST-only pager),
//   shodasha-datta-kshetras, navanatha-datta-kshetras, page/view/datta-kashi,
//   page/view/datta-rameshwaram, page/view/gam-dattanatha-kshetram-matsyendranatha,
//   page/view/kaalaagni-shamana-dattatreya, ashrams/avadhoota-datta-peetham-mysore-main,
//   about-us, ashram-shrines, sanatana-dharma-parirakshana (branch counts, Gita
//   chanting abroad), bhajans-and-healing-music (concert venues, Sydney, the
//   Caverns) and sri-swamijis-avatara-timeline; shared facts in data.mjs and site.mjs.
//
// Honesty notes
// - Centre names, towns, phones and emails are as published on the directory
//   cards. Names the listing cuts short with "..." are completed from the
//   record's own slug; Badampudi's place comes from its detail page (the card
//   reads "Ualapalli"). Unusable contacts ("NA", "...", 5-digit numbers) are left out.
// - The Navanatha seed syllables: the Gam page says the first Kshetra "takes
//   the first of the nine syllables in Sri Swamiji's name" as its seed
//   syllable; the band below only sets the nine published Kshetra names beside
//   the nine syllables, without further claims.
// - Branch counts differ between sources (15 centres abroad on one page, 22
//   outside India in the directory), so the page quotes the directory.

import { pageHero, sectionHead, stats, btn, img, icon, esc, frame, chips, ctaBand, marquee, infoList } from '../components.mjs';
import { site, links, OFFICIAL, PAGE_IMG, KSHETRA_IMG } from '../site.mjs';
import { photos, kshetras, specialKshetras, countries } from '../data.mjs';
import { worldMap } from '../features/world-map.mjs';

/* ---------------------------------------------------------------------------
   Photographs (Peetham S3 bucket)
--------------------------------------------------------------------------- */
const P = {
  hero: `${PAGE_IMG}528/528_322ad0b196f6e909.jpg`,           // Karya Siddhi Hanuman temple, Mysuru Ashram
  prayerHall: photos.prayerHall,                             // Universal Prayer Hall
  kaalaagni: `${KSHETRA_IMG}01-kalagni-shamana-dattatreya-mysore-karnataka-india.jpg`,
  dattaKashi: `${KSHETRA_IMG}17-datta-kashi-mekedatu.jpg`,
  dattaRameshwaram: `${KSHETRA_IMG}18-datta-rameshvara-kshetra-manginapudi.jpg`,
  sydney: `${PAGE_IMG}513/513_a9cd007c07ab1712.jpg`,
  caverns: `${PAGE_IMG}513/513_0f3f84798f6304a5.jpg`,
  chicago: `${PAGE_IMG}514/514_b7a1c01aeacc37c6.jpg`,
};

const pad = (n) => String(n).padStart(2, '0');

/* ---------------------------------------------------------------------------
   Content
--------------------------------------------------------------------------- */

// Alt text for the sixteen Shodasha thumbnails (photographs of the shrines).
// Each describes what its own photograph shows; four of the idols are dressed
// in cloth and bead malas rather than flower garlands.
const kshetraAltBy = {
  1: 'Arati being offered to Kaalaagni Shamana Dattatreya, the main deity of the Peetham, in Mysuru',
  7: 'The idol of Samskaara Heena Shivaroopa Dattatreya at Jayalakshmipuram, draped in red with bead malas',
  10: 'The idol of Vishwambaravadhoota Dattatreya at Akividu, in white and purple robes with bead malas',
  11: 'The copper-toned idol of Deva Deva Dattatreya at Nuzvid, under a golden arch',
  14: 'The black multi-armed idol of Siddha Raja Dattatreya at Kochi, dressed in yellow and red silk',
};
const kshetraAlt = (k) => kshetraAltBy[k.n] || `The flower-garlanded idol of ${k.name} at ${k.place.split(',')[0]}`;

// Navanatha Datta Kshetras (dattapeetham.org/navanatha-datta-kshetras), in
// the published order, beside the nine syllables of Sri Swamiji's name as the
// Gam page prints it.
const navanatha = [
  { seed: 'Gam', syl: 'Ga', natha: 'Matsyendranatha', place: 'New Delhi', slug: 'gam-dattanatha-kshetram-matsyendranatha' },
  { seed: 'Nam', syl: 'ṇa', natha: 'Gorakhnatha', place: 'Nellore', slug: 'nam-dattanatha-kshetram-gorakhnatha' },
  { seed: 'Pam', syl: 'pa', natha: 'Jalandharanatha', place: 'Bhimavaram', slug: 'pam-dattanatha-kshetram-jalandharanatha' },
  { seed: 'Tim', syl: 'ti', natha: 'Kaneephanatha', place: 'Kadapa', slug: 'tim-dattanatha-kshetram-kaneephanatha' },
  { seed: 'Sam', syl: 'sa', natha: 'Charpatunatha', place: 'Kaikaluru', slug: 'sam-dattanatha-kshetram-charpatunatha' },
  { seed: 'Chim', syl: 'chchi', natha: 'Nageshanatha', place: 'Srikakulam', slug: 'chim-dattanatha-kshetram-nageshanatha' },
  { seed: 'Daam', syl: 'dā', natha: 'Bhartareenatha', place: 'Kamareddy', slug: 'daam-dattanatha-kshetram-bhartareenatha' },
  { seed: 'Nam', syl: 'nan', natha: 'Revananatha', place: 'Eluru', slug: 'nam-dattanatha-kshetram-revananatha' },
  { seed: 'Dam', syl: 'da', natha: 'Gahaneenatha', place: 'Guntur', slug: 'dam-dattanatha-kshetram-gahaneenatha' },
];

// Two kshetras share the romanised seed "Nam" (ṇam for Nellore, nam for Eluru).
// Naming the place keeps their headings distinct, so translations can spell each one.
const dupSeed = (n) => navanatha.filter((m) => m.seed === n.seed).length > 1;

// The twelve medicinal wells of Datta Rameshwaram, as named on its page.
const wells = ['Audumbara', 'Amalaka', 'Nirvindhya', 'Padma', 'Sarva', 'Unmochana', 'Pampa', 'Mata Jayalakshmi', 'Narahari', 'Sri Ganapathy Sachchidananda', 'Sri Datta', 'Anagha'];

// Sri Swamiji abroad: photographs and captions from the Peetham's own pages.
const moments = [
  { img: P.chicago, alt: 'An arena filled with thousands of devotees seated in rows, facing a stage and large screens', place: 'NOW Arena, Chicago', date: 'July 2024', title: 'Bhagavad Gita chanting', text: 'On 20 July 2024, 8,000 people recited the entire Bhagavad Gita in a single venue, led by Sri Swamiji.' },
  { img: P.caverns, alt: 'An audience seated inside a vast cave, lit in blue and violet, facing a stage of musicians', place: 'The Caverns, Pelham, Tennessee', date: '3 August 2024', title: 'Music for Healing & Meditation in a cave', text: 'Sri Swamiji’s first ever music for healing and meditation at a cave.' },
  { img: P.sydney, alt: 'Collage: the Sydney Opera House at dusk, the audience in its hall, and Sri Swamiji holding a Guinness World Records certificate', place: 'Sydney Opera House', date: '6 April 2015', title: 'Sydney Opera House concert', text: 'Pictured on the Peetham’s pages with Sri Swamiji’s Guinness World Record for the largest music therapy lesson.' },
];

// "A few of Sri Swamiji's concerts" (bhajans-and-healing-music), venues abroad.
const venues = ['Royal Albert Hall, London', 'The Lincoln Center, New York', 'Carnegie Hall, New York', 'Chicago Symphony Orchestra Hall', 'Kennedy Center, Washington, DC', 'Sydney Opera House', 'The Esplanade, Singapore', 'Dubai Opera House', 'Dalian International Center, China', 'Westminster Hall, London', 'Tonhalle, Zurich', 'KKL Luzern', 'The Lyric Theatre, Johannesburg'];

/* ---------------------------------------------------------------------------
   Centres directory: [country, Indian state, name, slug, place, phones, email]
   From dattapeetham.org/ashramcenters (86 of the 92 records).
--------------------------------------------------------------------------- */
const DIRECTORY_TOTAL = 92;
const centres = [
  ["AE", "", "Sri Ganapathy Sachchidananda Ashrama, Dubai", "sri-ganapathy-sachchidananda-ashrama-dubai", "Dubai, Emirate of Dubai", ["+971 50 545 1156"], "kumarksn@gmail.com"],
  ["AU", "", "Datta Yoga Centre, Australia", "datta-yoga-centre-australia", "Melbourne, Victoria", ["+61412860760"], "enquiry.dycaustralia@gmail.com"],
  ["CA", "", "Datta Yoga Center, Canada", "datta-yoga-center-canada", "Erin, Ontario", ["+1 416-587-1577"], "info@dyccanada.org"],
  ["CH", "", "Datta Yoga Centre, Switzerland", "datta-yoga-centre-switzerland", "Zurich, Kanton Zurich", ["+41 (0) 79 671 34 55", "+41 (0) 76 531 91 93"], "dycs@dyc.ch"],
  ["DE", "", "Datta Yoga Center Germany e.V.", "datta-yoga-center-germany-ev", "Dusseldorf, North Rhine-Westphalia", ["+49 211 40 28 13"], "mail@dycgermany.de"],
  ["GB", "", "Datta Yoga Centre, United Kingdom", "datta-yoga-centre-united-kingdom", "Brentford, Middlesex", ["+44 7466 334961"], "mail@dycuk.org"],
  ["MY", "", "Gnana Bodha Sabha, Malaysia", "gnana-bodha-sabha-malaysia", "Kuala Lumpur, Selangor", ["+60 12 3242659", "+60 19 288 7534"], "info@gbsmalaysia.org"],
  ["NL", "", "Stichting SGS Benelux (Belgium, Netherlands, Luxembourg)", "stichting-sgs-benelux-belgium-netherlands-luxembourg", "Netherlands", ["+31(0)10 2840070", "+31(0)320 251313"], "info@sgsbenelux.nl"],
  ["NZ", "", "Datta Yoga Center, New Zealand", "datta-yoga-center-new-zealand", "Papakura, Auckland", ["+64211498523"], "enquiry.dycnz@gmail.com"],
  ["TT", "", "Aripo Datta Ganga, Trinidad", "aripo-datta-ganga-trinidad", "Aripo, St. Andrews", ["+1 868-684-7481"], "arramnarine@gmail.com"],
  ["TT", "", "Datta Shiva Rama Temple, Princes Town, Trinidad", "datta-shiva-rama-temple-princes-town-trinidad", "Princes Town, Victoria", ["+1 868-688-3367", "+1 868-359-2208"], "vishnuramdatt@yahoo.com"],
  ["TT", "", "Sri Dattatreya Yoga Center, Carapichaima, Trinidad", "sri-dattatreya-yoga-center-carapichaima-trinidad", "Carapichaima, Carony", ["+1 (868)-233-1428"], "mail@sdyctt.com"],
  ["TT", "", "Sri Sachchidananda Yoga Ashrama, Penal, Trinidad", "sri-sachchidananda-yoga-ashrama-penal-trinidad", "Penal, Victoria", ["+1 (868) - 682 - 4032"], "penalssya@gmail.com"],
  ["US", "", "Datta Temple, Baton Rouge", "datta-temple-baton-rouge", "Baton Rouge, Louisiana", ["+1 225-751-8949"], "support@dattatemple.org"],
  ["US", "", "Hanuman Datta Yoga Center (HDYC), Houston", "hanuman-datta-yoga-center-hdyc-houston", "Houston, Texas", ["704-3056275"], "secretary@hdyc.org"],
  ["US", "", "Jayalakshmi Datta Yoga Center (JDYC), Maryland", "jayalakshmi-datta-yoga-center-jdyc-maryland", "Clarksburg, Maryland", ["+1 301-540-2429"], "info@jayalakshmidyc.org"],
  ["US", "", "Jesus Datta Retreat Center (JDRC), West Sunbury", "jesus-datta-retreat-center-jdrc-west-sunbury", "West Sunbury, Pennsylvania", ["(724)-637-3169"], "retreatdrc@gmail.com"],
  ["US", "", "Karya Siddhi Hanuman Temple (KSHT), Fremont", "karya-siddhi-hanuman-temple-ksht-fremont", "Fremont, California", ["+1 (510) 673 3929"], "gssmap@hotmail.com"],
  ["US", "", "Karya Siddhi Hanuman Temple (KSHT), Frisco", "karya-siddhi-hanuman-temple-ksht-frisco", "Frisco, Texas", ["(866) 996 - 6767"], "support@dallashanuman.org"],
  ["US", "", "SGS Karya Siddhi Hanuman Mandir", "sgs-karya-siddhi-hanuman-mandir", "Burlington, New Jersey", ["+1 609-526-5815"], "mail@sgshanumanmandir.org"],
  ["US", "", "Sri Ganapathy Sachchidananda Datta Yoga Center (SGS DYC), New Jersey", "sri-ganapathy-sachchidananda-datta-yoga-center-sgs-dyc-new-jersey", "Burlington, New Jersey", ["+1 609-526-5815"], "service@sgsdyc.org"],
  ["US", "", "Trinity Datta Yoga Center (TDYC), Chicago", "trinity-datta-yoga-center-tdyc-chicago", "Chicago, Illinois", ["+1 312 680-0630"], "feedback@trinitydyc.org"],
  ["IN", "Andhra Pradesh", "Datta Dhanvantari Paduka Kshetram, Addanki", "datta-dhanvantari-paduka-kshetram-addanki", "Addanki", [], ""],
  ["IN", "Andhra Pradesh", "Jaya Durga Teertham, Vijayawada", "jaya-durga-teertham-vijayawada", "Vijayawada", [], ""],
  ["IN", "Andhra Pradesh", "Sri Datta Paduka Kshetram, Cherukuwada", "sri-datta-paduka-kshetram-cherukuwada", "Cherukuwada", ["95810 42585"], ""],
  ["IN", "Andhra Pradesh", "Sri Ganapathi Sachchidananda Ashrama, Jangareddy Gudem", "sri-ganapathi-sachchidananda-ashrama-jangareddy-gudem", "Jangareddy Gudem", [], ""],
  ["IN", "Andhra Pradesh", "Sri Ganapathi Sachchidananda Ashrama, Kadiri", "sri-ganapathi-sachchidananda-ashrama-kadiri", "Kadiri", [], ""],
  ["IN", "Andhra Pradesh", "Sri Ganapathi Sachchidananda Ashrama, Ongole", "sri-ganapathi-sachchidananda-ashrama-ongole", "Ongole", [], ""],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Ahobilam", "sri-ganapathy-sachchidananda-ashrama-ahobilam", "Ahobilam", [], ""],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Akividu", "sri-ganapathy-sachchidananda-ashrama-akividu", "Akividu", ["98850 31189"], "vishwambaradatta@gmail.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Anantapur", "sri-ganapathy-sachchidananda-ashrama-anantapur", "Anantapur", ["9848668456"], "anantapur.sgs.04@gmail.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Badampudi", "sri-ganapathy-sachchidananda-ashrama-badampudi", "Badampudi, West Godavari", ["94407 10092", "08818 288133"], "sr_kalavacharla2002@yahoo.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Bhimavaram", "sri-ganapathy-sachchidananda-ashrama-bhimavaram", "Bhimavaram", ["08816 222520"], "raoanandsharma@gmail.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Chirala", "sri-ganapathy-sachchidananda-ashrama-chirala", "Chirala", ["0821 2486 486"], "venkateswararaoaduri9@gmail.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Guntur", "sri-ganapathy-sachchidananda-ashrama-guntur", "Guntur", ["0863 - 2512370", "093465-14546"], "mail@dattapeetham.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Jayalakshmipuram", "sri-ganapathy-sachchidananda-ashrama-jayalakshmipuram-andhra-pradesh", "Jayalakshmipuram", ["08554-56231", "9704034016"], "mail@dattapeetham.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Kaikaluru", "sri-ganapathy-sachchidananda-ashrama-kaikaluru", "Kaikaluru", ["9059989977"], "dattasramkklr@gmail.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Kurnool", "sri-ganapathy-sachchidananda-ashrama-kurnool", "Kurnool", ["088961 23777"], "kurnool.sgs@gmail.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Madanapalle", "sri-ganapathy-sachchidananda-ashrama-madanapalle", "Madanapalle", ["99633 73399"], "anaghastami@gmail.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Nuzuvidu", "sri-ganapathy-sachchidananda-ashrama-nuzuvidu", "Nuzvidu", ["9247297079"], "mail@dattapeetham.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Proddatur", "sri-ganapathy-sachchidananda-ashrama-proddatur", "Proddatur", ["9880455779"], "dattapeetham.pdtr@gmail.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Rajahmundry", "sri-ganapathy-sachchidananda-ashrama-rajahmundry", "Rajahmundry", ["+91 (0821) 2486 486", "097042 91249"], "mail@dattapeetham.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Rajanagaram", "sri-ganapathy-sachchidananda-ashrama-rajanagaram", "Rajanagaram (Rajamundry)", [], ""],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Srisailam", "sri-ganapathy-sachchidananda-ashrama-srisailam", "Srisailam", ["8332821988"], ""],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Visakapatnam", "sri-ganapathy-sachchidananda-ashrama-visakapatnam", "Visakapatnam", ["+91-9949776677"], "chintamaniganapativizag@gmail.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Datta Rameswaram, Manginapudi", "sri-ganapathy-sachchidananda-datta-rameswaram-manginapudi", "Machilipatnam", ["098481-53721"], "mail@dattapeetham.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapathy Sachchidananda Dattashramam, Machilipatnam", "sri-ganapathy-sachchidananda-dattashramam-machilipatnam", "Machilipatnam", ["9491248245"], "sridattaashramam@gmail.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapati Sachchidananda Ashrama, Vijayawada", "sri-ganapati-sachchidananda-ashrama-vijayawada", "Vijayawada", ["0866-555541", "9550777555"], "marakatarajeswari@gmail.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapati Sachchidananda Gnana Bodha Sabha, Gandi Gunta", "sri-ganapati-sachchidananda-gnana-bodha-sabha-gandi-gunta", "Vuyyuru", ["+91 (0821) 2486 486"], "mail@dattapeetham.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapati Sachchidananda Gnana Bodha Sabha, Gannavaram", "sri-ganapati-sachchidananda-gnana-bodha-sabha-gannavaram", "Gannavaram", ["+91 (0821) 2486 486"], "mail@dattapeetham.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapati Sachchidananda Gnana Bodha Sabha, Srikakulam", "sri-ganapati-sachchidananda-gnana-bodha-sabha-srikakulam", "Srikakulam", ["+91 (0821) 2486 486"], "mail@dattapeetham.com"],
  ["IN", "Andhra Pradesh", "Sri Ganapati Sachchidananda Gnana Bodha Satsanga Sabha, Eluru", "sri-ganapati-sachchidananda-gnana-bodha-satsanga-sabha-eluru", "Eluru", [], ""],
  ["IN", "Andhra Pradesh", "Sri Ganapati Sachchidananda Trust, Cuddapah (Kadapa)", "sri-ganapati-sachchidananda-trust-cuddapah-kadapa", "Cuddapah", [], "mail@dattapeetham.com"],
  ["IN", "Andhra Pradesh", "Sri Jayalakshmi Matha Mathru Mandali, Nellore", "sri-jayalakshmi-matha-mathru-mandali-nellore", "Nellore", ["0861-2323696"], "mail@dattapeetham.com"],
  ["IN", "Andhra Pradesh", "Sri Paada Vallabha Anagha Datta Kshetram, Pithapuram", "sri-paada-vallabha-anagha-datta-kshetram-pithapuram", "Pithapuram", ["062814 15422"], ""],
  ["IN", "Telangana", "Panchamukha Anjaneya Swami Temple, BHEL, Hyderabad", "panchamukha-anjaneya-swami-temple-bhel-hyderabad", "Hyderabad (BHEL)", ["9701533359"], "panchamukhaanjaneyaswami@gmail.com"],
  ["IN", "Telangana", "Sri Anagha Datta Kendram, BDL, Hyderabad", "sri-anagha-datta-kendram-bdl-hyderabad", "Hyderabad", ["9492913800"], "srianaghadattakendram@gmail.com"],
  ["IN", "Telangana", "Sri Ganapathy Sachchidananda Ashrama, Chinakodepaka", "sri-ganapathy-sachchidananda-ashrama-chinakodepaka", "Warangal", [], ""],
  ["IN", "Telangana", "Sri Ganapathy Sachchidananda Ashrama, Datta Giri, Hyderabad", "sri-ganapathy-sachchidananda-ashrama-datta-giri-hyderabad", "Hyderabad", ["9394548157"], "mail@dattapeetham.com"],
  ["IN", "Telangana", "Sri Ganapathy Sachchidananda Ashrama, Kamareddy", "sri-ganapathy-sachchidananda-ashrama-kamareddy", "Kamareddy", ["9959907117"], "llrao0009@gmail.com"],
  ["IN", "Telangana", "Sri Ganapathy Sachchidananda Datta Gnana Bodha Sabha, Palamuru", "sri-ganapathy-sachchidananda-datta-gnana-bodha-sabha-palamuru", "Palamuru", ["6281992207"], "palamurusgsashram@gmail.com"],
  ["IN", "Telangana", "Sri Ganapati Sachchidananda Ashrama, Dundigul, Hyderabad", "sri-ganapati-sachchidananda-ashrama-dundigul-hyderabad", "Hyderabad", ["9849025470", "9849030060"], "hyderabad@sgsashrama.org"],
  ["IN", "Telangana", "Sri Rajarajeshwari Shakti Panchayatana Temple, Indresham, Hyderabad", "sri-rajarajeshwari-shakti-panchayatana-temple-indresham-hyderabad", "Hyderabad", ["9493660011"], ""],
  ["IN", "Telangana", "Sri Varada Datta Kshetram, Warangal", "sri-varada-datta-kshetram-warangal", "Warangal", [], ""],
  ["IN", "Telangana", "Sri Vishnu Datta Kshetram, Janwada, Hyderabad", "sri-vishnu-datta-kshetram-janwada-hyderabad", "Hyderabad", ["98497 92681"], ""],
  ["IN", "Telangana", "Uttara Tirupati Temple, Nizamabad", "uttara-tirupati-temple-nizamabad", "Nizamabad", ["93987 44560"], "utkinduru@gmail.com"],
  ["IN", "Karnataka", "Avadhoota Datta Peetham, Mysuru", "avadhoota-datta-peetham-mysuru", "Mysuru", ["(0821) 2486486"], "mail@dattapeetham.com"],
  ["IN", "Karnataka", "Sri Ganapathi Sachchidananda Ashrama, Bengaluru", "sri-ganapathi-sachchidananda-ashrama-bengaluru", "Bengaluru", ["9739042741", "9886030134"], "mail@sgsbangalore.com"],
  ["IN", "Karnataka", "Sri Ganapathy Sachchidananda Ashrama, Bellary", "sri-ganapathy-sachchidananda-ashrama-bellary", "Bellary (Ballari)", [], ""],
  ["IN", "Karnataka", "Sri Ganapathy Sachchidananda Ashrama, Ganagapura", "sri-ganapathy-sachchidananda-ashrama-ganagapura", "Ganagapura", ["08470-274429", "7411308344"], "ramasarma.rjy@gmail.com"],
  ["IN", "Karnataka", "Sri Ganapathy Sachchidananda Ashrama, Shivamogga", "sri-ganapathy-sachchidananda-ashrama-shivamogga", "Shivamogga", [], ""],
  ["IN", "Karnataka", "Sri Ganapati Sachchidananda Ashram, Sangama (Mekedatu)", "sri-ganapati-sachchidananda-ashram-sangama-mekedatu", "Kanakapura", ["+91 832 850 7849", "+91 98808 59797"], "contact@sgsmekedatu.org"],
  ["IN", "Karnataka", "Sri Jayalakshmi Mata Dhyana Mandira, Sogala", "sri-jayalakshmi-mata-dhyana-mandira-sogala", "Sogala", ["0821 2486 486"], "mail@dattapeetham.com"],
  ["IN", "Karnataka", "Sri Raghavendra Paduka Kshetra, K R Nagar", "sri-raghavendra-paduka-kshetra-k-r-nagar", "Krishnaraja Raga Sagara", [], ""],
  ["IN", "Tamil Nadu", "Sri Ganapathy Sachchidananda Ashrama, Chennai (Madras)", "sri-ganapathy-sachchidananda-ashrama-chennai-madras", "Chennai", ["044-22434596", "99409 69409"], "adiguru.dattakshetram@gmail.com"],
  ["IN", "Tamil Nadu", "Sri Ganapati Sachchidananda Datta Trust, Achcharapakkam", "sri-ganapati-sachchidananda-datta-trust-achcharapakkam", "Achcharapakkam", [], ""],
  ["IN", "Kerala", "Sri Ganapathy Sachchidananda Ashram (Hanuman Temple), Cochin", "sri-ganapathy-sachchidananada-ashram-hanuman-temple-cochin", "Cochin", ["9645895424"], "sgsoffice9@gmail.com"],
  ["IN", "Uttarakhand", "Sri Ganapathi Sachchidananda Ashrama, Badrinath", "sri-ganapathi-sachchidananda-ashrama-badrinath", "Badrinath", ["0821 2486486"], "mail@dattapeetham.com"],
  ["IN", "Uttarakhand", "Sri Ganapathy Sachchidananda Ashrama, Bhadra Kali Peetha, Haridwar", "sri-ganapathy-sachchidananda-ashrama-bhadra-kali-peetha-haridwar", "Haridwar", ["81062 99000"], "mail@dattapeetham.com"],
  ["IN", "Uttarakhand", "Sri Ganapathy Sachchidananda Ashrama, Rishikesh", "sri-ganapathy-sachchidananda-ashrama-rishikesh", "Rishikesh", ["95152 93286", "95152 93287"], "mail@dattapeetham.com"],
  ["IN", "Uttar Pradesh", "Sri Ganapathi Sachchidananda Ashrama, Varanasi (Kashi)", "sri-ganapathi-sachchidananda-ashrama-varanasi-kashi", "Varanasi (Kashi)", [], ""],
  ["IN", "Uttar Pradesh", "Sri Ganapathy Sachchidananda Ashrama, Ayodhya", "sri-ganapathy-sachchidananda-ashrama-ayodhya", "Ayodhya", [], ""],
  ["IN", "Delhi", "Hanuman Dwarka Mandir, New Delhi", "hanuman-dwarka-mandir-new-delhi", "New Delhi", ["98101 26589"], "dwarkahanumanmandir@gmail.com"],
  ["IN", "Delhi", "Sri Ganapathy Sachchidananda Ashrama, Swaroop Nagar, New Delhi", "sri-ganapathy-sachchidananda-ashrama-swaroop-nagar-new-delhi", "Delhi (NCR)", ["9971118321"], "mail@dattapeetham.com"],
  ["IN", "Gujarat", "Sri Ganapati Sachchidananda Ashram, Surat", "sri-ganapati-sachchidananda-ashram-surat", "Surat", ["09825113911", "09426101608"], ""],
  ["IN", "Gujarat", "Sri Sachchidananda Datta Satsang Trust, Baroda", "sri-sachchidananda-datta-satsang-trust-baroda", "Vadodara (Baroda)", ["98983 91342", "0265-2464 883"], "sgs_vadodara@rediffmail.com"],
].map(([cc, state, name, slug, place, phones, email]) => ({ cc, state, name, slug, place, phones, email, href: `${OFFICIAL}/ashramcenters/${slug}` }));

const countryName = Object.fromEntries(countries.map((c) => [c.code, c.name]));
const shortName = { US: 'United States', GB: 'United Kingdom', AE: 'UAE', TT: 'Trinidad & Tobago' };
const label = (cc) => shortName[cc] || countryName[cc];

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const india = centres.filter((c) => c.cc === 'IN');
const abroad = centres.filter((c) => c.cc !== 'IN');
const byCount = (name) => (a, b) => b[1].length - a[1].length || name(a[0]).localeCompare(name(b[0]));
const groupBy = (list, key, name = (k) => k) => [...list.reduce((m, c) => m.set(c[key], [...(m.get(c[key]) || []), c]), new Map())].sort(byCount(name));
const states = groupBy(india, 'state');
// Delhi (the National Capital Territory) is grouped with the states but is not one.
const UT = new Set(['Delhi']);
const stateCount = states.filter(([s]) => !UT.has(s)).length;
const utNames = states.filter(([s]) => UT.has(s)).map(([s]) => s);
const indiaSpread = `${plural(india.length, 'centre')} in ${plural(stateCount, 'state')}${utNames.length ? ` and ${utNames.join(', ')}` : ''}`;
const nations = groupBy(abroad, 'cc', (cc) => countryName[cc]);

// tel: href — digits only, keeping a leading + and dropping the trunk "(0)".
const telHref = (p) => {
  const plus = p.trim().startsWith('+');
  const digits = (plus ? p.replace(/\(0\)/g, '') : p).replace(/\D/g, '');
  return `tel:${plus ? '+' : ''}${digits}`;
};
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function centreCard(c) {
  const q = fold([c.name, c.place, c.state, label(c.cc)].filter(Boolean).join(' '));
  const contact = [
    ...c.phones.map((p) => `<a href="${telHref(p)}">${icon('phone', 14)}<span>${esc(p)}</span></a>`),
    c.email ? `<a href="mailto:${c.email}">${icon('mail', 14)}<span>${esc(c.email)}</span></a>` : '',
  ].filter(Boolean).join('');
  return `<li class="ce-c" data-q="${esc(q)}">
      <a class="ce-c-name" href="${c.href}">${tail(c.name, icon('arrow-up-right', 14))}</a>
      <span class="ce-c-place">${icon('pin', 14)}<span>${esc(c.place)}</span></span>
      ${contact ? `<span class="ce-c-contact">${contact}</span>` : `<span class="ce-c-contact is-empty">Contact via the <a href="${c.href}">centre’s page</a></span>`}
    </li>`;
}

// town names for a collapsed group: the first part of each place line
const towns = (list) => [...new Set(list.map((c) => c.place.replace(/\s*\(.*\)/, '').split(',')[0].trim()))].sort().join(' · ');
const toggle = `<span class="ce-toggle" aria-hidden="true">${icon('plus', 18)}</span>`;
// keeps a trailing icon on the same line as the last word
const tail = (text, ic) => { const i = text.lastIndexOf(' '); return `${esc(text.slice(0, i + 1))}<span class="ce-nw">${esc(text.slice(i + 1))}${ic}</span>`; };

const directory = `<div class="ce-dir" data-filter-scope data-ce-dir>
  <div class="ce-dir-bar">
    <div class="ce-dir-top">
      <div class="ce-search" data-ce-search hidden>
        <label class="visually-hidden" for="ce-q">Search centres by town or name</label>
        ${icon('search', 18)}
        <input id="ce-q" type="search" placeholder="Search by town or name" autocomplete="off" spellcheck="false">
      </div>
      <p class="ce-status" data-ce-status aria-live="polite">${centres.length} of the ${DIRECTORY_TOTAL} centres in the official directory</p>
    </div>
    ${chips('Filter centres by country', [
      ['all', `All <small>${centres.length}</small>`],
      ['IN', `India <small>${india.length}</small>`],
      ['abroad', `Outside India <small>${abroad.length}</small>`],
      ...nations.map(([cc, list]) => [cc, `${label(cc)} <small>${list.length}</small>`]),
    ])}
  </div>

  <div class="ce-region" data-filter-item="IN" data-ce-region>
    <h3 class="ce-region-title"><span>India</span><small>${indiaSpread}</small></h3>
    <div class="ce-states">
      ${states.map(([state, list]) => `<details class="ce-state" data-ce-group>
        <summary>
          <h4 class="ce-state-name">${state}</h4>
          <span class="ce-state-count">${plural(list.length, 'centre')}</span>
          <span class="ce-state-towns">${towns(list)}</span>
          ${toggle}
        </summary>
        <ul class="ce-cards">${list.map(centreCard).join('')}</ul>
      </details>`).join('')}
    </div>
  </div>

  <div class="ce-region ce-region-abroad" data-ce-region>
    <h3 class="ce-region-title"><span>Outside India</span><small>${plural(abroad.length, 'centre')} in ${plural(nations.length, 'country', 'countries')}</small></h3>
    <div class="ce-nations">
      ${nations.map(([cc, list]) => `<details class="ce-nation${list.length > 1 ? ' is-wide' : ''}" data-filter-item="abroad ${cc}" data-ce-group data-ce-fold data-cc="${cc}" open>
        <summary>
          <h4 class="ce-nation-title"><span class="ce-cc" aria-hidden="true">${cc === 'GB' ? 'UK' : cc}</span><span>${countryName[cc]}</span><small>${plural(list.length, 'centre')}</small></h4>
          <span class="ce-nation-towns">${towns(list)}</span>
          ${toggle}
        </summary>
        <ul class="ce-cards">${list.map(centreCard).join('')}</ul>
      </details>`).join('')}
    </div>
  </div>

  <p class="ce-empty" data-filter-empty data-ce-empty hidden>${icon('info', 18)}<span>No centre in this list matches. The <a href="${links.ashramCenters}">official directory</a> holds all ${DIRECTORY_TOTAL}.</span></p>
</div>`;

/* ---------------------------------------------------------------------------
   Sections
--------------------------------------------------------------------------- */

const hero = pageHero({
  eyebrow: 'Global Reach',
  title: 'From Mysuru to the <span class="em-light">world</span>',
  lead: 'From the Ashram at the foot of Chamundi Hill, Sri Swamiji’s mission reaches sixteen Datta Kshetras, nine Navanatha Kshetras and Ashram centres in twelve countries.',
  image: P.hero,
  pos: 'center 32%',
  crumb: 'Global Reach',
  actions: btn('Find a centre near you', '#centres', 'gold', 'pin'),
  tiles: [
    { icon: 'globe', title: 'World Map', note: 'Centres in 12 countries', href: '#global-reach' },
    { icon: 'temple', title: '16 Datta Kshetras', note: 'Shodasha Datta Kshetras', href: '#kshetras' },
    { icon: 'lotus', title: 'Navanatha Kshetras', note: 'Nine Datta Kshetras', href: '#navanatha' },
    { icon: 'diya', title: 'Mysuru Ashram', note: 'The headquarters', href: '#mysuru' },
  ],
});

const overview = `<section id="overview" class="section ce-overview" aria-labelledby="overview-title">
  <svg class="ce-mandala" viewBox="0 0 104 104" aria-hidden="true" data-spin="60"><use href="#i-mandala"/></svg>
  <div class="wrap ce-overview-grid">
    <div class="ce-overview-copy">
      <span class="eyebrow">The reach of the Peetham</span>
      <h2 id="overview-title" data-split>From the foot of Chamundi Hill to <span class="em-light">twelve countries</span></h2>
      <p class="lead" data-reveal="up">Avadhoota Datta Peetham in Mysuru is the headquarters of Sri Swamiji’s mission. Over 80 branches have been consecrated across India, including sixteen Ashrams for the sixteen incarnations of Lord Dattatreya, Datta Kashi, Datta Rameshwaram and nine Kshetras dedicated to the Navanathas.</p>
      <p data-reveal="up">Sri Swamiji’s first foreign tour was in 1976. Today the Peetham’s directory lists Datta Yoga Centres, temples and Ashrams in eleven countries beyond India, from Trinidad to New Zealand.</p>
    </div>
    <div class="ce-overview-stats">
      ${stats([[16, 'Shodasha Datta Kshetras'], [9, 'Navanatha Kshetras'], [DIRECTORY_TOTAL, 'centres in the official directory'], [12, 'countries with centres']])}
      <p class="ce-fine">${icon('info', 14)}<span>Counts from dattapeetham.org: the Shodasha and Navanatha Kshetra pages and the Ashram Centres directory.</span></p>
    </div>
  </div>
</section>`;

// The shared map's origin card quotes "over one hundred Ashram branches"
// (sri-swamiji page) while the overview above quotes "Over 80 branches"
// (sanatana-dharma-parirakshana page). Keep one figure on this page: the
// card names the Ashram as the headquarters, without a count.
const reachMap = worldMap({ id: 'reach-map', findHref: '#centres' })
  .replace(/(<span class="wm-ro-note" data-wm-note>)[^<]*(<\/span>)/, '$1Sri Ganapathy Sachchidananda Ashram, headquarters of Sri Swamiji’s mission.$2');

const reach = `<section id="global-reach" class="section section-dark ce-reach grain">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Global Reach', title: 'Golden threads from <span class="em-light">Mysuru</span>', lead: 'The Peetham’s directory lists centres in eleven countries beyond India. Choose a country to trace its thread from the Ashram.', light: true })}
    ${reachMap}
    <p class="ce-reach-cta" data-reveal="up">${btn('Browse the centres by country', '#centres', 'ghost', 'arrow')}</p>

    <div class="ce-moments-wrap">
      <header class="ce-sub is-light">
        <span class="eyebrow">Sri Swamiji’s mission abroad</span>
        <h3 data-split>Moments from the journeys</h3>
      </header>
      <ul class="ce-moments" data-stagger>
        ${moments.map((m) => `<li><figure class="ce-moment">
          <span class="ce-moment-img">${img(m.img, m.alt)}</span>
          <figcaption>
            <span class="ce-moment-meta">${icon('pin', 13)}<span>${m.place}</span><span class="ce-dot" aria-hidden="true">·</span><time>${m.date}</time></span>
            <b>${m.title}</b>
            <span class="ce-moment-text">${m.text}</span>
          </figcaption>
        </figure></li>`).join('')}
      </ul>
      <div class="ce-venues">
        <p class="ce-venues-label">${icon('music', 16)}<span>A few of Sri Swamiji’s concert halls abroad</span></p>
        ${marquee(venues)}
        <ul class="visually-hidden">${venues.map((v) => `<li>${v}</li>`).join('')}</ul>
      </div>
    </div>
  </div>
</section>`;

const kshetraGrid = `<ol class="ce-ksh-grid" data-stagger>
  ${kshetras.map((k) => `<li class="ce-ksh">
    <article class="ce-ksh-card">
      <div class="ce-ksh-media">${img(k.img, kshetraAlt(k), { w: 250, h: 250 })}</div>
      <span class="ce-ksh-num" aria-hidden="true">${pad(k.n)}</span>
      <div class="ce-ksh-body">
        <h3><a class="ce-ksh-link" href="${k.href}"><span class="visually-hidden">${k.n}. </span>${k.name}</a></h3>
        <p class="ce-ksh-place">${icon('pin', 13)}<span>${k.place}</span></p>
        ${k.n === 1 ? '<span class="ce-ksh-tag">Main deity of the Peetham</span>' : ''}
      </div>
      <span class="ce-ksh-go" aria-hidden="true">${icon('arrow-up-right', 16)}</span>
    </article>
  </li>`).join('')}
</ol>`;

const [kashi, rameshwaram] = specialKshetras;
const special = `<div class="ce-special">
  <header class="ce-sub">
    <span class="eyebrow">Also on the Shodasha grid</span>
    <h3 data-split>Datta Kashi &amp; Datta <span class="em-light">Rameshwaram</span></h3>
  </header>
  <div class="ce-sp-grid">
    <article class="ce-sp" data-reveal="up">
      <div class="ce-sp-media">${img(P.dattaKashi, 'The flower-garlanded Datta idol at Datta Kashi, Mekedatu, with worship being offered beside it', { pos: '50% 28%' })}<span class="ce-sp-letter" aria-hidden="true">A</span></div>
      <div class="ce-sp-body">
        <span class="tag">Sri Swamiji’s birthplace</span>
        <h3><a href="${kashi.href}">${kashi.name}</a></h3>
        <p class="ce-sp-place">${icon('pin', 14)}<span>Mekedatu, Kanakapura Taluk, Karnataka</span></p>
        <p>Picturesque Mekedatu is near Brahma Kundam, where Sri Swamiji was born, amidst the Sahyadri hills at the confluence of three rivers, near the Sangameswara temple. A Siva Lingam found at the spot where Sri Swamiji’s home stood gave the Ashram the name Datta Kashi.</p>
        <dl class="ce-sp-facts">
          <div><dt>Datta idol installed</dt><dd>29 October 1988</dd></div>
          <div><dt>Three rivers</dt><dd>Kaveri, Arkavati, Guptagamini</dd></div>
          <div><dt>Also enshrined</dt><dd>Panchamukha Anjaneya, Ganapathy, Vana Durga, Sadguru Padukas</dd></div>
        </dl>
        <a class="link-arrow" href="${kashi.href}">${tail('Datta Kashi on dattapeetham.org', icon('arrow-up-right', 15))}</a>
      </div>
    </article>
    <article class="ce-sp" data-reveal="up">
      <div class="ce-sp-media">${img(P.dattaRameshwaram, 'The garlanded idols at the seaside Datta Rameshwaram temple, Manginapudi, with worship being offered beside them', { pos: '50% 40%' })}<span class="ce-sp-letter" aria-hidden="true">B</span></div>
      <div class="ce-sp-body">
        <span class="tag">By the sea at Manginapudi</span>
        <h3><a href="${rameshwaram.href}">${rameshwaram.name}</a></h3>
        <p class="ce-sp-place">${icon('pin', 14)}<span>Manginapudi, Machilipatnam, Andhra Pradesh</span></p>
        <p>To protect Manginapudi (Tallapalem) from severe cyclones and strong tidal waves, Sri Swamiji consecrated Lord Dattatreya at the seaside temple of Lord Nagareswara in 1991, and had twelve wells dug, each with healing waters of different constituents. A bath at these medicinal wells destroys sins; hence the name Datta Rameswaram.</p>
        <p class="ce-wells-label">The twelve wells</p>
        <ul class="ce-wells">${wells.map((w) => `<li>${w}</li>`).join('')}</ul>
        <a class="link-arrow" href="${rameshwaram.href}">${tail('Datta Rameshwaram on dattapeetham.org', icon('arrow-up-right', 15))}</a>
      </div>
    </article>
  </div>
</div>`;

const kshetraSection = `<section id="kshetras" class="section section-paper ce-ksh-section">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Shodasha Datta Kshetras', title: 'Sixteen shrines for the sixteen <span class="em-light">manifestations</span> of Lord Datta', lead: 'Sri Swamiji has consecrated sixteen Datta Shrines, the Shodasha Datta Kshetras, representing the sixteen manifestations of Lord Datta, in different parts of India. The first, Kaalaagni Shamana Dattatreya, is in the main Ashrama at the foot of Chamundi Hill in Mysuru.' })}
    ${kshetraGrid}
    <p class="ce-ksh-note" data-reveal="up">${icon('info', 15)}<span>Each Kshetra opens its page on dattapeetham.org, with its history, address and contacts. <a href="${OFFICIAL}/shodasha-datta-kshetras">See the full Shodasha grid</a>.</span></p>
    ${special}
  </div>
</section>`;

const navanathaSection = `<section id="navanatha" class="section section-dark ce-nv">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Navanatha Datta Kshetras', title: 'Nine Kshetras, nine <span class="em-light">syllables</span>', lead: 'Nine Kshetras are dedicated to the Navanathas. The first, Gam Dattanatha Kshetra in New Delhi, takes the first of the nine syllables in Sri Swamiji’s name as its seed syllable.', light: true })}

    <figure class="ce-name" data-reveal="fade">
      <ol class="ce-syl">
        ${navanatha.map((n, i) => `<li style="--i:${i}"><a class="ce-syl-a" href="#nv-${i + 1}" data-i="${i + 1}" aria-label="${i + 1}: ${n.seed} Dattanatha Kshetram, ${n.place}"><span class="ce-syl-n" aria-hidden="true">${i + 1}</span><span class="ce-syl-s" lang="sa-Latn" aria-hidden="true">${n.syl}</span><span class="ce-syl-seed" aria-hidden="true">${n.seed}</span></a></li>`).join('')}
      </ol>
      <svg class="ce-syl-thread" viewBox="0 0 900 10" preserveAspectRatio="none" aria-hidden="true"><path d="M0 5H900"/><path class="ce-syl-pulse" pathLength="900" d="M0 5H900"/></svg>
      <figcaption>The nine syllables of Sri Swamiji’s name, <span lang="sa-Latn">Ga·ṇa·pa·ti·sa·chchi·dā·nan·da</span>, set beside the nine Kshetras in their published order.</figcaption>
    </figure>

    <div class="ce-nv-layout">
      <ol class="ce-nv-grid" data-stagger>
        ${navanatha.map((n, i) => `<li class="ce-nv-card" id="nv-${i + 1}" data-i="${i + 1}">
          <a class="ce-nv-link" href="${OFFICIAL}/page/view/${n.slug}">
            <span class="ce-nv-num" aria-hidden="true">${i + 1}</span>
            <span class="ce-nv-text">
              <h3><span class="ce-nv-seed">${n.seed}</span> <span class="ce-nv-kind">Dattanatha Kshetram</span>${dupSeed(n) ? `<span class="visually-hidden"> (${n.place})</span>` : ''}</h3>
              <span class="ce-nv-meta"><b>${n.natha}</b><span class="ce-nv-place">${icon('pin', 13)}${n.place}</span></span>
            </span>
            ${icon('arrow-up-right', 16)}
          </a>
        </li>`).join('')}
      </ol>
      <aside class="ce-nv-first glass" data-reveal="up" aria-labelledby="nv-first-title">
        <span class="eyebrow">The first Navanatha Kshetra</span>
        <h3 id="nv-first-title">Gam Dattanatha Kshetra, New Delhi</h3>
        <dl class="ce-nv-facts">
          <div><dt>1972</dt><dd>The first Gnana Bodha Sabha is formed in Delhi.</dd></div>
          <div><dt>1973</dt><dd>‘Jaya Jaya Gnana Bodha Sabha’, the Universal Anthem Bhajan for all Datta Centers, is composed here.</dd></div>
          <div><dt>11 Jan 1992</dt><dd>Gam Dattanatha Swami is installed, the first of the Navanatha Kshetras.</dd></div>
        </dl>
        <p>Dattatreya, Ganapathy, Hanuman, Kali Maa, Siva Linga and the Navagrahas are worshipped here. A Balwadi school, vocational training for women and Annadana are regular activities.</p>
        <div class="btn-row">${btn('All nine on dattapeetham.org', links.navanatha, 'ghost', 'arrow-up-right')}</div>
      </aside>
    </div>
  </div>
</section>`;

const centresSection = `<section id="centres" class="section ce-centres">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Ashram Centres', title: 'Find a centre <span class="em-light">near you</span>', lead: 'Ashrams, Datta Yoga Centres, temples and satsang groups from the Peetham’s directory, grouped here by country and, within India, by state or territory. Open a centre for its full address, map and programmes.' })}
    <p class="notice ce-notice" data-reveal="up">${icon('info', 18)}<span><b>A partial list.</b> ${centres.length} of the ${DIRECTORY_TOTAL} centres in the official directory are shown here, with contacts as published. Please confirm timings with the centre before you visit, and see the <a href="${links.ashramCenters}">official Ashram Centres directory</a> for the complete, current list.</span></p>
    ${directory}
  </div>
</section>`;

const kaalaagniThumb = kshetras[0];
const mysuru = `<section id="mysuru" class="section section-sand ce-my" aria-labelledby="mysuru-title">
  <div class="wrap ce-my-grid">
    <div class="ce-my-media" data-reveal="clip">
      ${frame(P.prayerHall, 'Devotees seated in the Universal Prayer Hall of the Mysuru Ashram, facing the main shrine', { ratio: '4/5', pos: '74% 55%', badge: 'Unveiled 1984', caption: '<b>Universal Prayer Hall</b>Home of Kaalaagni Shamana Dattatreya, the Peetham’s main deity' })}
      <figure class="ce-my-deity">
        ${img(kaalaagniThumb.img, kshetraAlt(kaalaagniThumb), { w: 250, h: 250 })}
        <figcaption><b>Kshetra No. 1</b>Kaalaagni Shamana Dattatreya</figcaption>
      </figure>
    </div>
    <div class="ce-my-body">
      <span class="eyebrow">The headquarters</span>
      <h2 id="mysuru-title" data-split>Avadhoota Datta Peetham, <span class="em-light">Mysuru</span></h2>
      <p class="lead" data-reveal="up">Popularly called Sri Ganapathy Sachchidananda Ashram, the Peetham is situated on a sprawling 40-acre site at the foot of Chamundi Hill, in the royal city of Mysuru. This is the headquarters of Sri Swamiji’s mission.</p>
      <p data-reveal="up">Here one can study Yoga, the Vedas and Sanskrit, bhajans and music, and in the Universal Prayer Hall traditional Pujas and Homas are performed. The first of the sixteen Datta Kshetras stands here, the temple the Peetham calls the primordial and central seat of Datta Peetham’s global reach.</p>
      <dl class="stats ce-my-stats" data-stagger>
        <div class="stat"><dt><span data-count="40">40</span></dt><dd>acres at the foot of Chamundi Hill</dd></div>
        <div class="stat"><dt>1966</dt><dd>the Ashram is established at Mysuru</dd></div>
        <div class="stat"><dt>16</dt><dd>lamps of the evening Kakada Arati</dd></div>
      </dl>
      <ol class="ce-my-history">
        <li data-reveal="up"><span class="ce-my-year">1978</span><p><b>Lord Datta descends.</b> In a week-long ceremony from 4 to 11 June, Lord Datta was installed as Sri Kaalaagni Shamana Dattatreya on 9 June. A stage called Saraswati Peetha, sometimes Narayana Peetha, once stood here; after the Datta Temple was built, the Ashrama began to be called Avadhoota Datta Peetham. That week Sri Swamiji introduced Datta worship, the Datta Stava and the greeting <i>Jaya Guru Deva Datta</i>, which became <i>Jaya Guru Datta</i> in the mid-eighties.</p></li>
        <li data-reveal="up"><span class="ce-my-year">1984</span><p><b>The Universal Prayer Hall</b> is unveiled. Every evening devotees gather here for Divya Naama Sankeertana and the Kakada Arati, lighting sixteen lamps before Lord Datta.</p></li>
        <li data-reveal="up"><span class="ce-my-year">2002</span><p><b>Re-consecration.</b> On Rama Navami, 21 April 2002, the idol of Lord Datta was relocated to the centre of the Prayer Hall and re-consecrated.</p></li>
      </ol>
      <div class="ce-my-contact" data-reveal="up">
        ${infoList([
          ['pin', 'Address', `${site.address.lines.join('<br>')}`],
          ['phone', 'Phone', `<a href="${site.phoneHref}">${site.phone}</a>`],
          ['mail', 'Email', `<a href="mailto:${site.email}">${site.email}</a>`],
        ])}
        <div class="btn-row">${btn('Plan your visit', 'visit.html', 'gold')}${btn('Temples &amp; darshan', 'darshan.html', 'line', 'temple')}</div>
      </div>
    </div>
  </div>
</section>`;

const closing = ctaBand({
  title: 'Come to the <span class="em-light">Mysuru</span> Ashram',
  text: 'Plan a pilgrimage to the headquarters of Sri Swamiji’s mission, or offer a puja online from wherever you are.',
  image: P.prayerHall,
  actions: `${btn('Plan your visit', 'visit.html', 'gold')}${btn('Book a puja', links.poojas, 'ghost', 'arrow-up-right')}`,
});

/* ---------------------------------------------------------------------------
   Page
--------------------------------------------------------------------------- */
export default {
  slug: 'centers',
  file: 'centers.html',
  title: 'Global Reach',
  crumb: 'Global Reach',
  description: 'The 16 Shodasha Datta Kshetras, 9 Navanatha Kshetras and Ashram centres in 12 countries, from the Mysuru Ashram of Avadhoota Datta Peetham to the world.',
  nav: 'About',
  image: P.hero,
  preload: P.hero,
  css: true,
  scripts: ['centers'],
  features: ['world-map'],
  jsonLd: [{
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Shodasha Datta Kshetras',
    description: 'Sixteen Datta Shrines consecrated by Sri Ganapathy Sachchidananda Swamiji, representing the sixteen manifestations of Lord Datta.',
    numberOfItems: kshetras.length,
    itemListElement: kshetras.map((k) => ({
      '@type': 'ListItem',
      position: k.n,
      item: { '@type': 'HinduTemple', name: k.name, url: k.href, image: k.img, address: { '@type': 'PostalAddress', addressLocality: k.place.split(',')[0], addressRegion: k.place.split(',')[1]?.trim(), addressCountry: 'IN' } },
    })),
  }],
  render: () => `${hero}
${overview}
${reach}
${kshetraSection}
${navanathaSection}
${centresSection}
${mysuru}
${closing}`,
};
