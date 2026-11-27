-- Phase 2: secure restaurant onboarding and operational defaults.
create or replace function public.create_restaurant_for_current_user(
  p_name text,
  p_slug text,
  p_phone text default null,
  p_address text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_restaurant uuid;
  v_plan uuid;
  v_floor uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(p_name,''))) < 2 or length(trim(p_name)) > 120 then raise exception 'Restaurant name must be 2–120 characters'; end if;
  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug) > 80 then raise exception 'Invalid restaurant URL'; end if;
  if exists(select 1 from public.memberships where user_id=v_user and status='ACTIVE') then
    raise exception 'Your account already belongs to a restaurant';
  end if;
  insert into public.restaurants(name,slug,phone,address,status)
    values(trim(p_name),p_slug,nullif(trim(coalesce(p_phone,'')),''),
      case when nullif(trim(coalesce(p_address,'')),'') is null then null else jsonb_build_object('line1',trim(p_address),'country','Pakistan') end,
      'ACTIVE') returning id into v_restaurant;
  insert into public.memberships(restaurant_id,user_id,role,status) values(v_restaurant,v_user,'OWNER','ACTIVE');
  insert into public.restaurant_settings(restaurant_id) values(v_restaurant);
  insert into public.floors(restaurant_id,name,sort_order) values(v_restaurant,'Main Floor',0) returning id into v_floor;
  select id into v_plan from public.subscription_plans where active=true order by monthly_price asc limit 1;
  if v_plan is not null then
    insert into public.subscriptions(restaurant_id,plan_id,status,trial_ends_at,current_period_start,current_period_end)
    values(v_restaurant,v_plan,'TRIALING',now()+interval '14 days',now(),now()+interval '14 days');
  end if;
  return v_restaurant;
end;
$$;
revoke all on function public.create_restaurant_for_current_user(text,text,text,text) from public, anon;
grant execute on function public.create_restaurant_for_current_user(text,text,text,text) to authenticated;

create policy floors_manager_insert on public.floors for insert to authenticated
  with check(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER']::public.staff_role[]));
create policy tables_manager_insert on public.restaurant_tables for insert to authenticated
  with check(private.has_restaurant_role(restaurant_id,array['OWNER','ADMIN','MANAGER','WAITER']::public.staff_role[]));