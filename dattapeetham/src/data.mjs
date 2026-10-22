// Shared content collections used by more than one page. Sourced from the
// live dattapeetham.org (October 2026); wording stays close to the Peetham's.
// Page-specific content lives in that page's module.

import { IMG, PAGE_IMG, KSHETRA_IMG, OFFICIAL } from './site.mjs';

export const photos = {
  swamiji: `${IMG}sadguru-deva.jpg`,
  swamijiGarland: `${IMG}appaji-4.jpeg`,
  swamijiHoma: `${IMG}appaji-in-homa.jpeg`,
  balaSwamiji: `${IMG}bala-swamiji.jpg`,
  balaSwamijiSpeech: `${IMG}bs-2-speech.jpeg`,
  lineage: `${IMG}guru-linage.png`,
  logo: `${IMG}datta-peetham-logo.png`,
  dattatreya: `${IMG}dattatreya-nirajanam.jpg`,
  rajarajeshwari: `${IMG}raja-rajeswari-temple.jpg`,
  venkateshwara: `${IMG}d-v.jpg`,
  hanuman: `${IMG}hanuman-temple.jpeg`,
  hanumanIcon: `${IMG}hanuman-400-logo.png`,
  birdsIcon: `${IMG}sgs-birds-logo-2.png`,
  prayerHall: `${PAGE_IMG}502/502_5e6da55ae891b81e.jpg`,
  rajarajeshwariSannidhi: `${PAGE_IMG}502/502_2b81050a75adc422.jpg`,
  hariSannidhi: `${PAGE_IMG}502/502_f4837402856c5496.jpg`,
  sdvt: `${PAGE_IMG}502/502_43ac49e40550ce21.png`,
  hanumanStatue: 'https://dev-dattapeetham.s3.amazonaws.com/content/page_images/35/35_f427533790d640b3.jpg',
  shukaVanaAviary: `${IMG}shikhavana-avairy.jpg`,
  shukaVana1: `${IMG}shukhavanam.jpg`,
  shukaVana2: `${IMG}shukhavana-2.jpg`,
  shukaVanaPage: `${PAGE_IMG}503/503_45eeebc041e1b039.jpg`,
  shukaVanaRecord: `${PAGE_IMG}503/503_01480717a489eef4.jpg`,
  bonsai: `${IMG}bonsai-3.jpg`,
  bonsai1: `${IMG}bonsai-1.jpg`,
  bonsai2: `${IMG}bonsai.jpg`,
  vishwamRecord: `${IMG}vishwam-record.jpg`,
  vishwamOuter: `${IMG}vishwam-outer.jpg`,
  vishwamVadya: `${IMG}vadhya-section.jpg`,
  nadaMantapaInterior: `${IMG}nadamandapa-interior.jpg`,
  nadaMantapa: `${IMG}nadamantapa.jpg`,
  nadaMantapaChandra: `${IMG}nadamandapa-sahsrachandra.jpg`,
  kriyaYoga: `${IMG}kriya-yoga-all.jpg`,
  cows: `${IMG}sgs-cows.jpg`,
  goshala2: `${IMG}sgs-gau-shala-2.jpg`,
  goshala3: `${IMG}sgs-gau-shala-3.jpg`,
  feedingCow: `${IMG}feeding-gow.jpg`,
  feedingCow3: `${IMG}feeding-gow-3.jpg`,
  kamadhenu: `${IMG}sgs-kamadenu.jpg`,
  students: `${IMG}students-1.jpg`,
  smallStudents: `${IMG}small-students.jpg`,
  dhyana: `${IMG}dhyana.jpg`,
  hospital: `${IMG}sgs-hospital.jpg`,
  hospitalDoctors: `${IMG}sgs-hospital-doctors.jpg`,
  medicalCamp: `${IMG}camp-2.jpg`,
  hospitalSeva: `${IMG}hospitalseva-67f4b197b5e90.png`,
  narasimhaKalyana: `${IMG}pooja_1189_b7bd843d77efb493.jpg`,
  ganapathyHoma: `${IMG}pooja_1007_97003de666a7ddda.jpeg`,
  appMockup: `${IMG}dp-app.png`,
  appStoreBadge: `${IMG}app-store.jpg`,
  playStoreBadge: `${IMG}playstore.png`,
  // lineage page portraits
  lineageChart: `${PAGE_IMG}521/521_6bf96e8628462d56.png`,
  lordDattatreya: `${PAGE_IMG}521/521_f84a964b2a2a31f4.jpg`,
  sripadaVallabha: `${PAGE_IMG}521/521_f2fc8688669a865d.png`,
  narasimhaSaraswati: `${PAGE_IMG}521/521_a785386beb92ac80.png`,
  swamijiPortrait: `${PAGE_IMG}521/521_8c4d6d00c834d30b.jpg`,
  balaSwamijiPortrait: `${PAGE_IMG}521/521_804b3dfed5da9e79.jpg`,
  guruParamparaPooja: `${PAGE_IMG}521/521_c857a326b3939174.jpg`,
};

