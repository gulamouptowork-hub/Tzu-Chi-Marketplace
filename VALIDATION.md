# Verification — 2026-10-07

Vercel build regression: `npm run build` now runs `prisma generate` before Next.js, explicitly refreshing the client even with cached dependencies or skipped installation hooks. The production build passed locally with `VERCEL=1` and `CI=1`, including page-data collection and static-page generation. Build output was isolated under `.next-integration/`. The hosted Vercel deployment of commit `5d0a1f6` also succeeded. Docker uses the same build script without duplicate generation; Docker itself remains untested locally.

Final checks passed: TypeScript, ESLint, 17 unit tests, three public browser tests, thirteen production integration checks, the local upload/interface browser check and a read-only check of the configured owner's local admin dashboard. The production dependency audit reported zero vulnerabilities.

## Supabase preparation

The new Supabase project was verified empty before initialization. All three migrations were applied successfully. A live read-only verification confirmed 16 RLS-protected application tables, 10 categories, 18 active provisional exchange points and the configured administrator. Neither Supabase's `anon` nor `authenticated` role has SELECT access to any application table. Only initial categories, landmarks and the owner account were seeded; local accounts, OAuth tokens, listings and photos were not copied.

Prisma uses the transaction pooler for requests and a separate session pooler through `DIRECT_URL` for migrations. Release commands load a separate ignored environment file, preserving the local development database. The integration suite verifies that a non-owner database role cannot read application records even when it has SELECT grants, and that private original photo URLs reject anonymous requests while processed images remain readable. The S3 client uses path-style addressing and compatible checksum settings. Live image storage, production environment configuration and Google sign-in still require their own verification; these database checks do not establish that those services are configured.

## Admin backend

The configured owner account is an administrator without changes to its profile or rules acceptance. The admin page and GET/PATCH API require server-side administrator authorization. Anonymous callers receive 401; student callers receive 403 and student page requests redirect to the marketplace. Admin responses exclude account tokens and session data and carry private/no-store cache headers.

The dashboard covers database totals, 7/30/90-day Taipei trends, category counts, user and product search, status filters, 20-row pagination, exchanges, reports and action history. Admin moderation uses confirmation dialogs and optional notes. Actions, actor, target, before/after states and timestamps are recorded in the same transaction as the change. Duplicate no-op requests do not create duplicate audit entries. Administrator accounts cannot be suspended through moderation controls.

Production integration checks verify exact database totals, daily-count consistency, pagination without repeated records, private-data boundaries, confirmation before mutation, persistent audit notes, CSRF protection, suspension/restoration and report resolution. The existing full marketplace test was updated to use the reports tab and its confirmation dialog. The owner-account local check opens every section without changing records and captures desktop/mobile layouts in `artifacts/admin-local-1440.png` and `artifacts/admin-local-390.png`.

The contact-time regression reproduces a 22:07 Taipei exchange request and verifies a specific inline message without an API call. API checks reject evening, past and more-than-90-day requests without creating exchanges or consuming contact limits. A valid 14:00 request creates the expected proposal even with the browser set to America/Los_Angeles. Request-limit errors display a specific explanation. Unit coverage includes 07:59/08:00 and 18:59/19:00 boundaries, invalid calendar dates and the exact 90-day limit.

Photo-removal coverage verifies excluding removed files from uploads, adding photos while retaining existing ones, persisting removal of saved photos, requiring at least one photo, selecting the same file again after removal and rejecting selection beyond six photos. Desktop/mobile screenshots are in `artifacts/photo-removal-1440.png` and `artifacts/photo-removal-390.png`.

The production suite exercises listing creation with photos, edits, search, saved items, contact, mutual exchange completion and moderation. Regression coverage includes JSON authentication and validation errors, official department onboarding, concurrent acceptance, protection against editing accepted exchanges, arrival, cancellation, suspension, reservation release, expired proposals, deleted listings, free-item price filtering and exclusion of old sold listings.

The responsive drawer test checks desktop and mobile: no fixed sidebar, campus and condition selection, retained search query, active-filter count, Escape dismissal and focus return. The local browser check publishes a temporary listing with a real compressed photo, validates signed upload restrictions and image rendering, checks horizontal overflow and captures the light interface and drawer. Temporary verification records and media are removed afterward.

## Interface

Marketplace cards include a Buy button that opens the existing Safe Exchange dialog and an accessible, compact report button. The seller sees an edit link on their own cards; purchases are disabled for unavailable items. The card integration check verifies desktop/mobile layout, the preferred public meeting point, a valid proposal, persistent reports in the administrator's queue, student denial of admin access, confirmation before suspension, cancellation of pending exchanges and removal of the suspended seller's listing from the feed. Self-report requests are rejected by the API. Screenshots are in `artifacts/card-actions-1440.png` and `artifacts/card-actions-390.png`.

Git and Docker exclusions cover local environment files, PostgreSQL/media folders, generated builds, test results and screenshots. `.env.example` contains only placeholders and loopback development defaults.

The application uses an off-white canvas, white cards, slate text and emerald/mint accents. The light theme remains consistent with a dark device preference. Category pills and search stay above the full-width feed. A fixed Filters button opens the same right-side drawer on desktop and mobile, containing campus, category, condition, item status, price, free-item and sorting controls. Animations respect reduced-motion preferences; focus is contained in the dialog and returns to its trigger when dismissed.

Inspect artifacts/emerald-empty-desktop.png, artifacts/emerald-empty-mobile.png, artifacts/emerald-drawer-desktop.png and artifacts/emerald-drawer-mobile.png. Production screenshots use labeled demo placeholder images. Lighthouse reports are in artifacts/lighthouse.html and artifacts/lighthouse-scores.json; scores describe the local authenticated Chinese feed, not a full WCAG audit or deployed infrastructure.

The licensed local Noto Sans TC subset covers interface copy and the official teaching-unit catalogue. A regular-weight asset was derived locally from the existing variable font, reducing its size from 151,640 to 74,624 bytes. The broader font loads afterward for arbitrary student content. License and character manifest are in src/fonts/.

## Development and launch limits

Cold-start development was checked with managed local PostgreSQL stopped: the launcher started the database, applied migrations and seeds, then started the app. Signed local media storage is restricted to development; production requires S3/R2.

Google OAuth credentials are configured locally, but fresh live Workspace sign-in confirmation remains pending. Live R2 and optional Resend delivery have not been exercised; production integration uses an isolated S3 fixture and signed test sessions. The official university logo is pending. Seeded public exchange landmarks remain provisional until reviewed on campus. Docker packaging was not executed because Docker is unavailable. Deployment instructions are in README.md.
