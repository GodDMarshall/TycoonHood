# Telugu (తెలుగు) site: notes for the native reviewer

The Telugu site lives at `/te/`. It was translated in six parallel machine-assisted passes, each
one sixth of the text (the "translators" in this note; they are not six people), and no fluent
speaker has reviewed it yet: that is your review. One
editorial pass then made names, terms and UI labels consistent across all pages, settled the
translators' questions and checked every page on desktop (1440 px) and phone (390 px). This note
lists what was decided, what only the Ashram can confirm, and where to start reading.

The rules every translator followed are in `src/i18n/glossary/te.md` (style guide) and
`src/i18n/glossary/te.json` (about 1,200 fixed spellings). Section 9 of the style guide records
the decisions from the editorial pass.

## (a) Key spelling decisions

| English | తెలుగు | Note |
|---|---|---|
| Avadhoota Datta Peetham | అవధూత దత్త పీఠం | Three words. Declines as పీఠానికి, పీఠంలో; possessive పీఠం వారి or పీఠపు. |
| Sri Ganapathy Sachchidananda Ashram(a) | శ్రీ గణపతి సచ్చిదానంద ఆశ్రమం | One form for Ashram / Ashrama; Mysuru Ashram is మైసూరు ఆశ్రమం. |
| His Holiness Sri Ganapathy Sachchidananda Swamiji | పరమ పూజ్య శ్రీ గణపతి సచ్చిదానంద స్వామీజీ | Swamiji always with long ī (స్వామీజీ). |
| Sri Swamiji / Appaji | శ్రీ స్వామీజీ / అప్పాజీ | Running text: శ్రీ స్వామీజీ వారు, వారి, వారికి. Headings, labels and alt text drop వారు. |
| Sri Datta Vijayananda Teertha Swamiji / Sri Bala Swamiji | శ్రీ దత్త విజయానంద తీర్థ స్వామీజీ / శ్రీ బాల స్వామీజీ | బాల స్వామీజీ is two words everywhere. |
| Junior Pontiff | ఉత్తరాధికారి | See question 5. |
| Sri Jayalakshmi Maata | శ్రీ జయలక్ష్మీ మాత | Takes plural verbs (మహాసమాధి పొందారు). |
| Lord Dattatreya / Lord Datta | శ్రీ దత్తాత్రేయ స్వామి / దత్త ప్రభువు | "Lord X" is శ్రీ X స్వామి; Lord Shiva పరమశివుడు, Lord Krishna శ్రీకృష్ణ పరమాత్మ. |
| Kaalaagni Shamana Dattatreya | కాలాగ్ని శమన దత్తాత్రేయ | |
| Karya Siddhi Hanuman | కార్యసిద్ధి హనుమాన్ | కార్యసిద్ధి is one word. |
| Sri Datta Venkateshwara (Temple) | శ్రీ దత్త వేంకటేశ్వర (ఆలయం) | Long ే in వేంకట. |
| Rajarajeshwari | రాజరాజేశ్వరి | రాజరాజేశ్వరీ before a noun: రాజరాజేశ్వరీ ఆలయం, శ్రీ రాజరాజేశ్వరీ అమ్మవారు. |
| Universal Prayer Hall / Nada Mantapa / Shuka Vana | విశ్వ ప్రార్థనా మందిరం / నాద మంటపం / శుక వనం | |
| Vishwam Museum / Kishkindha Moolika Bonsai Garden | విశ్వం మ్యూజియం / కిష్కింధ మూలికా బోన్సాయ్ వనం | |
| Datta Kriya Yoga / Nada Chikitsa / Raga Sagara | దత్త క్రియా యోగ / నాద చికిత్స / రాగ సాగర | Raga Sagara is two words, also in concert names. |
| Mysuru (Mysore) / Mekedatu / Pithapuram / Ganagapura | మైసూరు / మేకెదాటు / పిఠాపురం / గాణగాపురం | |
| darshan, seva, puja/pooja, homa, abhisheka, aarti/arati | దర్శనం, సేవ, పూజ, హోమం, అభిషేకం, హారతి | Common nouns take Telugu endings (దర్శనానికి, పూజలో). |
| satsang, bhajan, Divya Naama Sankeertana | సత్సంగం, భజన, దివ్య నామ సంకీర్తన | Proper names keep their own form: ఎస్‌జీఎస్ సత్సంగ్ (app). |
| Datta Jayanti / Guru Purnima | దత్త జయంతి / గురు పూర్ణిమ | |
| SGS / SDHS | ఎస్‌జీఎస్ / ఎస్‌డీహెచ్‌ఎస్ | Letter by letter, with the invisible joiner. |
| Guinness World Records | గిన్నిస్ వరల్డ్ రికార్డ్స్ (the organisation) / గిన్నిస్ ప్రపంచ రికార్డు(లు) (a record, records) | Record titles have one wording on every page, e.g. బోన్సాయ్ వృక్షాల అతిపెద్ద ప్రదర్శన, ఒకే పక్షిశాలలో అత్యధిక పక్షి జాతులు, అతిపెద్ద సంగీత చికిత్స పాఠం. |

