-- directory_publishers is publicly readable (RLS: removed = false and
-- eligible = true), which also exposed contact_email, claimed_email,
-- claim_method and eligibility_note to anyone with the anon key. Replace the
-- table-wide SELECT with a column grant that leaves those four out.
-- Apply only after the site stops selecting directory_publishers with *.
revoke select on directory_publishers from anon, authenticated;
grant select (
  id, name, slug, website, country, city,
  eligible, claimed, claimed_at, removed, created_from,
  created_at, updated_at,
  stockist_page_url, stockist_status, stockist_note, stockist_checked_at
) on directory_publishers to anon, authenticated;
