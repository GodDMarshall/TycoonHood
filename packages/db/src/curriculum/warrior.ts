import type { Programme } from "./types";

/**
 * WARRIOR — launch curriculum.
 * Physical development, discipline, resilience, consistency and personal mastery.
 * Bodyweight-first: no assignment requires equipment.
 */
export const warrior: Programme = {
  slug: "warrior",
  modules: [
    // ─────────────────────────────────────────────────────────────
    // MODULE 1 — DISCIPLINE AND CONSISTENCY
    // ─────────────────────────────────────────────────────────────
    {
      title: "Discipline and Consistency",
      description: "Why the body is the best place to practise keeping your word, and how to build a training schedule that survives real life.",
      objectives: [
        "Explain why training is the lowest-stakes place to build discipline that transfers to work and money.",
        "Distinguish consistency from intensity and describe why consistency wins over months.",
        "Define a minimum session you can complete on your worst day.",
        "Write a training contract with fixed days, a minimum dose and a plan for missed sessions.",
      ],
      completion: "Write and sign your training contract, log the first seven days against it, and pass the knowledge check.",
      lessons: [
        {
          title: "The Case for Training",
          type: "READING",
          preview: true,
          minutes: 6,
          md: `Every pillar in TycoonHood gets easier when the body is handled. Not because of how you look. Because training is the cheapest place to practise the one skill underneath everything else: **doing the thing you said you would do, when you do not feel like doing it.**

## The shortest feedback loop you own

A business setback takes months to resolve. A bad quarter in your portfolio takes a year to understand. A missed workout is resolved tomorrow morning. The feedback loop is short, the stakes are honest, and nobody can do the reps for you.

That makes training a practice ground. Each session is a small promise. Keep enough small promises and you start to trust yourself with bigger ones. Break them often and you learn, quietly, that your plans are suggestions.

## What "trained" means here

Not a physique standard. A capability standard:

- You can move your own bodyweight with control: push, pull, squat, hinge, carry.
- You can work hard for 30–45 minutes without your form or focus collapsing.
- You can walk briskly for an hour, climb several flights of stairs and still hold a conversation.
- You train on a schedule that survives a bad week.

That last one is the real curriculum. Anyone can train during a good week.

## Why discipline beats motivation

Motivation is a feeling. It arrives on its own schedule and leaves without notice. If your training depends on it, your training will be as unreliable as your mood.

Discipline is a decision made in advance. You decide on Sunday that you train Monday, Wednesday and Friday at 7 a.m. When Monday comes, there is nothing to decide. You are just executing a plan you already approved.

This programme leans on three tools to make that work:

1. **Fixed appointments.** Training happens at set times, written down, like a meeting you cannot move.
2. **A minimum session.** A version of the workout so small you can do it sick, tired or travelling.
3. **A record.** A log that shows what you actually did, not what you remember doing.

## What this programme will not do

It will not sell you a transformation in 30 days. It will not ask you to buy equipment. Every exercise in Warrior can be done with your bodyweight, a wall, a chair and the floor.

It will ask you to show up, repeatedly, and to write down what happened. That sounds simple because it is. Simple is not the same as easy.

## How to work through it

Eight modules. Each one teaches a principle, then asks you to apply it. Do the assignments. Reading about push-ups does nothing for your chest, and reading about discipline does nothing for your character.

Start with the next lesson. Then book your first session before you finish this module.`,
        },
        {
          title: "Consistency Beats Intensity",
          type: "READING",
          minutes: 7,
          md: `Most people who quit training do not quit because the programme was too easy. They quit because it was too hard to repeat. They start with five brutal sessions a week, get sore, miss two days, feel behind, and stop.

**The best programme is the one you can still be doing in six months.**

## The maths of showing up

Compare two people over twelve weeks:

- **Person A** trains five times a week for three weeks, burns out, and does nothing for nine weeks. Total: 15 sessions.
- **Person B** trains three times a week, misses one session every other week, and keeps going. Total: around 30 sessions.

Person B did double the work with half the drama. Over a year the gap becomes enormous. Fitness compounds like money: small, regular deposits beat occasional big ones.

## Floor, target, ceiling

Plan every session at three levels:

- **Floor:** the minimum session. Ten minutes. For example: two rounds of 10 squats, 5 push-ups (incline if needed), a 30-second plank and a 5-minute walk. You do this on the worst day.
- **Target:** the planned session. Usually 30–45 minutes.
- **Ceiling:** the most you allow yourself to do. This stops a great day from wrecking the next three.

The floor keeps the streak alive. The target drives progress. The ceiling protects recovery. Most beginners have a target and nothing else, so a bad day becomes a zero.

## Never miss twice

You will miss sessions. Illness, travel, a sick child, a deadline. Missing one is noise. Missing two in a row is the start of a new habit: not training.

The rule: **if you miss a planned session, the next one is non-negotiable, even if it is only the floor.** You do not make up the missed session by doubling the next one. You simply return.

## Schedule it like a meeting

"I'll train three times this week" is a wish. "Monday, Wednesday, Friday, 7:00–7:40 a.m., living room" is a plan. Put it in your calendar with a reminder. Treat it like an appointment with someone you respect.

Pick times you actually control. If your evenings are unpredictable, train in the morning. If mornings are chaos with children, take a lunch break walk and a short evening session. The best time is the time that survives contact with your real week.

## Common mistakes

- **Starting too big.** Begin with three sessions a week. Add a fourth only after eight steady weeks.
- **Changing the plan when it gets boring.** Boredom is not a signal that it is not working. It usually means it is.
- **Negotiating in the moment.** Decide the night before. At 6:45 a.m. your brain is a poor negotiator.
- **Counting only perfect sessions.** A floor session counts. Log it as done.

## The identity shift

After a few months, something changes. You stop asking whether you will train today. You are someone who trains on Mondays, Wednesdays and Fridays. That identity is the real result of this module, and it only comes from repetition.`,
        },
        {
          title: "Write Your Training Contract",
          type: "ASSIGNMENT",
          minutes: 25,
          md: `Time to make your commitment concrete. Your assignment: **write a one-page training contract and log the first seven days against it.**

## Step 1: Pick your days and times (5 minutes)

Look at your real calendar for the next four weeks. Choose three training slots per week, each 30–45 minutes. Write them exactly:

- Day and start time (for example, Monday 7:00 a.m.)
- Location (living room, park, spare room)
- What could get in the way, and what you will do instead

Then add the slots to your calendar with a reminder 30 minutes before.

## Step 2: Define your floor session (5 minutes)

Write a 10-minute minimum session you could complete on your worst day. No equipment. A good template:

- 2 rounds of: 10 bodyweight squats, 5–10 push-ups (incline on a table or wall if needed), 20-second plank, 10 glute bridges
- 5 minutes of brisk walking or marching on the spot

Test it now. Time yourself. If it takes longer than 12 minutes, cut it down.

## Step 3: Write your missed-session rule (3 minutes)

One sentence. For example: *"If I miss a session, the next planned session happens no matter what, even if it is only the floor."*

Add a second sentence covering travel or illness: *"When travelling, I do the floor session in my room. When sick with a fever, I rest and walk only."*

## Step 4: Choose where you log (2 minutes)

A notes app, a spreadsheet or a paper notebook. Pick one and only one. Write today's date at the top.

## Step 5: Sign it

At the bottom of the page write: *"I will keep this schedule for four weeks before changing anything."* Sign and date it. It sounds dramatic. It works because it turns an intention into a promise you can be measured against.

## Step 6: Log seven days

For the next seven days, write one line each day:

- Date
- Planned session? (yes or no)
- What you did: target, floor or nothing
- One word on how it felt

Rest days count too. Log them as rest.

## Deliverable

A single page with:

1. Your three weekly slots with times and locations
2. Your floor session, tested and timed
3. Your missed-session rule
4. Your signature and date
5. Seven daily log lines

## What good looks like

A strong contract is boring. It names real times, a tiny floor and a clear rule. A weak contract says "train more" or "work out most days". If yours could be read by someone else and they would know exactly where you will be at 7 a.m. Monday, it is good enough.

When submission opens in the app, attach a photo or copy of the page. Until then, completing this lesson is your word that the contract exists and day one is logged.`,
        },
        {
          title: "Discipline and Consistency — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: "Five questions on the principles behind showing up. Pass to complete the module. Your contract and log are the real test.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "Why does this programme treat training as the place to build discipline first?",
                options: [
                  "Because the feedback loop is short and honest, so you can practise keeping promises quickly",
                  "Because physical results are the most important goal in life",
                  "Because training requires no planning",
                  "Because discipline built in the gym does not transfer to other areas",
                ],
                correct: 0,
                why: "A missed session is visible tomorrow. That short, honest loop makes training an ideal place to practise keeping your word.",
              },
              {
                prompt: "What is a floor session?",
                options: [
                  "A workout done lying on the floor",
                  "The hardest session of the week",
                  "A rest day spent stretching",
                  "A short minimum session you can complete on your worst day",
                ],
                correct: 3,
                why: "The floor keeps the habit alive when everything else goes wrong. It counts as a completed session.",
              },
              {
                prompt: "You missed Wednesday's session. What does the 'never miss twice' rule ask you to do?",
                options: [
                  "Do Wednesday's and Friday's sessions together on Friday",
                  "Restart the programme from week one",
                  "Treat Friday's session as non-negotiable, even if it is only the floor",
                  "Skip the rest of the week and start fresh on Monday",
                ],
                correct: 2,
                why: "One miss is noise. Two in a row starts a new habit. You return at the next session without trying to make up volume.",
              },
              {
                prompt: "Which plan is most likely to survive a hard week?",
                options: [
                  "Train when I feel motivated",
                  "Three fixed calendar slots with a defined minimum session",
                  "Five intense sessions every week from day one",
                  "Train every day until I see results, then reduce",
                ],
                correct: 1,
                why: "Fixed appointments remove daily decisions, and a minimum session prevents bad days from becoming zeros.",
              },
              {
                prompt: "Why set a 'ceiling' for each session?",
                options: [
                  "To stop a great day from creating fatigue that wrecks the next few sessions",
                  "To avoid sweating too much",
                  "Because more training never helps",
                  "To make sessions shorter than the floor",
                ],
                correct: 0,
                why: "Overdoing it on a good day is a common way to lose the following week. The ceiling protects recovery and consistency.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // MODULE 2 — PHYSICAL CONDITIONING
    // ─────────────────────────────────────────────────────────────
    {
      title: "Physical Conditioning",
      description: "Build the aerobic engine and work capacity that make everything else in training and life feel easier.",
      objectives: [
        "Explain the difference between aerobic base work and high-intensity intervals.",
        "Use the talk test and a 1–10 effort scale to control intensity without a heart rate monitor.",
        "Plan a weekly conditioning mix of easy volume and short hard efforts.",
        "Measure and record a personal conditioning baseline you can retest.",
      ],
      completion: "Record your conditioning baseline, complete two weeks of planned conditioning sessions, and pass the knowledge check.",
      lessons: [
        {
          title: "What Conditioning Actually Is",
          type: "READING",
          minutes: 7,
          md: `> **Educational content, not medical advice.** Check with a qualified professional before changing your training or diet if you have a medical condition, injury or are pregnant.

Conditioning is your ability to produce and sustain effort. It is what lets you climb stairs without stopping, play with your kids for an hour, or finish a hard set and recover fast enough to do another one. Strength gets attention. Conditioning gets you through the day.

## Two engines

Your body has two broad ways of supplying energy for effort:

- **Aerobic:** uses oxygen. Slow to ramp up, but it can run for hours. Walking, easy jogging, cycling at a chatty pace.
- **Anaerobic:** fast and powerful but runs out in seconds to a couple of minutes. Sprints, hard burpees, the last reps of a tough set.

The aerobic engine is the foundation. A strong aerobic base helps you recover between hard efforts, between sets and between sessions. Most beginners skip it because it feels too easy to matter. That is exactly why it works: you can do a lot of it without breaking down.

## Measuring effort without gadgets

You do not need a heart rate monitor. Use two tools:

**The talk test.**
- You can speak full sentences comfortably: easy (aerobic base).
- You can speak in short phrases: moderate to hard.
- You can only manage a word or two: very hard.

**The 1–10 effort scale (RPE).**
- 1–2: resting, very light
- 3–4: easy, could go all day
- 5–6: steady, breathing harder but controlled
- 7–8: hard, sustainable for a few minutes at most
- 9–10: near maximal, seconds only

Most of your conditioning should sit at 3–5. A small amount should sit at 7–9.

## How much

Most public-health guidelines recommend roughly 150–300 minutes of moderate activity per week for adults, or about half that if the activity is vigorous. That sounds like a lot until you notice that a 25-minute brisk walk each day covers the low end.

A practical weekly split for a beginner:

- **Easy volume:** 3–5 sessions of 20–45 minutes at effort 3–5. Brisk walks, easy cycling, marching stairs at home.
- **Hard work:** 1–2 short sessions of intervals at effort 7–9, totalling 5–15 minutes of hard work.

This is often called an 80/20 split: most of your time easy, a small share hard.

## Common mistakes

- **Every session is medium-hard.** Too hard to build the base, too easy to sharpen the top end. You end up tired and stuck.
- **Ignoring walking.** Daily walking is conditioning. It counts, and it helps recovery from strength work.
- **Going all out on day one.** Your heart and lungs adapt quickly. Your tendons and joints adapt slowly. Ramp up over weeks.

## Warning signs

Stop and seek medical advice if you feel chest pain or pressure, unusual breathlessness, dizziness, fainting or an irregular heartbeat during exercise. Hard training should feel uncomfortable. It should never feel alarming.

## The takeaway

Build the base with easy, frequent work. Add a small dose of hard work once or twice a week. Measure effort with your breath. The next lesson shows you how to run intervals with nothing but floor space.`,
        },
        {
          title: "Intervals With No Equipment",
          type: "READING",
          minutes: 7,
          md: `> **Educational content, not medical advice.** Check with a qualified professional before changing your training or diet if you have a medical condition, injury or are pregnant.

Intervals alternate short periods of hard work with periods of rest or easy movement. They raise your top-end fitness in little time. They are also easy to overdo. This lesson gives you the formats, the doses and the guardrails.

## Always warm up

Five to eight minutes before any hard effort:

- 2 minutes marching or brisk walking
- 10 arm circles each direction, 10 leg swings each side
- 10 bodyweight squats, 10 alternating reverse lunges
- 30 seconds of the interval movement at half effort

Cold muscles and fast movements are a poor combination.

## Four formats

**1. Work-rest intervals.** Example: 30 seconds hard, 90 seconds easy, repeat 6–8 times. Beginners start with a 1:3 work-to-rest ratio. As you get fitter, move towards 1:2, then 1:1.

**2. EMOM (every minute on the minute).** At the start of each minute do a set number of reps, then rest for what is left of the minute. Example: 8 squat jumps or 10 fast squats each minute for 10 minutes. If you finish with fewer than 20 seconds of rest, lower the reps.

**3. Stair or hill repeats.** Walk or jog up a flight of stairs or a short hill hard, walk down slowly to recover. 6–10 repeats. Excellent and joint-friendly because the downhill is the rest.

**4. Tempo blocks.** Longer and less intense: 3–5 minutes at effort 6–7, then 2 minutes easy, repeated 3–4 times. Good for building the bridge between easy and hard.

## Good interval movements

- Fast bodyweight squats or squat jumps
- Mountain climbers
- Burpees (step back instead of jumping if your wrists or knees complain)
- High knees or fast marching
- Shadow boxing
- Stair climbs

Pick movements you can do with clean form when tired. If form breaks down, the set is over.

## Dose

Beginners: one interval session a week for the first four weeks, 5–8 minutes of total hard work. Then consider two sessions, at least 48 hours apart. More is rarely better. Hard intervals stack fatigue on top of your strength training.

## How to tell it is working

Track two numbers:

- **Reps or rounds completed** at the same effort over the same time.
- **How fast your breathing settles** after each work period. Faster recovery means a better aerobic base.

Write both in your log after each session.

## Common mistakes

- **Treating every interval as a test.** Most should finish at effort 8, not 10. Leave one or two good reps in reserve.
- **Skipping the cool-down.** Walk for 3–5 minutes after the last interval until your breathing returns to conversation level.
- **Doing intervals the day before a hard strength session.** Separate them, or do intervals after strength work on the same day.
- **Using intervals to replace easy work.** They sharpen the base. They do not build it.

## A sample week

- Monday: strength session plus 20-minute walk
- Tuesday: 30-minute easy walk
- Wednesday: strength session
- Thursday: warm-up, 6 × 30 seconds hard / 90 seconds easy, cool-down
- Friday: strength session
- Weekend: one long walk of 45–60 minutes`,
        },
        {
          title: "Your Conditioning Baseline",
          type: "ASSIGNMENT",
          minutes: 30,
          md: `> **Educational content, not medical advice.** Check with a qualified professional before changing your training or diet if you have a medical condition, injury or are pregnant.

You cannot improve what you have not measured. Your assignment: **record a conditioning baseline using four simple tests, then plan two weeks of conditioning around it.**

## Before you start

Do these tests on a day when you slept reasonably and have not trained hard in the last 24 hours. Warm up as described in the previous lesson. Stop any test immediately if you feel dizzy, faint or unwell.

## Test 1: Resting heart rate (3 mornings)

On three mornings this week, before getting up, find your pulse at your wrist or neck. Count beats for 30 seconds and double it. Write down all three and the average. A lower resting heart rate over months usually reflects improving aerobic fitness. Day-to-day changes also hint at fatigue or illness.

## Test 2: The 10-minute talk-test walk

Find a flat route. Walk for 10 minutes as fast as you can while still speaking full sentences. Record the distance (a phone map or step count works) or mark where you finish and use that point to compare next time.

## Test 3: The 3-minute step test

Use the bottom step of a staircase or a sturdy step about 20–30 cm high. Step up and down at a steady pace (up-up-down-down) for 3 minutes. Sit down immediately and take your pulse for 30 seconds, starting one minute after you stop. Double it and record it. Over weeks, a lower number at the same pace means better recovery.

## Test 4: Two-minute squat test

Do as many full bodyweight squats as you can in 2 minutes with good form: hips to at least knee height, heels down, chest up. Rest when needed. Record the total and whether form held to the end.

## Build your baseline sheet

One page or note with:

| Test | Result | Date |
|---|---|---|
| Resting heart rate (average) | | |
| 10-minute walk distance | | |
| Step test recovery pulse | | |
| 2-minute squats | | |

Add a line for how you felt overall: fresh, normal or tired.

## Plan two weeks

Using the previous lesson, write a 14-day plan that includes:

- At least **4 easy sessions per week** of 20–45 minutes at effort 3–5 (walks count)
- **One interval session per week** with 5–8 minutes of total hard work
- Your three strength or floor sessions from Module 1, unchanged

Put every session in your calendar.

## Retest

Book a retest four weeks from today. Same tests, same route, same time of day. Expect modest change. Two to four weeks of steady work often shows up first as a lower step-test pulse and more squats, before the walk distance moves much.

## Deliverable

1. Your completed baseline sheet with all four results
2. Your 14-day conditioning plan with dates
3. A calendar entry for the retest

## What good looks like

Honest numbers, taken under the same conditions you can repeat. A poor baseline is not a problem. It is the starting point that makes your progress visible. The only bad baseline is the one you never recorded.`,
        },
        {
          title: "Physical Conditioning — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: "Five questions on effort, intervals and the aerobic base. Pass to complete the module.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "You can speak full sentences comfortably while walking briskly. Which kind of work is this?",
                options: [
                  "Maximal anaerobic work",
                  "Too easy to count as training",
                  "Interval training",
                  "Easy aerobic base work",
                ],
                correct: 3,
                why: "The talk test places full-sentence effort in the easy aerobic zone, which is the foundation of conditioning.",
              },
              {
                prompt: "What weekly mix suits a beginner building conditioning?",
                options: [
                  "Five hard interval sessions",
                  "Only medium-hard runs every day",
                  "Mostly easy sessions plus one short interval session",
                  "No conditioning until strength is built",
                ],
                correct: 2,
                why: "Most time easy, a small share hard. Easy work builds the base; a little hard work sharpens it.",
              },
              {
                prompt: "A beginner starting work-rest intervals should usually begin with which ratio?",
                options: ["3:1 work to rest", "1:1 work to rest", "1:3 work to rest", "No rest at all"],
                correct: 2,
                why: "Generous rest lets you keep quality high. You shorten rest as fitness improves.",
              },
              {
                prompt: "During an interval set your form starts breaking down. What should you do?",
                options: [
                  "Push through to finish the set",
                  "End the set and rest",
                  "Speed up to finish faster",
                  "Switch to a harder movement",
                ],
                correct: 1,
                why: "When form breaks, the set is over. Poor-quality reps under fatigue raise injury risk without improving fitness.",
              },
              {
                prompt: "Which symptom during exercise means you should stop and seek medical advice?",
                options: [
                  "Chest pain or pressure, or feeling faint",
                  "Burning legs on a hill",
                  "Heavy breathing during a sprint",
                  "Sweating more than usual",
                ],
                correct: 0,
                why: "Discomfort is normal in hard training. Chest pain, fainting or an irregular heartbeat are warning signs, not effort.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // MODULE 3 — STRENGTH AND FITNESS FOUNDATIONS
    // ─────────────────────────────────────────────────────────────
    {
      title: "Strength and Fitness Foundations",
      description: "The five movement patterns, how to progress them with bodyweight alone, and how to write a programme that keeps working.",
      objectives: [
        "Identify the five foundational movement patterns and a bodyweight progression for each.",
        "Apply progressive overload by moving one lever at a time.",
        "Use reps in reserve to judge effort and choose the right difficulty.",
        "Build a four-week bodyweight strength programme with sets, reps and a progression rule.",
      ],
      completion: "Write your four-week strength programme, complete and log the first week, and pass the knowledge check.",
      lessons: [
        {
          title: "The Five Movement Patterns",
          type: "READING",
          minutes: 8,
          md: `Forget body-part splits and long exercise lists. Almost everything useful your body does falls into five patterns. Train each one, get stronger in each one, and you have a complete foundation.

## 1. Push

Moving something away from you. The bodyweight version is the push-up.

**Progression:** wall push-up → incline push-up on a table or kitchen counter → incline on a chair seat → floor push-up → feet-elevated push-up → slow-tempo push-up (3 seconds down).

**Form:** hands under shoulders, body in one straight line, elbows at roughly 45 degrees to your torso, chest to just above the floor.

## 2. Pull

Moving something towards you. Often the weakest pattern for home trainers, because it is harder without a bar.

**Progression:** doorframe row (hold both sides of a sturdy doorframe, lean back, pull yourself in) → table row (lie under a sturdy table, grip the edge, pull your chest up to it) → table row with feet elevated → slow lowering on each rep.

**Check your setup:** test the table or doorframe with a gentle pull first. If it shifts, do not use it. A towel looped around a solid post works too.

## 3. Squat

Lowering your hips between your feet, knees and hips bending together.

**Progression:** sit-to-stand from a chair → bodyweight squat → pause squat (2 seconds at the bottom) → split squat → rear-foot-elevated split squat with the back foot on a chair → single-leg squat to a chair.

**Form:** feet about shoulder width, heels down, knees tracking over the toes, chest proud.

## 4. Hinge

Bending at the hips with a fairly neutral spine. This trains the glutes and hamstrings and protects your back for everyday lifting.

**Progression:** glute bridge → single-leg glute bridge → bodyweight hip hinge (hands on hips, push hips back, return) → single-leg Romanian deadlift (balance on one leg, reach forward) → slow single-leg version with a pause.

**Form:** the movement comes from pushing the hips back, not from rounding the lower back.

## 5. Carry and core

Holding your trunk stable while your limbs move or resist load.

**Progression:** dead bug → front plank → side plank → plank with shoulder taps → suitcase carry (hold a heavy shopping bag or a backpack full of books in one hand and walk, staying upright).

**Goal:** resist movement. A good plank is not about holding for five minutes. It is about not sagging or twisting.

## Choosing your level

For each pattern, choose the hardest version you can do for **8 clean reps** (or a 20-second hold for planks). That is your starting point. If you can do more than 15 clean reps, move to the next step.

## Common mistakes

- **Skipping pull and hinge.** Most people over-train push and squat. Balance them, or your posture pays.
- **Chasing harder variations too early.** A perfect incline push-up beats a sagging floor push-up.
- **Rushing reps.** Control the lowering phase. Two seconds down is a good default.

## One session covers all five

A complete session is simply: one push, one pull, one squat, one hinge, one core or carry. Three sets each. That takes 30–40 minutes and trains the whole body. The next lesson shows how to make it harder over time.`,
        },
        {
          title: "Progressive Overload, Explained Properly",
          type: "READING",
          minutes: 7,
          md: `Muscles, tendons and bones adapt to what they are asked to do. Then they stop adapting when the ask stops growing. **Progressive overload** is the practice of growing the ask on purpose, a little at a time.

## The levers

Without weights, you still have plenty of ways to progress. In rough order of preference:

1. **Reps:** same variation, more clean repetitions.
2. **Sets:** more total work across the session or week.
3. **Tempo:** slower lowering, or a pause at the hardest point.
4. **Range:** deeper squats, chest closer to the floor.
5. **Variation:** a harder version of the same pattern.
6. **Density:** the same work with less rest.

**Move one lever at a time.** Beginners try to change everything and cannot tell what is working.

## Double progression: the simplest rule

Pick a rep range, such as 8–12. Use the same variation until you can complete **all sets at the top of the range** with good form. Then move to a harder variation and start again at the bottom.

Example for push-ups on a table:

- Week 1: 3 sets of 9, 8, 8
- Week 2: 3 sets of 10, 10, 9
- Week 3: 3 sets of 12, 11, 10
- Week 4: 3 sets of 12, 12, 12 → next session, switch to chair-height incline and aim for 3 sets of 8

That is the whole system. It works for every pattern in the previous lesson.

## How hard is hard enough

Use **reps in reserve (RIR):** how many more good reps you could have done at the end of a set.

- RIR 4 or more: too easy to drive much change
- RIR 1–3: the productive zone for most sets
- RIR 0: true failure; useful occasionally, costly if done every set

End most sets with one to three good reps left. You will recover faster, keep better form and still progress.

## Rest between sets

For strength-focused bodyweight work, rest 60–120 seconds between sets of the same exercise. You can pair exercises to save time: a set of push-ups, rest 45 seconds, a set of squats, rest 45 seconds, repeat.

## When progress stalls

If a number has not moved for three sessions in a row:

1. Check sleep and stress first. Stalls often come from recovery, not the programme.
2. Add one set for that movement for two weeks.
3. If still stuck, take one easier week (a deload, covered in Module 5), then return.

## The log is the programme

If you do not record what you did, you cannot overload it. You can only repeat it. Before each session, look at last session's numbers. Your goal is to beat one of them by one rep or one step. Not all of them. One.

## What not to do

- Do not add reps by shortening the range. That is not progress.
- Do not test your maximum every week. Train, then occasionally test.
- Do not switch programmes every month. Progress comes from repeating the same movements long enough to improve them.

Small, boring, consistent improvements are how strength is built. A single extra rep each week is more than 50 extra reps a year on every movement.`,
        },
        {
          title: "Build Your Four-Week Programme",
          type: "ASSIGNMENT",
          minutes: 30,
          md: `Time to produce something. Your assignment: **write your strength programme for the next four weeks, complete the first week, and log every set.**

## Requirements

- **Three sessions per week** on the days in your Module 1 contract.
- Each session includes **one movement from each of the five patterns**: push, pull, squat, hinge, core or carry.
- For every movement: the variation, sets, target rep range and rest time.
- A clear **progression rule** written at the top.
- No equipment beyond a chair, a sturdy table or doorframe, and household items.

## Step 1: Find your starting variations (15 minutes)

Using the progressions in "The Five Movement Patterns", test each pattern. For each, find the hardest variation you can do for 8 clean reps (or a 20-second hold for core). Write it down. Rest two minutes between tests.

## Step 2: Write the session template

Use this structure:

| Order | Pattern | Variation | Sets × reps | Rest |
|---|---|---|---|---|
| A1 | Squat | | 3 × 8–12 | 60 s |
| A2 | Push | | 3 × 8–12 | 60 s |
| B1 | Hinge | | 3 × 8–12 | 60 s |
| B2 | Pull | | 3 × 8–12 | 60 s |
| C | Core or carry | | 3 × 20–40 s | 45 s |

Do A1 and A2 alternately, then B1 and B2, then C.

Begin with a 5-minute warm-up: marching, arm circles, 10 easy squats, 10 glute bridges.

## Step 3: Write your progression rule

For example: *"When I hit 12 reps on all three sets of an exercise, I move to the next variation and start at 8."* Copy it to the top of your log.

## Step 4: Add one variation per session (optional)

If three identical sessions bore you, rotate a second variation for squat and hinge. For example: bodyweight squat on Monday, split squat on Wednesday. Keep push and pull the same so you can track them cleanly.

## Step 5: Train and log week one

For each session record:

- Date
- Each exercise: variation, reps for every set
- Effort: how many reps you had left on the last set (RIR)
- Any discomfort: location and movement

## Deliverable

1. Your four-week programme on one page, with the progression rule at the top
2. Three logged sessions from week one
3. One sentence noting which pattern is weakest and how you will watch it

## Checks before you submit

- Every pattern appears in every session.
- Rep ranges and rest times are written, not implied.
- The programme fits in 30–45 minutes. If not, remove a set from each exercise.
- If it took more than 20 minutes to write, it is too complicated to survive.

## What good looks like

A strong programme looks almost too simple. Five exercises, three sets each, one rule for getting harder. The complexity you are tempted to add is usually a way of avoiding the boring work of repeating it.

When the in-app submission flow opens, you will attach this. Until then, completing this lesson is your word that the programme exists and week one is logged.`,
        },
        {
          title: "Strength and Fitness Foundations — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: "Five questions on movement patterns and progression. Pass to complete the module.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "Which list covers the five foundational movement patterns used in this programme?",
                options: [
                  "Chest, back, legs, arms, abs",
                  "Cardio, stretching, balance, speed, power",
                  "Running, jumping, throwing, swimming, climbing",
                  "Push, pull, squat, hinge, carry or core",
                ],
                correct: 3,
                why: "Training these five patterns covers almost every useful thing the body does with a small number of exercises.",
              },
              {
                prompt: "What is progressive overload?",
                options: [
                  "Training to failure in every session",
                  "Changing your programme every week to keep muscles confused",
                  "Deliberately increasing the demand on the body over time, one lever at a time",
                  "Adding reps, sets and harder variations all at once",
                ],
                correct: 2,
                why: "Adaptation follows a growing demand. Moving one lever at a time keeps progress measurable and sustainable.",
              },
              {
                prompt: "Using double progression with an 8–12 range, when do you move to a harder variation?",
                options: [
                  "After one week, whatever the numbers",
                  "When all sets reach 12 clean reps",
                  "When any one set reaches 12 reps",
                  "When the exercise feels boring",
                ],
                correct: 1,
                why: "Owning the top of the range on every set shows the variation is mastered. Then you progress and start again at 8.",
              },
              {
                prompt: "You finish a set and could have done two more good reps. What is your RIR, and is that a productive set?",
                options: [
                  "RIR 2, in the productive range",
                  "RIR 0, too easy",
                  "RIR 2, too easy to count",
                  "RIR 5, ideal for strength",
                ],
                correct: 0,
                why: "One to three reps in reserve is the productive zone for most sets: hard enough to drive change, easy enough to recover from.",
              },
              {
                prompt: "Your push-up numbers have not moved for three sessions. What should you check first?",
                options: [
                  "Whether you need a new programme",
                  "Whether to stop logging",
                  "Whether to train push-ups every day",
                  "Your sleep and stress",
                ],
                correct: 3,
                why: "Stalls often come from poor recovery rather than the programme. Check the basics before changing the plan.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // MODULE 4 — NUTRITION FUNDAMENTALS
    // ─────────────────────────────────────────────────────────────
    {
      title: "Nutrition Fundamentals",
      description: "The few principles of eating that matter most for training, energy and body composition, without diets or obsession.",
      objectives: [
        "Explain energy balance and how to adjust intake using your own weight trend.",
        "Build meals around protein, plants and minimally processed foods using the plate method.",
        "Evaluate supplement and diet claims with healthy scepticism.",
        "Audit three days of your eating and choose one change to make.",
      ],
      completion: "Complete a three-day food audit, commit to one specific change for two weeks, and pass the knowledge check.",
      lessons: [
        {
          title: "Energy Balance Without Obsession",
          type: "READING",
          minutes: 7,
          md: `> **Educational content, not medical advice.** Check with a qualified professional before changing your training or diet if you have a medical condition, injury or are pregnant.

Your body weight over time is mostly determined by **energy balance**: the energy you take in from food and drink versus the energy you use living and moving. Eat more than you use and you tend to gain. Eat less and you tend to lose. Roughly equal, and your weight holds steady.

That sounds simple. In practice, people get lost in the details. This lesson keeps it practical.

## What energy balance does and does not explain

It explains the direction of body weight over weeks and months. It does not explain everything about health. Two diets with the same energy can differ a lot in how full they keep you, how well you recover and how you feel. That is why the next lesson covers food quality.

## Why calculators disappoint

Online calculators estimate how much energy you use. They are a starting guess, often off by a meaningful amount in either direction for any one person. Food labels and tracking apps also carry error. Treat all of these as rough tools.

The most reliable data is **your own trend**.

## The trend method

This is a general method, not a personal prescription:

1. **Eat normally for two weeks.** Do not try to change anything yet.
2. **Weigh yourself three to seven mornings a week**, after using the toilet, before eating. Same scale, same conditions.
3. **Average each week.** Daily weight swings by a kilogram or more with water, salt and food in your gut. Ignore single readings. Watch the weekly average.
4. **Compare averages.** If the trend matches your goal, change nothing. If it does not, make a small adjustment to portions, such as a smaller serving of the most energy-dense item at one or two meals, or an extra portion of protein and vegetables if you want to gain.
5. **Wait two more weeks** before judging the change.

Small, slow changes are easier to sustain and easier to read in the data.

## If weighing is not right for you

Some people find frequent weighing stressful, and for some it is unhelpful. Alternatives: a waist measurement once a week, how a particular pair of trousers fits, or progress photos every four weeks. Any consistent measure beats guessing.

## Common mistakes

- **Cutting too hard.** Very aggressive restriction tends to raise hunger, drain training quality and end in rebound eating.
- **Reacting to one weigh-in.** A heavy morning after a salty dinner is water, not fat.
- **Forgetting liquid energy.** Juices, sweet coffee drinks and alcohol add up quietly.
- **Weekday discipline, weekend free-for-all.** Two unplanned days can undo five careful ones. Plan the weekend instead of abandoning it.

## When to get help

If you have a history of disordered eating, diabetes, kidney disease or another medical condition, or you are pregnant or breastfeeding, work with a doctor or registered dietitian rather than adjusting on your own.

## The takeaway

Know the principle. Track the trend, not the day. Adjust a little and wait. The next lesson covers what to put on the plate.`,
        },
        {
          title: "Protein, Plants and the Plate",
          type: "READING",
          minutes: 7,
          md: `> **Educational content, not medical advice.** Check with a qualified professional before changing your training or diet if you have a medical condition, injury or are pregnant.

You do not need a named diet. You need a few default rules that make good meals the easy option. Here they are.

## The plate method

For most meals, picture your plate in parts:

- **About a quarter: protein.** Eggs, chicken, fish, beef, Greek yoghurt, tofu, tempeh, beans, lentils, cottage cheese.
- **About half: vegetables and fruit.** Any colour. Frozen counts. Tinned counts if it is not in syrup.
- **About a quarter: starchy carbohydrate.** Rice, potatoes, oats, bread, pasta, quinoa. More on heavy training days, less on rest days if you want.
- **A thumb or so of fat.** Olive oil, butter, nuts, seeds, avocado, cheese.

No weighing. No apps. Just a visual check before you eat.

## Why protein matters for training

Protein supplies the building blocks for repairing and building muscle. It also keeps you full for longer than most foods. A practical rule: **a palm-sized portion (or two for larger people) at each main meal.** Spreading it across three or four meals tends to work better than one large serving at dinner.

Plant-based eaters can meet their needs by combining sources across the day, such as beans with grains, tofu, lentils and soy milk.

## Plants and fibre

Vegetables, fruit, beans and whole grains provide fibre, vitamins and minerals. Fibre helps digestion and fullness. If your current intake is low, add it gradually over a couple of weeks and drink more water, or your gut will complain.

## Hydration

Drink water through the day. A simple check: **pale yellow urine** usually means you are drinking enough. Drink more in hot weather and around training. Have a glass of water before your first coffee.

## Alcohol

Alcohol is energy-dense, disrupts sleep quality and blunts recovery. You do not need to give it up to train. Know that it has a cost, and keep it away from the evening before your hardest sessions.

## Supplements

The supplement industry is large and the evidence behind most products is weak. Unless a doctor has found a specific deficiency, your money is better spent on food. If you are curious about a product, look for independent research rather than marketing, and talk to a qualified professional before taking anything. Nothing in a bottle replaces sleep, protein and consistent training.

## Ultra-processed food

Foods engineered to be very easy to overeat, such as crisps, sweets, pastries and many fast foods, make the plate method harder. You do not have to ban them. Make them occasional, and eat them as part of a meal rather than straight from the packet.

## Common mistakes

- **Copying a famous person's diet.** Their context is not yours.
- **Fear of carbohydrates.** Carbohydrate fuels hard training. Adjust portions; do not eliminate.
- **Skipping breakfast, then eating everything at night.** Not wrong in itself, but if it leads to poor choices, plan a protein-rich first meal.
- **Perfectionism.** If 80% of your meals follow the plate method, you are doing well.

## The takeaway

Protein at every meal. Half the plate plants. Water before coffee. Scepticism before supplements. Repeat daily.`,
        },
        {
          title: "Three-Day Food Audit",
          type: "ASSIGNMENT",
          minutes: 25,
          md: `> **Educational content, not medical advice.** Check with a qualified professional before changing your training or diet if you have a medical condition, injury or are pregnant.

You cannot improve your eating by guessing how you eat. Your assignment: **record three ordinary days of eating, score each meal against the plate method, and choose one change to hold for two weeks.**

## Step 1: Record three days (as you go)

Pick two weekdays and one weekend day. Do not change how you eat. The goal is honesty, not a good score.

For each meal, snack and drink (other than water), write:

- Time
- What you ate, roughly how much (palm, fist, handful, plate)
- Where you were and what you were doing (desk, car, sofa, table)
- Hunger before eating, 1–5

Write it at the time, not at the end of the day. Memory edits out the biscuits.

## Step 2: Score each main meal (10 minutes)

For each main meal, give one point for each of these:

- A palm-sized portion of protein
- At least a quarter of the plate vegetables or fruit
- Mostly minimally processed foods
- Eaten sitting down, without a screen

Maximum four points per meal. Add up each day.

## Step 3: Look for patterns (5 minutes)

Answer these in writing:

1. Which meal scores lowest most often?
2. When do snacks happen, and what triggers them: hunger, boredom, stress or habit?
3. How many drinks with sugar or alcohol did you have across the three days?
4. On which day did you eat best, and what was different about it?

## Step 4: Choose one change

Pick **one** specific change that targets your weakest point. It must be concrete enough that you know each day whether you did it. Good examples:

- "Breakfast includes two eggs or a bowl of Greek yoghurt every weekday."
- "I eat lunch at a table, not at my desk."
- "Vegetables fill half the plate at dinner."
- "No sweet drinks on weekdays; sparkling water instead."
- "I pre-plan Saturday's dinner on Friday."

Weak examples: "eat healthier", "cut sugar", "be better on weekends". These cannot be checked.

## Step 5: Set up for success

Write down what you need to make the change easy: what to buy, prepare or remove. If your change is a protein breakfast, the eggs must be in the fridge on Sunday night.

## Step 6: Track for 14 days

Add one line to your daily log: change done, yes or no. At the end of two weeks, score three more meals using Step 2 and compare.

## Deliverable

1. Your three-day food record
2. Meal scores and daily totals
3. Written answers to the four pattern questions
4. Your one change, written as a checkable sentence, plus your setup list

## What good looks like

An honest record, including the parts you are not proud of. A single change small enough to feel almost too easy. People who pick one change usually keep it. People who pick five usually keep none.`,
        },
        {
          title: "Nutrition Fundamentals — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: "Five questions on energy balance, meal building and evaluating claims. Pass to complete the module.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "Your weight is 1 kg higher this morning than yesterday. What does the trend method tell you to do?",
                options: [
                  "Cut your food intake sharply today",
                  "Stop weighing yourself",
                  "Ignore single readings and look at the weekly average",
                  "Add an extra training session",
                ],
                correct: 2,
                why: "Daily weight swings with water, salt and food. The weekly average shows the real direction.",
              },
              {
                prompt: "Using the plate method, roughly how much of the plate should be vegetables and fruit?",
                options: ["None", "About a quarter", "About half", "All of it"],
                correct: 2,
                why: "Half the plate as plants supplies fibre and micronutrients and helps fullness without much energy.",
              },
              {
                prompt: "What is a practical default for protein at main meals?",
                options: [
                  "One large serving at dinner only",
                  "A palm-sized portion at each main meal",
                  "Protein shakes instead of meals",
                  "Avoid protein on rest days",
                ],
                correct: 1,
                why: "Spreading a palm-sized portion across meals supports recovery and keeps you full without tracking.",
              },
              {
                prompt: "A new supplement claims to double recovery speed. What is the sensible response?",
                options: [
                  "Be sceptical; evidence for most supplements is weak, and food, sleep and training come first",
                  "Buy it if the reviews are good",
                  "Take twice the dose to be safe",
                  "Replace one meal a day with it",
                ],
                correct: 0,
                why: "Marketing is not evidence. Most supplements have weak support, and none replace the basics.",
              },
              {
                prompt: "Which is the best example of a nutrition change for a two-week trial?",
                options: [
                  "Eat healthier",
                  "Cut out all sugar forever",
                  "Follow a famous athlete's diet",
                  "Include a palm of protein at breakfast every weekday",
                ],
                correct: 3,
                why: "A good change is specific and checkable each day. Vague or extreme changes rarely last.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // MODULE 5 — RECOVERY AND SLEEP
    // ─────────────────────────────────────────────────────────────
    {
      title: "Recovery and Sleep",
      description: "Training is the stimulus; recovery is where you actually get better. Learn the floors you protect and how to read fatigue.",
      objectives: [
        "Explain why adaptation happens between sessions, not during them.",
        "Apply a sleep routine built on a fixed wake time, light, caffeine timing and a wind-down.",
        "Distinguish normal muscle soreness from pain that needs attention.",
        "Use a daily readiness check and planned deload weeks to manage fatigue.",
      ],
      completion: "Complete a seven-night sleep audit with a fixed wake time, define your recovery floors, and pass the knowledge check.",
      lessons: [
        {
          title: "Sleep Is the Training Multiplier",
          type: "READING",
          minutes: 7,
          md: `> **Educational content, not medical advice.** Check with a qualified professional before changing your training or diet if you have a medical condition, injury or are pregnant.

You do not get fitter during a workout. A workout is a stress that tells your body what to adapt to. The adapting happens afterwards, mostly while you sleep. Short sleep does not just make you tired. It reduces what you get from the training you already did.

## The floor

**Seven hours in bed asleep, with the same wake time every day.** Most adults need somewhere between seven and nine hours. Seven is the floor you protect in a bad week, not the target in a good one.

One short night is noise. A short week shows up as heavier sessions, worse mood, stronger cravings and poorer decisions.

## Fix the wake time first

Most people try to fix sleep by going to bed earlier. It rarely works, because you cannot force sleepiness. Instead:

1. **Pick a wake time you can keep seven days a week**, including weekends. Allow yourself up to an hour of leeway at most.
2. **Get outdoor light within 30 minutes of waking.** Ten minutes outside, even on a cloudy day, is far brighter than indoor lighting and helps anchor your body clock.
3. **Let bedtime follow.** After a week or two of a fixed wake time, you will start getting sleepy at a consistent hour.

## Caffeine

Caffeine lingers in your system for many hours. A practical rule: **no caffeine within about eight hours of bedtime.** If you sleep at 11 p.m., your last coffee is around 3 p.m. Some people need an earlier cutoff. Check your own response.

## The bedroom

- **Dark:** blackout curtains or an eye mask.
- **Cool:** a slightly cool room usually helps. Many people sleep better around 16–19°C.
- **Quiet:** earplugs or steady background noise if needed.
- **For sleep only:** work and long scrolling sessions teach your brain that bed is for alertness.

## The wind-down

Give yourself 30–60 minutes before bed with:

- Lights dimmed
- Screens off or at least away from your face
- A repeatable routine: shower, prepare tomorrow's clothes, read paper pages, write tomorrow's top three tasks

The routine itself becomes a signal that sleep is coming.

## Training and sleep timing

Hard training very late in the evening can make it harder to fall asleep for some people. If that is you, finish intense sessions at least two to three hours before bed. Easy walking in the evening is usually fine.

## Naps

Short naps of 10–20 minutes, before mid-afternoon, can help on a short night. Long or late naps can make the next night worse.

## Alcohol and screens

Alcohol may help you fall asleep, but it tends to fragment sleep in the second half of the night. Screens in bed delay sleep mostly by keeping your brain engaged. Both are worth reducing, especially before hard training days.

## When to see a professional

Loud snoring with gasping, waking unrefreshed despite enough time in bed, or long-lasting insomnia can signal a sleep disorder. These are common and treatable. See a doctor rather than pushing through.

## The takeaway

Same wake time. Morning light. Caffeine cutoff. Dark, cool room. A wind-down you repeat every night. That is most of what matters.`,
        },
        {
          title: "Reading Fatigue: Soreness, Rest and Deloads",
          type: "READING",
          minutes: 7,
          md: `> **Educational content, not medical advice.** Check with a qualified professional before changing your training or diet if you have a medical condition, injury or are pregnant.

Training well means knowing when to push and when to back off. You learn that by reading signals honestly, not by guessing or toughing it out.

## Soreness versus pain

**Normal muscle soreness:**

- Comes on 12–48 hours after training, especially new or harder work
- Feels like a dull, spread-out ache in the muscle
- Eases with gentle movement and fades within a few days
- Is the same on both sides if you trained both sides equally

**Pain that needs attention:**

- Sharp, stabbing or pinpoint, often near a joint
- Appears during a specific movement and gets worse as you continue
- Comes with swelling, numbness, tingling or loss of strength
- Lasts more than a week or keeps returning

Soreness is not a measure of a good workout. Pain is information. If something hurts in a sharp or repeating way, swap the movement for a pain-free variation and note it in your log. If it persists, see a physiotherapist or doctor.

## The daily readiness check

Before each session, rate four things from 1 (bad) to 5 (great):

1. Sleep last night
2. Muscle soreness (5 = none)
3. Mood and motivation
4. Life stress (5 = calm)

**Total 16–20:** train as planned.
**Total 11–15:** train, but cap effort; finish sets with an extra rep or two in reserve.
**Total 10 or below:** do your floor session or an easy walk.

If you have been tracking your morning resting heart rate, a reading clearly above your normal can also hint at fatigue or illness.

## Rest days are not optional

At least one or two days a week should have no hard training. Rest days do not mean lying on the sofa. **Active recovery** works well:

- A 20–40 minute walk
- Gentle mobility: hip circles, cat-camel, deep squat holds supported on a doorframe, shoulder rolls
- Light stretching for areas that feel stiff

## Deload weeks

Fatigue builds slowly over weeks, even when each session feels fine. A **deload** is a planned easier week that lets fatigue clear so fitness can show.

- **When:** every 4–8 weeks, or sooner if your readiness scores keep dropping and your numbers stall.
- **How:** keep the same schedule and movements, but cut sets roughly in half and stop well short of hard effort.
- **What it is not:** a week off. You still show up. The habit stays intact.

Many people come back from a deload stronger than before it.

## Illness

A common rule of thumb: if symptoms are only above the neck (a mild head cold), a short easy session may be fine. If symptoms are below the neck (fever, chest congestion, body aches, stomach upset), rest. When in doubt, rest and walk. Return gradually.

## Common mistakes

- **Training through sharp pain.** It rarely ends well.
- **Never deloading.** You end up in a permanent low-grade fatigue that feels normal.
- **Using soreness as a scorecard.** Chasing soreness leads to too much new work, too often.
- **Skipping the readiness check because you feel guilty about adjusting.** Adjusting is part of the plan.

## The takeaway

Soreness is normal. Pain is a signal. Check readiness before you train. Take rest days and planned deloads. Recovery is not the absence of training; it is part of it.`,
        },
        {
          title: "Seven-Night Sleep Audit",
          type: "ASSIGNMENT",
          minutes: 20,
          md: `> **Educational content, not medical advice.** Check with a qualified professional before changing your training or diet if you have a medical condition, injury or are pregnant.

You probably have an opinion about how well you sleep. This week you will replace the opinion with a record. Your assignment: **fix a wake time, run a seven-night sleep audit, and write your personal recovery floors.**

## Step 1: Set your anchor (5 minutes)

Choose one wake time you can keep all seven days, including the weekend. Count back at least 7.5 hours to find your latest lights-out time. Write both down.

Example: wake 6:30 a.m. → lights out no later than 11:00 p.m.

Set a single alarm for the wake time. No snooze. Put the phone or alarm across the room if you need to.

## Step 2: Set three rules for the week

Use these unless you have a reason not to:

1. **Caffeine cutoff:** about eight hours before lights out.
2. **Morning light:** at least 10 minutes outdoors within 30 minutes of waking.
3. **Wind-down:** screens away 30 minutes before lights out; do the same short routine every night.

## Step 3: Log every night and morning

Keep a simple table:

| Day | Last caffeine | Screens off | Lights out | Wake time | Estimated sleep | Morning energy 1–5 | Readiness total |
|---|---|---|---|---|---|---|---|

Fill in the evening columns before bed and the morning columns within 10 minutes of waking. Estimated sleep is your best guess; a wearable is optional. Readiness total comes from the four-question check in the previous lesson.

## Step 4: Review on day eight (10 minutes)

Answer in writing:

1. On how many days did you hit your wake time?
2. What was your average estimated sleep?
3. Which rule was hardest to keep, and why?
4. Was there a link between screen time or caffeine and your morning energy score?
5. How did your training sessions this week feel compared with last week?

## Step 5: Write your recovery floors

Based on what you learned, write three to five floors: minimums you will protect even in a bad week. For example:

- "Wake at 6:30 every day, within 30 minutes."
- "At least seven hours in bed on five nights out of seven."
- "No caffeine after 2 p.m."
- "One full rest day per week, with a walk."
- "Readiness 10 or below means floor session only."

Floors should be achievable on a hard week. If you cannot keep it during a busy week, it is a target, not a floor.

## Deliverable

1. Your anchor wake time and lights-out time
2. Seven completed nights in the table
3. Written answers to the five review questions
4. Your recovery floors list

## What good looks like

A complete table with honest entries, including the nights that went badly. Most people find one specific habit, such as late caffeine or scrolling in bed, that explains most of their bad nights. Finding that one thing is the win.

If you consistently struggle to sleep despite good habits, or you snore heavily and wake unrefreshed, share your log with a doctor. It is exactly the kind of record they find useful.`,
        },
        {
          title: "Recovery and Sleep — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: "Five questions on sleep, soreness and managing fatigue. Pass to complete the module.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "What is the most effective first step to improve sleep consistency?",
                options: [
                  "Go to bed two hours earlier tonight",
                  "Sleep in on weekends to catch up",
                  "Fix a wake time you keep every day, including weekends",
                  "Take a long afternoon nap",
                ],
                correct: 2,
                why: "You cannot force sleepiness, but you can control when you get up. A fixed wake time anchors your body clock and bedtime follows.",
              },
              {
                prompt: "Which sensation most suggests pain that needs attention rather than normal soreness?",
                options: [
                  "A dull ache in both thighs two days after squats",
                  "Sharp, pinpoint pain near a joint that worsens with one movement",
                  "Stiffness that eases after a short walk",
                  "Tired legs after a long walk",
                ],
                correct: 1,
                why: "Sharp, localised pain that worsens with movement is a signal to stop that movement and get it checked if it persists.",
              },
              {
                prompt: "Your readiness check totals 9 out of 20. What should today's session be?",
                options: [
                  "The floor session or an easy walk",
                  "The full planned session at maximum effort",
                  "A double session to make up for it later",
                  "Nothing, and skip the rest of the week",
                ],
                correct: 0,
                why: "A low score means scale down, not skip entirely. The floor session keeps the habit while respecting fatigue.",
              },
              {
                prompt: "What is a deload week?",
                options: [
                  "A week off training completely",
                  "A week of maximum testing",
                  "A week of only cardio",
                  "A planned easier week with the same schedule but roughly half the volume",
                ],
                correct: 3,
                why: "A deload clears accumulated fatigue while keeping the habit intact. You still show up, just with less work.",
              },
              {
                prompt: "You sleep at 11 p.m. Based on this module's rule of thumb, when is your latest coffee?",
                options: ["Around 3 p.m.", "Around 9 p.m.", "Around 10:30 p.m.", "Caffeine timing does not matter"],
                correct: 0,
                why: "Caffeine lingers for many hours. A cutoff about eight hours before bed protects sleep for most people.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // MODULE 6 — MENTAL RESILIENCE
    // ─────────────────────────────────────────────────────────────
    {
      title: "Mental Resilience",
      description: "Build the capacity to stay steady under discomfort, setbacks and boredom, using deliberate practice rather than willpower.",
      objectives: [
        "Distinguish productive discomfort from danger, injury and overload.",
        "Use instructional self-talk and a reset routine to stay composed under stress.",
        "Apply a bad-day protocol that keeps you moving when everything feels wrong.",
        "Design and complete a graded ladder of voluntary discomfort.",
      ],
      completion: "Design your discomfort ladder, complete at least five rungs with a written debrief, and pass the knowledge check.",
      lessons: [
        {
          title: "Discomfort Is a Trainable Skill",
          type: "READING",
          minutes: 7,
          md: `Resilience is not a personality trait you have or lack. It is a skill: the ability to stay steady and keep functioning when things are uncomfortable. Like strength, it grows with graded practice and shrinks with avoidance.

## Three kinds of hard

Not all difficulty is the same. Before you push through anything, sort it:

1. **Productive discomfort.** Burning muscles in the last reps, heavy breathing in an interval, the urge to quit a cold shower. Unpleasant, temporary, safe. This is where resilience is built.
2. **Danger or injury.** Sharp pain, chest pain, dizziness, numbness, a feeling that something is wrong. Stop. Toughness here is foolishness.
3. **Overload.** A long run of bad sleep, high stress and hard training with no recovery. Pushing through makes it worse. The resilient response is to scale down.

The skill is not "never quit". It is **knowing which kind of hard you are facing**, and responding correctly.

## Why voluntary discomfort helps

Choosing small, controlled discomfort teaches you something your brain needs to learn by experience: the urge to stop is not the same as the need to stop. Every time you notice the urge, stay with it a little longer and nothing bad happens, the urge loses some of its authority.

This is why training is such good practice ground. You choose the discomfort, you control the dose, and you can always stop.

## Practical forms of voluntary discomfort

- Holding a wall sit or plank a little past the point you want to stop
- Finishing a shower with 30 seconds of cool water
- Walking in the rain instead of waiting for it to clear
- Doing the session you planned on a day you would rather skip
- An hour with your phone in another room
- Sitting with boredom for ten minutes without reaching for entertainment

None of these need to be extreme. The dose should be uncomfortable, not overwhelming. If you have a heart condition or other medical issue, skip cold exposure and choose other forms.

## The urge-wave

When you want to quit something hard, the urge usually builds, peaks and then eases, often within a minute or two if you do not act on it. Try this:

1. **Notice it.** Say to yourself, "There is the urge to stop."
2. **Rate it** from 1 to 10.
3. **Breathe slowly** through the nose, longer out than in, for three breaths.
4. **Rate it again.** It often drops a point or two.

You are not fighting the urge. You are watching it pass.

## Boredom is discomfort too

Much of real training, and real work, is not intense. It is repetitive. Resilience includes doing the twentieth identical session with care. People who need novelty to stay engaged tend to jump between programmes and never get good at any.

## Common mistakes

- **Treating every hardship as a test of character.** Some hardship should be avoided.
- **Starting too big.** A five-minute ice bath on day one teaches fear, not tolerance.
- **Doing it for display.** Resilience built for an audience disappears when the audience leaves.

## The takeaway

Sort the hard. Choose small doses of safe discomfort. Watch urges pass instead of obeying them. Repeat until the urge to quit becomes background noise.`,
        },
        {
          title: "Self-Talk and the Bad-Day Protocol",
          type: "READING",
          minutes: 7,
          md: `Your inner voice narrates everything you do. On a bad day it can sound like a hostile coach: *you are weak, you always quit, why bother.* You cannot stop thoughts from appearing. You can change what you do with them.

## Notice the narration

Start by catching the patterns. Common ones:

- **Catastrophising:** "I missed one session, this whole programme is ruined."
- **All-or-nothing:** "If I can't do the full workout, there's no point."
- **Labelling:** "I'm just not disciplined."
- **Mind-reading:** "Everyone at the park thinks I look ridiculous."

When you spot one, name it silently: "That's all-or-nothing." Naming creates a small gap between you and the thought.

## Instructional self-talk

Motivational slogans are fine, but under stress they often ring hollow. **Instructional self-talk** works better: short, specific cues about what to do next.

- During push-ups: "Tight body. Chest down. Push the floor away."
- During an interval: "Long exhale. Light feet. Ten more seconds."
- Before a hard conversation: "Slow down. Ask first. Listen."

Instruction pulls attention to the task and away from how hard it feels. Write two or three cues for your hardest exercise and use them every session.

## The physiological reset

When stress spikes, slow your breathing before you try to think clearly:

1. Breathe in through your nose for about four seconds.
2. Breathe out slowly through your mouth for about six seconds.
3. Repeat for five to ten breaths.

A longer exhale than inhale tends to calm you down. Use it before a hard set, after bad news, or before you reply to an annoying message.

## The bad-day protocol

Some days everything feels wrong. You slept badly, work is chaotic, your mood is low. On those days, follow a protocol instead of your feelings:

1. **Shrink.** Switch to your floor session. Decide this before you start, not halfway through.
2. **Start.** Put on your training clothes and do the first exercise. Starting is usually the hardest part.
3. **Finish.** Complete the floor, log it, and stop. Do not let a good feeling halfway through tempt you into a long session that wrecks tomorrow.
4. **Record one line.** What made today hard, in plain words. Patterns in those lines show you what to fix.

The protocol works because it removes negotiation. You do not need to feel good. You need to follow four steps.

## Talking to yourself like a coach

Ask: "What would a good coach say to an athlete in this position?" A good coach is honest and calm. They do not insult, and they do not excuse. "You missed two sessions. That happens. What is the plan for tomorrow?" Practise speaking to yourself in that voice.

## Mental health is health

Resilience skills help with ordinary stress. They do not replace professional help. If low mood, anxiety or hopelessness last for weeks or interfere with daily life, speak to a doctor or a qualified mental health professional. That is a strong move, not a weak one.

## The takeaway

Catch the narration. Replace slogans with instructions. Breathe out longer than in. On bad days, run the protocol: shrink, start, finish, record.`,
        },
        {
          title: "Build Your Discomfort Ladder",
          type: "ASSIGNMENT",
          minutes: 30,
          md: `Resilience grows in graded steps, just like strength. Your assignment: **design a ladder of ten rungs of voluntary discomfort, climb at least five of them over the next two weeks, and write a short debrief for each.**

## Safety first

Every rung must be safe for you. No exercise to the point of injury, no fasting, nothing involving heights, water you cannot stand up in, or traffic. If you have a heart condition, high blood pressure or other medical issues, skip cold exposure and breath-holding. Stop any rung that produces dizziness, chest pain or sharp pain.

## Step 1: Choose your categories (5 minutes)

Pick at least three of these categories so your ladder trains more than one kind of tolerance:

- **Physical effort:** wall sits, plank holds, slow squats, stair climbs
- **Temperature:** cool water at the end of a shower, a walk in cold or wet weather
- **Attention:** phone-free periods, single-tasking, sitting with boredom
- **Social:** saying no clearly, asking a question in a meeting, starting a conversation you have been avoiding
- **Routine:** training at the planned time on a day you do not want to

## Step 2: Write ten rungs (15 minutes)

Order them from mildly uncomfortable (rung 1) to genuinely hard but safe (rung 10). Make each one specific and measurable. Example ladder:

1. Wall sit to the first urge to stop, then 10 more seconds
2. 30-minute walk with no phone or headphones
3. Last 15 seconds of the shower cool
4. One hour of focused work with the phone in another room
5. Plank: total 2 minutes in as few sets as possible
6. Last 30 seconds of the shower cool
7. Walk 30 minutes in the rain or cold, dressed properly
8. A full planned session at 6 a.m. on a weekend
9. Say no to one request you would normally accept out of guilt
10. Half a day with no social media, news or messaging apps

Your ladder should reflect your own life. What is easy for one person is rung 9 for another.

## Step 3: Climb (two weeks)

Complete at least five rungs, in order, no more than one per day. If a rung is too hard, repeat the previous one, or insert an in-between step.

## Step 4: Debrief each rung (2 minutes each)

Write four lines immediately afterwards:

- **Peak urge to quit,** 1–10
- **What the urge said** (the exact thought, if you can catch it)
- **What you did** with it (breathing, instructional cue, simply waiting)
- **How you felt five minutes later**

## Step 5: Final reflection (5 minutes)

After your fifth rung, write a short paragraph: what did you notice about how urges behave? Did they peak and fade? Which technique helped most? Where else in your life would this skill be useful this month?

## Deliverable

1. Your ten-rung ladder with categories marked
2. At least five completed debriefs
3. Your final reflection paragraph

## What good looks like

Rungs that are specific and personal, a debrief written straight after each one, and a reflection that names a real situation where you will use the skill. The goal is not toughness for show. It is proof, in your own handwriting, that discomfort passes and you are still standing.`,
        },
        {
          title: "Mental Resilience — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: "Five questions on discomfort, self-talk and the bad-day protocol. Pass to complete the module.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "Midway through a set you feel a sharp pain in your shoulder. What kind of hard is this, and what do you do?",
                options: [
                  "Productive discomfort; push through",
                  "Boredom; switch exercises for variety",
                  "Danger or injury; stop the movement",
                  "Overload; double tomorrow's session",
                ],
                correct: 2,
                why: "Sharp pain is a danger signal, not discomfort to tolerate. Stop, swap the movement, and get it checked if it persists.",
              },
              {
                prompt: "Which is an example of instructional self-talk?",
                options: [
                  "I'm a champion",
                  "Tight body, chest down, push the floor away",
                  "I always quit, why bother",
                  "This is the worst workout ever",
                ],
                correct: 1,
                why: "Instructional cues direct attention to what to do next, which tends to work better under stress than slogans.",
              },
              {
                prompt: "What is the order of the bad-day protocol?",
                options: [
                  "Shrink, start, finish, record",
                  "Skip, rest, restart next week",
                  "Push, push harder, collapse",
                  "Plan, research, postpone",
                ],
                correct: 0,
                why: "Shrink to the floor session, start the first exercise, finish and log, then record one line on what made it hard.",
              },
              {
                prompt: "What usually happens to the urge to quit if you notice it without acting on it?",
                options: [
                  "It grows until you have to stop",
                  "It turns into pain",
                  "It disappears permanently",
                  "It builds, peaks and then eases",
                ],
                correct: 3,
                why: "Urges tend to behave like waves. Watching one pass teaches you that the urge to stop is not the need to stop.",
              },
              {
                prompt: "How should a discomfort ladder be built?",
                options: [
                  "Start with the hardest challenge to prove commitment",
                  "Random challenges chosen each morning",
                  "Graded steps from mildly uncomfortable to hard but safe, climbed in order",
                  "Only physical challenges done to failure",
                ],
                correct: 2,
                why: "Resilience, like strength, grows through graded exposure. Starting too big teaches fear rather than tolerance.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // MODULE 7 — HABIT FORMATION
    // ─────────────────────────────────────────────────────────────
    {
      title: "Habit Formation",
      description: "How behaviours become automatic, and how to design cues, environments and plans that make the right actions the default.",
      objectives: [
        "Explain the cue, routine and reward loop and why a stable context speeds habit formation.",
        "Write implementation intentions that link a new behaviour to a specific time, place or existing habit.",
        "Redesign your environment to add friction to unwanted habits and remove it from wanted ones.",
        "Install one keystone habit and track it for fourteen days.",
      ],
      completion: "Install one keystone habit with a written plan and environment changes, track it for fourteen days, and pass the knowledge check.",
      lessons: [
        {
          title: "How Habits Actually Form",
          type: "READING",
          minutes: 7,
          md: `A habit is a behaviour your brain runs with little conscious decision. You do not decide to brush your teeth each night. A cue (the bathroom, bedtime) triggers the routine. That automation is what makes habits powerful: they cost almost no willpower once established.

## The loop

Most habits follow a simple pattern:

1. **Cue:** something that triggers the behaviour. A time, a place, a feeling, a preceding action or another person.
2. **Routine:** the behaviour itself.
3. **Reward:** what you get from it. Relief, pleasure, a sense of completion.

Repeat the loop in the same context enough times and the cue starts to pull the routine automatically.

## How long it takes

You may have heard that habits take 21 days. That figure is not reliable. In practice, the time varies widely: simple behaviours such as drinking a glass of water after breakfast can feel automatic within a few weeks, while complex ones such as a 40-minute workout can take months. Expect weeks to months, and do not judge success by an arbitrary date.

What speeds it up:

- **A stable context.** Same time, same place, same preceding action.
- **Simplicity.** Smaller behaviours automate faster.
- **Frequency.** Daily habits form faster than weekly ones.
- **Immediate reward.** Something that feels good now, not just in six months.

## Implementation intentions

The most practical tool for starting a habit is an **if-then plan**: *"If [situation], then I will [behaviour]."*

- "If it is 7:00 a.m. on Monday, Wednesday or Friday, then I change into training clothes and start my warm-up in the living room."
- "If I finish lunch, then I walk for ten minutes before going back to my desk."
- "If I pour my morning coffee, then I drink a glass of water first."

These plans work because they move the decision from the moment to the past. When the situation arrives, the plan is already made.

## Habit stacking

A strong cue is an action you already do reliably. Attach the new habit directly after it:

*"After I [current habit], I will [new habit]."*

- After I brush my teeth at night, I lay out tomorrow's training clothes.
- After I sit down at my desk, I write my top three tasks.
- After I put the kettle on, I do 10 squats.

Choose an anchor that happens at the same time and place every day.

## Start smaller than feels useful

The first job of a new habit is to exist. A two-minute version that happens every day beats a 30-minute version that happens twice. Once the behaviour is automatic, grow it. This is the floor-session principle from Module 1 applied to any behaviour.

## Breaking habits

Unwanted habits follow the same loop. To weaken one:

- **Identify the cue.** When and where does it happen? What were you feeling?
- **Keep the cue and reward, swap the routine.** Stressed at 4 p.m. and reaching for sweets? Try a five-minute walk or a cup of tea instead, and see if it meets the same need.
- **Remove the cue where possible.** The next lesson covers this.

## Common mistakes

- **Vague intentions.** "Exercise more" has no cue. It will not trigger anything.
- **Too many habits at once.** Install one, then the next.
- **Relying on motivation.** Habits exist precisely so you do not need it.

## The takeaway

Choose a cue. Write an if-then plan. Start tiny. Repeat in the same context. Be patient for weeks, not days.`,
        },
        {
          title: "Design Your Environment",
          type: "READING",
          minutes: 7,
          md: `Willpower is unreliable. Your environment is always on. People who seem disciplined often just live in surroundings that make the right action easy and the wrong action awkward. You can build the same thing deliberately.

## The friction principle

Every behaviour has a cost in effort, time and steps. Small changes in that cost have a large effect on what you actually do.

- **Reduce friction** for habits you want: fewer steps, fewer decisions, visible cues.
- **Add friction** for habits you do not want: more steps, more delay, hidden cues.

Even a 20-second difference can tip the balance on a tired evening.

## Make good habits obvious and easy

**Training:**
- Lay out training clothes the night before, on the chair, not in the drawer.
- Keep a clear patch of floor where you train. If you have to move furniture, you will skip.
- Write the session on a card or sticky note and leave it where you will see it.

**Eating:**
- Put fruit and pre-washed vegetables at eye level in the fridge.
- Cook a batch of protein at the weekend so weekday meals start half-done.
- Keep a full water bottle on your desk.

**Sleep:**
- Charge your phone outside the bedroom.
- Put a paper book on the pillow.
- Set an evening reminder that starts your wind-down.

## Make bad habits invisible and awkward

- Move snack foods to a high cupboard, in opaque containers, or stop buying them for the house.
- Log out of social media apps after each use, or move them off your home screen.
- Unplug the games console and put the controller in a drawer in another room.
- Turn off non-essential notifications.

You are not banning anything. You are adding a pause long enough for a decision.

## Pre-commitment

Make choices in advance, when you are calm, that bind your future self:

- Book training slots in your calendar as appointments.
- Arrange to train or walk with a friend at a fixed time.
- Plan meals for the week on Sunday.
- Tell someone your plan and when you will report back.

Pre-commitment works because future-you inherits a decision instead of facing a choice.

## Context shifts

When your environment changes, habits often break. Travel, a new job, moving house, a new baby. Plan for it:

- Pack your floor session into a note you can follow in a hotel room.
- Identify the new anchor habit in the new routine within the first few days.
- Expect a dip and use the never-miss-twice rule.

Context changes are also an opportunity. A new routine is a good moment to install a new habit, because the old cues are gone.

## Visual tracking

A simple tracker, such as a calendar where you mark an X for each day you complete the habit, adds an immediate reward: the satisfaction of seeing the chain grow. Keep it visible. Do not treat a broken chain as failure. Restart the next day.

## Common mistakes

- **Relying on a clean slate of willpower each morning.** Design beats determination.
- **Changing everything at once.** Change the one area that blocks your keystone habit first.
- **Ignoring the people around you.** If your household eats differently, discuss a plan rather than battling it silently.

## The takeaway

Walk through your home and your day as a designer. For each habit, ask: how can I make this one step easier, or that one step harder? Then make the change today.`,
        },
        {
          title: "Install One Keystone Habit",
          type: "ASSIGNMENT",
          minutes: 25,
          md: `A keystone habit is one behaviour that makes several others easier. Training three times a week tends to improve sleep and food choices. A fixed wake time makes morning training possible. Your assignment: **choose one keystone habit, design it fully, and track it for fourteen days.**

## Step 1: Choose your habit (5 minutes)

List three candidate habits connected to what you have learned so far. Examples:

- Training clothes laid out every night
- A 10-minute walk after lunch every weekday
- Lights out by a fixed time
- A protein-rich breakfast
- Writing tomorrow's top three tasks before leaving work

For each, ask: if I did this every day, what else would get easier? Choose the one with the most knock-on effects. Pick only one.

## Step 2: Shrink it

Write the smallest version that still counts. If your habit is a 30-minute walk, the minimum might be 5 minutes. The minimum is what you do on bad days. Anything extra is a bonus.

## Step 3: Write your plans (5 minutes)

Write one implementation intention and one habit stack:

- **If-then:** "If it is [time] and I am [place], then I will [behaviour]."
- **Stack:** "After I [existing habit], I will [new habit]."

Use an anchor that happens every day at the same time.

## Step 4: Redesign the environment (10 minutes)

List at least **three changes** you will make today:

- One that **reduces friction** for the new habit
- One that **adds friction** to whatever usually competes with it
- One **visible cue** that reminds you

Example for "lights out at 10:45 p.m.": charge the phone in the kitchen (adds friction to scrolling), set a 10:15 p.m. wind-down alarm (cue), keep a book on the pillow (reduces friction to the replacement routine).

Make all three changes before you finish this lesson.

## Step 5: Track for 14 days

Use a paper calendar, a note or your training log. Each day, mark one of:

- **Full:** did the planned version
- **Min:** did the minimum version
- **Miss:** did not do it

Add one word on what helped or got in the way.

## Step 6: Review on day 15 (5 minutes)

Answer in writing:

1. How many days were Full, Min and Miss?
2. Did you ever miss twice in a row? What caused it?
3. Which environment change made the biggest difference?
4. Does the habit feel more automatic than on day one? Rate 1–10.
5. What will you change for the next 14 days?

## Deliverable

1. Your chosen habit, its minimum version and why it is a keystone
2. Your if-then plan and habit stack
3. Your three environment changes, with a note or photo showing each
4. Your 14-day tracker
5. Your written review

## What good looks like

A habit that is specific and small, plans that name real times and places, and environment changes you can actually point to. A tracker with some misses is normal. A tracker with no back-to-back misses is a success, whatever the total.

Once this habit feels automatic, pick the next one. Habits are installed one at a time, and they stack.`,
        },
        {
          title: "Habit Formation — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: "Five questions on cues, plans and environment design. Pass to complete the module.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "What are the three parts of the habit loop?",
                options: [
                  "Goal, plan, review",
                  "Cue, routine, reward",
                  "Motivation, effort, result",
                  "Start, middle, finish",
                ],
                correct: 1,
                why: "A cue triggers a routine, which delivers a reward. Repeated in a stable context, the cue starts to pull the routine automatically.",
              },
              {
                prompt: "How long does a new habit take to become automatic?",
                options: [
                  "It varies widely; often weeks to months depending on the behaviour",
                  "Exactly 21 days",
                  "One week for any habit",
                  "Habits never become automatic",
                ],
                correct: 0,
                why: "There is no fixed number. Simple behaviours in a stable context automate faster; complex ones take longer.",
              },
              {
                prompt: "Which is a well-formed implementation intention?",
                options: [
                  "I will exercise more this year",
                  "I will try to be healthier",
                  "I should probably train when I can",
                  "If it is 7 a.m. on a weekday and I am in the kitchen, then I drink a glass of water",
                ],
                correct: 3,
                why: "An if-then plan names a specific situation and behaviour, so the decision is made before the moment arrives.",
              },
              {
                prompt: "Which change adds useful friction to an unwanted habit?",
                options: [
                  "Keeping snacks on the desk",
                  "Turning on more notifications",
                  "Charging your phone outside the bedroom",
                  "Laying out training clothes",
                ],
                correct: 2,
                why: "Moving the phone out of the bedroom adds steps to late-night scrolling. Laying out clothes reduces friction for a wanted habit.",
              },
              {
                prompt: "Why start a new habit with a very small version?",
                options: [
                  "Small habits produce bigger results",
                  "The first job of a habit is to exist; a small version happens consistently and can grow later",
                  "Large habits are unhealthy",
                  "It makes tracking unnecessary",
                ],
                correct: 1,
                why: "Consistency in a stable context builds automaticity. A tiny version that happens daily beats a large one that happens rarely.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // MODULE 8 — PERSONAL ACCOUNTABILITY
    // ─────────────────────────────────────────────────────────────
    {
      title: "Personal Accountability",
      description: "Own your results with honest records, a weekly review and standards you set for yourself, then hold them for ninety days.",
      objectives: [
        "Keep a training and habit log that records what happened rather than what you remember.",
        "Run a weekly review that scores adherence and produces one adjustment.",
        "Separate reasons from excuses and use ownership language for results.",
        "Write a ninety-day Warrior standard with metrics, review dates and an accountability partner.",
      ],
      completion: "Write your ninety-day Warrior standard, complete your first weekly review, and pass the knowledge check.",
      lessons: [
        {
          title: "Tracking: Numbers Beat Memory",
          type: "READING",
          minutes: 6,
          md: `Your memory of last week's training is a story. Your log is a record. Stories flatter you or punish you depending on your mood. Records just tell you what happened. TycoonHood is built on records.

## What to write down

Keep it short enough that you will do it every time. Per training session:

- **Date** and session type (target, floor or rest)
- **Each exercise:** variation and reps for every set (or time for holds)
- **Effort:** reps in reserve on the last set, or a one-word feel: easy, right, heavy
- **Pain notes:** location and movement, if anything hurt

Per day, add a few lines for the other things this programme has asked you to track:

- Hours slept and whether you hit your wake time
- Your keystone habit: full, min or miss
- Readiness score, if you used it

That is two to three minutes a day. More detail is optional. Less detail makes the log useless.

## One place only

Pick one location: a notes app, a spreadsheet or a paper notebook. Splitting data across three apps guarantees you will never review it. If you use paper, photograph each week's page so it cannot be lost.

## Reading your own data

Every two weeks, scan for these signals:

1. **Flat numbers for three or more sessions:** move one overload lever, starting with reps.
2. **"Heavy" or low readiness appearing everywhere:** check sleep and stress before blaming the programme.
3. **The same pain note twice:** swap the movement for a variation and note it. Repeated pain is information, not weakness.
4. **Habit misses clustering on the same day:** something about that day's structure needs redesigning.
5. **Floor sessions replacing target sessions most weeks:** your target may be too big for your current life. Shrink it rather than failing it.

## Honest entries only

The log is only valuable if it is true. Do not round up. Do not skip writing the bad days. A log full of perfect weeks is either a remarkable person or a fiction, and fiction cannot guide decisions.

It helps to remember that nobody is grading the log. It is a tool for you. A missed session written down is far more useful than a missed session forgotten.

## Leading and lagging measures

- **Lagging measures** are outcomes: weight trend, push-up max, step-test pulse. They move slowly and you cannot control them directly.
- **Leading measures** are behaviours: sessions completed, nights at your wake time, habit days. You control them completely.

Track both, but **judge your week on the leading measures.** Get those right for long enough and the lagging measures follow.

## Why this matters beyond training

This is the same loop you will use in the Builder and Tycoon programmes: metrics beat vibes, statements beat feelings. You are not just learning to track workouts. You are learning to trust records over impressions, using the lowest-stakes data you will ever handle.`,
        },
        {
          title: "The Weekly Review and Honest Ownership",
          type: "READING",
          minutes: 7,
          md: `A log without review is a diary. The **weekly review** turns your records into decisions. It takes about 15 minutes, once a week, at the same time. Sunday evening works for most people.

## The review in five steps

**1. Score adherence.** For each commitment, count planned versus done.

- Training: 3 planned, 3 done = 100%
- Wake time: 7 planned, 5 hit = 71%
- Keystone habit: 7 planned, 6 full or min = 86%

Average them for a single weekly score. Over 80% is a strong week. Under 60% means the plan does not fit your life, or something is in the way.

**2. Note what moved.** Any personal bests, new variations, improved readiness, better sleep. Write them down. Progress you do not record is progress you will not notice.

**3. Name what went wrong, factually.** "Missed Thursday's session; stayed late at work; did not have a backup slot." Not: "I was lazy again."

**4. Choose one adjustment.** Just one. It can be an adjustment to the plan ("move Thursday's session to 6:30 a.m.") or to the setup ("pack training clothes in my work bag"). One change you will actually make beats five you will forget.

**5. Schedule next week.** Put every session, review and key habit into the calendar now.

## Reasons versus excuses

Both describe why something did not happen. The difference is what comes next.

- **An excuse ends the conversation:** "I was too busy." Nothing changes.
- **A reason starts a plan:** "Thursday evenings are unpredictable, so Thursday sessions move to the morning." Something changes.

When you write why something went wrong, always follow it with "so next week I will...". If you cannot finish that sentence, you have written an excuse.

## Ownership language

The way you describe results shapes what you do about them. Compare:

- "The workout didn't happen" vs. "I didn't do the workout."
- "Work got crazy" vs. "I didn't protect the slot when work got busy."
- "My diet fell apart" vs. "I didn't plan weekend meals."

Ownership is not self-criticism. It is putting yourself back in control. If the result was caused by you, it can be changed by you.

## Accountability partners

Telling one person your commitments and reporting to them each week raises follow-through for many people. Choose someone who:

- Will actually ask
- Will not shame you or let you off the hook
- Is ideally working on their own commitments too

Send a short weekly message: your adherence score, one win, one adjustment. That is all.

## Monthly zoom-out

Once a month, look at four weekly reviews together. Ask: is the trend going up? What adjustment has had the biggest effect? Is any commitment consistently failing? If so, change the commitment, not your opinion of yourself.

## Common mistakes

- **Skipping the review after a bad week.** That is exactly the week it matters most.
- **Making the review a judgement of your character.** It is an operational meeting, not a trial.
- **Adjusting everything at once.** You lose the ability to see what worked.

## The takeaway

Score it. Note the wins. Name the misses factually. Choose one adjustment. Schedule the week. Own the outcome.`,
        },
        {
          title: "Your 90-Day Warrior Standard",
          type: "ASSIGNMENT",
          minutes: 35,
          md: `This is the capstone. Everything from the previous seven modules comes together in one document. Your assignment: **write your 90-day Warrior Standard, complete your first weekly review against it, and send it to an accountability partner.**

## Step 1: Write your standards (15 minutes)

A standard is a behaviour you commit to as normal, not a goal you hope to hit. Write one or two standards for each area:

- **Training:** sessions per week, days and times, floor session
- **Conditioning:** easy sessions and interval sessions per week
- **Nutrition:** your plate rule and the one change from Module 4
- **Recovery:** wake time, sleep floor, rest days, deload timing
- **Resilience:** your bad-day protocol and one discomfort practice per week
- **Habits:** your keystone habit and its minimum version

Each standard must be specific enough that a stranger could check it. "Train 3× per week, Mon/Wed/Fri 7:00 a.m." passes. "Stay fit" does not.

## Step 2: Choose your metrics (5 minutes)

**Leading measures** (weekly):
- Training adherence percentage
- Wake-time adherence percentage
- Keystone habit adherence percentage

**Lagging measures** (retest at day 45 and day 90):
- Your Module 2 conditioning baseline tests
- Your current push and squat variation and reps
- One body measure if you choose to track it: weekly average weight, waist, or how clothes fit

Write your current numbers next to each lagging measure.

## Step 3: Schedule the reviews (5 minutes)

Put these in your calendar now:

- Weekly review: same day and time, every week for 13 weeks
- Day 45: mid-point retest and monthly zoom-out
- Day 90: full retest and final review
- Deload weeks: plan at least one between day 30 and day 60

## Step 4: Write your failure plan (5 minutes)

Answer in writing:

1. What is most likely to derail you in the next 90 days? (Travel, a busy season at work, illness, a family event.)
2. What will you do when it happens? Be specific.
3. What is the minimum version of your standard during that period?

## Step 5: Choose and brief your partner

Pick one person. Send them a message with your training, sleep and keystone standards, and ask if they will receive a weekly update. Keep it short. Example: *"I'm starting a 90-day training commitment. Can I send you a three-line update every Sunday? Score, one win, one adjustment. Just reply if I go quiet."*

## Step 6: Do your first weekly review

At the end of this week, run the five-step review from the previous lesson against your new standard. Send the result to your partner.

## Deliverable

1. Your 90-Day Warrior Standard (one page, all six areas)
2. Leading and lagging metrics with current numbers
3. Calendar dates for weekly reviews, day 45, day 90 and deload
4. Your failure plan
5. Confirmation that your partner has agreed
6. Your first weekly review

## What good looks like

A single page someone else could use to check your week. Standards that are ambitious but survivable on a bad week. A failure plan that names a real risk. A partner who has said yes.

## Final word

The programme ends here. The practice does not. Everything in Warrior comes down to a few repeatable acts: show up at the planned time, do the work honestly, write it down, review it, adjust one thing. Keep doing them and the results take care of themselves.`,
        },
        {
          title: "Personal Accountability — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: "Five questions on logging, reviews and ownership. Pass to complete the module and unlock the final assessment.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "Why does the log matter more than motivation?",
                options: [
                  "You cannot overload or review what you did not record; memory tells stories, records tell what happened",
                  "Coaches require it",
                  "Logging burns extra calories",
                  "It does not; motivation is the real driver",
                ],
                correct: 0,
                why: "Progress and honest review both depend on knowing exactly what you did. The log provides that.",
              },
              {
                prompt: "Which is a leading measure?",
                options: [
                  "Your weekly average body weight",
                  "Your maximum push-up count",
                  "Your step-test recovery pulse",
                  "The number of planned training sessions you completed this week",
                ],
                correct: 3,
                why: "Leading measures are behaviours you fully control. Get them right consistently and lagging outcomes follow.",
              },
              {
                prompt: "Which statement is a reason rather than an excuse?",
                options: [
                  "I was too busy",
                  "Things just got in the way",
                  "Thursday evenings are unpredictable, so next week I'll train Thursday morning",
                  "I'm not a morning person",
                ],
                correct: 2,
                why: "A reason leads to a plan. If you cannot finish the sentence 'so next week I will...', it is an excuse.",
              },
              {
                prompt: "How many adjustments should a weekly review usually produce?",
                options: ["None", "One", "At least five", "A completely new plan"],
                correct: 1,
                why: "One change you actually make beats several you forget, and it lets you see what worked.",
              },
              {
                prompt: "You had a terrible week and hit only 40% adherence. What should you do with the weekly review?",
                options: [
                  "Skip it until you have a better week",
                  "Do it anyway; bad weeks are when the review matters most",
                  "Start the 90 days over from scratch",
                  "Double next week's commitments to make up for it",
                ],
                correct: 1,
                why: "The review is an operational meeting, not a trial. A bad week holds the most useful information.",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // FINAL ASSESSMENT
  // ─────────────────────────────────────────────────────────────
  finalAssessment: {
    passScore: 75,
    intro:
      "Twelve questions covering all eight Warrior modules: discipline, conditioning, strength, nutrition, recovery, resilience, habits and accountability. Score 75% or more to complete the programme. Your log and your 90-day standard are the real proof.",
    questions: [
      {
        prompt: "What is the main purpose of a floor session?",
        options: [
          "To keep the habit alive on your worst days with a short minimum workout",
          "To replace all target sessions",
          "To test your maximum strength",
          "To recover by lying still",
        ],
        correct: 0,
        why: "The floor prevents bad days from becoming zeros, which protects consistency over months.",
      },
      {
        prompt: "You missed Monday's session. According to the 'never miss twice' rule, what happens on Wednesday?",
        options: [
          "Do Monday's and Wednesday's sessions together",
          "Skip Wednesday too and rest fully",
          "Restart the programme next week",
          "Wednesday's session happens no matter what, even if it is only the floor",
        ],
        correct: 3,
        why: "One miss is noise; two in a row starts a new habit. You return at the next session without trying to make up volume.",
      },
      {
        prompt: "Which weekly conditioning mix suits a beginner?",
        options: [
          "Daily all-out intervals",
          "Only medium-hard runs",
          "Mostly easy, conversational sessions plus one short interval session",
          "No conditioning while building strength",
        ],
        correct: 2,
        why: "Easy volume builds the aerobic base; a small dose of hard work sharpens it without excessive fatigue.",
      },
      {
        prompt: "Which symptom during exercise means you should stop and seek medical advice?",
        options: [
          "Heavy breathing during intervals",
          "Chest pain, dizziness or feeling faint",
          "Burning muscles near the end of a set",
          "Sweating heavily",
        ],
        correct: 1,
        why: "Effort is meant to be uncomfortable. Chest pain, dizziness and fainting are warning signs, not effort.",
      },
      {
        prompt: "Which pair of movements trains the pull and hinge patterns with no equipment?",
        options: [
          "Table rows and single-leg glute bridges",
          "Push-ups and squats",
          "Planks and lunges",
          "Burpees and mountain climbers",
        ],
        correct: 0,
        why: "Table rows train pulling; glute bridges and their progressions train the hip hinge.",
      },
      {
        prompt: "Using double progression in an 8–12 range, you have hit 12, 12, 12. What next?",
        options: [
          "Add a fourth and fifth set immediately",
          "Switch to a completely different programme",
          "Keep doing 12s indefinitely",
          "Move to a harder variation and start again around 8 reps",
        ],
        correct: 3,
        why: "Owning the top of the range on all sets signals it is time to progress the variation and rebuild reps.",
      },
      {
        prompt: "What is the most reliable way to judge whether your eating matches your body-weight goal?",
        options: [
          "One morning weigh-in",
          "An online calorie calculator",
          "Your weekly average weight trend over two or more weeks",
          "How hungry you feel each day",
        ],
        correct: 2,
        why: "Calculators and single weigh-ins carry large error. Your own averaged trend shows the real direction.",
      },
      {
        prompt: "What should you do about most supplements, according to this programme?",
        options: [
          "Take several to cover every base",
          "Treat claims sceptically; evidence for most is weak and food, sleep and training come first",
          "Replace meals with them",
          "Take them only on training days",
        ],
        correct: 1,
        why: "Nothing in a bottle replaces the basics. Check with a qualified professional before taking anything.",
      },
      {
        prompt: "Which change most directly improves sleep consistency?",
        options: [
          "A fixed wake time every day plus morning outdoor light",
          "Going to bed earlier without changing anything else",
          "Long afternoon naps",
          "Sleeping in on weekends",
        ],
        correct: 0,
        why: "A fixed wake time and morning light anchor your body clock, and a consistent bedtime follows.",
      },
      {
        prompt: "Your readiness check is low, soreness is high and your numbers have stalled for two weeks. What fits best?",
        options: [
          "Train harder to break through",
          "Switch to a brand-new programme",
          "Stop training for a month",
          "Take a planned deload week: same schedule, about half the volume",
        ],
        correct: 3,
        why: "A deload clears accumulated fatigue while keeping the habit, and progress often resumes afterwards.",
      },
      {
        prompt: "Which is a well-designed habit plan?",
        options: [
          "I will be more disciplined this month",
          "I'll train whenever I have free time",
          "After I brush my teeth at night, I lay out tomorrow's training clothes",
          "I'll start five new habits on Monday",
        ],
        correct: 2,
        why: "A habit stack attaches a small, specific behaviour to a reliable existing cue.",
      },
      {
        prompt: "In a weekly review, what should follow a factual note about what went wrong?",
        options: [
          "A judgement about your character",
          "One specific adjustment for next week",
          "Nothing; just record it",
          "A complete rewrite of the plan",
        ],
        correct: 1,
        why: "Reasons lead to plans. One adjustment you actually make turns the review into progress.",
      },
    ],
  },
};
