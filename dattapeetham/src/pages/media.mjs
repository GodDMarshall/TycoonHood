// Media & Teachings — videos, audio, books, photographs, apps and channels.
// Sources (harvested 22 Oct 2026): dattapeetham.org/videos, /videos/albums,
// /photos, /photos/albums, /downloads, /articles (harvest/media--videos-photos-
// downloads-articles.md), /mobileapps, /page/view/social-media-pages,
// /page/view/dattapeetham-telecast-timing-of-sri-swamijis-programs,
// /page/view/literary-contributions, /page/view/bhajans-and-healing-music,
// /page/view/sri-swamiji, /page/view/awards-honors, /page/view/shuka-vana,
// /page/view/contribution-towards-nature, /page/view/sri-bala-swamiji,
// /page/view/adi-guru-dattatreya, /page/view/karya-siddhi-hanuman-temple,
// /page/view/nada-mantapa, /page/view/sri-swamijis-avatara-timeline,
// plus data.dattaCharitram, data.varamVideo, data.albums, data.apps and data.photos.
// Every YouTube id below appears in one of those sources.

import { pageHero, sectionHead, stats, gallery, video, ctaBand, btn, img, icon, scrollLit, esc } from '../components.mjs';
import { site, links, OFFICIAL, PAGE_IMG } from '../site.mjs';
import { photos, albums, apps, dattaCharitram, varamVideo } from '../data.mjs';

const P = {
  sydney: `${PAGE_IMG}517/517_3c24d6f6884e527e.jpg`,
  mantapaStage: `${PAGE_IMG}506/506_9de9699b3a272279.jpg`,
  padayatra: `${PAGE_IMG}523/523_d72e3bd45e536b33.jpg`,
  balaPortrait: `${PAGE_IMG}523/523_e0e53980acae1f62.jpg`,
  dattaShrine: `${PAGE_IMG}525/525_8898ed676f2abba2.jpg`,
};

const EXT = {
  bhajans: `${OFFICIAL}/page/view/bhajans-and-healing-music`,
  bhajanmala: 'https://www.bhajanmala.com/',
  spotify: 'https://open.spotify.com/artist/3VCEvO2NgnGTyWqG4zgEBU',
  apple: 'https://music.apple.com/in/artist/sri-ganapathy-sachchidananda-swamiji/418448608',
  ragaRagini: 'https://ragaraginistore.com/',
  literary: `${OFFICIAL}/page/view/literary-contributions`,
  videoAlbums: `${OFFICIAL}/videos/albums`,
  photoAlbums: `${OFFICIAL}/photos/albums`,
  social: `${OFFICIAL}/page/view/social-media-pages`,
  tv: `${OFFICIAL}/page/view/dattapeetham-telecast-timing-of-sri-swamijis-programs`,
  chalisaForm: `${OFFICIAL}/hanuman-chalisa-form`,
  releases: `${OFFICIAL}/releases`,
};

const yt = (id) => `https://www.youtube.com/watch?v=${id}`;
const DL = (f) => `https://dattapeetham.s3.amazonaws.com/content/downloads/dattapeetham_${f}`;

// ---------------------------------------------------------------- videos
// Posters are the Peetham's own photographs of each film's subject (the S3
// images load everywhere; YouTube thumbnails are letterboxed and low-res).
const films = [
  { id: 'DW0ebzb8vs4', title: 'Sri Swamiji Unveiled', tag: 'Sri Swamiji', poster: photos.swamiji, pos: '50% 26%',
    text: 'Sri Swamiji reaches people through public programmes, house visits, television, radio, books, CDs and DVDs. This film is shared on his life story at dattapeetham.org.' },
  { id: 'vtIGDzCp0-M', title: 'Australia Naada Sagara', tag: 'Healing music · 2015', poster: P.sydney, pos: '50% 50%',
    text: 'The largest music therapy lesson: 1,814 people, led by Sri Swamiji at the Sydney Opera House on 6 April 2015. The lesson lasted two and a half hours.' },
  { id: dattaCharitram[0][0], title: dattaCharitram[0][1], tag: 'Discourse · Telugu', poster: P.dattaShrine, pos: '50% 34%',
    text: 'The first of Sri Swamiji’s discourses on Datta Charitram, in Telugu. All ten episodes are listed below the films.' },
  { id: '8C9eOM4zEcU', title: 'The amazing Vana of Shuka Vana', tag: 'Shuka Vana · 4:41', poster: photos.shukaVanaAviary, pos: '50% 50%',
    text: 'Founded by Sri Swamiji in 2012, Shuka Vana houses around 2,100 birds of 486 species beneath an aviary that spans an entire acre.' },
  // Page-local title: data.varamVideo's says "chants the Hanuman Chalisa"; the source says the first line.
  { id: varamVideo[0], title: 'Varam the parrot chants the Hanuman Chalisa’s first line', tag: 'Shuka Vana', poster: photos.shukaVana2, pos: '50% 30%',
    text: 'Varam, the Double Yellow-headed Amazon from Shuka Vana, chants the first line of the Hanuman Chalisa with devotion.' },
  { id: 'jI2j6_HzXb0', title: 'Hanuman Chalisa Parayana by Sri Swamiji (40 times)', tag: 'Parayana', poster: photos.hanumanStatue, pos: '50% 18%',
    text: 'Recite the Hanuman Chalisa with Sri Swamiji, forty times over, then submit your own parayana count to the Peetham.',
    extra: ['Submit your parayana count', EXT.chalisaForm] },
  { id: 'bXM2CqyWqYI', title: 'Glimpses of Nada Mantapa’s construction', tag: 'Nada Mantapa', poster: P.mantapaStage, pos: '50% 55%',
    text: 'Nada Mantapa, the Hall of Musical Tones, was inaugurated at the Mysuru Ashram in 1998.' },
  { id: 'qeJkslqX1_M', title: 'Sri Swamiji with birds & animals', tag: 'Nature', poster: photos.shukaVana1, pos: '50% 32%',
    text: 'Sri Swamiji has always had a natural affinity for birds and animals, likely rooted in Mekedatu, his birthplace in the heart of a jungle.' },
  { id: 'M6fbylP97_s', title: 'Mekedatu Padayatra', tag: 'Sri Bala Swamiji', poster: P.padayatra, pos: '50% 45%',
    text: 'A six-day Vishwashanti Padayatra for world peace and harmony, led by Sri Bala Swamiji from Mekedatu, Sri Swamiji’s birthplace, to the Mysuru Ashram.' },
  { id: 'V--Wpwq21Ao', title: 'Ganga Stotram', tag: 'Sri Bala Swamiji', poster: P.balaPortrait, pos: '50% 20%',
    text: 'Composed and sung by Sri Bala Swamiji, a singer-lyricist with compositions in Sanskrit, Telugu, Kannada, Tamil and English.' },
];

