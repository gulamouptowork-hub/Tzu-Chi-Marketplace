# TCU Campus Marketplace

Student-only marketplace for Tzu Chi University, built with Next.js 16 App Router, TypeScript, Auth.js Google Workspace SSO, PostgreSQL/Prisma, Cloudflare R2, next-intl and Tailwind. No platform payments.

## Features

- Exact school-domain restriction, verified Google email, onboarding and rules acceptance.
- Listings with 1–6 compressed photos, validated presigned uploads, generated thumbnails, edit/delete and status controls.
- PostgreSQL full-text search with Chinese substring matching, filters, sorting and pagination. Sold listings disappear from browsing after seven days.
- Rate-limited contact dialog with editable message and mailto, or optional Resend delivery with buyer Reply-To.
- Safe Exchange proposals, seller acceptance, arrival, cancellation and separate completion confirmation by each student.
- Saved items, profiles, My Listings, account settings, soft deletion, reporting and admin moderation.
- Marketplace cards open Safe Exchange directly with a Buy button and include a small report control. Reports appear in Admin > Reports for review, listing moderation and account suspension; reports do not automatically suspend accounts.
- Traditional Chinese and English, a light emerald/mint theme, accessible dialogs and keyboard gallery controls.

## Local setup

Use Node.js 24 and Docker Desktop. From this application directory:

```powershell
Copy-Item .env.example .env
# Edit .env with your OAuth, database and storage settings.
npm ci
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Without Docker, run `npm run db:local` in a separate terminal instead of `docker compose up -d` and the migrate/seed steps. It starts an embedded PostgreSQL that matches the localhost DATABASE_URL in `.env.local`, applies migrations and seeds, then keeps running until Ctrl+C. Its data stays under ignored `.dev-data/`.

With `DEV_DATABASE_MANAGED=true`, `npm run dev` automatically starts that bundled database if it is stopped, applies migrations and seeds, and waits for readiness before opening the app. It supports `.env.local` or `.env`. An existing database is reused. This prevents the database-offline Google sign-in error.

For local photo uploads, set `LOCAL_IMAGE_STORAGE=true`. Signed, size-limited upload URLs store files under `.dev-data/media`; the same image validation and thumbnail generation run before publication. This option is disabled in production and the S3 integration harness. Production must use configured S3/R2 storage. Never deploy the local development database or media folder.

Open http://localhost:3000. Prisma CLI reads `.env`; Next.js can also use `.env.local`. Keep DATABASE_URL consistent. Generate AUTH_SECRET with `npx auth secret` or a secure random generator. Docker Postgres is bound to loopback, and its default credentials are only for local development.

## Google Workspace SSO

Create a Google Cloud project and configure the OAuth consent screen for the university Workspace organization. Register a Web application OAuth client. Register redirect URI `http://localhost:3000/api/auth/callback/google` and the corresponding HTTPS URI for production. Set AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET and AUTH_URL. ALLOWED_EMAIL_DOMAINS defaults in the example to `gms.tcu.edu.tw`. The server checks verified email and exact domains independently of Google's account picker. Suspended/deleted users are rejected. No password login or production authentication bypass exists.

## Administrators

Set ADMIN_EMAILS to the school email addresses permitted to administer the marketplace. Apply migrations, then run `npm run admin:bootstrap` to create or promote configured accounts without changing their profile or accepting rules for them. Existing configured accounts are also promoted on successful school sign-in. Administrators still use verified Google Workspace SSO and must complete onboarding.

Open `/admin` from the account menu. The dashboard contains real database totals, 7/30/90-day Taipei activity trends, product categories, searchable users and products, exchanges, reports and a read-only action history. Record lists use 20-row pagination. Admins can hide/restore products, suspend/restore student accounts and resolve reports; confirmation dialogs accept an optional reason. Suspending accounts or hiding products cancels active exchanges and releases reservations. Admin accounts cannot be suspended through these controls.

The same server authorization protects `GET /api/admin` and `PATCH /api/admin`; ordinary students receive 403 and unsigned callers receive 401. GET accepts tab, q, status, page and period. Responses exclude authentication tokens and carry `Cache-Control: private, no-store`. Changes and their before/after states are stored transactionally in AdminAuditLog, including the actor and timestamp. Repeated requests that make no state change do not duplicate the audit entry.

With the local app running and the configured owner onboarded, `node scripts/verify-admin-local.mjs` checks all admin sections and creates desktop/mobile screenshots without modifying application records. Production browser integration checks exercise privacy, exact totals, pagination, confirmation and audit persistence against an isolated database.

## Cloudflare R2

