# Telugu (తెలుగు) style guide: Avadhoota Datta Peetham website

Every Telugu translator follows this guide together with `te.json` in this folder.
`te.json` holds the fixed spelling of every name and recurring term ({ "English": "Telugu" }).
Translations themselves go in `src/i18n/te/`. Nothing in this folder is shipped to the site.

## 1. Use the glossary

- When a term is in `te.json`, use that exact spelling everywhere. Spelling variants in the
  English (Ashram/Ashrama, Puja/Pooja, Arati/Aarti, Ganapathy/Ganapati, Mata/Maata/Matha,
  Venkateshwara/Venkateswara, Goshala/Gau Shala, Bhaktimala/Bhakti Mala, Centre/Center,
  Mysore/Mysuru) all map to one Telugu form. Do not copy the English variation into Telugu.
- The longest match wins: "Karya Siddhi Hanuman Temple" is కార్యసిద్ధి హనుమాన్ ఆలయం, not a
  word-by-word build.
- Glossary values are in the nominative case. Add Telugu case endings directly to them:
  ఆశ్రమానికి, ఆశ్రమంలో, మైసూరులో, పీఠానికి, నాద మంటపంలో, శుక వనంలో. In compounds the final ం
  drops: ఆశ్రమ కార్యాలయం, జ్యేష్ఠ శుద్ధ ఏకాదశి, చైత్ర శుద్ధ పాడ్యమి.
- Names of people, deities, places, temples and institutions are transliterated. Only the
  common nouns inside them are translated: Hospital ఆసుపత్రి, Temple ఆలయం, Garden వనం,
  Trust ట్రస్ట్, Museum మ్యూజియం.
- If a term is not in the glossary, transliterate it in the standard Sanskrit or Telugu
  spelling devotees use, and add it to `te.json` so the next translator uses the same form.

Most-used forms:

| English | Telugu |
|---|---|
| Avadhoota Datta Peetham | అవధూత దత్త పీఠం |
| Sri Ganapathy Sachchidananda Swamiji | శ్రీ గణపతి సచ్చిదానంద స్వామీజీ |
| His Holiness | పరమ పూజ్య |
| Sri Swamiji / Appaji | శ్రీ స్వామీజీ / అప్పాజీ |
| Sri Datta Vijayananda Teertha Swamiji | శ్రీ దత్త విజయానంద తీర్థ స్వామీజీ |
| Sri Bala Swamiji | శ్రీ బాల స్వామీజీ |
| Junior Pontiff | ఉత్తరాధికారి |
| Sri Jayalakshmi Maata | శ్రీ జయలక్ష్మీ మాత |
| Lord Dattatreya | శ్రీ దత్తాత్రేయ స్వామి |
| Kaalaagni Shamana Dattatreya | కాలాగ్ని శమన దత్తాత్రేయ |
| Karya Siddhi Hanuman | కార్యసిద్ధి హనుమాన్ |
| Jaya Guru Datta | జయ గురు దత్త |
| Mysuru Ashram | మైసూరు ఆశ్రమం |
| Nada Mantapa / Shuka Vana | నాద మంటపం / శుక వనం |
| Datta Kriya Yoga / Nada Chikitsa | దత్త క్రియా యోగ / నాద చికిత్స |
| darshan / seva / puja / homa | దర్శనం / సేవ / పూజ / హోమం |
| abhisheka / aarti / bhajan | అభిషేకం / హారతి / భజన |

## 2. Register and honorifics

The tone is dignified and devotional, like the Peetham's own Telugu publications. Use
standard written Telugu, not dialect, and do not use English constructions where a natural
Telugu one exists.

- **The Swamijis and the Gurus** always take the honorific plural. In running prose, add
  వారు after the title: శ్రీ స్వామీజీ వారు, శ్రీ బాల స్వామీజీ వారు. The possessive is వారి
  (శ్రీ స్వామీజీ వారి సంగీతం), the object is వారిని, and the dative is వారికి. Verbs end in
  -ారు / -తారు. Never use అతను, ఆయన, అతడు, వాడు, or singular verb endings such as -ాడు / -ింది.
  In headings, labels and alt text, drop వారు: శ్రీ స్వామీజీ జన్మదినం.
