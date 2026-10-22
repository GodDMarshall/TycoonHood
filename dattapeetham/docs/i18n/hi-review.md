# Hindi (हिन्दी) translation: notes for the native reviewer

The Hindi site is built from the English pages and the dictionaries in `src/i18n/hi/part-*.json`. Six translators worked in parallel; a senior-editor pass then unified spellings and UI labels across all files (206 entries changed) and settled most of the translators' questions. This note lists the decisions already made, the questions only the Ashram can answer, and where to start reading.

The rules every translator followed are in `src/i18n/glossary/hi.md` (style guide) and `src/i18n/glossary/hi.json` (1,008 terms).

## 1. Key spelling decisions

### Brand, Swamijis and honorifics

| English | Hindi used everywhere | Note |
|---|---|---|
| Avadhoota Datta Peetham | अवधूत दत्त पीठम् | Short forms दत्त पीठम्, पीठम् (masculine: पीठम् का) |
| Sri Ganapathy Sachchidananda Swamiji | श्री गणपति सच्चिदानंद स्वामीजी | Swamiji always joined; never स्वामी जी |
| Sri Swamiji / Pujya Swamiji | श्री स्वामीजी / पूज्य स्वामीजी | |
| His Holiness | परम पूज्य | |
| Sri Datta Vijayananda Teertha Swamiji | श्री दत्त विजयानंद तीर्थ स्वामीजी | |
| Sri Bala Swamiji / Balaswamiji | श्री बाल स्वामीजी | Not बाला (reads as feminine) |
| Junior Pontiff / Peethadhipati | कनिष्ठ पीठाधिपति / पीठाधिपति | |
| Sri Jayalakshmi Maata | श्री जयलक्ष्मी माता | |
| Lord Dattatreya / Adi Guru | भगवान दत्तात्रेय / आदि गुरु | |
| Sripada Vallabha · Narasimha Saraswati | श्रीपाद वल्लभ · नृसिंह सरस्वती | The saint is नृसिंह; the deity Narasimha Swami and Narasimha Sastry are नरसिंह |
| Kaalaagni Shamana Dattatreya | कालाग्नि शमन दत्तात्रेय | |
| Karya Siddhi Hanuman | कार्यसिद्धि हनुमान | |
| Sri Datta Venkateshwara | श्री दत्त वेंकटेश्वर | |
| Rajarajeshwari / Mother Goddess | राजराजेश्वरी / जगन्माता | |

**Register.** The Swamijis, Sri Jayalakshmi Maata, the Gurus, saints and deities always take the honorific plural (वे, उन्हें, उनका, कहते हैं), including Sri Swamiji as a child. The reader is always आप. Prayers addressed to God keep the source's intimacy (अल्लाह तुम्हारा नाम है). Devotional verbs: came/visited → पधारे, consecrated → प्राण-प्रतिष्ठा की, idol → विग्रह.

### Places and Ashram features

| English | Hindi | English | Hindi |
|---|---|---|---|
| Mysuru (Mysore in old names) | मैसूरु (मैसूर) | Shuka Vana | शुक वन |
| Mekedatu | मेकेदाटु | Nada Mantapa | नाद मंटप (see question 1) |
| Chamundi Hill | चामुंडी पहाड़ी | Vishwam Museum | विश्वम् संग्रहालय |
| Datta Nagar, Ooty Road | दत्त नगर, ऊटी रोड | Kishkindha Moolika Bonsai Garden | किष्किंधा मूलिका बोन्साई उद्यान |
| Ganagapura · Pithapuram | गाणगापुर · पीठापुरम | Universal Prayer Hall | विश्व प्रार्थना भवन |
| Nuzvid / Nuzvidu | नूजिवीडु (no nukta) | Saptarshi Sarovara / garden | सप्तर्षि सरोवर / उद्यान |
| Manasa Sarovara (Himalaya) | मानसरोवर | Hanumadwaram | हनुमद्द्वारम् |

### Terms and conventions

