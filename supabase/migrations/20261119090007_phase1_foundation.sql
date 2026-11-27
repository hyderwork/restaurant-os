
create extension if not exists pgcrypto;
do $$ begin
 create type public.restaurant_status as enum ('PENDING','ACTIVE','SUSPENDED','CLOSED');
 create type public.membership_status as enum ('INVITED','ACTIVE','SUSPENDED');
 create type public.staff_role as enum ('OWNER','ADMIN','MANAGER','CASHIER','CHEF','WAITER');
 create type public.subscription_status as enum ('TRIALING','ACTIVE','PAST_DUE','CANCELED','EXPIRED');
 create type public.table_status as enum ('AVAILABLE','OCCUPIED','RESERVED','CLEANING');
 create type public.product_status as enum ('DRAFT','ACTIVE','ARCHIVED');
 create type public.order_status as enum ('NEW','ACCEPTED','COOKING','READY','SERVED','CANCELLED');
 create type public.payment_status as enum ('PENDING','PROCESSING','SUCCEEDED','FAILED','REFUNDED','PARTIALLY_REFUNDED');
 create type public.payment_method as enum ('CASH','CARD','BANK_TRANSFER','EASYPAISA','JAZZCASH','APPLE_PAY','GOOGLE_PAY','OTHER');
exception when duplicate_object then null; end $$;

