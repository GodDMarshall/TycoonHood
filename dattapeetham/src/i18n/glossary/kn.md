# Kannada (ಕನ್ನಡ) style guide: Avadhoota Datta Peetham website

Every Kannada translator follows this guide together with `kn.json` in this folder.
`kn.json` fixes the spelling of every name and recurring term (`{ "English": "ಕನ್ನಡ" }`).
Translations go in `src/i18n/kn/`. Nothing in this folder is shipped to the site.

## 1. Use the glossary

- If a term is in `kn.json`, use that exact spelling everywhere. The English spells some names
  more than one way (Ashram/Ashrama, Puja/Pooja, Aarti/Arati, Ganapathy/Ganapati/Ganapathi,
  Venkateshwara/Venkateswara, Saraswati/Saraswathi/Saraswathy, Sripada/Sri Pada/Sri Paada,
  Bala Swamiji/Balaswamiji, Bhaktimala/Bhakti Mala, Raga Sagara/Ragasagara, Mysore/Mysuru,
  Bangalore/Bengaluru, Annadana/Annadanam). Each set has one Kannada form. Do not carry the
  English variation into Kannada.
- The longest match wins. "Karya Siddhi Hanuman Temple" is ಕಾರ್ಯಸಿದ್ಧಿ ಹನುಮಾನ್ ದೇವಸ್ಥಾನ, from
  its own entry, not built word by word.
- Glossary values are base (nominative) forms. Add Kannada case endings to them in the normal
  way: ಪೀಠದ, ಪೀಠದಲ್ಲಿ, ಆಶ್ರಮಕ್ಕೆ, ಆಶ್ರಮದಲ್ಲಿ, ಮೈಸೂರಿನಲ್ಲಿ, ಶುಕವನದಲ್ಲಿ, ನಾದ ಮಂಟಪದಲ್ಲಿ,
  ಪೂಜೆಯ, ಸೇವೆಗೆ, ಶ್ರೀ ಸ್ವಾಮೀಜಿಯವರ.
- Transliterate the names of people, deities, places, temples and institutions. Translate only
  the common nouns inside them: Temple ದೇವಸ್ಥಾನ, Hospital ಆಸ್ಪತ್ರೆ, Garden ವನ, Museum
  ವಸ್ತುಸಂಗ್ರಹಾಲಯ, Trust ಟ್ರಸ್ಟ್, Hall ಸಭಾಂಗಣ.
- If a term is missing, write it the way Kannada devotees spell the Sanskrit or Kannada word,
  then add it to `kn.json` so the next translator uses the same form.
- Keys with a note in brackets, such as `Nam (2nd syllable ṇa, Nellore)` or
  `PM (4:00–7:59)`, settle an ambiguity. They are not segment text.

The forms used most:

