alter table public.orders alter column table_id drop not null;
do $$
declare d text;
begin
 d:=pg_get_functiondef('public.get_public_menu(text,uuid,text)'::regprocedure);
 d:=replace(d,'public.get_public_menu(p_slug text, p_table_id uuid, p_token text)','public.get_public_takeaway_menu(p_slug text)');
 d:=replace(d,'if p_slug is null or p_table_id is null or p_token is null or length(p_token) < 32 then\n    raise exception ''Invalid QR code'';\n  end if;','if p_slug is null then raise exception ''Invalid restaurant link''; end if;');
 d:=replace(d,'  select t.* into v_table\n  from public.restaurant_tables t\n  join public.qr_codes q on q.table_id = t.id and q.restaurant_id = t.restaurant_id\n  where t.id = p_table_id and t.restaurant_id = v_restaurant.id\n    and q.active = true\n    and q.token_hash = encode(extensions.digest(convert_to(p_token, ''UTF8''), ''sha256''), ''hex'');\n  if not found then raise exception ''This QR code is invalid or has been deactivated''; end if;','  v_table.id := null;');
 d:=replace(d,'''table'', jsonb_build_object(''id'',v_table.id,''number'',v_table.number,''name'',v_table.name,''status'',v_table.status),','''table'', null,');
 d:=replace(d,'$function$;','$function$;');
 execute d;
end $$;
do $$
declare d text;
begin
 d:=pg_get_functiondef('public.place_public_order(text,uuid,text,jsonb,text,text,text)'::regprocedure);
 d:=replace(d,'public.place_public_order(p_slug text, p_table_id uuid, p_token text, p_items jsonb, p_customer_name text DEFAULT NULL::text, p_customer_phone text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)','public.place_public_takeaway_order(p_slug text, p_items jsonb, p_customer_name text, p_customer_phone text, p_notes text DEFAULT NULL::text)');
 d:=replace(d,' if p_slug is null or p_table_id is null or p_token is null or length(p_token)<32 then raise exception ''Invalid QR code''; end if;',' if p_slug is null then raise exception ''Invalid restaurant link''; end if;');
 d:=replace(d,' select t.* into v_table from public.restaurant_tables t join public.qr_codes q on q.table_id=t.id and q.restaurant_id=t.restaurant_id\n where t.id=p_table_id and t.restaurant_id=v_restaurant.id and q.active=true\n and q.token_hash=encode(extensions.digest(convert_to(p_token,''UTF8''),''sha256''),''hex'') for update of t;\n if not found then raise exception ''This QR code is invalid or has been deactivated''; end if;\n if v_table.status not in (''AVAILABLE'',''RESERVED'') then raise exception ''This table is currently unavailable. Please contact restaurant staff.''; end if;',' v_table.id:=null;');
 d:=replace(d,' update public.restaurant_tables set status=''OCCUPIED'',updated_at=now() where id=v_table.id and restaurant_id=v_restaurant.id and status in (''AVAILABLE'',''RESERVED'');\n if not found then raise exception ''This table has just become unavailable. Please contact restaurant staff.''; end if;','');
 d:=replace(d,'insert into public.orders(restaurant_id,table_id,order_number,public_token_hash,status,subtotal,tax_amount,service_charge,discount_amount,total,notes,customer_name,customer_phone,order_type)\n values(v_restaurant.id,v_table.id,nextval(''public.restaurant_order_number_seq''),','insert into public.orders(restaurant_id,table_id,order_number,public_token_hash,status,subtotal,tax_amount,service_charge,discount_amount,total,notes,customer_name,customer_phone,order_type)\n values(v_restaurant.id,null,nextval(''public.restaurant_order_number_seq''),');
 d:=replace(d,'''DINE_IN'')','''TAKEAWAY'')');
 execute d;
end $$;
grant execute on function public.get_public_takeaway_menu(text) to anon,authenticated;
grant execute on function public.place_public_takeaway_order(text,jsonb,text,text,text) to anon,authenticated;