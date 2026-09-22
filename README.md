# English for Two · 0.5.1

## Fixed rewards (0.5.1)

- $1 per completed morning lesson and $1 per completed evening lesson,
  regardless of accuracy, hints or speed. The existing completion rule remains:
  12 active minutes and five checked answers, or four minutes and three answers
  for a short lesson. Incomplete practice is saved, but not paid as completion.
- $5 per distinct passed checkpoint (8/10), with the original milestone IDs.
- $100 once for completing the published A2 programme: all 306 lexical units
  verified, checkpoints at 100/200/300, and a 16/20 final. Other levels retain
  their existing final-verification targets; this release adds no new payout
  for them. The gopher's 80 practice stages do not themselves award $100.
- $10 for every non-overlapping block of 30 consecutive dates with **both**
  lessons completed. A missed morning or evening resets the unfinished streak,
  never a paid balance. Each day/slot counts once, across levels and lesson IDs.
- Actual completed lesson history counts. Legacy payment-only imports are not
  treated as proof: older $1 rewards could be earned for unfinished practice.
  New payments explicitly record completion for safe new-device restoration.
- Study dates use the existing Istanbul clock (UTC+3); morning is 04:00–14:00.
  Same-day lessons retain their start slot. A draft resumed on a later date
  counts on completion day and cannot backfill a missed day.
- Existing $2/$3 lessons and $100 checkpoints are untouched, and retaking a
  previously paid checkpoint cannot add a second payment. Completed streaks
  reconcile idempotently on restore; claimed date ranges prevent overlap when
  earlier lesson history is restored later. Wallet restore now reads all entries
  in bounded batches instead of silently stopping at 80 records.

## Vocabulary-first lessons (0.5.0)

- Removed external videos/audio and stand-alone grammar quizzes from daily
  lessons and checkpoints. Optional device pronunciation never blocks a task.
- Added 400 original word cards (100 per level), each with a Russian usage note
  and two independently translated situations. Existing phrase IDs are retained.
- 1,012 distinct headwords/expressions overall, not multiplied by examples.
  Level pools: A2 306, B1 311, B2 205, C1 204; some cross-level headwords cover
  different senses. Duplicate legacy cards are aliases, not false introductions.
- Both daily slots mix fresh material, due reviews and within-session practice.
  Recognition success leaves the due queue. Future reviews are not used as filler.
- Choose up to 8, 12 (default) or 16 new units per ordinary lesson; up to 4 in a
  five-minute lesson. An explicit extra-batch button adds more when ready.
- Vocabulary progress separates introduced, written recall, long retention,
  unseen and due counts. The catalogue is not a native-level vocabulary promise.
- Old paused tasks migrate without losing identity, time or answers. Telegram
  keeps legacy bucket addresses and uses bounded overflow parts when needed.

## Tap-to-translate (0.4.2)

- Tap a word in daily lesson prompts, passages, options, examples, rules or
  feedback to open a dismissible native dialog with a Russian meaning,
  the actual tapped sentence, and up to two distinct course examples.
- Authored offline notes explain ambiguous function words (will/would,
  articles, prepositions), known word forms and contractions. Visible phrases
  such as "works for me" have their idiomatic meaning, not a literal word gloss.
- Existing full-sentence/passage translation remains available. Unknown words
  and untranslated examples use the existing MyMemory service on demand;
  successes are cached and identical concurrent requests are deduplicated.
  Offline/limit failures offer retry; no fabricated example is inserted.
- Word taps never choose an answer. English options have a separate "Выбрать"
  button. Sentence assembly has a translation mode that preserves chosen words.
- A native dialog supplies modal focus handling and Escape/backdrop dismissal.
  Component tests cover independent answer selection, order preservation,
  stale-request protection and cleanup. Lookups set only the existing hint flag:
  they do not create wrong answers or alter reward thresholds.
- `tests/word-preview.jsx` is an isolated lesson-only UI harness, without a
  mounted account/backup/wallet component. `node tests/build-word-preview.mjs
  <temporary-directory>` builds a standalone 390px mobile QA page; it is not
  included in the production build.

Translation service specification: https://mymemory.translated.net/doc/spec.php
and usage limits: https://mymemory.translated.net/doc/usagelimits.php.

Private English practice for Artur and Anna: https://english-for-two.onrender.com.

## Daily lessons

- New units show meaning, usage and life examples before scored practice.
- Recognition, meaning in context, cloze choice, typed recall and sentence
  assembly exercise vocabulary in different ways. Examples rotate by encounters.
- Occasional short, level-specific IELTS Reading remains integrated. Russian
  translations cover passages, not their question headings.
- Grammar and all five conditional explanations remain optional, closed help.
- All added headwords have offline word-tap translations and usage notes.
  Unknown surrounding words can use the existing translator on demand.
- Legacy media/grammar files remain in the repository for history, but external
  media is not imported by the active lesson/checkpoint programme.

## Progress and rewards

- Existing SRS IDs, scheduled review dates and all earned dollars are retained.
- A separate lesson ledger powers the gopher mountain and completion animation.
  A full lesson adds one practice stage; a five-minute lesson adds one third.
  The 80-stage practice goal does not itself certify a CEFR level.
- Previous routine rewards migrate into the ledger once.
- Paused lessons retain question, time and answers across reloads.
- Rewards follow the fixed 0.5.1 policy above. Errors and help are allowed.
- Lesson ascent requires 80% of planned time and five checked answers in a full
  lesson / three in a short lesson. Learning mistakes do not cancel progress.
- One $1 lesson reward per morning/evening slot.
  Speaking self-assessment does not count as a checked answer.
- Vocabulary and Reading errors enter a bounded recovery queue after intervening
  tasks, with at most two immediate retries. Next-day scheduling retains errors.
  The existing reminder system is unchanged; no second scheduler is added.
- Spaced mastery, checkpoints and final knowledge verification are separate from
  the practice ascent. A2 uses its complete published curriculum; the planned
  400 units for the higher-level routes are not all published yet.

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

## Quiet study

The default is "В автобусе · без голоса". Read and rehearse examples silently,
without headphones or a microphone. "Дома · вслух" changes the optional rehearsal
suggestion. There is no video replacement or compulsory speaking task.

## Development

Run npm ci, npm run validate, then npm run dev.
Set VITE_COUPLE_SYNC_URL at frontend build time.
The backend is supabase/functions/english-for-two-sync/index.ts; migrations are
versioned under supabase/migrations.

Tests cover existing wallet, reminders, backups and translation, plus seven
simulated mornings/evenings per level, due backlogs, short lessons, content
validation, deduplication, migration, overflow storage and component interactions.
The opt-in tests/backend-smoke.mjs requires EFT_LIVE_TEST_URL and checks live backups,
stale-write protection, identity isolation, notifications/deduplication and gifts.
It creates fresh QA accounts and writes their exact disposable IDs to
/tmp/eft-v04-qa-account-ids.json for scoped cleanup.

Personal daily morning/evening reminder times are saved through the original
Sites backend at /api/reminders/settings. It verifies Telegram init data, selects
the already linked member server-side and patches only that person's schedule.
Settings survive reloads and work every day, including weekends. The UI supports
timezones and disabling reminders. The existing cron-job.org tick and
delivery deduplication are preserved; no extra scheduler or paid service is added.