| English | ಕನ್ನಡ |
|---|---|
| Avadhoota Datta Peetham | ಅವಧೂತ ದತ್ತ ಪೀಠ |
| Sri Ganapathy Sachchidananda Ashram(a) | ಶ್ರೀ ಗಣಪತಿ ಸಚ್ಚಿದಾನಂದ ಆಶ್ರಮ |
| His Holiness Sri Ganapathy Sachchidananda Swamiji | ಪರಮಪೂಜ್ಯ ಶ್ರೀ ಗಣಪತಿ ಸಚ್ಚಿದಾನಂದ ಸ್ವಾಮೀಜಿ |
| Sri Swamiji / Appaji | ಶ್ರೀ ಸ್ವಾಮೀಜಿ / ಅಪ್ಪಾಜಿ |
| Sri Datta Vijayananda Teertha Swamiji | ಶ್ರೀ ದತ್ತ ವಿಜಯಾನಂದ ತೀರ್ಥ ಸ್ವಾಮೀಜಿ |
| Sri Bala Swamiji | ಶ್ರೀ ಬಾಲಸ್ವಾಮೀಜಿ |
| Junior Pontiff | ಕಿರಿಯ ಪೀಠಾಧಿಪತಿಗಳು |
| Sri Jayalakshmi Maata | ಶ್ರೀ ಜಯಲಕ್ಷ್ಮೀ ಮಾತಾ |
| Lord Dattatreya / Kaalaagni Shamana Dattatreya | ಶ್ರೀ ದತ್ತಾತ್ರೇಯ / ಕಾಲಾಗ್ನಿ ಶಮನ ದತ್ತಾತ್ರೇಯ |
| Sripada Vallabha / Narasimha Saraswati | ಶ್ರೀಪಾದ ವಲ್ಲಭ / ನರಸಿಂಹ ಸರಸ್ವತಿ |
| Karya Siddhi Hanuman / Rajarajeshwari | ಕಾರ್ಯಸಿದ್ಧಿ ಹನುಮಾನ್ / ರಾಜರಾಜೇಶ್ವರಿ |
| Jaya Guru Datta | ಜಯ ಗುರು ದತ್ತ |
| Mysuru / Chamundi Hill / Mekedatu | ಮೈಸೂರು / ಚಾಮುಂಡಿ ಬೆಟ್ಟ / ಮೇಕೆದಾಟು |
| Shuka Vana / Nada Mantapa / Vishwam Museum | ಶುಕವನ / ನಾದ ಮಂಟಪ / ವಿಶ್ವಂ ವಸ್ತುಸಂಗ್ರಹಾಲಯ |
| Kishkindha Moolika Bonsai Garden | ಕಿಷ್ಕಿಂಧಾ ಮೂಲಿಕಾ ಬೋನ್ಸಾಯ್ ವನ |
| Universal Prayer Hall | ವಿಶ್ವ ಪ್ರಾರ್ಥನಾ ಮಂದಿರ |
| SGS / SDHS | ಎಸ್‌ಜಿಎಸ್ / ಎಸ್‌ಡಿಎಚ್‌ಎಸ್ |
| Datta Kriya Yoga / Nada Chikitsa / Raga Sagara | ದತ್ತ ಕ್ರಿಯಾ ಯೋಗ / ನಾದ ಚಿಕಿತ್ಸೆ / ರಾಗ ಸಾಗರ |
| darshan / seva / puja / homa / abhisheka | ದರ್ಶನ / ಸೇವೆ / ಪೂಜೆ / ಹೋಮ / ಅಭಿಷೇಕ |
| aarti / bhajan / satsang / annadana | ಆರತಿ / ಭಜನೆ / ಸತ್ಸಂಗ / ಅನ್ನದಾನ |
| Guru Parampara / Sanatana Dharma | ಗುರು ಪರಂಪರೆ / ಸನಾತನ ಧರ್ಮ |

## 2. Spelling conventions

- **Brand.** "Avadhoota Datta Peetham" is ಅವಧೂತ ದತ್ತ ಪೀಠ, written as three words. Kannada
  writes the Sanskrit noun as ಪೀಠ, not ಪೀಠಂ, so that it takes case endings: ಅವಧೂತ ದತ್ತ ಪೀಠದ,
  ಪೀಠದಲ್ಲಿ. In the logo segment, `<1>Avadhoota</1><2>Datta Peetham</2>` becomes
  `<1>ಅವಧೂತ</1><2>ದತ್ತ ಪೀಠ</2>`. Write "the Peetham" as ಪೀಠ and "the Ashram" as ಆಶ್ರಮ.
- **Sri** is always ಶ್ರೀ. Write it as a separate word before a name (ಶ್ರೀ ಸ್ವಾಮೀಜಿ, ಶ್ರೀ ದತ್ತ
  ವೆಂಕಟೇಶ್ವರ). It joins the next word only in established compounds: ಶ್ರೀಚಕ್ರ, ಶ್ರೀರಾಮ,
  ಶ್ರೀಕ್ಷೇತ್ರ, ಶ್ರೀಪಾದ, ಶ್ರೀಕೃಷ್ಣ. Smt. is ಶ್ರೀಮತಿ.
