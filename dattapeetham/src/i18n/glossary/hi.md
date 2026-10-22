# Hindi (हिन्दी) style guide: Avadhoota Datta Peetham website

All Hindi translators follow this guide. Use it together with `glossary/hi.json`. Translations go in `src/i18n/hi/*.json`, not in this folder.

## 1. The glossary comes first

- Every name and term listed in `hi.json` must be written exactly as it appears there, every time. Do not swap in a synonym or a different spelling, even when a variant looks "more correct". For example, always write श्री स्वामीजी, never श्री स्वामी जी or स्वामीजी महाराज.
- Variant English spellings map to one Hindi form. Ashram/Ashrama → आश्रम. Puja/Pooja → पूजा. Aarti/Arati → आरती. Venkateshwara/Venkateswara → वेंकटेश्वर. Nuzvid/Nuzvidu → नूज़िवीडु. Raga Sagara/Ragasagara → राग सागर.
- If a term is missing, transliterate it the way devotees would pronounce it, and add it to `hi.json` in the same pull request so the next translator uses the same form.
- Brand: **अवधूत दत्त पीठम्**. Short forms are दत्त पीठम् and पीठम्. पीठम् is masculine: पीठम् का मिशन, पीठम् के आश्रम.
- Name fragments, possessives and gender:
  - "Sri Swamiji’s" → श्री स्वामीजी का / की / के. The ending agrees with the noun that follows: श्री स्वामीजी का संदेश, श्री स्वामीजी की शिक्षाएँ, श्री स्वामीजी के प्रवचन.
  - Common genders: आश्रम (m), दर्शन (m), होम (m), अभिषेक (m), मंदिर (m), पूजा (f), सेवा (f), आरती (f), साधना (f), यात्रा (f).

## 2. Register: dignified, devotional, respectful

- **Honorific plural, always.** The Swamijis, the Gurus of the lineage, Sri Jayalakshmi Maata, the saints (Sripada Vallabha, Narasimha Saraswati) and all deities take plural, respectful grammar. English uses a capital He/His/Him for them. In Hindi, use वे / उन्हें / उनका / उन्होंने, never वह / उसे / उसका / उसने.
  - "Sri Swamiji says…" → श्री स्वामीजी कहते हैं… (not कहता है)
  - "Sri Swamiji founded the Ashram in 1966." → श्री स्वामीजी ने 1966 में आश्रम की स्थापना की।
  - "Lord Dattatreya is the Adi Guru." → भगवान दत्तात्रेय आदि गुरु हैं।
  - "She imparted Sri Vidya to Sri Swamiji." → उन्होंने श्री स्वामीजी को श्रीविद्या प्रदान की।
- **Devotional vocabulary** where English is plain:

  | English | Hindi |
  |---|---|
  | Sri Swamiji visited / came | श्री स्वामीजी पधारे |
  | gave a discourse | प्रवचन दिया |
  | blessed | आशीर्वाद दिया |
  | consecrated | प्राण-प्रतिष्ठा की |
  | installed (an idol) | प्रतिष्ठापित किया / स्थापना की |
  | attained Mahasamadhi | महासमाधि ली |
  | idol (of a deity) | विग्रह |
  | statue or image | प्रतिमा / मूर्ति |
  | birthday (of the Swamijis) | जन्मदिवस |

- **Addressing the reader:** always आप, never तुम or तू. Polite requests use कृपया … करें. Invitations can be warm, for example "Visit the Ashram" → आश्रम पधारें.
- **Plain, natural Hindi.** Keep the tone devotional, but do not overload sentences with rare Sanskrit (तत्सम) words. Everyday loanwords that devotees actually use are fine: ऑनलाइन, ऐप, वीडियो, लाइव, बुक करें.
- Sanskrit terms that are already Hindi words stay as they are: दर्शन, सेवा, पूजा, होम, अभिषेक, आरती, सत्संग, भजन, प्रसाद. Do not explain them with English glosses.

## 3. Spelling conventions

- **Anusvara (ं) in Hindi text and in glossary names:** संत, मंदिर, आनंद, सच्चिदानंद, मंत्र, पंचांग, गंगा. Do not use the half-nasal form (सच्चिदानन्द, मन्दिर).
  - The language name stays **हिन्दी**, because that is how the language switcher writes it.
  - Sanskrit verses follow their own spelling (section 4).
- **Chandrabindu (ँ)** where the vowel is nasal: माँ, यहाँ, पहुँचें, जाएँ, सेवाएँ.
- Verb forms use ए/ई, not ये/यी: गए, गई, लिए, चाहिए.
- **Nukta** only on English or Perso-Arabic loanwords: फ़ोन, फ़ोटो, फ़ेसबुक, ज़्यादा. Never on Sanskrit or Indian names.
- **श्री** for "Sri". It is a separate word, except where it is part of a fixed compound (श्रीचक्र, श्रीविद्या, श्रीपाद).
- Title compounds are written joined: स्वामीजी, माताजी, हनुमानजी (only if the English says "Hanumanji"). "Swami" on its own is स्वामी.
- **Punctuation:**
  - End Hindi sentences with । (purna viram). ? and ! stay the same.
  - Keep the source's quotation marks (“ ”, ‘ ’), the · separators, — (em dash) and – (en dash in ranges).
  - Keep `&amp;` and other HTML entities exactly as they appear in the segment.