Create a bucket, attach a public custom domain for processed images, and create a scoped API token. Fill the S3 variables in `.env.example`, including the public base URL. Configure CORS for the actual application origin with PUT and Content-Type. The upload endpoint signs a random staging key for five minutes; completion checks ownership, declared size, file MIME and decoded format, then writes sanitized WebP images and thumbnails. Configure a lifecycle rule to delete stale `staging/` objects after one day. Configure an appropriate retention/cleanup process for unreferenced processed images and expired rate-limit events.

## Safe Exchange

Sellers choose supported campuses; buyers select a public point in those campuses and propose a future daytime meeting (Taipei time). Seller acceptance reserves the listing and cancels competing proposals. Both students independently confirm completion; the second confirmation marks the listing sold. This is an arrangement/history tool, not a payment or delivery guarantee.

Six provisional public landmarks are seeded for each of Jieren, Jianguo and Central campuses. Exact availability and coordinates must be checked before launch. `ExchangePoint.verified` records that review; no map coordinates have been invented. Do not use private dorm rooms. The university teaching-unit catalogue is sourced from https://www.tcu.edu.tw/p/412-1033-4801.php and checked on 2026-10-02. Names retain official Chinese spelling in both language modes. Search by college or department; server validation accepts only catalogue IDs.

## Demo data

Set SEED_DEMO=true only for a local/demo database and run `npm run db:seed`. It seeds fifteen clearly marked demo listings using bundled placeholder images. `npm run demo:images` regenerates their WebP assets. Demo users are not login credentials; do not seed demos into production.

## Tests

```powershell
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run test:integration
npm run test:local # With the local app running, verifies uploads and the light theme.
npm run build
```

The integration suite starts isolated real PostgreSQL on port 55432, an in-memory S3 protocol fixture on port 59000, and an app on port 3001. It applies migrations and seeds a dedicated `marketplace_test` database. Test-only JWTs are signed by the test runner; production has no test-login endpoint. This verifies application behavior but does not verify Google OAuth, live R2 or Resend. The database uses explicit UTF-8 on Windows. Test data stays under ignored `.test-data/`; the integration build stays under `.next-integration/`.

## Deployment

For Supabase PostgreSQL, Vercel environment setup and optional Supabase image storage, follow [docs/SUPABASE.md](docs/SUPABASE.md). Prisma 6 uses separate `DATABASE_URL` and `DIRECT_URL` values for serverless requests and migrations. Locally, set both to the same development database URL.

Deploy on Vercel with managed PostgreSQL and R2, or build the Dockerfile and run its standalone server on port 3000. Apply `prisma migrate deploy` as a separate release step, then seed categories and reviewed exchange points. Supply environment variables through the hosting secret manager. Use HTTPS, scoped storage credentials and production OAuth callback URLs. Font downloads occur during the build.

Keep Vercel's Build Command set to `npm run build`. This script explicitly generates Prisma Client before the Next.js build, including when Vercel reuses cached dependencies or install hooks are skipped. Database migrations remain a separate release step; client generation does not migrate or seed the database.

## Before a real launch

Configure production Google OAuth, R2 credentials and a managed database, and supply the official logo at `public/brand/logo.svg`. Google OAuth credentials are configured locally; fresh live sign-in confirmation remains pending. The logo and logo-derived favicon are pending that asset. Review provisional campus points and verify live OAuth/upload/email flows. See `artifacts/lighthouse-scores.json` for the latest local authenticated mobile measurement. These scores do not replace a full WCAG audit or verification on the deployed school environment. The optional map view and ratings are future extensions.

The marketplace uses a light emerald/mint theme with a full-width feed. Category pills and search remain above the listings. A fixed Filters button displays the active-filter count and opens the same sliding drawer on desktop and mobile. Detailed campus, category, condition, status, price and sorting options preserve the current search when applied.

Exchange times are interpreted in Taipei time and must be in the future, within 90 days, between 08:00 and 18:59. The contact form validates these rules before sending a request and displays a specific inline explanation. The API enforces the same rules independently of browser validation.

## Production integration audit

In PowerShell, set $env:TEST_PRODUCTION='true' before running npm run test:integration. This builds an optimized app, runs the real-database flow and audits the authenticated mobile feed with Lighthouse. Scores, HTML reports and desktop/mobile screenshots are written under artifacts. MARKETPLACE_INTEGRATION is set only by the harness to isolate build output and permit the loopback S3 fixture; do not set it on a deployed site. The harness resets only its own marketplace_test database on port 55432 between runs.

Seeded users link on their first Google login only after the callback checks the Google provider, verified email, matching profile email and allowed domain. Do not add another provider without reviewing that trust boundary.

