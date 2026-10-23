# Tamil (தமிழ்) site: notes for the native reviewer

The Tamil site lives at `/ta/`. It was translated in six parallel machine-assisted passes, each
one sixth of the site (the "translators" in this note; they are not six people), and no fluent
speaker has reviewed it yet: that is your review. One
editorial pass then made names, terms and UI labels consistent across all pages, translated the
English segments that changed after the first pass, and checked every page in a browser at desktop
(1440 px) and phone (390 px) width. This note lists what was decided, what only the Ashram can
confirm, and where to start reading.

The rules are in `src/i18n/glossary/ta.md` (style guide) and `src/i18n/glossary/ta.json` (about
890 fixed spellings). Section 10 of the style guide records the decisions from the editorial pass.

**State at hand-over:** all 4,585 English segments have a Tamil translation. `node tools/i18n-check.mjs ta`
reports 0 problems. No page shows raw placeholders, and no page scrolls sideways on a phone.

## (a) Key spelling decisions

The six translators followed the glossary closely. The editorial pass found almost no spelling
variants of the main names. Each name below has one form throughout the site.

| English | தமிழ் | Note |
|---|---|---|
| Avadhoota Datta Peetham / Datta Peetham | அவதூத தத்த பீடம் / தத்த பீடம் | பீடத்தின், பீடத்தில். In compounds: தத்த பீடச் செயலி. |
| Ashram / Ashrama | ஆசிரமம் | ஆசிரமத்தில், ஆசிரமச் சிறப்பிடங்கள். |
| Sri Ganapathy Sachchidananda Swamiji | ஸ்ரீ கணபதி சச்சிதானந்த ஸ்வாமிஜி | ஸ்வாமிஜி, never சுவாமிஜி. His Holiness → பரம பூஜ்ய. |
| Sri Swamiji | ஸ்ரீ ஸ்வாமிஜி | In sentences: ஸ்ரீ ஸ்வாமிஜி அவர்கள் … -ஆர்கள். |
| Sri Bala Swamiji / Sri Datta Vijayananda Teertha Swamiji | ஸ்ரீ பால ஸ்வாமிஜி / ஸ்ரீ தத்த விஜயானந்த தீர்த்த ஸ்வாமிஜி | Junior Pontiff → இளைய பீடாதிபதி. |
| Sri Jayalakshmi Maata | ஸ்ரீ ஜயலக்ஷ்மி மாதா | ஜய, not ஜெய (ஜெயந்தி is kept only in festival names). |
| Sri Swamiji's father | நரசிம்ம சாஸ்திரி, later ஸ்ரீ நரஹரி தீர்த்த ஸ்வாமி | Takes the honorific -ஆர்கள், as he is in the Guru Parampara (ஸ்ரீ நரஹரீஸ்வர ஸ்வாமி). |
| Lord Dattatreya / Datta (deity) | பகவான் தத்தாத்ரேயர் / தத்தர் | Inside compounds: தத்த (தத்த கிரியா யோகா). |
| Kaalaagni Shamana Dattatreya | காலாக்னி சமன தத்தாத்ரேயர் | |
| main / presiding deity, "Moola virat" | மூலவர் | One word everywhere. Before, the site also had மூல தெய்வம், பிரதான தெய்வம் and மூலவிராட். |
| Karya Siddhi Hanuman | காரிய சித்தி ஹனுமான் | |
| Sri Datta Venkateshwara (Temple) | ஸ்ரீ தத்த வெங்கடேஸ்வரர் (கோயில்) | The Kshetra name keeps the stem: ஸ்ரீ தத்த வெங்கடேஸ்வர க்ஷேத்திரம். |
| Rajarajeshwari | ராஜராஜேஸ்வரி (அம்பாள்) | |
| Shuka Vana / Nada Mantapa | சுக வனம் / நாத மண்டபம் | |
| Vishwam Museum / Kishkindha Moolika Bonsai Garden | விஸ்வம் அருங்காட்சியகம் / கிஷ்கிந்தா மூலிகா போன்சாய் தோட்டம் | |
| Universal Prayer Hall | உலகப் பிரார்த்தனை மண்டபம் | The name is translated, not transliterated. |
| Datta Kriya Yoga / Nada Chikitsa / Raga Sagara | தத்த கிரியா யோகா / நாத சிகிச்சை / ராக சாகர | Classical paths take யோகம் (கர்ம யோகம், ராஜ யோகம்). Brand names keep யோகா. |
| Mysuru / Mysore / Mekedatu | மைசூரு / மைசூர் / மேகதாது | மைசூர் only where the English writes "Mysore" (hotel names, banners). |
| darshan · seva · puja · homa · abhisheka · aarti | தரிசனம் · சேவை · பூஜை · ஹோமம் · அபிஷேகம் · ஆரத்தி | satsang → சத்சங்கம், bhajan → பஜனை. |
| Datta Jayanti / Guru Purnima | தத்த ஜெயந்தி / குரு பூர்ணிமா | Lunar months are transliterated (சைத்ர … பால்குன). They are never replaced by the Tamil solar months. |
| Acronyms | எஸ்.ஜி.எஸ்., எஸ்.டி.எச்.எஸ்., டி.கே.ஒய்.ஐ.சி. | The letter H is always எச் (எச்.டி.ஒய்.சி., கே.எஸ்.எச்.டி., பி.எச்.இ.எல்., எச். வி. பிரசாத்). |

