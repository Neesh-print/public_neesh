-- Newsletter sync to HubSpot.
--
-- Consent changes are queued here by triggers and sent to HubSpot by
-- /api/cron/hubspot-sync, which retries failures on the next run. The queue
-- means a HubSpot outage or a missing token never loses a change.
--
-- What enters the queue:
--   mailing_list_subscribers insert (status active)   -> subscribe
--   mailing_list_subscribers status change             -> subscribe / unsubscribe
--   mailing_list_subscribers delete                    -> unsubscribe
--   collectors newsletter_opt_in turned on / off       -> subscribe / unsubscribe
--   collectors row deleted while opted in              -> unsubscribe
--   (deleting a reader's whole account is queued by /api/collect/account,
--    because the auth user, and so the email address, is gone by the time
--    the cascade reaches collectors)
--   existing active mailing list rows, once            -> upsert (contact only)
--
-- Existing subscribers are created as contacts but not subscribed: HubSpot
-- may already hold an opt-out for some of them, and a re-subscription must
-- come from a fresh opt-in, not from old data.

create table hubspot_sync_queue (
  id           bigint generated always as identity primary key,
  email        text not null,
  action       text not null check (action in ('subscribe', 'unsubscribe', 'upsert')),
  source       text not null,
  created_at   timestamptz not null default now(),
  processed_at timestamptz,
  attempts     int not null default 0,
  last_error   text
);
create index hubspot_sync_queue_pending_idx on hubspot_sync_queue (id) where processed_at is null;

-- Server only: no policies, and no table access for the API roles.
alter table hubspot_sync_queue enable row level security;
revoke all on hubspot_sync_queue from anon, authenticated;

-- Mailing list (the newsletter form on neesh.art and the app) ---------------

create function hubspot_queue_mailing_list() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.email is not null and coalesce(new.status, 'active') = 'active' then
      insert into hubspot_sync_queue (email, action, source)
      values (lower(new.email), 'subscribe', coalesce('mailing_list:' || new.source, 'mailing_list'));
    end if;
  elsif tg_op = 'UPDATE' then
    if new.email is not null and new.status is distinct from old.status then
      insert into hubspot_sync_queue (email, action, source)
      values (lower(new.email),
              case when new.status = 'active' then 'subscribe' else 'unsubscribe' end,
              'mailing_list:status');
    end if;
  elsif tg_op = 'DELETE' then
    if old.email is not null then
      insert into hubspot_sync_queue (email, action, source)
      values (lower(old.email), 'unsubscribe', 'mailing_list:deleted');
    end if;
  end if;
  return null;
end $$;

create trigger hubspot_queue_mailing_list
  after insert or update of status or delete on mailing_list_subscribers
  for each row execute function hubspot_queue_mailing_list();

-- Your collection readers ------------------------------------------------------

create function hubspot_queue_collector() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_email text;
begin
  if tg_op = 'DELETE' then
    if old.newsletter_opt_in then
      select lower(email) into v_email from auth.users where id = old.user_id;
      if v_email is not null then
        insert into hubspot_sync_queue (email, action, source) values (v_email, 'unsubscribe', 'collect:deleted');
      end if;
    end if;
    return null;
  end if;

  if (tg_op = 'INSERT' and new.newsletter_opt_in)
     or (tg_op = 'UPDATE' and new.newsletter_opt_in is distinct from old.newsletter_opt_in) then
    select lower(email) into v_email from auth.users where id = new.user_id;
    if v_email is not null then
      insert into hubspot_sync_queue (email, action, source)
      values (v_email, case when new.newsletter_opt_in then 'subscribe' else 'unsubscribe' end, 'collect:settings');
    end if;
  end if;
  return null;
end $$;

create trigger hubspot_queue_collector
  after insert or update of newsletter_opt_in or delete on collectors
  for each row execute function hubspot_queue_collector();

revoke execute on function hubspot_queue_mailing_list() from public, anon, authenticated;
revoke execute on function hubspot_queue_collector() from public, anon, authenticated;

-- Existing sign-ups, as contacts only ------------------------------------------

insert into hubspot_sync_queue (email, action, source)
select distinct lower(email), 'upsert', 'backfill'
from mailing_list_subscribers
where email is not null and coalesce(status, 'active') = 'active';