- **Acronyms** are written in Devanagari: एसजीएस, एसडीएचएस, डीकेवाई. Emails, URLs, social handles, hashtags and app-store IDs stay in Latin script, unchanged.
- **Book, album and app titles:** transliterate the title (कवच मंजरी, सूर्य प्रभा राग सागर, एसजीएस पंचांगम्). Translate the language tag next to it (Telugu → तेलुगु). If a sentence tells the reader to search an app store, you may add the Roman name once in brackets, for example भक्तिमाला (Bhaktimala).

## 4. Sanskrit verses, mantras and chants

Write them in Devanagari, faithfully. **Do not paraphrase, summarise or "Hindi-ise" a verse, and do not translate the verse line itself.** If the English gives a meaning (often a "Meaning." paragraph or a gloss in brackets), translate that meaning into Hindi as normal prose. The label "Meaning" is अर्थ.

- **Diacritic-marked Roman → Devanagari, letter for letter:**

  | Roman | Devanagari |
  |---|---|
  | ā | आ / ा |
  | ī | ई / ी |
  | ū | ऊ / ू |
  | ṛ | ऋ / ृ |
  | ṁ, ṃ | ं |
  | ḥ | ः |
  | ś | श |
  | ṣ | ष |
  | ṭ, ḍ | ट, ड |
  | ṇ | ण |
  | ñ | ञ |
  | ṅ | ङ |

  - A final consonant takes a halant: हनुमन्, भवन्तु.
  - A nasal written as n or m before a consonant stays as that consonant, as in the source (भवन्तु). This is the one place where the anusvara rule in section 3 does not apply.
- **Verse marks:** `|` → `।` and `||` → `॥`. Keep the `<1/>`, `<2/>` line-break placeholders exactly where they are.
- **Word division:** never add, drop or change a syllable. You may join or split words to match the standard text when the Roman split is clearly a slip, for example "duḥkhakṣaya karobhava" → दुःखक्षयकरो भव.
- **Sandhi hints** like "namah(s)" or "bindurūpaḥ(s)" are reading aids for Roman-script readers. Render them as the visarga (नमः, बिन्दुरूपः) and drop the bracket.
- **Simplified Roman without diacritics:** use the standard Devanagari form of the same words. "Namaha" (meaning namaḥ) → नमः.
  - "Lokah samastah sukhino bhavantu" → लोकाः समस्ताः सुखिनो भवन्तु
  - "Sri Ganeshaya Namaha" → श्री गणेशाय नमः
  - "108 – Om Aim Hreem Shreem Shiva Rama Anagha Dattaaya Namaha" → 108 – ॐ ऐं ह्रीं श्रीं शिव राम अनघ दत्ताय नमः
- **Example** (darshan page):
  `tvamasmin kāryaniryoge pramāṇaṁ harisattama |<1/>hanuman! yatnamāsthāya duḥkhakṣaya karobhava ||`
  → `त्वमस्मिन् कार्यनिर्योगे प्रमाणं हरिसत्तम ।<1/>हनुमन्! यत्नमास्थाय दुःखक्षयकरो भव ॥`
- A mantra quoted inside an English sentence is written in Devanagari inside the Hindi sentence. For example, "Keep chanting śivāya rudrāya namaḥ" → रुद्र होम के दौरान शिवाय रुद्राय नमः का जप करते रहें।
- **Seed syllables:**
  - The Navanatha seed syllables are गं, णं, पं, तिं, सं, च्चिं, दां, नं, दं, taken from the syllables of Swamiji's name, Ga·ṇa·pa·ti·sa·chchi·dā·nan·da = ग·ण·प·ति·स·च्चि·दा·नन्·द.
  - "Nam" appears twice in English but stands for two different syllables: the 2nd kshetra (Nellore) is णं and the 8th (Eluru) is नं.
  - The svara names on the Nada Mantapa page follow Carnatic usage: Sa स, Ri रि, Ga ग, Ma म, Pa प, Da ध, Ni नि.
  - The syllables of "Guru" are Gu गु and Ru रु.

## 5. Numbers: keep the Western digits exactly

The build rejects any Hindi string whose digit sequences differ from the English, and that string then falls back to English. So:

- **Western digits only** (0–9). Never use Devanagari digits (०–९).
- **Keep grouping and separators exactly:** `100,000` stays `100,000`, never `1,00,000` or "1 लाख". `2,649`, `1,800+`, `+91 (0821) 2486 486` and `570 025` all stay as written.
- **Don't change how a number is written.** A number written as a word in English is written as a word in Hindi: "sixteen Datta Kshetras" → सोलह दत्त क्षेत्र. A number written as digits stays as digits: "16 Datta Kshetras" → 16 दत्त क्षेत्र. Never add a digit that is not in the source, and never drop one.
- **Ordinals:** keep the digit and add the Hindi suffix.
  - Most numbers take वाँ / वीं / वें, agreeing in gender and case: "80th birthday" → 80वाँ जन्मदिवस; "on his 80th birthday" → उनके 80वें जन्मदिवस पर; "the 22nd Chaturmasya" → 22वाँ चातुर्मास्य.
  - The irregular forms are 1ला, 2रा, 3रा, 4था, 6ठा.
