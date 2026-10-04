# English for Two · 0.7.3

## Preserved repetition history (0.7.3)

- Three recorded repetition dates spanning at least seven days before the
  October 4 proof release can qualify a word for a new unaided typed check.
  Passing that check now validates the historical repetition dates; previously
  it saved a check timestamp without usable retention evidence.
- The first post-release ordinary recall no longer removes that eligibility.
  History before the latest mistake, hints, self-declarations, fewer than three
  old dates, and post-release ambiguous practice cannot grant this transition.
- The progress screen explains that zero means no new confirmation yet and
  displays preserved work and available checks without inflating level progress.

## Opening artwork (0.7.2)

- The opening screen uses the supplied English for Two couple artwork. A
  square CSS crop shows only the central image, without screenshot controls.
- The same splash appears in the initial HTML before the app bundle loads;
  the image is preloaded. Account loading and saved progress are unchanged.

## Writing variants and focused vocabulary checks (0.7.1)

- Sentence translation accepts narrow documented alternatives: optional
  complement `that`, simple-clause time-adverb positions, `already` at the end
  of an affirmative perfect clause, and `please` positions in modal requests.
  Subject, tense, negation and every other word remain checked. Latin accents
  and additional standard UK/US spellings also compare correctly.
- A nonmatching free translation is inconclusive about lexical recall. It
  records a writing retry, preserves existing mastery proof and schedules a
  focused word recall. An incorrect focused recall still resets proof normally.
  After submission, feedback points to person, negation or construction where
  detectable, with an explicit limit on arbitrary paraphrase recognition.
- Checkpoints and finals assess typed words/phrases or a contextual blank;
  whole-sentence translation remains ordinary practice with construction notes.
  Paused v4/v5 checks upgrade to v6 without losing answered questions, score,
  identity, reward ID or elapsed time. Payout policy is unchanged.
- Typed-card submit controls stay in the footer, visible independently of
  scrolling rules or examples. Empty fields cannot submit. Russian focus labels
  clarify the target lexical unit without showing its English answer.
- Two appended writing fields survive compact/Telegram/private backups. No
  backend deployment, schema change or paid service is needed.

## Independent recall and honest progress (0.7.0)

- Scored vocabulary tasks have no word lookup or sentence translation. They
  alternate canonical meaning recognition, typed recall, typed cloze and full
  typed sentence translation. The ambiguous situation/meaning format is retired.
- Sentence rules explain structure without revealing the target sentence. Full
  explanations, examples and translations appear during introduction or after
  submission. The deterministic checker accepts contractions and punctuation;
  a nonmatching sentence is described as a mismatch with the study model, not
  a claim that all alternative translations are grammatically wrong.
- Only 3 unaided typed recalls on different Istanbul dates, spanning at least
  7 days, followed by a correct hint-free check count as secured vocabulary.
  Multiple choice, exposure, elapsed lesson time and self-declared knowledge
  never count toward the displayed route. A lapse removes proof, not money.
- Automatic checks use ready vocabulary in batches of 5–10, with a smaller
  residual batch at the end of the dictionary. First successful new batches
  pay $5 instead of the normal $1. Repeat checks cannot farm another $5 from
  already rewarded items. At most one scheduled check per level/date leaves
  time for new lessons; failed attempts remain in history and can be retried.
- A2 graduation needs every lexical unit secured and a 16/20 final. Existing
  rewards, lesson history and SRS identifiers remain intact. Old unverified
  exposure counts are shown separately and must earn new independent proof.
- Append-only proof fields round-trip through local/Telegram/private backups.
  Partner profiles carry versioned vocabulary counts in existing JSON metadata;
  stale legacy percentages are not presented as mastery. No DB migration,
  new service, auth/RLS change or paid dependency is required.

Older release sections below document historical behaviour; 0.7.1 refines the
0.7.0 mastery rules above without resetting them.

## Consistent lesson earnings (0.6.1)

- Lesson history and partner news include the actual checkpoint/final payment
  and an attendance bonus settled with the lesson. A passed check shows $5,
  the A2 final $100 and an ordinary lesson plus attendance $11.
- Checkpoints are labelled separately from ordinary lessons in the history
  and partner news. Existing wallet entries, payout rules and deduplication
  IDs remain intact. The shared display helper never credits money.
- Offline endpoint tests execute the real authenticated notification handler
  against in-memory records, including duplicate and unauthorized requests.

## Vocabulary, automatic checks and daily visits (0.6.0)

- Daily lessons contain only vocabulary: no IELTS, video, audio comprehension
  or grammar quizzes. Legacy progress and paused lesson answers remain intact.
