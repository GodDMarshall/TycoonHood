/**
 * ACADEMY CONTENT SEED — real curriculum for the four launch programs.
 * NOTE: This seed OWNS the curriculum pre-launch. It deletes and rebuilds
 * each course's modules (cascading lessons/quizzes) to stay deterministic,
 * then marks courses PUBLISHED. Do not run after real member progress
 * exists unless you mean to reset the curriculum.
 * Run: pnpm --filter @tycoonhood/db seed:academy
 */
import { prisma } from "./client";

type L = {
  title: string;
  type: "READING" | "ASSIGNMENT" | "QUIZ";
  xp?: number;
  preview?: boolean;
  md: string;
  quiz?: { passScore?: number; questions: { prompt: string; options: string[]; correct: number; why: string }[] };
};
type M = { title: string; description: string; lessons: L[] };

const curriculum: Record<string, M[]> = {
  warrior: [
    {
      title: "Foundations of Physical Discipline",
      description: "Why the body comes first, and the principles every program is built on.",
      lessons: [
        {
          title: "The Case for Training",
          type: "READING",
          preview: true,
          md: `Every pillar in Tycoonhood gets easier when the body is handled. Not because of aesthetics — because training is the cheapest place to practice the one skill underneath everything else: **doing the thing you said you would do, when you do not feel like it.**

A business setback takes months to resolve. A bad quarter in your portfolio takes a year to understand. A missed workout is resolved tomorrow at 6 a.m. The feedback loop is short, the stakes are honest, and nobody can do the reps for you.

## What "trained" means here

Not a physique standard. A capability standard:

- You can move your own bodyweight with control — push, pull, squat, hinge, carry.
- You can work hard for 30–45 minutes without your form or your focus collapsing.
- You train on a schedule that survives a bad week.

That third one is the real curriculum. The next lessons give you the principles and then a program. The program is simple on purpose — the discipline is the advanced part.`,
        },
        {
          title: "Progressive Overload, Explained Properly",
          type: "READING",
          md: `Muscles, tendons, and lungs adapt to what they are asked to do — then stop adapting when the ask stops growing. **Progressive overload** is the practice of growing the ask on purpose.

## The levers

You can progress by adding, in rough order of preference:

1. **Reps** — same weight, more repetitions with clean form.
2. **Load** — more weight once you own the rep range.
3. **Sets** — more total volume across the week.
4. **Density** — same work, less rest.
5. **Range or difficulty** — deeper positions, harder variations.

Move one lever at a time. Beginners try to move all five and stall by week three.

## The log is the program

If you do not record what you did, you cannot overload it — you can only repeat it. Every Warrior mission assumes a training log exists. A notes app is enough. What matters is that last session's numbers are in front of you when this session starts.

## Recovery is where the adaptation happens

Training is the stimulus; growth happens between sessions. Sleep short and eat carelessly and you are only collecting fatigue. Module two covers the floor you should not go below.`,
        },
        {
          title: "Build Your First Program",
          type: "ASSIGNMENT",
          xp: 75,
          md: `Time to produce something. Your assignment: **write your training program for the next four weeks** and put the first session on your calendar.

## Requirements

- **Three sessions per week**, 30–45 minutes each, on days you actually control.
- Each session covers a push, a pull, a squat or hinge, and a carry or core movement. Equipment is your choice — bodyweight versions count fully.
- For every movement: sets, target rep range, and where you will log it.
- One sentence at the top: *what you will do when you miss a session* (you will miss one — the plan for that is part of the program).

## Format

A page in your notes app or a single sheet of paper. If it takes more than 20 minutes to write, it is too complicated to survive.

When the in-app submission flow opens, you will attach this. Until then, completing this lesson is your word that the program exists and session one is scheduled. Your word is on the ledger now — act like it.`,
        },
      ],
    },
    {
      title: "Execution",
      description: "Recovery, tracking, and the knowledge check.",
      lessons: [
        {
          title: "Recovery: The Floor You Don't Go Below",
          type: "READING",
          md: `You do not need a biohacking stack. You need floors — minimums you protect even in a bad week.

## Sleep

**Floor: 7 hours, same wake time.** Sleep is when the nervous system consolidates what training asked for. One short night is noise; a short week erases the training effect and your judgment with it. Fix the wake time first — bedtime follows it.

## Food

**Floor: protein at every meal, mostly food you could have cooked.** Roughly a palm of protein per meal keeps recovery supplied without tracking anything. Hydrate before you caffeinate. Everything fancier than this is optimization, and optimization is earned by consistency, not read into existence.

## Stress

Hard training on top of a redlined life is how people get hurt. On brutal weeks, shrink the session — half the volume, same schedule. **Never trade the schedule to keep the intensity.** The schedule is the asset.

## The weekly review

Once a week, three questions in your log: Did I train the sessions I planned? Did I sleep the floor? What is the one adjustment for next week? Ninety seconds. This habit alone outperforms most coaching.`,
        },
        {
          title: "Tracking: Numbers Beat Memory",
          type: "READING",
          md: `Your memory of last week's training is a story. Your log is a record. Tycoonhood is built on records.

## What to write down

Per session, this is enough:

- Date, movements, **sets × reps × load** (or variation for bodyweight)
- One word for how it felt: easy / right / heavy
- Anything that hurt — location and movement

## Reading your own data

Every two weeks, scan for three signals:

1. **Flat numbers for 3+ sessions** → move one overload lever (reps first).
2. **"Heavy" appearing everywhere** → check the sleep floor before blaming the program.
3. **The same pain note twice** → swap the movement for a variation and note it. Pain that repeats is information, not weakness.

## Why this matters beyond the gym

This is the same loop you will run in Builder (metrics beat vibes) and Tycoon (statements beat feelings). You are not learning to track workouts. You are learning to trust records over impressions — with the lowest-stakes data you will ever handle.`,
        },
        {
          title: "Warrior Foundations — Knowledge Check",
          type: "QUIZ",
          md: "Five minutes. Passing this completes the module — the log and the program are the real test.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "What is progressive overload?",
                options: [
                  "Training to failure in every session",
                  "Deliberately increasing the demand on the body over time, one lever at a time",
                  "Changing your program every week to keep muscles confused",
                  "Adding load and reps and sets simultaneously for faster results",
                ],
                correct: 1,
                why: "Adaptation follows a growing demand. One lever at a time keeps the growth measurable and sustainable.",
              },
              {
                prompt: "You had a brutal work week and feel wrecked. The Warrior move is:",
                options: [
                  "Skip training until life calms down",
                  "Keep the schedule, shrink the session",
                  "Double the intensity to burn off stress",
                  "Replace training with extra sleep for the whole week",
                ],
                correct: 1,
                why: "The schedule is the asset. Volume can flex; the habit of showing up cannot.",
              },
              {
                prompt: "Why does the log matter more than motivation?",
                options: [
                  "Coaches require it",
                  "You cannot overload what you did not record — memory tells stories, records tell truth",
                  "Logging burns additional calories",
                  "It does not; motivation is the real driver",
                ],
                correct: 1,
                why: "Overload requires knowing exactly what last session was. The log is the program.",
              },
              {
                prompt: "The recovery 'floors' are:",
                options: [
                  "8 hours sleep, zero sugar, ice baths",
                  "7 hours sleep with a fixed wake time, protein at every meal, shrink sessions on redlined weeks",
                  "Supplements, massage, and a rest month per quarter",
                  "There are no floors; more training always wins",
                ],
                correct: 1,
                why: "Floors are minimums that survive bad weeks. Everything beyond them is optimization you earn with consistency.",
              },
            ],
          },
        },
      ],
    },
  ],

  "business-mastery": [
    {
      title: "Value Creation",
      description: "What an offer actually is, and how to find out if anyone wants yours.",
      lessons: [
        {
          title: "An Offer Is a Promise With a Price",
          type: "READING",
          preview: true,
          md: `Businesses do not sell products. They sell **outcomes someone already wants**, packaged as a promise with a price on it.

## The offer equation

A workable offer answers four questions in one sentence:

- **Who** is it for — specific enough that they recognize themselves.
- **What outcome** do they get — in their words, not yours.
- **How long / how** — the mechanism that makes the promise believable.
- **What it costs** — money, and also time and effort.

"I help new freelance designers land their first three paying clients in 60 days through a portfolio-and-outreach system" is an offer. "I do branding" is a hobby with an invoice.

## Start with a bleeding neck, not a mild itch

People pay fastest for problems that are urgent, expensive, or embarrassing. Rank your ideas by how much the problem already costs the customer — in money, hours, or sleep. If nobody is currently paying anything (money *or* painful effort) to solve it, treat that as a red flag, not an untapped market.

The next lesson is where most people flinch: talking to the humans you intend to serve, before building anything.`,
        },
        {
          title: "Customer Conversations That Don't Lie to You",
          type: "READING",
          md: `The cheapest way to test an offer is a conversation — done correctly. Done wrong, conversations manufacture false confidence, because people are polite.

## The rules

1. **Talk about their life, not your idea.** The moment you pitch, they start managing your feelings.
2. **Past behavior over future promises.** "Would you buy this?" is worthless. "What did you do the last time this problem hit?" is gold.
3. **Follow the money and the workarounds.** What have they already paid, cobbled together, or wasted hours on? That is the real demand signal.
4. **Ask for something at the end.** Time, an intro, a pre-order. A polite "sounds cool" that costs them nothing *is* your answer.

## A five-question script

- When did this problem last come up?
- Walk me through what you did about it.
- What have you tried or paid for before?
- What would a solved version look like?
- If I built that, what would make it a no-brainer — and can I show you when it exists?

## The quota

Five real conversations before you build anything. Uncomfortable is the point — discomfort now is cheaper than three months building something nobody wanted.`,
        },
        {
          title: "Define Your Offer",
          type: "ASSIGNMENT",
          xp: 75,
          md: `Produce the sentence. Your assignment: **write your offer in the four-part format and identify five people to have the conversation with.**

## Deliverable

One page:

1. The offer sentence: *I help [who] get [outcome] in [timeframe] through [mechanism], for [price].*
2. The bleeding-neck justification: two sentences on what this problem already costs them.
3. Five named people or specific places you can reach them (a subreddit thread counts; "social media" does not).
4. Your opening message to the first one — three sentences, zero pitch.

## Standard

If a stranger reads your offer sentence and cannot tell who it is for and what they get, rewrite it. Vague offers feel safe because they cannot be rejected — they also cannot be bought.

Completing this lesson is your commitment that the page exists and message one is sent this week. The Launch Week challenge will assume you have done this.`,
        },
      ],
    },
    {
      title: "Selling",
      description: "Positioning, pricing, first customers — and the knowledge check.",
      lessons: [
        {
          title: "Positioning and Pricing Without Apologizing",
          type: "READING",
          md: `Positioning is choosing the comparison. Pricing is charging for the outcome. Most beginners fumble both by trying to be *for everyone* and *cheap*.

## Positioning: pick your shelf

Customers understand new things by comparison. Decide what you are an alternative TO, and be pointed about the difference: "Unlike [the default they use now], this [specific difference that matters to them]." Narrow feels scary; narrow is what makes word-of-mouth possible, because your customer can repeat it.

## Pricing: anchor to the problem, not your hours

Price against what the problem costs and what the outcome is worth — never against your time or your self-esteem. Three practical rules:

1. **Never be the cheapest.** The cheapest option attracts the customers who cost the most.
2. **Offer one price first.** Menus come later; conviction sells now.
3. **Raise prices when yes comes too easily.** A 100% close rate is not a compliment — it is money left on the table.

## The apology tax

Discounting preemptively, burying the price, over-explaining — customers read all of it as doubt. State the price like you state your name. Then be quiet. Silence after a price is not rudeness; it is respect for their decision.`,
        },
        {
          title: "The First Ten Customers Are Manual",
          type: "READING",
          md: `Nothing about your first ten customers scales, and that is fine — they are not revenue, they are **research that pays you.**

## Where they come from

In order of conversion, highest first:

1. **People you already helped for free** — convert the goodwill.
2. **Warm intros** — one sentence to ask: "Who do you know dealing with [problem]?"
3. **Places where the problem is discussed** — forums, groups, comment sections. Be the most useful person in the thread for two weeks before you ever mention the offer.
4. Cold outreach — works, but only after the first three taught you the language customers use.

## The manual playbook

- Deliver the first ones personally, even at absurd effort. You are buying the fastest learning available.
- After every delivery, ask: *what almost stopped you from buying?* That sentence is your next landing page.
- Get a specific, resultful testimonial: numbers, timeframe, their words.
- Write down every step you took. That document becomes your process, your onboarding, and eventually your product.

Ten customers, handled this way, teach you more than any course — including this one. Go get the first.`,
        },
        {
          title: "Business Foundations — Knowledge Check",
          type: "QUIZ",
          md: "The check is quick. The five conversations are the real exam.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "Which of these is a complete offer?",
                options: [
                  "\"I do social media marketing\"",
                  "\"I help local gyms fill 20 trial memberships in 30 days with a referral system, for a flat $1,500\"",
                  "\"High-quality consulting services for businesses of all sizes\"",
                  "\"DM me for prices\"",
                ],
                correct: 1,
                why: "Who, outcome, mechanism, timeframe, price — all present. The others cannot be evaluated, so they cannot be bought.",
              },
              {
                prompt: "In customer conversations, the highest-signal question is about:",
                options: [
                  "Whether they would hypothetically buy your idea",
                  "What they actually did and paid the last time the problem occurred",
                  "How much they like your branding",
                  "Their five-year vision",
                ],
                correct: 1,
                why: "Past behavior is evidence; future promises are politeness.",
              },
              {
                prompt: "Why should you not be the cheapest option?",
                options: [
                  "It is illegal in most markets",
                  "The cheapest option attracts the most demanding, least loyal customers and anchors you as low-value",
                  "Premium fonts cost more",
                  "You should always be the cheapest to win volume",
                ],
                correct: 1,
                why: "Price is positioning. The bottom of the market is the most expensive place to operate.",
              },
              {
                prompt: "Your first ten customers are primarily:",
                options: [
                  "Proof you can quit your job",
                  "Paid research: the fastest source of language, process, and testimonials you will ever have",
                  "A distraction from building the product",
                  "Best acquired through paid ads at scale",
                ],
                correct: 1,
                why: "Manual, unscalable delivery to ten real customers produces the playbook everything else is built from.",
              },
            ],
          },
        },
      ],
    },
  ],

  "financial-planning-investment-advisory": [
    {
      title: "Command Your Cashflow",
      description: "See the money clearly, build the buffer, order the debts. Education only — not personalized advice.",
      lessons: [
        {
          title: "You Cannot Allocate What You Cannot See",
          type: "READING",
          preview: true,
          md: `Every sophisticated financial strategy sits on one boring foundation: **knowing your numbers.** Most people optimize investments they cannot fund because they never measured the leak.

*Everything in this program is education about how these things generally work — it is not advice about your specific situation, and Tycoonhood does not tell you what to buy.*

## Three numbers, monthly

1. **In** — everything that arrived after tax.
2. **Out** — everything that left, in five buckets at most: housing, food, transport, obligations, life.
3. **Kept** — In minus Out. This is your savings rate, the single number most predictive of your financial trajectory. Not your income. Not your returns. **The rate at which you keep.**

## The 30-day ledger

For one month, record every unit of money that moves — an app, a spreadsheet, or paper; the tool is irrelevant, the habit is everything. This is the 1% Ledger challenge, and it is the Tycoon pillar's version of the training log: records over impressions.

People consistently discover 10–20% of spending they do not remember choosing. That discovered money is what funds everything in the next two lessons — no raise required.`,
        },
        {
          title: "The Buffer and the Debt Order",
          type: "READING",
          md: `Before growth comes **shock absorption**. Without it, every surprise becomes debt and every plan gets interrupted.

## The buffer

An emergency fund is boring cash for a non-boring day: commonly discussed targets are a starter buffer of about one month of essential expenses, growing toward 3–6 months over time. It lives somewhere instantly accessible and deliberately unexciting. Its job is not returns — its job is that the car repair, the gap between clients, the emergency flight, do not touch your debt or your investments.

## Ordering debts

Widely used frameworks order debt payoff two ways:

- **By interest rate (avalanche):** mathematically cheapest — highest rate first, minimums on the rest.
- **By balance (snowball):** psychologically fastest — smallest balance first, momentum from quick wins.

High-interest consumer debt (the kind carrying double-digit rates) is generally treated in both frameworks as the emergency it is, because few investments reliably outrun it after tax.

## The order of operations, generally

Minimum payments always → starter buffer → attack high-interest debt → full buffer → then investing (next module). Which framework and thresholds fit *you* depends on your situation — that judgment is yours, or yours and a licensed professional's.`,
        },
        {
          title: "Write Your Allocation Plan",
          type: "ASSIGNMENT",
          xp: 75,
          md: `Turn the numbers into a standing decision. Your assignment: **a one-page allocation plan for what happens to money the moment it arrives.**

## Deliverable

1. Your three numbers from last month: In, Out, Kept (estimate if your 30-day ledger is still running).
2. A percentage split for every unit of future income — for example: essentials %, buffer %, debt %, investing %, life %. Your percentages, your call.
3. Your buffer target and your current distance from it.
4. Your debt list ordered by whichever framework you chose, with one sentence on why that framework fits you.
5. The automation step: what transfer you will set up so the split happens without a monthly decision.

## Standard

The test of an allocation plan is that money arriving requires **zero decisions**. If your plan needs willpower every payday, it is a wish. This document is also exactly what the 1% Ledger challenge asks you to submit — write it once, use it twice.`,
        },
      ],
    },
    {
      title: "Investing Literacy",
      description: "Asset classes, risk, costs, and time — how the machinery works. The knowledge check closes the program.",
      lessons: [
        {
          title: "The Asset Classes and What Risk Actually Is",
          type: "READING",
          md: `Investing vocabulary, minus the mystique. *Education about how these instruments generally work — not a recommendation of any of them.*

## The major classes

- **Cash & equivalents** — stable, liquid, quietly eroded by inflation. Buffer material, not growth material.
- **Bonds** — loans to governments or companies; steadier payments, lower long-run growth, prices move when interest rates move.
- **Equities (stocks)** — ownership slices of businesses; historically the strongest long-run growth, with stomach-testing swings along the way.
- **Real assets** — property, commodities; behave differently from paper assets, often involve leverage or upkeep.
- **Speculative assets** — crypto and friends; enormous dispersion of outcomes. Position sizing is the entire conversation.

## Risk is not "chance of losing money"

Risk is **the range of outcomes and whether you can hold through the bad part of the range.** Volatility only becomes permanent loss when you are forced to sell — by fear, or by needing the money too soon. This is why the buffer precedes investing: it buys the ability to not sell.

## Diversification

Owning many uncorrelated things means no single failure decides your outcome. It is the one widely-agreed "free lunch" in finance — and the next lesson explains why costs and time matter even more than picking.`,
        },
        {
          title: "Costs, Time, and the Discipline of Boring",
          type: "READING",
          md: `Three forces decide most long-run outcomes, and none of them involve being clever.

## Costs compound against you

A 1% annual fee sounds trivial and quietly consumes a fifth or more of a multi-decade outcome. Every layer — fund fees, transaction costs, taxes from frequent trading — is a permanent headwind. The professionals guard basis points; that habit is free to copy.

## Time is the engine

Compounding is growth on top of growth, and its results are absurdly back-loaded — the last decade of a long horizon typically produces more than all the early ones combined. Two consequences: starting earlier beats starting bigger, and interrupting the compounding (selling in fear, "taking a break") is far more expensive than it feels in the moment.

## The behavior gap

Study after study finds investors underperform the very funds they hold — by buying excitement and selling fear. The gap between the investment's return and the investor's return is pure behavior. Boring, automatic, rules-based investing exists to close that gap: the plan you wrote last lesson, executed without commentary.

## Where advice belongs

What mix fits your goals, taxes, and jurisdiction is a personal question. Licensed professionals exist for exactly that conversation. Tycoonhood's job ends at making sure nobody can sell you nonsense — which, if you have read this far, they no longer can.`,
        },
        {
          title: "Tycoon Foundations — Knowledge Check",
          type: "QUIZ",
          md: "Vocabulary check. The 30-day ledger and the allocation plan are the real graduation.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "The single most predictive number for your financial trajectory is:",
                options: ["Your income", "Your investment returns", "Your savings rate — the share of income you keep", "Your credit score"],
                correct: 2,
                why: "Income and returns matter, but the keep-rate is the lever you control most directly and it funds everything else.",
              },
              {
                prompt: "The emergency buffer exists primarily to:",
                options: [
                  "Earn returns while staying safe",
                  "Absorb shocks so surprises never touch your debt or interrupt your investments",
                  "Impress lenders",
                  "Be invested once markets look favorable",
                ],
                correct: 1,
                why: "Its job is optionality, not yield — it buys the ability to never sell at the worst moment.",
              },
              {
                prompt: "Investment risk is best understood as:",
                options: [
                  "The chance an asset ever goes down",
                  "The range of possible outcomes and whether you can hold through the bad part",
                  "Anything not guaranteed by a government",
                  "Volatility, which must be avoided entirely",
                ],
                correct: 1,
                why: "Volatility becomes loss only when you are forced or frightened into selling — which planning exists to prevent.",
              },
              {
                prompt: "Why do costs matter so much in long-run investing?",
                options: [
                  "They do not, if returns are high",
                  "Fees and trading costs compound against you and can consume a large share of a multi-decade outcome",
                  "They are only relevant to professionals",
                  "Higher-fee products reliably outperform to compensate",
                ],
                correct: 1,
                why: "A small annual drag, compounded over decades, is one of the largest controllable factors in the final result.",
              },
            ],
          },
        },
      ],
    },
  ],

  "mindfulness-wellness": [
    {
      title: "Attention Is the Asset",
      description: "What attention training actually is, and a practice that fits in ten minutes.",
      lessons: [
        {
          title: "Why the Mind Comes Last in the List and First in Importance",
          type: "READING",
          preview: true,
          md: `Warrior gives you discipline. Builder gives you leverage. Tycoon gives you resources. **Mind decides whether any of it is usable under pressure.**

## Attention is trainable, and mostly untrained

Every skill in the other pillars is downstream of the ability to place attention where you choose and keep it there — through boredom, discomfort, and the phone lighting up. Modern life is a machine for fragmenting exactly that ability, and it works: most people cannot hold one object of attention for two unbroken minutes.

The good news is symmetrical: attention responds to training like a muscle responds to load. The practice is ancient, secular in this program, and embarrassingly simple. Simple is not easy — which is precisely what makes it training.

## What this module is not

Not mysticism, not therapy, not a productivity hack with incense. Mindfulness here means one thing: **noticing where attention is, and returning it on purpose.** Each return is one rep. The next lesson gives you the ten-minute protocol; the assignment makes it a daily fact your streak can verify.`,
        },
        {
          title: "The Ten-Minute Protocol",
          type: "READING",
          md: `One practice, done daily, beats five practices done occasionally. This is the one.

## The sit

1. **Sit** anywhere your back can be straight without strain. Timer: ten minutes. Eyes closed or lowered.
2. **Find the breath** wherever it is most obvious — nostrils, chest, belly. You are not controlling it; you are watching it.
3. **Count** breaths one to ten, then start over.
4. **You will vanish into thought.** Planning, replaying, narrating. This is not failure — noticing you left and returning to one *is the rep.* A session with forty returns is a strong session, not a scattered one.
5. At the timer, one slower breath, then get up. No evaluation. Sessions are logged, not graded.

## The three rules

- **Same time daily** — attach it to an anchor that already happens (after waking, after brushing, after training).
- **Never negotiate the ten minutes down mid-week.** On a truly wrecked day, three breaths at the anchor keeps the chain alive — but decide that *before* the day, not during it.
- **Track it.** The daily check-in mission exists for exactly this. The streak is the training log of the mind.`,
        },
        {
          title: "Thirty Days on the Cushion",
          type: "ASSIGNMENT",
          xp: 75,
          md: `The assignment is the practice itself. **Ten minutes daily for the next thirty days**, anchored and tracked.

## Deliverable

1. Your anchor, written as an if-then: *After I [existing habit], I sit for ten minutes.*
2. Your fallback rule for wrecked days, decided now.
3. Daily check-ins — the mission on your dashboard is the log. The streak counter is your evidence.
4. At day thirty: three sentences on what changed in how you notice distraction *off* the cushion. That transfer — noticing sooner in conversations, work, training — is the entire point of the practice.

## Standard

Thirty days is long enough for the skill to show up in ordinary life and short enough to be non-negotiable. Miss a day? The record shows it and the next day continues the work. The ledger does not do guilt, and neither does this program — it does records.

Module two covers what to do with the equanimity you are building: stress mechanics and the architecture of habit.`,
        },
      ],
    },
    {
      title: "Emotional Discipline",
      description: "The stress response, the habit loop, and the knowledge check.",
      lessons: [
        {
          title: "Stress Mechanics: Respond, Don't React",
          type: "READING",
          md: `Stress is not the enemy — it is machinery. Machinery you can learn to operate instead of being operated by.

## What is actually happening

A perceived threat fires the alarm system: heart rate up, breath shallow, attention narrowed, long-term thinking offline. Brilliant for physical danger; catastrophic for emails. The response is automatic. **What you do in the two seconds after it fires is not** — and that gap is exactly what the cushion has been training you to find.

## The physiological handle

Breath is the one lever of the alarm system under direct voluntary control. The extended exhale — in for four, out for six to eight, three rounds — mechanically signals the system to stand down. It is not a metaphor; it is a switch. Use it before hard conversations, after bad news, mid-training when form is collapsing.

## Name it to tame it

Labeling the state in plain words — "anger is here," "this is fear about the launch" — measurably reduces its grip. You are moving from *being* the emotion to *observing* it, the same move as noticing a thought on the cushion. The rep transfers.

## The standard

Feel everything; be commanded by nothing. Not suppression — suppression leaks. Recognition, one breath cycle, then a chosen response. That gap is what the next lesson builds habits inside of.`,
        },
        {
          title: "Habit Architecture",
          type: "READING",
          md: `Discipline gets you started; **architecture keeps you going when discipline has a bad month.** Habits are how you make your standards automatic.

## The loop

Every habit runs the same circuit: **cue → routine → reward.** You already used this in the Ten-Minute Protocol — the anchor was a cue. Designing behavior means designing all three:

- **Cue:** attach new habits to existing certainties (after waking, after training, after closing the laptop). Time-and-place beats intention every time.
- **Routine:** shrink the entry. "Sit for ten minutes" begins as "sit down on the cushion." Lower the activation energy until starting is easier than negotiating.
- **Reward:** check the box. Tycoonhood's XP, streaks, and ledger entries are engineered rewards — use them shamelessly. The brain does not require the reward to be profound, only immediate.

## Breaking bad loops

Reverse the design: make the cue invisible (phone in another room), the routine inconvenient (log out, delete the app), the reward absent. You will not out-willpower an environment built against you — so build the environment.

## Identity closes the loop

Each kept repetition is a vote for "I am the kind of person who —." Votes compound exactly like capital. Every pillar in this house is, underneath, the same practice: casting the vote on the days it is hardest to cast. The knowledge check is next; the real exam is tomorrow morning.`,
        },
        {
          title: "Mind Foundations — Knowledge Check",
          type: "QUIZ",
          md: "The check takes five minutes. The streak takes thirty days. Both count.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "In attention training, noticing your mind has wandered and returning to the breath is:",
                options: [
                  "A failure to be minimized",
                  "The rep — the exact event that trains the skill",
                  "A sign meditation is not for you",
                  "Only acceptable in the first week",
                ],
                correct: 1,
                why: "The return is the training. A session with many noticed returns is a strong session.",
              },
              {
                prompt: "The one lever of the stress response under direct voluntary control is:",
                options: ["Heart rate", "The breath — especially the extended exhale", "Adrenaline", "Skin temperature"],
                correct: 1,
                why: "Extended exhalation mechanically down-regulates the alarm system, which is why it works mid-stress.",
              },
              {
                prompt: "\"Name it to tame it\" works because labeling an emotion:",
                options: [
                  "Suppresses it",
                  "Shifts you from being the emotion to observing it, reducing its grip",
                  "Makes it someone else's fault",
                  "Is a polite thing to say",
                ],
                correct: 1,
                why: "It is the cushion's core move — observation instead of identification — applied off the cushion.",
              },
              {
                prompt: "To make a new habit stick, the highest-leverage design move is:",
                options: [
                  "Rely on motivation and remind yourself it matters",
                  "Attach it to an existing certain cue and shrink the entry step",
                  "Start with the maximum version to prove commitment",
                  "Keep it secret so no one pressures you",
                ],
                correct: 1,
                why: "Cue design plus low activation energy beats willpower — architecture over discipline.",
              },
            ],
          },
        },
      ],
    },
  ],
};

