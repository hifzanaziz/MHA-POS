-- DEVELOPMENT DRAFT ONLY. Do not run against production until RLS/RPC audit and backup.
begin;
create table if not exists public.mha_company (
 id bigint generated always as identity primary key,
 company_code text not null unique,
 company_name text not null,
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.mha_store (
 id bigint generated always as identity primary key,
 company_id bigint not null references public.mha_company(id),
 store_code text not null,
 store_name text not null,
 public_slug text not null unique,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(company_id,store_code),
 unique(id,company_id)
);
create table if not exists public.mha_role (
 id bigint generated always as identity primary key,
 company_id bigint not null references public.mha_company(id),
 role_code text not null,
 role_name text not null,
 is_active boolean not null default true,
 unique(company_id,role_code),
 unique(id,company_id)
);
create table if not exists public.mha_user_profile (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null,
 company_id bigint references public.mha_company(id),
 role_id bigint,
 default_store_id bigint,
 is_active boolean not null default true,
 is_super_admin boolean not null default false,
 created_at timestamptz not null default now(),
 foreign key (role_id,company_id) references public.mha_role(id,company_id),
 foreign key (default_store_id,company_id) references public.mha_store(id,company_id),
 unique(user_id,company_id),
 constraint super_admin_not_tenant_bound check (not is_super_admin or (company_id is null and role_id is null and default_store_id is null)),
 constraint regular_user_company_required check (is_super_admin or (company_id is not null and role_id is not null and default_store_id is not null))
);
create table if not exists public.mha_user_store (
 user_id uuid not null references public.mha_user_profile(user_id) on delete cascade,
 company_id bigint not null,
 store_id bigint not null,
 primary key(user_id,store_id),
 foreign key(store_id,company_id) references public.mha_store(id,company_id),
 foreign key(user_id,company_id) references public.mha_user_profile(user_id,company_id)
);
create table if not exists public.mha_role_permission (
 role_id bigint not null references public.mha_role(id) on delete cascade,
 submodule_code text not null,
 access_level text not null check(access_level in ('NONE','VIEW','EDIT')),
 primary key(role_id,submodule_code)
);
create table if not exists public.mha_store_product_availability (
 store_id bigint not null references public.mha_store(id),
 production_sku_id bigint not null references public.production_sku(id),
 -- Company ownership must additionally be enforced before migration is applied.
 -- Cross-company product assignment is NOT safe until a composite FK is added.
 is_available boolean not null default true,
 primary key(store_id,production_sku_id)
);
create table if not exists public.mha_admin_audit (
 id bigint generated always as identity primary key,
 actor_user_id uuid references auth.users(id),
 action text not null,
 entity_type text not null,
 entity_id text,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
-- Lock new tables until vetted, scoped RLS policies and privileged RPCs are added.
alter table public.mha_company enable row level security;
alter table public.mha_store enable row level security;
alter table public.mha_role enable row level security;
alter table public.mha_user_profile enable row level security;
alter table public.mha_user_store enable row level security;
alter table public.mha_role_permission enable row level security;
alter table public.mha_store_product_availability enable row level security;
alter table public.mha_admin_audit enable row level security;
commit;
