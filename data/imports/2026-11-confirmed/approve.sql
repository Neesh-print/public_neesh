-- Approve the November 2026 distributor-confirmed batch in one go.
--
-- Every row the batch created (titles, their new publishers and their latest
-- issue rows) carries review_note = 'import 2026-11 distributor-confirmed'
-- and review_status = 'pending'. Approving flips them to approved and sets
-- verified_at, exactly as review_directory_record() does per row. Run in the
-- Supabase SQL editor as the service role, then POST /api/revalidate.
--
-- To approve a single title instead:
--   select review_directory_record('title', '<title uuid>', 'approved');
-- (and the same with 'publisher' and 'issue' for its publisher and issue).
-- To drop one before it goes live, use 'rejected' in place of 'approved':
-- rejected rows are hidden by RLS and never render.

begin;

-- 1. What is about to change.
select 'titles' as kind, count(*) from directory_titles
  where review_status = 'pending' and review_note = 'import 2026-11 distributor-confirmed'
union all
select 'publishers', count(*) from directory_publishers
  where review_status = 'pending' and review_note = 'import 2026-11 distributor-confirmed'
union all
select 'issues', count(*) from directory_issues
  where review_status = 'pending' and review_note = 'import 2026-11 distributor-confirmed';

-- 2. Approve.
update directory_titles
   set review_status = 'approved', reviewed_at = now(), verified_at = now()
 where review_status = 'pending' and review_note = 'import 2026-11 distributor-confirmed';

update directory_publishers
   set review_status = 'approved', reviewed_at = now()
 where review_status = 'pending' and review_note = 'import 2026-11 distributor-confirmed';

update directory_issues
   set review_status = 'approved', reviewed_at = now(), verified_at = now()
 where review_status = 'pending' and review_note = 'import 2026-11 distributor-confirmed';

commit;