**Register.** Standard written Telugu. Sri Swamiji, Sri Bala Swamiji, Sri Jayalakshmi Maata, the
Gurus and the deities always take the honorific plural (సెలవిచ్చారు, ప్రతిష్ఠించారు, కొలువై
ఉన్నారు). The reader is మీరు, with polite imperatives (దర్శించుకోండి, సంప్రదించండి).
Quotations keep the speaker's voice; prayers addressed to God inside a quotation use the
devotional singular నీవు / నీ, as in the stotras. Lay people in prose take గారు.

**UI labels** have one rendering everywhere: విరాళం ఇవ్వండి (Donate), పూజ బుక్ చేయండి (Book a
Puja), మీ సందర్శన ప్రణాళిక (Plan your visit), మరింత చదవండి (Read more), సంప్రదించండి
(Contact), దారి తెలుసుకోండి (Get directions), ఆలయాలు & దర్శనం (Temples & Darshan),
కార్యక్రమాలు & పండుగలు (Events & Festivals), అధికారిక క్యాలెండర్ (Official calendar). "Live"
is లైవ్ in every UI sense (లైవ్ దర్శనం, లైవ్‌గా రికార్డ్ చేసిన); ప్రత్యక్ష is kept for "in
person" and for ప్రత్యక్ష పాద పూజ. The glossary already suggests లైవ్ ప్రసారాలు for the new
"Live streams" link.

**Numbers and times.** Western digits exactly as in English (the build checks them). The part of
the day comes first: ఉదయం 6:00 – మధ్యాహ్నం 12:00, సాయంత్రం 4:00 – రాత్రి 8:00. 5:00–11:59 AM
is ఉదయం (ఉదయం 5:40 on the TV listings); 3:00–4:59 AM is తెల్లవారుజామున (the 3 AM Shivaratri
discourse). Dates keep the English order: 26 మే 1942, 26 మే 1942న. The large "70 ft" figure on
the darshan page is written 70 అ., as చ.అ. is for square feet, because అడుగులు did not fit.

**Spelling.** The doubled ḷ is ళ్ల everywhere (వెళ్లండి, హోటళ్లు, బళ్లారి), and "largest" is
one word, అతిపెద్ద.

**Book titles.** English-language editions keep their published English title in Latin (Datta
Speaks, Reflections of the Absolute, Sri Guru Gita). Indian-language editions get the Telugu
title. The language tag is always Telugu (ఇంగ్లీష్, కన్నడ).

## (b) Questions only the Ashram can answer

