create or replace function public.get_public_menu(p_slug text, p_table_id uuid, p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_restaurant public.restaurants%rowtype;
  v_table public.restaurant_tables%rowtype;
  v_result jsonb;
begin
  if p_slug is null or p_table_id is null or p_token is null or length(p_token) < 32 then
    raise exception 'Invalid QR code';
  end if;
  select r.* into v_restaurant
  from public.restaurants r
  where r.slug = lower(p_slug) and r.status in ('ACTIVE','PENDING');
  if not found then raise exception 'Restaurant is unavailable'; end if;

  select t.* into v_table
  from public.restaurant_tables t
  join public.qr_codes q on q.table_id = t.id and q.restaurant_id = t.restaurant_id
  where t.id = p_table_id and t.restaurant_id = v_restaurant.id
    and q.active = true
    and q.token_hash = encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
  if not found then raise exception 'This QR code is invalid or has been deactivated'; end if;

  select jsonb_build_object(
    'restaurant', jsonb_build_object('id',v_restaurant.id,'name',v_restaurant.name,'slug',v_restaurant.slug,'currency',v_restaurant.currency),
    'table', jsonb_build_object('id',v_table.id,'number',v_table.number,'name',v_table.name,'status',v_table.status),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,'name',c.name,'description',c.description,'sort_order',c.sort_order,
        'products', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id',p.id,'name',p.name,'description',p.description,'image_url',p.image_url,
            'price',p.base_price,'vegetarian',p.vegetarian,'spice_level',p.spice_level,
            'prep_minutes',p.prep_minutes,'allergens',p.allergens
          ) order by p.name)
          from public.menu_products p
          where p.category_id = c.id and p.restaurant_id = v_restaurant.id and p.status = 'ACTIVE'
        ), '[]'::jsonb)
      ) order by c.sort_order,c.name)
      from public.menu_categories c
      where c.restaurant_id = v_restaurant.id and c.active = true
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$function$;

create or replace function public.place_public_order(p_slug text, p_table_id uuid, p_token text, p_items jsonb, p_customer_name text default null, p_customer_phone text default null, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
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

 select t.* into v_table
 from public.restaurant_tables t
 join public.qr_codes q on q.table_id=t.id and q.restaurant_id=t.restaurant_id
 where t.id=p_table_id and t.restaurant_id=v_restaurant.id and q.active=true
 and q.token_hash=encode(extensions.digest(convert_to(p_token,'UTF8'),'sha256'),'hex')
 for update of t;
 if not found then raise exception 'This QR code is invalid or has been deactivated'; end if;
 if v_table.status not in ('AVAILABLE','RESERVED') then
   raise exception 'This table is currently unavailable. Please contact restaurant staff.';
 end if;

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

 update public.restaurant_tables set status='OCCUPIED',updated_at=now()
 where id=v_table.id and restaurant_id=v_restaurant.id and status in ('AVAILABLE','RESERVED');
 if not found then raise exception 'This table has just become unavailable. Please contact restaurant staff.'; end if;

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
end
$function$;