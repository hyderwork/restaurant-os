
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('restaurant-logos', 'restaurant-logos', true, 3145728, array['image/png','image/jpeg','image/webp','image/svg+xml','image/x-icon'])
on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Restaurant members can upload workspace logos" on storage.objects;
create policy "Restaurant members can upload workspace logos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'restaurant-logos'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and exists (
    select 1 from public.memberships m
    where m.restaurant_id::text = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.status = 'ACTIVE'
      and m.role in ('OWNER','ADMIN','MANAGER')
  )
);

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
    'restaurant', jsonb_build_object(
      'id',v_restaurant.id,'name',v_restaurant.name,'slug',v_restaurant.slug,
      'currency',v_restaurant.currency,
      'logo_url',(select rs.logo_url from public.restaurant_settings rs where rs.restaurant_id=v_restaurant.id)
    ),
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

create or replace function public.get_public_takeaway_menu(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_restaurant public.restaurants%rowtype;
  v_result jsonb;
begin
  if p_slug is null or length(trim(p_slug)) = 0 then
    raise exception 'Invalid restaurant link';
  end if;
  select r.* into v_restaurant
  from public.restaurants r
  where r.slug = lower(trim(p_slug)) and r.status in ('ACTIVE','PENDING');
  if not found then raise exception 'Restaurant is unavailable'; end if;

  select jsonb_build_object(
    'restaurant', jsonb_build_object(
      'id',v_restaurant.id,'name',v_restaurant.name,'slug',v_restaurant.slug,
      'currency',v_restaurant.currency,
      'logo_url',(select rs.logo_url from public.restaurant_settings rs where rs.restaurant_id=v_restaurant.id)
    ),
    'table', null,
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