- Added 300 original bilingual lexical units: A2 120, B1 100, B2 40 and C1 40.
  The catalogue now contains 1,312 distinct headwords/expressions across levels;
  level pools are 426 / 411 / 245 / 244. New material alternates words and phrases
  where available and keeps its reserved place despite a due-review backlog.
- Compact mobile cards use translated life examples in tabs, a persistent action
  area and word lookup. Sentence assembly always starts from a Russian sentence.
  On every ordinary card, “Очень хорошо знаю” postpones it exactly 35 days.
- Successful due reviews now schedule from the actual review date. A conservative
  compatibility rule corrects legacy one-day schedules without rewriting history.
  Incorrect answers retain their spaced and within-session recovery paths.
- A finished batch with at least five checked answers (three for a short lesson)
  earns the ordinary $1, even if it finishes before the time threshold or includes
  mistakes. Early manual finishes retain the 12-/4-minute thresholds. Partial
  attempts in the same date/slot combine once; payment IDs remain unchanged.
- Three checks unlock at 25%, 50% and 75% of practised vocabulary and replace the
  next daily lesson automatically. Paused controls resume after reload. Passing
  8/10 awards $5 total and marks the daily slot complete; an unsuccessful complete
  attempt earns the ordinary $1. The final is 16/20 after all practised cards and
  all three checks; A2 still awards $100 once. Paid controls cannot be paid again.
- The $10 streak now requires 30 consecutive app visits, with no lesson requirement.
  Actual historical practice proves visits; payment-only imports do not. Existing
  paid date ranges cannot overlap new bonuses. Dates use Istanbul time.
- Personal gifts can be deleted without changing earned/spent money. Deletion
  records survive stale backups and individual bounded CloudStorage records;
  the partner sees active goals. Gift request history is collapsed by default.
- The mountain uses the supplied gopher reference. Calendar themes cover all four
  seasons plus seven-day New Year, Christmas, Halloween, March 8, Valentine and
  May windows. Lesson decor stays unobtrusive; reminder infrastructure is unchanged.
- New regression coverage exercises the reported A2 finish, old repeated phrase,
  visit-only bonuses, actual app check/reload/settlement, deletion/restore, season
  boundaries and daily status. No production QA users or test credits are created.

## Quiet practice and lesson corrections (0.5.2)

- One quiet programme, without a bus/aloud switch on the home or settings screen.
  Legacy aloud settings migrate to quiet without discarding a paused lesson.
- Lesson date and reward slot use actual completion time. A morning-created
  draft finished in the evening earns the evening reward, not another morning
  attempt. Per-slot payment IDs still prevent duplicate credit.
- The daily time ring is explicitly a time goal, not lesson completion. Morning
  and evening badges show actual completion and payment independently.
- Typed answers accept standard contractions and their intended full forms,
  including “I would like” / “I’d like”. Context disambiguates had/would and
  is/has; negation, possessives and explicitly different tenses remain checked.
- Support-corrected lessons retain their original completion time and a separate
  update timestamp, so older local backups cannot undo a correction. No account
  identifiers or one-off refund commands are embedded in the application.
- Regression tests cover the reported answer, cross-slot and midnight finishes,
  restored credit, stale backup merges and quiet-only lesson controls.

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
  All lessons use their actual completion date and slot, including resumed
  drafts. Completing an old draft cannot backfill a missed day.
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
- Canonical recognition, typed cloze, typed recall and typed translation of
  an authored bilingual example exercise vocabulary. Examples rotate by encounters.
- Daily lessons and checkpoints use vocabulary only. Russian translations
  cover the exact example or sentence being practised.
- Introductions and feedback provide offline word-tap translations and usage
  notes. Active scored cards keep lookup and sentence translations hidden.
- Legacy media/grammar files remain in the repository for history, but external
  media is not imported by the active lesson/checkpoint programme.

## Progress and rewards

- Existing SRS IDs, scheduled review dates and all earned dollars are retained.
- The lesson ledger preserves completed practice and rewards independently.
  The gopher mountain and main dictionary meter use secured vocabulary only,
  never lesson count or first encounters, and do not certify a CEFR level.
- Previous routine rewards migrate into the ledger once.
- Paused lessons retain question, time and answers across reloads.
- Ordinary and attendance rewards retain the 0.6.0 rules; checks use 0.7.1 above.
  A finished batch needs five checked answers, or three in a short lesson.
  Early manual finishes also need 12 / 4 active minutes. Errors and help are allowed.
- One $1 lesson reward per morning/evening slot.
  Speaking self-assessment does not count as a checked answer.
- Vocabulary errors enter a bounded recovery queue after intervening
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

Read and rehearse examples silently, without headphones or a microphone.
There is one quiet programme. Device pronunciation is optional.

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