// Datta Charitram episodes 1–10 (data.mjs, from the Guru Parampara and Adi Guru source pages).
const episodes = [...dattaCharitram];
const epData = { tag: 'Discourse · Telugu', poster: P.dattaShrine, pos: '50% 34%' };

// Official video albums on dattapeetham.org/videos/albums, largest first.
const videoAlbums = [
  ['Puttugam', 2413, 4], ['Collection', 599, 8], ['SGS Birds', 299, 1], ['Bhakti Mala', 92, 3],
  ['Puttugam Sri', 33, 5], ['Datta Peetham', 28, 2], ['SGS Raga Sagara', 14, 7], ['SGS Hanuman Chalisa', 8, 6],
];

const pad = (n) => String(n).padStart(2, '0');
const fmt = (n) => n.toLocaleString('en-IN');

function reelAttrs(f) {
  return ` data-reel-item data-index="${f.index || ''}" data-id="${f.id}" data-title="${esc(f.title)}" data-tag="${esc(f.tag)}" data-text="${esc(f.text || '')}" data-poster="${f.poster}" data-pos="${f.pos || ''}"${f.extra ? ` data-extra="${esc(f.extra[0])}" data-extra-href="${f.extra[1]}"` : ''}`;
}

function reel() {
  const f = films[0];
  const player = video({ id: f.id, title: f.title, thumb: f.poster }).replace('<img ', `<img style="object-position:${f.pos}" `);
  return `<div class="reel" data-reel>
  <div class="reel-stage" id="reel-stage">
    <div class="reel-screen" data-reveal="scale">${player}</div>
    <div class="reel-info glass" data-reveal="up">
      <p class="reel-now"><span class="reel-dot" aria-hidden="true"></span>Now showing <span class="reel-count"><b data-reel-index>01</b> / ${pad(films.length)}</span></p>
      <div aria-live="polite" aria-atomic="true">
        <span class="tag tag-light" data-reel-tag>${f.tag}</span>
        <h3 data-reel-title>${f.title}</h3>
        <p data-reel-text>${f.text}</p>
      </div>
      <div class="reel-actions">
        <a class="link-arrow" data-reel-link href="${yt(f.id)}">Watch on YouTube ${icon('external', 15)}</a>
        <a class="link-arrow" data-reel-extra href="#videos" hidden></a>
      </div>
    </div>
  </div>
  <div class="reel-bar">
    <p class="eyebrow">Ten films<span class="hide-sm"> · choose one to play above</span></p>
    <div class="reel-nav">
      <button type="button" class="reel-btn" data-reel-prev aria-label="Scroll films back">${icon('arrow-left', 18)}</button>
      <button type="button" class="reel-btn" data-reel-next aria-label="Scroll films forward">${icon('arrow', 18)}</button>
    </div>
  </div>
  <ul class="reel-rail" data-reel-rail>
    ${films.map((v, i) => `<li><a class="reel-thumb" href="${yt(v.id)}"${reelAttrs({ ...v, index: pad(i + 1) })}${i === 0 ? ' aria-current="true"' : ''}>
      <span class="rt-media">${img(v.poster, '', { pos: v.pos })}<span class="rt-play" aria-hidden="true">${icon('play', 14)}</span><span class="rt-num" aria-hidden="true">${pad(i + 1)}</span></span>
      <span class="rt-tag">${v.tag}</span>
      <span class="rt-title">${v.title}</span>
    </a></li>`).join('')}
  </ul>
</div>`;
}

function series() {
  return `<div class="series" data-reveal="up">
  <figure class="series-art">${img(P.dattaShrine, 'Lord Dattatreya at his shrine, adorned with garlands and silks', { pos: '50% 34%' })}</figure>
  <span class="tag tag-light">Discourse series · Telugu</span>
  <h3>Datta Charitram</h3>
  <p>Discourses by Sri Swamiji on “Datta Charitram” in the Telugu language, shared on the Peetham’s page about Adi Guru Dattatreya. Each episode plays in the screen above.</p>
  <ol class="ep-grid">
    ${episodes.map(([id, title], i) => `<li><a class="ep" href="${yt(id)}"${reelAttrs({ id, title, ...epData, index: pad(i + 1), text: `Episode ${i + 1} of Sri Swamiji’s discourses on Datta Charitram, in Telugu.` })}>
      <span class="ep-num">${pad(i + 1)}</span><span class="ep-label">Episode</span><span class="ep-play" aria-hidden="true">${icon('play', 12)}</span>
    </a></li>`).join('')}
  </ol>
</div>`;
}

