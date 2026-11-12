# Content inventory

Last updated 11 November 2026. The counts come from a database built from zero with every seed (see `DATABASE.md`). Test runs add rows to a development database, so count from the seed files, not from a used database.

## Programmes (LMS)

All four are PUBLISHED. Each has 8 modules; every module has 3 taught lessons and a knowledge-check quiz. A final module holds a 12-question final assessment, and the certificate requires passing it. The source is `packages/db/src/curriculum/*.ts`, loaded by `pnpm db:seed:academy`. Every lesson is attributed to the founder instructor, Harsha.

| Programme | Taught lessons | Words (shortest lesson / total) |
|---|---|---|
| Warrior | 24 | 472 / 12,868 |
| Business Mastery | 24 | 451 / 12,105 |
| Financial Planning and Investment Advisory | 24 | 498 / 14,020 |
| Mindfulness and Wellness | 24 | 481 / 13,846 |
| **Total** | **96** | **52,839 words** |

Across the four programmes there are 207 quiz questions, counting the module checks and the finals. Every question has an explanation.


### Warrior

1. Discipline and Consistency: The Case for Training; Consistency Beats Intensity; Write Your Training Contract; Discipline and Consistency — Knowledge Check
2. Physical Conditioning: What Conditioning Actually Is; Intervals With No Equipment; Your Conditioning Baseline; Physical Conditioning — Knowledge Check
3. Strength and Fitness Foundations: The Five Movement Patterns; Progressive Overload, Explained Properly; Build Your Four-Week Programme; Strength and Fitness Foundations — Knowledge Check
4. Nutrition Fundamentals: Energy Balance Without Obsession; Protein, Plants and the Plate; Three-Day Food Audit; Nutrition Fundamentals — Knowledge Check
5. Recovery and Sleep: Sleep Is the Training Multiplier; Reading Fatigue: Soreness, Rest and Deloads; Seven-Night Sleep Audit; Recovery and Sleep — Knowledge Check
6. Mental Resilience: Discomfort Is a Trainable Skill; Self-Talk and the Bad-Day Protocol; Build Your Discomfort Ladder; Mental Resilience — Knowledge Check
7. Habit Formation: How Habits Actually Form; Design Your Environment; Install One Keystone Habit; Habit Formation — Knowledge Check
8. Personal Accountability: Tracking: Numbers Beat Memory; The Weekly Review and Honest Ownership; Your 90-Day Warrior Standard; Personal Accountability — Knowledge Check


### Business Mastery

1. Entrepreneurial Thinking and Finding Opportunities: An Offer Is a Promise With a Price; Where Opportunities Actually Come From; Build Your Opportunity Shortlist; Entrepreneurial Thinking — Knowledge Check
2. Market Research: Customer Conversations That Don't Lie to You; Sizing a Market You Can Actually Reach; Run Five Customer Interviews; Market Research — Knowledge Check
3. Business Models and Unit Economics: How a Business Makes Money: The Model on One Page; Unit Economics: Contribution Margin First; Model One Unit of Your Business; Business Models — Knowledge Check
4. Branding and Positioning: Positioning: Choose the Comparison; A Brand Is a Set of Repeated Promises; Write Your Positioning and Brand One-Pager; Branding and Positioning — Knowledge Check
5. Marketing and Sales: Pricing Without Apologising; Your First Ten Customers, and the Maths of Acquisition; Run a Two-Week Sales Sprint; Marketing and Sales — Knowledge Check
6. Digital Business and Operations: Your Minimum Digital Storefront; Operations: Write the Process Before You Hire for It; Map and Fix One Core Process; Digital Business and Operations — Knowledge Check
7. Financial Management for Founders: Profit Is an Opinion, Cash Is a Fact; Money Habits: Separate Accounts, Tax Reserves and Paying Yourself; Build a Thirteen-Week Cash Flow Forecast; Financial Management — Knowledge Check
8. Team, Leadership, Scaling and Strategy: Your First Hire: What to Delegate and When; Leading a Small Team Without Becoming the Bottleneck; Write Your One-Page Strategy and Scaling Plan; Team, Leadership and Strategy — Knowledge Check


### Financial Planning and Investment