| # | English (where) | Current Telugu | Alternative |
|---|---|---|---|
| 1 | Kishkindha Moolika Bonsai Garden (attractions, visit, about) | కిష్కింధ మూలికా బోన్సాయ్ వనం | …బోన్సాయ్ గార్డెన్, if that is the name used in Telugu |
| 2 | Universal Prayer Hall (all temple pages) | విశ్వ ప్రార్థనా మందిరం | The Peetham's own Telugu name, if different |
| 3 | Sri Datta Humane Services (seva, about) | శ్రీ దత్త హ్యూమేన్ సర్వీసెస్ | A Telugu name, if the Peetham uses one |
| 4 | Holistic Health Centre (seva, visit) | సమగ్ర ఆరోగ్య కేంద్రం | హోలిస్టిక్ హెల్త్ సెంటర్ |
| 5 | Junior Pontiff (index, sri-swamiji, guru-parampara) | ఉత్తరాధికారి | ఉత్తర పీఠాధిపతి / కనిష్ఠ పీఠాధిపతి |
| 6 | "Krishnaraja Raga Sagara", location of the K R Nagar centre (centers). The official directory has this text. | కృష్ణరాజ రాగ సాగర (as published) | కృష్ణరాజనగర (K R Nagar) or కృష్ణరాజ సాగర, if the directory entry is a slip |
| 7 | Navanatha names (centers): Charpatunatha, Bhartareenatha, Nageshanatha, Jalandharanatha, Revananatha; Rajahmundry | చర్పటునాథ, భర్తరీనాథ, నాగేశనాథ, జలంధరనాథ, రేవణనాథ; రాజమండ్రి | చర్పటినాథ, భర్తృహరినాథ (standard forms); రాజమహేంద్రవరం |
| 8 | 24 Gurus, Moon: "the delinquencies of the six senses" (guru-parampara) | ఆరు ఇంద్రియాల దోషాలు (literal) | దేహానికి కలిగే ఆరు వికారాలు (షడ్వికారాలు), the Bhagavatam teaching |
| 9 | 24 Gurus, Fire: "be undesirable" (guru-parampara) | కోరికలు లేనివాడై (read as "desireless") | Confirm the meaning |
| 10 | Guru Kanika, a donation fund (seva) | గురు కానుక | గురు కానిక, or the name used on Telugu receipts |
| 11 | "Datta Kagada Haratulu with meaning", Telugu book (teachings) | దత్త కాగడ హారతులు (as written) | దత్త కాకడ హారతులు (the arati is కాకడ హారతి) |
| 12 | Kannada book titles (teachings): Anjaneya Charitre, Jnaanadedege, Sri Subramanya Swami Charitre | ఆంజనేయ చరిత్రె, జ్ఞానదెడెగె, శ్రీ సుబ్రహ్మణ్య స్వామి చరిత్రె | The printed titles |
| 13 | DKYIC book list (kriya-yoga): Datta Kriya Yoga, Kumara Kriya Yoga, Naadi Shuddhi Exercises, Hatha Yoga Asanas, Patanjali Yoga Sutras | Telugu titles (నాడీ శుద్ధి వ్యాయామాలు, హఠ యోగ ఆసనాలు, పతంజలి యోగ సూత్రాలు …) | The titles of the actual Telugu editions |
| 14 | Nara yoga conference "Sound, then Truth" (events, index) | “నాదం, ఆపై సత్యం” | Keep the English title |
| 15 | Film "Sri Swamiji Unveiled" (index, media, sri-swamiji) | శ్రీ స్వామీజీ — ఆవిష్కరణ | Keep the English title |
| 16 | The Kalinga Mardana bronze (attractions, Vishwam Museum) | కాళీయ మర్దనం (Krishna subduing Kaliya) | కాళింగ మర్దనం, if the Museum labels it so |
| 17 | "Bhajans heal the mind and bhajan (food) heals body" (teachings, discourse of 18 Jul 2023) | the second "bhajan" as భోజనం (ఆహారం) | Confirm the pun |
| 18 | Lord Krishna (Teachings glossary, Gopika) | శ్రీకృష్ణ పరమాత్మ | శ్రీ కృష్ణ స్వామి (the general "Lord X" rule) |
| 19 | "Trivikrama Salagrama and the Manoratha Kurma Salagrama, weighing 300 kg" (darshan, Hari Sannidhi) | (300 కిలోల బరువు) after both names, ambiguous like the English | Say whether 300 kg is one stone or each |
| 20 | Local names: Metagalli, Ranganathittu, Kukkarahalli Lake, Wadiyar (visit, attractions) | మేటగళ్లి, రంగనతిట్టు, కుక్కరహళ్లి సరస్సు, ఒడయార్ | Local Telugu usage |
| 21 | "Press Send" in the visitor's own email app (contact) | Send నొక్కండి (button name kept in Latin) | పంపు నొక్కండి, as Telugu mail apps label it |
| 22 | Teachings glossary entry "Pooja — ref. puja": both headwords are పూజ in Telugu (teachings) | The entry now explains that Pooja and Puja are two English spellings of పూజ | Hide the cross-reference on the Telugu site |

Settled in the editorial pass, no action needed unless you disagree: bahiraga as బహిర్యాగం (the
pair of అంతర్యాగం); Osprey as కురర పక్షి; Rahu and Ketu as సర్ప శిరస్సు / సర్ప పుచ్ఛం; "When in
town" as మైసూరులో ఉన్నప్పుడు; Cuddapah (Kadapa) as కడప and Bellary (Ballari) as బళ్లారి; centre
acronyms in Telugu letters (హెచ్‌డీవైసీ), country codes and "e.V." in Latin; "Year of the Bird"
transliterated; "Star of Mysore" and "Museums of India" kept in English; "A Garland of
Devotion" as భక్తి మాలిక; the hidden search strings on the Centres page hold Telugu and English
names so visitors can search in either.

## (c) What to read first

