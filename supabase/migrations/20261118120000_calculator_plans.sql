-- Magazine calculator, email capture (build spec, Nov 17 2026, second
-- release). One row per "Email me this plan" send: the address, the plan
-- as JSON, the four headline figures and the verdict as computed on the
-- server, the shareable link, the newsletter opt-in, and attribution.
--
-- Writes come from the server route /api/calculator/email with the service
-- role, which validates the plan and sends the email in the same request.
-- RLS is on and no policy is granted to the public key, so the table is
-- not readable or writable from the browser.

create table public.calculator_plans (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  plan_name text,
  plan jsonb not null,
  profit numeric,
  profit_confirmed numeric,
  cash_needed numeric,
  break_even_copies numeric,
  verdict text,
  share_url text,
  newsletter_opt_in boolean not null default false,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  first_touch jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index calculator_plans_email_idx on public.calculator_plans (email);
create index calculator_plans_created_at_idx on public.calculator_plans (created_at desc);

alter table public.calculator_plans enable row level security;

comment on table public.calculator_plans is
  'Plans readers asked to have emailed from neesh.art/calculator. Inserted by the server route only.';
