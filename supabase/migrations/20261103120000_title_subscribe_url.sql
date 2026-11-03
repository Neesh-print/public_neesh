-- Publisher-supplied subscription link, shown on claimed or listed title pages.
alter table public.directory_titles
  add column if not exists subscribe_url text
  check (subscribe_url is null or subscribe_url ~* '^https?://');