- darshan दर्शन, seva सेवा, puja/pooja पूजा, homa होम, abhisheka अभिषेक, aarti/arati आरती, satsang सत्संग, bhajan भजन, prasada प्रसाद, Datta Jayanti दत्त जयंती, Guru Purnima गुरु पूर्णिमा, Datta Kriya Yoga दत्त क्रिया योग, Nada Chikitsa नाद चिकित्सा, Raga Sagara/Ragasagara राग सागर, Bhaktimala/Bhakti Mala भक्तिमाला.
- "&" between words is always और (it was "&" in about 100 labels; now one style site-wide).
- Western digits only, with the English grouping (100,000, not 1,00,000). Times read naturally: "6:00 AM" → सुबह 6:00 बजे.
- Store titles: creative English titles are transliterated (दत्त स्पीक्स); descriptive labels are translated (Chanting Book → पारायण पुस्तक, Meaning Book → अर्थ पुस्तक, Part-2 → भाग-2).
- Two-letter country badges (US, UK, DE…) stay in Latin script; acronyms otherwise in Devanagari (एसजीएस, एसडीएचएस), except SVAMI, which is pronounced and written स्वामी.
- UI labels have one rendering each across pages, e.g. Donate दान करें, Book a Puja पूजा बुक करें, Plan your visit अपनी यात्रा की योजना बनाएँ, Volunteer स्वयंसेवक बनें, Support the mission मिशन में सहयोग करें, Read more और पढ़ें, Get directions रास्ता देखें, How to reach कैसे पहुँचें.

### Settled during the editor pass

- "Kriya Yuga (the first of the Yugas)" → कृत युग. The English source has since been corrected to "Krita Yuga" as well.
- "Kalinga Mardana" (the bronze gifted by Dr R. Venkataraman) → कालिय मर्दन, Krishna subduing the serpent Kaliya.
- Dadhimukha, "uncle" of Sugreeva → मामा (as in the Ramayana); "Seer" (press headline) → संत; "millions of books" → लाखों.
- Raahu/Ketu "Dragon's head/tail" → सर्प का सिर / सर्प की पूँछ.
- "Bhajans heal the mind and bhajan (food) heals the body" → read as भोजन (the English has a typo).
- "Speeches archive" → प्रवचन अभिलेखागार, kept distinct from "Discourse collection" → प्रवचन संग्रह on the same page.
- Top-bar "Next ·" before the next ritual → आगामी (works before आरती and अभिषेक alike).

## 2. Open questions for the Ashram

Each item keeps the current Hindi until the Ashram decides.