create table public.users (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null unique, full_name text, phone text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.restaurants (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
 legal_name text, email text, phone text, address jsonb,
 timezone text not null default 'Asia/Karachi', currency varchar(3) not null default 'PKR',
 status public.restaurant_status not null default 'PENDING',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.restaurant_settings (
 id uuid primary key default gen_random_uuid(),
 restaurant_id uuid not null unique references public.restaurants(id) on delete cascade,
 logo_url text, tax_rate numeric(7,4) not null default 0 check(tax_rate >= 0),
 service_charge_rate numeric(7,4) not null default 0 check(service_charge_rate >= 0),
 tax_inclusive boolean not null default false, opening_hours jsonb,
 wifi_ssid text, wifi_password text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.memberships (
 id uuid primary key default gen_random_uuid(),
 restaurant_id uuid not null references public.restaurants(id) on delete cascade,
 user_id uuid not null references public.users(id) on delete cascade,
 role public.staff_role not null default 'WAITER',
 status public.membership_status not null default 'INVITED',
 created_at timestamptz not null default now(), unique(restaurant_id,user_id)
);
create index memberships_user_status_idx on public.memberships(user_id,status);
create index memberships_restaurant_role_idx on public.memberships(restaurant_id,role,status);
create table public.subscription_plans (
 id uuid primary key default gen_random_uuid(), name text not null unique,
 monthly_price numeric(12,2) not null default 0 check(monthly_price >= 0),
 max_tables integer not null default 10, max_staff integer not null default 5,
 features jsonb not null default '{}'::jsonb, active boolean not null default true
);
create table public.subscriptions (
 id uuid primary key default gen_random_uuid(),
 restaurant_id uuid not null references public.restaurants(id) on delete cascade,
 plan_id uuid not null references public.subscription_plans(id) on delete restrict,
 status public.subscription_status not null default 'TRIALING',
 trial_ends_at timestamptz, current_period_start timestamptz not null default now(),
 current_period_end timestamptz not null, created_at timestamptz not null default now()
);
create index subscriptions_restaurant_status_idx on public.subscriptions(restaurant_id,status);
create table public.floors (
 id uuid primary key default gen_random_uuid(),
 restaurant_id uuid not null references public.restaurants(id) on delete cascade,
 name text not null, sort_order integer not null default 0, created_at timestamptz not null default now(),
 unique(restaurant_id,name)
);
create table public.restaurant_tables (
 id uuid primary key default gen_random_uuid(),
 restaurant_id uuid not null references public.restaurants(id) on delete cascade,
 floor_id uuid not null references public.floors(id) on delete cascade,
 number text not null, name text, capacity integer not null default 2 check(capacity > 0),
 status public.table_status not null default 'AVAILABLE', position jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(restaurant_id,number)
);
create index restaurant_tables_status_idx on public.restaurant_tables(restaurant_id,status);
create table public.qr_codes (
 id uuid primary key default gen_random_uuid(),
 restaurant_id uuid not null references public.restaurants(id) on delete cascade,
 table_id uuid not null unique references public.restaurant_tables(id) on delete cascade,
 token_hash text not null unique, active boolean not null default true,
 rotated_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index qr_codes_restaurant_active_idx on public.qr_codes(restaurant_id,active);
create table public.menu_categories (
 id uuid primary key default gen_random_uuid(),
 restaurant_id uuid not null references public.restaurants(id) on delete cascade,
 name text not null, slug text not null, description text, sort_order integer not null default 0,
 active boolean not null default true, unique(restaurant_id,slug)
);
create table public.menu_products (
 id uuid primary key default gen_random_uuid(),
 restaurant_id uuid not null references public.restaurants(id) on delete cascade,
 category_id uuid not null references public.menu_categories(id) on delete restrict,
 name text not null, slug text not null, description text, image_url text,
 base_price numeric(12,2) not null check(base_price >= 0),
 status public.product_status not null default 'DRAFT',
 vegetarian boolean not null default false, spice_level smallint not null default 0 check(spice_level between 0 and 5),
 prep_minutes integer not null default 15 check(prep_minutes > 0),
 ingredients text[] not null default '{}', allergens text[] not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(restaurant_id,slug)
);
create index menu_products_listing_idx on public.menu_products(restaurant_id,status,category_id);
create table public.orders (
 id uuid primary key default gen_random_uuid(),
 restaurant_id uuid not null references public.restaurants(id) on delete restrict,
 table_id uuid not null references public.restaurant_tables(id) on delete restrict,
 order_number bigint not null, public_token_hash text not null unique,
 status public.order_status not null default 'NEW',
 subtotal numeric(12,2) not null check(subtotal >= 0),
 tax_amount numeric(12,2) not null default 0, service_charge numeric(12,2) not null default 0,
 discount_amount numeric(12,2) not null default 0, total numeric(12,2) not null check(total >= 0),
 notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(restaurant_id,order_number)
);
create index orders_restaurant_status_date_idx on public.orders(restaurant_id,status,created_at desc);
create table public.order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid, product_name text not null, quantity integer not null check(quantity > 0),
 unit_price numeric(12,2) not null check(unit_price >= 0),
 line_total numeric(12,2) not null check(line_total >= 0),
 modifiers jsonb not null default '[]'::jsonb, special_instructions text
);
create table public.order_status_history (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 from_status public.order_status, to_status public.order_status not null,
 actor_user_id uuid references auth.users(id) on delete set null, note text, created_at timestamptz not null default now()
);
create index order_status_history_order_date_idx on public.order_status_history(order_id,created_at);
create table public.payments (
 id uuid primary key default gen_random_uuid(),
 restaurant_id uuid not null references public.restaurants(id) on delete restrict,
 order_id uuid not null references public.orders(id) on delete restrict,
 method public.payment_method not null, status public.payment_status not null default 'PENDING',
 amount numeric(12,2) not null check(amount > 0), currency varchar(3) not null default 'PKR',
 provider_reference text, idempotency_key text not null unique, verified_at timestamptz,
 created_at timestamptz not null default now()
);
create index payments_restaurant_status_date_idx on public.payments(restaurant_id,status,created_at desc);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(),
 restaurant_id uuid references public.restaurants(id) on delete set null,
 actor_user_id uuid references auth.users(id) on delete set null,
 action text not null, entity_type text not null, entity_id text,
 metadata jsonb not null default '{}'::jsonb, ip_address inet, created_at timestamptz not null default now()
);
create index audit_logs_restaurant_date_idx on public.audit_logs(restaurant_id,created_at desc);
create index audit_logs_actor_date_idx on public.audit_logs(actor_user_id,created_at desc);

-- Auth profile trigger executes with table-owner privileges; client metadata cannot assign roles.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.users(id,email,full_name)
 values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''))
 on conflict(id) do update set email=excluded.email;
 return new;