**Register.** Readers are addressed as நீங்கள். The Swamijis, Sri Jayalakshmi Maata and the human
Gurus take அவர்கள் with -ஆர்கள் verbs. Deities take -ஆர் (எழுந்தருளியுள்ளார், அருள்பாலிக்கிறார்).

**UI labels.** Each English label has one Tamil form on every page: நன்கொடை (Donate), பூஜை முன்பதிவு
(Book a Puja), உங்கள் வருகையைத் திட்டமிடுங்கள் (Plan your visit), நேரலை (Live streams), தொடர்புக்கு
(Contact), உள்நுழை (Sign in), இப்பணிக்கு ஆதரவளியுங்கள் (Support the mission), மேலும் படிக்க (Read more).
The status pill reads திறந்துள்ளது / மூடியுள்ளது. The longer forms did not fit on a phone.

**Times.** The part of the day goes before the digits: காலை 6:00 – மதியம் 12:00 · மாலை 4 – இரவு 8.
There is one exception. The 5:40 AM TV slot is written காலை 5:40 because அதிகாலை does not fit the
narrow time column.

**Short words in narrow places.** Some single long words broke in the middle on a phone. A few
headings were therefore reworded with shorter words, keeping the same meaning: மைசூரு முதல் உலகம் வரை,
ஆசிரமத்துடன் தொடர்பு கொள்ளுங்கள், மனித குலத்தை மேலும் விழிப்புமிக்க, கருணைமிக்க உலகை நோக்கி…, இந்தப் பாதை
வேறு இடம் செல்கிறது. If you change these headings, please keep the words short.

**Kept in Latin script:** brand, platform and channel names (YouTube, Spotify, App Store, Sakshi TV,
ETV, SVBC, Aastha), app names as listed in the stores (SGS Panchangam, Walk Mantra, Datta Peetham …),
handles, URLs and emails, books with English titles (Datta Speaks, Reflections of the Absolute …),
and the country-code badges (US, UK …).

## (b) Questions only the Ashram can answer

Each item lists the English, the Tamil now on the site, and the alternative.

