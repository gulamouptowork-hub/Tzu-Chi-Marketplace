# Supabase and Vercel connection

This application uses Prisma 6.12 and Auth.js. Supabase supplies PostgreSQL and,
optionally, S3-compatible image storage. Google Workspace sign-in remains in
Auth.js; no Supabase browser API key or service-role key is needed by the app.

## Database

Use a dedicated, empty marketplace project. In Supabase's **Connect** dialog,
copy the pooler hostname and project reference from the actual project.

Set these server-side variables in Vercel's **Production** environment:

```dotenv
# Transaction pooler for serverless application requests
DATABASE_URL=postgresql://postgres.PROJECT_REF:URL_ENCODED_PASSWORD@POOLER_HOST:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20&sslmode=require
# Session pooler for migrations; compatible with IPv4 development machines
DIRECT_URL=postgresql://postgres.PROJECT_REF:URL_ENCODED_PASSWORD@POOLER_HOST:5432/postgres?sslmode=require
AUTH_URL=https://tzu-chi-marketplace.vercel.app
ALLOWED_EMAIL_DOMAINS=gms.tcu.edu.tw
ADMIN_EMAILS=YOUR_SCHOOL_EMAIL@gms.tcu.edu.tw
SEED_DEMO=false
DEV_DATABASE_MANAGED=false
LOCAL_IMAGE_STORAGE=false
```

`PROJECT_REF`, `POOLER_HOST` and the password are placeholders. URL-encode special
characters in the password. Use the credentials supplied by the project's owner;
do not reset passwords for an existing project. A dedicated Prisma database role
can replace `postgres` after its permissions have been configured as described in
[Supabase's Prisma guide](https://supabase.com/docs/guides/database/prisma).

Keep the development database local. Store the production connection variables in
an ignored `.env.supabase.local` file only when running local release commands.
Do not copy the local PostgreSQL database, OAuth token records, test users or
development media to Supabase automatically.

From this application's root, initialize the new database using:

```powershell
node --env-file=.env.supabase.local node_modules/prisma/build/index.js migrate deploy
node --env-file=.env.supabase.local --import tsx prisma/seed.ts
node --env-file=.env.supabase.local scripts/bootstrap-admin.mjs
node --env-file=.env.supabase.local scripts/verify-database.mjs
```

Include `ADMIN_EMAILS`, `ALLOWED_EMAIL_DOMAINS` and `SEED_DEMO=false` in the release
environment file as well. Migrations run through `DIRECT_URL`; requests use the
transaction pooler in `DATABASE_URL`. Do not run `migrate reset` or `migrate dev`
against the production database. Seeding installs categories and provisional
public exchange landmarks. The administrator must still sign in with the verified
school account and complete onboarding.

Application migrations enable Row Level Security on all application tables and
remove direct grants to Supabase's `anon` and `authenticated` roles. No browser
policies are created: requests go through the app's existing server authorization.
The server database user must own the application tables or bypass RLS. Supabase's
Data API can be disabled because the app does not use it; RLS also protects the
tables if that API is enabled. Never use a public database password variable.

## Optional Supabase image storage

The existing S3 adapter supports Supabase Storage with path-style requests.
Copy the **endpoint**, **region**, **access key ID** and **secret access key** from
the project's Storage S3 settings; these credentials stay on the server.

Create a public `marketplace-images` bucket for processed listing images and a
private `marketplace-staging` bucket for temporary originals. Configure:

```dotenv
S3_ENDPOINT=https://PROJECT_REF.storage.supabase.co/storage/v1/s3
S3_REGION=PROJECT_REGION
S3_BUCKET=marketplace-images
S3_UPLOAD_BUCKET=marketplace-staging
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_URL=https://PROJECT_REF.supabase.co/storage/v1/object/public/marketplace-images
```

Originals are uploaded to the private staging bucket, where anonymous reads are
denied. The server writes sanitized WebP images and thumbnails to the public
bucket. Configure cleanup for stale staging objects. Do not create anonymous upload policies: the app issues
short-lived, size-limited signed upload URLs after school-account authorization.
If R2 is already configured, keep its existing `S3_*` variables instead.

Reference: [Supabase S3 authentication](https://supabase.com/docs/guides/storage/s3/authentication).

## Deployment verification

Ensure production `AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set.
Add `https://tzu-chi-marketplace.vercel.app/api/auth/callback/google` to the
authorized Google OAuth redirect URIs. Changes to Vercel environment variables
require a new deployment. Keep the Build Command as `npm run build`.

After redeployment, verify school sign-in and onboarding, a real compressed photo
upload, listing creation/search, an exchange proposal and a report in the private
admin dashboard. Use a temporary verification listing and remove it afterward.
The local fixture tests do not establish that the live Supabase project works.
