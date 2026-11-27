drop function if exists public.platform_delete_restaurant(uuid);

create function public.platform_delete_restaurant(p_restaurant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_name text;
  v_user_ids uuid[] := array[]::uuid[];
  v_user_id uuid;
  v_deleted_users integer := 0;
begin
  if not private.is_platform_admin() then
    raise exception 'Platform administrator access required';
  end if;

  select r.name into v_name
  from public.restaurants r
  where r.id = p_restaurant_id
  for update;

  if not found then
    raise exception 'Restaurant not found';
  end if;

  select coalesce(array_agg(distinct m.user_id), array[]::uuid[])
    into v_user_ids
  from public.memberships m
  where m.restaurant_id = p_restaurant_id;

  delete from public.payments where restaurant_id = p_restaurant_id;
  delete from public.orders where restaurant_id = p_restaurant_id;
  delete from public.restaurants where id = p_restaurant_id;

  foreach v_user_id in array v_user_ids loop
    if not exists (
      select 1 from public.memberships m where m.user_id = v_user_id
    )
    and not exists (
      select 1 from public.platform_admins pa
      where pa.user_id = v_user_id or pa.created_by = v_user_id
    ) then
      delete from auth.users where id = v_user_id;
      if found then
        v_deleted_users := v_deleted_users + 1;
      end if;
    end if;
  end loop;

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'restaurant.deleted',
    'restaurant',
    p_restaurant_id::text,
    jsonb_build_object(
      'name', v_name,
      'deleted_user_accounts', v_deleted_users,
      'deleted_at', now()
    )
  );

  return jsonb_build_object(
    'restaurant_deleted', true,
    'deleted_user_accounts', v_deleted_users
  );
end;
$function$;

revoke all on function public.platform_delete_restaurant(uuid) from public;
grant execute on function public.platform_delete_restaurant(uuid) to authenticated;
