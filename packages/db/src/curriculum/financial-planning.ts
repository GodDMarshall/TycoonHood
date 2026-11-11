import type { Programme } from "./types";

/**
 * FINANCIAL PLANNING & INVESTMENT — launch curriculum.
 * Financial literacy and informed decision-making. Educational only; not regulated advice.
 * All return rates in examples are hypothetical and labelled as such.
 */

const DISCLAIMER =
  "> **Educational content, not financial advice.** Tycoonhood is not a registered investment adviser. Tax rules and product terms change; consult a SEBI-registered adviser or other qualified professional before making decisions.";

export const financialPlanning: Programme = {
  slug: "financial-planning-investment-advisory",
  modules: [
    // ─────────────────────────────────────────────────────────────
    // MODULE 1
    // ─────────────────────────────────────────────────────────────
    {
      title: "Personal Finance Foundations",
      description: "See your money clearly: what comes in, what goes out, what you keep and what you own.",
      objectives: [
        "Explain the boundary between financial education and personal financial advice.",
        "Calculate your monthly In, Out and Kept numbers and your savings rate.",
        "Build a personal balance sheet that shows your net worth.",
        "Distinguish needs, wants and obligations in your own spending.",
      ],
      completion: "Submit a personal balance sheet and a first month of In, Out and Kept numbers.",
      lessons: [
        {
          title: "You Cannot Allocate What You Cannot See",
          type: "READING",
          preview: true,
          minutes: 10,
          md: `${DISCLAIMER}

Every sophisticated financial strategy sits on one boring foundation: **knowing your numbers.** Most people try to optimise investments they cannot fund, because they never measured the leak.

## What this programme is, and is not

This programme teaches how money generally works. It explains budgeting, debt, insurance, compounding and investing so that you can make informed decisions and spot nonsense when someone tries to sell it to you.

It does not tell you what to buy. It cannot see your income, your family, your tax position or your goals. A licensed professional who can see those things is the right person for a personal recommendation. In India, that usually means a SEBI-registered investment adviser for investments, and a qualified tax professional for tax. You will see a short notice at the top of many lessons. It means exactly this: education, not advice.

## Three numbers, every month

1. **In** — everything that arrived after tax and deductions. Salary credited, freelance payments, rent received, interest.
2. **Out** — everything that left. Group it into five buckets at most: housing, food, transport, obligations (EMIs, insurance premiums, school fees) and life (everything else).
3. **Kept** — In minus Out.

Divide Kept by In and you have your **savings rate**. This is the single most useful number in personal finance. Not your income. Not your returns. The rate at which you keep.

## A worked example

Meera's take-home pay is ₹80,000 a month. She tracks one month:

| Bucket | Amount |
|---|---|
| Housing (rent, utilities) | ₹24,000 |
| Food (groceries, eating out) | ₹14,000 |
| Transport | ₹6,000 |
| Obligations (phone EMI, premium) | ₹8,000 |
| Life (shopping, subscriptions, gifts) | ₹16,000 |
| **Out** | **₹68,000** |

Kept is ₹12,000. Her savings rate is 12,000 ÷ 80,000 = **15%**.

Now look at the "life" bucket. When Meera checks it line by line, she finds ₹4,500 of subscriptions and delivery fees she does not remember choosing. Cutting half of that lifts her savings rate to nearly 18% without a raise.

## Why the rate matters more than the amount

Two people earn ₹1,00,000 a month. One keeps 5%, the other keeps 25%. After a year, the first has ₹60,000 set aside. The second has ₹3,00,000. The second person can absorb a job loss, clear a debt or start investing. The first cannot. Same income, different trajectory.

A higher income with a low savings rate often feels richer and is more fragile. Spending rises to meet income unless you decide otherwise.

## The 30-day ledger

For one month, record every rupee that moves. Use an app, a spreadsheet or a notebook. The tool is irrelevant; the habit is everything. Records beat impressions.

Most people find spending they did not consciously choose. That money funds everything in the rest of this programme: the buffer, the debt payoff and the investing.

## Your next step

Start the ledger today, not on the first of the month. Write down your best guess of In, Out and Kept now. In 30 days, compare the guess to the record. The gap between the two is your first lesson.`,
        },
        {
          title: "Net Worth: The Balance Sheet of You",
          type: "READING",
          minutes: 10,
          md: `${DISCLAIMER}

Cashflow tells you how money moves each month. **Net worth** tells you where you stand. You need both. A healthy cashflow with a sinking net worth means something is leaking. A rising net worth with fragile cashflow means one bad month can undo a year.

## The formula

**Net worth = what you own − what you owe.**

What you own (assets) includes bank balances, fixed deposits, provident fund balances such as EPF or PPF, mutual fund units, shares, gold, and the realistic resale value of property or a vehicle. What you owe (liabilities) includes the outstanding principal on every loan and every credit card balance.

## A worked example

Arjun is 29. His list:

| Assets | Value |
|---|---|
| Savings account | ₹85,000 |
| Fixed deposit | ₹1,50,000 |
| EPF balance | ₹3,20,000 |
| Mutual fund units | ₹1,10,000 |
| Two-wheeler (resale) | ₹45,000 |
| **Total assets** | **₹7,10,000** |

| Liabilities | Outstanding |
|---|---|
| Education loan | ₹2,80,000 |
| Credit card balance | ₹38,000 |
| Phone on EMI | ₹22,000 |
| **Total liabilities** | **₹3,40,000** |

Net worth: ₹7,10,000 − ₹3,40,000 = **₹3,70,000**.

## Three rules for an honest balance sheet

1. **Use resale value, not purchase price.** A phone bought for ₹60,000 is not worth ₹60,000 a year later. Vehicles and gadgets lose value; count what someone would pay you today.
2. **Use outstanding principal, not EMIs.** The liability is what you would need to close the loan today, not the monthly instalment.
3. **Separate liquid from illiquid.** EPF and property are real assets, but you cannot use them next week. Mark which assets you can reach within seven days. That subset is what protects you in an emergency.

In Arjun's case, only ₹2,35,000 (savings plus the fixed deposit) is liquid. His net worth looks comfortable; his liquid position is thinner.

## Needs, wants and obligations

Your balance sheet improves in only two ways: assets grow, or liabilities shrink. Both are funded by what you keep each month. So the next question is where the Out goes.

- **Needs** keep you housed, fed, healthy and employed.
- **Obligations** are contracts you have already signed: EMIs, premiums, fees. You cannot cut them this month, but you can stop adding new ones.
- **Wants** are everything else. They are not bad. They are simply the only bucket you can change quickly.

A useful test: if this payment stopped tomorrow, what would actually break? If the answer is "nothing important", it is a want.

## Track the trend, not the number

Your net worth today matters less than its direction. Recalculate it every quarter on the same date with the same rules. A rising line over twelve quarters is a sign the system works. A flat or falling line tells you to look at the savings rate and the debt list before anything else.

Net worth can be negative early in a career, especially with an education loan. That is a starting point, not a verdict. What matters is that each quarter it moves the right way.`,
        },
        {
          title: "Assignment: Build Your Personal Balance Sheet",
          type: "ASSIGNMENT",
          xp: 75,
          minutes: 45,
          md: `${DISCLAIMER}

Your assignment is to produce **a one-page personal balance sheet and a first cashflow snapshot.** This document becomes the baseline you measure every later module against.

## Step 1: List your assets

Open every account you have. Write down each asset with its current value on today's date:

- Bank balances, including small forgotten accounts.
- Fixed and recurring deposits.
- Retirement balances such as EPF, PPF or NPS, from the latest statement.
- Mutual fund units and shares, at today's value.
- Gold, at a realistic resale price.
- Vehicles and property, at resale value, not purchase price.

Mark each asset **L** (liquid within seven days) or **I** (illiquid).

## Step 2: List your liabilities

For every loan and card, record three things: outstanding principal, interest rate and monthly payment. If you do not know the rate, find it in the loan statement or app. Not knowing your rates is common. It is also the first thing to fix, because Module 3 depends on it.

## Step 3: Calculate

- Total assets.
- Total liabilities.
- Net worth (assets − liabilities).
- Liquid assets (sum of everything marked L).

## Step 4: First cashflow snapshot

Use your last full month of bank and card statements. Do not guess. Sort every outflow into the five buckets: housing, food, transport, obligations, life. Then calculate:

- In (take-home income).
- Out (sum of the five buckets).
- Kept (In − Out).
- Savings rate (Kept ÷ In, as a percentage).

## Step 5: Three observations

Write three sentences, one each:

1. The bucket that surprised you most, and by how much.
2. One want you will reduce next month, with a rupee figure.
3. Whether your liquid assets would cover one month of Out.

## Worked sample

A completed sample might read: "Assets ₹7,10,000. Liabilities ₹3,40,000. Net worth ₹3,70,000. Liquid ₹2,35,000. In ₹62,000, Out ₹55,800, Kept ₹6,200, savings rate 10%. Surprise: eating out was ₹9,400, not the ₹5,000 I guessed. Next month I will cap delivery at ₹4,000, saving about ₹5,000. Liquid assets cover about four months of Out."

## Deliverable

Submit one page (a spreadsheet tab or a document) containing:

1. The asset table with L/I marks.
2. The liability table with principal, rate and payment.
3. The four calculated totals.
4. The cashflow snapshot with savings rate.
5. Your three observations.

## Standard

Every number should come from a statement or an app, not memory. Round to the nearest hundred rupees. Date the page. You will redo this exact page at the end of the programme, and the difference between the two versions is the real measure of what you learned.

Keep the file private. It contains sensitive information. Share figures only if you are comfortable, and never share account numbers or login details with anyone, including Tycoonhood.`,
        },
        {
          title: "Personal Finance Foundations — Knowledge Check",
          type: "QUIZ",
          minutes: 8,
          md: "Check the core ideas: cashflow, savings rate, net worth and the boundary between education and advice.",
          quiz: {
            passScore: 70,
            questions: [
              {
                prompt: "Your take-home pay is ₹60,000 and you spend ₹51,000. What is your savings rate?",
                options: ["9%", "15%", "18%", "85%"],
                correct: 1,
                why: "Kept is ₹9,000. ₹9,000 ÷ ₹60,000 = 15%. The savings rate is Kept divided by In.",
              },
              {
                prompt: "Which value should you use for a car on your personal balance sheet?",
                options: [
                  "The price you paid for it",
                  "The on-road price of a new one today",
                  "A realistic resale value today",
                  "The total of the loan EMIs you paid",
                ],
                correct: 2,
                why: "A balance sheet shows what you could actually turn the asset into today. Purchase price overstates depreciating assets.",
              },
              {
                prompt: "Net worth is best described as:",
                options: [
                  "Your annual income after tax",
                  "Total assets minus total liabilities",
                  "Your liquid savings only",
                  "Assets plus monthly savings",
                ],
                correct: 1,
                why: "Net worth is what you own minus what you owe. Income and savings feed it, but they are not the same number.",
              },
              {
                prompt: "Why does this programme separate education from advice?",
                options: [
                  "Because investing is too risky for most people",
                  "Because general lessons cannot account for your specific income, family, tax and goals",
                  "Because advisers are always better informed than members",
                  "Because the law forbids discussing money online",
                ],
                correct: 1,
                why: "Education explains how things generally work. A personal recommendation needs someone who can see your full situation and is licensed to advise.",
              },
              {
                prompt: "Two people earn the same salary. Which factor most explains why one builds wealth faster?",
                options: ["Their bank", "Their savings rate", "Their credit card limit", "Their tax bracket"],
                correct: 1,
                why: "With equal income, the share each person keeps decides how much they can save, repay and invest.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // MODULE 2
    // ─────────────────────────────────────────────────────────────
    {
      title: "Budgeting and Saving",
      description: "Turn your numbers into a plan that runs automatically, so saving no longer depends on willpower.",
      objectives: [
        "Compare common budgeting methods and choose one that fits your income pattern.",
        "Build a 90-day spending ledger and identify recurring leaks.",
        "Design a pay-yourself-first system with automated transfers.",
        "Set savings targets tied to specific goals and dates.",
      ],
      completion: "Submit a 90-day spending ledger summary and a written allocation plan with automation steps.",
      lessons: [
        {
          title: "Budgeting Methods That Survive Real Life",
          type: "READING",
          minutes: 10,
          md: `${DISCLAIMER}

A budget is not a punishment. It is a decision made once, in advance, so that you do not have to make it again every time you open a shopping app. The best method is the one you will still be using in six months.

## Method 1: The percentage split

Divide take-home pay into a few fixed shares. A commonly taught version is 50/30/20: half to needs, 30% to wants, 20% to saving and debt repayment. Treat these as a starting template, not a rule. In a high-rent city, needs may take 60%. That is fine, as long as you know it and the saving share is protected.

On ₹70,000 take-home, a 50/30/20 split is:

- Needs: ₹35,000
- Wants: ₹21,000
- Saving and extra debt repayment: ₹14,000

## Method 2: Zero-based budgeting

Give every rupee a job before the month starts, until income minus allocations equals zero. Saving is one of the jobs. This method is precise and suits people who like detail or whose finances are tight. It takes more time each month.

## Method 3: Pay yourself first

Decide one number: what you save. Move it out on payday. Spend the rest freely. This is the lowest-effort method and often the most effective, because it protects the saving share without tracking every expense. It works best once your ledger has shown you that the remainder truly covers your needs.

## Irregular income

Freelancers, business owners and commission earners need one extra layer. Estimate a conservative "base month" from your lowest three months of the past year. Pay yourself that fixed amount from a holding account. In good months, the surplus stays in the holding account and tops up lean months. Once the holding account covers three base months, the excess goes to saving goals.

Example: Kabir's income over a year ranged from ₹40,000 to ₹1,60,000 a month. His lowest three months averaged ₹48,000. He pays himself ₹48,000 every month. A ₹1,20,000 month adds ₹72,000 to the holding account instead of to his lifestyle.

## The leaks that matter

Small recurring costs compound the same way investments do, in reverse. A ₹499 subscription you no longer use costs ₹5,988 a year. Four of them cost about ₹24,000. Common leaks:

- Subscriptions and auto-renewals.
- Delivery fees and convenience charges.
- Bank charges from missed minimum balances.
- Late fees and interest from paying cards after the due date.
- Insurance or memberships duplicated across family members.

## Sinking funds

Some costs are certain but not monthly: annual premiums, school fees, festivals, vehicle servicing, travel. If you ignore them, they arrive as "emergencies" and land on a credit card. Instead, add them up for the year and divide by twelve.

If your annual irregular costs are ₹96,000, set aside ₹8,000 a month in a separate account. When the bill comes, the money is waiting. This one habit removes a large share of what people describe as unexpected expenses.

## Choosing your method

- If you have never tracked spending, start with the ledger plus pay-yourself-first.
- If money is tight and every rupee matters, use zero-based.
- If you want a simple guardrail, use a percentage split.

Whichever you choose, the saving happens first and automatically. A budget that relies on what is "left over" at month end usually leaves nothing over.`,
        },
        {
          title: "Assignment: Build a 90-Day Spending Ledger",
          type: "ASSIGNMENT",
          xp: 75,
          minutes: 60,
          md: `${DISCLAIMER}

One month of data can mislead you. A wedding, a medical bill or a festival can distort it. Three months shows the pattern. Your assignment is to **build a 90-day spending ledger and use it to set a realistic budget.**

## Step 1: Gather the data

Download the last three months of statements for every bank account, credit card and wallet you use. If you started the 30-day ledger in Module 1, include it. Cash withdrawals count; note what the cash was mostly spent on.

## Step 2: Categorise every transaction

Use these categories, or close variants:

| Category | Type |
|---|---|
| Rent / housing EMI | Need |
| Utilities and phone | Need |
| Groceries | Need |
| Transport | Need |
| Insurance premiums | Obligation |
| Loan EMIs | Obligation |
| Eating out and delivery | Want |
| Shopping | Want |
| Subscriptions | Want |
| Travel and entertainment | Want |
| Irregular (gifts, repairs, fees) | Mixed |

Transfers between your own accounts are not spending. Remove them, or you will count the same rupee twice.

## Step 3: Summarise

For each category, write the 90-day total and the monthly average. Then calculate the average monthly In, Out, Kept and savings rate.

## Step 4: Find the leaks

List every recurring charge. For each one, answer: "Did I use this in the last 30 days?" Cancel or downgrade anything you did not use. Write the annual saving next to each cut.

A worked sample: three unused subscriptions at ₹199, ₹299 and ₹649 a month total ₹1,147 a month, or **₹13,764 a year**.

## Step 5: Build the sinking-fund list

List every non-monthly cost you expect in the next twelve months, with the amount. Add them. Divide by twelve. That is your monthly sinking-fund transfer.

## Step 6: Write the allocation plan

Using your 90-day averages, write one page that answers:

1. Which budgeting method you chose and why, in two sentences.
2. A monthly amount or percentage for: needs, obligations, wants, sinking fund, saving.
3. The date of the month each automatic transfer will run (ideally the day after salary arrives).
4. Which account each transfer goes to. Use separate accounts or labelled sub-accounts so the money is not mixed.

## Deliverable

Submit:

1. A table of category totals and monthly averages for the 90 days.
2. Your average In, Out, Kept and savings rate.
3. The list of cancelled or downgraded recurring charges with annual savings.
4. Your sinking-fund list and monthly transfer amount.
5. Your one-page allocation plan with transfer dates.

## Standard

The test of a good plan is simple: when salary arrives, the plan runs with **zero decisions**. If your system needs willpower every payday, it is a wish, not a plan. Set up at least one automatic transfer before you submit, and note the date it will first run.

## A note on honesty

The goal is not a perfect-looking ledger. Nobody reviews it to judge you. The goal is an accurate picture. If eating out is ₹15,000 a month, write ₹15,000. You cannot fix a number you refuse to record.`,
        },
        {
          title: "Saving With a Purpose: Goals, Dates and Accounts",
          type: "READING",
          minutes: 9,
          md: `${DISCLAIMER}

"Save more" is not a goal. It has no amount, no date and no finish line, so it loses to every immediate want. A goal with a number and a deadline wins far more often.

## Make every goal specific

A usable goal has four parts:

1. **What** — a laptop, a deposit on a flat, a course fee, a wedding.
2. **How much** — in today's rupees.
3. **When** — a month and year.
4. **Monthly amount** — how much over how many months.

Example: "₹1,20,000 for a professional course by December next year." If that is 15 months away, you need ₹8,000 a month. Now it is a line in your allocation plan, not a hope.

## Short, medium and long

Time horizon decides where the money should sit, not just how much to save.

- **Short term (under 3 years):** the money must be there on the date. Volatility is the enemy. People commonly use savings accounts, recurring deposits, fixed deposits or similar low-volatility options for these goals.
- **Medium term (3–7 years):** some people accept a modest amount of fluctuation in exchange for potentially higher growth, often through a mix of low-volatility and growth assets.
- **Long term (7+ years):** there is time to recover from market falls, so growth assets are more commonly part of the conversation. Module 6 covers these in depth.

The principle is general: the sooner you need the money, the less risk it can afford to take. The specific mix that suits you is a personal decision.

## Inflation changes the target

Costs rise over time. If a goal is five years away and costs rise about 6% a year (an assumption for illustration), a ₹5,00,000 goal today will cost about ₹6,69,000 in five years. Plan for the future price, not today's price. Module 5 shows how to calculate this.

## One account per purpose

Money in one pile gets spent on whatever is loudest. Separate it:

- **Spending account** — salary arrives, bills and daily spending leave.
- **Sinking-fund account** — irregular known costs.
- **Emergency account** — untouched except for genuine emergencies (Module 4).
- **Goal accounts or investments** — one label per goal.

Many banks let you create labelled sub-accounts or linked deposits. The labels matter. You are far less likely to raid "Course fee — Dec" for a sale than an unnamed balance.

## The order of priorities

A sequence many planners teach, in general terms:

1. Pay every minimum due, always.
2. Build a starter emergency buffer of about one month of essential expenses.
3. Clear high-interest debt (Module 3).
4. Build the full emergency fund (Module 4).
5. Fund short-term goals and long-term investing in parallel.

This order exists because each step protects the next. Investing while carrying 36% credit card debt usually loses money. Investing without a buffer means one emergency forces you to sell at a bad time.

## Raising the rate over time

When income rises, decide in advance what share of the raise goes to saving. A simple rule: save at least half of every raise. If a ₹10,000 raise arrives and ₹5,000 is automatically added to saving, your lifestyle still improves and your savings rate climbs every year without a painful cut.`,
        },
        {
          title: "Budgeting and Saving — Knowledge Check",
          type: "QUIZ",
          minutes: 8,
          md: "Check your understanding of budgeting methods, sinking funds and goal-based saving.",
          quiz: {
            passScore: 70,
            questions: [
              {
                prompt: "Your annual irregular costs (premiums, festivals, servicing) total ₹84,000. What is the monthly sinking-fund transfer?",
                options: ["₹5,000", "₹7,000", "₹8,400", "₹12,000"],
                correct: 1,
                why: "₹84,000 ÷ 12 = ₹7,000 a month. Setting it aside monthly means these costs never arrive as surprises.",
              },
              {
                prompt: "What is the core idea of 'pay yourself first'?",
                options: [
                  "Spend on yourself before paying bills",
                  "Move the saving amount out on payday, then spend what remains",
                  "Save whatever is left at the end of the month",
                  "Pay off all debts before saving anything",
                ],
                correct: 1,
                why: "Saving happens first and automatically, so it does not depend on what is left at month end.",
              },
              {
                prompt: "A freelancer's income swings widely month to month. Which approach is most useful?",
                options: [
                  "Spend each month's income in full",
                  "Pay themselves a fixed base amount from a holding account and keep surpluses for lean months",
                  "Only budget in good months",
                  "Borrow in lean months and repay in good ones",
                ],
                correct: 1,
                why: "A conservative fixed pay from a holding account smooths irregular income and protects against lean months.",
              },
              {
                prompt: "Money for a goal 18 months away should generally be:",
                options: [
                  "In the most volatile asset available for maximum growth",
                  "In a low-volatility option, because it must be there on the date",
                  "Kept in the same account as daily spending",
                  "Left uninvested and in cash at home",
                ],
                correct: 1,
                why: "Short horizons leave no time to recover from a fall, so stability matters more than growth.",
              },
              {
                prompt: "Why use separate, labelled accounts for different purposes?",
                options: [
                  "Banks pay higher interest on labelled accounts",
                  "It makes money for one goal less likely to be spent on something else",
                  "It is required by law",
                  "It reduces income tax",
                ],
                correct: 1,
                why: "Labelled money is harder to raid. Separation turns intentions into structure.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // MODULE 3
    // ─────────────────────────────────────────────────────────────
    {
      title: "Debt Management",
      description: "Understand what debt really costs, then clear it in an order you choose on purpose.",
      objectives: [
        "Calculate the true cost of a loan using its rate, tenure and EMI.",
        "Explain why minimum payments on credit cards keep balances alive for years.",
        "Compare the avalanche and snowball payoff methods with real numbers.",
        "Build a complete debt list and a written payoff plan.",
      ],
      completion: "Submit a full debt list with rates and a chosen payoff order with a projected debt-free month.",
      lessons: [
        {
          title: "What Debt Really Costs",
          type: "READING",
          minutes: 10,
          md: `${DISCLAIMER}

Debt is a tool. A home loan can let you live in a house for decades while you pay for it. An education loan can fund a skill that raises your income. But every loan is a claim on your future income, and the price of that claim is interest. You need to know the price.

## Good debt, bad debt, expensive debt

Labels like "good" and "bad" debt are less useful than one question: **does this loan buy something that grows in value or income, at a cost lower than that growth?**

- A loan for a skill that lifts your earnings may pass that test.
- A loan for a depreciating gadget usually does not.
- Any debt at a very high rate is expensive no matter what it bought.

## Reading an EMI

An EMI (equated monthly instalment) mixes interest and principal. Early instalments are mostly interest. Later ones are mostly principal.

Worked example: a ₹5,00,000 personal loan at 14% a year for 3 years.

- EMI: about **₹17,089**.
- Total paid over 36 months: about **₹6,15,200**.
- Total interest: about **₹1,15,200**, or 23% on top of what you borrowed.

Same loan over 5 years has a lower EMI but more total interest, because you borrow the money for longer. A lower EMI is not a cheaper loan. Always compare **total cost**, not monthly cost.

## The credit card minimum trap

Credit cards often charge interest of around 3% a month on revolving balances, which is roughly 36–42% a year depending on the card. Check your own card's terms. The "minimum amount due" is designed to keep the account in good standing, not to clear the debt.

Worked example: a ₹1,00,000 card balance at 3% a month.

| Monthly payment | Months to clear | Total interest |
|---|---|---|
| ₹4,000 | 47 | about ₹87,600 |
| ₹8,000 | 16 | about ₹27,200 |

Doubling the payment cuts the time by two-thirds and saves about ₹60,000 in interest. At ₹4,000 a month, you nearly pay for the balance twice.

Also note: once you carry a balance, many cards charge interest on new purchases from the day you make them, with no interest-free period. Paying the full statement balance by the due date is the only way to use a card for free.

## Hidden costs

Look beyond the headline rate:

- **Processing fees** of 1–3% are often deducted upfront.
- **Prepayment or foreclosure charges** on some loans.
- **"No-cost EMI"** offers, where the interest may be built into the price or offset by a discount you lose. Read the breakup.
- **Late fees and penalty interest** when a payment is missed.
- **Credit score damage** from missed payments, which can raise the rate on every future loan.

## Debt-to-income: a health check

Add up all your monthly EMIs and divide by take-home pay. If EMIs are ₹22,000 on ₹70,000 take-home, your ratio is about 31%. Many lenders look at this ratio. As a personal guardrail, the higher it climbs, the less room you have for saving, emergencies and goals. A rising ratio is a signal to stop adding new debt.

## The takeaway

Know three numbers for every debt: outstanding principal, interest rate and monthly payment. With those, you can rank your debts, compare options and make a plan. Without them, the lender makes the plan for you.`,
        },
        {
          title: "Avalanche, Snowball and the Payoff Order",
          type: "READING",
          minutes: 10,
          md: `${DISCLAIMER}

Once you know what each debt costs, the next question is order. You pay the minimum on every debt, always. Every extra rupee goes to one target at a time. Two widely taught methods choose the target differently.

## The avalanche: highest rate first

List debts by interest rate, highest first. Put every spare rupee on the top one. When it is gone, roll its whole payment onto the next. This is mathematically the cheapest method, because you remove the most expensive debt first.

## The snowball: smallest balance first

List debts by balance, smallest first. Clear the smallest one, then roll its payment onto the next smallest. This costs a little more in interest, but you see a debt disappear sooner. For many people, that early win is what keeps them going.

## A worked comparison

Priya has three debts and ₹20,000 a month for repayment:

| Debt | Balance | Rate (yearly) | Minimum |
|---|---|---|---|
| Store card | ₹30,000 | 24% | ₹1,500 |
| Credit card | ₹1,20,000 | 40% | ₹5,000 |
| Personal loan | ₹1,50,000 | 14% | ₹5,000 |

Minimums total ₹11,500, leaving ₹8,500 extra each month.

**Avalanche** (credit card → store card → personal loan):

- Credit card cleared in month 11.
- Store card cleared in month 13.
- Debt-free in month 18.
- Total interest: about **₹53,300**.

**Snowball** (store card → credit card → personal loan):

- Store card cleared in month 4.
- Credit card cleared in month 13.
- Debt-free in month 18.
- Total interest: about **₹57,200**.

The avalanche saves about ₹4,000. The snowball gives Priya her first win seven months earlier. Both finish in the same month here, because the extra payment is large relative to the balances. With smaller extra payments or bigger rate gaps, the avalanche's advantage grows.

## Which one should you choose?

Both work. The best method is the one you will stick with.

- If you are disciplined and motivated by numbers, the avalanche is cheaper.
- If you have tried before and stalled, the snowball's quick wins may be worth the extra cost.
- A hybrid is fine: clear one tiny balance for momentum, then switch to the avalanche.

The worst method is no method: paying a bit extra on whichever bill feels urgent this month.

## Other tools, used carefully

- **Balance transfers** move a card balance to a lower rate for a period. They help only if you stop adding new charges and clear the balance before the offer ends. Read the fees.
- **Debt consolidation loans** replace several high-rate debts with one lower-rate loan. They help only if the new rate and fees are genuinely lower and you do not run the old cards back up.
- **Negotiating with lenders** is possible when you are struggling. Contact them before you miss payments, not after.

None of these fixes the cause. If spending exceeds income, new debt will replace old debt. The ledger from Module 2 is where the real fix lives.

## Protect the plan

Two rules make any payoff plan stronger:

1. **Keep a starter buffer** of about one month of essentials while you repay. Without it, the next surprise goes back on the card.
2. **Stop adding new debt.** Remove saved cards from shopping apps. Pause "buy now, pay later". A plan that clears ₹8,500 a month while ₹6,000 of new charges arrive is barely moving.

When the last debt is cleared, keep the full repayment amount moving. Redirect it to your emergency fund, then to investing. You have already proven you can live without it.`,
        },
        {
          title: "Assignment: List Every Debt and Choose Your Order",
          type: "ASSIGNMENT",
          xp: 75,
          minutes: 45,
          md: `${DISCLAIMER}

Your assignment is to **list every debt you have with its rate, choose avalanche or snowball, and calculate your projected debt-free month.** If you have no debt, complete the alternative task at the end.

## Step 1: The complete list

Find every debt. Check bank apps, card statements, loan accounts and any "buy now, pay later" services. Include money owed to family if there is an agreed repayment. For each debt, record:

| Field | Example |
|---|---|
| Name | Credit card A |
| Outstanding balance | ₹68,000 |
| Interest rate (yearly) | 42% |
| Minimum or EMI | ₹3,400 |
| Due date | 5th |
| Fees or prepayment charges | None stated |

If a rate is monthly, multiply by 12 for a rough yearly figure. If you cannot find a rate, call the lender and ask. Write the date you confirmed it.

## Step 2: Your repayment budget

From your Module 2 allocation plan, write the total amount you can put towards debt each month. Subtract all minimums. The remainder is your **extra payment**. If the remainder is zero or negative, your first task is the spending side, not the debt side. Note one cut that would create at least ₹2,000 of extra payment.

## Step 3: Choose and justify

Choose avalanche, snowball or a hybrid. Write two sentences explaining why it fits you. There is no wrong answer if the reasoning is honest.

## Step 4: Project the timeline

Using a spreadsheet or an online loan calculator, project month by month:

- The month each debt is cleared.
- Your debt-free month.
- Approximate total interest.

A simple spreadsheet works. One row per month. For each debt: opening balance, plus one month of interest (balance × yearly rate ÷ 12), minus payment, equals closing balance. When a debt reaches zero, move its payment to the next target.

If you have the time, run both methods and record the difference in total interest and in the month of your first cleared debt.

## Step 5: Guardrails

Write down:

1. Your starter buffer amount (about one month of essential expenses) and where it sits.
2. Which cards you will remove from saved payment methods.
3. The date each month you will check progress.

## Deliverable

Submit:

1. Your debt table with all six fields.
2. Your monthly repayment budget and extra payment.
3. Your chosen method with justification.
4. Your projected clearance month for each debt and overall debt-free month.
5. Your three guardrails.

## Alternative task if you have no debt

Pick a purchase you might finance in the next two years, such as a phone, vehicle or course. Get a real quote for an EMI option. Calculate the total amount paid, total interest including fees, and compare it with saving for the same item over the same period. Write one paragraph on what you would do and why.

## Standard

Numbers come from statements, not memory. Rates are written as yearly percentages. Your debt-free month is a specific month and year. Put it somewhere you will see it.`,
        },
        {
          title: "Debt Management — Knowledge Check",
          type: "QUIZ",
          minutes: 8,
          md: `${DISCLAIMER}

Check your understanding of loan costs, credit card minimums and payoff methods.`,
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "Two offers for the same ₹5,00,000 loan at the same rate: 3 years or 5 years. Which is true?",
                options: [
                  "The 5-year loan is cheaper because the EMI is lower",
                  "The 3-year loan has a higher EMI but lower total interest",
                  "Both cost exactly the same in total",
                  "The 3-year loan always has a higher interest rate",
                ],
                correct: 1,
                why: "Borrowing for longer means paying interest for longer. A lower EMI is not a lower total cost.",
              },
              {
                prompt: "What does the avalanche method target first?",
                options: [
                  "The smallest balance",
                  "The debt with the highest interest rate",
                  "The newest debt",
                  "The debt with the largest EMI",
                ],
                correct: 1,
                why: "Avalanche clears the most expensive debt first, which minimises total interest.",
              },
              {
                prompt: "A ₹1,00,000 card balance at 3% a month is paid at ₹4,000 a month. Roughly how much interest is paid before it clears?",
                options: ["About ₹12,000", "About ₹36,000", "About ₹87,000", "No interest if paid every month"],
                correct: 2,
                why: "At 3% a month, ₹4,000 barely outpaces interest. It takes about 47 months and about ₹87,600 in interest.",
              },
              {
                prompt: "What is the main advantage of the snowball method?",
                options: [
                  "It always costs the least interest",
                  "It produces early wins that help people stay motivated",
                  "It improves your credit score faster",
                  "Lenders offer discounts for it",
                ],
                correct: 1,
                why: "Clearing a small balance quickly gives visible progress. It usually costs slightly more interest than avalanche.",
              },
              {
                prompt: "Why keep a starter buffer while repaying debt?",
                options: [
                  "To earn interest on it",
                  "So the next unexpected expense does not go straight back on a credit card",
                  "Because lenders require it",
                  "To invest when markets fall",
                ],
                correct: 1,
                why: "Without a small buffer, any surprise creates new debt and undoes the payoff progress.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // MODULE 4
    // ─────────────────────────────────────────────────────────────
    {
      title: "Emergency Funds and Protection",
      description: "Build the cash buffer and the insurance cover that stop one bad event from becoming a financial crisis.",
      objectives: [
        "Calculate an emergency fund target from your essential monthly expenses.",
        "Explain how term life and health insurance work and what each protects against.",
        "Estimate a life cover amount using a simple needs-based method.",
        "Audit your existing cover for gaps, overlaps and products that mix insurance with investment.",
      ],
      completion: "Submit an emergency fund target with a funding timeline and a written protection audit.",
      lessons: [
        {
          title: "The Emergency Fund: Boring Cash for a Bad Day",
          type: "READING",
          minutes: 9,
          md: `${DISCLAIMER}

An emergency fund is money set aside for one job: absorbing shocks. A job loss, a medical bill, an urgent repair, a family emergency. Without it, every surprise becomes debt, and every long-term plan gets interrupted.

## Its job is access, not returns

The emergency fund is not an investment. Its purpose is to be there, in full, the day you need it. That means:

- **Accessible within a day or two.**
- **Stable in value.** It cannot be down 20% the week you lose your job.
- **Separate from spending money,** so you do not drift into using it.

People commonly keep emergency funds in savings accounts, sweep-in deposits, short fixed deposits that can be broken early, or similar low-volatility options. Each has trade-offs in interest, access and penalties for early withdrawal. Check the terms of whatever you use.

## How big?

Base it on **essential expenses**, not income. Essentials are what you must pay even in a crisis: housing, groceries, utilities, EMIs, insurance premiums, school fees, basic transport.

Commonly discussed targets:

- **Starter buffer:** about 1 month of essentials.
- **Full fund:** about 3–6 months of essentials.
- **Towards the higher end or beyond** if your income is irregular, you are the only earner, you have dependants, your industry is cyclical, or you have health conditions in the family.

## Worked example

Rohan's essential expenses are ₹40,000 a month.

| Level | Months | Target |
|---|---|---|
| Starter | 1 | ₹40,000 |
| Lower full | 3 | ₹1,20,000 |
| Higher full | 6 | ₹2,40,000 |

He is a single earner with a parent who depends on him, so he aims for six months: ₹2,40,000. He can save ₹15,000 a month towards it. Starting from zero, he reaches the starter level in about 3 months and the full fund in 16 months.

## Building it without stalling

- Automate a fixed transfer on payday.
- Send windfalls (bonus, tax refund, gifts) straight to it until it is full.
- If you are also clearing high-interest debt, build the starter buffer first, clear the debt, then complete the full fund.

## What counts as an emergency

Write your definition down before you need it. A useful test: **is it unexpected, necessary and urgent?**

- Job loss, medical bills, essential repairs: yes.
- A sale, a holiday, a new phone because the old one is slow: no. Those belong to sinking funds or goals.

## Refill rule

When you use the fund, refilling it becomes the top saving priority until it is full again. Pause extra investing if needed. An empty emergency fund means the next shock lands on a credit card or forces you to sell investments at the wrong time.

## The hidden return

The emergency fund earns little interest. Its real return is the bad decisions it prevents: high-interest borrowing, selling investments in a falling market, or accepting a poor job offer out of panic. Those costs are larger than any interest you give up.`,
        },
        {
          title: "Insurance Basics: Transferring the Risks You Cannot Carry",
          type: "READING",
          minutes: 11,
          md: `${DISCLAIMER}

An emergency fund handles shocks measured in months of expenses. Some risks are far bigger: a serious illness, a disability or the death of an earner. No ordinary savings can absorb those. Insurance exists to transfer that risk to an insurer, for a price called the premium.

## The principle

Insure against events that are **unlikely but would be financially devastating.** Do not rely on insurance for small, predictable costs; those belong in your budget. This one principle filters out much of what is sold to you.

## Term life insurance

Term insurance pays a fixed sum to your nominees if you die during the policy term. If you survive the term, it pays nothing. That is why it is usually the least expensive way to buy a large amount of life cover.

Who generally needs it: anyone whose income others depend on, or whose death would leave debts others must repay. A single person with no dependants and no shared debts may need little or none.

## Sizing life cover: a simple needs method

Add up what your family would need, then subtract what already exists.

Worked example for Sana, 34, two children:

| Need | Amount |
|---|---|
| Family living costs: ₹6,00,000 a year for 15 years (simplified, ignoring growth and inflation) | ₹90,00,000 |
| Outstanding home loan | ₹20,00,000 |
| Children's education goals | ₹15,00,000 |
| **Total need** | **₹1,25,00,000** |
| Less existing investments and savings | −₹10,00,000 |
| Less existing life cover | −₹15,00,000 |
| **Cover gap** | **₹1,00,00,000** |

A professional would refine this with inflation, returns on the payout and your partner's income. The structure stays the same: needs minus resources.

Some people use a quick rule of thumb based on a multiple of annual income. It is a rough starting point; the needs method is more grounded in your situation.

## Health insurance

A single hospitalisation can cost more than several months of income. Health insurance pays for covered hospital and treatment costs, up to the sum insured. Key terms to read in any policy:

- **Sum insured** and whether it is per person or shared across the family (floater).
- **Waiting periods** for pre-existing conditions and specific treatments.
- **Room rent limits** and co-payments, which can reduce what is paid on the whole bill.
- **Exclusions** listed in the policy wording.

Employer cover is useful but usually ends when you leave the job. Many people keep personal cover as well, so protection does not depend on employment.

## Products that mix insurance and investment

Some policies combine life cover with savings or investment, such as endowment or money-back plans and unit-linked plans. They are often sold as "insurance plus returns". Before buying any combined product, separate the two questions:

1. How much life cover does it give, compared with a term policy of similar cost?
2. What return does the savings part imply after all charges, compared with simpler alternatives?

Combined products can carry high charges and long lock-ins. Read the benefit illustration and the charges carefully, and ask a qualified adviser to compare them with separate cover and separate saving.

## Other cover worth understanding

- **Personal accident and disability cover** pays if an accident leaves you unable to work.
- **Critical illness cover** pays a lump sum on diagnosis of listed illnesses.
- **Property and vehicle insurance** protects the assets you own.

## Honesty matters

Disclose your health, habits and history accurately on every proposal form. Non-disclosure is a common reason claims are disputed. A policy is only as good as its claim.`,
        },
        {
          title: "Assignment: Size Your Buffer and Audit Your Cover",
          type: "ASSIGNMENT",
          xp: 75,
          minutes: 50,
          md: `${DISCLAIMER}

Your assignment is to **calculate your emergency fund target with a funding timeline, and audit the insurance protecting you and your dependants.** You are not buying anything in this assignment. You are seeing clearly.

## Part A: Emergency fund

**Step 1.** From your Module 2 ledger, list only essential monthly expenses: housing, groceries, utilities, EMIs, premiums, school fees, basic transport, medicines.

**Step 2.** Choose a number of months (1, 3, 6 or more) and write one sentence explaining why, based on your job stability, dependants and income pattern.

**Step 3.** Calculate:

- Target = essential monthly expenses × months.
- Current emergency savings.
- Gap = target − current.
- Monthly contribution you can sustain.
- Months to reach the target = gap ÷ monthly contribution.

Worked sample: essentials ₹35,000 × 4 months = ₹1,40,000. Current: ₹30,000. Gap: ₹1,10,000. Contribution: ₹10,000 a month. Time to target: 11 months.

**Step 4.** Write where the fund sits, how quickly you can access it, and any penalty for early withdrawal.

**Step 5.** Write your personal definition of an emergency in one sentence.

## Part B: Protection audit

**Step 1. Dependants.** List everyone who depends on your income, and any debts others would inherit.

**Step 2. Existing cover.** For every policy you have, including employer cover, record:

| Field | Example |
|---|---|
| Type | Term life / health / accident / combined |
| Provider and policy name | (your own) |
| Sum assured or sum insured | ₹50,00,000 |
| Annual premium | ₹(from your policy) |
| Term or renewal date | 2048 |
| Nominee updated? | Yes / No |
| Ends if you change jobs? | Yes / No |

**Step 3. Life cover estimate.** Use the needs method from the previous lesson: family living costs for the years they would need support, plus debts, plus major goals, minus existing assets and existing cover. Write your estimated gap. If you have no dependants and no shared debts, write that, and note whether that might change in the next five years.

**Step 4. Health cover check.** Note your sum insured, whether it is individual or floater, the waiting periods that apply to you, and any room rent limit or co-payment.

**Step 5. Combined products.** If you hold any policy that mixes insurance and investment, write down its life cover and annual premium. Note one question you would ask a qualified adviser about it. Do not cancel anything based on this lesson alone; surrender terms can be costly.

## Deliverable

Submit:

1. Your emergency fund calculation and timeline.
2. Where the fund sits and your definition of an emergency.
3. Your policy table.
4. Your estimated life cover gap with workings.
5. A list of up to three questions to take to a qualified professional.

## Standard

The output is a clear picture, not a purchase. If you identify a gap, the right next step is to compare options carefully and, if needed, speak with a licensed adviser. Also check that nominees are correct on every policy and account. It takes ten minutes and is often overlooked.`,
        },
        {
          title: "Emergency Funds and Protection — Knowledge Check",
          type: "QUIZ",
          minutes: 8,
          md: `${DISCLAIMER}

Check your understanding of emergency funds and insurance basics.`,
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "Essential expenses are ₹45,000 a month. What is a 4-month emergency fund target?",
                options: ["₹45,000", "₹1,35,000", "₹1,80,000", "₹2,70,000"],
                correct: 2,
                why: "₹45,000 × 4 = ₹1,80,000. Emergency fund targets are based on essential expenses, not income.",
              },
              {
                prompt: "What is the main quality an emergency fund needs?",
                options: [
                  "The highest possible return",
                  "Quick access and a stable value",
                  "Tax-free growth",
                  "A long lock-in to avoid temptation",
                ],
                correct: 1,
                why: "It must be available in full when needed. Growth matters far less than access and stability.",
              },
              {
                prompt: "Term life insurance pays out:",
                options: [
                  "A maturity amount if you survive the term",
                  "The sum assured to nominees if the insured person dies during the term",
                  "Your hospital bills",
                  "A guaranteed investment return",
                ],
                correct: 1,
                why: "Pure term cover pays only on death during the term, which is why it is usually the least expensive way to buy large cover.",
              },
              {
                prompt: "Which person most clearly needs life cover?",
                options: [
                  "A single person with no dependants and no debts",
                  "A sole earner with two children and a home loan",
                  "A retiree whose children are financially independent",
                  "A student with no income",
                ],
                correct: 1,
                why: "Life cover replaces income others depend on. The sole earner with dependants and debt has the clearest need.",
              },
              {
                prompt: "Before buying a policy that combines insurance with investment, you should:",
                options: [
                  "Assume the returns shown are guaranteed",
                  "Compare its life cover and implied returns, after charges, with separate cover and separate saving",
                  "Buy it if the premium is affordable",
                  "Choose it because it pays something back",
                ],
                correct: 1,
                why: "Separating the two questions shows whether the combined product is good value as insurance and as saving.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // MODULE 5
    // ─────────────────────────────────────────────────────────────
    {
      title: "Compounding and the Time Value of Money",
      description: "Learn why time is the most powerful variable in money, and how inflation quietly works against you.",
      objectives: [
        "Calculate compound growth for a lump sum and a monthly investment.",
        "Use the rule of 72 to estimate doubling time.",
        "Explain how inflation reduces the real value of money over time.",
        "Calculate the future cost of a goal and the monthly saving it requires.",
      ],
      completion: "Submit a goal calculation showing future cost, assumed rate and required monthly saving.",
      lessons: [
        {
          title: "Compounding: Growth on Top of Growth",
          type: "READING",
          minutes: 10,
          md: `${DISCLAIMER}

Simple interest pays you on what you put in. **Compound interest** pays you on what you put in plus everything it has already earned. Over short periods, the difference is small. Over decades, it is enormous.

## Simple versus compound

Put ₹1,00,000 away for 10 years. Assume 10% a year, purely for illustration.

- **Simple interest:** ₹10,000 a year for 10 years = ₹1,00,000 interest. Final value: ₹2,00,000.
- **Compound interest:** each year's growth is added to the base. Final value: about **₹2,59,000**.

The extra ₹59,000 is growth on growth.

## A lump sum over time

₹1,00,000, assumed 10% a year, compounded annually:

| Years | Value |
|---|---|
| 10 | about ₹2,59,000 |
| 20 | about ₹6,73,000 |
| 30 | about ₹17,45,000 |

Look at the shape. The first decade adds about ₹1.6 lakh. The third decade adds about ₹10.7 lakh. Compounding is back-loaded. Most of the result arrives at the end, which is why interrupting it is so costly.

## Regular monthly investing

Most people invest monthly, not in one lump sum. ₹10,000 a month, assumed 10% a year:

| Years | Total invested | Approximate value |
|---|---|---|
| 10 | ₹12,00,000 | ₹20,15,000 |
| 20 | ₹24,00,000 | ₹72,40,000 |
| 30 | ₹36,00,000 | ₹2,07,90,000 |

At 30 years, the amount invested is ₹36 lakh. The growth is over ₹1.7 crore. Time did most of the work.

These figures are illustrations. Real returns vary year to year, can be negative, and are never guaranteed. The point is the shape of the curve, not the specific number.

## The early starter and the late starter

Two people each invest ₹10,000 a month, assuming 10% a year.

- **Asha** invests from 25 to 35, then stops completely. She invests ₹12 lakh in total and leaves it to grow until 60.
- **Vikram** starts at 35 and invests every month until 60. He invests ₹30 lakh in total.

At 60, under these assumptions:

- Asha: about **₹2.18 crore**.
- Vikram: about **₹1.24 crore**.

Asha invested less than half as much and ended with more, because her money had ten extra years to compound. Starting earlier often beats investing more later.

## The rule of 72

A quick way to estimate doubling time: **divide 72 by the yearly rate.**

- At 6%: about 12 years to double.
- At 9%: about 8 years.
- At 12%: about 6 years.

It works in reverse too. If prices rise 6% a year, the cost of living roughly doubles in 12 years.

## Compounding works against you too

Debt compounds the same way. A credit card at 3% a month compounds to well over 40% a year. Fees compound as a drag on returns. Inflation compounds against cash. The same maths that builds wealth over decades also erodes it when it runs in the other direction.

## The three levers

Compound growth depends on three things:

1. **Amount** — how much you put in.
2. **Rate** — the return, which you cannot control and should never assume is guaranteed.
3. **Time** — how long it compounds, which you control mainly by starting early and not stopping.

Of the three, time is the one you can most reliably control. Use it.`,
        },
        {
          title: "Inflation and the Time Value of Money",
          type: "READING",
          minutes: 10,
          md: `${DISCLAIMER}

A rupee today is worth more than a rupee in five years. Two reasons: today's rupee can be invested and grow, and prices tend to rise, so a future rupee buys less. This idea is called the **time value of money**. Every serious financial decision rests on it.

## Inflation: the silent tax

Inflation is the general rise in prices over time. If prices rise 6% a year (an assumption for illustration), something that costs ₹100 today costs about ₹106 next year and about ₹179 in ten years.

Worked example: your household spends ₹50,000 a month today. At an assumed 6% inflation, the same lifestyle would cost:

| Years from now | Monthly cost |
|---|---|
| 10 | about ₹89,500 |
| 20 | about ₹1,60,400 |
| 25 | about ₹2,14,600 |

That is why a retirement number that "sounds big" today may be far too small when you need it.

## Future value and present value

**Future value** answers: what will this amount grow to? Formula: FV = PV × (1 + r)ⁿ.

**Present value** answers: what is a future amount worth in today's money? Formula: PV = FV ÷ (1 + r)ⁿ.

Worked example: someone offers you ₹1,00,000 in five years. At an assumed 6% rate, that is worth about **₹74,700** today. If they offer ₹80,000 today instead, the cash today is worth more, under that assumption.

## Real return

What matters is not the headline return but the **real return**: return after inflation, and after tax.

Worked example, using assumptions for illustration:

- A deposit pays 7% a year.
- Tax on the interest at an assumed 30% slab leaves 4.9%.
- Inflation runs at an assumed 6%.
- Real return is roughly 4.9% − 6% = **about −1%**.

The balance grows on paper, but its buying power shrinks. This does not make deposits bad. They are stable and suited to short-term needs and emergency funds. It does mean that money needed in 15 or 20 years usually needs to be placed with inflation in mind. Tax treatment depends on the instrument and on rules that change; check the current position.

## Planning a goal in future rupees

Every long-term goal should be stated in future rupees.

Worked example: a child's higher education costs ₹10,00,000 today. It is 15 years away. Education costs often rise faster than general prices; assume 8% a year for illustration.

- Future cost: ₹10,00,000 × 1.08¹⁵ ≈ **₹31,70,000**.
- If savings grow at an assumed 10% a year, the monthly amount needed is about **₹7,900** for 15 years.

Save for ₹10 lakh and you will fall short by over ₹20 lakh. Save for ₹31.7 lakh and you have a realistic plan.

## Choosing assumptions

Every projection depends on assumptions: inflation, return and time. A few habits keep them honest:

- **Use conservative returns.** If a plan only works at a high assumed return, it is a fragile plan.
- **Use realistic inflation** for the specific goal. Healthcare and education often rise faster than general prices.
- **Run a range.** Calculate at a low, middle and high assumption. If the low case still works, the plan is robust.
- **Revisit yearly.** Update figures as reality replaces assumptions.

## The takeaway

Money always has a time attached. A rupee figure without a date is incomplete. When you compare offers, set goals or judge returns, convert everything into the same point in time and think in real, after-inflation terms.`,
        },
        {
          title: "Assignment: Price a Goal in Future Rupees",
          type: "ASSIGNMENT",
          xp: 75,
          minutes: 45,
          md: `${DISCLAIMER}

Your assignment is to **take one real goal, convert it into future rupees, and calculate the monthly saving it needs under three return assumptions.** You will use a spreadsheet. No advanced maths is required; the formulas below are enough.

## Step 1: Choose a goal

Pick one goal at least five years away: a home down payment, a child's education, a sabbatical, early retirement or something else that matters to you. Write:

- The goal.
- Its cost in today's rupees.
- The year you need the money.
- Years remaining (n).

## Step 2: Choose an inflation rate

Write the inflation rate you assume for this goal and one sentence on why. For general living costs, you might use 6%. For education or healthcare, you might choose higher. These are illustrations; the point is to make your assumption explicit.

## Step 3: Calculate the future cost

In a spreadsheet: **future cost = today's cost × (1 + inflation) ^ n**.

Example: ₹15,00,000 today, 6% inflation, 10 years. Future cost ≈ ₹15,00,000 × 1.791 ≈ **₹26,86,000**.

## Step 4: Calculate monthly saving under three assumptions

Most spreadsheets have a payment function. In Excel or Google Sheets, a monthly saving for a future target can be estimated with:

**=PMT(rate/12, n*12, 0, -future_cost)**

Run it three times with yearly rates you clearly label as assumptions, for example 6%, 8% and 10%. Record each result.

Example for ₹26,86,000 in 10 years (results rounded):

| Assumed yearly return | Monthly saving needed |
|---|---|
| 6% | about ₹16,400 |
| 8% | about ₹14,700 |
| 10% | about ₹13,100 |

Notice how sensitive the result is to the assumption. A plan that only works at the highest rate is fragile.

## Step 5: Add your existing savings

If you already have money set aside for this goal, calculate its future value: **existing × (1 + rate) ^ n**. Subtract it from the future cost before you calculate the monthly saving.

## Step 6: Reality check

Compare the monthly saving needed (use the middle or lowest assumption) with your current allocation plan from Module 2. Write one of three conclusions:

1. **Fits** — the amount is already in your plan or can be added.
2. **Stretch** — it needs a cut elsewhere; name the cut.
3. **Does not fit** — you need to change the goal: more time, a lower target or a phased approach. Write which.

## Deliverable

Submit:

1. Your goal, today's cost, target year and n.
2. Your inflation assumption and reasoning.
3. The future cost calculation.
4. A table of monthly saving at three labelled return assumptions.
5. Your reality-check conclusion and next action.

## Standard

Every assumption is written down and labelled as an assumption. No return is described as expected or guaranteed. Your conclusion names a specific action and a date to revisit the numbers, at least once a year.`,
        },
        {
          title: "Compounding and the Time Value of Money — Knowledge Check",
          type: "QUIZ",
          minutes: 8,
          md: `${DISCLAIMER}

Check your understanding of compounding, inflation and present value.`,
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "Using the rule of 72, roughly how long does money take to double at an assumed 8% a year?",
                options: ["6 years", "9 years", "12 years", "18 years"],
                correct: 1,
                why: "72 ÷ 8 = 9. The rule of 72 gives a quick estimate of doubling time.",
              },
              {
                prompt: "Asha invests for 10 years from age 25 and stops. Vikram invests the same monthly amount from 35 to 60. Under the same assumed return, why can Asha end with more?",
                options: [
                  "She invested more money in total",
                  "Her money had more years to compound",
                  "Early investors get higher interest rates",
                  "Vikram paid more tax",
                ],
                correct: 1,
                why: "Compounding is back-loaded. Ten extra years of growth can outweigh a larger total contribution made later.",
              },
              {
                prompt: "A deposit pays 7%. After tax the return is 4.9%, and inflation is 6%. What is the approximate real return?",
                options: ["+7%", "+4.9%", "+1%", "About −1%"],
                correct: 3,
                why: "Real return is roughly after-tax return minus inflation: 4.9% − 6% ≈ −1%. Buying power shrinks.",
              },
              {
                prompt: "A goal costs ₹10 lakh today and is 15 years away. Why is saving exactly ₹10 lakh a mistake?",
                options: [
                  "Because returns are guaranteed to cover it",
                  "Because inflation will likely make the goal cost much more in future rupees",
                  "Because ₹10 lakh is too much to save",
                  "Because goals should never be planned",
                ],
                correct: 1,
                why: "At an assumed 8% cost growth, ₹10 lakh today becomes about ₹31.7 lakh in 15 years. Plan in future rupees.",
              },
              {
                prompt: "Which of the three compounding levers can you most reliably control?",
                options: ["The rate of return", "Market direction", "Time, by starting early and not stopping", "Inflation"],
                correct: 2,
                why: "Returns and inflation are outside your control. When you start and whether you stay invested are within it.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // MODULE 6
    // ─────────────────────────────────────────────────────────────
    {
      title: "Investment Fundamentals",
      description: "Learn what the main asset classes are, how common investment vehicles work and why costs matter.",
      objectives: [
        "Describe the main asset classes and the role each typically plays.",
        "Explain how mutual funds, index funds and common savings schemes work in general terms.",
        "Calculate the long-run effect of different expense ratios.",
        "Read a fund factsheet and identify its costs, risks and holdings.",
      ],
      completion: "Submit a cost comparison over 20 years and an annotated fund factsheet review.",
      lessons: [
        {
          title: "The Asset Classes and What They Do",
          type: "READING",
          minutes: 11,
          md: `${DISCLAIMER}

Investing vocabulary sounds complicated. Underneath, there are only a handful of asset classes. Each has a typical job, a typical behaviour and a typical risk. Learn these and most products become easier to understand, because most products are just packages of them.

## Cash and cash equivalents

Savings accounts, short deposits and similar instruments. **Job:** stability and access. **Behaviour:** the value does not swing. **Risk:** inflation quietly reduces buying power over time. This is where emergency funds and very short-term goals usually sit.

## Debt (fixed income)

When you buy a bond or a debt instrument, you lend money to a government, bank or company. They pay interest and return the principal at maturity. Fixed deposits, government savings schemes and bond funds all belong broadly here.

**Job:** steadier income and lower volatility than equities. **Risks:**

- **Credit risk** — the borrower may fail to pay.
- **Interest rate risk** — when market interest rates rise, the market price of existing bonds tends to fall.
- **Inflation risk** — fixed payments buy less over time.

Some government-backed schemes, such as PPF, are designed for long-term saving with a lock-in. Their rates and rules are set and revised by the government, so check the current terms.

## Equity (shares)

A share is a slice of ownership in a business. When the business grows its profits, the value of that slice may rise, and the company may pay dividends.

**Job:** long-term growth. **Behaviour:** prices can swing sharply, and falls of 30% or more have happened in broad markets. **Risk:** in the short term, you can lose a large part of the value. Over long periods, equities have historically offered higher growth than cash or bonds in many markets, but past performance does not guarantee future results.

## Real assets

Property and gold, mainly. Property can produce rent and may appreciate, but it is expensive to buy, slow to sell, and needs upkeep. Gold does not produce income; people often hold it as a store of value or a hedge. Both behave differently from shares and bonds, which can help diversification.

## Retirement-linked accounts

Accounts such as EPF and NPS are not separate asset classes. They are wrappers that hold assets (mostly debt, equity or both) with specific rules on contributions, lock-ins and withdrawals. Understand the wrapper's rules and what it holds inside.

## Speculative assets

Cryptocurrencies, very small company shares, and complex derivatives fall here. Outcomes vary enormously, including total loss. If someone chooses to hold them, position size is the whole conversation: an amount whose loss would not damage their plans.

## Risk and return travel together

| Asset class | Typical volatility | Typical long-run growth potential |
|---|---|---|
| Cash | Very low | Low |
| Debt | Low to moderate | Low to moderate |
| Equity | High | Higher |
| Speculative | Very high | Highly uncertain |

There is no asset with high return, low risk and instant access. Anyone who offers all three is either mistaken or selling something. A promise of guaranteed high returns is a classic warning sign of fraud.

## Matching assets to time

Module 2 introduced the link between horizon and risk. Here it is in asset terms. Money needed soon generally belongs in cash and short-term debt. Money needed in ten years or more has time to ride out equity falls. The mix between them is called **asset allocation**, and it is one of the most important decisions in investing. Module 7 shows how to think about it.`,
        },
        {
          title: "Funds, Index Funds and the Cost of Owning Them",
          type: "READING",
          minutes: 11,
          md: `${DISCLAIMER}

Most people do not buy individual bonds or dozens of shares directly. They use **pooled vehicles**, mainly mutual funds and exchange-traded funds (ETFs). Understanding how these work, and what they cost, protects you from some of the most common and expensive mistakes.

## How a mutual fund works

Many investors pool money. A fund manager invests it according to the fund's stated objective: large companies, government bonds, a mix and so on. Each investor owns units. The value of one unit is the **NAV** (net asset value), calculated daily from the value of everything the fund holds, minus expenses.

Funds give you diversification and professional administration with small amounts of money. You can invest a lump sum or a fixed monthly amount, often called a SIP (systematic investment plan).

## Active and passive

- **Active funds** have a manager who picks investments, trying to beat a benchmark index. They charge more for this.
- **Index funds and many ETFs** simply hold the same securities as an index, such as a broad market index of large companies. They do not try to beat the index; they try to match it. They usually charge less.

Whether an active fund beats its index after costs varies by fund, market and period. What is certain in advance is the cost. A passive fund can only deliver the index return minus its costs and minus small tracking differences.

## The expense ratio

Every fund charges an annual fee as a percentage of your money, called the **expense ratio** or total expense ratio. It is deducted from the fund daily, so you never see a bill. That is why it is easy to ignore.

Many funds offer a **direct plan** and a **regular plan** of the same scheme. The regular plan typically has a higher expense ratio because it includes distributor commission. Over decades, that difference adds up.

## Expense ratios over 20 years

Worked example. ₹10,00,000 invested once. Assume the investments inside the fund earn 10% a year before costs, purely for illustration.

| Annual cost | Value after 20 years |
|---|---|
| 0.0% (no cost) | about ₹67,30,000 |
| 0.2% | about ₹64,90,000 |
| 1.0% | about ₹56,00,000 |
| 1.5% | about ₹51,10,000 |

The difference between 0.2% and 1.5% is about **₹13,80,000**. That is more than the original investment, lost to a fee that looked small on paper.

Same comparison with ₹10,000 a month for 20 years (₹24 lakh invested):

- At 0.2% cost: about ₹70,70,000.
- At 1.5% cost: about ₹60,70,000.

About ₹10 lakh of difference, from a 1.3 percentage point gap in annual cost.

## Other costs to check

- **Exit loads:** a charge if you redeem within a set period.
- **Transaction costs** inside the fund, higher in funds that trade a lot.
- **Taxes** on gains and dividends, which depend on the type of fund, the holding period and current rules.
- **Brokerage and platform fees** if you buy ETFs or shares.

## What costs do not tell you

A low cost does not make a fund suitable. A fund must also match your goal, horizon and risk tolerance. But cost is one of the few factors you know in advance and fully control. Between two funds doing the same job, the cheaper one starts with a guaranteed head start.

## Questions to ask about any fund

1. What does it hold, and what is its objective?
2. What is its benchmark?
3. What is the expense ratio, and is this the direct or regular plan?
4. Are there exit loads or lock-ins?
5. How is it taxed, under current rules?

If you cannot answer these, you are not ready to invest in it.`,
        },
        {
          title: "Assignment: Read a Factsheet and Price the Fees",
          type: "ASSIGNMENT",
          xp: 75,
          minutes: 50,
          md: `${DISCLAIMER}

Your assignment is to **read one real fund factsheet closely and calculate what its costs would mean over 20 years.** This is a reading exercise, not a buying exercise. Pick any fund you hold or have heard of. The goal is to understand the document, not to judge whether the fund is right for you.

## Part A: Find the factsheet

Every mutual fund publishes a monthly factsheet and a scheme information document, usually on the fund house's website. Download the latest factsheet. If you choose an index fund, also note which index it tracks.

## Part B: Extract the facts

Fill in this table from the factsheet:

| Field | Your fund |
|---|---|
| Fund category (e.g. large-cap equity, index, short-duration debt, hybrid) | |
| Stated objective (one sentence) | |
| Benchmark index | |
| Expense ratio — direct plan | |
| Expense ratio — regular plan | |
| Exit load | |
| Lock-in, if any | |
| Number of holdings | |
| Top 10 holdings as % of fund | |
| Largest sector and its % | |
| Riskometer level shown | |

If a field is not in the factsheet, check the scheme information document, and write where you found it.

## Part C: Price the fees

Use a spreadsheet. Assume ₹5,000 a month for 20 years and a gross return of 10% a year before costs, clearly labelled as an assumption.

1. Calculate the final value at the **direct plan** expense ratio. Use a monthly rate of ((1 + 0.10 − expense ratio) ^ (1/12)) − 1, and the spreadsheet function FV(monthly_rate, 240, -5000, 0, 1), where the final 1 means you invest at the start of each month.
2. Calculate the final value at the **regular plan** expense ratio.
3. Calculate the difference in rupees.
4. Express that difference as a percentage of the total amount invested (₹12,00,000).

Worked sample, using hypothetical ratios of 0.5% and 1.5%: the direct version ends at about ₹34,10,000, the regular at about ₹30,30,000. The gap is roughly ₹3,80,000, or nearly a third of everything invested.

## Part D: Concentration check

Look at the top 10 holdings and largest sector. Write one sentence on how concentrated the fund is. A fund with 70% in ten companies behaves very differently from one with 25% in its top ten.

## Part E: Three questions

Write three questions you would want answered before investing in this fund. For example: "How has it performed after costs relative to its benchmark over full market cycles?" or "How would gains be taxed if I redeemed in three years under current rules?"

## Deliverable

Submit:

1. Your completed fact table.
2. Your fee comparison with formulas, assumptions and the rupee and percentage difference.
3. Your concentration sentence.
4. Your three questions.

## Standard

Every number is traceable to a page of the factsheet or scheme document. Every return is labelled as an assumption. Nothing in your submission says "buy" or "sell". The skill you are building is reading what a product actually is and costs, so that no one can sell you a story instead of a fact.`,
        },
        {
          title: "Investment Fundamentals — Knowledge Check",
          type: "QUIZ",
          minutes: 8,
          md: `${DISCLAIMER}

Check your understanding of asset classes, funds and costs.`,
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "What happens to the market price of existing bonds when market interest rates rise?",
                options: [
                  "It tends to rise",
                  "It tends to fall",
                  "It does not change",
                  "It always doubles",
                ],
                correct: 1,
                why: "New bonds pay the higher rate, so older bonds paying less become less attractive and their price tends to fall.",
              },
              {
                prompt: "An index fund aims to:",
                options: [
                  "Beat the market by picking winners",
                  "Match the return of a chosen index, minus costs",
                  "Guarantee a fixed return",
                  "Avoid all market falls",
                ],
                correct: 1,
                why: "Index funds hold the index's securities and try to track it, typically at lower cost than active funds.",
              },
              {
                prompt: "₹10 lakh grows for 20 years at an assumed 10% before costs. Roughly how much more does a 0.2% fee leave compared with a 1.5% fee?",
                options: ["About ₹1.3 lakh", "About ₹5 lakh", "About ₹13.8 lakh", "No difference"],
                correct: 2,
                why: "About ₹64.9 lakh versus ₹51.1 lakh. Small annual fees compound into large gaps over decades.",
              },
              {
                prompt: "Why is a regular plan of a mutual fund usually more expensive than the direct plan of the same scheme?",
                options: [
                  "It holds different investments",
                  "It includes distributor commission in the expense ratio",
                  "It is taxed differently",
                  "It has a guaranteed return",
                ],
                correct: 1,
                why: "Same portfolio, different cost. The regular plan's higher expense ratio pays for distribution.",
              },
              {
                prompt: "Someone offers an investment with high returns, no risk and instant access. What is the most sensible conclusion?",
                options: [
                  "Invest quickly before the offer closes",
                  "It is a warning sign; no asset reliably offers all three",
                  "It must be a government scheme",
                  "It is suitable for an emergency fund",
                ],
                correct: 1,
                why: "Return, risk and access trade off against each other. Promises of guaranteed high returns are a classic fraud signal.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // MODULE 7
    // ─────────────────────────────────────────────────────────────
    {
      title: "Risk, Diversification and Stock Market Basics",
      description: "Understand what risk really is, how diversification reduces it, and how the stock market works.",
      objectives: [
        "Define investment risk as a range of outcomes and your ability to hold through it.",
        "Explain how diversification and asset allocation reduce the impact of any single loss.",
        "Describe how stock exchanges, indices and basic valuation measures work.",
        "Design an illustrative asset allocation with a written rebalancing rule.",
      ],
      completion: "Submit an illustrative allocation with a stress test and a written rebalancing rule.",
      lessons: [
        {
          title: "What Risk Really Is, and How Diversification Helps",
          type: "READING",
          minutes: 11,
          md: `${DISCLAIMER}

Most people define risk as "the chance of losing money". That is incomplete. A better definition: **risk is the range of possible outcomes, and whether you can hold on through the bad part of that range.**

## Volatility versus permanent loss

A fall in price is volatility. It becomes a permanent loss in two main ways: the asset itself fails (a company goes bankrupt), or you sell at the bottom because you panic or need the cash. Diversification protects against the first. An emergency fund and a time horizon protect against the second.

## The maths of losses

Losses and gains are not symmetrical.

| Fall | Gain needed to recover |
|---|---|
| −10% | +11% |
| −25% | +33% |
| −50% | +100% |

And averages mislead. ₹1,00,000 that rises 50% and then falls 50% is not back to ₹1,00,000. It goes to ₹1,50,000, then to **₹75,000**. The "average" return is zero; the actual result is a 25% loss. Avoiding deep losses matters more than chasing high gains.

## Diversification: not putting everything in one place

If you own one company and it halves, your portfolio halves. If you own twenty companies in equal amounts and one halves, your portfolio falls 2.5%. That is diversification at its simplest.

It works on several levels:

- **Within an asset class:** many companies, across sectors.
- **Across asset classes:** equity, debt, cash and real assets often move differently.
- **Across geographies:** economies do not all move together.
- **Across time:** investing monthly spreads your entry points.

Diversification does not prevent losses. In a broad market fall, most shares fall together. What it does is reduce the chance that one bad event decides your whole outcome.

## Asset allocation

**Asset allocation** is how you split money between asset classes. It drives much of how a portfolio behaves.

Worked example. ₹10,00,000, and a year when equities fall 40% while debt rises 5% (hypothetical numbers):

| Allocation | Equity part | Debt part | Year-end value | Change |
|---|---|---|---|---|
| 100% equity | ₹6,00,000 | — | ₹6,00,000 | −40% |
| 60% equity / 40% debt | ₹3,60,000 | ₹4,20,000 | ₹7,80,000 | −22% |
| 30% equity / 70% debt | ₹1,80,000 | ₹7,35,000 | ₹9,15,000 | −8.5% |

In strong years, the order reverses. Higher equity usually means more growth potential and deeper falls. The right mix depends on your horizon, your need for the money, and honestly, how you would behave watching ₹4 lakh disappear on paper.

## Risk capacity and risk tolerance

- **Risk capacity** is financial: how much loss your plans can absorb. A long horizon, stable income and full emergency fund raise it.
- **Risk tolerance** is emotional: how much loss you can watch without selling.

Your allocation should respect the lower of the two. A plan you abandon in a crash is worse than a more cautious plan you keep.

## Rebalancing

Over time, the mix drifts. Suppose a 60/40 portfolio of ₹10,00,000 has a year where equity rises 30% and debt rises 5%. Equity becomes ₹7,80,000 and debt ₹4,20,000. The total is ₹12,00,000, now 65% equity.

Rebalancing means moving it back to target: about ₹60,000 from equity to debt. It forces a discipline most people find hard: trimming what has risen and adding to what has lagged. Common rules are calendar-based (once a year) or threshold-based (when any asset drifts more than 5 percentage points). Note that selling can trigger taxes and costs; many people rebalance by directing new money instead.

## The takeaway

You cannot remove risk. You can choose which risks you take, spread them, and make sure you are never forced to sell at the worst time.`,
        },
        {
          title: "How the Stock Market Works",
          type: "READING",
          minutes: 11,
          md: `${DISCLAIMER}

The stock market is often presented as a casino or a money machine. It is neither. It is a marketplace where ownership in businesses changes hands. Understanding the plumbing removes much of the mystery and much of the fear.

## Primary and secondary markets

When a company first sells shares to the public, it raises money in the **primary market**, often through an initial public offering (IPO). After that, investors trade those shares with each other on a stock exchange. That is the **secondary market**. When you buy a share on an exchange, your money goes to another investor, not to the company.

In India, shares trade mainly on two national exchanges, regulated by SEBI. Trades go through a registered broker, and shares are held electronically in a demat account.

## What moves a share price

In the short term, prices move with supply and demand: news, sentiment, interest rates, global events and large investors buying or selling. In the long term, prices tend to follow what the business earns and is expected to earn. A business that grows its profits for decades usually becomes more valuable. One that does not, usually does not.

## Indices

An index tracks a basket of shares to represent a market or a segment. Broad indices of the largest listed companies are commonly used as a summary of how "the market" did. Indices are also the benchmarks that funds measure themselves against, and the baskets that index funds copy.

## Market capitalisation

**Market cap = share price × number of shares.** A company with 10 crore shares at ₹500 has a market cap of ₹5,000 crore. Companies are often grouped as large-cap, mid-cap and small-cap. Smaller companies have historically tended to be more volatile, with a wider range of outcomes.

## Basic valuation: the P/E ratio

The **price-to-earnings ratio** compares the share price with the company's profit per share (EPS).

Worked example: share price ₹500, EPS ₹25. P/E = 500 ÷ 25 = **20**. You are paying ₹20 for every ₹1 of current annual profit. Flip it and you get the **earnings yield**: 25 ÷ 500 = 5%.

A high P/E means the market expects strong future growth, or that the share is expensive, or both. A low P/E can mean the share is cheap, or that the business has problems. P/E alone tells you little; it is one question, not an answer.

## Dividends

Some companies pay part of their profits to shareholders as dividends. Others reinvest everything to grow. Neither is automatically better. Dividends are taxed under the rules in force at the time.

## Trading versus investing

- **Investing** means owning businesses, directly or through funds, for years, and letting earnings growth and compounding work.
- **Trading** means buying and selling frequently to profit from short-term price moves.
- **Derivatives** such as futures and options are leveraged contracts. Small price moves can create large gains or losses, sometimes more than the amount put in.

Regulators in several markets, including SEBI, have published studies finding that a large majority of individual traders in equity derivatives lost money. Check the latest regulator publications rather than relying on anyone's summary. Frequent trading also adds brokerage, taxes and the behaviour gap: buying excitement and selling fear.

## Red flags

Be wary of:

- Tips on messaging apps or social media promising sure-shot gains.
- Anyone who guarantees returns on shares.
- Pressure to act today.
- Requests to share your trading login or OTP, or to let someone else "manage" your account.

## The takeaway

The stock market rewards patient ownership of growing businesses over time, with no guarantee in any given year. It punishes leverage, haste and borrowed conviction. You do not need to pick stocks to benefit from it; many people simply own the whole market through diversified funds.`,
        },
        {
          title: "Assignment: Design and Stress-Test an Allocation",
          type: "ASSIGNMENT",
          xp: 75,
          minutes: 50,
          md: `${DISCLAIMER}

Your assignment is to **design an illustrative asset allocation for one long-term goal, stress-test it against a bad year, and write a rebalancing rule.** This is a learning exercise. It is not a recommendation, and you should not act on it without considering your full situation and, ideally, speaking with a licensed adviser.

## Step 1: Choose the goal

Use the goal you priced in Module 5, or another goal at least seven years away. Write:

- The goal and target year.
- The amount you currently hold for it (it can be zero).
- The monthly amount you plan to add.

## Step 2: Rate your risk capacity

Answer each with a short note:

1. How many years until you need this money?
2. Is your emergency fund complete?
3. How stable is your income?
4. Could you delay this goal by two years if markets were down?

More time, a full buffer, stable income and flexibility all raise capacity.

## Step 3: Rate your risk tolerance

Picture your goal money at ₹10,00,000. Write down honestly what you would do if it showed ₹6,50,000 one morning. Options: hold, add more, sell some, sell everything. Then write what you did, or how you felt, during the last market fall you remember.

## Step 4: Draft an allocation

Using the lower of capacity and tolerance, write an illustrative split across equity, debt and cash for this goal. Write one paragraph explaining your reasoning.

## Step 5: Stress test

Apply this hypothetical bad year to your current or projected balance: **equity −35%, debt +4%, cash +3%.** Calculate the year-end value and the percentage change.

Worked sample: ₹8,00,000 split 70% equity, 25% debt, 5% cash.

- Equity: ₹5,60,000 × 0.65 = ₹3,64,000
- Debt: ₹2,00,000 × 1.04 = ₹2,08,000
- Cash: ₹40,000 × 1.03 = ₹41,200
- Total: ₹6,13,200, a fall of about **23%**.

Then answer: "Could I hold through this without selling, and would my goal survive it?" If the answer is no, adjust the split and test again. Record both versions.

## Step 6: Write your rebalancing rule

Choose one:

- **Calendar:** check once a year on a fixed date.
- **Threshold:** act when any asset drifts more than a set number of percentage points from target.

Then write how you would rebalance: by directing new monthly money to the underweight asset, by switching, or both. Note that switching may have tax and exit-load consequences under current rules.

## Step 7: Glide path

As the goal approaches, money usually needs to become more stable. Write how your split might shift over time, for example moving gradually towards debt and cash in the last three to five years.

## Deliverable

Submit:

1. Goal, horizon and current amount.
2. Your capacity and tolerance answers.
3. Your illustrative allocation with reasoning.
4. Your stress-test calculation, before and after any adjustment.
5. Your rebalancing rule and glide-path note.

## Standard

All return figures are labelled hypothetical. The allocation is described as illustrative. No specific fund, share or provider is named. The real output is not a perfect split; it is a written rule you set while calm, to follow when markets are not.`,
        },
        {
          title: "Risk, Diversification and Stock Market Basics — Knowledge Check",
          type: "QUIZ",
          minutes: 8,
          md: `${DISCLAIMER}

Check your understanding of risk, diversification, allocation and how markets work.`,
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "An investment falls 50%. What gain is needed to get back to the starting value?",
                options: ["50%", "75%", "100%", "150%"],
                correct: 2,
                why: "₹1,00,000 falling 50% becomes ₹50,000. Doubling it (+100%) is needed to return to ₹1,00,000.",
              },
              {
                prompt: "You hold 20 shares in equal amounts. One falls 50% and the rest are flat. How much does the portfolio fall?",
                options: ["50%", "10%", "5%", "2.5%"],
                correct: 3,
                why: "Each holding is 5% of the portfolio. Half of 5% is 2.5%. Diversification limits the damage from one failure.",
              },
              {
                prompt: "A share trades at ₹600 and earnings per share are ₹30. What is the P/E ratio?",
                options: ["5", "18", "20", "30"],
                correct: 2,
                why: "P/E = price ÷ EPS = 600 ÷ 30 = 20.",
              },
              {
                prompt: "Which should set your allocation when risk capacity and risk tolerance differ?",
                options: [
                  "Whichever allows more equity",
                  "The lower of the two",
                  "Neither; follow recent market returns",
                  "The higher of the two",
                ],
                correct: 1,
                why: "A plan must survive both your finances and your nerves. A plan you abandon in a crash fails.",
              },
              {
                prompt: "When you buy a listed share on a stock exchange, your money goes to:",
                options: [
                  "The company, to fund its growth",
                  "Another investor who is selling",
                  "The regulator",
                  "The stock exchange as a deposit",
                ],
                correct: 1,
                why: "Secondary market trades are between investors. Companies raise money in the primary market, such as an IPO.",
              },
            ],
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // MODULE 8
    // ─────────────────────────────────────────────────────────────
    {
      title: "Long-Term Planning and Financial Decision-Making",
      description: "Bring everything together into a long-term plan and a way of making money decisions you can trust.",
      objectives: [
        "Estimate a long-term goal such as retirement using inflation and a withdrawal multiple.",
        "Recognise common behavioural biases and mis-selling patterns.",
        "Apply a simple decision checklist to any financial product or choice.",
        "Write a one-page personal financial plan with a review schedule.",
      ],
      completion: "Submit a one-page personal financial plan and an updated balance sheet compared with Module 1.",
      lessons: [
        {
          title: "Planning for the Long Run: Retirement and Life Goals",
          type: "READING",
          minutes: 11,
          md: `${DISCLAIMER}

Long-term planning is not predicting the future. It is making a reasonable estimate, acting on it, and correcting it as life unfolds. A rough plan you follow beats a perfect plan you never start.

## Retirement in four steps

Retirement is usually the largest long-term goal, because it may need to fund twenty or thirty years of life without a salary.

**Step 1: Today's expenses.** Estimate what your lifestyle in retirement would cost in today's money. Some costs may fall (commuting, EMIs); others may rise (healthcare).

**Step 2: Inflate it.** Convert to the year you plan to retire.

**Step 3: Size the corpus.** Multiply the first year's expenses by a multiple. Planners use various methods and multiples depending on retirement length, assumed returns and inflation. A multiple of 25 to 35 times first-year expenses is a commonly discussed range. We use 30 here, purely for illustration.

**Step 4: Work back to a monthly saving.**

## Worked example

Neha is 35 and plans to retire at 60.

- Today's monthly expenses: ₹50,000.
- Assumed inflation: 6% a year for 25 years.
- Monthly expenses at 60: about **₹2,14,600**. Yearly: about ₹25,75,000.
- Illustrative corpus at 30×: about **₹7.7 crore**.

That number looks impossible at first. Break it down.

- She already has ₹10,00,000 in retirement savings. At an assumed 10% a year for 25 years, that could grow to about ₹1.08 crore.
- The remaining gap is about ₹6.6 crore.
- At an assumed 10% a year, funding the full ₹7.7 crore from scratch would need about ₹62,000 a month for 25 years. Funding only the ₹6.6 crore gap needs about ₹53,000 a month. Her existing savings did real work.

## The levers when the number is too big

If the required saving does not fit, change one of the inputs:

1. **Start earlier or retire later.** Each extra year adds both a year of saving and a year of compounding.
2. **Increase saving every year.** A 10% annual step-up in the monthly amount makes the starting amount much smaller.
3. **Adjust the lifestyle target.** A lower expense estimate shrinks the corpus.
4. **Include other income.** Pension, rent or part-time work in retirement reduces what the corpus must fund.

Never solve the gap by assuming a higher return. That moves the risk onto a number you do not control.

## Other long-term goals

Use the same method for any long goal: today's cost, inflate, subtract existing savings grown forward, calculate the monthly saving. Run every goal separately, then add the monthly amounts. If the total exceeds what you can save, rank the goals. Retirement usually cannot be funded by a loan later; some other goals can be delayed or scaled.

## Estate basics

Long-term planning includes what happens if you are not there.

- **Nominations** on every bank account, investment, policy and provident fund account. Check they are current.
- **A will** that states clearly who receives what. Nomination and inheritance are not always the same in law; a will clarifies intent.
- **A simple record** of accounts, policies and contacts, kept where a trusted person can find it.

These cost little and prevent great difficulty for the people you leave behind. A lawyer or qualified professional can guide you on the rules that apply to you.

## Review, do not reinvent

Revisit the plan once a year and after any major life event: marriage, a child, a job change, an inheritance or a health event. Update the numbers. Keep the structure. Most of the value comes from staying the course.`,
        },
        {
          title: "Making Good Money Decisions",
          type: "READING",
          minutes: 10,
          md: `${DISCLAIMER}

Knowledge is necessary but not sufficient. People who understand compounding still buy at the top and sell at the bottom. People who know about fees still sign up for expensive products when a persuasive person is across the table. Good outcomes depend on how you decide, not only on what you know.

## Biases that cost money

- **Loss aversion.** A loss tends to hurt more than an equal gain pleases. It pushes people to sell in falls and to avoid sensible risks.
- **Herd behaviour.** Buying what everyone around you is buying, usually after the price has already risen.
- **Recency bias.** Assuming the last year will repeat. A great year makes people overconfident; a bad year makes them quit.
- **Overconfidence.** Believing you can pick winners or time markets more reliably than you can.
- **Anchoring.** Fixating on the price you paid, rather than on what the asset is worth now and whether it still fits your plan.
- **Present bias.** Valuing today's pleasure far above tomorrow's security. This is why automation works: it removes the monthly decision.

You will not eliminate these. You can build systems that make them less costly: written rules, automatic transfers, a cooling-off period and a review schedule.

## Spotting mis-selling

Some patterns suggest a product is being sold for the seller's benefit rather than yours:

- **Urgency.** "This offer closes today." Good long-term decisions rarely depend on a deadline.
- **Guarantees of high returns** with no mention of risk.
- **Complexity** you cannot explain back in two sentences.
- **Bundling** of insurance and investment where neither part is clearly priced.
- **Reluctance to give documents** or a written list of all charges.
- **Commission not disclosed** when you ask how the seller is paid.

If you see two or more, slow down.

## A decision checklist

Before any significant financial decision, answer these in writing:

1. **What problem does this solve,** and which goal does it serve?
2. **What does it cost,** in total, including fees, charges and taxes?
3. **What can go wrong,** and what is the worst realistic outcome?
4. **How easy is it to exit,** and what does exiting cost?
5. **How does it fit my allocation and emergency fund?**
6. **How is the person recommending it paid?**
7. **Would I still do this after waiting 48 hours?**

Worked example: Dev is offered a policy promising "₹50 lakh life cover plus guaranteed returns" for ₹1,00,000 a year for 20 years. He runs the checklist. He finds the life cover is lower than a separate term policy would give at a fraction of the premium; the implied return on the savings part, after charges, is modest; and surrender in the first years would lose much of what he paid. He decides to separate cover from saving and ask a fee-only adviser to review both options. The checklist did not tell him what to buy. It stopped him from buying in a hurry.

## When to get professional help

General education takes you a long way. Seek a qualified professional when:

- Your situation is complex: business income, multiple properties, cross-border assets, inheritance.
- A decision is large or hard to reverse.
- Tax treatment is unclear.
- You notice you keep making the same mistake.

In India, check that an investment adviser is registered with SEBI and understand how they are paid: a flat fee, a percentage of assets, or commissions. Ask for that in writing.

## The takeaway

Most financial damage comes from a few bad decisions made in a hurry, not from a lack of clever ones. Slow, written, rules-based decisions are your best protection.`,
        },
        {
          title: "Assignment: Write Your One-Page Financial Plan",
          type: "ASSIGNMENT",
          xp: 100,
          minutes: 75,
          md: `${DISCLAIMER}

This is the capstone. Your assignment is to **write a one-page personal financial plan that brings together every module, and to compare your balance sheet with the one you built in Module 1.** It is a plan for you to follow and review, not a recommendation from Tycoonhood.

## Section 1: Where I stand

Rebuild your balance sheet from Module 1 with today's figures:

- Total assets, total liabilities, net worth.
- Liquid assets.
- Average monthly In, Out, Kept and savings rate over the last three months.

Write the change in each figure since Module 1, and one sentence on what drove it.

## Section 2: Cashflow system

Summarise your allocation plan from Module 2:

- Percentages or amounts for needs, obligations, wants, sinking fund, emergency fund, debt and investing.
- The automatic transfers in place and their dates.

## Section 3: Debt

From Module 3: your remaining debts, chosen method, and projected debt-free month. If you are debt-free, write your rule for future borrowing in one sentence, for example "No borrowing for depreciating items; card paid in full every month."

## Section 4: Protection

From Module 4:

- Emergency fund target, current balance and date you expect to reach it.
- Life and health cover in place, and any gap you identified.
- Status of nominations and will.

## Section 5: Goals

List up to five goals. For each, give:

| Goal | Target year | Future cost | Monthly saving | Assumed return (labelled) |
|---|---|---|---|---|

Include retirement, estimated using the Module 8 method. If the total monthly saving is more than you can afford, rank the goals and note which you will delay or scale.

## Section 6: Investment approach

From Modules 6 and 7, in general terms:

- Your illustrative allocation for each goal horizon.
- Your rebalancing rule.
- Your cost rule, for example a maximum expense ratio you are willing to pay for a given type of fund.

Do not name specific funds or providers in this plan.

## Section 7: Decision rules

Write three personal rules drawn from the decision-making lesson. Examples:

- "I wait 48 hours before any financial purchase over ₹25,000."
- "I do not act on investment tips from messaging groups."
- "I ask every seller how they are paid, in writing."

## Section 8: Review schedule

Write the dates for:

- A monthly 15-minute check of cashflow and transfers.
- A quarterly net worth update.
- An annual full plan review.

Add the questions you want to take to a qualified professional, if any.

## Deliverable

Submit one page (two at most) with all eight sections, and a short comparison of your Module 1 and Module 8 balance sheets.

## Standard

The plan is specific: real numbers, real dates, labelled assumptions. It is simple enough that you could explain it to a family member in five minutes. It contains rules you can follow on a bad day, not just intentions for a good one.

The plan will be wrong in places. That is expected. A plan's value is not that it predicts the future. It is that it gives you a baseline to correct, so every decision is made against a standard instead of a mood.`,
        },
        {
          title: "Long-Term Planning and Financial Decision-Making — Knowledge Check",
          type: "QUIZ",
          minutes: 8,
          md: `${DISCLAIMER}

Check your understanding of long-term planning, biases and decision-making.`,
          quiz: {
            passScore: 75,
            questions: [
              {
                prompt: "Monthly expenses are ₹50,000 today. At an assumed 6% inflation, roughly what will they be in 25 years?",
                options: ["About ₹75,000", "About ₹1,25,000", "About ₹2,15,000", "About ₹5,00,000"],
                correct: 2,
                why: "₹50,000 × 1.06²⁵ ≈ ₹2,14,600. Long-term plans must be priced in future rupees.",
              },
              {
                prompt: "Your retirement plan does not fit your budget. Which response is least reliable?",
                options: [
                  "Start earlier or retire later",
                  "Increase the monthly saving each year",
                  "Assume a higher rate of return until the numbers work",
                  "Lower the lifestyle target",
                ],
                correct: 2,
                why: "Raising the assumed return changes nothing real; it moves risk onto a number you do not control.",
              },
              {
                prompt: "You keep holding a share only because you want to get back to the price you paid. Which bias is this?",
                options: ["Herd behaviour", "Anchoring", "Present bias", "Recency bias"],
                correct: 1,
                why: "Anchoring fixes attention on the purchase price instead of on current value and fit with your plan.",
              },
              {
                prompt: "Which is a common warning sign of mis-selling?",
                options: [
                  "A written list of all charges",
                  "Pressure to decide today and a promise of guaranteed high returns",
                  "Disclosure of how the seller is paid",
                  "Encouragement to take time to think",
                ],
                correct: 1,
                why: "Urgency and guaranteed high returns are classic signs that a product is being sold for the seller's benefit.",
              },
              {
                prompt: "Why are nominations and a will part of long-term planning?",
                options: [
                  "They increase investment returns",
                  "They make it clear who receives your assets and reduce difficulty for your family",
                  "They are needed to open a bank account",
                  "They reduce income tax",
                ],
                correct: 1,
                why: "Estate basics ensure assets reach the right people with less delay and dispute.",
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
      "Twelve questions across all eight modules: cashflow, budgeting, debt, protection, compounding, investing, risk and long-term planning. Educational only; this assessment checks understanding, not suitability of any product.",
    questions: [
      {
        prompt: "Take-home pay is ₹90,000 and spending is ₹72,000. What is the savings rate?",
        options: ["18%", "20%", "25%", "80%"],
        correct: 1,
        why: "Kept is ₹18,000. ₹18,000 ÷ ₹90,000 = 20%.",
      },
      {
        prompt: "Which entry belongs on the liabilities side of a personal balance sheet?",
        options: ["EPF balance", "Outstanding principal on an education loan", "Fixed deposit", "Resale value of a vehicle"],
        correct: 1,
        why: "Liabilities are what you owe. The other three are assets.",
      },
      {
        prompt: "What is the purpose of a sinking fund?",
        options: [
          "To invest in falling markets",
          "To set aside money monthly for known irregular costs",
          "To repay debts faster",
          "To replace the emergency fund",
        ],
        correct: 1,
        why: "Sinking funds spread known non-monthly costs across the year so they never arrive as emergencies.",
      },
      {
        prompt: "Debts: card A ₹40,000 at 42%, card B ₹15,000 at 30%, loan ₹2,00,000 at 13%. Under the avalanche method, which gets extra payments first?",
        options: ["Card B", "Card A", "The loan", "All equally"],
        correct: 1,
        why: "Avalanche targets the highest interest rate first: card A at 42%.",
      },
      {
        prompt: "Essential monthly expenses are ₹30,000. What is a 6-month emergency fund target?",
        options: ["₹30,000", "₹90,000", "₹1,80,000", "₹3,60,000"],
        correct: 2,
        why: "₹30,000 × 6 = ₹1,80,000. Targets are based on essential expenses.",
      },
      {
        prompt: "Why is pure term insurance usually the least expensive way to buy a large life cover?",
        options: [
          "It pays a maturity benefit",
          "It pays only on death during the term and has no savings component",
          "It is guaranteed by the government",
          "It includes health cover",
        ],
        correct: 1,
        why: "Without a savings element, the premium pays only for the risk of death during the term.",
      },
      {
        prompt: "₹1,00,000 grows at an assumed 10% a year. Roughly what is it worth after 20 years?",
        options: ["₹3,00,000", "₹4,50,000", "₹6,70,000", "₹10,00,000"],
        correct: 2,
        why: "1.1²⁰ ≈ 6.73, so about ₹6,73,000. Compounding grows faster than simple interest.",
      },
      {
        prompt: "A deposit pays 6% after tax and inflation is 6%. What is the approximate real return?",
        options: ["12%", "6%", "About 0%", "−6%"],
        correct: 2,
        why: "Real return is roughly after-tax return minus inflation: 6% − 6% ≈ 0%. Buying power is flat.",
      },
      {
        prompt: "Two funds hold the same index. One charges 0.2% a year, the other 1.2%. Over 20 years, what should you expect?",
        options: [
          "No meaningful difference",
          "The higher-cost fund will do better because it costs more",
          "The lower-cost fund will likely end with noticeably more, because fees compound",
          "Both are guaranteed the same return",
        ],
        correct: 2,
        why: "Same holdings, different cost. The fee gap compounds into a large difference over decades.",
      },
      {
        prompt: "A portfolio is 60% equity, 40% debt. After a strong year it is 68% equity. What does rebalancing do?",
        options: [
          "Moves money from equity to debt to restore the target",
          "Moves more money into equity because it is rising",
          "Sells everything",
          "Nothing; drift is always fine",
        ],
        correct: 0,
        why: "Rebalancing restores the chosen risk level by trimming what has grown above target.",
      },
      {
        prompt: "Which statement about the stock market is accurate?",
        options: [
          "Shares always rise over any five-year period",
          "Short-term prices move with sentiment; long-term prices tend to follow business earnings",
          "Derivatives reduce risk for most individual traders",
          "Buying a listed share sends money directly to the company",
        ],
        correct: 1,
        why: "Prices are noisy in the short run and more tied to earnings over long periods, with no guarantee in any year.",
      },
      {
        prompt: "A seller urges you to buy today, promises guaranteed high returns and will not share the charges in writing. What is the best response?",
        options: [
          "Buy before the offer closes",
          "Slow down, ask for all charges in writing and apply your decision checklist",
          "Buy a smaller amount to test it",
          "Ask a friend whether they bought it",
        ],
        correct: 1,
        why: "Urgency, guarantees and hidden charges are mis-selling signals. A written checklist and time protect you.",
      },
    ],
  },
};
