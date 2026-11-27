create or replace function public.mark_order_payment_received(p_order_id uuid,p_method public.payment_method)
returns jsonb language plpgsql security definer set search_path=pg_catalog
as $$
declare v_order public.orders%rowtype; v_user_id uuid; v_payment_id uuid;
begin
 v_user_id:=auth.uid();
 if v_user_id is null then raise exception 'Please sign in'; end if;
 select * into v_order from public.orders where id=p_order_id;
 if not found then raise exception 'Order not found'; end if;
 if not exists(select 1 from public.memberships m where m.restaurant_id=v_order.restaurant_id and m.user_id=v_user_id and m.status::text='ACTIVE' and m.role::text in ('OWNER','ADMIN','MANAGER')) then
  raise exception 'You do not have permission to confirm payments';
 end if;
 select id into v_payment_id from public.payments where order_id=v_order.id and restaurant_id=v_order.restaurant_id and status='SUCCEEDED' limit 1;
 if v_payment_id is null then
  insert into public.payments(restaurant_id,order_id,method,status,amount,currency,provider_reference,idempotency_key,verified_at)
  select v_order.restaurant_id,v_order.id,p_method,'SUCCEEDED',v_order.total,r.currency,
  'MANUAL-'||upper(substr(replace(v_order.id::text,'-',''),1,16)),
  'manual:'||v_order.id::text,now()
  from public.restaurants r where r.id=v_order.restaurant_id
  on conflict(idempotency_key) do update set status='SUCCEEDED',method=excluded.method,amount=excluded.amount,verified_at=now()
  returning id into v_payment_id;
 end if;
 return jsonb_build_object('success',true,'payment_id',v_payment_id);
end $$;
revoke all on function public.mark_order_payment_received(uuid,public.payment_method) from public;
grant execute on function public.mark_order_payment_received(uuid,public.payment_method) to authenticated;