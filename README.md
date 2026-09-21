# English for Two · 0.4

Private English practice for Artur and Anna: https://english-for-two.onrender.com.

## Daily lessons

- 600 stable-ID phrases: A2 200, B1 200, B2 100, C1 100.
- Strict level-specific task pools, typed recall, sentence ordering, contextual
  choice, collocations and 56 authored grammar questions.
- 44 original IELTS Reading/Writing/Speaking tasks integrated into daily lessons.
  A2 builds foundation skills; no CEFR-to-IELTS band equivalence is claimed.
- 13 British Council recordings and 8 dedicated teaching videos. Every recording
  is followed by three questions in one uninterrupted block. C1 video questions
  assess inference/discourse and explicitly disclose the B2 source level.
- Exact phrase pronunciation uses device speech synthesis. Generic long-video
  links are absent from the lesson interface.
- All 56 daily grammar questions have sentence-specific Russian translations
  and reasoning. Conditional help includes zero, first, second, third and mixed
  types, with an explicit live/lived and will/would contrast.
- Reading translations cover the full passage (12 authored offline translations),
  not the question heading. IELTS hints use a skill strategy, not generic phrase advice.
- Relevant grammar help links to verified public Russian Englex resources.
  Rule explanations in this repository are original, not copied article text.
- Bilingual rules include construction, explanation and example. “It depends”
  has 12 distinct translated contexts. Additional sentence translations are
  available on demand.
- Task fingerprints do not repeat in a normal session; phrase examples rotate.

## Progress and rewards

- Existing SRS IDs, scheduled review dates and all earned dollars are retained.
- A separate lesson ledger powers the gopher mountain and completion animation.
  A full lesson adds one practice stage; a five-minute lesson adds one third.
  The 80-stage practice goal does not itself certify a CEFR level.
- Previous routine rewards migrate into the ledger once.
- Paused lessons retain question, time and answers across reloads.
- $1 for five active minutes and three checked answers, even with errors (four
  minutes for a five-minute lesson). $2: 12 minutes, eight answers, two types,
  >=50% accuracy OR two corrected mistakes. $3: 12 minutes, 12 answers,
  >=75% accuracy, three types and eight different correctly answered tasks.
  Hints and translations are allowed at every tier. No speed threshold.
- Lesson ascent requires 80% of planned time and five checked answers in a full
  lesson / three in a short lesson. Learning mistakes do not cancel progress.
- Five minutes caps at $1. One reward per morning/evening slot.
  Speaking self-assessment does not count as a checked answer.
- Errors in phrases, grammar, collocations, Reading/Writing and media enter a
  bounded recovery queue (after five intervening tasks; at most two retries).
  Media replays retain a complete three-question block. Due errors are prioritised
  in subsequent lessons. Closed-app delivery still uses the existing reminder
  system; the learning queue itself is not a second notification scheduler.
- Spaced mastery, checkpoints and final knowledge verification are separate from
  the practice ascent. The planned 400 units per route are not all published.

## Couple and personal backups

- One-time six-character pairing; no manual sharing URL fallback.
- Gift wishes, requests, decisions and partner lesson/earnings news update
  automatically. Failed gift submissions do not reserve local credit.
- Telegram push requires TELEGRAM_BOT_TOKEN and verified Telegram init data.
  Without the token, the in-app inbox works; closed-app push is not claimed.
- Authenticated private backups cover per-item progress, lesson history,
  wallet records, settings and paused lessons. Atomic merges reject stale writes.
  Manual save forces server confirmation and shows a local success/error message.
  Unicode stable task IDs such as café no longer reject the whole backup batch.
  Partner snapshots never include private learning records.
- UUID + random 256-bit secret authenticates the device; only SHA-256 is stored.
  RLS and explicit deny policies block direct browser database access.

## Development

Run npm ci, npm run validate, then npm run dev.
Set VITE_COUPLE_SYNC_URL at frontend build time.
The backend is supabase/functions/english-for-two-sync/index.ts; migrations are
versioned under supabase/migrations.

Tests include 33 original checks, 9 lesson regressions and 14 v0.4 checks. The opt-in
tests/backend-smoke.mjs requires EFT_LIVE_TEST_URL and checks live backups,
stale-write protection, identity isolation, notifications/deduplication and gifts.
It creates fresh QA accounts and writes their exact disposable IDs to
/tmp/eft-v04-qa-account-ids.json for scoped cleanup.

Personal daily morning/evening reminder times are saved through the original
Sites backend at /api/reminders/settings. It verifies Telegram init data, selects
the already linked member server-side and patches only that person's schedule.
Settings survive reloads and work every day, including weekends. The UI supports
timezones and disabling reminders. The existing cron-job.org two-minute tick and
delivery deduplication are preserved; no extra scheduler or paid service is added.