| # | English | Current Hindi | Alternative |
|---|---|---|---|
| 1 | Nada Mantapa; Sapta Swara Devata Mantapam | नाद मंटप; सप्त स्वर देवता मंटपम् (close to the Peetham's own name) | नाद मंडप; …मंडपम् (standard Hindi मंडप, as in भारत मंडपम्) |
| 2 | Dattaji, Ask Dattaji | दत्ताजी, आस्क दत्ताजी | दत्तजी |
| 3 | Navanatha names (centres page) | कानीफनाथ, चर्पटुनाथ, गहनीनाथ, भर्तरीनाथ, नागेशनाथ (letter-faithful to the Peetham's English) | कानिफनाथ, चरपटीनाथ, गहिनीनाथ, भर्तृहरि, नागनाथ (usual Nath-tradition Hindi) |
| 4 | Telugu/Tamil town names | प्रोद्दुटूर, नूजिवीडु, अच्चरपाक्कम, बोम्मेपर्ति, मंगिनपूडि, तल्लपालेम | प्रोद्दुटूरु, नूज़ीवीडु, अचरपाक्कम, बोम्मेपर्ती … as the Ashram writes them |
| 5 | Moola virat (oil ablution on Datta Jayanti) | मूल विराट विग्रह | मूल विग्रह / मूलविराट् |
| 6 | Guru Parampara prayer: "Sri Pada Vallabha Narasimha Saraswathi" | श्रीपाद वल्लभ नृसिंह सरस्वती | श्रीपाद श्रीवल्लभ नृसिंह सरस्वती (common text) |
| 7 | Dwadasha Sutras (Maata's commands to the young Sri Swamiji) | respectful imperative: मुझे देखें | intimate: मुझे देखो |
| 8 | Film title "Sri Swamiji Unveiled" | श्री स्वामीजी: एक परिचय | transliteration, or a Hindi title the Ashram uses |
| 9 | Conference title "Sound, then Truth" (Nara) | “नाद, फिर सत्य” | keep the English title |
| 10 | YouTube channel names (Gurubhavana ADPT, Puttugam, SGS Birds…) | Devanagari: गुरुभवन एडीपीटी, पुट्टुगम, एसजीएस बर्ड्स | Latin, so devotees can search for them |
| 11 | "Year of the Bird 2018" | “ईयर ऑफ़ द बर्ड 2018” (पक्षी वर्ष) | drop the gloss, or पक्षी वर्ष 2018 only |
| 12 | Parrot species (Shuka Vana) | transliterated: ब्लू-थ्रोटेड मकाउ, हायसिंथ मकाउ | Hindi descriptive names |
| 13 | Names with no precedent | गुरु कानिका, पिटीलु चौडय्या आजीवन पुरस्कार, दत्त सेना, सीयूटीएक्स, स्टाटकसीनो बासेल, कुरर पक्षी (Osprey) | the Ashram's own forms |
| 14 | Telugu/Kannada book titles | ज्ञानदेडेगे, श्री कृष्ण गाथामृतमु, दत्त काकड़ हारतुलु, पिल्ललू! वीरु मीकु तेलुसा?, सूक्तुलु; prayer शिवेति शौरीति | spelling from the original script |
| 15 | Sanskrit verses with likely slips in the Roman text (kriya-yoga.html) | Devi Prarthana: स्वरूपाणि, पार्वति, कोणचक्राणि, त्रिकोण रूपिणी, शिवस्स्मृतः · Guru Prarthana: धृतविधितनुम्, साधकोद्धार, पूर्णम्, विकृति रहितम्, भामार्धाङ्गम्, तत्त्वमाज्ञान्तराले (least certain) · Guru Paduka: निगूढ, भिरञ्चिताभ्याम् · मत्वा धीरो · स्वगुणैर्निगूढाम् | the Ashram's Devanagari text |
| 16 | Guru Gita: "Gukaarassyaad gunaateeto…" | गुकारस्स्याद् गुणातीतो रूपातीतो रुकारकः | the Ashram's text |
| 17 | "Trivikrama Salagrama and Manoratha Kurma Salagrama, weighing 300 kg" | ambiguity kept (जिनका भार 300 किग्रा है) | whose weight is 300 kg: one or both? |

## 3. What to read first

1. **Sanskrit verses and mantras**: `kriya-yoga.html` (Guru Paduka Dhyana Shlokam, Devi Prarthana, Guru Prarthana, Kathopanishad and Shvetashvatara verses), `guru-parampara.html` (Guru Gita verse, Guru Parampara prayer, the "Gu"/"Ru" meanings), `darshan.html` (Karya Siddhi Hanuman mantra), the footer (लोकाः समस्ताः सुखिनो भवन्तु). Some of these verse blocks changed in English and still show Roman text until the delta pass.
2. **Quotations of Sri Swamiji**: the large word-by-word quotes on `index.html` (fire and wood), `about.html` (Humanity is His religion), `attractions.html` (bonsai and birds are my two eyes), `seva.html` (service to mankind), `guru-parampara.html` (the Guru is like the Sun), the "Sri Swamiji Says" sayings on `teachings.html`, the Dwadasha Sutras on `guru-parampara.html`, and the interfaith prayer on `sri-swamiji.html`.
3. **Guinness World Record titles and honours**: `sri-swamiji.html` (honours and timeline), `attractions.html` (bonsai display, aviary, largest stamp, chanting marathon), `music.html` (largest music therapy lesson, Carnatic band), `kriya-yoga.html` (largest breathing lesson).
4. **The glossary** of 121 terms on `teachings.html` and the festival year on `events.html`.

**Not translation problems** (already reported to the developers): highlighted gold words in headings lose marks above the line (पक्षियों looks like "पाक्षया"), and so do the chapter tabs on the attractions page (बोन्साई looks like "बान्साइ"); map, wheel and diagram labels are drawn in English; "This month"/"Next" badges and times such as "7 AM" come from styles and scripts in English. About 3% of segments are still English because the English changed after translation; they will be translated in a delta pass (for example the top bar "Live streams · Events · Contact · Sign in", the darshan timings cards, the Datta Charitram episode list, the Navanatha "Nam" cards and the runtime status messages).

## 4. How to change a translation

1. Find the English text: `grep -rn "Plan your visit" src/i18n/hi/` (the key is the exact English segment, with inline markup as `<1>…</1>`, `<2/>`).
2. Edit only the Hindi value in that `src/i18n/hi/part-*.json` file. Keep every placeholder and every digit run exactly as in the English (you may move placeholders); do not use Devanagari digits. If the change is a name or a recurring term, change it in `src/i18n/glossary/hi.json` too and update the other entries that use it.
3. Check: `node tools/i18n-check.mjs hi` must report 0 problems.
4. Build: `node build.mjs` (it must report 0 rejected for hi), then look at the page under `/hi/` (dev server: `node build.mjs --serve`, http://127.0.0.1:4321/hi/).