- **Swamiji** is always ಸ್ವಾಮೀಜಿ, with a long ī. Swami is ಸ್ವಾಮಿ.
- **"Lord X"** is ಶ್ರೀ X: ಶ್ರೀ ದತ್ತಾತ್ರೇಯ, ಶ್ರೀ ಹನುಮಾನ್, ಶ್ರೀ ಗಣಪತಿ. Do not use the calque
  ಭಗವಾನ್. Lord Shiva is ಶಿವ and Lord Rama is ಶ್ರೀರಾಮ. Mother Goddess is ಜಗನ್ಮಾತೆ. Sage Atri
  is ಅತ್ರಿ ಮಹರ್ಷಿ.
- **Sanskrit -am endings.** When the word is a common noun, drop the final -m, because Kannada
  declines it: Kshetram ಕ್ಷೇತ್ರ, Abhishekam ಅಭಿಷೇಕ, Annadanam ಅನ್ನದಾನ, Mantapam ಮಂಟಪ.
  Published titles keep their ending (ದತ್ತ ಚರಿತ್ರಂ, ಸಚ್ಚಿದಾನಂದ ವಾದ್ಯ ವೈಭವಂ, ಯೋಗ ವಾಸಿಷ್ಠ
  ಹೃದಯಂ), and so do Telugu and Tamil town names (ಭೀಮವರಂ, ಜಯಲಕ್ಷ್ಮೀಪುರಂ, ಅಚರಪಾಕ್ಕಂ).
- **Feminine -ā nouns.** Used as common nouns, they take the Kannada -ೆ ending: ಪೂಜೆ, ಸೇವೆ,
  ದೀಕ್ಷೆ, ಭಜನೆ, ಅರ್ಚನೆ, ಪಾಠಶಾಲೆ, ಗೋಶಾಲೆ, ಪೂರ್ಣಿಮೆ, ಪಾದಯಾತ್ರೆ, ಪರಂಪರೆ. Inside proper names
  they keep -ಾ: ಭಕ್ತಿಮಾಲಾ, ಜ್ಞಾನ ಬೋಧ ಸಭಾ, ಮಾತಾ, ಕಿಷ್ಕಿಂಧಾ.
- **Acronyms.** The Peetham's own Indian institutions are written in Kannada letters:
  ಎಸ್‌ಜಿಎಸ್, ಎಸ್‌ಡಿಎಚ್‌ಎಸ್, ಡಿಕೆವೈ. Acronyms of overseas centres stay in Latin letters (KSHT,
  HDYC, JDYC, TDYC, SGS DYC).
- **Zero-width non-joiner.** U+200C keeps a halant visible before the next letter in loanwords
  and acronyms: ಎಸ್‌ಜಿಎಸ್, ಆನ್‌ಲೈನ್, ಡೌನ್‌ಲೋಡ್, ಆಪ್‌ಗಳು. It is already in the glossary values.
  Do not strip it.
- Use Kannada Unicode (U+0C80–U+0CFF) only. No ASCII transliteration, and no Telugu
  look-alike letters.

## 3. Register and honorifics

The tone is dignified and devotional: standard written Kannada (ಶಿಷ್ಟ ಕನ್ನಡ), as in the
Peetham's own Kannada publications. Use the Sanskrit-origin words devotees use (ದರ್ಶನ,
ಅನುಗ್ರಹ, ಪ್ರವಚನ, ಸಂಕಲ್ಪ, ಪ್ರತಿಷ್ಠಾಪನೆ), and keep plain Kannada for practical text.

