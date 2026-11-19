-- Short shareable links. A row now backs every shared plan, not only the
-- emailed ones: Copy link on the page stores the plan with kind 'link' and
-- no email, and the link carries the row's share_id instead of the whole
-- plan. The reader-facing route returns plan and name only, never the email.

alter table public.calculator_plans alter column email drop not null;
alter table public.calculator_plans add column share_id text unique;
alter table public.calculator_plans add column kind text not null default 'email';
alter table public.calculator_plans add constraint calculator_plans_kind_check check (kind in ('email', 'link'));

comment on column public.calculator_plans.share_id is 'Short id in the shareable link, /calculator?s=<share_id>.';
comment on column public.calculator_plans.kind is 'email: the reader asked for the plan by email. link: the reader pressed Copy link.';
