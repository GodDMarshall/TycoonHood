import type { Programme } from "./types";

/**
 * Business Mastery — launch edition.
 * Entrepreneurial and business-building capability across 8 modules:
 * opportunity, research, models, positioning, selling, operations,
 * finance, and team/strategy.
 */
export const businessMastery: Programme = {
  slug: "business-mastery",
  modules: [
    // ─────────────────────────────────────────────────────────────────────
    // Module 1 — Entrepreneurial thinking & finding opportunities
    // ─────────────────────────────────────────────────────────────────────
    {
      title: "Entrepreneurial Thinking and Finding Opportunities",
      description:
        "Learn to see businesses as promises that solve expensive problems, and build a scored shortlist of opportunities worth testing.",
      objectives: [
        "Explain an offer as a promise with a price, using the who–outcome–mechanism–cost format",
        "Identify opportunities from your own work, skills, local gaps and shifts in how people buy",
        "Score and rank problems by pain, frequency, willingness to pay, reach and your edge",
        "Write a first offer sentence for your highest-scoring opportunity",
      ],
      completion:
        "Read both lessons, submit a scored shortlist of fifteen problems with an offer sentence for your top pick, and pass the knowledge check.",
      lessons: [
        {
          title: "An Offer Is a Promise With a Price",
          type: "READING",
          preview: true,
          minutes: 8,
          md: `Entrepreneurial thinking is not a personality type. It is a habit: you notice problems people already pay to solve, and you take responsibility for solving one of them better. Businesses do not sell products. They sell **outcomes someone already wants**, packaged as a promise with a price on it.

## The offer equation

A workable offer answers four questions in one sentence:

- **Who** it is for — specific enough that they recognise themselves.
- **What outcome** they get — in their words, not yours.
- **How** it happens — the mechanism that makes the promise believable.
- **What it costs** — money, and also time and effort.

"I help new freelance designers land their first three paying clients in 60 days through a portfolio-and-outreach system, for ₹15,000" is an offer. "I do branding" is a hobby with an invoice.

Notice what the first sentence does. A designer reading it knows instantly whether it is for them. A sceptic can see how it might work. And the price is stated, so the buyer can compare it with what the problem costs them now.

## Start with a bleeding neck, not a mild itch

People pay fastest for problems that are **urgent, expensive or embarrassing**. A shop owner losing three orders a week because nobody answers the phone after 7 pm has a bleeding neck. A shop owner who would like a nicer logo has an itch.

Rank every idea by how much the problem already costs the customer — in money, hours or stress. Then ask the most useful question in early-stage business: *what are they doing about it today?*

- If they are paying someone, you have proof of demand and a price reference.
- If they are cobbling together a workaround — spreadsheets, favours, late nights — you have demand without a good supplier.
- If they are doing nothing at all, treat that as a warning. Either the pain is mild or they do not believe it can be solved.

## Three traps beginners fall into

1. **Building for an imagined customer.** If you cannot name ten real people with the problem, you do not yet have a market. You have a guess.
2. **Selling the mechanism instead of the outcome.** Nobody wants "a CRM setup". They want to stop losing leads. Lead with the result; mention the method second.
3. **Hiding the price.** "DM for rates" feels flexible. To the buyer it feels like a trap. A visible price filters out the wrong people and saves you hours.

## What this programme asks of you

Each module ends with work you do in the real world: conversations, numbers, pages, processes. Reading will make you feel informed. Only the assignments will make you capable. Treat every exercise as if your rent depended on it, because one day the habit will.

The next lesson shows you where good problems hide, and how to score them so you stop chasing whichever idea felt exciting last night.`,
        },
        {
          title: "Where Opportunities Actually Come From",
          type: "READING",
          minutes: 10,
          md: `Good business ideas rarely arrive as flashes of genius. They come from paying attention in a few predictable places, then scoring what you find with more discipline than enthusiasm.

## Five places to look

1. **Friction in your own work.** What do you or your colleagues complain about every week? Repeated complaints inside an industry are opportunities wearing a disguise. You already speak the customer's language.
2. **Skills other people pay for.** If friends ask you to fix their spreadsheets, edit their videos or review their tax paperwork, you have evidence that a skill is valued. The question is whether strangers will pay.
3. **Local gaps.** Look at your neighbourhood or city. Which services have long waiting times, poor reviews or no online presence? A tailor with a three-week queue, a coaching centre with no weekend batch, a housing society with no reliable home-cleaning service — each is a gap.
4. **Unbundling and rebundling.** Large offers often contain one part people really want. A full digital-marketing retainer might be unbundled into "monthly Google Business Profile management for clinics". Equally, scattered services can be rebundled: a "move-in package" combining cleaning, pest control and minor repairs.
5. **Shifts in how people buy.** New payment habits, new platforms and new regulations create fresh problems. When small sellers moved to instant payments and chat-based ordering, many needed help with catalogues, order tracking and reconciliation.

## Score before you fall in love

Write each problem as a sentence: *[who] struggles with [problem] and currently [workaround].* Then score it from 1 to 5 on five criteria:

- **Pain** — how costly or urgent is it?
- **Frequency** — does it happen daily, monthly, once a lifetime?
- **Willingness to pay** — is anyone already spending money on it?
- **Reach** — can you get in front of these people this month?
- **Edge** — do you have a skill, access or insight others lack?

## A worked example

Priya, an accountant, lists three problems:

| Problem | Pain | Freq | Pay | Reach | Edge | Total |
|---|---|---|---|---|---|---|
| Small online sellers cannot reconcile marketplace payouts | 4 | 5 | 4 | 4 | 5 | 22 |
| Students need help with personal budgeting | 2 | 3 | 1 | 5 | 3 | 14 |
| Restaurants want help choosing billing software | 3 | 1 | 3 | 2 | 2 | 11 |

The budgeting idea feels meaningful and the restaurant idea feels big. The reconciliation problem wins on evidence: it recurs every week, sellers already pay bookkeepers, and Priya can reach sellers through her existing clients. That is where she should start.

## Common mistakes

- **Scoring alone and generously.** Ask someone blunt to score with you. Your own idea always looks like a 5.
- **Confusing big markets with good markets.** A huge market you cannot reach scores lower than a small one you can serve tomorrow.
- **Ignoring frequency.** One-time problems need constant new customers. Recurring problems let one customer pay you many times.
- **Waiting for originality.** Competition usually signals demand. Your job is to serve a specific group better, not to invent a category.

A score is not a verdict. It tells you which idea to test first. Testing — real conversations with real people — comes in the next module.`,
        },
        {
          title: "Build Your Opportunity Shortlist",
          type: "ASSIGNMENT",
          minutes: 45,
          md: `This assignment turns vague ambition into a ranked list you can act on. You will generate fifteen problems, score them honestly, and write an offer for the winner.

## Step 1: Generate fifteen problems (20 minutes)

Use the five sources from the previous lesson. Aim for three problems from each:

- Three from friction in your own work or studies.
- Three from skills people already ask you for.
- Three from local gaps you can see within a few kilometres of home.
- Three from unbundling or rebundling an existing service.
- Three from a recent change in how people buy, pay or work.

Write each one in the standard form: *[who] struggles with [problem] and currently [workaround].* If you cannot name the workaround, write "unknown" — that is useful information, not failure.

Be specific. "Small businesses need marketing" is not a problem. "Dental clinics in my area get few reviews because nobody asks patients after appointments" is.

## Step 2: Score every problem (15 minutes)

Build a simple table with seven columns: problem, pain, frequency, willingness to pay, reach, edge, total. Score each criterion from 1 to 5.

Rules for honest scoring:

- **Willingness to pay** scores 4 or 5 only if you know someone currently spends money on it.
- **Reach** scores 4 or 5 only if you can name at least five people or a specific place where they gather.
- **Edge** scores 4 or 5 only if you can explain in one sentence why you would be better than a random competitor.

When you finish, ask one blunt friend or colleague to re-score your top five. Average the two scores.

## Step 3: Write the offer for your winner (10 minutes)

Take the highest-scoring problem and fill in:

*I help [who] get [outcome] in [timeframe] through [mechanism], for [price].*

Price is a guess at this stage. Base it on what the problem costs them or what they already pay for workarounds, not on your hours. You will test it in Module 2.

## Deliverable

Submit one page containing:

1. Your full table of fifteen scored problems.
2. Your top three, with averaged scores.
3. The offer sentence for your top pick.
4. Two sentences on what the problem currently costs the customer, in money or time.
5. Five named people or specific places — a named WhatsApp group, a market lane, a forum thread — where you can find people with this problem.

## Standard

Read your offer sentence aloud to someone outside your field. If they cannot tell who it is for and what they get, rewrite it until they can.

## Common failure modes

- Listing fifteen versions of the same idea. Force variety across the five sources.
- Picking the second-highest score because it "feels more exciting". Excitement is not evidence. If you override the score, write down why.
- Skipping the people list. An opportunity you cannot reach this month is homework, not a business.

Keep this page. Module 2 starts with the five people on it.`,
        },
        {
          title: "Entrepreneurial Thinking — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: "Five questions on offers, opportunity sources and scoring. The shortlist you built is the real test.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "Which of these is a complete offer?",
                options: [
                  "I do social media marketing",
                  "Premium consulting for businesses of all sizes",
                  "I help local gyms fill 20 trial memberships in 30 days through a referral system, for a flat ₹40,000",
                  "DM me for prices",
                ],
                correct: 2,
                why: "It names who, the outcome, the timeframe, the mechanism and the price. The others cannot be evaluated, so they cannot be bought.",
              },
              {
                prompt: "A potential customer has a problem but is doing nothing about it today. What does that most likely signal?",
                options: [
                  "A huge untapped market",
                  "The pain may be mild, or they do not believe it can be solved",
                  "You should raise your price",
                  "Competitors will arrive soon",
                ],
                correct: 1,
                why: "Existing spending or workarounds are evidence of demand. No action at all is a warning sign, not a guarantee of opportunity.",
              },
              {
                prompt: "Why does frequency matter when scoring a problem?",
                options: [
                  "Recurring problems let one customer pay you many times, lowering the need for constant new customers",
                  "Frequent problems are always more painful",
                  "Rare problems cannot be solved",
                  "Frequency determines your brand name",
                ],
                correct: 0,
                why: "A problem that recurs weekly or monthly supports repeat revenue. One-time problems force you to keep finding new buyers.",
              },
              {
                prompt: "You find three competitors already serving a problem you scored highly. What is the best interpretation?",
                options: [
                  "Abandon the idea immediately",
                  "Competition usually signals demand; look for a specific group you can serve better",
                  "Copy the biggest competitor's prices exactly",
                  "Wait until they go out of business",
                ],
                correct: 1,
                why: "Competitors prove people pay. Your job is to serve a narrower group better, not to find an empty market.",
              },
              {
                prompt: "When should a problem score 4 or 5 on willingness to pay?",
                options: [
                  "When you personally think it is important",
                  "When the market is described as large online",
                  "When you know someone currently spends money on solving it",
                  "When friends say they would probably buy",
                ],
                correct: 2,
                why: "Actual current spending is evidence. Opinions and hypothetical promises are not.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────
    // Module 2 — Market research
    // ─────────────────────────────────────────────────────────────────────
    {
      title: "Market Research",
      description:
        "Test demand cheaply with honest customer conversations, bottom-up market sizing and a focused competitor scan.",
      objectives: [
        "Run customer interviews that collect past behaviour instead of polite opinions",
        "Estimate a reachable market bottom-up and state the assumptions behind it",
        "Map competitors and alternatives, including doing nothing and doing it yourself",
        "Turn interview notes into a clear go, adjust or drop decision",
      ],
      completion:
        "Run at least five customer interviews, submit your question set and synthesis table with a decision, and pass the knowledge check.",
      lessons: [
        {
          title: "Customer Conversations That Don't Lie to You",
          type: "READING",
          minutes: 9,
          md: `The cheapest way to test an offer is a conversation — done correctly. Done wrong, conversations manufacture false confidence, because people are polite and nobody enjoys telling a hopeful founder that the idea is weak.

## The four rules

1. **Talk about their life, not your idea.** The moment you pitch, they start managing your feelings. Describe the problem area only: "I'm researching how small sellers handle payouts."
2. **Past behaviour over future promises.** "Would you buy this?" is worthless. "What did you do the last time this happened?" is gold. People are unreliable forecasters of their own spending and honest reporters of what they already did.
3. **Follow the money and the workarounds.** What have they paid for, cobbled together or wasted hours on? A seller who spends four hours every Sunday matching payout reports to orders has shown you real demand.
4. **Ask for something at the end.** Time, an introduction, a pre-order, a deposit. A warm "sounds great" that costs them nothing *is* your answer.

## A five-question core script

- When did this problem last come up?
- Walk me through exactly what you did about it.
- What have you tried or paid for before? What was wrong with it?
- If this were solved perfectly, what would be different for you?
- Who else do you know who deals with this?

Ask follow-ups constantly: "Why?", "How much did that cost?", "What happened next?". The best insight usually comes from the third follow-up, not the first answer.

## Who to talk to

Talk to people who match your offer sentence exactly. Friends and family are fine for practice but poor evidence, because they love you. Aim for a mix: some who currently pay for a solution, some who use a workaround, and one or two who tried and gave up.

## Signals to write down

After each conversation, record three things within ten minutes:

- **Exact phrases** they used to describe the problem. These become your marketing copy later.
- **Evidence of spending** — money, time or effort, with numbers where possible.
- **Commitment offered** — none, a referral, a follow-up call, a deposit.

## Mistakes that ruin interviews

- **Leading questions.** "Don't you hate how slow this is?" invites agreement. Ask "How do you feel about the current process?" instead.
- **Talking more than a third of the time.** Record yourself once. Most first-timers talk for over half the call.
- **Counting compliments.** "Great idea!" is noise. Count specific past actions and commitments.
- **Stopping at three.** Patterns appear around five to eight conversations. One enthusiastic person proves nothing; five people describing the same painful workaround proves a lot.

## The real goal

You are not trying to be told yes. You are trying to learn fast enough to change your offer before you spend money building it. A conversation that kills your idea in week one has saved you months. Discomfort now is far cheaper than a launch nobody attends.`,
        },
        {
          title: "Sizing a Market You Can Actually Reach",
          type: "READING",
          minutes: 10,
          md: `Big market numbers in pitch decks look impressive and help nobody. A founder needs a smaller, more honest number: how many customers can I reach, and what could they pay me, in the next twelve months?

## Why top-down sizing misleads

Top-down sizing starts with a huge figure — "the food delivery market is enormous" — and claims a tiny percentage. "If we get just 1%..." is the most dangerous phrase in early planning. It hides every hard question: who exactly, how you will reach them, and why they will switch.

## Build it bottom-up instead

Bottom-up sizing counts real units you can reach and multiplies by realistic behaviour:

**Reachable customers × share you can win × revenue per customer = realistic revenue ceiling.**

### Worked example: a home-style tiffin service

Arjun wants to deliver weekday lunch tiffins within 3 km of his kitchen. He counts:

- 14 paying-guest hostels averaging 40 residents = 560 people.
- 6 co-working spaces averaging 80 members = 480 people.
- 3 apartment complexes with an estimated 300 working professionals living alone = 300 people.

Reachable pool: **1,340 people.**

From interviews, about one in three already buys lunch on most weekdays rather than cooking. That gives **roughly 445 active lunch buyers.**

If Arjun wins 10% of them in year one, that is about **45 customers.** At ₹2,800 per month for a weekday plan, the realistic ceiling is **₹1,26,000 per month** in revenue.

That number is useful. It tells Arjun this is a solid small business, not a large one, unless he expands the radius, adds dinner, or sells to offices. It also tells him exactly which assumptions to test: the one-in-three buying rate and the 10% capture rate.

## State your assumptions out loud

Every market estimate is a chain of guesses. Write each one down with its source:

- Counted directly (strong)
- Learned from interviews (moderate)
- Estimated from your judgement (weak)

Then test the weakest link first. If Arjun cannot sign 10 customers from one hostel after a week of trying, his 10% capture rate is probably optimistic.

## Scan the competition properly

List every alternative a customer has, not just similar businesses:

- **Direct competitors** — other tiffin services.
- **Indirect alternatives** — restaurants, food apps, office canteens.
- **Doing it themselves** — cooking, carrying food from home.
- **Doing nothing** — skipping lunch, eating snacks.

For the top three direct competitors, note price, what customers praise in reviews, and what they complain about. Repeated complaints — late delivery, oily food, no weekly menu — are your openings.

## Desk research that helps

Before or alongside interviews, spend an hour on:

- Online reviews of competitors, sorted by most recent and lowest rating.
- Marketplace and directory listings to count how many sellers exist and what they charge.
- Forums and community groups where your customers ask for recommendations.

## Common mistakes

- Treating a big number as validation. Size matters less than reachability and willingness to pay.
- Ignoring "do nothing" as a competitor. It is often the strongest one.
- Never revisiting the estimate. Update it every month with real conversion data.`,
        },
        {
          title: "Run Five Customer Interviews",
          type: "ASSIGNMENT",
          minutes: 120,
          md: `This is the most important assignment in the programme. You will write an interview guide, run five real conversations and make a decision based on what you hear.

## Step 1: Write your interview guide

Write **five core questions** about the problem from your Module 1 offer. Rules:

- At least three must ask about past behaviour: "the last time", "walk me through", "what did you pay".
- None may mention your solution.
- None may be answerable with yes or no.

Add two follow-ups you will use repeatedly, such as "Why was that?" and "What did that cost you?".

Example for a payout-reconciliation service:

1. When did you last reconcile your marketplace payouts?
2. Walk me through how you did it, step by step.
3. How long did it take, and who did it?
4. What have you tried or paid for to make it easier?
5. What happens when a payout does not match your orders?

## Step 2: Book five conversations

Use the five people or places you listed in Module 1. Send a short request with no pitch:

"Hi Meera — I'm researching how small online sellers handle payout reconciliation. Could I ask you a few questions for 15 minutes this week? I'm not selling anything."

Aim for calls or in-person chats. Text surveys lose tone, hesitation and follow-up.

## Step 3: Run them

- Talk less than a third of the time.
- Take notes on exact phrases, not your interpretation.
- At the end, ask for one thing: a referral, a second call, or permission to show them a solution later.

## Step 4: Synthesise in a table

Build a table with one row per interview and these columns:

| Person | Last occurrence | Current workaround | Money or time spent | Exact quote | Commitment offered |
|---|---|---|---|---|---|

Below the table, write:

- **Patterns:** what did three or more people say?
- **Surprises:** what did you not expect?
- **Language:** the three best customer phrases you heard.

## Step 5: Decide

Choose one, and justify it in three sentences:

- **Go** — at least three of five described a recent, costly problem and a current spend or workaround, and at least two offered a commitment.
- **Adjust** — the problem is real but your audience, outcome or price needs changing. State the change.
- **Drop** — fewer than two described real pain. Return to your Module 1 shortlist and test the next idea.

## Deliverable

One document containing your interview guide, the synthesis table, patterns and surprises, and your decision with justification. Include the date of each interview.

## Standard

If your table shows only opinions ("they said they'd love it") and no past behaviour or numbers, the interviews have not worked yet. Rewrite your questions and run two more. Honest "drop" decisions count as a pass. Pretending a weak signal is strong does not.`,
        },
        {
          title: "Market Research — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: "Five questions on interviews, sizing and competition. Your five real conversations matter more than this score.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "Which interview question gives the strongest evidence of demand?",
                options: [
                  "Would you buy this if I built it?",
                  "Do you think this is a good idea?",
                  "How much would you pay for something like this?",
                  "Walk me through what you did the last time this problem came up.",
                ],
                correct: 3,
                why: "Past behaviour is evidence. Hypothetical buying and opinions are shaped by politeness.",
              },
              {
                prompt: "A tiffin founder can reach 1,340 people, one in three buys lunch regularly, and she expects to win 10% of those buyers at ₹2,800 per month. What is her approximate monthly revenue ceiling?",
                options: ["₹37,520", "₹1,26,000", "₹3,75,200", "₹12,50,000"],
                correct: 1,
                why: "1,340 ÷ 3 ≈ 445 buyers; 10% ≈ 45 customers; 45 × ₹2,800 = ₹1,26,000.",
              },
              {
                prompt: "Why is \"if we get just 1% of a huge market\" a weak sizing method?",
                options: [
                  "It skips who exactly the customers are, how you will reach them and why they will switch",
                  "One percent is always too high",
                  "Large markets never contain small businesses",
                  "Investors prefer 5%",
                ],
                correct: 0,
                why: "Top-down percentages hide every hard question. Bottom-up counts reachable customers and realistic behaviour.",
              },
              {
                prompt: "Which of these should appear in your competitor map?",
                options: [
                  "Only businesses with the same product",
                  "Only the market leader",
                  "Direct competitors, indirect alternatives, doing it yourself and doing nothing",
                  "Only competitors with websites",
                ],
                correct: 2,
                why: "Customers compare you with every option they have, and doing nothing is often the strongest competitor.",
              },
              {
                prompt: "After five interviews, one person loved the idea and four described the problem as minor. What is the honest decision?",
                options: [
                  "Go, because one enthusiastic person proves demand",
                  "Drop or adjust, because the pattern shows weak pain",
                  "Build the product and see what happens",
                  "Raise the price to filter customers",
                ],
                correct: 1,
                why: "Patterns across conversations matter, not the single most enthusiastic one.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────
    // Module 3 — Business models
    // ─────────────────────────────────────────────────────────────────────
    {
      title: "Business Models and Unit Economics",
      description:
        "Choose how your business makes money and prove, with contribution margin and breakeven maths, that one unit of it works.",
      objectives: [
        "Compare common revenue models and the trade-offs each creates",
        "Calculate contribution margin per unit, including the costs beginners forget",
        "Work out breakeven volume from fixed costs and contribution",
        "Test your model under pessimistic, expected and optimistic scenarios",
      ],
      completion:
        "Submit a one-unit economics sheet with breakeven and three scenarios for your own business, and pass the knowledge check.",
      lessons: [
        {
          title: "How a Business Makes Money: The Model on One Page",
          type: "READING",
          minutes: 9,
          md: `A business model is the answer to one question: **how does value turn into money, repeatedly, at a cost lower than what customers pay?** You do not need a fifty-page plan. You need one page that makes the logic visible.

## The common revenue models

Each model creates different pressures. Pick deliberately.

- **One-off sale.** A customer buys once: a cake, a website, a piece of furniture. Simple to start. The catch: you must keep finding new buyers, so marketing never stops.
- **Repeat purchase.** Consumables people buy again: coffee beans, skincare, pet food. Strong if quality is consistent, because the second sale costs far less to win than the first.
- **Subscription or retainer.** A fixed amount every month: a tiffin plan, a bookkeeping retainer, a maintenance contract. Predictable cash, but you must keep delivering value or customers cancel.
- **Productised service.** A fixed scope at a fixed price: "logo, colours and three social templates in 10 days for ₹25,000". Easier to sell and deliver than open-ended hourly work.
- **Commission or marketplace.** You take a percentage for connecting buyers and sellers. Hard early, because you must attract both sides at once.
- **Licensing or digital products.** Make once, sell many times: templates, courses, software. Low delivery cost, but often high marketing cost and plenty of competition.

## The one-page model

Write short answers to these eight prompts:

1. **Customer** — exactly who pays?
2. **Problem** — what costly problem do you solve?
3. **Offer** — your offer sentence from Module 1.
4. **Channel** — how will customers find you and buy?
5. **Revenue model** — one-off, repeat, subscription, and at what price?
6. **Key costs** — what do you spend to make and deliver each sale?
7. **Key activities** — what must you do well every week?
8. **Advantage** — why will customers choose you over alternatives?

If any answer is blank or vague, that is your next piece of research.

## Matching model to reality

A few patterns save years of struggle:

- **High price, low frequency** — weddings, renovation, legal work — needs trust, referrals and a strong reputation. Advertising alone rarely works.
- **Low price, high frequency** — snacks, daily services — needs volume, efficient operations and repeat customers.
- **Low price, low frequency** is the hardest corner. If you sell a ₹300 item people buy once a year, every customer must be very cheap to acquire.

## A small example

A freelance photographer charging ₹8,000 per shoot sells one-off sessions. She shifts to a **quarterly retainer for restaurants**: four menu shoots a year for ₹28,000, paid in two instalments. She earns less per shoot, but she no longer needs to find a new client every week, and her calendar becomes predictable.

## Common mistakes

- Copying a model from a famous company without its money or scale.
- Choosing subscription because it sounds attractive, for a product people only need once.
- Leaving the cost side blank. Revenue without costs is a wish, not a model.

The next lesson fills in the cost side, unit by unit.`,
        },
        {
          title: "Unit Economics: Contribution Margin First",
          type: "READING",
          minutes: 12,
          md: `Before you scale anything, prove that **one unit** makes money. A unit is whatever you sell: one candle, one tiffin month, one client project. If a single unit loses money, more volume only loses money faster.

## Contribution margin

**Contribution = price − variable costs.**

Variable costs rise with every unit sold: materials, packaging, shipping, payment fees, platform commissions, returns. Fixed costs — rent, software, your minimum salary — stay roughly the same whether you sell ten units or a hundred.

Contribution is what each sale contributes towards fixed costs and, eventually, profit.

## Worked example: handmade candles

Neha sells soy candles online for **₹600** each. Assume this is the amount she keeps after any tax collected on the sale.

| Variable cost per candle | ₹ |
|---|---|
| Wax, wick, jar, fragrance | 170 |
| Packaging and insert card | 40 |
| Shipping | 70 |
| Payment gateway fee (2% of ₹600) | 12 |
| Breakage and returns allowance (5% of ₹600) | 30 |
| **Total variable cost** | **322** |

Contribution per candle = 600 − 322 = **₹278**, a contribution margin of about **46%**.

## Breakeven

**Breakeven units = fixed costs ÷ contribution per unit.**

Neha's monthly fixed costs: workspace share ₹8,000, software and website ₹2,000, and the minimum she must pay herself, ₹25,000. Total ₹35,000.

Breakeven = 35,000 ÷ 278 ≈ 125.9, so **126 candles a month**, roughly four a day. That is a concrete target she can check against her market research.

## The cost beginners forget: acquisition

Suppose Neha's ads cost ₹250 for every new customer she wins, and most customers buy only once. Her real contribution on a first sale is 278 − 250 = **₹28**. She is nearly working for free.

Two fixes exist, and both are about the model, not the ads:

- **Raise order value.** A gift set of three at ₹1,500 shares one shipping cost and one acquisition cost.
- **Earn repeat purchases.** If a customer buys three times a year and repeat orders need no ad spend, the second and third candles each contribute the full ₹278.

## Services have unit economics too

For a service, the unit is a project or a client-month. Variable costs include freelancer fees, tools billed per client, travel and — critically — your own hours valued at a fair rate. A ₹40,000 website that takes 80 hours earns ₹500 an hour before any costs. Know that number before you quote.

## Common mistakes

- **Leaving out payment fees, returns and shipping.** Small percentages add up to real money.
- **Using revenue instead of contribution for decisions.** Revenue is vanity; contribution pays the bills.
- **Ignoring tax.** Depending on your country, turnover and product, you may need to collect indirect tax such as GST on your price. Know whether your price includes it.
- **Counting your own time as free.** If the business only works because you are unpaid, it does not yet work.

> **Educational content.** Rules on registration, tax and employment vary by country and change; confirm with a qualified professional before acting.`,
        },
        {
          title: "Model One Unit of Your Business",
          type: "ASSIGNMENT",
          minutes: 60,
          md: `You will build a one-unit economics sheet for your own idea and find out how many sales you need each month to break even. Use a spreadsheet so you can change numbers later.

## Step 1: Define your unit (5 minutes)

Write one line: "My unit is ___ sold at ₹___." Examples: one gift box at ₹1,200; one monthly bookkeeping retainer at ₹6,000; one website project at ₹45,000.

If you sell several items, model your most common one first.

## Step 2: List every variable cost (20 minutes)

Go line by line. Include:

- Materials or direct inputs
- Packaging
- Delivery or travel
- Payment gateway or bank fees
- Platform or marketplace commission
- Returns, refunds or wastage allowance
- Freelancer or contractor time per unit
- Your own hours per unit, at a fair hourly rate

Where you do not know a cost, get a real quote today: call a supplier, check a courier rate card, read a platform's fee page. Guesses are allowed only if marked as guesses.

## Step 3: Calculate contribution (5 minutes)

- Contribution per unit = price − total variable cost.
- Contribution margin = contribution ÷ price.

If contribution is negative, stop. Do not proceed to marketing. Revisit price, costs or the offer.

## Step 4: Calculate breakeven (10 minutes)

List monthly fixed costs: rent or workspace, software, phone and internet share, insurance, accountant fees, and the minimum you need to pay yourself.

Breakeven units per month = fixed costs ÷ contribution per unit.

Translate that into a daily or weekly number. "126 candles a month" becomes "about 30 a week". Ask: does my market research suggest that is reachable?

## Step 5: Add acquisition cost (10 minutes)

Estimate what it will cost to win one customer. If you have no data, use a conservative guess such as 30% of your price and mark it clearly.

Then calculate contribution after acquisition for a first-time buyer. If it is near zero, note what would fix it: bundles, higher price, repeat purchases or a cheaper channel such as referrals.

## Step 6: Run three scenarios (10 minutes)

Copy your sheet three times:

- **Pessimistic** — costs 15% higher, price 10% lower.
- **Expected** — your best estimate.
- **Optimistic** — costs 10% lower, price as planned.

Record contribution and breakeven units for each.

## Deliverable

Submit your sheet or a screenshot showing:

1. Unit definition and price.
2. Itemised variable costs with sources.
3. Contribution and contribution margin.
4. Fixed costs and breakeven units.
5. Contribution after acquisition.
6. The three scenarios side by side.
7. Three sentences: what surprised you, which number is weakest, and what you will do about it.

## Standard

Every cost has a source or is flagged as a guess. A model that only works in the optimistic scenario is a warning to act on now, not later.`,
        },
        {
          title: "Business Models — Knowledge Check",
          type: "QUIZ",
          minutes: 6,
          md: "Five questions on revenue models, contribution and breakeven. Have a calculator nearby.",
          quiz: {
            passScore: 70,
            questions: [
              {
                prompt: "A product sells for ₹800. Variable costs total ₹480. What is the contribution margin?",
                options: ["40%", "60%", "32%", "₹480"],
                correct: 0,
                why: "Contribution = 800 − 480 = ₹320. Margin = 320 ÷ 800 = 40%.",
              },
              {
                prompt: "Monthly fixed costs are ₹60,000 and contribution per unit is ₹300. How many units must you sell each month to break even?",
                options: ["120", "200", "300", "600"],
                correct: 1,
                why: "Breakeven = fixed costs ÷ contribution per unit = 60,000 ÷ 300 = 200 units.",
              },
              {
                prompt: "Which of these is a variable cost?",
                options: [
                  "Monthly workspace rent",
                  "Annual website hosting",
                  "Payment gateway fee charged on each sale",
                  "Your accountant's fixed monthly fee",
                ],
                correct: 2,
                why: "Variable costs rise with each unit sold. Gateway fees are charged per transaction.",
              },
              {
                prompt: "Contribution per unit is ₹278, but it costs ₹250 in ads to win each new customer, who usually buys once. What is the most useful response?",
                options: [
                  "Spend more on ads to grow volume",
                  "Ignore acquisition cost because it is marketing, not product",
                  "Raise order value with bundles or earn repeat purchases so acquisition cost is spread over more contribution",
                  "Cut product quality to reduce costs",
                ],
                correct: 2,
                why: "First-sale contribution after acquisition is only ₹28. Fixing the model through order value or repeat purchases solves it; more ads only scale the thin margin.",
              },
              {
                prompt: "Which pairing is the hardest to build a business on?",
                options: [
                  "High price, low frequency",
                  "Low price, high frequency",
                  "Low price, low frequency",
                  "Subscription with high retention",
                ],
                correct: 2,
                why: "When customers pay little and rarely, every customer must be extremely cheap to acquire.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────
    // Module 4 — Branding and positioning
    // ─────────────────────────────────────────────────────────────────────
    {
      title: "Branding and Positioning",
      description:
        "Choose the comparison customers will make, then build a brand that keeps the same promise every time they meet you.",
      objectives: [
        "Write a positioning statement that names the alternative you replace and why you are different",
        "Narrow your target customer until word of mouth becomes possible",
        "Define the core of a small-business brand: name, promise, voice and visual basics",
        "Decide what to spend on branding now and what to postpone",
      ],
      completion:
        "Submit a one-page positioning and brand sheet tested with three people from your target group, and pass the knowledge check.",
      lessons: [
        {
          title: "Positioning: Choose the Comparison",
          type: "READING",
          minutes: 9,
          md: `Customers understand anything new by comparing it with something they already know. Positioning is deciding **which comparison you want them to make** — before they make a worse one on their own.

## Positioning is not a slogan

A slogan is words on a banner. Positioning is a strategic choice that shapes your price, your channels, your product and your marketing. Get it right and many other decisions become easy. Get it wrong and even good marketing struggles.

## The five parts

Work through these in order:

1. **Competitive alternative.** What would customers use if you did not exist? Often it is not a direct competitor — it is a spreadsheet, a relative, a general freelancer, or doing nothing.
2. **Your unique attributes.** What do you have that the alternative lacks? Be factual: a faster turnaround, a specialisation, a format, a guarantee.
3. **The value those attributes create.** Why does each attribute matter to the customer? "Same-day delivery" matters because "you can order in the morning for an evening party".
4. **Who cares most.** Which customers value that difference the most? They are your target.
5. **Market frame.** What category do you put yourself in so customers instantly understand you?

## A worked example

Kavya runs a small bakery. Version one of her positioning: "Delicious homemade cakes for every occasion." It competes with every bakery in the city and gives nobody a reason to choose her.

She works through the five parts:

- **Alternative:** supermarket cakes and large bakery chains.
- **Attributes:** no eggs, low-sugar options, cakes designed from a photo, 24-hour turnaround.
- **Value:** families with dietary restrictions can order a celebration cake everyone can eat, at short notice.
- **Who cares most:** parents planning children's birthdays where some guests avoid eggs.
- **Frame:** "eggless celebration cakes".

New positioning: **"Eggless celebration cakes, designed from your photo, ready in 24 hours."** Her audience is smaller. Her messages are sharper. Parents in school WhatsApp groups can repeat it in one breath — which is how word of mouth spreads.

## The positioning statement template

*For [target customer] who [need or problem], [brand] is a [market frame] that [key benefit]. Unlike [competitive alternative], we [main difference].*

Write it for yourself, not for customers. It is an internal compass for every page, post and price.

## Narrow feels scary, and works

Most founders fear that narrowing loses customers. In practice, a specific position wins customers you would never have reached with a general one, because people can recognise themselves. You can always widen later from a position of strength. Widening from vagueness is much harder.

## Common mistakes

- **Positioning on quality or service.** Everyone claims both. They are expected, not distinctive.
- **Choosing a difference customers do not care about.** "We use premium software" means nothing unless it changes their outcome.
- **Changing position every month.** Customers need repetition. Commit for at least two quarters, measure, then adjust.
- **Fighting the leader on their terms.** If the market leader wins on price and range, compete on speed, specialisation or service depth instead.`,
        },
        {
          title: "A Brand Is a Set of Repeated Promises",
          type: "READING",
          minutes: 9,
          md: `For a small business, a brand is not a logo. It is **what customers expect from you, based on every experience they have had so far.** The logo is just a reminder of those experiences.

## The four parts that matter early

### 1. The promise
One sentence, drawn from your positioning: what a customer can always count on. "Your cake arrives on time, exactly like the photo." Every process in the business should protect this promise. Break it twice and no design will save you.

### 2. The name
A good small-business name is easy to say, easy to spell after hearing it once, and available as a web domain and social handle. Descriptive names ("Eggless Cakes by Kavya") work well locally because they explain themselves. Abstract names need much more marketing to mean anything.

Before you commit, search business registers and trademark databases in your country to avoid a name someone else already protects. Rebranding after a dispute is expensive and painful.

### 3. The voice
How you write and speak. Pick three words and define them with examples:

- **Warm** — "We'd love to help" rather than "Your request has been received".
- **Clear** — prices and timelines stated plainly.
- **Practical** — tips customers can use, not adjectives.

Write a short do-and-don't list so anyone who replies on your behalf sounds like the same business.

### 4. Visual basics
You need fewer assets than you think:

- One logo or wordmark in a horizontal and a square version.
- Two or three colours with their codes written down.
- One or two fonts.
- A consistent photo style — same background, lighting and angle for products.

Put these on a single reference page. Consistency builds recognition far faster than a clever design.

## What to spend on now, and what to postpone

Early on, spend on things customers experience directly:

- Product quality and packaging that survives delivery.
- Good product photos.
- Clear, fast replies.

Postpone:

- Expensive logo projects before you have twenty paying customers.
- Custom-designed websites when a simple page converts just as well.
- Merchandise, mascots and brand videos.

A simple, consistent brand on a business that keeps its promise beats a beautiful brand on a business that does not.

## Brand is built in small moments

Customers judge you on:

- How quickly you reply to an enquiry.
- Whether the delivered product matches the photo.
- How you handle a mistake.

Handling a problem well often creates more loyalty than a flawless order. Replace, refund or fix quickly, then follow up. That story spreads.

## Common mistakes

- Redesigning the logo whenever sales dip. Sales dip for reasons customers feel, not ones they see on a logo.
- Using different names, colours and tones on each platform.
- Promising "premium" while replying to messages two days late.

> **Educational content.** Rules on registration, tax and employment vary by country and change; confirm with a qualified professional before acting.`,
        },
        {
          title: "Write Your Positioning and Brand One-Pager",
          type: "ASSIGNMENT",
          minutes: 60,
          md: `You will produce a single page that defines how your business is positioned and how it shows up. Then you will test it with real people from your target group.

## Part A: Positioning (25 minutes)

Answer the five positioning questions using your interview notes from Module 2, not your imagination:

1. **Competitive alternative** — what do your interviewees use today? Quote at least one.
2. **Unique attributes** — list three facts about your offer the alternative lacks.
3. **Value** — for each attribute, write "which means you can..." and finish the sentence.
4. **Who cares most** — the narrowest group that gets the most value.
5. **Market frame** — the category name customers would search for or say aloud.

Then fill in the statement:

*For [target customer] who [need], [brand] is a [market frame] that [key benefit]. Unlike [alternative], we [main difference].*

Finally, compress it into a one-line customer-facing version under 12 words. Example: "Eggless celebration cakes, designed from your photo, ready in 24 hours."

## Part B: Brand basics (20 minutes)

On the same page, add:

- **Promise** — one sentence customers can always rely on.
- **Name** — your chosen name, plus confirmation that the domain and main social handle are available. Note that you have searched your country's business and trademark registers.
- **Voice** — three words, each with one "we say" and one "we don't say" example.
- **Visual basics** — colour codes, fonts and a description of your photo style. Free tools are fine.

## Part C: Test it with three people (15 minutes plus conversations)

Show the one-line version to three people who match your target customer. Ask only:

1. "Who do you think this is for?"
2. "What would you expect to get?"
3. "What would you compare it to?"

Write their answers down word for word. Do not explain or defend.

If at least two of three correctly name the audience and the outcome, your positioning is clear. If not, rewrite the line and test with two more people.

## Deliverable

One page with:

1. The five positioning answers.
2. The full positioning statement and the one-line version.
3. Promise, name, voice and visual basics.
4. The three test responses, word for word.
5. Any rewrite you made and why.

## Standard

Your one-liner should be specific enough that some people say "this isn't for me". If everyone thinks it is for them, it is still too broad.

## Common failure modes

- Writing attributes customers never mentioned in interviews.
- Picking a market frame no customer would use ("holistic confectionery solutions").
- Skipping the test because you already like your line. Your opinion is the least useful one in the room.`,
        },
        {
          title: "Branding and Positioning — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: "Four questions on positioning and brand. Your tested one-liner is the real result.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "What is the first step in positioning?",
                options: [
                  "Designing a logo",
                  "Identifying what customers would use if you did not exist",
                  "Choosing brand colours",
                  "Writing a slogan",
                ],
                correct: 1,
                why: "Positioning starts with the competitive alternative, because it defines the comparison customers will make.",
              },
              {
                prompt: "Why is \"high quality and great service\" weak positioning?",
                options: [
                  "Customers dislike quality",
                  "It is too specific",
                  "Every competitor claims it, so it creates no reason to choose you",
                  "It is illegal to claim quality",
                ],
                correct: 2,
                why: "Quality and service are expected. Positioning needs a difference the target customer values and can repeat.",
              },
              {
                prompt: "For a business with fewer than twenty customers, which is the best branding spend?",
                options: [
                  "A custom-designed website with animations",
                  "Consistent product photos, durable packaging and fast replies",
                  "Branded merchandise",
                  "A full rebrand every quarter",
                ],
                correct: 1,
                why: "Early brand is built by what customers experience directly. Polished extras can wait.",
              },
              {
                prompt: "Three target customers read your one-liner. None can say who it is for. What should you do?",
                options: [
                  "Explain it to them until they understand",
                  "Add more adjectives",
                  "Keep it, because it will grow on people",
                  "Rewrite the line and test again",
                ],
                correct: 3,
                why: "If the audience cannot recognise themselves, the positioning is not doing its job. Revise and retest.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────
    // Module 5 — Marketing and sales
    // ─────────────────────────────────────────────────────────────────────
    {
      title: "Marketing and Sales",
      description:
        "Price with conviction, win your first customers by hand, and measure acquisition with CAC, LTV and payback.",
      objectives: [
        "Set prices anchored to the value of the outcome, and calculate the true cost of discounts",
        "Find and convert your first ten customers through warm, community and direct channels",
        "Calculate customer acquisition cost, contribution-based lifetime value and payback period",
        "Run a structured sales conversation and handle common objections",
      ],
      completion:
        "Run a two-week sales sprint with a tracked pipeline of thirty prospects, submit your results with CAC estimates, and pass the knowledge check.",
      lessons: [
        {
          title: "Pricing Without Apologising",
          type: "READING",
          minutes: 10,
          md: `Pricing is the fastest lever on profit and the one beginners touch least. Most underprice out of fear, then try to fix thin margins with more volume. That rarely works.

## Anchor to the outcome, not your hours

Customers do not buy your time or materials. They buy a result. Price against three reference points:

- **What the problem costs them now.** A clinic losing ten appointments a month at ₹800 each loses ₹8,000. A ₹3,000 monthly fix is easy to justify.
- **What they pay for alternatives.** Competitors, workarounds, hiring someone in-house.
- **Your floor.** Variable cost plus a contribution that covers your fixed costs at realistic volume. Never go below this.

Your price usually sits between your floor and the value of the outcome. The closer to value, the healthier the business.

## The discount trap: a worked example

You sell a product at **₹1,000** with variable costs of **₹600**. Contribution is ₹400.

You run a 20% discount. Price drops to ₹800. Contribution drops to **₹200** — it halves.

To earn the same total contribution, you now need to sell **twice as many units**. A 20% discount does not need 20% more sales; it needs 100% more. That is why constant discounting quietly ruins small businesses.

The reverse is equally powerful. A 10% price rise to ₹1,100 lifts contribution to ₹500, a 25% increase. You could lose one in five customers and still earn the same contribution with less work.

## Practical pricing rules

1. **State one price first.** A single confident price sells better than a menu at the beginning.
2. **Add tiers later.** Once you understand customers, offer three options: a basic, a standard and a premium. The premium option makes the standard one look reasonable, and many buyers settle in the middle.
3. **Bundle instead of discounting.** Add a bonus item or service with low cost to you instead of cutting price.
4. **Raise prices when yes comes too easily.** If nearly everyone accepts without hesitation, you are probably below value. Raise for new customers and watch conversion.
5. **Give existing customers notice.** A month's notice and a clear reason keeps trust.

## Say the price like you mean it

Discounting before anyone asks, burying the price, over-explaining — customers read all of it as doubt. State the price, then stop talking. Silence after a price is not rudeness. It is respect for their decision.

## When a lower price is right

Lower prices can be strategic: a smaller entry offer that leads to a bigger one, or a launch price for the first few customers in exchange for detailed feedback and a testimonial. Make the terms explicit and time-limited, so the price does not become permanent by accident.

## Common mistakes

- Pricing from your own budget. Your customers are not you.
- Matching the cheapest competitor. The cheapest option attracts the customers who cost the most to serve.
- Never testing. Change price for new enquiries and measure what happens. Data beats fear.`,
        },
        {
          title: "Your First Ten Customers, and the Maths of Acquisition",
          type: "READING",
          minutes: 11,
          md: `Nothing about your first ten customers scales, and that is fine. They are **research that pays you.** Later, once a channel works, you need numbers to decide where to spend. This lesson covers both.

## Where the first ten come from

In order of conversion, highest first:

1. **People you already helped for free.** Convert the goodwill into a paid engagement.
2. **Warm introductions.** One sentence to everyone you know: "Who do you know dealing with [problem]?"
3. **Communities where the problem is discussed.** Local groups, industry forums, association meetings. Be the most useful person there for two weeks before you mention your offer.
4. **Direct outreach.** Personal messages to well-chosen prospects. It works best after your first few customers have taught you their language.

## The manual playbook

- Deliver to the first customers personally, with care that would be absurd at scale.
- After each sale, ask: "What almost stopped you from buying?" That answer becomes your next page headline.
- Collect a specific testimonial: numbers, timeframe, their own words.
- Write down every step you took. That document becomes your process.

## The numbers that tell you if a channel works

Once you spend money or meaningful time on a channel, track three numbers.

### Customer acquisition cost (CAC)
**CAC = total acquisition spend ÷ new customers won.**

You spend ₹30,000 on ads in a month and win 60 new customers. CAC = **₹500**. Include tools, agency fees and paid time in the spend, not only ad budget.

### Lifetime value (LTV), measured on contribution
**LTV = contribution per order × average number of orders per customer.**

Average order ₹800 with a 45% contribution margin gives ₹360 contribution per order. If your records show customers place three orders on average, LTV = **₹1,080**.

Use contribution, not revenue. A revenue-based LTV would claim ₹2,400 and mislead you badly.

### LTV to CAC ratio and payback
LTV ÷ CAC = 1,080 ÷ 500 = **2.16**. Each rupee of acquisition returns about two rupees of contribution over the customer's life.

Payback asks how long until you recover CAC. The first order contributes ₹360, less than ₹500, so you recover acquisition cost only on the second order. If the second order typically comes after two months, your cash is tied up for two months per customer.

## Reading the numbers

- **LTV below CAC:** every new customer loses money. Stop spending on the channel and fix price, margin or retention.
- **LTV comfortably above CAC with quick payback:** the channel is worth expanding gradually, while watching that CAC does not rise as you spend more.
- **High LTV but slow payback:** profitable on paper but heavy on cash. Grow only as fast as your cash allows.

## Common mistakes

- Calculating LTV from hoped-for repeat purchases instead of observed ones.
- Blending all channels into one CAC. Referrals may cost ₹50 and ads ₹900. Track them separately.
- Scaling a channel before the offer converts well by hand. Paid traffic amplifies whatever you already have, good or bad.`,
        },
        {
          title: "Run a Two-Week Sales Sprint",
          type: "ASSIGNMENT",
          minutes: 180,
          md: `For two weeks you will run a focused sales effort, track every prospect, and learn how buyers actually decide. Aim for real paying customers, but the learning counts even if you close none.

## Step 1: Build a list of thirty prospects

Split it across channels:

- 10 warm contacts or introductions
- 10 people from communities where your customers gather
- 10 direct outreach targets who closely match your offer

Track them in a sheet with columns: name, channel, date contacted, stage, next step, notes. Stages: contacted, replied, conversation booked, offer made, won, lost.

## Step 2: Prepare your sales conversation

Use this five-part structure:

1. **Open** — thank them, set the agenda: "I'll ask a few questions, then if it fits, I'll explain how I work. If it doesn't, I'll say so."
2. **Diagnose** — ask about their situation, what they have tried, and what the problem costs. Listen more than you talk.
3. **Confirm** — summarise their problem in their words. "So you're losing roughly ₹8,000 a month in missed bookings. Is that right?"
4. **Present** — explain your offer only as it relates to what they told you. State the price plainly.
5. **Ask** — "Would you like to go ahead?" Then stay quiet.

## Step 3: Prepare for objections

Write a calm, honest response to each:

- **"It's too expensive."** Return to the cost of the problem. "Compared with the ₹8,000 a month you're losing, does ₹3,000 feel off, or is it the timing?"
- **"I need to think about it."** Ask what specifically they want to think through. Agree on a follow-up date.
- **"I need to ask my partner."** Offer a short summary they can share, and book a joint call.
- **"We tried something like this before."** Ask what went wrong. Explain specifically what you do differently, or admit it may not suit them.

Never pressure. A clear no is useful; a reluctant yes often becomes a refund.

## Step 4: Run the sprint

- Contact at least three new prospects each working day.
- Follow up every unanswered message once, after three to four days.
- Update your sheet every evening.

## Step 5: Calculate your numbers

At the end of two weeks, calculate for each channel:

- Reply rate = replies ÷ contacted
- Conversation rate = conversations ÷ contacted
- Close rate = won ÷ offers made
- Rough CAC = money spent plus your hours at a fair rate, divided by customers won

## Deliverable

Submit:

1. Your tracked sheet of thirty prospects.
2. Your conversation structure and objection responses.
3. The channel numbers above.
4. The three most common objections you heard, word for word.
5. A short note: which channel to double down on, and one change to your offer or pitch.

## Standard

Thirty prospects contacted, every one tracked. If a channel produced zero conversations, say so plainly. Knowing what does not work is part of the result.`,
        },
        {
          title: "Marketing and Sales — Knowledge Check",
          type: "QUIZ",
          minutes: 6,
          md: "Five questions on pricing, first customers and acquisition maths.",
          quiz: {
            passScore: 70,
            questions: [
              {
                prompt: "A product sells at ₹1,000 with ₹600 variable cost. After a 20% discount, how many more units must you sell to keep the same total contribution?",
                options: ["20% more", "25% more", "50% more", "100% more"],
                correct: 3,
                why: "Contribution falls from ₹400 to ₹200 per unit, so you must sell twice as many units.",
              },
              {
                prompt: "You spend ₹45,000 on a channel in a month and win 90 customers. What is the CAC?",
                options: ["₹200", "₹500", "₹900", "₹4,050"],
                correct: 1,
                why: "CAC = spend ÷ new customers = 45,000 ÷ 90 = ₹500.",
              },
              {
                prompt: "Average order ₹800, contribution margin 45%, customers place three orders on average. What is the contribution-based LTV?",
                options: ["₹360", "₹2,400", "₹1,080", "₹800"],
                correct: 2,
                why: "Contribution per order = ₹360. Three orders × ₹360 = ₹1,080.",
              },
              {
                prompt: "Why should LTV be measured on contribution rather than revenue?",
                options: [
                  "Revenue is harder to calculate",
                  "Revenue-based LTV overstates what each customer actually contributes towards costs and profit",
                  "Investors require it",
                  "Revenue does not include repeat orders",
                ],
                correct: 1,
                why: "Acquisition spend must be repaid from contribution, not from the gross amount customers pay.",
              },
              {
                prompt: "A prospect says, \"I need to think about it.\" What is the best response?",
                options: [
                  "Ask what specifically they want to think through, and agree a follow-up date",
                  "Offer an immediate 30% discount",
                  "Stop contacting them",
                  "Repeat the full pitch more forcefully",
                ],
                correct: 0,
                why: "Clarifying the real concern respects the buyer and often surfaces an objection you can answer honestly.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────
    // Module 6 — Digital business & operations
    // ─────────────────────────────────────────────────────────────────────
    {
      title: "Digital Business and Operations",
      description:
        "Set up a minimum digital storefront that converts, then design repeatable processes so the business runs without heroics.",
      objectives: [
        "Build a minimum digital storefront: one clear page, a way to enquire and a way to pay",
        "Measure a simple conversion funnel and find the stage that leaks most",
        "Map a core process from order to delivery and find its bottleneck with capacity maths",
        "Write a standard operating procedure someone else could follow",
      ],
      completion:
        "Submit a mapped order-to-delivery process with one written SOP and a bottleneck fix, and pass the knowledge check.",
      lessons: [
        {
          title: "Your Minimum Digital Storefront",
          type: "READING",
          minutes: 10,
          md: `You do not need an elaborate website to run a digital business. You need a **minimum storefront**: a place where the right customer understands your offer, trusts you enough to enquire, and can pay without friction.

## The four essentials

1. **One clear page.** A simple landing page, a link-in-bio page or a well-built catalogue on a chat business app. It must answer: what is this, who is it for, what does it cost, and how do I buy?
2. **One way to enquire.** A chat button, a short form or a phone number. One primary option beats five half-monitored ones.
3. **One way to pay.** Payment links, instant bank transfer or card checkout. Each extra step loses buyers.
4. **One local or search listing.** If customers search locally, a complete business profile on the major map and search platforms, with photos, hours and reviews, often brings more enquiries than a website.

## Anatomy of a page that converts

Structure the page in this order:

- **Headline:** your one-line positioning. "Eggless celebration cakes, designed from your photo, ready in 24 hours."
- **Who it is for and the outcome**, in two or three lines using customer phrases from your interviews.
- **Proof:** three specific testimonials, photos of real work, or numbers you can verify.
- **The offer:** what is included, price, timeline.
- **Answers to the top objections** you heard during your sales sprint.
- **One call to action**, repeated at the top and bottom: "Order on WhatsApp", "Book a 15-minute call".

Cut everything else. Mission statements and long founder stories belong further down, if anywhere.

## Measure the funnel

A funnel is the path from first visit to payment. Track each stage with simple counts:

- 1,000 people visit the page in a month.
- 2% enquire, so 20 enquiries.
- 25% of enquiries buy, so 5 sales.

Now you can see where to work. If you improve close rate from 25% to 35% — by replying faster or answering objections better — sales rise from 5 to 7 without a single extra visitor. If instead enquiries are very low, the page or the traffic is the problem, not your sales skill.

Fix the leakiest stage first. Doubling traffic into a broken page only doubles the waste.

## Build an owned audience

Platforms change their rules and reach. Keep a direct line to people who like your work: an email list or a broadcast list of customers who have opted in. Message them with useful content and occasional offers, not daily promotions. A few hundred engaged past customers is often worth more than thousands of followers.

## Simple tools first

Choose tools you will actually maintain:

- A spreadsheet before a CRM.
- A shared calendar before booking software.
- Templates for common replies before a chatbot.

Upgrade only when the manual version is clearly costing you sales or hours.

## Common mistakes

- Spending weeks on a website before you have tested the offer by hand.
- Multiple calls to action that compete for attention.
- Not replying to enquiries within hours. Speed of reply is part of your product.
- Measuring followers and likes instead of enquiries and sales.`,
        },
        {
          title: "Operations: Write the Process Before You Hire for It",
          type: "READING",
          minutes: 11,
          md: `Operations is everything that happens between a customer saying yes and that customer being happy. In a young business it lives in the founder's head. That works until you are ill, busy or growing — then quality slips and customers notice.

## Map the order-to-delivery flow

Write each step from payment to after-sale follow-up as a numbered list. For a home bakery:

1. Order and payment received.
2. Design confirmed with the customer.
3. Ingredients checked and bought.
4. Bake.
5. Cool and decorate.
6. Pack.
7. Hand to delivery partner.
8. Confirm delivery and ask for feedback.

Next to each step, write who does it, how long it takes and what usually goes wrong.

## Find the bottleneck with capacity maths

A process is only as fast as its slowest step. Find it with numbers, not instinct.

Kavya's oven bakes **4 cakes per batch**, and each batch takes **1 hour**. Across **6 usable oven hours**, that is **24 cakes a day**.

Decoration takes **30 minutes per cake**, and she has **8 hours** a day for it. That is **16 cakes a day**.

Her capacity is **16 cakes, not 24**. Buying a second oven would add nothing. Training a helper to decorate, or offering a simpler design range that takes 15 minutes per cake, would raise capacity directly.

The same logic applies to services. If client onboarding takes you four hours and you have eight free hours a week, you can start two new clients a week, however many enquiries arrive.

## Write standard operating procedures

A standard operating procedure (SOP) is a short document that lets someone do a task to your standard without asking you. A good SOP has:

- **Purpose:** why this task matters, in one line.
- **Trigger:** when it starts.
- **Steps:** numbered, one action each, with screenshots or photos where helpful.
- **Quality check:** how to know it was done right.
- **Common problems:** what to do when something goes wrong.

Write SOPs for tasks that are frequent, error-prone or blocking your growth. Start with one. Record yourself doing it, then write it up from the recording.

## Automate after you standardise

Automation multiplies whatever process you have. Automate a messy process and you get mess faster. Once a process is written and stable, look for steps that are repetitive and rule-based: payment confirmations, order acknowledgements, reminder messages, invoice generation.

## Registration and compliance

As you start taking regular orders, check what your country and city require: business registration, tax registration above certain turnover limits, food-safety or trade licences, and invoicing rules. Build compliance into the process — for example, a step that issues a proper invoice — rather than treating it as a year-end panic.

> **Educational content.** Rules on registration, tax and employment vary by country and change; confirm with a qualified professional before acting.

## Common mistakes

- Fixing the step that is most annoying rather than the one that limits output.
- Writing SOPs nobody can find. Keep them in one shared folder.
- Hiring before the process exists. A new person cannot follow instructions that are only in your head.`,
        },
        {
          title: "Map and Fix One Core Process",
          type: "ASSIGNMENT",
          minutes: 90,
          md: `You will map how your business delivers its main offer, find the step that limits your capacity, write one SOP, and remove one source of friction.

## Step 1: Map the flow (20 minutes)

Choose your main offer. List every step from the moment a customer pays to the moment they give feedback. Aim for eight to fifteen steps.

For each step, record in a table:

| Step | Who does it | Time per unit | Tools used | What goes wrong |
|---|---|---|---|---|

If you have not delivered yet, map how you intend to deliver, then revise it after your first five orders.

## Step 2: Calculate capacity (15 minutes)

For each step, calculate how many units you can complete per day or week:

**Capacity = available hours ÷ hours per unit** (or batch size × number of batches).

The step with the lowest capacity is your bottleneck. Write one sentence: "My capacity is ___ units per week, limited by ___."

Compare it with your breakeven number from Module 3. If breakeven is higher than capacity, you have found an urgent problem: raise price, reduce time per unit or add capacity at the bottleneck.

## Step 3: Write one SOP (30 minutes)

Choose the step that is frequent, error-prone or that you would hand off first. Write an SOP with:

- Purpose
- Trigger
- Numbered steps, one action each
- Quality check
- Three common problems and what to do

Give the SOP to a friend or family member and ask them to talk through how they would follow it. Every question they ask reveals a missing line. Add it.

## Step 4: Remove one friction point (20 minutes)

Pick one improvement and implement it this week. Options:

- A reply template for your five most common enquiries.
- An order form that collects all details in one go.
- An automatic payment confirmation message.
- A checklist taped next to your packing table.
- A simpler version of the offer that takes less time at the bottleneck.

Measure one number before and after: time per unit, errors per week, or reply time.

## Step 5: Check your storefront (5 minutes)

Using the funnel from the first lesson in this module, write down your current numbers for visits, enquiries and sales, even if they are small. Note which stage leaks most.

## Deliverable

Submit:

1. Your process table.
2. Capacity per step and your bottleneck sentence.
3. A comparison of capacity with breakeven volume.
4. The full SOP, including changes after the test read.
5. The friction fix, with before and after numbers.
6. Your funnel counts and the leakiest stage.

## Standard

A stranger should be able to follow your SOP without contacting you. If your friend needed to ask more than twice, revise it again.`,
        },
        {
          title: "Digital Business and Operations — Knowledge Check",
          type: "QUIZ",
          minutes: 5,
          md: "Five questions on storefronts, funnels and process design.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "A page gets 1,000 visits, 2% enquire and 25% of enquiries buy. If you raise the close rate to 35% with no other change, how many sales do you get?",
                options: ["5", "7", "10", "35"],
                correct: 1,
                why: "1,000 × 2% = 20 enquiries. 20 × 35% = 7 sales, up from 5.",
              },
              {
                prompt: "An oven bakes 24 cakes a day, but decoration can only finish 16. What should the baker do to increase output?",
                options: [
                  "Buy a second oven",
                  "Spend more on ads",
                  "Add capacity or reduce time at decoration, the bottleneck",
                  "Bake earlier in the morning",
                ],
                correct: 2,
                why: "Output is limited by the slowest step. Improving any other step adds no capacity.",
              },
              {
                prompt: "What is the right order of work for a process?",
                options: [
                  "Automate, then document, then standardise",
                  "Hire, then let the new person design the process",
                  "Map and standardise, then document, then automate",
                  "Buy software first, then design around it",
                ],
                correct: 2,
                why: "Automating an unstable process just produces errors faster.",
              },
              {
                prompt: "Which belongs on a minimum digital storefront page?",
                options: [
                  "Five different contact methods to maximise choice",
                  "A long founder story at the top",
                  "Only social media follower counts",
                  "One clear headline, proof, the offer with price, and one repeated call to action",
                ],
                correct: 3,
                why: "A converting page answers what, who, how much and how to buy, with one clear next step.",
              },
              {
                prompt: "Which section is essential in a good SOP?",
                options: [
                  "A quality check that shows the task was done right",
                  "The company's mission statement",
                  "A list of everyone's salaries",
                  "Marketing slogans",
                ],
                correct: 0,
                why: "A quality check lets someone else confirm they met your standard without asking you.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────
    // Module 7 — Financial management for founders
    // ─────────────────────────────────────────────────────────────────────
    {
      title: "Financial Management for Founders",
      description:
        "Read profit and cash as two different stories, build simple money habits, and forecast cash thirteen weeks ahead.",
      objectives: [
        "Explain why a profitable business can run out of cash, using payment terms and the cash conversion cycle",
        "Calculate runway from cash balance and monthly net burn",
        "Set up separate accounts, weekly bookkeeping, a tax reserve and a founder pay rule",
        "Build and use a thirteen-week cash flow forecast",
      ],
      completion:
        "Submit a thirteen-week cash flow forecast with your lowest-balance week and two actions to protect it, and pass the knowledge check.",
      lessons: [
        {
          title: "Profit Is an Opinion, Cash Is a Fact",
          type: "READING",
          minutes: 11,
          md: `Profit tells you whether your business model works over time. Cash tells you whether you can pay salaries on Friday. Many businesses that look profitable on paper fail because they run out of cash first.

## Why profit and cash differ

Your profit and loss statement records revenue when you earn it and costs when you incur them. Your bank account records money when it actually moves. The gap between the two is timing:

- Customers pay invoices weeks after you deliver.
- You buy stock months before you sell it.
- Suppliers may give you time to pay, or demand payment upfront.
- Large annual costs land in a single month.

## Worked example: a profitable agency that runs dry

Rohan runs a small marketing agency. Each month he invoices **₹5 lakh** and spends **₹3.5 lakh** on salaries, freelancers and tools, all paid at month end. On paper he makes **₹1.5 lakh profit** every month.

His clients pay **60 days** after invoice.

- **End of month 1:** profit ₹1.5 lakh; cash **−₹3.5 lakh** (nothing received yet).
- **End of month 2:** profit ₹3 lakh cumulative; cash **−₹7 lakh**.
- **Month 3:** the first ₹5 lakh arrives. Cash improves to **−₹5.5 lakh**.

From month 3, monthly cash flow is +₹1.5 lakh, but Rohan must fund a ₹7 lakh gap first. If he does not have it, a profitable agency misses payroll. If he grows fast, the gap grows too, because every new client adds two months of costs before paying.

## The cash conversion cycle

For product businesses, measure how long cash is tied up:

**Cash conversion cycle = days of inventory + days to collect from customers − days you take to pay suppliers.**

A clothing seller holds stock for 45 days, waits 30 days for marketplace payouts, and pays suppliers in 15 days. Cycle = 45 + 30 − 15 = **60 days**. Each rupee spent on stock returns in about two months. Shortening any part frees cash without a single extra sale.

## Runway

**Runway = cash in the bank ÷ monthly net burn.** Net burn is cash going out minus cash coming in.

With ₹6 lakh in the bank and net burn of ₹1.5 lakh a month, runway is **4 months**. Know this number every month. Decisions made with two months of runway are worse than the same decisions made with eight.

## Levers that improve cash

- **Ask for deposits.** A 50% advance on projects funds the work.
- **Shorten payment terms** and invoice the day work is delivered.
- **Follow up on overdue invoices** on a fixed schedule, politely and without embarrassment.
- **Negotiate supplier terms** once you have a payment track record.
- **Buy less stock more often**, even at a slightly higher unit cost.
- **Offer annual or quarterly prepayment** for subscriptions, in return for a modest benefit.

## Common mistakes

- Celebrating a big order without checking when the cash arrives.
- Treating the bank balance as profit. Some of it belongs to suppliers, the tax authority or next month's salaries.
- Growing faster than cash allows. Growth consumes cash before it produces it.`,
        },
        {
          title: "Money Habits: Separate Accounts, Tax Reserves and Paying Yourself",
          type: "READING",
          minutes: 10,
          md: `Good financial management in a small business is less about clever analysis and more about a few habits done every week. These habits keep you out of trouble and give you numbers you can trust.

## Habit 1: Separate business and personal money

Open a dedicated business bank account, even as a sole proprietor. All business income goes in; all business costs go out from it. You pay yourself by transferring a fixed amount to your personal account.

Mixing accounts makes it impossible to know whether the business is profitable, and it creates hours of work at tax time.

## Habit 2: Weekly bookkeeping in thirty minutes

Pick a fixed slot each week. In it:

- Record every sale and expense, or check that your software has captured them.
- Attach receipts and invoices.
- Note overdue customer invoices and send reminders.
- Check the bank balance against your forecast.

Weekly is the right frequency. Monthly becomes a dreaded backlog; daily becomes a distraction.

## Habit 3: Read a simple monthly profit and loss

At month end, lay out five lines:

| Line | ₹ |
|---|---|
| Revenue | 4,00,000 |
| Variable costs | 2,20,000 |
| **Contribution** (45%) | **1,80,000** |
| Fixed costs (including your salary) | 1,20,000 |
| **Operating profit** | **60,000** |

Then ask three questions. Did contribution margin hold, or did discounts and costs erode it? Did fixed costs creep up? Is profit trending up or down over three months? Trends matter more than any single month.

## Habit 4: Reserve for tax as you go

Taxes on profit and indirect taxes collected on sales, such as GST in India or VAT elsewhere, are often paid after the money has arrived in your account. That money is not yours to spend.

Set up a separate savings account. Each time a payment arrives, move the indirect tax portion and a percentage of profit into it. Ask an accountant what percentage fits your situation, then automate the transfer.

## Habit 5: Pay yourself on a rule

Decide a fixed monthly founder salary the business can sustain, and treat it as a fixed cost. If profits grow, review it quarterly, not whenever you feel short. Paying yourself unpredictably makes both your personal life and your business numbers unreliable.

## Habit 6: Keep an operating reserve

Build a buffer equal to at least two to three months of fixed costs before you take extra profit out. A reserve turns a late client payment from a crisis into an inconvenience.

## When to get professional help

Bring in a qualified accountant early, especially for registration, tax filings and invoicing rules. A few hours of advice at the start costs far less than correcting a year of errors.

> **Educational content.** Rules on registration, tax and employment vary by country and change; confirm with a qualified professional before acting.

## Common mistakes

- Paying personal expenses from the business account "just this once".
- Spending collected tax as if it were revenue.
- Looking at revenue only, never contribution and profit.
- Skipping bookkeeping during busy weeks — exactly when errors multiply.`,
        },
        {
          title: "Build a Thirteen-Week Cash Flow Forecast",
          type: "ASSIGNMENT",
          minutes: 90,
          md: `A thirteen-week forecast covers one quarter, week by week. It is short enough to be accurate and long enough to spot trouble before it arrives. You will build one for your business or planned business.

## Step 1: Set up the sheet (10 minutes)

Create a spreadsheet with weeks 1 to 13 as columns. Rows, in order:

1. **Opening cash** — the bank balance at the start of the week.
2. **Cash in** — one row per source: customer payments, deposits, other income.
3. **Total cash in.**
4. **Cash out** — one row per category: suppliers and stock, salaries and freelancers, rent, software, marketing, loan repayments, tax payments, founder salary.
5. **Total cash out.**
6. **Net cash flow** = total in − total out.
7. **Closing cash** = opening cash + net cash flow. This becomes next week's opening cash.

## Step 2: Fill in cash in (25 minutes)

Use when money will **arrive**, not when you will invoice.

- List confirmed orders and invoices with their expected payment dates.
- Apply your real collection pattern. If clients usually pay 30 days late, put the cash 30 days after the due date.
- For new sales, use conservative numbers from your sales sprint. If you closed two customers in two weeks, do not forecast ten a week.

## Step 3: Fill in cash out (25 minutes)

Use when money will **leave**.

- Regular costs on their actual payment dates.
- Irregular costs: annual subscriptions, equipment, insurance, tax payments due this quarter.
- Your founder salary as a fixed weekly or monthly amount.
- A small contingency line, roughly 5% of weekly costs, for things you have forgotten.

## Step 4: Find the danger week (10 minutes)

Highlight the week with the lowest closing cash. Write it down:

"My lowest balance is ₹___ in week ___."

If it is negative, or below one month of fixed costs, you have found a problem while there is still time to act.

## Step 5: Plan two actions (15 minutes)

Choose at least two levers and model them in a copy of the sheet:

- Request deposits on new work.
- Move a large purchase to a later week.
- Chase specific overdue invoices.
- Negotiate longer terms with one supplier.
- Pause a marketing cost that is not producing customers.

Show the lowest balance before and after the changes.

## Step 6: Make it a habit (5 minutes)

Each week, replace the forecast numbers for the week just finished with actual numbers, and add a new week 13. Put a recurring reminder in your calendar.

## Deliverable

Submit:

1. Your thirteen-week sheet.
2. The lowest-balance week and amount.
3. Two actions, modelled, with the new lowest balance.
4. One sentence on your current runway in months.

## Standard

Every cash-in line has a date based on real payment behaviour, not on invoice dates. If your forecast shows only rising balances, check again — most first forecasts are too optimistic about timing.`,
        },
        {
          title: "Financial Management — Knowledge Check",
          type: "QUIZ",
          minutes: 6,
          md: "Five questions on cash, profit and founder money habits.",
          quiz: {
            passScore: 70,
            questions: [
              {
                prompt: "An agency invoices ₹5 lakh a month, pays ₹3.5 lakh in costs at month end, and is paid 60 days after invoice. What is its cash position at the end of month 2, starting from zero?",
                options: ["+₹3 lakh", "−₹3.5 lakh", "−₹7 lakh", "+₹1.5 lakh"],
                correct: 2,
                why: "Two months of costs (₹7 lakh) have been paid and no client payment has arrived yet, even though the agency is profitable on paper.",
              },
              {
                prompt: "A seller holds stock for 45 days, waits 30 days for payouts and pays suppliers in 15 days. What is the cash conversion cycle?",
                options: ["90 days", "60 days", "30 days", "15 days"],
                correct: 1,
                why: "45 + 30 − 15 = 60 days.",
              },
              {
                prompt: "You have ₹6 lakh in the bank and a monthly net burn of ₹1.5 lakh. What is your runway?",
                options: ["1.5 months", "6 months", "9 months", "4 months"],
                correct: 3,
                why: "Runway = cash ÷ monthly net burn = 6 ÷ 1.5 = 4 months.",
              },
              {
                prompt: "Why should indirect tax collected on sales be moved to a separate account?",
                options: [
                  "It earns higher interest",
                  "It is owed to the tax authority, so it is not money the business can spend",
                  "Banks require it",
                  "It increases contribution margin",
                ],
                correct: 1,
                why: "Collected tax passes through your account but belongs elsewhere. Separating it prevents spending money you owe.",
              },
              {
                prompt: "In a cash flow forecast, when should a customer payment appear?",
                options: [
                  "On the date you send the invoice",
                  "On the date you deliver the work",
                  "On the date the money is realistically expected to arrive, based on past payment behaviour",
                  "At the end of the quarter",
                ],
                correct: 2,
                why: "Cash forecasts track money movement, not invoices. Using real payment behaviour keeps the forecast honest.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────
    // Module 8 — Team building, leadership, scaling and strategy
    // ─────────────────────────────────────────────────────────────────────
    {
      title: "Team, Leadership, Scaling and Strategy",
      description:
        "Make your first hire well, lead a small team without becoming the bottleneck, and decide what to grow and what to ignore.",
      objectives: [
        "Use a time audit to decide what to delegate and when a first hire pays for itself",
        "Write a role scorecard and run a paid trial instead of hiring on interviews alone",
        "Lead a small team with clear outcomes, a weekly rhythm and direct feedback",
        "Write a one-page strategy that tests scaling readiness and names what you will not do",
      ],
      completion:
        "Submit a one-page strategy with a scaling readiness check and a delegation plan, and pass the knowledge check.",
      lessons: [
        {
          title: "Your First Hire: What to Delegate and When",
          type: "READING",
          minutes: 11,
          md: `Your first hire is less about finding talent and more about deciding **which work should no longer be yours.** Get that wrong and you hire someone to do tasks that do not matter, while you stay buried in the ones that do.

## Start with a time audit

For two weeks, log your working time in 30-minute blocks. Then sort every task into four groups:

- **Only you can do it** — key client relationships, strategy, final quality decisions.
- **You do it well, others could learn it** — sales calls, product development.
- **Someone else would do it as well or better** — bookkeeping, scheduling, packing, social media posting, customer support replies.
- **Should not be done at all** — reports nobody reads, meetings without decisions.

Delete the last group first. Then look at the third group: that is your first hire's job.

## Does the hire pay for itself?

Run the numbers before you post a role.

Sneha runs a design studio. Her time audit shows **10 hours a week** on invoicing, scheduling and file management. A part-time assistant at ₹300 an hour would cost about **₹13,000 a month** (10 hours × 4.3 weeks × ₹300).

Sneha bills client work at ₹2,000 an hour. If she turns even **half** of the freed hours into billable work — about 21 hours a month — that is roughly **₹43,000** of extra revenue.

The hire pays for itself only if two things are true: there is demand to fill those hours, and Sneha actually uses them for revenue work instead of absorbing them into busywork. Check both before hiring.

## Contractor, part-time or full-time?

- **Freelancer or contractor:** best for defined, variable work — design, accounting, development projects. Low commitment, less control.
- **Part-time employee:** steady, recurring work that is not yet full-time.
- **Full-time employee:** core work the business will need for years, where training and loyalty matter.

How a role is classified affects tax, contracts and employee rights. Do not label someone a contractor just to avoid obligations.

## Write a scorecard, not a job description

A scorecard defines success:

- **Mission:** one sentence on why the role exists.
- **Outcomes:** three to five measurable results for the first ninety days. "All invoices sent within one working day of delivery."
- **Competencies:** the skills and behaviours needed to achieve those outcomes.

Interview against the outcomes, then run a **short paid trial task** that mirrors the real work. Trials reveal far more than conversation.

## Onboard with your SOPs

The SOPs from Module 6 become the new person's training manual. Plan the first two weeks: what they will learn, who answers questions, and what they will own by day 30. Many early hires struggle because nobody prepared their first week, not because they lacked ability.

> **Educational content.** Rules on registration, tax and employment vary by country and change; confirm with a qualified professional before acting.

## Common mistakes

- Hiring a friend because it feels safe, without a scorecard.
- Hiring for tasks you have never done yourself, so you cannot judge quality.
- Delegating the task but not the decision, then checking every step.`,
        },
        {
          title: "Leading a Small Team Without Becoming the Bottleneck",
          type: "READING",
          minutes: 10,
          md: `In a team of three to ten, leadership is not about inspiring speeches. It is about making sure everyone knows what matters, has what they need, and hears honestly how they are doing — without every decision flowing through you.

## Clarity comes first

Each person should be able to answer three questions without asking you:

1. **What outcomes am I responsible for?**
2. **How will we know if I am succeeding?**
3. **What can I decide on my own?**

Write the answers down for each role. Ambiguity is one of the most common causes of conflict in small teams, and removing it is the leader's job.

## Set decision rights

Use three simple levels:

- **Decide and act** — they decide and tell you later if useful. Example: replying to routine customer questions, refunds under ₹1,000.
- **Decide and inform** — they decide, then tell you promptly. Example: choosing a supplier within budget.
- **Recommend** — they propose, you decide. Example: price changes, hiring.

Move decisions down a level as people prove judgement. If everything still sits with you after six months, you are the bottleneck.

## A weekly rhythm

A short, predictable rhythm replaces dozens of interruptions:

- **Weekly team meeting, 30 to 45 minutes.** Review three to five key numbers (sales, enquiries, delivery time, cash), each person's top priorities, and blockers. End with written decisions and owners.
- **One-to-one meetings, 20 to 30 minutes every one or two weeks.** Their agenda first: what is going well, what is hard, what they need. Then yours.
- **Monthly review.** Compare results with goals and adjust priorities.

Keep the same day and time. Consistency builds trust.

## Give direct, useful feedback

Use a simple structure: **situation, behaviour, impact, next step.**

"In yesterday's client call (situation), you promised delivery by Friday without checking the schedule (behaviour). We now have to delay two other orders (impact). Next time, check the production sheet before confirming dates (next step)."

Give positive feedback with the same specificity. "Good job" teaches nothing; "your reply turned an angry customer into a repeat order — that's how I want complaints handled" teaches a lot.

Give feedback within a day or two, privately for corrections. Waiting for a quarterly review lets small problems grow.

## Lead by standards, not by mood

Your team watches what you tolerate. If you say quality matters but ship a rushed order to hit a target, they learn the real rule. Protect the brand promise from Module 4 in your own decisions, especially under pressure.

## Common mistakes

- Doing the work yourself because "it's faster". It is faster once and slower forever.
- Cancelling one-to-ones when busy. They matter most in busy weeks.
- Avoiding hard conversations until frustration leaks out in tone.
- Measuring effort instead of outcomes. Hours online are not results.`,
        },
        {
          title: "Write Your One-Page Strategy and Scaling Plan",
          type: "ASSIGNMENT",
          minutes: 90,
          md: `Strategy is a set of choices about **where you will play, how you will win, and what you will not do.** Scaling is growing what already works without breaking it. This final assignment pulls the whole programme into one page.

## Part A: Test scaling readiness (20 minutes)

Before you push for growth, check five conditions. Mark each as yes, partly or no, with evidence from earlier modules:

1. **Unit economics work after acquisition.** Contribution per customer, including repeat orders, is comfortably above CAC (Modules 3 and 5).
2. **At least one channel is repeatable.** You can predict roughly how many customers it brings per rupee or per hour (Module 5).
3. **Delivery is documented.** Core processes have SOPs and you know your bottleneck (Module 6).
4. **Cash can fund growth.** Your forecast shows you can pay for growth before it pays you back (Module 7).
5. **Someone other than you can run daily work.** Or you have a plan to make it so (this module).

Growth consumes cash. Suppose each new customer costs ₹500 to acquire and needs ₹1,000 of stock before their first order. Adding 100 new customers a month ties up **₹1.5 lakh** before any of them pays. Run this calculation with your own numbers.

If two or more conditions are "no", your strategy for the next quarter is to fix them, not to grow faster.

## Part B: Write the one-page strategy (40 minutes)

Use these headings:

- **Where we play:** the customer group, geography and offer you will focus on for the next twelve months.
- **How we win:** your positioning and the one or two capabilities you will invest in — speed, specialisation, service depth, cost.
- **What we will not do:** at least three explicit exclusions. "We will not sell to large enterprises." "We will not add a second product line this year." Exclusions are what make a strategy real.
- **Three goals for twelve months:** measurable — revenue, contribution margin, repeat rate, delivery time.
- **Quarterly milestones:** what must be true at the end of each quarter.
- **Key risks:** the two things most likely to derail the plan, and your early warning signs.

## Part C: Delegation plan (20 minutes)

From your time audit, list:

- Tasks to stop doing entirely.
- Tasks to delegate in the next ninety days, with who will take them.
- The first role to hire or contract, with a three-outcome scorecard.

## Part D: Review it with someone (10 minutes plus a conversation)

Share the page with a mentor, peer founder or advisor. Ask: "What looks unrealistic? What am I avoiding?" Record their two strongest challenges and your response.

## Deliverable

Submit:

1. The five-condition readiness check with evidence.
2. Your growth cash calculation.
3. The one-page strategy.
4. The delegation plan and scorecard.
5. The reviewer's challenges and your response.

## Standard

A good strategy page makes some opportunities clearly off-limits. If nothing is excluded, keep cutting. Revisit this page every quarter and update it with real results.`,
        },
        {
          title: "Team, Leadership and Strategy — Knowledge Check",
          type: "QUIZ",
          minutes: 6,
          md: "Five questions on hiring, leading and choosing what to grow.",
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "After a time audit, which tasks should you remove first?",
                options: [
                  "Tasks only you can do",
                  "Tasks that should not be done at all",
                  "Sales calls",
                  "Strategy work",
                ],
                correct: 1,
                why: "Delete low-value work before delegating it. Delegating useless tasks just moves waste to someone else.",
              },
              {
                prompt: "What makes a role scorecard more useful than a generic job description?",
                options: [
                  "It lists more required qualifications",
                  "It is longer",
                  "It defines measurable outcomes for the first ninety days",
                  "It avoids mentioning pay",
                ],
                correct: 2,
                why: "Outcomes let you interview, trial and evaluate against what success actually looks like.",
              },
              {
                prompt: "A team member wants to approve a ₹500 refund for a delayed order. Under well-set decision rights, this is most likely:",
                options: [
                  "A decision they should make and act on",
                  "Something only the founder can approve",
                  "A topic for the monthly review",
                  "A reason to change the refund policy",
                ],
                correct: 0,
                why: "Small, routine decisions should sit with the person closest to the customer, so the founder does not become the bottleneck.",
              },
              {
                prompt: "Each new customer costs ₹500 to acquire and needs ₹1,000 of stock before their first order. How much cash does adding 100 customers in a month tie up?",
                options: ["₹50,000", "₹1,00,000", "₹1,50,000", "₹15,00,000"],
                correct: 2,
                why: "100 × (₹500 + ₹1,000) = ₹1,50,000, spent before those customers pay.",
              },
              {
                prompt: "Which element makes a strategy genuinely a strategy?",
                options: [
                  "An inspiring vision statement",
                  "A long list of opportunities to pursue",
                  "A new logo",
                  "Explicit choices about what you will not do",
                ],
                correct: 3,
                why: "Strategy is choice. Without exclusions, every opportunity competes for the same limited time and cash.",
              },
            ],
          },
        },
      ],
    },
  ],

  finalAssessment: {
    passScore: 75,
    intro:
      "Twelve questions across all eight modules: opportunity, research, models, positioning, selling, operations, finance and leadership. Several need quick arithmetic, so keep a calculator nearby. You need 75% to pass.",
    questions: [
      {
        prompt: "Which offer sentence is complete enough to be evaluated and bought?",
        options: [
          "Affordable digital solutions for growing brands",
          "I help dental clinics get 15 more reviews a month through an automated post-visit request, for ₹4,000 a month",
          "Contact us for a custom quote",
          "We are passionate about quality",
        ],
        correct: 1,
        why: "It names who, outcome, mechanism, timeframe and price. Module 1.",
      },
      {
        prompt: "When scoring opportunities, which evidence justifies a high willingness-to-pay score?",
        options: [
          "The market is described as large",
          "Friends said they would probably buy",
          "People already spend money on the problem today",
          "You find the problem personally interesting",
        ],
        correct: 2,
        why: "Current spending is evidence; opinions and size claims are not. Module 1.",
      },
      {
        prompt: "In a customer interview, which question produces the most reliable evidence?",
        options: [
          "Walk me through the last time this problem happened and what you did.",
          "How much would you pay for this?",
          "Would you recommend this to friends?",
          "Don't you think this is frustrating?",
        ],
        correct: 0,
        why: "Past behaviour is evidence. Hypotheticals and leading questions produce polite noise. Module 2.",
      },
      {
        prompt: "A service can reach 2,000 people. One in four buys this kind of service, and you expect to win 10% of buyers at ₹2,000 a month. What is the monthly revenue ceiling?",
        options: ["₹40,000", "₹1,00,000", "₹4,00,000", "₹10,00,000"],
        correct: 1,
        why: "2,000 ÷ 4 = 500 buyers; 10% = 50 customers; 50 × ₹2,000 = ₹1,00,000. Module 2.",
      },
      {
        prompt: "A product sells for ₹1,200 with variable costs of ₹720. Fixed costs are ₹96,000 a month. What is breakeven volume?",
        options: ["80 units", "133 units", "200 units", "480 units"],
        correct: 2,
        why: "Contribution = 1,200 − 720 = ₹480. Breakeven = 96,000 ÷ 480 = 200 units. Module 3.",
      },
      {
        prompt: "What does a strong positioning statement name that a slogan usually does not?",
        options: [
          "The founder's background",
          "The brand colours",
          "The competitive alternative customers would otherwise use, and how you differ",
          "The company's legal structure",
        ],
        correct: 2,
        why: "Positioning sets the comparison customers make. Module 4.",
      },
      {
        prompt: "Price ₹1,000, variable cost ₹600. What happens to contribution per unit if you raise the price by 10%?",
        options: [
          "It rises by 10%",
          "It rises by 25%",
          "It stays the same",
          "It falls because fewer people buy",
        ],
        correct: 1,
        why: "Contribution rises from ₹400 to ₹500, a 25% increase. Module 5.",
      },
      {
        prompt: "CAC is ₹600. Each order contributes ₹300 and customers place four orders on average. Which statement is correct?",
        options: [
          "LTV is ₹1,200 and the first order alone recovers CAC",
          "LTV is ₹300 so the channel loses money",
          "LTV cannot be calculated without revenue",
          "LTV is ₹1,200 and CAC is recovered on the second order",
        ],
        correct: 3,
        why: "LTV = 4 × ₹300 = ₹1,200, a 2:1 ratio. Two orders contribute ₹600, which repays CAC. Module 5.",
      },
      {
        prompt: "Step A can process 30 orders a day, step B 18 and step C 25. What is the daily capacity of the process?",
        options: ["18", "25", "30", "73"],
        correct: 0,
        why: "A process is limited by its slowest step, the bottleneck. Module 6.",
      },
      {
        prompt: "A business is profitable every month but keeps struggling to pay salaries. What is the most likely cause?",
        options: [
          "Its logo is outdated",
          "Customers pay long after delivery, so cash arrives later than costs go out",
          "It has too few social media followers",
          "Its contribution margin is too high",
        ],
        correct: 1,
        why: "Profit and cash differ because of timing. Long collection periods drain cash even when profit is positive. Module 7.",
      },
      {
        prompt: "Before making a first hire to take over admin work, what must be true for the hire to pay for itself?",
        options: [
          "The hire must be a friend you trust",
          "The hire must work full-time",
          "There is demand to fill your freed hours, and you will actually use them for revenue work",
          "You must stop tracking your time",
        ],
        correct: 2,
        why: "Freed time only creates value if it turns into revenue or growth work. Module 8.",
      },
      {
        prompt: "Your readiness check shows unit economics are negative after acquisition and delivery is undocumented. What should next quarter's strategy focus on?",
        options: [
          "Doubling ad spend to grow quickly",
          "Fixing unit economics and documenting delivery before pushing growth",
          "Launching a second product line",
          "Hiring a large sales team",
        ],
        correct: 1,
        why: "Scaling a model that loses money per customer, or that relies on undocumented processes, magnifies the problems. Module 8.",
      },
    ],
  },
};