export const timings = [
  { key: 'temple', title: 'Temple Darshan', img: photos.logo, rows: [['Morning', '6:00 AM – 12:00 PM'], ['Evening', '4:00 PM – 8:00 PM']], note: 'Daily' },
  { key: 'shukaVana', title: 'Shuka Vana (Birds)', img: photos.birdsIcon, rows: [['Morning', '9:00 AM – 12:00 PM'], ['Evening', '3:30 PM – 6:00 PM']], note: 'Closed on Wednesdays' },
  { key: null, title: 'Karya Siddhi Hanuman', img: photos.hanumanIcon, rows: [['Abhisheka', '7:00 AM daily'], ['Aarti', '6:00 PM daily']], note: '' },
];

export const latestSevas = [
  { title: 'Sri Lakshmi Narasimha Swamy Kalyana', when: 'Every month on Swati Nakshatra', text: 'The celestial wedding of Lord Lakshmi Narasimha, performed every month on Swati Nakshatra.', img: photos.narasimhaKalyana, href: `${OFFICIAL}/poojas?ashram_id=4&currency=inr&view=listView&item_key=LACfOHS6iZEM25jd` },
  { title: 'Ganapathy Homa', when: 'Homa', text: 'Fire offering to Lord Ganapathy, the remover of obstacles, for auspicious new beginnings.', img: photos.ganapathyHoma, href: `${OFFICIAL}/poojas?ashram_id=4&currency=inr&view=listView&item_key=QK1wir4YvXIN5okz` },
  { title: 'Gau Pooja', when: 'Goshala', text: 'Worship of Gau Mata, in whom all the Devatas are said to reside, at the Ashram Goshala.', img: photos.kamadhenu, href: `${OFFICIAL}/poojas?ashram_id=4` },
];

export const timeline = [
  ['1942', 'Birth of Sri Swamiji on 26 May 1942 — Jyeshta Shuddha Ekadashi of the year Chitrabhanu — at Mekedatu.'],
  ['1953', 'Shaktipaatam — transmission of energy — from Mother Sri Jayalakshmi Maata; her Maha Samadhi the same year.'],
  ['1966', 'Ashram established at Mysuru. Sanyasa initiation at Srisailam. Installation of Sri Sachchidanandeshwara.'],
  ['1976', 'Bhaktimala monthly magazine begins, later published in seven languages. Sri Swamiji’s first foreign tour.'],
  ['1978', 'SGS Hospital inaugurated in Mysuru to provide free medical services.'],
  ['1980', 'Sree Lakshmi Narasimha Kshetra established at the Mysuru Ashram.'],
  ['1981', 'Datta Kriya Yoga facilities introduced at the Mysuru Ashram.'],
  ['1984', 'Universal Prayer Hall unveiled.'],
  ['1985', 'Sri Ganapathy Sachchidananda Veda Pathashala founded.'],
  ['1986', 'Sri Jayalakshmi Maata Nitya Annadana Trust established.'],
  ['1987', 'School for the study of the Shastras begins.'],
  ['1988', 'Educational Institution started.'],
  ['1989', 'Revival of Raga Ragini and Dhyana Chikitsa Kacheri; research and development on Nada Chikitsa.'],
  ['1992', 'Ascends the Audumbara Dharma Simhasana.'],
  ['1993', 'Narahareeshwara installed at Jayalakshmipuram. Eight-month Nada Prasara tour.'],
  ['1994', 'Vedic examinations begin; Veda Nidhi and Nada Nidhi titles introduced.'],
  ['1995', 'Pilgrimage to Manasa Sarovara in the Himalayas.'],
  ['1996', 'Shastra Nidhi title introduced. Raga Ragini Trust formed.'],
  ['1998', 'Nada Mantapa inaugurated at the Mysuru Ashram.'],
  ['1999', 'Sri Datta Venkateshwara Kshetram installed.'],
  ['2000', 'Pillar of Dharma inaugurated.'],
  ['2002', '60th birthday celebrations. Re-installation of Kaalaagni Shamana Dattatreya.'],
  ['2004', 'Sri Datta Vijayananda Teertha Swamiji crowned Junior Pontiff. I-SERVE — Institute for Scientific Research on Vedas — inaugurated.'],
  ['2005', 'Kishkindha Moolika Bonsai Garden inaugurated.'],
  ['2006', 'Saptarshi Sarovara and Vishwam Museum inaugurated. Chitike literary work released.'],
  ['2012', '70th birthday. Shuka Vana inaugurated. 70-ft Karya Siddhi Hanuman statue consecrated.'],
  ['2013', 'Honorary Doctorate in Music — Vijayanagara Sri Krishna Devaraya University.'],
  ['2015', 'Guinness World Records: most people chanting at a single venue, largest music therapy lesson, longest chanting marathon (team).'],
  ['2016', 'Guinness World Records: largest breathing lesson, largest online video album of people chanting, largest display of bonsai trees. Honorary Doctorate — World Classical Tamil University.'],
  ['2017', 'Guinness World Records: most bird species in an aviary, largest Hindu Smriti.'],
  ['2018', 'Guinness World Record: world’s largest special stamp.'],
  ['2022', '80th birthday. Guinness World Records including the largest simultaneous recital of the Bhagavad Gita. Yoga Ratna Award and Piteelu Chowdaiah Lifetime Award.'],
  ['2023', 'Honorary Doctorate in Music — Dr. Gangubai Hanagal Music and Performing Arts University.'],
  ['2024', 'First-ever Music for Meditation & Healing in a cave — The Caverns, Pelham, Tennessee, USA.'],
];