function archive() {
  return `<div class="archive" data-reveal="up">
  <span class="tag tag-light">The official archive</span>
  <h3>Video albums</h3>
  <p>The Peetham’s own collection: 515 YouTube videos and 2,971 on Vimeo, gathered into albums at dattapeetham.org.</p>
  <ul class="ledger">
    ${videoAlbums.map(([name, n, id]) => `<li><a href="${OFFICIAL}/videos/albums/${id}"><span class="lg-name">${name}</span><span class="lg-rule" aria-hidden="true"></span><span class="lg-count">${fmt(n)} <small>videos</small></span>${icon('arrow-up-right', 15)}</a></li>`).join('')}
  </ul>
  <div class="btn-row">
    ${btn('All videos', links.videos, 'ghost', 'external')}
    ${btn('YouTube channel', links.youtube, 'ghost', 'yt')}
  </div>
</div>`;
}

// ---------------------------------------------------------------- audio
const chant = {
  title: '108 – Om Aim Hreem Shreem Shiva Rama Anagha Dattaaya Namaha',
  src: DL('64f7837c2bc8b158.mp3'),
  size: '14.59 MB',
};

// Deterministic waveform: a sum of sines, no randomness, so every build matches.
function waveBars(n = 64) {
  const bars = [];
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    const env = 0.35 + 0.65 * Math.sin(Math.PI * x);
    const v = 0.5 + 0.28 * Math.sin(i * 0.9) + 0.16 * Math.sin(i * 2.3 + 1) + 0.08 * Math.sin(i * 5.1);
    bars.push(Math.max(0.14, Math.min(1, env * v + 0.12)).toFixed(2));
  }
  return bars;
}

function listeningRoom() {
  const bars = waveBars();
  const row = bars.map((h, i) => `<i style="--h:${h};--i:${i}"></i>`).join('');
  return `<div class="listen">
  <div class="chant" data-chant data-reveal="up">
    <svg class="chant-mandala" viewBox="0 0 104 104" aria-hidden="true"><use href="#i-mandala"/></svg>
    <span class="tag tag-light">Chant · from the downloads library</span>
    <h3 class="chant-title">${chant.title}</h3>
    <p class="chant-meta">MP3 · ${chant.size}</p>
    <audio class="chant-native" controls preload="none"><source src="${chant.src}" type="audio/mpeg">Your browser cannot play this audio; please download it below.</audio>
    <div class="chant-ui" data-chant-ui hidden>
      <button type="button" class="chant-play" data-chant-play aria-label="Play the chant">${icon('play', 24)}<span class="cp-pause" aria-hidden="true"><i></i><i></i></span></button>
      <div class="chant-track">
        <div class="chant-wave" aria-hidden="true"><span class="cw-base">${row}</span><span class="cw-fill">${row}</span></div>
        <input class="chant-seek" data-chant-seek type="range" min="0" max="1000" step="1" value="0" aria-label="Position in the chant">
        <p class="chant-time"><span data-chant-cur>0:00</span><span data-chant-dur>MP3</span></p>
      </div>
    </div>
    <a class="link-arrow chant-dl" href="${chant.src}" download>${icon('download', 16)} Download the MP3</a>
  </div>
  <div class="albums" data-reveal="up">
    <span class="tag">Raga Sagara · Music for Meditation &amp; Healing</span>
    <h3>Albums to stream</h3>
    <ul class="tracks">
      ${albums.map((a) => `<li class="track">
        <span class="track-cover">${img(a.img, `Album cover: ${a.name}`)}</span>
        <span class="track-body"><b>${a.name}</b><small>${a.venue}</small></span>
        <span class="track-links">
          <a href="${a.spotify}" aria-label="${esc(a.name)} on Spotify">${icon('spotify', 16)}<span>Spotify</span></a>
          <a href="${a.apple}" aria-label="${esc(a.name)} on Apple Music">${icon('apple', 16)}<span>Apple Music</span></a>
        </span>
      </li>`).join('')}
    </ul>
  </div>
</div>
<ul class="bhajan-links" data-stagger>
  ${[
    ['music', 'Bhajans & Healing Music', 'Sri Swamiji’s bhajans, on dattapeetham.org', EXT.bhajans],
    ['book', 'Bhajan lyrics', 'Words for singing along, at bhajanmala.com', EXT.bhajanmala],
    ['spotify', 'Sri Swamiji on Spotify', 'The full catalogue to stream', EXT.spotify],
    ['apple', 'Sri Swamiji on Apple Music', 'Albums on iTunes and Apple Music', EXT.apple],
  ].map(([ic, t, n, h]) => `<li><a class="bl" href="${h}"><span class="bl-icon">${icon(ic, 22)}</span><span class="bl-text"><b>${t}</b><small>${n}</small></span>${icon('arrow-up-right', 16)}</a></li>`).join('')}
</ul>
<p class="audio-more" data-reveal="up">How healing music works, the Raga Sagara concerts and the Nada Mantapa: <a class="link-arrow" href="music.html">Nada Chikitsa — Healing through Music ${icon('arrow', 15)}</a></p>`;
}

