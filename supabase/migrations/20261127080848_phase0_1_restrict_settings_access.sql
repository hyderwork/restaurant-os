-- Prevent non-admin restaurant staff from reading private workspace settings.
-- restaurant_settings contains wifi_password as well as operational configuration.
-- Rollback: drop settings_admin_select and recreate settings_member_select using
-- private.is_restaurant_member(restaurant_id).
begin;

drop policy if exists settings_member_select on public.restaurant_settings;

create policy settings_admin_select
on public.restaurant_settings
for select
to authenticated
using (
  private.has_restaurant_role(
    restaurant_id,
    array['OWNER','ADMIN']::public.staff_role[]
  )
);

commit;
