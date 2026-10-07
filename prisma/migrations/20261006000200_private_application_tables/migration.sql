-- Auth.js and Prisma access these tables on the server. Supabase's browser
-- roles must not expose account tokens, school emails or moderation records.
-- The table owner remains able to serve authorized application requests.
DO $$
DECLARE
  app_table text;
  browser_role text;
BEGIN
  FOREACH app_table IN ARRAY ARRAY[
    'User', 'Account', 'Session', 'VerificationToken', 'Category', 'Listing',
    'ListingImage', 'SavedListing', 'Report', 'ContactEvent', 'ExchangePoint',
    'Exchange', 'Upload', 'RateLimitEvent', 'AdminAuditLog', '_prisma_migrations'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', app_table);
    FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = browser_role) THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', app_table, browser_role);
      END IF;
    END LOOP;
  END LOOP;
END $$;
