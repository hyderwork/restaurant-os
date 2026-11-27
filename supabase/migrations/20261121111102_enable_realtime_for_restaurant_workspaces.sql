DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'audit_logs','floors','memberships','menu_categories','menu_products',
    'order_feedback','order_items','order_status_history','orders','payments',
    'platform_admins','qr_codes','restaurant_settings','restaurant_tables',
    'restaurants','subscription_plans','subscriptions','users'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;