// ---------------------------------------------------------------- books
const issues = [
  ['English', 'April 2020', '922 KB', DL('7dc677bc5460b0e7799886b8dc7e1b68.pdf')],
  ['Kannada', 'April 2020', '1.13 MB', DL('30290dbb488012f1225492d91819274a.pdf')],
  ['Telugu', 'September 2020', '2.39 MB', DL('23de51034e127ec2.pdf')],
];

// A selection from the Peetham's list of 168 published titles.
const shelf = [
  ['Datta Speaks', 'English'], ['Sri Datta Darshanam', 'Telugu'], ['Reflections of the Absolute', 'English'],
  ['Raga Ragini Nada Yogam', 'English'], ['Sri Guru Gita', 'Marathi'], ['Fifty Golden Years With My Guru', 'English'],
  ['Kavacha Manjari', 'Kannada'], ['Tripura Rahasyam', 'Telugu'], ['The Mystery of Sri Chakra', 'English'],
  ['Sadguru Sapthashati', 'Hindi'], ['Yoga Darpana', 'English'], ['Datta Darshana', 'Gujarati'],
  ['Shiva Kathamrutha', 'Tamil'], ['Gomata', 'English'], ['My Bonsai', 'English'],
  ['Srimad Bhagavad-Gita Chanting Book', 'Sanskrit'],
];
const spineTones = ['forest', 'gold', 'ivory', 'deep', 'sand', 'forest3'];

const dlCategories = ['Anagha Vratam', 'Bhajana Yogam 1–4', 'Bhajans', 'Bhakti Mala', 'Chaturmasya', 'Datta Mala', 'Documents',
  'Dwadasa Sukthi Manjari', 'Healing Music', 'Invitations', 'Music', 'Photos', 'Prayers', 'Stotram', 'Videos'];
const featuredDownloads = [
  ['Anagha Vratam Pooja Vidhi · English', 'Anagha Vratam', '1.74 MB', DL('2ece08bd94aeb0b85ff5c287f253e49b.pdf')],
  ['Durga Stotram · English', 'Stotram', '535 KB', DL('3a34ef749796467a.pdf')],
  ['Datta Mala · 2019 Davos Edition', 'Datta Mala', '7.91 MB', DL('d2ef2c04ba7a235e.pdf')],
  ['Dwadasa Sukthi Manjari · Preface', 'Dwadasa Sukthi Manjari', '1.03 MB', DL('397d263d673906768517cec3b82345f8.pdf')],
];

function bhaktimala() {
  return `<div class="bhakti">
  <ul class="mag-stack" data-reveal="up" aria-label="Bhakti Mala issues to download">
    ${issues.map(([lang, month, size, href], i) => `<li class="mag mag-${i + 1}"><a href="${href}" aria-label="Bhakti Mala, ${lang}, ${month} (PDF, ${size})">
      <span class="mag-mast">Bhakti Mala</span>
      <span class="mag-sub">A Garland of Devotion</span>
      <svg class="mag-orn" viewBox="0 0 104 104" aria-hidden="true"><use href="#i-mandala"/></svg>
      <span class="mag-lang">${lang}</span>
      <span class="mag-month">${month}</span>
      <span class="mag-foot">${icon('download', 14)} PDF · ${size}</span>
    </a></li>`).join('')}
  </ul>
  <div class="bhakti-copy prose" data-reveal="up">
    <span class="tag">Monthly magazine · since 1976</span>
    <h3>Bhaktimala, a garland of devotion</h3>
    <p>The Peetham’s monthly magazine began in 1976 and is published in seven languages. Its name means “a Garland of Devotion”. Issues from 2020 in English, Kannada and Telugu are free to download.</p>
    <ul class="dl-list">
      ${issues.map(([lang, month, size, href]) => `<li><a href="${href}">${icon('download', 18)}<span><b>Bhakti Mala · ${lang} · ${month}</b><small>PDF · ${size}</small></span></a></li>`).join('')}
    </ul>
    <p class="small-print">The Bhakti Mala video album holds 92 films. <a href="${OFFICIAL}/videos/albums/3">Watch them on dattapeetham.org</a>.</p>
  </div>
</div>`;
}

function bookshelf() {
  return `<div class="books-shelf">
  <div class="shelf-head" data-reveal="up">
    <span class="tag">Literary works</span>
    <h3>Books from the Peetham</h3>
    <p>Besides composing keertanas and bhajans in many languages, Sri Swamiji has penned books on spirituality, chiefly in Telugu and Kannada. Scholars associated with the Peetham have translated his texts into other languages, and some have authored books of their own under its aegis. The Peetham lists 168 published titles in Kannada, Telugu, English, Hindi, Marathi, Tamil, Gujarati and Sanskrit.</p>
  </div>
  <div class="shelf-wrap" data-reveal="fade">
    <ul class="shelf" tabindex="0" aria-label="A selection of books published by Avadhoota Datta Peetham">
      ${shelf.map(([t, lang], i) => {
        const long = t.length > 19;
        return `<li class="spine sp-${spineTones[i % spineTones.length]}${long ? ' is-long' : ''}" style="--h:${(0.8 + 0.2 * Math.abs(Math.sin(i * 1.7))).toFixed(2)};--w:${long ? 64 : 44 + (i * 7) % 14}px"><span class="spine-title">${t}</span><span class="spine-lang">${lang}</span></li>`;
      }).join('')}
    </ul>
    <span class="shelf-plank" aria-hidden="true"></span>
  </div>
  <p class="shelf-note" data-reveal="up">Books are sold at the <b>Raga Ragini Book Store</b> in the Mysuru Ashram and some branches of the Peetham, and online.</p>
  <div class="btn-row shelf-actions" data-reveal="up">
    ${btn('Raga Ragini online store', EXT.ragaRagini, 'gold', 'external')}
    ${btn('The full list of titles', EXT.literary, 'line', 'arrow-up-right')}
  </div>
</div>`;
}