export const concerts = [
  { name: 'Adi Guru Raga Sagara', img: `${IMG}concert-67fb669375448.png`, href: `${OFFICIAL}/myragasagaraconcerts/viewconcert/32` },
  { name: 'Vishwavasu Raga Sagara', img: `${IMG}concert-67f4d58f252ca.png`, href: `${OFFICIAL}/myragasagaraconcerts` },
  { name: 'Antar Mukha Raga Sagara', img: `${IMG}concert-67f4d4ecb0b8a.png`, href: `${OFFICIAL}/myragasagaraconcerts` },
  { name: 'Krishnamrutha Raga Sagara', img: `${IMG}concert-67f4d5588be18.png`, href: `${OFFICIAL}/myragasagaraconcerts` },
];

export const albums = [
  { name: 'Sri Aditya Raga Sagara', venue: 'Live in Auckland', img: `${IMG}album-67f4d6465a899.png`, spotify: 'https://open.spotify.com/album/4I1yAnNO6MTTNctq8DmIp7', apple: 'https://music.apple.com/us/album/sri-aditya-raga-sagara-live-in-auckland/1716279126' },
  { name: 'Atma Shanti Raga Sagara', venue: 'Live at Carnegie Hall', img: `${IMG}album-67f4d68c59289.png`, spotify: 'https://open.spotify.com/album/5l80ICtm6E5auSJ9fL7Lsi', apple: 'https://music.apple.com/in/album/atma-shanti-raga-sagara-live-at-the-carnegie-hall/1758597325' },
  { name: 'Mauna Dhyana Raga Sagara', venue: 'Live in Davos, feat. L. Subramaniam', img: `${IMG}album-67f4d6c569d84.png`, spotify: 'https://open.spotify.com/album/05Nst4TRWvKfqKadLEDckJ', apple: 'https://music.apple.com/in/album/mauna-dhyana-raga-sagara-live-in-davos-feat-l-subramaniam/1534953425' },
  { name: 'Sachchidananda Vadya Vaibhavam', venue: 'Instrumental', img: `${IMG}album-67f4d7178d0d3.png`, spotify: 'https://open.spotify.com/album/1bnP2gV7MKCsKpHrBBUXar', apple: 'https://music.apple.com/mx/album/sachchidananda-vadya-vaibhavam/464226228?l=en-GB' },
  { name: 'Raga Sagara', venue: 'Live in Hyderabad, 2 April 2006', img: `${IMG}album-67f4d7a752613.png`, spotify: 'https://open.spotify.com/album/2WRMKJy5RnmVnNONLlG84b', apple: 'https://music.apple.com/in/album/raga-sagara-live-in-hyderabad-2nd-april-2006/294967651' },
];

