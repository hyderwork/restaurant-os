insert into public.subscription_plans (name, monthly_price, max_tables, max_staff, features)
values ('Starter', 0, 10, 5, '{"qr_ordering":true,"kitchen_display":true,"analytics":"basic"}'::jsonb)
on conflict (name) do nothing;