- **Roman numerals** (Chapter IV, I, II) stay as Roman numerals.
- **Units:** km → किमी, ft → फ़ुट, sq ft / square feet → वर्ग फ़ुट, acres → एकड़. Keep `~`, MB, KB, MP3 and PDF as they are. "Rs." → रु.; INR and USD stay as they are.

## 6. Times and dates

- **Same digits, natural Hindi.** Drop AM/PM, add the part of the day in front, and add बजे after the time:

  | Time | Part of day | Example |
  |---|---|---|
  | 5:00 – 11:59 AM | सुबह | "6:00 AM" → सुबह 6:00 बजे; "5:40 AM" → सुबह 5:40 बजे |
  | 12:00 – 3:59 PM | दोपहर | "12 PM", "12 noon" → दोपहर 12 बजे; "12:30 PM" → दोपहर 12:30 बजे |
  | 4:00 – 7:59 PM | शाम | "6:00 PM" → शाम 6:00 बजे; "7:10 PM" → शाम 7:10 बजे |
  | 8:00 PM – 2:59 AM | रात | "8:00 PM" → रात 8:00 बजे; "11 PM" → रात 11 बजे; "12 AM" → रात 12 बजे |
  | 3:00 – 4:59 AM | तड़के | "3 AM" → तड़के 3 बजे |

- **Ranges:**
  - In running text, use से … तक: "6:00 AM – 12:00 PM" → सुबह 6:00 से दोपहर 12:00 बजे तक.
  - In compact labels and tables, keep the en dash: सुबह 6 – दोपहर 12 बजे.
  - If English already says "Morning"/"Evening" in front of the time, that word becomes the part of the day; do not say it twice. "Morning 6:00 AM – 12:00 PM" → सुबह 6:00 – दोपहर 12:00 बजे.
- **Short UI cells** (a bare "7:10 PM" in a schedule) may drop बजे: शाम 7:10. Be consistent within one table.
- **"daily"**: "7:00 AM daily" → प्रतिदिन सुबह 7:00 बजे.
- **IST** stays as "IST". Spell it out as भारतीय मानक समय only where English spells it out.
- **Dates** keep the English order, day first: "26 May 1942" → 26 मई 1942; "21–23 Dec 2026" → 21–23 दिसंबर 2026.
  - Use the full Hindi month name. In tight date badges where English abbreviates, use these short forms: जन॰, फ़र॰, मार्च, अप्रैल, मई, जून, जुलाई, अग॰, सित॰, अक्टू॰, नव॰, दिस॰.
  - Short weekdays: रवि, सोम, मंगल, बुध, गुरु, शुक्र, शनि.
- **Hindu lunar months and tithis** come from the glossary: चैत्र … फाल्गुन, शुद्ध, बहुल, पूर्णिमा. "about Mar to Apr" → लगभग मार्च से अप्रैल.

## 7. UI tone

- Labels are short and natural, the way Indian Hindi websites write them.
- Buttons and actions use the polite -एँ / -ें form: खोजें, दान करें, पूजा बुक करें, और पढ़ें, साझा करें, सुनें, देखें, कॉपी करें.
- Do not end a button with a full stop.
- Navigation items are nouns: परिचय, श्री स्वामीजी, दर्शन और पूजा, उपदेश, सेवा, यात्रा, मीडिया, संपर्क.
- Keep labels about as long as the English, because they sit in tight menus and buttons. Prefer one common word over a phrase ("Search" → खोजें, not जानकारी खोजने के लिए यहाँ क्लिक करें).
- Status messages are short and plain: अभी खुला है, आज बंद, कॉपी हो गया, पृष्ठ नहीं मिला.
- Form errors are polite requests: "Please enter your Name" → कृपया अपना नाम लिखें.
- Screen-reader labels (aria-label, alt) are translated naturally and in full. Do not leave them in English.

## 8. Technical rules (the build checks these)

- **Placeholders** `<1>…</1>`, `<2/>` must all appear, with the same numbers and the same nesting.
  - You may move a placeholder pair to suit Hindi word order: "Send a <1>message</1>" → `<1>संदेश</1> भेजें`.
  - Never drop, merge or renumber them.
- Every Hindi string must contain Devanagari, or be byte-identical to the English. Strings like `mail@dattapeetham.com`, `IST` or `YouTube @dattakriyayoga108` can stay identical.
- **Leading and trailing spaces in a segment are significant.** These are script fragments that are joined to numbers or names, for example `"Now in Mysuru · "` and `" centres listed here"`. Keep the same spaces, and phrase each fragment so the joined result still reads as Hindi.
