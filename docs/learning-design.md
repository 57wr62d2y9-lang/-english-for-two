# Learning and reward design

This document records why the product behaves as it does. The app is for two real learners, not a generic streak game.

## Product principles

1. **One obvious next action.** Home shows minutes left today, reviews ready, and one primary session button.
2. **No daily lock.** Reaching the target is a success state, not a reason to stop. Extra practice remains available.
3. **Activity is not mastery.** Practice XP gives immediate feedback. Course points require retained knowledge.
4. **Recognition is only the beginning.** Multiple-choice recognition is weak evidence; spoken recall, new context, and listening carry more weight.
5. **Meaning is never hidden.** The Russian meaning is visible before practice; real-life examples show a cached Russian translation as well.
6. **Grammar is a reference.** It does not appear as unrelated rule questions inside phrase sessions.
7. **Rewards are earned slowly.** A quarter-route reward needs 100 verified units and a checkpoint, not repeated tapping.
8. **Claims stay honest.** The 400-unit route is an internal curriculum target. Published content and planned content are shown separately, and neither is called an official CEFR certificate.

## Review state

The transparent review targets are approximately day 1, 3, 5, 8, 12, 30, 60, and 90 after first exposure. Returning late never creates a same-day cascade: the next successful review is scheduled at least one day later.

An item is course-verified when all of the following are true:

- it was recalled correctly on at least four distinct local calendar days;
- at least two correct checks used a real-life context;
- at least 30 days have passed since first exposure;
- its current state has not been demoted by a later error.

The “Очень хорошо знаю” button removes the item from the normal short queue and schedules a delayed recall check after 35 days. Passing that check verifies the unit and schedules a rare 90-day recheck. Failing it returns the item to ordinary learning. Legacy records that previously used an infinite due date are migrated into this flow.

A failed phrase enters a small in-session recovery queue. After 2–4 different tasks it returns in another form (for example, recognition → recall). A second failure can be retried later, but the item is never repeated mechanically three times in a row. The long-term schedule remains the main evidence of retention.

## Route and reward economics

| Measure | Meaning |
|---|---|
| Practice XP | Immediate activity feedback; cannot be spent |
| $1–$3 routine credit | Once per morning/evening slot; based on time, accuracy, task diversity, hard-task success, and recovery |
| 10 course points | One currently verified knowledge unit |
| 1,000 course points | 100 units, or 25% of a 400-unit route |
| $100 gift credit | Awarded once after an 8/10 quarter checkpoint |
| $400 gift credit | Maximum from one fully completed route |

Gift dollars are trust-based personal credits. They do not represent cash, cannot charge a card, and are not secure against a person editing their own browser storage. A reward request can be shared with the other person for fulfilment.

## Benchmarks reviewed

The design borrows principles, not proprietary content or visual copies.

| Product or standard | Useful principle | Decision in English for Two |
|---|---|---|
| [Anki](https://docs.ankiweb.net/deck-options.html) | Retention and workload must be balanced; failures matter | Due reviews come first, mistakes shorten the schedule, repeated easy taps do not farm XP |
| [Busuu Vocabulary Review](https://help.busuu.com/hc/en-us/articles/16911730266513-What-is-Vocabulary-Review) | Memory strength changes over time | Home makes due review load visible; status can fall after an error |
| [Babbel review](https://support.babbel.com/hc/en-us/articles/360037496932-Memorising-vocabulary) | Correct and incorrect answers should affect future timing | Correct recall advances the target; an error returns to a short review |
| [Quizlet Learn](https://help.quizlet.com/hc/en-us/articles/360030986971-Studying-with-Learn) | A visible goal makes a study session concrete | Daily minutes, session duration, and route milestones are explicit |
| [Memrise](https://www.memrise.com/) | Useful chunks and human speech are more practical than isolated lists | The core item is a phrase with real-life examples; listening links use human recordings |
| [Speak](https://www.speak.com/) | Learners need to produce language, not only recognise it | Recall asks the learner to say the phrase aloud before revealing it |
| [ELSA Speak](https://elsaspeak.com/en/) | Pronunciation deserves dedicated feedback | The app prompts speaking but does not pretend to score pronunciation without a real speech model |
| [LingQ](https://www.lingq.com/en/) | Meaningful content supports acquisition | Examples and listening are situation-based rather than random sentences |
| [Duolingo Score](https://blog.duolingo.com/duolingo-score/) | Progress should be visible in small increments | Route points and the exact distance to the next quarter are always shown |
| [EF English Live](https://englishlive.ef.com/en/) | Real-world scenarios make practice relevant | Travel, work, relationships, shopping, and home life dominate the phrase sets |
| [British Council B1 listening](https://learnenglish.britishcouncil.org/free-resources/listening/b1) | Preparation, human audio, and comprehension tasks belong together | Listening lessons link to the recording and include short original checks |
| [CEFR level descriptions](https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions) | CEFR is a broad proficiency framework | A2/B1/B2/C1 label content difficulty, but route completion is not presented as certification |
| [Cambridge guided learning hours](https://support.cambridgeenglish.org/hc/en-gb/articles/202838506-Guided-learning-hours) | Level progress takes substantial, variable time | The app avoids promising a level from a small card count or a fixed number of days |

## Technical boundaries

- Each Telegram user has independent CloudStorage; each learner therefore has a genuinely separate cabinet.
- Sync is best effort and bounded by Telegram’s per-key storage limits. Progress uses 64 compact buckets per level.
- Automatic partner sync uses an optional Supabase Free project. A server-side Edge Function validates signed Telegram `initData`; the frontend never receives the bot token or database service key.
- Public tables have RLS enabled and grant no `anon` or `authenticated` access. Only the authenticated Edge Function service role reads or writes them.
- Pairing uses a six-character one-time code valid for 15 minutes and stable Telegram user IDs. Only level, verified percentage, today's minutes, routine status, virtual balance, active goals, and gift requests are shared. Detailed mistakes and SRS history remain private.
- If the shared service is unavailable, the prior explicit Telegram Mini App link flow remains available. cron-job.org notifications are unchanged.
- Example translations use MyMemory’s small anonymous free allowance and are cached on the phone. The authored phrase meaning remains available if that service is temporarily unreachable.
- External listening remains on the publisher’s page, keeping human audio and source rights intact.
- IELTS progress is stored separately from CEFR progress. The app uses original practice prompts and public legal audio links and never labels its feedback as an official IELTS band score.
