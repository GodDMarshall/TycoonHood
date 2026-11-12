import type { Programme } from "./types";

/**
 * MINDFULNESS & WELLNESS — launch edition.
 * Awareness, emotional resilience, balance and sustainable well-being.
 * Educational content only: not medical or psychological treatment.
 */

const SAFETY = `> **Educational content, not medical or psychological treatment.** If you are struggling with persistent anxiety, low mood, trauma or sleep problems, please speak to a qualified health professional. If you are in crisis, contact local emergency services or a crisis helpline.`;

export const mindfulness: Programme = {
  slug: "mindfulness-wellness",
  modules: [
    // ─────────────────────────────────────────────────────────────── 1
    {
      title: "Mindfulness Foundations",
      description: "What mindfulness actually is, why attention is your most important asset, and a first practice you can do today.",
      objectives: [
        "Define mindfulness as noticing where attention is and returning it on purpose.",
        "Distinguish formal practice from informal, everyday mindfulness.",
        "Complete a ten-minute guided sit without outside help.",
        "Apply mindful attention to three routine daily activities.",
      ],
      completion: "Read both lessons, complete seven days of informal practice with a daily log, and pass the knowledge check.",
      lessons: [
        {
          title: "Attention Is the Asset",
          type: "READING",
          preview: true,
          minutes: 7,
          md: `${SAFETY}

Warrior gives you discipline. Builder gives you leverage. Tycoon gives you resources. **Mind decides whether any of it is usable under pressure.** This programme trains the part of you that does the noticing.

## Attention is trainable, and mostly untrained

Every skill in the other pillars depends on one ability: placing attention where you choose and keeping it there. Through boredom. Through discomfort. Through the phone lighting up. Modern life is built to fragment exactly that ability, and it works. Try it now: hold your attention on one thing for two unbroken minutes. Most people cannot.

The good news cuts the other way. Attention responds to training the way a muscle responds to load. The practice is old, it is secular in this programme, and it is simple. Simple is not easy. That gap is what makes it training.

## What mindfulness means here

Mindfulness has many definitions. We use one working definition you can test:

**Mindfulness is noticing where your attention is, and returning it on purpose.**

That sentence has three parts:

1. **Attention goes somewhere.** It always does. To the breath, to a worry, to a song stuck in your head.
2. **You notice where it went.** This is the moment of waking up. "I am planning dinner."
3. **You bring it back.** Gently, without commentary, to what you chose.

Each return is one rep. You will do thousands of them over this programme.

## What it is not

- **Not emptying the mind.** Thoughts will keep arriving. You are not trying to stop them. You are learning to see them.
- **Not relaxation on demand.** Calm often follows practice. It is a side effect, not the goal. Some sessions will feel restless. They still count.
- **Not therapy.** This is education and skill training. It sits alongside professional care, never in place of it.
- **Not a belief system.** Contemplative traditions developed many of these methods. You do not need to adopt any tradition to use them.

## Formal and informal practice

You will train in two ways.

**Formal practice** is time set aside: sitting for ten minutes with a timer, attention on the breath. It is the gym session.

**Informal practice** is bringing the same attention into ordinary life: tasting your coffee, feeling your feet on the stairs, listening fully in a conversation. It is carrying the strength into daily movement.

You need both. Formal practice builds the skill in controlled conditions. Informal practice transfers it to where your life actually happens.

## What to expect in the first weeks

- Your mind will seem busier than before. It is not. You are just noticing it for the first time.
- You will forget to practise. Build reminders, not guilt.
- Some days will feel like nothing happened. Progress shows up later, as noticing sooner: catching irritation a second earlier, spotting the phone reach before it lands.

## A sixty-second start

Do this now, before the next lesson:

1. Sit still. Set a timer for one minute.
2. Feel the weight of your body on the chair.
3. Notice three sounds, one at a time.
4. When you drift into thinking, say "thinking" silently and return to sound.
5. When the timer ends, count roughly how many times you drifted.

That number is not a score. It is your starting baseline. The next lesson gives you the full ten-minute protocol.`,
        },
        {
          title: "The Ten-Minute Protocol",
          type: "READING",
          minutes: 8,
          md: `One practice, done daily, beats five practices done occasionally. This is the one. You will use it for the rest of the programme, and it scales from three minutes to thirty.

## Before you start

- **Place:** anywhere you will not be interrupted for ten minutes. A chair is fine. So is the floor, a cushion or the edge of your bed.
- **Timer:** use a phone timer with a gentle sound, then put the phone face down and out of reach. Turn on do-not-disturb.
- **Time:** the same time every day. Attach it to something that already happens: after waking, after brushing your teeth, after training.

## The sit, step by step

1. **Settle (one minute).** Sit with your back upright but not rigid. Feet flat. Hands resting on your thighs. Eyes closed, or lowered and soft on the floor a metre ahead.
2. **Take three slower breaths.** Breathe in through the nose, out through the mouth. Then let the breath return to its own rhythm. You are not controlling it from here on.
3. **Find the anchor.** Notice where the breath is most obvious: the air at the nostrils, the rise of the chest, or the movement of the belly. Pick one spot. Stay with it.
4. **Count.** Silently count each out-breath, one to ten. At ten, start again at one. If you lose count, start again at one. Losing count is normal.
5. **Notice drifting.** You will vanish into thought: planning, replaying, narrating. At some point you will realise you have left. That moment of realising is the practice.
6. **Return.** Note silently where you went, in one word: "planning", "remembering", "worrying". Then return to the breath and start the count at one.
7. **Close (final minute).** Let go of the count. Notice the whole body sitting. Hear the room. When the timer sounds, take one slower breath, open your eyes and get up.

## When the mind wanders

It will wander every session. Your job is not to prevent it. Your job is to notice and return.

- **Return without commentary.** No sigh, no "I am bad at this." The comment is just more wandering.
- **Be kind about it.** Treat the drifting mind like a puppy you are training. Firm, patient, repeated.
- **Count returns, not minutes of focus.** A session with forty returns is a strong session, not a failed one.

## Common mistakes

- **Trying too hard.** Gripping the breath makes it tight and strange. Hold it lightly, like a cup of tea.
- **Controlling the breath.** If you notice yourself breathing deliberately, let go. Watch it as if watching waves.
- **Grading the session.** There is no good or bad sit. There is a sit that happened. Log it and move on.
- **Waiting for the right mood.** Practise when tired, distracted or irritable. Those sessions train the most.
- **Moving the time around.** A floating practice gets skipped. A fixed one becomes automatic.

## The three rules

1. **Same time daily.** Anchor it to a habit that already exists.
2. **Never negotiate the ten minutes down mid-week.** On a truly wrecked day, three breaths at the anchor keep the chain alive. Decide that fallback in advance, not in the moment.
3. **Track it.** The daily check-in on your dashboard is the log. The streak is the training record of the mind.

## If ten minutes is too much

Start with five. Add one minute every few days. The protocol is the same at any length. What matters is that it happens daily.

If you feel distressed during practice, open your eyes, look around the room and name five things you can see. You can always stop. Practice is meant to be challenging, never overwhelming.`,
        },
        {
          title: "Seven Days of Everyday Mindfulness",
          type: "ASSIGNMENT",
          minutes: 20,
          md: `Formal practice builds the skill. Informal practice puts it to work. This assignment trains you to bring full attention into activities you already do, without adding time to your day.

## The practice

For **seven consecutive days**, do two things:

1. **The Ten-Minute Protocol** once a day, at your anchor time.
2. **Three mindful activities** a day, chosen from your existing routine.

## Choosing your three activities

Pick activities that are short, happen daily and are usually done on autopilot. Good choices:

- Drinking the first coffee or tea of the day
- Brushing your teeth
- Showering
- Walking from your door to the car, bus or desk
- Washing your hands
- Eating the first three bites of a meal
- Climbing a flight of stairs

Write your three choices down before day one. Keep the same three all week. Consistency makes the reminder automatic.

## How to do a mindful activity

Take the shower as an example. Use this pattern for any activity.

1. **Arrive.** As you begin, take one slower breath. Tell yourself silently: "Now I am showering."
2. **Pick a sense.** Choose one sense to lead: touch, sound, sight, smell or taste. In the shower, touch works well.
3. **Explore.** Notice the temperature of the water. Where it lands first. How it runs down your back. The smell of the soap. The sound on the tiles.
4. **Notice drifting.** You will start rehearsing a meeting or replaying a conversation. When you notice, label it in one word ("planning") and return to the water on your skin.
5. **Finish deliberately.** As the activity ends, take one more breath and notice how you feel.

The activity takes as long as it always did. Only the quality of attention changes.

## What to do when you forget

You will forget, especially in the first three days. That is expected.

- **Use cues.** Put a small sticker on your toothbrush or mug. Set a phone reminder for your walk.
- **Catch it late.** If you realise halfway through, start from where you are. Half a mindful shower is still a rep.
- **Do not double up.** If you missed one entirely, do not try to make it up later. Log it as missed and move on.

## Common mistakes

- **Choosing activities that are too long.** A full commute is hard to hold. Start with the first two minutes of it.
- **Narrating instead of sensing.** "This water is nice, I should shower more mindfully" is thinking. Drop the words and feel the water.
- **Expecting calm.** Some days the activity will feel ordinary. Ordinary attention, fully present, is the point.

## Deliverable

Submit a short log with these parts:

1. **Your three activities**, named before day one.
2. **A seven-day table.** For each day, mark the ten-minute sit (done or missed) and each activity (done, partial or missed).
3. **One observation per day**, one sentence. Something you noticed that you usually miss. Example: "The coffee is bitter at the front of the tongue and sweet at the back."
4. **A closing reflection**, three to five sentences: Which activity was easiest to remember? Which was hardest? Did you notice any moment outside the practice where you caught yourself drifting sooner than usual?

## Standard

Aim for at least five of seven days on the sit and at least fifteen of twenty-one activity reps. Missed reps are data, not failure. Record honestly. An honest log teaches you more than a perfect one.`,
        },
        {
          title: "Mindfulness Foundations — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: "Five questions on the core ideas of this module. Pass to unlock Meditation.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "Which working definition of mindfulness does this programme use?",
                options: [
                  "Emptying the mind of all thoughts",
                  "Noticing where your attention is and returning it on purpose",
                  "Staying relaxed at all times",
                  "Thinking positively about difficult events",
                ],
                correct: 1,
                why: "Mindfulness here is a trainable skill: notice where attention went, then bring it back deliberately. Thoughts are expected, not banned.",
              },
              {
                prompt: "During a sit you realise you have been planning your day for two minutes. What is the right response?",
                options: [
                  "Stop the session and restart the timer",
                  "Criticise yourself so you focus harder next time",
                  "Label it briefly, such as 'planning', and return to the breath",
                  "Keep planning, since the session is already broken",
                ],
                correct: 2,
                why: "Noticing and returning is the rep. A brief label and a calm return is the practice working, not failing.",
              },
              {
                prompt: "What is the difference between formal and informal practice?",
                options: [
                  "Formal practice is time set aside to train; informal practice brings the same attention into daily activities",
                  "Formal practice needs a teacher; informal practice does not",
                  "Formal practice is religious; informal practice is secular",
                  "There is no real difference",
                ],
                correct: 0,
                why: "Formal practice builds the skill in controlled conditions. Informal practice transfers it to everyday life. You need both.",
              },
              {
                prompt: "Which habit makes the Ten-Minute Protocol most likely to stick?",
                options: [
                  "Practising whenever you feel like it",
                  "Practising for an hour on weekends instead",
                  "Attaching it to a fixed daily anchor, such as after brushing your teeth",
                  "Only practising on calm days",
                ],
                correct: 2,
                why: "A fixed anchor turns the practice into a routine. Floating practices get skipped.",
              },
              {
                prompt: "A new practitioner says their mind seems busier since they started meditating. What is the most likely explanation?",
                options: [
                  "Meditation is making their mind busier",
                  "They are doing it wrong and should stop",
                  "They are noticing activity that was always there",
                  "They need to breathe faster",
                ],
                correct: 2,
                why: "Practice reveals mental activity that previously went unnoticed. Seeing it is the first sign the skill is developing.",
              },
            ],
          },
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────── 2
    {
      title: "Meditation",
      description: "Three core meditation styles, how to handle the obstacles every meditator meets, and a thirty-day practice.",
      objectives: [
        "Describe focused attention, open awareness and goodwill practice, and when to use each.",
        "Set up a posture and environment that supports a stable daily sit.",
        "Apply a specific response to restlessness, sleepiness, boredom, discomfort and doubt.",
        "Sustain a daily meditation practice for thirty days and track it.",
      ],
      completion: "Read both lessons, log thirty days of daily practice with a day-thirty reflection, and pass the knowledge check.",
      lessons: [
        {
          title: "Three Ways to Sit",
          type: "READING",
          minutes: 8,
          md: `The Ten-Minute Protocol is one style of meditation. There are many others. Most fall into three families. Learn all three, then use the one that fits the day.

## Posture first

Posture is not about looking the part. It is about staying alert without strain.

- **Chair:** sit towards the front edge. Feet flat, hip-width apart. Knees slightly lower than hips if you can.
- **Floor:** sit on a firm cushion so your hips are higher than your knees. Cross your legs loosely.
- **Spine:** upright, as if a thread lifts the crown of your head. Not stiff. Let the shoulders drop.
- **Hands:** rest them on your thighs, or one on top of the other in your lap.
- **Eyes:** closed, or lowered with a soft gaze. If you get sleepy, open them.

If you have pain or limited mobility, lie down or sit however is comfortable. An alert mind matters more than a classic shape.

## 1. Focused attention

You choose one object and return to it each time you drift. The breath is the usual object. Sounds, a word or the feeling of your hands also work.

**Use it when:** you are scattered and need to collect yourself. This is your base practice.

**How:** follow the Ten-Minute Protocol from Module 1.

## 2. Open awareness

Instead of one object, you rest attention on whatever is most obvious in each moment: a sound, an itch, a thought, a feeling. You do not chase any of it. You notice it arrive, stay and pass.

**Use it when:** you already have some stability and want to see how experience moves.

**How, for ten minutes:**

1. Begin with two minutes of breath focus to settle.
2. Widen attention to include sounds. Notice them come and go without naming the source.
3. Widen again to include body sensations. Pressure, warmth, tingling.
4. Now include thoughts. When a thought appears, note it lightly ("thought") and let it pass, like a car going by outside.
5. If you get lost in a thought, return to the breath for three breaths, then widen again.

**Common mistake:** open awareness drifting into daydreaming. If you have been lost for a while, go back to focused attention. Open does not mean absent.

## 3. Goodwill practice

You deliberately bring warm wishes to mind for yourself and others. Many traditions call it loving-kindness. Here we use plain language.

**Use it when:** you notice harshness towards yourself or irritation towards others.

**How, for ten minutes:**

1. Settle with a few breaths.
2. Bring to mind someone you find easy to like. Picture them.
3. Silently repeat simple phrases for them, slowly: "May you be safe. May you be well. May you live with ease."
4. After two or three minutes, direct the same phrases to yourself.
5. Then to a neutral person, such as a shop assistant you saw today.
6. If you are ready, to someone you find difficult. Keep it light. Return to the easy person if it gets hard.

**What to expect:** you may feel nothing at first. That is fine. You are training an intention, not forcing a feeling.

## Choosing on the day

- Mind racing? **Focused attention.**
- Steady and curious? **Open awareness.**
- Harsh, resentful or low? **Goodwill practice.**

Keep focused attention as your default for the next thirty days. Add the other two once a week each to learn them.

## Length and timing

Ten minutes is the standard. Longer sessions are useful later. Consistency beats duration every time. A daily ten minutes outperforms a weekly hour.`,
        },
        {
          title: "Working With the Wandering Mind",
          type: "READING",
          minutes: 8,
          md: `Every meditator meets the same five obstacles. They are not signs you are doing it wrong. They are the practice. Learn the specific response to each and you will stop quitting when they show up.

## 1. Restlessness

**What it feels like:** the urge to move, check the time or get up. A body that buzzes. A mind that will not stop planning.

**What to do:**

- Name it: "restless." Then feel where it lives in the body. Often the chest, legs or hands.
- Lengthen the out-breath slightly for five breaths.
- Count breaths in smaller sets: one to five instead of one to ten.
- Keep your eyes open and gaze at a fixed point.

**Do not:** fight it by gripping harder. Restlessness feeds on effort.

## 2. Sleepiness

**What it feels like:** heavy eyelids, a drooping head, drifting into dream-like images.

**What to do:**

- Open your eyes and lift your gaze slightly.
- Straighten your spine. Take three fuller breaths.
- Practise at a different time of day, or after splashing water on your face.
- Stand up and continue the practice standing.

**Do not:** treat chronic sleepiness as a meditation problem. It is often a sleep problem. Module 6 covers that.

## 3. Boredom

**What it feels like:** "This is pointless. Nothing is happening."

**What to do:**

- Get curious about the breath in more detail. Where does the in-breath begin? Is the out-breath longer? Is there a pause between them?
- Notice boredom itself. Where is it in the body? What does it want you to do?
- Remember that boredom is just another passing state. Wait it out for three breaths and see whether it changes.

## 4. Physical discomfort

**What it feels like:** an aching knee, an itch, a tight back.

**What to do:**

- For mild discomfort, make it the object for a few breaths. Notice its edges, temperature and how it changes. Often it shifts or fades.
- If it persists, move mindfully. Decide to move, move slowly, notice the relief, then return to the breath.
- Sharp or increasing pain is a signal to stop and adjust. Meditation is not an endurance test.

## 5. Doubt

**What it feels like:** "I am bad at this. It is not working. Other people do it better."

**What to do:**

- Label it: "doubting." Doubt is a thought like any other.
- Remember the rep model. Every return counts, including the return from doubt.
- Judge practice by weeks, not sessions. Review your log after thirty days, not after one bad morning.

## The noting technique

Noting helps with all five. When something pulls you away, give it a one-word label, silently and softly, then return.

- "Planning." Return.
- "Itching." Return.
- "Sleepy." Return.
- "Doubting." Return.

Keep labels simple. One word is enough. If you start debating the right label, that is "thinking." Note that and return.

## When strong emotions arise

Sometimes meditation brings up sadness, anger or old memories. Usually this passes if you stay with the breath and let the feeling be there. If it becomes overwhelming:

- Open your eyes.
- Feel your feet on the floor.
- Name five things you can see.
- End the session. You can return to it later.

If difficult material keeps coming up, talk to a qualified professional. Meditation is not designed to process trauma on your own.

## The core rule

Whatever happens, the response is the same: **notice, name, return.** You do not need a perfect sit. You need a sit that happened.`,
        },
        {
          title: "Thirty Days on the Cushion",
          type: "ASSIGNMENT",
          minutes: 20,
          md: `The assignment is the practice itself. **Ten minutes of meditation, daily, for thirty days**, anchored and tracked.

## Setup (complete before day one)

1. **Write your anchor as an if-then plan:** "After I [existing habit], I sit for ten minutes." Example: "After I make my morning coffee, I sit for ten minutes before drinking it."
2. **Choose your place.** Same chair or cushion every day. Leave it ready the night before.
3. **Decide your fallback rule.** On a truly wrecked day, what is the minimum? Three breaths at the anchor, or two minutes, decided now. Write it down.
4. **Schedule the variety.** Focused attention on most days. Open awareness one day a week. Goodwill practice one day a week. Mark which days in your log.

## Daily practice

Each day:

1. Sit at your anchor.
2. Set the timer for ten minutes.
3. Practise the style scheduled for that day.
4. When the mind wanders, use the core rule: notice, name, return.
5. After the timer, take thirty seconds to record the session.

## What to record each day

Keep it short. Thirty seconds, not five minutes.

- **Done:** full, fallback or missed.
- **Style:** focused, open or goodwill.
- **Main obstacle:** restlessness, sleepiness, boredom, discomfort, doubt or none.
- **One word** for how you felt at the end.

## Weekly check (every seventh day)

Answer three questions in a few sentences:

1. Which obstacle appeared most this week?
2. What did you try in response? Did it help?
3. Did you notice drifting faster in daily life? Give one example.

## Rules for the thirty days

- **Do not shorten the sit mid-week** because it feels hard. Use the fallback only on genuinely wrecked days.
- **Missing a day does not reset anything.** Log it honestly and sit the next day. Never miss twice in a row if you can help it.
- **Do not chase experiences.** Calm, clarity and insight come and go. The goal is the daily rep.
- **If practice becomes distressing,** stop, ground yourself and speak to a qualified professional. Pausing is always allowed.

## Deliverable

Submit at day thirty:

1. Your if-then anchor and fallback rule.
2. Your thirty-day log (daily records and four weekly checks).
3. A count: full sessions, fallback sessions, missed days.
4. **A closing reflection of five to eight sentences** covering:
   - What changed in how you notice distraction **off** the cushion. Give one concrete example: a conversation, a work task, a moment with your phone.
   - Which style you prefer and why.
   - What you will keep doing after day thirty.

## Standard

Thirty days is long enough for the skill to appear in ordinary life and short enough to be non-negotiable. A strong log shows at least twenty-four full sessions. A log with gaps, honestly kept, is still a pass. The record does not do guilt. It does evidence.`,
        },
        {
          title: "Meditation — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: "Five questions on meditation styles and obstacles. Pass to unlock Breath Awareness.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "Your mind is racing and scattered before a busy day. Which style fits best?",
                options: ["Open awareness", "Focused attention", "Goodwill practice", "No practice until you are calmer"],
                correct: 1,
                why: "Focused attention gives a scattered mind one stable object to return to. It is the base practice for collecting yourself.",
              },
              {
                prompt: "You keep nodding off during morning sits. Which response is most useful?",
                options: [
                  "Close your eyes more tightly",
                  "Lie down so you are more comfortable",
                  "Open your eyes, straighten your spine and take a few fuller breaths",
                  "Give up meditation in the mornings",
                ],
                correct: 2,
                why: "Opening the eyes, adjusting posture and taking fuller breaths raise alertness. Persistent sleepiness may point to a sleep issue.",
              },
              {
                prompt: "What is the noting technique?",
                options: [
                  "Writing a journal entry after each sit",
                  "Silently giving a one-word label to whatever pulled you away, then returning",
                  "Counting how many thoughts you have",
                  "Repeating a phrase continuously",
                ],
                correct: 1,
                why: "A brief, soft label such as 'planning' or 'itching' marks the distraction so you can return to the anchor.",
              },
              {
                prompt: "A sharp pain in your knee is getting worse as you sit. What should you do?",
                options: [
                  "Ignore it; meditation is about endurance",
                  "Stop and adjust your position",
                  "Hold your breath until it passes",
                  "Speed up the count",
                ],
                correct: 1,
                why: "Mild discomfort can be observed, but sharp or increasing pain is a signal to move. Meditation is not an endurance test.",
              },
              {
                prompt: "In goodwill practice, what should you do if you feel nothing when repeating the phrases?",
                options: [
                  "Stop, because the practice is not working",
                  "Force a strong emotion",
                  "Continue; you are training an intention, and feelings may or may not follow",
                  "Switch to a faster breathing pattern",
                ],
                correct: 2,
                why: "Goodwill practice trains the intention. Feeling little at first is normal and does not mean it is failing.",
              },
            ],
          },
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────── 3
    {
      title: "Breath Awareness",
      description: "Use the breath as an anchor for attention and a gentle, safe lever for settling the body.",
      objectives: [
        "Explain why the breath is a useful anchor for attention.",
        "Observe natural breathing without trying to control it.",
        "Practise extended-exhale and equal breathing safely, without holds or forced breathing.",
        "Build short breath check-ins into the working day.",
      ],
      completion: "Read both lessons, complete five days of breath check-ins with a log, and pass the knowledge check.",
      lessons: [
        {
          title: "The Breath as an Anchor",
          type: "READING",
          minutes: 7,
          md: `You have used the breath as an anchor since Module 1. This lesson explains why it works so well, and how to observe it more precisely.

## Why the breath

The breath has four qualities that make it a near-perfect training object.

- **It is always with you.** No equipment. No app. Available in a meeting, on a train or in bed.
- **It happens in the present.** You cannot feel yesterday's breath or tomorrow's. Attending to it brings you into now.
- **It runs on its own, but you can influence it.** That makes it a bridge between the automatic body and deliberate attention.
- **It reflects your state.** Short and high when you are tense. Slower and lower when you are settled. Watching the breath tells you how you are.

## Observing without controlling

The first skill is simply to watch. This is harder than it sounds. The moment you pay attention, you will want to adjust it. Let it be.

**A five-minute observation practice:**

1. Sit comfortably. Close your eyes or lower your gaze.
2. Place one hand on your chest and one on your belly.
3. For one minute, just notice which hand moves more. Do not change anything.
4. Remove your hands. For the next minute, notice the temperature of the air at the nostrils. Cooler on the in-breath? Warmer on the out-breath?
5. For the next minute, notice the length of each breath. Is the in-breath longer, shorter or the same as the out-breath?
6. For the next minute, notice the tiny natural turn between in and out, and between out and in. Do not extend it. Just notice it.
7. For the final minute, notice the whole breath at once: air, chest, belly, rhythm.

## When you catch yourself controlling

You will. Most people do. When you notice:

- Say silently "controlling."
- Let the next breath happen without you.
- If that is hard, shift attention to a sound for a few seconds, then come back.

Over time you will find a light touch: aware of the breath without managing it.

## Reading your breath

Use quick breath checks to read your state.

- **Fast, shallow, mostly in the chest:** often a sign of tension, rushing or anxiety.
- **Slow, low, belly moving:** often a sign of a settled state.
- **Irregular, with sighs:** often a sign of fatigue or holding something in.

These are clues, not diagnoses. The point is information. Once you notice the breath is fast and high, you have a choice about what to do next.

## Safety notes

- **Never force the breath.** Breath awareness should feel easy.
- **Do not hold your breath** as part of these practices.
- **If you feel dizzy, light-headed or tingly, stop.** Breathe normally, look around the room and let it pass.
- **If you have a respiratory or heart condition,** or if attention on the breath makes you anxious, use another anchor such as sounds or the feeling of your feet. Speak to a health professional if you have concerns.

## Alternative anchors

The breath does not suit everyone, every day. Good alternatives:

- **Feet:** the pressure and contact of your soles on the floor.
- **Hands:** the tingling or warmth of your palms.
- **Sound:** whatever you can hear, near and far.

The method is identical. Choose the anchor, notice drifting, return.

## The takeaway

Watching the breath trains attention and reports your state at the same time. The next lesson shows you how to gently influence it when that state needs adjusting.`,
        },
        {
          title: "Gentle Breathing Practices",
          type: "READING",
          minutes: 8,
          md: `Observing the breath trains attention. Gently shaping the breath can help you settle. This lesson gives you three simple practices. None involve holding the breath or breathing fast and hard.

## Ground rules for all three

- **Breathe through the nose** if you can. It slows the breath naturally.
- **Keep it comfortable.** If any count feels like a strain, shorten it.
- **No breath holds.** Let the in-breath turn into the out-breath naturally.
- **No forcing.** The breath should feel smooth and quiet, not big and effortful.
- **Stop if you feel dizzy, light-headed or tingly.** Return to normal breathing and let it pass. Light-headedness usually means you are breathing too deeply or too much.

## 1. The extended exhale

This is the most useful practice in the programme. Breathing out a little longer than you breathe in is a simple way to signal the body to settle.

**How:**

1. Sit or stand comfortably.
2. Breathe in gently through the nose for a count of four.
3. Breathe out slowly through the nose or softly pursed lips for a count of six.
4. Repeat for three to five rounds, or about one minute.
5. Return to normal breathing and notice how you feel.

**Adjust it:** if four in and six out is a strain, try three in and four out. The only rule is that the out-breath is a little longer.

**When to use it:** before a difficult conversation, after bad news, before sleep, or when you notice your breath is fast and high.

## 2. Equal breathing

Breathing in and out for the same count gives the mind a steady rhythm to follow.

**How:**

1. Breathe in through the nose for a count of four.
2. Breathe out through the nose for a count of four.
3. Continue for two to five minutes.
4. If your mind wanders, return to the count at one.

**When to use it:** when you want steadiness rather than relaxation. Before focused work. When waiting.

## 3. Breathing with movement

Linking breath to simple movement helps when sitting still feels impossible.

**How:**

1. Stand with your arms by your sides.
2. Breathe in slowly as you raise your arms out to the side and up.
3. Breathe out slowly as you lower them.
4. Repeat five to ten times. Move at the pace of the breath, not the other way round.

**When to use it:** at the end of a long screen session, when restless, or as a warm-up before a sit.

## Common mistakes

- **Breathing too much.** Big, deep gulps can make you dizzy. Keep the volume normal; just change the timing.
- **Doing it for too long.** One to five minutes is plenty. These are tools, not marathons.
- **Expecting a switch.** Breathing practices can help you settle. They do not guarantee a feeling. Sometimes they just give you a pause before you act, which is valuable on its own.
- **Using it to suppress.** The breath is not a way to make feelings disappear. Use it to steady yourself so you can respond, not to push emotions down.

## What to avoid in this programme

You may come across breathing methods that involve long breath holds, rapid forced breathing or deliberate hyperventilation. We do not teach these. They can cause dizziness or fainting and are not suitable for self-guided practice. If you are curious about them, seek out a qualified instructor and check with a health professional first.

## Putting it together

- **Observe** the breath to train attention and read your state.
- **Extend the exhale** when you want to settle.
- **Breathe evenly** when you want steadiness.
- **Move with the breath** when stillness is too much.

The assignment builds these into short check-ins across your day.`,
        },
        {
          title: "Five Days of Breath Check-ins",
          type: "ASSIGNMENT",
          minutes: 15,
          md: `Long practices build skill. Short, frequent check-ins put it to use. For five days, you will pause three times a day for one minute and read your breath.

## The practice

For **five consecutive working days**:

1. **Three scheduled check-ins**, one minute each.
2. **At least one unscheduled extended exhale**, used in a real moment of stress or rush.
3. **Your daily ten-minute sit continues** as normal.

## Scheduling your check-ins

Set three phone reminders, or attach them to events that already happen. Suggested times:

- **Morning:** before opening email or messages.
- **Midday:** before lunch.
- **Afternoon:** between two tasks or meetings.

Name the reminder something neutral, such as "Breath." Keep it short so it does not become noise.

## The one-minute check-in

When the reminder goes off:

1. **Stop.** Take your hands off the keyboard or phone. Feet on the floor.
2. **Read (fifteen seconds).** Without changing anything, notice: Is the breath fast or slow? High in the chest or low in the belly? Smooth or irregular?
3. **Rate it.** Silently give yourself a number from 1 (very settled) to 5 (very tense).
4. **Respond (forty-five seconds).**
   - If you rated 1 or 2: keep observing the natural breath until the minute ends.
   - If you rated 3 or more: do three to five rounds of extended exhale, four in and six out.
5. **Return.** Before you resume, note one word for how you feel.

If you feel dizzy at any point, stop the practice and breathe normally.

## The unscheduled extended exhale

At least once a day, catch a real moment: a frustrating email, traffic, a tense call. Before you respond, do three rounds of extended exhale. Then act.

You will often remember only afterwards. That still counts. Note it, and do three rounds then. Catching it late is how you learn to catch it early.

## Common mistakes

- **Snoozing the reminder.** If you cannot stop now, do it within ten minutes. Do not skip.
- **Doing it while still typing.** Hands off. Feet down. One minute of real attention.
- **Only checking when stressed.** The point is to read your state at random moments. Calm readings teach you what settled feels like.

## Deliverable

Submit a log with these parts:

1. **Your three check-in times or anchors.**
2. **A five-day table** with fifteen entries. For each: time, breath description (for example, "fast, chest"), rating from 1 to 5, what you did, and one word after.
3. **Five unscheduled moments**, one per day: what happened, when you noticed (before, during or after) and what you did.
4. **A short reflection**, four to six sentences:
   - What patterns did you see? Which time of day was most tense?
   - Did the extended exhale change your rating or your next action?
   - Did you start noticing your breath without the reminder?

## Standard

Aim for at least twelve of fifteen check-ins and at least three unscheduled moments. Be accurate in your ratings. The value of this assignment is in the pattern your honest data reveals.`,
        },
        {
          title: "Breath Awareness — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: "Five questions on breath awareness and safe practice. Pass to unlock Emotional Awareness.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "Why does the breath work well as an anchor for attention?",
                options: [
                  "It is always present, happens now and reflects your state",
                  "It is the only thing the mind cannot wander from",
                  "It requires no attention at all",
                  "It is easy to stop completely",
                ],
                correct: 0,
                why: "The breath is always available, rooted in the present and a clear readout of how you are, which makes it an ideal training object.",
              },
              {
                prompt: "What does the extended exhale involve?",
                options: [
                  "Holding the breath after each inhale",
                  "Breathing out a little longer than you breathe in",
                  "Breathing as fast as possible for one minute",
                  "Breathing only through the mouth",
                ],
                correct: 1,
                why: "A slightly longer out-breath, such as four in and six out, is a gentle way to help the body settle.",
              },
              {
                prompt: "You feel light-headed during a breathing practice. What should you do?",
                options: [
                  "Breathe more deeply to push through",
                  "Hold your breath until it passes",
                  "Stop the practice and return to normal breathing",
                  "Speed up the count",
                ],
                correct: 2,
                why: "Dizziness usually means you are breathing too much. Stop, breathe normally and let it pass.",
              },
              {
                prompt: "During breath observation, you notice you are controlling the breath. What is the best response?",
                options: [
                  "Control it more precisely",
                  "Note 'controlling' and let the next breath happen on its own",
                  "Stop the practice for the day",
                  "Hold the breath to reset it",
                ],
                correct: 1,
                why: "Noticing control is part of the skill. Label it and allow the next breath to happen naturally.",
              },
              {
                prompt: "Breath awareness makes someone feel anxious. What is a sensible alternative?",
                options: [
                  "Force themselves to continue",
                  "Use another anchor, such as sounds or the feeling of their feet",
                  "Switch to rapid breathing",
                  "Give up mindfulness entirely",
                ],
                correct: 1,
                why: "Sounds, feet and hands work as anchors in the same way. The method matters more than the object.",
              },
            ],
          },
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────── 4
    {
      title: "Emotional Awareness",
      description: "Recognise emotions as they arise in the body and mind, name them precisely, and create space before you act.",
      objectives: [
        "Identify the three components of an emotion: body sensation, thought and urge.",
        "Label emotions with precise, specific words.",
        "Use the four-step PLAN pause to respond rather than react.",
        "Keep a seven-day emotion log and identify personal patterns.",
      ],
      completion: "Read both lessons, keep a seven-day emotion log with a pattern summary, and pass the knowledge check.",
      lessons: [
        {
          title: "What an Emotion Is Made Of",
          type: "READING",
          minutes: 7,
          md: `${SAFETY}

Emotions can feel like weather that happens to you. Up close, they have parts. Once you can see the parts, you have more choice about what happens next.

## The three components

Most emotions show up as three things at once.

1. **Body sensations.** Heat in the face. A tight chest. A sinking stomach. Clenched jaw. Restless legs.
2. **Thoughts.** "This is unfair." "I am going to fail." "They do not respect me."
3. **Urges.** The pull to act: to snap, withdraw, check the phone, eat, leave the room.

These three feed each other. A tight chest prompts a worried thought. The thought tightens the chest further. The urge to escape grows. Seen as one block, it feels overwhelming. Seen as three parts, each one is workable.

## Emotions are information

Emotions are not good or bad. They are signals.

- **Anger** often signals a boundary crossed or a goal blocked.
- **Fear and anxiety** often signal a possible threat or uncertainty.
- **Sadness** often signals loss.
- **Guilt** often signals a gap between your actions and your values.
- **Joy and contentment** often signal that something matters and is going well.

Signals can be accurate or out of date. A feeling of threat during a presentation is real, but the presentation is not dangerous. Awareness lets you check the signal before you obey it.

## Feeling is not the same as acting

You can feel furious and speak calmly. You can feel afraid and still walk into the room. The goal is not to stop feeling. **The goal is to widen the gap between feeling and acting**, so your values choose the action rather than the urge.

This is the same move you practise on the cushion. A thought arises; you notice it; you return. An emotion arises; you notice it; you choose.

## Where emotions live in your body

Each person has their own map. Learning yours gives you early warning.

**A three-minute body check:**

1. Sit quietly. Take a few natural breaths.
2. Bring to mind a mildly annoying recent moment. Keep it small, a three out of ten at most.
3. Scan slowly from head to feet. Forehead, jaw, throat, shoulders, chest, stomach, hands, legs.
4. Where do you feel something? Describe it in physical terms: tight, hot, heavy, buzzing, hollow.
5. Let the memory go. Return to the breath for five breaths. Notice whether the sensation changes.

Repeat later with a mildly pleasant memory. Compare the two maps.

If a memory brings up more than you expected, stop, open your eyes and ground yourself by noticing your feet on the floor. Choose smaller moments to practise with.

## Common mistakes

- **Judging the emotion.** "I should not feel this." The judgement adds a second layer of distress on top of the first.
- **Suppressing it.** Pushing feelings down tends to make them leak out elsewhere. Awareness is not suppression.
- **Drowning in it.** Replaying the story over and over is not awareness either. Return to body sensations when the story takes over.
- **Waiting for big emotions to practise.** Start with small ones. Mild irritation in a queue is perfect training.

## The takeaway

An emotion is sensation, thought and urge, arriving together. Notice the parts, treat the whole as information, and keep a gap between the feeling and the action. The next lesson gives you a tool for using that gap.`,
        },
        {
          title: "Name It, Then Choose: The PLAN Pause",
          type: "READING",
          minutes: 8,
          md: `${SAFETY}

Naming an emotion in plain words shifts you from being inside it to observing it. That small shift creates space. This lesson teaches you to name emotions precisely and use a four-step pause when they run high.

## Why precise names matter

"I feel bad" gives you little to work with. "I feel embarrassed because I forgot their name" tells you exactly what is happening and what might help.

Build a wider vocabulary. Instead of the basic five, reach for more specific words.

- **Instead of angry:** irritated, frustrated, resentful, indignant, impatient.
- **Instead of anxious:** uneasy, nervous, apprehensive, overwhelmed, on edge.
- **Instead of sad:** disappointed, lonely, discouraged, homesick, flat.
- **Instead of happy:** relieved, proud, content, grateful, excited.
- **Instead of bad:** ashamed, embarrassed, guilty, rejected, jealous.

You will often feel more than one thing at once. Name each. "Frustrated and a bit scared" is accurate and useful.

## How to name it

Use a neutral, observing form:

- "Anger is here."
- "I notice frustration."
- "There is fear about the launch."

This phrasing treats the emotion as a visitor, not your whole identity. "I am angry" fuses you with it. "Anger is here" gives you a place to stand.

## The PLAN pause

Use this when you feel an emotion rising and you are about to act. It takes ten to sixty seconds.

**P: Pause.** Stop what you are doing. Hands still. Do not type, speak or send.

**L: Locate.** Find the emotion in your body. Where is it? Tight chest, hot face, clenched hands. Take one extended exhale, four in and six out.

**A: Acknowledge.** Name it precisely and neutrally. "Frustration is here. Some embarrassment too." Add, if it helps: "It makes sense to feel this."

**N: Next.** Ask one question: "What response would I be glad of tomorrow?" Then choose your next action. It may be to reply, wait, ask a question, take a walk or say nothing yet.

## An example

You receive a curt message from a colleague criticising your work in front of the team.

- **Pause:** hands off the keyboard.
- **Locate:** heat in the face, tight jaw. One slow exhale.
- **Acknowledge:** "Anger is here. Embarrassment too. That makes sense."
- **Next:** "What would I be glad of tomorrow?" You decide to reply privately, later, asking a clarifying question.

The anger is still there. It just is not driving.

## When PLAN is not enough

Some emotions are too intense for a sixty-second pause. That is normal. In those moments:

- **Step away** if you can. "Let me come back to you on this."
- **Move.** A short walk lets the body discharge some of the energy.
- **Delay decisions.** Strong emotion narrows thinking. Big choices can usually wait an hour.
- **Talk to someone you trust.**

If intense emotions are frequent, long-lasting or interfering with your life, talk to a qualified professional. That is a sign of strength, not failure.

## Common mistakes

- **Using names to argue.** "I am not angry, I am just right." Name first, judge later.
- **Rushing the pause.** PLAN works only if you actually stop.
- **Expecting the feeling to vanish.** Naming reduces grip; it does not erase emotion.

## Practise when it is easy

Run PLAN on small moments: a slow queue, a dropped glass, a delayed train. Small reps make the steps automatic for big moments.`,
        },
        {
          title: "Seven-Day Emotion Log",
          type: "ASSIGNMENT",
          minutes: 20,
          md: `${SAFETY}

Awareness grows through data. For seven days you will record emotional moments as they happen and look for your personal patterns.

## The practice

For **seven consecutive days**:

1. **Log two emotional moments a day.** One can be pleasant. At least one should be uncomfortable but manageable. Choose moments rated three to six out of ten for intensity, not the hardest moments of your week.
2. **Run the PLAN pause at least once a day** on a real moment.
3. **Keep your daily ten-minute sit going.**

## How to catch moments

- **Set two prompts,** such as late morning and early evening: "What did I feel in the last few hours?"
- **Write within an hour** of the moment if you can. Details fade fast.
- **Use your phone notes** or a small notebook. Keep it to two minutes per entry.

## What to record for each moment

Use these six fields:

1. **Situation:** what happened, in one line. Facts only. "Manager moved my deadline forward."
2. **Body:** where you felt it and how. "Tight chest, hot face."
3. **Thoughts:** what went through your mind. "They do not understand how much I am carrying."
4. **Urge:** what you wanted to do. "Reply sharply. Close the laptop."
5. **Name:** one or two precise emotion words, with intensity from 1 to 10. "Frustrated 6, overwhelmed 4."
6. **Action:** what you actually did, and whether you used PLAN. "Paused, exhaled, asked for priorities."

## Example entry

- **Situation:** friend cancelled dinner an hour before.
- **Body:** heavy chest, sigh.
- **Thoughts:** "I always make the effort."
- **Urge:** send a passive-aggressive reply.
- **Name:** disappointed 5, resentful 3.
- **Action:** PLAN. Replied "No problem, let us rebook." Felt lighter after ten minutes.

## Day seven review

After the seventh day, read your log in one sitting. Answer:

1. **Which emotion words appeared most often?**
2. **Which situations triggered the strongest reactions?** People, times of day, tasks?
3. **Where does emotion show up first in your body?** This is your early warning signal.
4. **What urges repeat?** These are your default reactions.
5. **When you used PLAN, what changed?** Compare your actions with and without it.

## Common mistakes

- **Only logging big events.** Mild moments are where patterns hide.
- **Writing a diary.** Stick to the six fields. Short and specific.
- **Judging the entries.** You are a researcher collecting data, not a critic grading yourself.
- **Choosing very painful memories.** This assignment is for everyday moments. If something heavy comes up, set it aside and consider speaking to a professional.

## Deliverable

Submit:

1. **Fourteen log entries** (two per day for seven days), each with all six fields.
2. **Your day-seven review**, answering all five questions.
3. **One personal rule** drawn from your patterns, written as an if-then. Example: "If I feel heat in my face during a meeting, then I exhale twice and ask a question before giving an opinion."

## Standard

At least ten complete entries and at least five PLAN uses. Your personal rule should come directly from your data, not from general advice.`,
        },
        {
          title: "Emotional Awareness — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: `${SAFETY}

Five questions on recognising and naming emotions. Pass to unlock Stress Management.`,
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "What are the three components of an emotion described in this module?",
                options: [
                  "Past, present and future",
                  "Body sensations, thoughts and urges",
                  "Triggers, rewards and habits",
                  "Positive, negative and neutral",
                ],
                correct: 1,
                why: "Emotions arrive as sensation, thought and urge together. Seeing the parts makes each one workable.",
              },
              {
                prompt: "Why is 'Anger is here' more useful than 'I am angry'?",
                options: [
                  "It is more polite",
                  "It denies the anger exists",
                  "It treats the emotion as something you observe rather than your whole identity",
                  "It makes the anger disappear",
                ],
                correct: 2,
                why: "Neutral naming creates a place to stand outside the emotion, which widens the gap between feeling and acting.",
              },
              {
                prompt: "What does the N in the PLAN pause stand for?",
                options: [
                  "Next: choose the response you would be glad of tomorrow",
                  "Never: refuse to feel the emotion",
                  "Notice: scan the room",
                  "Neutralise: suppress the feeling",
                ],
                correct: 0,
                why: "Pause, Locate, Acknowledge, Next. The final step is a deliberate choice of action guided by your values.",
              },
              {
                prompt: "Which statement about emotions matches this module?",
                options: [
                  "Negative emotions should be eliminated",
                  "Emotions are signals that can be accurate or out of date",
                  "Emotions should always be acted on immediately",
                  "Mindfulness removes emotions",
                ],
                correct: 1,
                why: "Emotions carry information. Awareness lets you check the signal before deciding whether to act on it.",
              },
              {
                prompt: "Which moments are best for practising emotional awareness at first?",
                options: [
                  "The most painful memories you have",
                  "Only moments of intense crisis",
                  "Small, everyday moments of mild intensity",
                  "Moments when you feel nothing",
                ],
                correct: 2,
                why: "Mild everyday moments are safe, frequent training reps. They build the skill for bigger moments.",
              },
            ],
          },
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────── 5
    {
      title: "Stress Management",
      description: "Understand how the stress response works, balance load with recovery, and build a personal protocol for hard days.",
      objectives: [
        "Explain the stress response and why it can help or harm.",
        "Map your current stressors into what you control, influence and must accept.",
        "Use in-the-moment and end-of-day tools to complete the stress cycle.",
        "Build and test a three-tier personal stress protocol.",
      ],
      completion: "Read both lessons, write and test a personal stress protocol for seven days, and pass the knowledge check.",
      lessons: [
        {
          title: "Stress Mechanics: Respond, Don't React",
          type: "READING",
          minutes: 7,
          md: `${SAFETY}

Stress is not the enemy. It is machinery. Machinery you can learn to operate instead of being operated by.

## What is actually happening

When you perceive a threat, your body fires an alarm. Heart rate rises. Breath gets shallow and fast. Muscles tense. Attention narrows to the problem. Long-term thinking goes quiet.

This response is excellent for physical danger. It is much less useful for a hard email, a deadline or an argument. The body cannot tell the difference between a predator and a performance review. It runs the same program.

The alarm itself is automatic. **What you do in the few seconds after it fires is not.** That gap is exactly what your daily practice has been training you to find.

## Helpful and harmful stress

Stress is not one thing.

- **Short, manageable stress** can sharpen focus and energy. A deadline that gets you moving. Nerves before a game.
- **Stress followed by recovery** is how you grow. Training works this way: load, then rest, then adaptation.
- **Stress without recovery** is the problem. When the alarm stays on for weeks, with no time to come down, it wears you out.

The goal is not zero stress. **The goal is to finish the cycle: load, then recovery.**

## Signs your alarm is stuck on

Notice these in yourself:

- Waking already tense, or lying awake with racing thoughts.
- Irritability over small things.
- Shallow breathing most of the day.
- Difficulty concentrating, or forgetting simple tasks.
- Relying more on caffeine, alcohol, sugar or scrolling to get through.

These are signals to add recovery, not to push harder. If they persist for weeks, speak to a health professional.

## The breath handle

Breath is the part of the alarm system you can directly influence. The extended exhale from Module 3 is your first tool: in for four, out for six, three to five rounds.

Use it before hard conversations, after bad news, or when you notice your form collapsing mid-task. It does not erase the stress. It gives you enough room to choose your next move.

## Name it to tame it

From Module 4: labelling the state in plain words reduces its grip. "Stress is here. This is pressure about the deadline." You move from being the stress to observing it. The rep from the cushion transfers.

## Respond, don't react

A **reaction** is the alarm choosing for you: snapping, avoiding, freezing, over-working.

A **response** is you choosing, with the alarm still running in the background.

The sequence is simple:

1. **Notice** the alarm. Body first: breath, jaw, shoulders.
2. **Breathe.** One to three extended exhales.
3. **Name** what is here.
4. **Choose** one small, useful next action.

You will not always manage it. Sometimes you will notice only after you have reacted. That is still progress. Noticing late is the step before noticing early.

## The standard

Feel everything; be commanded by nothing. Not suppression, which leaks. Recognition, a breath cycle, then a chosen response.

The next lesson moves from the moment to the bigger picture: what is loading you, and how to recover.`,
        },
        {
          title: "Load, Recovery and the Circle of Control",
          type: "READING",
          minutes: 8,
          md: `${SAFETY}

In-the-moment tools help you through a spike. Managing stress over weeks needs two more things: a clear view of what is loading you, and deliberate recovery.

## Step 1: List the load

Write down everything currently adding pressure. Be specific. "Work" is too vague. "Quarterly report due Friday" is useful.

Include:

- **Tasks and deadlines**
- **Relationships and conflicts**
- **Money worries**
- **Health concerns**
- **Uncertainty**, such as waiting for news
- **Small, constant irritants**, such as a noisy flat or a long commute

Most people find the list both longer and more manageable than expected. Long, because small items add up. Manageable, because they are now visible.

## Step 2: Sort with the circle of control

Draw three circles, one inside the other. Sort each item.

- **Control (inner circle):** things you can directly act on. Starting the report. Setting a boundary. Booking a check-up.
- **Influence (middle circle):** things you can affect but not decide. A colleague's behaviour. A team decision. Your partner's mood.
- **Accept (outer circle):** things you cannot change. The economy. The past. Someone else's choices.

## Step 3: Act by circle

Each circle needs a different response.

- **Control:** take one concrete next step. Make it small enough to do today. "Write the first paragraph" beats "do the report."
- **Influence:** decide on one action that increases your influence. A conversation, a request, a suggestion. Then let go of the outcome.
- **Accept:** practise letting it be. When your mind returns to it, note "out of my control" and bring attention back to what you are doing. This is the cushion rep, applied to worry.

Much stress comes from spending energy on the outer circle while the inner circle waits. Sorting redirects that energy.

## Step 4: Plan recovery

Stress is only half the cycle. Recovery completes it. Recovery means anything that genuinely lets the alarm switch off. Not just stopping work, but doing something that settles you.

Effective recovery tends to involve one of these:

- **Movement.** A brisk walk, a run, a gym session, dancing in the kitchen. Movement helps the body use the energy the alarm produced.
- **Connection.** Time with people you feel safe with. A real conversation, a hug, shared laughter.
- **Nature.** Time outside, especially among trees or near water.
- **Rest.** Doing nothing on purpose. Lying down without a screen.
- **Absorption.** An activity that holds full attention: cooking, music, a craft, a game.
- **Practice.** Your sit, a body scan or breathing practice.

Notice what is missing: scrolling rarely counts. It occupies attention without settling the body.

## Daily and weekly recovery

- **Daily:** at least one short recovery block, fifteen to thirty minutes, at the end of the working day. This closes the day's cycle.
- **Weekly:** at least one longer block, a few hours, with no work at all.

Put both in your calendar. Unscheduled recovery is usually the first thing to disappear.

## Common mistakes

- **Waiting until you are exhausted** to recover. Recover while you are still functioning.
- **Confusing numbing with recovery.** Alcohol, endless screens and overeating can feel like relief. They rarely leave you restored.
- **Trying to control the outer circle.** Rumination feels like problem-solving. It is not.

The assignment turns all of this into your personal protocol.`,
        },
        {
          title: "Build Your Personal Stress Protocol",
          type: "ASSIGNMENT",
          minutes: 25,
          md: `${SAFETY}

A protocol is a decision made in advance, so you do not have to decide under pressure. In this assignment you will write a three-tier stress protocol and test it for seven days.

## Part 1: Load map (thirty minutes, once)

1. List every current stressor, as specific as you can make it.
2. Sort each item into control, influence or accept.
3. For each **control** item, write one next step you can do in under thirty minutes.
4. For each **influence** item, write one action that increases your influence.
5. For each **accept** item, write a short phrase you will use when your mind returns to it. Example: "Not mine to fix. Back to now."

## Part 2: Write the three tiers

### Tier 1: In the moment (under one minute)

What you do when the alarm fires. Write your exact steps. Example:

1. Hands off the keyboard.
2. Three extended exhales, four in and six out.
3. Name it: "Stress is here, about ..."
4. Choose one small next action.

### Tier 2: End of day (fifteen to thirty minutes)

Your daily recovery block. Choose one or two activities from the recovery list in the previous lesson. Write when and where. Example: "18:30, twenty-minute walk without headphones, then ten minutes of reading."

Add a **shutdown ritual** to close work: write tomorrow's top three tasks, close all tabs, say "done for today." This signals that the day's load has ended.

### Tier 3: Hard week (one to three hours)

What you do when the week is heavy. This is your bigger reset. Example: "Saturday morning: two-hour hike with a friend, phone in bag. Cancel one optional commitment."

Also write **two warning signs** that tell you to activate Tier 3. Example: "Lying awake two nights in a row" or "snapping at people I care about."

## Part 3: Test for seven days

For **seven consecutive days**:

- Use **Tier 1** at least once a day, on a real moment.
- Complete **Tier 2** every day.
- Activate **Tier 3** if your warning signs appear, or once on the weekend as a trial.
- Take **one control step** from your load map each day.

Log each day in two minutes:

- Tier 1: situation and what happened.
- Tier 2: done or missed; stress level before and after, from 1 to 10.
- Control step: what you did.

## Common mistakes

- **Making the protocol too long.** If Tier 1 has eight steps, you will not use it under pressure. Keep it to four.
- **Skipping Tier 2 on busy days.** Busy days are when it matters most. Shorten it, do not drop it.
- **Using Tier 3 as a reward.** It is maintenance, not a prize for surviving.

## Deliverable

Submit:

1. **Your load map** with all three circles and next steps.
2. **Your written three-tier protocol**, including the shutdown ritual and two warning signs.
3. **Your seven-day log.**
4. **A revision**, three to five sentences: What worked? What did you change? What will your protocol look like going forward?

## Standard

At least five days of Tier 1 and Tier 2, and at least five control steps completed. The protocol should be specific enough that someone else could follow it.

If your stress feels unmanageable despite these tools, that is important information. Please speak to a qualified professional.`,
        },
        {
          title: "Stress Management — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: `${SAFETY}

Five questions on stress mechanics and recovery. Pass to unlock Sleep and Recovery.`,
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "According to this module, when does stress become a problem?",
                options: [
                  "Whenever you feel any pressure at all",
                  "When the alarm stays on without recovery",
                  "Only when it involves physical danger",
                  "When it improves your focus",
                ],
                correct: 1,
                why: "Short stress followed by recovery is normal and can be useful. Stress without recovery is what wears you down.",
              },
              {
                prompt: "Which item belongs in the 'influence' circle?",
                options: [
                  "Starting your own report",
                  "A team decision you can contribute to but not make alone",
                  "The weather tomorrow",
                  "Something that happened last year",
                ],
                correct: 1,
                why: "Influence covers things you can affect but not decide. You act to increase influence, then let go of the outcome.",
              },
              {
                prompt: "Which activity is least likely to count as genuine recovery?",
                options: [
                  "A brisk walk outside",
                  "A real conversation with a close friend",
                  "Two hours of scrolling social media",
                  "Cooking a meal with full attention",
                ],
                correct: 2,
                why: "Scrolling occupies attention without settling the body. Movement, connection, nature and absorption tend to restore.",
              },
              {
                prompt: "What is the correct order of the respond-don't-react sequence?",
                options: [
                  "Choose, breathe, notice, name",
                  "Notice, breathe, name, choose",
                  "Name, choose, notice, breathe",
                  "Breathe, choose, name, notice",
                ],
                correct: 1,
                why: "Notice the alarm, breathe to create room, name what is here, then choose a small, useful action.",
              },
              {
                prompt: "What is the purpose of a shutdown ritual at the end of the working day?",
                options: [
                  "To finish every remaining task",
                  "To signal that the day's load has ended so recovery can begin",
                  "To check email one last time",
                  "To plan the whole next week",
                ],
                correct: 1,
                why: "A short ritual such as listing tomorrow's top three tasks and closing tabs marks the end of load and the start of recovery.",
              },
            ],
          },
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────── 6
    {
      title: "Sleep and Recovery",
      description: "Understand the basics of sleep, build a wind-down routine, and run a seven-night experiment to improve your rest.",
      objectives: [
        "Explain the role of a consistent schedule, light and the wind-down period in sleep.",
        "Design a thirty-to-sixty-minute evening wind-down routine.",
        "Practise a guided body scan for settling before sleep.",
        "Run a seven-night sleep log and test one change.",
      ],
      completion: "Read both lessons, complete a seven-night sleep log with one tested change, and pass the knowledge check.",
      lessons: [
        {
          title: "How Sleep Works, in Plain Terms",
          type: "READING",
          minutes: 7,
          md: `${SAFETY}

Sleep is the base layer of every other pillar. Attention, mood, training and decision-making all rely on it. This lesson covers the basics you can act on. It is general education, not a treatment for sleep disorders.

## Two systems run your sleep

Think of sleep as controlled by two systems working together.

1. **Sleep pressure.** The longer you are awake, the more pressure builds to sleep. Sleeping releases it. Long naps late in the day can reduce the pressure you need at night.
2. **Your body clock.** An internal rhythm, roughly a day long, that tells your body when to be alert and when to wind down. Light is its main signal. Morning light tells it the day has started. Darkness in the evening tells it night is coming.

Good sleep happens when both systems agree: high pressure, and a clock that says it is night.

## The levers you control

### Consistent timing

Going to bed and getting up at roughly the same times every day, weekends included, keeps the body clock steady. Wake time is the most important anchor. Keep it within about an hour, even after a poor night.

### Light

- **Morning:** get outside light soon after waking. Ten to twenty minutes outdoors, even on a cloudy day, gives the clock a strong signal.
- **Evening:** dim the lights in the last hour or two before bed. Reduce bright screens, or at least lower their brightness.

### The wind-down

The mind does not switch off like a light. It needs a transition. A thirty-to-sixty-minute wind-down tells your system the day is ending. The next lesson covers how to build one.

### The bedroom

- **Dark:** blackout curtains or an eye mask.
- **Quiet:** earplugs or steady background noise if needed.
- **Cool:** a slightly cool room tends to suit sleep better than a warm one.
- **For sleep only:** where possible, avoid working or scrolling in bed so your brain links bed with rest.

### Stimulants and timing

- **Caffeine** can stay in your system for many hours. If sleep is a struggle, try keeping caffeine to the morning.
- **Alcohol** can make you drowsy but tends to disturb sleep later in the night.
- **Large meals** close to bedtime can make settling harder for some people.

## How much sleep

Needs vary between people. Public health guidance for most adults commonly sits around seven to nine hours. A better test is how you feel: do you wake reasonably refreshed and stay alert through the day without heavy reliance on caffeine?

## When you cannot sleep

Lying in bed awake and frustrated can teach your brain that bed is a place for worry. If you have been awake for what feels like a long while:

1. Get up and go to another dim room.
2. Do something quiet and calm: read a paper book, listen to soft music, do a body scan sitting in a chair.
3. Return to bed when you feel sleepy.

Do not check the clock repeatedly. Clock-watching tends to add pressure.

## When to seek help

Speak to a health professional if you regularly struggle to fall or stay asleep, if you snore loudly or stop breathing during sleep according to a partner, if you feel very sleepy during the day despite enough time in bed, or if poor sleep is affecting your mood or safety. These can have causes that need proper assessment.

## The takeaway

Anchor your wake time, use light deliberately, build a wind-down and make the bedroom for sleep. Small, consistent changes beat big, occasional efforts.`,
        },
        {
          title: "The Wind-Down and the Body Scan",
          type: "READING",
          minutes: 8,
          md: `${SAFETY}

You cannot force sleep. You can create the conditions for it. A wind-down routine and a body scan are two of the most practical tools you have.

## Building a wind-down routine

Your wind-down is the thirty to sixty minutes before you want to be asleep. It has three jobs: close the day, lower stimulation and settle the body.

### 1. Close the day (five minutes)

- Write tomorrow's top three tasks on paper. This moves them out of your head.
- Write down any worry that is circling, with one possible next step. Then close the notebook.

This is a version of the shutdown ritual from Module 5, moved to the evening.

### 2. Lower stimulation (twenty to forty minutes)

- Dim the lights.
- Put your phone on charge outside the bedroom if you can. If not, across the room.
- Choose calm activities: a paper book, gentle stretching, a warm shower, quiet music, light conversation.
- Avoid work email, news, intense shows and arguments.

### 3. Settle the body (ten minutes)

- Do a body scan (below), either in bed or sitting before bed.
- Or do five minutes of extended-exhale breathing: in for four, out for six. Stop if you feel dizzy.

### Keep it consistent

Start at the same time each night. The routine becomes a cue. After a few weeks, beginning it will start to make you sleepy on its own.

## The body scan: a guided practice

The body scan moves attention slowly through the body. It is not about relaxing on purpose. It is about noticing what is there. Often, noticing leads to settling.

**Time:** ten to fifteen minutes. **Position:** lying on your back, arms by your sides, or sitting.

1. **Arrive.** Close your eyes. Take three natural breaths. Feel the weight of your body on the bed.
2. **Feet.** Bring attention to your toes. Notice any sensation: warmth, coolness, tingling, pressure, or nothing at all. Nothing is fine. Stay for three breaths. Then the soles, the heels, the tops of the feet.
3. **Legs.** Move slowly to the ankles, shins and calves. Then the knees. Then the thighs. A few breaths at each area.
4. **Hips and lower back.** Notice the contact with the bed. Any tension or ease.
5. **Belly and chest.** Notice the breath moving here. Do not change it.
6. **Hands and arms.** Fingers, palms, wrists, forearms, elbows, upper arms.
7. **Shoulders and neck.** Common places for tension. If you find tightness, just notice it. If it softens on an out-breath, let it.
8. **Face and head.** Jaw, mouth, cheeks, eyes, forehead, scalp. Notice whether the jaw is clenched.
9. **Whole body.** Finally, feel the whole body at once, lying here, breathing.

## When the mind wanders during the scan

It will. When you notice, note it in one word ("planning") and return to the last body part you remember. No need to start over.

## If you fall asleep

Good. At bedtime, that is a fine outcome. If you want to practise the scan as a daytime skill, do it sitting up so you stay alert.

## Common mistakes

- **Trying to relax.** Effort to relax creates tension. Aim to notice, not to change.
- **Making the wind-down too ambitious.** A ninety-minute routine you skip is worse than a twenty-minute one you do.
- **Bringing the phone along.** Even a quick check can restart the mind.
- **Judging a bad night.** One poor night is normal. Keep the wake time steady and stay with the routine.

If you find that lying still with your attention on the body brings up distress, stop, open your eyes and sit up. Use a calm activity instead, and consider speaking to a professional.`,
        },
        {
          title: "Seven-Night Sleep Experiment",
          type: "ASSIGNMENT",
          minutes: 20,
          md: `${SAFETY}

General advice only goes so far. Your own data shows what works for you. For seven nights you will log your sleep and test one specific change.

## Before night one: choose your change

Pick **one** change from this list. Only one, so you can tell whether it helped.

- A fixed wake time every day, within thirty minutes, including the weekend.
- A thirty-minute wind-down with no screens.
- Phone charging outside the bedroom.
- Ten to twenty minutes of outdoor light within an hour of waking.
- No caffeine after midday.
- A body scan in bed every night.

Write your choice as a clear rule. Example: "Phone charges in the kitchen from 22:00. I read a paper book instead."

## Every night and morning

### In the evening (one minute)

Record:

- Time you started your wind-down.
- Time you got into bed.
- Your change: done or not done.
- Stress level from 1 to 10.

### In the morning (two minutes)

Within thirty minutes of getting up, record:

- Roughly what time you think you fell asleep. Estimate. Do not check the clock in the night.
- Wake time.
- Any long awakenings you remember.
- Sleep quality from 1 to 5.
- How rested you feel from 1 to 5.

### During the day (thirty seconds)

At mid-afternoon, record your energy from 1 to 5.

## Rules for the experiment

- **Keep the wake time steady** throughout, even if you choose a different change. It is the anchor that makes the data meaningful.
- **Estimate, do not track obsessively.** If sleep trackers make you anxious, do not use one. A rough log is enough.
- **Do not change several things at once.** You will not know what worked.
- **Be gentle with bad nights.** They happen. Log them and carry on.

## Day eight review

Read the full log in one sitting and answer:

1. How many nights did you keep your change?
2. On nights you kept it, how did sleep quality and next-day energy compare to nights you did not?
3. What else seemed to affect your sleep? Late meals, stress, alcohol, exercise?
4. Did your wind-down become easier to start by the end of the week?
5. Will you keep this change? What would you test next?

## Common mistakes

- **Choosing a change that is too big.** "No screens after 18:00" may not survive day two. Start with thirty minutes.
- **Logging from memory days later.** Record each morning while it is fresh.
- **Expecting a dramatic shift in a week.** You are looking for direction, not transformation.

## Deliverable

Submit:

1. **Your chosen change** written as a rule.
2. **A seven-night log** with evening, morning and afternoon entries.
3. **Your day-eight review**, answering all five questions.
4. **Your next experiment**, written as a rule, to run after this module.

## Standard

At least six complete nights and an honest review. If your log shows ongoing sleep difficulty, daytime sleepiness or distress, use the log to start a conversation with a health professional. It is useful information for them too.`,
        },
        {
          title: "Sleep and Recovery — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: `${SAFETY}

Five questions on sleep basics and the wind-down. Pass to unlock Daily Routines and Personal Reflection.`,
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "Which single anchor does this module say matters most for a steady body clock?",
                options: ["Bedtime on weekdays only", "A consistent wake time every day", "The length of afternoon naps", "Evening exercise"],
                correct: 1,
                why: "Keeping wake time steady, even after a poor night, is the strongest anchor for the body clock.",
              },
              {
                prompt: "How does light affect your body clock?",
                options: [
                  "Light has no effect on sleep",
                  "Morning light signals the day has started; evening darkness signals night is coming",
                  "Bright light in the evening helps you sleep",
                  "Only sunlight at noon matters",
                ],
                correct: 1,
                why: "Light is the body clock's main signal. Morning light and dimmer evenings help keep it on track.",
              },
              {
                prompt: "You have been lying awake and frustrated for what feels like a long time. What does this module suggest?",
                options: [
                  "Check the clock every few minutes",
                  "Stay in bed and try harder to sleep",
                  "Get up, do something calm in dim light, and return when sleepy",
                  "Start work early instead",
                ],
                correct: 2,
                why: "Leaving the bed avoids teaching the brain that bed is a place for worry. Return when sleepiness comes back.",
              },
              {
                prompt: "What is the aim of a body scan?",
                options: [
                  "To force every muscle to relax",
                  "To notice sensations in each part of the body without trying to change them",
                  "To find and diagnose physical problems",
                  "To stay awake as long as possible",
                ],
                correct: 1,
                why: "The body scan trains noticing. Settling often follows, but effort to relax tends to create tension.",
              },
              {
                prompt: "In the seven-night experiment, why do you change only one thing?",
                options: [
                  "Because more changes are not allowed",
                  "So you can tell whether that change made a difference",
                  "Because one change always fixes sleep",
                  "To make the log shorter",
                ],
                correct: 1,
                why: "Testing one variable at a time lets your own data show what works for you.",
              },
            ],
          },
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────── 7
    {
      title: "Daily Routines and Personal Reflection",
      description: "Design morning and evening bookends for your day, and use short, structured reflection to learn from your own experience.",
      objectives: [
        "Design a short morning routine and evening routine that bookend the day.",
        "Use a five-minute daily reflection with fixed prompts.",
        "Run a weekly review that turns observations into one concrete adjustment.",
        "Distinguish useful reflection from rumination.",
      ],
      completion: "Read both lessons, complete seven daily reflections and one weekly review, and pass the knowledge check.",
      lessons: [
        {
          title: "Bookends: Designing Your Morning and Evening",
          type: "READING",
          minutes: 8,
          md: `The middle of your day is often out of your control. The edges usually are not. A short morning routine and evening routine give the day a stable shape, whatever happens in between.

## Why bookends work

- **They reduce decisions.** When the first and last thirty minutes run on a set pattern, you save willpower for the day.
- **They anchor practice.** Your sit, your breath check, your reflection all need a home. Bookends provide it.
- **They create recovery.** Mornings set your direction. Evenings close the cycle.

## Principles for both

1. **Short beats long.** Twenty to forty minutes is plenty. A ninety-minute routine falls apart on the first busy day.
2. **Fixed order.** Same steps, same sequence. Order turns a list into a habit.
3. **Phone last in the morning, first out at night.** Delay checking messages after waking. Put the phone away before bed.
4. **A minimum version.** For busy days, decide a five-minute version in advance.

## Designing your morning

A good morning routine includes some of these elements. Pick three or four.

- **Water.** A glass of water soon after waking.
- **Light.** Ten minutes outside, or at least by a bright window.
- **Movement.** Five to fifteen minutes of stretching, a walk or a short workout.
- **Practice.** Your ten-minute sit.
- **Intention.** One line on paper: "Today matters most if I ..."

**Example (thirty minutes):**

1. Wake at a fixed time. Water.
2. Ten-minute walk outside.
3. Ten-minute sit.
4. Write one intention.
5. Then, and only then, check the phone.

**Minimum version (five minutes):** water, three minutes of breath, one intention.

## Designing your evening

An evening routine closes the day and prepares you for sleep. It overlaps with the wind-down from Module 6.

- **Shutdown.** List tomorrow's top three tasks and close work.
- **Tidy one space.** Five minutes. Desk, kitchen or bag ready for tomorrow.
- **Reflection.** Five minutes with the prompts in the next lesson.
- **Wind-down.** Dim lights, phone away, calm activity, body scan.

**Example (forty minutes):**

1. 21:30: shutdown list, close laptop.
2. Five-minute tidy.
3. Five-minute reflection.
4. Phone to the kitchen. Read for twenty minutes.
5. Lights out.

**Minimum version (five minutes):** top three for tomorrow, one reflection line, phone away.

## Bringing mindfulness into routine

Do each step as an informal practice, as you learned in Module 1. Feel the water. Notice the air on the walk. Hear the pen on paper. The routine becomes training, not just a checklist.

## Common mistakes

- **Copying someone else's routine.** Your life, schedule and energy are different. Design from your own constraints.
- **Adding too much at once.** Start with the morning. Add the evening after two weeks.
- **Abandoning it after one miss.** A routine is a default, not a test. Return the next day.
- **Making it rigid.** Travel, illness and family events will interrupt. Use the minimum version and get back on track.

## Your first draft

Before the next lesson, write a first draft of both routines:

1. Three to five steps each, in order.
2. Approximate time for each step.
3. A five-minute minimum version of each.

You will test and refine them in this module's assignment.`,
        },
        {
          title: "Reflection That Changes Something",
          type: "READING",
          minutes: 8,
          md: `Experience does not teach you on its own. Reflected-on experience does. This lesson gives you a short, structured way to look back on your day and week, and turn what you see into small changes.

## Reflection versus rumination

These can look similar. They are not.

- **Reflection** is structured, time-limited and pointed at learning. "What happened? What can I learn? What will I try?"
- **Rumination** is circular, open-ended and pointed at blame or worry. "Why does this always happen? What is wrong with me?"

A simple test: after reflection, you usually have a next step. After rumination, you usually have the same thought you started with, only heavier.

If you notice yourself looping, use the cushion move: note "ruminating," close the notebook, and return to the present with three breaths.

## The five-minute daily reflection

Do this in your evening routine, on paper or in a notes app. Use the same four prompts every day. Fixed prompts stop it turning into a sprawling diary.

1. **What went well today, and why?** One or two items. Include your part in it.
2. **What was hard today?** One item. Describe it as fact, not judgement.
3. **What did I notice?** One moment of awareness: an emotion named, a breath caught, a habit spotted.
4. **What will I do differently tomorrow?** One small, specific action.

Keep each answer to one or two sentences. Five minutes total. Stop when the timer ends.

**Example:**

1. Finished the proposal draft. I started it before checking email, which helped.
2. Snapped at my partner about the dishes.
3. Noticed heat in my face before I snapped, but did not pause.
4. Tomorrow: when I feel that heat, one exhale before I speak.

## Gratitude, done properly

A short gratitude note can add to your reflection. Make it specific. "Grateful for my family" is easy to write and easy to skim past. "Grateful my sister called to ask about my interview" brings back the actual moment. One specific line is enough.

## The weekly review

Once a week, take twenty to thirty minutes. Same day and time each week. Sunday evening or Friday afternoon work well.

1. **Read your daily reflections** for the week. Do not edit them.
2. **Look for patterns.** What went well more than once? What was hard more than once?
3. **Check your practices.** How many sits? How many routines kept? How was sleep?
4. **Notice one win.** Something you did that you want to keep.
5. **Choose one adjustment.** Just one. Make it specific and small. "Move my sit to before breakfast" rather than "meditate better."
6. **Schedule it.** Put the adjustment in your calendar or routine.

## Common mistakes

- **Writing too much.** Long entries become a chore and get skipped. Four short answers.
- **Only noting problems.** Wins teach you what to repeat. Always include what went well.
- **Choosing too many changes.** One adjustment a week compounds. Five adjustments a week collapse.
- **Harsh tone.** Write as a supportive coach would speak to a player. Honest, specific, on your side.

## The point

Reflection closes the loop. You practise, you notice, you adjust. Over weeks, those small adjustments add up to a life that fits you better.`,
        },
        {
          title: "Seven Days of Bookends and Reflection",
          type: "ASSIGNMENT",
          minutes: 25,
          md: `This assignment puts routines and reflection together. For seven days you will run your morning and evening bookends, reflect daily, and finish with a weekly review.

## Setup (before day one)

1. **Finalise your morning routine:** three to five steps, in order, with times. Write the five-minute minimum version.
2. **Finalise your evening routine:** three to five steps, including the five-minute daily reflection. Write the minimum version.
3. **Set your weekly review slot:** day seven, a fixed time, twenty to thirty minutes.
4. **Prepare materials:** a notebook or a single notes file. Put it where your evening routine happens.

## Daily practice

### Morning

- Run your routine in order.
- Delay your phone until the routine is complete.
- If time is short, use the minimum version. Never skip completely.

### Evening

- Run your routine in order.
- Complete the four reflection prompts:
  1. What went well today, and why?
  2. What was hard today?
  3. What did I notice?
  4. What will I do differently tomorrow?
- Add one specific gratitude line if you like.
- Stop after five minutes.

### Tracking

Mark each day:

- Morning routine: full, minimum or missed.
- Evening routine: full, minimum or missed.
- Reflection: done or missed.

## Day seven: weekly review

In your scheduled slot:

1. Read all seven reflections without editing.
2. Write the patterns you see: what went well repeatedly, what was hard repeatedly.
3. Count your routines and reflections.
4. Name one win you want to keep.
5. Choose **one** adjustment for next week. Make it small and specific.
6. Schedule it.

## What to do when it goes wrong

- **Overslept:** do the minimum morning version. Do not try to cram the full routine.
- **Late night out:** do the minimum evening version, even if it is only one reflection line.
- **Missed a whole day:** do not make it up. Restart the next day. Note it in your tracking.
- **Reflection turned into rumination:** close the notebook, take three breaths, and write only the fourth prompt.

## Common mistakes

- **Treating the routine as a performance.** Nobody is grading how it looks. It only has to work for you.
- **Changing the routine mid-week.** Run it as designed for seven days. Make changes in the weekly review.
- **Skipping the weekly review.** It is where learning turns into action. Protect the slot.

## Deliverable

Submit:

1. **Your written morning and evening routines**, with minimum versions.
2. **Your seven-day tracker.**
3. **Your seven daily reflections.** You may summarise or redact private details; keep the structure visible.
4. **Your weekly review**: patterns, counts, one win, one adjustment and when it is scheduled.
5. **A closing note**, three to five sentences: Which bookend was harder to keep? What does the minimum version teach you about consistency?

## Standard

At least five of seven days for each routine (full or minimum), at least five reflections, and a completed weekly review with one scheduled adjustment.`,
        },
        {
          title: "Daily Routines and Personal Reflection — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: "Five questions on routines and reflection. Pass to unlock Sustainable Wellness Habits.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "What is the main purpose of a five-minute minimum version of a routine?",
                options: [
                  "To replace the full routine permanently",
                  "To keep the habit alive on busy or disrupted days",
                  "To make the routine look more impressive",
                  "To use only on weekends",
                ],
                correct: 1,
                why: "A minimum version, decided in advance, keeps the chain going when the full routine is not possible.",
              },
              {
                prompt: "Which statement best describes the difference between reflection and rumination?",
                options: [
                  "Reflection is structured and leads to a next step; rumination loops without resolution",
                  "Rumination is more thorough than reflection",
                  "There is no meaningful difference",
                  "Reflection only focuses on problems",
                ],
                correct: 0,
                why: "Reflection is time-limited and aimed at learning. Rumination circles the same worry and usually leaves you heavier.",
              },
              {
                prompt: "Which is the strongest daily reflection prompt answer for 'What will I do differently tomorrow?'",
                options: [
                  "Be a better person",
                  "Try harder at everything",
                  "When I feel heat in my face, take one exhale before I speak",
                  "Stop having bad days",
                ],
                correct: 2,
                why: "A good answer is small, specific and actionable, so you can actually do it and check whether you did.",
              },
              {
                prompt: "How many adjustments should you choose in a weekly review?",
                options: ["As many as possible", "One", "Five", "None; just read the reflections"],
                correct: 1,
                why: "One small adjustment a week is sustainable and compounds over time. Many changes at once tend to collapse.",
              },
              {
                prompt: "Why does this module suggest delaying your phone in the morning?",
                options: [
                  "Phones are always harmful",
                  "So your routine sets the direction of the day before other people's demands do",
                  "To save battery",
                  "Because messages are never important",
                ],
                correct: 1,
                why: "Completing your routine first protects your intention and attention before the day's inputs arrive.",
              },
            ],
          },
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────── 8
    {
      title: "Sustainable Wellness Habits",
      description: "Design habits that last, recover quickly from lapses, and build a personal wellness plan you can keep for the long term.",
      objectives: [
        "Apply the cue, routine and reward loop to build new habits and weaken old ones.",
        "Design your environment so healthy choices are the easy default.",
        "Use a minimum dose and a restart rule to recover from lapses.",
        "Build a ninety-day personal wellness plan with scheduled reviews.",
      ],
      completion: "Read both lessons, submit a ninety-day wellness plan with its first two weeks tracked, and pass the knowledge check.",
      lessons: [
        {
          title: "Habit Architecture",
          type: "READING",
          minutes: 8,
          md: `Discipline gets you started. **Architecture keeps you going when discipline has a bad month.** Habits are how you make your standards automatic.

## The loop

Every habit runs the same circuit: **cue, routine, reward.** You have used this throughout the programme. The anchor for your sit was a cue. Designing behaviour means designing all three parts.

### Cue

Attach new habits to things that already happen with certainty. After waking. After brushing your teeth. After closing the laptop. Time and place beat intention every time.

Write each habit as an if-then plan: "After I [existing habit], I [new habit]."

### Routine

Shrink the entry step. "Sit for ten minutes" begins as "sit down on the cushion." "Go for a run" begins as "put on running shoes." Lower the effort to start until starting is easier than negotiating.

Once the entry step is automatic, the rest tends to follow. On hard days, the entry step alone keeps the habit alive.

### Reward

Make the reward immediate. Check the box. Watch the streak grow. Note how you feel after. TycoonHood's XP, streaks and ledger entries are engineered rewards: use them. The brain does not need the reward to be profound, only immediate.

## Environment design

You will not out-willpower an environment built against you. So build the environment.

**For habits you want:**

- **Make the cue visible.** Cushion in the middle of the room. Water bottle on the desk. Book on the pillow.
- **Make it easy.** Running kit laid out the night before. Healthy food at eye level in the fridge.
- **Reduce steps.** Every extra step between you and the habit is a chance to stop.

**For habits you want to weaken:**

- **Make the cue invisible.** Phone in another room. Snacks out of sight.
- **Make it inconvenient.** Log out of apps. Delete them from your home screen. Add steps.
- **Remove the reward.** Turn off notifications so checking gives you less.

## Stacking habits

Once one habit is solid, attach the next to it. "After my sit, I write one intention." "After my intention, I drink a glass of water." A chain of small habits becomes a routine.

Add one new link at a time. Wait until the last one feels automatic, usually a few weeks, before adding the next.

## Identity closes the loop

Each kept repetition is a vote for "I am the kind of person who ..." Someone who meditates. Someone who sleeps on time. Someone who pauses before reacting.

Votes compound. You do not need to believe the identity at the start. You build the evidence one rep at a time, and belief follows the evidence.

## Common mistakes

- **Starting too big.** Ambitious habits impress for a week and collapse in the second. Start small enough to be almost trivial.
- **Relying on motivation.** Motivation rises and falls. Architecture stays put.
- **Changing everything at once.** One new habit at a time. Two at most.
- **Vague habits.** "Be healthier" has no cue, no routine and no reward. "After lunch, walk for ten minutes" has all three.

## Applying it now

Pick one habit from this programme that has not yet stuck. Rewrite it:

1. The cue, as an if-then plan.
2. The smallest possible entry step.
3. The immediate reward.
4. One change to your environment that makes it easier.

You will use this design in the module assignment.`,
        },
        {
          title: "Lapses, Restarts and the Minimum Dose",
          type: "READING",
          minutes: 7,
          md: `Every habit will break at some point. Illness, travel, a new job, a family crisis. Sustainable wellness is not about never lapsing. It is about how quickly you return.

## Expect the lapse

Plan for disruption before it happens. People who expect lapses recover faster than people who are surprised by them. When you start any habit, assume you will miss days and decide now what you will do about it.

## The minimum dose

For each core habit, define the smallest version that still counts. You used this idea in Modules 2 and 7.

- **Meditation:** three breaths at the anchor.
- **Movement:** five minutes of walking.
- **Sleep:** keep the wake time steady, even if bedtime slips.
- **Reflection:** one line in the notebook.
- **Breath check-in:** one extended exhale.

The minimum dose keeps the cue and the identity alive. The habit stays connected to your day, even when the full version is impossible.

## The restart rule

The most important habit rule: **never miss twice in a row.**

Missing once is an accident. Missing twice starts a new pattern. When you miss a day, the next day's only goal is to do the minimum dose. Not to catch up. Not to double the session. Just to restart.

## Avoid the all-or-nothing trap

A common thought after a lapse: "I have broken my streak, so there is no point now." This turns one missed day into a lost month.

Counter it directly:

- **Streaks are records, not judges.** A broken streak means the record shows a gap. It says nothing about your worth.
- **Count total days, not only consecutive ones.** Twenty-four sessions in thirty days is strong practice, even with gaps.
- **Treat a lapse as data.** What caused it? A schedule change? Poor sleep? A cue that disappeared? Fix the cause.

## Self-talk after a lapse

How you speak to yourself after a miss affects how quickly you restart. Harsh self-criticism tends to lead to avoidance. A kinder, practical tone tends to lead to action.

Try this three-step script:

1. **Acknowledge:** "I missed three days. That happened."
2. **Normalise:** "Lapses are part of every habit. Everyone has them."
3. **Restart:** "Today I do the minimum dose. Three breaths after coffee."

This is the goodwill practice from Module 2, applied to yourself.

## Seasons, not straight lines

Your capacity changes over the year. A new baby, a big project or a hard winter may mean your full routine is not realistic for a while. That is not failure. It is a different season.

In a hard season:

- **Drop to minimum doses** for most habits.
- **Protect one keystone habit** at full strength. Often sleep or your daily sit.
- **Set a review date** to scale back up, rather than drifting.

## Common mistakes

- **Restarting too big.** After a lapse, doing the full routine plus extra feels heroic and burns you out. Restart small.
- **Waiting for a fresh start.** "I will begin again on Monday" gives the lapse four more days. Restart today.
- **Hiding the gap.** Log missed days honestly. The pattern of your lapses is useful information.

## The takeaway

Plan the lapse, define the minimum dose, never miss twice, and talk to yourself like a coach. That is what makes a habit last for years rather than weeks.`,
        },
        {
          title: "Your Ninety-Day Wellness Plan",
          type: "ASSIGNMENT",
          minutes: 30,
          md: `This final assignment pulls the whole programme together. You will design a ninety-day wellness plan, built from what has worked for you, and track the first two weeks.

## Part 1: Review your evidence (twenty minutes)

Look back through your logs from Modules 1 to 7. Answer briefly:

1. Which practices did you keep most consistently?
2. Which made the most noticeable difference to your attention, mood, stress or sleep?
3. Which did you struggle with, and why?
4. What were your most common lapse causes?

Base your plan on this evidence, not on what you think you should do.

## Part 2: Choose four keystone habits

Pick **four** habits, one from each area:

- **Attention:** for example, a daily ten-minute sit.
- **Emotion and stress:** for example, the PLAN pause or a daily recovery block.
- **Sleep and recovery:** for example, a fixed wake time or a screen-free wind-down.
- **Reflection:** for example, the five-minute evening reflection and a weekly review.

## Part 3: Design each habit

For each of the four, write:

1. **The cue**, as an if-then plan. "After I ..., I ..."
2. **The full version**, with duration.
3. **The minimum dose.**
4. **The reward**, made immediate.
5. **One environment change** that makes it easier.

Example:

- **Cue:** After I make my morning coffee, I sit.
- **Full:** ten-minute focused-attention sit.
- **Minimum:** three breaths at the cushion.
- **Reward:** check-in on the dashboard, watch the streak.
- **Environment:** cushion stays out by the window.

## Part 4: Set the rules and reviews

Write:

1. **Your restart rule**, for example, "Never miss twice. After a miss, minimum dose only."
2. **Your lapse script**, in three short lines: acknowledge, normalise, restart.
3. **Your review schedule:**
   - Weekly review: day and time.
   - Monthly check at day thirty and day sixty: twenty minutes to adjust one habit.
   - Final review at day ninety.
4. **Your hard-season plan:** which one keystone you protect at full strength if life gets heavy.
5. **Your support:** one person you will tell about this plan, and when you would speak to a health professional, for example if stress, mood or sleep problems persist despite these practices.

## Part 5: Run the first fourteen days

For **fourteen consecutive days**, track each of the four habits daily:

- Full, minimum or missed.

Complete your two weekly reviews. At each, choose one small adjustment.

## Common mistakes

- **Choosing aspirational habits** you have never practised. Choose habits your logs show you can do.
- **Skipping the minimum doses.** A plan without minimum doses breaks on the first hard week.
- **No review dates.** Plans without reviews drift. Schedule them now.

## Deliverable

Submit:

1. **Your evidence review** (Part 1).
2. **Your four designed habits** with all five elements each.
3. **Your rules, reviews, hard-season plan and support** (Part 4).
4. **Your fourteen-day tracker** and two weekly reviews.
5. **A closing reflection**, five to eight sentences: What has changed in how you notice your attention, emotions and stress since Module 1? What is the one practice you would keep if you could keep only one?

## Standard

All four habits fully designed, at least ten of fourteen days tracked, and both weekly reviews complete. The plan should be realistic enough that you would bet on yourself keeping it.`,
        },
        {
          title: "Sustainable Wellness Habits — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: "Five questions on habits and lapses. Pass to unlock the final assessment.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "What are the three parts of the habit loop?",
                options: ["Plan, act, review", "Cue, routine, reward", "Goal, effort, result", "Trigger, resist, relax"],
                correct: 1,
                why: "Every habit runs on a cue that starts it, a routine you do and a reward that reinforces it.",
              },
              {
                prompt: "Which is the best way to weaken a phone-checking habit?",
                options: [
                  "Rely on willpower alone",
                  "Keep the phone in another room and turn off notifications",
                  "Check it more often to get it out of your system",
                  "Promise yourself to stop",
                ],
                correct: 1,
                why: "Making the cue invisible and removing the reward changes the environment, which beats willpower.",
              },
              {
                prompt: "What does the restart rule say?",
                options: [
                  "Restart only at the beginning of a new week",
                  "Double the next session to make up for a miss",
                  "Never miss twice in a row; after a miss, do the minimum dose",
                  "Restart only once you feel motivated",
                ],
                correct: 2,
                why: "One miss is an accident; two starts a pattern. A minimum-dose restart the next day keeps the habit alive.",
              },
              {
                prompt: "You missed four days of meditation and think there is no point continuing. Which response fits this module?",
                options: [
                  "Quit and try again next year",
                  "Acknowledge it, normalise it, and do the minimum dose today",
                  "Meditate for an hour today to compensate",
                  "Criticise yourself so it does not happen again",
                ],
                correct: 1,
                why: "Lapses are normal. A kind, practical script and a small restart beat both quitting and over-correcting.",
              },
              {
                prompt: "During a hard season of life, what does this module recommend?",
                options: [
                  "Abandon all habits until things improve",
                  "Push every habit to full strength regardless",
                  "Drop most habits to minimum doses, protect one keystone and set a review date",
                  "Add more habits to stay busy",
                ],
                correct: 2,
                why: "Matching habits to your current capacity keeps them alive until you can scale back up.",
              },
            ],
          },
        },
      ],
    },
  ],

  finalAssessment: {
    passScore: 75,
    intro: "Twelve questions across all eight modules: foundations, meditation, breath, emotions, stress, sleep, routines and habits. Take your time. The practices you keep after today matter more than the score.",
    questions: [
      {
        prompt: "In this programme, what counts as one 'rep' of mindfulness?",
        options: [
          "A session with no wandering thoughts",
          "Noticing the mind has wandered and returning attention on purpose",
          "Ten minutes of complete calm",
          "Reading a lesson about meditation",
        ],
        correct: 1,
        why: "Each notice-and-return is the training event. Wandering is expected; the return is the skill.",
      },
      {
        prompt: "Which activity is an example of informal mindfulness practice?",
        options: [
          "A timed ten-minute sit",
          "Feeling the water and sounds fully while showering",
          "A weekly review",
          "Setting a phone reminder",
        ],
        correct: 1,
        why: "Informal practice brings full attention to ordinary daily activities without adding extra time.",
      },
      {
        prompt: "You feel harsh and resentful towards yourself after a bad week. Which meditation style fits best?",
        options: ["Focused attention", "Open awareness", "Goodwill practice", "No practice"],
        correct: 2,
        why: "Goodwill practice trains warm intention towards yourself and others, which directly counters harshness.",
      },
      {
        prompt: "Which response to restlessness during meditation is recommended?",
        options: [
          "Grip the breath harder",
          "Name it, feel where it lives in the body and count shorter sets of breaths",
          "Stand up and end the session immediately every time",
          "Breathe as fast as possible",
        ],
        correct: 1,
        why: "Naming, locating and simplifying the count works with restlessness instead of feeding it with effort.",
      },
      {
        prompt: "Which breathing practice is NOT taught in this programme because it is unsuitable for self-guided practice?",
        options: [
          "The extended exhale",
          "Equal breathing",
          "Long breath holds and deliberate hyperventilation",
          "Breathing with movement",
        ],
        correct: 2,
        why: "Breath holds and forced rapid breathing can cause dizziness or fainting. The programme uses only gentle, comfortable patterns.",
      },
      {
        prompt: "What should you do if you feel dizzy during any breathing practice?",
        options: [
          "Push through to the end of the count",
          "Stop and return to normal breathing",
          "Breathe more deeply",
          "Hold your breath to reset",
        ],
        correct: 1,
        why: "Dizziness usually means too much breathing. Stop, breathe normally and let it pass.",
      },
      {
        prompt: "Which pair lists two of the three components of an emotion?",
        options: [
          "Body sensations and urges",
          "Rewards and cues",
          "Sleep pressure and light",
          "Control and influence",
        ],
        correct: 0,
        why: "Emotions arrive as body sensations, thoughts and urges. Seeing the parts creates room to choose.",
      },
      {
        prompt: "What are the four steps of the PLAN pause?",
        options: [
          "Prepare, Listen, Act, Note",
          "Pause, Locate, Acknowledge, Next",
          "Push, Lift, Accept, Notice",
          "Plan, Learn, Adjust, Navigate",
        ],
        correct: 1,
        why: "Pause, Locate the emotion in the body, Acknowledge it by name, then choose the Next action.",
      },
      {
        prompt: "According to the Stress Management module, what completes the stress cycle?",
        options: [
          "Working harder until the problem is solved",
          "Deliberate recovery after load",
          "Avoiding all stressful situations",
          "Ignoring the stress response",
        ],
        correct: 1,
        why: "Stress is half the cycle. Recovery such as movement, connection, nature or rest lets the alarm switch off.",
      },
      {
        prompt: "Which change most directly supports a steady body clock?",
        options: [
          "Sleeping in late on weekends",
          "Keeping a consistent wake time and getting morning light",
          "Using bright screens in bed",
          "Having caffeine in the evening",
        ],
        correct: 1,
        why: "A steady wake time and morning light are the strongest signals for keeping the body clock on track.",
      },
      {
        prompt: "In a weekly review, what is the recommended outcome?",
        options: [
          "A long list of everything to fix",
          "One small, specific, scheduled adjustment",
          "A rewrite of all your routines",
          "A score for the week",
        ],
        correct: 1,
        why: "One adjustment a week is sustainable and compounds. Many changes at once tend to collapse.",
      },
      {
        prompt: "What is the purpose of a minimum dose for each habit?",
        options: [
          "To replace the full habit permanently",
          "To keep the cue and the habit alive on hard days so you can restart quickly",
          "To make habits look easier than they are",
          "To use only when you feel motivated",
        ],
        correct: 1,
        why: "The minimum dose keeps the habit connected to your day during disruption, which makes returning to the full version easier.",
      },
    ],
  },
};