1. **Sanskrit verses and mantras.** kriya-yoga.html (Kathopanishad and Shvetashvatara verses,
   Guru Paduka Dhyana Shlokam, Devi Prarthana, Guru Prarthana, the closing Bhagavad Gita
   shloka); guru-parampara.html (the Guru Gita line గుకారస్స్యాద్ గుణాతీతో…, the Guru Parampara
   prayer); darshan.html (the Karya Siddhi Hanuman mantra త్వమస్మిన్ కార్యనిర్యోగే…); media.html
   (the 108 mantra); centers.html (the nine Navanatha bija syllables గం ణం పం తిం సం చిం దాం నం దం);
   లోకాః సమస్తాః సుఖినో భవంతు, the spoken label of the footer mantra on every page. For the Guru Prarthana and Devi
   Prarthana, check the readings వికృతి, …మాజ్ఞాంతరాలే, ధృతవిధితనుం, సాధకోద్ధార, కోణచక్రాణి
   పార్వతి and త్రికోణ రూపిణీ against the printed text.
2. **Sri Swamiji's quotations and word-by-word statements.** index.html ("Just as fire cannot be
   separated from wood…"), about.html ("Humanity is His Religion…"), guru-parampara.html ("Guru
   is like the Sun…", the 24 Gurus, the Twelve Commandments of Sri Jayalakshmi Maata), music.html
   ("Music is my religion…"), seva.html ("Service to mankind is service to God"),
   attractions.html ("Bonsai trees and birds are my two eyes…"), teachings.html (Sri Swamiji
   Says cards, the Datta Vaakya and Vijaya Vyakhya discourses). In the animated statements each
   word is a separate piece, so the Telugu was reworded to fill the same number of pieces.
3. **Guinness World Records titles.** sri-swamiji.html (records list and timeline),
   attractions.html (Shuka Vana, Bonsai Garden, Vishwam Museum stamp, Nada Mantapa),
   kriya-yoga.html (breathing lesson), music.html and media.html (Sydney Opera House).
4. **Names in the centres directory** (centers.html): towns in Andhra Pradesh, Telangana and
   abroad were transliterated by the translators and are now in the glossary.

Still in English on the Telugu pages, because the English changed after translation (about 150
pieces, to be translated in the next pass): the top bar ("Live streams, Events, Contact, Sign
in") and the "Mobile Apps" menu entry; most of the darshan.html timings section; the seva.html
hospital, camps and donation-fund blocks; the guru-parampara.html prayer, breadcrumb and Datta
Charitram episode list; the kriya-yoga.html Guru Paduka, Devi and Guru Prarthana verses,
address card and WhatsApp line; the index.html composer paragraph, "7:00 AM" and the event tags
"Tour · Music" and "Seva Camp"; the attractions.html Varam video and Shuka Vana live-status
lines; the events.html intro and the "Vaishakha" month tab; the two "Nam" Navanatha card
headings on centers.html; and the live messages written by the page scripts ("Open now",
"Closed · opens 6 AM tomorrow", "In 34 days", "Show 9 earlier months", "Showing all 86 centres
listed here", the contact-form messages).

Some English cannot be fixed in the translation files and has been reported as code work: the
labels drawn inside pictures (the Sat-Chit-Ananda diagram on about.html, the world map on
centers.html, the month wheel on events.html, the clock dial on visit.html), the badges "This
month", "Next", "Now", "Today" and "Now showing", the "about … to …" line under the month wheel,
and "AM/PM" inside the live status and next-ritual lines.

## (d) How to change a translation

1. Find the English sentence in `src/i18n/segments.json`, or search for the Telugu text in
   `src/i18n/te/part-*.json`. Each file is `{ "exact English": "తెలుగు" }`.
2. Edit only the Telugu value. Never change the English key; a changed key no longer matches the
   page and the sentence falls back to English.
3. Keep every placeholder (`<1>…</1>`, `<2/>`, `%1`) and every number exactly as in the English.
   You may move placeholders to suit Telugu word order; case endings go outside the tag
   (`<1>దత్త నగర్</1>కు`).
4. If you change a name or term, change it in `src/i18n/glossary/te.json` too, and search the part
   files for its other occurrences so the site stays consistent.
5. Check and rebuild:

   ```
   cd dattapeetham
   node tools/i18n-check.mjs te     # must report 0 problem(s)
   node build.mjs                   # te must show 0 rejected
   ```

   Then open `site/te/<page>.html`, or run the dev server (`node build.mjs --serve`) and visit
   http://localhost:4321/te/.
