
create or replace function public.get_order_tracking(p_slug text, p_order_id uuid, p_tracking_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
 v_order public.orders%rowtype;
 v_restaurant public.restaurants%rowtype;
 v_payment public.payments%rowtype;
 v_feedback public.order_feedback%rowtype;
 v_cancel_reason text;
 v_paid boolean:=false;
begin
 if p_slug is null or p_order_id is null or p_tracking_token is null or length(p_tracking_token)<32 then
  raise exception 'Invalid tracking link';
 end if;
 select * into v_restaurant from public.restaurants
 where slug=lower(p_slug) and status in ('ACTIVE','PENDING');
 if not found then raise exception 'Restaurant is unavailable'; end if;
 select * into v_order from public.orders
 where id=p_order_id and restaurant_id=v_restaurant.id
 and public_token_hash=encode(extensions.digest(convert_to(p_tracking_token,'UTF8'),'sha256'),'hex');
 if not found then raise exception 'Order tracking link is invalid'; end if;
 select * into v_payment from public.payments
 where order_id=v_order.id and status='SUCCEEDED'
 order by verified_at desc nulls last,created_at desc limit 1;
 v_paid:=found;
 select * into v_feedback from public.order_feedback where order_id=v_order.id;
 if v_order.status='CANCELLED' then
  select note into v_cancel_reason from public.order_status_history
  where order_id=v_order.id and to_status='CANCELLED'
  order by created_at desc limit 1;
 end if;
 return jsonb_build_object(
  'order_id',v_order.id,'order_number',v_order.order_number,'status',v_order.status,
  'total',v_order.total,'created_at',v_order.created_at,'payment_received',v_paid,
  'payment_method',case when v_payment.id is not null then v_payment.method::text else null end,
  'feedback_submitted',v_feedback.id is not null,'feedback_rating',v_feedback.rating,
  'cancellation_reason',v_cancel_reason
 );
end
$function$;

create or replace function public.cancel_public_order(
 p_slug text,
 p_order_id uuid,
 p_tracking_token text,
 p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
 v_restaurant public.restaurants%rowtype;
 v_order public.orders%rowtype;
 v_reason text;
begin
 v_reason:=left(trim(coalesce(p_reason,'')),500);
 if p_slug is null or p_order_id is null or p_tracking_token is null or length(p_tracking_token)<32 then
  raise exception 'Invalid order tracking link';
 end if;
 if length(v_reason)<5 then
  raise exception 'Please provide a cancellation reason (at least 5 characters).';
 end if;
 select * into v_restaurant from public.restaurants
 where slug=lower(p_slug) and status in ('ACTIVE','PENDING');
 if not found then raise exception 'Restaurant is unavailable'; end if;
 select * into v_order from public.orders
 where id=p_order_id and restaurant_id=v_restaurant.id
 and public_token_hash=encode(extensions.digest(convert_to(p_tracking_token,'UTF8'),'sha256'),'hex')
 for update;
 if not found then raise exception 'Invalid order tracking link'; end if;
 if v_order.status in ('SERVED','CANCELLED') then
  raise exception 'This order can no longer be cancelled.';
 end if;
 if exists(select 1 from public.payments where order_id=v_order.id and status='SUCCEEDED') then
  raise exception 'Payment has already been received. Please contact restaurant staff.';
 end if;
 update public.orders set status='CANCELLED',updated_at=now()
 where id=v_order.id and restaurant_id=v_restaurant.id;
 insert into public.order_status_history(order_id,from_status,to_status,actor_user_id,note)
 values(v_order.id,v_order.status,'CANCELLED',null,v_reason);
 return jsonb_build_object('success',true,'status','CANCELLED','cancellation_reason',v_reason);
end
$function$;

revoke all on function public.cancel_public_order(text,uuid,text,text) from public;
grant execute on function public.cancel_public_order(text,uuid,text,text) to anon, authenticated;