function downloads() {
  return `<div class="dl">
  <div class="dl-intro" data-reveal="up">
    <span class="tag">Downloads library</span>
    <h3>Free to read, print and share</h3>
    <p>Sixty-seven files on dattapeetham.org: puja vidhis, stotrams, invitations, music and back issues of Bhakti Mala, the Peetham’s magazine.</p>
    <ul class="dl-cats" aria-label="Download categories">${dlCategories.map((c) => `<li>${c}</li>`).join('')}</ul>
    ${btn('Browse all downloads', links.downloads, 'line', 'arrow-up-right')}
  </div>
  <ul class="dl-list dl-feature" data-stagger>
    ${featuredDownloads.map(([t, cat, size, href]) => `<li><a href="${href}">${icon('download', 18)}<span><b>${t}</b><small>${cat} · PDF · ${size}</small></span></a></li>`).join('')}
  </ul>
</div>`;
}

function articles() {
  return `<div class="articles" id="articles">
  <div class="articles-head" data-reveal="up">
    <span class="tag">Articles &amp; writings</span>
    <h3>Read the teachings</h3>
  </div>
  <div class="articles-grid">
    <a class="art-feature" href="${OFFICIAL}/articles/2026/8/4/america-panchaashat-nadee-jala-samarpana-to-sri-ganapathy-sachchidananda-swamiji-guru-purnima-2026" data-reveal="up">
      <span class="tag tag-light">Latest article · 4 Aug 2026</span>
      <b>America Panchaashat Nadee Jala Samarpana to Sri Ganapathy Sachchidananda Swamiji — Guru Purnima 2026</b>
      <span class="art-text">“As part of the Swarna USA Yatra 50th Anniversary celebrations, an extraordinary spiritual undertaking united the waters of sacred rivers, lakes, and waterways from across the United States…”</span>
      <span class="art-cta">Read the article ${icon('arrow-up-right', 15)}</span>
    </a>
    <ul class="art-links" data-stagger>
      ${[
        ['article', 'Articles', 'Cultural, religious and spiritual articles from His Holiness Sri Ganapathy Sachchidananda Swamiji.', links.articles],
        ['mic', 'Speeches', 'Speeches of Sri Swamiji and Sri Datta Vijayananda Teertha Swamiji: Datta Vaakya and Vijaya Vyakhya.', links.speeches],
        ['sun', 'Sri Swamiji Says', 'Daily messages of culture, religion and spirit from Sri Swamiji.', links.swamijiSays],
        ['lotus', 'Discourses & wisdom', 'The Peetham’s teachings, gathered on this site.', 'teachings.html'],
      ].map(([ic, t, n, h]) => `<li><a class="al" href="${h}"><span class="al-icon">${icon(ic, 20)}</span><span><b>${t}</b><small>${n}</small></span>${icon(/^https?:/.test(h) ? 'arrow-up-right' : 'arrow', 16)}</a></li>`).join('')}
    </ul>
  </div>
</div>`;
}

// ---------------------------------------------------------------- photos
const pictures = [
  [photos.hanumanStatue, 'A garlanded idol of Lord Hanuman at the Karya Siddhi Hanuman Temple', 'Karya Siddhi Hanuman'],
  [photos.shukaVana1, 'Sri Swamiji with black palm cockatoos perched on his arms and shoulders, white cockatoos on perches beside him', 'Sri Swamiji at Shuka Vana'],
  [photos.hariSannidhi, 'Salagramas arranged as Ananthanaga Shayana beneath a great serpent hood at Hari Sannidhi', 'Hari Sannidhi'],
  [photos.bonsai, 'A pagoda pavilion beside a pool among bonsai trees', 'Kishkindha Moolika Bonsai Garden'],
  [photos.medicalCamp, 'A doctor examines a boy at a free medical camp', 'Seva: a free medical camp'],
  [photos.lordDattatreya, 'Lord Dattatreya, adorned with garlands', 'Lord Dattatreya'],
  [photos.nadaMantapaInterior, 'Seen from the stage of Nada Mantapa: a full hall of devotees facing the performers', 'Nada Mantapa'],
  [photos.feedingCow, 'Sri Swamiji feeding a calf', 'Gau seva'],
  [photos.sdvt, 'Gopurams of the Sri Datta Venkateshwara Temple Complex', 'Sri Datta Venkateshwara Temple'],
  [photos.prayerHall, 'Devotees seated before Sri Swamiji in the Universal Prayer Hall', 'The Universal Prayer Hall'],
  [photos.rajarajeshwariSannidhi, 'Sri Swamiji worships Goddess Rajarajeshwari at her Sannidhi', 'Rajarajeshwari Sannidhi'],
  [photos.students, 'Senior students of the Veda Pathashala seated together', 'Veda Pathashala'],
  [photos.shukaVana2, 'Sri Swamiji smiling among green parrots at Shuka Vana', 'The parrots of Shuka Vana'],
  [photos.hospitalSeva, 'Staff and volunteers gathered beside a mobile cancer detection unit, a saffron-robed swami on its steps', 'Cancer detection camp'],
  [photos.kamadhenu, 'The long Goshala shed at the Mysuru Ashram', 'The Goshala'],
];