- **Sri Swamiji, Sri Bala Swamiji, Sri Jayalakshmi Maata, the Gurus of the lineage and the
  deities** always take the respectful plural: ಶ್ರೀ ಸ್ವಾಮೀಜಿಯವರು / ಶ್ರೀ ಸ್ವಾಮೀಜಿಯವರ /
  ಶ್ರೀ ಸ್ವಾಮೀಜಿಯವರಿಗೆ / ಶ್ರೀ ಸ್ವಾಮೀಜಿಯವರಿಂದ, ಶ್ರೀ ದತ್ತಾತ್ರೇಯರು, ಶ್ರೀ ಜಯಲಕ್ಷ್ಮೀ ಮಾತಾ ಅವರು.
  Their verbs end in -ಅರು/-ಆರೆ: ಹೇಳುತ್ತಾರೆ, ಉದ್ಘಾಟಿಸಿದರು, ಅನುಗ್ರಹಿಸಿದರು, ಅವತರಿಸಿದರು.
- In the English, a capitalised He/His/Him/Himself refers to Sri Swamiji or God. Translate it
  as ಅವರು / ಅವರ / ಅವರಿಗೆ / ಸ್ವತಃ. Never use ಅವನು, ಅವಳು or ಅದು for them.
- Plain headings and labels may use the bare name (ಶ್ರೀ ಸ್ವಾಮೀಜಿ). Running text uses the
  ...ಯವರು forms.
- Prefer the reverent verbs: ದಯಮಾಡಿಸಿದರು (came), ಆಶೀರ್ವದಿಸಿದರು, ಅನುಗ್ರಹಿಸಿದರು, ಪ್ರವಚನ
  ನೀಡಿದರು, ಪ್ರತಿಷ್ಠಾಪಿಸಿದರು (consecrated), ರಚಿಸಿದರು (composed), ಸಂಕಲ್ಪಿಸಿದರು (envisioned).
  Devotees ಪೂಜೆ / ಸೇವೆ ಸಲ್ಲಿಸುತ್ತಾರೆ, ದರ್ಶನ ಪಡೆಯುತ್ತಾರೆ, ಆರತಿ ಬೆಳಗುತ್ತಾರೆ.
- The timeline's historic present ("Sri Swamiji inaugurates Nada Mantapa…") reads more
  naturally in Kannada as the past tense: "…ಶ್ರೀ ಸ್ವಾಮೀಜಿಯವರು ನಾದ ಮಂಟಪವನ್ನು ಉದ್ಘಾಟಿಸಿದರು."
- Captions are noun phrases: "Sri Swamiji offers arati to Lord Dattatreya" becomes
  "ಶ್ರೀ ದತ್ತಾತ್ರೇಯರಿಗೆ ಆರತಿ ಬೆಳಗುತ್ತಿರುವ ಶ್ರೀ ಸ್ವಾಮೀಜಿಯವರು".
- Address the reader as ನೀವು, with polite forms: ಭೇಟಿ ನೀಡಿ, ಸಂಪರ್ಕಿಸಿ, ದಯವಿಟ್ಟು ಗಮನಿಸಿ. Never
  use the bare familiar imperative (ಮಾಡು, ನೋಡು).
- In Sri Swamiji's quoted words, keep his own voice and person: ನಾವು, ನೀವು, as in the English.

## 4. Sanskrit verses, mantras and chants in Roman transliteration

- Render them **faithfully in Kannada script**, syllable for syllable. Do not paraphrase,
  shorten, translate or "improve" a verse, and do not add a meaning inside the verse segment.
  If the English gives a meaning in a separate segment or in brackets, translate that meaning
  into plain Kannada prose.
