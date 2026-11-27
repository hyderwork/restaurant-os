create schema if not exists private;

create or replace function private.notify_public_order_tracking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_token_hash text;
begin
  if tg_table_name = 'orders' then
    if tg_op = 'DELETE' then
      v_order_id := old.id;
      v_token_hash := old.public_token_hash;
    else
      v_order_id := new.id;
      v_token_hash := new.public_token_hash;
    end if;
  else
    if tg_op = 'DELETE' then
      v_order_id := old.order_id;
    else
      v_order_id := new.order_id;
    end if;
    select o.public_token_hash into v_token_hash
    from public.orders o
    where o.id = v_order_id;
  end if;

  if v_order_id is not null and v_token_hash is not null then
    perform realtime.send(
      jsonb_build_object('order_id', v_order_id),
      'order_changed',
      'order-tracking:' || v_token_hash,
      false
    );
  end if;

  return null;
end;
$$;

revoke all on function private.notify_public_order_tracking() from public, anon, authenticated;

drop trigger if exists orders_public_tracking_realtime on public.orders;
create trigger orders_public_tracking_realtime
after insert or update of status, total on public.orders
for each row execute function private.notify_public_order_tracking();

drop trigger if exists order_items_public_tracking_realtime on public.order_items;
create trigger order_items_public_tracking_realtime
after insert or update or delete on public.order_items
for each row execute function private.notify_public_order_tracking();

drop trigger if exists payments_public_tracking_realtime on public.payments;
create trigger payments_public_tracking_realtime
after insert or update or delete on public.payments
for each row execute function private.notify_public_order_tracking();

drop trigger if exists order_feedback_public_tracking_realtime on public.order_feedback;
create trigger order_feedback_public_tracking_realtime
after insert or update or delete on public.order_feedback
for each row execute function private.notify_public_order_tracking();