# Avadhoota Datta Peetham — website rebuild

Phase 1: the new homepage for www.dattapeetham.org, built as a single
self-contained `index.html` with no build step or dependencies.

## Run it

**Windows:** double-click `dattapeetham\index.html`, or serve it locally:

```powershell
cd dattapeetham
npx serve .
```

**Deploy:** upload `index.html` to any static host. On Vercel or Netlify, set
the root directory to `dattapeetham`; it has no build command.

## What's on the homepage

The content comes from the live dattapeetham.org (October 2026), reorganised
into a clearer flow:

1. Live status bar: shows whether the temple and Shuka Vana are open, using
   Mysuru time (IST).
2. Hero, followed by timing cards for the temple, Shuka Vana and the Karya
   Siddhi Hanuman temple.
3. Announcements: Ask Dattaji and Bhaktimala.
4. Sri Swamiji and Sri Bala Swamiji.
5. Latest sevas, with WhatsApp, Facebook and Telegram share buttons.
6. Guru Parampara, plus the Datta Vaakya and Vijaya Vyakhya discourses.
7. Mandir Nagari: the four main temples.
8. Nada Chikitsa: concerts, plus albums on Spotify and Apple Music.
9. Datta Kriya Yoga.
10. Seva tabs: Kamadhenu Goshala, Veda Pathashala and SGS Hospital.
11. Attractions: Shuka Vana, Bonsai Garden, Vishwam Museum and Nada Mantapa.
12. Plan your visit: address, travel tips and a Google map.
13. Datta Peetham app and the 18 SGS apps.
14. Donate band and footer.

Poojas, donations, store, sign-in, events and every deep page still link to
the existing dattapeetham.org system. That system handles the payments and
accounts, so nothing transactional was rebuilt.

Images load directly from the Peetham's own S3 bucket
(`dattapeetham.s3.amazonaws.com`).

## For the Ashram to confirm

- **Shuka Vana timings.** The current homepage says 9–12 and 3:30–6. The Shuka
  Vana page says 10–12:30 and 3:30–5:30, and also says it is "temporarily
  closed for maintenance". This homepage uses the homepage timings. Change
  them in the `HOURS` object near the bottom of `index.html` and in the
  matching timing card.
- **Stat strip.** "12 countries" is the number of countries in the
  ashram-centers filter. "13 World Records" comes from the official banner.

## Next phases

Rebuild the inner pages in the same design: Sri Swamiji and the timeline,
Guru Parampara, Temples & Shrines, Attractions, Seva, Music, Kriya Yoga,
Visit, Festivals, Centers & the 16 Datta Kshetras, Media, and Contact.
