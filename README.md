# English for Two

A mobile-first Telegram Mini App for Artur and Anya. It combines short phrase sessions, spaced reviews, real-life examples, human listening links, visible course progress, and personal gift rewards.

## Learning model

- Each CEFR-labelled route is planned as 400 knowledge units. This is an internal course route, not an official CEFR certificate.
- A published phrase has three original real-life examples and moves through recognition, spoken recall, and contextual choice.
- Review targets are transparent: approximately days 1, 3, 5, 8, 12, 30, 60, and 90 after first exposure. A wrong answer returns the item to a short interval.
- A unit earns 10 course points only after four distinct review days, two context checks, and a long-term check around day 30.
- “I already know it very well” schedules a control review in 30 days; it does not award course points immediately.
- Practice XP measures activity. Course points measure retained knowledge. They are intentionally separate.

## Gift rewards

Every 100 verified units (25% of a 400-unit route) unlocks a 10-question checkpoint. A score of at least 8/10 awards $100 in personal gift credit once. Gift credit is a private promise between the learners: it is not cash, a payment service, or a bank balance.

## Current content

- A2: 200 phrases (50% of the planned route)
- B1: 200 phrases (50% of the planned route)
- B2: 25 phrases
- C1: 20 phrases
- 12 grammar reference topics, 12 collocations, 15 irregular verbs, and external human listening lessons

The interface always shows both the 400-unit route and the number of units currently published, so unfinished content is never presented as complete. The two main routes now contain 400 learning units and 1,200 original real-life examples in total.

## Development

```bash
npm install
npm run validate
npm run dev
```

Progress is stored locally and, inside Telegram, synced to Telegram CloudStorage in bounded buckets. Legacy `eft2` progress is retained and migrated without deleting old keys.