end;
$$;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create or replace function private.is_restaurant_member(target_restaurant uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
 select (select auth.uid()) is not null and exists(
  select 1 from public.memberships m where m.restaurant_id=target_restaurant
   and m.user_id=(select auth.uid()) and m.status='ACTIVE'
 );
$$;
create or replace function private.has_restaurant_role(target_restaurant uuid, allowed_roles public.staff_role[])
returns boolean language sql stable security definer set search_path = ''
as $$
 select (select auth.uid()) is not null and exists(
  select 1 from public.memberships m where m.restaurant_id=target_restaurant
   and m.user_id=(select auth.uid()) and m.status='ACTIVE' and m.role=any(allowed_roles)
 );
$$;
revoke all on function private.is_restaurant_member(uuid) from public, anon;
revoke all on function private.has_restaurant_role(uuid,public.staff_role[]) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_restaurant_member(uuid) to authenticated;
grant execute on function private.has_restaurant_role(uuid,public.staff_role[]) to authenticated;

alter table public.users enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.memberships enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.floors enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.qr_codes enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

create policy users_self_select on public.users for select to authenticated using(id=(select auth.uid()));
create policy users_self_update on public.users for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy restaurants_member_select on public.restaurants for select to authenticated using(private.is_restaurant_member(id));
create policy restaurants_owner_update on public.restaurants for update to authenticated using(private.has_restaurant_role(id,array['OWNER','ADMIN']::public.staff_role[])) with check(private.has_restaurant_role(id,array['OWNER','ADMIN']::public.staff_role[]));
create policy settings_member_select on public.restaurant_settings for select to authenticated using(private.is_restaurant_member(restaurant_id));
create policy settings_admin_write on public.restaurant_settings for all to authenticated using(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER']::public.staff_role[])) with check(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER']::public.staff_role[]));
create policy memberships_self_or_admin_select on public.memberships for select to authenticated using(user_id=(select auth.uid()) or private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER']::public.staff_role[]));
create policy memberships_admin_manage on public.memberships for all to authenticated using(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN']::public.staff_role[])) with check(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN']::public.staff_role[]));
create policy plans_authenticated_read on public.subscription_plans for select to authenticated using(active=true);
create policy subscriptions_admin_read on public.subscriptions for select to authenticated using(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN']::public.staff_role[]));
create policy floors_member_read on public.floors for select to authenticated using(private.is_restaurant_member(restaurant_id));
create policy floors_admin_write on public.floors for all to authenticated using(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER']::public.staff_role[])) with check(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER']::public.staff_role[]));
create policy tables_member_read on public.restaurant_tables for select to authenticated using(private.is_restaurant_member(restaurant_id));
create policy tables_staff_write on public.restaurant_tables for all to authenticated using(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER','WAITER']::public.staff_role[])) with check(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER','WAITER']::public.staff_role[]));
create policy qr_admin_access on public.qr_codes for all to authenticated using(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER']::public.staff_role[])) with check(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER']::public.staff_role[]));
create policy categories_member_read on public.menu_categories for select to authenticated using(private.is_restaurant_member(restaurant_id));
create policy categories_admin_write on public.menu_categories for all to authenticated using(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER']::public.staff_role[])) with check(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER']::public.staff_role[]));
create policy products_member_read on public.menu_products for select to authenticated using(private.is_restaurant_member(restaurant_id));
create policy products_admin_write on public.menu_products for all to authenticated using(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER']::public.staff_role[])) with check(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER']::public.staff_role[]));
create policy orders_member_read on public.orders for select to authenticated using(private.is_restaurant_member(restaurant_id));
create policy orders_staff_insert on public.orders for insert to authenticated with check(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER','CASHIER','WAITER']::public.staff_role[]));
create policy orders_staff_update on public.orders for update to authenticated using(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER','CASHIER','CHEF','WAITER']::public.staff_role[])) with check(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER','CASHIER','CHEF','WAITER']::public.staff_role[]));
create policy order_items_member_read on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and private.is_restaurant_member(o.restaurant_id)));
create policy order_items_staff_write on public.order_items for all to authenticated using(exists(select 1 from public.orders o where o.id=order_id and private.has_restaurant_role(o.restaurant_id,array['OWNER','ADMIN','MANAGER','CASHIER','WAITER']::public.staff_role[]))) with check(exists(select 1 from public.orders o where o.id=order_id and private.has_restaurant_role(o.restaurant_id,array['OWNER','ADMIN','MANAGER','CASHIER','WAITER']::public.staff_role[])));
create policy order_history_member_read on public.order_status_history for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and private.is_restaurant_member(o.restaurant_id)));
create policy order_history_staff_insert on public.order_status_history for insert to authenticated with check(exists(select 1 from public.orders o where o.id=order_id and private.has_restaurant_role(o.restaurant_id,array['OWNER','ADMIN','MANAGER','CASHIER','CHEF','WAITER']::public.staff_role[])));
create policy payments_admin_read on public.payments for select to authenticated using(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER','CASHIER']::public.staff_role[]));
create policy audit_admin_read on public.audit_logs for select to authenticated using(restaurant_id is not null and private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN']::public.staff_role[]));
revoke insert,update,delete on public.payments from anon,authenticated;
revoke insert,update,delete on public.audit_logs from anon,authenticated;
