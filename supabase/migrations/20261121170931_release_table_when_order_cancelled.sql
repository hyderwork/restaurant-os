create or replace function private.sync_table_after_order_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if TG_OP = 'INSERT' then
    if NEW.public_token_hash is not null and NEW.table_id is not null then
      update public.restaurant_tables
      set status = 'OCCUPIED', updated_at = now()
      where id = NEW.table_id and restaurant_id = NEW.restaurant_id;
    end if;
  elsif TG_OP = 'UPDATE' and NEW.status = 'CANCELLED' and OLD.status is distinct from NEW.status then
    if NEW.table_id is not null and NEW.restaurant_id is not null then
      update public.restaurant_tables t
      set status = 'AVAILABLE', updated_at = now()
      where t.id = NEW.table_id
        and t.restaurant_id = NEW.restaurant_id
        and t.status = 'OCCUPIED'
        and not exists (
          select 1
          from public.orders o
          where o.table_id = t.id
            and o.restaurant_id = t.restaurant_id
            and o.id <> NEW.id
            and o.public_token_hash is not null
            and o.status in ('NEW', 'ACCEPTED', 'COOKING', 'READY')
        );
    end if;
  end if;
  return NEW;
end;
$function$;