-- Internal functions were left with Postgres' default EXECUTE grant to
-- PUBLIC (and Supabase's default grant to anon and authenticated), so anyone
-- holding the publishable key could call them through PostgREST:
--
--   refresh_directory_cities()   security definer; rewrites directory_cities
--                                 with a full-table aggregate. Callable as
--                                 POST /rest/v1/rpc/refresh_directory_cities.
--   directory_slugify(text)       helper used by the above and the slug trigger
--   directory_stores_set_slug()   trigger function
--   directory_set_updated_at()    trigger function
--
-- None of them is called by the site with the anon key. Revoke from
-- everyone and grant back to service_role (scripts and route handlers) so
-- the import pipeline keeps working. Trigger functions keep firing: Postgres
-- checks EXECUTE on a trigger function when the trigger is created, not
-- when it fires. The read RPCs the pages call (directory_city_stores,
-- directory_city_top_titles, directory_store_neighbors,
-- directory_listed_stores, directory_store_ranking) keep their explicit
-- grants to anon and authenticated.

revoke execute on function refresh_directory_cities() from public, anon, authenticated;
revoke execute on function directory_slugify(text) from public, anon, authenticated;
revoke execute on function directory_stores_set_slug() from public, anon, authenticated;
revoke execute on function directory_set_updated_at() from public, anon, authenticated;

grant execute on function refresh_directory_cities() to service_role;
grant execute on function directory_slugify(text) to service_role;
grant execute on function directory_stores_set_slug() to service_role;
grant execute on function directory_set_updated_at() to service_role;