export const apps = [
  ['Datta Peetham', 'app-67f4e8482e7ef.png', 'https://apps.apple.com/in/app/datta-peetham/id1627048826'],
  ['Hanuman Chalisa', 'app-69c0f32da2ec2.png', 'https://apps.apple.com/us/app/hanuman-chalisa-for-parayana/id990901195'],
  ['Bhajan Mala', 'app-67f4e17ca2221.png', 'https://apps.apple.com/us/app/bhajan-mala/id583564306'],
  ['Guru Gita', 'app-69c12b39c0f78.png', 'https://apps.apple.com/us/app/guru-gita/id670629806'],
  ['Vishnu Sahasranamam', 'app-69c126f07923a.png', 'https://apps.apple.com/us/app/vishnu-sahasranamam/id587284588'],
  ['Lalita Sahasranama', 'app-69c10a5c57c08.png', 'https://apps.apple.com/in/app/lalita-sahasranama/id720123738'],
  ['SGS Bhagavad Gita', 'app-69c122703bc00.png', 'https://apps.apple.com/us/app/sgs-bhagavad-gita/id879311089'],
  ['Kavacha Manjari', 'app-69c125e74205d.png', 'https://apps.apple.com/us/app/kavacha-manjari/id725186291'],
  ['Shatashloki Ramayana', 'app-69c12917e056e.png', 'https://apps.apple.com/us/app/shatashloki-ramayana/id866940995'],
  ['SGS Panchangam', 'app-67f4e1a3dace8.png', 'https://apps.apple.com/in/app/sgs-panchangam/id1100844162'],
  ['Datta Kriya Yoga', 'app-67f4e0e05c5c8.png', 'https://apps.apple.com/us/app/datta-kriya-yoga/id1608729437'],
  ['SGS Gita Tutor', 'app-67f4e1465d93b.png', 'https://apps.apple.com/in/app/sgs-gita-tutor/id1626521009'],
  ['SGS Vedas', 'app-69c0ebe6cb30b.png', 'https://apps.apple.com/us/app/sgs-vedas/id6474610203'],
  ['SGS Satsang', 'app-69c0f4d4b8d86.png', 'https://apps.apple.com/us/app/sgs-satsang/id6749831728'],
  ['SGS Ramayan', 'app-69c0f756a9393.png', 'https://apps.apple.com/us/app/sgs-ramayan/id1643644384'],
  ['Walk Mantra', 'app-69c0f83b35bc1.png', 'https://apps.apple.com/us/app/walk-mantra/id6744504102'],
  ['Vaakya', 'app-69c10509e6c70.png', 'https://apps.apple.com/us/app/vaakya/id6698896244'],
  ['SGS Datta Venu', 'app-69cb68a9e3ac7.png', 'https://apps.apple.com/us/app/sgs-datta-venu/id6760384421'],
].map(([name, icon, href]) => ({ name, icon: IMG + icon, href }));

