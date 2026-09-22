# Vocabulary-first learning design · 0.5.0

## Current direction

Learn useful words and expressions through meaning and varied life situations.
Rules are optional context help. Daily tasks and checkpoints require no video,
external recording or spoken answer. Device pronunciation is opt-in.

The catalogue has 400 authored word cards plus existing phrases/collocations:
1,012 distinct headwords/expressions. Every new word card contains a Russian
meaning and usage note, an English definition and two translated examples.
Examples and task variants do not count as additional words. Level pools are
A2 306, B1 311, B2 205, C1 204; cross-level headwords may cover different senses.
Legacy IDs and duplicate aliases retain their progress.

## Selection and repetition

- Every third task reserves a place for a new unit while fresh material and the
  selected quota remain. Both daily slots use the same rule; a large due backlog
  must not eliminate introductions.
- Normal 15-minute quota: up to 12 new units, adjustable to 8 or 16. Five-minute
  quota: up to 4. These are limits, not promised learning outcomes.
- Between introductions, mix due material with consolidation of units introduced
  in this session. Normally five intervening items; three for short sessions.
- A due card appears at most once normally in a session. Introduced units get up
  to two checks. Failures can have up to two separate retries after a gap.
- Never use a future review as filler. When this batch is exhausted, offer an
  explicit additional batch or finish. No automatic three-card loop.
- Recognition success schedules the next day but earns no verified mastery.
  Later contextual/recall success advances the transparent spaced schedule.
- Ordinary targets: day 1, 3, 5, 8, 12, 30, 60 and 90 after first exposure.
  Late returns schedule the next review at least one day later.
- Verified mastery needs four distinct review days, two contextual successes,
  recall or listening evidence, and at least 30 days of retention. An error
  removes verified status. Already-known units get a delayed 35-day recall check.
- Existing audio/grammar progress is preserved, not reset or falsely marked as
  learned, although those tasks are no longer part of the programme.

## Progress and rewards

Introduced, recalled in writing, due, unseen and long-retained counts are separate.
An introduction or repeated click cannot claim long-term knowledge. The gopher
mountain records completed practice independently from vocabulary retention.
Neither 80 practice stages nor a 400-unit internal checkpoint certifies CEFR.
Some planned checkpoint thresholds exceed the currently available level pool.

Existing balances and reward IDs are unchanged. One routine reward per morning
and evening: $1 for five minutes/three checked answers even with mistakes (four
minutes in a short lesson); $2 for a completed ordinary lesson with eight answers,
two task types and >=50% accuracy or two recovered errors; $3 for 12 answers,
>=75% accuracy, three task types and eight different correct tasks. Hints are
allowed, speed is not required. Short lessons cap at $1. Credits are personal
virtual gift credits, not actual payouts. Existing milestone rewards are unchanged.

## Persistence and release safety

- Telegram users retain independent storage and the existing account identity.
- Progress keeps 64 original bucket addresses. Dense buckets split into bounded
  parts below 4,096 characters. Overflow is written before the base, so a failed
  write preserves the old base; retries and newest-record merges recover.
- Supabase private backup and couple sync contracts are unchanged; production
  database, bot secrets and reminder scheduler are not modified.
- Draft migration changes an obsolete task, never earned evidence or lesson ID.
- Pure/component tests simulate a week of daily lessons, all levels, dense
  history, failed saves, a new-device restore and interaction without media.
- New content has offline translations; legacy/unknown text may still request
  the existing on-demand translator. No fabricated fallback is shown.

## Long-term vocabulary ambition

This is an initial catalogue, not tens of thousands of delivered learning units.
Native-speaker estimates depend strongly on what is counted. A 2016 study
estimated about 42,000 recognised lemmas and 4,200 multiword expressions for an
average 20-year-old native American-English speaker, from about 11,100 word
families. This was receptive knowledge, sometimes merely recognising a word's
existence, not a promise of active fluency or a required card count.

Source: [Brysbaert et al., Frontiers in Psychology](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2016.01116/full).