const photoAlbums = [
  ['DYC Canada', 23, 64, '5ee720afebbd6e36'],
  ['DYC Germany', 14, 62, '1269c3f481bde5b4'],
  ['DYC Switzerland', 10, 63, '91cca2607f238a22'],
  ['Proddatur Ashrama', 6, 34, '2de4d4104dae5c00'],
];

// ---------------------------------------------------------------- apps
const iPad = new Set(['Bhajan Mala', 'Guru Gita', 'Vishnu Sahasranamam', 'Lalita Sahasranama', 'SGS Bhagavad Gita', 'Kavacha Manjari', 'Shatashloki Ramayana']);

function mobile() {
  const dp = apps[0];
  return `<div class="mobile">
  <div class="phone-stage" data-reveal="scale">
    <span class="phone-ring r1" aria-hidden="true"></span><span class="phone-ring r2" aria-hidden="true"></span><span class="phone-ring r3" aria-hidden="true"></span>
    ${img(photos.appMockup, 'Two phones showing the Datta Peetham app: the sign-in screen and a page about Sri Ganapathy Sachchidananda Swamiji', { cls: 'phone-img', w: 600, h: 600 })}
  </div>
  <div class="mobile-copy" data-reveal="up">
    <span class="eyebrow">Mobile experience</span>
    <h2 data-split>The Peetham in your <span class="em-light">pocket</span></h2>
    <p class="lead">The official Datta Peetham app is on the App Store and Google Play. Beside it stands a family of apps from the Peetham, for chanting, scripture and practice.</p>
    <div class="dp-app">
      ${img(dp.icon, '', { cls: 'dp-icon', w: 72, h: 72 })}
      <span><b>Datta Peetham</b><small>Official app · iPhone and Android</small></span>
    </div>
    <div class="store-badges">
      <a href="${links.appStore}">${img(photos.appStoreBadge, 'Download on the App Store', { w: 421, h: 125 })}</a>
      <a href="${links.playStore}">${img(photos.playStoreBadge, 'Get it on Google Play', { w: 817, h: 242 })}</a>
    </div>
  </div>
</div>
<div class="apps-block">
  <div class="apps-head" data-reveal="up">
    <h3>Eighteen apps from the Peetham</h3>
    <p>Store links open Apple’s App Store; seven of the apps are also made for iPad. The Peetham keeps the full list at <a href="${links.mobileApps}">dattapeetham.org/mobileapps</a>.</p>
  </div>
  <ul class="app-grid" data-stagger>
    ${apps.map((a) => `<li><a class="app" href="${a.href}">
      <span class="app-icon">${img(a.icon, '', { w: 120, h: 120 })}</span>
      <b>${a.name}</b>
      <small>App Store${iPad.has(a.name) ? ' · iPad' : ''}</small>
    </a></li>`).join('')}
  </ul>
</div>`;
}

// ---------------------------------------------------------------- social & TV
const xIcon = '<svg class="ico" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.36 5.77L17.75 3Zm-1.08 16.2h1.7L7.42 4.72H5.6l11.07 14.48Z"/></svg>';

const channels = [
  { name: 'YouTube', ic: 'yt', items: [
    ['Avadhoota Datta Peetham', 'https://www.youtube.com/@DattaPeetham'],
    ['Sri Ganapathy Sachchidananda Swamiji', 'https://www.youtube.com/@sgsswamiji'],
    ['Gurubhavana ADPT', 'https://www.youtube.com/@gurubhavanaadpt'],
    ['SGS Birds', 'https://www.youtube.com/@sgsbirds'],
    ['SGS Kirtan', 'https://www.youtube.com/@SGSKirtan'],
    ['Veda Nidhi Avadhoota Datta Peetham', 'https://www.youtube.com/@vedanidhiavdhootadattapeet5519'],
    ['Puttugam Sri', 'https://www.youtube.com/@puttugamsri'],
    ['SGS Raga Sagara', 'https://www.youtube.com/@SGSRagaSagara'],
    ['Datta Kriya Yoga', 'https://www.youtube.com/@dattakriyayoga108'],
  ] },
  { name: 'Facebook', ic: 'fb', items: [
    ['Avadhoota Datta Peetham', 'https://www.facebook.com/sgspage'],
    ['Sri Ganapathy Sachchidananda Swamiji', 'https://www.facebook.com/SriSwamiji'],
    ['Guru Bhavana ADPT', 'https://www.facebook.com/gurubhavana.adpt'],
    ['Sgs Swamiji', 'https://www.facebook.com/swamijisgs'],
    ['SGS Veda Patha Shala', 'https://www.facebook.com/sgsvedapathashala'],
    ['SGS Birds · Shuka Vana', 'https://www.facebook.com/sgsbirds'],
    ['SGS Bonsai Museum', 'https://www.facebook.com/sgs.bonsai.museum'],
    ['Puttu Gam', 'https://www.facebook.com/PuttuGamPage'],
    ['Sgs Ashrama Jayalakshmipuram', 'https://www.facebook.com/jayalakshmipuramsgsashrama'],
    ['Raga Sagara · Music for Meditation and Healing', 'https://www.facebook.com/RagaSagara'],
    ['PuttuGam RagaSagara', 'https://www.facebook.com/NadaRagaYogaSangeeta'],
    ['Bhaktimala Datta Peetham', 'https://www.facebook.com/bhaktimala'],
    ['Datta Vijayam', 'https://www.facebook.com/p/Datta-Vijayam-%E0%A4%A6%E0%A4%A4%E0%A5%8D%E0%A4%A4-%E0%A4%B5%E0%A4%BF%E0%A4%9C%E0%A4%AF%E0%A4%AE%E0%A5%8D-%E0%B0%A6%E0%B0%A4%E0%B1%8D%E0%B0%A4-%E0%B0%B5%E0%B0%BF%E0%B0%9C%E0%B0%AF%E0%B0%82-%E0%B2%A6%E0%B2%A4%E0%B3%8D%E0%B2%A4%E0%B2%B5%E0%B2%BF%E0%B2%9C%E0%B2%AF%E0%B2%AE%E0%B3%8D-'],
    ['Datta Kriya Yoga', 'https://www.facebook.com/DattaKriyaYogaPage/'],
  ] },
  { name: 'Instagram', ic: 'ig', items: [
    ['sgsswamiji', 'https://www.instagram.com/sgsswamiji/'],
    ['dattapeetham', 'https://www.instagram.com/dattapeetham/'],
    ['Shuka Vana · sgsbirds', 'https://www.instagram.com/sgsbirds/'],
    ['bonsaisgs', 'https://www.instagram.com/bonsaisgs/'],
    ['simple_good_sayings', 'https://www.instagram.com/simple_good_sayings/'],
    ['sgsragasagara', 'https://www.instagram.com/sgsragasagara/'],
    ['dkycanada', 'https://www.instagram.com/dkycanada/'],
  ] },
  { name: 'X', ic: null, items: [
    ['Sri Ganapathy Sachchidananda Swamiji', 'https://x.com/SgsSwamiji'],
    ['Avadhoota Datta Peetham', 'https://x.com/dattapeetham'],
    ['SGS Birds', 'https://x.com/SGSBirds'],
    ['SGS Posts 日本版', 'https://x.com/posts_sgs'],
  ] },
];