export const kshetras = [
  ['01-kalagni-shamana-dattatreya-mysore-karnataka-india', 'Kaalaagni Shamana Dattatreya', 'Mysuru, Karnataka', 'kaalaagni-shamana-dattatreya'],
  ['02-yogi-raja-vallabha-dattatreya-proddatur-andhra-pradesh-india', 'Yogiraja Vallabha Dattatreya', 'Proddatur, Andhra Pradesh', 'yogiraaja-vallabha-dattatreya'],
  ['03-datta-yogi-raja-bangalore-karnataka-india', 'Datta Yogiraja', 'Bengaluru, Karnataka', 'datta-yogiraja'],
  ['04-gnaana-saagara-dattatreya-anantapur-andhra-pradesh-india', 'Gnaana Saagara Dattatreya', 'Anantapur, Andhra Pradesh', 'gnaana-saagara-dattatreya'],
  ['05-shyamakamala-lochana-dattatreya-vijayawada-andhra-pradesh-india', 'Shyamakamala Lochana Dattatreya', 'Vijayawada, Andhra Pradesh', 'shyamakamala-lochana-dattatreya'],
  ['06-atri-varada-dattatreya-machilipatnam-andhra-pradesh-india', 'Atri Varada Dattatreya', 'Machilipatnam, Andhra Pradesh', 'atri-varada-dattatreya'],
  ['07-samskaara-heena-shivaroopa-dattatreya-jaya-lakshmi-puram-andhra-pradesh-india', 'Samskaara Heena Shivaroopa Dattatreya', 'Jayalakshmipuram, Andhra Pradesh', 'samskaara-heena-shivaroopa-dattatreya'],
  ['08-aadi-guru-dattatreya-chennai-tamil-nadu-india', 'Aadi Guru Dattatreya', 'Chennai, Tamil Nadu', 'aadi-guru-dattatreya'],
  ['09-digambara-datta-rishikesh-uttarakhand-india', 'Digambara Datta', 'Rishikesh, Uttarakhand', 'digambara-datta'],
  ['10-vishwambara-avadhoota-dattatreya-aakividu-andhra-pradesh-india', 'Vishwambaravadhoota Dattatreya', 'Akividu, Andhra Pradesh', 'vishwambara-avadhoota-dattatreya'],
  ['11-deva-deva-dattatreya-nuzividu-andhra-pradesh-india', 'Deva Deva Dattatreya', 'Nuzvid, Andhra Pradesh', 'deva-deva-dattatreya'],
  ['12-datta-avadhoota-hyderabad-andhra-pradesh-india', 'Dattavadhoota', 'Hyderabad, Telangana', 'datta-avadhoota'],
  ['13-datta-digambara-gandigunta-andhra-pradesh-india', 'Datta Digambara', 'Gandigunta, Andhra Pradesh', 'datta-digambara'],
  ['14-siddha-raja-dattatreya-cochin-kerala-india', 'Siddha Raja Dattatreya', 'Kochi, Kerala', 'siddha-raja-dattatreya'],
  ['15-maaya-mukta-avadhoota-dattatreya-achcharapakam-tamil-nadu-india', 'Maaya Mukta Avadhoota Dattatreya', 'Acharapakkam, Tamil Nadu', 'maaya-mukta-avadhoota-dattatreya'],
  ['16-leela-vishwambara-dattatreya-surat-gujarat-india', 'Leela Vishwambhara Dattatreya', 'Surat, Gujarat', 'leela-vishwambhara-dattatreya'],
].map(([img, name, place, slug], i) => ({ n: i + 1, name, place, img: `${KSHETRA_IMG}thumb_${img}.jpg`, href: `${OFFICIAL}/page/view/${slug}` }));

export const specialKshetras = [
  { name: 'Datta Kashi', place: 'Mekedatu — Sri Swamiji’s birthplace', img: `${KSHETRA_IMG}thumb_17-datta-kashi-mekedatu.jpg`, href: `${OFFICIAL}/page/view/datta-kashi` },
  { name: 'Datta Rameshwaram', place: 'Manginapudi, Andhra Pradesh', img: `${KSHETRA_IMG}thumb_18-datta-rameshvara-kshetra-manginapudi.jpg`, href: `${OFFICIAL}/page/view/datta-rameshwaram` },
];

// Countries with Ashram centres, from the dattapeetham.org centres filter.
export const countries = [
  { name: 'India', code: 'IN' }, { name: 'United States', code: 'US' }, { name: 'United Kingdom', code: 'GB' },
  { name: 'Canada', code: 'CA' }, { name: 'Australia', code: 'AU' }, { name: 'New Zealand', code: 'NZ' },
  { name: 'Germany', code: 'DE' }, { name: 'Switzerland', code: 'CH' }, { name: 'Netherlands', code: 'NL' },
  { name: 'Malaysia', code: 'MY' }, { name: 'United Arab Emirates', code: 'AE' }, { name: 'Trinidad and Tobago', code: 'TT' },
];

export const dattaCharitram = [
  ['J0br6g-ltSQ', 'Datta Charitram · Episode 1'],
  ['bwJO5a-iTLg', 'Datta Charitram · Episode 2'],
  ['ADcfFAmkbes', 'Datta Charitram · Episode 3'],
  ['5c9BsO_BAx8', 'Datta Charitram · Episode 4'],
  ['AS1HfA6ZAmY', 'Datta Charitram · Episode 5'],
  ['04Zg-ALuN0g', 'Datta Charitram · Episode 6'],
  ['ZGR0gSpGphA', 'Datta Charitram · Episode 7'],
  ['A9RoyfXcAyE', 'Datta Charitram · Episode 8'],
  ['-q0bAHSPGsA', 'Datta Charitram · Episode 9'],
  ['qRCpMqrPd4Y', 'Datta Charitram · Episode 10'],
];

// Shuka Vana parrot "Varam" chanting the first line of the Hanuman Chalisa (linked from the Shuka Vana page).
export const varamVideo = ['waPXoqK8Oeo', 'Varam the parrot chants the first line of the Hanuman Chalisa'];
