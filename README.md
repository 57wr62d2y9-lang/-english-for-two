# English for Two

A mobile-first Telegram Mini App for Artur and Anya. It combines short phrase sessions, spaced reviews, real-life examples, human listening links, visible course progress, and personal gift rewards.

## Learning model

- Each CEFR-labelled route is planned as 400 knowledge units. This is an internal course route, not an official CEFR certificate.
- A published phrase has a Russian meaning and three original real-life examples. Example translations are fetched from the free MyMemory API and cached on the device.
- Daily sessions adaptively mix phrases, error-driven grammar, level-aware collocations, irregular verbs, spoken recall, context questions, and human listening; there are no separate drill blocks on the home screen.
- Morning sessions prioritise due reviews plus up to two new units. Evening sessions consolidate the day, recover errors and introduce at most one unit when the review queue is light.
- Review targets are transparent: approximately days 1, 3, 5, 8, 12, 30, 60, and 90 after first exposure. A wrong answer returns the item to a short interval.
- A wrong item also returns after 2–4 other tasks in the same session using a different task type.
- A unit earns 10 course points only after distributed evidence: four distinct review days, two context checks, recall or listening evidence, and a long-term check around day 30.
- “Очень хорошо знаю” removes an item from the short queue, then schedules a real verification after 35 days. It awards no course progress until that verification is passed.
- Practice XP measures activity. Course points measure retained knowledge. They are intentionally separate.
- A selected route is not shown as a verified level. The final 20-task check unlocks only after all 400 units are published and retained, all four checkpoints are passed, and requires 16/20.

## Gift rewards

Every completed morning and evening routine can award $1, $2, or $3 once per slot. The transparent calculation considers time, accuracy, task diversity, recall/context/listening success, due reviews, and recovered mistakes; repeated easy recognition cannot earn the top reward. Every 100 verified units (25% of a 400-unit route) unlocks a mixed 10-question checkpoint; a score of at least 8/10 awards $100 once. Gift credit is a private promise between the learners: it is not cash, a payment service, or a bank balance.

## Current content

- A2: 200 phrases (50% of the planned route)
- B1: 200 phrases (50% of the planned route)
- B2: 100 phrases (25% of the planned route)
- C1: 100 phrases (25% of the planned route)
- 12 grammar reference topics, 16 error-driven grammar diagnostics, 27 level-aware collocations, 15 irregular verbs, 13 verified British Council listening lessons, edited phrase families, and 16 original IELTS-style practices

The interface always shows both the 400-unit route and the number of units currently published, so unfinished content is never presented as complete. The four routes contain 600 published learning units and 1,800 original real-life examples in total.

## Development

```bash
npm install
npm run validate
npm run dev
```

Progress, detailed mistakes, personal goals, and reward history are stored locally and, inside Telegram, synced to each learner’s Telegram CloudStorage. A free Supabase Edge Function syncs only the paired partner summary, goals, and gift decisions. Each installation creates a random 256-bit credential; only its SHA-256 hash reaches the database. The secret follows the learner through Telegram CloudStorage when available, browser clients receive no database key or table access, and detailed answers are never shared with the partner. A bot token is optional and is used only for Telegram push notifications. Telegram share links remain the fallback if the shared service is unavailable. Legacy `eft2` and earlier `eft3` progress is retained without deleting old keys.

Set `VITE_COUPLE_SYNC_URL` on the existing static deployment to enable automatic pair sync. The database schema and Edge Function live under `supabase/`.