- Letter values (IAST): ā ಾ/ಆ, ī ೀ/ಈ, ū ೂ/ಊ, ṛ ೃ/ಋ, e ೇ/ಏ and o ೋ/ಓ (always long in Sanskrit),
  ai ೈ, au ೌ, ṁ/ṃ ಂ, ḥ ಃ, ṅ ಙ, c ಚ, ch ಛ (but the site's "chch" is ಚ್ಚ), ñ ಞ, ṭ ಟ, ḍ ಡ, ṇ ಣ,
  th ಥ, dh ಧ, ś ಶ, ṣ ಷ, kṣ ಕ್ಷ, jñ ಜ್ಞ.
- Word-final m becomes ಂ before a consonant, and ಮ್ before a vowel or at the end of a line or
  half-verse. A pronunciation hint such as "namah(s)" is written as the visarga ಃ, and the
  bracket is dropped.
- Write the daṇḍas `|` and `||` as `।` and `॥`, in verses only. Keep every `<1/>` line break
  where it stands.
- Where a letter slip is obvious (the site's note says diacritics were garbled), write the
  standard reading: "nigūdha" is ನಿಗೂಢ and "manipūrakam" is ಮಣಿಪೂರಕಮ್. Never change a word.
- Examples:
  - `Lokah samastah sukhino bhavantu` becomes `ಲೋಕಾಃ ಸಮಸ್ತಾಃ ಸುಖಿನೋ ಭವಂತು`
  - `…namo namah(s) sadguru pādukābhyām ||` becomes `…ನಮೋ ನಮಃ ಸದ್ಗುರು ಪಾದುಕಾಭ್ಯಾಮ್ ॥`
  - `tvamasmin kāryaniryoge pramāṇaṁ harisattama |<1/>hanuman! …` becomes
    `ತ್ವಮಸ್ಮಿನ್ ಕಾರ್ಯನಿರ್ಯೋಗೇ ಪ್ರಮಾಣಂ ಹರಿಸತ್ತಮ ।<1/>ಹನುಮನ್! …`
  - `108 – Om Aim Hreem Shreem Shiva Rama Anagha Dattaaya Namaha` becomes
    `108 – ಓಂ ಐಂ ಹ್ರೀಂ ಶ್ರೀಂ ಶಿವರಾಮ ಅನಘ ದತ್ತಾಯ ನಮಃ`
- A mantra inside an English sentence goes into Kannada script, and the sentence around it is
  translated: “Keep chanting śivāya rudrāya namaḥ during the Rudra Homa.” becomes “ರುದ್ರ
  ಹೋಮದ ಸಮಯದಲ್ಲಿ ‘ಶಿವಾಯ ರುದ್ರಾಯ ನಮಃ’ ಎಂದು ಜಪಿಸುತ್ತಿರಿ.”
- The syllable row `Ga·ṇa·pa·ti·sa·chchi·dā·nan·da` becomes `ಗ·ಣ·ಪ·ತಿ·ಸ·ಚ್ಚಿ·ದಾ·ನಂ·ದ`. The two
  "Nam" seed syllables differ: the 2nd (ṇa, Nellore) is ಣಂ and the 8th (nan, Eluru) is ನಂ.
  See the glossary.
- Keep the ॐ glyph as it is. "Om" in text is ಓಂ.

## 5. Numbers (the build checks these)

- **Always write Western digits (0–9), exactly as in the English.** Never use Kannada
  numerals (೦–೯). The build counts the ASCII digit runs in the source and in the translation,
  and rejects the translation if they differ.
- Do not add or drop a number. "11 PM" is ರಾತ್ರಿ 11, not ರಾತ್ರಿ 11:00. A number written as a
  word stays a word ("twelve countries" is ಹನ್ನೆರಡು ದೇಶಗಳು), and digits stay digits ("12
  countries" is 12 ದೇಶಗಳು). "The first" is ಮೊದಲ, never 1ನೇ.
- Kannada suffixes attach directly to the digits: 1978ರಲ್ಲಿ, 2012ರಿಂದ, 9ರಂದು, 22ನೇ ಚಾತುರ್ಮಾಸ್ಯ
  (for "22nd"). Units follow the number: 70 ಅಡಿ, 40 ಎಕರೆ, 35,000 ಚದರ ಅಡಿ, 15–20 ನಿಮಿಷ.
- Keep phone numbers, PIN codes (570 025), prices, thousands separators (8,000; 1,800+),
  decimals (1.13 MB) and ranges (15–17, with the en dash) exactly as written.

## 6. Times and dates

**Times.** Put the Kannada part of the day before the time and keep the digits unchanged:

| English time | Kannada word | Example |
|---|---|---|
| 4:00 AM – 11:59 AM | ಬೆಳಿಗ್ಗೆ | 6:00 AM → ಬೆಳಿಗ್ಗೆ 6:00 |
| 12:00 PM – 3:59 PM | ಮಧ್ಯಾಹ್ನ | 12:00 PM → ಮಧ್ಯಾಹ್ನ 12:00 |
| 4:00 PM – 7:59 PM | ಸಂಜೆ | 6:00 PM → ಸಂಜೆ 6:00 |
| 8:00 PM – 3:59 AM | ರಾತ್ರಿ | 9:40 PM → ರಾತ್ರಿ 9:40 |
| 12:00 AM | ಮಧ್ಯರಾತ್ರಿ | 12:00 AM → ಮಧ್ಯರಾತ್ರಿ 12:00 |

- Ranges: "6:00 AM – 12:00 PM" is "ಬೆಳಿಗ್ಗೆ 6:00 – ಮಧ್ಯಾಹ್ನ 12:00", and "4:00 PM – 8:00 PM" is
  "ಸಂಜೆ 4:00 – ರಾತ್ರಿ 8:00".
- "7:00 AM daily" is "ಪ್ರತಿದಿನ ಬೆಳಿಗ್ಗೆ 7:00". "Around 8 AM" is "ಬೆಳಿಗ್ಗೆ ಸುಮಾರು 8ಕ್ಕೆ". "at
  6 PM" is "ಸಂಜೆ 6ಕ್ಕೆ".
- Keep "IST" as it is, or use ಭಾರತೀಯ ಕಾಲಮಾನ when the English spells it out. Keep the clock
  placeholder `--:--` unchanged.

**Dates.** Use the Gregorian month names in Kannada (ಜನವರಿ … ಡಿಸೆಂಬರ್; see the glossary).

- In cards, labels and lists, keep the English order: "9 June 1978" is "9 ಜೂನ್ 1978", and
  "15–17 Dec 2026" is "15–17 ಡಿಸೆಂಬರ್ 2026".
- In running text, use the natural Kannada order: "on 9 June 1978" is "1978ರ ಜೂನ್ 9ರಂದು",
  and "On 29th May, 2004" is "2004ರ ಮೇ 29ರಂದು".
- Prefer full month names. Where a chip has to stay short, use the glossary abbreviations
  (ಜನ., ಫೆಬ್ರ., ಮಾರ್ಚ್, ಏಪ್ರಿ., ಮೇ, ಜೂನ್, ಜುಲೈ, ಆಗ., ಸೆಪ್ಟೆಂ., ಅಕ್ಟೋ., ನವೆಂ., ಡಿಸೆಂ.)
  and the weekday forms (ಭಾನು, ಸೋಮ, ಮಂಗಳ, ಬುಧ, ಗುರು, ಶುಕ್ರ, ಶನಿ).
- Hindu months and tithis follow the Kannada pañcāṅga: ಚೈತ್ರ, ವೈಶಾಖ, ಜ್ಯೇಷ್ಠ, ಆಷಾಢ, ಶ್ರಾವಣ,
  ಭಾದ್ರಪದ, ಆಶ್ವಯುಜ, ಕಾರ್ತಿಕ, ಮಾರ್ಗಶಿರ, ಪುಷ್ಯ (Pausha), ಮಾಘ, ಫಾಲ್ಗುಣ. Shuddha is ಶುದ್ಧ, Bahula
  is ಬಹುಳ and Purnima is ಪೂರ್ಣಿಮೆ.

## 7. UI tone

- Keep labels short and natural, and no longer than the English where possible. Navigation
  items are nouns: ಪರಿಚಯ, ಬೋಧನೆಗಳು, ಸೇವೆ, ಭೇಟಿ, ಮಾಧ್ಯಮ, ಸಂಪರ್ಕ. Buttons are polite verbs:
  ದೇಣಿಗೆ ನೀಡಿ, ಪೂಜೆ ಕಾಯ್ದಿರಿಸಿ, ಹುಡುಕಿ, ಇನ್ನಷ್ಟು ಓದಿ, ಆಲಿಸಿ, ವೀಕ್ಷಿಸಿ, ಹಂಚಿಕೊಳ್ಳಿ.
- Fixed UI forms (also in `kn.json`): Live Darshan ನೇರ ದರ್ಶನ, Book a Puja ಪೂಜೆ ಕಾಯ್ದಿರಿಸಿ,
  Donate ದೇಣಿಗೆ ನೀಡಿ, Search ಹುಡುಕಿ, Plan your visit ನಿಮ್ಮ ಭೇಟಿಯನ್ನು ಯೋಜಿಸಿ, Darshan timings
  ದರ್ಶನದ ಸಮಯ, Open (status) ತೆರೆದಿದೆ, Closed ಮುಚ್ಚಿದೆ, Skip to content ಮುಖ್ಯ ವಿಷಯಕ್ಕೆ ಹೋಗಿ.
- Prefer the common Kannada word to an English loan (ಕಾರ್ಯಕ್ರಮ, not ಈವೆಂಟ್). Established tech
  loans are fine: ಆನ್‌ಲೈನ್, ಇಮೇಲ್, ಆಪ್, ಡೌನ್‌ಲೋಡ್, ವಿಡಿಯೊ, ಫೋಟೊ, ಸೈನ್ ಇನ್.
- Write accessible labels (aria-label, alt, title) as clear plain descriptions:
  "Show Seva menu" is "ಸೇವೆ ಮೆನು ತೋರಿಸಿ", and "Open menu" is "ಮೆನು ತೆರೆಯಿರಿ".
- Page titles keep the "Page · Avadhoota Datta Peetham" pattern: "ದರ್ಶನ · ಅವಧೂತ ದತ್ತ ಪೀಠ".
- Script-built fragments with a leading or trailing space ("Closed · opens ", "Today · ",
  "Showing ") are joined to a time, number or name at run time. Keep the spaces, and word the
  fragment so that it still reads correctly when the value is added after it.

## 8. Keep in Latin script, unchanged

- Platform names: YouTube, Facebook, Instagram, WhatsApp, Telegram, Twitter, Vimeo, Spotify,
  Apple Music, App Store, Google Play. Kannada endings attach directly: YouTubeನಲ್ಲಿ.
- Email addresses, URLs (dattapeetham.org), social handles (@sgsbirds), phone numbers, file
  formats and sizes (PDF, MP3, KB, MB), ISO country codes on the map (US, UK, CA…), IST, INR,
  USD, e.V. and name@example.com.
- English-language book titles stay in English (Datta Speaks, Reflections of the Absolute,
  God Word, Musings on Yoga Vaasishta). Titles in Indian languages are transliterated. The
  language tag next to a title is always translated (ಇಂಗ್ಲಿಷ್, ತೆಲುಗು, ಕನ್ನಡ).
- The A–Z letter headings of the Teachings glossary, and the ॐ glyph.
- App names are transliterated, not translated: SGS Panchangam is ಎಸ್‌ಜಿಎಸ್ ಪಂಚಾಂಗ, and
  Walk Mantra is ವಾಕ್ ಮಂತ್ರ.

## 9. Markup and punctuation (the build checks these)

- Keep every placeholder (`<1>…</1>`, `<2/>`) exactly once, with the same nesting. You may
  move placeholders to follow Kannada word order (subject–object–verb). In word-by-word
  animation segments, put the Kannada words into the same placeholders in Kannada order. An
  empty pair is allowed.
- Each translated segment must contain Kannada script, unless it is left exactly identical to
  the English (for example, "YouTube" or "IST" on their own).
- Keep HTML entities exactly as they appear in the English segment: where it has `&amp;`,
  write `&amp;`. Where it has a plain `&`, write a plain `&`. You may translate the word "and"
  as ಮತ್ತು, but keep the entity form wherever the symbol remains.
- End sentences with a full stop (.). Keep the curly quotes “ ” ‘ ’, the · separators, the en
  and em dashes, and the ellipsis character (…). Use । and ॥ only in verses.
