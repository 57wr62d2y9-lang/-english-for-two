# Learning and reward design

This document records why the product behaves as it does. The app is for two real learners, not a generic streak game.

## Product principles

1. **One obvious next action.** Home shows minutes left today, reviews ready, and one primary session button.
2. **No daily lock.** Reaching the target is a success state, not a reason to stop. Extra practice remains available.
3. **Activity is not mastery.** Practice XP gives immediate feedback. Course points require retained knowledge.
4. **Recognition is only the beginning.** A phrase moves from meaning recognition to spoken recall and then contextual choice.
5. **Translations are optional.** Russian stays hidden until requested and resets for every card.
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

The “already know” button is useful for placement but cannot verify itself. It keeps the item out of routine practice until a 30-day control. A failed control returns it to learning.

## Route and reward economics

| Measure | Meaning |
|---|---|
| Practice XP | Immediate activity feedback; cannot be spent |
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

- Each Telegram user has independent CloudStorage; the static app cannot read another learner’s balance.
- Sync is best effort and bounded by Telegram’s per-key storage limits. Progress uses 64 compact buckets per level.
- The gift ledger is suitable for two people who trust each other. A real shared wallet, approvals, or tamper-proof rewards would require an authenticated backend.
- External listening remains on the publisher’s page, keeping human audio and source rights intact.
