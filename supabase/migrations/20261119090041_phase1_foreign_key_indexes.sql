
create index if not exists menu_products_category_id_idx on public.menu_products(category_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_status_history_actor_user_id_idx on public.order_status_history(actor_user_id);
create index if not exists orders_table_id_idx on public.orders(table_id);
create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists restaurant_tables_floor_id_idx on public.restaurant_tables(floor_id);
create index if not exists subscriptions_plan_id_idx on public.subscriptions(plan_id);
