-- Phase 0.1 security hardening.
-- Backward-safe: existing order creation, add-item, payment and status RPCs remain unchanged.
-- Rollback note: recreate orders_staff_insert and order_items_staff_write from the
-- pre-migration pg_policies snapshot, then drop the three triggers and private functions below.
begin;

-- Orders must be created through the validated transactional RPCs. Direct INSERT
-- allowed clients to bypass server-side price calculation.
drop policy if exists orders_staff_insert on public.orders;

-- Order items are written by SECURITY DEFINER order RPCs. Direct table writes
-- allowed staff to alter product names, quantities and historical line prices.
drop policy if exists order_items_staff_write on public.order_items;

-- Direct order updates may only change status and updated_at. Financial, tenant,
-- customer, table and delivery fields are updated only by approved database RPCs.
create or replace function private.guard_order_direct_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
     and (to_jsonb(new) - 'status' - 'updated_at')
         is distinct from
         (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'Order details can only be changed through an approved order workflow.';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_guard_order_direct_update on public.orders;
create trigger trg_guard_order_direct_update
before update on public.orders
for each row execute function private.guard_order_direct_update();

-- Manual discounts are currently an Owner/Admin override. Delivery-fee overrides
-- are restricted to Owner/Admin/Manager until server-side branch delivery rules exist.
create or replace function private.guard_order_override_authority()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if coalesce(new.discount_amount, 0) > 0
     and not private.has_restaurant_role(
       new.restaurant_id,
       array['OWNER', 'ADMIN']::public.staff_role[]
     ) then
    raise exception 'Only a restaurant Owner or Admin can apply a manual discount.';
  end if;

  if coalesce(new.delivery_fee, 0) > 0
     and not private.has_restaurant_role(
       new.restaurant_id,
       array['OWNER', 'ADMIN', 'MANAGER']::public.staff_role[]
     ) then
    raise exception 'You do not have permission to override the delivery fee.';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_guard_order_override_authority on public.orders;
create trigger trg_guard_order_override_authority
before insert or update of discount_amount, delivery_fee on public.orders
for each row execute function private.guard_order_override_authority();

-- Record product price changes in the existing tenant-scoped audit log.
create or replace function private.audit_menu_product_price_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if old.base_price is distinct from new.base_price then
    insert into public.audit_logs (
      restaurant_id, actor_user_id, action, entity_type, entity_id, metadata
    ) values (
      new.restaurant_id,
      (select auth.uid()),
      'menu_product.price_changed',
      'menu_product',
      new.id::text,
      jsonb_build_object(
        'old_base_price', old.base_price,
        'new_base_price', new.base_price
      )
    );
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_audit_menu_product_price_change on public.menu_products;
create trigger trg_audit_menu_product_price_change
after update of base_price on public.menu_products
for each row execute function private.audit_menu_product_price_change();

-- Record staff membership creation and privilege/status changes.
create or replace function private.audit_membership_access_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_action text;
  v_old_role text;
  v_old_status text;
begin
  if tg_op = 'INSERT' then
    v_action := 'membership.created';
    v_old_role := null;
    v_old_status := null;
  else
    if old.role is not distinct from new.role
       and old.status is not distinct from new.status then
      return new;
    end if;
    v_action := 'membership.access_changed';
    v_old_role := old.role::text;
    v_old_status := old.status::text;
  end if;

  insert into public.audit_logs (
    restaurant_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    new.restaurant_id,
    (select auth.uid()),
    v_action,
    'membership',
    new.id::text,
    jsonb_build_object(
      'target_user_id', new.user_id,
      'old_role', v_old_role,
      'new_role', new.role::text,
      'old_status', v_old_status,
      'new_status', new.status::text
    )
  );

  return new;
end;
$function$;

drop trigger if exists trg_audit_membership_access_change on public.memberships;
create trigger trg_audit_membership_access_change
after insert or update of role, status on public.memberships
for each row execute function private.audit_membership_access_change();

revoke all on function private.guard_order_direct_update() from public, anon, authenticated;
revoke all on function private.guard_order_override_authority() from public, anon, authenticated;
revoke all on function private.audit_menu_product_price_change() from public, anon, authenticated;
revoke all on function private.audit_membership_access_change() from public, anon, authenticated;

commit;