| # | English | Now on the site | Alternative / question |
|---|---|---|---|
| 1 | Swamiji (all names) | ஸ்வாமிஜி | சுவாமிஜி is also common in Tamil print. Which does the Peetham use in its Tamil material? |
| 2 | Sri Jayalakshmi Maata | ஸ்ரீ ஜயலக்ஷ்மி மாதா | ஜெயலட்சுமி / ஜயலட்சுமி? |
| 3 | Universal Prayer Hall | உலகப் பிரார்த்தனை மண்டபம் (translated) | A transliteration (யூனிவர்சல் பிரேயர் ஹால்), if the Ashram uses the English name as a proper name. |
| 4 | Jaya Guru Datta (greeting) vs Datta Jayanti | ஜய குரு தத்த / தத்த ஜெயந்தி | Should the greeting also be ஜெய குரு தத்த? |
| 5 | Moola virat | மூலவர் | மூல விராட், if the Peetham wants its own term kept. |
| 6 | Andhra and Karnataka town names: Proddatur, Akividu, Nuzvid, Gandigunta, Pithapuram, Ganagapura, Ongole, Vuyyuru, Dundigal | ப்ரொத்துட்டூர், ஆகிவீடு, நூஜிவீடு, கண்டிகுண்டா, பிட்டாபுரம், காணகாபுரம், ஒங்கோல், உய்யூரு, துண்டிகல் | These are transliterations by sound. Please confirm them. Alternatives to consider: பிட்டாபுரம் or பீட்டாபுரம், காணகாபுரம் or கங்காபுரம், ஒங்கோல் or ஓங்கோல். |
| 7 | "Krishnaraja Raga Sagara" (address of Sri Raghavendra Paduka Kshetra, K R Nagar) | கிருஷ்ணராஜ ராக சாகர | It looks like a slip for Krishnarajanagara (கிருஷ்ணராஜநகர்). The English source needs correcting first. |
| 8 | Guru Gita verse "Gukaarassyaad gunaateeto …" | குகாரஸ்ஸ்யாத் குணாதீதோ ரூபாதீதோ ருகாரக: | It follows the English spelling. The common printed reading is गुकारश्च … (குகாரஶ்ச). Which reading should we use? |
| 9 | Kriya Yoga prayers: "pārvāti", "dhratavidhitanum", "konacakrani", "rupini", "purnām" | பார்வாதி, த்ரதவிதிதனும், கோணசக்ராணி, ரூபிணி, பூர்ணாம் | Apparent slips in the source were kept syllable by syllable. Please check these lines against the Ashram's printed text. |
| 10 | The twelve Datta Rameshwaram wells (Audumbara, Amalaka, Nirvindhya …) | ஔதும்பர, ஆமலக, நிர்விந்த்ய … (stem forms) | Should they take -தீர்த்தம் or the neuter -ம் endings? |
| 11 | Film title "Sri Swamiji Unveiled" | ஸ்ரீ ஸ்வாமிஜி — ஓர் அறிமுகம் | It reads "an introduction" and is not literal. Is there an official Tamil title? |
| 12 | Conference "Sound, then Truth"; book "Sadguru Sookti Sangraha" | “ஒலி, பின்னர் சத்தியம்”; சத்குரு சூக்தி சங்கிரஹம் | Keep translated, or use the English title? |
| 13 | Social-media display names (Gurubhavana ADPT, SGS Kirtan, PuttuGam RagaSagara …) | Written in Tamil script (குருபவனா ஏ.டி.பி.டி. …). Handles stay Latin. | Keep them in Latin like the app names, so that visitors can find them on YouTube? |
| 14 | Bhaktimala app | பக்திமாலா செயலி | The other app names stay Latin. Should this one be "Bhaktimala" too? |
| 15 | Quote "Bhajans heal the mind and bhajan (food) heals body" | … போஜனம் (உணவு) உடலைக் குணப்படுத்துகிறது | It is read as "bhojan". Please confirm. The same wording is on dattapeetham.org. |
| 16 | 'Sanskrit is not a language but a "Bhava"' | “பாவம்” — ஓர் உணர்வு | In Tamil, பாவம் can also mean "sin", so a gloss was added. Would பாவனை be better? |
| 17 | Fire Guru: "be undesirable" | ஆசையற்றவர் (desireless) | Please confirm the intended meaning. |
| 18 | Swara syllables Sa Ri Ga Ma Pa Da Ni | ஸ ரி க ம ப த நி | This is the usual Carnatic notation in Tamil. Please confirm. |
| 19 | Book titles with English wording (Datta Speaks, Eye Of Wisdom, Yoga Manual …) | Kept in English, followed by the Tamil language label | Keep them in English, or give a Tamil gloss? |
| 20 | Raga and concert names: Eeshanana, Puttu Gam Sri, Raga Saama, Antar Mukha, Krishnamrutha Raga Sagara | ஈஷானனா, புட்டு கம் ஸ்ரீ, ஸாம ராகம், அந்தர்முக / கிருஷ்ணாம்ருத ராக சாகர | Please confirm. |
| 21 | Overseas venues and towns (NOW Arena, Stadtcasino Basel, Hounslow, Fremont, KKL Luzern …) | Written in Tamil script (நவ் அரீனா, ஸ்டாட்காசினோ பாசல், ஹவுன்ஸ்லோ, ஃப்ரீமாண்ட், கே.கே.எல். லூசர்ன் …) | Spot-check them. Should venue names stay Latin? |