- Use respectful verbs: వేంచేశారు / విచ్చేశారు (came, visited), స్థాపించారు (founded),
  ప్రతిష్ఠించారు (consecrated), అనుగ్రహించారు (blessed, bestowed), ఆశీర్వదించారు (blessed),
  సెలవిచ్చారు / ఉపదేశించారు (said, taught), నిర్వహిస్తారు (conducts), మహాసమాధి పొందారు
  (attained Mahasamadhi).
  - "Sri Swamiji founded the Ashram in 1966." becomes శ్రీ స్వామీజీ వారు 1966లో ఆశ్రమాన్ని స్థాపించారు.
- "His Holiness …" at the start of a sentence becomes పరమ పూజ్య శ్రీ గణపతి సచ్చిదానంద స్వామీజీ వారు.
  When the English uses "His Holiness" on its own (for example, "messages from His Holiness"),
  write పరమ పూజ్య శ్రీ స్వామీజీ వారి సందేశాలు. The capital "He / His / Him" used for Sri Swamiji
  or for a deity becomes వారు / వారి / వారిని.
- **Deities** also take the honorific plural. Write శ్రీ దత్తాత్రేయ స్వామి వారు బోధించారు, and for
  a goddess, అమ్మవారు కొలువై ఉన్నారు. For "is enshrined" use కొలువై ఉన్నారు, and for "grants
  darshan" use దర్శనమిస్తారు. "Lord X" becomes శ్రీ X స్వామి (శ్రీ హనుమాన్ స్వామి,
  శ్రీ వేంకటేశ్వర స్వామి), except where the glossary gives another form (Lord Datta is
  దత్త ప్రభువు, Lord Shiva is పరమశివుడు, Lord Krishna is శ్రీకృష్ణ పరమాత్మ). The generic "God" is భగవంతుడు, and "the Lord" is
  భగవంతుడు / స్వామి.
- **Sri Jayalakshmi Maata** and the other saints of the lineage take plural verbs:
  శ్రీ జయలక్ష్మీ మాత మహాసమాధి పొందారు.
- **Quotations of Sri Swamiji** stay in his voice and address devotees with మీరు. When he
  refers to himself as "Swamiji", write స్వామీజీ without వారు.
- **Lay people** named in prose take గారు: శ్రీ హెచ్. వి. ప్రసాద్ గారు. Labels and contact cards
  keep the bare name.
- Address the reader as మీరు. Instructions use the polite plural imperative (-ండి): దర్శించుకోండి,
  పాటించండి. Never use నువ్వు forms for the reader. Prayers addressed to God inside a quotation
  (“O Lord, You are the Truth…”) keep the devotional singular of the stotras: నీవు / నీ.
- Write శ్రీ as a separate word before a name (శ్రీ స్వామీజీ, శ్రీ రామ నవమి). It joins the next
  word only in established compounds: శ్రీపాద, శ్రీమద్భగవద్గీత, శ్రీహరి. "Sri Sri Sri" is
  శ్రీ శ్రీ శ్రీ.

## 3. Sanskrit verses, mantras and chants in Roman transliteration

- Write each verse in Telugu script, syllable for syllable. Do not paraphrase, shorten, or
  replace it with a Telugu translation. The verse slot holds only the verse.
- Keep every line-break placeholder (`<1/>`, `<2/>` …) and every inline tag exactly where it is
  in the English.
- Replace `|` with `।` and `||` with `॥`.
- Where the Roman text is a plain or simplified spelling of a known verse, use its standard
  Sanskrit orthography: long vowels, visarga ః, retroflex letters (ణ, ఢ, ష), and correct word
  division. Never add, drop or swap words. A hint such as `namah(s)` is written as the visarga
  only: నమః.
- Translate every English meaning fully into Telugu. A "Meaning." label becomes భావం. A quoted
  English rendering of a verse is translated and keeps its quotation marks. Source titles
  (Kathopanishad, Shvetaashvatara Upanishad, Srimad Bhagavad Gita …) use their glossary forms.
- Sanskrit words inside English prose are also written in Telugu script: `nāda cikitsā` is
  నాద చికిత్స. When English pairs a Sanskrit name with its English gloss (Prithvi *Earth*), write
  the name in Telugu script and the gloss in plain Telugu: పృథ్వి *భూమి*.
- The editorial note on the Datta Kriya Yoga page ("Diacritic encoding slips …") is translated
  as it stands.
