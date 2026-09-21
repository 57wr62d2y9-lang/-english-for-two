# English for Two

A mobile-first Telegram Mini App for Artur and Anya. It combines short phrase sessions, spaced reviews, real-life examples, human listening links, visible course progress, and personal gift rewards.

## Learning model

- Each CEFR-labelled route is planned as 400 knowledge units. This is an internal course route, not an official CEFR certificate.
- A published phrase has a Russian meaning and three original real-life examples. Example translations are fetched from the free MyMemory API and cached on the device.
- Daily sessions mix phrases, collocations, spoken recall, context questions, and human listening; there are no separate drill blocks on the home screen.
- Review targets are transparent: approximately days 1, 3, 5, 8, 12, 30, 60, and 90 after first exposure. A wrong answer returns the item to a short interval.
- A unit earns 10 course points only after four distinct review days, two context checks, and a long-term check around day 30.
- “Очень хорошо знаю” permanently removes an item from practice and does not award course points.
- Practice XP measures activity. Course points measure retained knowledge. They are intentionally separate.

## Gift rewards

Every completed morning and evening routine can award $1 once per slot. Every 100 verified units (25% of a 400-unit route) unlocks a 10-question checkpoint; a score of at least 8/10 awards $100 once. Learners can create personal reward goals and exchange requests and decisions with free Telegram Mini App links. Gift credit is a private promise between the learners: it is not cash, a payment service, or a bank balance.

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

Progress, personal goals, and reward history are stored locally and, inside Telegram, synced to each learner’s Telegram CloudStorage. Partner snapshots and gift decisions are exchanged by explicit Telegram links, so no paid database or exposed bot token is required. Legacy `eft2` progress is retained and migrated without deleting old keys.
