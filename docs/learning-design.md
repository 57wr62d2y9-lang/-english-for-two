# Vocabulary learning design · 0.6.0

Useful words and phrases are the whole active programme. Meaning comes first:
Russian meaning, a short usage note, and two or more life examples. Videos,
IELTS and standalone grammar quizzes are no longer scheduled. Device pronunciation
is optional and limited to the text shown. Individual English words open a
translation sheet without selecting an answer.

There are 1,312 distinct lexical units across all levels, including 300 additions
in this release. A2 / B1 / B2 / C1 contain 426 / 411 / 245 / 244 cards. Repeated
headwords across levels may cover different senses; examples and exercises do not
inflate the count. Original IDs, aliases and progress are preserved.

## Selection and repetition

Every third task reserves new learning when fresh units and the quota remain.
The 15-minute quota is up to 8, 12 or 16; five-minute lessons use up to four.
Words and phrases alternate where available, with unseen release additions given
priority. Due material and consolidation fill the intervening tasks. Future reviews
never fill an empty timer. The learner can finish a batch or explicitly add more.

Recognition success leaves the due queue for three days. Successful due active
reviews schedule 3, 5, 8, 12, 30, 35, 60 and 90 days relative to actual review time.
A conservative read-time compatibility rule postpones legacy one-day schedules
whose recorded successful review otherwise leaves them perpetually overdue.
Historical dates, mistakes, known declarations and backup records are unchanged.

Errors retry after intervening cards, with at most two retries, and receive a
next-day due date. Correctly recalled cards do not return normally later that
same date. “Очень хорошо знаю” is available throughout ordinary learning; it
clears that card from the local recovery queue and sets a 35-day verification,
without inventing a correct answer. Self-declaration is distinct from verified
long-term retention. Verification still needs distributed evidence across days.

## Progress, checks and rewards

Practised-card progress advances the mountain; long-retained vocabulary is a
separate count. Introductions alone do not count as practice. A checked response,
including an error, or an explicit known declaration contributes to course
practice. This is a learning route, not official CEFR certification.

At 25%, 50% and 75% of the actual published level pool, the next daily lesson
becomes a ten-card vocabulary check. A check persists in the normal draft/backup
channel. Passing requires eight correct answers and awards $5 once, with the
existing milestone ID. It completes the daily slot and replaces that slot’s $1.
A failed completed attempt earns the ordinary $1; automatic retry waits until
another date so new learning remains available. Manual retry is still possible.
After all cards and three paid checks, the final has twenty tasks and requires
sixteen correct answers. Completing A2 awards $100 once; other level finals have
no new monetary award.

Ordinary lessons pay $1 per completed morning/evening slot regardless of mistakes,
hints or speed. Finishing a natural batch requires five checked answers, or three
for a short lesson. An early manual exit needs twelve active minutes (four in a
short lesson) and the same answer minimum. Unfinished attempts in the same
completion date/slot combine once and cannot be reused for extra ascent.
Time, actual answers and completion status remain separate.

Every thirty consecutive app-visit dates awards $10 once per non-overlapping
block. Opening the app is enough. Historical actual practice proves an opening;
imported payment records alone do not. The Istanbul clock defines dates and the
existing morning 04:00–14:00 / evening slots. All old earned money is retained.

## Persistence

Canonical and alias progress merge by last update without renaming old records.
Schedule-version fields append to the existing compact tuple format. Progress
buckets and individual wallet/day records remain below CloudStorage’s size cap.
Goal deletions are timestamped records, so stale restores cannot resurrect them.
Only active goals are published to the partner; financial request history remains
available in a collapsed archive.

Own backups retain settings, level progress, day visits, lessons, wallet, and a
paused lesson or checkpoint. Corrections use a separate update timestamp while
preserving the original completion date. Existing reminder settings and the
original scheduler endpoint remain unchanged. Release tests use isolated doubles
and do not contact production accounts.
