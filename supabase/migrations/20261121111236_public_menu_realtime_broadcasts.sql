create or replace function private.notify_public_menu_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant_id uuid;
begin
  if tg_op = 'DELETE' then
    if tg_table_name = 'restaurants' then
      v_restaurant_id := old.id;
    else
      v_restaurant_id := old.restaurant_id;
    end if;
  else
    if tg_table_name = 'restaurants' then
      v_restaurant_id := new.id;
    else
      v_restaurant_id := new.restaurant_id;
    end if;
  end if;

  if v_restaurant_id is not null then
    perform realtime.send(
      jsonb_build_object('restaurant_id', v_restaurant_id),
      'menu_changed',
      'public-menu:' || v_restaurant_id::text,
      false
    );
  end if;
  return null;
end;
$$;

revoke all on function private.notify_public_menu_change() from public, anon, authenticated;

drop trigger if exists menu_categories_public_realtime on public.menu_categories;
create trigger menu_categories_public_realtime
after insert or update or delete on public.menu_categories
for each row execute function private.notify_public_menu_change();

drop trigger if exists menu_products_public_realtime on public.menu_products;
create trigger menu_products_public_realtime
after insert or update or delete on public.menu_products
for each row execute function private.notify_public_menu_change();

drop trigger if exists restaurant_settings_public_realtime on public.restaurant_settings;
create trigger restaurant_settings_public_realtime
after insert or update or delete on public.restaurant_settings
for each row execute function private.notify_public_menu_change();

drop trigger if exists restaurants_public_realtime on public.restaurants;
create trigger restaurants_public_realtime
after update of name, currency, status on public.restaurants
for each row execute function private.notify_public_menu_change();