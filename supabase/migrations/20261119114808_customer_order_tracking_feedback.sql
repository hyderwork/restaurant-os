
create table if not exists public.order_feedback (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
alter table public.order_feedback enable row level security;
revoke all on public.order_feedback from anon, authenticated;
grant select, insert, update, delete on public.order_feedback to service_role;

create or replace function public.get_order_tracking(p_slug text,p_order_id uuid,p_tracking_token text)
returns jsonb language plpgsql security definer set search_path=pg_catalog
as $$
declare v_order public.orders%rowtype; v_restaurant public.restaurants%rowtype; v_payment public.payments%rowtype; v_feedback public.order_feedback%rowtype;
begin
 if p_slug is null or p_order_id is null or p_tracking_token is null or length(p_tracking_token)<32 then raise exception 'Invalid tracking link'; end if;
 select * into v_restaurant from public.restaurants where slug=lower(p_slug) and status in ('ACTIVE','PENDING');
 if not found then raise exception 'Restaurant is unavailable'; end if;
 select * into v_order from public.orders where id=p_order_id and restaurant_id=v_restaurant.id
 and public_token_hash=encode(extensions.digest(convert_to(p_tracking_token,'UTF8'),'sha256'),'hex');
 if not found then raise exception 'Order tracking link is invalid'; end if;
 select * into v_payment from public.payments where order_id=v_order.id and status='SUCCEEDED' order by verified_at desc nulls last,created_at desc limit 1;
 select * into v_feedback from public.order_feedback where order_id=v_order.id;
 return jsonb_build_object('order_id',v_order.id,'order_number',v_order.order_number,'status',v_order.status,'total',v_order.total,'created_at',v_order.created_at,'payment_received',found,'payment_method',case when v_payment.id is not null then v_payment.method::text else null end,'feedback_submitted',v_feedback.id is not null,'feedback_rating',v_feedback.rating);
end $$;

create or replace function public.submit_order_feedback(p_slug text,p_order_id uuid,p_tracking_token text,p_rating integer,p_comment text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog
as $$
declare v_restaurant public.restaurants%rowtype; v_order public.orders%rowtype; v_feedback_id uuid;
begin
 if p_rating is null or p_rating<1 or p_rating>5 then raise exception 'Please select a rating from 1 to 5'; end if;
 select * into v_restaurant from public.restaurants where slug=lower(p_slug) and status in ('ACTIVE','PENDING');
 if not found then raise exception 'Restaurant is unavailable'; end if;
 select * into v_order from public.orders where id=p_order_id and restaurant_id=v_restaurant.id
 and public_token_hash=encode(extensions.digest(convert_to(p_tracking_token,'UTF8'),'sha256'),'hex');
 if not found then raise exception 'Invalid order tracking link'; end if;
 if not exists(select 1 from public.payments where order_id=v_order.id and status='SUCCEEDED') then raise exception 'Feedback is available after payment is received'; end if;
 insert into public.order_feedback(order_id,rating,comment)
 values(v_order.id,p_rating,nullif(left(trim(coalesce(p_comment,'')),1000),''))
 on conflict(order_id) do nothing returning id into v_feedback_id;
 if v_feedback_id is null then raise exception 'Feedback has already been submitted'; end if;
 return jsonb_build_object('success',true,'message','Thank you for your feedback');
end $$;

revoke all on function public.get_order_tracking(text,uuid,text) from public;
revoke all on function public.submit_order_feedback(text,uuid,text,integer,text) from public;
grant execute on function public.get_order_tracking(text,uuid,text) to anon,authenticated;
grant execute on function public.submit_order_feedback(text,uuid,text,integer,text) to anon,authenticated;

create or replace function public.place_public_order(p_slug text,p_table_id uuid,p_token text,p_items jsonb,p_customer_name text default null,p_customer_phone text default null,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog
as $$
declare
 v_restaurant public.restaurants%rowtype; v_table public.restaurant_tables%rowtype;
 v_order_id uuid; v_order_number bigint; v_subtotal numeric(12,2):=0; v_tax numeric(12,2):=0;
 v_service numeric(12,2):=0; v_total numeric(12,2):=0; v_tax_rate numeric(7,4):=0;
 v_service_rate numeric(7,4):=0; v_tax_inclusive boolean:=false; v_item jsonb;
 v_product public.menu_products%rowtype; v_qty integer; v_line numeric(12,2); v_count integer:=0;
 v_tracking_token text;
begin
 if p_slug is null or p_table_id is null or p_token is null or length(p_token)<32 then raise exception 'Invalid QR code'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>30 then raise exception 'Your cart is empty or contains too many items'; end if;
 select * into v_restaurant from public.restaurants where slug=lower(p_slug) and status in ('ACTIVE','PENDING');
 if not found then raise exception 'Restaurant is unavailable'; end if;
 select t.* into v_table from public.restaurant_tables t join public.qr_codes q on q.table_id=t.id and q.restaurant_id=t.restaurant_id
 where t.id=p_table_id and t.restaurant_id=v_restaurant.id and q.active=true
 and q.token_hash=encode(extensions.digest(convert_to(p_token,'UTF8'),'sha256'),'hex');
 if not found then raise exception 'This QR code is invalid or has been deactivated'; end if;
 select coalesce(s.tax_rate,0),coalesce(s.service_charge_rate,0),coalesce(s.tax_inclusive,false)
 into v_tax_rate,v_service_rate,v_tax_inclusive from public.restaurant_settings s where s.restaurant_id=v_restaurant.id;
 v_tax_rate:=coalesce(v_tax_rate,0); v_service_rate:=coalesce(v_service_rate,0);
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_qty:=(v_item->>'quantity')::integer;
  if v_qty<1 or v_qty>20 then raise exception 'Invalid item quantity'; end if;
  select p.* into v_product from public.menu_products p join public.menu_categories c on c.id=p.category_id and c.active=true
  where p.id=(v_item->>'product_id')::uuid and p.restaurant_id=v_restaurant.id and p.status='ACTIVE';
  if not found then raise exception 'One of the selected items is no longer available'; end if;
  v_line:=round(v_product.base_price*v_qty,2); v_subtotal:=v_subtotal+v_line; v_count:=v_count+1;
  if v_count>30 then raise exception 'Too many order lines'; end if;
 end loop;
 if v_tax_inclusive then v_tax:=0; else v_tax:=round(v_subtotal*v_tax_rate/100,2); end if;
 v_service:=round(v_subtotal*v_service_rate/100,2); v_total:=v_subtotal+v_tax+v_service;
 v_tracking_token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
 insert into public.orders(restaurant_id,table_id,order_number,public_token_hash,status,subtotal,tax_amount,service_charge,discount_amount,total,notes,customer_name,customer_phone,order_type)
 values(v_restaurant.id,v_table.id,nextval('public.restaurant_order_number_seq'),
 encode(extensions.digest(convert_to(v_tracking_token,'UTF8'),'sha256'),'hex'),'NEW',v_subtotal,v_tax,v_service,0,v_total,
 nullif(left(trim(coalesce(p_notes,'')),1000),''),nullif(left(trim(coalesce(p_customer_name,'')),120),''),nullif(left(trim(coalesce(p_customer_phone,'')),40),''),'DINE_IN')
 returning id,order_number into v_order_id,v_order_number;
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_qty:=(v_item->>'quantity')::integer;
  select p.* into v_product from public.menu_products p join public.menu_categories c on c.id=p.category_id and c.active=true
  where p.id=(v_item->>'product_id')::uuid and p.restaurant_id=v_restaurant.id and p.status='ACTIVE';
  v_line:=round(v_product.base_price*v_qty,2);
  insert into public.order_items(order_id,product_id,product_name,quantity,unit_price,line_total,special_instructions)
  values(v_order_id,v_product.id,v_product.name,v_qty,v_product.base_price,v_line,nullif(left(trim(coalesce(v_item->>'special_instructions','')),300),''));
 end loop;
 insert into public.order_status_history(order_id,from_status,to_status,note) values(v_order_id,null,'NEW','Customer QR order');
 return jsonb_build_object('order_id',v_order_id,'order_number',v_order_number,'tracking_token',v_tracking_token,'subtotal',v_subtotal,'tax',v_tax,'service_charge',v_service,'total',v_total,'currency',v_restaurant.currency);
end $$;
revoke all on function public.place_public_order(text,uuid,text,jsonb,text,text,text) from public;
grant execute on function public.place_public_order(text,uuid,text,jsonb,text,text,text) to anon,authenticated;
