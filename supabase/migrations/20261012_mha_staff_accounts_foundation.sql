-- Additive foundation: regular staff are NOT Supabase Auth users.
-- No login endpoint is enabled by this migration.
create table if not exists public.mha_staff_account (
  id uuid primary key default gen_random_uuid(),
  company_id bigint not null references public.mha_company(id),
  username text not null,
  display_name text not null,
  password_hash text not null,
  role_id bigint not null,
  default_store_id bigint not null,
  is_active boolean not null default true,
  session_version integer not null default 1 check (session_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mha_staff_username_format check (username = btrim(username) and length(username) between 3 and 80),
  constraint mha_staff_password_hash_format check (length(password_hash) >= 50),
  constraint mha_staff_account_company_identity unique (id, company_id),
  constraint mha_staff_account_role_company_fk foreign key (role_id,company_id) references public.mha_role(id,company_id),
  constraint mha_staff_account_default_store_company_fk foreign key (default_store_id,company_id) references public.mha_store(id,company_id)
);
create unique index if not exists mha_staff_company_username_ci on public.mha_staff_account(company_id,lower(username));
create table if not exists public.mha_staff_store (
  staff_id uuid not null,
  company_id bigint not null,
  store_id bigint not null,
  created_at timestamptz not null default now(),
  primary key(staff_id,store_id),
  foreign key(staff_id,company_id) references public.mha_staff_account(id,company_id) on delete cascade,
  foreign key(store_id,company_id) references public.mha_store(id,company_id)
);
create index if not exists mha_staff_store_company_store on public.mha_staff_store(company_id,store_id);
alter table public.mha_staff_account enable row level security;
alter table public.mha_staff_store enable row level security;
revoke all on table public.mha_staff_account,public.mha_staff_store from public,anon,authenticated;
-- No policies: deny browser access even with a valid Supabase session.
-- Trusted staff API and administrative lifecycle will be implemented separately.