1. Personal Finance Foundations: You Cannot Allocate What You Cannot See; Net Worth: The Balance Sheet of You; Assignment: Build Your Personal Balance Sheet; Personal Finance Foundations — Knowledge Check
2. Budgeting and Saving: Budgeting Methods That Survive Real Life; Assignment: Build a 90-Day Spending Ledger; Saving With a Purpose: Goals, Dates and Accounts; Budgeting and Saving — Knowledge Check
3. Debt Management: What Debt Really Costs; Avalanche, Snowball and the Payoff Order; Assignment: List Every Debt and Choose Your Order; Debt Management — Knowledge Check
4. Emergency Funds and Protection: The Emergency Fund: Boring Cash for a Bad Day; Insurance Basics: Transferring the Risks You Cannot Carry; Assignment: Size Your Buffer and Audit Your Cover; Emergency Funds and Protection — Knowledge Check
5. Compounding and the Time Value of Money: Compounding: Growth on Top of Growth; Inflation and the Time Value of Money; Assignment: Price a Goal in Future Rupees; Compounding and the Time Value of Money — Knowledge Check
6. Investment Fundamentals: The Asset Classes and What They Do; Funds, Index Funds and the Cost of Owning Them; Assignment: Read a Factsheet and Price the Fees; Investment Fundamentals — Knowledge Check
7. Risk, Diversification and Stock Market Basics: What Risk Really Is, and How Diversification Helps; How the Stock Market Works; Assignment: Design and Stress-Test an Allocation; Risk, Diversification and Stock Market Basics — Knowledge Check
8. Long-Term Planning and Financial Decision-Making: Planning for the Long Run: Retirement and Life Goals; Making Good Money Decisions; Assignment: Write Your One-Page Financial Plan; Long-Term Planning and Financial Decision-Making — Knowledge Check


### Mindfulness and Wellness

1. Mindfulness Foundations: Attention Is the Asset; The Ten-Minute Protocol; Seven Days of Everyday Mindfulness; Mindfulness Foundations — Knowledge Check
2. Meditation: Three Ways to Sit; Working With the Wandering Mind; Thirty Days on the Cushion; Meditation — Knowledge Check
3. Breath Awareness: The Breath as an Anchor; Gentle Breathing Practices; Five Days of Breath Check-ins; Breath Awareness — Knowledge Check
4. Emotional Awareness: What an Emotion Is Made Of; Name It, Then Choose: The PLAN Pause; Seven-Day Emotion Log; Emotional Awareness — Knowledge Check
5. Stress Management: Stress Mechanics: Respond, Don't React; Load, Recovery and the Circle of Control; Build Your Personal Stress Protocol; Stress Management — Knowledge Check
6. Sleep and Recovery: How Sleep Works, in Plain Terms; The Wind-Down and the Body Scan; Seven-Night Sleep Experiment; Sleep and Recovery — Knowledge Check
7. Daily Routines and Personal Reflection: Bookends: Designing Your Morning and Evening; Reflection That Changes Something; Seven Days of Bookends and Reflection; Daily Routines and Personal Reflection — Knowledge Check
8. Sustainable Wellness Habits: Habit Architecture; Lapses, Restarts and the Minimum Dose; Your Ninety-Day Wellness Plan; Sustainable Wellness Habits — Knowledge Check

Every module includes a practical assignment lesson. Lesson video is supported (YouTube or a direct file URL via Admin → Courses), but **no videos are recorded yet**.

**Legal note:** the name "Financial Planning and Investment Advisory" and the investment modules are written as education with no individual advice. Have counsel review the name before launch, because of the SEBI investment-adviser rules.

## Gamification

- **Ranks:** 5 (Initiate, Apprentice, Mastermind, Elite, Legend). **Levels:** 50.
- **Missions:**
  - First Steps, Show Up (daily), Know Thyself.
  - Weekly: Five Lessons This Week, Hold the Standard, Prove It.
- **Achievements:** First Course Completed, 7-Day Streak, Community Contributor.
- **Daily standard:** 5 house items. Members may add up to five of their own.

## Community

- **Chat:** the house channels (Announcements, General, Wins) plus a Discussion and a Questions channel for each programme.
- **Forum categories (8):** Introductions, Wins & Progress, Questions, Warrior, Business, Money, Mind, Feedback.
- **Groups (4):** one per programme.
- **Guidelines:** `apps/web/lib/community-guidelines.ts`.
- No seeded posts. The forum starts empty, so that nothing posted is fake.

## Shop

- **Merch (`seed:merch`):**
  - Warrior Hoodie and Operator Tee, each in 5 sizes.
  - Nano Chalk, Lifting Straps and the Ledger Notebook.
- **Pricing:** every seeded product starts with a category and a **placeholder** INR price. `seed:shop` moves the content seed's products to rupees, and `seed:merch` creates its products in rupees. Every landed cost is a placeholder too. Set real prices in Admin → Products before selling. No seed changes a rupee price after that.
- **Coupons:** `WELCOME10` gives 10% off, once per member. It is seeded **inactive**.

## Site content

- **Home:** the hero "Master yourself. / Build your skills. / Create your wealth. / Own your freedom." and 12 sections. Edit them in Admin → Site & CMS.
- **About:** the founder HARSHA, with the photo `apps/web/public/founder/harsha.jpg`. **The copy needs Harsha's review.**
- **Blog:** 3 posts. **Testimonials and success stories:** none. The page explains how stories are collected and never invents one.
- **Legal pages:** Terms, Privacy, Refund policy and Earn terms are written, and **need a lawyer's review**.
- **Photos:** 9 graded Unsplash photos (`apps/web/public/photos/CREDITS.json`).

## Still needed from the owner

- Real product prices and landed costs, in INR.
- Lesson videos, if wanted.
- Real testimonials, with the members' consent.
- Harsha's review of the About copy.
- A lawyer's review of the legal pages and of the investment programme's name.