- Transliteration key: ā/aa ా · ī/ee ీ · ū/oo ూ · ṛ ృ · e ే · ai ై · o ో · au ౌ · ṁ/ṃ ం ·
  ḥ ః · ś శ · ṣ ష · ṇ ణ · ṭ ṭh ḍ ḍh ట ఠ డ ఢ · c/ch చ · ch/chh ఛ · ñ ఞ · kṣ/ksh క్ష · jñ/gn జ్ఞ.
  When the text has no diacritics, decide శ or ష and న or ణ from the word's standard spelling
  (శివ, విష్ణు, దోష, గుణ). Write a final consonant with the halant (పాదుకాభ్యామ్, అపశ్యన్). Write a
  nasal before a consonant inside a word as ం (భవంతు, పశ్యంతి).

Worked examples (use these exact renderings):

| Roman (site) | Telugu |
|---|---|
| Lokah samastah sukhino bhavantu | లోకాః సమస్తాః సుఖినో భవంతు |
| Jaya Guru Datta | జయ గురు దత్త |
| `<1>Sri Ganeshaya Namaha</1><2>\|</2> <3>Sri Saraswatyai Namaha</3><4>\|</4> <5>Sri Pada Vallabha Narasimha Saraswathi Sri Guru Dattatreyaya Namaha</5><6>\|</6>` | `<1>శ్రీ గణేశాయ నమః</1><2>।</2> <3>శ్రీ సరస్వత్యై నమః</3><4>।</4> <5>శ్రీపాద వల్లభ నరసింహ సరస్వతి శ్రీ గురు దత్తాత్రేయాయ నమః</5><6>।</6>` |
| 108 – Om Aim Hreem Shreem Shiva Rama Anagha Dattaaya Namaha | 108 – ఓం ఐం హ్రీం శ్రీం శివ రామ అనఘ దత్తాయ నమః |
| `tvamasmin kāryaniryoge pramāṇaṁ harisattama \|<1/>hanuman! yatnamāsthāya duḥkhakṣaya karobhava \|\|` | `త్వమస్మిన్ కార్యనిర్యోగే ప్రమాణం హరిసత్తమ ।<1/>హనుమన్! యత్నమాస్థాయ దుఃఖక్షయకరో భవ ॥` |
| `<1><2>Gu</2>kaarassyaad gunaateeto</1> <3>roopaateeto <4>ru</4>kaarakah</3>` | `<1><2>గు</2>కారస్స్యాద్ గుణాతీతో</1> <3>రూపాతీతో <4>రు</4>కారకః</3>` |
| `Adhyaatma yogaadhigamena devam<1/>Matvaamdheero harshashokau jahaati` | `అధ్యాత్మ యోగాధిగమేన దేవం<1/>మత్వా ధీరో హర్షశోకౌ జహాతి` |
| `Te dhyaana yogaanugataa apashyan<1/>Devaatmashaktim svagunaairnigoodham` | `తే ధ్యాన యోగానుగతా అపశ్యన్<1/>దేవాత్మశక్తిం స్వగుణైర్నిగూఢామ్` |
| Dhyaanaavasthita tadgatena manasaa pashyanti yam yoginah | ధ్యానావస్థిత తద్గతేన మనసా పశ్యంతి యం యోగినః |
| `śrī bhūyuta śrī hari cihnitābhyām agastya rekhādibhirancitābhyām \|<1/>nigūdha bījākṣara mudritābhyām namo namah(s) sadguru pādukābhyām \|\|` | `శ్రీ భూయుత శ్రీ హరి చిహ్నితాభ్యామ్ అగస్త్య రేఖాదిభిరంచితాభ్యామ్ ।<1/>నిగూఢ బీజాక్షర ముద్రితాభ్యామ్ నమో నమః సద్గురు పాదుకాభ్యామ్ ॥` |
| śivāya rudrāya namaḥ | శివాయ రుద్రాయ నమః |
| Ga·ṇa·pa·ti·sa·chchi·dā·nan·da | గ·ణ·ప·తి·స·చ్చి·దా·నం·ద |

The Navanatha bijas follow the syllables. The 2nd bija is ణం (from ṇa) and the 8th is నం
(from nan), even though the English writes both as "Nam". The others are గం, పం, తిం, సం, చిం,
దాం, దం. The swaras are స రి గ మ ప ద ని.

## 4. Numbers (checked automatically by the build)

The build rejects a translation if its runs of ASCII digits differ from the English (see
`checkTranslation` in `src/i18n/engine.mjs`). A rejected segment falls back to English.

