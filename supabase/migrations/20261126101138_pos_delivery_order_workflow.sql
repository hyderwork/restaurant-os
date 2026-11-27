
alter table public.orders
  add column if not exists delivery_address text,
  add column if not exists delivery_area text,
  add column if not exists delivery_fee numeric(12,2) not null default 0,
  add column if not exists order_source text not null default 'QR';

create or replace function public.create_staff_order(
  p_restaurant_id uuid,
  p_order_type text,
  p_table_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_notes text,
  p_delivery_address text,
  p_delivery_area text,
  p_delivery_fee numeric,
  p_discount numeric,
  p_items jsonb,
  p_paid boolean,
  p_payment_method public.payment_method
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_user_id uuid;
  v_currency text;
  v_table public.restaurant_tables%rowtype;
  v_product public.menu_products%rowtype;
  v_item jsonb;
  v_qty integer;
  v_count integer := 0;
  v_subtotal numeric(12,2) := 0;
  v_tax numeric(12,2) := 0;
  v_service numeric(12,2) := 0;
  v_delivery numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_tax_rate numeric(7,4) := 0;
  v_service_rate numeric(7,4) := 0;
  v_tax_inclusive boolean := false;
  v_line numeric(12,2);
  v_order_id uuid;
  v_order_number bigint;
  v_token text;
  v_payment_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Please sign in to create an order.'; end if;
  if p_restaurant_id is null or not private.has_restaurant_role(
    p_restaurant_id,
    array['OWNER','ADMIN','MANAGER','CASHIER','WAITER']::public.staff_role[]
  ) then
    raise exception 'You do not have permission to create orders in this restaurant.';
  end if;
  if p_order_type not in ('DINE_IN','TAKEAWAY','DELIVERY') then raise exception 'Invalid order type.'; end if;
  if length(trim(coalesce(p_customer_name,''))) < 2 or length(trim(p_customer_name)) > 120 then
    raise exception 'Enter a customer name between 2 and 120 characters.';
  end if;
  if length(trim(coalesce(p_customer_phone,''))) < 7 or length(trim(p_customer_phone)) > 40
     or length(regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g')) < 7 then
    raise exception 'Enter a valid customer phone number.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'Add at least one item (maximum 30 lines).';
  end if;
  if p_order_type = 'DINE_IN' and p_table_id is null then raise exception 'Select a dining table.'; end if;
  if p_order_type <> 'DINE_IN' and p_table_id is not null then raise exception 'Only dine-in orders can use a table.'; end if;
  if p_order_type = 'DELIVERY' and length(trim(coalesce(p_delivery_address,''))) < 6 then
    raise exception 'Enter a complete delivery address.';
  end if;
  if coalesce(p_delivery_fee,0) < 0 or coalesce(p_discount,0) < 0 then raise exception 'Fee and discount cannot be negative.'; end if;
  if coalesce(p_paid,false) and (p_payment_method is null or not private.has_restaurant_role(
    p_restaurant_id, array['OWNER','ADMIN','MANAGER','CASHIER']::public.staff_role[]
  )) then
    raise exception 'Only authorised cashier staff can record a paid order.';
  end if;

  select r.currency into v_currency from public.restaurants r where r.id=p_restaurant_id and r.status in ('ACTIVE','PENDING');
  if not found then raise exception 'Restaurant is unavailable.'; end if;
  select coalesce(s.tax_rate,0), coalesce(s.service_charge_rate,0), coalesce(s.tax_inclusive,false)
    into v_tax_rate, v_service_rate, v_tax_inclusive
    from public.restaurant_settings s where s.restaurant_id=p_restaurant_id;
  v_tax_rate := coalesce(v_tax_rate,0);
  v_service_rate := coalesce(v_service_rate,0);

  if p_order_type = 'DINE_IN' then
    select t.* into v_table from public.restaurant_tables t
      where t.id=p_table_id and t.restaurant_id=p_restaurant_id
        and t.status in ('AVAILABLE','RESERVED')
      for update;
    if not found then raise exception 'Selected table is not available.'; end if;
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 20 then raise exception 'Item quantity must be between 1 and 20.'; end if;
    select p.* into v_product from public.menu_products p
      join public.menu_categories c on c.id=p.category_id and c.active=true
      where p.id=(v_item->>'product_id')::uuid
        and p.restaurant_id=p_restaurant_id and p.status='ACTIVE';
    if not found then raise exception 'A selected menu item is no longer available.'; end if;
    v_line := round(v_product.base_price * v_qty, 2);
    v_subtotal := v_subtotal + v_line;
    v_count := v_count + 1;
    if v_count > 30 then raise exception 'Too many order lines.'; end if;
  end loop;

  if not v_tax_inclusive then v_tax := round(v_subtotal * v_tax_rate / 100, 2); end if;
  v_service := round(v_subtotal * v_service_rate / 100, 2);
  if p_order_type = 'DELIVERY' then v_delivery := round(coalesce(p_delivery_fee,0),2); end if;
  v_discount := round(coalesce(p_discount,0),2);
  if v_discount > v_subtotal + v_tax + v_service + v_delivery then
    raise exception 'Discount cannot exceed the order amount.';
  end if;
  v_total := v_subtotal + v_tax + v_service + v_delivery - v_discount;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  insert into public.orders(
    restaurant_id, table_id, order_number, public_token_hash, status,
    subtotal, tax_amount, service_charge, discount_amount, total, notes,
    customer_name, customer_phone, order_type, delivery_address, delivery_area,
    delivery_fee, order_source
  )
  values(
    p_restaurant_id, p_table_id, nextval('public.restaurant_order_number_seq'),
    encode(extensions.digest(convert_to(v_token,'UTF8'),'sha256'),'hex'), 'NEW',
    v_subtotal, v_tax, v_service, v_discount, v_total,
    nullif(left(trim(coalesce(p_notes,'')),1000),''),
    left(trim(p_customer_name),120), left(trim(p_customer_phone),40),
    p_order_type,
    case when p_order_type='DELIVERY' then left(trim(p_delivery_address),500) else null end,
    case when p_order_type='DELIVERY' then nullif(left(trim(coalesce(p_delivery_area,'')),120),'') else null end,
    v_delivery, 'POS'
  )
  returning id, order_number into v_order_id, v_order_number;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    select p.* into v_product from public.menu_products p
      where p.id=(v_item->>'product_id')::uuid and p.restaurant_id=p_restaurant_id and p.status='ACTIVE';
    v_line := round(v_product.base_price * v_qty, 2);
    insert into public.order_items(order_id,product_id,product_name,quantity,unit_price,line_total,special_instructions)
    values(v_order_id,v_product.id,v_product.name,v_qty,v_product.base_price,v_line,
      nullif(left(trim(coalesce(v_item->>'special_instructions','')),300),''));
  end loop;

  if p_order_type='DINE_IN' then
    update public.restaurant_tables set status='OCCUPIED', updated_at=now()
      where id=p_table_id and restaurant_id=p_restaurant_id;
  end if;

  insert into public.order_status_history(order_id,from_status,to_status,actor_user_id,note)
    values(v_order_id,null,'NEW',v_user_id,'Created from POS');

  if coalesce(p_paid,false) then
    insert into public.payments(
      restaurant_id,order_id,method,status,amount,currency,provider_reference,idempotency_key,verified_at
    ) values (
      p_restaurant_id,v_order_id,p_payment_method,'SUCCEEDED',v_total,coalesce(v_currency,'PKR'),
      'POS-'||upper(substr(replace(v_order_id::text,'-',''),1,16)),
      'pos:'||v_order_id::text,now()
    ) returning id into v_payment_id;
  end if;

  return jsonb_build_object(
    'success',true,'order_id',v_order_id,'order_number',v_order_number,
    'subtotal',v_subtotal,'tax',v_tax,'service_charge',v_service,
    'delivery_fee',v_delivery,'discount',v_discount,'total',v_total,
    'payment_received',coalesce(p_paid,false)
  );
end
$function$;

revoke all on function public.create_staff_order(uuid,text,uuid,text,text,text,text,text,numeric,numeric,jsonb,boolean,public.payment_method) from public, anon;
grant execute on function public.create_staff_order(uuid,text,uuid,text,text,text,text,text,numeric,numeric,jsonb,boolean,public.payment_method) to authenticated;