function channelCard(c) {
  const first = c.items.slice(0, 4), rest = c.items.slice(4);
  const li = ([t, h]) => `<li><a href="${h}">${t}${icon('arrow-up-right', 13)}</a></li>`;
  return `<article class="channel ch-${c.name.toLowerCase()}">
  <header><span class="ch-icon">${c.ic ? icon(c.ic, 20) : xIcon}</span><h3>${c.name}</h3><span class="ch-count">${c.items.length} ${c.items.length === 1 ? 'page' : c.name === 'YouTube' ? 'channels' : c.name === 'X' ? 'handles' : c.name === 'Instagram' ? 'accounts' : 'pages'}</span></header>
  <ul>${first.map(li).join('')}</ul>
  ${rest.length ? `<details><summary>${rest.length} more ${icon('chev', 14)}</summary><ul>${rest.map(li).join('')}</ul></details>` : ''}
</article>`;
}

// Telecast timings as published (no time zone is given; these are Indian channels). Sorted by time of day.
const telecasts = [
  [340, '5:40 AM', 'Sakshi TV', 'Telugu'],
  [370, '6:10 AM', 'ETV', 'Telugu'],
  [405, '6:45 AM', 'Suvarna News', 'Kannada'],
  [1200, '8:00 PM', 'SVBC', 'Kannada'],
  [1300, '9:40 PM', 'Aastha', 'Hindi'],
];

function tvPanel() {
  return `<aside class="tv panel-dark" data-tv data-reveal="up" aria-labelledby="tv-title">
  <span class="tag tag-light">On television</span>
  <h3 id="tv-title">Sri Swamiji’s programmes on TV</h3>
  <div class="tv-band" aria-hidden="true">
    <span class="tv-line"></span>
    ${telecasts.map(([m, t]) => `<span class="tv-mark" style="--x:${(m / 1440).toFixed(4)}" title="${t}"></span>`).join('')}
    <span class="tv-now" data-tv-now hidden><span class="tv-now-label">Now <b data-clock></b></span></span>
    <span class="tv-hours"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span></span>
  </div>
  <ol class="tv-list">
    ${telecasts.map(([, t, ch, lang]) => `<li><time>${t}</time><span><b>${ch}</b><small>${lang}</small></span></li>`).join('')}
  </ol>
  <p class="tv-note">Timings as listed by the Peetham, which gives no time zone; these are Indian channels, and the marker shows the current time in India. Schedules can change; please check with the channel. <a href="${EXT.tv}">Source: TV timings on dattapeetham.org</a></p>
</aside>`;
}

