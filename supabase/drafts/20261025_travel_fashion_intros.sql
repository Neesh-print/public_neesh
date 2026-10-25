-- DRAFT, NOT APPLIED. Niche page intros for Travel and Fashion.
--
-- Lives in supabase/drafts/ rather than supabase/migrations/ on purpose:
-- this is editorial copy, not schema, and it should go live only after the
-- copy has been reviewed. Review the text, then run it by hand against the
-- shared Neesh Supabase project (SQL editor), then POST /api/revalidate
-- (Bearer REVALIDATE_TOKEN, empty body) so
-- the ISR niche pages pick it up.
--
-- NichePage renders directory_tags.intro_md as Markdown above the grid on
-- page 1 of /index/<slug> only.

update directory_tags
set intro_md = $md$Independent travel magazines take their time with a place, through long reporting, photo essays and writing from people who actually live there. They are made to be read slowly and kept, which is why they sell to the reader planning the next trip and to the shop that wants something worth picking up off the table. Some of these titles can be ordered wholesale through Neesh, and every title page shows where it's stocked.$md$
where slug = 'travel';

update directory_tags
set intro_md = $md$Independent fashion magazines treat clothing as culture, with essays, archives, long interviews and photography that has room to breathe. They reach readers who care how things are made and worn, and they give a shop a reason for those readers to come back when the next issue lands. Some of these titles can be ordered wholesale through Neesh, and every title page shows where it's stocked.$md$
where slug = 'fashion';
