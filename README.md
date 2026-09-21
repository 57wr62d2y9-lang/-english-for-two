# English for Two · 0.3

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
- $0 for incomplete lessons or accuracy below 75%; $1 for completion.
  $2 requires 28 checked answers, >=95% accuracy, four types and 22 unaided
  unique successes. $3 requires 45 answers, >=98%, six types, 40 unaided
  successes, 38 unique successes, media/IELTS/recall and a fast pace.
- Five minutes caps at $1. One reward per morning/evening slot.
  Speaking self-assessment and hinted answers cannot farm higher rewards.
- Spaced mastery, checkpoints and final knowledge verification are separate from
  the practice ascent. The planned 400 units per route are not all published.

## Couple and personal backups

- One-time six-character pairing; no manual sharing URL fallback.
- Gift wishes, requests, decisions and partner lesson/earnings news update
  automatically. Failed gift submissions do not reserve local credit.
- Telegram push requires TELEGRAM_BOT_TOKEN and verified Telegram init data.
  Without the token, the in-app inbox works; closed-app push is not claimed.
- Authenticated private backups cover per-item progress, lesson history,
  wallet records and paused lessons. Atomic merges reject stale writes.
  Partner snapshots never include private learning records.
- UUID + random 256-bit secret authenticates the device; only SHA-256 is stored.
  RLS and explicit deny policies block direct browser database access.

## Development

Run npm ci, npm run validate, then npm run dev.
Set VITE_COUPLE_SYNC_URL at frontend build time.
The backend is supabase/functions/english-for-two-sync/index.ts; migrations are
versioned under supabase/migrations.

Tests include 33 original checks and 9 lesson regressions. The opt-in
tests/backend-smoke.mjs requires EFT_LIVE_TEST_URL and checks live backups,
stale-write protection, identity isolation, notifications/deduplication and gifts.
It creates fresh QA accounts and writes their exact disposable IDs to
/tmp/eft-v03-qa-account-ids.json for scoped cleanup.

All existing infrastructure remains free. No cron configuration is changed.