// ---------------------------------------------------------------- page
export default {
  slug: 'media',
  file: 'media.html',
  title: 'Media & Teachings',
  crumb: 'Media',
  nav: 'Media',
  description: 'Watch Sri Swamiji’s discourses and films, stream Raga Sagara albums, read Bhaktimala and his books, browse Ashram photographs and get the Datta Peetham apps.',
  image: photos.balaSwamijiSpeech,
  preload: photos.balaSwamijiSpeech,
  css: true,
  scripts: ['media'],
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Media & Teachings',
      url: `${site.origin}/media.html`,
      about: { '@type': 'Organization', name: 'Avadhoota Datta Peetham' },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: films.map((f, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: { '@type': 'VideoObject', name: f.title, description: f.text, thumbnailUrl: f.poster, embedUrl: `https://www.youtube-nocookie.com/embed/${f.id}`, url: yt(f.id) },
        })),
      },
    },
  ],
  render: () => `
${pageHero({
  eyebrow: 'Watch · Listen · Read',
  title: 'Media &amp; <span class="em-light">Teachings</span>',
  lead: 'Discourses and films, healing music and bhajans, books, photographs and apps from Avadhoota Datta Peetham, gathered in one place.',
  image: photos.balaSwamijiSpeech,
  pos: '72% 30%',
  crumb: 'Media',
  tiles: [
    { icon: 'video', title: 'Videos', note: 'Discourses & films', href: '#videos' },
    { icon: 'headphones', title: 'Audios', note: 'Albums & bhajans', href: '#audio' },
    { icon: 'book', title: 'Books', note: 'Bhaktimala & books', href: '#books' },
    { icon: 'photo', title: 'Photos', note: 'Temples & seva', href: '#photos' },
    { icon: 'article', title: 'Articles', note: 'Writings & speeches', href: '#articles' },
    { icon: 'mobile', title: 'Apps', note: '18 Peetham apps', href: '#apps' },
  ],
})}

<section class="section media-intro" id="overview" aria-labelledby="overview-title">
  <div class="wrap">
    <h2 class="visually-hidden" id="overview-title">The Peetham’s media at a glance</h2>
    ${scrollLit('Sri Swamiji teaches and heals through *music,* speeches, stories, jokes and *poems.*')}
    <p class="lit-source" data-reveal="up">From the life of Sri Ganapathy Sachchidananda Swamiji · dattapeetham.org</p>
    <div class="intro-stats" data-reveal="up">
      ${stats([['515', 'Videos on YouTube'], ['2,971', 'Videos on Vimeo'], ['980', 'Photographs'], ['67', 'Free downloads'], ['18', 'Peetham apps']])}
      <p class="stats-note">Counts from the Peetham’s official archive at dattapeetham.org, October 2026.</p>
    </div>
  </div>
</section>

<section class="section section-dark media-videos grain" id="videos">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Immersive visual experience', title: 'Watch the <span class="em-light">living</span> tradition', lead: 'Discourses, healing music and the birds of Shuka Vana, as shared on dattapeetham.org. Choose a film and it plays right here.', light: true })}
    ${reel()}
    <div class="videos-more">
      ${series()}
      ${archive()}
    </div>
  </div>
</section>

<section class="section section-sand media-audio" id="audio">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Audio & music', title: 'Listen in <span class="em-light">stillness</span>', lead: 'Sri Swamiji has composed more than 3,000 bhajans in Sanskrit, Kannada, Telugu, Tamil, Marathi, Gujarati, Hindi and English. Begin with a chant, or stream the Raga Sagara albums.' })}
    ${listeningRoom()}
  </div>
</section>

<section class="section section-paper media-books" id="books">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Books, magazine & downloads', title: 'Words to <span class="em-light">carry</span> home', lead: 'Sri Swamiji reaches people through books and the monthly Bhaktimala as well as through music. Read them in print, as free downloads, or in the Peetham’s articles and speeches.' })}
    ${bhaktimala()}
    ${bookshelf()}
    ${downloads()}
    ${articles()}
  </div>
</section>

<section class="section media-photos" id="photos">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Photographs', title: 'Darshan in <span class="em-light">pictures</span>', lead: 'Temples, gardens and the seva of the Peetham. Select any photograph to see it full size.' })}
    ${gallery(pictures, 'media-gallery')}
    <div class="photo-albums">
      <div class="pa-head" data-reveal="up">
        <h3>Official photo albums</h3>
        <p>The Peetham’s archive holds 980 photographs, with albums from its centres in Canada, Germany and Switzerland and the Proddatur Ashrama.</p>
      </div>
      <ul class="pa-grid" data-stagger>
        ${photoAlbums.map(([name, n, id, hash]) => `<li><a class="pa" href="${OFFICIAL}/photos/albums/${id}">
          <span class="pa-img">${img(`https://dattapeetham.s3.amazonaws.com/content/photos/${id}/album_image_${id}_${hash}.jpg`, `Cover of the ${name} photo album`)}</span>
          <span class="pa-body"><b>${name}</b><small>${n} photos</small></span>
        </a></li>`).join('')}
      </ul>
      <div class="btn-row pa-actions" data-reveal="up">
        ${btn('Browse 980 photos', links.photos, 'gold', 'external')}
        ${btn('All photo albums', EXT.photoAlbums, 'line', 'arrow-up-right')}
      </div>
    </div>
  </div>
</section>

<section class="section section-dark media-apps" id="apps">
  <div class="wrap">
    ${mobile()}
  </div>
</section>

<section class="section media-social" id="social">
  <div class="wrap">
    ${sectionHead({ eyebrow: 'Stay connected', title: 'Follow, subscribe, <span class="em-light">tune in</span>', lead: 'The Peetham’s official pages and channels, and the television timings of Sri Swamiji’s programmes.' })}
    <div class="social-grid">
      <div class="channels" data-stagger>${channels.map(channelCard).join('')}</div>
      ${tvPanel()}
    </div>
    <p class="social-source" data-reveal="up">Listed on the Peetham’s <a href="${EXT.social}">Social Media Pages</a>.</p>
  </div>
</section>

${ctaBand({
  title: 'Never miss a <span class="em-light">programme</span>',
  text: 'Subscribe to notifications from the Peetham, or keep the Ashram close with the Datta Peetham app.',
  actions: `${btn('Subscribe for notifications', links.subscribe, 'gold', 'arrow-up-right')}${btn('Get the app', '#apps', 'ghost', 'mobile')}`,
  image: P.mantapaStage,
})}
`,
};