async function main() {
  for (const [slug, modules] of Object.entries(curriculum)) {
    const course = await prisma.course.findUnique({ where: { slug } });
    if (!course) {
      console.warn(`skip ${slug} — course missing (run db:seed first)`);
      continue;
    }
    // Deterministic rebuild (pre-launch: seed owns curriculum)
    await prisma.courseModule.deleteMany({ where: { courseId: course.id } });

    for (const [mi, m] of modules.entries()) {
      const mod = await prisma.courseModule.create({
        data: { courseId: course.id, title: m.title, description: m.description, sortOrder: mi },
      });
      for (const [li, l] of m.lessons.entries()) {
        const lesson = await prisma.lesson.create({
          data: {
            moduleId: mod.id,
            title: l.title,
            type: l.type,
            sortOrder: li,
            contentMd: l.md,
            isPreview: l.preview ?? false,
            xpReward: l.xp ?? 50,
          },
        });
        if (l.quiz) {
          await prisma.quiz.create({
            data: {
              lessonId: lesson.id,
              passScore: l.quiz.passScore ?? 70,
              questions: {
                create: l.quiz.questions.map((q, qi) => ({
                  sortOrder: qi,
                  prompt: q.prompt,
                  options: q.options,
                  correctIndex: q.correct,
                  explanation: q.why,
                })),
              },
            },
          });
        }
      }
    }
    await prisma.course.update({ where: { id: course.id }, data: { status: "PUBLISHED" } });
    console.log(`✓ ${slug}: ${modules.length} modules, ${modules.reduce((n, m) => n + m.lessons.length, 0)} lessons — PUBLISHED`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