- Always keep Western digits 0–9 exactly as in the English. Never use Telugu numerals (౧౨౩).
- Keep the digit grouping as written: `100,000` stays 100,000, never 1,00,000 or "1 లక్ష".
  Likewise `2,000+`, `1,512`, `14.59 MB`, `570 025`, and phone numbers.
- Do not add or remove digits. If the English spells a number as a word ("nine days", "forty
  countries", "twelve countries"), write it as a Telugu word (తొమ్మిది రోజులు, నలభై దేశాలు).
  If the English uses digits, keep the digits.
- Ordinals: 20th becomes 20వ, and 3rd Stage becomes 3వ స్టేజ్. "No. 1" becomes నం. 1.
- Roman numerals (I, II, III, IV, and i, ii, iii) stay as they are.
- Units: km is కి.మీ., ft is అడుగులు (అ. in a large stat number), sq ft is చదరపు అడుగులు
  (చ.అ. in tight labels), acres is ఎకరాలు, and min is నిమిషాలు. ₹, MB and KB stay unchanged. Ranges keep the en dash: 15–20 నిమిషాలు.

## 5. Times and dates

Put the Telugu time-of-day word before the time, and keep the digits and colon exactly.
Never switch to the 24-hour clock: 8 PM must not become 20:00, because that changes the digits.

| English | Telugu word |
|---|---|
| 3:00–4:59 AM | తెల్లవారుజామున |
| 5:00–11:59 AM | ఉదయం |
| 12:00–3:59 PM | మధ్యాహ్నం |
| 4:00–6:59 PM | సాయంత్రం |
| 7:00 PM–2:59 AM | రాత్రి |

- "6:00 AM" becomes ఉదయం 6:00, and "6:00 PM daily" becomes ప్రతిరోజూ సాయంత్రం 6:00.
- "6 AM – 12 PM · 4 PM – 8 PM" becomes ఉదయం 6 – మధ్యాహ్నం 12 · సాయంత్రం 4 – రాత్రి 8.
- "9 AM – 12 PM · 3:30 – 6 PM" becomes ఉదయం 9 – మధ్యాహ్నం 12 · మధ్యాహ్నం 3:30 – సాయంత్రం 6.
- "Abhisheka 7 AM · Aarti 6 PM" becomes అభిషేకం ఉదయం 7 · హారతి సాయంత్రం 6.
- "5:40 AM" becomes ఉదయం 5:40, and "Sat & Sun · 7:10 PM" becomes శని & ఆది · రాత్రి 7:10.
- "3 AM" in prose becomes తెల్లవారుజామున 3 గంటలకు. The ticks of the 24-hour TV chart stay short:
  రాత్రి 12, రాత్రి 3.
- "5 PM onwards" becomes సాయంత్రం 5 నుంచి, "Around 8 AM" becomes ఉదయం సుమారు 8 గంటలకు, and
  "gates close at 11 PM" becomes రాత్రి 11 గంటలకు ద్వారాలు మూసివేస్తారు.
- IST stays IST in labels. Spelled out, it is భారత ప్రామాణిక కాలమానం.
- Dates keep the English order, day then month then year: "26 May 1942" becomes 26 మే 1942. In
  prose, add the case ending: 26 మే 1942న. "21–23 Dec 2026" becomes 21–23 డిసెంబర్ 2026.
  "Sun 29 Nov 2026" becomes ఆది, 29 నవంబర్ 2026.
- Years and decades: "in 1966" is 1966లో, "since 1966" is 1966 నుంచి, "Mid-1970s" is
  1970ల మధ్యలో, and "Early 1990s" is 1990ల ప్రారంభంలో.
- Month names (full): జనవరి, ఫిబ్రవరి, మార్చి, ఏప్రిల్, మే, జూన్, జులై, ఆగస్టు, సెప్టెంబర్,
  అక్టోబర్, నవంబర్, డిసెంబర్. Use the short forms only where the English abbreviates inside a
  small date chip: జన, ఫిబ్ర, మార్చి, ఏప్రి, మే, జూన్, జులై, ఆగ, సెప్టెం, అక్టో, నవం, డిసెం.
- Weekdays: ఆదివారం, సోమవారం, మంగళవారం, బుధవారం, గురువారం, శుక్రవారం, శనివారం. The short
  forms are ఆది, సోమ, మంగళ, బుధ, గురు, శుక్ర, శని.
- For lunar months and tithis, use the Telugu calendar names in `te.json`: Pausha is పుష్యం,
  Kartika is కార్తీకం, Pratipada is పాడ్యమి, and Chaturthi is చవితి. "Chaitra Shuddha Pratipada"
  becomes చైత్ర శుద్ధ పాడ్యమి.

## 6. UI tone

- Keep labels short and natural, about as long as the English. Do not write explanatory
  sentences on buttons.
- Buttons and links that perform an action use the polite imperative: పూజ బుక్ చేయండి,
  విరాళం ఇవ్వండి, వెతకండి, చూడండి, షేర్ చేయండి, మరిన్ని చూపించండి.
- Navigation items and headings use nouns: మా గురించి, దర్శనం & పూజ, బోధనలు, సందర్శన,
  కార్యక్రమాలు & పండుగలు.
- Use the loanwords Telugu users already know, written in Telugu script: ఆన్‌లైన్, యాప్, లైవ్,
  బుక్, డౌన్‌లోడ్, షేర్, మెనూ, వీడియో. Do not coin heavy Sanskritised replacements for them.
- Form validation messages may begin with దయచేసి: "Please enter your Name" becomes
  దయచేసి మీ పేరు నమోదు చేయండి. Elsewhere, avoid filler politeness.
- Placeholders such as `<1>…</1>` and `<2/>` must appear exactly once each, with the same
  nesting. You may move them to fit Telugu word order. Case endings go outside the tag:
  `<1>దత్త నగర్</1>కు`.
- Fragments with leading or trailing spaces ("Showing ", " centres listed here", "Closed · opens ")
  are joined to a number or name by the page's script. Keep the spaces, and word each fragment
  so the joined sentence reads naturally. Where Telugu word order cannot fit the slot, use a
  neutral wording.
- Every translated segment must contain Telugu script, unless it is left exactly identical to
  the English (for example, "YouTube" or "IST" on their own).

## 7. Keep in Latin script, unchanged

- Brand and platform names: YouTube, Facebook, Instagram, X, WhatsApp, Telegram, Vimeo, Spotify,
  Apple Music, App Store, Google Play, Google Map, iPhone, iPad, Android. Telugu case endings
  attach directly: YouTubeలో.
- Email addresses, URLs (dattapeetham.org), phone numbers, social handles (@sgsbirds,
  sgsswamiji), file formats (MP3, PDF), and name@example.com.
- Titles of English-language books ("Datta Speaks", "Reflections of the Absolute") stay in
  English. Titles of books in Indian languages are transliterated (Tripura Rahasyam becomes
  త్రిపుర రహస్యం). The language tag beside a title is always translated.
- The A–Z letter headings of the glossary on the Teachings page (the list stays in English
  order), and the ॐ glyph.
- App names are transliterated, not translated: SGS Panchangam becomes ఎస్‌జీఎస్ పంచాంగం.
  The acronyms SGS and SDHS are ఎస్‌జీఎస్ and ఎస్‌డీహెచ్‌ఎస్.

## 8. Script and punctuation

- End sentences with a full stop (.). Use । and ॥ only in verses.
- Keep the curly quotes “ ” ‘ ’, the · separators, en dashes in ranges, em dashes, and the
  ellipsis character (…).
- Keep HTML entities exactly as they appear in the English segment: where it has `&amp;`,
  write `&amp;`. Where it has a plain `&`, write a plain `&`.
- Use the zero-width non-joiner (U+200C) where a loanword needs a visible halant before the next
  letter: ఆన్‌లైన్, సబ్‌స్క్రైబ్, ఎస్‌జీఎస్. Do not strip it.
- Use the Unicode Telugu block only. Do not use Kannada look-alike letters or ASCII
  transliteration.
- Write the doubled ḷ with ల-vattu: ళ్ల (వెళ్లండి, హోటళ్లు, బళ్లారి, మేటగళ్లి), not ళ్ళ.
- "Largest" is one word: అతిపెద్ద.

## 9. Decisions from the editorial pass

The six chunks were made consistent in one editing pass. These choices now apply everywhere:

- Guinness record titles have one fixed wording (they are in `te.json`): బోన్సాయ్ వృక్షాల అతిపెద్ద
  ప్రదర్శన, ఒకే పక్షిశాలలో అత్యధిక పక్షి జాతులు, అతిపెద్ద సంగీత చికిత్స పాఠం, సుదీర్ఘ పఠన మారథాన్
  (బృందం), ప్రపంచంలోనే అతిపెద్ద ప్రత్యేక స్టాంపు. The organisation is గిన్నిస్ వరల్డ్ రికార్డ్స్;
  a record, or several records counted, is గిన్నిస్ ప్రపంచ రికార్డు / రికార్డులు.
- "Live" is లైవ్ in every UI sense (లైవ్ దర్శనం, లైవ్ స్థితి, లైవ్‌గా రికార్డ్ చేసిన). ప్రత్యక్ష is
  kept only for "in person" and for the ritual name ప్రత్యక్ష పాద పూజ.
- Film and event titles: “Sri Swamiji Unveiled” is శ్రీ స్వామీజీ — ఆవిష్కరణ; the Nara conference
  “Sound, then Truth” is “నాదం, ఆపై సత్యం”.
- Short labels: ఒక్క చూపులో (At a glance), ఇప్పుడు మైసూరులో (Now in Mysuru), మా చిరునామా (Find us),
  శ్రీ స్వామీజీ వారి ఆశ్రమం (An Ashram of Sri Swamiji), ముఖ్య ఘట్టాలు (Milestones), సంగీత కచేరీలు
  (Concerts).
- In the Teachings glossary, the "Pooja — ref. puja" entry explains that both English spellings
  exist, because both headwords are పూజ in Telugu.
- Hidden search strings (`data-q` on the Centres page) hold the Telugu names followed by the
  English ones, so visitors can search in either script. They are in NFD form on purpose.

## 10. The devotional sound

These strings belong to the opening-curtain invitation, the round sound button and its panel,
and the small card shown on slow connections. The English is in `src/features/devotion-sound.mjs`;
the Telugu is in `src/i18n/te/part-99-devotion.json`.

- **Terms** (all in `te.json`):
  - Flute is వేణువు. Flute music is వేణుగానం, the usual Telugu word for flute playing
    (వేణుగాన కచేరీ). Do not use the calque వేణు సంగీతం, the loanword ఫ్లూట్, or మురళి.
    Inside names the compound form stays as it is: దత్త వేణు, ఎస్‌జీఎస్ దత్త వేణు.
  - Raga Mohanam is మోహన రాగం, the same pattern as సామ రాగం and వీణావాదిని రాగం. The raga on its own
    is మోహనం.
  - Tanpura and Tambura are both తంబురా (plural తంబురాలు), as on the music and attractions pages.
  - Shankha (conch) is శంఖం. The conch sound is not used yet: it stays off until the Peetham has
    listened to it, so there is no Telugu string for it.
  - "Sound" as the name of the control is ధ్వని: ధ్వని సెట్టింగ్‌లు (Sound settings), ధ్వని బటన్ (the
    sound button). Where the music and teachings pages speak of sound as Nada, keep నాదం.
  - Temple sounds are ఆలయ ధ్వనులు. Volume is the loanword వాల్యూమ్, as on Telugu phones.
- **Labels:** వేణుగానంతో ప్రవేశించండి (Enter with flute music) and నిశ్శబ్దంగా ప్రవేశించండి (Enter in
  silence) are parallel and about the same length. నిశ్శబ్దంగా means without sound. మౌనం is kept
  for "Observe silence" (not speaking) on the visit page.
- **The card on slow connections:** the question is చదువుతున్నప్పుడు వేణుగానం వింటారా?, the
  usual polite way to offer something in Telugu. Do not use the blunt కావాలా?. The buttons are
  వేణుగానం వినండి (Play flute music) and ఇప్పుడు వద్దు (Not now). వినండి answers the question
  directly, and these are the forms that fit the 300px card the way the English does: the
  question on one line and the two buttons side by side. The longer వినాలనుకుంటున్నారా? and
  వేణుగానం ప్లే చేయండి each pushed the card onto an extra line (measured at 360, 390 and 1440 px).
- The credit is the client's own wording: వేణువు: ఈ వెబ్‌సైట్ కోసం రూపొందించిన మౌలిక రాగ రచన.
  "Original" is మౌలిక, as in మౌలిక రచన (an original work). Do not use అసలైన, which reads as "genuine".
  The raga is traditional and the composition is new, so do not turn it into "a new raga", and
  do not attribute the music to Sri Swamiji.
- Status lines are whole short sentences ending in a full stop: సంగీతం ఆఫ్‌లో ఉంది. "Tap" is
  స్క్రీన్‌ను తాకడం. "Could not be loaded" is లోడ్ కాలేదు, which is neutral, with no "we".
