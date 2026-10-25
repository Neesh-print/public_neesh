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
set intro_md = $md$Independent travel magazines stay long enough to know a place, with reporting that takes weeks, photographs that wait for the light and writers who live down the street from the story. They are the souvenir that outlasts the trip, and a stack of them turns into a map of everywhere you have been and everywhere you keep meaning to go. Find one here, see which shop near you carries it, and start keeping track in your collection.$md$
where slug = 'travel';

update directory_tags
set intro_md = $md$Independent fashion magazines are where clothes get taken seriously, as history, as craft and as a way of seeing. They run the long interview, the archive dig and the shoot that would never survive a brand meeting, and they hold their value on the shelf long after the season ends. Every issue picks up the conversation where the last one left off, so find the title that speaks your language, see where it's stocked, and collect the run.$md$
where slug = 'fashion';