## (c) What to read first

1. **Sanskrit verses** (`kriya-yoga.html`): the Guru Paduka shloka, the Devi and Ganapati
   dhyana verses, and the concluding Bhagavad Gita dhyana shloka. Also the Guru Parampara prayer
   (`guru-parampara.html`), the Karya Siddhi Hanuman mantra (`darshan.html`), the Guru Gita lines
   (`teachings.html`) and *Lokah samastah sukhino bhavantu* (footer). These follow the verse letter
   map in style guide §4 (ś → ஶ, visarga → :). They are the most likely place for a slip.
2. **Quotations of Sri Swamiji**: the "Sri Swamiji says" rail and the glossary on `teachings.html`,
   and the quotes on `seva.html`, `sri-swamiji.html`, `about.html`, `index.html` and `music.html`.
   Several headings light up one word at a time (scroll-lit, one span per English word). The Tamil
   was reworded slightly so that every span holds a word. Please check that each one still says
   exactly what Sri Swamiji said, for example "நாம் செய்யும் மனிதகுலச் சேவையே நாம் செய்யும் இறைசேவை".
3. **Guinness World Record titles and dates**: `attractions.html` (Shuka Vana bird species,
   largest display of bonsai, Vishwam Museum stamp), `sri-swamiji.html` (awards), `music.html` and
   `seva.html`. Check that each record's wording and date match its certificate.
4. **Honorific register** in the long biography (`sri-swamiji.html`, Avatara timeline) and in
   `guru-parampara.html`, including the 24 Gurus of Dattatreya (Osprey → மீன்கொத்திப் பருந்து, Pingala).
5. **Timings** on `darshan.html` and `visit.html` (part of the day + time, IST).

## (d) How to change a translation

1. Find the English text in `src/i18n/ta/part-*.json`. Each file is `{ "<exact English>": "<Tamil>" }`.
   Change only the Tamil value. Never edit the English key. If a key is wrong, the English page
   has to change.
2. Keep every placeholder (`<1>…</1>`, `<2/>`) with the same numbers, every slot (`%1`, `%2`) and every
   run of digits exactly as in the English. Write Tamil script, and keep `&amp;` and `&nbsp;` as written.
3. Check, then build:
   ```
   node tools/i18n-check.mjs ta      # must say 0 problem(s)
   node build.mjs                    # rebuilds site/ta/; must report ta 0 rejected
   ```
   An entry that breaks a rule falls back to English on the page, and the checker names it.
4. If you change a name or term, change it everywhere, and update `src/i18n/glossary/ta.json`
   so that the next translator uses the same form.
