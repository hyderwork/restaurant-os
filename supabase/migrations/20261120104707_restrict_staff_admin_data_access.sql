
drop policy if exists floors_manager_insert on public.floors;
drop policy if exists floors_admin_write on public.floors;
create policy floors_admin_write on public.floors
for all to authenticated
using (private.has_restaurant_role(restaurant_id, array['OWNER'::public.staff_role,'ADMIN'::public.staff_role]))
with check (private.has_restaurant_role(restaurant_id, array['OWNER'::public.staff_role,'ADMIN'::public.staff_role]));

drop policy if exists categories_admin_write on public.menu_categories;
create policy categories_admin_write on public.menu_categories
for all to authenticated
using (private.has_restaurant_role(restaurant_id, array['OWNER'::public.staff_role,'ADMIN'::public.staff_role]))
with check (private.has_restaurant_role(restaurant_id, array['OWNER'::public.staff_role,'ADMIN'::public.staff_role]));

drop policy if exists products_admin_write on public.menu_products;
create policy products_admin_write on public.menu_products
for all to authenticated
using (private.has_restaurant_role(restaurant_id, array['OWNER'::public.staff_role,'ADMIN'::public.staff_role]))
with check (private.has_restaurant_role(restaurant_id, array['OWNER'::public.staff_role,'ADMIN'::public.staff_role]));

drop policy if exists settings_admin_write on public.restaurant_settings;
create policy settings_admin_write on public.restaurant_settings
for all to authenticated
using (private.has_restaurant_role(restaurant_id, array['OWNER'::public.staff_role,'ADMIN'::public.staff_role]))
with check (private.has_restaurant_role(restaurant_id, array['OWNER'::public.staff_role,'ADMIN'::public.staff_role]));

drop policy if exists qr_admin_access on public.qr_codes;
create policy qr_admin_access on public.qr_codes
for all to authenticated
using (private.has_restaurant_role(restaurant_id, array['OWNER'::public.staff_role,'ADMIN'::public.staff_role]))
with check (private.has_restaurant_role(restaurant_id, array['OWNER'::public.staff_role,'ADMIN'::public.staff_role]));

drop policy if exists tables_manager_insert on public.restaurant_tables;
drop policy if exists tables_staff_write on public.restaurant_tables;
create policy tables_admin_write on public.restaurant_tables
for all to authenticated
using (private.has_restaurant_role(restaurant_id, array['OWNER'::public.staff_role,'ADMIN'::public.staff_role]))
with check (private.has_restaurant_role(restaurant_id, array['OWNER'::public.staff_role,'ADMIN'::public.staff_role]));
